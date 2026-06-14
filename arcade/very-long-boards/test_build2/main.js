/**
 * main.js — Entry point / game loop
 *
 * Wires together: track, camera, renderer, player.
 * Handles input, the RAF loop, and a basic HUD.
 */

import { buildTrack, SEGMENT_LENGTH, ROAD_WIDTH } from './track.js';
import { createCamera, updateCamera, getPlayerLean } from './camera.js';
import { renderRoad } from './renderer.js';
import { drawPlayer } from './player.js';

// ─── CANVAS SETUP ─────────────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

function resize() {
  canvas.width  = Math.min(window.innerWidth,  800);
  canvas.height = Math.min(window.innerHeight, 600);
}
window.addEventListener('resize', resize);
resize();

// ─── BUILD WORLD ──────────────────────────────────────────────────────────────
const track  = buildTrack();
const camera = createCamera(track);

// Initial speed (units/sec along Z).  1 segment = SEGMENT_LENGTH units.
camera.speed = 1400;

// ─── INPUT ────────────────────────────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => { keys[e.key] = true;  });
window.addEventListener('keyup',   e => { keys[e.key] = false; });

// Touch / gamepad stubs (extend as needed)
let touchLeft  = false;
let touchRight = false;
let touchBrake = false;

// On-screen touch zones
canvas.addEventListener('touchstart', e => {
  for (const t of e.changedTouches) {
    const x = t.clientX / canvas.clientWidth;
    if (x < 0.33) touchLeft  = true;
    else if (x < 0.66) touchBrake = true;
    else touchRight = true;
  }
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', e => {
  touchLeft = touchRight = touchBrake = false;
  e.preventDefault();
}, { passive: false });

// ─── GAME STATE ───────────────────────────────────────────────────────────────
const BASE_SPEED  = 1400;   // units/sec
const MAX_SPEED   = 2800;
const ACCEL       = 400;    // units/sec²
const BRAKE_DECEL = 900;
const COAST_DECEL = 200;
const STEER_RATE  = 3000;   // world-X units/sec

let time = 0;   // total elapsed seconds

// ─── HUD ──────────────────────────────────────────────────────────────────────
function drawHUD(speed) {
  const W = canvas.width;
  const H = canvas.height;

  // Speed-o-meter
  ctx.save();
  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = '#fff';
  ctx.shadowColor = '#000';
  ctx.shadowBlur  = 6;
  const kmh = Math.round(speed / 10);
  ctx.fillText(`${kmh} km/h`, 16, 32);

  // Simple speed bar
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(16, 40, 120, 10);
  const barW = (speed / MAX_SPEED) * 120;
  const barColor = speed > MAX_SPEED * 0.75 ? '#f72' : '#4f4';
  ctx.fillStyle = barColor;
  ctx.fillRect(16, 40, barW, 10);

  // Controls hint
  ctx.font = '13px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('↑ accelerate  ↓ brake  ← → steer', 16, H - 14);

  ctx.restore();
}

// ─── MAIN LOOP ────────────────────────────────────────────────────────────────
let lastTimestamp = null;

function frame(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05); // cap at 50ms
  lastTimestamp = timestamp;
  time += dt;

  // ── Input → speed & lateral ────────────────────────────────────────────────
  const accel  = keys['ArrowUp']   || keys['w'] || keys['W'];
  const brake  = keys['ArrowDown'] || keys['s'] || keys['S'] || touchBrake;
  const left   = keys['ArrowLeft'] || keys['a'] || keys['A'] || touchLeft;
  const right  = keys['ArrowRight']|| keys['d'] || keys['D'] || touchRight;

  if (accel) {
    camera.speed = Math.min(MAX_SPEED, camera.speed + ACCEL * dt);
  } else if (brake) {
    camera.speed = Math.max(0, camera.speed - BRAKE_DECEL * dt);
  } else {
    // Coast toward base speed
    if (camera.speed > BASE_SPEED) camera.speed -= COAST_DECEL * dt;
    else if (camera.speed < BASE_SPEED) camera.speed += COAST_DECEL * 0.5 * dt;
  }

  // Lateral steer (moves camera.x which offsets road left/right)
  if (left)  camera.x -= STEER_RATE * dt;
  if (right) camera.x += STEER_RATE * dt;
  // Friction back to centre
  camera.x *= 0.92;

  // ── Camera update ──────────────────────────────────────────────────────────
  updateCamera(camera, track, SEGMENT_LENGTH, dt);

  // ── Render ─────────────────────────────────────────────────────────────────
  renderRoad(ctx, canvas, camera, track);

  // ── Player sprite ──────────────────────────────────────────────────────────
  const { lateralLean, verticalLean } = getPlayerLean(camera, track);
  drawPlayer(ctx, canvas, lateralLean, verticalLean, time);

  // ── HUD ────────────────────────────────────────────────────────────────────
  drawHUD(camera.speed);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
