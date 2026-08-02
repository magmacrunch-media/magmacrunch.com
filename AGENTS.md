# AGENTS.md — magmacrunch.com

## Dev approach

Open `index.html` directly in browser. No build server, no package manager, no tests.

## Project structure

```
/                      # root: index.html, style.css, nav.js
├── animations/        # extracted canvas animations (volcano, cereal, coin, server, floppy)
├── arcade/            # self-contained pixel games (each has index.html + js/css)
├── archive/           # artist/place pages with MusicBrainz API integration
│   ├── archive.css    # page-specific styles for archive index
│   ├── emerac.js      # EMERAC component (LED grid, CRT display, MusicBrainz fetch)
│   ├── by-artist/     # artist stubs with window.ARTIST_CONFIG or window.COLLECTIVE_CONFIG
│   ├── by-place/      # place stubs with window.PLACE_CONFIG
│   ├── by-label/      # label stubs with window.__LABEL_CONFIG
│   ├── by-contributor/ # contributor stubs with window.__CONTRIBUTOR_CONFIG
│   └── _cache/        # MusicBrainz data backups (JSON)
├── home/              # about.html, guestbook.html, links/
├── music/             # distributed-music.html, floppy-disk/
├── press/             # journals: scientific/, experimental/
├── scripts/           # backup-musicbrainz.mjs
├── templates/         # JS template scripts for archive pages
└── visual/            # gallery pages (collage, photography, music-videos, teevee)
```

## Key conventions

- **Retro aesthetic required**: Keep "Press Start 2P" font, CRT scanlines, neon colors, pixel art
- **Self-contained games**: Each arcade subfolder works standalone - don't add cross-game dependencies
- **MusicBrainz rate limit**: API allows ~1 req/sec. `fetchWithRetry` handles backoff - don't batch-fetch
- **Canvas pixel art**: Use `image-rendering: pixelated` and draw at low resolution (64x64), scale with CSS
- **Config via `window.*_CONFIG`**: Archive pages define config objects inline, templates read them
- **Collective templates**: Multi-artist groups use `window.COLLECTIVE_CONFIG` with `ids[]` array. Templates: `collective_recordings.js`, `collective_releases.js`, `collective_works.js`

## Extracted animations

Canvas animations are extracted from page HTML into `animations/`:

| File | Used by | Description |
|---|---|---|
| `volcano.js` | `index.html` | Erupting volcano with cereal particles |
| `cereal.js` | `home/about.html` | Cereal pouring into bowl with milk |
| `coin.js` | `arcade/index.html` | Spinning gold coin sprite |
| `server.js` | `arcade/index.html` | Retro mainframe with CRT, tapes, LEDs |
| `floppy.js` | `music/physical-media/floppy-disk/` | Floppy disk with glint animation |

Each file is a self-contained IIFE with named constants, visibility change handling, and `window.__pageCleanup` hook for the SPA router.

## Page-specific CSS

Some pages extract inline CSS to separate files:
- `archive/archive.css` — archive index page styles + EMERAC component
- `arcade/arcade.css` — arcade index page styles + game card grid

## MusicBrainz cache

Templates check local JSON cache before hitting the MusicBrainz API. Run `node scripts/backup-musicbrainz.mjs` to snapshot all data. A GitHub Action runs this weekly with `--skip-existing`.

Cache location: `archive/_cache/{artists,places,contributors,labels}/{uuid}.json`

## Theming nav colors

When overriding nav colors (border, brand text, glow), set CSS variables on `:root`, NOT on a body class. The `body.class` approach does not reliably override the fallback values in style.css.

```css
/* CORRECT — matches guestbook pattern */
:root {
    --nav-accent: #FF1F5B;
    --nav-glow: rgba(255,31,91,0.4);
    --nav-brand: #00C2FF;
    --nav-brand-glow: rgba(0,194,255,0.7);
}

/* WRONG — does not work */
body.my-theme {
    --nav-accent: #FF1F5B;
    /* ... */
}
```

Use `body.my-theme` only for non-nav overrides (background, text colors, etc.).

## Page-specific color themes

Visual pages use a three-part theming pattern:

1. **`visual/visual.css`** — shared base styles (main layout, breadcrumb, page-header, footer, dropdown) that consume CSS custom properties
2. **`:root`** — nav overrides + theme palette + shared pattern vars (`--bc-accent`, `--footer-border`, `--footer-accent`, `--dd-1`–`--dd-5`, `--dd-hover-color`, `--dd-hover-bg`)
3. **`body.theme-name`** — page overrides (background, text, dim, rose, yellow, etc.)

Each visual subpage links `visual.css` for shared structure and keeps its unique component CSS inline. All 5 themes are preserved as inline `:root` palette + `body.theme` overrides.

Existing themes:
- `visual/index.html` — Pop Art (`:root` + `body.pop-art`)
- `visual/music-videos.html` — MTV (`:root` + `body.mtv`)
- `visual/collage.html` — Memphis (`:root` + `body.memphis`)
- `visual/photography.html` — City Pop (`:root` + `body.city-pop`)
- `visual/tv.html` — Broadcast (`:root` + `body.broadcast`)

## Color palette (defined in style.css)

```
--rose:   #ff3d6e   --yellow: #ffe03a   --cyan:   #00f5ff
--green:  #39ff6e   --orange: #ff7c1f   --purple: #c45fff
--white:  #f0ead8   --black:  #080808
```

## Adding a new arcade game

