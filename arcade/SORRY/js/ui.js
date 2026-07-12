/**
 * ui.js — Main UI controller for SORRY!
 * Wires together DOM, Network callbacks, game-state changes, and move interactions.
 * Depends on: board-config.js, game-state.js, board-renderer.js, network.js
 */

// ── DOM refs ──────────────────────────────────────────────────────────────────

var lobbyOverlay      = document.getElementById('lobby-overlay');
var gameView          = document.getElementById('game-view');

// Lobby
var netStatusDot      = document.getElementById('net-status-dot');
var netStatusText     = document.getElementById('net-status-text');
var netPlayerBadge    = document.getElementById('net-player-badge');
var nameInput         = document.getElementById('name-input');
var joinBtn           = document.getElementById('join-btn');
var spectateBtn       = document.getElementById('spectate-btn');
var playersLabel      = document.getElementById('players-label');
var playerList        = document.getElementById('player-list');
var lobbyStatusText   = document.getElementById('lobby-status-text');
var startBtn          = document.getElementById('start-btn');
var waitingForHost    = document.getElementById('waiting-for-host');
var lobbyChatWindow   = document.getElementById('lobby-chat-window');
var lobbyMsgInput     = document.getElementById('lobby-msg-input');
var lobbySendBtn      = document.getElementById('lobby-send-btn');

// Color picker
var colorSwatchesEl   = document.getElementById('color-swatches');
var colorPickerHint   = document.getElementById('color-picker-hint');

// Game view
var netStatusDotGame  = document.getElementById('net-status-dot-game');
var netStatusTextGame = document.getElementById('net-status-text-game');
var netPlayerBadgeGame= document.getElementById('net-player-badge-game');
var boardEl           = document.getElementById('board');
var hudTurnName       = document.getElementById('hud-turn-name');
var yourTurnFlash     = document.getElementById('your-turn-flash');
var cardFace          = document.getElementById('card-face');
var cardValue         = document.getElementById('card-value');
var cardDesc          = document.getElementById('card-desc');
var cardDrawnBy       = document.getElementById('card-drawn-by');
var cardsRemaining    = document.getElementById('cards-remaining');
var hudDrawBtn        = document.getElementById('hud-draw-btn');
var hudDiscardBtn     = document.getElementById('hud-discard-btn');
var turnStatus        = document.getElementById('turn-status');
var gameChatWindow    = document.getElementById('game-chat-window');
var gameLogWindow     = document.getElementById('game-log-window');
var gameMsgInput      = document.getElementById('game-msg-input');
var gameSendBtn       = document.getElementById('game-send-btn');
var opponentThinking  = document.getElementById('opponent-thinking');

var rejectedOverlay   = document.getElementById('rejected-overlay');
var rejectedReason    = document.getElementById('rejected-reason');

// ── Color palette (must match server PALETTE list) ────────────────────────────

var _COLOR_BY_ORDER = ['red', 'blue', 'yellow', 'green'];

var PALETTE = [
  { hex: '#ff2d55', name: 'Cherry'     },
  { hex: '#ff7c1e', name: 'Orange'     },
  { hex: '#ffe135', name: 'Lemon'      },
  { hex: '#39d353', name: 'Lime'       },
  { hex: '#6cd4f5', name: 'Ice Blue'   },
  { hex: '#4059c8', name: 'Blueberry'  },
  { hex: '#9b30ff', name: 'Grape'      },
  { hex: '#ff69b4', name: 'Bubblegum'  },
  { hex: '#fff5e1', name: 'Cream'      },
  { hex: '#00fa9a', name: 'Spearmint'  },
  { hex: '#ff4f6d', name: 'Watermelon' },
  { hex: '#7b68ee', name: 'Bluebell'   },
];

// After game_started, maps slot ('red','blue','yellow','green') → chosen hex
var _colorMap = {};

var _selectedColor = null;  // hex string chosen in the swatch picker
var _takenColors   = [];    // hex strings locked by other players (updated on lobby_update)
var _hasJoined     = false; // true after welcome received
var _isSpectator   = false; // true if joined as spectator

// Expose selected color for the rejected-overlay late-join handler in index.html
Object.defineProperty(window, 'UI_selectedColor', { get: function() { return _selectedColor; } });

// ── Swatch picker ─────────────────────────────────────────────────────────────

function _applyMyColor(hex) {
  var dim   = hex + '33';   // 20% alpha tint
  var vdark = hex + '0a';   // 4% alpha — very subtle bg tint
  var dark  = hex + '12';   // 7% alpha — panel bg tint
  var bdr   = hex + '20';   // border tint

  // Compute complementary color (hue +180°) for accent text like the SORRY title
  var complement = (typeof _complementHex === 'function') ? _complementHex(hex) : '#ffff00';

  // Update CSS custom properties so all CSS rules that use them update too
  document.documentElement.style.setProperty('--my-color',     hex);
  document.documentElement.style.setProperty('--my-color-dim', dim);
  document.documentElement.style.setProperty('--my-complement', complement);
  // Dynamic background tints — these replace the hardcoded green-tinted vars
  document.documentElement.style.setProperty('--term-bg',     '#000000');
  document.documentElement.style.setProperty('--term-panel',  '#020202');
  document.documentElement.style.setProperty('--term-border', bdr);

  // ── Backgrounds ────────────────────────────────────────────────────────────
  var lobbyOverlay = document.getElementById('lobby-overlay');
  if (lobbyOverlay) lobbyOverlay.style.background = 'rgba(0,0,0,0.97)';

  var gameView = document.getElementById('game-view');
  if (gameView) gameView.style.backgroundColor = '#000';

  // All net-boxes: dark bg + player-tinted border
  document.querySelectorAll('.net-box, #game-log-box').forEach(function(el) {
    el.style.backgroundColor = '#020202';
    el.style.borderColor = bdr;
  });
  // Chat windows: pure black bg
  document.querySelectorAll('.chat-window').forEach(function(el) {
    el.style.backgroundColor = '#010101';
    el.style.borderColor = hex + '28';
  });
  // Status bar
  var statusBar = document.getElementById('net-status-bar');
  if (statusBar) { statusBar.style.backgroundColor = '#020202'; statusBar.style.borderColor = bdr; }
  var statusBarGame = document.getElementById('net-status-bar-game');
  if (statusBarGame) { statusBarGame.style.backgroundColor = '#020202'; statusBarGame.style.borderColor = bdr; }

  // ── Text & labels ──────────────────────────────────────────────────────────
  document.querySelectorAll('.net-box-label').forEach(function(el) {
    el.style.color = hex;
    el.style.textShadow = '0 0 8px ' + dim;
  });
  var statusText = document.getElementById('net-status-text');
  if (statusText) statusText.style.color = hex + 'aa';
  var badge = document.getElementById('net-player-badge');
  if (badge) { badge.style.color = hex; badge.style.borderColor = hex + '55'; badge.style.backgroundColor = hex + '15'; }

  // ── Inputs ─────────────────────────────────────────────────────────────────
  document.querySelectorAll('.chat-input-row input').forEach(function(el) {
    el.style.color = hex; el.style.caretColor = hex; el.style.borderColor = hex + '44';
    el.style.backgroundColor = '#010101';
  });
  document.querySelectorAll('.chat-input-row button').forEach(function(el) {
    el.style.color = hex; el.style.borderColor = hex + '55';
    el.style.backgroundColor = '#020202';
  });

  // ── SORRY! title — complement color ────────────────────────────────────────
  document.querySelectorAll('#lobby-overlay h1, #game-view h1').forEach(function(el) {
    el.style.color = complement;
    el.style.textShadow = '3px 3px 0 ' + complement + '66, 0 0 24px ' + complement + '44';
  });

  // ── Discard / destructive action buttons — use complement color ────────────
  // These were hardcoded red/orange; now they follow the player's complement.
  var discardBtn = document.getElementById('hud-discard-btn');
  if (discardBtn) {
    discardBtn.style.color       = complement;
    discardBtn.style.borderColor = complement + 'cc';
    discardBtn.style.setProperty('--discard-hover-bg', complement + '26');
  }
  var quitBtn = document.getElementById('quit-game-btn');
  if (quitBtn) {
    quitBtn.style.color       = complement + 'cc';
    quitBtn.style.borderColor = complement + '66';
  }
  // Quit confirm modal — "LEAVE" button
  var quitConfirmBtn = document.querySelector('.quit-confirm-btn');
  if (quitConfirmBtn) {
    quitConfirmBtn.style.color       = complement;
    quitConfirmBtn.style.borderColor = complement + 'cc';
    quitConfirmBtn.style.background  = complement + '18';
  }

  // Status dot intentionally excluded — always green=connected, red=disconnected
}

