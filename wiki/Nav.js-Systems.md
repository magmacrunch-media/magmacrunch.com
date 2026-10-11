`nav.js` (751 lines) is the shared script loaded on every non-arcade page. Beyond generating the navigation bar, it orchestrates several site-wide systems.

## Overview

| System | Lines | Description |
|--------|-------|-------------|
| Auto-Nav Generator | 56–85 | Generates nav HTML from `NAV_CONFIG` |
| Auto-Favicon | 92–102 | Injects favicon based on page depth |
| Mobile Hamburger | 109–153 | Dropdown toggle + active state |
| Archive Sub-Nav | 172–228 | Auto-generates sibling navigation for archive subpages |
| Jukebox Loader | 257–302 | Loads `jukebox.css`, then `jukebox.js` |
| Search Loader | 305–336 | Loads `search.css`, then `search.js` |
| Counter Loader | 346–360 | Loads `counter-client.js`, fires `increment()` |
| Absolutize HREFs | 363–380 | Converts nav links to absolute paths for SPA |
| SPA Router | 383–751 | Full SPA with CSS/script lifecycle management |

> There is no font loader in `nav.js`. Fonts come from the `@import` on line 1 of
> `style.css`; a duplicate loader here was removed as redundant.

## Auto-Nav Generator

Reads `window.NAV_CONFIG` and generates the nav bar HTML into `<nav id="auto-nav">`.

### NAV_CONFIG Structure

```js
window.NAV_CONFIG = {
    brand: { href: './', text: 'magmacrunch.com' },
    sections: [
        { label: 'home', href: './' },
        { label: 'music', href: 'music/', items: [
            { href: 'music/jukebox/', label: 'jukebox' },
            // ...
        ]},
    ]
};
```

Sections with `items[]` become dropdown menus. The `data-depth` attribute on `<nav>` sets the base path prefix.

## Auto-Favicon

Injects `<link rel="icon" href="{depth}favicon.ico">` if no favicon already exists in `<head>`.

## Archive Sub-Nav

Auto-generates sibling navigation for archive subpages.

### Usage

```html
<main data-siblings="events,personnel,recordings,works">
```

### Color Map

| Sibling | Color Class |
|---------|-------------|
| `events` | `c-rose` |
| `recordings` | `c-cyan` |
| `releases` | `c-cyan` |
| `works` | `c-purple` |
| `personnel` | `c-green` |
| `about` | `c-yellow` |
| `members` | `c-green` |
| `photography` | `c-orange` |

The back button color defaults to `c-orange` but can be overridden:

```html
<main data-siblings="events,recordings" data-back-color="c-cyan">
```

### Inject Priority

1. Replace existing `.sub-nav` inside `.page-header`
2. Insert after `.page-title` inside `.page-header`
3. Append to `.page-header`
4. Prepend to `<main>`

## Service Loaders

Each loader follows the same pattern:
1. Check for `<nav>` element
2. Check for opt-out class on `<body>`
3. Compute root path from `window.location.pathname`
4. Inject `<link>` for CSS (if not already present), keeping a promise for its `load`
5. Inject `<script>` for JS **only once that promise resolves**

### Why step 5 waits on step 4

The CSS `<link>` and the JS `<script>` are two independent requests with no ordering
guarantee. `jukebox.js` builds the entire widget and appends it to `<body>` on
`DOMContentLoaded`, so whenever the script won the race — likely with a warm JS cache
and a cold CSS cache — roughly 40 nodes of widget markup painted **in normal document
flow at default font size** (visible `▶ ◀◀ ▶▶ 0:00 / 0:00` text at the bottom of the
page) before snapping to `position: fixed`, jolting scroll height with it.

Gating the script on the stylesheet removes the race:

```js
let cssReady;
if (!document.querySelector('link[href*="jukebox.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = root + 'assets/jukebox.css';
    cssReady = new Promise((resolve) => {
        link.addEventListener('load', resolve, { once: true });
        link.addEventListener('error', resolve, { once: true });   // never hang
    });
    document.head.appendChild(link);
} else {
    cssReady = Promise.resolve();
}

window.__jukeboxReady = cssReady.then(() => new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = root + 'assets/jukebox.js';
    script.onload = resolve;
    script.onerror = resolve;
    document.body.appendChild(script);
}));
```

The `error` listener resolves too, so a missing stylesheet degrades to the old
behaviour instead of blocking the widget forever. The search loader uses the same
shape. This fires on **every** page, not just the archive.

### Opt-Out Classes

| Class | Disables |
|-------|----------|
| `no-jukebox` | Jukebox mini-player |
| `no-search` | Search modal |
| `no-counter` | Hit counter |

### Jukebox Loader Special Behavior

Returns a `Promise` via `window.__jukeboxReady` so the SPA router can await it before re-injecting the widget.

## SPA Router

Full single-page application router. See [SPA Router](SPA-Router) for complete documentation.

### Key Behaviors

- Intercepts same-site `<a>` clicks
- Fetches target page, parses HTML, swaps `<main>` content
- Manages CSS lifecycle: page-specific styles removed/added, global styles preserved
- Executes config scripts (`window.*_CONFIG`), external scripts, and init scripts
- Handles MathJax config merging for scientific pages
- Calls `window.__pageCleanup()` before navigation
- Re-injects jukebox widget after navigation if DOM was swapped

### Excluded Paths

These paths trigger full page loads instead of SPA navigation:

```
/arcade/
/by-contributor/
/by-label/
/tools/
```

### Global CSS (Never Removed)

```js
['style.css', 'assets/archive.css', 'assets/jukebox.css',
 'assets/search.css', 'assets/counter.css', 'assets/dorfic-palette.css',
 'assets/app-pages.css', 'fonts/']
```

## `window.__pageCleanup` Pattern

Pages can register a cleanup function that runs before SPA navigation:

```js
window.__pageCleanup = function() {
    // Save state, pause audio, clear intervals, etc.
};
```

Used by:
- Jukebox (saves state, pauses audio)
- Guestbook (stops polling interval)
- Homepage (stops canvas animation)
- Scientific pages (stops MathJax observers) 