1. Create folder under `arcade/`
2. Include `index.html`, `js/` (game logic), `css/` (styles)
3. Follow the pixel art conventions - use canvas at low res, scale with CSS
4. Add link to `arcade/index.html` nav

## Arcade chat system

The chat widget (`shared/chat-widget.js`) provides a floating real-time chat on all arcade pages. It uses a SharedWorker (`shared/chat-worker.js`) to hold a single WebSocket connection across page navigations — preventing duplicate users when navigating between games.

### Architecture

```
Page (browser) ──postMessage──▶ SharedWorker ──WebSocket──▶ chat-server.py (port 8768)
     │                              │
     └── sendToServer() ────────────┘
```

- **SharedWorker** holds one WebSocket. Pages connect via `postMessage`. Caches history/user_list/status for new pages.
- **Session tokens** stored in `sessionStorage` (one per tab). Server tracks disconnected users for 30s and restores name/color on reconnect.
- **Server** delays `user_info` creation until `set_name` arrives (no anonymous flicker).

### Adding chat to a game page

```html
<link rel="stylesheet" href="../shared/chat-widget.css">
<script src="../shared/chat-widget.js"></script>
<script>ChatWidget.connect();</script>
```

### Public API

```js
ChatWidget.connect()
ChatWidget.disconnect()
ChatWidget.joinRoom(code)
ChatWidget.leaveRoom(code)
ChatWidget.setName(name)
ChatWidget.setColor(color)
ChatWidget.getMyName()
ChatWidget.getMyColor()
```

### Deploying chat-server.py

```bash
rsync -avz arcade/chat-server.py jake@192.168.1.16:~/arcade/chat-server.py
ssh jake@192.168.1.16 "sudo systemctl restart arcade-chat"
```

### Note on websockets library

`chat-server.py` uses `websockets.datastructures.Headers` for the health check response (not a plain dict). This is required by `websockets` >= 14.x. If you see `AttributeError: 'dict' object has no attribute 'serialize`, the import is missing.

## High scores

All arcade game high scores are managed through the MAGMA//OPS admin dashboard on the Raspberry Pi.

### Architecture

```
Game (browser) ──WebSocket──▶ admin/server.py ──file I/O──▶ arcade/admin/scores/{game}.json
     │                                                         │
     └── localStorage fallback (offline)                       └── JSON files (one per game)
```

- **ScoreClient** (`arcade/shared/score-client.js`) — shared library that games include
- **Server** (`arcade/admin/server.py`) — WebSocket actions: `score_load`, `score_save`, `scores_all`, `score_reset`
- **Storage** (`arcade/admin/scores/`) — one JSON file per game (e.g. `tetris.json`, `george-boole.json`)
- **Dashboard** — HIGH SCORES section in MAGMA//OPS shows all leaderboards

### Adding scores to a new game

1. Add to `index.html`:
   ```html
   <script src="../shared/score-client.js"></script>
   <script>const scoreClient = ScoreClient.auto();</script>
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

## Adding archive pages

See `archive/ARCHIVE_THEMING.md` for detailed theming patterns. Short version:
1. Create folder under `archive/by-artist/`, `archive/by-place/`, or `archive/by-contributor/`
2. Copy stub template from existing page
3. Set `window.ARTIST_CONFIG`, `window.PLACE_CONFIG`, or `window.__CONTRIBUTOR_CONFIG` with MusicBrainz UUID
4. Choose `accent` color per page type (green/cyan/rose/yellow/blue)
5. For contributor pages, also load `entity-map.js` before `contributor.js`
6. For multi-artist collectives, use `window.COLLECTIVE_CONFIG` with `ids[]` array and load `collective_*.js` templates

## Raspberry Pi deployment

### One-shot setup

```bash
# From Mac — copy files to Pi and run setup
rsync -avz arcade/ jake@192.168.1.16:~/arcade/
ssh jake@192.168.1.16 "sudo bash ~/arcade/scripts/setup-pi.sh"
```

This installs systemd services for all servers + dashboard, enables auto-start on boot, and places a desktop shortcut.

### Admin dashboard

`arcade/admin/` — Web-based monitoring and management UI.

- **Port**: 8780 (HTTP) + 8781 (WebSocket for live logs)
- **Desktop shortcut**: "MagmaCrunch Ops" — opens dashboard in Chromium
- **Config**: `arcade/admin/config.json` — set `auth: true` for password protection

Commands:
```bash
ssh jake@192.168.1.16 "sudo systemctl restart arcade-admin"
ssh jake@192.168.1.16 "journalctl -u arcade-admin -f"
```

### Systemd services

All servers run as systemd services (auto-start on boot, auto-restart on crash):

| Service | Port |
|---|---|
| `arcade-sorry` | 8765 |
| `arcade-cribbage` | 8766 |
| `arcade-stud` | 8767 |
| `arcade-chat` | 8768 |
| `arcade-chess` | 8769 |
| `arcade-checkers` | 8770 |
| `arcade-backgammon` | 8771 |
| `arcade-chinese-checkers` | 8772 |
| `arcade-parchisi` | 8773 |
| `arcade-aggravation` | 8774 |
| `arcade-counter` | 8783 |
| `arcade-admin` | 8780 |

Quick commands:
```bash
# Status
sudo systemctl status 'arcade-*'

# Restart one
sudo systemctl restart arcade-chat

# Logs
journalctl -u 'arcade-*' -f
journalctl -u arcade-chat -n 50
```
