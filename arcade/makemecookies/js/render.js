// =====================================================================
// render.js — makemecookies!x4
// Every pixel. Canvas 2D primitives and emoji only; no sprite sheets yet.
//
// Each station draws behind its own draw* function, so swapping any one of
// them for drawImage() off a sprite-forge sheet later is a local edit.
// =====================================================================

const BAY_Y     = 60;
const BAY_H     = 236;   // 60 .. 296
const FLOOR_TOP = 296;
const FLOOR_BOT = 320;
const METER_Y   = 336;
const METER_H   = 8;
const LABEL_Y   = 362;

const PX = "'Press Start 2P', monospace";

// ── small helpers ────────────────────────────────────────────────────

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, font, align) {
  ctx.font = size + 'px ' + (font || PX);
  ctx.fillStyle = color;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}

function glowRect(ctx, x, y, w, h, color, alpha, width) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width || 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.restore();
}

/** Does this station need the player right now? Drives the frame pulse. */
function wantsAttention(st, i) {
  const h = st.hopper, m = st.mixer, b = st.belt, o = st.oven, p = st.pack;
  switch (i) {
    case S.HOPPER: return h.units < HOPPER_PER_MIX || h.units >= HOPPER_MAX - 1;
    case S.MIXER:  return m.phase === 'ready' || m.phase === 'over';
    case S.BELT:   return b.items.some((it) => it.sticky) || b.items.length >= BELT_CAP;
    case S.OVEN:   return o.phase === 'golden' || o.phase === 'burning' || o.phase === 'fire';
    case S.PACK:   return p.tray.length >= TRAY_CAP;
  }
  return false;
}

/**
 * One number and one colour per station: how full, and how worried.
 * This single bar is what makes five simultaneous timers legible — the
 * machines themselves are scenery.
 */
function meterFor(st, T, i) {
  const h = st.hopper, m = st.mixer, b = st.belt, o = st.oven, p = st.pack;
  switch (i) {
    case S.HOPPER:
      return { v: h.units / HOPPER_MAX,
               c: h.units < HOPPER_PER_MIX ? C.danger : h.units >= HOPPER_MAX - 1 ? C.warn : C.ok };
    case S.MIXER:
      if (m.phase === 'idle')   return { v: 0, c: C.steelLo };
      if (m.phase === 'mixing') return { v: m.t / T.mixMs, c: C.ok };
      if (m.phase === 'ready')  return { v: 1 - m.t / T.readyMs, c: C.warn };
      return { v: 1, c: C.danger };
    case S.BELT: {
      const stuck = b.items.some((it) => it.sticky);
      return { v: b.items.length / BELT_CAP,
               c: stuck || b.items.length >= BELT_CAP ? C.danger
                 : b.items.length >= 3 ? C.warn : C.ok };
    }
    case S.OVEN:
      if (o.phase === 'empty')   return { v: 0, c: C.steelLo };
      if (o.phase === 'baking')  return { v: o.t / T.bakeMs, c: C.ok };
      if (o.phase === 'golden')  return { v: 1 - o.t / T.goldenMs, c: C.warn };
      return { v: 1, c: C.danger };
    case S.PACK:
      return { v: p.tray.length / TRAY_CAP,
               c: p.tray.length >= TRAY_CAP ? C.danger : p.tray.length ? C.ok : C.steelLo };
  }
  return { v: 0, c: C.steelLo };
}

// ── backdrop ─────────────────────────────────────────────────────────

