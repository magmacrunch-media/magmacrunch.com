# AGENTS.md — magmacrunch.com

## Dev approach

Open `index.html` directly in browser. No build server, no package manager, no tests.

## Project structure

```
/                      # root: index.html, style.css, nav.js
├── arcade/            # self-contained pixel games (each has index.html + js/css)
├── archive/            # artist/place pages with MusicBrainz API integration
│   ├── by-artist/     # artist stubs with window.ARTIST_CONFIG
│   ├── by-place/      # place stubs with window.PLACE_CONFIG
│   ├── by-label/      # label stubs with window.__LABEL_CONFIG
│   ├── by-contributor/ # contributor stubs with window.__CONTRIBUTOR_CONFIG
│   └── _cache/        # MusicBrainz data backups (JSON)
├── home/              # about.html, guestbook.html, links/
├── music/             # distributed-music.html, floppy-disk/
├── press/             # journals: scientific/, experimental/
├── scripts/           # backup-musicbrainz.mjs
├── templates/         # JS template scripts for archive pages
└── visual/            # gallery pages (collage, photography, music-videos)
```

## Key conventions

- **Retro aesthetic required**: Keep "Press Start 2P" font, CRT scanlines, neon colors, pixel art
- **Self-contained games**: Each arcade subfolder works standalone - don't add cross-game dependencies
- **MusicBrainz rate limit**: API allows ~1 req/sec. `fetchWithRetry` handles backoff - don't batch-fetch
- **Canvas pixel art**: Use `image-rendering: pixelated` and draw at low resolution (64x64), scale with CSS
- **Config via `window.*_CONFIG`**: Archive pages define config objects inline, templates read them

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

Visual pages use a two-part theming pattern:

1. **`:root`** — nav overrides (accent, glow, brand, brand-glow) + theme palette CSS variables
2. **`body.theme-name`** — page overrides (background, text, dim, rose, yellow, etc.)

Existing themes:
- `visual/index.html` — Pop Art (`:root` + `body.pop-art`)
- `visual/music-videos.html` — MTV (`:root` + `body.mtv`)
- `visual/collage.html` — Editorial Magazine (`:root` + `body.editorial`)

Dropdown menus can be styled with colored left borders per item:
```css
body.theme .dropdown a { border-left: 3px solid transparent; }
body.theme .dropdown a:nth-child(1) { border-left-color: #color1; }
body.theme .dropdown a:nth-child(2) { border-left-color: #color2; }
/* etc. */
body.theme .dropdown a:hover { background: #accent; }
```

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

## Adding archive pages

See `archive/ARCHIVE_THEMING.md` for detailed theming patterns. Short version:
1. Create folder under `archive/by-artist/`, `archive/by-place/`, or `archive/by-contributor/`
2. Copy stub template from existing page
3. Set `window.ARTIST_CONFIG`, `window.PLACE_CONFIG`, or `window.__CONTRIBUTOR_CONFIG` with MusicBrainz UUID
4. Choose `accent` color per page type (green/cyan/rose/yellow/blue)
5. For contributor pages, also load `entity-map.js` before `contributor.js`

## Raspberry Pi deployment (TODO)

When deploying multiplayer games to the Pi:

1. **Sync file structure** — Copy `arcade/shared/multiplayer/` to Pi's `~/arcade/shared/multiplayer/`
2. **Update start-all.sh** — Copy `arcade/start-all.sh` to Pi's `~/arcade/start-all.sh`
3. **Install websockets** — `pip3 install websockets` on Pi
4. **Add DNS** — Point `cribbage.magmacrunch.com` and `soko.magmacrunch.com` to Pi's IP
5. **Run** — `cd ~/arcade && ./start-all.sh`
