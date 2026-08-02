(function () {
  const canvas = document.getElementById('floppyCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  /* ── CONFIG ── */
  const W = 32, H = 32;
  const FLOPPY_FPS = 12;
  const FRAME_MS = 1000 / FLOPPY_FPS;

  /* ── GLINT ANIMATION ── */
  const GLINT_CYCLE = 60;
  const GLINT_DURATION = 20;
  const GLINT_BASE_X = 4;

  /* ── COLORS ── */
  const C = {
    body:      '#1a1a1c',
    notch:     '#101012',
    shutter:   '#9098a0',
    shutterDk: '#70787e',
    exposed:   '#0e1010',
    label:     '#f0ece0',
    stripe:    '#c8202a',
    text:      '#8a8878',
    glint:     'rgba(255, 255, 255, 0.6)'
  };

  /* ── STATE ── */
  let frame = 0;

  /* ── DRAW ── */

  function drawFloppy() {
    ctx.clearRect(0, 0, W, H);

    /* main plastic body (with top-right chamfer) */
    ctx.fillStyle = C.body;
    ctx.fillRect(3, 2, 23, 28);
    ctx.fillRect(26, 6, 3, 24);

    /* pixel stair-step for angled cut */
    ctx.fillRect(26, 5, 1, 1);
    ctx.fillRect(27, 4, 1, 1);
    ctx.fillRect(28, 3, 1, 1);

    /* bottom cutouts (write-protect notches) */
    ctx.fillStyle = C.notch;
    ctx.fillRect(6, 27, 2, 3);
    ctx.fillRect(24, 27, 2, 3);

    /* metal shutter (top left) */
    ctx.fillStyle = C.shutter;
    ctx.fillRect(7, 2, 11, 11);

    /* shutter slider groove */
    ctx.fillStyle = C.shutterDk;
    ctx.fillRect(15, 2, 1, 11);

    /* shutter opening (exposed disk) */
    ctx.fillStyle = C.exposed;
    ctx.fillRect(9, 3, 4, 8);

    /* paper label */
    ctx.fillStyle = C.label;
    ctx.fillRect(6, 16, 20, 13);

    /* label header stripe */
    ctx.fillStyle = C.stripe;
    ctx.fillRect(6, 16, 20, 3);

    /* faux text lines on label */
    ctx.fillStyle = C.text;
    ctx.fillRect(8, 21, 10, 1);
    ctx.fillRect(8, 23, 15, 1);
    ctx.fillRect(8, 25, 12, 1);

    /* glint animation: diagonal shine sweeping across shutter */
    const glintCycle = frame % GLINT_CYCLE;
    if (glintCycle < GLINT_DURATION) {
      ctx.fillStyle = C.glint;
      const baseGlintX = GLINT_BASE_X + glintCycle;

      for (let dy = 0; dy < 11; dy++) {
        const px = baseGlintX - Math.floor(dy / 2);
        if (px >= 7 && px < 18) {
          ctx.fillRect(px, 2 + dy, 1, 1);
        }
      }
    }

    frame++;
  }

  /* ── LOOP ── */

  let rafId;
  let lastTime = 0;

  function loop(ts) {
    rafId = requestAnimationFrame(loop);
    if (ts - lastTime < FRAME_MS) return;
    lastTime = ts;
    drawFloppy();
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
