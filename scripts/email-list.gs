/**
 * email-list.gs -- the endpoint behind home/email-list.html.
 *
 * A Google Apps Script web app that appends one row per signup to a Google
 * Sheet. The site is served by GitHub Pages and has no backend, so this is the
 * same shape as the guestbook: a public script URL the page POSTs to.
 *
 * Deployment steps, the script URL and the recovery notes are in
 * docs/ops/email-list.md. This file is the source of truth for the code --
 * paste it into the script editor rather than editing it there, so a change
 * made in a browser cannot be the only copy. The guestbook's script exists
 * nowhere but Google, which is the mistake not being repeated here.
 *
 * ── Three ways this deliberately differs from the guestbook ──
 *
 * 1. It is WRITE-ONLY. The guestbook's doGet returns every entry, which is
 *    right for a wall of public messages and catastrophic for a list of email
 *    addresses: the endpoint URL is in page source, so anyone who views source
 *    could fetch the list. doGet here returns nothing but a refusal.
 *
 * 2. A repeat signup, and a first signup, get the SAME answer. Telling a
 *    caller "you are already subscribed" turns the endpoint into a membership
 *    oracle: anybody could test an address against the list. Both cases return
 *    success and only the first appends a row.
 *
 * 3. Nothing is ever destroyed. An unsubscribe sets `status` to `off` and a
 *    honeypot hit sets it to `spam`; neither deletes the row. A deleted row is
 *    indistinguishable from one that never arrived, which matters twice over:
 *    evidence that somebody asked to be left alone has to survive, and so does
 *    a submission this script was wrong about. The `website` incident below is
 *    what taught the second half -- a silently dropped signup leaves nothing to
 *    find, and the caller has already been told it worked.
 *
 * Run auditList() from the editor to see where rows are actually landing. It
 * is at the bottom of this file and is not reachable from the web app.
 */

/* The tab within the spreadsheet. Created on first write if absent. */
var SHEET_NAME = 'subscribers';

/* Columns, in order. Written as row 1 when the sheet is created. */
var HEADERS = ['timestamp', 'email', 'source', 'status', 'notes'];

/* A global ceiling, not a per-caller one: Apps Script does not expose the
 * caller's IP address, so per-IP limiting is not available here. This blunts a
 * flood into the sheet rather than stopping a determined one, and it is the
 * honeypot below that turns away ordinary form spam. */
var MAX_PER_HOUR = 60;

/* Longest address accepted. 254 is the practical limit for an SMTP path
 * (RFC 5321's 256-octet path minus the angle brackets). */
var MAX_EMAIL_LEN = 254;

/* The honeypot field's name, which must match the input in
 * home/email-list.html. It matters what this is called.
 *
 * It was `website` for one day and that was a real bug: Chrome and every
 * password manager autofill a field called `website`, `url`, `email`, `name`,
 * `phone` or `address` regardless of `autocomplete="off"`, which is advisory
 * and widely ignored. A genuine signup arrived with the honeypot filled by the
 * browser, was treated as a bot, and vanished. The symptom was the worst kind:
 * the page said "you are on the list" and the sheet stayed empty.
 *
 * So the rule is that this name must match no autofill heuristic. Do not
 * rename it to anything a browser might recognise as a real contact field. */
var HONEYPOT_FIELD = 'referral_code';


/**
 * GET is refused. See point 1 in the header: there is no read path on purpose.
 *
 * This answers rather than throwing so that somebody opening the URL in a
 * browser sees a deliberate refusal and not a stack trace, which would say
 * more about the script than the refusal does.
 */
function doGet() {
  return _json({ status: 'error', error: 'not_available' });
}


/**
 * POST adds one address.
 *
 * Expects form-encoded fields (not JSON): `email`, optional `source` naming
 * the page it came from, and the honeypot `website`. The page sends FormData
 * for a reason -- it keeps the request inside the CORS "simple request" rules,
 * so the browser sends no preflight. Apps Script cannot answer an OPTIONS
 * preflight at all (there is no doOptions), so switching the page to
 * `Content-Type: application/json` would fail in the browser while still
 * working from curl, which is a confusing way to break it.
 */
