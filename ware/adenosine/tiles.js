// assets-app.js — adenosine tile map editor
const CELL = 32;
const DEFAULT_COLORS = [
  '#7cb342', '#5d4037', '#e53935', '#1e88e5',
  '#fdd835', '#8e24aa', '#00897b', '#ff6ec7',
  '#f4511e', '#3949ab', '#43a047', '#757575',
];

let grid = [], rows = 0, cols = 0;
let selectedId = 1, tool = 'paint';
let solidTiles = new Set(), tileColors = [...DEFAULT_COLORS];
let undoStack = [], redoStack = [], painting = false;
let hoverCell = null;

const canvas = document.getElementById('grid-canvas');
const ctx = canvas.getContext('2d');
const paletteEl = document.getElementById('palette');
const solidEl = document.getElementById('solid-tiles');
const colsInput = document.getElementById('grid-cols');
const rowsInput = document.getElementById('grid-rows');
const exportOutput = document.getElementById('export-output');
const importModal = document.getElementById('import-modal');
const importInput = document.getElementById('import-input');
const previewPanel = document.getElementById('preview-panel');
const previewContent = document.getElementById('preview-content');
let previewLoop = null;

// ── Grid ────────────────────────────────────────────────

function initGrid(r, c, preserve) {
  const prev = grid;
  const dpr = window.devicePixelRatio || 1;
  rows = r; cols = c;
  grid = Array.from({ length: r }, (_, y) =>
    Array.from({ length: c }, (_, x) => (preserve && prev[y] && prev[y][x]) || 0));
  canvas.width = c * CELL * dpr;
  canvas.height = r * CELL * dpr;
  canvas.style.width = c * CELL + 'px';
  canvas.style.height = r * CELL + 'px';
  ctx.scale(dpr, dpr);
  render();
}

// ── Undo / Redo ─────────────────────────────────────────

function snapshot() {
  undoStack.push(JSON.parse(JSON.stringify({ grid, solidTiles: [...solidTiles] })));
  if (undoStack.length > 200) undoStack.shift();
  redoStack.length = 0;
}

function undo() {
  if (!undoStack.length) return;
  const s = undoStack.pop();
  redoStack.push(JSON.parse(JSON.stringify({ grid, solidTiles: [...solidTiles] })));
  grid = s.grid; solidTiles = new Set(s.solidTiles);
  canvas.width = cols * CELL; canvas.height = rows * CELL;
  render(); updateSolidChecks();
}

function redo() {
  if (!redoStack.length) return;
  const s = redoStack.pop();
  undoStack.push(JSON.parse(JSON.stringify({ grid, solidTiles: [...solidTiles] })));
  grid = s.grid; solidTiles = new Set(s.solidTiles);
  const dpr = window.devicePixelRatio || 1;
  canvas.width = cols * CELL * dpr;
  canvas.height = rows * CELL * dpr;
  canvas.style.width = cols * CELL + 'px';
  canvas.style.height = rows * CELL + 'px';
  ctx.scale(dpr, dpr);
  render(); updateSolidChecks();
}

// ── Canvas rendering ────────────────────────────────────

function isLight(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function render() {
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const id = grid[y][x], px = x * CELL, py = y * CELL;
      if (id > 0) { ctx.fillStyle = tileColors[id] || '#888'; ctx.fillRect(px, py, CELL, CELL); }
      ctx.strokeStyle = '#33304a'; ctx.lineWidth = 1; ctx.strokeRect(px, py, CELL, CELL);
      if (id > 0) {
        ctx.fillStyle = isLight(tileColors[id] || '#888') ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)';
        ctx.font = 'bold 9px "Courier Prime",monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(id), px + CELL / 2, py + CELL / 2);
      }
    }
  }
  if (hoverCell && !painting) {
    const px = hoverCell.x * CELL, py = hoverCell.y * CELL;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2);
  }
}

// ── Mouse interaction ───────────────────────────────────