function drawBackdrop(ctx, now) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Diner checkerboard floor band.
  for (let x = 0; x < CANVAS_W; x += 24) {
    ctx.fillStyle = ((x / 24) | 0) % 2 ? C.tile : C.panel;
    ctx.fillRect(x, FLOOR_TOP, 24, FLOOR_BOT - FLOOR_TOP);
  }
  ctx.fillStyle = 'rgba(255,46,156,0.35)';
  ctx.fillRect(0, FLOOR_TOP, CANVAS_W, 1);

  // HUD strip under the floor.
  ctx.fillStyle = C.panel;
  ctx.fillRect(0, FLOOR_BOT, CANVAS_W, CANVAS_H - FLOOR_BOT);

  // Flickering neon sign. The flicker is deterministic on `now` so it does
  // not strobe differently for every frame rate.
  const flick = 0.72 + 0.28 * Math.abs(Math.sin(now / 190)) * (Math.sin(now / 47) > -0.9 ? 1 : 0.2);
  ctx.save();
  ctx.globalAlpha = flick;
  ctx.shadowColor = C.neon;
  ctx.shadowBlur = 18;
  text(ctx, 'MAKEMECOOKIES!', CANVAS_W / 2, 50, 20, C.neon);
  ctx.restore();
}

function drawShiftBar(ctx, st) {
  const x = 20, w = CANVAS_W - 40, y = 12, h = 10;
  ctx.fillStyle = C.panel;
  ctx.fillRect(x, y, w, h);

  const p = clamp01(st.elapsed / st.shiftMs);
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, C.sprinkle);
  g.addColorStop(1, C.neon);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w * p, h);

  // Rush windows are telegraphed, not sprung — the fun is bracing for one.
  for (let i = 0; i < RUSH_AT.length; i++) {
    const tx = x + w * RUSH_AT[i];
    const tw = Math.max(3, w * (RUSH_MS / st.shiftMs));
    ctx.fillStyle = st.rush === i ? '#ffffff' : 'rgba(255,46,156,0.85)';
    ctx.fillRect(tx, y - 3, tw, h + 6);
  }

  ctx.strokeStyle = C.steelLo;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

// ── 1 · HOPPER ───────────────────────────────────────────────────────

function drawHopper(ctx, st, b, now) {
  const cx = b.x + b.w / 2;

  // Funnel.
  ctx.beginPath();
  ctx.moveTo(cx - 52, 120);
  ctx.lineTo(cx + 52, 120);
  ctx.lineTo(cx + 14, 232);
  ctx.lineTo(cx - 14, 232);
  ctx.closePath();
  ctx.fillStyle = C.panel;
  ctx.fill();
  ctx.strokeStyle = C.steel;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Flour pips stack from the spout up.
  for (let i = 0; i < st.hopper.units; i++) {
    const t = i / HOPPER_MAX;
    const y = 222 - i * 16;
    const hw = 14 + t * 34;
    ctx.fillStyle = C.dough;
    rr(ctx, cx - hw / 2, y - 11, hw, 11, 2);
    ctx.fill();
  }

  // Pour animation.
  if (now < st.hopper.lockUntil) {
    ctx.fillStyle = 'rgba(242,216,167,0.55)';
    ctx.fillRect(cx - 5, 96, 10, 26);
  }

  text(ctx, 'FLOUR', cx, 110, 8, C.steel);
  if (st.hopper.units < HOPPER_PER_MIX) {
    text(ctx, 'EMPTY', cx, 262, 9, C.danger);
  } else if (st.hopper.units >= HOPPER_MAX - 1) {
    text(ctx, 'FULL', cx, 262, 9, C.warn);
  }
}

// ── 2 · MIXER ────────────────────────────────────────────────────────

function drawMixer(ctx, st, b, now) {
  const cx = b.x + b.w / 2, cy = 200, r = 46;
  const m = st.mixer;

  // Bowl.
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI);
  ctx.closePath();
  ctx.fillStyle = C.panel;
  ctx.fill();
  ctx.strokeStyle = C.steel;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Dough.
  if (m.phase !== 'idle') {
    const tough = m.phase === 'over';
    ctx.beginPath();
    ctx.arc(cx, cy + 8, m.phase === 'mixing' ? 16 : 22, 0, Math.PI * 2);
    ctx.fillStyle = tough ? '#C9A97B' : C.dough;
    ctx.fill();
    if (tough) text(ctx, 'TOUGH', cx, cy + 44, 8, C.danger);
    else if (m.phase === 'ready') text(ctx, 'READY', cx, cy + 44, 8, C.ok);
  }

  // Paddle — only spins while it is actually mixing, so a glance tells you
  // whether the machine is working or waiting on you.
  const a = m.phase === 'mixing' ? now / 90 : Math.PI / 2;
  ctx.save();
  ctx.translate(cx, cy - 6);
  ctx.rotate(a);
  ctx.strokeStyle = C.steel;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, -46);
  ctx.lineTo(0, 24);
  ctx.stroke();
  ctx.restore();

  // Motor housing.
  ctx.fillStyle = C.steelLo;
  ctx.fillRect(cx - 26, 120, 52, 30);
  text(ctx, 'MIX', cx, 141, 9, C.frosting);
}