function _buildSwatches() {
  colorSwatchesEl.innerHTML = '';
  PALETTE.forEach(function(p) {
    var el = document.createElement('button');
    el.className = 'color-swatch';
    el.style.background = p.hex;
    el.title = p.name;
    el.dataset.hex = p.hex;
    el.addEventListener('click', function() {
      if (el.classList.contains('swatch-taken')) return;
      _selectedColor = p.hex;
      _refreshSwatches();
      colorPickerHint.textContent = p.name + ' selected!';
      colorPickerHint.className = 'hint-ok';
      _updateJoinBtn();
      _applyMyColor(p.hex);
      // If already joined, send a color-change request to the server
      if (_hasJoined && Multiplayer.isConnected()) {
        Multiplayer.changeColor(p.hex);
      }
    });
    colorSwatchesEl.appendChild(el);
  });
}

function _refreshSwatches() {
  colorSwatchesEl.querySelectorAll('.color-swatch').forEach(function(el) {
    var hex = el.dataset.hex;
    var isTaken    = _takenColors.indexOf(hex) !== -1;
    var isSelected = (hex === _selectedColor);
    el.classList.toggle('swatch-taken',    isTaken && !isSelected);
    el.classList.toggle('swatch-selected', isSelected);
  });
}

function _updateJoinBtn() {
  // Enabled if: connected, name typed, not yet joined (color is optional)
  var nameOk = nameInput.value.trim().length > 0;
  var connected = Multiplayer.isConnected();
  joinBtn.disabled     = !connected || !nameOk || _hasJoined;
  spectateBtn.disabled = !connected || !nameOk || _hasJoined;
}

_buildSwatches();
// Apply first palette color as default terminal theme on load
_applyMyColor('#39ff14'); // classic terminal green until player picks a color

nameInput.addEventListener('input', _updateJoinBtn);

// ── Color injection ───────────────────────────────────────────────────────────

/**
 * Inject a colorMap (slot → hex) as CSS custom properties on <body>.
 * Also computes lightened slide tints.
 * colorMap example: { red: '#e63946', blue: '#3a86ff', yellow: '#ffd93d', green: '#6bcb77' }
 */
// Muted neutral colors for unused board slots — desaturated dark tones that
// won't clash with or be confused for any palette color a player might pick.
var _UNUSED_SLOT_COLORS = {
  red:    '#5c2233',  // dark cherry
  blue:   '#1e2a4a',  // dark midnight
  yellow: '#3d3410',  // dark caramel
  green:  '#0f3322',  // dark forest
};

/**
 * Blend multiple hex colors into a single muted background color.
 * Averages the RGB values, then desaturates and darkens to a cohesive neutral.
 */
function _blendColors(hexs) {
  return _tetradicShift(hexs);
}

/**
 * Derive --felt, --board-center, and --cream from the active player colors.
 * Uses dominant-hue shifting: the felt background is a desaturated mix of the
 * average hue and its complementary angle, giving a cohesive table-surface feel.
 */
function _tetradicShift(hexs) {
  var hsls = hexs.map(function(hex) { return _hexToHsl(hex); });
  var avgH = _averageHue(hsls.map(function(h) { return h.h; }));
  var avgS = _averageSaturation(hsls.map(function(h) { return h.s; }));
  var avgL = _averageLightness(hsls.map(function(h) { return h.l; }));

  // Complementary hue for the center diamond
  var compH = (avgH + 0.5) % 1;

  // Felt: desaturated avg hue at ~18% lightness — warm, muted table surface
  var feltL = 0.18;
  var feltS = Math.min(avgS * 0.35, 0.28);
  var felt = _hslToHex(avgH, feltS, feltL);

  // Center: complement of felt, dark — deep contrasting diamond
  var centerL = 0.10;
  var centerS = Math.min(avgS * 0.6, 0.45);
  var center = _hslToHex(compH, centerS, centerL);

  // Cream: light version of the complement — bright but not pure white
  var creamL = 0.93;
  var creamS = Math.min(avgS * 0.25, 0.20);
  var cream = _hslToHex(compH, creamS, creamL);

  return {
    felt: felt,
    center: center,
    cream: cream,
  };
}

function _hexToHsl(hex) {
  hex = hex.replace('#', '');
  var r = parseInt(hex.substring(0, 2), 16) / 255;
  var g = parseInt(hex.substring(2, 4), 16) / 255;
  var b = parseInt(hex.substring(4, 6), 16) / 255;
  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h: h, s: s, l: l };
}

function _averageHue(hues) {
  // Circular mean of hue angles (each hue is 0-1)
  var sinSum = 0, cosSum = 0;
  hues.forEach(function(h) { sinSum += Math.sin(h * 2 * Math.PI); cosSum += Math.cos(h * 2 * Math.PI); });
  var angle = Math.atan2(sinSum, cosSum) / (2 * Math.PI);
  return (angle + 1) % 1;
}

function _averageSaturation(sats) {
  return sats.reduce(function(a, b) { return a + b; }, 0) / sats.length;
}

function _averageLightness(lits) {
  return lits.reduce(function(a, b) { return a + b; }, 0) / lits.length;
}

function _hslToHex(h, s, l) {
  function hue2rgb(p, q, t) {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  }
  var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  var p2 = 2 * l - q;
  var rr = Math.round(hue2rgb(p2, q, h + 1/3) * 255);
  var gg = Math.round(hue2rgb(p2, q, h)       * 255);
  var bb = Math.round(hue2rgb(p2, q, h - 1/3) * 255);
  return '#' + [rr, gg, bb].map(function(v) {
    return Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
  }).join('');
}

function injectColorMap(colorMap) {
  _colorMap = colorMap || {};
  var root = document.documentElement;

  var activeColors = [];
  ['red', 'blue', 'yellow', 'green'].forEach(function(slot) {
    var hex = colorMap[slot];
    if (hex) {
      activeColors.push(hex);
      root.style.setProperty('--color-' + slot, hex);
      root.style.setProperty('--slide-' + slot, _lightenHex(hex, 0.78));
      root.style.setProperty('--safe-' + slot, _safeZoneTint(hex));
      root.style.setProperty('--complement-' + slot, _complementHex(hex));
    } else {
      root.style.setProperty('--color-' + slot, _UNUSED_SLOT_COLORS[slot] || '#333');
      root.style.setProperty('--slide-' + slot, _lightenHex(_UNUSED_SLOT_COLORS[slot] || '#333', 0.55));
      root.style.setProperty('--safe-' + slot, _safeZoneTint(_UNUSED_SLOT_COLORS[slot] || '#333'));
      root.style.setProperty('--complement-' + slot, '#cccccc');
    }
  });

  if (activeColors.length > 0) {
    var colors = _tetradicShift(activeColors);
    root.style.setProperty('--felt',         colors.felt);
    root.style.setProperty('--board-center', colors.center);
    root.style.setProperty('--cream',         colors.cream);
  }
}

/**
 * Darken a hex color by reducing its lightness to a target value (0–1).
 */
function _darkenHex(hex, targetL) {
  hex = hex.replace('#', '');
  var r = parseInt(hex.substring(0, 2), 16) / 255;
  var g = parseInt(hex.substring(2, 4), 16) / 255;
  var b = parseInt(hex.substring(4, 6), 16) / 255;

  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;
  if (max !== min) {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2;                break;
      case b: h = (r - g) / d + 4;                break;
    }
    h /= 6;
  }

  l = targetL;
  s = Math.min(s, 0.8);

  function hue2rgb(p, q, t) {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  }
  var q2 = l < 0.5 ? l * (1 + s) : l + s - l * s;
  var p2 = 2 * l - q2;
  var rr = Math.round(hue2rgb(p2, q2, h + 1/3) * 255);
  var gg = Math.round(hue2rgb(p2, q2, h)       * 255);
  var bb = Math.round(hue2rgb(p2, q2, h - 1/3) * 255);

  return '#' + [rr, gg, bb].map(function(v) {
    return Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
  }).join('');
}

