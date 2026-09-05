# Very Long Boards — browser version

The magmacrunch.com arcade version. Babylon.js, plain script tags, no build step.

Plays at [magmacrunch.com/arcade/very-long-boards](https://magmacrunch.com/arcade/very-long-boards/).

**This folder is the source of truth.** The copy in the website repo at
`arcade/very-long-boards/` is generated from it and carries a `GENERATED.md` saying so.
Edit here, then in the website repo run:

```bash
make sync-very-long-boards
```

which **deletes** `arcade/very-long-boards/` and recopies this folder, then commit the result
there. Anything edited in the website copy is destroyed by the next sync, with no warning and
no conflict.

## It will not run standalone

Opening `index.html` from this folder shows an unstyled, scriptless page, and that is
expected rather than broken. Three of its references point up out of the game folder to
things that only exist in the deployed site:

| Reference | Resolves to |
|-----------|-------------|
| `../shared/arcade-base.css` | the arcade's shared stylesheet |
| `../shared/adenosine-score-client.js` | the site's high-score client |
| `../../favicon.ico`, `../action/` | the site root and the category index |

`george-boole/web/` does the same thing for the same reason: these files are written for
where they are served from, not for where they are edited. To see a change, sync into a
website checkout and open it there.

The `?v=` stamps on those URLs are cache busters maintained by the **website** repo's
pre-commit hook, which rewrites a stale one and stages it with the asset that moved. That
hook does not run here, so a stamp edited in this folder is only a guess — let the website
repo correct it after the sync.

## Layout

Everything is a global on `window`, loaded by ordered `<script>` tags in `index.html`. There
are no modules and no bundler; that is the arcade convention, not an oversight.

| File | Role |
|------|------|
| `js/config.js` | `CONFIG`, `CHARACTERS`, `BOARDS`. **Every tuning number and every stat the cards display.** |
| `js/main.js` | State machine, the render loop, and the select screens. |
| `js/player.js` | Ride physics, stability, tricks, scoring. |
| `js/terrain.js` | Road and ground as two synchronized Babylon ribbons, rebuilt each frame. |
| `js/scene.js` | Engine, camera, lights, fog, sky. |
| `js/scenery.js` | Trees and roadside props. |
| `js/obstacles.js` | What you dodge, and the near-miss test. |
| `js/characters.js` | Canvas sprite drawing for the select-screen previews. |
| `js/garage.js` | The 2D garage backdrop behind the select overlays. |
| `js/particles.js` | Trails, crash and trick bursts. |
| `js/audio.js` | Every sound, synthesized with Web Audio. Nothing is loaded from disk. |
| `js/hud.js` | HUD readouts. |
| `js/input.js` | Keyboard and touch. |

## Single source of truth

`CONFIG`, `CHARACTERS` and `BOARDS` in `js/config.js` are the only place a tuning number
lives. The stat bars on both select screens are **generated** from those multipliers rather
than written out in `index.html`, so a card cannot promise a rider something the physics does
not deliver. If you change `speedMult`, the bar moves.

## Testing

There is no test suite in this repo. The website repo runs a Playwright smoke test over
every arcade game, this one included, as part of `npm test` there — so the check happens
after the sync, not before it.
