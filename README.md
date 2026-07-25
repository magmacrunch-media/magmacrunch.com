# magmacrunch.com

Personal website for magmacrunch media — music, art, archives, and arcade games. Static HTML/CSS/JS, no build step, no dependencies.

Live site: [magmacrunch.com](https://magmacrunchmedia.github.io/magmacrunch.com/)

---

## project structure

```
/                              root: index.html, style.css, nav.js
├── archive/                   artist, place, and contributor archive pages
│   ├── by-artist/             artist subfolders (thld, svfp, ds, etc.)
│   ├── by-place/              place subfolders (twin-maples, melrose-house, etc.)
│   ├── by-label/              label pages (magmacrunch-media, etc.)
│   ├── by-contributor/        musician credit pages (jake-mccoy, elias-grey, etc.)
│   └── _cache/                MusicBrainz data backups (JSON)
│       ├── artists/           per-artist cache (uuid.json)
│       ├── places/            per-place cache (uuid.json)
│       ├── contributors/      per-contributor cache (uuid.json)
│       ├── labels/            per-label cache (uuid.json)
│       ├── works/             standalone work cache (for lyrics pages)
│       └── collectives/       per-collective cache (slug.json)
├── assets/                    shared assets
│   ├── archive.css            shared archive page styles
│   ├── jukebox.js             persistent mini-player logic
│   ├── jukebox.css            mini-player styles
│   ├── album-art/             album cover images
│   ├── photos/                artist/place photos
│   └── logos/                 social/brand logos
├── arcade/                    pixel art games (each self-contained)
│   ├── 2^N/                   2048 clone — slide & merge tiles
│   ├── crystal-mirror-maze/   navigate a shifting labyrinth of reflections
│   ├── george-boole/          boolean logic puzzles — and, or, not
│   ├── moonlight-drift/       coast through space, dodge obstacles
│   ├── solitaire/             klondike solitaire with timed scoring
│   ├── solitaire_THLD/        poker solitaire — build hands, score big
│   ├── SORRY/                 classic board game, online multiplayer (up to 4)
│   ├── tetris/                helsinki 1989 — stack blocks, clear lines
│   ├── tarot/                 78-card french tarot — trick-taking, bidding
│   ├── card-games/            card games index (cribbage, stud, tarot)
│   ├── board-games/           board games index (chess, checkers, backgammon, etc.)
│   └── admin/                 MAGMA//OPS admin dashboard (port 8780)
├── home/                      about.html, guestbook.html, links/
├── music/                     jukebox, distributed music, floppy disk, catalog
├── press/                     journals (dark mode)
│   ├── scientific/            science & technology essays
│   ├── experimental/          experimental writing
│   └── lyrics/                song lyrics with MusicBrainz metadata
│       ├── jon-mccoy/         jon mccoy songs
│       ├── sex-van-floor-plan/ svfp songs
│       ├── c-p-rutledge/      c.p. rutledge songs
│       └── thld/              thld songs
├── scripts/                   backup-musicbrainz.mjs, replace-navs.mjs
├── templates/                 JS template scripts for archive subpages
│   ├── artist_*.js            events, releases, recordings, works templates
│   ├── place_*.js             personnel, recordings, works, events templates
│   ├── contributor.js         by-contributor credit page template
│   ├── label.js               by-label page template
│   ├── lyrics-work.js         lyrics page MusicBrainz metadata template
│   └── entity-map.js          MB ID → internal path mapping for contributor links
├── tools/                     creator tools
│   ├── album-art-maker/       visual album art generator (shapes, clipart, layers)
│   ├── media-search/          multi-provider image search (Pixabay, Pexels, etc.)
│   └── pixel-process/         pixel art editor with layer support
└── visual/                    gallery pages (collage, photography, music-videos, teevee)
```

---

## key features

### auto-nav system
All pages use `<nav id="auto-nav" data-depth="...">` — nav HTML is generated from a single `NAV_CONFIG` object in `nav.js`. Change the nav across the entire site by editing one config. Sub-directories use `data-depth` to compute correct relative paths.

### archive sub-nav auto-injection
Archive subpages use `<main data-siblings="events,recordings,works" data-back-color="c-orange">` — `nav.js` auto-generates the sub-nav with a ← back button and sibling links, skipping the current page. No manual sub-nav HTML needed.

### persistent jukebox player
A mini audio player injected into every page's `<nav>` via `nav.js`. Loads `assets/jukebox.js` and `assets/jukebox.css` dynamically — no HTML changes needed across 200+ pages. State saved to localStorage every second, restores on page load.

### SPA-style navigation
`nav.js` intercepts same-site `<a>` clicks, fetches the target page, swaps `<main>` content, and manages CSS/script lifecycle. `<nav>` (with audio) persists across navigations. Arcade, tools, contributor, and label pages do full page loads.

Excluded from SPA: `/arcade/`, `/by-contributor/`, `/by-label/`, `/tools/`

### themed nav bar
All nav elements (border glow, brand text, dropdown hover, hamburger) use CSS variables (`--nav-accent`, `--nav-glow`, `--nav-brand`, `--nav-brand-glow`) set per-page in each artist/place shared CSS file.

### archive template system
Each artist/place has a thin HTML stub that sets a config object (`window.ARTIST_CONFIG` or `window.PLACE_CONFIG`). A shared template script injects styles, populates the sub-nav, and fetches data from MusicBrainz. Templates check a local JSON cache first — run `node scripts/backup-musicbrainz.mjs` to snapshot all data.

### collective archive pages
Collective groups (audio-sound-paper-et-al, vinny-bobarino, fruity-loops-debauchery-collective) use `window.COLLECTIVE_CONFIG` with a `slug` and `ids` array. Their works, recordings, and releases pages check `archive/_cache/collectives/{slug}.json` before hitting the MusicBrainz API. The backup script caches data for all collectives alongside artists/places.

### lyrics section
Song lyrics organized by artist under `press/lyrics/`. Each song page displays static lyrics alongside a MusicBrainz metadata card showing composer/lyricist credits, publisher, recording locations, and release info. Works pages link to lyrics via `lyricsMap` in `ARTIST_CONFIG`. The `lyrics-work.js` template fetches work data from MB, checks a local JSON cache first (`archive/_cache/works/`), and links artists/places to archive pages via `entity-map.js`.

### contributor pages
`archive/by-contributor/` pages credit musicians across the archive. The `contributor.js` template fetches all MB relationships (bands, labels, events, recordings, works, etc.) and renders them with links to other archive pages via `entity-map.js`.

### arcade chat system
A real-time chat widget (`shared/chat-widget.js`) present on all arcade pages. Uses a SharedWorker (`shared/chat-worker.js`) to hold a single WebSocket connection across page navigations — no duplicate users on page changes. Falls back to direct WebSocket if SharedWorker is unavailable. The server (`chat-server.py`) tracks session tokens in `sessionStorage` to recognize reconnecting users within a 30-second window, preserving name and color across navigations. Includes a floating widget with global/room tabs, typing indicators, color picker, and inline name editing.

### MAGMA//OPS admin dashboard
Web-based monitoring and management UI for all arcade servers. Port 8780 (HTTP) + 8781 (WebSocket for live logs). Manages high scores, jukebox channels, theme settings, TV manager, MEDIA//SEARCH API keys, and user accounts. Runs as `arcade-admin` systemd service on the Raspberry Pi.

### creator tools
- **ALBUM//ART** (`tools/album-art-maker/`) — visual album art generator with layers, shapes, clipart, color picker, and export
- **MEDIA//SEARCH** (`tools/media-search/`) — multi-provider image search (Internet Archive, Met Museum, Openverse, Pexels, Pixabay, Smithsonian) with lightbox preview
- **PIXEL//PROCESS** (`tools/pixel-process/`) — pixel art editor with layer support

### press section (dark mode)
The press section (scientific, experimental, lyrics) uses a dark inverted theme with paper-like text on dark backgrounds. Pages include a pageshow handler to fix breadcrumb colors on bfcache restore.

### teevee
Retro TV channel flipper (`visual/tv.html`) — YouTube-powered channel surfing with a CRT TV aesthetic. Includes a TV Guide overlay (green phosphor channel list) and a MAGMA//OPS TV Manager for managing channel lineups.

---

## color palette

Defined in `style.css` `:root`:

| variable      | hex       | use            |
|---------------|-----------|----------------|
| `--rose`      | #ff3d6e   | primary accent |
| `--yellow`    | #ffe03a   | highlights     |
| `--cyan`      | #00f5ff   | secondary      |
| `--green`     | #39ff6e   | success/links  |
| `--orange`    | #ff7c1f   | warm accent    |
| `--purple`    | #c45fff   | creative       |
| `--white`     | #f0ead8   | body text      |
| `--black`     | #080808   | background     |

Each artist/place defines its own scoped palette in `*-shared.css` (e.g., `--thld-accent`, `--jt-amber`, `--ds-cta`). Each also defines a dedicated near-black background variable (e.g., `--thld-bg: #0e0905`, `--jt-bg: #0a0a0c`) set on `body`, with hero gradients and footer overlay colors matched to it.

---

## adding a new artist

1. Create folder: `archive/by-artist/your-artist/`
2. Create stub files: `index.html`, `about.html`, `events.html`, `recordings.html`, `releases.html`, `works.html`, etc.
3. Create `your-artist-shared.css` with scoped palette, nav-card colors, and nav theme variables
4. Create per-page CSS files (e.g., `your-artist-events.css`)
5. Set `window.ARTIST_CONFIG` in each stub:

```js
window.ARTIST_CONFIG = {
    id:        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // MusicBrainz UUID
    name:      'artist name',
    abbr:      'AN',
    accent:    'green',
    backColor: 'c-back',
    siblings:  ['about', 'events', 'recordings', 'releases', 'works'],
    depth:     '../../../',
};
```

6. Use `<nav id="auto-nav" data-depth="../../../"></nav>` (auto-generated from NAV_CONFIG)
7. Use `<main data-siblings="events,recordings,works" data-back-color="c-back">` for auto sub-nav

For detailed theming patterns (3-layer CSS, COLOR_MAP, nav-card conventions, hero structure), see `archive/ARCHIVE_THEMING.md`.

### adding a new place

Same pattern but use `window.PLACE_CONFIG` and place templates. Place subpages use `personnel.html` instead of `events.html`.

### adding a new collective

1. Create folder: `archive/by-artist/your-collective/`
2. Create stub files: `index.html`, `about.html`, `recordings.html`, `releases.html`, `works.html`
3. Set `window.COLLECTIVE_CONFIG` with `slug`, `ids` array, and other fields:

```js
window.COLLECTIVE_CONFIG = {
    ids:       ['uuid-1', 'uuid-2', 'uuid-3'],
    slug:      'your-collective',   // matches cache filename
    name:      'Collective Name',
    abbr:      'CN',
    accent:    'yellow',
    backColor: 'c-back',
    siblings:  ['about', 'recordings', 'releases', 'works'],
    depth:     '../../../',
};
```

4. Add the collective to `COLLECTIVES` in `scripts/backup-musicbrainz.mjs`
5. Run `node scripts/backup-musicbrainz.mjs` to generate `archive/_cache/collectives/{slug}.json`

### adding a new contributor

1. Create folder: `archive/by-contributor/your-name/`
2. Create `index.html` following the pattern in `archive/by-contributor/jake-mccoy/`
3. Set `window.__CONTRIBUTOR_CONFIG` with `MB_ID`, `NAME`, and `ARCHIVE_LINKS`
4. Load `entity-map.js` then `contributor.js`
5. Add a card in `archive/by-contributor/index.html` and any new MB ID mappings to `templates/entity-map.js`

### adding a lyrics page

1. Create folder: `press/lyrics/artist-name/`
2. Create `index.html` (artist listing) and `song-name.html` (song page)
3. Set `window.__LYRICS_CONFIG` with `workId`, `artistName`, `artistId`, and optional `publisherLabel`
4. Load `entity-map.js`, `mb-cache.js`, then `lyrics-work.js`
5. Add the work MBID to `WORKS` in `scripts/backup-musicbrainz.mjs`
6. Run `node scripts/backup-musicbrainz.mjs` or fetch manually to populate `archive/_cache/works/`
7. Add artist card in `press/lyrics/index.html` and update piece counts in `press/index.html`

### adding a new arcade game

1. Create folder under `arcade/` (e.g., `arcade/my-game/`)
2. Include `index.html`, `js/` (game logic), `css/` (styles)
3. Follow pixel art conventions — canvas at low res, scale with CSS, `image-rendering: pixelated`
4. Add link in the appropriate index (`arcade/index.html`, `arcade/card-games/index.html`, or `arcade/board-games/index.html`)

### adding a new tool

1. Create folder under `tools/` (e.g., `tools/my-tool/`)
2. Include `index.html`, `js/`, `css/`
3. Add link in `tools/index.html` and in `NAV_CONFIG` inside `nav.js`

---

## API notes

All archive data is fetched from the [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API). A local JSON cache (`archive/_cache/`) is checked first — run `node scripts/backup-musicbrainz.mjs` to update it. A GitHub Action runs this weekly with `--skip-existing`.

Cache structure:
- `archive/_cache/artists/{uuid}.json` — per-artist (events, releases, recordings, works, members)
- `archive/_cache/places/{uuid}.json` — per-place (events, recordings, works, personnel)
- `archive/_cache/contributors/{uuid}.json` — per-contributor (all MB relationship types)
- `archive/_cache/labels/{uuid}.json` — per-label (artist, label, event, recording, work, release rels)
- `archive/_cache/works/{uuid}.json` — standalone works (for lyrics pages)
- `archive/_cache/collectives/{slug}.json` — per-collective (works, recordings, releases for all members)

- Records fetched sequentially with 1000ms delay between detail requests
- `fetchWithRetry` handles 429/503 with exponential backoff (up to 4 retries)
- Event poster art fetched from [Event Art Archive](https://eventartarchive.org) in background queue
- Area name lookups cached per session

---

## dev notes

- Open `index.html` directly in browser — no build server needed
- Arcade games are fully self-contained (own CSS/JS/audio, no `style.css` or `nav.js`). See `arcade/README.md` for the full game list, shared patterns, and the Tauri desktop sample pack roadmap.
- Nav is defined once in `NAV_CONFIG` inside `nav.js` — auto-nav generator builds HTML from it for all pages
- Archive subpages use `data-siblings` on `<main>` for auto sub-nav injection
- Nav links are absolutized on page load to survive SPA `pushState` URL changes
- Guestbook uses formsubmit.co for email delivery (no backend)
- `scripts/replace-navs.mjs` — utility to migrate existing inline navs to auto-nav
