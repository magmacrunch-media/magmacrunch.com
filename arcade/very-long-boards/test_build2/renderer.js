/**
 * renderer.js — Pseudo-3D road projection & rendering
 *
 * Implements the OutRun/Top Gear style segmented road engine with:
 *  - Full perspective projection including worldY (elevation)
 *  - Hill-crest hidden-surface culling (stops drawing when road goes over a hill)
 *  - Curve accumulation in screen space
 *  - Sky/scenery backdrop
 *  - Distance fog
 *
 * IMPORTS expected from track.js:
 *   SEGMENT_LENGTH, ROAD_WIDTH
 */

import { SEGMENT_LENGTH, ROAD_WIDTH } from './track.js';

// ─── TUNING ──────────────────────────────────────────────────────────────────
const DRAW_DISTANCE     = 300;    // max segments to project per frame
const FOG_DENSITY       = 0.7;    // 0 = no fog, 1 = full fog at draw distance
const RUMBLE_SEGMENTS   = 3;      // how many segs per rumble stripe
const GRASS_STRIPES     = 2;      // alternating grass stripe width in segs
const DOWNHILL_EXAGGERATION = 1.3; // > 1 exaggerates drop speed for arcade feel
const LANE_COUNT        = 3;      // number of lane dividers
const LANE_COLOR        = 'rgba(255,255,255,0.6)';

// ─── SKY / BACKGROUND COLORS ─────────────────────────────────────────────────
const SKY_TOP    = '#1a2a6c';
const SKY_BOTTOM = '#87ceeb';
const MOUNTAIN_COLOR = '#5a7a8a';

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }

function fogBlend(color, fog) {
  // Blend color toward a grey fog color
  const FOG_COLOR = [180, 200, 220];
  const c = parseColor(color);
  return `rgb(${Math.round(lerp(c[0], FOG_COLOR[0], fog))},${Math.round(lerp(c[1], FOG_COLOR[1], fog))},${Math.round(lerp(c[2], FOG_COLOR[2], fog))})`;
}

// Very small colour parser for the 6-hex strings we use
const _colorCache = {};
function parseColor(hex) {
  if (_colorCache[hex]) return _colorCache[hex];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (_colorCache[hex] = [r, g, b]);
}

// ─── PROJECTION ──────────────────────────────────────────────────────────────
/**
 * projectSegment(seg, camera, W, H, horizonOffset) → projected point or null
 *
 * Returns { screenX, screenY, screenW, scale, fog } for the NEAR edge of this
 * segment (the edge closest to the camera). Returns null if behind camera.
 */
function projectSegment(seg, segZ, camera, W, H, horizonOffset) {
  const relZ = segZ - camera.z;
  if (relZ <= 0) return null;   // behind camera

  const scale   = camera.depth / relZ;

  // Standard pseudo-3D projection with elevation
  // screenY shifts UP when worldY is above camera.y (you look up at it)
  // Apply the downhill exaggeration: when camera.y > seg.worldY the segment
  // is below us — we exaggerate that gap so drops feel steeper.
  let deltaYWorld = seg.worldY - camera.y;
  if (deltaYWorld < 0) deltaYWorld *= DOWNHILL_EXAGGERATION;

  const screenX = (W / 2) + scale * (seg.worldX - camera.x) * (W / 2);
  const screenY = (H / 2) - scale * deltaYWorld * (H / 2) + horizonOffset;
  const screenW = scale * ROAD_WIDTH * (W / 2);

  // Fog: linear from 0 at near to FOG_DENSITY at DRAW_DISTANCE
  const fog = Math.min(1, (relZ / (DRAW_DISTANCE * SEGMENT_LENGTH)) * FOG_DENSITY);

  return { screenX, screenY, screenW, scale, fog };
}

// ─── DRAW HELPERS ────────────────────────────────────────────────────────────

/** Filled quadrilateral between two horizontal scan lines of different widths. */
function drawSegmentQuad(ctx, color,
  x1, y1, w1,
  x2, y2, w2) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1 - w1, y1);
  ctx.lineTo(x1 + w1, y1);
  ctx.lineTo(x2 + w2, y2);
  ctx.lineTo(x2 - w2, y2);
  ctx.closePath();
  ctx.fill();
}

/** Full-width horizontal band (for grass / off-road area). */
function drawBand(ctx, color, y1, y2, canvasW) {
  ctx.fillStyle = color;
  ctx.fillRect(0, Math.min(y1, y2), canvasW, Math.abs(y2 - y1) + 1);
}

// ─── SKY & SCENERY ───────────────────────────────────────────────────────────

function drawSky(ctx, W, H, horizonOffset) {
  // Gradient sky
  const grad = ctx.createLinearGradient(0, 0, 0, H / 2 + horizonOffset);
  grad.addColorStop(0,   SKY_TOP);
  grad.addColorStop(1,   SKY_BOTTOM);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Simple mountain silhouette
  const horizonY = H / 2 + horizonOffset;
  ctx.fillStyle = MOUNTAIN_COLOR;
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  // A handful of mountain peaks procedurally placed
  const peaks = [
    [0.05, 0.22], [0.18, 0.35], [0.3, 0.18], [0.42, 0.28],
    [0.55, 0.15], [0.68, 0.32], [0.8, 0.20], [0.93, 0.30], [1.0, 0.22],
  ];
  for (const [px, py] of peaks) {
    ctx.lineTo(px * W, horizonY - py * horizonY * 0.6);
  }
  ctx.lineTo(W, horizonY);
  ctx.closePath();
  ctx.fill();
}

