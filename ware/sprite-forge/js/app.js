// app.js — SPRITE//FORGE
//
// Pixel-art sprite editor. Exports a uniform-grid PNG sheet: frames in a
// single row, so a frame's index and its column are the same number. That is
// the format magnolia reads out of a game's sprites/ directory and the one
// texastoast's SpriteSheet(path, w, h) slices, so one sheet feeds both.
//
// No dependencies, no build step — a classic script, like the other ware apps.
const DEFAULT_COLORS = [
  '#7cb342', '#5d4037', '#e53935', '#1e88e5',
  '#fdd835', '#8e24aa', '#00897b', '#ff6ec7',
  '#f4511e', '#3949ab', '#43a047', '#757575',
  '#000000', '#ffffff',
];
const MIN_SIZE = 1, MAX_SIZE = 128, MAX_FRAMES = 64, MAX_SWATCHES = 32;
const ZOOM_STEPS = [2, 3, 4, 6, 8, 12, 16, 24, 32, 48];
const SHAPE_TOOLS = new Set(['line', 'rect', 'ellipse']);
const ANIM_SCALES = [1, 2, 4, 8];
const SECTION_KEY = 'sprite-forge-sections';
const VIEW_KEY = 'sprite-forge-view';
const SIDEBAR_MIN = 200, SIDEBAR_MAX = 420;
const TOOL_META = {
  pencil: ['Pencil', 'B'], erase: ['Erase', 'E'], fill: ['Fill', 'G'], line: ['Line', 'L'],
  rect: ['Rect', 'U'], ellipse: ['Ellipse', 'C'], pick: ['Pick', 'I'], origin: ['Origin', 'O'],
};

let frameW = 32, frameH = 32;
let frames = [];                // frames[i][y][x] = '#rrggbb' | null
let frameIndex = 0;
let origin = { x: 0, y: 0 };
let palette = [...DEFAULT_COLORS];
let selectedColor = palette[0], selectedSwatch = 0;
let tool = 'pencil';
let zoom = 16;
let mirrorX = false, onionSkin = false, gridOn = true;
let undoStack = [], redoStack = [], painting = false, pendingSnap = null;
let lastPos = null;             // previous pencil/erase position, for stroke interpolation
let shapeStart = null, shapeEnd = null;
let anim = { playing: false, fps: 8, scale: 4, index: 0, timer: null };
let frameCache = [];            // 1:1 offscreen canvas per frame, for previews

const canvas = document.getElementById('frame-canvas');
const ctx = canvas.getContext('2d');
const sheetCanvas = document.getElementById('sheet-canvas');
const sheetCtx = sheetCanvas.getContext('2d');
const animCanvas = document.getElementById('anim-canvas');
const animCtx = animCanvas.getContext('2d');
const paletteEl = document.getElementById('palette');
const colorChip = document.getElementById('color-chip');
const colorLabel = document.getElementById('color-label');
const wInput = document.getElementById('frame-w');
const hInput = document.getElementById('frame-h');
const oxInput = document.getElementById('origin-x');
const oyInput = document.getElementById('origin-y');
const zoomLabel = document.getElementById('zoom-label');
const frameLabel = document.getElementById('frame-label');
const toolReadout = document.getElementById('tool-readout');
const canvasDims = document.getElementById('canvas-dims');
const dimStat = document.getElementById('dimStat');
const frameStat = document.getElementById('frameStat');
const sidebar = document.getElementById('sidebar');
const resizer = document.getElementById('sidebar-resizer');
const animPlayBtn = document.getElementById('anim-play');
const animFpsInput = document.getElementById('anim-fps');
const animScaleBtn = document.getElementById('anim-scale');
const exportOutput = document.getElementById('export-output');
const importModal = document.getElementById('import-modal');
const importFile = document.getElementById('import-file');
const importW = document.getElementById('import-w');
const importH = document.getElementById('import-h');

// ── Frames ──────────────────────────────────────────────

function blankFrame() {
  return Array.from({ length: frameH }, () => Array(frameW).fill(null));
}

function frame() { return frames[frameIndex]; }

function updateFrameLabel() {
  frameLabel.textContent = `${frameIndex + 1} / ${frames.length}`;
  frameStat.textContent = `${frames.length} FRAME${frames.length === 1 ? '' : 'S'}`;
}

// ── Undo / Redo ─────────────────────────────────────────

function currentState() {
  return JSON.parse(JSON.stringify({ frames, frameIndex, origin, frameW, frameH }));
}

