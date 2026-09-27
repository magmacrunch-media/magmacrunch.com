// Volcano lava-lamp animation, desktop version.
// (See volcano-pixel.js for the 64x64 mobile fallback.)
//
// Drawn at 200x240 and displayed at exactly 2x, so it is genuine pixel art
// rather than the 400x480 buffer squeezed into 340px it used to be. Halving
// the resolution also quartered the per-pixel cost, which is what pays for the
// blobs and the bigger volcano below.
//
// The liquid, its underlight and the cylindrical edge shading never change, so
// they are baked once into `staticBuf` and copied into the frame buffer each
// tick. Only the caldera and the mountain are rasterised per frame; everything
// in front of them (blobs, bolts, cereal, glass, metal) is ordinary canvas 2D.
//
// Layer order, back to front:
//   1. liquid + underlight + edge shading   (baked, Uint32Array)
//   2. caldera and mountain body            (per frame, same buffer)
//   3. wax blobs                            ('lighter', above the crater only)
//   4. lightning bolts
//   5. cereal particles
//   6. glass glares, metal cap, metal base  (always on top)
(function () {
  /* ── CANVAS ── */
  const W = 200, H = 240, CENTER = 100;

  /* ── LAMP SILHOUETTE ──
     A lava lamp is a vase, not a cone: it holds a narrow neck most of the way
     down and only then flares. TAPER_EXP is what produces that concave flare.
     At 1 the glass is a straight-sided tent, which is what this read as before. */
  const LAMP_TOP = 23, LAMP_BOT = 206;
  const NECK_R = 21, BASE_R = 66;
  const TAPER_EXP = 1.6;

  const CAP_TOP = 8;
  const BASE_BOT = 234;

  // Left/right glass edges at a given y. Cached per row, since every drawing
  // pass and the particle physics all ask for the same 240 answers.
  const boundsL = new Float32Array(H);
  const boundsR = new Float32Array(H);
  (function precomputeBounds() {
    for (let y = 0; y < H; y++) {
      let r;
      if (y < LAMP_TOP) r = NECK_R;
      else if (y > LAMP_BOT) r = BASE_R;
      else {
        const t = (y - LAMP_TOP) / (LAMP_BOT - LAMP_TOP);
        r = NECK_R + (BASE_R - NECK_R) * Math.pow(t, TAPER_EXP);
      }
      boundsL[y] = CENTER - r;
      boundsR[y] = CENTER + r;
    }
  })();

  function lampRadius(y) {
    const yi = y < 0 ? 0 : y > H - 1 ? H - 1 : y | 0;
    return boundsR[yi] - CENTER;
  }

  /* ── CALDERA ── */
  const CRATER_TOP = 126;
  const CALDERA_RX = 13, CALDERA_RY = 4;
  const CALDERA_INNER = 0.5;
  const CALDERA_TOP_BAND = 2;

  /* ── MOUNTAIN ──
     Half-width is expressed as a fraction of the glass radius at that row
     rather than as an absolute curve, so the cone always lands inside the
     glass with MOUNTAIN_INSET to spare however the silhouette is retuned.
     The old version clamped an absolute curve against the glass instead, which
     is why the peak sat in the bottom quarter with the clamp doing the work. */
  const PEAK_HW = 10;
  const MOUNTAIN_INSET = 3;
  const MOUNTAIN_EXP = 1.5;
  const MOUNTAIN_FILL = 0.78;

  const mountHW = new Float32Array(H);
  (function precomputeMountain() {
    const span = LAMP_BOT - CRATER_TOP;
    for (let y = CRATER_TOP; y <= LAMP_BOT; y++) {
      const t = (y - CRATER_TOP) / span;
      const room = ((boundsR[y] - CENTER) - MOUNTAIN_INSET - PEAK_HW) * MOUNTAIN_FILL;
      mountHW[y] = PEAK_HW + room * Math.pow(t, MOUNTAIN_EXP);
    }
  })();

  /* ── LAVA FLOWS ── */
  const FLOW1_OFFSET = 6, FLOW1_DEPTH = 0.22, FLOW1_FREQ = 0.16;
  const FLOW2_OFFSET = 6, FLOW2_DEPTH = 0.24, FLOW2_FREQ = 0.20;
  const FLOW3_FREQ = 0.10, FLOW3_SPEED_SCALE = 0.4;
  const FLOW_SPEED = 0.1;
  const FLOW_BASE_WIDTH = 1.5, FLOW_DEPTH_SCALE = 0.035;
  const FLOW_AMP = 3;
  const LAVA_TIME_SPEED = 0.12, LAVA_SPACE_SPEED = 0.07;

  /* ── UNDERLIGHT ──
     Warm light from the crater bleeding up through the liquid. Without it the
     column above the volcano is flat and dead, which was most of what made the
     old lamp read as empty space. */
  const GLOW_REACH = 64;
  const GLOW_WIDTH = 26;
  const GLOW_R = 68, GLOW_G = 24, GLOW_B = 6;

  /* ── WAX BLOBS ──
     The thing a lava lamp actually does. Each blob rises and sinks on its own
     sine, confined to the liquid above the crater so it never has to be
     composited against the mountain. */
  const BLOB_COUNT = 4;
  const BLOB_TOP = LAMP_TOP + 8;
  const BLOB_BOT = CRATER_TOP - 6;

  /* ── CEREAL PARTICLES (snowglobe x lava lamp) ── */
  const CEREAL_SPAWN_INTERVAL = 5;
  const CEREAL_MAX = 26;
  // Frames of physics run before the first paint. A piece takes about a
  // hundred frames to climb the column, so without this the lamp is empty
  // for the first half-minute somebody looks at it.
  const WARMUP_FRAMES = 260;
  const CEREAL_CHANCE_MARSHMALLOW = 0.35;
  const CEREAL_SPAWN_RADIUS = 10;
  const CEREAL_SPAWN_OFFSET = 3;
  const CEREAL_VX_RANGE = 2.0;
  const CEREAL_VY_MIN = 2.0, CEREAL_VY_RANGE = 2.4;
  const CEREAL_DECAY_MIN = 0.0015, CEREAL_DECAY_RANGE = 0.0030;
  const CEREAL_CONVECTION = 0.010;
  const CEREAL_SINK = 0.013;
  const CEREAL_BROWNIAN_X = 0.2;
  const CEREAL_BROWNIAN_Y = 0.1;
  const CEREAL_EDGE_PULL = 0.012;
  const CEREAL_DRIFT_AMP = 0.1;
  const CEREAL_DRIFT_FREQ_Y = 0.04;
  const CEREAL_DRIFT_FREQ_T = 0.05;
  const CEREAL_SIZE = 4;

  /* ── LIGHTNING BOLTS ── */
  const BOLT_CHANCE = 0.80;
  const BOLT_Y_MIN = LAMP_TOP + 8, BOLT_Y_RANGE = 70;
  const BOLT_SEG_MIN = 3, BOLT_SEG_RANGE = 4;
  const BOLT_SEG_LENGTH = 6;
  const BOLT_ANGLE_RANGE = 1.0;
  const BOLT_DECAY_MIN = 0.16, BOLT_DECAY_RANGE = 0.1;
  const BOLT_MARGIN = 5;

  /* ── ANIMATION ── */
  const FRAME_MS = 1000 / 15;

  /* ── COLORS ── */
  const C = {
    mount:      '#1a0505',
    mountDark:  '#110206',
    mountMid:   '#2d0a0a',
    mountOut:   '#ff3d6e',
    lava0:      '#ffe03a',
    lava1:      '#ffad1f',
    lavaOrange: '#ff6a00',
    lavaDeep:   '#cc2200',
    bolt:       '#ffe03a',
    cereal:     ['#ff3d6e', '#00f5ff', '#c45fff', '#39ff14', '#ffffff'],
    metal:      '#9a8878',
    metalDark:  '#3d3028',
    glassHighlight: 'rgba(255, 255, 255, 0.16)'
  };

  // Liquid gradient endpoints, cool at the neck and slightly warmer at the base.
  const LIQ_TOP = [18, 8, 40];
  const LIQ_BOT = [44, 14, 54];
  const EDGE_SHADE = 0.42;

  /* ── STATE ── */
  const canvas = document.getElementById('volcano');
  if (!canvas) return;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const img = ctx.createImageData(W, H);
  const buf = new Uint32Array(img.data.buffer);
  const staticBuf = new Uint32Array(W * H);

  let cerealBits = [], bolts = [], blobs = [], frame = 0;

  /* ── PIXEL HELPERS ──
     Uint32Array over the ImageData buffer is 0xAABBGGRR on little-endian
     machines, which is every browser target here. */
  function rgb(r, g, b) {
    return (255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
  }
  function hexToU32(hex) {
    const n = parseInt(hex.slice(1), 16);
    return rgb((n >> 16) & 255, (n >> 8) & 255, n & 255);
  }

  const U = {
    mount:      hexToU32(C.mount),
    mountDark:  hexToU32(C.mountDark),
    mountMid:   hexToU32(C.mountMid),
    mountOut:   hexToU32(C.mountOut),
    lava0:      hexToU32(C.lava0),
    lava1:      hexToU32(C.lava1),
    lavaOrange: hexToU32(C.lavaOrange),
    lavaDeep:   hexToU32(C.lavaDeep)
  };

  /* ── BAKE THE LIQUID ──
     Runs once. Vertical gradient, then the crater underlight, then a
     cylindrical falloff toward the glass so the column reads as round. */
  (function bakeLiquid() {
    const span = LAMP_BOT - LAMP_TOP;
    for (let y = LAMP_TOP; y <= LAMP_BOT; y++) {
      const t = (y - LAMP_TOP) / span;
      const baseR = LIQ_TOP[0] + (LIQ_BOT[0] - LIQ_TOP[0]) * t;
      const baseG = LIQ_TOP[1] + (LIQ_BOT[1] - LIQ_TOP[1]) * t;
      const baseB = LIQ_TOP[2] + (LIQ_BOT[2] - LIQ_TOP[2]) * t;

      // Underlight centred on the crater row. It has to fade downward as
      // well as up: cutting it off flat at the crater drew a hard horizontal
      // seam across the liquid either side of the mountain.
      const reach = y <= CRATER_TOP ? GLOW_REACH : GLOW_REACH * 0.45;
      const d = Math.abs(CRATER_TOP - y) / reach;
      const gy = d < 1 ? (1 - d) * (1 - d) : 0;

      const left = Math.round(boundsL[y]);
      const right = Math.round(boundsR[y]);
      const radius = boundsR[y] - CENTER;
      const row = y * W;

      for (let x = left; x <= right; x++) {
        if (x < 0 || x >= W) continue;
        const dx = (x - CENTER) / GLOW_WIDTH;
        const g = gy * Math.exp(-dx * dx);

        const edge = Math.abs(x - CENTER) / radius;
        const shade = 1 - EDGE_SHADE * edge * edge * edge;

        const r = baseR * shade + GLOW_R * g;
        const gg = baseG * shade + GLOW_G * g;
        const b = baseB * shade + GLOW_B * g;

        staticBuf[row + x] = rgb(
          r > 255 ? 255 : r,
          gg > 255 ? 255 : gg,
          b > 255 ? 255 : b
        );
      }
    }
  })();

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
      drag: 0.955 + Math.random() * 0.03
    });
  }

  function spawnBolt() {
    const yStart = BOLT_Y_MIN + Math.random() * BOLT_Y_RANGE;
    const r = lampRadius(yStart);
    const isLeft = Math.random() < 0.5;
    const inset = BOLT_MARGIN + Math.random() * Math.max(2, r * 0.3);
    bolts.push({
      x: isLeft ? CENTER - r + inset : CENTER + r - inset,
      y: yStart,
      life: 1,
      decay: BOLT_DECAY_MIN + Math.random() * BOLT_DECAY_RANGE,
      segs: BOLT_SEG_MIN + Math.floor(Math.random() * BOLT_SEG_RANGE),
      angle: (Math.PI / 2) + (Math.random() - 0.5) * BOLT_ANGLE_RANGE
    });
  }

  (function seedBlobs() {
    const warm = ['255,106,0', '255,61,110', '255,173,31', '196,95,255'];
    for (let i = 0; i < BLOB_COUNT; i++) {
      blobs.push({
        phase: (i / BLOB_COUNT) * Math.PI * 2,
        speed: 0.0042 + Math.random() * 0.0032,
        rBase: 10 + Math.random() * 8,
        sway: 3 + Math.random() * 5,
        swaySpeed: 0.7 + Math.random() * 0.8,
        col: warm[i % warm.length]
      });
    }
  })();

  /* ── DRAW: BUFFER PASSES ── */

  // Crater mouth: bright core, an accent band along the top lip, deep lava ring.
  function drawCaldera() {
    for (let y = CRATER_TOP - CALDERA_RY; y <= CRATER_TOP; y++) {
      const row = y * W;
      const dy = (y - CRATER_TOP) / CALDERA_RY;
      const dy2 = dy * dy;
      for (let x = CENTER - CALDERA_RX; x <= CENTER + CALDERA_RX; x++) {
        const dx = (x - CENTER) / CALDERA_RX;
        const d2 = dx * dx + dy2;
        if (d2 > 1) continue;
        buf[row + x] =
          d2 < CALDERA_INNER ? U.lava0
          : y < CRATER_TOP - CALDERA_RY + CALDERA_TOP_BAND ? U.mountOut
          : U.lavaDeep;
      }
    }
  }

  function calcFlowPosition(depth, offset, depthScale, freq, speedScale) {
    return CENTER + offset + depth * depthScale
      + Math.sin(depth * freq - frame * FLOW_SPEED * speedScale) * FLOW_AMP;
  }

  // Within flowWidth of a stream: three-frame lava cycle; otherwise a
  // noise-based three-tone rock texture.
  function pixelColor(x, y, depth, flow1, flow2, flow3) {
    const flowWidth = FLOW_BASE_WIDTH + depth * FLOW_DEPTH_SCALE;
    if (Math.abs(x - flow1) <= flowWidth
      || Math.abs(x - flow2) <= flowWidth
      || Math.abs(x - flow3) <= flowWidth) {
      const t = (frame * LAVA_TIME_SPEED + y * LAVA_SPACE_SPEED) % 1;
      return t < 0.33 ? U.lava0 : t < 0.66 ? U.lava1 : U.lavaOrange;
    }
    const noise = Math.sin(x * 0.3 + y * 0.5) * Math.sin(x * 0.4 - y * 0.3);
    return noise > 0.4 ? U.mountDark : noise > 0.1 ? U.mountMid : U.mount;
  }

  function drawMountainBody() {
    for (let y = CRATER_TOP; y <= LAMP_BOT; y++) {
      const depth = y - CRATER_TOP;
      const hw = mountHW[y];
      const l = Math.round(CENTER - hw);
      const r = Math.round(CENTER + hw);
      const row = y * W;

      const flow1 = calcFlowPosition(depth, -FLOW1_OFFSET, -FLOW1_DEPTH, FLOW1_FREQ, 1);
      const flow2 = calcFlowPosition(depth, FLOW2_OFFSET, FLOW2_DEPTH, FLOW2_FREQ, 1);
      const flow3 = calcFlowPosition(depth, 0, 0, FLOW3_FREQ, FLOW3_SPEED_SCALE);

      for (let x = l; x <= r; x++) {
        if (x < 0 || x >= W) continue;
        if (x === l || x === r) {
          buf[row + x] = U.mountOut;
        } else if (y === CRATER_TOP && Math.abs(x - CENTER) < CALDERA_RX) {
          buf[row + x] = U.mountOut;
        } else {
          buf[row + x] = pixelColor(x, y, depth, flow1, flow2, flow3);
        }
      }
    }
  }

  /* ── DRAW: CANVAS PASSES ── */

  // Clips everything that follows to the inside of the glass, so blobs and
  // bolts cannot escape the lamp however their own maths drifts.
  function clipToGlass() {
    ctx.beginPath();
    ctx.moveTo(boundsR[LAMP_TOP], LAMP_TOP);
    for (let y = LAMP_TOP; y <= LAMP_BOT; y++) ctx.lineTo(boundsR[y], y);
    for (let y = LAMP_BOT; y >= LAMP_TOP; y--) ctx.lineTo(boundsL[y], y);
    ctx.closePath();
    ctx.clip();
  }

  function drawBlobs() {
    ctx.save();
    clipToGlass();
    ctx.globalCompositeOperation = 'lighter';
    const mid = (BLOB_TOP + BLOB_BOT) / 2;
    const amp = (BLOB_BOT - BLOB_TOP) / 2;
    for (const b of blobs) {
      const p = b.phase + frame * b.speed;
      const y = mid + Math.sin(p) * amp;
      const x = CENTER + Math.sin(p * b.swaySpeed) * b.sway;
      // Squash on the way up, stretch on the way down: cheap wax behaviour.
      const stretch = 1 + Math.cos(p) * 0.28;
      const r = b.rBase * (1 + Math.sin(p * 1.7) * 0.18);

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, stretch);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2);
      grad.addColorStop(0, 'rgba(' + b.col + ',0.6)');
      grad.addColorStop(0.32, 'rgba(' + b.col + ',0.34)');
      grad.addColorStop(0.62, 'rgba(' + b.col + ',0.1)');
      grad.addColorStop(1, 'rgba(' + b.col + ',0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, r * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawBoltSegments(x, y, segs, angle) {
    for (let i = 0; i < segs; i++) {
      let nx = x + Math.cos(angle + (Math.random() - 0.5) * 2) * BOLT_SEG_LENGTH;
      let ny = y + Math.sin(angle) * BOLT_SEG_LENGTH;
      ny = Math.max(LAMP_TOP + 3, Math.min(CRATER_TOP - 3, ny));
      const r = lampRadius(ny) - BOLT_MARGIN;
      nx = Math.max(CENTER - r, Math.min(CENTER + r, nx));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      x = nx;
      y = ny;
    }
  }

  function drawBolts() {
    if (!bolts.length) return;
    ctx.save();
    clipToGlass();
    ctx.lineCap = 'round';
    for (const b of bolts) {
      const a = Math.max(0, b.life);
      // Wide soft pass first, hairline core second. The old single 2px stroke
      // disappeared into the liquid.
      ctx.globalAlpha = a * 0.45;
      ctx.strokeStyle = C.lava1;
      ctx.lineWidth = 4;
      drawBoltSegments(b.x, b.y, b.segs, b.angle);
      ctx.globalAlpha = a * 0.9;
      ctx.strokeStyle = C.bolt;
      ctx.lineWidth = 2;
      drawBoltSegments(b.x, b.y, b.segs, b.angle);
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#fff6c2';
      ctx.lineWidth = 1;
      drawBoltSegments(b.x, b.y, b.segs, b.angle);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawLoop(x, y) {
    ctx.fillRect(x, y, CEREAL_SIZE, CEREAL_SIZE);
    ctx.clearRect(x + 2, y + 2, CEREAL_SIZE - 4, CEREAL_SIZE - 4);
  }

  function drawMarshmallow(x, y) {
    ctx.fillRect(x + 1, y, CEREAL_SIZE - 2, CEREAL_SIZE + 1);
    ctx.fillRect(x, y + 1, CEREAL_SIZE + 1, CEREAL_SIZE - 1);
  }

  function drawCereal() {
    ctx.save();
    clipToGlass();
    // A dim wide copy underneath reads as the piece catching the lamp light.
    for (const c of cerealBits) {
      ctx.globalAlpha = Math.max(0.05, Math.min(1, c.life)) * 0.35;
      ctx.fillStyle = c.col;
      ctx.fillRect(Math.round(c.x) - 1, Math.round(c.y) - 1, CEREAL_SIZE + 3, CEREAL_SIZE + 3);
    }
    for (const c of cerealBits) {
      ctx.globalAlpha = Math.max(0.1, Math.min(1, c.life));
      ctx.fillStyle = c.col;
      const x = Math.round(c.x), y = Math.round(c.y);
      if (c.type === 'loop') drawLoop(x, y);
      else drawMarshmallow(x, y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Glass glares plus the metal cap and base. Always last: this is the
  // hardware in front of the liquid.
  function drawLampForeground() {
    ctx.fillStyle = C.glassHighlight;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      for (let y = LAMP_TOP; y <= LAMP_BOT; y++) {
        ctx.lineTo(CENTER + side * (lampRadius(y) - 3), y);
      }
      for (let y = LAMP_BOT; y >= LAMP_TOP; y--) {
        ctx.lineTo(CENTER + side * (lampRadius(y) - 9), y);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Bright edge line: sells the glass sitting in front of the volcano.
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      for (let y = LAMP_TOP; y <= LAMP_BOT; y++) {
        const x = CENTER + side * lampRadius(y);
        if (y === LAMP_TOP) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const topR = NECK_R;
    const baseR = BASE_R;

    ctx.fillStyle = C.metal;
    ctx.beginPath();
    ctx.moveTo(CENTER - topR - 2, LAMP_TOP + 1);
    ctx.lineTo(CENTER + topR + 2, LAMP_TOP + 1);
    ctx.lineTo(CENTER + 13, CAP_TOP);
    ctx.lineTo(CENTER - 13, CAP_TOP);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(CENTER - baseR - 2, LAMP_BOT - 1);
    ctx.lineTo(CENTER + baseR + 2, LAMP_BOT - 1);
    ctx.lineTo(CENTER + baseR + 10, BASE_BOT - 5);
    ctx.lineTo(CENTER - baseR - 10, BASE_BOT - 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = C.metalDark;
    ctx.fillRect(CENTER - baseR - 10, BASE_BOT - 5, (baseR + 10) * 2, 4);
    // Seam highlights so the two metal pieces are not flat slabs.
    ctx.fillRect(CENTER - topR - 2, LAMP_TOP - 1, (topR + 2) * 2, 2);
    ctx.fillRect(CENTER - baseR - 2, LAMP_BOT - 2, (baseR + 2) * 2, 2);
  }

  /* ── UPDATE ── */
  function update() {
    if (frame % CEREAL_SPAWN_INTERVAL === 0 && cerealBits.length < CEREAL_MAX) spawnCereal();
    if (Math.random() > BOLT_CHANCE) spawnBolt();

    for (const b of bolts) b.life -= b.decay;
    bolts = bolts.filter(b => b.life > 0);

    for (const c of cerealBits) {
      const drift = Math.sin(c.y * CEREAL_DRIFT_FREQ_Y + frame * CEREAL_DRIFT_FREQ_T + c.phase) * CEREAL_DRIFT_AMP;
      c.vx += drift;
      c.vx += (Math.random() - 0.5) * CEREAL_BROWNIAN_X;
      c.vy += (Math.random() - 0.5) * CEREAL_BROWNIAN_Y;

      // Sink pulls down everywhere, convection lifts and peaks mid-column,
      // so a piece rises off the crater, hangs, and comes back down onto the
      // slope. Both signs were inverted against their names before, which made
      // CEREAL_SINK a constant lift: every piece ended up pinned in a line
      // under the metal cap with nothing to bring it back.
      const yNorm = (c.y - LAMP_TOP) / (LAMP_BOT - LAMP_TOP);
      c.vy += CEREAL_SINK - Math.sin(yNorm * Math.PI) * CEREAL_CONVECTION;

      const r = lampRadius(c.y);
      const xNorm = (c.x - (CENTER - r)) / (2 * r);
      c.vx -= (xNorm - 0.5) * CEREAL_EDGE_PULL;

      c.x += c.vx;
      c.y += c.vy;
      c.vx *= c.drag;
      c.vy *= c.drag;
      c.life -= c.decay;

      const left = CENTER - r + 2, right = CENTER + r - 2;
      if (c.x <= left) { c.x = left; c.vx = Math.abs(c.vx) * 0.7; }
      if (c.x + CEREAL_SIZE >= right) { c.x = right - CEREAL_SIZE; c.vx = -Math.abs(c.vx) * 0.7; }
      if (c.y <= LAMP_TOP + 3) { c.y = LAMP_TOP + 3; c.vy = Math.abs(c.vy) * 0.4; }
      if (c.y >= LAMP_BOT - CEREAL_SIZE - 2) { c.y = LAMP_BOT - CEREAL_SIZE - 2; c.vy = -Math.abs(c.vy) * 0.4; }

      // Mountain collision: over the caldera it re-erupts, over a slope it is
      // deflected down the outer face.
      if (c.y > CRATER_TOP && c.y <= LAMP_BOT) {
        const hw = mountHW[Math.min(LAMP_BOT, c.y | 0)];
        const l = CENTER - hw, rr = CENTER + hw;
        const cx = c.x + CEREAL_SIZE / 2;
        if (cx > l && cx < rr) {
          if (Math.abs(cx - CENTER) < CALDERA_RX) {
            c.vy = -(Math.random() * CEREAL_VY_RANGE + CEREAL_VY_MIN);
            c.y = CRATER_TOP - CEREAL_SIZE;
            c.life = 1.5;
          } else if (cx < CENTER) {
            c.x = l - CEREAL_SIZE - 1;
            c.vx -= 0.5;
          } else {
            c.x = rr + 1;
            c.vx += 0.5;
          }
        }
      }
    }

    cerealBits = cerealBits.filter(c => c.life > 0 && c.y < LAMP_BOT + 6);
  }

  /* ── RENDER ── */
  function render() {
    buf.set(staticBuf);
    drawCaldera();
    drawMountainBody();
    ctx.clearRect(0, 0, W, H);
    ctx.putImageData(img, 0, 0);
    drawBlobs();
    drawBolts();
    drawCereal();
    drawLampForeground();
  }

  /* ── LOOP ── */
  let lastTime = 0, rafId = 0;

  function loop(ts) {
    // Stop when the canvas is no longer in the document. The SPA router in
    // nav.js swaps <main> out from under us, and window.__pageCleanup cannot
    // be relied on to tell us: it is a single global slot, and assets/jukebox.js
    // claims it too, from a script nav.js injects after the page's own. Whoever
    // writes last wins, so a page-owned cleanup is routinely clobbered.
    if (!canvas.isConnected) { rafId = 0; return; }
    rafId = requestAnimationFrame(loop);
    if (ts - lastTime < FRAME_MS) return;
    lastTime = ts;
    update();
    render();
    frame++;
  }

  function onVisibility() {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    } else if (!rafId) {
      lastTime = 0;
      rafId = requestAnimationFrame(loop);
    }
  }

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  for (let i = 0; i < WARMUP_FRAMES; i++) { update(); frame++; }

  if (reduced) {
    // One settled frame, no loop.
    render();
  } else {
    document.addEventListener('visibilitychange', onVisibility);
    rafId = requestAnimationFrame(loop);
  }

  // The homepage loader owns window.__pageCleanup, because it has a resize
  // listener of its own to take down; this is the hook it calls. Removing the
  // visibilitychange listener here is what makes a live swap to
  // volcano-pixel.js safe, because a listener left behind restarts a cancelled loop
  // the next time the tab is hidden and shown, and two animations then share
  // one canvas.
  window.__volcanoStop = function () {
    cancelAnimationFrame(rafId);
    rafId = 0;
    document.removeEventListener('visibilitychange', onVisibility);
    ctx.clearRect(0, 0, W, H);
  };
})();
