# magmacrunch arcade

Pixel art games — vanilla HTML/CSS/JS, no frameworks, no build step.

---

## games

| game | type | status |
|------|------|--------|
| 2^N | tile puzzle (2048) | complete |
| crystal-mirror-maze | exploration | under construction |
| george-boole | logic puzzle | complete |
| moonlight-drift | side-scroller | complete |
| pay2play | experimental | under construction |
| roderick-tron | platformer | under construction |
| scandinavian-stud | card game (poker) | under construction |
| solitaire | card game (klondike) | complete |
| solitaire_THLD | card game (hold'em) | complete |
| SORRY! | board game (multiplayer) | complete |
| tetris | classic | complete |
| very-long-boards | downhill skater | complete |

---

## shared patterns

- **config.js** — tuning constants separated from logic
- **main.js** — entry point / game loop bootstrap
- **title screen** — "PRESS ENTER" / "INSERT COIN" pattern
- **`.mc-back` link** — fixed-position "magmacrunch arcade" back-link
- **fonts** — Press Start 2P, VT323, Orbitron via Google Fonts CDN
- **canvas pixel art** — low-res draw, CSS `image-rendering: pixelated`

### card rendering pipeline (shared by card games)

```
arcade/shared/cards/
├── deck.js           # Card class, Deck class, card back SVG
├── face-cards.js     # 12 pixel-art SVG face cards (J/Q/K × 4 suits)
├── number-cards.js   # Number card HTML generators (A-10)
└── cards.css         # Card shell, corners, pips
```

Each game provides its own `config.js` (SUITS, RANKS, RANK_VALUES, etc.) — the shared pipeline reads these as globals.

Used by: solitaire, solitaire_THLD, scandinavian-stud

### poker chip rendering (shared by poker games)

```
arcade/shared/chips/
├── chip-animation.js   # Canvas-based chip stack rendering
└── chip-animation.css  # Chip display styling
```

Each game defines CSS variables (`--black`, `--font-pixel`, etc.) for theming. The `ChipAnim.init(displayId, legendId)` call configures DOM element IDs.

Used by: solitaire_THLD, scandinavian-stud (future: cribbage, etc.)

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
5. **replace JSONBin with localStorage** — solitaire, 2^N, tetris, solitaire_THLD, scandinavian-stud use api.jsonbin.io for scoring; swap to local storage
6. **fix navigation** — `.mc-back` links → hub page
7. **configure Tauri** — window size, app icon, bundle metadata
8. **build and test** — `npm run tauri dev` / `npm run tauri build`
9. **cross-platform** — same codebase → Windows (.msi), Linux (.deb, .AppImage)
10. **multiplayer (board games)** — SORRY! connects to WebSocket server (sorry.magmacrunch.com); same protocol works in Tauri webview

### external dependencies to localize

- **Google Fonts** — bundle .woff2 files locally
- **JSONBin API** — replace with localStorage (offline-appropriate)
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
| JSONBin API | network-first, localStorage fallback | try network, fall back to local |

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

### localStorage fallback for JSONBin scores

8 games use JSONBin for high scores. Modify to try network, fall back to localStorage:

```js
async function loadScores() {
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`);
    const data = await res.json();
    localStorage.setItem(`scores_${BIN_ID}`, JSON.stringify(data));
    return data;
  } catch {
    const cached = localStorage.getItem(`scores_${BIN_ID}`);
    return cached ? JSON.parse(cached) : { records: [] };
  }
}
```

Games to update: 2^N, george-boole, moonlight-drift, tetris, solitaire, scandinavian-stud, solitaire_THLD, pay2play.

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