// ── 3 · CONVEYOR ─────────────────────────────────────────────────────

function drawBelt(ctx, st, b, now) {
  const y = BELT_Y, h = 22;
  const x0 = BELT_X0 - 22, x1 = BELT_X1 + 22;

  ctx.fillStyle = C.steelLo;
  ctx.fillRect(x0, y, x1 - x0, h);

  // Treads scroll at the belt's real speed, so a boost or a jam reads
  // instantly without a label.
  const T = st.__T || { beltPx: 46 };
  const moving = now < st.belt.boostUntil ? T.beltPx * 2.2 : T.beltPx;
  const phase = (now * moving / 1000) % 20;
  ctx.strokeStyle = C.steel;
  ctx.lineWidth = 2;
  for (let x = x0 - 20 + phase; x < x1; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + 8, y);
    ctx.stroke();
  }

  // Rollers.
  for (const rx of [x0, x1]) {
    ctx.beginPath();
    ctx.arc(rx, y + h / 2, h / 2 + 3, 0, Math.PI * 2);
    ctx.fillStyle = C.steel;
    ctx.fill();
  }

  // Dough on the line.
  for (const it of st.belt.items) {
    ctx.beginPath();
    ctx.arc(it.x, y - 11, 12, 0, Math.PI * 2);
    ctx.fillStyle = it.quality === 'tough' ? '#C9A97B' : C.dough;
    ctx.fill();
    if (it.sticky) {
      ctx.strokeStyle = C.danger;
      ctx.lineWidth = 2;
      ctx.stroke();
      text(ctx, '!', it.x, y - 26, 10, C.danger);
    }
  }

  // The most common stall in the game is the oven, not the belt: the lead ball
  // parks at the mouth and the whole line backs up behind a closed door.
  // Pressing 3 does nothing for that, so name the real blocker in the oven's
  // own colour rather than letting it read as a jam (which is red, with a !).
  const head = st.belt.items[0];
  if (head && !head.sticky && head.x >= BELT_X1 - 1 && st.oven.phase !== 'empty') {
    const pulse = 0.45 + 0.55 * Math.abs(Math.sin(now / 130));
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = C.butter;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(head.x, y - 11, 17, 0, Math.PI * 2);
    ctx.stroke();
    const baking = st.oven.phase === 'baking';
    text(ctx, 'OVEN BUSY', BELT_X1 - 44, y - 44, 9, C.butter);
    // Telling them to press 4 while it is still baking would be bad advice —
    // that yields a raw cookie worth nothing. Only say it once pulling pays.
    text(ctx, baking ? 'WAIT' : 'PRESS 4', BELT_X1 - 44, y - 30, 8,
         baking ? C.steel : C.butter);
    ctx.restore();
  }

  if (now < st.belt.boostUntil) {
    text(ctx, '>> BOOST >>', (x0 + x1) / 2, y + 38, 9, C.sprinkle);
  }
}

// ── 4 · OVEN ─────────────────────────────────────────────────────────

const OVEN_GLOW = {
  empty:   'rgba(0,0,0,0)',
  baking:  'rgba(255,140,60,0.35)',
  golden:  'rgba(255,201,60,0.75)',
  burning: 'rgba(120,40,20,0.85)',
  fire:    'rgba(255,60,20,0.95)',
};

