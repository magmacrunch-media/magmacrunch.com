// =====================================================================
// config.js — Score backend via MAGMA//OPS (ScoreClient)
// =====================================================================
const CONFIG = {};

// =====================================================================
// Piece definitions
// =====================================================================
const COLS = 10, ROWS = 20, CELL = 30;

const PIECES = {
  I: { shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], color: '#AFCBD3', glow: '#AFCBD3' },
  O: { shape: [[1,1],[1,1]],                               color: '#D4C89A', glow: '#D4C89A' },
  T: { shape: [[0,1,0],[1,1,1],[0,0,0]],                  color: '#8A7EB5', glow: '#8A7EB5' },
  S: { shape: [[0,1,1],[1,1,0],[0,0,0]],                  color: '#5E7D6A', glow: '#5E7D6A' },
  Z: { shape: [[1,1,0],[0,1,1],[0,0,0]],                  color: '#A26769', glow: '#A26769' },
  J: { shape: [[1,0,0],[1,1,1],[0,0,0]],                  color: '#6B8FA3', glow: '#6B8FA3' },
  L: { shape: [[0,0,1],[1,1,1],[0,0,0]],                  color: '#C4855A', glow: '#C4855A' },
};
const PIECE_KEYS = Object.keys(PIECES);

// Scoring
const LINE_SCORES = [0, 100, 300, 500, 800]; // 0–4 lines
const LEVEL_LINES = 10;

// =====================================================================
// Utility
// =====================================================================
function rotateCW(mat) {
  const n = mat.length, r = mat[0].length;
  return Array.from({length: r}, (_, i) =>
    Array.from({length: n}, (_, j) => mat[n-1-j][i])
  );
}

function deepCopy(grid) {
  return grid.map(r => [...r]);
}

// =====================================================================
// Rendering helpers
// =====================================================================
const boardCanvas = document.getElementById('board');
const bCtx = boardCanvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold-canvas');
const hCtx = holdCanvas.getContext('2d');

// Register board canvas with adenosine engine
AdRPG.initCanvas(boardCanvas);

// Custom key bindings for tetris
const TETRIS_BINDINGS = {
  moveUp:    [],
  moveDown:  [],
  moveLeft:  ['arrowleft'],
  moveRight: ['arrowright'],
  pause:     ['escape', 'p'],
  interact:  [' ', 'arrowup', 'arrowdown', 'c'],
};

function drawCell(ctx, x, y, color, glow, size=CELL) {
  const pad = 1;
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 8;
  // fill
  ctx.fillStyle = color;
  ctx.fillRect(x*size+pad, y*size+pad, size-pad*2, size-pad*2);
  // highlight top-left
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x*size+pad, y*size+pad, size-pad*2, 4);
  ctx.fillRect(x*size+pad, y*size+pad, 4, size-pad*2);
  // dark border
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x*size+pad+0.5, y*size+pad+0.5, size-pad*2-1, size-pad*2-1);
  ctx.restore();
}

function drawGhostCell(ctx, x, y, color, size=CELL) {
  const pad = 1;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  ctx.strokeRect(x*size+pad+1, y*size+pad+1, size-pad*2-2, size-pad*2-2);
  ctx.restore();
}

function drawMiniPiece(ctx, shape, color, glow, canvasW, canvasH) {
  ctx.clearRect(0, 0, canvasW, canvasH);
  const rows = shape.length, cols = shape[0].length;
  const sz = 16;
  const ox = Math.floor((canvasW - cols*sz) / 2);
  const oy = Math.floor((canvasH - rows*sz) / 2);
  shape.forEach((row, r) => row.forEach((v, c) => {
    if (!v) return;
    ctx.save();
    ctx.shadowColor = glow; ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    ctx.fillRect(ox + c*sz + 1, oy + r*sz + 1, sz-2, sz-2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(ox + c*sz + 1, oy + r*sz + 1, sz-2, 3);
    ctx.restore();
  }));
}

// =====================================================================
// Game state
// =====================================================================
let grid, current, currentPos, nextPiece, holdPiece, holdUsed;
let score, level, lines;
let gameOver, paused, started;
let dropInterval;
let dirty = false;
const FRAME_MS = 1000 / 30;
let dropAcc = 0;

// DAS (Delayed Auto Shift) for lateral movement
let dasActive = false;     // true = waiting for initial delay
let dasDelayTimer = 0;
let dasRepeatTimer = 0;
const DAS_DELAY = 170;     // ms before auto-repeat starts
const DAS_REPEAT = 50;     // ms between repeats

// Buffered one-shot keys (survives across frames)
let cQueued = false;

function emptyGrid() {
  return Array.from({length: ROWS}, () => Array(COLS).fill(null));
}

function randomPiece() {
  const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
  return { key, shape: PIECES[key].shape.map(r=>[...r]), color: PIECES[key].color, glow: PIECES[key].glow };
}

function spawnPiece() {
  current = nextPiece || randomPiece();
  nextPiece = randomPiece();
  holdUsed = false;
  currentPos = { x: Math.floor((COLS - current.shape[0].length) / 2), y: 0 };
  if (!isValid(current.shape, currentPos)) endGame();
}

function isValid(shape, pos) {
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = pos.x + c, ny = pos.y + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
      if (ny >= 0 && grid[ny][nx]) return false;
    }
  return true;
}