function pushUndo(state) {
  undoStack.push(state);
  if (undoStack.length > 100) undoStack.shift();
  redoStack.length = 0;
}

function snapshot() { pushUndo(currentState()); }

// Strokes snapshot once on mousedown and commit only if a pixel changed,
// so Ctrl+Z undoes the whole stroke and no-op clicks don't pollute the stack.
function beginStroke() { pendingSnap = currentState(); }
function commitStroke() { if (pendingSnap) { pushUndo(pendingSnap); pendingSnap = null; } }

function restore(s) {
  frames = s.frames; frameIndex = s.frameIndex; origin = s.origin;
  frameW = s.frameW; frameH = s.frameH;
  wInput.value = frameW; hInput.value = frameH;
  frameCache = [];
  syncOriginInputs(); sizeCanvas(); render(); renderSheet(); updateFrameLabel();
}

function undo() {
  if (!undoStack.length) return;
  const s = undoStack.pop();
  redoStack.push(currentState());
  restore(s);
}

function redo() {
  if (!redoStack.length) return;
  const s = redoStack.pop();
  undoStack.push(currentState());
  restore(s);
}

// ── Canvas rendering ────────────────────────────────────

function sizeCanvas() {
  canvas.width = frameW * zoom;
  canvas.height = frameH * zoom;
  canvasDims.innerHTML = `${frameW} &times; ${frameH}`;
  dimStat.innerHTML = `${frameW}&times;${frameH}`;
}

function render() {
  const f = frame(), half = zoom / 2;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < frameH; y++) {
    for (let x = 0; x < frameW; x++) {
      const px = x * zoom, py = y * zoom;
      ctx.fillStyle = '#2c2c38'; ctx.fillRect(px, py, zoom, zoom);
      ctx.fillStyle = '#3a3a46';
      ctx.fillRect(px + half, py, half, half); ctx.fillRect(px, py + half, half, half);
    }
  }
  if (onionSkin && frames.length > 1) {
    const prev = (frameIndex - 1 + frames.length) % frames.length;
    ctx.globalAlpha = 0.3;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cachedFrame(prev), 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
  }
  for (let y = 0; y < frameH; y++)
    for (let x = 0; x < frameW; x++)
      if (f[y][x]) { ctx.fillStyle = f[y][x]; ctx.fillRect(x * zoom, y * zoom, zoom, zoom); }
  if (shapeStart && shapeEnd) {
    ctx.globalAlpha = 0.6; ctx.fillStyle = selectedColor;
    for (const [x, y] of shapePixels(tool, shapeStart.x, shapeStart.y, shapeEnd.x, shapeEnd.y)) {
      if (x < 0 || x >= frameW || y < 0 || y >= frameH) continue;
      ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
      if (mirrorX) ctx.fillRect((frameW - 1 - x) * zoom, y * zoom, zoom, zoom);
    }
    ctx.globalAlpha = 1;
  }
  if (gridOn && zoom >= 6) {
    ctx.strokeStyle = '#33304a'; ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    for (let x = 1; x < frameW; x++) { ctx.moveTo(x * zoom + .5, 0); ctx.lineTo(x * zoom + .5, canvas.height); }
    for (let y = 1; y < frameH; y++) { ctx.moveTo(0, y * zoom + .5); ctx.lineTo(canvas.width, y * zoom + .5); }
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    for (let x = 8; x < frameW; x += 8) { ctx.moveTo(x * zoom + .5, 0); ctx.lineTo(x * zoom + .5, canvas.height); }
    for (let y = 8; y < frameH; y += 8) { ctx.moveTo(0, y * zoom + .5); ctx.lineTo(canvas.width, y * zoom + .5); }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (mirrorX) {
    ctx.strokeStyle = '#7cc7ff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 + .5, 0); ctx.lineTo(canvas.width / 2 + .5, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  const ox = origin.x * zoom, oy = origin.y * zoom;
  ctx.strokeStyle = '#ff6ec7'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ox + .5, 0); ctx.lineTo(ox + .5, canvas.height);
  ctx.moveTo(0, oy + .5); ctx.lineTo(canvas.width, oy + .5);
  ctx.stroke();
  ctx.strokeRect(ox - 3.5, oy - 3.5, 8, 8);
}

// ── Frame previews (sheet strip + animation) ────────────

function hexToRgb(hex, cache = hexToRgb.cache || (hexToRgb.cache = {})) {
  return cache[hex] || (cache[hex] = [
    parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16),
  ]);
}

