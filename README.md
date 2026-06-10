# magmacrunch archive templates

Templates for artist and place catalog subpages. Each page is a minimal HTML stub that sets a config object and loads a shared template script.

---

## file structure

```
templates/
  artist_events.js        ← artist events template
  artist_recordings.js    ← artist recordings template
  artist_releases.js      ← artist releases template
  artist_works.js         ← artist works template
  place_events.js         ← place events template
  place_recordings.js     ← place recordings template
  place_personnel.js      ← place personnel template
  place_works.js          ← place works template

archive/by-artist/
  thld/                   ← texas hold'em lava dome (stubs complete)
    events.html
    recordings.html
    releases.html
    works.html
    index.html            ← hero page (one-off, not templated)
  svfp/                   ← sex van floor plan (stubs complete)
    events.html
    recordings.html
    releases.html
    works.html
    index.html
  woah/                   ← woah. (stubs complete)
    events.html
    recordings.html
    releases.html
    works.html
    index.html

archive/by-place/
  frogwood-manor/         ← frogwood manor (stubs complete)
    events.html
    recordings.html
    personnel.html
    works.html
    index.html            ← hero page (one-off, not templated)
```

All other artist and place archive pages still need HTML stubs created.

---

## how it works

Each stub HTML file contains the full static structure — nav, main skeleton, footer — plus a `<script>` block that defines `window.ARTIST_CONFIG` or `window.PLACE_CONFIG`. The template script is loaded last and handles:

1. Injecting page-specific CSS (accent color, hover states)
2. Populating dynamic elements (ticker, breadcrumb, sub-nav, label)
3. Fetching and rendering data from MusicBrainz

Because the full HTML structure is in the stub, the page renders immediately on load with no flash.

---

## config objects

### artist pages

```js
window.ARTIST_CONFIG = {
    id:        string,    // MusicBrainz artist UUID
    name:      string,    // full artist name, e.g. "texas hold'em lava dome"
    abbr:      string,    // short label, e.g. "THLD"
    accent:    string,    // CSS var name without --, e.g. "green" | "cyan" | "rose" | "yellow"
    backColor: string,    // nav-card class for ← back button, e.g. "c-orange" | "c-purple"
    siblings:  string[],  // page types in sub-nav, e.g. ["events","releases","recordings","works"]
    depth:     string,    // path prefix to site root, e.g. "../../../"
    ticker:    string[],  // extra ticker phrases beyond artist name + page type
};
```

### place pages

```js
window.PLACE_CONFIG = {
    id:        string,    // MusicBrainz place UUID
    name:      string,    // full place name, e.g. "Frogwood Manor"
    abbr:      string,    // short label, e.g. "frogwood manor"
    accent:    string,    // CSS var name without --, e.g. "green" | "cyan" | "blue" | "yellow"
    backColor: string,    // nav-card class for ← back button, e.g. "c-magenta"
    siblings:  string[],  // page types in sub-nav, e.g. ["events","personnel","recordings","works"]
    depth:     string,    // path prefix to site root, e.g. "../../../"
    ticker:    string[],  // extra ticker phrases beyond place name + page type
};
```

### default accent colors by page type

These are the current defaults. Each artist and place still needs final accent colors chosen — see **pending tweaks** below.

| page type         | default accent | color   |
|-------------------|----------------|---------|
| events            | green          | #39ff6e |
| recordings        | cyan           | #00f5ff |
| releases          | rose           | #ff3d6e |
| works             | yellow         | #ffe03a |
| personnel (place) | blue           | #4678ff |

### identity colors (back button + label)

| artist / place          | backColor  | color   |
|-------------------------|------------|---------|
| texas hold'em lava dome | c-orange   | #ff7c1f |
| sex van floor plan      | c-purple   | #c45fff |
| woah.                   | c-slate    | #8899aa |
| frogwood manor          | c-magenta  | #ff2d78 |

---

## pending tweaks

The JS templates still need some visual polish before all pages are finalized:

- **Accent color per page** — each artist and place needs deliberate accent colors chosen for each of their sub-pages, rather than relying on the defaults above
- **Text color consistency** — some sections of card text (links, labels, hover states) need review to decide which elements should match the accent color and which should stay neutral

> **Future idea:** a shared `archive-config.js` file (or JSON) could centralize all artist and place identity settings — MusicBrainz IDs, accent colors, backColor — so stubs become even thinner and color decisions only need to be made in one place.

---

## adding a new artist

1. Create a folder under `archive/by-artist/your-artist/`
2. For each page type, copy an existing stub and update `window.ARTIST_CONFIG`
3. Set `id` to the artist's MusicBrainz UUID (find it at musicbrainz.org)
4. Set `accent` and `backColor` to match the artist's color scheme
5. Keep `depth` as `"../../../"` for the standard folder depth

```js
window.ARTIST_CONFIG = {
    id:        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    name:      'my band name',
    abbr:      'MBN',
    accent:    'green',
    backColor: 'c-orange',
    siblings:  ['events', 'releases', 'recordings', 'works'],
    depth:     '../../../',
    ticker:    ['some phrase', 'another phrase'],
};
```

## adding a new place

1. Create a folder under `archive/by-place/your-place/`
2. For each page type, copy a Frogwood Manor stub and update `window.PLACE_CONFIG`
3. Set `id` to the place's MusicBrainz UUID
4. Set `accent` per page type and `backColor` for the place's identity color
5. Keep `depth` as `"../../../"` for the standard folder depth

```js
window.PLACE_CONFIG = {
    id:        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    name:      'My Venue',
    abbr:      'my venue',
    accent:    'cyan',
    backColor: 'c-rose',
    siblings:  ['events', 'personnel', 'recordings', 'works'],
    depth:     '../../../',
    ticker:    ['place archive', 'magmacrunch media'],
};
```

---

## api notes

All data is fetched live from the [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API). The API is rate-limited to ~1 request/second for anonymous clients, so:

- Records are fetched one at a time with 1000ms between each detail request
- `fetchWithRetry` handles 429 and 503 responses with exponential backoff (up to 4 retries)
- Event poster art is fetched from [Event Art Archive](https://eventartarchive.org) in a sequential background queue, so it never blocks the main loading loop
- Area name lookups (city → state → country) are cached per session to avoid redundant requests

Loading is slow by design — patience is required for artists or places with large catalogs.

---

## page type differences

### artist templates

| feature           | events            | recordings          | releases            | works               |
|-------------------|-------------------|---------------------|---------------------|---------------------|
| card style        | flex with art box | text-only card      | flex with album art | text-only card      |
| sort order        | newest first      | shuffled            | newest first        | shuffled            |
| placeholder cards | yes               | no (append on load) | no (append on load) | no (append on load) |
| poster/cover art  | yes (EAA)         | no                  | yes (CAA)           | no                  |
| `fetchWithRetry`  | yes               | yes                 | yes                 | yes                 |

### place templates

| feature           | events            | recordings          | personnel           | works               |
|-------------------|-------------------|---------------------|---------------------|---------------------|
| card style        | flex with art box | text-only card      | text-only card      | text-only card      |
| sort order        | newest first      | shuffled            | shuffled            | shuffled            |
| placeholder cards | yes               | no (append on load) | no (append on load) | no (append on load) |
| poster art        | yes (EAA)         | no                  | no                  | no                  |
| `fetchWithRetry`  | yes               | yes                 | yes                 | yes                 |
