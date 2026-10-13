# Arcade chat system — SharedWorker architecture, handshake gate, rate limits, rooms, services.json, deployment.

## Arcade chat system

### RETIRED from the arcade, 2026-10-12. The server still runs.

**No page in this repository loads the widget any more**, and as of 2026-10-12
the four files it ran on are **deleted**, not merely unreferenced:
`shared/adenosine-chat.js`, `shared/chat-worker.js`, `shared/chat-widget.css`
and the hand-written `shared/chat-server.js`. `chat-server.py` on 8768 has no
clients. Everything below describes how it worked and is kept because the
server is still deployed and the reasoning is still worth having; read it as
history, not as the current state.

#### Why they were deleted rather than left dormant

Because dormant was not what they were. The retirement was judged safe on the
grounds that no page loads the widget, which was true of the pages that already
existed and false of the ones `scripts/scaffold-game.mjs` makes: it went on
emitting `chat-widget.css`, `adenosine-chat.js`, `chat-server.js` and a
`ChatWidget.connect(MC_CHAT_OPTS)` call into every new game page. So the next
`scaffold-game` run would have made the widget live again, and the check that
was supposed to notice could not, because a page that does not exist yet loads
nothing.

That mattered because the vendored bundle was built from
`@magmacrunch/adenosine-chat` **0.6.0**, which carries the userinfo allowlist
bypass. `hostOf()` read the host by stripping the scheme and then splitting on
`/` and `:`, which returns the text in front of the first colon. For a value
carrying userinfo that text is the credentials and not the host, so

```
?server=<allowlisted-host>:443@evil.example.com
```

matched the allowlist on a name the socket was never going to open, and the
socket went to `evil.example.com`. The page's own hostname is always permitted,
so naming it in front of the `@` was enough on its own and no deployment had to
be misconfigured. What that cost is the whole point of having an allowlist, and
it is the sentence further down this page: the widget replays the visitor's
saved credentials as soon as its socket opens, so a crafted link handed them to
a host of the sender's choosing. HIGH severity, and it was two paths away from
live rather than one.

adenosine `0a9f39c` fixes it by reading the hostname off the `URL` parser, the
parser the `WebSocket` constructor itself uses, released as **0.6.1**. That was
**not on npm** when this was written, so `node_modules` held only the
vulnerable build and a plain `npm run build:adenosine` would have copied it
back over any fixed file put there by hand.

Three things were therefore done together, and the third is the one worth
remembering:

- the four files deleted, and `.gitattributes` and
  `scripts/generate-theme-audit.mjs` stopped naming two of them;
- the chat block removed from `scaffold-game.mjs`;
- **`chat` de-registered from `scripts/sync-adenosine.mjs`** -- out of
  `PACKAGES`, `EXTRA_ASSETS` and `PACKAGE_CSS`, and `chat-server.js` out of
  `LOCAL_SHARED`. Without this last one the deletion undoes itself: the next
  sync for some unrelated package copies 0.6.0 straight back out of
  `node_modules`.

`arcade/tests/test-chat-retired.js` holds all three. It asserts the files are
absent, that no page in the repository loads them, that the scaffolder generates
none of them (by running it against a throwaway root and reading the real
output), and that the sync script does not list `chat`. Each of its sweeps
asserts it found a corpus before concluding anything from it, so it cannot pass
by finding nothing.

#### Three live references were left alone on purpose

None of them can load anything, and each costs more to remove than it costs to
keep:

- **`nav.js` still does `getElementById('arcadeChatWidget')`** and hides it on
  non-arcade pages. The element never exists now, so the guard is inert. It was
  removed and then put back, because **any** edit to `nav.js` changes its
  content hash and restales the `nav.js?v=` stamp on about 110 pages, which
  `npm run check` then fails until every one is rewritten. A whole-site restamp
  is not worth deleting an inert null check, and it would collide with every
  other session editing a page. Fold it into the next change that has to touch
  `nav.js` anyway.
