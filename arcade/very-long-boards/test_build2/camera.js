/**
 * camera.js — Camera state and update logic
 *
 * The camera is a simple object you pass around:
 * {
 *   x        : float  — world X (lateral position)
 *   y        : float  — world Y (height above ground)
 *   z        : float  — world Z (depth / how far along the track)
 *   depth    : float  — cameraDepth = 1/tan(FOV/2); controls FOV feel
 *   speed    : float  — units per frame along Z
 *   playerZ  : float  — the Z position of the player (typically camera.z + some offset)
 * }
 *
 * TUNING CONSTANTS (edit these to taste):
 */

const HEIGHT_ABOVE_ROAD  = 500;      // base camera height above road surface
const CAMERA_LAG         = 0.08;     // 0=instant snap, 1=never moves. ~0.08 feels good
const HORIZON_LOOKAHEAD  = 20;       // how many segs ahead to average for horizon tilt
const HORIZON_TILT_SCALE = 0.55;     // how aggressively the horizon shifts vertically
const FOV_DEGREES        = 100;      // horizontal field of view
const PLAYER_ROAD_OFFSET = 1.5;      // player sits ~1.5 seg-lengths ahead of camera pivot

/**
 * createCamera(track) → camera object
 * Call once to get initial state. Pass the built track array.
 */
export function createCamera(track) {
  const depth = 1 / Math.tan((FOV_DEGREES * 0.5) * Math.PI / 180);

  return {
    x:          0,
    y:          track[0].worldY + HEIGHT_ABOVE_ROAD,
    z:          0,
    targetY:    track[0].worldY + HEIGHT_ABOVE_ROAD,
    depth:      depth,
    speed:      0,
    // Derived / output values — written by updateCamera, read by renderer
    horizonOffset:  0,   // pixels to shift horizon up/down (+ = up = looking downhill)
    playerSegIdx:   0,   // which segment the player is on
  };
}

/**
 * updateCamera(camera, track, segmentLength, dt)
 *
 * Call every frame BEFORE rendering.
 *   camera       : the camera object (mutated in-place)
 *   track        : segment array from buildTrack()
 *   segmentLength: SEGMENT_LENGTH constant from track.js
 *   dt           : frame delta in seconds (use 1/60 for fixed 60fps)
 */
export function updateCamera(camera, track, segmentLength, dt) {
  const totalLen = track.length * segmentLength;

  // ── Advance Z ──────────────────────────────────────────────────────────────
  camera.z += camera.speed * dt;
  if (camera.z >= totalLen) camera.z -= totalLen;   // loop the track
  if (camera.z < 0)         camera.z += totalLen;

  // ── Which segment is the player on? ───────────────────────────────────────
  const playerZ     = camera.z + PLAYER_ROAD_OFFSET * segmentLength;
  const playerSegRaw = Math.floor(playerZ / segmentLength) % track.length;
  camera.playerSegIdx = (playerSegRaw + track.length) % track.length;
  const playerSeg   = track[camera.playerSegIdx];

  // ── Smooth camera height to road surface + fixed offset ───────────────────
  const desiredY    = playerSeg.worldY + HEIGHT_ABOVE_ROAD;
  camera.y         += (desiredY - camera.y) * CAMERA_LAG;

  // ── Horizon shift based on upcoming slope ─────────────────────────────────
  // Average deltaY over the next N segments; negative avg = downhill.
  let slopeSum = 0;
  for (let i = 1; i <= HORIZON_LOOKAHEAD; i++) {
    const si = (camera.playerSegIdx + i) % track.length;
    slopeSum += track[si].deltaY;
  }
  const avgSlope = slopeSum / HORIZON_LOOKAHEAD;

  // Positive avgSlope = going uphill → horizon moves down.
  // Negative avgSlope = going downhill → horizon moves up (you see more road).
  camera.horizonOffset = -avgSlope * HORIZON_TILT_SCALE * 10;
  // clamp so it doesn't go insane on very steep sections
  camera.horizonOffset = Math.max(-120, Math.min(120, camera.horizonOffset));
}

/**
 * getPlayerLean(camera, track) → { lateralLean, verticalLean }
 *
 * Returns lean values for the player sprite draw function.
 *   lateralLean  : -1..+1  (negative = lean left, positive = lean right)
 *   verticalLean : -1..+1  (negative = lean back/uphill, positive = lean fwd/downhill)
 */
export function getPlayerLean(camera, track) {
  const seg = track[camera.playerSegIdx];

  // Lateral: based on curve value at current position
  const lateralLean = Math.max(-1, Math.min(1, seg.curve * 0.5));

  // Vertical: based on horizon offset (proxy for current slope feel)
  const verticalLean = Math.max(-1, Math.min(1, camera.horizonOffset / 80));

  return { lateralLean, verticalLean };
}
