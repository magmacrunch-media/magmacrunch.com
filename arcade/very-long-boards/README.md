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

## How fast you go

You never reach a top speed here, you settle at one. Each frame the hill adds
`GRADE * SLOPE_ACCEL` and drag takes back a fraction `DRAG` of what you already have,
so speed converges on `grade x accel / drag` and stays there. `SPEED_RAIL` is a safety
clamp against a pathological slope, not a target — nothing in normal play reaches it.

**SPD is bought with drag, not with a ceiling.** A rider's `speedMult` divides `DRAG`, so a
fast rider genuinely settles higher. It used to scale a cap of `18 x multipliers x 0.25`
— 4.5 for the baseline pairing, against a settling speed of 1.2 — and a cap that never
binds cannot make anyone faster, so every character and board rode at exactly the same
speed.

**Anything asking "how fast is this rider going" measures against `CONFIG.REFERENCE_SPEED`**,
the fastest pairing in the game, and never against the rider's own ceiling. Gate something on
`speed / ownCeiling` and a faster rider reaches any given speed at a *lower* fraction, so
raising SPD quietly buys whatever that gate was protecting. That is exactly what happened to
the stability drain: Party Carl on a Cruiser — billed on the cards as the wildest pairing in
the game, SPD 5 and STAB 1 — held a line 21% *longer* than Office Carl on a Standard.
`REFERENCE_SPEED` is derived from the config rather than written down, so adding a quicker
board re-scales everyone instead of pinning them all at full.

The Godot version documents the same trap in `PlayerManager.ApplyStats`, and avoids it the
same way.

Where it lands now, measured in the browser:

| pairing | | km/h | seconds holding a line |
|---|---|---|---|
| Party Carl / Cruiser | SPD 5, STAB 1 | 69 | 5.4 |
| Dark Carl / Carver | | 50 | 8.2 |
| Office Carl / Standard | SPD 3, STAB 3 | 46 | 9.7 |
| Office Carl / Old School | SPD 1, STAB 5 | 39 | 13.7 |

`stabilityMult` divides the drain as well as multiplying the refill. It only ever helped you
recover before, so a board sold as "steady & stable" was no steadier while you were actually
holding a line — which is the whole thing STAB describes.

## Single source of truth

`CONFIG`, `CHARACTERS` and `BOARDS` in `js/config.js` are the only place a tuning number
lives. The stat bars on both select screens are **generated** from those multipliers rather
than written out in `index.html`, so a card cannot promise a rider something the physics does
not deliver. If you change `speedMult`, the bar moves.

## Testing

There is no test suite in this repo. The website repo runs a Playwright smoke test over
every arcade game, this one included, as part of `npm test` there — so the check happens
after the sync, not before it.