function doPost(e) {
  var p = (e && e.parameter) || {};

  /* Honeypot. The field is hidden from people and anything in it means the
   * sender is probably not one.
   *
   * It is a FLAG rather than an early return, which is the lesson from the
   * `website` incident recorded at HONEYPOT_FIELD. A flagged submission is
   * still written, with status `spam`, so a false positive is visible in the
   * sheet and recoverable instead of being destroyed in silence. Dropping it
   * outright is what made that bug invisible: there is nothing to find
   * afterwards, and the caller was told it worked. */
  var flagged = String(p[HONEYPOT_FIELD] || '').trim() !== '';

  var email = String(p.email || '').trim().toLowerCase();
  if (!_looksLikeEmail(email)) {
    /* A flagged caller is answered as though it worked whatever it sent, so
     * nothing about the reply tells a spammer which field gave it away. */
    return _json(flagged
      ? { status: 'success' }
      : { status: 'error', error: 'bad_email' });
  }

  var source = String(p.source || '').trim().slice(0, 120);

  /* One writer at a time. Two concurrent appendRow calls can land on the same
   * row, and the dedupe read below is only meaningful while nothing else is
   * writing. The rate counter is bumped inside the lock for the same reason:
   * CacheService has no atomic increment. */
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return _json({ status: 'error', error: 'busy' });
  }

  try {
    if (_overRateLimit()) {
      return _json(flagged
        ? { status: 'success' }
        : { status: 'error', error: 'rate_limited' });
    }

    _record(_sheet(), email, source, flagged);

    /* Same answer whether a row was added, matched or flagged. See point 2 in
     * the header. */
    return _json({ status: 'success' });
  } finally {
    lock.releaseLock();
  }
}


/**
 * The subscribers tab, created with its header row if it does not exist.
 *
 * Bound to whichever spreadsheet this script is contained in, so there is no
 * spreadsheet id to keep in sync with anything. Deploy it as a container-bound
 * script from the sheet itself (Extensions -> Apps Script), which is what
 * docs/ops/email-list.md says to do.
 */
function _sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }

  return sheet;
}


/**
 * Write the signup, or reconcile it with the row already there.
 *
 * The five cases, and the two that are about safety rather than tidiness:
 *
 *   genuine, absent      append `new`
 *   genuine, is `new`    nothing to do
 *   genuine, is `spam`   PROMOTE to `new` -- a real person signing up for an
 *                        address an earlier honeypot hit had condemned is the
 *                        autofill false positive healing itself
 *   flagged, absent      append `spam`
 *   flagged, present     NOTHING. Never downgrade an existing row, or anybody
 *                        could mark a real subscriber as spam by submitting
 *                        their address with the honeypot filled
 */
function _record(sheet, email, source, flagged) {
  var found = _findRow(sheet, email);

  if (!found) {
    sheet.appendRow([new Date(), email, source, flagged ? 'spam' : 'new', '']);
    return;
  }

  if (flagged) return;

  if (String(found.status).trim().toLowerCase() === 'spam') {
    sheet.getRange(found.row, HEADERS.indexOf('status') + 1).setValue('new');
    sheet.getRange(found.row, HEADERS.indexOf('notes') + 1)
         .setValue('promoted from spam ' + new Date().toISOString());
  }
}


/**
 * The row holding this address, as {row, status}, or null.
 *
 * Reads the whole sheet down to the status column. That is fine at the scale
 * this list will ever reach by hand-typed signups; if it grows past a few
 * thousand rows, keep a lowercased map in CacheService rather than paginating
 * this. It is already the slowest part of a signup, around ten seconds on a
 * cold call.
 */
function _findRow(sheet, email) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  var emailCol = HEADERS.indexOf('email') + 1;
  var statusCol = HEADERS.indexOf('status') + 1;
  var width = Math.max(emailCol, statusCol);
  var values = sheet.getRange(2, 1, lastRow - 1, width).getValues();

  for (var i = 0; i < values.length; i++) {
    if (String(values[i][emailCol - 1]).trim().toLowerCase() === email) {
      return { row: i + 2, status: values[i][statusCol - 1] };
    }
  }
  return null;
}


