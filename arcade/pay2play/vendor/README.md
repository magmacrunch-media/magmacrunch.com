# Vendored adenosine

| file | package | version | global |
|---|---|---|---|
| `adenosine-audio.js` | `@magmacrunch/adenosine-audio` | 0.5.0 | `AdAudio` |

Copied verbatim from the package's `dist/index.global.js` in the
[adenosine](https://github.com/magmacrunch-media/adenosine) checkout. It is the
IIFE build, so it defines its global and needs no bundler and no
`type="module"`.

0.5.0 is after adenosine's move to PolyForm Noncommercial 1.0.0 on 2026-10-15,
so this copy is under those terms, the same as this game. The licence asks
that its Required Notice travel with any copy, which is what `NOTICE` beside
this file is for.

## Why a copy and not a CDN

`web/index.html` opens in a browser with no build step, no server and no
network. A CDN script tag would give up the last of those, and ES modules would
give up all three, since a `file://` page cannot satisfy the CORS rules module
scripts are fetched under. This is the arrangement american-spirits uses.

## Keeping it honest

```bash
node tools/vendor.mjs --check   # exit 1 if this copy has drifted
node tools/vendor.mjs           # refresh it from the engine
```

Both find the engine through `$ADENOSINE`, then `../adenosine`, then
`../../engines/adenosine`. The engine's `dist/` is not committed, so run
`npm run build` in `packages/audio` there first: on 2026-10-17 it was still the
pre-0.5.0 build, two days after the source moved on.

**A refresh is an engine upgrade.** Play the game before committing one, and
bump the version in the table above and the `?v=` stamp in `index.html`.

## What the game uses

The loaders and players only, from `web/audio.js`: `loadMusic`, `loadSfx`,
`playMusic`, `playSfx`, the mute setters and `handleVisibility`. Deliberately
not `init()`, for the reason given at the top of `web/audio.js`.
