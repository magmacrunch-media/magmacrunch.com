The archive template system: JS scripts and CSS files that power all artist, place, label, and contributor pages.

## Directory

```
templates/
├── artist_about.js          # Artist about page logic
├── artist_events.js         # Artist events page
├── artist_links.js          # Artist links page (config-driven, no fetch)
├── artist_lyrics.js         # Artist lyrics page
├── artist_members.js        # Artist members/personnel
├── artist_photography.js    # Artist photography page
├── artist_recordings.js     # Artist recordings page
├── artist_releases.js       # Artist releases page
├── artist_works.js          # Artist works page
├── collective_recordings.js # Multi-artist collective recordings
├── collective_releases.js   # Multi-artist collective releases
├── collective_works.js      # Multi-artist collective works
├── contributor.js           # Contributor page logic
├── entity-map.js            # MusicBrainz UUID → internal path mapping
├── label.js                 # Label page logic
├── place_events.js          # Place events page
├── place_links.js           # Place links page (config-driven, no fetch)
├── place_personnel.js       # Place personnel page
├── place_photography.js     # Place photography page
├── place_recordings.js      # Place recordings page
├── place_works.js           # Place works page
├── artist-about.css         # Styles for artist about pages
├── artist-events.css        # Styles for artist events pages
├── artist-links.css         # Styles for artist/place links pages
├── artist-lyrics.css        # Styles for artist lyrics pages
├── artist-personnel.css     # Styles for artist personnel pages
├── artist-photography.css   # Styles for artist photography pages
├── artist-recordings.css    # Styles for artist recordings pages
├── artist-releases.css      # Styles for artist releases pages
├── artist-works.css         # Styles for artist works pages
├── contributor.css          # Styles for contributor pages
├── contributor-theme.css    # Theme overrides for contributor pages
└── label-theme.css          # Theme overrides for label pages
```

## How It Works

Each archive page is a **stub HTML file** that:
1. Defines a config object (`window.ARTIST_CONFIG`, `window.PLACE_CONFIG`, etc.)
2. Loads the corresponding template JS + CSS
3. Template reads the config and renders the page

```
Stub HTML (config) ──loads──▶ Template JS ──fetches──▶ MusicBrainz API (optional)
                                    │
                                    └── renders into stub DOM
```

**Note:** Link templates (`artist_links.js`, `place_links.js`) are config-driven — they read a `links[]` array from the config and render it without any MusicBrainz API calls.

## Config Objects

### ARTIST_CONFIG

```js
window.ARTIST_CONFIG = {
    id:        'ddcbeb01-edb5-4e74-b5cd-23d1b64d3086',
    name:      'Juanito Thompson',
    abbr:      'JT',
    accent:    'cyan',
    backColor: 'c-cyan',
    siblings:  ['about', 'music-videos', 'network', 'photography', 'recordings', 'releases', 'works'],
    depth:     '../../../'
};
```

### PLACE_CONFIG

```js
window.PLACE_CONFIG = {
    id:      '362e9df6-ce39-4805-841e-c113e4e2a7c9',
    name:    'Frogwood Manor',
    abbr:    'FM',
    accent:  'green',
    siblings: ['about', 'personnel', 'recordings', 'works'],
    depth:   '../../../'
};
```

### COLLECTIVE_CONFIG

For multi-artist groups:

```js
window.COLLECTIVE_CONFIG = {
    ids:      ['e33d1006-01a5-4266-aade-b7f6c1dff8e3', 'dc2aa366-6f44-48dd-b1f9-a9aa705a6452'],
    name:     'Bottle Boys Collective',
    abbr:     'BB',
    accent:   'orange',
    depth:    '../../../'
};
```

### __CONTRIBUTOR_CONFIG

