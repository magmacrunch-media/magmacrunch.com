/**
 * config.js — Chinese Checkers game constants and configuration
 * Uses axial cube coordinates (q, r, s) where q + r + s = 0
 */

var CC = {};

// ── Players ──────────────────────────────────────────────────────────────────
CC.PLAYER1 = 'player1';
CC.PLAYER2 = 'player2';
CC.EMPTY = 0;

// ── Board ────────────────────────────────────────────────────────────────────
CC.HEX_SIZE = 28;       // Radius of each hex cell in pixels
CC.BOARD_PADDING = 40;  // Padding around the board

// ── Game States ──────────────────────────────────────────────────────────────
CC.STATE = {
    WAITING: 'waiting',
    SELECTING: 'selecting',
    MOVING: 'moving',
    AI_TURN: 'ai_turn',
    GAME_OVER: 'game_over'
};

// ── Move Types ───────────────────────────────────────────────────────────────
CC.MOVE_TYPE = {
    ADJACENT: 'adjacent',
    HOP: 'hop',
    MULTI_HOP: 'multi_hop'
};

// ── Colors (neon theme) ──────────────────────────────────────────────────────
CC.COLORS = {
    bg: '#0a0612',
    boardBg: '#150b29',
    cellEmpty: '#2a1a3a',
    cellBorder: '#3a2d5c',
    player1: '#00f5ff',
    player1Glow: 'rgba(0,245,255,0.6)',
    player2: '#ff2d78',
    player2Glow: 'rgba(255,45,120,0.6)',
    highlight: '#39ff6e',
    highlightGlow: 'rgba(57,255,110,0.5)',
    highlightHop: '#ffe03a',
    highlightHopGlow: 'rgba(255,224,58,0.6)',
    text: '#f0ead8',
    textDim: '#8a7fa8',
    selected: '#ffffff',
    selectedGlow: 'rgba(255,255,255,0.8)'
};

// ── All valid board positions as [q, r, s] cube coordinates ──────────────────
CC.POSITIONS = [
    [4,-8,4],[3,-7,4],[4,-7,3],[2,-6,4],[3,-6,3],[4,-6,2],
    [1,-5,4],[2,-5,3],[3,-5,2],[4,-5,1],
    [-4,-4,8],[-3,-4,7],[-2,-4,6],[-1,-4,5],[0,-4,4],[1,-4,3],[2,-4,2],[3,-4,1],[4,-4,0],[5,-4,-1],[6,-4,-2],[7,-4,-3],[8,-4,-4],
    [-4,-3,7],[-3,-3,6],[-2,-3,5],[-1,-3,4],[0,-3,3],[1,-3,2],[2,-3,1],[3,-3,0],[4,-3,-1],[5,-3,-2],[6,-3,-3],[7,-3,-4],
    [-4,-2,6],[-3,-2,5],[-2,-2,4],[-1,-2,3],[0,-2,2],[1,-2,1],[2,-2,0],[3,-2,-1],[4,-2,-2],[5,-2,-3],[6,-2,-4],
    [-4,-1,5],[-3,-1,4],[-2,-1,3],[-1,-1,2],[0,-1,1],[1,-1,0],[2,-1,-1],[3,-1,-2],[4,-1,-3],[5,-1,-4],
    [-4,0,4],[-3,0,3],[-2,0,2],[-1,0,1],[0,0,0],[1,0,-1],[2,0,-2],[3,0,-3],[4,0,-4],
    [-5,1,4],[-4,1,3],[-3,1,2],[-2,1,1],[-1,1,0],[0,1,-1],[1,1,-2],[2,1,-3],[3,1,-4],[4,1,-5],
    [-6,2,4],[-5,2,3],[-4,2,2],[-3,2,1],[-2,2,0],[-1,2,-1],[0,2,-2],[1,2,-3],[2,2,-4],[3,2,-5],[4,2,-6],
    [-7,3,4],[-6,3,3],[-5,3,2],[-4,3,1],[-3,3,0],[-2,3,-1],[-1,3,-2],[0,3,-3],[1,3,-4],[2,3,-5],[3,3,-6],[4,3,-7],
    [-8,4,4],[-7,4,3],[-6,4,2],[-5,4,1],[-4,4,0],[-3,4,-1],[-2,4,-2],[-1,4,-3],[0,4,-4],[1,4,-5],[2,4,-6],[3,4,-7],[4,4,-8],
    [-4,5,-1],[-3,5,-2],[-2,5,-3],[-1,5,-4],
    [-4,6,-2],[-3,6,-3],[-2,6,-4],
    [-4,7,-3],[-3,7,-4],
    [-4,8,-4]
];

// ── Player 1 starting positions (top triangle) ──────────────────────────────
CC.PLAYER1_START = [
    [1,-5,4],[2,-6,4],[2,-5,3],[3,-7,4],[3,-6,3],[3,-5,2],
    [4,-8,4],[4,-7,3],[4,-6,2],[4,-5,1]
];

// ── Player 2 starting positions (bottom triangle) ───────────────────────────
CC.PLAYER2_START = [
    [-4,5,-1],[-4,6,-2],[-4,7,-3],[-4,8,-4],
    [-3,5,-2],[-3,6,-3],[-3,7,-4],
    [-2,5,-3],[-2,6,-4],
    [-1,5,-4]
];

// ── Player 1 goal positions (bottom triangle) ───────────────────────────────
CC.PLAYER1_GOAL = [
    [-4,5,-1],[-4,6,-2],[-4,7,-3],[-4,8,-4],
    [-3,5,-2],[-3,6,-3],[-3,7,-4],
    [-2,5,-3],[-2,6,-4],
    [-1,5,-4]
];

// ── Player 2 goal positions (top triangle) ──────────────────────────────────
CC.PLAYER2_GOAL = [
    [1,-5,4],[2,-6,4],[2,-5,3],[3,-7,4],[3,-6,3],[3,-5,2],
    [4,-8,4],[4,-7,3],[4,-6,2],[4,-5,1]
];

// ── Hex directions (6 neighbors) ─────────────────────────────────────────────
CC.DIRECTIONS = [
    [1, -1, 0],   // right
    [1, 0, -1],   // bottom-right
    [0, 1, -1],   // bottom-left
    [-1, 1, 0],   // left
    [-1, 0, 1],   // top-left
    [0, -1, 1]    // top-right
];

// ── Helper: Position key for map lookups ─────────────────────────────────────
CC.posKey = function(q, r, s) {
    return q + ',' + r + ',' + s;
};

// ── Helper: Parse key back to [q, r, s] ─────────────────────────────────────
CC.parseKey = function(key) {
    var parts = key.split(',');
    return [parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2])];
};

// ── Helper: Cube distance between two positions ─────────────────────────────
CC.cubeDistance = function(a, b) {
    return Math.max(
        Math.abs(a[0] - b[0]),
        Math.abs(a[1] - b[1]),
        Math.abs(a[2] - b[2])
    );
};

// ── Helper: Get center pixel for a hex position ─────────────────────────────
// Uses flat-top hexagon layout
CC.hexToPixel = function(q, r) {
    var x = CC.HEX_SIZE * (3/2 * q);
    var y = CC.HEX_SIZE * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
    return { x: x, y: y };
};