function frameToImageData(f) {
  const img = new ImageData(frameW, frameH);
  for (let y = 0; y < frameH; y++) {
    for (let x = 0; x < frameW; x++) {
      const c = f[y][x];
      if (!c) continue;
      const [r, g, b] = hexToRgb(c), i = (y * frameW + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
  }
  return img;
}

function cachedFrame(i) {
  if (!frameCache[i]) {
    const c = document.createElement('canvas');
    c.width = frameW; c.height = frameH;
    c.getContext('2d').putImageData(frameToImageData(frames[i]), 0, 0);
    frameCache[i] = c;
  }
  return frameCache[i];
}

function renderSheet() {
  const scale = 2;
  sheetCanvas.width = frames.length * frameW * scale;
  sheetCanvas.height = frameH * scale;
  sheetCtx.imageSmoothingEnabled = false;
  for (let i = 0; i < frames.length; i++)
    sheetCtx.drawImage(cachedFrame(i), i * frameW * scale, 0, frameW * scale, frameH * scale);
  sheetCtx.strokeStyle = '#3b82f6'; sheetCtx.lineWidth = 2;
  sheetCtx.strokeRect(frameIndex * frameW * scale + 1, 1, frameW * scale - 2, frameH * scale - 2);
  renderAnim();
}

sheetCanvas.addEventListener('click', (e) => {
  const r = sheetCanvas.getBoundingClientRect();
  const i = Math.floor((e.clientX - r.left) / (r.width / frames.length));
  frameIndex = Math.max(0, Math.min(frames.length - 1, i));
  render(); renderSheet(); updateFrameLabel();
});

// ── Animation preview ───────────────────────────────────

function renderAnim() {
  const w = frameW * anim.scale, h = frameH * anim.scale;
  if (animCanvas.width !== w) animCanvas.width = w;
  if (animCanvas.height !== h) animCanvas.height = h;
  animCtx.imageSmoothingEnabled = false;
  animCtx.clearRect(0, 0, w, h);
  const i = anim.playing ? anim.index % frames.length : frameIndex;
  animCtx.drawImage(cachedFrame(i), 0, 0, w, h);
}

function setPlaying(p) {
  anim.playing = p;
  animPlayBtn.innerHTML = p ? '&#10074;&#10074;' : '&#9654;';
  clearInterval(anim.timer); anim.timer = null;
  if (p) {
    anim.index = frameIndex;
    anim.timer = setInterval(() => {
      anim.index = (anim.index + 1) % frames.length;
      renderAnim();
    }, 1000 / anim.fps);
  }
  renderAnim();
}

animPlayBtn.addEventListener('click', () => setPlaying(!anim.playing));

animFpsInput.addEventListener('change', () => {
  anim.fps = Math.max(1, Math.min(30, parseInt(animFpsInput.value, 10) || 8));
  animFpsInput.value = anim.fps;
  if (anim.playing) setPlaying(true);
});

animScaleBtn.addEventListener('click', () => {
  anim.scale = ANIM_SCALES[(ANIM_SCALES.indexOf(anim.scale) + 1) % ANIM_SCALES.length];
  animScaleBtn.innerHTML = `${anim.scale}&times;`;
  renderAnim();
});

// ── Mouse interaction ───────────────────────────────────

function pixelAt(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(frameW - 1, Math.floor((e.clientX - r.left) / zoom))),
    y: Math.max(0, Math.min(frameH - 1, Math.floor((e.clientY - r.top) / zoom))),
  };
}

// Writes one pixel (and its mirror twin when mirroring); returns whether anything changed.
function writePixel(f, x, y, val) {
  let changed = false;
  if (f[y][x] !== val) { commitStroke(); f[y][x] = val; changed = true; }
  if (mirrorX) {
    const mx = frameW - 1 - x;
    if (f[y][mx] !== val) { commitStroke(); f[y][mx] = val; changed = true; }
  }
  if (changed) frameCache[frameIndex] = null;
  return changed;
}

function paintAt(x, y, val) {
  // interpolate from the previous stroke position so fast drags leave no gaps
  const pts = lastPos ? bresenham(lastPos.x, lastPos.y, x, y) : [[x, y]];
  let changed = false;
  for (const [px, py] of pts) changed = writePixel(frame(), px, py, val) || changed;
  lastPos = { x, y };
  if (changed) { render(); renderSheet(); }
}