- **`arcade/makemecookies/css/layout.css` styles `#arcadeChatWidget`** in its
  landscape block, and reserves the corner with
  `.touchpad, .controls { padding-left: 64px; }`. The selector is dead; the
  padding is now 64px of landscape phone reserved for nothing. Removing it is a
  layout change to a game rather than cleanup, so it wants somebody looking at
  the result on a phone.
- **`.eslintrc.json` keeps `AdChat`** while dropping `ChatWidget`.
  `ware/adenosine/` genuinely still uses `AdChat`, see below.

#### What is NOT covered, and still points at 0.6.0

`ware/adenosine/` is the package showcase and loads its copies from jsDelivr
rather than from `arcade/shared/`. Both `ware/adenosine/playground.js` and
`ware/adenosine/theme.js` pin `chat` at **0.6.0**, and
`ware/adenosine/examples/chat-widget.js` mounts the widget when a visitor picks
the chat package. That page is same-origin with the arcade, so chat credentials
saved in `localStorage` while the widget was live are still reachable from it.
The pins cannot simply be raised: 0.6.1 is not published, so pointing jsDelivr
at it would 404 and take the playground down. Raise them in the same change
that publishes 0.6.1.

Why it went, since the reasons are the useful part:

- **It was one global room on every page it appeared on.** Two matches of the
  same game shared a chat, and so did a chess game and a cribbage game. The
  widget has rooms, and the three games that tried to use them guarded the call
  on `typeof Chat !== 'undefined'` while calling `ChatWidget`. `Chat` never
  existed here, so room scoping never once ran.
- **Chat belongs to the game server, and six games already had it.**
  `server_base.py`'s `_handle_chat` takes the room from the connection and
  broadcasts only to it, so cross-match leakage is impossible by construction.
  SORRY, chess, scandinavian-stud and cribbage reach it through the shared
  client's `sendChat`; aggravation and parchisi send `type:'chat'` themselves.
- **Nothing was using it.** Global history lived in memory and died on every
  restart, and a push to `main` restarts every `arcade-*` unit.

Two consequences worth knowing:

- **`arcade-chat` is still in `services` in `services.json`**, so `start-all.sh`
  starts it and the health bot TCP-probes it every half hour and alerts when it
  is down. That is now an alert path for a service with no clients. Moving it to
  `dashboard_only`, or retiring the unit, is a decision nobody has taken.
- **The arcade index no longer depends on 8768, and this bullet used to say it
  did.** It read "`arcade/index.html` still loads `shared/chat-server.js` and no
  widget", so retiring the unit would break the MULTIPLAYER ONLINE dot. That was
  true when it was written and false by the time `chat-server.js` was deleted:
  the page loads `shared/mp-server.js` now and the dot probes the host a game
  actually dials, via `mpServerFor()`, which is also the right question for a dot
  with that label. So **nothing in this repository reads 8768 any more**, and
  moving `arcade-chat` to `dashboard_only` or retiring the unit costs the dot
  nothing. Still a decision nobody has taken, but no longer one with a hostage.

- **backgammon, checkers and chinese-checkers now have no chat at all.** They
  never had working match chat to lose: no chat UI in the page and a receive
  handler with no send path. Giving them chat means copying cribbage, a panel
  plus `sendChat` plus `MP.onChatMessage`, not reviving any of this.

### How it worked

The chat widget provided a floating real-time chat on nearly every arcade page.
It used a SharedWorker (`shared/chat-worker.js`) to hold a single WebSocket
connection across page navigations — preventing duplicate users when navigating
between games.

**One defect was never fixed, and matters if it is ever revived.** The page
posts `{_worker:"connect"}` after `new SharedWorker(...)` has already triggered
`onconnect`, and both paths send the cached `history` when the socket is open.
`addMessage` appends with no dedup, so every historical message rendered twice
on any reload inside the worker's 3s idle window, or in a second tab. The same
double delivery runs `sendSavedCredentials()` twice, which is the
`set_name`-twice case the presence notes below describe as a source of ghost
roster entries. The fix belongs in the adenosine repo, not here.

