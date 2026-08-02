(function () {
  const canvas = document.getElementById('cereal-scene');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  ctx.imageSmoothingEnabled = false;
  ctx.scale(2, 2);

  /* ── CANVAS ── */
  const W = 300, H = 256;

  /* ── BOWL ── */
  const BOWL_CENTER_X = 224;
  const BOWL_TOP = 195;
  const BOWL_WIDTH = 55;
  const BOWL_RY = 14;
  const BOWL_DEPTH = 45;
  const BOWL_TAPER = 20;

  /* ── SPOUT ── */
  const SPOUT_X = 145;
  const SPOUT_Y = 85;

  /* ── CEREAL PARTICLES ── */
  const CEREAL_TYPES = ['loop', 'star', 'rock'];
  const CEREAL_SPAWN_X_RANGE = 16;
  const CEREAL_SPAWN_Y_RANGE = 8;
  const CEREAL_VX_MIN = 2.0, CEREAL_VX_RANGE = 2.5;
  const CEREAL_VY_MAX = 0.5, CEREAL_VY_RANGE = 1.5;
  const CEREAL_TARGET_OFFSET = 2, CEREAL_TARGET_RANGE = 10;
  const CEREAL_GRAVITY = 0.35;
  const CEREAL_SPIN_RANGE = 0.25;
  const CEREAL_SPAWN_INTERVAL = 3;
  const CEREAL_FLOAT_AMPLITUDE = 2;
  const CEREAL_FLOAT_SPEED = 0.15;
  const CEREAL_DRIFT_SPEED = 0.005;
  const MAX_CEREAL = 55, MAX_FLOATERS = 32;

  /* ── SPLASH PARTICLES ── */
  const SPLASH_COUNT = 5;
  const SPLASH_VX_RANGE = 4.5;
  const SPLASH_VY_MAX = 2, SPLASH_VY_RANGE = 3.5;
  const SPLASH_DECAY_MIN = 0.07, SPLASH_DECAY_RANGE = 0.05;
  const SPLASH_GRAVITY = 0.42;

  /* ── BOX ── */
  const BOX_X = 110, BOX_Y = 130;
  const BOX_ANGLE = Math.PI / 6;
  const BOX_W = 90, BOX_H = 135;
  const BOX_DX = -20, BOX_DY = -15;
  const BOX_LIP_WIDTH = 18, BOX_LIP_HEIGHT = 15;
  const BOX_TOP_OVERHANG = 8;
  const BOX_TOP_HEIGHT = 22;

  /* ── LIQUID WAVE ── */
  const WAVE_X_FREQ = 0.15, WAVE_TIME_SPEED = 0.1;
  const WAVE_Y_FREQ = 0.2, WAVE_SPACE_SPEED = 0.08;
  const WAVE_HIGH = 0.5, WAVE_LOW = -0.4;

  /* ── VOLCANO BOX ART ── */
  const ART_OUTER_R = 30, ART_INNER_R = 26;
  const ART_CRATER_Y = -10;
  const ART_PEAK_WIDTH = 8;
  const ART_BASE_WIDTH = 20;
  const ART_ERUPTION_HALF_1 = 7, ART_ERUPTION_HALF_2 = 5;

  /* ── ANIMATION ── */
  const TARGET_FPS = 24;
  const FRAME_MS = 1000 / TARGET_FPS;
  const OFFSCREEN_MARGIN = 20;

  /* ── COLORS ── */
  const C = {
    pink:     '#FF3D6E',
    darkPink: '#2D0A0A',
    slate:    '#6A5A52',
    cyan:     '#00F5FF',
    yellow:   '#ffe03a',
    dark:     '#0A0518',
    milk:     '#ffe03a',
    boxBlack: '#09090c',
    boxEdge:  '#ff6cb2',
    boxLabel: '#110006'
  };

  /* ── STATE ── */
  let cerealBits = [];
  let splashes = [];
  let frame = 0;

  /* ── SPAWNERS ── */

  function spawnCereal() {
    const type = CEREAL_TYPES[Math.floor(Math.random() * CEREAL_TYPES.length)];
    let color = C.yellow;
    if (type === 'loop') color = C.pink;
    if (type === 'star') color = C.cyan;

    cerealBits.push({
      x: SPOUT_X + (Math.random() - 0.5) * CEREAL_SPAWN_X_RANGE,
      y: SPOUT_Y + (Math.random() - 0.5) * CEREAL_SPAWN_Y_RANGE,
      vx: Math.random() * CEREAL_VX_RANGE + CEREAL_VX_MIN,
      vy: -(Math.random() * CEREAL_VY_RANGE + CEREAL_VY_MAX),
      col: color,
      type: type,
      targetY: BOWL_TOP + CEREAL_TARGET_OFFSET + Math.random() * CEREAL_TARGET_RANGE,
      floating: false,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * CEREAL_SPIN_RANGE
    });
  }

  function spawnSplash(x, y, color) {
    for (let i = 0; i < SPLASH_COUNT; i++) {
      splashes.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * SPLASH_VX_RANGE,
        vy: -(Math.random() * SPLASH_VY_RANGE + SPLASH_VY_MAX),
        col: color,
        life: 1,
        decay: SPLASH_DECAY_MIN + Math.random() * SPLASH_DECAY_RANGE
      });
    }
  }

  /* ── DRAW: VOLCANO BOX ART ── */

  function drawVolcanoBoxArt(cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);

    /* outer ring */
    ctx.fillStyle = C.cyan;
    ctx.beginPath();
    ctx.arc(0, 0, ART_OUTER_R, 0, Math.PI * 2);
    ctx.fill();

    /* inner disc */
    ctx.fillStyle = C.dark;
    ctx.beginPath();
    ctx.arc(0, 0, ART_INNER_R, 0, Math.PI * 2);
    ctx.fill();

    /* volcano body */
    ctx.fillStyle = C.slate;
    ctx.beginPath();
    ctx.moveTo(-ART_BASE_WIDTH, 16);
    ctx.quadraticCurveTo(-12, 2, -ART_PEAK_WIDTH, ART_CRATER_Y);
    ctx.lineTo(ART_PEAK_WIDTH, ART_CRATER_Y);
    ctx.quadraticCurveTo(12, 2, ART_BASE_WIDTH, 16);
    ctx.fill();

    /* lava flow */
    ctx.fillStyle = C.pink;
    ctx.beginPath();
    ctx.moveTo(-4, ART_CRATER_Y + 1);
    ctx.lineTo(4, ART_CRATER_Y + 1);
    ctx.quadraticCurveTo(7, 0, 5, 7);
    ctx.quadraticCurveTo(0, 10, -5, 7);
    ctx.quadraticCurveTo(-7, 0, -4, ART_CRATER_Y + 1);
    ctx.fill();

    /* crater rim */
    ctx.fillStyle = C.pink;
    ctx.beginPath();
    ctx.ellipse(0, ART_CRATER_Y, 7, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.yellow;
    ctx.beginPath();
    ctx.ellipse(0, ART_CRATER_Y, 5.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    /* eruption particles */
    var t1 = (frame % 14 < ART_ERUPTION_HALF_1);
    var t2 = (frame % 11 < ART_ERUPTION_HALF_2);

    ctx.fillStyle = t1 ? C.yellow : C.pink;
    ctx.fillRect(-1, -14, 2, 2);
    ctx.fillRect(0, -20, 2, 2);

    ctx.fillStyle = t2 ? C.pink : C.cyan;
    ctx.fillRect(-5, -17, 2, 1);
    ctx.fillRect(4, -15, 1, 2);
    ctx.fillRect(-3, -21, 1, 1);
    ctx.fillRect(6, -12, 1, 1);
    ctx.fillRect(-8, -13, 1, 1);

    ctx.fillStyle = C.yellow;
    ctx.fillRect(2, -18, 1, 1);
    ctx.fillRect(-6, -11, 1, 1);

    ctx.restore();
  }

  /* ── DRAW: BOX ── */

  function drawBoxFaces(fx, fy, w, h, dx, dy) {
    ctx.fillStyle = C.boxBlack;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + w, fy);
    ctx.lineTo(fx + w + dx, fy + dy);
    ctx.lineTo(fx + dx, fy + dy);
    ctx.fill();

    ctx.fillStyle = C.darkPink;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx, fy + h);
    ctx.lineTo(fx + dx, fy + h + dy);
    ctx.lineTo(fx + dx, fy + dy);
    ctx.fill();

    ctx.fillStyle = C.pink;
    ctx.fillRect(fx, fy, w, h);

    ctx.fillStyle = C.boxEdge;
    ctx.fillRect(fx, fy, 2, h);

    ctx.fillStyle = C.cyan;
    ctx.fillRect(fx, fy + 12, w, 16);
  }

  function drawBoxLabel(fx, fy, w) {
    ctx.font = '8px "Press Start 2P"';
    ctx.textAlign = 'center';

    ctx.fillStyle = C.boxLabel;
    ctx.fillText('MAGMA', 2, 40);
    ctx.fillText('CRUNCH', 2, 54);

    ctx.fillStyle = C.cyan;
    ctx.fillText('MAGMA', 1, 39);
    ctx.fillText('CRUNCH', 1, 53);

    ctx.fillStyle = C.yellow;
    ctx.fillText('MAGMA', 0, 38);
    ctx.fillText('CRUNCH', 0, 52);

    ctx.strokeStyle = C.pink;
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.moveTo(fx - BOX_LIP_WIDTH, fy - BOX_LIP_HEIGHT);
    ctx.lineTo(fx + w - BOX_LIP_WIDTH, fy - BOX_LIP_HEIGHT);
    ctx.stroke();
  }

  function drawBoxLid(fx, fy, w) {
    ctx.fillStyle = C.darkPink;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + w, fy);
    ctx.lineTo(fx + w - BOX_TOP_OVERHANG, fy - BOX_TOP_HEIGHT);
    ctx.lineTo(fx - 5, fy - BOX_TOP_HEIGHT - 2);
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + w, fy);
    ctx.stroke();
  }

  function drawBox() {
    ctx.save();
    ctx.translate(BOX_X, BOX_Y);
    ctx.rotate(BOX_ANGLE);

    const fx = -BOX_W / 2;
    const fy = -BOX_H / 2;

    drawBoxFaces(fx, fy, BOX_W, BOX_H, BOX_DX, BOX_DY);
    drawVolcanoBoxArt(0, -2);
    drawBoxLabel(fx, fy, BOX_W);
    drawBoxLid(fx, fy, BOX_W);

    ctx.restore();
  }

  /* ── DRAW: BOWL & LIQUID ── */

  function drawLiquidSurface(cx, cy, bw, ry) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, bw - 2, ry - 2, 0, 0, Math.PI * 2);
    ctx.clip();

    for (let y = cy - ry; y <= cy + ry + 10; y += 2) {
      for (let x = cx - bw; x <= cx + bw; x += 2) {
        const wave = Math.sin(x * WAVE_X_FREQ + frame * WAVE_TIME_SPEED)
                   + Math.cos(y * WAVE_Y_FREQ - frame * WAVE_SPACE_SPEED);
        if (wave > WAVE_HIGH) ctx.fillStyle = C.pink;
        else if (wave < WAVE_LOW) ctx.fillStyle = C.cyan;
        else ctx.fillStyle = C.milk;
        ctx.fillRect(x, y, 2, 2);
      }
    }
    ctx.restore();
  }

  function drawBowlBody(cx, cy, bw, ry) {
    ctx.fillStyle = C.slate;
    ctx.beginPath();
    ctx.moveTo(cx + bw, cy);
    ctx.bezierCurveTo(cx + bw, cy + 30, cx + 30, cy + BOWL_DEPTH, cx + BOWL_TAPER, cy + BOWL_DEPTH);
    ctx.lineTo(cx - BOWL_TAPER, cy + BOWL_DEPTH);
    ctx.bezierCurveTo(cx - 30, cy + BOWL_DEPTH, cx - bw, cy + 30, cx - bw, cy);
    ctx.ellipse(cx, cy, bw, ry, 0, Math.PI, 0, true);
    ctx.fill();

    ctx.strokeStyle = C.cyan;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, bw, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    /* highlight reflection */
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(cx - bw + 6, cy + 10);
    ctx.bezierCurveTo(cx - bw + 6, cy + 30, cx - 20, cy + 35, cx - 20, cy + 35);
    ctx.lineTo(cx - 10, cy + 35);
    ctx.bezierCurveTo(cx - 10, cy + 35, cx - bw + 15, cy + 30, cx - bw + 15, cy + 10);
    ctx.fill();
  }

  function drawBowlAndLiquid() {
    const cx = BOWL_CENTER_X;
    const cy = BOWL_TOP;

    /* top ellipse (dark) */
    ctx.fillStyle = C.dark;
    ctx.beginPath();
    ctx.ellipse(cx, cy, BOWL_WIDTH, BOWL_RY, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    drawLiquidSurface(cx, cy, BOWL_WIDTH, BOWL_RY);
    drawBowlBody(cx, cy, BOWL_WIDTH, BOWL_RY);
  }

  /* ── DRAW: CEREAL SHAPES ── */

  function drawLoopShape() {
    ctx.fillRect(-3, -3, 6, 6);
    ctx.clearRect(-1, -1, 2, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(1, 1, 1, 1);
  }

  function drawStarShape() {
    ctx.fillRect(-1, -3, 2, 6);
    ctx.fillRect(-3, -1, 6, 2);
    ctx.fillRect(-2, -2, 1, 1);
    ctx.fillRect(1, 1, 1, 1);
    ctx.fillRect(1, -2, 1, 1);
    ctx.fillRect(-2, 1, 1, 1);
  }

  function drawRockShape() {
    ctx.fillRect(-2, -2, 4, 4);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 1.5, 1.5);
  }

  function drawCereal() {
    for (const c of cerealBits) {
      ctx.save();
      const x = Math.floor(c.x);
      const y = Math.floor(c.y + (c.floating ? Math.sin(frame * CEREAL_FLOAT_SPEED + c.x) * CEREAL_FLOAT_AMPLITUDE : 0));

      ctx.translate(x, y);
      if (!c.floating) ctx.rotate(c.angle);

      ctx.fillStyle = c.col;
      if (c.type === 'loop') drawLoopShape();
      else if (c.type === 'star') drawStarShape();
      else drawRockShape();
      ctx.restore();
    }
  }

  function drawSplashes() {
    for (const s of splashes) {
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.fillStyle = s.col;
      ctx.fillRect(Math.floor(s.x), Math.floor(s.y), 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  /* ── UPDATE + RENDER ── */

  function update() {
    if (frame % CEREAL_SPAWN_INTERVAL === 0) spawnCereal();

    for (const s of splashes) {
      s.x += s.vx;
      s.y += s.vy;
      s.vy += SPLASH_GRAVITY;
      s.life -= s.decay;
    }
    splashes = splashes.filter(s => s.life > 0);

    for (const c of cerealBits) {
      if (!c.floating) {
        c.x += c.vx;
        c.y += c.vy;
        c.vy += CEREAL_GRAVITY;
        c.angle += c.spin;

        if (c.y >= c.targetY && c.x > BOWL_CENTER_X - BOWL_WIDTH && c.x < BOWL_CENTER_X + BOWL_WIDTH) {
          c.floating = true;
          c.y = c.targetY;
          c.vx = 0;
          c.vy = 0;
          spawnSplash(c.x, c.y, Math.random() > 0.5 ? C.pink : C.cyan);
        } else if (c.y > H + OFFSCREEN_MARGIN) {
          c.life = 0;
        }
      } else {
        c.x += (BOWL_CENTER_X - c.x) * CEREAL_DRIFT_SPEED;
      }
    }

    cerealBits = cerealBits.filter(c => c.y <= H + OFFSCREEN_MARGIN && c.life !== 0);
    if (cerealBits.length > MAX_CEREAL) {
      const floaters = cerealBits.filter(c => c.floating);
      if (floaters.length > MAX_FLOATERS) cerealBits.splice(cerealBits.indexOf(floaters[0]), 1);
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    drawBowlAndLiquid();
    drawCereal();
    drawSplashes();
    drawBox();
  }

  /* ── LOOP ── */

  let lastTime = 0, rafId;

  function loop(ts) {
    rafId = requestAnimationFrame(loop);
    if (ts - lastTime < FRAME_MS) return;
    lastTime = ts;
    update();
    render();
    frame++;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(rafId);
    else { lastTime = 0; rafId = requestAnimationFrame(loop); }
  });

  document.fonts.ready.then(() => {
    rafId = requestAnimationFrame(loop);
  });
})();
