(function () {
  const canvas = document.getElementById('serverCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  /* ── CONFIG ── */
  const SERVER_SIZE = 128;
  const SERVER_FRAME_MS = 120;

  /* rack casing */
  const RACK_X = 24, RACK_Y = 12, RACK_W = 80, RACK_H = 104;

  /* CRT monitor */
  const CRT_X = 32, CRT_Y = 20, CRT_W = 64, CRT_H = 36;
  const SCREEN_X = 36, SCREEN_Y = 24, SCREEN_W = 56, SCREEN_H = 28;
  const SCOPE_X = 38, SCOPE_Y = 36, SCOPE_W = 52;
  const SCOPE_AMP = 8, SCOPE_SPEED = 0.4, SCOPE_FREQ = 0.2;
  const REC_X = 40, REC_Y = 26, REC_BLINK = 8;

  /* tape drives */
  const TAPE_DRIVE_X = 32, TAPE_DRIVE_Y = 60, TAPE_DRIVE_W = 64, TAPE_DRIVE_H = 24;
  const TAPE_HOUSING_X = 36, TAPE_HOUSING_W = 24, TAPE_HOUSING_H = 16;
  const TAPE_LEFT_X = 48, TAPE_RIGHT_X = 80, TAPE_Y = 72;
  const TAPE_PHASE_PERIOD = 4;

  /* server blades */
  const BLADE_START_Y = 88, BLADE_GAP = 12;
  const BLADE_X = 32, BLADE_W = 64, BLADE_H = 8;
  const LED_X = 36, LED_Y_OFFSET = 2, LED_SIZE = 4, LED_GAP = 7;
  const LED_COUNT = 8, LED_ON_CHANCE = 0.4;

  /* base + cables */
  const BASE_Y = 116, BASE_H = 4;
  const CABLE_Y = 120, CABLE_H = 8;
  const CABLE_RED_X = 40, CABLE_RED_W = 6;
  const CABLE_CYAN_X = 60, CABLE_CYAN_W = 4;
  const CABLE_YELLOW_X = 80, CABLE_YELLOW_W = 4;
  const CABLE_PULSE_PERIOD = 6;

  /* colors */
  const C = {
    rackBody:    '#1a1a1a',
    rackHighlight: '#2a2a2a',
    rackShadow:  '#0a0a0a',
    crtBody:     '#222',
    crtScreen:   '#081408',
    crtGreen:    '#39ff6e',
    crtRec:      '#ff3d6e',
    tapeBody:    '#d0d0d0',
    tapeCutout:  '#111',
    bladeFace:   '#111',
    bladeHousing: '#222',
    ledCyan:     '#00f5ff',
    ledRose:     '#ff3d6e',
    ledYellow:   '#ffe03a',
    ledGreen:    '#39ff6e',
    ledOff:      '#222',
    cableRed:    '#ff3d6e',
    cableRedDim: '#881133',
    cableCyan:   '#00f5ff',
    cableYellow: '#ffe03a'
  };

  const LED_COLORS = [C.ledCyan, C.ledRose, C.ledYellow, C.ledGreen];

  /* ── STATE ── */
  let frame = 0;

  /* ── DRAW HELPERS ── */

  function drawTape(x, y, phase) {
    ctx.fillStyle = C.tapeBody;
    ctx.fillRect(x - 4, y - 6, 8, 12);
    ctx.fillRect(x - 6, y - 4, 12, 8);
    ctx.fillStyle = C.tapeCutout;

    if (phase === 0) {
      ctx.fillRect(x - 2, y - 6, 4, 12);
      ctx.fillRect(x - 6, y - 2, 12, 4);
    } else {
      ctx.fillRect(x - 4, y - 4, 8, 8);
      ctx.fillStyle = C.tapeBody;
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
  }

  /* ── MAIN DRAW ── */

  function drawServer() {
    ctx.clearRect(0, 0, SERVER_SIZE, SERVER_SIZE);

    /* rack casing */
    ctx.fillStyle = C.rackBody;
    ctx.fillRect(RACK_X, RACK_Y, RACK_W, RACK_H);
    ctx.fillStyle = C.rackHighlight;
    ctx.fillRect(RACK_X, RACK_Y, 4, RACK_H);
    ctx.fillStyle = C.rackShadow;
    ctx.fillRect(RACK_X + RACK_W - 4, RACK_Y, 4, RACK_H);

    /* CRT monitor */
    ctx.fillStyle = C.crtBody;
    ctx.fillRect(CRT_X, CRT_Y, CRT_W, CRT_H);
    ctx.fillStyle = C.crtScreen;
    ctx.fillRect(SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H);

    /* oscilloscope sine wave */
    ctx.fillStyle = C.crtGreen;
    for (let x = 0; x < SCOPE_W; x += 4) {
      const yOff = Math.sin((frame * SCOPE_SPEED) + (x * SCOPE_FREQ)) * SCOPE_AMP;
      ctx.fillRect(SCOPE_X + x, SCOPE_Y + yOff, 3, 3);
    }

    /* blinking REC indicator */
    if (frame % REC_BLINK < REC_BLINK / 2) {
      ctx.fillStyle = C.crtRec;
      ctx.fillRect(REC_X, REC_Y, 4, 4);
    }

    /* tape drives */
    ctx.fillStyle = C.tapeCutout;
    ctx.fillRect(TAPE_DRIVE_X, TAPE_DRIVE_Y, TAPE_DRIVE_W, TAPE_DRIVE_H);
    ctx.fillStyle = C.bladeHousing;
    ctx.fillRect(TAPE_HOUSING_X, TAPE_DRIVE_Y + 4, TAPE_HOUSING_W, TAPE_HOUSING_H);
    ctx.fillRect(TAPE_HOUSING_X + TAPE_HOUSING_W + 8, TAPE_DRIVE_Y + 4, TAPE_HOUSING_W, TAPE_HOUSING_H);

    const tapePhase = (frame % TAPE_PHASE_PERIOD < TAPE_PHASE_PERIOD / 2) ? 0 : 1;
    drawTape(TAPE_LEFT_X, TAPE_Y, tapePhase);
    drawTape(TAPE_RIGHT_X, TAPE_Y, tapePhase);

    /* server blades + LEDs */
    for (let i = 0; i < 2; i++) {
      const y = BLADE_START_Y + i * BLADE_GAP;
      ctx.fillStyle = C.bladeFace;
      ctx.fillRect(BLADE_X, y, BLADE_W, BLADE_H);

      for (let j = 0; j < LED_COUNT; j++) {
        if (Math.random() > LED_ON_CHANCE) {
          ctx.fillStyle = LED_COLORS[Math.floor(Math.random() * LED_COLORS.length)];
        } else {
          ctx.fillStyle = C.ledOff;
        }
        ctx.fillRect(LED_X + j * LED_GAP, y + LED_Y_OFFSET, LED_SIZE, LED_SIZE);
      }
    }

    /* base + floor mount */
    ctx.fillStyle = C.rackBody;
    ctx.fillRect(RACK_X - 4, BASE_Y, RACK_W + 8, BASE_H);

    /* cables */
    ctx.fillStyle = (frame % CABLE_PULSE_PERIOD < CABLE_PULSE_PERIOD / 2)
      ? C.cableRed : C.cableRedDim;
    ctx.fillRect(CABLE_RED_X, CABLE_Y, CABLE_RED_W, CABLE_H);

    ctx.fillStyle = C.cableCyan;
    ctx.fillRect(CABLE_CYAN_X, CABLE_Y, CABLE_CYAN_W, CABLE_H);

    ctx.fillStyle = C.cableYellow;
    ctx.fillRect(CABLE_YELLOW_X, CABLE_Y, CABLE_YELLOW_W, CABLE_H);

    frame++;
  }

  /* ── LOOP ── */

  let rafId;

  function loop() {
    rafId = setTimeout(() => {
      rafId = requestAnimationFrame(loop);
      drawServer();
    }, SERVER_FRAME_MS);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearTimeout(rafId);
      cancelAnimationFrame(rafId);
    } else {
      loop();
    }
  });

  loop();

  window.__pageCleanup = function () {
    clearTimeout(rafId);
    cancelAnimationFrame(rafId);
  };
})();
