# Archive Theming

How colors and styling work on archive subpages. This is the authoritative reference for config objects, HTML structure, breadcrumb/title conventions, and the CSS override system.

For step-by-step page creation guides, see [Adding an Artist Page](Adding-an-Artist-Page), [Adding a Place Page](Adding-a-Place-Page), and [Adding a Contributor Page](Adding-a-Contributor-Page).

---

## Subpage HTML Structure

Every template-driven subpage follows this exact structure. The breadcrumb, artist-label, and sub-nav are **empty divs** — the template JS fills them at runtime.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{ABBR} — {type} — magmacrunch media</title>
    <link rel="icon" type="image/jpeg" href="../../../assets/logo.jpg">
    <link rel="stylesheet" href="../../../style.css">
    <link rel="stylesheet" href="../../../assets/archive.css">
    <link rel="stylesheet" href="{slug}-shared.css">
    <link rel="stylesheet" href="../../../templates/artist-{type}.css">
    <style>
        :root { --section-accent: var(--{prefix}-{color}); }
        body.{prefix}-page.{prefix}-{type}-page .breadcrumb a { color: var(--section-accent); }
        body.{prefix}-page.{prefix}-{type}-page .breadcrumb a:hover { color: var(--cream, #f0ead8); }
        body.{prefix}-page.{prefix}-{type}-page .breadcrumb .sep { color: var(--section-accent); opacity: 0.6; }
        body.{prefix}-page.{prefix}-{type}-page .breadcrumb .current { color: var(--section-accent); }
        body.{prefix}-page.{prefix}-{type}-page .artist-label { color: var(--section-accent); }
        body.{prefix}-page.{prefix}-{type}-page .page-title { color: var(--section-accent); text-shadow: 0 0 20px rgba(R,G,B,0.45); }
        body.{prefix}-page.{prefix}-{type}-page .nav-card.c-back { color: var(--section-accent); border-color: var(--section-accent); }
        body.{prefix}-page.{prefix}-{type}-page .nav-card.c-back:hover { background: var(--section-accent); color: var(--black, #080808); }
    </style>
    <script>
    window.ARTIST_CONFIG = {
        id:        '{uuid}',
        name:      '{name}',
        abbr:      '{ABBR}',
        accent:    '{css-var}',
        backColor: 'c-{section}',
        siblings:  ['about', 'events', 'recordings', 'releases', 'works'],
        depth:     '../../../',
    };
    </script>
</head>
<body class="{prefix}-page {prefix}-{type}-page">
<nav id="auto-nav" data-depth="../../../"></nav>
<main>
    <div class="breadcrumb"></div>

    <div class="page-header">
        <div class="artist-label" id="artist-label"></div>
        <div class="page-title">{TYPE}</div>
        <div class="sub-nav" id="sub-nav"></div>
    </div>

    <div class="catalog-wrap">
        <div id="status-bar">loading {type}…</div>
        <div id="count-bar"></div>
        <div id="{type}-list"></div>
    </div>
</main>
<footer>&copy; 2026 <span>magmacrunch media</span></footer>
<script src="../../../nav.js"></script>
<script src="../../../templates/entity-map.js"></script>
<script src="../../../templates/{artist|collective|place}_{type}.js"></script>
</body>
</html>
```

**Key points:**
- `<main>` has NO `data-siblings` or `data-back-color` attributes. All config flows through `window.*_CONFIG`.
- Breadcrumb, artist-label, and sub-nav divs are empty — the template fills them.
- `.page-title` contains the ALL UPPERCASE section name (e.g., `RECORDINGS`).
- The inline `<style>` block overrides template-injected colors using high-specificity body-class selectors.

---

## Empty stubs must reserve their own height

Because the breadcrumb, label and sub-nav ship empty and are filled by JS, the browser
can paint the page before the template script runs — any time the script is still in
flight while the (render-blocking, often cached) CSS is already applied. Everything then
jumps down as the stubs fill.

`assets/archive.css` handles this in two parts:

```css
/* 1. don't flash the empty shell */
main .breadcrumb:empty,
.artist-label:empty,
.place-label:empty,
.sub-nav:empty { visibility: hidden; }

/* 2. ...and hold the space it will occupy */
main .breadcrumb:empty,
.artist-label:empty,
.place-label:empty { min-height: 1em; }
.sub-nav:empty     { min-height: 34px; }
```

**`visibility: hidden` reserves nothing on its own.** An empty block generates no line
boxes, so it measures 0px tall no matter what its visibility is — the rule suppresses
the *flash* but not the *shift*. Without the `min-height` floors, `.page-title` dropped
a measured **75px** on every load of a template-driven subpage (breadcrumb 7px + label
10px on desktop, more when either wraps), and content below the sub-nav dropped further.

Sizing notes:
- `1em` tracks each label's own `font-size` and equals its single-line height, so the
  reservation stays exact if the font-size changes.
- `34px` is one `.nav-card` row: 10px line box + 20px padding + 4px border, per
  `style.css`. Pages whose sub-nav wraps to two rows still shift the content *below*
  the sub-nav; the title never moves.
- Every floor is scoped to `:empty`, so it **cannot** affect a populated element —
  a filled sub-nav computes `min-height: 0px`. Keep that scoping if you edit these.

---

## Config Objects

### ARTIST_CONFIG

Used by `artist_recordings.js`, `artist_releases.js`, `artist_works.js`, `artist_events.js`, `artist_links.js`.

```js
window.ARTIST_CONFIG = {
    id:        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // MusicBrainz artist UUID (required)
    name:      'artist name',                          // Display name (required)
    abbr:      'AN',                                   // Short label for breadcrumb (required)
    accent:    'green',                                // CSS var name WITHOUT -- prefix (required)
    backColor: 'c-cyan',                               // Nav-card class for back button (required)
    siblings:  ['about', 'events', 'recordings', 'releases', 'works'], // Sibling pages (required)
    depth:     '../../../',                            // Path prefix to site root (required)
    ticker:    ['extra', 'phrases'],                   // Optional ticker text
    links:     [                                       // Optional — used by artist_links.js
        {
            section: 'MUSICBRAINZ',
            items: [{ id: 'uuid', label: '▶ view on MusicBrainz' }]
        },
        {
            section: 'BANDCAMP',
            items: [{ url: 'https://...', name: 'Bandcamp', abbr: 'BC' }]
        },
    ],
};
```

### PLACE_CONFIG

Used by `place_recordings.js`, `place_works.js`, `place_personnel.js`, `place_events.js`, `place_links.js`.

```js
window.PLACE_CONFIG = {
    id:        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // MusicBrainz place UUID (required)
    name:      'Place Name',                           // Display name (required)
    abbr:      'PLACE',                                // Short label for breadcrumb (required)
    accent:    'cyan',                                 // CSS var name WITHOUT -- prefix (required)
    backColor: 'c-recordings',                         // Nav-card class for back button (required)
    siblings:  ['about', 'personnel', 'recordings', 'works'], // Sibling pages (required)
    depth:     '../../../',                            // Path prefix to site root (required)
    links:     [                                       // Optional — used by place_links.js
        {
            section: 'MUSICBRAINZ',
            items: [{ id: 'uuid', label: '▶ view on MusicBrainz' }]
        },
    ],
};
```

### COLLECTIVE_CONFIG

Used by `collective_recordings.js`, `collective_releases.js`, `collective_works.js`. For multi-artist groups (bands, collectives).

```js
window.COLLECTIVE_CONFIG = {
    ids:       ['uuid1', 'uuid2', ...],               // MusicBrainz artist UUIDs — array (required)
    name:      'collective name',                      // Display name (required)
    abbr:      'ABBR',                                 // Short label (required)
    accent:    'cyan',                                 // CSS var name WITHOUT -- prefix (required)
    backColor: 'c-back',                               // Nav-card class for back button (required)
    siblings:  ['about', 'recordings', 'releases', 'works'], // Sibling pages (required)
    depth:     '../../../',                            // Path prefix to site root (required)
    slug:      'collective-slug',                      // Optional — cache key for JSON files
    cssVarPrefix:  'thld',                             // Optional — CSS var prefix (e.g. 'thld' → var(--thld-cyan))
    accentRgbMap:  { cyan: '224,122,47' },             // Optional — custom RGB values per color key
    mutedColorVar: 'var(--thld-muted)',                // Optional — muted text color CSS var
};
```

### __CONTRIBUTOR_CONFIG

Used by `contributor.js`. Note: this config uses **UPPERCASE** property names (different from artist/place/collective).

```js
window.__CONTRIBUTOR_CONFIG = {
    MB_ID:        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // MusicBrainz artist UUID (required)
    NAME:         'Full Name',                            // Display name (required)
    ARCHIVE_LINKS: {                                      // MB ID → internal path mapping
        'artist-uuid': '../../by-artist/name/index.html',
    },
    accent:      'cyan',                                  // Optional — CSS var name, defaults to 'cyan'
    depth:       '../../../',                             // Optional — path prefix for attribution footer
};
```

### __LABEL_CONFIG

Used by `label.js`. Also uses **UPPERCASE** property names.

```js
window.__LABEL_CONFIG = {
    MB_ID:  'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // MusicBrainz label UUID (required)
    NAME:   'Label Name',                           // Display name (required)
    accent: 'cyan',                                 // Optional — CSS var name, defaults to 'cyan'
};
```

---

## CSS Cascade Order

When a subpage loads, styles resolve in this order (later overrides earlier):

```
┌────────────────────────────────────────────────────────────────┐
│ 1. style.css                                                   │
│    Site-wide globals, resets, .nav-card base styles            │
├────────────────────────────────────────────────────────────────┤
│ 2. assets/archive.css                                          │
│    Shared archive layout, default .breadcrumb, .page-title     │
├────────────────────────────────────────────────────────────────┤
│ 3. [prefix]-shared.css                                         │
│    Artist palette (:root CSS variables), button colors         │
├────────────────────────────────────────────────────────────────┤
│ 4. CSS template (templates/artist-*.css)                       │
│    Uses var(--section-accent) for themed elements              │
├────────────────────────────────────────────────────────────────┤
│ 5. Page CSS ([prefix]-[section].css)                           │
│    High-specificity overrides for static pages                 │
├────────────────────────────────────────────────────────────────┤
│ 6. JS template (templates/artist_*.js)                         │
│    Injects <style> at runtime using accent/backColor config    │
├────────────────────────────────────────────────────────────────┤
│ 7. Inline <style> in page HTML                                 │
│    Sets --section-accent and final body-class overrides        │
└────────────────────────────────────────────────────────────────┘
```

**Key insight:** The JS template (step 6) overrides the CSS template (step 4) because it loads later. The inline `<style>` (step 7) restores the CSS template behavior using high-specificity body-class selectors.

---

## Template-Injected Styles

Templates inject CSS at runtime using the `accent` and `backColor` config values. The template CSS files (`templates/artist-recordings.css`, etc.) provide base styles for:

- **Breadcrumb**: relative positioning, `--section-accent` color on links/separators/current
- **Page header**: `.page-title` color, `.artist-label` / `.place-label` color
- **Back nav-card**: `--section-accent` border and text color, hover fill
- **Sub-nav layout**: flexbox grid for nav cards
- **Catalog**: `.catalog-wrap`, `#status-bar`, `#count-bar` styles

The inline `<style>` block in each subpage **must override** these using fully-qualified body-class selectors:

```css
body.{prefix}-page.{prefix}-{type}-page .breadcrumb a { color: var(--section-accent); }
body.{prefix}-page.{prefix}-{type}-page .page-title { color: var(--section-accent); text-shadow: 0 0 20px rgba(R,G,B,0.45); }
```

Without the body-class qualifier, the template's shorthand rules may leak through.

---

## Core Principle

Each subpage has a navigation button on the index page with a specific color. When you navigate to that subpage, **all themed elements should use that same color**:

- Breadcrumb links
- Artist/collective label (e.g., "// Jon McCoy //")
- Page title (e.g., "RECORDINGS")
- Back button (← back)
- Content links, card borders, and highlights

This creates visual continuity — the button color you clicked becomes the page's accent color.

### Visual: Button → Page Theme

```
┌─────────────────────────────────────────────────────────────────┐
│  INDEX PAGE                                                     │
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │ about   │  │records  │  │releases │  │ works   │  ...        │
│  │ #6070a0 │  │ #c8a8a8 │  │ #f0e8d8 │  │ #587868 │             │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘             │
│       │            │            │            │                  │
└───────┼────────────┼────────────┼────────────┼──────────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
│ about     │  │recordings │  │releases   │  │ works     │
│ PAGE      │  │ PAGE      │  │ PAGE      │  │ PAGE      │
│           │  │           │  │           │  │           │
│ ────────  │  │ ────────  │  │ ────────  │  │ ────────  │
│ title:    │  │ title:    │  │ title:    │  │ title:    │
│  #6070a0  │  │  #c8a8a8  │  │  #f0e8d8  │  │  #587868  │
│           │  │           │  │           │  │           │
│ breadcrumb│  │ breadcrumb│  │ breadcrumb│  │ breadcrumb│
│  #6070a0  │  │  #c8a8a8  │  │  #f0e8d8  │  │  #587868  │
│           │  │           │  │           │  │           │
│ back btn: │  │ back btn: │  │ back btn: │  │ back btn: │
│  #6070a0  │  │  #c8a8a8  │  │  #f0e8d8  │  │  #587868  │
└───────────┘  └───────────┘  └───────────┘  └───────────┘
```

---

## Breadcrumb Conventions

### Positioning

| Page type | Position | Set in |
|-----------|----------|--------|
| Hero index pages (by-artist, by-place) | `position: absolute; top: 72px; left: 20px` | `assets/archive.css` |
| Subpages (recordings, releases, works, etc.) | `position: relative; top: auto; left: auto` | `templates/artist-recordings.css` etc. |
| Contributor/label pages | `position: relative; margin-top: -8px; margin-bottom: 16px` | `templates/contributor.css` |
| Archive index pages | `position: relative; margin-top: -8px; margin-bottom: 16px` | Inline styles |

### Color

All subpage breadcrumbs use `--section-accent` for link, separator, and current-element colors. The inline `<style>` block sets this:

```css
.breadcrumb a { color: var(--section-accent); }
.breadcrumb .sep { color: var(--section-accent); opacity: 0.6; }
.breadcrumb .current { color: var(--section-accent); }
```

### Structure

- **Subpages**: `archive › by artist › {abbr}` (3 levels, no "home" link)
- **Contributor pages**: `home › archive › by contributor › {NAME}` (4 levels, includes "home")
- **Archive index**: `home › archive` (2 levels)

### Separator

Use `&#8250;` or `&rsaquo;` (both render as `›`). Keep consistent within a page.

---

## Title Conventions

| Element | Capitalization | Example | Used on |
|---------|---------------|---------|---------|
| `.page-title` | **ALL UPPERCASE** | `RECORDINGS`, `RELEASES`, `WORKS` | Subpages, section index pages |
| `.artist-label` / `.place-label` | **lowercase with `//` decorators** | `// sex van floor plan //` | Hero index pages, subpages |
| `.contrib-name` | **ALL UPPERCASE** | `DAVID HAYES`, `JAKE THOMAS` | Contributor/label pages |
| Section index titles | **lowercase with `//` decorators** | `// archive //`, `// by label //` | `archive/index.html`, `by-label/index.html` |

---

## Body Class Naming

Every subpage uses two space-separated classes on `<body>`:

```
body.{prefix}-page {prefix}-{type}-page
```

Examples:
- `body.svfp-page svfp-recordings-page`
- `body.thld-page thld-recordings-page`
- `body.fm-page fm-recordings-page`
- `body.mh-page mh-recordings-page`

The prefix is typically a short abbreviation of the artist/place name. The type matches the subpage name (`recordings`, `releases`, `works`, `events`, `personnel`).

---

## backColor Convention

The `backColor` config property controls the color of the "← back" nav card on subpages. It follows the pattern `c-{section}`:

| Section | `backColor` value |
|---------|-------------------|
| recordings | `c-recordings` |
| releases | `c-releases` |
| works | `c-works` |
| events | `c-events` |
| personnel | `c-personnel` |

The `c-{section}` classes are resolved by the template's `BACK_COLOR_VAR` lookup table. Per-section CSS can override these with section-specific colors.

---

## CSS Files Linked (Subpages)

Every subpage links exactly 4 stylesheets in this order:

```html
<link rel="stylesheet" href="../../../style.css">                    <!-- 1. Global site styles -->
<link rel="stylesheet" href="../../../assets/archive.css">           <!-- 2. Archive section styles -->
<link rel="stylesheet" href="{slug}-shared.css">                     <!-- 3. Per-artist/place palette -->
<link rel="stylesheet" href="../../../templates/artist-{type}.css"> <!-- 4. Template base styles -->
```

Available template CSS files:
- `templates/artist-recordings.css`
- `templates/artist-releases.css`
- `templates/artist-works.css`
- `templates/artist-events.css`
- `templates/artist-about.css`
- `templates/artist-personnel.css`
- `templates/artist-links.css`

---

## Scripts Loaded (Bottom of Body)

```html
<script src="../../../nav.js"></script>
<script src="../../../templates/entity-map.js"></script>
<script src="../../../templates/{artist|collective|place}_{type}.js"></script>
```

- `nav.js` — site-wide navigation
- `entity-map.js` — MusicBrainz ID → internal path mapping (required for contributor and collective pages; not needed for link pages)
- Template JS — reads `window.*_CONFIG`, renders the page. Most templates fetch MusicBrainz data; link templates are config-only.

---

## Index Page Button Colors

Each button class maps to a CSS variable in the artist's shared CSS:

| Button | Class | Description |
|--------|-------|-------------|
| back | `c-back` | Return to index (uses accent color) |
| about | `c-about` | About the artist |
| links | `c-links` | External links |
| music videos | `c-music-videos` | Music video gallery |
| photography | `c-photography` | Photo gallery |
| recordings | `c-recordings` | MusicBrainz recordings |
| releases | `c-releases` | MusicBrainz releases |
| works | `c-works` | MusicBrainz works |
| events | `c-events` | MusicBrainz events |

**Jon McCoy example:**

| Button | CSS Variable | Hex Color |
|--------|-------------|-----------|
| about | `--jm-mid-cool` | #6070a0 |
| links | `--jm-periwinkle` | #9090b8 |
| music videos | `--jm-light-cool` | #c0ccd8 |
| photography | `--jm-dusty-plum` | #786878 |
| recordings | `--jm-muted-rose` | #c8a8a8 |
| releases | `--jm-pale-warm` | #f0e8d8 |
| works | `--jm-deep-sage` | #587868 |

---

## Subpage Types

### Template-Driven Pages (recordings, releases, works, events)

These pages use JS templates that inject CSS at runtime. The theming chain is:

1. CSS template defines rules using `var(--section-accent)`
2. JS template injects styles using `accent` from config
3. Inline `<style>` sets `--section-accent` and overrides

#### Code Example: recordings.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jon McCoy — recordings — magmacrunch media</title>
    <link rel="icon" type="image/jpeg" href="../../../assets/logo.jpg">
    <link rel="stylesheet" href="../../../style.css">
    <link rel="stylesheet" href="../../../assets/archive.css">
    <link rel="stylesheet" href="jm-shared.css">
    <link rel="stylesheet" href="../../../templates/artist-recordings.css">
    
    <!-- CRITICAL: Set --section-accent and add overrides -->
    <style>
        :root { --section-accent: var(--jm-muted-rose); }
        body.jm-page.jm-recordings-page .breadcrumb a { color: var(--section-accent); }
        body.jm-page.jm-recordings-page .breadcrumb a:hover { color: var(--jm-cream); }
        body.jm-page.jm-recordings-page .breadcrumb .sep { color: var(--section-accent); opacity: 0.6; }
        body.jm-page.jm-recordings-page .breadcrumb .current { color: var(--section-accent); }
        body.jm-page.jm-recordings-page .artist-label { color: var(--section-accent); }
        body.jm-page.jm-recordings-page .page-title { color: var(--section-accent); text-shadow: 0 0 20px rgba(200,168,168,0.45); }
        body.jm-page.jm-recordings-page .nav-card.c-back { color: var(--section-accent); border-color: var(--section-accent); }
        body.jm-page.jm-recordings-page .nav-card.c-back:hover { background: var(--section-accent); color: var(--black, #080808); }
    </style>
    
    <script>
    window.ARTIST_CONFIG = {
        id:        '33c830f0-d5be-4baf-b8db-3dc754e74c16',
        name:      'Jon McCoy',
        abbr:      'JM',
        accent:    'jm-muted-rose',  // MUST match --section-accent
        backColor: 'c-jm-rose',
        siblings:  ['about', 'links', 'photography', 'music-videos', 'recordings', 'releases', 'works'],
        depth:     '../../../',
    };
    </script>
</head>
<body class="jm-page jm-recordings-page">
    <!-- page content -->
</body>
</html>
```

#### Step-by-Step Setup

1. **Define the color** in `[prefix]-shared.css`:
   ```css
   :root { --jm-muted-rose: #c8a8a8; }
   ```

2. **Set `--section-accent`** in the page's inline `<style>`:
   ```html
   <style>:root { --section-accent: var(--jm-muted-rose); }</style>
   ```

3. **Add body-class overrides** in the same `<style>` block

4. **Match the config `accent`** value:
   ```js
   accent: 'jm-muted-rose'  // → var(--jm-muted-rose)
   ```

5. **Add RGB values** to `ACCENT_RGB` in JS templates:
   ```js
   'jm-muted-rose': '200,168,168'
   ```

---

### Static Pages (about, photography, music-videos, links)

These pages use dedicated CSS files with high-specificity body-class selectors. No JS template injection.

#### Code Example: about.html + jm-about.css

**about.html:**
```html
<head>
    <link rel="stylesheet" href="jm-shared.css">
    <link rel="stylesheet" href="jm-about.css">
</head>
<body class="jm-page jm-about-page">
```

**jm-about.css:**
```css
body.jm-page.jm-about-page .breadcrumb a { color: var(--jm-mid-cool); }
body.jm-page.jm-about-page .breadcrumb a:hover { color: var(--jm-cream); }
body.jm-page.jm-about-page .breadcrumb .sep { color: var(--jm-mid-cool); opacity: 0.6; }
body.jm-page.jm-about-page .breadcrumb .current { color: var(--jm-mid-cool); }

body.jm-page.jm-about-page .artist-label { color: var(--jm-mid-cool); }
body.jm-page.jm-about-page .page-title { color: var(--jm-mid-cool); text-shadow: 0 0 20px rgba(96,112,160,0.5); }

body.jm-page.jm-about-page .nav-card.c-back { color: var(--jm-mid-cool); border-color: var(--jm-mid-cool); }
body.jm-page.jm-about-page .nav-card.c-back:hover { color: var(--jm-cream); }
```

#### Step-by-Step Setup

1. **Create page CSS file** (`[prefix]-[section].css`)
2. **Use body-class selectors** with full specificity:
   ```css
   body.[prefix]-page.[prefix]-[section]-page .breadcrumb a { color: var(--[prefix]-[color]); }
   ```
3. **Load the CSS** in the page's `<head>`
4. **Add page class** to `<body>`:
   ```html
   <body class="jm-page jm-about-page">
   ```

---

## Complete Color Reference

### Jon McCoy (Reference Implementation)

| Page | Button Class | CSS Variable | Config `accent` |
|------|-------------|-------------|-----------------|
| about | `c-about` | `--jm-mid-cool` | N/A (static) |
| links | `c-links` | `--jm-periwinkle` | N/A (static) |
| music videos | `c-music-videos` | `--jm-light-cool` | N/A (static) |
| photography | `c-photography` | `--jm-dusty-plum` | N/A (static) |
| recordings | `c-recordings` | `--jm-muted-rose` | `jm-muted-rose` |
| releases | `c-releases` | `--jm-deep-warm` | `jm-deep-warm` |
| works | `c-works` | `--jm-deep-sage` | `jm-deep-sage` |

---

### All Artists: Recordings

| Artist | CSS Variable | Hex |
|--------|-------------|-----|
| jon-mccoy | `--jm-muted-rose` | #c8a8a8 |
| vinny-bobarino | `--vb-nature-glow` | #6a9a7a |
| dag-henderson | `--dh-sage` | #a8b890 |
| c-p-rutledge | `--cpr-blue` | #68c8f0 |
| dino-spumoni | `--ds-sky` | #6888a8 |
| four-bs | `--4b-chart` | #a8d848 |
| juanito-thompson | `--jt-amber` | #e8900a |
| svfp | `--svfp-warm` | #e87040 |
| woah | `--woah-coastal` | #7888b0 |
| audio-sound-paper-et-al | `--asp-amber` | #c89030 |
| bottle-boys-collective | `--bbc-warm` | #c07848 |
| fruity-loops-debauchery-collective | `--fldc-arc-blue-light` | #5898d8 |
| thld | `--thld-amber` | #e07a2f |
| ddt-llc | — | — |

### All Artists: Releases

| Artist | CSS Variable | Hex |
|--------|-------------|-----|
| jon-mccoy | `--jm-deep-warm` | #786050 |
| vinny-bobarino | `--vb-amber` | #f5a030 |
| dag-henderson | `--dh-violet-mid` | #7848a8 |
| c-p-rutledge | `--cpr-red` | #f05a5a |
| dino-spumoni | `--ds-rose` | #d06880 |
| four-bs | `--4b-rust` | #c84810 |
| juanito-thompson | `--jt-brick` | #a84830 |
| svfp | `--svfp-mid` | #6020b0 |
| woah | `--woah-sunset` | #e8a0a0 |
| audio-sound-paper-et-al | `--asp-red` | #c03020 |
| bottle-boys-collective | `--bbc-warm-light` | #e8b870 |
| fruity-loops-debauchery-collective | `--fldc-arc-red` | #a82820 |
| thld | `--thld-accent` | #c94b1a |
| ddt-llc | `--ddt-cta` | #c04030 |

### All Artists: Works

| Artist | CSS Variable | Hex |
|--------|-------------|-----|
| jon-mccoy | `--jm-deep-sage` | #587868 |
| vinny-bobarino | `--vb-bulb` | #f7e060 |
| dag-henderson | `--dh-amber-glow` | #e8900a |
| c-p-rutledge | `--cpr-yellow` | #f5c020 |
| dino-spumoni | `--ds-cta` | #d4782a |
| four-bs | `--4b-amber` | #f0a830 |
| juanito-thompson | `--jt-gold` | #f5c842 |
| svfp | `--svfp-cta` | #e03070 |
| woah | `--woah-sage-mid` | #5a7848 |
| audio-sound-paper-et-al | `--asp-amber-glow` | #f0d070 |
| bottle-boys-collective | `--bbc-green-light` | #80a858 |
| fruity-loops-debauchery-collective | `--fldc-arc-yellow` | #d8d040 |
| thld | `--thld-highlight` | #f0c060 |
| ddt-llc | — | — |

### All Artists: Events

| Artist | CSS Variable | Hex |
|--------|-------------|-----|
| ddt-llc | `--ddt-gold` | #f0c840 |
| svfp | `--svfp-lilac` | #c8a0d8 |
| dino-spumoni | `--ds-bright-teal` | #64c8b4 |
| thld | `--thld-warm-brown` | #c88c50 |
| four-bs | `--4b-leaf` | #78b450 |

---

## Collective Artists

Collective artists (multi-artist groups like Vinny Bobarino, THLD, etc.) follow the **same theming pattern** as single-artist pages.

The button colors on the index page should match the subpage accent colors, and the same override pattern applies.

**Current status:** Some collective pages have mismatched `accent` values in their `COLLECTIVE_CONFIG`. These need to be fixed to match the CSS variables used in `--section-accent`.

See [Archive System](Archive-System) for collective config details.

---

## Adding a New Subpage

### For Template Pages (recordings, releases, works, events)

1. Create `[prefix]-shared.css` with `:root` color variables
2. Create stub HTML with `window.ARTIST_CONFIG`
3. Load CSS template and JS template
4. Add inline `<style>` with:
   - `:root { --section-accent: var(--[prefix]-[color]); }`
   - Body-class overrides for breadcrumb, artist-label, page-title, back button
5. Set `accent` in config to match `--section-accent` variable name
6. Add RGB values to `ACCENT_RGB` in JS templates

### For Static Pages (about, photography, music-videos, links)

1. Create `[prefix]-[section].css` with high-specificity selectors
2. Use `body.[prefix]-page.[prefix]-[section]-page` prefix
3. Override: breadcrumb, artist-label, page-title, back button, divider
4. Load the CSS in the page's `<head>`
5. Add page class to `<body>`

---

## Reference Implementations

| Page type | Reference | Why |
|-----------|-----------|-----|
| By-place (subpages) | **Melrose House** — `archive/by-place/melrose-house/` | Cleanest 3-layer CSS system, transparent cards, solid nav buttons |
| By-artist (themed subpages) | **Juanito Thompson** — `archive/by-artist/juanito-thompson/` | Per-page accent approach, custom standalone subpages |
| By-contributor | **Jake McCoy** — `archive/by-contributor/jake-mccoy/` | contributor.js template, simpler structure |
| Collective (subpages) | **THLD** — `archive/by-artist/thld/` | COLLECTIVE_CONFIG with cssVarPrefix, accentRgbMap |

---

## Troubleshooting

### Issue: Title/breadcrumb uses wrong color

**Cause:** Missing body-class overrides or mismatched `accent` config.

**Fix:** Add overrides to inline `<style>`:
```css
body.[prefix]-page.[prefix]-[section]-page .breadcrumb a { color: var(--[prefix]-[color]); }
body.[prefix]-page.[prefix]-[section]-page .page-title { color: var(--[prefix]-[color]); }
```

### Issue: Back button doesn't match page theme

**Cause:** Shared CSS overrides template CSS due to higher specificity.

**Fix:** Add back button override:
```css
body.[prefix]-page.[prefix]-[section]-page .nav-card.c-back { color: var(--[prefix]-[color]); border-color: var(--[prefix]-[color]); }
```

### Issue: Content colors don't match title

**Cause:** `accent` config value doesn't match `--section-accent`.

**Fix:** Update config `accent` to use the same CSS variable name:
```js
accent: '[prefix]-[color]'  // Must match --section-accent
```

### Issue: Text-shadow has wrong color

**Cause:** Missing or incorrect RGB values in `ACCENT_RGB`.

**Fix:** Add entry to `ACCENT_RGB` in JS templates:
```js
'[prefix]-[color]': 'R,G,B'
```

---

## Updating Existing Pages

### Checklist for Fixing Broken Theming

1. **Verify `--section-accent`** is set in inline `<style>`
2. **Check body-class overrides** exist for:
   - `.breadcrumb a`, `.breadcrumb .sep`, `.breadcrumb .current`
   - `.artist-label`
   - `.page-title`
   - `.nav-card.c-back`
3. **Match config `accent`** to `--section-accent` variable name
4. **Add RGB values** to `ACCENT_RGB` if missing
5. **Test** by visiting the page and checking colors

### How to Verify Colors Match

1. Open browser DevTools
2. Inspect the button on the index page — note its `background-color`
3. Navigate to the subpage
4. Inspect `.page-title` — its `color` should match the button
5. Inspect `.breadcrumb a` — should also match
6. Inspect `.nav-card.c-back` — should also match

---

## Common Pitfalls

1. **Missing `!important`**: Template-injected CSS uses shorthand selectors. Without the body-class qualifier on your overrides, the template styles leak through.

2. **Wrong `accent` format**: `accent` is a CSS var name (e.g., `'cyan'`, `'svfp-warm'`), NOT a hex value. The template constructs `var(--${accent})`.

3. **Missing `depth`**: Without `depth: '../../../'`, breadcrumb links and attribution footer paths break.

4. **Hardcoded sub-nav**: Don't hardcode `<a>` links in the sub-nav div. Leave it empty (`id="sub-nav"`) and let the template fill it from `siblings`.

5. **Wrong body class**: The body class must match the prefix used in CSS selectors. If your shared CSS defines `--my-accent`, the body class should be `my-page my-{type}-page`.

6. **Config in body instead of head**: Place `window.*_CONFIG` in a `<script>` in `<head>`, not after `<main>`. Some templates read config before DOMContentLoaded. 