// ─── MAIN RENDER FUNCTION ─────────────────────────────────────────────────────
/**
 * renderRoad(ctx, canvas, camera, track)
 *
 * The complete road rendering pass. Call every frame after updateCamera().
 *   ctx    : CanvasRenderingContext2D
 *   canvas : HTMLCanvasElement
 *   camera : camera object (from camera.js)
 *   track  : segment array (from buildTrack())
 */
export function renderRoad(ctx, canvas, camera, track) {
  const W = canvas.width;
  const H = canvas.height;
  const ho = camera.horizonOffset;

  // ── 1. Sky + scenery ────────────────────────────────────────────────────────
  drawSky(ctx, W, H, ho);

  // ── 2. Find starting segment ─────────────────────────────────────────────────
  const startSegIdx = Math.floor(camera.z / SEGMENT_LENGTH) % track.length;
  const segOffset   = camera.z % SEGMENT_LENGTH;   // partial segment we're in

  // ── 3. Project & draw segments back-to-front ─────────────────────────────────
  // We go from far → near so quads overlap correctly (painter's algorithm).
  // We collect projections first, then draw back-to-front.

  const projected = [];   // { near: proj, far: proj, seg, segIdx }

  let accumX = 0;   // accumulated curve offset in world-X
  let maxScreenY = H + 100;  // hill-crest culling: track highest (lowest number) Y seen
                              // from the bottom. We draw from far-to-near so we track
                              // the minimum screenY seen so far. If a new segment's near
                              // edge would be *below* this minimum, it's hidden.

  for (let i = 0; i < DRAW_DISTANCE; i++) {
    const segIdx = (startSegIdx + i) % track.length;
    const seg    = track[segIdx];

    // World Z of this segment's near (camera-side) edge
    const nearZ = (i - 0) * SEGMENT_LENGTH - segOffset;
    const farZ  = (i + 1) * SEGMENT_LENGTH - segOffset;

    // Accumulate curve into a temporary worldX for projection
    const savedWorldX = seg.worldX;
    seg.worldX = accumX;

    const nearProj = projectSegment(seg, nearZ + camera.z, camera, W, H, ho);

    // Far edge uses the same worldX for now (we'll update accumX after)
    const farProj  = projectSegment(seg, farZ  + camera.z, camera, W, H, ho);

    seg.worldX = savedWorldX;   // restore

    if (!nearProj || !farProj) {
      accumX += seg.curve * 0.5;
      continue;
    }

    // ── Hill crest culling ────────────────────────────────────────────────────
    // We're iterating near→far, but painting far→near.
    // So we build the list forwards and paint it in reverse.
    // Culling check happens in the draw pass below.

    projected.push({
      nearProj,
      farProj,
      seg,
      segIdx,
      loopIdx: i,
      accumX,
    });

    // Accumulate curve for next segment
    accumX += seg.curve * 0.5;
  }

  // ── Draw far-to-near ──────────────────────────────────────────────────────
  // Track the minimum screenY (highest on screen) to cull hidden segments.
  let minScreenY = H + 1;   // start below canvas; anything above this is visible

  for (let i = projected.length - 1; i >= 0; i--) {
    const { nearProj, farProj, seg, segIdx } = projected[i];

    const ny = nearProj.screenY;
    const fy = farProj.screenY;

    // Hill crest culling:
    // When painting from far to near, each segment's FAR edge should be
    // at or above (lower screenY value) the previously painted content.
    // If a segment's far edge is BELOW minScreenY, it's hidden behind a hill.
    if (fy >= minScreenY) continue;   // entirely hidden — skip

    // Clamp near edge too (partial occlusion: just clip — the quad will still
    // look fine because the top portion draws over the sky).
    const effectiveNearY = Math.min(ny, minScreenY);

    // Update minScreenY to the top of this segment's far edge
    minScreenY = Math.min(minScreenY, fy);

    const fog = nearProj.fog;

    // ── Grass band (full-width behind road) ──────────────────────────────────
    const isGrassAlt = Math.floor(segIdx / GRASS_STRIPES) % 2 === 0;
    const grassColor = isGrassAlt ? '#1a6b1a' : '#1f7a1f';
    drawBand(ctx, fogBlend(grassColor, fog), fy, effectiveNearY, W);

    // ── Road quad ────────────────────────────────────────────────────────────
    const isRumble = Math.floor(segIdx / RUMBLE_SEGMENTS) % 2 === 0;
    const roadColor   = fogBlend(isRumble ? seg.colors.road   : seg.colors.road,   fog);
    const rumbleColor = fogBlend(isRumble ? seg.colors.rumble : seg.colors.road, fog);

    // Rumble strips: draw slightly wider quad in rumble color, then road on top
    drawSegmentQuad(ctx, rumbleColor,
      nearProj.screenX, effectiveNearY, nearProj.screenW * 1.18,
      farProj.screenX,  fy,             farProj.screenW  * 1.18);

    drawSegmentQuad(ctx, roadColor,
      nearProj.screenX, effectiveNearY, nearProj.screenW,
      farProj.screenX,  fy,             farProj.screenW);

    // ── Lane dividers ────────────────────────────────────────────────────────
    if (isRumble) {
      ctx.strokeStyle = fogBlend(LANE_COLOR.replace('rgba', 'rgb').replace(',0.6)', ')'), fog);
      ctx.lineWidth   = Math.max(1, nearProj.scale * 8);
      for (let ln = 1; ln < LANE_COUNT; ln++) {
        const t  = (ln / LANE_COUNT) * 2 - 1;   // -1..+1
        const nx = nearProj.screenX + t * nearProj.screenW * 0.8;
        const fx = farProj.screenX  + t * farProj.screenW  * 0.8;
        ctx.beginPath();
        ctx.moveTo(nx, effectiveNearY);
        ctx.lineTo(fx, fy);
        ctx.stroke();
      }
    }
  }
}