function cellAt(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(cols - 1, Math.floor((e.clientX - r.left) / CELL))),
    y: Math.max(0, Math.min(rows - 1, Math.floor((e.clientY - r.top) / CELL))),
  };
}

function applyTool(x, y) {
  const id = grid[y][x];
  if (tool === 'paint' && selectedId > 0 && id !== selectedId) {
    snapshot(); grid[y][x] = selectedId; render();
  } else if (tool === 'erase' && id !== 0) {
    snapshot(); grid[y][x] = 0; render();
  } else if (tool === 'fill' && selectedId > 0 && id !== selectedId) {
    snapshot(); floodFill(x, y, id, selectedId); render();
  } else if (tool === 'pick' && id > 0) {
    selectedId = id; updatePaletteActive();
  }
}

canvas.addEventListener('mousedown', (e) => {
  e.preventDefault();
  if (e.button === 2) return;
  if (e.altKey) { const c = cellAt(e); if (grid[c.y][c.x] > 0) { selectedId = grid[c.y][c.x]; updatePaletteActive(); } return; }
  painting = true; const c = cellAt(e); applyTool(c.x, c.y);
});

canvas.addEventListener('mousemove', (e) => {
  const c = cellAt(e);
  if (!hoverCell || hoverCell.x !== c.x || hoverCell.y !== c.y) {
    hoverCell = c;
    render();
  }
  if (painting && (tool === 'paint' || tool === 'erase')) applyTool(c.x, c.y);
});

canvas.addEventListener('mouseup', () => painting = false);
canvas.addEventListener('mouseleave', () => {
  painting = false;
  hoverCell = null;
  render();
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault(); const c = cellAt(e);
  if (grid[c.y][c.x] !== 0) { snapshot(); grid[c.y][c.x] = 0; render(); }
});

// ── Flood fill ──────────────────────────────────────────

function floodFill(x, y, fromId, toId) {
  if (fromId === toId) return;
  const stack = [[x, y]];
  while (stack.length) {
    const [cx, cy] = stack.pop();
    if (cx < 0 || cx >= cols || cy < 0 || cy >= rows) continue;
    if (grid[cy][cx] !== fromId) continue;
    grid[cy][cx] = toId;
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
}

// ── Palette ─────────────────────────────────────────────

function renderPalette() {
  paletteEl.innerHTML = '';
  for (let i = 0; i < tileColors.length; i++) {
    const id = i;
    const div = document.createElement('div');
    div.className = 'swatch' + (id === selectedId ? ' active' : '');
    if (isLight(tileColors[i])) div.classList.add('swatch-light');
    div.dataset.id = id;
    const label = document.createElement('span');
    label.className = 'swatch-label'; label.textContent = String(id);
    const ci = document.createElement('input');
    ci.type = 'color'; ci.value = tileColors[i];
    ci.addEventListener('input', (e) => {
      e.stopPropagation(); tileColors[id] = e.target.value;
      div.style.backgroundColor = e.target.value;
      div.classList.toggle('swatch-light', isLight(e.target.value));
      updateSolidChecks(); render();
    });
    ci.addEventListener('click', (e) => e.stopPropagation());
    div.addEventListener('click', () => { selectedId = id; tool = 'paint'; updatePaletteActive(); updateToolActive(); });
    div.style.backgroundColor = tileColors[i];
    div.appendChild(label); div.appendChild(ci); paletteEl.appendChild(div);
  }
}

function updatePaletteActive() {
  paletteEl.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', Number(s.dataset.id) === selectedId));
}

// ── Solid tiles ─────────────────────────────────────────

function renderSolidTiles() {
  solidEl.innerHTML = '';
  for (let i = 1; i < tileColors.length; i++) {
    const check = document.createElement('label'); check.className = 'solid-check';
    const inp = document.createElement('input');
    inp.type = 'checkbox'; inp.checked = solidTiles.has(i); inp.dataset.id = i;
    const dot = document.createElement('span');
    dot.style.cssText = `width:10px;height:10px;border-radius:3px;background:${tileColors[i]};display:inline-block`;
    inp.addEventListener('change', () => {
      if (inp.checked) solidTiles.add(i); else solidTiles.delete(i);
      check.classList.toggle('is-solid', inp.checked);
    });
    check.appendChild(inp); check.appendChild(dot); check.appendChild(document.createTextNode(` ${i}`));
    solidEl.appendChild(check);
  }
  updateSolidChecks();
}

function updateSolidChecks() {
  solidEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    const id = Number(cb.dataset.id);
    cb.checked = solidTiles.has(id);
    cb.closest('.solid-check').classList.toggle('is-solid', cb.checked);
    const dot = cb.closest('.solid-check').querySelector('span');
    if (dot) dot.style.background = tileColors[id];
  });
}

