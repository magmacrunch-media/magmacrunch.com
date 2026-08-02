(function () {
  /* ── CANVAS ── */
  const W = 64, H = 64, CENTER = 32;
  const CRATER_TOP = 28;

  /* ── CALDERA ── */
  const CALDERA_RX = 8, CALDERA_RY = 3;
  const CALDERA_INNER = 0.6;
  const CALDERA_PAD = 2;
  const CALDERA_TOP_BAND = 1.5;

  /* ── MOUNTAIN ── */
  const MOUNTAIN_EXP = 1.2;
  const MOUNTAIN_WIDTH_SCALE = 0.5;
  const MOUNTAIN_BASE = 8;
  const NOISE_A = 12.3, NOISE_B = 45.6, NOISE_THRESHOLD = 0.7;

  /* ── LAVA FLOWS ── */
  const FLOW1_OFFSET = 4, FLOW1_DEPTH = 0.35, FLOW1_FREQ = 0.3;
  const FLOW2_OFFSET = 4, FLOW2_DEPTH = 0.35, FLOW2_FREQ = 0.4;
  const FLOW3_FREQ = 0.15, FLOW3_SPEED_SCALE = 0.5;
  const FLOW_SPEED = 0.1;
  const FLOW_BASE_WIDTH = 1.2, FLOW_DEPTH_SCALE = 0.06;
  const FLOW_AMP = 2;
  const LAVA_TIME_SPEED = 0.15, LAVA_SPACE_SPEED = 0.2;

  /* ── CEREAL PARTICLES ── */
  const CEREAL_SPAWN_INTERVAL = 3;
  const CEREAL_CHANCE_MARSHMALLOW = 0.35;
  const CEREAL_SPAWN_RADIUS = 14;
  const CEREAL_SPAWN_OFFSET = 2;
  const CEREAL_VX_RANGE = 3;
  const CEREAL_VY_MIN = 1.5, CEREAL_VY_RANGE = 3.5;
  const CEREAL_DECAY_MIN = 0.015, CEREAL_DECAY_RANGE = 0.02;
  const CEREAL_GRAVITY = 0.18;

  /* ── LIGHTNING BOLTS ── */
  const BOLT_CHANCE = 0.92;
  const BOLT_X_LEFT_MIN = 2, BOLT_X_RIGHT_MIN = 50, BOLT_X_RANGE = 12;
  const BOLT_Y_MIN = 4, BOLT_Y_RANGE = 16;
  const BOLT_SEG_MIN = 4, BOLT_SEG_RANGE = 4;
  const BOLT_SEG_LENGTH = 5;
  const BOLT_ANGLE_RANGE = 1.2;
  const BOLT_DECAY_MIN = 0.2, BOLT_DECAY_RANGE = 0.1;

  /* ── ANIMATION ── */
  const FRAME_MS = 1000 / 15;

  /* ── COLORS ── */
  const C = {
    mount:     '#1a0505',
    mountDark: '#110206',
    mountOut:  '#ff3d6e',
    lava0:     '#ffe03a',
    lava1:     '#ffad1f',
    bolt:      '#ffe03a',
    cereal:    ['#ff3d6e', '#00f5ff', '#c45fff', '#39ff14', '#ffffff']
  };

  /* ── STATE ── */
  const canvas = document.getElementById('volcano');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  let cerealBits = [], bolts = [], frame = 0;

  /* ── SPAWNERS ── */

  function spawnCereal() {
    const isMarshmallow = Math.random() < CEREAL_CHANCE_MARSHMALLOW;
    cerealBits.push({
      x: CENTER + (Math.random() - 0.5) * CEREAL_SPAWN_RADIUS,
      y: CRATER_TOP - CEREAL_SPAWN_OFFSET,
      vx: (Math.random() - 0.5) * CEREAL_VX_RANGE,
      vy: -(Math.random() * CEREAL_VY_RANGE + CEREAL_VY_MIN),
      life: 1,
      decay: CEREAL_DECAY_MIN + Math.random() * CEREAL_DECAY_RANGE,
      col: isMarshmallow
        ? C.cereal[Math.floor(Math.random() * C.cereal.length)]
        : C.cereal[0],
      gravity: CEREAL_GRAVITY,
      type: isMarshmallow ? 'marshmallow' : 'loop'
    });
  }

  function spawnBolt() {
    const isLeft = Math.random() < 0.5;
    bolts.push({
      x: isLeft
        ? (BOLT_X_LEFT_MIN + Math.random() * BOLT_X_RANGE)
        : (BOLT_X_RIGHT_MIN + Math.random() * BOLT_X_RANGE),
      y: BOLT_Y_MIN + Math.random() * BOLT_Y_RANGE,
      life: 1,
      decay: BOLT_DECAY_MIN + Math.random() * BOLT_DECAY_RANGE,
      segs: BOLT_SEG_MIN + Math.floor(Math.random() * BOLT_SEG_RANGE),
      angle: (Math.PI / 2) + (Math.random() - 0.5) * BOLT_ANGLE_RANGE
    });
  }

  /* ── DRAW ── */

  function drawCaldera() {
    for (let y = CRATER_TOP - CALDERA_RY; y <= CRATER_TOP; y++) {
      for (let x = CENTER - CALDERA_RX - CALDERA_PAD; x <= CENTER + CALDERA_RX + CALDERA_PAD; x++) {
        const dx = (x - CENTER) / CALDERA_RX;
        const dy = (y - CRATER_TOP) / CALDERA_RY;
        const d2 = dx * dx + dy * dy;
        if (d2 <= 1) {
          if (d2 < CALDERA_INNER) {
            ctx.fillStyle = C.lava0;
          } else if (y < CRATER_TOP - CALDERA_RY + CALDERA_TOP_BAND) {
            ctx.fillStyle = C.mountOut;
          } else {
            ctx.fillStyle = C.lava1;
          }
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }

  function calcFlowPosition(depth, offset, depthScale, freq, speedScale) {
    return Math.floor(
      CENTER + offset + depth * depthScale
      + Math.sin(depth * freq - frame * FLOW_SPEED * (speedScale || 1)) * FLOW_AMP
    );
  }

  function pixelColor(x, y, depth, flow1, flow2, flow3) {
    const dist1 = Math.abs(x - flow1);
    const dist2 = Math.abs(x - flow2);
    const dist3 = Math.abs(x - flow3);
    const flowWidth = FLOW_BASE_WIDTH + depth * FLOW_DEPTH_SCALE;

    if (dist1 <= flowWidth || dist2 <= flowWidth || dist3 <= flowWidth) {
      const t = (frame * LAVA_TIME_SPEED + y * LAVA_SPACE_SPEED) % 1;
      return t > 0.5 ? C.lava0 : C.lava1;
    }
    return Math.sin(x * NOISE_A + y * NOISE_B) > NOISE_THRESHOLD
      ? C.mountDark
      : C.mount;
  }

  function drawMountainBody() {
    for (let y = CRATER_TOP; y < H; y++) {
      const depth = y - CRATER_TOP;
      const widthAtY = Math.pow(depth, MOUNTAIN_EXP) * MOUNTAIN_WIDTH_SCALE + MOUNTAIN_BASE;
      const l = Math.floor(CENTER - widthAtY);
      const r = Math.floor(CENTER + widthAtY);

      const flow1 = calcFlowPosition(depth, -FLOW1_OFFSET, -FLOW1_DEPTH, FLOW1_FREQ, 1);
      const flow2 = calcFlowPosition(depth,  FLOW2_OFFSET,  FLOW2_DEPTH, FLOW2_FREQ, 1);
      const flow3 = calcFlowPosition(depth,  0,             0,           FLOW3_FREQ, FLOW3_SPEED_SCALE);

      for (let x = 0; x <= W; x++) {
        if (x >= l && x <= r) {
          if (x === l || x === r) {
            ctx.fillStyle = C.mountOut;
          } else if (y === CRATER_TOP && Math.abs(x - CENTER) < CALDERA_RX) {
            ctx.fillStyle = C.mountOut;
          } else {
            ctx.fillStyle = pixelColor(x, y, depth, flow1, flow2, flow3);
          }
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }

  function drawLoop(x, y) {
    ctx.fillRect(x, y, 3, 3);
    ctx.clearRect(x + 1, y + 1, 1, 1);
  }

  function drawMarshmallow(x, y) {
    ctx.fillRect(x + 1, y, 2, 4);
    ctx.fillRect(x, y + 1, 4, 2);
  }

  function drawCereal() {
    for (const c of cerealBits) {
      if (c.y < H) {
        ctx.fillStyle = c.col;
        const x = Math.floor(c.x), y = Math.floor(c.y);
        if (c.type === 'loop') drawLoop(x, y);
        else drawMarshmallow(x, y);
      }
    }
  }

  function drawBoltSegments(x, y, segs, angle) {
    for (let i = 0; i < segs; i++) {
      const nx = Math.floor(x + Math.cos(angle + (Math.random() - 0.5) * 2) * BOLT_SEG_LENGTH);
      const ny = Math.floor(y + Math.sin(angle) * BOLT_SEG_LENGTH);
      ctx.strokeStyle = C.bolt;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      x = nx;
      y = ny;
    }
  }

  function drawBolts() {
    for (const b of bolts) {
      ctx.globalAlpha = Math.max(0, b.life);
      drawBoltSegments(b.x, b.y, b.segs, b.angle);
    }
    ctx.globalAlpha = 1;
  }

  /* ── UPDATE + RENDER ── */

  function update() {
    if (frame % CEREAL_SPAWN_INTERVAL === 0) spawnCereal();
    if (Math.random() > BOLT_CHANCE) spawnBolt();
    for (const b of bolts) b.life -= b.decay;
    bolts = bolts.filter(b => b.life > 0);
    for (const c of cerealBits) {
      c.x += c.vx;
      c.y += c.vy;
      c.vy += c.gravity;
      c.life -= c.decay;
    }
    // H+5 margin: let particles drift slightly below screen before removing
    cerealBits = cerealBits.filter(c => c.life > 0 && c.y < H + 5);
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    drawBolts();
    drawCaldera();
    drawMountainBody();
    drawCereal();
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
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else {
      lastTime = 0;
      rafId = requestAnimationFrame(loop);
    }
  });

  rafId = requestAnimationFrame(loop);

  window.__pageCleanup = function () {
    cancelAnimationFrame(rafId);
  };
})();
