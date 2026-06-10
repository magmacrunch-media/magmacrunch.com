# Archive Page Theming Guide

This document describes how to add custom color schemes to archive pages (by-artist and by-place), following the pattern established by **Melrose House** (by-place) and **THLD** (by-artist music video pages) as reference implementations.

---

## Reference Implementations

There are two canonical reference implementations depending on page type:

| Page type | Reference | Notes |
|-----------|-----------|-------|
| By-place pages | **Melrose House** — `archive/by-place/melrose-house/` | Study this before theming any new place entry |
| By-artist music video pages | **THLD** — `archive/by-artist/thld/music-videos.html` | Use this as the pattern for music video pages for other artists |
| By-artist with custom subpages | **THLD** — `archive/by-artist/thld/` | about, photography, music-videos are custom standalone pages |

### Key Patterns from Melrose House (by-place)

**3-layer CSS system** — shared palette → index inline `<style>` → per-section CSS files:

| Layer | File | Purpose |
|-------|------|---------|
| 1. Shared palette | `mh-shared.css` | `:root` vars for 15-color palette |
| 2. Index page | `index.html` `<style>` | `body.mh-page { ... }` + hero layout |
| 3. Subpages | `mh-personnel.css`, `mh-recordings.css`, `mh-works.css` | section-specific overrides |
| 3b. About page | `about.html` (custom page) + `mh-about.css` | standalone with same card patterns |

**Cards use `background: transparent`** — not `var(--deep)`. The page background shows through, so `body.mh-page main > * { background: var(--black); }` creates the contrast.

**All nav-card buttons are solid** — `background` and `border-color` match the section color, `color: #1e1e1e` (dark text on colored bg).

**No hover color-change on buttons** — hover just adjusts text color slightly at most. Buttons stay solid.

**Back buttons use black bg** with `color` and `border-color` set to the section accent:
```css
body.mh-page .nav-card.c-green { background: var(--black); color: var(--mh-brand); border-color: var(--mh-brand); }
body.mh-page .nav-card.c-green:hover { background: var(--mh-brand); color: #1e1e1e; }
```

**About page is a custom page** — it has its own `about.html` with `body.mh-page.mh-about-page` classes and `mh-about.css`. Back button is leftmost with black bg + accent text/border.

**Template injects `${accentVar}` for links, headings, badges, etc.** — per-section CSS must override these with `!important` + fully-qualified selectors (`p a`, `h3`, `p strong`) to prevent the template's shorthand rules from leaking through.

**About is not in COLOR_MAP** — the template falls back to `c-cyan` for about links, so per-section CSS must explicitly target `a[href="about.html"]` with `!important`.

**All per-section CSS files need identical nav-card blocks** so buttons look the same whether entering from index or a subpage.

---

## By-Place Template Variables

Each subpage stub defines this in a `<script>` tag before loading the template:

```js
window.PLACE_CONFIG = {
    id:        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // MusicBrainz place UUID
    name:      'Place Name',
    abbr:      'PLACE',                                // short label used in nav
    accent:    'cyan',                                 // which global CSS var to use
    backColor: 'c-cyan',                              // nav-card class for the "← back" link
    siblings:  ['personnel', 'recordings', 'works'],
    depth:     '../../../',
};
```

### `accent` — Section Accent Color

Template scripts use this to inject per-section styling. Each section has a conventional default:

| Section | Conventional `accent` |
|---------|----------------------|
| personnel | `blue` |
| recordings | `cyan` |
| works | `yellow` |

These map to the **site-wide global palette** (style.css):

```css
--green:  #39ff6e   --yellow: #ffe03a   --cyan:   #00f5ff
--rose:   #ff3d6e   --orange: #ff7c1f   --purple: #c45fff
```

### `backColor` — Back Button Color

The "← back" button uses the `c-*` class from `backColor`. Per-section CSS overrides this class to get black bg + accent text/border.

| `backColor` | Maps to |
|-------------|---------|
| `c-green` | `var(--green)` |
| `c-cyan` | `var(--cyan)` |
| `c-rose` | `var(--rose)` |
| `c-yellow` | `var(--yellow)` |
| `c-orange` | `var(--orange)` |
| `c-purple` | `var(--purple)` |
| `c-blue` | `var(--blue)` |

### COLOR_MAP (place templates)

```js
const COLOR_MAP = {
    personnel:  'c-blue',
    recordings: 'c-cyan',
    works:      'c-yellow',
};
```

The template injects `${accentVar}` for each section. Per-section CSS must override these with `!important` + fully-qualified selectors.

---

## By-Artist Template Variables

```js
window.ARTIST_CONFIG = {
    id:        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // MusicBrainz artist UUID
    name:      'Full Artist Name',
    abbr:      'ART',                                  // short label used in nav
    accent:    'cyan',                                 // which global CSS var to use
    backColor: 'c-purple',                             // nav-card class for the ← back link
    siblings:  ['events', 'releases', 'recordings', 'works'],
    depth:     '../../../',
};
```

### Artist Subpage Types

By-artist archive pages have **two categories** of subpages:

1. **Template-driven subpages** (events, releases, recordings, works) — use `artist_*.js` template scripts, which populate `#sub-nav`, `#breadcrumb`, `#artist-label` dynamically. Static sub-nav HTML with `id="sub-nav"` is replaced by the template.

2. **Custom standalone subpages** (about, photography, music-videos) — custom HTML/CSS, static sub-nav (no `id="sub-nav"` so template skips population), still require `ARTIST_CONFIG` for MusicBrainz API.

> **Custom pages use static sub-nav:** Do NOT include `id="sub-nav"` on custom pages. The template checks for this ID and overwrites the innerHTML if found. Without the ID, the template skips population and your static HTML is preserved.

### `accent` — Section Accent Color (by-artist)

| Section | Conventional `accent` |
|---------|----------------------|
| events | `green` |
| recordings | `cyan` |
| releases | `rose` |
| works | `yellow` |

### `backColor` — Back Button Color (by-artist)

| `backColor` | Maps to |
|-------------|---------|
| `c-green` | `var(--green)` |
| `c-cyan` | `var(--cyan)` |
| `c-rose` | `var(--rose)` |
| `c-yellow` | `var(--yellow)` |
| `c-orange` | `var(--orange)` |
| `c-purple` | `var(--purple)` |
| `c-blue` | `var(--blue)` |

> **Note:** These `c-*` classes are NOT defined in any CSS file — they exist as keys in `BACK_COLOR_VAR` lookup tables inside the template scripts. They appear in subpage HTML as classes on `<a>` elements, styled by per-section CSS files.

### COLOR_MAP — Sub-nav Button Color Mapping

The template scripts define `COLOR_MAP` to assign a `c-*` class to each sibling page. **All sibling keys must be present** — missing keys fall back to `c-cyan`, which produces incorrect button colors.

