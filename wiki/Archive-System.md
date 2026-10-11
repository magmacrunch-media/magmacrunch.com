# Archive System

MusicBrainz-powered catalog of artists, places, labels, and contributors. Template-driven architecture — define a config, load a template.

---

## How It Works

Each archive page follows the same pattern:

1. **Stub HTML** defines a `window.*_CONFIG` object with MusicBrainz UUID and display settings
2. **Template JS** reads the config, fetches data from MusicBrainz API, and renders the page
3. **Local cache** in `archive/_cache/` stores JSON backups to avoid repeated API calls

```
Browser ──fetch──▶ MusicBrainz API ──response──▶ Template renders page
    │                        │
    └── check cache first ───┘
```

## Page Types

### By Artist (`archive/by-artist/`)
- Config: `window.ARTIST_CONFIG`
- Templates: `artist_recordings.js`, `artist_releases.js`, `artist_works.js`, `artist_events.js`, `artist_members.js`, `artist_about.js`, `artist_photography.js`, `artist_links.js`
- Sub-pages: recordings, releases, works, events, members, about, photography, links

### By Place (`archive/by-place/`)
- Config: `window.PLACE_CONFIG`
- Templates: `place_recordings.js`, `place_events.js`, `place_works.js`, `place_personnel.js`, `place_links.js`
- Sub-pages: recordings, events, works, personnel, links

### By Label (`archive/by-label/`)
- Config: `window.__LABEL_CONFIG`
- Templates: `label.js`, `label-theme.css`

### By Contributor (`archive/by-contributor/`)
- Config: `window.__CONTRIBUTOR_CONFIG`
- Templates: `contributor.js`, `entity-map.js`
- `entity-map.js` maps MusicBrainz IDs to internal archive paths

### Collectives (multi-artist groups)
- Config: `window.COLLECTIVE_CONFIG` with `ids[]` array
- Templates: `collective_recordings.js`, `collective_releases.js`, `collective_works.js`

## MusicBrainz API

- Rate limit: ~1 request/sec
- Handled by `fetchWithRetry` with exponential backoff
- Data cached locally in `archive/_cache/`
- Run `node scripts/backup-musicbrainz.mjs` to snapshot all data
- GitHub Action runs weekly with `--skip-existing`

## Cache Structure

```
archive/_cache/
├── artists/
│   └── {uuid}.json
├── places/
│   └── {uuid}.json
├── contributors/
│   └── {uuid}.json
├── labels/
│   └── {uuid}.json
├── collectives/
│   └── {uuid}.json
├── works/
│   └── {uuid}.json
└── tmdb/
    └── {id}.json
```

## Sub-Page Navigation

Sub-page navigation is defined by the `siblings` array in `window.*_CONFIG`. The template JS reads this array and generates a nav bar with links to sibling pages, automatically excluding the current page.

```js
window.ARTIST_CONFIG = {
    siblings: ['about', 'events', 'recordings', 'releases', 'works'],
    // ...
};
```

The `<main>` element has NO navigation-related attributes — all config flows through the JavaScript config object.

## Color Conventions

Each config object has two color properties:

- **`accent`** — a CSS variable name (without `--` prefix) that controls the page's primary color. The template constructs `var(--${accent})` for use in breadcrumb links, page titles, nav-card borders, and glow effects. Examples: `'cyan'`, `'green'`, `'svfp-warm'`, `'fm-sky'`.
- **`backColor`** — a nav-card class name for the "← back" button. Follows the pattern `c-{section}` (e.g., `c-recordings`, `c-events`, `c-works`, `c-personnel`).

On subpages, the inline `<style>` block sets `--section-accent` from the accent color, and all themed elements (breadcrumb, page-title, artist-label, back nav-card) use this variable.

For full theming details, see [Archive Theming](Archive-Theming). 
