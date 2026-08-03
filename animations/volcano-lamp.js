(function () {
  /* ── CANVAS ── */
  const W = 400, H = 480, CENTER = 200;
  
  /* ── LAVA LAMP CONTAINER (Linear Taper) ── */
  const LAMP_TOP = 60, LAMP_BOT = 400;
  const LAMP_LIQUID = 'rgba(30, 10, 60, 0.85)';

  function getLampBounds(y) {
    if (y < LAMP_TOP) return { left: CENTER - 40, right: CENTER + 40 };
    if (y > LAMP_BOT) return { left: CENTER - 150, right: CENTER + 150 };
    
    // Linear Taper: steadily getting narrower from bottom to top
    const t = (y - LAMP_TOP) / (LAMP_BOT - LAMP_TOP);
    const radius = 40 + 110 * t; 
    return { left: CENTER - radius, right: CENTER + radius };
  }

  /* ── CALDERA ── */
  const CRATER_TOP = 320; 
  const CALDERA_RX = 28, CALDERA_RY = 8;
  const CALDERA_INNER = 0.5;
  const CALDERA_PAD = 4;
  const CALDERA_TOP_BAND = 4;

  /* ── MOUNTAIN ── */
  const MOUNTAIN_EXP = 1.15;
  const MOUNTAIN_WIDTH_SCALE = 0.8;
  const MOUNTAIN_BASE = 25;

  /* ── LAVA FLOWS ── */
  const FLOW1_OFFSET = 15, FLOW1_DEPTH = 0.5, FLOW1_FREQ = 0.08;
  const FLOW2_OFFSET = -15, FLOW2_DEPTH = 0.6, FLOW2_FREQ = 0.1;
  const FLOW3_FREQ = 0.05, FLOW3_SPEED_SCALE = 0.4;
  const FLOW_SPEED = 0.1;
  const FLOW_BASE_WIDTH = 5.0, FLOW_DEPTH_SCALE = 0.2;
  const FLOW_AMP = 8;
  const LAVA_TIME_SPEED = 0.15, LAVA_SPACE_SPEED = 0.08;

  /* ── CEREAL PARTICLES (Snowglobe × Lava Lamp) ── */
  const CEREAL_SPAWN_INTERVAL = 6;
  const CEREAL_CHANCE_MARSHMALLOW = 0.35;
  const CEREAL_SPAWN_RADIUS = 20;
  const CEREAL_SPAWN_OFFSET = 4;
  const CEREAL_VX_RANGE = 4;
  const CEREAL_VY_MIN = 2, CEREAL_VY_RANGE = 3;
  const CEREAL_DECAY_MIN = 0.0006, CEREAL_DECAY_RANGE = 0.0015;
  const CEREAL_CONVECTION = 0.008;
  const CEREAL_SINK = 0.02;
  const CEREAL_BROWNIAN_X = 0.4;
  const CEREAL_BROWNIAN_Y = 0.2;
  const CEREAL_EDGE_PULL = 0.02;
  const CEREAL_DRIFT_AMP = 0.2;
  const CEREAL_DRIFT_FREQ_Y = 0.02;
  const CEREAL_DRIFT_FREQ_T = 0.05;
  const FLUID_DRAG = 0.975;

  /* ── LIGHTNING BOLTS (Strictly Enclosed) ── */
  const BOLT_CHANCE = 0.95;
  const BOLT_Y_MIN = LAMP_TOP + 15, BOLT_Y_RANGE = 60;
  const BOLT_SEG_MIN = 3, BOLT_SEG_RANGE = 4;
  const BOLT_SEG_LENGTH = 10;
  const BOLT_ANGLE_RANGE = 1.0;
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
    cereal:    ['#ff3d6e', '#00f5ff', '#c45fff', '#39ff14', '#ffffff'],
    metal:     '#8a95a5',
    metalDark: '#4a5462',
    glassHighlight: 'rgba(255, 255, 255, 0.18)'
  };

  /* ── STATE ── */
  const canvas = document.getElementById('volcano');
  canvas.width = W; 
  canvas.height = H;
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
      life: 1.5,
      decay: CEREAL_DECAY_MIN + Math.random() * CEREAL_DECAY_RANGE,
      col: isMarshmallow
        ? C.cereal[Math.floor(Math.random() * C.cereal.length)]
        : C.cereal[0],
      type: isMarshmallow ? 'marshmallow' : 'loop',
      phase: Math.random() * Math.PI * 2,
      drag: 0.96 + Math.random() * 0.025
    });
  }

  function spawnBolt() {
    const yStart = BOLT_Y_MIN + Math.random() * BOLT_Y_RANGE;
    const bounds = getLampBounds(yStart);
    // Keep lightning well clear of the inner glass margins
    const margin = 12;
    const isLeft = Math.random() < 0.5;
    
    bolts.push({
      x: isLeft
        ? (bounds.left + margin + Math.random() * 8)
        : (bounds.right - margin - 8 - Math.random() * 8),
      y: yStart,
      life: 1,
      decay: BOLT_DECAY_MIN + Math.random() * BOLT_DECAY_RANGE,
      segs: BOLT_SEG_MIN + Math.floor(Math.random() * BOLT_SEG_RANGE),
      angle: (Math.PI / 2) + (Math.random() - 0.5) * BOLT_ANGLE_RANGE
    });
  }

  /* ── DRAW ── */
  function drawLampBackground() {
    ctx.fillStyle = LAMP_LIQUID;
    ctx.beginPath();
    for (let y = LAMP_TOP; y <= LAMP_BOT; y++) {
      ctx.lineTo(getLampBounds(y).right, y);
    }
    for (let y = LAMP_BOT; y >= LAMP_TOP; y--) {
      ctx.lineTo(getLampBounds(y).left, y);
    }
    ctx.fill();
  }

  function drawLampForeground() {
    ctx.fillStyle = C.glassHighlight;
    
    // Left glare
    ctx.beginPath();
    for (let y = LAMP_TOP; y <= LAMP_BOT; y++) {
        ctx.lineTo(getLampBounds(y).left + 6, y);
    }
    for (let y = LAMP_BOT; y >= LAMP_TOP; y--) {
        ctx.lineTo(getLampBounds(y).left + 18, y);
    }
    ctx.fill();

    // Right glare
    ctx.beginPath();
    for (let y = LAMP_TOP; y <= LAMP_BOT; y++) {
        ctx.lineTo(getLampBounds(y).right - 6, y);
    }
    for (let y = LAMP_BOT; y >= LAMP_TOP; y--) {
        ctx.lineTo(getLampBounds(y).right - 18, y);
    }
    ctx.fill();

    const topR = getLampBounds(LAMP_TOP).right - CENTER;
    const baseR = getLampBounds(LAMP_BOT).right - CENTER;

    // Metal Cap
    ctx.fillStyle = C.metal;
    ctx.beginPath();
    ctx.moveTo(CENTER - topR - 2, LAMP_TOP);
    ctx.lineTo(CENTER + topR + 2, LAMP_TOP);
    ctx.lineTo(CENTER + 20, LAMP_TOP - 40);
    ctx.lineTo(CENTER - 20, LAMP_TOP - 40);
    ctx.fill();

    // Metal Base
    ctx.beginPath();
    ctx.moveTo(CENTER - baseR - 2, LAMP_BOT);
    ctx.lineTo(CENTER + baseR + 2, LAMP_BOT);
    ctx.lineTo(CENTER + baseR + 25, H - 15);
    ctx.lineTo(CENTER - baseR - 25, H - 15);
    ctx.fill();
    
    ctx.fillStyle = C.metalDark;
    ctx.fillRect(CENTER - baseR - 25, H - 15, (baseR + 25) * 2, 8);
  }

  function drawCaldera() {
    for (let y = CRATER_TOP - CALDERA_RY; y <= CRATER_TOP; y++) {
      const bounds = getLampBounds(y);
      for (let x = CENTER - CALDERA_RX - CALDERA_PAD; x <= CENTER + CALDERA_RX + CALDERA_PAD; x++) {
        if (x < bounds.left || x >= bounds.right) continue;
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
    
    const noise = Math.sin(x * 0.15 + y * 0.25) * Math.sin(x * 0.2 - y * 0.15);
    return noise > 0.2 ? C.mountDark : C.mount;
  }

  function drawMountainBody() {
    for (let y = CRATER_TOP; y < LAMP_BOT; y++) {
      const depth = y - CRATER_TOP;
      let widthAtY = Math.pow(depth, MOUNTAIN_EXP) * MOUNTAIN_WIDTH_SCALE + MOUNTAIN_BASE;
      const maxHalfWidth = getLampBounds(y).right - CENTER - 8;
      widthAtY = Math.min(widthAtY, maxHalfWidth);
      const l = Math.floor(CENTER - widthAtY);
      const r = Math.floor(CENTER + widthAtY);

      const flow1 = calcFlowPosition(depth, -FLOW1_OFFSET, -FLOW1_DEPTH, FLOW1_FREQ, 1);
      const flow2 = calcFlowPosition(depth,  FLOW2_OFFSET,  FLOW2_DEPTH, FLOW2_FREQ, 1);
      const flow3 = calcFlowPosition(depth,  0,             0,           FLOW3_FREQ, FLOW3_SPEED_SCALE);

      const bounds = getLampBounds(y);
      const minX = Math.max(l, Math.floor(bounds.left));
      const maxX = Math.min(r, Math.floor(bounds.right));

      for (let x = minX; x <= maxX; x++) {
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

  function drawLoop(x, y) {
    ctx.fillRect(x, y, 8, 8);
    ctx.clearRect(x + 2, y + 2, 4, 4);
  }

  function drawMarshmallow(x, y) {
    ctx.fillRect(x + 2, y, 6, 10);
    ctx.fillRect(x, y + 2, 10, 6);
  }

  function drawCereal() {
    for (const c of cerealBits) {
      if (c.y < H) {
        ctx.globalAlpha = Math.max(0.1, Math.min(1, c.life)); 
        ctx.fillStyle = c.col;
        const x = Math.floor(c.x), y = Math.floor(c.y);
        if (c.type === 'loop') drawLoop(x, y);
        else drawMarshmallow(x, y);
      }
    }
    ctx.globalAlpha = 1.0;
  }

  function drawBoltSegments(x, y, segs, angle) {
    for (let i = 0; i < segs; i++) {
      let nx = Math.floor(x + Math.cos(angle + (Math.random() - 0.5) * 2) * BOLT_SEG_LENGTH);
      let ny = Math.floor(y + Math.sin(angle) * BOLT_SEG_LENGTH);
      
      const bounds = getLampBounds(ny);
      // Hard clamp lightning safely inside the glass with a 10px buffer
      nx = Math.max(bounds.left + 10, Math.min(bounds.right - 10, nx));
      ny = Math.max(LAMP_TOP + 5, Math.min(CRATER_TOP - 5, ny));
      
      ctx.strokeStyle = C.bolt;
      ctx.lineWidth = 2;
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

  function drawMountainOutline() {
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = CRATER_TOP; y < LAMP_BOT; y++) {
      const depth = y - CRATER_TOP;
      let widthAtY = Math.pow(depth, MOUNTAIN_EXP) * MOUNTAIN_WIDTH_SCALE + MOUNTAIN_BASE;
      const maxHalfWidth = getLampBounds(y).right - CENTER - 8;
      widthAtY = Math.min(widthAtY, maxHalfWidth);
      const x = CENTER - widthAtY;
      y === CRATER_TOP ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let y = CRATER_TOP; y < LAMP_BOT; y++) {
      const depth = y - CRATER_TOP;
      let widthAtY = Math.pow(depth, MOUNTAIN_EXP) * MOUNTAIN_WIDTH_SCALE + MOUNTAIN_BASE;
      const maxHalfWidth = getLampBounds(y).right - CENTER - 8;
      widthAtY = Math.min(widthAtY, maxHalfWidth);
      const x = CENTER + widthAtY;
      y === CRATER_TOP ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function drawLampEdges() {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let y = LAMP_TOP; y <= LAMP_BOT; y++) {
      const b = getLampBounds(y);
      y === LAMP_TOP ? ctx.moveTo(b.left, y) : ctx.lineTo(b.left, y);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let y = LAMP_TOP; y <= LAMP_BOT; y++) {
      const b = getLampBounds(y);
      y === LAMP_TOP ? ctx.moveTo(b.right, y) : ctx.lineTo(b.right, y);
    }
    ctx.stroke();
  }

  /* ── UPDATE + RENDER ── */
  function update() {
    if (frame % CEREAL_SPAWN_INTERVAL === 0) spawnCereal();
    if (Math.random() > BOLT_CHANCE) spawnBolt();
    
    for (const b of bolts) b.life -= b.decay;
    bolts = bolts.filter(b => b.life > 0);
    
    for (const c of cerealBits) {
      // Coherent drift — wave with per-particle phase offset
      const drift = Math.sin(c.y * CEREAL_DRIFT_FREQ_Y + frame * CEREAL_DRIFT_FREQ_T + c.phase) * CEREAL_DRIFT_AMP;
      c.vx += drift;

      // Brownian perturbation — breaks stringy paths
      c.vx += (Math.random() - 0.5) * CEREAL_BROWNIAN_X;
      c.vy += (Math.random() - 0.5) * CEREAL_BROWNIAN_Y;

      // Soft convection — smooth lava lamp circulation
      const yNorm = (c.y - LAMP_TOP) / (LAMP_BOT - LAMP_TOP);
      const convection = Math.sin(yNorm * Math.PI);
      c.vy += convection * CEREAL_CONVECTION - CEREAL_SINK;

      // Lateral circulation — edges pull inward
      const bounds = getLampBounds(c.y);
      const xNorm = (c.x - bounds.left) / (bounds.right - bounds.left);
      c.vx += (xNorm - 0.5) * CEREAL_EDGE_PULL;

      // Integrate with per-particle drag
      c.x += c.vx;
      c.y += c.vy;
      c.vx *= c.drag;
      c.vy *= c.drag;

      c.life -= c.decay;

      // Boundary checks
      if (c.x <= bounds.left + 3) { c.x = bounds.left + 3; c.vx = Math.abs(c.vx) * 0.7; }
      if (c.x + 10 >= bounds.right - 3) { c.x = bounds.right - 13; c.vx = -Math.abs(c.vx) * 0.7; }
      if (c.y <= LAMP_TOP + 4) { c.y = LAMP_TOP + 4; c.vy = Math.abs(c.vy) * 0.4; }
      if (c.y >= LAMP_BOT - 14) { c.y = LAMP_BOT - 14; c.vy = -Math.abs(c.vy) * 0.4; }

      // Mountain collision mechanics
      if (c.y > CRATER_TOP) {
        const depth = c.y - CRATER_TOP;
        let mWidth = Math.pow(depth, MOUNTAIN_EXP) * MOUNTAIN_WIDTH_SCALE + MOUNTAIN_BASE;
        const maxHW = getLampBounds(c.y).right - CENTER - 8;
        mWidth = Math.min(mWidth, maxHW);
        const l = CENTER - mWidth;
        const r = CENTER + mWidth;
        
        const cCenter = c.x + 5;
        
        if (cCenter > l && cCenter < r) {
            if (Math.abs(cCenter - CENTER) < CALDERA_RX) {
               c.vy = -(Math.random() * CEREAL_VY_RANGE + CEREAL_VY_MIN);
               c.y = CRATER_TOP - 6;
               c.life = 1.5; 
            } else {
               if (cCenter < CENTER) {
                   c.x = l - 11;
                   c.vx -= 0.8;
               } else {
                   c.x = r + 1;
                   c.vx += 0.8;
               }
            }
        }
      }
    }
    
    cerealBits = cerealBits.filter(c => c.life > 0 && c.y < LAMP_BOT + 10);
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    
    drawLampBackground();
    drawBolts();
    drawCaldera();
    drawMountainBody();
    drawMountainOutline();
    drawLampEdges();
    drawCereal();
    drawLampForeground();
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