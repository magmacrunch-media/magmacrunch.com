# Adding an Artist Page

Step-by-step guide to creating a new artist page in the archive.

---

## 1. Find the MusicBrainz UUID

Search for the artist on [musicbrainz.org](https://musicbrainz.org) and copy the UUID from the URL:

```
https://musicbrainz.org/artist/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## 2. Create the Folder

```
archive/by-artist/my-artist/
├── index.html
├── my-artist-shared.css
├── recordings.html
├── releases.html
├── works.html
├── events.html
└── (optional sub-pages)
```

## 3. index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Artist — magmacrunch media</title>
    <link rel="icon" type="image/jpeg" href="../../assets/logo.jpg">
    <link rel="stylesheet" href="../../style.css">
    <link rel="stylesheet" href="../../assets/archive.css">
    <link rel="stylesheet" href="my-artist-shared.css">
</head>
<body class="ma-page">
<nav id="auto-nav" data-depth="../../"></nav>
<main>
    <div class="artist-hero">
        <img class="artist-hero-img" src="..." alt="...">
        <div class="artist-hero-tint"></div>
        <div class="artist-hero-gradient"></div>
        <div class="hero-inner">
            <div class="artist-header">
                <div class="artist-label">// my artist //</div>
                <div class="artist-name">MY<br>ARTIST</div>
                <div class="sub-nav">
                    <a href="recordings.html" class="nav-card c-cyan">recordings</a>
                    <a href="releases.html" class="nav-card c-rose">releases</a>
                    <a href="works.html" class="nav-card c-yellow">works</a>
                    <a href="events.html" class="nav-card c-green">events</a>
                </div>
            </div>
        </div>
    </div>
</main>
<footer>&copy; 2026 <span>magmacrunch media</span></footer>
<script src="../../nav.js"></script>
<script>
window.ARTIST_CONFIG = {
    id:        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    name:      'My Artist',
    abbr:      'MA',
    accent:    'cyan',
    backColor: 'c-cyan',
    siblings:  ['about', 'events', 'recordings', 'releases', 'works'],
    depth:     '../../',
};
</script>
<script src="../../templates/artist_recordings.js"></script>
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
    <title>MA — recordings — magmacrunch media</title>
    <link rel="icon" type="image/jpeg" href="../../../assets/logo.jpg">
    <link rel="stylesheet" href="../../../style.css">
    <link rel="stylesheet" href="../../../assets/archive.css">
    <link rel="stylesheet" href="my-artist-shared.css">
    <link rel="stylesheet" href="../../../templates/artist-recordings.css">
    <style>
        :root { --section-accent: var(--cyan); }
        body.ma-page.ma-recordings-page .breadcrumb a { color: var(--section-accent); }
        body.ma-page.ma-recordings-page .breadcrumb a:hover { color: var(--cream, #f0ead8); }
        body.ma-page.ma-recordings-page .breadcrumb .sep { color: var(--section-accent); opacity: 0.6; }
        body.ma-page.ma-recordings-page .breadcrumb .current { color: var(--section-accent); }
        body.ma-page.ma-recordings-page .artist-label { color: var(--section-accent); }
        body.ma-page.ma-recordings-page .page-title { color: var(--section-accent); text-shadow: 0 0 20px rgba(0,245,255,0.45); }
        body.ma-page.ma-recordings-page .nav-card.c-back { color: var(--section-accent); border-color: var(--section-accent); }
        body.ma-page.ma-recordings-page .nav-card.c-back:hover { background: var(--section-accent); color: var(--black, #080808); }
    </style>
    <script>
    window.ARTIST_CONFIG = {
        id:        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        name:      'My Artist',
        abbr:      'MA',
        accent:    'cyan',
        backColor: 'c-cyan',
        siblings:  ['about', 'events', 'recordings', 'releases', 'works'],
        depth:     '../../../',
    };
    </script>
</head>
<body class="ma-page ma-recordings-page">
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
<script src="../../../templates/artist_recordings.js"></script>
</body>
</html>
```

## 5. Config Options

```js
window.ARTIST_CONFIG = {
    id:        'uuid',           // MusicBrainz artist UUID (required)
    name:      'Artist Name',    // Display name (required)
    abbr:      'AN',             // Abbreviation for breadcrumb (required)
    accent:    'cyan',           // CSS var name WITHOUT -- prefix (required)
    backColor: 'c-cyan',         // Nav-card class for back button (required)
    siblings:  ['about', 'events', 'recordings', 'releases', 'works'], // Sibling pages (required)
    depth:     '../../../',      // Path prefix to site root (required)
    ticker:    ['extra'],        // Optional ticker text
};
```

The `accent` value is a CSS variable name (without `--` prefix). The template constructs `var(--${accent})`. Examples: `'cyan'`, `'green'`, `'svfp-warm'`.

## 6. Available Templates

- `artist_recordings.js` — list of recordings
- `artist_releases.js` — list of releases/albums
- `artist_works.js` — list of works/compositions
- `artist_events.js` — performance history
- `artist_about.js` — bio, links, general info
- `artist_members.js` — group members (for collectives)
- `artist_photography.js` — photo gallery
- `artist_links.js` — external links (config-driven, no MusicBrainz fetch)

## 7. Sibling Navigation

Siblings are defined in `window.ARTIST_CONFIG.siblings` — list all sub-page slugs. The template generates the sub-nav bar from this array, automatically excluding the current page.

```js
siblings: ['about', 'events', 'recordings', 'releases', 'works']
```

For theming details (inline style blocks, breadcrumb colors, title conventions), see [Archive Theming](Archive-Theming). 
