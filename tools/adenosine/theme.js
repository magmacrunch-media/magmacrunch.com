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
    { name: '--apz-bg',             default: '#0a0612',  label: 'Page background' },
    { name: '--apz-text',           default: '#f0ead8',  label: 'Body text' },
    { name: '--apz-bg-panel',       default: '#1a0a2a',  label: 'Panel background' },
    { name: '--apz-accent',         default: '#00f5ff',  label: 'Primary accent' },
    { name: '--apz-accent-bright',  default: '#33ffff',  label: 'Bright accent' },
    { name: '--apz-accent-alt',     default: '#ff2d78',  label: 'Secondary accent' },
    { name: '--apz-accent-alt-dark',default: '#aa1155',  label: 'Dark secondary' },
    { name: '--apz-accent-alt-hover', default: '#ff5a99', label: 'Hover secondary' },
    { name: '--apz-accent-alt-dim', default: '#cc2266',  label: 'Dim secondary' },
    { name: '--apz-text-dim',       default: '#8a7fa8',  label: 'Dimmed text' },
    { name: '--apz-border',         default: '#2a1a3a',  label: 'Border color' },
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

const PKG_CSS = {
  cards:        '../packages/cards/cards.css',
  puzzle:       '../packages/puzzle/puzzle-base.css',
  chat:         '../packages/chat/chat-widget.css',
  multiplayer:  '../packages/multiplayer/lobby.css',
};

const PKG_GLOBAL = {
  cards: 'AdCards', puzzle: 'AdPuzzle', chat: 'AdChat', multiplayer: 'AdMP',
};

const PKG_BUNDLE = {
  cards:        '../packages/cards/dist/index.global.js',
  puzzle:       '../packages/puzzle/dist/index.global.js',
  chat:         '../packages/chat/dist/index.global.js',
  multiplayer:  '../packages/multiplayer/dist/index.global.js',
};

// State
let currentPkg = 'cards';
let values = {};
let loadedCssLink = null;
let loadedScript = null;

// DOM
const pkgSelect     = document.getElementById('pkg-select');
const variablesEl   = document.getElementById('variables');
const previewContent= document.getElementById('preview-content');
const exportOutput  = document.getElementById('export-output');

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

function loadCSS(pkg) {
  if (loadedCssLink) { loadedCssLink.remove(); loadedCssLink = null; }
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = PKG_CSS[pkg];
  document.head.appendChild(link);
  loadedCssLink = link;
}

function loadBundle(pkg) {
  return new Promise((resolve) => {
    if (loadedScript) { loadedScript.remove(); loadedScript = null; }
    if (window[PKG_GLOBAL[pkg]]) { resolve(); return; }
    const s = document.createElement('script');
    s.src = PKG_BUNDLE[pkg];
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.body.appendChild(s);
    loadedScript = s;
  });
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
  board.className = 'apz-board';
  board.style.cssText = 'display:grid;grid-template-columns:repeat(4,64px);gap:6px;';
  const nums = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,0];
  for (const n of nums) {
    const tile = document.createElement('div');
    tile.className = 'tile' + (n === 0 ? ' tile-empty' : '');
    tile.setAttribute('data-value', n || '');
    tile.textContent = n || '';
    tile.style.cssText = 'width:64px;height:64px;display:flex;align-items:center;justify-content:center;'
      + 'border-radius:8px;font-size:16px;font-weight:bold;';
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
  widget.id = 'arcadeChatWidget';
  widget.style.cssText = 'width:280px;min-height:200px;position:relative;';
  el.appendChild(widget);

  if (typeof window.AdChat !== 'undefined') {
    try { AdChat.ChatWidget.connect({ server: 'preview.example.com', allowlist: ['preview.example.com'] }); } catch {}
  }
  return el;
}

function renderMultiplayerPreview() {
  const el = document.createElement('div');
  el.className = 'theme-preview-mp';
  el.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:1rem;padding:1.5rem;';

  const lobby = document.createElement('div');
  lobby.className = 'mp-lobby';
  lobby.style.cssText = 'width:320px;border:2px solid var(--accent,#00f5ff);border-radius:12px;'
    + 'background:var(--bg-mid,#1a2a44);padding:1rem;color:var(--cream,#f0ead8);font-family:"Courier Prime",monospace;';
  lobby.innerHTML = `
    <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:var(--accent,#00f5ff);margin-bottom:.75rem;text-align:center;">GAME LOBBY</div>
    <div style="font-size:12px;color:var(--cream,#f0ead8);margin-bottom:.5rem;">Room: <span style="color:var(--accent,#00f5ff);font-weight:bold;">ABCD</span></div>
    <div style="border-top:1px solid var(--border,#1a2a44);padding-top:.5rem;margin-top:.5rem;">
      <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem;">
        <span style="width:10px;height:10px;border-radius:50%;background:#39ff6e;display:inline-block;"></span>
        <span style="font-size:12px;">Player 1</span>
        <span style="font-size:9px;color:var(--gold,#ffe03a);font-family:'Press Start 2P',monospace;">HOST</span>
      </div>
      <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem;">
        <span style="width:10px;height:10px;border-radius:50%;background:#ff2e9c;display:inline-block;"></span>
        <span style="font-size:12px;">Player 2</span>
      </div>
    </div>
    <div style="margin-top:.75rem;text-align:center;">
      <span style="font-size:11px;color:var(--gold,#ffe03a);">Waiting for players...</span>
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
  // Remove old preview
  previewContent.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;align-items:center;justify-content:center;min-height:100%;';
  previewContent.appendChild(wrapper);

  // Set all variables on the wrapper
  for (const [name, value] of Object.entries(values)) {
    wrapper.style.setProperty(name, value);
  }
  wrapper.style.setProperty('color-scheme', 'dark');

  // Render preview
  const render = PREVIEW_RENDERERS[currentPkg];
  if (render) {
    wrapper.appendChild(render());
  }
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

// Add picker styles
const style = document.createElement('style');
style.textContent = `
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
  #preview-panel {
    flex: 1; min-width: 0; overflow: auto;
    display: flex; align-items: center; justify-content: center;
    background: #14141b;
  }
  #preview-content {
    width: 100%; min-height: 100%;
    display: flex; align-items: center; justify-content: center;
  }
`;
document.head.appendChild(style);

switchPackage('cards');
