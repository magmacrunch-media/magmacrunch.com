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
│   └── tetris/                helsinki 1989 — stack blocks, clear lines
├── home/                      about.html, guestbook.html, links/
├── music/                     jukebox, distributed music, floppy disk, catalog
├── press/                     journals
│   ├── scientific/            science & technology essays
│   └── experimental/          experimental writing
├── scripts/                   backup-musicbrainz.mjs
├── templates/                 JS template scripts for archive subpages
│   ├── artist_*.js            events, releases, recordings, works templates
│   ├── place_*.js             personnel, recordings, works, events templates
│   ├── contributor.js         by-contributor credit page template
│   ├── label.js               by-label page template
│   └── entity-map.js          MB ID → internal path mapping for contributor links
└── visual/                    gallery pages (collage, photography, music-videos)
```

---

## key features

### persistent jukebox player
A mini audio player injected into every page's `<nav>` via `nav.js`. Loads `assets/jukebox.js` and `assets/jukebox.css` dynamically — no HTML changes needed across 156+ pages. State saved to localStorage every second, restores on page load.

### SPA-style navigation
`nav.js` intercepts same-site `<a>` clicks, fetches the target page, swaps `<main>` content, and manages CSS/script lifecycle. `<nav>` (with audio) persists across navigations. Arcade pages do full page loads.

Excluded from SPA: `/arcade/`, `/by-contributor/`, `/by-label/`

### themed nav bar
All nav elements (border glow, brand text, dropdown hover, hamburger) use CSS variables (`--nav-accent`, `--nav-glow`, `--nav-brand`, `--nav-brand-glow`) set per-page in each artist/place shared CSS file.

### archive template system
Each artist/place has a thin HTML stub that sets a config object (`window.ARTIST_CONFIG` or `window.PLACE_CONFIG`). A shared template script injects styles, populates the sub-nav, and fetches data from MusicBrainz. Templates check a local JSON cache first — run `node scripts/backup-musicbrainz.mjs` to snapshot all data.

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

6. Load the template script: `<script src="../../../templates/artist_events.js"></script>`

For detailed theming patterns (3-layer CSS, COLOR_MAP, nav-card conventions, hero structure), see `archive/ARCHIVE_THEMING.md`.

### adding a new place

Same pattern but use `window.PLACE_CONFIG` and place templates. Place subpages use `personnel.html` instead of `events.html`.

### adding a new contributor

1. Create folder: `archive/by-contributor/your-name/`
2. Create `index.html` following the pattern in `archive/by-contributor/jake-mccoy/`
3. Set `window.__CONTRIBUTOR_CONFIG` with `MB_ID`, `NAME`, and `ARCHIVE_LINKS`
4. Load `entity-map.js` then `contributor.js`
5. Add a card in `archive/by-contributor/index.html` and any new MB ID mappings to `templates/entity-map.js`

---

## API notes

All archive data is fetched from the [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API). A local JSON cache (`archive/_cache/`) is checked first — run `node scripts/backup-musicbrainz.mjs` to update it. A GitHub Action runs this weekly.

- Records fetched sequentially with 1000ms delay between detail requests
- `fetchWithRetry` handles 429/503 with exponential backoff (up to 4 retries)
- Event poster art fetched from [Event Art Archive](https://eventartarchive.org) in background queue
- Area name lookups cached per session

---

## dev notes

- Open `index.html` directly in browser — no build server needed
- Arcade games are fully self-contained (own CSS/JS/audio, no `style.css` or `nav.js`)
- Nav links are absolutized on page load to survive SPA `pushState` URL changes
- Guestbook uses formsubmit.co for email delivery (no backend)