function lockPiece() {
  current.shape.forEach((row, r) => row.forEach((v, c) => {
    if (!v) return;
    const ny = currentPos.y + r;
    if (ny >= 0) grid[ny][currentPos.x + c] = { color: current.color, glow: current.glow };
  }));
  clearLines();
  spawnPiece();
  dirty = true;
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (grid[r].every(c => c)) {
      grid.splice(r, 1);
      grid.unshift(Array(COLS).fill(null));
      cleared++;
      r++; // recheck same row
    }
  }
  if (!cleared) return;
  lines += cleared;
  score += LINE_SCORES[cleared] * level;
  const newLevel = Math.floor(lines / LEVEL_LINES) + 1;
  if (newLevel !== level) {
    level = newLevel;
    dropInterval = Math.max(80, 1000 - (level - 1) * 85);
  }
  updateHUD();
  dirty = true;
  // playSfx('clear');
}

function getGhostY() {
  let gy = currentPos.y;
  while (isValid(current.shape, { x: currentPos.x, y: gy + 1 })) gy++;
  return gy;
}

function hardDrop() {
  const gy = getGhostY();
  score += (gy - currentPos.y) * 2;
  currentPos.y = gy;
  lockPiece();
  updateHUD();
  dirty = true;
  // playSfx('drop');
}

function holdAction() {
  if (holdUsed) return;
  if (!holdPiece) {
    holdPiece = { key: current.key, shape: PIECES[current.key].shape.map(r=>[...r]), color: current.color, glow: current.glow };
    spawnPiece();
  } else {
    const tmp = { key: current.key, shape: PIECES[current.key].shape.map(r=>[...r]), color: current.color, glow: current.glow };
    current = { key: holdPiece.key, shape: PIECES[holdPiece.key].shape.map(r=>[...r]), color: holdPiece.color, glow: holdPiece.glow };
    currentPos = { x: Math.floor((COLS - current.shape[0].length) / 2), y: 0 };
    holdPiece = tmp;
  }
  holdUsed = true;
  dirty = true;
}

function doLateralMove() {
  if (AdRPG.keys['arrowleft']) {
    if (isValid(current.shape, { x: currentPos.x - 1, y: currentPos.y }))
      currentPos.x--;
  }
  if (AdRPG.keys['arrowright']) {
    if (isValid(current.shape, { x: currentPos.x + 1, y: currentPos.y }))
      currentPos.x++;
  }
  dirty = true;
}

function updateHUD() {
  document.getElementById('score-display').textContent = score.toLocaleString();
  document.getElementById('level-display').textContent = level;
  document.getElementById('lines-display').textContent = lines;
}

// =====================================================================
// Rendering
// =====================================================================
function render() {
  // board background
  bCtx.fillStyle = '#0A1218';
  bCtx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);

  // subtle grid lines
  bCtx.strokeStyle = 'rgba(122,155,173,0.07)';
  bCtx.lineWidth = 1;
  for (let c = 0; c <= COLS; c++) { bCtx.beginPath(); bCtx.moveTo(c*CELL,0); bCtx.lineTo(c*CELL,ROWS*CELL); bCtx.stroke(); }
  for (let r = 0; r <= ROWS; r++) { bCtx.beginPath(); bCtx.moveTo(0,r*CELL); bCtx.lineTo(COLS*CELL,r*CELL); bCtx.stroke(); }

  // locked cells
  grid.forEach((row, r) => row.forEach((cell, c) => {
    if (cell) drawCell(bCtx, c, r, cell.color, cell.glow);
  }));

  if (current && !gameOver) {
    // ghost
    const gy = getGhostY();
    current.shape.forEach((row, r) => row.forEach((v, c) => {
      if (v) drawGhostCell(bCtx, currentPos.x+c, gy+r, current.color);
    }));
    // current piece
    current.shape.forEach((row, r) => row.forEach((v, c) => {
      if (v) drawCell(bCtx, currentPos.x+c, currentPos.y+r, current.color, current.glow);
    }));
  }

  // next & hold
  if (nextPiece) drawMiniPiece(nCtx, nextPiece.shape, nextPiece.color, nextPiece.glow, 80, 64);
  if (holdPiece) drawMiniPiece(hCtx, holdPiece.shape, holdPiece.color, holdPiece.glow, 80, 64);
  else { hCtx.clearRect(0,0,80,64); }
}