**The widget is generated, the server is not.** `shared/adenosine-chat.js`,
`shared/chat-worker.js` and `shared/chat-widget.css` are synced from the
`@magmacrunch/adenosine-chat` npm package by `npm run build:adenosine`; an edit
made to any of them here survives until the next sync and is then silently
overwritten. Change them in the [adenosine](https://github.com/magmacrunch-media/adenosine)
repo, publish, and re-sync. `shared/chat-server.js` is hand-written and lives here.

### Architecture

```
Page (browser) ──postMessage──▶ SharedWorker ──WebSocket──▶ chat-server.py (port 8768)
     │                              │
     └── sendToServer() ────────────┘
```

- **SharedWorker** holds one WebSocket. Pages connect via `postMessage`. Caches history/user_list/status for new pages.
- **Session tokens** stored in `localStorage` (one per browser profile). Server tracks disconnected users for 30s and restores name, color, *and room membership* on reconnect.
- **Server** delays `user_info` creation until `set_name` arrives (no anonymous flicker).
- **Which host the widget dials** is decided only by `MC_CHAT_OPTS` in `shared/chat-server.js` — LAN and Tailscale hosts talk to port 8768 directly, everything public goes through nginx on `magmacrunch.duckdns.org`. Its `allowlist` is a security control: the widget replays saved credentials as soon as the socket opens, so an unrestricted `?server=` override would hand a visitor's identity to any host named in a crafted link. Do not re-derive the host anywhere else.

### Adding chat to a game page

**This no longer works, and pasting it is the mistake this page exists to
prevent.** All four files are deleted and `chat` is de-registered from
`sync-adenosine.mjs`, so these tags 404 and `npm run build:adenosine` will not
bring them back. `arcade/tests/test-chat-retired.js` fails if they appear in a
page. Kept for the shape of it:

```html
<link rel="stylesheet" href="../shared/chat-widget.css">
<script src="../shared/adenosine-chat.js"></script>
<script src="../shared/chat-server.js"></script>
<script>AdChat.ChatWidget.connect(MC_CHAT_OPTS);</script>
```

`npm run build:adenosine` used to stamp the `?v=` cache-busting hashes on those
tags.

**For match chat inside a game, which is what this is nearly always wanted
for, do not use any of it.** Chat belongs to the game's own server, which takes
the room from the connection and so cannot leak across matches. Copy cribbage:
a panel, `sendChat`, and `MP.onChatMessage`.

**To genuinely revive the floating widget** needs, in order:
`@magmacrunch/adenosine-chat` 0.6.1 or newer published and installed (0.6.0
carries the userinfo bypass above); `chat` added back to `PACKAGES`,
`EXTRA_ASSETS` and `PACKAGE_CSS`, and `chat-server.js` to `LOCAL_SHARED`, in
`sync-adenosine.mjs`; `chat-server.js` recovered from history rather than
rewritten, because its `allowlist` is the security control and a fresh shim is
where that gets left out; and `test-chat-retired.js` replaced by something
shaped like `test-multiplayer-host.js`, which holds a served bundle to the
userinfo cases rather than asserting its absence.

### Public API

```js
ChatWidget.connect(opts)
ChatWidget.disconnect()
ChatWidget.joinRoom(code)
ChatWidget.leaveRoom(code)
ChatWidget.setName(name)
ChatWidget.setColor(color)
ChatWidget.getMyName()
ChatWidget.getMyColor()
```

### Shared handshake gate and rate limits

`chat-server.py` imports `client_ip`, `ip_limiter`, `make_reject_request` and
`limiter_janitor` from `shared/multiplayer/server_base.py`, the same module the
game servers use. That module owns:

- **`client_ip`** — reads nginx's `X-Real-IP`, but only when the TCP peer is loopback. Behind the proxy every connection looks like `127.0.0.1`, so without this every visitor shares one rate-limit bucket. Not `X-Forwarded-For`: nginx *appends* to that one, so a client can seed it.
- **`origin_allowed`** — refuses cross-origin browser handshakes. A missing `Origin` is allowed (health bots, the admin dashboard, tests); `null` is not, so **local development must be served over http, not opened off disk**.
- **`ip_limiter`** — one process-wide limiter keyed by `(ip, action)`. The old per-connection limiters reset on reconnect, which cost a spammer one extra socket.
- **`make_reject_request(max_connections=...)`** — the `process_request` gate. Plain HTTP still gets 426, so the health bot keeps working. Games allow 10 new sockets per IP per minute; chat allows 30, because browsers without SharedWorker support open one per page navigation.

### Presence: what "N online" counts

The roster is people, not sockets. `user_list_message()` walks `sessions` and
skips any with an empty `sockets` set, so a person with three tabs is one entry
and a recently disconnected one is none.

Three things make that number trustworthy, and each was a defect first:

- **Every socket is sent `user_list` on connect**, alongside `history` and
  `status`. It used to arrive only as a side effect of the widget's own
  `set_name` — which is rate limited per IP and dropped *silently* when the
  budget is spent. The widget draws its count from `user_list` and nothing else
  and never resets it, so a socket that missed the frame displayed a stale
  number for as long as the page stayed open. The arriving socket has no session
  yet, so it is correctly absent from the roster it receives.
- **`attach_socket` detaches the socket from its previous session first.**
  Without that, a socket that sent `set_name` twice under different tokens was
  left in both sessions' `sockets` sets. Only the second could ever be detached,
  so the first stayed permanently online — never emptied, never stamped with
  `last_seen`, never swept by `session_cleanup`. It survived the visitor, the
  connection and every `SESSION_TIMEOUT`, and cleared only on restart. The
  widget reaches this when `localStorage` is unreadable on the first connect
  (`getSessionToken()` returns `null`, so the server invents an anon token) and
  readable on a later `set_name`.
- **There is no `global_users` broadcast.** It counted `len(connected_clients)`
  — sockets — and the widget feeds it into the same counter as `user_list`, so
  whichever landed last won. It was dead code; it is now a comment saying why
  not to add it back.

Two more, added with `adenosine-chat` 0.6.0, where the server holds half:

- **`set_name` is what puts somebody on the roster, and the widget now holds it
  back** until the visitor sends a message, joins a room, or picks a name or
  colour. It used to go out on every connect, so merely loading a page
  registered a `PlayerNN`. Expect sockets that never name themselves: they get
  history, status and the roster, and are simply not in it. The gates that
  already existed — `session_of(websocket) is None` on `chat`, `join_room`,
  `set_color`, `typing` — are what make that safe.
- **`presence`** carries `here` or `away`, and away sessions stay in `users`
  flagged but drop out of `count`. Only the page can know this: the liveness
  check is WebSocket ping/pong, answered by the browser's network stack without
  the page being involved, so a backgrounded tab on a pocketed phone is
  indistinguishable from somebody at the keyboard. `attach_socket` clears a
  stale `away` when a session gains its first socket back, so a widget too old
  to send `presence` cannot get stuck away.

One thing the count still gets wrong, and it is inherent rather than a bug:

- **Identity is per-origin.** The session token lives in `localStorage`, so the
  same person on the LAN, on magmacrunch.com and on a phone is three people.
  It is why the count looks inflated when you are testing across your own
  devices. Fixing it needs an explicit claim code, not a cleverer key.

Keying identity on IP instead would be worse, not better: everything behind one
NAT (a household, an office) would collapse into a single identity that inherits
name, color *and* room membership, mobile CGNAT addresses are shared and rotate
between towers, and IPv6 privacy extensions rotate daily. It is also the same
credential-handoff shape the `?server=` allowlist exists to prevent — the widget
replays saved credentials as soon as the socket opens.

### Room codes and history

Room codes must match `^[A-Z0-9]{4,8}$` and there is a cap of 200 live rooms.
Chatting into a room requires being a member of it. When the last member leaves,
both the room and its stored messages are dropped — the messages used to be left
behind, so every code the arcade ever issued kept its transcript until restart.

### The `get_history` dump

`get_history` returns every room's private sub-chat, so it requires
`ARCADE_ADMIN_TOKEN`. Set the same value for `arcade-chat` and `arcade-admin`;
both units read `/home/jake/arcade-secrets.env` (optional include, so a
missing file leaves the dashboard's chat panel empty rather than failing to
start). Create it on the Pi:

```bash
umask 077 && openssl rand -hex 32 | sed "s/^/ARCADE_ADMIN_TOKEN=/" > /home/jake/arcade-secrets.env
```

It sits beside `~/arcade`, not inside it: `deploy-pi.yml` rsyncs `arcade/` with
`--delete`, so a secret stored under `~/arcade` would be erased on the next push
to `main`.

An unauthenticated request is ignored rather than refused: `chat-worker.js` still
sends one on every socket open, and an error frame there would surface as a
broken widget. Dropping that call is a pending change in the adenosine repo.

### Service list

Ports, directories, icons and nginx paths live in `arcade/shared/services.json`.
`chat-server.py` (status panel), `start-all.sh`, `scripts/bot-check-services.sh`
and `admin/server.py` (dashboard cards, and the allowlist of units it will
restart) all read it. Adding a game means an entry there, a unit in
`arcade/systemd/`, and a `location` block in `scripts/nginx-magmacrunch.conf`.

The manifest has two arrays and the difference is load-bearing:

- `services` — started by `start-all.sh` and TCP-probed by the health bot every
  30 minutes. An entry here is also an alert path, and it must take `--port`.
- `dashboard_only` — units that exist on the Pi but are neither started nor
  probed. Only `admin/server.py` reads it. `arcade-private` (8782) sits here
  because `private/server.py` reads its port from `config.json` rather than
  `--port`, and because 8782 is not proxied by nginx. The unit **is** enabled and
  active, confirmed 2026-10-04; this used to say nothing had confirmed that, and
  believing it is part of why the service ran for months on DEFAULT_CONFIG with
  the password `changeme`, its `config.json` having never been created. Probing
  it over the tailnet would work, since 8782 answers there; it is left in
  `dashboard_only` because the port still comes from config rather than `--port`.

`arcade-admin` is in neither array. It is the dashboard's own process, so
`admin/server.py` hardcodes it into `VALID_UNITS`: restartable by name, never
drawn as a card.

`VALID_UNITS` is what the dashboard hands to `systemctl restart`, so
`admin/server.py` parses the manifest once at import and validates every field
before trusting it — unit names must match `arcade-<slug>`, and `name`/`icon` are
rejected if they contain HTML metacharacters, because `static/arcade.js` and
`static/status.js` put both into `innerHTML` unescaped. A manifest it cannot
validate raises, so the unit fails to start with the reason in the journal rather
than coming up with a half-built allowlist. `arcade/shared/tests/test_services.py`
covers all of this.

### Deploying chat-server.py

A push to `main` deploys everything: `.github/workflows/deploy-pi.yml` rsyncs the
whole of `arcade/` and restarts every `arcade-*` unit. To push by hand instead,
note that `chat-server.py` now imports from `server_base.py` and reads
`services.json`, so all three have to go together:

```bash
rsync -avz arcade/chat-server.py jake@192.168.1.16:~/arcade/chat-server.py
rsync -avz arcade/shared/services.json jake@192.168.1.16:~/arcade/shared/services.json
rsync -avz arcade/shared/multiplayer/server_base.py jake@192.168.1.16:~/arcade/shared/multiplayer/server_base.py
ssh jake@192.168.1.16 "sudo systemctl restart arcade-chat 'arcade-*'"
```

The game servers restart too: they share `server_base.py`.

### Note on websockets library

`chat-server.py` uses `websockets.datastructures.Headers` for the handshake
responses (not a plain dict). This is required by `websockets` >= 14.x. If you
see `AttributeError: 'dict' object has no attribute 'serialize`, the import is
missing.


