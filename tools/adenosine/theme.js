// theme.js — adenosine CSS theme customizer
const VARS = {
  cards: [
    { name: '--fc-red',          default: '#cc0000',  label: 'Red suit ink' },
    { name: '--fc-black',        default: '#111111',  label: 'Black suit ink' },
    { name: '--fc-gold',         default: '#d4a017',  label: 'Gold accent' },
    { name: '--fc-blue',         default: '#1a3a8a',  label: 'Blue accent' },
    { name: '--fc-skin',         default: '#f5cba7',  label: 'Skin tone' },
    { name: '--fc-steel',        default: '#8899aa',  label: 'Steel/weapon' },
    { name: '--fc-art-bg',       default: '#fffef5',  label: 'Face card art bg' },
    { name: '--fc-card-bg',      default: '#fffef5',  label: 'Card body bg' },
    { name: '--card-face-bg',    default: '#fffef5',  label: 'Face-up card bg' },
    { name: '--card-back-bg',    default: '#1a3a8a',  label: 'Card back bg' },
    { name: '--retro-gold',      default: '#ffd700',  label: 'Selection highlight' },
    { name: '--chip-bg',         default: '#0a0a0a',  label: 'Chip area bg' },
    { name: '--chip-text',       default: '#ffe03a',  label: 'Chip count text' },
  ],
  puzzle: [
    { name: '--apz-bg-panel',       default: '#1a0a2a',  label: 'Board background' },
    { name: '--apz-accent',         default: '#00f5ff',  label: 'Board border & glow' },
    { name: '--apz-text',           default: '#f0ead8',  label: 'Tile text color' },
  ],
  chat: [
    { name: '--acw-bg',            default: '#1a1028',  label: 'Button background' },
    { name: '--acw-bg-panel',      default: '#150b29',  label: 'Window background' },
    { name: '--acw-bg-input',      default: '#0f0a1a',  label: 'Input background' },
    { name: '--acw-accent',        default: '#ff2e9c',  label: 'Primary accent' },
    { name: '--acw-accent-hover',  default: '#ff5ab5',  label: 'Accent hover' },
    { name: '--acw-border',        default: '#3a2d5c',  label: 'Border color' },
    { name: '--acw-cream',         default: '#f0ead8',  label: 'Default text' },
    { name: '--acw-ink-on-accent', default: '#0a0612',  label: 'Text on accent' },
    { name: '--acw-online',        default: '#39ff6e',  label: 'Online indicator' },
    { name: '--acw-text',          default: '#f0f8ff',  label: 'Input text' },
    { name: '--acw-text-dim',      default: '#8a7fa8',  label: 'Dimmed text' },
    { name: '--acw-text-muted',    default: '#5a5a6a',  label: 'Muted text' },
  ],
  multiplayer: [
    { name: '--bg-dark',  default: '#060e1a',  label: 'Dark background' },
    { name: '--bg-mid',   default: '#1a2a44',  label: 'Panel background' },
    { name: '--accent',   default: '#00f5ff',  label: 'Primary accent' },
    { name: '--border',   default: '#1a2a44',  label: 'Border color' },
    { name: '--cream',    default: '#f0ead8',  label: 'Body text' },
    { name: '--gold',     default: '#ffe03a',  label: 'Gold accent' },
    { name: '--slate',    default: '#4a6a7a',  label: 'Slate/muted text' },
  ],
};

const PKG_META = {
  cards:       { version: '0.7.4', global: 'AdCards',   css: ['cards.css', 'chip-animation.css'] },
  puzzle:      { version: '0.2.5', global: 'AdPuzzle',  css: ['puzzle-base.css', 'puzzle-grid.css', 'puzzle-modals.css', 'puzzle-responsive.css'] },
  chat:        { version: '0.4.3', global: 'AdChat',    css: ['chat-widget.css'] },
  multiplayer: { version: '0.4.4', global: 'AdMP',      css: ['lobby.css'] },
};

const CDN = 'https://cdn.jsdelivr.net/npm/@magmacrunch';

// State
let currentPkg = 'cards';
let values = {};
let loadedCssLinks = [];
let loadedScript = null;

// DOM
const pkgSelect     = document.getElementById('pkg-select');
const variablesEl   = document.getElementById('variables');
const previewContent= document.getElementById('preview-content');
const exportOutput  = document.getElementById('export-output');
const statusDot     = document.getElementById('status-dot');

