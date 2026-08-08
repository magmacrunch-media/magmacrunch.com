# AGENTS.md — magmacrunch.com

## Dev approach

Open `index.html` directly in browser. No build server, no package manager, no tests.

## Project structure

```
/                      # root: index.html, style.css, nav.js
├── animations/        # extracted canvas animations (volcano, cereal, coin, server, floppy)
├── arcade/            # self-contained pixel games (each has index.html + js/css)
│   ├── arcade.css     # arcade index page styles + game card grid
│   ├── gamecard-previews.js  # tile illustrations for each collection
│   ├── pay2play/      # pay2play slot machine (CSS, JS, prizes)
│   └── ...
├── archive/           # artist/place pages with MusicBrainz API integration
│   ├── archive.css    # page-specific styles for archive index
│   ├── emerac.js      # EMERAC component (LED grid, CRT display, MusicBrainz fetch)
│   ├── by-artist/     # artist stubs with window.ARTIST_CONFIG or window.COLLECTIVE_CONFIG
│   ├── by-place/      # place stubs with window.PLACE_CONFIG
│   ├── by-label/      # label stubs with window.__LABEL_CONFIG
│   ├── by-contributor/ # contributor stubs with window.__CONTRIBUTOR_CONFIG
│   └── _cache/        # MusicBrainz data backups (JSON)
├── home/              # about.html, about.css, guestbook.html, guestbook.css, links/
├── music/             # distributed-music/, jukebox/, floppy-disk/
│   ├── music.css      # music index styles
│   ├── distributed-music/  # data-driven release catalog (releases.js + app.js)
│   └── jukebox/       # fetches songs.json for playlist
├── press/             # press.css, journals: scientific/, experimental/
├── mcp-server/        # MCP server — exposes project data + Pi management to AI assistants
├── scripts/           # backup-musicbrainz.mjs
├── templates/         # JS template scripts for archive pages
└── visual/            # gallery pages (collage, photography/, music-videos, teevee/tv)
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

Pages extract inline CSS to separate files:
- `archive/archive.css` — archive index + EMERAC component
- `arcade/arcade.css` — arcade index + game card grid
- `home/about.css` — about page
- `home/guestbook.css` — guestbook page
- `music/music.css` — music index
- `music/distributed-music/styles.css` — distributed music
- `music/jukebox/styles.css` — jukebox
- `press/press.css` — press index
- `tools/tools.css` — tools index

## Game card previews

Tile illustrations for arcade collections are in `arcade/gamecard-previews.js`.
Each preview is a self-contained IIFE that draws on a 72x72 canvas:
- Board Games (checkerboard + pieces)
- Card Games (fanned hand)
- Puzzles (question mark grid)
- Action (joystick)
- Private (lock icon)

Hidden/commented-out previews (crystal maze, pay2play) are preserved as comments.

## Distributed music

Release data lives in `music/distributed-music/releases.js` as a `window.RELEASES` array.
The page (`music/distributed-music/app.js`) fetches this data and renders cards dynamically.

To add a new release: add an object to the `RELEASES` array in `releases.js`.

## Jukebox

The full jukebox page (`music/jukebox/`) fetches `songs.json` at runtime for the playlist.
The mini-player widget (`assets/jukebox.js`) has its own embedded track list.
`songs.json` is the single source of truth — MAGMA//OPS reads/writes it.

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
- `visual/photography/` — City Pop (`:root` + `body.city-pop`)
- `visual/tv/` — Broadcast (`:root` + `body.broadcast`)

## Color palette (defined in style.css)

```
--rose:   #ff3d6e   --yellow: #ffe03a   --cyan:   #00f5ff
--green:  #39ff6e   --orange: #ff7c1f   --purple: #c45fff
--white:  #f0ead8   --black:  #080808
```

## Adding a new arcade game

### Quick start with scaffolder

1. Edit `scripts/new-game.json`:
   ```json
   {
     "name": "othello",
     "title": "OTHELLO",
     "category": "puzzles",
     "description": "Classic Othello with neon theme"
   }
   ```
2. Run: `node scripts/scaffold-game.mjs`
3. Edit `arcade/othello/js/game.js` — implement game logic
4. Add card to `arcade/puzzles/index.html`

### Manual setup

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

## MCP server

Local MCP server that exposes magmacrunch.com data and Pi management to AI coding assistants. Runs as a subprocess spawned by opencode — not hosted on the Pi.

### Architecture

```
opencode (Mac) ──subprocess──▶ magma-mcp.py ──filesystem──▶ archive/_cache/, arcade/admin/scores/
     │                              │
     └── MCP protocol              └── SSH ──▶ Raspberry Pi (service mgmt, deploy)
