# Archive Page Theming Guide

How to add custom color schemes to archive pages (by-artist, by-place, by-contributor). For reference implementations, study the actual files — not this doc in isolation.

**For detailed theming documentation, see [Archive Theming](https://github.com/magmacrunchmedia/magmacrunch.com/wiki/Archive-Theming) on the GitHub wiki.**

---

## Reference Implementations

| Page type | Reference | Why |
|-----------|-----------|-----|
| By-place | **Melrose House** — `archive/by-place/melrose-house/` | Cleanest 3-layer CSS system, transparent cards, solid nav buttons |
| By-artist (themed) | **Juanito Thompson** — `archive/by-artist/juanito-thompson/` | Per-page accent approach, custom standalone subpages |
| By-contributor | **Jake McCoy** — `archive/by-contributor/jake-mccoy/` | contributor.js template, simpler structure |

---

## Template System

Three template families handle different page types:

| Template | Config object | Pages |
|----------|--------------|-------|
| `templates/artist_*.js` | `window.ARTIST_CONFIG` | events, releases, recordings, works |
| `templates/collective_*.js` | `window.COLLECTIVE_CONFIG` | recordings, releases, works (multi-artist) |
| `templates/place_*.js` | `window.PLACE_CONFIG` | personnel, recordings, works, events |
| `templates/contributor.js` | `window.__CONTRIBUTOR_CONFIG` | single page showing all credits |

Each page type has a thin HTML stub that defines config, then loads the template script. The template injects CSS, populates dynamic elements (`#sub-nav`, `#breadcrumb`, `#artist-label`), and fetches MusicBrainz data.

### Config Objects

**ARTIST_CONFIG** (used by `artist_events.js`, `artist_releases.js`, `artist_recordings.js`, `artist_works.js`):

```js
window.ARTIST_CONFIG = {
    id:        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // MusicBrainz artist UUID
    name:      'artist name',
    abbr:      'AN',                                  // short label in nav
    accent:    'green',                               // CSS var name (without --)
    backColor: 'c-back',                              // nav-card class for ← back
    siblings:  ['about', 'events', 'recordings', 'releases', 'works'],
    depth:     '../../../',                            // path prefix to site root
    ticker:    ['extra', 'phrases'],                   // optional ticker text
};
```

**COLLECTIVE_CONFIG** (used by `collective_recordings.js`, `collective_releases.js`, `collective_works.js`):

```js
window.COLLECTIVE_CONFIG = {
    ids:       ['uuid1', 'uuid2', ...],               // MusicBrainz artist UUIDs (array)
    name:      'collective name',
    abbr:      'ABBR',
    accent:    'cyan',
    backColor: 'c-back',
    siblings:  ['about', 'recordings', 'releases', 'works'],
    depth:     '../../../',
    slug:      'collective-slug',                      // optional, for cache lookup
    ticker:    ['extra', 'phrases'],                   // optional

    // Theme overrides (all optional):
    cssVarPrefix:  'thld',                             // CSS var prefix (e.g. 'thld' → var(--thld-cyan))
    accentRgbMap:  { cyan: '224,122,47' },             // custom RGB values per color key
    mutedColorVar: 'var(--thld-muted)',                // muted text color CSS var

    // Works-only (optional):
    lyricsPath: '../../../press/lyrics/artist/',
    lyricsMap:  { 'song title': 'lyrics-file.html' },
};
```

Key differences from ARTIST_CONFIG:
- `ids` (array) instead of `id` (string) — supports multiple MusicBrainz artists
- `slug` — used for cache path (`_cache/collectives/{slug}.json`), omit if no cache
- Theme overrides allow per-artist customization without changing the template
- Templates add entity-map integration and MusicBrainz attribution automatically

**PLACE_CONFIG** (used by `place_recordings.js`, `place_works.js`, `place_personnel.js`):

```js
window.PLACE_CONFIG = {
    id:        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // MusicBrainz place UUID
    name:      'Place Name',
    abbr:      'PLACE',
    accent:    'cyan',
    backColor: 'c-cyan',
    siblings:  ['personnel', 'recordings', 'works'],
    depth:     '../../../',
};
```

**CONTRIBUTOR_CONFIG** (used by `contributor.js`):

```js
window.__CONTRIBUTOR_CONFIG = {
    MB_ID:        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // MusicBrainz artist UUID
    NAME:         'Full Name',
    ARCHIVE_LINKS: {                                       // MB ID → internal path
        'artist-uuid': '../../by-artist/name/index.html',
    },
    accent:      'cyan',                                  // optional, defaults to 'cyan'
};
```

Contributor pages also require `entity-map.js` (loaded before `contributor.js`) which provides `window.__ENTITY_MAP` — a central MB ID → internal path mapping used for link generation.

---

## 3-Layer CSS System

| Layer | File | Purpose |
|-------|------|---------|
| 1. Shared palette | `[prefix]-shared.css` | `:root` CSS vars for the page's color palette |
| 2. Index page | `index.html` inline `<style>` | Hero layout, body class, nav-card overrides |
| 3. Subpages | `[prefix]-[section].css` | Section-specific overrides (per-section CSS) |

Example for Melrose House: `mh-shared.css` → `index.html` `<style>` → `mh-personnel.css`, `mh-recordings.css`, `mh-works.css`.

### Cards use `background: transparent`

The page background shows through cards. Create contrast with:
```css
body.[page]-page main > * { background: var(--[prefix]-bg); }
```

### Near-black background

Each page defines its own dedicated near-black background variable (e.g., `--asp-bg: #100b08`, `--bbc-bg: #070906`). This is set on the body and used as the hero gradient endpoint:

```css
:root { --[prefix]-bg: #100b08; }
body.[page]-page { background: var(--[prefix]-bg); }
```

The hero gradient should fade from transparent (0–85%) to the near-black at 0.85 opacity (85–100%), matching the body background:
```css
.artist-hero-gradient {
    background: linear-gradient(
        to bottom,
        rgba(R,G,B,0.0)  0%,
        rgba(R,G,B,0.0)  85%,
        rgba(R,G,B,0.85) 100%
    );
}
```

### Footer overlay

The footer overlays the hero at the bottom of the viewport:
```css
main { position: relative; padding: 0; }
.artist-hero { margin-bottom: 0; }
footer { position: absolute; bottom: 0; left: 0; right: 0; border-top: none; z-index: 2; }
```

Footer colors are themed in the shared CSS:
```css
body.[page]-page footer { color: var(--[prefix]-muted); }
body.[page]-page footer span { color: var(--[prefix]-accent); }
```

### All nav-card buttons are solid

`background` and `border-color` match the section color, `color: #1e1e1e` (dark text on colored bg). No hover color-change — buttons stay solid.

### Back buttons use near-black bg

```css
body.[page]-page .nav-card.c-green {
    background: var(--[prefix]-bg);
    color: var(--[prefix]-brand);
    border-color: var(--[prefix]-brand);
}
body.[page]-page .nav-card.c-green:hover {
    background: var(--[prefix]-brand);
    color: #1e1e1e;
}
```

---

## COLOR_MAP and Nav-Card Conventions

Each template script defines a `COLOR_MAP` that assigns a `c-*` class to each sibling page. **All sibling keys must be present** — missing keys fall back to `c-cyan`.

```js
const COLOR_MAP = {
    about:        'c-about',
    photography:  'c-photography',
    events:       'c-events',
    recordings:   'c-recordings',
    releases:     'c-releases',
    works:        'c-works',
    'music-videos': 'c-blue',
};
```

The `c-*` classes are NOT defined in CSS files — they exist as keys in `BACK_COLOR_VAR` lookup tables inside the template scripts. Per-section CSS files override these classes with section-specific colors.

**Conventional accent colors by section:**

| Section | Typical `accent` |
|---------|-----------------|
| events | `green` |
| recordings | `cyan` |
| releases | `rose` |
| works | `yellow` |
| personnel | `blue` |

---

## Template-Injected Styles & Override Pattern

Templates inject CSS at runtime using `accent` and `backColor` to style `.breadcrumb`, `.page-title`, `.artist-label`/`.place-label`, and `.catalog-wrap`.

Per-section CSS must override these using **`!important` + fully-qualified selectors**:

```css
/* Override template-injected accent color on links */
body.[page]-[section]-page p a { color: var(--[prefix]-accent) !important; }
body.[page]-[section]-page h3 { color: var(--[prefix]-accent) !important; }
body.[page]-[section]-page p strong { color: var(--[prefix]-heading) !important; }
```

Without `!important`, the template's shorthand rules leak through.

**About link override** — about is often not in COLOR_MAP, so the template falls back to `c-cyan`. Per-section CSS must explicitly target it:

```css
body.[page]-[section]-page a[href="about.html"] {
    color: var(--[prefix]-sage) !important;
}
```

**All per-section CSS files need identical nav-card blocks** so buttons look the same whether entering from index or a subpage.

---

## CSS Cascade Order

When a subpage loads, styles resolve in this order:

1. `style.css` — site-wide globals and resets
2. `assets/archive.css` — shared archive layout
3. `[prefix]-shared.css` — palette (`:root` vars only)
4. `[prefix]-[section].css` — section overrides
5. Template-injected `<style>` — dynamic styles using config
6. Inline `<style>` in `index.html` — index-page-only (not loaded on subpages)

Per-section CSS files override template-injected styles using `body.[prefix]-[section]-page` selectors, which have higher specificity than the injected `.page-title` etc.

---

## Index Page Hero Structure

The hero section must follow this exact structure:

```html
<main>
    <div class="artist-hero">
        <img class="artist-hero-img" src="..." alt="...">
        <div class="artist-hero-tint"></div>
        <div class="artist-hero-gradient"></div>
        <div class="hero-inner">
            <div class="artist-header">
                <div class="artist-label">// by artist //</div>
                <div class="artist-name">ARTIST<br>NAME</div>
                <div class="sub-nav">
                    <a href="..." class="nav-card c-cyan">...</a>
                </div>
            </div>
        </div>
        <div class="mb-link-wrap">
            <a class="mb-link" href="...">▶ view on MusicBrainz</a>
        </div>
    </div>
</main>
<footer>...</footer>
```

Critical CSS properties:
- `main { position: relative; padding: 0; }` — contains the absolutely-positioned footer
- `.artist-hero { min-height: 100vh; margin-bottom: 0; }` — full viewport, no gap
- `.artist-hero { justify-content: flex-end }` — without this the header floats at the top
- `.artist-hero-gradient` fades from transparent (0–85%) to near-black at 0.85 opacity (85–100%)
- `footer { position: absolute; bottom: 0; left: 0; right: 0; border-top: none; z-index: 2; }` — overlays the hero
- `.mb-link-wrap { margin-bottom: 40px; }` — spacing above the footer

---

## Adding a New Artist

1. Create folder: `archive/by-artist/your-artist/`
2. Create stub files: `index.html`, plus subpages (`events.html`, `recordings.html`, etc.)
3. Create `your-artist-shared.css` with scoped palette and nav theme variables
4. Create per-section CSS files (e.g., `your-artist-events.css`)
5. Set `window.ARTIST_CONFIG` in each stub (see Config Objects above)
6. Load the template script: `<script src="../../../templates/artist_events.js"></script>`

See `ARCHIVE_THEMING.md` reference implementations for CSS patterns. For custom standalone subpages (about, photography), use static HTML without `id="sub-nav"` so the template skips population.

## Adding a New Place

Same pattern as artist but use `window.PLACE_CONFIG` and place templates (`place_recordings.js`, `place_works.js`, `place_personnel.js`). Place subpages use `personnel.html` instead of `events.html`.

## Adding a New Collective Artist

For multi-artist groups (e.g. bands, collectives), use `window.COLLECTIVE_CONFIG` instead of `ARTIST_CONFIG`:

1. Create folder: `archive/by-artist/your-collective/`
2. Create stub files: `recordings.html`, `releases.html`, `works.html` (plus `index.html`, `about.html`, etc.)
3. Create `your-collective-shared.css` with scoped palette and nav theme variables
4. Create per-section CSS files (e.g., `your-collective-recordings.css`)
5. Set `window.COLLECTIVE_CONFIG` in each stub with `ids[]` array of MusicBrainz artist UUIDs
6. Load entity-map and the collective template:
   ```html
   <script src="../../../templates/entity-map.js"></script>
   <script src="../../../templates/collective_recordings.js"></script>
   ```
7. If the collective has custom colors not in the standard palette, add `accentRgbMap` to override RGB values
8. If using a custom CSS variable prefix (e.g. `--thld-*` instead of `--*`), set `cssVarPrefix`

Example stub:
```html
<script>
window.COLLECTIVE_CONFIG = {
    ids:    ['uuid1', 'uuid2'],
    slug:   'my-collective',
    name:   'My Collective',
    abbr:   'MC',
    accent: 'cyan',
    siblings: ['about', 'recordings', 'releases', 'works'],
    depth:  '../../../',
};
</script>
<script src="../../../templates/entity-map.js"></script>
<script src="../../../templates/collective_recordings.js"></script>
```

## Adding a New Contributor

1. Create folder: `archive/by-contributor/your-name/`
2. Create `index.html` following the pattern in `archive/by-contributor/jake-mccoy/index.html`
3. Set `window.__CONTRIBUTOR_CONFIG` with `MB_ID`, `NAME`, and `ARCHIVE_LINKS`
4. Load `entity-map.js` then `contributor.js`:
   ```html
   <script src="../../../templates/entity-map.js"></script>
   <script src="../../../templates/contributor.js"></script>
   ```
5. Add a card linking to the new contributor in `archive/by-contributor/index.html`
6. Add any new artist MB ID → internal path mappings to `templates/entity-map.js`

---

## Finding a MusicBrainz ID

1. Search at https://musicbrainz.org
2. Navigate to the artist/place page
3. The UUID is in the URL: `https://musicbrainz.org/artist/260e4953-a937-4355-8389-d1baaf24eca5`

---

## Single-Artist Page Theming (Current Approach)

For single-artist archive pages (recordings, releases, works), the theming is controlled by a single CSS variable: `--section-accent`.

### How It Works

The CSS templates (`templates/artist-*.css`) use `--section-accent` for all themed elements:

```css
.breadcrumb a { color: var(--section-accent); }
.artist-label { color: var(--section-accent); }
.page-title { color: var(--section-accent); }
.nav-card.c-back { color: var(--section-accent); border-color: var(--section-accent); }
```

### Setting Up a New Artist

1. Define the accent color in `[prefix]-shared.css`:
   ```css
   :root { --my-artist-accent: #a8b890; }
   ```

2. Set `--section-accent` in each page's inline `<style>`:
   ```html
   <style>:root { --section-accent: var(--my-artist-accent); }</style>
   ```

3. Match the config `accent` value:
   ```js
   window.ARTIST_CONFIG = {
       accent: 'my-artist-accent',  // → var(--my-artist-accent)
   };
   ```

4. Add RGB values to `ACCENT_RGB` in JS templates for text-shadow:
   ```js
   const ACCENT_RGB = { 'my-artist-accent': '168,184,144' };
   ```

### The Override Pattern

Each page needs high-specificity body-class overrides to ensure `--section-accent` is used:

```html
<style>
    :root { --section-accent: var(--my-artist-accent); }
    body.my-page.my-recordings-page .breadcrumb a { color: var(--section-accent); }
    body.my-page.my-recordings-page .breadcrumb a:hover { color: var(--cream, #f0ead8); }
    body.my-page.my-recordings-page .breadcrumb .sep { color: var(--section-accent); opacity: 0.6; }
    body.my-page.my-recordings-page .breadcrumb .current { color: var(--section-accent); }
    body.my-page.my-recordings-page .artist-label { color: var(--section-accent); }
    body.my-page.my-recordings-page .page-title { color: var(--section-accent); text-shadow: 0 0 20px rgba(168,184,144,0.45); }
    body.my-page.my-recordings-page .nav-card.c-back { color: var(--section-accent); border-color: var(--section-accent); }
    body.my-page.my-recordings-page .nav-card.c-back:hover { background: var(--section-accent); color: var(--black, #080808); }
</style>
```

### Reference: Jon McCoy

| Page | `--section-accent` | Config `accent` |
|------|-------------------|-----------------|
| recordings | `var(--jm-muted-rose)` | `jm-muted-rose` |
| releases | `var(--jm-deep-warm)` | `jm-deep-warm` |
| works | `var(--jm-deep-sage)` | `jm-deep-sage` |

See [Archive Theming](https://github.com/magmacrunchmedia/magmacrunch.com/wiki/Archive-Theming) wiki page for full details.
