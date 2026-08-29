# Frontend page details — the tools/-to-ware/ rename, the shared MagmaScript runtime, the crunch-c course, extracted animations, page-specific CSS, game card previews, nav and page theming, color palette, OG images.

## The tools/ → ware/ rename (2026-08-24)

The section formerly at `/tools/` is now `/ware/`. `tools/` still exists but holds
**nothing but 18 meta-refresh redirect stubs**, one per old entry point, each
pointing at its `/ware/` equivalent with a `rel="canonical"` and `noindex`.

GitHub Pages serves this repo's branch directly, so there is no server-side
redirect layer — stub pages are the only mechanism available. Do not add real
content under `tools/`, and do not link to it. Once the old URLs stop drawing
traffic the whole directory can be deleted in one commit.

The three sync workflows (`sync-magmascript-playground.yml`,
`sync-texastoast-playground.yml`, `sync-crunch-c.yml`) `git add` a hardcoded
path — the first two were updated to `ware/` in the same commit. If you ever
move the section again, they move too or the next upstream dispatch commits
nothing.

## The shared MagmaScript runtime (2026-08-29)

Two pages run .mgs in the browser: `ware/magmascript/` (the language
playground) and `ware/crunch-c/` (the C-memory course). They share two
shared files rather than each carrying a copy:

| File | What it is |
|---|---|
| `ware/shared/mgs-lang-bundle.js` | The `magmascript/lang/**` sources embedded as strings. **Generated** by `scripts/sync-playground.py`; do not hand-edit. ~180KB. |
| `ware/shared/mgs-runtime.js` | Boots Pyodide, writes those sources into its FS, stubs the domain modules, exposes `createMgsRuntime()` → `run(code)`. Hand-written. |

`sync-playground.py` rewrites the bundle and re-stamps the `?v=` on the
runtime's import of it. That stamp is load-bearing: a bare ES module import
carries no cache-buster, so without it a returning visitor keeps the previous
release's interpreter. Never hand-write that `?v=`.

`run(code)` returns `{out, warn, error}`. Keep the three separate — `warn`
carries the `spooked:` lines (overflow wraps, the `ancient weeds` leak report)
which magmascript writes to **stderr**, and for crunch-c those warnings are
frequently the entire lesson. Folding them into stdout, or dropping stderr as
the original runner did, silently breaks whole exercises.

## The crunch-c course (2026-08-29)

`ware/crunch-c/` is a course, not a playground: one `lesson.html` serves all 18
lessons at `?m=<module>&e=<exercise>`.

`ware/crunch-c/lessons.js` is **generated** by `scripts/sync-crunch-c.py` from
the [crunch-c](https://github.com/magmacrunchmedia/crunch-c) repo — the `.mgs`
exercises, the module READMEs and `solutions/`. Do not hand-edit it; edit the
lesson in crunch-c and re-run the script. It resolves the source from
`$CRUNCH_C_ROOT`, else `../crunch-c`.

Markdown is converted to HTML *in that script*, because the site has no build
step and no runtime deps. The converter handles only what the READMEs actually
use — headings, tables, fenced code, inline code, bold, links, bullet lists. If
a README starts using something new, extend the converter; do not add a
Markdown library.

crunch-c dispatches `sync-crunch-c.yml` on every lesson change. That needs a
`WEBSITE_DISPATCH_TOKEN` secret **in the crunch-c repo** with `contents: write`
here, the same secret shape magmascript's release workflow uses. The Tuesday
cron is the backstop if the dispatch fails or the secret is missing.

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
- `ware/ware.css` — ware index
- `ware/hologram/hologram.css` — hologram modules reference (on the `ware/shell` chrome)

## Game card previews

Tile illustrations for arcade collections are in `arcade/gamecard-previews.js`.
Each preview is a self-contained IIFE that draws on a 72x72 canvas:
- Board Games (checkerboard + pieces)
- Card Games (fanned hand)
- Puzzles (question mark grid)
- Action (joystick)
- Private (lock icon)

Hidden/commented-out previews (crystal maze, pay2play) are preserved as comments.

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

## OG images

Preview images for social media (1200x630 PNGs) in `og/`, generated by `scripts/generate-og.mjs`.

- **Logo**: `drawPixelM()` pattern array — edit the 8×8 grid (`1`/`0`)
- **Page configs**: `PAGES` array — title, subtitle, accent color per page
- **Regenerate**: `npm run og`
- **Cache busting**: Bump `?v=N` in `og:image` meta tags after pushing new PNGs
- **Font**: Requires `fonts/PressStart2P-Regular.ttf`