/**
 * Convert a hex color to a slide/safe-zone tint.
 * Uses a moderately dark, saturated pastel so different player colors
 * produce clearly distinct tiles — not washed out, not so dark they hide pawns.
 * Hue is preserved faithfully; only lightness and saturation are adjusted.
 */
function _lightenHex(hex, lightness) {
  hex = hex.replace('#', '');
  var r = parseInt(hex.substring(0, 2), 16) / 255;
  var g = parseInt(hex.substring(2, 4), 16) / 255;
  var b = parseInt(hex.substring(4, 6), 16) / 255;

  // RGB → HSL
  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2;                break;
      case b: h = (r - g) / d + 4;                break;
    }
    h /= 6;
  }

  var hueDeg = h * 360;

  // Target: medium lightness (0.68–0.78) with healthy saturation so tiles are
  // clearly coloured but don't obscure pawns.
  // For nearly-identical hues (e.g. Cherry vs Watermelon both at ~350°), we use
  // the original color's OWN lightness as a tiebreaker — darker source → darker tint,
  // lighter source → lighter tint — giving visual separation even at the same hue.
  var targetL, targetS;
  if (hueDeg >= 310 || hueDeg < 15) {       // reds, pinks, cherries, watermelons
    // Use original lightness to spread tints: dark reds go darker, pinks go lighter
    targetL = 0.64 + l * 0.22;              // maps l≈0.5→0.75, l≈0.6→0.77, l≈0.4→0.73
    targetS = 0.70;
  } else if (hueDeg < 40) {                  // oranges
    targetL = 0.74; targetS = 0.75;
  } else if (hueDeg < 75) {                  // yellows / lemons
    targetL = 0.78; targetS = 0.78;
  } else if (hueDeg < 165) {                 // greens / limes / spearmint
    targetL = 0.72; targetS = 0.60;
  } else if (hueDeg < 205) {                 // cyans / ice blues
    targetL = 0.74; targetS = 0.62;
  } else if (hueDeg < 270) {                 // blues / blueberries
    targetL = 0.72; targetS = 0.60;
  } else {                                   // purples / grapes / bluebells
    targetL = 0.71; targetS = 0.63;
  }

l = targetL;
  s = Math.min(s * 1.15, targetS);

  function hue2rgb(p, q, t) {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  }
  var q2 = l < 0.5 ? l * (1 + s) : l + s - l * s;
  var p2 = 2 * l - q2;
  var rr = Math.round(hue2rgb(p2, q2, h + 1/3) * 255);
  var gg = Math.round(hue2rgb(p2, q2, h)       * 255);
  var bb = Math.round(hue2rgb(p2, q2, h - 1/3) * 255);

  return '#' + [rr, gg, bb].map(function(v) {
    return v.toString(16).padStart(2, '0');
  }).join('');
}

/**
 * Convert a hex color to a safe-zone tint.
 * Uses lower lightness and higher saturation than slide tints so safe zones
 * are clearly darker and richer than the lighter, more pastel slide cells.
 */
function _safeZoneTint(hex) {
  hex = hex.replace('#', '');
  var r = parseInt(hex.substring(0, 2), 16) / 255;
  var g = parseInt(hex.substring(2, 4), 16) / 255;
  var b = parseInt(hex.substring(4, 6), 16) / 255;

  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2;                break;
      case b: h = (r - g) / d + 4;                break;
    }
    h /= 6;
  }

  var hueDeg = h * 360;
  var targetL, targetS;
  if (hueDeg >= 310 || hueDeg < 15) {
    targetL = 0.38; targetS = 0.78;
  } else if (hueDeg < 40) {
    targetL = 0.44; targetS = 0.80;
  } else if (hueDeg < 75) {
    targetL = 0.50; targetS = 0.82;
  } else if (hueDeg < 165) {
    targetL = 0.40; targetS = 0.68;
  } else if (hueDeg < 205) {
    targetL = 0.42; targetS = 0.70;
  } else if (hueDeg < 270) {
    targetL = 0.40; targetS = 0.68;
  } else {
    targetL = 0.40; targetS = 0.72;
  }

  l = targetL;
  s = Math.min(s * 1.05, targetS);

  function hue2rgb(p, q, t) {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  }
  var q2 = l < 0.5 ? l * (1 + s) : l + s - l * s;
  var p2 = 2 * l - q2;
  var rr = Math.round(hue2rgb(p2, q2, h + 1/3) * 255);
  var gg = Math.round(hue2rgb(p2, q2, h)       * 255);
  var bb = Math.round(hue2rgb(p2, q2, h - 1/3) * 255);

  return '#' + [rr, gg, bb].map(function(v) {
    return v.toString(16).padStart(2, '0');
  }).join('');
}

/**
 * Compute the complementary color (hue + 180°) of a hex color.
 * Lightness is clamped to a readable mid-range (42–62%) so the result
 * is never too dark or too washed-out against the saturated zone backgrounds.
 */
function _complementHex(hex) {
  hex = hex.replace('#', '');
  var r = parseInt(hex.substring(0, 2), 16) / 255;
  var g = parseInt(hex.substring(2, 4), 16) / 255;
  var b = parseInt(hex.substring(4, 6), 16) / 255;

  // RGB → HSL
  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2;                break;
      case b: h = (r - g) / d + 4;                break;
    }
    h /= 6;
  }

  // Rotate hue 180° for true complement
  h = (h + 0.5) % 1;
  // Keep saturation punchy but not overwhelming
  s = Math.max(0.55, Math.min(s, 0.85));
  // Clamp lightness to stay readable on the colored zone backgrounds
  l = Math.max(0.42, Math.min(l, 0.62));

  // HSL → RGB
  function hue2rgb(p, q, t) {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  }
  var q2 = l < 0.5 ? l * (1 + s) : l + s - l * s;
  var p2 = 2 * l - q2;
  var rr = Math.round(hue2rgb(p2, q2, h + 1/3) * 255);
  var gg = Math.round(hue2rgb(p2, q2, h)       * 255);
  var bb = Math.round(hue2rgb(p2, q2, h - 1/3) * 255);

  return '#' + [rr, gg, bb].map(function(v) {
    return v.toString(16).padStart(2, '0');
  }).join('');
}

/**
 * Get the hex color for a given board slot, falling back to the CSS default.
 * Safe to call before game_started — just returns a fallback.
 */
function _hexForSlot(slot) {
  return _colorMap[slot] || { red:'#f03a47', blue:'#3a86ff', yellow:'#ffcc00', green:'#2ecc71' }[slot] || '#aaa';
}

/**
 * Get the friendly palette name for a given board slot (e.g. "Pink" not "RED").
 * Falls back to the slot name if the hex isn't in the palette.
 */
function _nameForSlot(slot) {
  var hex = _hexForSlot(slot);
  var entry = PALETTE.find(function(p) { return p.hex.toLowerCase() === hex.toLowerCase(); });
  return entry ? entry.name : (SLOT_NAMES[slot] || slot);
}

function _getMyColor() {
  return Multiplayer.getMyColor();
}

// ── Initial board render ──────────────────────────────────────────────────────

renderBoard(boardEl);

// ── game-state → board renderer ───────────────────────────────────────────────

onStateChange(function(state) {
  update(boardEl, state);
});

// ── Message routing ───────────────────────────────────────────────────────────

var _GAME_LOG_TYPES = { 'card-event': true, 'game-system': true };

function addMsg(type, text, sender, senderColor) {
  var inGame = lobbyOverlay.classList.contains('hidden');
  if (inGame && _GAME_LOG_TYPES[type]) {
    _appendMsg(gameLogWindow, type, text, sender, senderColor);
    return;
  }
  var target = inGame ? gameChatWindow : lobbyChatWindow;
  _appendMsg(target, type, text, sender, senderColor);
}

function addGameLog(text) {
  if (lobbyOverlay.classList.contains('hidden')) {
    _appendMsg(gameLogWindow, 'game-system', text, null);
  }
}

