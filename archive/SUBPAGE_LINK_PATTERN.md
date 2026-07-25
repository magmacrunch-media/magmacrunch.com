# Archive Page Sub-Nav Link Button Pattern

## The Pattern

Each artist's archive has an **index page** and several **subpages** (about, photography, recordings, etc.). Both the index page and every subpage show the same sub-nav button row. The button colors must match across all pages for a given section type.

**Rule: The color class on a subpage link button must be identical to the color class on the same link in the index page.**

## How It Works

### 1. Index page sub-nav

The index page defines the canonical button colors for each subpage link.

**Example (Juanito Thompson — `index.html`):**
```html
<div class="sub-nav">
    <a href="about.html"        class="nav-card c-deep">about</a>
    <a href="music-videos.html"  class="nav-card c-pale">music videos</a>
    <a href="network.html"     class="nav-card c-green">network</a>
    <a href="photography.html"  class="nav-card c-steel">photography</a>
    <a href="recordings.html"   class="nav-card c-cyan">recordings</a>
    <a href="releases.html"     class="nav-card c-rose">releases</a>
    <a href="works.html"        class="nav-card c-yellow">works</a>
</div>
```

### 2. Subpage sub-nav

Every subpage repeats the **exact same button row** with **identical color classes**.

**Example (Juanito Thompson — `about.html`):**
```html
<div class="sub-nav">
    <a href="index.html"         class="nav-card c-back">← back</a>
    <a href="music-videos.html"  class="nav-card c-pale">music videos</a>
    <a href="network.html"      class="nav-card c-green">network</a>
    <a href="photography.html"   class="nav-card c-steel">photography</a>
    <a href="recordings.html"    class="nav-card c-cyan">recordings</a>
    <a href="releases.html"      class="nav-card c-rose">releases</a>
    <a href="works.html"         class="nav-card c-yellow">works</a>
</div>
```

Note: The back button uses `c-back` (transparent with accent border) instead of a page-matching color.

### 3. Shared CSS (`[artist]-shared.css`)

All button colors are defined in the shared CSS file loaded by every page. Each artist has one of these files with the full color palette and all button styles.

```css
/* Back button: transparent + page accent */
body.jt-page .sub-nav .nav-card.c-back,
body.jt-page .sub-nav .nav-card.jt-back { background: transparent; color: var(--jt-cta); border-color: var(--jt-cta); }

/* About button: solid deep/taupe color */
body.jt-page .sub-nav .nav-card.c-deep { background: var(--jt-taupe); color: var(--jt-bg); border-color: var(--jt-taupe); }

/* Music videos button: pale warm */
body.jt-page .sub-nav .nav-card.c-pale { background: var(--jt-pale-warm); color: var(--jt-deep); border-color: var(--jt-pale-warm); }

/* Network button: teal */
body.jt-page .sub-nav .nav-card.c-green { background: var(--jt-teal); color: var(--jt-bg); border-color: var(--jt-teal); }

/* Photography button: steel blue */
body.jt-page .sub-nav .nav-card.c-steel { background: var(--jt-steel); color: var(--jt-bg); border-color: var(--jt-steel); }

/* Recordings button: amber */
body.jt-page .sub-nav .nav-card.c-cyan { background: var(--jt-amber); color: var(--jt-bg); border-color: var(--jt-amber); }

/* Releases button: brick red */
body.jt-page .sub-nav .nav-card.c-rose { background: var(--jt-brick); color: var(--jt-bg); border-color: var(--jt-brick); }

/* Works button: gold */
body.jt-page .sub-nav .nav-card.c-yellow { background: var(--jt-gold); color: var(--jt-bg); border-color: var(--jt-gold); }
```

## Existing Color Class → Section Mappings

These are the canonical assignments used across the site. When adding a new artist, follow this mapping or establish a new consistent set.

| Color Class | Section        | Notes                                                |
|-------------|----------------|------------------------------------------------------|
| `c-back`    | ← back         | Transparent with accent border (all artists)         |
| `c-deep`    | about          | Usually a muted/dark tone                           |
| `c-pale`    | music videos   | Usually a light/warm tone                            |
| `c-green`   | network        | Teal or nature green                                 |
| `c-steel`   | photography    | Steel blue                                           |
| `c-cyan`    | recordings     | Amber or warm accent                                 |
| `c-rose`    | releases       | Brick red or rose accent                             |
| `c-yellow`  | works          | Gold or highlight yellow                              |
| `c-orange`  | (back button variant) | Transparent with brand accent color           |
| `c-sky`     | photography (VB) | Sky blue for Vinny Bobarino                        |
| `c-teal`    | recordings (VB) | Nature green for Vinny Bobarino                     |
| `c-brick`   | releases (VB)  | Amber for Vinny Bobarino                             |
| `c-gold`    | works (VB)     | Bulb yellow for Vinny Bobarino                       |

## Checklist When Adding a New Subpage

1. **Index page**: Add the link button with the correct `c-*` class matching its section type
2. **Subpage**: Add the full button row with `c-back` for back + matching `c-*` classes for all sibling links
3. **Shared CSS**: Ensure all `c-*` classes used are defined in the shared CSS file
4. **Per-page CSS**: Add a `[artist]-[page].css` file if the page needs unique styling beyond the shared file

## Per-Artist Shared CSS Files (existing)

- `archive/by-artist/juanito-thompson/juanito-thompson-shared.css`
- `archive/by-artist/thld/thld-shared.css`
- `archive/by-artist/vinny-bobarino/vb-shared.css`

## Color Class Convention Summary

```
c-back   → back button (transparent + accent border)
c-deep   → about
c-pale   → music videos
c-green  → network / events
c-steel  → photography
c-cyan   → recordings
c-rose   → releases
c-yellow → works
```

The key principle: **The same `c-*` class always maps to the same section type across all pages for a given artist.** This creates visual consistency — users always see the same button colors regardless of which page they're on.