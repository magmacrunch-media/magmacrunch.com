Auto-generated sibling navigation for archive subpages. Injects a row of colored nav cards with a back button.

## How It Works

Define `siblings` in `window.*_CONFIG` and the template JS auto-generates the sub-nav:

```js
window.ARTIST_CONFIG = {
    siblings: ['about', 'events', 'recordings', 'releases', 'works'],
    // ...
};
```

The template:
1. Reads the sibling list from config
2. Determines the current page from the URL filename
3. Generates a card for each sibling (skipping the current page)
4. Prepends a back button
5. Injects the `.sub-nav` block into the `#sub-nav` element

## Injection Priority

1. Replace existing `.sub-nav` inside `.page-header`
2. Insert after `.page-title` inside `.page-header`
3. Append to `.page-header`
4. Prepend to `<main>`

## Back Button Color

The back button uses `c-back` class. Override via `backColor` in config:

```js
window.ARTIST_CONFIG = {
    backColor: 'c-cyan',
    // ...
};
```

## Color Map

| Sibling | Color Class |
|---------|-------------|
| `events` | `c-rose` |
| `recordings` | `c-cyan` |
| `releases` | `c-cyan` |
| `works` | `c-purple` |
| `personnel` | `c-green` |
| `about` | `c-yellow` |
| `links` | `c-links` |
| `members` | `c-green` |
| `photography` | `c-orange` |

Colors are defined in each artist's shared CSS file. The nav.js color map is a default — artist CSS overrides these with their own palette.

## Manual Sub-Nav (Legacy)

Some pages still have hand-authored `.sub-nav` blocks. The auto-inject script detects and replaces these to avoid duplication.

### Example (Juanito Thompson)

**Index page:**

```html
<div class="sub-nav">
    <a href="about.html" class="nav-card c-deep">about</a>
    <a href="music-videos.html" class="nav-card c-pale">music videos</a>
    <a href="recordings.html" class="nav-card c-cyan">recordings</a>
    <a href="releases.html" class="nav-card c-rose">releases</a>
    <a href="works.html" class="nav-card c-yellow">works</a>
</div>
```

**Subpage (about.html):**

```html
<div class="sub-nav">
    <a href="index.html" class="nav-card c-back">back</a>
    <a href="music-videos.html" class="nav-card c-pale">music videos</a>
    <a href="recordings.html" class="nav-card c-cyan">recordings</a>
    <a href="releases.html" class="nav-card c-rose">releases</a>
    <a href="works.html" class="nav-card c-yellow">works</a>
</div>
```

## Color Class Convention

| Class | Section | Notes |
|-------|---------|-------|
| `c-back` | back | Transparent + accent border |
| `c-deep` | about | Muted/dark tone |
| `c-pale` | music videos | Light/warm tone |
| `c-green` | network / events | Teal or nature green |
| `c-steel` | photography | Steel blue |
| `c-cyan` | recordings | Amber or warm accent |
| `c-rose` | releases | Brick red or rose |
| `c-yellow` | works | Gold or highlight |

**Rule**: The same `c-*` class always maps to the same section type across all pages for a given artist.

## Per-Artist Shared CSS

Each artist has a shared CSS file that defines all color classes for their sub-nav:

```css
body.jt-page .sub-nav .nav-card.c-back {
    background: transparent;
    color: var(--jt-cta);
    border-color: var(--jt-cta);
}

body.jt-page .sub-nav .nav-card.c-cyan {
    background: var(--jt-amber);
    color: var(--jt-bg);
    border-color: var(--jt-amber);
}
```

Existing shared CSS files:
- `archive/by-artist/juanito-thompson/juanito-thompson-shared.css`
- `archive/by-artist/thld/thld-shared.css`
- `archive/by-artist/vinny-bobarino/vb-shared.css`

## Breadcrumb Auto-Injector

nav.js also auto-generates breadcrumbs for archive subpages based on URL path:

```html
<div id="breadcrumb"></div>
```

If present, breadcrumbs are injected there. Otherwise, prepended to `<main>`.

## Adding a New Subpage

1. Add the page filename to the `siblings` array in `window.*_CONFIG`
2. The template will generate the nav card automatically
3. Ensure the color class is defined in the artist's shared CSS
4. The back button uses `c-back` (transparent + accent border) 