// ── Variables ─────────────────────────────────────────

function getDefaults(pkg) {
  const vars = {};
  for (const v of VARS[pkg]) vars[v.name] = v.default;
  return vars;
}

function setVar(name, value) {
  values[name] = value;
  if (previewContent.firstElementChild) {
    previewContent.firstElementChild.style.setProperty(name, value);
  }
}

function resetVars() {
  values = { ...getDefaults(currentPkg) };
  renderPickers();
  applyTheme();
  updateExport();
}

// ── Loaders ───────────────────────────────────────────

function clearCss() {
  for (const link of loadedCssLinks) link.remove();
  loadedCssLinks = [];
}

function loadCSS(pkg) {
  clearCss();
  const meta = PKG_META[pkg];
  for (const file of meta.css) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${CDN}/adenosine-${pkg}@${meta.version}/${file}`;
    document.head.appendChild(link);
    loadedCssLinks.push(link);
  }
}

function loadBundle(pkg) {
  return new Promise((resolve) => {
    if (loadedScript) { loadedScript.remove(); loadedScript = null; }
    const meta = PKG_META[pkg];
    if (window[meta.global]) { setStatus(true); resolve(); return; }
    const s = document.createElement('script');
    s.src = `${CDN}/adenosine-${pkg}@${meta.version}/dist/index.global.js`;
    s.onload = () => { setStatus(true); resolve(); };
    s.onerror = () => { setStatus(false); resolve(); };
    document.body.appendChild(s);
    loadedScript = s;
  });
}

function setStatus(ok) {
  if (!statusDot) return;
  statusDot.className = ok ? 'dot ok' : 'dot err';
}

// ── Preview renderers ─────────────────────────────────

function renderCardsPreview() {
  const el = document.createElement('div');
  el.className = 'theme-preview-cards';
  el.innerHTML = `
    <style>
      .theme-preview-cards {
        display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 1.5rem;
      }
      .theme-preview-cards .hand { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
    </style>
  `;

  if (typeof window.AdCards !== 'undefined') {
    const hand = document.createElement('div');
    hand.className = 'hand';
    const deck = new AdCards.Deck();
    deck.shuffle();
    for (let i = 0; i < 5; i++) {
      const card = deck.deal();
      card.faceUp = true;
      hand.appendChild(card.getHTML());
    }
    el.appendChild(hand);
  } else {
    el.innerHTML += '<p style="color:#9d99b5;font-size:12px;">Loading cards package...</p>';
  }
  return el;
}

function renderPuzzlePreview() {
  const el = document.createElement('div');
  el.className = 'theme-preview-puzzle';
  el.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:1rem;padding:1.5rem;';

  const board = document.createElement('div');
  board.className = 'game-board';
  board.style.cssText = 'width:320px;height:320px;';

  const nums = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,0];
  for (const n of nums) {
    const tile = document.createElement('div');
    tile.className = 'tile' + (n === 0 ? ' tile-empty' : '');
    if (n) tile.setAttribute('data-value', n);
    tile.textContent = n || '';
    board.appendChild(tile);
  }
  el.appendChild(board);
  return el;
}

function renderChatPreview() {
  const el = document.createElement('div');
  el.className = 'theme-preview-chat';
  el.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:1rem;padding:1.5rem;';

  const widget = document.createElement('div');
  widget.className = 'acw expanded';
  widget.style.cssText = 'position:relative;width:280px;bottom:auto;right:auto;';

  widget.innerHTML = `
    <div class="acw-bar">
      <div class="acw-icon"></div>
      <span class="acw-online-count" style="color:var(--acw-online,#39ff6e);">3</span>
    </div>
    <div class="acw-header">
      <span class="acw-header-title">LOBBY CHAT</span>
      <button class="acw-minimize" style="background:none;border:none;color:var(--acw-cream,#f0ead8);cursor:pointer;font-size:14px;">&#x2212;</button>
    </div>
    <div class="acw-window">
      <div class="acw-messages">
        <div class="acw-msg"><span class="chat-name" style="color:var(--acw-accent,#ff2e9c);">Jake:</span> <span style="color:var(--acw-text-dim,#8a7fa8);">hey anyone up for cribbage?</span></div>
        <div class="acw-msg"><span class="chat-name" style="color:var(--acw-online,#39ff6e);">Bot:</span> <span style="color:var(--acw-text-dim,#8a7fa8);">I'm always ready</span></div>
        <div class="acw-msg system" style="color:var(--acw-text-muted,#5a5a6a);font-style:italic;">Mike joined the room</div>
        <div class="acw-msg"><span class="chat-name" style="color:var(--acw-accent-hover,#ff5ab5);">Mike:</span> <span style="color:var(--acw-text-dim,#8a7fa8);">let's go</span></div>
      </div>
      <div class="acw-input">
        <input type="text" placeholder="Type a message..." style="background:var(--acw-bg-input,#0f0a1a);color:var(--acw-text,#f0f8ff);border:1px solid var(--acw-border,#3a2d5c);border-radius:6px;padding:6px 10px;font-size:12px;font-family:'Courier Prime',monospace;width:100%;">
        <button style="background:var(--acw-accent,#ff2e9c);color:var(--acw-ink-on-accent,#0a0612);border:none;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:11px;font-family:'Courier Prime',monospace;">Send</button>
      </div>
    </div>
  `;
  el.appendChild(widget);
  return el;
}

function renderMultiplayerPreview() {
  const el = document.createElement('div');
  el.className = 'theme-preview-mp';
  el.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:1rem;padding:1.5rem;';

  const lobby = document.createElement('div');
  lobby.className = 'lobby-overlay';
  lobby.style.cssText = 'position:relative;background:transparent;';

  lobby.innerHTML = `
    <div class="lobby-panel">
      <div class="lobby-title">GAME LOBBY</div>
      <div class="lobby-room-code">
        <div class="lobby-room-label">ROOM CODE</div>
        <div class="lobby-room-value">ABCD</div>
      </div>
      <div class="lobby-players">
        <div class="lobby-players-title">PLAYERS</div>
        <div class="lobby-player">
          <span class="lobby-player-color" style="background:#39ff6e;"></span>
          <span class="lobby-player-name">Jake</span>
          <span class="lobby-player-host">HOST</span>
        </div>
        <div class="lobby-player">
          <span class="lobby-player-color" style="background:var(--accent,#00f5ff);"></span>
          <span class="lobby-player-name">Mike</span>
        </div>
        <div class="lobby-player">
          <span class="lobby-player-color" style="background:var(--gold,#ffe03a);"></span>
          <span class="lobby-player-name">Waiting...</span>
        </div>
      </div>
      <div class="lobby-buttons">
        <button style="background:var(--accent,#00f5ff);color:var(--bg-dark,#060e1a);border:none;border-radius:8px;padding:10px 24px;font-family:'Press Start 2P',monospace;font-size:10px;cursor:pointer;">START GAME</button>
      </div>
    </div>
  `;
  el.appendChild(lobby);
  return el;
}

const PREVIEW_RENDERERS = {
  cards: renderCardsPreview,
  puzzle: renderPuzzlePreview,
  chat: renderChatPreview,
  multiplayer: renderMultiplayerPreview,
};

// ── Apply theme ───────────────────────────────────────

function applyTheme() {
  previewContent.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;align-items:center;justify-content:center;min-height:100%;';
  previewContent.appendChild(wrapper);

  for (const [name, value] of Object.entries(values)) {
    wrapper.style.setProperty(name, value);
  }
  wrapper.style.setProperty('color-scheme', 'dark');

  const render = PREVIEW_RENDERERS[currentPkg];
  if (render) wrapper.appendChild(render());
}

// ── Pickers ───────────────────────────────────────────

function renderPickers() {
  variablesEl.innerHTML = '';
  for (const v of VARS[currentPkg]) {
    const row = document.createElement('div');
    row.className = 'picker-row';

    const label = document.createElement('span');
    label.className = 'picker-label';
    label.textContent = v.label;

    const varName = document.createElement('span');
    varName.className = 'picker-var';
    varName.textContent = v.name;

    const colorWrap = document.createElement('div');
    colorWrap.className = 'picker-color';
    colorWrap.style.background = values[v.name];

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = values[v.name];
    colorInput.addEventListener('input', () => {
      values[v.name] = colorInput.value;
      colorWrap.style.background = colorInput.value;
      setVar(v.name, colorInput.value);
      updateExport();
    });

    colorWrap.appendChild(colorInput);
    row.appendChild(label);
    row.appendChild(varName);
    row.appendChild(colorWrap);
    variablesEl.appendChild(row);
  }
}

// ── Export ────────────────────────────────────────────

function updateExport() {
  const vars = VARS[currentPkg];
  let css = ':root {\n';
  for (const v of vars) {
    if (values[v.name] !== v.default) {
      css += `  ${v.name}: ${values[v.name]};\n`;
    }
  }
  css += '}';
  exportOutput.value = css;
}

// ── Init ──────────────────────────────────────────────

async function switchPackage(pkg) {
  currentPkg = pkg;
  values = { ...getDefaults(pkg) };
  setStatus(null);
  loadCSS(pkg);
  await loadBundle(pkg);
  renderPickers();
  applyTheme();
  updateExport();
}

pkgSelect.addEventListener('change', () => switchPackage(pkgSelect.value));

document.getElementById('reset-btn').addEventListener('click', resetVars);

document.getElementById('export-btn').addEventListener('click', () => {
  exportOutput.select();
});

document.getElementById('copy-btn').addEventListener('click', () => {
  navigator.clipboard.writeText(exportOutput.value).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
  });
});

// ── Styles ────────────────────────────────────────────

const style = document.createElement('style');
style.textContent = `
  /* Layout */
  #sidebar {
    width: 320px; flex-shrink: 0;
    display: flex; flex-direction: column;
    background: #1c1b26;
    border-left: 1px solid #33304a;
    overflow-y: auto;
  }
  #sidebar section {
    padding: .75rem 1rem;
    border-bottom: 1px solid #1e1d28;
  }
  #sidebar h2 {
    font-family: 'Press Start 2P', monospace;
    font-size: 9px; color: #9d99b5;
    margin-bottom: .5rem; letter-spacing: 0.05em;
  }
  .action-row {
    display: flex; gap: .5rem;
  }
  #export-panel {
    border-top: 1px solid #33304a;
    background: #1c1b26;
    flex-shrink: 0;
  }
  .export-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: .4rem 1rem;
    border-bottom: 1px solid #1e1d28;
    font-family: 'Press Start 2P', monospace;
    font-size: 8px; color: #9d99b5;
  }
  #export-output {
    width: 100%; border: none; outline: none; resize: none;
    background: #14141b; color: #7cc7ff;
    font: 12px/1.5 'Courier Prime', monospace;
    padding: .5rem 1rem;
  }

  /* Pickers */
  .picker-row {
    display: flex; align-items: center; gap: .5rem;
    padding: .3rem 0; border-bottom: 1px solid #1e1d28;
  }
  .picker-label { font-size: 11px; color: #e8e6f0; flex: 1; }
  .picker-var { font-size: 10px; color: #9d99b5; font-family: 'Courier Prime', monospace; }
  .picker-color {
    width: 24px; height: 24px; border-radius: 6px;
    border: 1px solid #33304a; position: relative; overflow: hidden;
    cursor: pointer; flex-shrink: 0;
  }
  .picker-color input {
    position: absolute; inset: -4px; width: calc(100% + 8px); height: calc(100% + 8px);
    opacity: 0; cursor: pointer;
  }

  /* Preview panel */
  #preview-panel {
    flex: 1; min-width: 0; overflow: auto;
    display: flex; align-items: center; justify-content: center;
    background: #14141b;
  }
  #preview-content {
    width: 100%; min-height: 100%;
    display: flex; align-items: center; justify-content: center;
  }

  /* Puzzle preview — override grid sizing for customizer */
  .theme-preview-puzzle .game-board {
    width: 320px !important;
    height: 320px !important;
  }

  /* Chat preview — override fixed positioning for embed */
  .theme-preview-chat .acw {
    position: relative !important;
    bottom: auto !important;
    right: auto !important;
  }

  /* Multiplayer preview — override overlay positioning */
  .theme-preview-mp .lobby-overlay {
    position: relative !important;
    background: transparent !important;
  }

  /* Status dot */
  .dot {
    display: inline-block; width: 8px; height: 8px;
    border-radius: 50%; margin-right: .3rem;
    vertical-align: middle;
  }
  .dot.ok  { background: #6ee7a8; }
  .dot.err { background: #ff6b6b; }
  .dot.loading { background: #9d99b5; animation: pulse 1s infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
`;
document.head.appendChild(style);

switchPackage('cards');
