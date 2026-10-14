# Email list - the signup page, the Apps Script behind it, and what single opt-in costs later.

`home/email-list.html` collects email addresses. There is no newsletter yet and
that is the point: the list exists so that whoever decides what the newsletter
is has an audience to send it to, and the decision is not blocked on building
this first.

## Why Apps Script and not something better

The site is served by GitHub Pages straight from this repo, so there is no
backend to post to. Three options were weighed on 2026-10-12:

| | |
|---|---|
| **Apps Script into a Sheet** | chosen. Free, nothing to run, up when the Pi is not, and the list is a spreadsheet exportable into whatever tool eventually sends the mail |
| the Pi | addresses would stay on owned hardware, but a signup during a Pi or home-connection outage is lost, and this is data that cannot be re-collected |
| Buttondown or Mailchimp | solves sending and double opt-in too, and commits to a product before anybody has decided what the mail is |

The deciding argument for the Sheet is that it **defers the newsletter
decision completely**. Nothing about the storage choice constrains the eventual
sender, because a CSV imports anywhere.

The deciding argument against the Pi is not reliability in the abstract. It is
that every other thing on the Pi fails visibly -- a game will not load, the
counter does not tick -- whereas a lost signup looks exactly like nobody having
signed up.

## It is the guestbook's pattern, with three deliberate differences

`home/guestbook.html` already posts to an Apps Script endpoint, and this is the
same shape: a public script URL, `FormData` in, JSON out. The differences all
come from the payload being personal data rather than a public message.

1. **Write-only.** The guestbook's `doGet` returns every entry, which is
   correct for a wall of messages that is displayed on the page. Here the
   script URL sits in page source, so a `doGet` that listed rows would be a
   public dump of the list. `doGet` returns a refusal and there is no read path.
2. **A repeat signup is indistinguishable from a first one.** Both answer
   `success`; only the first appends a row. Answering "already subscribed"
   would let anyone test whether a given address is on the list.
3. **Unsubscribes change the `status` column to `off` rather than deleting the
   row.** A deleted row cannot be told apart from one that never arrived, and
   the one record that must survive is evidence that somebody asked to be left
   alone.

## The script lives in this repo

`scripts/email-list.gs` is the source of truth. Paste it into the script
editor; do not edit it there and leave the browser holding the only copy. The
guestbook's script exists nowhere but Google, which is why nobody can say what
it does without opening it.

## Deploying it

Browser work, about five minutes, and the only step that cannot be done from a
checkout.

1. Create a Google Sheet on the magmacrunch account. Name it something like
   `magmacrunch email list`. Leave the tab alone; the script creates a
   `subscribers` tab with its own header row on the first write.
2. In that sheet: **Extensions -> Apps Script**. This makes a
   *container-bound* script, which is what `_sheet()` relies on: it calls
   `SpreadsheetApp.getActiveSpreadsheet()`, so there is no spreadsheet id to
   paste anywhere and nothing to keep in sync. A standalone script would need
   `openById` instead.
3. Replace the stub `Code.gs` with the whole of `scripts/email-list.gs`.
4. **Deploy -> New deployment**, type **Web app**:
   - *Execute as*: **Me**. The script writes to the sheet as the owner.
   - *Who has access*: **Anyone**. This means anyone may POST, which is what a
     public signup form is; the honeypot and the hourly ceiling are what keep
     that from being a liability.
5. Authorise it when prompted. It asks for the spreadsheet and external-request
   scopes.
6. Copy the `/exec` URL and set `SCRIPT_URL` in `home/email-list.html`.

**Until `SCRIPT_URL` is set the form disables itself** and offers
`info@magmacrunch.com` instead. That is deliberate: a form that accepts an
address and drops it is worse than no form, because the visitor leaves
believing they are on the list.

### Redeploying after a script change

**Deploy -> Manage deployments -> edit the existing deployment -> New version.**
Creating a *new deployment* instead mints a different `/exec` URL and leaves the
old one live, so the page keeps posting at the previous code and the change
appears not to have worked.

## Two things the browser will not let you get wrong quietly

**Send `FormData`, never JSON.** `FormData` keeps the request inside the CORS
"simple request" rules, so no preflight is sent. Apps Script cannot answer an
`OPTIONS` preflight at all -- there is no `doOptions` -- so a page switched to
`Content-Type: application/json` fails in every browser while still working
from `curl`, which is a confusing way to break it.

**The response arrives via a redirect.** Apps Script answers a POST with a 302
to `googleusercontent.com`; `fetch` follows it and `r.json()` reads the body.
This works and the guestbook has relied on it for as long as it has existed.
It does mean a request cannot be made `redirect: 'error'` or inspected for its
original status.

## The honeypot name is load-bearing, and got this wrong once

**The field was called `website` for one day and it dropped real signups.**
Chrome and every password manager autofill a field named `website`, `url`,
`email`, `name`, `phone` or `address` whatever `autocomplete="off"` says, since
that attribute is advisory. A genuine visitor submitted the form with the
honeypot already filled by their browser, the script read it as a bot, and the
signup was discarded while the page said "you are on the list".