function _appendMsg(target, type, text, sender, senderColor) {
  var wrap = document.createElement('div');
  wrap.className = 'msg ' + type;
  if (senderColor && type === 'theirs') {
    wrap.style.color = senderColor;
    wrap.style.borderLeftColor = senderColor + '99';
    wrap.style.textShadow = '0 0 6px ' + senderColor + '44';
  }
  if (sender) {
    var s = document.createElement('div'); s.className = 'sender';
    s.textContent = sender;
    if (senderColor) s.style.color = senderColor + 'bb';
    wrap.appendChild(s);
  }
  var t = document.createElement('div'); t.textContent = text;
  wrap.appendChild(t);
  target.appendChild(wrap);
  target.scrollTop = target.scrollHeight;
}

// ── Player list renderer ──────────────────────────────────────────────────────

function renderPlayers(playersInfo, maxPlayers, playerCount) {
  var count = (playerCount !== undefined) ? playerCount : playersInfo.length;
  playersLabel.textContent = 'Players (' + count + ' / ' + maxPlayers + ')';
  playerList.innerHTML = '';
  for (var i = 0; i < maxPlayers; i++) {
    var slot = document.createElement('div');
    if (i < playersInfo.length) {
      var info = playersInfo[i];
      slot.className = 'p-slot filled';
      var pip = document.createElement('div');
      pip.className = 'color-pip';
      pip.style.background = info.color || '#aaa';
      pip.style.boxShadow  = '0 0 4px ' + (info.color || '#aaa');
      var name = document.createElement('div'); name.className = 'p-name';
      name.textContent = info.name;
      slot.appendChild(pip); slot.appendChild(name);
      if (i === 0) {
        var ht = document.createElement('span'); ht.className = 'host-tag'; ht.textContent = 'HOST';
        slot.appendChild(ht);
      }
      if (info.name === Multiplayer.getMyName()) {
        var yt = document.createElement('span'); yt.className = 'you-tag'; yt.textContent = 'YOU';
        slot.appendChild(yt);
      }
    } else {
      slot.className = 'p-slot empty';
      slot.textContent = 'Slot ' + (i+1) + ' — open';
    }
    playerList.appendChild(slot);
  }
}

// ── Card animation ────────────────────────────────────────────────────────────

function animateCard(card, isMyCard) {
  cardFace.classList.add('flip-out');
  setTimeout(function() {
    var isSorry = card.value === 'sorry';
    cardValue.textContent = card.label;
    cardDesc.textContent  = card.description;
    cardFace.style.background = isSorry ? '#fff0cc' : '#fdfbf7';
    cardValue.style.color     = isSorry ? '#c0392b' : '#1a1a2e';
    cardFace.style.opacity    = '';
    cardFace.classList.remove('flip-out', 'card-mine', 'card-theirs');
    cardFace.classList.add(isMyCard ? 'card-mine' : 'card-theirs');
    cardFace.classList.add('flip-in');
    setTimeout(function() { cardFace.classList.remove('flip-in'); }, 300);
  }, 200);
}

// ── Switch from lobby to game view ────────────────────────────────────────────

function showGameView() {
  lobbyOverlay.classList.add('hidden');
  gameView.style.display = 'block';
  if (document.getElementById('gameChat')) {
    document.getElementById('gameChat').style.display = 'flex';
  }
  ChatWidget.connect();

  // Re-calculate board scale now that the game view is visible and has real
  // layout dimensions — offsetWidth was 0 while display:none.
  window.dispatchEvent(new Event('resize'));

  // Hide the "magmacrunch arcade" back link during gameplay — the QUIT button handles navigation
  var mcBack = document.querySelector('.mc-back');
  if (mcBack) mcBack.style.display = 'none';

  // Remove body padding so no grey/dark gap surrounds the game area
  document.body.classList.add('game-active');

  // Inject in-game color-change button next to the color badge (non-spectators only)
  if (!Multiplayer.isSpectator()) {
    _injectInGameColorPicker();
  }

  netStatusDotGame.className   = netStatusDot.className;
  netStatusTextGame.textContent = Multiplayer.getMyName() + (_isSpectator ? ' — spectating' : ' — playing');
  netPlayerBadgeGame.textContent = netPlayerBadge.textContent;
  netPlayerBadgeGame.style.display = 'block';

  // Show spectator badge or player quit button
  var spectatorBadge = document.getElementById('spectator-badge');
  var quitBtn        = document.getElementById('quit-game-btn');
  if (_isSpectator) {
    if (spectatorBadge) spectatorBadge.style.display = 'inline-block';
    // Disable all player action controls for spectators
    hudDrawBtn.disabled = true;
    hudDiscardBtn.style.display = 'none';
    gameMsgInput.disabled = false;
    gameSendBtn.disabled  = false;
  } else {
    if (quitBtn) quitBtn.style.display = 'inline-block';
  }

  // Color identity badge — show which color this player is
  var mySlot = _getMyColor();   // board slot: 'red'|'blue'|'yellow'|'green'
  if (mySlot) {
    _applyGameColors(_hexForSlot(mySlot));
  }

  gameChatWindow.innerHTML = lobbyChatWindow.innerHTML;
  gameChatWindow.scrollTop = gameChatWindow.scrollHeight;
  gameMsgInput.disabled = false;
  gameSendBtn.disabled  = false;
}

/**
 * Apply the player's hex color to all game-view UI elements that carry
 * per-player theming. Safe to call multiple times (e.g. on color change).
 * Also calls _applyMyColor so lobby elements stay consistent.
 */
function _applyGameColors(hex) {
  if (!hex) return;

  _applyMyColor(hex);   // updates CSS vars + lobby elements + buttons

  var mySlot     = _getMyColor();
  var colorBadge = document.getElementById('my-color-badge');
  var statusBar  = document.getElementById('net-status-bar-game');

  if (mySlot && colorBadge) {
    var colorName = _nameForSlot(mySlot).toUpperCase();
    colorBadge.textContent    = colorName;
    colorBadge.style.color    = hex;
    colorBadge.style.borderColor = hex;
    colorBadge.style.boxShadow   = '0 0 16px ' + hex;
    colorBadge.classList.add('visible');
  }

  if (statusBar) {
    statusBar.style.borderLeft = '4px solid ' + hex;
    statusBar.style.boxShadow  = 'inset 3px 0 12px ' + hex + '22';
  }

  var nsTextGame = document.getElementById('net-status-text-game');
  if (nsTextGame) nsTextGame.style.color = hex + 'aa';

  var drawBtn = document.getElementById('hud-draw-btn');
  if (drawBtn) {
    drawBtn.style.borderColor = hex;
    drawBtn.style.color       = hex;
    drawBtn.style.boxShadow   = '0 0 10px ' + hex + '55';
  }

  var flash = document.getElementById('your-turn-flash');
  if (flash) flash.style.color = hex;

  var sidebar = document.getElementById('game-sidebar');
  if (sidebar) {
    sidebar.style.borderTop = '3px solid ' + hex;
    sidebar.style.boxShadow = '0 -4px 16px ' + hex + '22';
  }
}

// ── Game over overlay ─────────────────────────────────────────────────────────

function showGameOver(winnerSlot) {
  var overlay  = document.getElementById('gameover-overlay');
  var pip      = document.getElementById('gameover-pip');
  var nameEl   = document.getElementById('gameover-winner-name');
  var youTag   = document.getElementById('gameover-you-tag');
  var pawnsEl  = document.getElementById('gameover-pawns');
  var titleEl  = document.getElementById('gameover-title');
  var subtitleEl = document.getElementById('gameover-subtitle');
  var msgEl    = document.getElementById('gameover-message');

  var hex = _hexForSlot(winnerSlot);
  var state = getState();
  var winnerName = (state.players && state.players[winnerSlot] && state.players[winnerSlot].name) || _nameForSlot(winnerSlot).toUpperCase();
  var isMe = (_getMyColor() === winnerSlot);

  titleEl.style.color      = hex;
  titleEl.style.textShadow = '3px 3px 0 ' + hex + '44';
  pip.style.background     = hex;
  pip.style.boxShadow      = '0 0 12px ' + hex;
  nameEl.textContent       = winnerName;
  nameEl.style.color       = hex;

  if (isMe) {
    subtitleEl.textContent = 'YOU WIN!';
    msgEl.textContent      = 'Congratulations!';
    titleEl.style.fontSize  = '50px';
    titleEl.style.letterSpacing = '0.15em';
  } else {
    subtitleEl.textContent = 'GAME OVER';
    msgEl.textContent      = 'wins the game!';
    titleEl.style.fontSize  = '';
    titleEl.style.letterSpacing = '';
  }

  youTag.textContent = isMe ? "(that's you!)" : '';
  youTag.style.display = isMe ? 'inline' : 'none';

  pawnsEl.innerHTML = '';
  for (var i = 0; i < 4; i++) {
    var p = document.createElement('div');
    p.className = 'pawn pawn-' + winnerSlot + ' gameover-pawn';
    pawnsEl.appendChild(p);
  }

  hudDrawBtn.disabled = true;
  overlay.classList.add('show');
}