function pickColor(x, y) {
  const c = frame()[y][x];
  if (!c) return;
  selectedColor = c; selectedSwatch = palette.indexOf(c);
  updatePaletteActive(); updateColorChip();
}

canvas.addEventListener('mousedown', (e) => {
  e.preventDefault();
  if (e.button === 2) return;
  const c = pixelAt(e);
  if (e.altKey) { pickColor(c.x, c.y); return; }
  if (SHAPE_TOOLS.has(tool)) {
    beginStroke(); shapeStart = c; shapeEnd = c; painting = true;
    render();
    return;
  }
  beginStroke();
  painting = true; lastPos = null;
  if (tool === 'pencil') paintAt(c.x, c.y, selectedColor);
  else if (tool === 'erase') paintAt(c.x, c.y, null);
  else if (tool === 'fill') {
    const from = frame()[c.y][c.x];
    if (from !== selectedColor) {
      commitStroke(); floodFill(c.x, c.y, from, selectedColor);
      frameCache[frameIndex] = null; render(); renderSheet();
    }
  } else if (tool === 'pick') pickColor(c.x, c.y);
  else if (tool === 'origin') {
    if (origin.x !== c.x || origin.y !== c.y) {
      commitStroke(); origin = { x: c.x, y: c.y }; syncOriginInputs(); render();
    }
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (!painting) return;
  const c = pixelAt(e);
  if (shapeStart) { shapeEnd = c; render(); }
  else if (tool === 'pencil') paintAt(c.x, c.y, selectedColor);
  else if (tool === 'erase') paintAt(c.x, c.y, null);
});

canvas.addEventListener('mouseup', () => {
  if (shapeStart && shapeEnd) {
    const pts = shapePixels(tool, shapeStart.x, shapeStart.y, shapeEnd.x, shapeEnd.y);
    let changed = false;
    for (const [x, y] of pts) {
      if (x < 0 || x >= frameW || y < 0 || y >= frameH) continue;
      changed = writePixel(frame(), x, y, selectedColor) || changed;
    }
    shapeStart = null; shapeEnd = null;
    render(); if (changed) renderSheet();
  }
  painting = false; lastPos = null; pendingSnap = null;
});

canvas.addEventListener('mouseleave', () => {
  if (shapeStart) { shapeStart = null; shapeEnd = null; render(); }
  painting = false; lastPos = null; pendingSnap = null;
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault(); const c = pixelAt(e);
  beginStroke();
  if (writePixel(frame(), c.x, c.y, null)) { render(); renderSheet(); }
  pendingSnap = null;
});

// ── Shape + line plotting ───────────────────────────────

function bresenham(x0, y0, x1, y1) {
  const pts = [];
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) {
    pts.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
  return pts;
}

function shapePixels(kind, x0, y0, x1, y1) {
  if (kind === 'line') return bresenham(x0, y0, x1, y1);
  const xa = Math.min(x0, x1), xb = Math.max(x0, x1);
  const ya = Math.min(y0, y1), yb = Math.max(y0, y1);
  const pts = [];
  if (kind === 'rect') {
    for (let x = xa; x <= xb; x++) pts.push([x, ya], [x, yb]);
    for (let y = ya + 1; y < yb; y++) pts.push([xa, y], [xb, y]);
    return pts;
  }
  // ellipse outline inscribed in the drag box; plot from both axes to avoid gaps
  const rx = (xb - xa) / 2, ry = (yb - ya) / 2;
  const cx = (xa + xb) / 2, cy = (ya + yb) / 2;
  if (rx < 0.5 || ry < 0.5) return bresenham(x0, y0, x1, y1);
  for (let x = xa; x <= xb; x++) {
    const dy = ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2));
    pts.push([x, Math.round(cy - dy)], [x, Math.round(cy + dy)]);
  }
  for (let y = ya; y <= yb; y++) {
    const dx = rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2));
    pts.push([Math.round(cx - dx), y], [Math.round(cx + dx), y]);
  }
  return pts;
}

// ── Flood fill ──────────────────────────────────────────