```js
window.__CONTRIBUTOR_CONFIG = {
    MB_ID:          '32bc1ac7-efd0-44f2-8645-8fecf6a40edb',
    NAME:           'Jake McCoy',
    ARCHIVE_LINKS:  { '...': '../../by-artist/...' },
    accent:         'cyan',
    STATIC_SECTIONS: {},
    TMDB_ID:        null
};
```

### __LABEL_CONFIG

```js
window.__LABEL_CONFIG = {
    id:    '39446d03-fe9c-47d0-81a9-2b42d34fb400',
    name:  'magmacrunch media',
    accent: 'purple',
    depth: '../../../'
};
```

## Entity Map

`entity-map.js` maps MusicBrainz UUIDs to internal archive paths:

```js
window.__ENTITY_MAP = {
    'ddcbeb01-edb5-4e74-b5cd-23d1b64d3086': '../../by-artist/juanito-thompson/',
    '362e9df6-ce39-4805-841e-c113e4e2a7c9': '../../by-place/frogwood-manor/',
    '39446d03-fe9c-47d0-81a9-2b42d34fb400': '../../by-label/magmacrunch-media/',
};
```

Used by `contributor.js` to generate internal links for related artists and places. If a UUID isn't in the map, links fall back to MusicBrainz URLs.

## Template Types

### Artist Templates

| Template | Page | MusicBrainz Include |
|----------|------|---------------------|
| `artist_about.js` | About/bio | artist-rels, url-rels |
| `artist_recordings.js` | Recordings | recording-rels, work-rels |
| `artist_releases.js` | Releases | release-rels |
| `artist_works.js` | Works | work-rels |
| `artist_events.js` | Events | event-rels |
| `artist_members.js` | Members/personnel | artist-rels |
| `artist_photography.js` | Photography | (static content) |
| `artist_lyrics.js` | Lyrics | (config-driven, no fetch) |
| `artist_links.js` | External links | (config-driven, no fetch) |

### Place Templates

| Template | Page |
|----------|------|
| `place_recordings.js` | Recordings made at this place |
| `place_events.js` | Events at this place |
| `place_personnel.js` | People associated with this place |
| `place_works.js` | Works created at this place |
| `place_links.js` | External links (config-driven, no fetch) |

### Collective Templates

For multi-artist groups (e.g., Bottle Boys). Fetch data for multiple MusicBrainz IDs and merge results.

### Contributor Template

`contributor.js` — fetches artist-rels from MusicBrainz, uses `entity-map.js` to generate internal links, supports optional TMDB ID for film credits.

## MusicBrainz Caching

Templates check a local JSON cache before hitting the MusicBrainz API:

```
Cache: archive/_cache/{artists,places,contributors,labels}/{uuid}.json
```

Run `node scripts/backup-musicbrainz.mjs` to snapshot all data. A GitHub Action runs this weekly with `--skip-existing`.

**Rate limit**: API allows ~1 req/sec. `fetchWithRetry` handles backoff automatically.

## CSS Templates

Each template type has a corresponding CSS file:

| CSS File | Used By |
|----------|---------|
| `artist-about.css` | About pages — bio styling, pull quotes |
| `artist-recordings.css` | Recordings — track listing layout |
| `artist-releases.css` | Releases — album card grid |
| `artist-works.css` | Works — composition listing |
| `artist-events.css` | Events — timeline layout |
| `artist-personnel.css` | Members — personnel cards |
| `artist-links.css` | Links — link cards and lists |
| `artist-lyrics.css` | Lyrics — lyrics display styling |
| `artist-photography.css` | Photography — photo gallery layout |
| `contributor.css` | Contributor pages — ID cards, related entities |
| `contributor-theme.css` | Theme overrides for contributor pages |
| `label-theme.css` | Theme overrides for label pages |

## Adding a New Template

1. Create `templates/your_template.js` following the IIFE pattern
2. Read config from `window.__YOUR_CONFIG`
3. Check `archive/_cache/` before fetching MusicBrainz
4. Use `fetchWithRetry` for API calls (respects rate limit)
5. Render results into the stub DOM
6. Create matching CSS if needed