// ── Network callbacks ─────────────────────────────────────────────────────────

Multiplayer.onConnected = function() {
  netStatusDot.classList.add('connected');
  // Re-apply color so status dot and bar update now that connected class is set
  _applyMyColor(_selectedColor || '#39ff14'); // keep classic green if no color chosen yet

  // If we reconnected after a rejection, fire the queued action and stop.
  if (Multiplayer._pendingAction) {
    var fn = Multiplayer._pendingAction;
    Multiplayer._pendingAction = null;
    fn();
    return;
  }

  netStatusText.textContent = 'Connected — enter your name and join!';
  // Pre-fill name from arcade chat if available
  if (!nameInput.value) {
    var savedName = localStorage.getItem('arcade_username');
    if (savedName) nameInput.value = savedName;
  }
  _updateJoinBtn();
  nameInput.focus();
};

Multiplayer.onDisconnected = function() {
  // Reset join state so the form works correctly if the server restarts
  _hasJoined     = false;
  _isSpectator   = false;
  _selectedColor = null;
  _takenColors   = [];
  netStatusDot.classList.remove('connected');
  netStatusDotGame.classList.remove('connected');
  netStatusText.textContent = 'Disconnected — refresh to reconnect';
  netStatusTextGame.textContent = 'Disconnected';
  joinBtn.disabled    = true;
  spectateBtn.disabled = true;
  nameInput.disabled  = false;
  hudDrawBtn.disabled = true;
  startBtn.disabled   = true;
  startBtn.style.display    = 'none';
  waitingForHost.style.display = 'none';
  lobbyMsgInput.disabled = true;
  lobbySendBtn.disabled  = true;
  _refreshSwatches();
};

Multiplayer.onRejected = function(reason) {
  // Save the currently selected color NOW, before onDisconnected fires and
  // wipes _selectedColor. The server closes the socket right after sending
  // 'rejected', so by the time the user clicks JOIN LATE the socket close
  // event will have already reset _selectedColor to null.
  Multiplayer._savedColorForRejoin = _selectedColor || '';

  rejectedReason.textContent = reason;
  rejectedOverlay.classList.add('show');
  // Show late-join button only when game is in progress (not when truly full with no space)
  var lateJoinBtn = document.getElementById('rejected-late-join-btn');
  if (lateJoinBtn) {
    var isInProgress = reason.toLowerCase().indexOf('started') !== -1;
    lateJoinBtn.style.display = isInProgress ? 'block' : 'none';
  }
};

Multiplayer.onWelcome = function(playerName, isHost, confirmedHex) {
  _hasJoined = true;
  joinBtn.disabled   = true;
  nameInput.disabled = true;
  // Swatches stay active — player can still switch color before game starts
  var slotIdx = _COLOR_BY_ORDER.indexOf(_getMyColor());
  var playerNum = slotIdx >= 0 ? ' (Player ' + (slotIdx + 1) + ')' : '';
  netPlayerBadge.textContent = playerName + (isHost ? ' 👑' : '') + playerNum;
  netPlayerBadge.style.display = 'block';
  lobbyMsgInput.disabled = false;
  lobbySendBtn.disabled  = false;
  addMsg('system', 'You joined as ' + playerName + (isHost ? ' 👑 (Host)' : '') + '.');

  // Apply the server-confirmed color immediately (server may have re-assigned
  // our requested color if it was already taken)
  if (confirmedHex && confirmedHex !== _selectedColor) {
    _selectedColor = confirmedHex;
    _applyMyColor(confirmedHex);
    var entry = PALETTE.find(function(p) { return p.hex.toLowerCase() === confirmedHex.toLowerCase(); });
    if (entry) {
      colorPickerHint.textContent = entry.name + ' selected!';
      colorPickerHint.className = 'hint-ok';
    }
    _refreshSwatches();
  }

  if (isHost) {
    startBtn.style.display = 'block';
    startBtn.disabled = true;  // onLobbyUpdate will enable when canStart=true
    waitingForHost.style.display = 'none';
  } else {
    waitingForHost.style.display = 'block';
  }
};

Multiplayer.onSpectatorJoined = function(spectatorName) {
  _hasJoined   = true;
  _isSpectator = true;
  joinBtn.disabled     = true;
  spectateBtn.disabled = true;
  nameInput.disabled   = true;
  netPlayerBadge.textContent = spectatorName + ' 👁';
  netPlayerBadge.style.display = 'block';
  lobbyMsgInput.disabled = false;
  lobbySendBtn.disabled  = false;
  addMsg('system', 'You joined as spectator: ' + spectatorName);
  // If game is not yet started, show waiting message in lobby.
  // If game is already running, server will immediately send game_started
  // which triggers showGameView() — so we just wait for that.
  var state = getState();
  if (!state || state.phase !== 'playing') {
    waitingForHost.style.display = 'block';
    waitingForHost.textContent = 'Watching as spectator…';
  }
};

Multiplayer.onPlayerQuit = function(playerName, color) {
  addGameLog('🚪 ' + playerName + ' (' + (SLOT_NAMES[color] || color || 'unknown') + ') left the game.');
  addMsg('system', playerName + ' has left the game.');
};

Multiplayer.onPromotedToHost = function() {
  var slotIdx = _COLOR_BY_ORDER.indexOf(_getMyColor());
  var playerNum = slotIdx >= 0 ? ' (Player ' + (slotIdx + 1) + ')' : '';
  netPlayerBadge.textContent = Multiplayer.getMyName() + ' 👑' + playerNum;
  waitingForHost.style.display = 'none';
  startBtn.style.display = 'block';
  startBtn.disabled = true;  // onLobbyUpdate will enable when canStart=true
  addMsg('system', 'You are now the host!');
};

Multiplayer.onLobbyUpdate = function(data) {
  var playersInfo = data.playersInfo || data.players.map(function(name) {
    return { name: name, color: '#aaa' };
  });

  // Sync _selectedColor from server: if we've joined but our local _selectedColor
  // doesn't match what the server assigned (e.g. auto-assign on join, or a successful
  // change_color), update it so our own swatch is never wrongly greyed out.
  if (_hasJoined && !_isSpectator) {
    var myName = Multiplayer.getMyName();
    var myInfo = playersInfo.find(function(p) { return p.name === myName; });
    if (myInfo && myInfo.color && myInfo.color !== _selectedColor) {
      _selectedColor = myInfo.color;
      // Full re-theme so ALL UI elements update, not just two CSS vars.
      // This handles the case where the server auto-assigned a different color
      // (e.g. chosen color was already taken).
      _applyMyColor(myInfo.color);
      // Update the swatch hint to reflect the current color name
      var entry = PALETTE.find(function(p) { return p.hex.toLowerCase() === myInfo.color.toLowerCase(); });
      if (entry) {
        colorPickerHint.textContent = entry.name + ' selected!';
        colorPickerHint.className = 'hint-ok';
      }
      _refreshSwatches();
    }
  }

  // Update taken colors — exclude our own so our swatch stays highlighted
  _takenColors = data.takenColors || [];
  if (_selectedColor) {
    _takenColors = _takenColors.filter(function(c) { return c !== _selectedColor; });
  }
  _refreshSwatches();

  renderPlayers(playersInfo, data.maxPlayers, data.playerCount);

  // ── Game-in-progress banner ──
  var gameInProgressBanner = document.getElementById('game-in-progress-banner');
  if (data.gameStarted && !_hasJoined) {
    if (!gameInProgressBanner) {
      gameInProgressBanner = document.createElement('div');
      gameInProgressBanner.id = 'game-in-progress-banner';
      var joinBox = document.getElementById('join-box');
      if (joinBox && joinBox.parentNode) {
        joinBox.parentNode.insertBefore(gameInProgressBanner, joinBox);
      }
    }
    gameInProgressBanner.innerHTML =
      '<span class="gip-dot"></span>' +
      '<span class="gip-text">GAME IN PROGRESS</span>' +
      '<span class="gip-sub"> — join to spectate or wait for next round</span>';
    gameInProgressBanner.className = 'game-in-progress-banner';
  } else if (gameInProgressBanner) {
    gameInProgressBanner.remove();
  }

  var amHost = Multiplayer.amIHost();
  if (amHost) {
    startBtn.disabled = !data.canStart;
    lobbyStatusText.textContent = data.canStart
      ? data.playerCount + ' player(s) ready. You can start!'
      : 'Need at least ' + data.minPlayers + ' to start. (' + data.playerCount + '/' + data.maxPlayers + ' joined)';
  } else if (data.gameStarted && !_hasJoined) {
    lobbyStatusText.textContent = 'A game is underway with ' + data.playerCount + ' player(s). You can spectate!';
  } else {
    // Non-host: keep start button hidden/disabled
    startBtn.disabled = true;
    lobbyStatusText.textContent = data.playerCount + '/' + data.maxPlayers + ' player(s) in lobby.';
  }
};