// ── Tool buttons ────────────────────────────────────────

function updateToolActive() {
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
}

document.querySelectorAll('.tool-btn').forEach(btn =>
  btn.addEventListener('click', () => { tool = btn.dataset.tool; updateToolActive(); }));

// ── Grid resize ─────────────────────────────────────────

document.getElementById('resize-btn').addEventListener('click', () => {
  const c = Math.max(3, Math.min(100, parseInt(colsInput.value, 10) || 10));
  const r = Math.max(3, Math.min(100, parseInt(rowsInput.value, 10) || 8));
  colsInput.value = c; rowsInput.value = r;
  snapshot(); initGrid(r, c, true);
});

// ── Export ──────────────────────────────────────────────

document.getElementById('export-btn').addEventListener('click', () => {
  const solids = [...solidTiles].sort((a, b) => a - b);
  exportOutput.value = [
    `// Adenosine RPG tile map — ${cols}×${rows}`,
    `// Solid tiles: [${solids.join(', ')}]`,
    `const map = ${JSON.stringify(grid, null, 2)};`,
    `const solidTiles = ${JSON.stringify(solids)};`,
  ].join('\n');
});

// ── Copy ────────────────────────────────────────────────

document.getElementById('copy-btn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(exportOutput.value);
    const btn = document.getElementById('copy-btn'), orig = btn.textContent;
    btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = orig, 1200);
  } catch {}
});

// ── Import ──────────────────────────────────────────────

document.getElementById('import-btn').addEventListener('click', () => {
  importInput.value = ''; importModal.showModal();
});
document.getElementById('import-cancel').addEventListener('click', () => importModal.close());
importModal.querySelector('.modal-close').addEventListener('click', () => importModal.close());
importModal.addEventListener('click', (e) => { if (e.target === importModal) importModal.close(); });

document.getElementById('import-confirm').addEventListener('click', () => {
  try {
    const parsed = JSON.parse(importInput.value);
    let mapData, solids = [];
    if (Array.isArray(parsed)) mapData = parsed;
    else if (parsed && Array.isArray(parsed.map)) {
      mapData = parsed.map;
      if (Array.isArray(parsed.solidTiles)) solids = parsed.solidTiles;
    } else throw new Error('Expected number[][] or { map, solidTiles }');
    if (!mapData.every(r => Array.isArray(r))) throw new Error('Map must be a 2D array');
    const newR = mapData.length, newC = Math.max(...mapData.map(r => r.length));
    snapshot(); solidTiles = new Set(solids);
    colsInput.value = newC; rowsInput.value = newR;
    initGrid(newR, newC, false);
    for (let y = 0; y < newR; y++)
      for (let x = 0; x < mapData[y].length; x++) grid[y][x] = mapData[y][x] || 0;
    render(); updateSolidChecks(); importModal.close();
  } catch (e) {
    importInput.style.borderColor = '#e53935'; importInput.title = e.message;
    setTimeout(() => importInput.style.borderColor = '', 1500);
  }
});

// ── Clear ───────────────────────────────────────────────

