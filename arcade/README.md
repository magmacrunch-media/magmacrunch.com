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

### card rendering pipeline (shared by solitaire family)

```
config.js → face-cards.js → number-cards.js → deck.js → game.js → main.js
```

Used by: solitaire, solitaire_THLD, scandinavian-stud

---

## sample pack roadmap (desktop app via Tauri v2)

### goal

Downloadable desktop app bundling select games. Lego architecture — each game is a self-contained "brick," the app shell is the "base plate." Add new games by copying a folder and rebuilding.

### initial games

1. solitaire
2. solitaire_THLD
3. george-boole
4. 2^N
5. tetris
6. moonlight-drift

### planned structure

```
arcade-sample-pack/           # new project root (sibling to website/)
├── src-tauri/                # Tauri Rust backend
│   ├── Cargo.toml
│   ├── tauri.conf.json       # window config, bundle settings
│   └── src/main.rs
├── src/                      # web assets served by webview
│   ├── index.html            # sample pack hub / launcher
│   ├── shared/fonts/         # bundled Press Start 2P, VT323, Orbitron
│   ├── solitaire/
│   ├── solitaire_THLD/
│   ├── george-boole/
│   ├── 2^N/
│   ├── tetris/
│   └── moonlight-drift/
└── package.json
```

### steps

1. **scaffold Tauri v2** — vanilla HTML/CSS/JS template, verify macOS build
2. **create hub page** — retro launcher listing all games
3. **copy game assets** — preserve directory structure, relative paths
4. **bundle fonts locally** — download .woff2, replace Google CDN links with local @font-face
5. **replace JSONBin with localStorage** — solitaire, 2^N, tetris, solitaire_THLD use api.jsonbin.io for scoring; swap to local storage
6. **fix navigation** — `.mc-back` links → hub page
7. **configure Tauri** — window size, app icon, bundle metadata
8. **build and test** — `npm run tauri dev` / `npm run tauri build`
9. **cross-platform** — same codebase → Windows (.msi), Linux (.deb, .AppImage)

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

1. Copy game folder into `src/`
2. Add link on hub page
3. Localize any external deps (fonts, APIs)
4. Rebuild
