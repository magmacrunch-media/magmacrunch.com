# magmacrunch.com

Personal website for magmacrunch media — music, art, archives, and arcade games. Static HTML/CSS/JS, no build step, no dependencies.

Live site: [magmacrunch.com](https://magmacrunchmedia.github.io/magmacrunch.com/)

---

## project structure

```
/                              root: index.html, style.css, nav.js
├── archive/                   artist and place archive pages
│   ├── by-artist/             14 artist subfolders (thld, svfp, ds, etc.)
│   ├── by-place/              8 place subfolders (twin-maples, melrose-house, etc.)
│   └── full-catalog/          all-recordings, all-releases, all-works
├── assets/                    shared assets
│   ├── archive.css            shared archive page styles
│   ├── jukebox.js             persistent mini-player logic
│   ├── jukebox.css            mini-player styles
│   ├── album-art/             album cover images
│   ├── photos/                artist/place photos
│   └── logos/                 social/brand logos
├── arcade/                    pixel art games (each self-contained)
├── home/                      about.html, guestbook.html, links/
├── music/                     jukebox, distributed music, floppy disk, catalog
├── templates/                 JS template scripts for archive subpages
└── visual/                    gallery pages (collage, photography, music-videos)
```

---

## key features

### persistent jukebox player
A mini audio player injected into every page's `<nav>` via `nav.js`. Loads `assets/jukebox.js` and `assets/jukebox.css` dynamically — no HTML changes needed across 156+ pages. Skipped on the full jukebox page (`/music/jukebox/`). State saved to localStorage every second, restores on page load.

### SPA-style navigation
`nav.js` intercepts same-site `<a>` clicks, fetches the target page, swaps `<main>` content, and manages CSS/script lifecycle. `<nav>` (with audio) persists across navigations. Arcade and jukebox pages do full page loads.

Excluded from SPA: `/arcade/`, `/music/jukebox/`

### themed nav bar
All nav elements (border glow, brand text, dropdown hover, hamburger) use CSS variables (`--nav-accent`, `--nav-glow`, `--nav-brand`, `--nav-brand-glow`) set per-page in each artist/place shared CSS file.

### archive template system
Each artist/place has a thin HTML stub that sets a config object (`window.ARTIST_CONFIG` or `window.PLACE_CONFIG`). A shared template script injects styles, populates the sub-nav, and fetches data from MusicBrainz.

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

Each artist/place defines its own scoped palette in `*-shared.css` (e.g., `--thld-accent`, `--jt-amber`, `--ds-cta`).

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

### adding a new place

Same pattern but use `window.PLACE_CONFIG` and place templates. Place subpages use `personnel.html` instead of `events.html`.

---

## API notes

All archive data is fetched live from the [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API). Rate-limited to ~1 req/sec for anonymous clients.

- Records fetched sequentially with 1000ms delay between detail requests
- `fetchWithRetry` handles 429/503 with exponential backoff (up to 4 retries)
- Event poster art fetched from [Event Art Archive](https://eventartarchive.org) in background queue
- Area name lookups cached per session

Loading is slow by design — patience required for artists with large catalogs.

---

## dev notes

- Open `index.html` directly in browser — no build server needed
- Arcade games are fully self-contained (own CSS/JS/audio, no `style.css` or `nav.js`)
- Nav links are absolutized on page load to survive SPA `pushState` URL changes
- `nav.js` auto-nav generator exists but is unused — all pages have hardcoded `<nav>`
- Guestbook uses formsubmit.co for email delivery (no backend)