```js
const COLOR_MAP = {
    about:        'c-blue',
    photography:  'c-purple',
    'music-videos': 'c-slate',
    events:      'c-green',
    recordings:  'c-cyan',
    releases:    'c-rose',
    works:       'c-yellow',
};
```

**Sub-nav label display:** The template converts sibling keys to display text using `s.replace(/-/g, ' ')` so `"music-videos"` renders as `"music videos"`. If you want different display text, the template would need modification.

---

## Step-by-Step: Adding a Theme to an Existing Place

We'll use Melrose House as the reference. Study `archive/by-place/melrose-house/` before starting.

### Step 1 — Create `[place]-shared.css`

In `archive/by-place/[place]/`, create `[place]-shared.css`:

```css
/* [Place] shared color palette */
:root {
    --mh-brand:    #6878a0;  /* brand / primary accent — used for back button, personnel */
    --mh-accent:   #c87878;  /* recordings accent — muted coral */
    --mh-warm:     #e8b870;  /* works accent — warm amber */
    --mh-heading:  #f0ead8;  /* heading text color */
    --mh-body:     #e0d8c8;  /* body text color */
    --mh-deep:     #0a0a12;  /* deepest background */
    --mh-dark:     #12121a;  /* card/panel background */
    --mh-mid:      #1e1e2a;  /* raised surfaces */
    --mh-muted:    #6868a0;  /* muted/branding text */
    --mh-sage:     #7ab8a0;  /* about page accent */
    --mh-lavender: #c8a8d0;  /* secondary accent */
    --mh-sage2:    #a8c0a0;  /* tertiary accent */
    --mh-amber:    #e8b870;  /* warm highlight */
    --mh-slate:    #5a6890;  /* cool muted */
}
```

**Color selection tips:**
- `brand` — primary brand color (used in back button, personnel section, artist label on subpages)
- `accent` — secondary highlight (recordings)
- `warm` — works accent
- `heading` / `body` — text colors
- `deep` / `dark` / `mid` / `muted` — background tones
- Additional accents for custom pages (about, etc.)

### Step 2 — Add Shared CSS Link to Index

In `[place]/index.html`, add the shared CSS link in the `<head>`:

```html
<link rel="stylesheet" href="[place]-shared.css">
```

### Step 3 — Update Index Page `<style>` Block

In the inline `<style>` of `index.html`:

1. Add `body.[place]-page` class to `<body>`
2. Set `body.[place]-page { background: var(--black); }` — prevents body from inheriting a themed background
3. Replace site-wide color references with `var(--[place]-*)` custom vars
4. **Nav-card color overrides:** All `c-*` class overrides must match exactly between index inline `<style>` and per-section CSS files. Copy the nav-card override block into the index's inline `<style>` so the index and subpages use identical button colors.

> **Important:** When theming an existing index page that has a full-bleed hero image, preserve `min-height: 100vh` + `justify-content: flex-end` on `.artist-hero`. Removing these breaks header positioning.

**Key replacements to make in the existing styles:**

| Pattern | Replace With |
|---------|-------------|
| `color: var(--purple)` | `color: var(--[place]-accent)` |
| `color: var(--cyan)` | `color: var(--[place]-brand)` |
| `background: var(--purple)` | `background: var(--[place]-brand)` |
| `text-shadow: 0 0 28px rgba(196, 95, 255, ...)` | adjust RGB to match your palette |
| `border-color: var(--purple)` | `border-color: var(--[place]-brand)` |

### Step 4 — Create Per-Section CSS Files

For each subpage (personnel, recordings, works), create a CSS file. See Melrose House for reference: `mh-personnel.css`, `mh-recordings.css`, `mh-works.css`.

**Nav-card override pattern (all solid, no hover bg change):**
```css
/* Back button — black bg, accent text/border */
body.[place]-[section]-page .nav-card.c-cyan {
    background: var(--black);
    color: var(--[place]-accent);
    border-color: var(--[place]-accent);
}
body.[place]-[section]-page .nav-card.c-cyan:hover {
    background: var(--[place]-accent);
    color: #1e1e1e;
    box-shadow: 0 0 22px rgba(R, G, B, 0.4);
}

/* Section nav button — solid colored bg, dark text */
body.[place]-[section]-page .nav-card.c-blue {
    background: var(--[place]-brand);
    color: #1e1e1e;
    border-color: var(--[place]-brand);
}
body.[place]-[section]-page .nav-card.c-blue:hover { /* no bg change */ }

body.[place]-[section]-page .nav-card::after { display: none; }
```

**Template override pattern — use `!important` + fully-qualified selectors:**
```css
body.[place]-[section]-page p a { color: var(--[place]-accent) !important; }
body.[place]-[section]-page h3 { color: var(--[place]-accent) !important; }
body.[place]-[section]-page p strong { color: var(--[place]-heading) !important; }
```

**About link override (not in COLOR_MAP — template uses c-cyan fallback):**
```css
body.[place]-[section]-page a[href="about.html"] {
    color: var(--[place]-sage) !important;
}
```

### Step 5 — Update Each Subpage HTML

For `[place]/recordings.html`:

```html
<head>
    <link rel="stylesheet" href="../../../style.css">
    <link rel="stylesheet" href="../../../assets/archive.css">
    <link rel="stylesheet" href="[place]-shared.css">
    <link rel="stylesheet" href="[place]-recordings.css">
    <script>
    window.PLACE_CONFIG = {
        id:        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        name:      'Place Name',
        abbr:      'PLACE',
        accent:    'cyan',
        backColor: 'c-cyan',
        siblings:  ['personnel', 'recordings', 'works'],
        depth:     '../../../',
    };
    </script>
</head>
<body class="[place]-page [place]-recordings-page">
```

> **Custom pages (e.g. `about`):** If a subpage doesn't use a template script, create a dedicated `[place]-about.css` file, add both shared + section CSS links, and set the back button styling manually.

Repeat for personnel and works — changing only the stylesheet link and `backColor` value.

---

## The Template-Generated Injectable Styles

The template scripts (`artist_events.js`, `artist_releases.js`, `artist_recordings.js`, `artist_works.js` for artists; `place_recordings.js`, `place_works.js`, `place_personnel.js` for places) all inject CSS at runtime using `accent` and `backColor` to style:

- `.breadcrumb` links and separators
- `.page-title` (the section heading)
- `.artist-label` / `.place-label` (the label above the title)
- `.catalog-wrap` container

The **per-section CSS files** can override these injected styles by using higher-specificity selectors (`body.[place]-[section]-page .page-title`) + `!important` on fully-qualified selectors (`p a`, `h3`, `p strong`).

---

## CSS Variable Reference

### Template-injected (dynamic, based on PLACE_CONFIG / ARTIST_CONFIG)

| Injected Variable | Purpose |
|-------------------|---------|
| `${accentVar}` | `var(--cyan)`, `var(--rose)`, etc. — the section's main accent |
| `${backColorVar}` | `var(--purple)`, `var(--orange)`, etc. — the artist's/place's brand color |
| `${accentRgb}` | RGB triplet for glow effects, e.g. `255,61,110` |