function floodFill(x, y, from, to) {
  if (from === to) return;
  const f = frame(), stack = [[x, y]];
  while (stack.length) {
    const [cx, cy] = stack.pop();
    if (cx < 0 || cx >= frameW || cy < 0 || cy >= frameH) continue;
    if (f[cy][cx] !== from) continue;
    f[cy][cx] = to;
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
}

// ── Frame ops ───────────────────────────────────────────

function mutateFrame(fn) {
  snapshot();
  frames[frameIndex] = fn(frame());
  frameCache[frameIndex] = null;
  render(); renderSheet();
}

document.getElementById('flip-h').addEventListener('click', () =>
  mutateFrame(f => f.map(row => [...row].reverse())));

document.getElementById('flip-v').addEventListener('click', () =>
  mutateFrame(f => [...f].reverse().map(row => [...row])));

document.getElementById('rot-90').addEventListener('click', () => {
  if (frameW !== frameH) return;
  mutateFrame(f => Array.from({ length: frameH }, (_, y) =>
    Array.from({ length: frameW }, (_, x) => f[frameH - 1 - x][y])));
});

function shiftFrame(dx, dy) {
  mutateFrame(f => Array.from({ length: frameH }, (_, y) =>
    Array.from({ length: frameW }, (_, x) =>
      f[(y - dy + frameH) % frameH][(x - dx + frameW) % frameW])));
}

document.getElementById('shift-left').addEventListener('click', () => shiftFrame(-1, 0));
document.getElementById('shift-right').addEventListener('click', () => shiftFrame(1, 0));
document.getElementById('shift-up').addEventListener('click', () => shiftFrame(0, -1));
document.getElementById('shift-down').addEventListener('click', () => shiftFrame(0, 1));

// ── Palette ─────────────────────────────────────────────

function renderPalette() {
  paletteEl.innerHTML = '';
  for (let i = 0; i < palette.length; i++) {
    const idx = i;
    const div = document.createElement('div');
    div.className = 'swatch' + (idx === selectedSwatch ? ' active' : '');
    div.dataset.idx = idx;
    const ci = document.createElement('input');
    ci.type = 'color'; ci.value = palette[i];
    ci.addEventListener('input', (e) => {
      e.stopPropagation(); palette[idx] = e.target.value;
      div.style.backgroundColor = e.target.value;
      if (idx === selectedSwatch) { selectedColor = e.target.value; updateColorChip(); }
    });
    ci.addEventListener('click', (e) => e.stopPropagation());
    div.addEventListener('click', () => {
      selectedSwatch = idx; selectedColor = palette[idx];
      if (!['pencil', 'fill', 'line', 'rect', 'ellipse'].includes(tool)) { tool = 'pencil'; updateToolActive(); }
      updatePaletteActive(); updateColorChip();
    });
    div.style.backgroundColor = palette[i];
    div.appendChild(ci); paletteEl.appendChild(div);
  }
  updateColorChip();
}

function updatePaletteActive() {
  paletteEl.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', Number(s.dataset.idx) === selectedSwatch));
}

function updateColorChip() {
  colorChip.style.backgroundColor = selectedColor;
  colorLabel.textContent = selectedColor;
}

document.getElementById('add-color-btn').addEventListener('click', () => {
  if (palette.length >= MAX_SWATCHES) return;
  palette.push(selectedColor); selectedSwatch = palette.length - 1;
  renderPalette();
});

// ── Shade ramp ──────────────────────────────────────────

function hexToHsl(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => {
    t = ((t % 1) + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return '#' + [f(h + 1 / 3), f(h), f(h - 1 / 3)]
    .map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
}

document.getElementById('ramp-btn').addEventListener('click', () => {
  // pixel-art style ramp: shadows shift hue toward blue, highlights toward yellow
  const [h, s, l] = hexToHsl(selectedColor);
  const shades = [
    hslToHex(h + 16, Math.min(1, s + 0.08), Math.max(0.06, l - 0.22)),
    hslToHex(h + 8, s, Math.max(0.06, l - 0.11)),
    hslToHex(h - 8, s, Math.min(0.94, l + 0.11)),
    hslToHex(h - 16, Math.max(0, s - 0.08), Math.min(0.94, l + 0.22)),
  ];
  for (const c of shades)
    if (palette.length < MAX_SWATCHES && !palette.includes(c)) palette.push(c);
  renderPalette(); updatePaletteActive();
});

// ── Tool buttons + toggles ──────────────────────────────

function updateToolActive() {
  document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
  const [name, key] = TOOL_META[tool] || [tool, ''];
  toolReadout.innerHTML = '';
  const label = document.createElement('strong'); label.textContent = name;
  const kbd = document.createElement('kbd'); kbd.textContent = key;
  toolReadout.append(label, kbd);
}

document.querySelectorAll('.tool-btn[data-tool]').forEach(btn =>
  btn.addEventListener('click', () => { tool = btn.dataset.tool; updateToolActive(); }));

const mirrorToggle = document.getElementById('mirror-toggle');
const onionToggle = document.getElementById('onion-toggle');
const gridToggle = document.getElementById('grid-toggle');

function setMirror(v) { mirrorX = v; mirrorToggle.classList.toggle('active', v); render(); saveViewPrefs(); }
function setOnion(v) { onionSkin = v; onionToggle.classList.toggle('active', v); render(); saveViewPrefs(); }
function setGrid(v) { gridOn = v; gridToggle.classList.toggle('active', v); render(); saveViewPrefs(); }

mirrorToggle.addEventListener('click', () => setMirror(!mirrorX));
onionToggle.addEventListener('click', () => setOnion(!onionSkin));
gridToggle.addEventListener('click', () => setGrid(!gridOn));

// ── Frame size ──────────────────────────────────────────

function resizeTo(w, h) {
  if (w === frameW && h === frameH) return;
  snapshot();
  const prev = frames;
  frameW = w; frameH = h;
  frames = prev.map(f => Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => (f[y] && f[y][x]) || null)));
  origin.x = Math.min(origin.x, w); origin.y = Math.min(origin.y, h);
  wInput.value = w; hInput.value = h;
  frameCache = [];
  syncOriginInputs(); sizeCanvas(); render(); renderSheet();
}

document.getElementById('resize-btn').addEventListener('click', () => {
  const w = Math.max(MIN_SIZE, Math.min(MAX_SIZE, parseInt(wInput.value, 10) || 32));
  const h = Math.max(MIN_SIZE, Math.min(MAX_SIZE, parseInt(hInput.value, 10) || 32));
  wInput.value = w; hInput.value = h;
  resizeTo(w, h);
});

document.querySelectorAll('.preset-btn').forEach(btn =>
  btn.addEventListener('click', () => {
    const s = parseInt(btn.dataset.size, 10);
    resizeTo(s, s);
  }));

// ── Origin inputs ───────────────────────────────────────

function syncOriginInputs() {
  oxInput.value = origin.x; oyInput.value = origin.y;
  oxInput.max = frameW; oyInput.max = frameH;
}

for (const [input, axis, max] of [[oxInput, 'x', () => frameW], [oyInput, 'y', () => frameH]]) {
  input.addEventListener('change', () => {
    const v = Math.max(0, Math.min(max(), parseInt(input.value, 10) || 0));
    input.value = v;
    if (origin[axis] !== v) { snapshot(); origin[axis] = v; render(); }
  });
}

// ── Frame buttons ───────────────────────────────────────

document.getElementById('frame-prev').addEventListener('click', () => stepFrame(-1));
document.getElementById('frame-next').addEventListener('click', () => stepFrame(1));

function stepFrame(d) {
  frameIndex = Math.max(0, Math.min(frames.length - 1, frameIndex + d));
  render(); renderSheet(); updateFrameLabel();
}

document.getElementById('frame-add').addEventListener('click', () => {
  if (frames.length >= MAX_FRAMES) return;
  snapshot();
  frames.splice(frameIndex + 1, 0, blankFrame());
  frameIndex++; frameCache = [];
  render(); renderSheet(); updateFrameLabel();
});

document.getElementById('frame-dup').addEventListener('click', () => {
  if (frames.length >= MAX_FRAMES) return;
  snapshot();
  frames.splice(frameIndex + 1, 0, JSON.parse(JSON.stringify(frame())));
  frameIndex++; frameCache = [];
  render(); renderSheet(); updateFrameLabel();
});

document.getElementById('frame-del').addEventListener('click', () => {
  if (frames.length <= 1) return;
  snapshot();
  frames.splice(frameIndex, 1);
  frameIndex = Math.min(frameIndex, frames.length - 1); frameCache = [];
  render(); renderSheet(); updateFrameLabel();
});

// ── Zoom ────────────────────────────────────────────────

document.getElementById('zoom-out').addEventListener('click', () =>
  setZoom([...ZOOM_STEPS].reverse().find(s => s < zoom) ?? zoom));
document.getElementById('zoom-in').addEventListener('click', () =>
  setZoom(ZOOM_STEPS.find(s => s > zoom) ?? zoom));

function setZoom(z) {
  zoom = z;
  zoomLabel.innerHTML = `${zoom}&times;`;
  sizeCanvas(); render(); saveViewPrefs();
}

// ── Export ──────────────────────────────────────────────

document.getElementById('export-btn').addEventListener('click', () => {
  const sheet = document.createElement('canvas');
  sheet.width = frameW * frames.length; sheet.height = frameH;
  const sctx = sheet.getContext('2d');
  frames.forEach((f, i) => sctx.putImageData(frameToImageData(f), i * frameW, 0));
  const name = `sprite_${frameW}x${frameH}.png`;
  const a = document.createElement('a');
  a.download = name; a.href = sheet.toDataURL('image/png'); a.click();
  exportOutput.value = [
    `// sprite//forge — ${frames.length} frame${frames.length === 1 ? '' : 's'}, ${frameW}×${frameH}, sheet ${sheet.width}×${sheet.height}`,
    `// origin: (${origin.x}, ${origin.y})   (not stored in the PNG — pass it at load time)`,
    `// texastoast:  SpriteSheet('${name}', ${frameW}, ${frameH})   frame i = (i, 0)`,
    `// magnolia:    sprite_load(&s, "${name}", ${origin.x}, ${origin.y});`,
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
  importFile.value = ''; importW.value = frameW; importH.value = frameH;
  importModal.showModal();
});
document.getElementById('import-cancel').addEventListener('click', () => importModal.close());
importModal.querySelector('.modal-close').addEventListener('click', () => importModal.close());
importModal.addEventListener('click', (e) => { if (e.target === importModal) importModal.close(); });

function importError(el, msg) {
  el.style.borderColor = '#e53935'; el.title = msg;
  setTimeout(() => el.style.borderColor = '', 1500);
}

document.getElementById('import-confirm').addEventListener('click', () => {
  const file = importFile.files[0];
  if (!file) { importError(importFile, 'Pick a PNG file'); return; }
  const w = Math.max(MIN_SIZE, Math.min(MAX_SIZE, parseInt(importW.value, 10) || 32));
  const h = Math.max(MIN_SIZE, Math.min(MAX_SIZE, parseInt(importH.value, 10) || 32));
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    const cols = Math.floor(img.naturalWidth / w), rowsN = Math.floor(img.naturalHeight / h);
    if (!cols || !rowsN) { importError(importW, `Image is smaller than one ${w}×${h} frame`); return; }
    const src = document.createElement('canvas');
    src.width = img.naturalWidth; src.height = img.naturalHeight;
    const sctx = src.getContext('2d');
    sctx.drawImage(img, 0, 0);
    snapshot();
    frameW = w; frameH = h;
    wInput.value = w; hInput.value = h;
    frames = []; const counts = {};
    for (let row = 0; row < rowsN && frames.length < MAX_FRAMES; row++) {
      for (let col = 0; col < cols && frames.length < MAX_FRAMES; col++) {
        const d = sctx.getImageData(col * w, row * h, w, h).data;
        const f = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => {
          const i = (y * w + x) * 4;
          if (d[i + 3] < 128) return null;
          const hex = '#' + [d[i], d[i + 1], d[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('');
          counts[hex] = (counts[hex] || 0) + 1;
          return hex;
        }));
        frames.push(f);
      }
    }
    const harvested = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, MAX_SWATCHES);
    if (harvested.length) {
      palette = harvested; selectedSwatch = 0; selectedColor = palette[0];
      renderPalette(); updatePaletteActive();
    }
    frameIndex = 0; frameCache = [];
    origin.x = Math.min(origin.x, w); origin.y = Math.min(origin.y, h);
    const truncated = (img.naturalWidth % w) || (img.naturalHeight % h)
      ? ` (image not evenly divisible by ${w}×${h} — trailing pixels dropped)` : '';
    exportOutput.value = `// imported ${frames.length} frame${frames.length === 1 ? '' : 's'} of ${w}×${h} from ${file.name}${truncated}`;
    syncOriginInputs(); sizeCanvas(); render(); renderSheet(); updateFrameLabel();
    importModal.close();
  };
  img.onerror = () => { URL.revokeObjectURL(url); importError(importFile, 'Could not read that file as an image'); };
  img.src = url;
});