It is `referral_code` now, and the rule is that the name must match no autofill
heuristic. `autocomplete="off"` is still there and is not what makes it safe.

**The deeper fix is that a flagged submission is now RECORDED, with status
`spam`, rather than discarded.** Dropping it silently is what made the bug
invisible: there was nothing to find afterwards and the caller had been told it
worked. A false positive now sits in the sheet where it can be seen and undone.

`_record()` holds the five cases. Two of them are about safety rather than
tidiness, and both have tests:

| | |
|---|---|
| a genuine signup for an address sitting in `spam` | **promoted** back to `new`, which is the autofill false positive healing itself |
| a flagged submission for an address already present | **nothing**, because otherwise anybody could mark a real subscriber as spam by submitting their address with the honeypot filled |

So `spam` in that column means "this script thought it was a bot", not "this is
a bot". Read it before the first send rather than trusting it.

## Finding out where signups actually went

`auditList()`, at the bottom of `scripts/email-list.gs`. Run it from the editor:
paste the file in, save, pick it from the function dropdown, Run, and read the
Execution log. **Saving does not change what `/exec` serves**, because a web app
keeps serving its deployed version until somebody makes a new one, so this is
safe to do while the form is live.

It prints the bound spreadsheet's name and URL, every tab with its row count,
and the last ten rows. That separates the three ways "I signed up and the sheet
is blank" can happen:

| what it prints | what happened |
|---|---|
| no bound spreadsheet | the script is standalone rather than container-bound, so nothing can ever be written. Re-create it from the sheet via Extensions -> Apps Script |
| a `subscribers` tab with rows in it | you were looking at `Sheet1`. The script makes its own tab and never writes to the default one |
| no `subscribers` tab at all | the rows are in a different spreadsheet, usually because the deployment was rebuilt against a new sheet |
| the tab exists and is empty | `_sheet()` ran but nothing appended. Check Executions for a `doPost` that threw |

It is editor-only on purpose. `doGet` refuses everything and `doPost` reads only
its three form fields, so this adds no way to read the list over HTTP.

## What single opt-in costs, and when it comes due

Nothing confirms that the person typing an address owns it. So the list will
contain typos, and possibly an address somebody entered maliciously. That costs
nothing while nothing is sent, and comes due in full the first time it is:

- Mail to a typo'd address bounces, and a pattern of bounces is what gets a
  sending domain marked as spam.
- Mail to an address whose owner never asked is the complaint that does real
  reputation damage.

So **before the first send**, do one of these:

- Put the list through whatever tool is chosen and use **its** confirmation
  flow. Buttondown and Mailchimp both import a list and can require
  confirmation before sending, which spends the problem at the point where the
  tooling exists to handle it.
- Or add a confirmation step here. The script is already running as an account
  that can send mail, so `MailApp.sendEmail` plus a token column and a
  `?confirm=` route in `doGet` is maybe forty lines. It was left out on purpose
  rather than overlooked: it is work that buys nothing until a send is actually
  planned, and the shape of it depends on the tool chosen.

Either way the `status` column is where the answer goes, and `new` means
exactly "collected, never confirmed, never mailed".

## Reading the list

Open the sheet. There is no API in this repo for it and deliberately no read
endpoint, so `magmascript` has no command here either.

To get it into a sending tool: **File -> Download -> CSV**. The `status` column
is what to filter on, and anything other than `new` wants reading before it is
imported.

## If signups stop arriving

The page reports a failure to the visitor, so the first sign is somebody saying
so rather than a monitor. Nothing watches this, which is a real gap and the same
one `docs/ops/ci-bots.md` describes for the backup workflow: a thing with no
second path to notice it is noticed by somebody looking.

| symptom | cause |
|---|---|
| "could not reach the list" | the deployment was replaced rather than versioned, so `SCRIPT_URL` points at a retired `/exec`. See the redeploy note above |
| "could not add you" with `bad_email` on a valid address | `_looksLikeEmail` is stricter than intended. It rejects commas and semicolons on purpose, so a pasted list of addresses is refused rather than stored as one unusable row |
| "too many at once" | `MAX_PER_HOUR`, 60 a wall-clock hour, shared across all callers. Either a flood, or the ceiling is now too low for real traffic |
| rows stop appearing, no error on the page | check the sheet is not full or renamed. `_sheet()` recreates a missing `subscribers` tab, so a renamed tab reads as zero subscribers rather than as an error |

Apps Script keeps its own execution log: **Executions** in the script editor,
which is the only place a server-side exception is visible.

## Privacy

The page states what is collected and why, in `// the deal //`: the address,
and the path of the page it was submitted from. No name, nothing tracked, not
shared, and unsubscribing is one mail to `info@magmacrunch.com`.

`privacy/` holds one policy per app and `privacy/index.html` says the site's own
games are covered by the site rather than by those pages -- but there is no
site-wide policy page for it to mean. This list is the first thing the site
collects that identifies a person, which makes that gap worth closing; the
page's own statement is what stands in for it today.
