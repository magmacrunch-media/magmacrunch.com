```
/                          # root: index.html, style.css, nav.js
├── animations/            # extracted canvas animations (volcano, cereal, coin, server, floppy)
├── assets/                # shared CSS/JS: jukebox, search, counter
├── arcade/                # pixel art games (each self-contained)
│   ├── arcade.css         # arcade index page styles + game card grid
│   ├── gamecard-previews.js  # tile illustrations for each collection
│   ├── board-games/       # collection landing page (index.html only)
│   ├── card-games/        # collection landing page
│   ├── puzzles/           # collection landing page
│   ├── action/            # collection landing page
│   ├── chess/             # index.html, js/, css/, server.py, tests/
│   ├── checkers/
│   ├── backgammon/
│   ├── parchisi/
│   ├── chinese-checkers/
│   ├── aggravation/
│   ├── solitaire/
│   ├── cribbage/
│   ├── scandinavian-stud/
│   ├── solitaire_THLD/    # Texas Hold'em Lava Dome (generated)
│   ├── tarot/
│   ├── 2^N/               # 2048 variant
│   ├── george-boole/      # generated
│   ├── fifteen-puzzle/
│   ├── threes/
│   ├── klotski/
│   ├── tetris/
│   ├── moonlight-drift/   # generated
│   ├── very-long-boards/
│   ├── roderick-tron/
│   ├── SORRY/
│   ├── pay2play/          # slot machine (CSS, JS, prizes)
│   ├── shared/            # shared libraries: chat, scores, cards, multiplayer
│   ├── admin/             # MAGMA//OPS dashboard + score server
│   ├── counter/           # hit counter WebSocket server
│   └── scripts/           # setup-pi.sh and deployment helpers
├── archive/               # MusicBrainz-powered catalog
│   ├── archive.css        # page-specific styles for archive index
│   ├── emerac.js          # EMERAC component (LED grid, CRT display, MusicBrainz fetch)
│   ├── by-artist/         # artist pages with window.ARTIST_CONFIG
│   ├── by-place/          # place pages with window.PLACE_CONFIG
│   ├── by-label/          # label pages with window.__LABEL_CONFIG
│   ├── by-contributor/    # contributor pages with window.__CONTRIBUTOR_CONFIG
│   └── _cache/            # local JSON backups of MusicBrainz data
├── mcp-server/            # MCP server — exposes project data + Pi/MC1 management to AI assistants
│   ├── serve.py           # HTTP wrapper (runs on MC1 WSL2, port 8785)
│   ├── magma-mcp.py       # MCP tool definitions (the actual server logic)
│   ├── requirements.txt
│   └── README.md
├── templates/             # JS template scripts for archive pages
├── home/                  # about.html, about.css, guestbook.html, guestbook.css, links/
├── music/
│   ├── music.css          # music index styles
│   ├── distributed-music/ # data-driven release catalog (releases.js + app.js)
│   ├── jukebox/           # fetches songs.json for playlist
│   └── physical-media/    # CD, floppy disk, tape collections
├── press/
│   ├── press.css          # press index styles
│   └── journals: scientific/, experimental/, lyrics/
├── tools/
│   ├── tools.css          # tools index styles
│   └── browser utilities (album art, media search, pixel process)
├── visual/                # gallery pages (collage, photography/, teevee/tv)
├── scripts/               # build/backup scripts (Node.js + Python, ~34 files)
├── ware/                  # internal tools, dev utilities, and side projects
│   ├── adenosine/         # adenosine engine dev workspace
│   ├── album-art-maker/   # album art generator
│   ├── crunch-c/          # Crunch C project
│   ├── magmascript/       # magmascript CLI tool
│   ├── magnolia/          # Wii game engine
│   ├── media-search/      # media search utility
│   ├── pixel-process/     # pixel art processor
│   ├── shell/             # shell scripts and utilities
│   ├── sprite-forge/      # sprite generation tool
│   ├── texastoast/        # Texas Toast project
│   └── utilities/         # misc dev utilities
├── fonts/                 # Press Start 2P, Courier Prime
├── og/                    # generated OG preview images (1200x630 PNGs)
└── drafts/                # gitignored — old animation tests
```

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Homepage — animated pixel volcano erupting cereal |
| `style.css` | Site-wide CSS variables, palette, nav, footer |
| `nav.js` | Shared nav generator, SPA router, jukebox/search/counter loaders |
| `search-index.json` | Pre-built search index for site-wide search |
| `CNAME` | GitHub Pages custom domain config |
| `package.json` | npm scripts (lint, test, og), dev deps (eslint, sharp, @napi-rs/canvas) |
| `Makefile` | Common operations: lint, test, deploy-pi, search-index, backup |
| `requirements.txt` | Python deps: websockets>=12.0, pytest>=7.0 |
| `.eslintrc.json` | ESLint config — browser env, custom globals (NAV_CONFIG, etc.) |
| `.github/` | GitHub Actions workflows |
| `404.html` | Themed error page with flickering neon animation |
| `favicon.ico` | Site favicon |

## Archive Template System

Each archive page type follows the same pattern:

1. **Stub HTML** — defines `window.*_CONFIG` with MusicBrainz UUID, name, colors
2. **Template JS** — reads config, fetches MusicBrainz data, renders page

Templates in `/templates/`:
- `artist_recordings.js`, `artist_releases.js`, `artist_works.js`, etc.
- `place_events.js`, `place_recordings.js`, etc.
- `contributor.js`, `entity-map.js`
- `collective_recordings.js`, `collective_releases.js`, etc.
