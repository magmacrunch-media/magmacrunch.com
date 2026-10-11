# Adding a Contributor Page

Step-by-step guide to creating a new contributor page in the archive.

---

## 1. Find the MusicBrainz UUID

Search for the contributor on [musicbrainz.org](https://musicbrainz.org/artist) and copy the UUID.

## 2. Create the Folder

```
archive/by-contributor/my-contributor/
└── index.html
```

Contributor pages are single-page — they show all data on one page.

## 3. index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Contributor — magmacrunch media</title>
    <link rel="icon" type="image/jpeg" href="../../assets/logo.jpg">
    <link rel="stylesheet" href="../../style.css">
    <link rel="stylesheet" href="../../assets/archive.css">
    <link rel="stylesheet" href="../../templates/contributor.css">
</head>
<body class="ctb-page">
<nav id="auto-nav" data-depth="../../"></nav>
<main>
    <div class="breadcrumb">
        <a href="../../">home</a>
        <span class="sep">&#8250;</span>
        <a href="../">archive</a>
        <span class="sep">&#8250;</span>
        <a href="../">by contributor</a>
        <span class="sep">&#8250;</span>
        <span class="current">my contributor</span>
    </div>

    <div class="contrib-header">
        <h1 class="contrib-name">MY CONTRIBUTOR</h1>
        <div class="contrib-ids" id="contrib-ids"></div>
    </div>

    <div id="contrib-sections"></div>
</main>
<footer>&copy; 2026 <span>magmacrunch media</span></footer>
<script src="../../nav.js"></script>
<script src="../../templates/entity-map.js"></script>
<script>
window.__CONTRIBUTOR_CONFIG = {
    MB_ID:         'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    NAME:          'My Contributor',
    ARCHIVE_LINKS: {},
    accent:        'cyan',
    depth:         '../../../',
};
</script>
<script src="../../templates/contributor.js"></script>
</body>
</html>
```

## 4. Config Options

```js
window.__CONTRIBUTOR_CONFIG = {
    MB_ID:         'uuid',           // MusicBrainz artist UUID (required)
    NAME:          'Contributor Name', // Display name (required)
    ARCHIVE_LINKS: {                 // Map of MB entity IDs to archive paths
        'release-uuid': '/archive/by-artist/artist-name/releases.html',
        'recording-uuid': '/archive/by-artist/artist-name/recordings.html'
    },
    accent:        'cyan',           // Optional — CSS var name, defaults to 'cyan'
    depth:         '../../../',      // Optional — path prefix for attribution footer
};
```

**Note:** `__CONTRIBUTOR_CONFIG` uses **UPPERCASE** property names (`MB_ID`, `NAME`, `ARCHIVE_LINKS`) — this is different from `ARTIST_CONFIG` and `PLACE_CONFIG` which use lowercase.

## 5. entity-map.js

Must be loaded before the contributor template. Maps MusicBrainz IDs to internal archive paths:

```js
// Loaded from templates/entity-map.js
// Contains mappings like:
// { "artist-uuid": "/archive/by-artist/name/", "release-uuid": "/archive/by-artist/name/releases.html" }
```

This allows contributor pages to link to detailed artist/release pages elsewhere in the archive.

## 6. Contributor Pages vs Artist Pages

| Feature | Artist Page | Contributor Page |
|---------|-------------|------------------|
| Sub-pages | Yes (recordings, works, etc.) | No (single page) |
| Config | `ARTIST_CONFIG` | `__CONTRIBUTOR_CONFIG` |
| Templates | Multiple per sub-page | Single `contributor.js` |
| Breadcrumb | Injected by template JS | Hardcoded in HTML |
| Title element | `.artist-name` or `.page-title` | `.contrib-name` (h1) |
| Use case | Featured artists | All contributors |

For theming details (breadcrumb colors, title conventions), see [Archive Theming](Archive-Theming). 
