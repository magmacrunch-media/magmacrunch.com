/**
 * player.js — Player sprite drawing
 *
 * Draws a Tony Hawk Pro Skater-style skateboarder as a procedural canvas
 * sprite (no image files needed to get started). Swap drawSprite() internals
 * for a real spritesheet when you have art assets.
 *
 * The sprite lives in SCREEN SPACE — it does NOT go through the road projection.
 * Only lean and bob values from the camera module influence its appearance.
 *
 * EXPORTS:
 *   drawPlayer(ctx, canvas, lateralLean, verticalLean, frameTime)
 */

// ─── TUNING ──────────────────────────────────────────────────────────────────
const SPRITE_BASE_Y_FRAC  = 0.82;   // fraction of canvas height for sprite base
const SPRITE_SCALE        = 1.0;    // overall scale multiplier
const BOB_AMPLITUDE       = 4;      // pixels of vertical idle bob
const BOB_SPEED           = 3.5;    // bob frequency (rad/s equivalent, driven by time)
const LEAN_LATERAL_MAX    = 18;     // max pixel horizontal shift from curve lean
const LEAN_VERTICAL_MAX   = 14;     // max pixel vertical shift from slope lean
const TILT_MAX_DEG        = 15;     // max body tilt degrees from lean

// ─── COLORS (SNES palette feel) ──────────────────────────────────────────────
const COL = {
  skin:     '#f5c5a0',
  hair:     '#1a1a2e',
  shirt:    '#e63946',
  pants:    '#2b4590',
  shoes:    '#1a1a1a',
  board:    '#c8941a',
  trucks:   '#888',
  shadow:   'rgba(0,0,0,0.18)',
};

// ─── PROCEDURAL SPRITE ───────────────────────────────────────────────────────
/**
 * drawSprite(ctx, cx, baseY, scale, tiltDeg, vertLean)
 *
 * Draws a stylised THPS skater centred at (cx, baseY).
 * tiltDeg   : lateral body tilt in degrees (+right, -left)
 * vertLean  : -1..+1 forward/back body lean from slope
 */
