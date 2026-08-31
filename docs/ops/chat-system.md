# Arcade chat system — SharedWorker architecture, handshake gate, rate limits, rooms, services.json, deployment.

## Arcade chat system

The chat widget provides a floating real-time chat on nearly every arcade page.
It uses a SharedWorker (`shared/chat-worker.js`) to hold a single WebSocket
connection across page navigations — preventing duplicate users when navigating
between games.

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
  `--port`, and because 8782 is not proxied by nginx and nothing has confirmed
  the unit is enabled — probing it would invent a "service down" alert.

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