Multiplayer.onGameStarted = function(colorMap) {
  // Inject chosen colors as CSS variables BEFORE showGameView() fires,
  // so the board renders with correct colors immediately.
  injectColorMap(colorMap);

  // Resolve our hex: prefer slot lookup (works once _colorMap is populated),
  // fall back to the server-confirmed hex from the welcome message.
  // This fallback is essential for late joiners who receive game_started
  // before any lobby_update has synced their slot→hex mapping.
  var mySlot = _getMyColor();
  var myHex  = (mySlot && colorMap[mySlot]) ? colorMap[mySlot] : Multiplayer.getMyConfirmedHex();

  if (myHex) {
    _applyMyColor(myHex);
    _selectedColor = myHex;
    // Keep swatch picker in sync
    var entry = PALETTE.find(function(p) { return p.hex.toLowerCase() === myHex.toLowerCase(); });
    if (entry && colorPickerHint) {
      colorPickerHint.textContent = entry.name + ' selected!';
      colorPickerHint.className = 'hint-ok';
    }
  }
};

/**
 * Called whenever any player's display color changes (lobby or mid-game).
 * Re-injects the colorMap so board zone colors update immediately,
 * and if the changed player is us, re-applies our personal UI theming.
 */
Multiplayer.onColorChanged = function(playerName, colorMap) {
  injectColorMap(colorMap);

  if (playerName === Multiplayer.getMyName()) {
    var mySlot = _getMyColor();
    if (mySlot) {
      var hex = _hexForSlot(mySlot);
      _selectedColor = hex;
      var inGame = lobbyOverlay.classList.contains('hidden');
      if (inGame) {
        _applyGameColors(hex);
      } else {
        _applyMyColor(hex);
      }
    }
  }
};

Multiplayer.onSystemMessage = function(text) {
  var inGame = lobbyOverlay.classList.contains('hidden');
  if (inGame) { addGameLog('ℹ ' + text); } else { addMsg('system', text); }
};

Multiplayer.onError = function(text) {
  addMsg('system', '⚠ ' + text);
  dbg('SERVER ERROR', text);
  // If a color-change attempt was rejected, reflect that in the hint
  if (text.indexOf('color') !== -1 || text.indexOf('Color') !== -1) {
    colorPickerHint.textContent = '⚠ ' + text;
    colorPickerHint.className = '';
  }
};

Multiplayer.onChatMessage = function(from, text, color) { addMsg('theirs', text, from, color); };

Multiplayer.onCardDrawn = function(from, card, remaining) {
  var isMyCard = (from === Multiplayer.getMyName());
  SoundFX.playCard();
  animateCard(card, isMyCard);
  cardDrawnBy.textContent = isMyCard ? '▶ Your card' : from + '\'s card';
  cardDrawnBy.className   = isMyCard ? 'card-drawn-by mine' : 'card-drawn-by theirs';
  var extra = card.value === '2' ? ' — Draw again!' : '';
  addGameLog('🃏 ' + from + ' drew ' + card.label + extra);
  cardsRemaining.textContent = remaining + ' cards left';

  if (!isMyCard) {
    opponentThinking.textContent = '⏳ ' + from + ' is thinking…';
    opponentThinking.className = 'thinking-active';
  }

  applyAction({ type: ActionTypes.SET_CARD, payload: { card: card } });

  if (!isMyCard) return;

  turnStatus.textContent = '';
  turnStatus.className = '';

  setTimeout(function() {
    var state   = getState();
    var myColor = _getMyColor();
    dbg('CARD DRAWN', { card: card.value, color: myColor });

    if (!myColor) {
      dbg('ERROR: myColor is null', { myName: Multiplayer.getMyName() });
      return;
    }

    state.pawns[myColor].forEach(function(p) {
      dbg('  pawn ' + p.id, { pos: JSON.stringify(p.boardPosition), lapped: p.lapped, inHome: p.inHome });
    });

    var moves = getLegalMoves(myColor, state.pawns, card.value);
    dbg('LEGAL MOVES (' + moves.length + ')', moves.map(function(m) {
      return { id: m.pawnId, to: JSON.stringify(m.to), steps: m.steps, bump: m.bump ? m.bump.color : null };
    }));

    if (moves.length === 0) {
      cardFace.classList.add('card-unplayable');
      turnStatus.textContent = 'No moves available.';
      turnStatus.className = 'turn-status-bad';
      hudDiscardBtn.style.display = 'block';
      dbg('NO MOVES — waiting for discard');
      return;
    }

    cardFace.classList.add('card-playable');

    if (card.value === '7') {
      _startSeven(myColor, state.pawns, moves);
      return;
    }

    turnStatus.textContent = 'Pick a pawn to move.';
    turnStatus.className = 'turn-status-good';

    highlightMoves(boardEl, moves, myColor, function(move) {
      var pawnIndex = parseInt(move.pawnId.split('-')[1]);
      dbg('MOVE SELECTED', { pawnId: move.pawnId, to: JSON.stringify(move.to),
          isSwap: !!move.isSwap, bump: move.bump ? move.bump.color : null });

      if (move.isSwap) {
        turnStatus.textContent = 'Swapping…';
        turnStatus.className = 'turn-status-waiting';
        var state = getState();
        var oppPawn = state.pawns[move.swapWith.color] && state.pawns[move.swapWith.color][parseInt(move.swapWith.pawnId.split('-')[1])];
        var oppLapped = oppPawn ? !!oppPawn.lapped : false;
        Multiplayer.swapPawn(move.swapWith.color, parseInt(move.swapWith.pawnId.split('-')[1]), move.swapTo, oppLapped);
        Multiplayer.movePawn(myColor, pawnIndex, move.to, move.lapped);
        return;
      }

      // Check if this move involves a slide — if so, play the animation first.
      var slide = getSlideForMove(move, myColor);
      if (slide) {
        turnStatus.textContent = '🎿 Sliding!';
        turnStatus.className = 'turn-status-good';
        playSlideAnimation(boardEl, move, myColor, slide, function() {
          _sendMove(move, myColor);
        });
        return;
      }

      turnStatus.textContent = 'Moving…';
      turnStatus.className = 'turn-status-waiting';
      _sendMove(move, myColor);
    });
  }, 0);
};

Multiplayer.onPawnMoved = function(color, pawnId, newPosition, lapped) {
  if (!_sevenInProgress) {
    clearHighlights(boardEl);
  }
  opponentThinking.textContent = '';
  opponentThinking.className   = '';
  dbg('PAWN_MOVED', { color: color, pawnId: pawnId, newPosition: JSON.stringify(newPosition), lapped: lapped });

  if (newPosition === null) {
    addGameLog('💥 ' + (SLOT_NAMES[color] || color) + ' pawn sent back to Start!');
  } else {
    addGameLog('♟ ' + (SLOT_NAMES[color] || color) + ' pawn moved.');
  }

  if (color === _getMyColor()) {
    turnStatus.textContent = 'Waiting for next turn…';
    turnStatus.className = 'turn-status-waiting';
  }

  if (newPosition === 'home') {
    var state = getState();
    if (state.phase !== 'finished') {
      var allHome = state.pawns[color].every(function(p) { return p.inHome; });
      if (allHome) {
        addGameLog('🎉 ' + _nameForSlot(color).toUpperCase() + ' wins!');
        applyAction({ type: ActionTypes.END_GAME, payload: { winner: color } });
      }
    }
  }
};

