# High scores and hit counter — score system and site-wide hit counter: architecture, game IDs, deployment.

## High scores

All arcade game high scores are managed through the MAGMA//OPS admin dashboard on the Raspberry Pi.

### Architecture

```
Game (browser) ──WebSocket──▶ admin/server.py ──file I/O──▶ arcade/admin/scores/{game}.json
     │                                                         │
     └── localStorage fallback (offline)                       └── JSON files (one per game)
```

- **ScoreClient** — shared library that games include. Two versions:
  - `arcade/shared/adenosine-score-client.js` (recommended) — `new AdScore.ScoreClient().auto()`
  - `arcade/shared/score-client.js` (legacy) — `ScoreClient.auto()`
- **Server** (`arcade/admin/server.py`) — WebSocket actions: `score_load`, `score_save`, `scores_all`, `score_reset`
- **Storage** (`arcade/admin/scores/`) — one JSON file per game
- **Dashboard** — HIGH SCORES section in MAGMA//OPS shows all leaderboards

### Games with server-side scores

| Game | Game ID | Score type | Client |
|------|---------|-----------|--------|
| nelikko | `tetris` | points | adenosine |
| 2^N | `2n` | target reached | adenosine |
| george-boole | `george-boole` | points | adenosine |
| fifteen-puzzle | `fifteen-puzzle` | moves (ascending) | adenosine |
| klotski | `klotski` | moves (ascending) | adenosine |
| threes | `threes` | points | adenosine |
| cribbage | `cribbage` | score | adenosine |
| tarot | `tarot` | score | adenosine |
| moonlight-drift | `moonlight-drift` | obstacles passed | legacy |
| solitaire | `solitaire` | score | legacy |
| scandinavian-stud | `scandinavian-stud` | score | legacy |
| solitaire_THLD | `solitaire-thld` | score | legacy |

### Adding scores to a new game

1. Add to `index.html`:
   ```html
   <script src="../shared/adenosine-score-client.js"></script>
   <script>const scoreClient = new AdScore.ScoreClient().auto();</script>
   ```
2. In your game's scoring code:
   ```js
   // Load
   const scores = await scoreClient.load('your-game-id');
   
   // Save (auto-syncs to Pi, falls back to localStorage)
   await scoreClient.save('your-game-id', 'JAM', 12400, { level: 5 });
   ```
3. Game ID should match the JSON filename (e.g. `your-game-id` → `scores/your-game-id.json`)

### Migration from JSONBin

Run `node scripts/migrate-jsonbin.mjs` to snapshot all JSONBin scores locally. This was a one-time migration — games now use ScoreClient exclusively. No API keys in client-side code.

## Hit counter

Retro hit counter that tracks total page loads site-wide, displayed on the guestbook page.

### Architecture

```
Every page (nav.js) ──WebSocket──▶ counter-server.py ──file I/O──▶ arcade/counter/count.json
        │                                                         │
        └── CounterClient.increment() (fire-and-forget)           └── {"count": N}
```

- **Server** (`arcade/counter/counter-server.py`) — WebSocket on port 8783, persists count to JSON
- **Client** (`assets/counter-client.js`) — shared library loaded by nav.js on every page
- **Which host the client dials** is decided only by `_getWsUrl()` in that file: `localhost`/`127.0.0.1` pages talk to the Pi on the LAN, everything public goes through nginx on `magmacrunch.duckdns.org`. Its allowlist is a security control, the same one `MC_CHAT_OPTS` carries for chat (see [chat-system.md](chat-system.md) under "Which host the widget dials"): an unrestricted `?counter-server=` override would let a crafted link have every visitor's page load counted by, and the fact of their visit disclosed to, a host of the sender's choosing. Permitted hosts are loopback, the page's own hostname and the backend for that branch; anything else is ignored and the default stands. The host is read off the URL parser rather than by splitting the string, because a value carrying userinfo (`allowed.host:8783@attacker.example`) splits to the allowed name and connects somewhere else. Do not re-derive the host anywhere else.
- **Display** (`assets/counter.css`) — retro LED digit styling for the guestbook page
- **Storage** (`arcade/counter/count.json`) — `{"count": N}`

### How it works

1. `nav.js` loads `counter-client.js` on every page with a `<nav>` element
2. On first page load per session, `CounterClient.increment()` fires a WebSocket message to the Pi
3. The server bumps the count and persists to `count.json`
4. On the guestbook page, `CounterClient.display('#hit-counter')` renders the retro LED counter

### Adding counter to a new page

To display the counter on another page:
```html
<link rel="stylesheet" href="../assets/counter.css">
<div id="hit-counter"></div>
<script>CounterClient.display('#hit-counter');</script>
```

### Disabling counter on a page

Add `no-counter` to the `<body>` class:
```html
<body class="no-counter">
```

### Deploying counter-server.py

```bash
rsync -avz arcade/counter/ jake@192.168.1.16:~/arcade/counter/
ssh jake@192.168.1.16 "sudo systemctl restart arcade-counter"
```

