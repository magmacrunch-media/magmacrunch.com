Utility scripts in `scripts/` for development and maintenance.

---

## backup-musicbrainz.mjs

Snapshots all MusicBrainz data used by archive pages.

```bash
node scripts/backup-musicbrainz.mjs
# or
make backup-mb
```

### Options
- `--skip-existing` — don't overwrite cached files
- No flags — re-fetch all data

### What It Does
1. Scans all archive page stubs for `window.*_CONFIG` objects
2. Extracts MusicBrainz UUIDs
3. Fetches data from MusicBrainz API (~1 req/sec)
4. Saves to `archive/_cache/{type}/{uuid}.json`

### Used By
- GitHub Action (weekly backup)
- Manual cache refresh

---

## backup-tmdb.mjs

Snapshots TMDB (The Movie Database) data.

```bash
node scripts/backup-tmdb.mjs
```

### Used By
- GitHub Action (weekly backup)

---

## backup-private.sh

Pushes code to the private backup repo (`magma-ops-backup`).

```bash
bash scripts/backup-private.sh
# or
make backup
```

### What It Does
1. Copies code (excluding media, caches, scores)
2. Commits to `magma-ops-backup` repo
3. Pushes to GitHub

### Excludes
- `archive/_cache/`
- `arcade/admin/scores/`
- Media files (images, audio, video)

---

## build-search-index.js

Builds the site-wide search index.

```bash
node scripts/build-search-index.js
# or
npm run build-search
# or
make search-index
```

### What It Scans
- Archive pages (artists, places, labels, contributors)
- Arcade games
- Press pages (scientific, experimental, lyrics)
- Tools
- Jukebox songs
- Distributed music
- Physical media

### Output
`search-index.json` — consumed by `assets/search.js`

### Deduplication
Prevents duplicate entries when pages reference the same MusicBrainz entities.

---

## replace-navs.mjs

Migration tool that replaces inline `<nav>` blocks with auto-nav stubs.

```bash
node scripts/replace-navs.mjs
```

### What It Does
1. Scans all HTML files for inline `<nav>` elements
2. Replaces with `<nav id="auto-nav" data-depth="..."></nav>`
3. Calculates correct `data-depth` based on file location

### When to Use
One-time migration tool. Used during the nav.js refactor. No longer needed for new pages.

---

## optimize-images.mjs

Image optimization using Sharp.

```bash
node scripts/optimize-images.mjs --dir photos/
node scripts/optimize-images.mjs --dry-run
```

### Options
- `--dir <path>` — directory to optimize
- `--dry-run` — show what would be changed without modifying files

### What It Does
- Targets flyers + photos directories
- Max width: 1200px
- Max file size: 800KB
- Quality: 82

---

## generate-og.mjs

Generates retro-styled Open Graph preview images (1200x630 PNGs) for social media sharing.

```bash
node scripts/generate-og.mjs
# or
npm run og
```

### What It Does
1. Reads page configs (title, subtitle, accent color)
2. Renders 1200x630 PNGs with retro aesthetic (scanlines, neon glow, pixel font)
3. Outputs to `og/` directory

### Output
- `og/home.png` — homepage card
- `og/arcade.png` — arcade section
- `og/music.png` — music section
- `og/archive.png` — archive section
- `og/visual.png` — visual gallery
- `og/press.png` — press section
- `og/tools.png` — tools section
- `og/about.png` — about page
- `og/guestbook.png` — guestbook page

### Dependencies
- `@napi-rs/canvas` — pixel-level rendering (scanlines, neon effects)
- `fonts/PressStart2P-Regular.ttf` — local pixel font

### When to Use
- After visual design changes to regenerate cards
- When adding new section pages

---

## scaffold-game.mjs

Generates boilerplate files for a new arcade game.

```bash
node scripts/scaffold-game.mjs
```

### Config
Edit `scripts/new-game.json` before running:
```json
{
  "name": "othello",
  "title": "OTHELLO",
  "category": "puzzles",
  "description": "Classic Othello with neon theme"
}
```

### What It Generates
- `arcade/{name}/index.html` — standard boilerplate
- `arcade/{name}/favicon.svg` — placeholder favicon
- `arcade/{name}/css/base.css` + `game.css` — styles
- `arcade/{name}/js/config.js` + `game.js` + `main.js` — game skeleton

### Used By
- Manual game creation

---

## bake-cache.mjs

Inlines MusicBrainz cache JSON into archive HTML pages as `window.__MB_CACHE`.

```bash
node scripts/bake-cache.mjs
```

### What It Does
1. Scans all archive stub pages
2. Extracts entity UUID from config
3. Loads corresponding cache JSON
4. Injects `window.__MB_CACHE = {...}` before template script
5. Writes updated HTML

### Result
Pages load instantly (no fetch() call at runtime). Works offline.

### Tradeoffs
- Pages are larger (500KB–3.5MB)
- Cache is stale until next backup + bake cycle

### Used By
- `.github/workflows/bake-cache.yml` — triggered after MusicBrainz backup

---

## weekly-scores.mjs

Generates a markdown high score summary from score JSON files.

```bash
node scripts/weekly-scores.mjs
```

### What It Reads
- `arcade/admin/scores/*.json` — all game score files

### Output
Markdown report with:
- Top 5 per game
- Total scores logged
- Most active player
- Player leaderboard

