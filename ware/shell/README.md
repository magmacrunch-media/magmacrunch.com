# ware/shell

Shared chrome for the standalone tool apps — the ones that do **not** load the
site's `style.css` and `nav.js` because they run full-bleed, `overflow: hidden`,
with their own header and footer.

| File | Loaded by |
|---|---|
| `fonts.css` | album-art-maker, media-search, pixel-process, sprite-forge, magnolia/api.html |
| `app-shell.css` | album-art-maker, media-search, pixel-process, sprite-forge, magnolia/api.html |
| `dropdown.css` | album-art-maker, media-search |
| `dropdown.js` | album-art-maker, media-search, pixel-process |
| `toast.css` | album-art-maker, media-search |
| `toast.js` | album-art-maker, media-search |

Site pages (`ware/index.html`, `ware/dev/`, `ware/utilities/`,
`ware/magnolia/index.html`) are not part of this — they use `style.css` and
`nav.js` like the rest of magmacrunch.com.

## The rule: the shell defines tokens, apps override tokens

Load order is always shell first, app second:

```html
<link rel="stylesheet" href="../shell/fonts.css">
<link rel="stylesheet" href="../shell/app-shell.css">
<link rel="stylesheet" href="../shell/dropdown.css">
<link rel="stylesheet" href="css/style.css">
```

Write the tags without a `?v=`; `npm run build:adenosine` stamps content hashes
on them. See "Cache busting" below.

Set overrides on `:root`, **not** on `body.class`. A body class does not
reliably beat a `:root` fallback — the same trap `AGENTS.md` documents for the
nav colour variables.

`app-shell.css` tokens: `--scanline`, `--title-size`, `--title-color`,
`--glitch-speed`, `--glitch-tint-1/2`, `--chrome-tint-1/2`, `--stat-font`,
`--stat-size`, `--footer-pad`, `--backlink-color`, `--backlink-hover`,
`--backlink-glow`, `--backlink-hover-border`, `--notice-accent`.

`dropdown.css` tokens: `--dd-border-w`, `--dd-accent`, `--dd-glow`,
`--dd-glow-open`, `--dd-tint`, `--dd-tint-soft`, `--dd-font-size`, `--dd-arrow`.

`toast.css` tokens: `--toast-accent`, `--toast-bg`, `--toast-hold`.
media-search overrides `--toast-accent` to its `--green`; album-art-maker takes
the default. `--toast-hold` is the on-screen time before the fade — change it
and `LIFETIME_MS` in `toast.js` has to move with it.

Defaults reproduce album-art-maker, so an app that overrides nothing still
looks right.

## The other half of the contract: what the app must define

The list above is what the shell *defines* and you may override. This is the
palette the shell *consumes* and never defines — an app that omits one gets an
invalid `var()` and silently loses that colour:

| Variable | Needed by |
|---|---|
| `--bg` | `app-shell.css` |
| `--surface` | `app-shell.css`, `dropdown.css` |
| `--border` | `app-shell.css`, `dropdown.css` |
| `--text` | `app-shell.css`, `dropdown.css` |
| `--dim` | `app-shell.css`, `dropdown.css` |
| `--accent` | `app-shell.css`, `dropdown.css` |

All five apps already define all six, at the top of their own stylesheet under
a `/* ── PALETTE ── */` banner. Copy that block when starting a new app.

Note `--panel` is *not* on this list. Every app happens to define one, but the
shell never reads it — panels are deliberately app-owned (see below).

## What is deliberately *not* here

`.panel`, `.panel-label`, `.panel-divider` and the form controls stay in each
app's own stylesheet. Their selector names match across apps but the rules do
not: 1px vs 2px borders, `12px 10px` vs `16px` padding, 7px dim labels vs 9px
accent labels. Only five rules were byte-identical across all four stylesheets
before this refactor — the rest needed a token or were genuinely different
designs wearing the same class name. Tokenising the panels would have cost more
in indirection than it saved in lines.

There is no `util.js` here either, and that was a deliberate call rather than an
oversight. Three helpers looked like candidates:

- **`showToast`** — two copies inside media-search (`js/app.js`,
  `js/lightbox.js`) that differed: only one applied the stacking offset, so a
  copy result drew on top of any toast already showing. First merged into
  media-search's own `js/ui.js`, since `.toast` was styled only there and
  splitting a widget across the shell boundary is the coupling the panels were
  kept out to avoid. It moved here once album-art-maker needed one too — at
  which point both halves could come together and the test was satisfied
  honestly: two apps actually render it. See `toast.js`/`toast.css`.
- **`mulberry32`** — two byte-identical copies inside pixel-process
  (`js/effects/corrupt.js`, `js/effects/displace.js`). Merged to `Chain.rng`,
  which every effect file already depends on. It is seeded-PRNG maths, not
  chrome; an *app shell* is the wrong home for it.
- **`hexToRgb`** — pixel-process returns `{r,g,b}` and strips `#` anywhere,
  sprite-forge returns a memoised `[r,g,b]` and assumes a leading `#` because it
  runs per-pixel in a hot loop. Same name, different functions. Left alone, for
  the same reason `exportPNG` is left alone: `album-art-maker/js/canvas.js` takes
  `(elements, filename)` and `pixel-process/js/canvas.js` takes `(filename)` and
  reads module state.

The pattern: duplication *inside* one app gets fixed inside that app. The shell
is for chrome that more than one app actually renders.

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

## Cache busting

`scripts/sync-adenosine.mjs` stamps content-hash `?v=` markers across both
`arcade/**` and `ware/**`. Run it after changing anything in this directory:

```bash
npm run build:adenosine
```

The hash is derived from the bytes actually served, so it cannot drift from
them. Write new tags with no `?v=` at all and the script adds one; it is
idempotent, so a run with nothing changed rewrites nothing.

This used to be manual, and the `?v=1` markers every page carried had never
been bumped once — meaning a change to a shared file here would have served
stale bytes to five pages at a time.

## Fonts

`fonts.css` carries the `@font-face` blocks for Press Start 2P and Courier
Prime, pointing at the repo's own `fonts/`. That is why these pages no longer
hit Google Fonts for them.

It is a separate file from `app-shell.css` for one reason: `url()` resolves
against the stylesheet that contains it, so `../../fonts/` only works while the
file sits exactly two levels below the repo root. That makes it the single
part of the shell tied to this repo's layout, and isolating it means a
consumer elsewhere swaps one small file instead of editing the shell.

A custom property cannot abstract the path away — `var()` does not interpolate
inside `url()`, so `url('var(--font-path)/x.woff2')` requests a file literally
named `var(--font-path)`. Splitting the file is the mechanism that exists.

album-art-maker and pixel-process still load a trimmed Google Fonts link on top
of this: their font pickers offer VT323, Silkscreen, DotGothic16 and Pixelify
Sans, and pixel-process also sets VT323 on its `.sys-stat` chips. Those four are
not self-hosted.
