# magmacrunch arcade

Pixel art games — vanilla HTML/CSS/JS, no frameworks, no bundler.

Shared game-engine code lives in the [adenosine](https://github.com/magmacrunchmedia/adenosine)
packages, loaded as plain `<script>` tags that expose globals (`AdRPG`, `AdPuzzle`,
`AdCards`, `AdScore`, `AdAudio`, `AdChat`, `AdMP`). The bundles in `arcade/shared/adenosine-*.js` are
generated from npm dependencies — see [adenosine packages](#adenosine-packages) below.

---

## games

| game | type | status |
|------|------|--------|
| 2^N | tile puzzle (2048) | complete |
| aggravation | board game (multiplayer) | complete |
| backgammon | board game (multiplayer) | complete |
| checkers | board game (multiplayer) | complete |
| chess | board game (multiplayer) | complete |
| chinese-checkers | board game (multiplayer) | complete |
| cribbage | card game (multiplayer) | complete |
| fifteen-puzzle | tile puzzle | complete |
| george-boole | logic puzzle | complete |
| klotski | tile puzzle | complete |
| moonlight-drift | side-scroller | complete |
| parchisi | board game (multiplayer) | complete |
| pay2play | experimental | under construction |
| roderick-tron | platformer | under construction |
| scandinavian-stud | card game (multiplayer) | complete |
| solitaire | card game (klondike) | complete |
| solitaire_THLD | card game (hold'em) | complete |
| SORRY! | board game (multiplayer) | complete |
| tarot | card game (french tarot) | complete |
| tetris | classic | complete |
| threes | tile puzzle | complete |
| very-long-boards | downhill skater | complete |

---

## Python server dependencies

All Python game servers share a single venv at `arcade/venv`.
Install dependencies:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

The Pi setup script (`scripts/setup-pi.sh`) handles this automatically.

---

- **config.js** — tuning constants separated from logic
- **main.js** — entry point / game loop bootstrap
- **title screen** — "PRESS ENTER" / "INSERT COIN" pattern
- **`.mc-back` link** — fixed-position "magmacrunch arcade" back-link
- **fonts** — Press Start 2P, VT323, Orbitron via Google Fonts CDN
- **canvas pixel art** — low-res draw, CSS `image-rendering: pixelated`

### adenosine packages

The engine ships as seven IIFE bundles in `arcade/shared/`, each generated from an
npm dependency by `npm run build:adenosine` (`scripts/sync-adenosine.mjs`):

| bundle | global | provides |
|--------|--------|----------|
| `adenosine-rpg.js` | `AdRPG` | game loop, input, canvas, camera, collision, entities |
| `adenosine-puzzle.js` | `AdPuzzle` | grid engine, input, rendering, scoring, UI |
| `adenosine-cards.js` | `AdCards` | deck, pixel-art SVG cards, chips, hand evaluators |
| `adenosine-score-client.js` | `AdScore` | high-score client (backend + localStorage) |
| `adenosine-audio.js` | `AdAudio` | music and pooled sound effects |
| `adenosine-chat.js` | `AdChat` | floating real-time chat widget (SharedWorker-backed) |
| `adenosine-multiplayer.js` | `AdMP` | multiplayer WebSocket client with lobby, board game template |

The script also stamps a content-hash `?v=` on every arcade `<script>` tag that
loads a bundle, so a rebuilt bundle can't be served from a stale browser cache.
**Re-run it after any dependency change**, and commit the result — GitHub Pages
serves this repo's branch directly, so the bundles are committed on purpose.

Card constants (`SUITS`, `RANKS`, `SUIT_SYMBOLS`, `SUIT_COLORS`, `RANK_VALUES`)
come from `AdCards`; see `arcade/cribbage/js/config.js` for the pattern. Chips come
from `AdCards.ChipAnim`. Only the stylesheets remain local:
`arcade/shared/cards/cards.css` and `arcade/shared/chips/chip-animation.css`.

Card games: solitaire, solitaire_THLD, scandinavian-stud, cribbage, tarot.
Puzzle games: 2^N, george-boole, fifteen-puzzle, klotski, threes.

Source repo: `~/adenosine` (the canonical working copy). Packages are published to
npm as `@magmacrunch/adenosine-*`; the website consumes them as dependencies, so
never hand-edit the files in `arcade/shared/adenosine-*.js`.

### arcade chat system

```
arcade/shared/
├── chat-widget.js      # Floating chat widget (DOM creation, connection, UI)
├── chat-widget.css     # Widget styling
├── chat-worker.js      # SharedWorker — holds one WebSocket across page navigations
└── multiplayer/
    ├── server_base.py   # Game-specific WebSocket server base
    └── network.js       # Game multiplayer client (MP module)
```

**Architecture:**
```
Page A ──postMessage──┐
                      ├──▶ SharedWorker ──WebSocket──▶ chat-server.py (port 8768)
Page B ──postMessage──┘
```

- **SharedWorker** (`chat-worker.js`) — holds a single WebSocket connection. Pages communicate via `postMessage`. Caches history, user_list, and status for newly connecting pages. Auto-reconnects with backoff if the WebSocket drops.
- **Widget** (`chat-widget.js`) — creates floating chat UI, sends messages through the SharedWorker. Falls back to direct WebSocket if SharedWorker is unavailable. Public API: `ChatWidget.connect()`, `.disconnect()`, `.joinRoom()`, `.leaveRoom()`, `.setName()`, `.setColor()`.
- **Session tokens** — client generates a token stored in `sessionStorage`, sends with every `set_name`. Server tracks recently disconnected users (30s window) and restores name/color on reconnect.
- **Server** (`chat-server.py`) — global chat, room sub-chats, typing indicators, server status pings. Delays `user_info` creation until `set_name` arrives (no anonymous flicker). Health check returns 426 for non-WebSocket HTTP requests.
- **Logging** — connections/disconnections with IP, rate limit hits, high connection rate warnings. View via `journalctl -u arcade-chat` or admin dashboard LOGS tab.

**Usage (in any game page):**
```html
<link rel="stylesheet" href="../shared/chat-widget.css">
<script src="../shared/chat-widget.js"></script>
<script>ChatWidget.connect();</script>
```

---

## sample pack roadmap (desktop app via Tauri v2)

### goal

Downloadable desktop app bundling select games. Lego architecture — each game is a self-contained "brick," the app shell is the "base plate." Add new games by copying a folder and rebuilding.

### packs

#### card games (shared rendering pipeline)
1. solitaire
2. solitaire_THLD
3. scandinavian-stud

#### board games (multiplayer-first, WebSocket)
4. SORRY!
5. backgammon (future)

#### puzzles
6. 2^N
7. george-boole
8. tetris

### planned structure

```
arcade-sample-pack/           # new project root (sibling to website/)
├── src-tauri/                # Tauri Rust backend
│   ├── Cargo.toml
│   ├── tauri.conf.json       # window config, bundle settings
│   └── src/main.rs
├── src/                      # web assets served by webview
│   ├── index.html            # hub / launcher
│   ├── shared/
│   │   ├── fonts/            # bundled Press Start 2P, VT323, Orbitron
│   │   └── card-pipeline/    # deck.js, face-cards.js, number-cards.js, cards.css
│   ├── card-games/
│   │   ├── solitaire/
│   │   ├── solitaire_THLD/
│   │   └── scandinavian-stud/
│   ├── board-games/
│   │   ├── SORRY/
│   │   └── backgammon/       # future
│   └── puzzles/
│       ├── 2^N/
│       ├── george-boole/
│       └── tetris/
└── package.json
```

### steps

1. **scaffold Tauri v2** — vanilla HTML/CSS/JS template, verify macOS build
2. **create hub page** — retro launcher listing all packs/games
3. **copy game assets** — preserve directory structure, relative paths
4. **bundle fonts locally** — download .woff2, replace Google CDN links with local @font-face
5. **score client is already local** — ScoreClient uses WebSocket to Pi with localStorage fallback; no external API dependency
6. **fix navigation** — `.mc-back` links → hub page
7. **configure Tauri** — window size, app icon, bundle metadata
8. **build and test** — `npm run tauri dev` / `npm run tauri build`
9. **cross-platform** — same codebase → Windows (.msi), Linux (.deb, .AppImage)
10. **multiplayer (board games)** — SORRY! connects to WebSocket server (sorry.magmacrunch.com); same protocol works in Tauri webview

### external dependencies to localize

- **Google Fonts** — bundle .woff2 files locally
- **Audio files** — already local, just verify paths

### what you'll learn

- desktop app packaging (Tauri bundling, .dmg creation)
- offline-first design (bundling assets, removing CDN deps)
- Rust basics (Tauri config and build system)
- cross-platform build tooling
- foundation for porting to embedded Linux (Tauri runs on Raspberry Pi)

### adding a game later

1. Copy game folder into the appropriate pack directory (`card-games/`, `board-games/`, or `puzzles/`)
2. For card games: ensure the card pipeline paths resolve to `../shared/card-pipeline/`
3. Add link on hub page
4. Localize any external deps (fonts, APIs)
5. Rebuild

---

## PWA roadmap (mobile install without App Store)

### goal

Make the arcade section installable on iOS/Android home screens as a Progressive Web App. No Apple Developer Program ($99/yr) required — users tap "Add to Home Screen" in Safari and get a full-screen app.

### architecture

Single PWA scoped to `arcade/` directory. One manifest + one service worker covers the hub and all games.

### files to create

```
arcade/
├── manifest.json          # PWA manifest (name, icons, colors, display)
├── sw.js                  # service worker (caching, offline fallback)
├── icon-192.png           # app icon 192x192 (from favicon.svg)
├── icon-512.png           # app icon 512x512 (from favicon.svg)
└── apple-touch-icon.png   # iOS home screen icon 180x180
```

### manifest.json

```json
{
  "name": "magmacrunch arcade",
  "short_name": "arcade",
  "start_url": "index.html",
  "display": "standalone",
  "theme_color": "#ff2e9c",
  "background_color": "#0a0612",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### service worker caching strategy

| resource | strategy | notes |
|----------|----------|-------|
| local assets (css, js, images, audio) | cache-first | already local |
| Google Fonts CDN | stale-while-revalidate | cache immediately, update in bg |
| CDN libs (BabylonJS, Three.js) | cache-first | version-pinned |
| ScoreClient (Pi WebSocket) | cache-first | local fallback built in |

### HTML meta tags to add (all games)

```html
<meta name="theme-color" content="#ff2e9c">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="../apple-touch-icon.png">
<link rel="manifest" href="../manifest.json">
```

Hub page uses `./` prefix; games use `../`.

### service worker registration

Add to `arcade/index.html` (and optionally each game):

```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js', { scope: '.' });
}
```

### cross-game dependencies (service worker must cache)

- `shared/cards/` — shared card rendering pipeline (deck.js, face-cards.js, number-cards.js, cards.css)
- `solitaire` → `../shared/cards/`
- `solitaire_THLD` → `../shared/cards/`
- `scandinavian-stud` → `../shared/cards/`

### games to update (13 files)

`arcade/index.html`, `2^N/`, `tetris/`, `george-boole/`, `moonlight-drift/`, `solitaire/`, `SORRY/`, `very-long-boards/`, `crystal-mirror-maze/`, `roderick-tron/`, `scandinavian-stud/`, `solitaire_THLD/`, `pay2play/pay2play.html`

### deferred

- self-hosting fonts (CDN cache-first is fine for now)
- OGG → MP3 conversion for iOS audio
- SORRY multiplayer WebSocket (requires live connection regardless)

### testing checklist

- [ ] Open `arcade/index.html` on iPhone Safari
- [ ] Verify "Add to Home Screen" prompt appears
- [ ] Launch from home screen — opens full-screen (no Safari chrome)
- [ ] Play a game — verify it works
- [ ] Toggle airplane mode — verify cached games still load
- [ ] Verify scores still save (localStorage fallback)