### Site-wide globals (style.css)

```css
--rose:   #ff3d6e   --yellow: #ffe03a   --cyan:   #00f5ff
--green:  #39ff6e   --orange: #ff7c1f   --purple: #c45fff
--white:  #f0ead8   --black:  #080808   --dim:    #888
--deep:   #0d0d18
```

### Example: Glow effect using RGB triplet

```css
body.mh-page .page-title {
    text-shadow: 0 0 20px rgba(104, 120, 160, 0.45);
    /*                    ^^^^^^^^^^^ — use the RGB from your brand, not accent */
}
```

---

## Subpage CSS File Patterns

Each per-section CSS file follows this skeleton:

```css
/* [Place] [section] */
body.[place]-[section]-page main > * { background: var(--black); }

body.[place]-[section]-page .breadcrumb { color: var(--dim); }
body.[place]-[section]-page .breadcrumb a { color: #xxxxxx; }
body.[place]-[section]-page .breadcrumb a:hover { color: #xxxxxx; }
body.[place]-[section]-page .breadcrumb .sep { color: #xxxxxx; opacity: 0.7; }
body.[place]-[section]-page .breadcrumb .current { color: #xxxxxx; }

body.[place]-[section]-page .page-header { /* ... */ }
body.[place]-[section]-page .place-label { /* ... */ }
body.[place]-[section]-page .page-title { /* ... */ }
body.[place]-[section]-page .sub-nav { /* ... */ }

body.[place]-[section]-page #status-bar { /* ... */ }
body.[place]-[section]-page #count-bar { /* ... */ }

body.[place]-[section]-page .recording-card,
body.[place]-[section]-page .work-card { /* card base styles */ }
body.[place]-[section]-page .recording-card:hover { border-color: #xxxxxx; }

body.[place]-[section]-page .recording-info h3 a { color: #xxxxxx; }
body.[place]-[section]-page .recording-info h3 a:hover { color: #xxxxxx; }

/* Nav card color overrides — back button (black bg + accent) */
body.[place]-[section]-page .nav-card.c-cyan {
    background: var(--black);
    color: var(--[place]-accent);
    border-color: var(--[place]-accent);
}
body.[place]-[section]-page .nav-card.c-cyan:hover {
    background: var(--[place]-accent);
    color: #1e1e1e;
}

/* Nav card color overrides — section buttons (solid colored) */
body.[place]-[section]-page .nav-card.c-blue {
    background: var(--[place]-brand);
    color: #1e1e1e;
    border-color: var(--[place]-brand);
}
body.[place]-[section]-page .nav-card.c-blue:hover { /* no bg change */ }

body.[place]-[section]-page .nav-card::after { display: none; }

@media (max-width: 500px) { /* responsive overrides */ }
```

---

## Examples: By-Place Pages

All by-place pages should follow the Melrose House pattern — study that directory first.

### Melrose House (blue-gray / sage / coral / amber theme) — **REFERENCE IMPLEMENTATION**

```
mh-shared.css      — 15-color palette: --mh-{brand,accent,warm,heading,body,deep,dark,mid,muted,sage,lavender,sage2,amber,slate}
mh-personnel.css   — brand (#6878a0) accent, backColor: 'c-blue'
mh-recordings.css — accent (#6878a0) accent, backColor: 'c-cyan'
mh-works.css       — warm (#e8b870) accent, backColor: 'c-yellow'
mh-about.css       — sage (#7ab8a0) accent (custom about page)
about.html         — standalone custom page with body.mh-page.mh-about-page
```

**Key patterns:**
- Cards use `background: transparent` (page bg shows through)
- All nav-card buttons solid with `color: #1e1e1e`
- Back button: black bg + accent text/border
- No hover color-change on buttons (solid stays solid)
- About not in COLOR_MAP → per-section CSS must override `a[href="about.html"]` with `!important`
- All per-section CSS files have identical nav-card blocks for consistency

### Twin Maples (forest green / copper / amber sage theme)

```
tm-shared.css — palette: --tm-{deep,dark,surface,muted,light,cream,heading,body,brand,accent,warm,sage,wheat,leaf,bright}
tm-personnel.css — brand (#4a6858) accent
tm-recordings.css — accent (#c07848) copper accent
tm-works.css — warm (#d4b870) amber accent
tm-about.css — sage (#7ab0c0) accent
```

**Index sub-nav buttons:** `c-sage` → sage, `c-blue` → brand, `c-cyan` → accent, `c-yellow` → warm (all solid)
**Per-section back buttons:** Override `backColor` class to be black with colored border/text

### Marvin Gardens G12 (magenta / orchid / amber / steel blue theme)

```
mg-shared.css — palette: --mg-{deep,dark,surface,muted,light,cream,brand,accent,cta,heading,body,green,leaf,sage}
mg-personnel.css — accent (#d04878) pink accent
mg-recordings.css — cream (#f080a0) neon blush accent
mg-works.css — heading (#e8c060) street glow gold accent
mg-about.css — sage (#60a8c0) steel blue accent
```

**Index sub-nav buttons:** `c-sage` → sage, `c-rose` → accent, `c-cyan` → light, `c-yellow` → cta (all solid)
**Per-section back buttons:** Override `c-rose` class to be black with colored border/text
**Cards:** Use `background: transparent` (not --mg-deep) for all subpages

### Irvin House (sky blue / terracotta / slate lavender theme)

```
ih-shared.css — palette: --ih-{deep,dark,muted,light,cream,brand,accent,green,cta,heading,body,leaf,warm,sage,wheat}
ih-personnel.css — brand (#7090b8) sky blue accent
ih-recordings.css — accent (#80b8c8) lawn chair blue accent
ih-works.css — cta (#a86848) neighbor brick accent
ih-about.css — sage (#8888b0) slate lavender accent
```

**Index sub-nav buttons:** `c-sage` → sage, `c-blue` → brand, `c-cyan` → accent, `c-yellow` → cta (all solid)
**Per-section back buttons:** Override `backColor` class to be black with colored border/text
**Cards:** Use `background: transparent` for all subpages

### Green Street Apt. (linen / walnut / dusty violet / warm amber theme)

```
gs-shared.css — palette: --gs-{deep,dark,surface,muted,light,cream,heading,body,brand,accent,green,leaf,warm,rose,sage}
gs-personnel.css — brand (#7888a8) steel blue accent
gs-recordings.css — accent (#c07838) warm amber accent
gs-works.css — green (#607850) window plant accent
gs-about.css — sage (#8878a8) dusty violet accent
```

**Index sub-nav buttons:** `c-sage` → sage, `c-blue` → brand, `c-cyan` → accent, `c-yellow` → green (all solid)
**Per-section back buttons:** Override `backColor` class to be black with colored border/text
**Cards:** Use `background: transparent` for all subpages

### Frogwood Manor (umber / plum / cobalt / violet theme)