// ── Clear ───────────────────────────────────────────────

document.getElementById('clear-btn').addEventListener('click', () => {
  if (!frame().some(row => row.some(px => px !== null))) return;
  snapshot();
  frames[frameIndex] = blankFrame();
  frameCache[frameIndex] = null;
  render(); renderSheet();
});

// ── Keyboard shortcuts ──────────────────────────────────

document.addEventListener('keydown', (e) => {
  if ((e.target.matches && e.target.matches('input, textarea')) || importModal.open) return;
  const m = e.metaKey || e.ctrlKey;
  if (m && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
  if (m && e.key === 'z' && e.shiftKey)  { e.preventDefault(); redo(); return; }
  if (m && e.key === 'y')                { e.preventDefault(); redo(); return; }
  if (m) return;
  const tools = { b: 'pencil', e: 'erase', g: 'fill', l: 'line', u: 'rect', c: 'ellipse', i: 'pick', o: 'origin' };
  if (tools[e.key]) { tool = tools[e.key]; updateToolActive(); }
  else if (e.key === 'm') setMirror(!mirrorX);
  else if (e.key === 'n') setOnion(!onionSkin);
  else if (e.key === 'd') setGrid(!gridOn);
  else if (e.key === 'h') document.getElementById('flip-h').click();
  else if (e.key === 'v') document.getElementById('flip-v').click();
  else if (e.key === 'r') document.getElementById('rot-90').click();
  else if (e.key === ' ') { e.preventDefault(); setPlaying(!anim.playing); }
  else if (e.key === 'ArrowLeft')  { e.preventDefault(); shiftFrame(-1, 0); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); shiftFrame(1, 0); }
  else if (e.key === 'ArrowUp')    { e.preventDefault(); shiftFrame(0, -1); }
  else if (e.key === 'ArrowDown')  { e.preventDefault(); shiftFrame(0, 1); }
  else if (e.key === '[') stepFrame(-1);
  else if (e.key === ']') stepFrame(1);
  else if (e.key === '-') setZoom([...ZOOM_STEPS].reverse().find(s => s < zoom) ?? zoom);
  else if (e.key === '=') setZoom(ZOOM_STEPS.find(s => s > zoom) ?? zoom);
});