function drawOven(ctx, st, b, now) {
  const x = b.x + 8, y = 150, w = b.w - 16, h = 130;
  const o = st.oven;

  ctx.fillStyle = C.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = C.steel;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);

  // Door glow.
  const dx = x + 14, dy = y + 26, dw = w - 28, dh = h - 52;
  ctx.fillStyle = C.burnt;
  ctx.fillRect(dx, dy, dw, dh);
  ctx.fillStyle = OVEN_GLOW[o.phase];
  ctx.fillRect(dx, dy, dw, dh);
  ctx.strokeStyle = C.steelLo;
  ctx.lineWidth = 2;
  ctx.strokeRect(dx, dy, dw, dh);

  if (o.phase !== 'empty' && o.phase !== 'fire') {
    ctx.beginPath();
    ctx.arc(dx + dw / 2, dy + dh / 2, 14, 0, Math.PI * 2);
    ctx.fillStyle = o.phase === 'baking' ? C.dough
      : o.phase === 'golden' ? C.butter : C.burnt;
    ctx.fill();
  }

  if (o.phase === 'fire') {
    ctx.font = '30px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('🔥', dx + dw / 2, dy + dh / 2 + 12);
    const need = FIRE_TAPS - o.taps.filter((t) => now - t < FIRE_TAP_WINDOW).length;
    text(ctx, 'MASH 4 x' + Math.max(1, need), x + w / 2, y + h + 10, 9, C.danger);
  } else if (o.phase === 'burning') {
    ctx.font = '20px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('💨', x + w / 2, y - 6);
    text(ctx, 'BURNING', x + w / 2, y + h + 10, 9, C.danger);
  } else if (o.phase === 'golden') {
    text(ctx, 'PULL IT', x + w / 2, y + h + 10, 9, C.butter);
  }

  text(ctx, 'OVEN', x + w / 2, y + 18, 9, C.butter);
}

// ── 5 · PACKING ──────────────────────────────────────────────────────

function drawPack(ctx, st, b, now) {
  const cx = b.x + b.w / 2;
  const p = st.pack;

  // Table.
  ctx.fillStyle = C.steelLo;
  ctx.fillRect(b.x + 10, 236, b.w - 20, 10);

  // Tray.
  for (let i = 0; i < p.tray.length; i++) {
    const g = p.tray[i];
    const px = b.x + 28 + (i % 2) * 44;
    const py = 226 - ((i / 2) | 0) * 26;
    ctx.beginPath();
    ctx.arc(px, py, 12, 0, Math.PI * 2);
    ctx.fillStyle = g === 'perfect' ? C.butter
      : g === 'seconds' ? '#C9A97B'
      : g === 'raw' ? C.dough : C.burnt;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (g === 'perfect' || g === 'seconds') {
      ctx.fillStyle = C.choc;
      ctx.fillRect(px - 5, py - 3, 3, 3);
      ctx.fillRect(px + 2, py + 1, 3, 3);
      ctx.fillRect(px - 1, py + 5, 3, 3);
    }
  }

  // Boxes leaving.
  ctx.font = '22px system-ui';
  ctx.textAlign = 'center';
  for (const f of p.flying) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - f.t / 900);
    ctx.fillText('📦', f.x + f.t * 0.13, 210 - f.t * 0.05);
    ctx.restore();
  }

  text(ctx, 'PACK', cx, 148, 9, C.neon);
  if (p.tray.length >= TRAY_CAP) text(ctx, 'SHIP IT', cx, 262, 9, C.danger);
  else if (p.tray.length) text(ctx, 'x' + BOX_MULT[p.tray.length], cx, 262, 9, C.butter);
}

// ── station chrome ───────────────────────────────────────────────────