```
fm-shared.css — palette: --fm-{deep,dark,surface,muted,light,cream,cobalt,brand,amber,sky,violet,sage,pink,rose}
fm-personnel.css — brand (#a85a18) warm amber accent, backColor: 'c-blue'
fm-recordings.css — sky (#6080e8) electric blue accent, backColor: 'c-cyan'
fm-works.css — light (#f8d888) pale amber accent, backColor: 'c-yellow'
fm-events.css — brand (#a85a18) warm amber accent, backColor: 'c-green'
fm-about.css — sage (#a030c8) deep violet accent (custom about page)
about.html — standalone custom page with body.fm-page.fm-about-page
```

**Index sub-nav buttons:** `c-sage` → sage, `c-green` → brand, `c-blue` → cobalt, `c-cyan` → sky, `c-yellow` → amber (all solid)
**Per-section back buttons:** Override `backColor` class to be black with colored border/text
**Cards:** Use `background: transparent` for all subpages
**Events page:** Frogwood Manor has 4 siblings (events, personnel, recordings, works), requiring a unique sub-nav with `c-green` for events

### College Green Apt. (walnut / linen / dusty violet / warm amber theme)

```
cg-shared.css — palette: --cg-{deep,dark,surface,muted,light,cream,white,green,cta,heading,nature,warm,cool,sage,deep2,gold,lavender,taupe,bluegrey}
cg-personnel.css — lavender (#b8a0c8) light purple accent, backColor: 'c-blue'
cg-recordings.css — nature (#607850) window plant green accent, backColor: 'c-cyan'
cg-works.css — gold (#e8a858) golden amber accent, backColor: 'c-yellow'
cg-about.css — lavender (#b8a0c8) light purple accent (custom about page)
about.html — standalone custom page with body.cg-page.cg-about-page
```

**Index sub-nav buttons:** `c-sage` → lavender, `c-blue` → surface, `c-cyan` → nature, `c-yellow` → cta (all solid)
**Per-section back buttons:** Override `backColor` class to be black with colored border/text
**Cards:** Use `background: transparent` for all subpages

---

## Examples: By-Artist Pages (Legacy)

These artist pages were built before Melrose House established the reference pattern. They follow the same 3-layer CSS system but predate the solid-button / transparent-card conventions. Use Melrose House as the reference for new theming work — these are here for palette reference only.

### SVFP (purple stage-light theme)

SVFP is the **reference implementation for by-artist subpages** — use it as the pattern when fixing or creating other artist archive subpages (events, releases, recordings, works).

```
svfp-shared.css       — palette: --svfp-{brand,accent,cta,heading,body}
svfp-about.css        — deep purple (#a020c8) accent, custom about page
svfp-photography.css  — cool blue (#60a0e0) accent, custom photography page
svfp-events.css       — lavender (#9d7fe3) section accent, flyer carousel
svfp-releases.css     — violet (#7c3aed) section accent, release carousel
svfp-recordings.css   — pink (#ec4899) section accent
svfp-works.css        — dark rose (#be185d) section accent
```

**Subpages:** about.html, photography.html, events.html, releases.html, recordings.html, works.html
**Index sub-nav buttons:** `c-purple` → about, `c-green` → events, `c-cyan` → recordings, `c-rose` → releases, `c-yellow` → works, `c-blue` → photography (all solid with `#f5d0ff` text)
**Back buttons:** Use `jt-back` class — transparent bg, purple `#a020c8` text/border, fills on hover
**Flyer carousel:** On events.html, above the MusicBrainz event list
**Release carousel:** On releases.html, above the MusicBrainz release list
**Custom pages:** about.html and photography.html are standalone pages with static sub-nav HTML (no template injection)
**Color palette:**
- `--svfp-brand`: #a020c8 (deep purple)
- `--svfp-accent`: #d946ef (bright violet)
- `--svfp-cta`: #e03070 (hot pink)
- `--svfp-heading`: #c8b8e8 (soft lavender)
- `--svfp-body`: #f5d0ff (pale lilac)

#### SVFP Subpage Pattern (reference for all by-artist pages)

SVFP subpages (events, releases, recordings, works) use **static HTML** for the breadcrumb, artist-label, and sub-nav — the template scripts do NOT overwrite these elements. This is the correct pattern for all by-artist subpages.

**Key structural rules:**

1. **Static breadcrumb** — Full hardcoded links, no `id` attribute. The template would overwrite `.breadcrumb` innerHTML if present, so DO NOT add `id` attributes. Static content stays.
2. **Static artist-label** — Hardcoded `// artist name //` text, no `id` attribute.
3. **Static sub-nav** — Hardcoded `<div class="sub-nav">` with all nav links in HTML. No `id="sub-nav"`. The template's `#sub-nav` population is skipped when there's no id.
4. **ARTIST_CONFIG** — Still required in `<head>` for the template script to fetch MusicBrainz data. `siblings` should only list API-driven sections (`['events', 'releases', 'recordings', 'works']`), NOT the custom pages (`about`, `photography`), since those links are hardcoded in the static sub-nav.

**Sub-nav button order (matching index.html):**
```html
<div class="sub-nav">
    <a href="index.html"        class="nav-card jt-back">← back</a>
    <a href="about.html"        class="nav-card c-purple">about</a>
    <a href="events.html"      class="nav-card c-green">events</a>
    <a href="recordings.html"    class="nav-card c-cyan">recordings</a>
    <a href="releases.html"     class="nav-card c-rose">releases</a>
    <a href="works.html"        class="nav-card c-yellow">works</a>
    <a href="photography.html"   class="nav-card c-blue" style="background:#60a0e0;color:#f5d0ff;border-color:#60a0e0">photography</a>
</div>
```

**Nav-card color classes for SVFP:**

| Class | Color | Used for |
|-------|-------|----------|
| `jt-back` | transparent bg, `#a020c8` text/border, fills on hover | ← back button |
| `c-purple` | solid `#a020c8` bg, `#f5d0ff` text | about |
| `c-green` | solid `#9d7fe3` (lavender) on events, `#be185d` (deep rose) on others | events |
| `c-cyan` | solid `#ec4899` (pink) on events, `#9d7fe3` (lavender) on recordings, etc. | recordings |
| `c-rose` | solid `#7c3aed` (violet) on releases, `#ec4899` (pink) on events | releases |
| `c-yellow` | solid `#7c3aed` (violet) on works, `#9d7fe3` (lavender) on events | works |
| `c-blue` | solid `#60a0e0`, `#f5d0ff` text (inline style override) | photography |

> **Note:** Each SVFP per-section CSS file redefines the `c-*` classes with section-specific colors. The same `c-green` class produces different colors on events vs. recordings vs. works pages. This is intentional — each page gives every nav button a unique color matching that page's accent palette.

