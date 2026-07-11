/**
 * config.js — Chess game constants and configuration
 */

var CH = {};

// ── Players ──────────────────────────────────────────────────────────────────
CH.PLAYER = 'player';
CH.AI = 'ai';
CH.ONLINE = 'online';

// ── Piece Types ──────────────────────────────────────────────────────────────
CH.PAWN = 'pawn';
CH.KNIGHT = 'knight';
CH.BISHOP = 'bishop';
CH.ROOK = 'rook';
CH.QUEEN = 'queen';
CH.KING = 'king';

// ── Piece Values (for AI evaluation) ─────────────────────────────────────────
CH.PIECE_VALUES = {
    pawn: 100,
    knight: 320,
    bishop: 330,
    rook: 500,
    queen: 900,
    king: 20000
};

// ── Algebraic Notation Symbols ───────────────────────────────────────────────
CH.NOTATION_SYMBOLS = {
    king: 'K',
    queen: 'Q',
    rook: 'R',
    bishop: 'B',
    knight: 'N',
    pawn: ''
};

// ── Board ────────────────────────────────────────────────────────────────────
CH.BOARD_SIZE = 8;

// ── Game States ──────────────────────────────────────────────────────────────
CH.STATE = {
    WAITING: 'waiting',
    WAITING_FOR_OPPONENT: 'waiting_for_opponent',
    SELECTING: 'selecting',
    MOVING: 'moving',
    PROMOTING: 'promoting',
    AI_TURN: 'ai_turn',
    OPPONENT_TURN: 'opponent_turn',
    GAME_OVER: 'game_over'
};

// ── Colors (neon theme) ──────────────────────────────────────────────────────
CH.COLORS = {
    bg: '#0a0612',
    boardDark: '#1a0a2a',
    boardLight: '#2a1a3a',
    boardBorder: '#00f5ff',
    player: '#00f5ff',
    playerGlow: 'rgba(0,245,255,0.6)',
    ai: '#ff2d78',
    aiGlow: 'rgba(255,45,120,0.6)',
    highlight: '#39ff6e',
    highlightGlow: 'rgba(57,255,110,0.5)',
    lastMove: '#ffe03a',
    lastMoveGlow: 'rgba(255,224,58,0.4)',
    check: '#ff3d3d',
    checkGlow: 'rgba(255,61,61,0.6)',
    text: '#f0ead8',
    textDim: '#8a7fa8',
    selected: '#ffffff',
    selectedGlow: 'rgba(255,255,255,0.8)'
};

// ── Time Control Options ─────────────────────────────────────────────────────
CH.TIME_CONTROLS = {
    none: { name: 'No Timer', seconds: 0 },
    blitz: { name: 'Blitz (5 min)', seconds: 300 },
    rapid: { name: 'Rapid (15 min)', seconds: 900 },
    classical: { name: 'Classical (30 min)', seconds: 1800 }
};

// ── AI Difficulty Levels ─────────────────────────────────────────────────────
CH.AI_DIFFICULTY = {
    easy: { name: 'Easy', depth: 2 },
    medium: { name: 'Medium', depth: 3 },
    hard: { name: 'Hard', depth: 4 }
};

// ── Default Settings ─────────────────────────────────────────────────────────
CH.DEFAULT_SETTINGS = {
    difficulty: 'medium',
    timeControl: 'none'
};

// ── Initial Position (standard chess) ────────────────────────────────────────
// board[row][col] = { type, owner } or null (empty)
// Row 0 = top (AI/black), Row 7 = bottom (player/white)
CH.INITIAL_BOARD = [
    // Row 0: AI pieces (black)
    [
        { type: 'rook', owner: 'ai' },
        { type: 'knight', owner: 'ai' },
        { type: 'bishop', owner: 'ai' },
        { type: 'queen', owner: 'ai' },
        { type: 'king', owner: 'ai' },
        { type: 'bishop', owner: 'ai' },
        { type: 'knight', owner: 'ai' },
        { type: 'rook', owner: 'ai' }
    ],
    // Row 1: AI pawns
    [
        { type: 'pawn', owner: 'ai' },
        { type: 'pawn', owner: 'ai' },
        { type: 'pawn', owner: 'ai' },
        { type: 'pawn', owner: 'ai' },
        { type: 'pawn', owner: 'ai' },
        { type: 'pawn', owner: 'ai' },
        { type: 'pawn', owner: 'ai' },
        { type: 'pawn', owner: 'ai' }
    ],
    // Rows 2-5: Empty
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    // Row 6: Player pawns
    [
        { type: 'pawn', owner: 'player' },
        { type: 'pawn', owner: 'player' },
        { type: 'pawn', owner: 'player' },
        { type: 'pawn', owner: 'player' },
        { type: 'pawn', owner: 'player' },
        { type: 'pawn', owner: 'player' },
        { type: 'pawn', owner: 'player' },
        { type: 'pawn', owner: 'player' }
    ],
    // Row 7: Player pieces (white)
    [
        { type: 'rook', owner: 'player' },
        { type: 'knight', owner: 'player' },
        { type: 'bishop', owner: 'player' },
        { type: 'queen', owner: 'player' },
        { type: 'king', owner: 'player' },
        { type: 'bishop', owner: 'player' },
        { type: 'knight', owner: 'player' },
        { type: 'rook', owner: 'player' }
    ]
];
