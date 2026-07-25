/**
 * config.js — Backgammon game constants and configuration
 */

var BG = {};

// ── Players ──────────────────────────────────────────────────────────────────
BG.PLAYER = 'player';
BG.AI = 'ai';

// ── Board Layout ─────────────────────────────────────────────────────────────
// 24 points numbered 1-24 (0-indexed: 0-23)
// Player moves from high to low (24→1), AI moves from low to high (1→24)
//
//   13  14  15  16  17  18  |BAR|  19  20  21  22  23  24
//   ┌───────────────────────┤   ├───────────────────────┐
//   │                       │   │                       │
//   └───────────────────────┤   ├───────────────────────┘
//   12  11  10   9   8   7  |BAR|   6   5   4   3   2   1

BG.NUM_POINTS = 24;
BG.HOME_PLAYER = 0;   // Point 0 = player's home (bear off from here)
BG.HOME_AI = 25;      // Virtual point 25 = AI's home

// ── Initial Position (standard backgammon) ────────────────────────────────────
// [point] = { count, owner } — using 1-indexed points for clarity
// Positive = player, Negative = AI
BG.INITIAL_POSITION = {
    1:  { count: 2, owner: BG.PLAYER },
    6:  { count: 5, owner: BG.AI },
    8:  { count: 3, owner: BG.AI },
    12: { count: 5, owner: BG.PLAYER },
    13: { count: 5, owner: BG.AI },
    17: { count: 3, owner: BG.PLAYER },
    19: { count: 5, owner: BG.PLAYER },
    24: { count: 2, owner: BG.AI }
};

// ── Board Array Representation ────────────────────────────────────────────────
// Index 0 = bar player, 1-24 = points, 25 = bar AI, 26 = off player, 27 = off AI
BG.BAR_PLAYER = 0;
BG.BAR_AI = 25;
BG.OFF_PLAYER = 26;
BG.OFF_AI = 27;
BG.ARRAY_SIZE = 28;

// ── Colors (neon theme) ──────────────────────────────────────────────────────
BG.COLORS = {
    bg: '#0a0612',
    boardBg: '#0d0820',
    pointLight: '#00f5ff',      // cyan
    pointDark: '#ff2d78',       // magenta
    pointLightDim: 'rgba(0,245,255,0.3)',
    pointDarkDim: 'rgba(255,45,120,0.3)',
    checkerPlayer: '#00f5ff',   // cyan
    checkerPlayerGlow: 'rgba(0,245,255,0.6)',
    checkerAi: '#ff2d78',       // magenta
    checkerAiGlow: 'rgba(255,45,120,0.6)',
    barBg: '#1a0a2a',
    offBg: '#0a0a1a',
    dice: '#ffe03a',            // yellow
    diceGlow: 'rgba(255,224,58,0.6)',
    diceDots: '#0a0612',
    doublingCube: '#ff7c1f',    // orange
    doublingCubeGlow: 'rgba(255,124,31,0.6)',
    highlight: '#39ff6e',       // green
    highlightGlow: 'rgba(57,255,110,0.5)',
    text: '#f0ead8',
    textDim: '#8a7fa8',
    white: '#f0ead8',
    black: '#080808'
};

// ── Dice ─────────────────────────────────────────────────────────────────────
BG.DICE_SIZE = 48;
BG.DICE_DOT_RADIUS = 5;
BG.DICE_ANIMATION_FRAMES = 12;
BG.DICE_ANIMATION_SPEED = 80; // ms per frame

// ── Doubling Cube ────────────────────────────────────────────────────────────
BG.DOUBLING_VALUES = [1, 2, 4, 8, 16, 32, 64];

// ── Game States ──────────────────────────────────────────────────────────────
BG.STATE = {
    WAITING: 'waiting',
    ROLLING: 'rolling',
    MOVING: 'moving',
    DOUBLING: 'doubling',
    GAME_OVER: 'game_over'
};

// ── Move Types ───────────────────────────────────────────────────────────────
BG.MOVE_TYPE = {
    NORMAL: 'normal',
    HIT: 'hit',
    BAR: 'bar',
    BEAR_OFF: 'bear_off'
};

// ── Board Dimensions (for rendering) ─────────────────────────────────────────
BG.BOARD = {
    width: 600,
    height: 500,
    pointWidth: 40,
    pointHeight: 180,
    barWidth: 50,
    offWidth: 60,
    borderWidth: 8,
    checkerRadius: 16,
    checkerSpacing: 30
};
