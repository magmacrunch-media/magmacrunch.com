# SNES Downhill Skate — Pseudo-3D Engine

A modular OutRun/Top Gear style pseudo-3D road engine with first-class elevation,
hill-crest culling, and a THPS-style skater sprite.

## File Structure

```
snes-skate/
├── index.html   — HTML shell + canvas
├── main.js      — Game loop, input, HUD (wires all modules)
├── track.js     — Segment data + hand-authorable elevation/curve profiles
├── camera.js    — Camera state, slope tracking, horizon shift
├── renderer.js  — Pseudo-3D projection + road rendering
└── player.js    — Skater sprite (procedural; swap for spritesheet)
```

## Quick Start

Serve the folder from any static file server:

```bash
npx serve .           # Node.js
python3 -m http.server # Python
```

Then open `http://localhost:3000` (or whichever port).

> **Important:** The files use ES Modules (`import`/`export`), so you *must*
> serve from HTTP — opening `index.html` directly as `file://` won't work.

## Controls

| Key | Action |
|-----|--------|
| ↑ / W | Accelerate |
| ↓ / S | Brake |
| ← / A | Steer left |
| → / D | Steer right |
| Touch | Left zone = steer left, centre = brake, right = steer right |

---

## Authoring the Track

All track data lives in **`track.js`**. Two arrays drive everything:

### `ELEVATION_PROFILE`

Each entry is a **section** of consecutive segments:

```js
{ length: 60, type: 'sine', amplitude: 18, frequency: 0.05, bias: -2 }
```

| Field | Effect |
|-------|--------|
| `length` | Number of segments in this section |
| `type` | `'flat'` / `'sine'` / `'drop'` / `'rise'` / `'custom'` |
| `amplitude` | Peak deltaY per segment for sine/drop/rise shapes |
| `frequency` | How quickly sine oscillates (lower = longer hills) |
| `bias` | Constant deltaY added every segment — **negative = net downhill** |
| `customFn` | `(segIdx, t) => deltaY` — only used when `type: 'custom'` |

**Hill tips:**
- A big `rise` section followed immediately by a `drop` creates a classic "crest" — the road
  disappears over the top before slamming down.
- Keep `bias` values moderate (±2–10). Very large biases at DRAW_DISTANCE will
  push the entire road off-screen.

### `CURVE_PROFILE`

```js
{ length: 30, curve: -1.5 }   // left bend, 30 segments long
```

`curve` is the horizontal worldX delta accumulated per segment. Positive = curves right,
negative = curves left. Values around ±1–3 feel good; beyond ±4 it becomes a hairpin.

### Constants to tune

| Constant | File | Effect |
|----------|------|--------|
| `SEGMENT_LENGTH` | track.js | World-unit depth of each segment |
| `ROAD_WIDTH` | track.js | Half-width of road in world units |
| `DRAW_DISTANCE` | renderer.js | Max segments drawn per frame |
| `DOWNHILL_EXAGGERATION` | renderer.js | >1 makes drops feel steeper |
| `HEIGHT_ABOVE_ROAD` | camera.js | Camera height above road surface |
| `CAMERA_LAG` | camera.js | 0 = instant, 1 = never moves |
| `HORIZON_LOOKAHEAD` | camera.js | Segments ahead averaged for horizon tilt |
| `HORIZON_TILT_SCALE` | camera.js | How much horizon shifts on slopes |

---

## Module API Reference

### `track.js`

```js
import { buildTrack, SEGMENT_LENGTH, ROAD_WIDTH, ELEVATION_PROFILE, CURVE_PROFILE } from './track.js';

const track = buildTrack();   // call once; returns segment[]
```

Each segment: `{ index, worldY, worldX, deltaY, curve, colors }`

---

### `camera.js`

```js
import { createCamera, updateCamera, getPlayerLean } from './camera.js';

const camera = createCamera(track);   // call once
camera.speed = 1400;                  // set initial speed (units/sec)

// Every frame:
updateCamera(camera, track, SEGMENT_LENGTH, dt);

// For the player sprite:
const { lateralLean, verticalLean } = getPlayerLean(camera, track);
```

Camera object fields (read/write):
- `camera.x` — lateral position (steer by adjusting this)
- `camera.y` — auto-managed; tracks road surface + lag
- `camera.z` — auto-managed; advances by `camera.speed * dt`
- `camera.speed` — set this from your input handler
- `camera.horizonOffset` — output: pixels to shift horizon (+ = up = downhill)
- `camera.playerSegIdx` — output: which segment the player occupies

---

### `renderer.js`

```js
import { renderRoad } from './renderer.js';

// Every frame, after updateCamera:
renderRoad(ctx, canvas, camera, track);
```

---

### `player.js`

```js
import { drawPlayer } from './player.js';

// Every frame, after renderRoad:
drawPlayer(ctx, canvas, lateralLean, verticalLean, timeSeconds);
```

#### Upgrading to a real spritesheet

Replace the `drawSprite()` call inside `drawPlayer()` with:

```js
const frame = selectFrame(lateralLean, verticalLean, timeSeconds);
ctx.save();
ctx.translate(baseCX + shiftX, baseY + shiftY + bob);
ctx.rotate(tiltDeg * Math.PI / 180);
ctx.drawImage(
  spriteSheet,
  frame.sx, frame.sy, frame.sw, frame.sh,    // source rect on sheet
  -frame.sw / 2, -frame.sh,                  // dest (centred, bottom-anchored)
  frame.sw * SPRITE_SCALE, frame.sh * SPRITE_SCALE
);
ctx.restore();
```

---

## Rendering Pipeline (per frame)

```
buildTrack()  ──→  track[]  (once, at startup)
                       │
            ┌──────────┴──────────┐
            │                     │
   updateCamera()           renderRoad()
   • advance camera.z       • drawSky()
   • lerp camera.y          • project segments (far→near)
   • compute horizonOffset  • hill-crest culling
   • compute playerSegIdx   • draw grass/road/rumble/lanes
            │
   getPlayerLean()
            │
        drawPlayer()
   • screen-space sprite
   • lateral + vertical lean
   • idle bob
            │
        drawHUD()
```

## Known Limitations / Next Steps

- **No sprite collision** with road edges — add a `camera.x` clamp based on `ROAD_WIDTH * currentScale`.
- **No object rendering** (trees, signs, cars) — add a `scenery[]` array per segment and project them similarly to road edges.
- **Track doesn't loop perfectly** — the elevation accumulates so the end of the
  track may not match the start's worldY. Either author a matching end section,
  or add a "reset worldY on loop" correction in `updateCamera`.
- **No audio** — hook `camera.speed` and `camera.horizonOffset` into a Web Audio
  API engine sound for full SNES vibes.
