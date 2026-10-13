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
 * 3. Rows are never deleted on unsubscribe -- the `status` column changes to
 *    `off` instead. A deleted row is indistinguishable from one that never
 *    arrived, and the one thing that must survive here is evidence of who
 *    asked to be left alone.
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

  /* Honeypot. The field is present in the form, hidden from people and
   * labelled to look worth filling to a bot. Anything in it means the sender
   * is not a person, so answer success and drop the submission -- a visible
   * rejection tells a spammer what to change. */
  if (String(p.website || '').trim() !== '') {
    return _json({ status: 'success' });
  }

  var email = String(p.email || '').trim().toLowerCase();
  if (!_looksLikeEmail(email)) {
    return _json({ status: 'error', error: 'bad_email' });
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
      return _json({ status: 'error', error: 'rate_limited' });
    }

    var sheet = _sheet();
    if (!_alreadyPresent(sheet, email)) {
      sheet.appendRow([new Date(), email, source, 'new', '']);
    }

    /* Same answer whether or not a row was added. See point 2 in the header. */
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
 * Is this address already on the list?
 *
 * Reads the whole email column. That is fine at the scale this list will ever
 * reach by hand-typed signups; if it grows past a few thousand rows, keep a
 * lowercased set in CacheService rather than paginating this.
 */
function _alreadyPresent(sheet, email) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  var col = HEADERS.indexOf('email') + 1;
  var values = sheet.getRange(2, col, lastRow - 1, 1).getValues();

  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === email) return true;
  }
  return false;
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
