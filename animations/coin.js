(function () {
  /* ── CONFIG ── */
  const COIN_SIZE = 16;
  const COIN_FRAMES = 12;
  const COIN_FRAME_MS = 80;
  const COIN_SQUISH_MIN = 0.15;
  const COIN_SQUISH_RANGE = 1 - COIN_SQUISH_MIN;

  /* ── COLORS ── */
  const GOLD = '#FFD700';
  const DARK_GOLD = '#DAA520';
  const LIGHT_GOLD = '#FFED4E';
  const HIGHLIGHT = '#FFFFFF';

  /* ── SPRITE ── */
  const coinPattern = [
    '   ██████████   ',
    '  ████████████  ',
    ' ██████████████ ',
    '████████████████',
    '████  ████  ████',
    '████   ██   ████',
    '████   ██   ████',
    '████  ████  ████',
    '████  ████  ████',
    '████   ██   ████',
    '████   ██   ████',
    '████  ████  ████',
    '████████████████',
    ' ██████████████ ',
    '  ████████████  ',
    '   ██████████   '
  ];

  /* ── DRAW STATIC COIN ── */

  function drawCoin(ctx) {
    for (let y = 0; y < coinPattern.length; y++) {
      const row = coinPattern[y];
      for (let x = 0; x < row.length; x += 2) {
        if (row.substr(x, 2) === '\u2588\u2588') {
          const px = x / 2;
          if (y < 4 || px < 4) ctx.fillStyle = LIGHT_GOLD;
          else if (y > 11 || px > 11) ctx.fillStyle = DARK_GOLD;
          else ctx.fillStyle = GOLD;
          ctx.fillRect(px, y, 1, 1);
        }
      }
    }
    /* specular highlight */
    ctx.fillStyle = HIGHLIGHT;
    ctx.fillRect(5, 2, 1, 1);
    ctx.fillRect(6, 3, 1, 1);
  }

  /* ── ANIMATE SPINNING COIN ── */

  function animateCoin(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    /* draw static coin to offscreen canvas */
    const offscreen = document.createElement('canvas');
    offscreen.width = COIN_SIZE;
    offscreen.height = COIN_SIZE;
    drawCoin(offscreen.getContext('2d'));

    let frame = 0;
    let intervalId;

    function tick() {
      ctx.clearRect(0, 0, COIN_SIZE, COIN_SIZE);
      /* horizontal squish simulates 3D spin */
      const phase = Math.abs(Math.sin((frame / COIN_FRAMES) * Math.PI));
      const scaleX = COIN_SQUISH_MIN + phase * COIN_SQUISH_RANGE;
      const ox = (COIN_SIZE - COIN_SIZE * scaleX) / 2;
      ctx.drawImage(offscreen, ox, 0, COIN_SIZE * scaleX, COIN_SIZE);
      frame = (frame + 1) % COIN_FRAMES;
    }

    intervalId = setInterval(tick, COIN_FRAME_MS);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        clearInterval(intervalId);
      } else {
        intervalId = setInterval(tick, COIN_FRAME_MS);
      }
    });
  }

  /* ── INIT ── */
  animateCoin(document.getElementById('coinCanvas'));
  animateCoin(document.getElementById('coinCanvas2'));
})();