Multiplayer.onTurnUpdate = function(currentTurnName) {
  var turnSlot = (function() {
    var state = getState();
    return state && state.currentTurn ? state.currentTurn : null;
  })();
  var turnHex  = turnSlot ? _hexForSlot(turnSlot) : null;
  var turnName = turnSlot ? _nameForSlot(turnSlot).toUpperCase() : currentTurnName;

  hudTurnName.textContent      = turnName;
  hudTurnName.style.color      = turnHex || '';
  hudTurnName.style.textShadow = turnHex ? ('0 0 12px ' + turnHex + '88') : '';

  var isMe = (currentTurnName === Multiplayer.getMyName()) && !_isSpectator;
  hudDrawBtn.disabled = !isMe;
  hudDiscardBtn.style.display = 'none';
  yourTurnFlash.classList.toggle('visible', isMe);
  opponentThinking.textContent = '';
  opponentThinking.className   = '';
  cardFace.classList.remove('card-playable', 'card-unplayable', 'card-mine', 'card-theirs');
  turnStatus.textContent = isMe ? 'Draw a card to start your turn.' : '';
  turnStatus.className   = isMe ? 'turn-status-prompt' : '';
  dbg('TURN UPDATE', { currentTurn: currentTurnName, isMe: isMe, drawBtnEnabled: isMe });
};

// ── State change handler (game start + game over) ─────────────────────────────

onStateChange(function(state) {
  if (state.phase === 'playing' && gameView.style.display === 'none') {
    showGameView();
  }
  if (state.phase === 'finished' && state.winner) {
    showGameOver(state.winner);
  }
});

// ── User actions ──────────────────────────────────────────────────────────────

function doJoin() {
  var name = nameInput.value.trim();
  if (!name || !Multiplayer.isConnected()) return;
  // Save name to localStorage for sharing across games
  localStorage.setItem('arcade_username', name);
  // Pass chosen color if one was picked; server auto-assigns if null/empty
  Multiplayer.join(name, _selectedColor || '');
}
joinBtn.addEventListener('click', doJoin);
nameInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') doJoin(); });

function doSpectate() {
  var name = nameInput.value.trim();
  if (!name || !Multiplayer.isConnected()) return;
  Multiplayer.spectate(name);
}
spectateBtn.addEventListener('click', doSpectate);

startBtn.addEventListener('click', function() { Multiplayer.startGame(); });

hudDrawBtn.addEventListener('click', function() {
  if (hudDrawBtn.disabled) return;
  hudDrawBtn.disabled = true;
  dbg('DRAW CARD clicked', { isMyTurn: Multiplayer.isMyTurn() });
  Multiplayer.drawCard();
});

hudDiscardBtn.addEventListener('click', function() {
  hudDiscardBtn.style.display = 'none';
  turnStatus.textContent = 'Turn skipped.';
  turnStatus.className = 'turn-status-waiting';
  dbg('DISCARD clicked — skipping turn');
  addGameLog((SLOT_NAMES[_getMyColor()] || _getMyColor()) + ' drew but had no moves — discarding.');
  Multiplayer.skipTurn();
});

function doChat(inputEl, nameGetter) {
  var text = inputEl.value.trim();
  if (!text || !Multiplayer.isConnected()) return;
  addMsg('mine', text, nameGetter() + ' (you)');
  Multiplayer.sendChat(text);
  inputEl.value = '';
  inputEl.focus();
}

lobbySendBtn.addEventListener('click', function() { doChat(lobbyMsgInput, Multiplayer.getMyName); });
lobbyMsgInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') doChat(lobbyMsgInput, Multiplayer.getMyName); });

gameSendBtn.addEventListener('click', function() { doChat(gameMsgInput, Multiplayer.getMyName); });
gameMsgInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') doChat(gameMsgInput, Multiplayer.getMyName); });

// ── Debug panel ───────────────────────────────────────────────────────────────

var debugLog    = document.getElementById('debug-log');
var debugToggle = document.getElementById('debug-toggle');
var debugBody   = document.getElementById('debug-body');
var debugClear  = document.getElementById('debug-clear');
var _debugOpen  = false;

debugToggle.addEventListener('click', function() {
  _debugOpen = !_debugOpen;
  debugBody.style.display = _debugOpen ? 'block' : 'none';
  debugToggle.textContent = '🔧 DEBUG ' + (_debugOpen ? '▼' : '▶');
});
debugClear.addEventListener('click', function() { debugLog.innerHTML = ''; });

function dbg(label, data) {
  var line = document.createElement('div');
  line.className = 'debug-line';
  var ts = new Date().toLocaleTimeString('en', {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'});
  var dataStr = data === undefined ? '' : (typeof data === 'object' ? JSON.stringify(data) : String(data));
  line.innerHTML = '<span class="debug-ts">' + ts + '</span> '
                 + '<span class="debug-label">' + label + '</span> '
                 + '<span class="debug-data">' + dataStr + '</span>';
  debugLog.appendChild(line);
  debugLog.scrollTop = debugLog.scrollHeight;
  console.log('[DBG]', label, data !== undefined ? data : '');
}

// ── Card 7: two-phase split UI ────────────────────────────────────────────────

// ── IN-GAME COLOR PICKER ──────────────────────────────────────────────────────
// A small paint-bucket button sits next to the player's color badge in the
// game status bar. Clicking it opens a compact swatch popover.

var _inGamePickerOpen = false;

function _injectInGameColorPicker() {
  // Don't inject twice
  if (document.getElementById('ingame-color-btn')) return;

  var statusBar = document.getElementById('net-status-bar-game');
  if (!statusBar) return;

  // Build the button
  var btn = document.createElement('button');
  btn.id = 'ingame-color-btn';
  btn.title = 'Change your color';
  btn.textContent = '🎨';
  btn.className = 'game-hdr-btn';
  btn.style.fontSize = '14px';

  // Build the popover
  var popover = document.createElement('div');
  popover.id = 'ingame-color-popover';
  popover.style.cssText = [
    'display:none',
    'position:fixed',
    'z-index:800',
    'background:#0d0d1a',
    'border:1px solid rgba(255,255,255,0.18)',
    'border-radius:8px',
    'padding:10px 12px',
    'box-shadow:0 8px 32px rgba(0,0,0,0.7)',
    'flex-wrap:wrap',
    'gap:8px',
    'max-width:220px',
  ].join(';');

  var label = document.createElement('div');
  label.style.cssText = 'width:100%;font-family:"Press Start 2P",monospace;font-size:7px;color:rgba(255,255,255,0.35);letter-spacing:1px;margin-bottom:4px;';
  label.textContent = 'CHANGE COLOR';
  popover.appendChild(label);

  _buildInGameSwatches(popover, {});

  document.body.appendChild(popover);

  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    _inGamePickerOpen = !_inGamePickerOpen;
    if (_inGamePickerOpen) {
      // Position popover below the button
      var rect = btn.getBoundingClientRect();
      popover.style.display = 'flex';
      popover.style.top  = (rect.bottom + 6) + 'px';
      popover.style.left = Math.max(8, rect.left - 60) + 'px';
    } else {
      popover.style.display = 'none';
    }
  });

  // Close on outside click
  document.addEventListener('click', function(e) {
    if (_inGamePickerOpen && !popover.contains(e.target) && e.target !== btn) {
      _inGamePickerOpen = false;
      popover.style.display = 'none';
    }
  });

  // Insert button just before the mute button
  var muteBtn = document.getElementById('mute-btn');
  if (muteBtn) {
    statusBar.insertBefore(btn, muteBtn);
  } else {
    statusBar.appendChild(btn);
  }
}

