# Arcade chat system — SharedWorker architecture, handshake gate, rate limits, rooms, services.json, deployment.

## Arcade chat system

### RETIRED from the arcade, 2026-10-12. The server still runs.

**No page in this repository loads the widget any more**, so
`shared/adenosine-chat.js`, `shared/chat-worker.js` and `shared/chat-widget.css`
are unreferenced and `chat-server.py` on 8768 has no clients. Everything below
describes how it worked and is kept because the server is still deployed and the
reasoning is still worth having; read it as history, not as the current state.
Confirm with `grep -rl adenosine-chat.js --include=*.html .` before believing
either way.

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
- **`arcade/index.html` still loads `shared/chat-server.js`** and no widget. Its
  `MC_CHAT_OPTS` is what the MULTIPLAYER ONLINE probe dials, so the status dot on
  the arcade index depends on 8768 answering. Retiring the unit breaks that dot.

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

```html
<link rel="stylesheet" href="../shared/chat-widget.css">
<script src="../shared/adenosine-chat.js"></script>
<script src="../shared/chat-server.js"></script>
<script>AdChat.ChatWidget.connect(MC_CHAT_OPTS);</script>
```

`npm run build:adenosine` stamps the `?v=` cache-busting hashes on those tags.

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