### Used By
- `.github/workflows/weekly-scores.yml` — posts to Discussion weekly

---

## fetch-play-counts.mjs

Fetches play count data from Last.fm API for all artists.

```bash
node scripts/fetch-play-counts.mjs
```

### Options
- `--skip-existing` — don't overwrite existing play count files

### What It Does
1. Reads artist list from archive pages
2. Fetches play counts from Last.fm API
3. Saves to `scripts/play-counts.json` and `arcade/admin/stats/lastfm/`

### Configuration
Requires `LASTFM_API_KEY` environment variable.

### Used By
- `.github/workflows/play-counts.yml` — weekly fetch

---

## generate-archive-stubs.mjs

Generates stub HTML files for new archive pages (artists, contributors, places, labels).

```bash
node scripts/generate-archive-stubs.mjs
```

### Config
Edit `scripts/archive-stubs.json` before running:
```json
{
  "artists": [{ "name": "...", "uuid": "...", "slug": "...", "abbr": "...", "accent": "...", "backColor": "..." }],
  "contributors": [{ "name": "...", "uuid": "...", "slug": "..." }],
  "places": [{ "name": "...", "uuid": "...", "slug": "...", "abbr": "...", "accent": "...", "backColor": "..." }],
  "labels": [{ "name": "...", "uuid": "...", "slug": "..." }]
}
```

### What It Generates
| Type | Files |
|---|---|
| Artist | `recordings.html`, `releases.html`, `works.html`, `events.html` |
| Contributor | `index.html` |
| Place | `personnel.html`, `recordings.html`, `works.html`, `events.html` |
| Label | `index.html` |

Also updates `templates/entity-map.js` and `scripts/backup-musicbrainz.mjs`.

### Used By
- `.github/workflows/generate-stubs.yml` — triggered when config changes

---

## archive-stubs.json

Config file for `generate-archive-stubs.mjs`. Lists entities to generate stubs for.

### Structure
```json
{
  "artists": [],
  "contributors": [],
  "places": [],
  "labels": []
}
```

Entries are marked as `"generated": true` after processing to avoid re-generation.

---

## check-cache-busters.mjs

Validates that `?v=` cache-buster stamps in HTML match the actual file content hashes.

```bash
node scripts/check-cache-busters.mjs
```

---

## check-game-stamps.mjs

Checks that game `?v=` stamps in arcade HTML files are consistent with file contents.

```bash
node scripts/check-game-stamps.mjs
```

---

## check-shell-tokens.mjs

Validates shell token consistency across deployment scripts.

```bash
node scripts/check-shell-tokens.mjs
```

---

## check-staged-stamps.mjs

Checks `?v=` stamps on staged git files (pre-commit hook).

```bash
node scripts/check-staged-stamps.mjs
```

---

## games.mjs

Utility module with game metadata (ports, paths, categories). Used by other scripts.

```bash
node scripts/games.mjs
```

---

## generate-theme-audit.mjs

Generates a visual audit of theme colors across the site. Outputs `theme-audit.json` and `og/theme-audit.png`.

```bash
node scripts/generate-theme-audit.mjs
```

### Used By
- `.github/workflows/theme-audit.yml`

---

## init-admin-data.mjs

Initializes admin JSON data files (jukebox-songs.json, themes.json, tv-channels.json) with defaults.

```bash
node scripts/init-admin-data.mjs
```

---

## run-tests.mjs

Finds and runs all Python pytest and Node.js test suites. Used by `make test-py`, `make test-js`, and `make check`.

```bash
node scripts/run-tests.mjs js    # JS tests only
node scripts/run-tests.mjs py    # Python tests only
```

---

## sync-adenosine.mjs

Copies `@magmacrunch/adenosine-*` IIFE builds from `node_modules/` into `arcade/shared/adenosine-*.js` and stamps cache-busters.

```bash
node scripts/sync-adenosine.mjs
# or
npm run build:adenosine
```

---

## sync-adenosine-pins.mjs

Syncs adenosine pin data for playground pages.

```bash
node scripts/sync-adenosine-pins.mjs
```

---

## sync-game.mjs

Syncs a multi-version game from its external repo into `arcade/`. Used by Makefile sync targets.

```bash
node scripts/sync-game.mjs moonlight-drift
```

### Used By
- `make sync-moonlight-drift`, `make sync-george-boole`, etc.

---

## sync-crunch-c.py

Syncs the Crunch C game project.

```bash
python scripts/sync-crunch-c.py
```

---

## sync-playground.py

Syncs playground/demo pages.

```bash
python scripts/sync-playground.py
```

---

## sync-texastoast-playground.py

Syncs the Texas Toast playground page.

```bash
python scripts/sync-texastoast-playground.py
```

---

## test-discord-webhook.mjs

Tests the Discord webhook URL by sending a test message.

```bash
node scripts/test-discord-webhook.mjs
```

---

## worktree.mjs

Git worktree management utility for multi-version game repos.

```bash
node scripts/worktree.mjs
```

---

## session-start-worktree.mjs

Sets up a git worktree at session start for game development.

```bash
node scripts/session-start-worktree.mjs
```

---

## Creating New Scripts

Place new scripts in `scripts/`. Naming conventions:
- `.mjs` for ES module scripts (Node.js)
- `.sh` for bash scripts
- `.js` for CommonJS scripts

Add npm scripts to `package.json` for frequently used commands. 