**Per-section CSS nav-card block (example from svfp-events.css):**
```css
body.svfp-events-page .nav-card.c-green  { background: #be185d; color: #f5d0ff; border-color: #be185d; }
body.svfp-events-page .nav-card.c-cyan   { background: #9d7fe3; color: #f5d0ff; border-color: #9d7fe3; }
body.svfp-events-page .nav-card.c-rose   { background: #ec4899; color: #f5d0ff; border-color: #ec4899; }
body.svfp-events-page .nav-card.c-yellow { background: #7c3aed; color: #f5d0ff; border-color: #7c3aed; }
body.svfp-events-page .nav-card.c-purple { background: #a020c8; color: #f5d0ff; border-color: #a020c8; }
body.svfp-events-page .nav-card.c-blue   { background: #60a0e0; color: #f5d0ff; border-color: #60a0e0; }

body.svfp-events-page .nav-card.jt-back {
    background: transparent;
    color: #a020c8;
    border-color: #a020c8;
}
body.svfp-events-page .nav-card.jt-back:hover {
    background: #a020c8;
    color: #f5d0ff;
    box-shadow: 0 0 22px rgba(160,32,200,0.4);
}

body.svfp-events-page .nav-card:hover {
    background: inherit !important;
    color: inherit !important;
    box-shadow: none !important;
}
body.svfp-events-page .nav-card::after { display: none; }
```

**Template script interaction:** The template (`artist_events.js` etc.) still runs on SVFP subpages — it injects page-specific CSS and fetches MusicBrainz data. It populates `#status-bar`, `#count-bar`, and `#events-list` (or `#releases-list`, etc.). It also checks for `#artist-label` and `#sub-nav` but since SVFP pages don't have those IDs, the template skips those steps and the static HTML is preserved.

### THLD (warm amber stage-light theme) — **REFERENCE IMPLEMENTATION FOR BY-ARTIST MUSIC VIDEO PAGES**

THLD is the **canonical reference for by-artist music video pages** and by-artist pages with custom subpages (about, photography, music-videos). Use THLD's `music-videos.html` as the pattern when building music video pages for other artists.

```
thld-shared.css       — palette: --thld-{deep,dark,mid,accent,glow,text,muted,highlight,red}
thld-about.css        — about page custom styles
thld-events.css       — events page styles
thld-releases.css      — releases page styles
thld-recordings.css    — recordings page styles
thld-works.css         — works page styles
thld-photography.css   — photography page custom styles
thld-music-videos.css  — music videos page (used for sub-nav overrides; video layout uses inline <style> in music-videos.html)
```

**Subpages:** about.html, photography.html, music-videos.html, events.html, releases.html, recordings.html, works.html

**Index sub-nav button colors** (all defined in index.html inline `<style>` — this is the authoritative color map):

| Class | Background | Text | Used for |
|-------|-----------|------|----------|
| `jt-back` | transparent | `#c94b1a` (burnt orange) | ← back button — outline style, fills on hover |
| `c-blue` | `#5a7840` (olive) | `#080808` | about |
| `c-green` | `#4a2c10` (mid brown) | `#d4b896` (warm beige) | events |
| `c-cyan` | `#e07a2f` (golden amber) | `#080808` | recordings |
| `c-rose` | `#c94b1a` (burnt orange) | `#080808` | releases |
| `c-yellow` | `#f0c060` (warm yellow) | `#080808` | works |
| `c-purple` | `#a020c8` (deep purple) | `#080808` | photography |
| `c-slate` | `#7888a0` (dusty purple-grey) | `#080808` | music videos |

**Music videos page** (`music-videos.html`) is the reference implementation for by-artist music video pages. Key patterns:

- Uses **inline `<style>` block** (not a `<link>` stylesheet) — styles are self-contained on the page
- Builds video cards with: year, title, Archive.org embed (primary), YouTube embeds (fallback), external links, MusicBrainz panel
- Uses `fetchWithRetry` + 1-second delay between MB requests (MusicBrainz rate limit)
- MusicBrainz recording API includes `place-rels` + `area-rels` for shooting location data
- `parseMBData()` buckets relations by target-type (places, areas, crew, labels, works, links, misc)
- `renderMBPanel()` renders a row-based layout: label in small-caps, value in regular text
- External link buttons (`ext-archive`, `ext-yt`, `ext-dm`, `ext-lb`) are placed **below** the video embed

**About and photography pages** are custom standalone pages with:
- Static sub-nav HTML (no `id="sub-nav"` — template skips population)
- `ARTIST_CONFIG` still defined for MusicBrainz API access
- Back button: `jt-back` class → transparent bg + `#c94b1a` text/border (c-orange)
- Same nav-card color overrides as music-videos.html for all sibling buttons

**COLOR_MAP in artist templates** — THLD's template scripts (artist_events.js, artist_releases.js, etc.) use this `COLOR_MAP`:

```js
const COLOR_MAP = {
    about:        'c-blue',
    photography: 'c-purple',
    'music-videos': 'c-slate',
    events:      'c-green',
    recordings:  'c-cyan',
    releases:    'c-rose',
    works:       'c-yellow',
};
```

> **Important:** All sibling keys must be present in `COLOR_MAP` — template falls back to `c-cyan` if a sibling key is missing. The `about`, `photography`, and `music-videos` keys are required for pages with custom subpages.

**Sub-nav label display** — the template converts sibling keys to display labels with `s.replace(/-/g, ' ')` so `"music-videos"` becomes `"music videos"` (not `"music-videos"`).

**Per-section CSS nav-card blocks** (example from thld-about.css):
```css
/* Back button — transparent bg + accent text/border */
body.thld-about-page .nav-card.c-orange { background: var(--black); color: var(--thld-accent); border-color: var(--thld-accent); }

/* Section buttons — solid colored bg, dark text */
body.thld-about-page .nav-card.c-blue   { background: #5a7840 !important; color: var(--black) !important; border-color: #5a7840 !important; }
body.thld-about-page .nav-card.c-green  { background: var(--thld-mid) !important; color: var(--thld-text) !important; border-color: var(--thld-mid) !important; }
body.thld-about-page .nav-card.c-cyan   { background: var(--thld-glow) !important; color: var(--black) !important; border-color: var(--thld-glow) !important; }
body.thld-about-page .nav-card.c-rose   { background: var(--thld-accent) !important; color: var(--black) !important; border-color: var(--thld-accent) !important; }
body.thld-about-page .nav-card.c-yellow { background: var(--thld-highlight) !important; color: var(--black) !important; border-color: var(--thld-highlight) !important; }
body.thld-about-page .nav-card.c-purple { background: #a020c8 !important; color: var(--black) !important; border-color: #a020c8 !important; }
body.thld-about-page .nav-card.c-slate   { background: #7888a0 !important; color: var(--black) !important; border-color: #7888a0 !important; }

body.thld-about-page .nav-card::after { display: none; }
body.thld-about-page .nav-card:hover { background: inherit !important; color: inherit !important; box-shadow: none !important; }
```

