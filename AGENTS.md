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
│   └── full-catalog/
├── home/              # about.html, guestbook.html, links/
├── music/             # distributed-music.html, floppy-disk/
├── templates/         # JS template scripts for archive pages
└── visual/            # gallery pages (collage, photography, music-videos)
```

## Key conventions

- **Retro aesthetic required**: Keep "Press Start 2P" font, CRT scanlines, neon colors, pixel art
- **Self-contained games**: Each arcade subfolder works standalone - don't add cross-game dependencies
- **MusicBrainz rate limit**: API allows ~1 req/sec. `fetchWithRetry` handles backoff - don't batch-fetch
- **Canvas pixel art**: Use `image-rendering: pixelated` and draw at low resolution (64x64), scale up with CSS
- **Config via `window.*_CONFIG`**: Archive pages define config objects inline, templates read them

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

See `README.md` for full docs. Short version:
1. Create folder under `archive/by-artist/` or `archive/by-place/`
2. Copy stub template
3. Set `window.ARTIST_CONFIG` or `window.PLACE_CONFIG` with MusicBrainz UUID
4. Choose `accent` color per page type (green/cyan/rose/yellow/blue)

## No verification needed

Static HTML files - no lint/typecheck commands exist.

## Known issues

- **Roderick Tron jump physics** (`arcade/roderick-tron/`): The jump mechanics don't feel right. Multiple rounds of physics tuning (gravity, jump force, collision window, gap sizes) haven't solved it. Needs hands-on playtesting rather than math-only analysis. Last attempted fix: commit daef263.