function drawBayChrome(ctx, st, T, i, now) {
  const b = BAYS[i];
  const want = wantsAttention(st, i);
  const pulse = want ? 0.55 + 0.45 * Math.abs(Math.sin(now / 120)) : 0.28;
  glowRect(ctx, b.x, BAY_Y, b.w, BAY_H, b.color, pulse, want ? 2.5 : 1.5);

  // Meter.
  const m = meterFor(st, T, i);
  const mx = b.x + 10, mw = b.w - 20;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(mx, METER_Y, mw, METER_H);
  ctx.fillStyle = m.c;
  ctx.fillRect(mx, METER_Y, mw * clamp01(m.v), METER_H);
  ctx.strokeStyle = C.steelLo;
  ctx.lineWidth = 1;
  ctx.strokeRect(mx + 0.5, METER_Y + 0.5, mw - 1, METER_H - 1);

  // Keycap.
  const kx = b.x + 10, ky = LABEL_Y - 13;
  ctx.fillStyle = want ? b.color : C.tile;
  rr(ctx, kx, ky, 18, 18, 3);
  ctx.fill();
  ctx.strokeStyle = b.color;
  ctx.lineWidth = 1;
  ctx.stroke();
  text(ctx, b.key, kx + 9, ky + 13, 10, want ? C.bg : b.color);

  text(ctx, b.name, kx + 26, LABEL_Y, 9, want ? b.color : C.steel, PX, 'left');
}

// ── overlays ─────────────────────────────────────────────────────────

function drawMessMeter(ctx, st) {
  const w = 220, x = CANVAS_W - w - 20, y = 392, h = 10;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(x, y, w, h);
  const v = clamp01(st.mess / MESS.max);
  ctx.fillStyle = v > 0.75 ? C.danger : v > 0.45 ? C.warn : C.ok;
  ctx.fillRect(x, y, w * v, h);
  ctx.strokeStyle = C.steelLo;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  text(ctx, 'MESS', x - 8, y + 9, 9, C.steel, PX, 'right');
}

function drawFx(ctx, st, now) {
  for (const s of st.fx.spills) {
    const a = Math.max(0, 1 - s.t / 1400);
    ctx.save();
    ctx.globalAlpha = a * 0.8;
    ctx.fillStyle = C.dough;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + 8, 20 + s.t / 40, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (const p of st.fx.pops) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - p.born / 900);
    text(ctx, p.text, p.x, p.y - p.born * 0.03, 11, p.color);
    ctx.restore();
  }
  if (st.fx.toast) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - st.fx.toast.t / 1300);
    text(ctx, st.fx.toast.text, CANVAS_W / 2, 110, 11, st.fx.toast.color);
    ctx.restore();
  }
}

function drawRush(ctx, st, now) {
  if (st.rush < 0) return;
  const a = 0.6 + 0.4 * Math.abs(Math.sin(now / 90));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(255,46,156,0.18)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.shadowColor = C.neon;
  ctx.shadowBlur = 16;
  text(ctx, 'MAKE ME COOKIES!  x' + (st.rush + 1), CANVAS_W / 2, 78, 16, '#ffffff');
  ctx.restore();
}

function drawInspection(ctx, st, now) {
  if (now >= st.inspectUntil) return;
  const left = Math.ceil((st.inspectUntil - now) / 1000);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = 'rgba(255,59,59,0.9)';
  ctx.fillRect(0, 160, CANVAS_W, 90);
  text(ctx, 'HEALTH INSPECTION', CANVAS_W / 2, 200, 20, '#ffffff');
  text(ctx, 'LINE STOPPED — ' + left, CANVAS_W / 2, 228, 11, '#2A0808');
}

// ── the frame ────────────────────────────────────────────────────────

function render() {
  const now = performance.now();
  const T = st.__T || tune(st);

  ctx.save();
  if (st.fx.shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * st.fx.shake,
                  (Math.random() - 0.5) * st.fx.shake);
  }

  drawBackdrop(ctx, now);
  drawShiftBar(ctx, st);

  drawHopper(ctx, st, BAYS[S.HOPPER], now);
  drawMixer(ctx, st, BAYS[S.MIXER], now);
  drawBelt(ctx, st, BAYS[S.BELT], now);
  drawOven(ctx, st, BAYS[S.OVEN], now);
  drawPack(ctx, st, BAYS[S.PACK], now);

  for (let i = 0; i < BAYS.length; i++) drawBayChrome(ctx, st, T, i, now);

  drawMessMeter(ctx, st);
  drawFx(ctx, st, now);
  drawRush(ctx, st, now);
  drawInspection(ctx, st, now);

  ctx.restore();
}