// ── Sidebar sections ────────────────────────────────────

const sections = [...document.querySelectorAll('#sidebar details[data-section]')];

function readPrefs(key) {
  try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
}

function writePrefs(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function loadSectionPrefs() {
  const prefs = readPrefs(SECTION_KEY);
  if (!prefs) return;
  for (const d of sections)
    if (d.dataset.section in prefs) d.open = !!prefs[d.dataset.section];
}

function saveSectionPrefs() {
  const prefs = {};
  for (const d of sections) prefs[d.dataset.section] = d.open;
  writePrefs(SECTION_KEY, prefs);
}

sections.forEach(d => d.addEventListener('toggle', saveSectionPrefs));

// ── View preferences ────────────────────────────────────

function saveViewPrefs() {
  writePrefs(VIEW_KEY, { zoom, gridOn, mirrorX, onionSkin, sidebarW: sidebar.offsetWidth });
}

function loadViewPrefs() {
  const p = readPrefs(VIEW_KEY);
  if (!p) return;
  if (ZOOM_STEPS.includes(p.zoom)) zoom = p.zoom;
  if (typeof p.gridOn === 'boolean') gridOn = p.gridOn;
  if (typeof p.mirrorX === 'boolean') mirrorX = p.mirrorX;
  if (typeof p.onionSkin === 'boolean') onionSkin = p.onionSkin;
  if (p.sidebarW) setSidebarWidth(p.sidebarW);
  zoomLabel.innerHTML = `${zoom}&times;`;
  gridToggle.classList.toggle('active', gridOn);
  mirrorToggle.classList.toggle('active', mirrorX);
  onionToggle.classList.toggle('active', onionSkin);
}

// ── Sidebar resizing ────────────────────────────────────

function setSidebarWidth(px) {
  sidebar.style.width = `${Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, px))}px`;
}

resizer.addEventListener('mousedown', (e) => {
  e.preventDefault();
  resizer.classList.add('dragging');
  document.body.classList.add('resizing');
  // width grows as the pointer moves left, so measure from the window's right edge
  const move = (ev) => setSidebarWidth(window.innerWidth - ev.clientX);
  const up = () => {
    resizer.classList.remove('dragging');
    document.body.classList.remove('resizing');
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
    saveViewPrefs();
  };
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
});

resizer.addEventListener('dblclick', () => { setSidebarWidth(240); saveViewPrefs(); });

// ── Init ────────────────────────────────────────────────
loadSectionPrefs();
loadViewPrefs();
frames = [blankFrame()];
sizeCanvas();
render();
renderSheet();
renderPalette();
updateToolActive();
updateFrameLabel();
syncOriginInputs();