**Color palette:**
- `--thld-deep`: #1a1209 (primary near black)
- `--thld-dark`: #2e1e0f (surface dark warm brown)
- `--thld-mid`: #4a2c10 (background raised mid brown)
- `--thld-accent`: #c94b1a (burnt orange-red)
- `--thld-glow`: #e07a2f (golden amber glow)
- `--thld-text`: #d4b896 (warm sandy beige body text)
- `--thld-muted`: #8a6040 (muted sienna for borders)
- `--thld-highlight`: #f0c060 (warm yellow heading/highlight)

### Juanito Thompson (ember / teal accent theme) — **PER-PAGE ACCENT APPROACH**

```
juanito-thompson-shared.css      — palette: --jt-{bg,surface,raised,mid,borders,steel,deep,dark-rust,brick,cta,amber,pale-warm,gold,body,teal,teal-bright,taupe}
juanito-thompson-about.css       — deep ember (#7a3010) accent
juanito-thompson-photography.css — steel blue (#606878) accent
juanito-thompson-recordings.css  — teal (#1a7a5e) accent
juanito-thompson-releases.css    — brick red (#a84830) accent
juanito-thompson-works.css       — gold (#f5c842) accent
```

**Subpages:** about.html, photography.html, recordings.html, releases.html, works.html

**Per-page accent approach** — each subpage has its own accent color that applies to:
- The page title and artist label
- The breadcrumb links and separators
- The back button (transparent bg + page accent text/border)
- All nav-card buttons on that page use their assigned colors from the shared palette

**Button class system:**

| Class | Style | Used for |
|------|-------|----------|
| `c-back` | transparent bg, page accent text/border, fills on hover | ← back button (per-page accent) |
| `c-deep` | solid `#7a3010` bg, dark text | about page button |
| `c-sky` | solid `#606878` (steel) bg, dark text | photography page button |
| `c-teal` | solid `#1a7a5e` bg, dark text | recordings page button |
| `c-brick` | solid `#a84830` bg, dark text | releases page button |
| `c-gold` | solid `#f5c842` bg, dark text | works page button |

**Per-page CSS overrides** — each per-page CSS file (e.g. `juanito-thompson-about.css`) overrides:
```css
/* Back button uses THIS page's accent color */
body.jt-page.jt-about-page .nav-card.c-back {
    background: transparent !important;
    color: var(--jt-deep) !important;  /* page accent */
    border-color: var(--jt-deep) !important;
}
body.jt-page.jt-about-page .nav-card.c-back:hover {
    background: var(--jt-deep) !important;
    color: var(--jt-bg) !important;
}

/* Other buttons also use their assigned colors */
body.jt-page.jt-about-page .nav-card.c-deep   { background: var(--jt-deep) !important; color: var(--jt-bg) !important; border-color: var(--jt-deep) !important; }
body.jt-page.jt-about-page .nav-card.c-sky    { background: var(--jt-steel) !important; color: var(--jt-bg) !important; border-color: var(--jt-steel) !important; }
body.jt-page.jt-about-page .nav-card.c-teal  { background: var(--jt-teal) !important; color: var(--jt-bg) !important; border-color: var(--jt-teal) !important; }
body.jt-page.jt-about-page .nav-card.c-brick  { background: var(--jt-brick) !important; color: var(--jt-bg) !important; border-color: var(--jt-brick) !important; }
body.jt-page.jt-about-page .nav-card.c-gold  { background: var(--jt-gold) !important; color: var(--jt-bg) !important; border-color: var(--jt-gold) !important; }
```

**Page-specific title/breadcrumb styling:**
```css
/* Each page overrides title, breadcrumb, artist-label to use its accent */
body.jt-page.jt-about-page .page-title { color: var(--jt-deep) !important; text-shadow: 0 0 20px rgba(122,48,16,0.5) !important; }
body.jt-page.jt-about-page .breadcrumb a { color: var(--jt-deep); }
body.jt-page.jt-about-page .breadcrumb .current { color: var(--jt-deep); }
body.jt-page.jt-about-page .artist-label { color: var(--jt-deep) !important; }
```

**Main element padding** — custom standalone pages (about, photography) need:
```css
body.jt-page.jt-about-page main { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 72px 20px 60px; }
body.jt-page.jt-about-page main > * { background: var(--black); }
```
This prevents title overlap with breadcrumb and ensures consistent spacing.

**Color palette:**
- `--jt-bg`: #0a0a0c
- `--jt-surface`: #1c1e22
- `--jt-raised`: #2e3038
- `--jt-mid`: #383c44
- `--jt-borders`: #4a5060
- `--jt-steel`: #606878
- `--jt-deep`: #7a3010
- `--jt-dark-rust`: #5a2008
- `--jt-brick`: #a84830
- `--jt-cta`: #c85a18
- `--jt-amber`: #e8900a
- `--jt-pale-warm`: #f0b878
- `--jt-gold`: #f5c842
- `--jt-body`: #f0b878
- `--jt-teal`: #1a7a5e
- `--jt-teal-bright`: #2a9070
- `--jt-taupe`: #8a7060

### DDT LLC (warm amber / terracotta theme)

```
ddt-shared.css — palette: --ddt-{deep,mid,amber,tan,heading,cta,gold,nature}
ddt-events.css — gold (#d4a820) accent
ddt-releases.css — cta / brick red (#c04030) accent
```