```

- **Server** (`mcp-server/magma-mcp.py`) — Python MCP server using `mcp[cli]` library
- **Config** (`opencode.json`) — opencode auto-starts the server via `"type": "local"`
- **Data access** — reads MusicBrainz cache, scores, archive pages, arcade games directly from filesystem
- **Pi access** — SSH to `jake@192.168.1.16` for service management and deployment

### Tools

| Category | Tool | Description |
|---|---|---|
| MusicBrainz cache | `list_cached_entities` | List all cached entities (artists, places, contributors, labels, works, collectives) |
| | `get_entity` | Get full data for a specific entity by type and UUID/slug |
| | `search_cache` | Search cached entity names by substring |
| High scores | `list_scoreboards` | List all game leaderboards with entry counts and top scores |
| | `get_scores` | Get leaderboard for a specific game |
| Project structure | `list_archive_pages` | List all archive pages (artists, places, contributors, labels) |
| | `list_arcade_games` | List all arcade games with server info |
| Pi services | `check_pi_services` | Check status of all arcade services |
| | `get_service_logs` | Get recent logs for a service |
| | `restart_pi_service` | Restart a service |
| | `get_pi_system_info` | Get uptime, memory, CPU temp, load |
| Deployment | `deploy_to_pi` | rsync files to the Pi and optionally restart a service |

### Setup

```bash
pip install -r mcp-server/requirements.txt
```

Requires Python 3.10+ and SSH key access to `jake@192.168.1.16`.

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

## CI/CD (GitHub Actions)

### Auto-deploy to Pi

`.github/workflows/deploy-pi.yml` — triggers on push to `main` or manual dispatch.

- **Runner**: Self-hosted on Mac (`runs-on: self-hosted`)
- **Action**: rsync `arcade/` → Pi, restart all `arcade-*` services
- **Secrets**: `PI_SSH_KEY` (ed25519 private key for `jake@192.168.1.16`)
- **Excludes**: `node_modules`, `.git`, `*.pyc`, `__pycache__`, `scores/*.json`

### Updating the PI_SSH_KEY secret

The deploy workflow uses SSH key auth (`~/.ssh/id_ed25519`) to connect to the Pi.

**Setup (one-time):**
```bash
# Copy Mac's public key to Pi (enter Pi password once)
ssh-copy-id -i ~/.ssh/id_ed25519.pub jake@192.168.1.16

# Update the GitHub secret
gh secret set PI_SSH_KEY -R magmacrunchmedia/magmacrunch.com < ~/.ssh/id_ed25519
```

**If the Pi password is forgotten:**
- Reset it on the Pi with `sudo passwd jake` (requires physical access)
- Then re-run `ssh-copy-id` and `gh secret set` above

### Other workflows

| Workflow | Trigger | Purpose |
|---|---|---|
| `ci.yml` | Push/PR to `main` | ESLint + pytest + JS tests |
| `backup-musicbrainz.yml` | Weekly (Mon 6AM UTC) | Snapshot MusicBrainz API data to `archive/_cache/` |
| `backup-tmdb.yml` | Weekly (Mon 6:30 AM UTC) | Snapshot TMDB person data to `archive/_cache/tmdb/` |
| `bot-status.yml` | Weekly (Mon 7AM UTC) / manual | Check all bot statuses, post report to Discussion |
| `bake-cache.yml` | After MusicBrainz backup / manual | Inline cache data into archive HTML pages |
| `check-links.yml` | Push to `main` / weekly / manual | Scan HTML for broken links, create Discussion |
| `check-services.yml` | Every 30 min / manual | TCP health check of Pi game servers |
| `check-archive-format.yml` | Push/PR to `main` (archive changes) | Check archive HTML formatting, create/update Issue |
| `deploy-pi.yml` | Push to `main` / manual | Deploy `arcade/` to Raspberry Pi |
| `generate-stubs.yml` | Push to `main` (config change) | Auto-generate archive page stubs |
| `rebuild-search-index.yml` | Push to `main` (HTML/JSON changes) | Rebuild `search-index.json` for client-side search |
| `weekly-scores.yml` | Weekly (Mon 6AM UTC) / manual | Post high score leaderboard to Discussion |

### Broken link checker

`.github/workflows/check-links.yml` uses [lychee](https://github.com/lycheeverse/lychee-action) to scan all HTML/MD files for broken links.

- **Triggers**: Push to `main`, weekly (Mon 6 AM UTC), manual
- **Excludes**: Private IPs (`192.168.*`, `localhost`), `mailto:` links
- **Rate limits**: Accepts 403/429 (MusicBrainz bot protection)
- **Reporting**: Auto-creates Discussion in "Link Reports" category
- **Config**: `.lycheeignore` at repo root for exclude patterns

### Pi service health check

`.github/workflows/check-services.yml` — TCP port check of all public-facing Pi services.

- **Triggers**: Every 30 minutes, manual
- **Checks**: Ports 8765–8774 (games), 8783 (counter) via `nc -z`
- **Excludes**: Admin (8780, localhost-only), Private (8782, firewall-blocked)
- **Reporting**: Auto-creates Discussion in "Service Health" category
- **Runner**: Self-hosted on Mac (LAN access to Pi)

### Search index auto-rebuild

`.github/workflows/rebuild-search-index.yml` — rebuilds `search-index.json` when content changes.

- **Triggers**: Push to `main` when HTML or JSON files change, manual
- **Action**: Runs `node scripts/build-search-index.js`, commits if changed
- **Commits as**: `github-actions[bot]`
- **Note**: Hardcoded lists (arcade games, tools) still need manual code updates

### Archive stub generator

`.github/workflows/generate-stubs.yml` — auto-generates stub HTML files for new archive pages.

- **Triggers**: Push to `main` when `scripts/archive-stubs.json` changes, manual
- **Config**: `scripts/archive-stubs.json` — add entities to generate
- **Generates**: Artist subpages, contributor/label index pages, place subpages
- **Also updates**: `templates/entity-map.js`, `scripts/backup-musicbrainz.mjs`
- **Note**: Hero/index pages and shared CSS still need manual creation

### MusicBrainz cache bake

`.github/workflows/bake-cache.yml` — inlines cache data into archive HTML pages.

- **Triggers**: After MusicBrainz backup completes, manual
- **Action**: Runs `scripts/bake-cache.mjs` — injects `window.__MB_CACHE` into all archive stubs
- **Result**: Pages load instantly (no fetch() call at runtime)
- **Note**: Pages are larger (500KB–3.5MB) but work offline

### MusicBrainz cache snapshots

`scripts/backup-musicbrainz.mjs` saves timestamped snapshots before overwriting cache files.

- **Location**: `archive/_cache/snapshots/{date}/{type}/{uuid}.json`
- **Retention**: Last 4 snapshots (1 month of history)
- **Use case**: Restore old data if MusicBrainz servers go down

### Weekly high scores

`.github/workflows/weekly-scores.yml` — posts a leaderboard summary to a GitHub Discussion each week.

- **Triggers**: Weekly (Mon 6 AM UTC), manual
- **Script**: `scripts/weekly-scores.mjs` reads all score JSONs, generates markdown
- **Output**: Discussion in "High Scores" category with top 5 per game, total stats, player leaderboard
- **Note**: Most scores lack timestamps — this is a static snapshot, not a weekly diff

### Bot status report

`.github/workflows/bot-status.yml` — posts a summary of all bot statuses to Discussion.

- **Triggers**: Weekly (Mon 7 AM UTC), manual
- **Action**: Checks last run of each workflow, generates markdown table
- **Output**: Discussion in "General" category with status of all 11 bots
- **Note**: Shows last run time, status, and trigger for each workflow

### Archive format checker

`.github/workflows/check-archive-format.yml` — validates formatting consistency across archive HTML files.

- **Triggers**: Push/PR to `main` when `archive/**` changes, manual
- **Script**: `scripts/check-archive-format.js` — no dependencies, exits non-zero on warnings
- **Checks**:
  - Sub-nav CSS class matches link text (e.g. "music videos" → `c-music-videos`)
  - No orphan `</div>` tags
- **Output**: Console warnings + GitHub Issue ("Archive format warnings"). Issue auto-closes when clean.

### Running the self-hosted runner

```bash
cd ~/actions-runner
./run.sh
```

Runner must be running on Mac for `deploy-pi.yml` to execute. If Mac is off, pushes to `main` skip deployment (no error).

## Monitoring & Security

### Websockets logging

All WebSocket servers (`chat-server.py`, `server_base.py`) have INFO-level logging enabled:

```bash
# Live stream all connection events
ssh jake@192.168.1.16 "journalctl -u 'arcade-*' -f"

# Last 50 lines for chat server
ssh jake@192.168.1.16 "journalctl -u arcade-chat -n 50"
```

Log format:
```
18:46:31 [Chat] Starting chat server on port 8768
18:47:15 Connect: ('213.209.159.154', 54321)
18:47:15 Rate limited: global from ('213.209.159.154', 54321)
18:47:16 Disconnect: ('213.209.159.154', 54321)
18:48:00 High connection rate: 213.209.159.154 (12 in 60s)
```

### Connection rate tracking

`chat-server.py` and `server_base.py` track connections per IP. If an IP makes >10 connections in 60 seconds, a warning is logged. This detects bots reconnecting rapidly.

### fail2ban jails

Four fail2ban jails auto-ban scanners and brute-force attackers:

| Jail | What it catches | Ban time |
|------|-----------------|----------|
| `nginx-scanner` | .env probes, wp-admin, phpmyadmin, .git scans | 24 hours |
| `nginx-botsearch` | CMS scanning (wp-login, roundcube) | 24 hours |
| `nginx-bad-request` | Malformed requests (400 errors) | 1 hour |
| `sshd` | SSH brute-force | default |

```bash
# Check fail2ban status
ssh jake@192.168.1.16 "sudo fail2ban-client status"
ssh jake@192.168.1.16 "sudo fail2ban-client status nginx-scanner"
```

Config files on Pi: `/etc/fail2ban/jail.local`, `/etc/fail2ban/filter.d/nginx-scanner.conf`

### Admin TRAFFIC tab

The MAGMA//OPS dashboard has a TRAFFIC tab showing nginx access log analysis:

- **Top IPs** — by request count
- **Status codes** — 426 (bot rejected), 301 (redirect), 101 (websocket)
- **User agents** — suspicious entries highlighted (spoofed MSIE 7.0, etc.)
- **Total requests** count

Open: `http://192.168.1.16:8780` → TRAFFIC tab → REFRESH

### nginx access logs

```bash
# Last 100 lines
ssh jake@192.168.1.16 "tail -100 /var/log/nginx/access.log"

# Top IPs
ssh jake@192.168.1.16 "awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10"

# .env scanners
ssh jake@192.168.1.16 "grep '\.env' /var/log/nginx/access.log | tail -10"
```