function _buildInGameSwatches(container, colorMap) {
  // Remove old swatches (keep the label)
  Array.from(container.children).forEach(function(child) {
    if (child.tagName !== 'DIV' || child.style.width !== '100%') {
      container.removeChild(child);
    }
  });

  var takenHexes = Object.values(colorMap || _colorMap || {});

  PALETTE.forEach(function(p) {
    var isTaken = takenHexes.some(function(h) {
      return h.toLowerCase() === p.hex.toLowerCase() && h.toLowerCase() !== (_selectedColor || '').toLowerCase();
    });
    var swatch = document.createElement('button');
    swatch.title = p.name;
    swatch.style.cssText = [
      'width:22px',
      'height:22px',
      'border-radius:50%',
      'border:2px solid ' + (isTaken ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.25)'),
      'background:' + p.hex,
      'cursor:' + (isTaken ? 'not-allowed' : 'pointer'),
      'opacity:' + (isTaken ? '0.3' : '1'),
      'box-shadow:0 0 6px ' + (isTaken ? 'transparent' : p.hex + '88'),
      'transition:transform 0.1s,box-shadow 0.1s',
      'padding:0',
    ].join(';');

    if (p.hex.toLowerCase() === (_selectedColor || '').toLowerCase()) {
      swatch.style.border = '2px solid white';
      swatch.style.boxShadow = '0 0 0 2px ' + p.hex + ', 0 0 10px ' + p.hex;
    }

    if (!isTaken) {
      swatch.addEventListener('mouseenter', function() {
        swatch.style.transform = 'scale(1.2)';
        swatch.style.boxShadow = '0 0 12px ' + p.hex;
      });
      swatch.addEventListener('mouseleave', function() {
        swatch.style.transform = '';
        swatch.style.boxShadow = '0 0 6px ' + p.hex + '88';
      });
      swatch.addEventListener('click', function(e) {
        e.stopPropagation();
        _selectedColor = p.hex;
        Multiplayer.changeColor(p.hex);
        _inGamePickerOpen = false;
        document.getElementById('ingame-color-popover').style.display = 'none';
      });
    }

    container.appendChild(swatch);
  });
}

function _refreshInGameSwatches(colorMap) {
  var popover = document.getElementById('ingame-color-popover');
  if (!popover) return;
  _buildInGameSwatches(popover, colorMap);
}
// ── END IN-GAME COLOR PICKER ──────────────────────────────────────────────────

var _sevenInProgress = false;

function _startSeven(myColor, pawnsState, moves) {
  // If only one pawn is on the board, splits are impossible — just offer full-7 moves.
  var onBoardCount = pawnsState[myColor].filter(function(p) {
    return p.boardPosition !== null && p.boardPosition !== 'home';
  }).length;

  var validFirstMoves;
  if (onBoardCount <= 1) {
    validFirstMoves = moves.filter(function(m) { return m.steps === 7; });
  } else {
    validFirstMoves = moves.filter(function(m) {
      if (m.steps === 7) return true;
      var remaining = 7 - m.steps;
      var simPawns = JSON.parse(JSON.stringify(pawnsState));
      var simPawn  = simPawns[myColor].find(function(p) { return p.id === m.pawnId; });
      if (simPawn) { simPawn.boardPosition = m.to; simPawn.lapped = m.lapped; }
      var secondMoves = getSplitMoves(myColor, simPawns, m.pawnId, m.to, remaining);
      return secondMoves.length > 0;
    });

    if (validFirstMoves.length === 0) {
      validFirstMoves = moves.filter(function(m) { return m.steps === 7; });
    }
  }

  // Safety net: if no valid first moves remain (e.g. only pawn is 6 steps from home
  // and can't split), treat card 7 as unplayable and offer the discard button.
  if (validFirstMoves.length === 0) {
    dbg('SEVEN no valid moves at all — treating as unplayable');
    cardFace.classList.add('card-unplayable');
    turnStatus.textContent = 'No valid 7 move available.';
    turnStatus.className = 'turn-status-bad';
    hudDiscardBtn.style.display = 'block';
    return;
  }

  turnStatus.textContent = 'SPLIT 7: pick a pawn and destination (1–6 steps to split, or 7 to use all).';
  turnStatus.className = 'turn-status-good';

  highlightMoves(boardEl, validFirstMoves, myColor, function(firstMove) {
    var stepsUsed = firstMove.steps;
    var remaining = 7 - stepsUsed;

    dbg('SEVEN phase1', { pawnId: firstMove.pawnId, steps: stepsUsed, remaining: remaining });

    if (remaining === 0) {
      _sendMove(firstMove, myColor);
      return;
    }

    var updatedPawns = JSON.parse(JSON.stringify(pawnsState));
    var movedPawn = updatedPawns[myColor].find(function(p) { return p.id === firstMove.pawnId; });
    if (movedPawn) {
      movedPawn.boardPosition = firstMove.to;
      movedPawn.lapped = firstMove.lapped;
    }

    var secondMoves = getSplitMoves(myColor, updatedPawns, firstMove.pawnId, firstMove.to, remaining);
    dbg('SEVEN phase2 moves', secondMoves.length);

    if (secondMoves.length === 0) {
      dbg('SEVEN no valid split — forcing full 7 on same pawn');
      var fullMove = moves.find(function(m) {
        return m.pawnId === firstMove.pawnId && m.steps === 7;
      });
      _sendMove(fullMove || firstMove, myColor);
      return;
    }

    _movePawnLocally(boardEl, firstMove, myColor);
    _sevenInProgress = true;
    turnStatus.textContent = remaining + ' steps remain — pick a second pawn.';
    turnStatus.className = 'turn-status-good';

    highlightMoves(boardEl, secondMoves, myColor, function(secondMove) {
      _sevenInProgress = false;
      dbg('SEVEN phase2 selected', { pawnId: secondMove.pawnId, steps: secondMove.steps });
      var slide2 = getSlideForMove(secondMove, myColor);
      if (slide2) {
        turnStatus.textContent = '🎿 Sliding!';
        turnStatus.className = 'turn-status-good';
        playSlideAnimation(boardEl, secondMove, myColor, slide2, function() {
          _sendMovePartial(firstMove, myColor);
          _sendMove(secondMove, myColor);
        });
        return;
      }
      turnStatus.textContent = 'Moving…';
      turnStatus.className = 'turn-status-waiting';
      _sendMovePartial(firstMove, myColor);
      _sendMove(secondMove, myColor);
    });
  });
}

function _movePawnLocally(boardEl, move, color) {
  var pawnEl = boardEl.querySelector('.pawn[data-pawn-id="' + move.pawnId + '"]');
  if (!pawnEl) return;
  var dest = move.to;
  var destEl;
  if (dest === 'home') {
    destEl = boardEl.querySelector('.big-zone[data-zone-type="home"][data-zone-color="' + color + '"]');
  } else {
    var xy = positionToXY(dest, color);
    if (xy) destEl = boardEl.querySelector('.cell[data-x="' + xy.x + '"][data-y="' + xy.y + '"]');
  }
  if (destEl) destEl.appendChild(pawnEl);
}

function _sendMove(move, myColor) {
  var pawnIndex = parseInt(move.pawnId.split('-')[1]);
  turnStatus.textContent = 'Moving…';
  turnStatus.className = 'turn-status-waiting';
  SoundFX.playMove();
  if (move.slideBumps && move.slideBumps.length > 0) {
    move.slideBumps.forEach(function(sb) { Multiplayer.bumpPawn(sb.color, parseInt(sb.pawnId.split('-')[1])); });
  }
  if (move.bump) Multiplayer.bumpPawn(move.bump.color, parseInt(move.bump.pawnId.split('-')[1]));
  Multiplayer.movePawn(myColor, pawnIndex, move.to, move.lapped);
}

function _sendMovePartial(move, myColor) {
  var pawnIndex = parseInt(move.pawnId.split('-')[1]);
  if (move.slideBumps && move.slideBumps.length > 0) {
    move.slideBumps.forEach(function(sb) { Multiplayer.bumpPawn(sb.color, parseInt(sb.pawnId.split('-')[1])); });
  }
  if (move.bump) Multiplayer.bumpPawn(move.bump.color, parseInt(move.bump.pawnId.split('-')[1]));
  Multiplayer.movePawnPartial(myColor, pawnIndex, move.to, move.lapped);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
Multiplayer.connect();
