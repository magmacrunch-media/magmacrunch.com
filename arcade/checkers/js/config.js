/**
 * config.js — Checkers game constants and configuration
 */

var CK = {};

// ── Players ──────────────────────────────────────────────────────────────────
CK.PLAYER = 'player';
CK.AI = 'ai';

// ── Piece Values ─────────────────────────────────────────────────────────────
CK.EMPTY = 0;
CK.PLAYER_PIECE = 1;
CK.AI_PIECE = -1;
CK.PLAYER_KING = 2;
CK.AI_KING = -2;

// ── Board ────────────────────────────────────────────────────────────────────
CK.BOARD_SIZE = 8;
CK.INITIAL_PIECES = 12; // Each player starts with 12 pieces

// ── Game States ──────────────────────────────────────────────────────────────
CK.STATE = {
    WAITING: 'waiting',
    SELECTING: 'selecting',
    MOVING: 'moving',
    AI_TURN: 'ai_turn',
    GAME_OVER: 'game_over'
};

// ── Move Types ───────────────────────────────────────────────────────────────
CK.MOVE_TYPE = {
    NORMAL: 'normal',
    JUMP: 'jump',
    MULTI_JUMP: 'multi_jump'
};

// ── Colors (neon theme) ──────────────────────────────────────────────────────
CK.COLORS = {
    bg: '#0a0612',
    boardDark: '#1a0a2a',
    boardLight: '#2a1a3a',
    boardBorder: '#00f5ff',
    player: '#00f5ff',
    playerGlow: 'rgba(0,245,255,0.6)',
    playerKing: '#00d4ff',
    ai: '#ff2d78',
    aiGlow: 'rgba(255,45,120,0.6)',
    aiKing: '#ff1a6d',
    highlight: '#39ff6e',
    highlightGlow: 'rgba(57,255,110,0.5)',
    highlightJump: '#ffe03a',
    highlightJumpGlow: 'rgba(255,224,58,0.6)',
    text: '#f0ead8',
    textDim: '#8a7fa8',
    selected: '#ffffff',
    selectedGlow: 'rgba(255,255,255,0.8)'
};

// ── Board Dimensions (for rendering) ─────────────────────────────────────────
CK.BOARD = {
    width: 480,
    height: 480,
    squareSize: 60,
    pieceSize: 48,
    kingSize: 20
};

// ── Initial Position ─────────────────────────────────────────────────────────
// Standard checkers: 12 pieces per player on dark squares
// AI pieces on rows 0-2, Player pieces on rows 5-7
CK.INITIAL_BOARD = [
    [ 0, -1,  0, -1,  0, -1,  0, -1],  // Row 0: AI
    [-1,  0, -1,  0, -1,  0, -1,  0],  // Row 1: AI
    [ 0, -1,  0, -1,  0, -1,  0, -1],  // Row 2: AI
    [ 0,  0,  0,  0,  0,  0,  0,  0],  // Row 3: Empty
    [ 0,  0,  0,  0,  0,  0,  0,  0],  // Row 4: Empty
    [ 1,  0,  1,  0,  1,  0,  1,  0],  // Row 5: Player
    [ 0,  1,  0,  1,  0,  1,  0,  1],  // Row 6: Player
    [ 1,  0,  1,  0,  1,  0,  1,  0]   // Row 7: Player
];