function drawSprite(ctx, cx, baseY, scale, tiltDeg, vertLean) {
  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(scale, scale);
  ctx.rotate(tiltDeg * Math.PI / 180);

  // Slight forward lean on downhill, back on uphill
  const bodyForward = vertLean * 6;   // px forward

  const S = 1; // inner scale reference

  // ── Ground shadow ──────────────────────────────────────────────────────────
  ctx.fillStyle = COL.shadow;
  ctx.beginPath();
  ctx.ellipse(bodyForward * 0.3, 4, 28, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Skateboard deck ────────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(bodyForward * 0.5, 0);
  ctx.fillStyle = COL.board;
  ctx.beginPath();
  ctx.roundRect(-22, -4, 44, 9, 3);
  ctx.fill();
  // Truck bars
  ctx.fillStyle = COL.trucks;
  ctx.fillRect(-18, -1, 6, 6);
  ctx.fillRect(12,  -1, 6, 6);
  ctx.restore();

  // ── Legs ──────────────────────────────────────────────────────────────────
  ctx.fillStyle = COL.pants;
  // Back leg
  ctx.beginPath();
  ctx.moveTo(bodyForward -  4, -4);
  ctx.lineTo(bodyForward + 10, -4);
  ctx.lineTo(bodyForward + 12, -26);
  ctx.lineTo(bodyForward +  2, -26);
  ctx.closePath();
  ctx.fill();
  // Front leg
  ctx.beginPath();
  ctx.moveTo(bodyForward - 12, -4);
  ctx.lineTo(bodyForward +  2, -4);
  ctx.lineTo(bodyForward -  0, -28);
  ctx.lineTo(bodyForward - 12, -28);
  ctx.closePath();
  ctx.fill();

  // Shoes
  ctx.fillStyle = COL.shoes;
  ctx.fillRect(bodyForward +  1, -28, 14, 7);
  ctx.fillRect(bodyForward - 14, -30, 14, 7);

  // ── Torso ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = COL.shirt;
  ctx.beginPath();
  ctx.moveTo(bodyForward - 10, -28);
  ctx.lineTo(bodyForward +  8, -28);
  ctx.lineTo(bodyForward + 10, -52);
  ctx.lineTo(bodyForward -  8, -52);
  ctx.closePath();
  ctx.fill();

  // ── Arms ──────────────────────────────────────────────────────────────────
  ctx.strokeStyle = COL.shirt;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  // Back arm (lower, behind torso feel)
  ctx.beginPath();
  ctx.moveTo(bodyForward +  6, -44);
  ctx.lineTo(bodyForward + 22, -34);
  ctx.stroke();
  // Front arm (higher, reaching forward for balance)
  ctx.beginPath();
  ctx.moveTo(bodyForward -  6, -44);
  ctx.lineTo(bodyForward - 20, -30);
  ctx.stroke();

  // Hands (dots)
  ctx.fillStyle = COL.skin;
  ctx.beginPath(); ctx.arc(bodyForward + 22, -34, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(bodyForward - 20, -30, 5, 0, Math.PI * 2); ctx.fill();

  // ── Head & helmet ─────────────────────────────────────────────────────────
  // Hair / helmet
  ctx.fillStyle = COL.hair;
  ctx.beginPath();
  ctx.ellipse(bodyForward - 2, -62, 13, 10, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Face
  ctx.fillStyle = COL.skin;
  ctx.beginPath();
  ctx.ellipse(bodyForward - 2, -58, 10, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eye (just one visible at side-on)
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(bodyForward + 4, -59, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ─── SPRITESHEET VERSION (stub for when you have real art) ───────────────────
/**
 * If you have a real spritesheet, replace drawSprite() calls below with:
 *
 *   const frame = selectFrame(lateralLean, verticalLean, animTime);
 *   ctx.drawImage(spriteSheet,
 *     frame.sx, frame.sy, frame.sw, frame.sh,   // source rect
 *     cx - frame.sw/2, baseY - frame.sh,         // dest position
 *     frame.sw * scale, frame.sh * scale);
 *
 * where selectFrame() returns the appropriate sprite frame based on lean state.
 */

// ─── PUBLIC API ──────────────────────────────────────────────────────────────
/**
 * drawPlayer(ctx, canvas, lateralLean, verticalLean, timeSeconds)
 *
 *   ctx          : CanvasRenderingContext2D
 *   canvas       : HTMLCanvasElement
 *   lateralLean  : -1..+1  from getPlayerLean()  (curve lean)
 *   verticalLean : -1..+1  from getPlayerLean()  (slope lean)
 *   timeSeconds  : running time in seconds (drives idle bob)
 */
export function drawPlayer(ctx, canvas, lateralLean, verticalLean, timeSeconds) {
  const W = canvas.width;
  const H = canvas.height;

  // Screen-space centre of the sprite
  const baseCX = W / 2;
  const baseY  = H * SPRITE_BASE_Y_FRAC;

  // Horizontal shift from curve lean
  const shiftX = lateralLean * LEAN_LATERAL_MAX;

  // Vertical shift: downhill pushes sprite down (gravity feel), uphill raises it
  const shiftY = verticalLean * LEAN_VERTICAL_MAX;

  // Idle bob
  const bob = Math.sin(timeSeconds * BOB_SPEED) * BOB_AMPLITUDE;

  // Body tilt: lean INTO curves (like carving)
  const tiltDeg = lateralLean * TILT_MAX_DEG;

  const scale = SPRITE_SCALE * (0.96 + 0.04 * Math.sin(timeSeconds * BOB_SPEED * 0.7));

  drawSprite(
    ctx,
    baseCX + shiftX,
    baseY  + shiftY + bob,
    scale,
    tiltDeg,
    verticalLean,  // forward/back lean amount
  );
}
