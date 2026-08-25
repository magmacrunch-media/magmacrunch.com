# ware/shell

Shared chrome for the standalone tool apps — the ones that do **not** load the
site's `style.css` and `nav.js` because they run full-bleed, `overflow: hidden`,
with their own header and footer.

| File | Loaded by |
|---|---|
| `app-shell.css` | album-art-maker, media-search, pixel-process, magnolia/api.html |
| `dropdown.css` | album-art-maker, media-search |
| `dropdown.js` | album-art-maker, media-search, pixel-process |

Site pages (`ware/index.html`, `ware/dev/`, `ware/utilities/`,
`ware/magnolia/index.html`) are not part of this — they use `style.css` and
`nav.js` like the rest of magmacrunch.com.

## The rule: the shell defines tokens, apps override tokens

Load order is always shell first, app second:

```html
<link rel="stylesheet" href="../shell/app-shell.css?v=1">
<link rel="stylesheet" href="../shell/dropdown.css?v=1">
<link rel="stylesheet" href="css/style.css?v=4">
```

Set overrides on `:root`, **not** on `body.class`. A body class does not
reliably beat a `:root` fallback — the same trap `AGENTS.md` documents for the
nav colour variables.

`app-shell.css` tokens: `--scanline`, `--title-size`, `--title-color`,
`--glitch-speed`, `--glitch-tint-1/2`, `--chrome-tint-1/2`, `--stat-font`,
`--stat-size`, `--footer-pad`, `--backlink-color`, `--backlink-hover`,
`--backlink-glow`, `--backlink-hover-border`, `--notice-accent`.

`dropdown.css` tokens: `--dd-border-w`, `--dd-accent`, `--dd-glow`,
`--dd-glow-open`, `--dd-tint`, `--dd-tint-soft`, `--dd-font-size`, `--dd-arrow`.

Defaults reproduce album-art-maker, so an app that overrides nothing still
looks right.

## What is deliberately *not* here

`.panel`, `.panel-label`, `.panel-divider` and the form controls stay in each
app's own stylesheet. Their selector names match across apps but the rules do
not: 1px vs 2px borders, `12px 10px` vs `16px` padding, 7px dim labels vs 9px
accent labels. Only five rules were byte-identical across all four stylesheets
before this refactor — the rest needed a token or were genuinely different
designs wearing the same class name. Tokenising the panels would have cost more
in indirection than it saved in lines.

pixel-process does not load `dropdown.css` for the same reason. Its option list
is `position: fixed` and toggles `display` instead of animating `max-height`,
because it has to escape a clipping panel. It shares `dropdown.js`, which
detects the fixed positioning and places the list itself.

## dropdown.js

```js
RetroDropdown.setup(idOrElement, onSelect, { markActive: true });
RetroDropdown.getValue(idOrElement, fallback);   // fallback defaults to null
RetroDropdown.setValue(idOrElement, value);
```

`markActive: false` skips moving the `.active` class — pixel-process passes it
because its dropdowns are action menus ("ADD EFFECT → BLUR" appends to a chain)
rather than value pickers, so a sticky highlight would be misleading.

`getValue`'s fallback differs by app on purpose: album-art-maker wants `null`
(its call site does `|| 'Press Start 2P'`), media-search wants `'all'`.

## Cache busting is manual here

`scripts/sync-adenosine.mjs` stamps content-hash `?v=` on `arcade/**` only.
Nothing stamps `ware/`. When you change a file in this directory, **bump the
`?v=` on every page that links it** — a stale shared file breaks four pages at
once instead of one.

## Fonts

`app-shell.css` carries the `@font-face` blocks for Press Start 2P and Courier
Prime, pointing at the repo's own `fonts/`. That is why these pages no longer
hit Google Fonts for them.

album-art-maker and pixel-process still load a trimmed Google Fonts link: their
font pickers offer VT323, Silkscreen, DotGothic16 and Pixelify Sans, and
pixel-process also sets VT323 on its `.sys-stat` chips. Those four are not
self-hosted.