// =====================================================================
// Game loop (adenosine)
// =====================================================================
dropInterval = 800;

function update(dt) {
  if (!current || gameOver) return;

  // Lateral movement with DAS
  const moveHeld = AdRPG.keys['arrowleft'] || AdRPG.keys['arrowright'];
  if (moveHeld) {
    if (dasActive) {
      // First press: move immediately, start delay timer
      doLateralMove();
      dasActive = false;
      dasDelayTimer = 0;
      dasRepeatTimer = 0;
    } else {
      dasDelayTimer += dt * FRAME_MS;
      if (dasDelayTimer >= DAS_DELAY) {
        // Delay elapsed: auto-repeat
        dasRepeatTimer += dt * FRAME_MS;
        while (dasRepeatTimer >= DAS_REPEAT) {
          dasRepeatTimer -= DAS_REPEAT;
          doLateralMove();
        }
      }
    }
  } else {
    dasActive = true;
    dasDelayTimer = 0;
    dasRepeatTimer = 0;
  }

  // One-shot actions
  if (AdRPG.keysPressed['arrowup']) {
    const rot = rotateCW(current.shape);
    for (const dx of [0, -1, 1, -2, 2]) {
      if (isValid(rot, { x: currentPos.x + dx, y: currentPos.y })) {
        current.shape = rot;
        currentPos.x += dx;
        break;
      }
    }
    AdRPG.keysPressed['arrowup'] = false;
  }

  if (AdRPG.keysPressed['arrowdown']) {
    if (isValid(current.shape, { x: currentPos.x, y: currentPos.y + 1 })) {
      currentPos.y++;
      score++;
      updateHUD();
    } else {
      lockPiece();
    }
    AdRPG.keysPressed['arrowdown'] = false;
  }

  if (AdRPG.keysPressed[' ']) {
    hardDrop();
    AdRPG.keysPressed[' '] = false;
  }

  // Hold key (buffered)
  if (cQueued || AdRPG.keys['c']) {
    holdAction();
    cQueued = false;
  }

  // Auto-drop
  dropAcc += dt * FRAME_MS;
  if (dropAcc >= dropInterval) {
    dropAcc = 0;
    if (isValid(current.shape, { x: currentPos.x, y: currentPos.y + 1 })) {
      currentPos.y++;
    } else {
      lockPiece();
    }
  }

  dirty = true;
}

const gameLoop = AdRPG.createGameLoop({ update, render, fps: 30 });

function startGame() {
  grid = emptyGrid();
  score = 0; level = 1; lines = 0;
  dropInterval = 800; dropAcc = 0;
  dasActive = true; dasDelayTimer = 0; dasRepeatTimer = 0;
  cQueued = false;
  holdPiece = null; holdUsed = false;
  gameOver = false; paused = false; started = true;
  AdRPG.setGameStarted(true);
  AdRPG.setGamePaused(false);
  AdRPG.setGameOver(false);
  nextPiece = randomPiece();
  spawnPiece();
  updateHUD();
  hCtx.clearRect(0,0,80,64);
  document.getElementById('btn-pause').style.display = 'block';
  gameLoop.stop();
  dirty = true;
  gameLoop.start();
}

function endGame() {
  gameOver = true;
  started = false;
  AdRPG.setGameOver(true);
  AdRPG.setGameStarted(false);
  gameLoop.stop();
  document.getElementById('btn-pause').style.display = 'none';
  // playSfx('gameover');
  document.getElementById('final-score').textContent = score.toLocaleString();
  document.getElementById('initials-input').value = '';
  showModal('modal-gameover');
}

// =====================================================================
// High scores (MAGMA//OPS backend with localStorage fallback)
// =====================================================================
let localScores = [];

async function loadScores() {
  try {
    localScores = await scoreClient.load('tetris');
  } catch(e) { console.error('Score load failed', e); }
}

async function saveScore(initials, sc, lv) {
  const entry = { initials: initials.toUpperCase().slice(0,3), score: sc, level: lv };
  localScores.push(entry);
  localScores.sort((a,b) => b.score - a.score);
  localScores = localScores.slice(0, 10);
  localStorage.setItem('mc_scores_tetris', JSON.stringify(localScores));
}