document.getElementById('clear-btn').addEventListener('click', () => {
  snapshot(); grid.forEach(r => r.fill(0)); render();
});

// ── Preview RPG ─────────────────────────────────────────

document.getElementById('preview-btn').addEventListener('click', startPreview);
document.getElementById('close-preview-btn').addEventListener('click', closePreview);

function startPreview() {
  closePreview(); previewPanel.classList.remove('hidden');
  const cvs = document.createElement('canvas'); cvs.width = 640; cvs.height = 480;
  previewContent.innerHTML = ''; previewContent.appendChild(cvs);
  const hint = document.createElement('div'); hint.className = 'preview-hint';
  hint.textContent = 'Arrow keys to move \u2022 ESC or close button to exit';
  previewContent.appendChild(hint);

  function boot() {
    if (typeof window.AdRPG === 'undefined') {
      previewContent.innerHTML = '<div style="color:#ff6b6b;">AdRPG bundle not loaded.</div>';
      return;
    }
    try {
      AdRPG.initCanvas(cvs); AdRPG.setCurrentMap('editor-preview');
      AdRPG.setMap(JSON.parse(JSON.stringify(grid)));
      AdRPG.player.x = 0; AdRPG.player.y = 0;
      for (let y = 0; y < grid.length; y++)
        for (let x = 0; x < grid[y].length; x++)
          if (grid[y][x] === 0) { AdRPG.player.x = x; AdRPG.player.y = y; break; }
      const solids = [...solidTiles], colors = [...tileColors];
      const sg = JSON.parse(JSON.stringify(grid));
      AdRPG.initInput();
      previewLoop = AdRPG.createGameLoop({
        update() {
          AdRPG.handleMovement(AdRPG.player, {
            speed: 0.3,
            collisionOpts: { map: sg, solidTiles: solids.length ? solids : [0] },
          });
          AdRPG.updateCamera({
            target: AdRPG.player, tileSize: CELL,
            mapWidth: sg[0]?.length || 1, mapHeight: sg.length, smoothing: 0.25,
          });
        },
        render() {
          AdRPG.renderWorld({
            map: sg, tileSize: CELL,
            renderTile(c, x, y, id) {
              c.fillStyle = colors[id] || (id === 0 ? '#1a1a2e' : '#888');
              c.fillRect(x, y, CELL, CELL); c.strokeStyle = '#222'; c.strokeRect(x, y, CELL, CELL);
            },
            layers: [{ sortY: AdRPG.player.y, render(c) {
              const p = AdRPG.player;
              c.fillStyle = '#ff6ec7'; c.fillRect(p.x * CELL + 6, p.y * CELL + 6, CELL - 12, CELL - 12);
            }}],
          });
        }, fps: 30,
      });
      AdRPG.setGameStarted(true); previewLoop.start();
    } catch (e) {
      previewContent.innerHTML = `<div style="color:#ff6b6b;">Preview error: ${e.message}</div>`;
    }
  }

  if (typeof window.AdRPG === 'undefined') {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@magmacrunch/adenosine-rpg@0.3.0/dist/index.global.js';
    s.onload = boot;
    s.onerror = () => { previewContent.innerHTML = '<div style="color:#ff6b6b;">Failed to load AdRPG.</div>'; };
    previewContent.appendChild(s);
  } else boot();
}

function closePreview() {
  if (previewLoop) { try { previewLoop.stop(); } catch {} previewLoop = null; }
  previewContent.innerHTML = ''; previewPanel.classList.add('hidden');
}

// ── Keyboard shortcuts ──────────────────────────────────

document.addEventListener('keydown', (e) => {
  const m = e.metaKey || e.ctrlKey;
  if (m && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
  if (m && e.key === 'z' && e.shiftKey)  { e.preventDefault(); redo(); }
  if (m && e.key === 'y')                { e.preventDefault(); redo(); }
});

// ── Init ────────────────────────────────────────────────
initGrid(8, 10);
renderPalette();
renderSolidTiles();