DDT LLC has a warm amber/terracotta palette with two subpages (events and releases). The brand color is the mid-brown (#8a5a2a) used for the artist label and abbreviation. The accent color (c-orange in the template) maps to the mid-brown for consistency.

**Index sub-nav buttons:** The DDT index page sub-nav buttons (c-green for events, c-rose for releases) must use the same color assignments as the corresponding per-section CSS files. The index's inline `<style>` should include nav-card overrides matching the per-section CSS files — this ensures consistent color treatment whether a visitor enters from the index or a subpage.

**Back button:** DDT LLC subpages use the standard `jt-back` class for the inverted back button, colored with `--ddt-mid` (#8a5a2a).

```css
body.ddt-page .nav-card.jt-back {
    background: transparent;
    color: var(--ddt-mid);
    border-color: var(--ddt-mid);
}
body.ddt-page .nav-card.jt-back:hover {
    background: var(--ddt-mid);
    color: var(--ddt-heading);
    box-shadow: 0 0 22px rgba(138, 90, 42, 0.4);
}
```

**Nav card color overrides:** DDT's sub-nav cards override the global `c-green` and `c-rose` classes with the terracotta palette.

**Custom pages:** DDT LLC has only events and releases — no custom pages beyond those template-driven subpages.

### Dag Henderson (deep forest / muted earth theme)

```
dh-shared.css — palette: --dh-{deep,surface,muted,body,slate,brand,leaf,purple,rust,amber}
dh-recordings.css — slate (#4a5860) accent
dh-releases.css — purple (#6030a0) accent
dh-works.css — amber gold (#f0c060) accent
```

Dag Henderson uses a deep forest / muted earth palette. The brand color is `--dh-brand` (#3a5830) used for the artist label, abbreviation, and back button. Each subpage has a distinct section accent: slate blue for recordings, purple for releases, amber gold for works.

**Back button:** Dag Henderson subpages use the standard `jt-back` class for the inverted back button, colored with `--dh-brand` (#3a5830).

**Nav card color overrides:** All three per-section CSS files use identical nav-card overrides matching the index page's sub-nav buttons, ensuring color consistency across all entry points.

**Custom pages:** Dag Henderson's index page has unique elements (pixel art animation canvas, mini video player) that remain in the index layout only.

### The Four B's (earthy green / harvest theme)

```
4b-shared.css — palette: --4b-{deep,mid,heading,brand,leaf,chart,rust,amber,blue,sky}
4b-events.css — forest green (#2a6830) accent
4b-recordings.css — chartreuse (#a8d848) accent
4b-releases.css — rust orange (#c84810) accent
4b-works.css — golden amber (#f0a830) accent
```

The Four B's uses an earthy harvest palette. The brand color is `--4b-brand` (#2a6830) used for the artist label, abbreviation, and back button. Each subpage has a distinct section accent: forest green for events, chartreuse for recordings, rust orange for releases, golden amber for works.

**Back button:** The Four B's subpages use the standard `jt-back` class for the inverted back button, colored with `--4b-brand` (#2a6830).

**Nav card color overrides:** All four per-section CSS files use identical nav-card overrides matching the index page's sub-nav buttons, ensuring color consistency across all entry points.

**Custom pages:** The Four B's has no custom pages beyond the four template-driven subpages.

### C.P. Rutledge (vibrant pop / electric theme)

```
cpr-shared.css — palette: --cpr-{red,gold,green,sky,purple,magenta,blue,teal,orange,heading}
cpr-recordings.css — sky blue (#68c8f0) accent
cpr-releases.css — coral red (#f05a5a) accent
cpr-works.css — gold (#f5c020) accent
```

C.P. Rutledge uses a vibrant electric palette. The brand color is `--cpr-red` (#f05a5a) used for the artist label, abbreviation, and back button. Each subpage has a distinct section accent: sky blue for recordings, coral red for releases, gold for works.

**Back button:** C.P. Rutledge subpages use the standard `jt-back` class for the inverted back button, colored with `--cpr-red` (#f05a5a).

**Nav card color overrides:** All three per-section CSS files use identical nav-card overrides matching the index page's sub-nav buttons, ensuring color consistency across all entry points.

**Custom pages:** C.P. Rutledge has no custom pages beyond the three template-driven subpages.

### Dino Spumoni (twilight navy / steel blue theme)

```
ds-shared.css — palette: --ds-{deep,surface,mid,sky,brand,brick,cta,heading,rose,teal}
ds-events.css — teal (#2a7868) accent
ds-releases.css — dusty rose (#d06880) accent
ds-recordings.css — sky blue (#6888a8) accent
ds-works.css — burnt orange (#d4782a) accent
```

Dino Spumoni uses a twilight navy palette. The brand color is `--ds-brand` (#4060a0) used for the artist label, abbreviation, and back button. Each subpage has a distinct section accent: teal for events, dusty rose for releases, sky blue for recordings, burnt orange for works.

**Back button:** Dino Spumoni subpages use the standard `jt-back` class for the inverted back button, colored with `--ds-brand` (#4060a0).

**Nav card color overrides:** All four per-section CSS files use identical nav-card overrides matching the index page's sub-nav buttons, ensuring color consistency across all entry points.

**Custom pages:** Dino Spumoni has no custom pages beyond the four template-driven subpages.

### Jon McCoy (cool gray / warm sand theme)

```
jm-shared.css — palette: --jm-{deep,surface,body,muted,heading,taupe,sand,cream,sage,rose}
jm-recordings.css — sage (#7a9080) accent
jm-releases.css — rose (#b89898) accent
jm-works.css — taupe (#a89880) accent
```

Jon McCoy uses a cool gray / warm sand palette. The brand color is `--jm-rose` (#b89898) used for the artist label, abbreviation, and back button. Each subpage has a distinct section accent: sage for recordings, rose for releases, taupe for works.

**Back button:** Jon McCoy subpages use the standard `jt-back` class for the inverted back button, colored with `--jm-rose` (#b89898).

**Nav card color overrides:** All three per-section CSS files use identical nav-card overrides matching the index page's sub-nav buttons, ensuring color consistency across all entry points.

**Custom pages:** Jon McCoy has no custom pages beyond the three template-driven subpages.

---

### Vinny Bobarino (dusk blue / sunset horizon theme)

```
vb-shared.css — palette: --vb-{bg,surface,raised,mid,borders,deep,accent,amber,heading,body,nature,nature-glow,sky,bulb}
vb-recordings.css — sky (#6aaad8) accent
vb-releases.css — accent / burnt horizon (#e86020) accent
vb-works.css — heading / autumn gold (#c8a840) accent
```

Vinny Bobarino is a good reference for a **3-layer theme** (shared palette + index inline styles + per-section CSS files) where the brand color is also used as the back button color and artist label color.

**Back button:** Vinny Bobarino subpages use a custom inverted back button via the `vb-back` class, colored with `--vb-accent` (#e86020). This is set via the template scripts for standard subpages.

**Custom pages:** If a subpage doesn't use a template script, set its `accent` to the most appropriate color from your palette (Vinny Bobarino's `network` would use `nature` / pine green), create a dedicated `[artist]-network.css` file, and add both shared + section CSS links.

```css
body.vb-page.vb-network-page .nav-card.vb-back {
    background: transparent;
    color: var(--vb-accent);
    border-color: var(--vb-accent);
}
body.vb-page.vb-network-page .nav-card.vb-back:hover {
    background: var(--vb-accent);
    color: var(--vb-bg);
    box-shadow: 0 0 22px var(--vb-accent);
}
```

**Network page:** The `network.html` page is a custom (non-template) page with a unique layout — it has `margin-top: 80px` on `.page-header` to visually distinguish it from standard subpages. It uses the same per-section CSS pattern but with pine green as the primary color.

Juanito Thompson introduced a key lesson: when theming an **existing** artist page that already has a hero section, you must preserve the full hero structure from SVFP/THLD. Specifically, the `.artist-hero` container needs `min-height: 100vh` + `display: flex` + `justify-content: flex-end` to position the artist header at the bottom of the full-viewport image. Without all three, the header ends up flush at the top and the gradient overlay doesn't align properly.

See [Index Page Hero Structure](#index-page-hero-structure) below.

---

## Index Page Hero Structure

When theming an artist's index page, the hero section **must** follow this exact structure for the layout to work:

```html
<div class="artist-hero">
    <img class="artist-hero-img" src="..." alt="...">
    <div class="artist-hero-tint"></div>
    <div class="artist-hero-gradient"></div>

    <div class="hero-inner">
        <div class="artist-header">
            <div class="artist-label">// by artist //</div>
            <div class="artist-name">ARTIST<br>NAME</div>
            <div class="artist-note">optional note</div>
            <div class="years-badge">YEAR — YEAR</div>
            <div class="sub-nav">
                <a href="..." class="nav-card c-cyan">...</a>
                ...
            </div>
        </div>
    </div>
</div>
```

The corresponding CSS for the hero block:

```css
body.[artist]-page { background: var(--black); }

main { position: relative; }

/* Hero container — must have min-height: 100vh to fill the viewport */
.artist-hero {
    width: 100%;
    position: relative;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;  /* ← key: pins header to bottom */
    overflow: hidden;
    margin-bottom: 48px;
}

/* Full-bleed cover image */
.artist-hero-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center XX%;   /* adjust per photo */
    filter: saturate(0.85) brightness(0.65);
}

/* Warm tint overlay (adjust RGB per palette) */
.artist-hero-tint {
    position: absolute;
    inset: 0;
    background: rgba(200, 90, 24, 0.07);
    mix-blend-mode: screen;
}

/* Vignette gradient — top is transparent, bottom fades to black */
.artist-hero-gradient {
    position: absolute;
    inset: 0;
    background: linear-gradient(
        to bottom,
        rgba(8, 8, 18, 0.15) 0%,
        rgba(8, 8, 18, 0.0)  15%,
        rgba(8, 8, 18, 0.0)  50%,
        rgba(8, 8, 18, 0.60) 75%,
        rgba(8, 8, 18, 1.0)  100%
    );
}

/* Positions the artist header at the bottom of the hero */
.hero-inner {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 900px;
    padding: 0 20px 36px;
    display: flex;
    flex-direction: column;
}

.artist-header {
    width: 100%;
    max-width: 900px;
    margin-bottom: 0;
    animation: fadeUp 0.5s ease both;
}
```

The critical properties are:
- `.artist-hero { min-height: 100vh }` — without this the hero collapses to content height
- `.artist-hero { justify-content: flex-end }` — without this the header floats at the top
- `.artist-hero-gradient` at 100% opacity at the bottom — without this the text is unreadable over the photo

---

## Per-Page Accent Approach — Each Subpage Has Its Own Accent Color

This approach (used by Juanito Thompson) gives each subpage its own accent color that applies to the title, breadcrumb, artist label, and back button — creating a distinct visual identity per page while keeping all link button colors consistent across the site.

### When to Use This Approach

- Artist pages with multiple subpages (about, photography, recordings, releases, works)
- When you want each subpage to feel visually distinct
- When the artist's palette has enough color variation to support multiple accents

### How It Works

1. **Shared CSS** (`[artist]-shared.css`) — defines the full palette and all button classes (`c-back`, `c-deep`, `c-sky`, `c-teal`, `c-brick`, `c-gold`, etc.)

2. **Per-page CSS** (`[artist]-[page].css`) — overrides the back button and title/breadcrumb colors to match that page's accent

3. **Sub-nav buttons** — static HTML with `c-*` classes; each page's CSS controls what those colors resolve to via overrides

### Per-Page CSS Pattern

```css
/* Main layout — required for custom standalone pages */
body.[artist]-[page]-page main {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; padding: 72px 20px 60px;
}
body.[artist]-[page]-page main > * { background: var(--black); }

/* Title section uses THIS page's accent color */
body.[artist]-[page]-page .page-title {
    color: var(--[artist]-[page]-accent) !important;
    text-shadow: 0 0 20px rgba(R, G, B, 0.5) !important;
}

/* Breadcrumb uses page accent */
body.[artist]-[page]-page .breadcrumb a { color: var(--[artist]-[page]-accent); }
body.[artist]-[page]-page .breadcrumb .current { color: var(--[artist]-[page]-accent); }
body.[artist]-[page]-page .breadcrumb .sep { color: var(--[artist]-[page]-accent); opacity: 0.5; }

/* Artist label uses page accent */
body.[artist]-[page]-page .artist-label { color: var(--[artist]-[page]-accent) !important; }

/* Back button: transparent bg + THIS page's accent */
body.[artist]-[page]-page .nav-card.c-back {
    background: transparent !important;
    color: var(--[artist]-[page]-accent) !important;
    border-color: var(--[artist]-[page]-accent) !important;
}
body.[artist]-[page]-page .nav-card.c-back:hover {
    background: var(--[artist]-[page]-accent) !important;
    color: var(--[artist]-bg) !important;
}

/* Other nav buttons — their assigned colors from shared CSS */
body.[artist]-[page]-page .nav-card.c-deep   { background: var(--[artist]-deep) !important; color: var(--[artist]-bg) !important; border-color: var(--[artist]-deep) !important; }
body.[artist]-[page]-page .nav-card.c-sky    { background: var(--[artist]-steel) !important; color: var(--[artist]-bg) !important; border-color: var(--[artist]-steel) !important; }
body.[artist]-[page]-page .nav-card.c-teal   { background: var(--[artist]-teal) !important; color: var(--[artist]-bg) !important; border-color: var(--[artist]-teal) !important; }
body.[artist]-[page]-page .nav-card.c-brick  { background: var(--[artist]-brick) !important; color: var(--[artist]-bg) !important; border-color: var(--[artist]-brick) !important; }
body.[artist]-[page]-page .nav-card.c-gold   { background: var(--[artist]-gold) !important; color: var(--[artist]-bg) !important; border-color: var(--[artist]-gold) !important; }

body.[artist]-[page]-page .nav-card::after { display: none; }
```

### Applying to THLD and SVFP

When updating THLD and SVFP to this approach:

1. Each subpage (about, photography, music-videos, events, releases, recordings, works) gets its own accent color
2. Per-page CSS files override the back button color and title/breadcrumb to match
3. The shared CSS defines all button classes once; per-page CSS reassigns what each `c-*` resolves to
4. Keep `siblings` in `ARTIST_CONFIG` in sync with actual pages that exist
5. Custom standalone pages (about, photography) need `main` padding to prevent title/breadcrumb overlap

---

## Quick Reference: CSS Cascade Order

When a subpage loads, styles resolve in this order:

1. `style.css` — site-wide globals and resets
2. `assets/archive.css` — shared archive layout
3. `[artist]-shared.css` or `[place]-shared.css` — palette (`:root` vars only)
4. `[artist]-[section].css` or `[place]-[section].css` — section overrides
5. Template-injected `<style>` (from `artist_*.js` or `place_*.js`) — dynamic styles using config
6. Inline `<style>` in `index.html` — index-page-only styles (not loaded on subpages)

Per-section CSS files should override template-injected styles using the `body.[artist]-[section]-page` or `body.[place]-[section]-page` selector, which has higher specificity than the injected `.page-title` etc. selectors.

---

## Finding a MusicBrainz Artist ID

1. Search at https://musicbrainz.org
2. Navigate to the artist's page
3. The UUID is in the URL: `https://musicbrainz.org/artist/260e4953-a937-4355-8389-d1baaf24eca5`
