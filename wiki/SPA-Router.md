The Single-Page Application router is built into `nav.js`. It intercepts link clicks, fetches pages via AJAX, and swaps content without full page reloads.

---

## How It Works

1. User clicks a link
2. Router intercepts the click (if eligible)
3. Fetches target page HTML via `fetch()`
4. Parses the response with `DOMParser`
5. Swaps `<main>` content
6. Manages CSS/script lifecycle
7. Updates browser history

## Excluded Paths

These paths trigger full page loads:

```js
const EXCLUDE_PATHS = ['/arcade/', '/by-contributor/', '/by-label/', '/tools/'];
```

## Eligibility Check

A link is SPA-eligible if:
- Not `target="_blank"` or `download`
- Not `mailto:`, `tel:`, or `#` links
- Same origin
- Not in excluded paths
- Not the current page

## CSS Management

- **Global CSS** (style.css, archive.css, jukebox.css, fonts/) — never removed
- **Page-specific CSS** — removed when navigating away, added for new page
- **Inline styles** — tagged with `data-spa` attribute for lifecycle management
- **Template-injected styles** — the `<style>` tags that `templates/*.js` append at
  runtime; they carry no `data-spa` attribute and are torn down with the rest

```js
const GLOBAL_CSS_PATTERNS = [
    'style.css',
    'assets/archive.css',
    'assets/jukebox.css',
    'assets/search.css',
    'assets/counter.css',
    'assets/dorfic-palette.css',
    'assets/app-pages.css',
    'fonts/'
];
```

### Ordering invariant — never tear down CSS before the content swap

**The outgoing page stays on screen for the entire duration of the fetch.** Removing
its stylesheets at the top of `navigate()` therefore leaves the *currently visible*
page unstyled until the new content lands.

This matters more than it sounds on archive pages. `GLOBAL_CSS_PATTERNS` does **not**
cover the per-artist/per-place `{prefix}-shared.css`, and that file holds the palette
(`:root { --fm-sky: … }`). Drop it and every `var(--…)` reference in the visible page
goes invalid at once: the page title falls back to the `archive.css` default yellow and
the breadcrumb reverts from `position: relative` to `position: absolute`, jumping to the
top-left corner over the content. That is the "flash of raw HTML" bug.

`swapCSS()` therefore **collects** the outgoing nodes rather than deleting them, and
returns a handle:

```js
const css = swapCSS(doc, url);   // appends the new sheets, removes nothing yet
await css.ready;                 // wait for the new sheets to load

// ── COMMIT ── one synchronous block, no await inside, so the browser
//             cannot paint a half-swapped page
document.body.className = doc.body.className;
mainEl.innerHTML = newMain.innerHTML;
curFooter.innerHTML = newFooter.innerHTML;
css.dropStale();                 // only now is the old CSS removed
```

Two properties make this safe:

- New sheets are appended **after** the outgoing ones, so during the brief overlap the
  incoming rules win on source order at equal specificity — the cascade behaves exactly
  as it does on a cold load.
- `document.body.className` is set **inside** the commit block. Setting it earlier would
  strip the old content's `body.{prefix}-page` scoping while that content is still
  visible, which de-styles it just as effectively as removing the stylesheet.

Measured on a navigation with `fetch` delayed 800ms: the old ordering left a **1089 ms**
window with the template styles removed; the commit-block ordering leaves **0 ms**
(removals and content swap land on the same millisecond).

**Do not** move `dropStale()`, the body-class assignment, or the `innerHTML` swaps out
of that block, and do not introduce an `await` between them.

## Script Management

Scripts are categorized and handled differently:

1. **Config scripts** (`window.*_CONFIG = ...`) — run first, re-execute on navigation
2. **External scripts** (CDN, MathJax) — loaded once, not re-loaded
3. **Init scripts** — run after content swap

### MathJax Handling

Special case for MathJax config — macros are merged without destroying runtime:

```js
if (t.includes('MathJax') && t.includes('tex')) {
    // Merge macros into existing config
    Object.assign(MathJax.config.tex.macros, cfg.tex.macros);
}
```

## Page Cleanup

Before navigating, the router calls `window.__pageCleanup()` if defined. This allows pages to clean up timers, animations, etc.

```js
window.__pageCleanup = function () {
    cancelAnimationFrame(rafId);
};
```

## Back/Forward Support

```js
window.addEventListener('popstate', function (e) {
    navigate(location.href, false);
});
```

## Audio Persistence

The jukebox widget persists across navigations. If missing after a swap, it's re-injected:

```js
if (!document.querySelector('.mcj') && window.__jukeboxReady) {
    await window.__jukeboxReady;
    if (typeof window.__initJukeboxPlayer === 'function') {
        window.__initJukeboxPlayer();
    }
}
```

## Chat Widget

Hidden on non-arcade pages after SPA navigation:

```js
const chatWidget = document.getElementById('arcadeChatWidget');
if (chatWidget) {
    chatWidget.style.display = url.includes('/arcade/') ? '' : 'none';
}
``` 