/**
 * Shape check only.
 *
 * It cannot tell a real address from a plausible one -- nothing can, short of
 * sending to it -- so this rejects what is obviously not an address and lets
 * the rest through. The list is single opt-in, which means some rows will be
 * typos and some will be somebody else's address; docs/ops/email-list.md says
 * what that costs at the point the list is first mailed.
 *
 * Commas and semicolons are excluded as well as whitespace, so a pasted list
 * of several addresses is refused rather than stored as one unusable row.
 */
function _looksLikeEmail(email) {
  if (!email || email.length > MAX_EMAIL_LEN) return false;
  return /^[^@\s,;]+@[^@\s,;.]+(\.[^@\s,;.]+)+$/.test(email);
}


/**
 * Has the current hour's ceiling been reached? Bumps the counter if not.
 *
 * Call inside the script lock. The bucket key is the wall-clock hour, so the
 * window resets on the hour rather than sliding -- which is cruder than a
 * sliding window and enough for a ceiling whose only job is to stop a script
 * filling the sheet overnight.
 */
function _overRateLimit() {
  var cache = CacheService.getScriptCache();
  var key = 'signups-' + Math.floor(Date.now() / 3600000);
  var n = parseInt(cache.get(key) || '0', 10);

  if (n >= MAX_PER_HOUR) return true;

  cache.put(key, String(n + 1), 7200);
  return false;
}


/** A JSON response. */
function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


/**
 * EDITOR-ONLY. Run this from the Apps Script editor to find out where signups
 * are actually landing. It is not reachable from the web app: doGet refuses
 * everything and doPost ignores anything but the three form fields, so adding
 * this opens no read path.
 *
 * It exists because the design above deliberately gives the page no way to
 * tell an appended row from a matched one -- which is correct for privacy and
 * leaves "I signed up and the sheet is blank" with nothing to look at. This is
 * that something.
 *
 * Saving it does NOT change what /exec serves. A web app keeps serving its
 * deployed version until somebody makes a new one, so pasting this in and
 * running it is safe while the form is live.
 *
 * Read the output in the editor's Execution log.
 */
function auditList() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (!ss) {
    Logger.log('NO BOUND SPREADSHEET.');
    Logger.log('This script is standalone, not container-bound, so');
    Logger.log('getActiveSpreadsheet() is null and nothing can ever be written.');
    Logger.log('Fix: open the Sheet, Extensions -> Apps Script, and paste the');
    Logger.log('script there instead. That project is bound to that sheet.');
    return;
  }

  Logger.log('SPREADSHEET: %s', ss.getName());
  Logger.log('URL:         %s', ss.getUrl());
  Logger.log('--- every tab in it ---');

  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    Logger.log('  "%s": %s row(s), %s column(s)',
               sheets[i].getName(),
               sheets[i].getLastRow(),
               sheets[i].getLastColumn());
  }

  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    Logger.log('--- no "%s" tab here ---', SHEET_NAME);
    Logger.log('Signups went to a DIFFERENT spreadsheet than this one.');
    Logger.log('Most likely cause: the deployment was rebuilt against a new');
    Logger.log('sheet, so earlier rows are in the old one.');
    return;
  }

  var last = sheet.getLastRow();
  Logger.log('--- "%s" holds %s data row(s) ---', SHEET_NAME, Math.max(0, last - 1));

  if (last < 2) {
    Logger.log('EMPTY. The tab exists, so _sheet() ran, but nothing appended.');
    Logger.log('Check the Executions list for a doPost that threw.');
    return;
  }

  var n = Math.min(10, last - 1);
  var rows = sheet.getRange(last - n + 1, 1, n, sheet.getLastColumn()).getValues();
  Logger.log('--- last %s row(s) ---', n);
  for (var j = 0; j < rows.length; j++) {
    Logger.log('  %s', rows[j].join(' | '));
  }
}
