# Adding a Place Page

Step-by-step guide to creating a new place page in the archive.

---

## 1. Find the MusicBrainz UUID

Search for the place on [musicbrainz.org](https://musicbrainz.org/search?type=place) and copy the UUID.

## 2. Create the Folder

```
archive/by-place/my-place/
├── index.html
├── my-place-shared.css
├── recordings.html
├── works.html
├── personnel.html
└── (optional sub-pages)
```

## 3. index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Place — magmacrunch media</title>
    <link rel="icon" type="image/jpeg" href="../../assets/logo.jpg">
    <link rel="stylesheet" href="../../style.css">
    <link rel="stylesheet" href="../../assets/archive.css">
    <link rel="stylesheet" href="my-place-shared.css">
</head>
<body class="mp-page">
<nav id="auto-nav" data-depth="../../"></nav>
<main>
    <div class="artist-hero">
        <img class="artist-hero-img" src="..." alt="...">
        <div class="artist-hero-tint"></div>
        <div class="artist-hero-gradient"></div>
        <div class="hero-inner">
            <div class="artist-header">
                <div class="artist-label">// by place //</div>
                <div class="artist-name">MY<br>PLACE</div>
                <div class="sub-nav">
                    <a href="recordings.html" class="nav-card c-recordings">recordings</a>
                    <a href="works.html" class="nav-card c-works">works</a>
                    <a href="personnel.html" class="nav-card c-personnel">personnel</a>
                </div>
            </div>
        </div>
    </div>
</main>
<footer>&copy; 2026 <span>magmacrunch media</span></footer>
<script src="../../nav.js"></script>
<script>
window.PLACE_CONFIG = {
    id:        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    name:      'My Place',
    abbr:      'mp',
    accent:    'green',
    backColor: 'c-recordings',
    siblings:  ['about', 'personnel', 'recordings', 'works'],
    depth:     '../../',
};
</script>
<script src="../../templates/place_recordings.js"></script>
</body>
</html>
```

## 4. recordings.html (Subpage)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>mp — recordings — magmacrunch media</title>
    <link rel="icon" type="image/jpeg" href="../../../assets/logo.jpg">
    <link rel="stylesheet" href="../../../style.css">
    <link rel="stylesheet" href="../../../assets/archive.css">
    <link rel="stylesheet" href="my-place-shared.css">
    <link rel="stylesheet" href="../../../templates/artist-recordings.css">
    <style>
        :root { --section-accent: var(--green); }
        body.mp-page.mp-recordings-page .breadcrumb a { color: var(--section-accent); }
        body.mp-page.mp-recordings-page .breadcrumb a:hover { color: var(--cream, #f0ead8); }
        body.mp-page.mp-recordings-page .breadcrumb .sep { color: var(--section-accent); opacity: 0.6; }
        body.mp-page.mp-recordings-page .breadcrumb .current { color: var(--section-accent); }
        body.mp-page.mp-recordings-page .artist-label { color: var(--section-accent); }
        body.mp-page.mp-recordings-page .page-title { color: var(--section-accent); text-shadow: 0 0 20px rgba(57,255,110,0.45); }
        body.mp-page.mp-recordings-page .nav-card.c-back { color: var(--section-accent); border-color: var(--section-accent); }
        body.mp-page.mp-recordings-page .nav-card.c-back:hover { background: var(--section-accent); color: var(--black, #080808); }
    </style>
    <script>
    window.PLACE_CONFIG = {
        id:        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        name:      'My Place',
        abbr:      'mp',
        accent:    'green',
        backColor: 'c-recordings',
        siblings:  ['about', 'personnel', 'recordings', 'works'],
        depth:     '../../../',
    };
    </script>
</head>
<body class="mp-page mp-recordings-page">
<nav id="auto-nav" data-depth="../../../"></nav>
<main>
    <div class="breadcrumb"></div>

    <div class="page-header">
        <div class="artist-label" id="artist-label"></div>
        <div class="page-title">RECORDINGS</div>
        <div class="sub-nav" id="sub-nav"></div>
    </div>

    <div class="catalog-wrap">
        <div id="status-bar">loading recordings…</div>
        <div id="count-bar"></div>
        <div id="recordings-list"></div>
    </div>
</main>
<footer>&copy; 2026 <span>magmacrunch media</span></footer>
<script src="../../../nav.js"></script>
<script src="../../../templates/entity-map.js"></script>
<script src="../../../templates/place_recordings.js"></script>
</body>
</html>
```

## 5. Config Options

```js
window.PLACE_CONFIG = {
    id:        'uuid',           // MusicBrainz place UUID (required)
    name:      'Place Name',     // Display name (required)
    abbr:      'pn',             // Abbreviation for breadcrumb (required)
    accent:    'green',          // CSS var name WITHOUT -- prefix (required)
    backColor: 'c-recordings',   // Nav-card class for back button (required)
    siblings:  ['about', 'personnel', 'recordings', 'works'], // Sibling pages (required)
    depth:     '../../../',      // Path prefix to site root (required)
};
```

The `accent` value is a CSS variable name (without `--` prefix). The template constructs `var(--${accent})`. Examples: `'green'`, `'cyan'`, `'fm-sky'`.

## 6. Available Templates

- `place_recordings.js` — recordings made at this place
- `place_works.js` — works associated with this place
- `place_personnel.js` — people associated with this place
- `place_events.js` — events/performances at this place
- `place_links.js` — external links (config-driven, no MusicBrainz fetch)

## 7. Sibling Navigation

Siblings are defined in `window.PLACE_CONFIG.siblings` — list all sub-page slugs. The template generates the sub-nav bar from this array, automatically excluding the current page.

```js
siblings: ['about', 'personnel', 'recordings', 'works']
```

### backColor Convention

The `backColor` property controls the "← back" nav card color. Use `c-{section}`:

| Section | `backColor` value |
|---------|-------------------|
| recordings | `c-recordings` |
| works | `c-works` |
| personnel | `c-personnel` |
| events | `c-events` |

For theming details (inline style blocks, breadcrumb colors, title conventions), see [Archive Theming](Archive-Theming). 