## Detailed Template Behavior

### Code Structure

All templates use an **IIFE** (Immediately Invoked Function Expression) pattern:

- **Artist/Collective templates**: IIFE + nested async IIFE for data loading
- **Contributor/Label templates**: IIFE + promise chaining (`.then()` chains)

### Sort Logic

| Template | Sort Order |
|----------|------------|
| `artist_recordings.js` | Random shuffle (Fisher-Yates-like) |
| `artist_releases.js` | Newest first (date descending) |
| `collective_recordings.js` | Random shuffle |
| `contributor.js` | Date-based |
| `label.js` | Date-based |

### Fetch Chains

**contributor.js** — 7 sequential API calls with 1100ms delay between each:
1. `artist-rels` → 2. `recording-rels` → 3. `work-rels` → 4. `release-rels` → 5. `label-rels` → 6. `place-rels` → 7. `event-rels`

**label.js** — 6 sequential API calls:
1. `artist-rels` → 2. `label-rels` → 3. `event-rels` → 4. `recording-rels` → 5. `work-rels` → 6. `release-rels`

**collective_recordings.js** — fetches recordings for each artist ID in parallel, then deduplicates by recording ID (first artist in `ids[]` takes priority).

### Render Function Signatures

| Template | Parameters |
|----------|------------|
| `contributor.js` | `(data, recordingData, workData, releaseData, labelData, placeData, eventData)` — 7 params |
| `label.js` | `(artistData, labelData, eventData, recordingData, workData, releaseData)` — 6 params |

### Section Types Rendered

**contributor.js** renders up to 20 section types:
Labels, Bands, Solo projects, Places, Events, Compositions, Lyrics, Recordings performed on, Recordings edited, Recordings produced, Field recordings, Music videos, Releases produced, Mastered, Photography, Design, Art direction, Compiled, TMDB sections, Static sections

**label.js** renders up to 12 section types:
Personnel, Signed artists, Owns, Owned by, Distributed by, Related labels, Events presented, Associated places, Releases, Manufactured, Works, Static sections

## TMDB Integration

`contributor.js` optionally integrates with TMDB (The Movie Database) for film credits.

### Setup

Add `TMDB_ID` to `__CONTRIBUTOR_CONFIG`:
```js
window.__CONTRIBUTOR_CONFIG = {
    MB_ID: '32bc1ac7-efd0-44f2-8645-8fecf6a40edb',
    TMDB_ID: 6309136,  // Optional
    // ...
};
```

### How It Works

1. Loads TMDB cache from `archive/_cache/tmdb/person/{TMDB_ID}.json`
2. Renders profile photo from TMDB (if available)
3. Groups crew credits by department (Directing, Production, Sound, etc.)
4. Renders acting credits with character names
5. Uses `LOCAL_FILM_MAP` for films with local pages
6. Adds TMDB attribution footer

### Data Source

TMDB data is backed up weekly via `.github/workflows/backup-tmdb.yml`. The script `scripts/backup-tmdb.mjs` fetches person data including cast/crew credits.

## Template Comparison

| Feature | artist_recordings | artist_releases | collective_recordings | contributor | label |
|---------|-------------------|-----------------|----------------------|-------------|-------|
| Config | `ARTIST_CONFIG` | `ARTIST_CONFIG` | `COLLECTIVE_CONFIG` | `__CONTRIBUTOR_CONFIG` | `__LABEL_CONFIG` |
| Structure | IIFE + async | IIFE + async | IIFE + async | IIFE + promises | IIFE + promises |
| Sort | Random | Newest first | Random | Date-based | Date-based |
| API calls | per-recording | per-release | per-recording | 7 sequential | 6 sequential |
| TMDB | No | No | No | Yes | No |
| Cache path | `artists/{id}` | `artists/{id}` | `collectives/{slug}` | `contributors/{id}` | `labels/{id}` | 