function renderScores() {
  const medals = ['I','II','III'];
  const tbody = document.getElementById('scores-tbody');
  tbody.innerHTML = '';
  if (!localScores.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#555;font-size:7px;">NO SCORES YET</td></tr>';
    return;
  }
  localScores.forEach((s, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${medals[i]||i+1}</td><td>${s.initials}</td><td>${s.score.toLocaleString()}</td><td>${s.level}</td>`;
    tbody.appendChild(tr);
  });
}

// =====================================================================
// Modal helpers
// =====================================================================
function showModal(id) {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}
function hideModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// =====================================================================
// Input (handled via adenosine in update loop)
// =====================================================================
function togglePause() {
  if (!started || gameOver) return;
  paused = !paused;
  AdRPG.setGamePaused(paused);
  document.getElementById('btn-pause').textContent = paused ? 'RESUME' : 'PAUSE';
  if (paused) { showModal('modal-pause'); }
  else { hideModal('modal-pause'); }
}

// =====================================================================
// Event listeners (clone-and-replace pattern)
// =====================================================================
function wire(id, fn) {
  const el = document.getElementById(id);
  const clone = el.cloneNode(true);
  el.parentNode.replaceChild(clone, el);
  document.getElementById(id).addEventListener('click', fn);
}

function setupListeners() {
  wire('btn-start', () => { startGame(); });
  wire('btn-start-title', () => { dismissTitle(); });
  wire('btn-new', () => { hideModal('modal-gameover'); hideModal('modal-pause'); startGame(); });
  wire('btn-pause', () => togglePause());
  wire('btn-resume', () => togglePause());
  wire('btn-quit', () => {
    gameLoop.stop();
    started = false; paused = false; gameOver = false;
    AdRPG.setGameStarted(false);
    AdRPG.setGamePaused(false);
    AdRPG.setGameOver(false);
    document.getElementById('btn-pause').style.display = 'none';
    hideModal('modal-pause');
    showTitleScreen();
  });
  wire('btn-submit', async () => {
    const initials = document.getElementById('initials-input').value.trim() || 'AAA';
    await saveScore(initials, score, level);
    scoreClient.save('tetris', initials, score, { level });
    hideModal('modal-gameover');
    renderScores();
    showModal('modal-scores');
  });
  wire('btn-play-again', () => { hideModal('modal-gameover'); startGame(); });
  wire('btn-scores', () => {
    renderScores();
    showModal('modal-scores');
    if (started && !paused && !gameOver) {
      paused = true;
      AdRPG.setGamePaused(true);
      document.getElementById('btn-pause').textContent = 'TAUKO / pause';
    }
  });
  wire('btn-close-scores', () => {
    hideModal('modal-scores');
    if (started && paused && !gameOver) {
      paused = false;
      AdRPG.setGamePaused(false);
      document.getElementById('btn-pause').textContent = 'TAUKO / pause';
      dirty = true;
      gameLoop.start();
    }
  });
  wire('btn-credits', () => {
    showModal('modal-credits');
    if (started && !paused && !gameOver) {
      paused = true;
      AdRPG.setGamePaused(true);
      document.getElementById('btn-pause').textContent = 'TAUKO / pause';
    }
  });
  wire('btn-close-credits', () => {
    hideModal('modal-credits');
    if (started && paused && !gameOver) {
      paused = false;
      AdRPG.setGamePaused(false);
      document.getElementById('btn-pause').textContent = 'TAUKO / pause';
      dirty = true;
      gameLoop.start();
    }
  });
}

// =====================================================================
// Init
// =====================================================================
function showTitleScreen() {
  const to = document.getElementById('title-overlay');
  to.classList.remove('dismissing');
  to.style.display = '';
}

function dismissTitle() {
  const to = document.getElementById('title-overlay');
  if (!to || to.style.display === 'none') return;
  to.classList.add('dismissing');
  setTimeout(() => { to.style.display = 'none'; }, 550);
  startGame();
}

(async () => {
  await loadScores();
  setupListeners();

  // Initialize adenosine input system
  AdRPG.initInput({
    onPause: () => { if (started && !gameOver) togglePause(); },
    bindings: TETRIS_BINDINGS,
  });

  // Buffer C key press (survives across frames for reliable hold)
  document.addEventListener('keydown', e => {
    if ((e.key === 'c' || e.key === 'C') && started && !paused && !gameOver) {
      cQueued = true;
    }
  });

  // draw empty board on load
  grid = emptyGrid();
  bCtx.fillStyle = '#0A1218';
  bCtx.fillRect(0,0,boardCanvas.width,boardCanvas.height);

  // Title screen: click to start
  const startBtn = document.getElementById('btn-start-title');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      dismissTitle();
    });
  }

  // Title screen: keyboard to start (Space or Enter)
  document.addEventListener('keydown', (e) => {
    const to = document.getElementById('title-overlay');
    if (!to || to.style.display === 'none') return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      dismissTitle();
    }
  });
})();
