// config.js — Cribbage | MagmaCrunch Media © 2026

// ── Score backend is now handled by ScoreClient (MAGMA//OPS dashboard) ──
// No external API keys needed

// ── Card configuration ───────────────────────────────────────
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const SUIT_SYMBOLS = {
    hearts:   '♥',
    diamonds: '♦',
    clubs:    '♣',
    spades:   '♠'
};

const SUIT_COLORS = {
    hearts:   'red',
    diamonds: 'red',
    clubs:    'black',
    spades:   'black'
};

// Cribbage card values: A=1, 2-10 face value, J=11, Q=12, K=13
// Used for counting to 31 during pegging and hand scoring
const RANK_VALUES = {
    'A': 1,
    '2': 2,  '3': 3,  '4': 4,  '5': 5,
    '6': 6,  '7': 7,  '8': 8,  '9': 9,
    '10': 10, 'J': 11, 'Q': 12, 'K': 13
};

// ── Game configuration ───────────────────────────────────────
const WINNING_SCORE = 121;
const CARDS_PER_HAND = 6;    // Cards dealt to each player
const CRIB_SIZE = 4;         // Cards in the crib (2 from each player)
const MAX_PEG_COUNT = 31;    // Maximum count during pegging phase

// ── Scoring values ───────────────────────────────────────────
const SCORE = {
    FIFTEEN:     2,   // Cards summing to 15
    PAIR:        2,   // Two cards of same rank
    THREE_OF_KIND: 6, // Three cards of same rank
    FOUR_OF_KIND: 12, // Four cards of same rank
    FLUSH_4:     4,   // Four cards same suit (hand only)
    FLUSH_5:     5,   // Five cards same suit (hand + starter)
    NIBS:        1,   // Jack in hand matching starter suit
    HIS_HEELS:   2,   // Jack turned as starter
    GO:          1,   // Opponent cannot play
    THIRTY_ONE:  2    // Hitting exactly 31
};

// ── Game phases ──────────────────────────────────────────────
const PHASE = {
    DEAL:           'deal',
    CRIB_SELECTION: 'crib_selection',
    STARTER_CUT:    'starter_cut',
    PEGGING:        'pegging',
    HAND_SCORING:   'hand_scoring',
    CRIB_SCORING:   'crib_scoring',
    GAME_OVER:      'game_over'
};

// ── Player configuration ─────────────────────────────────────
const STARTING_SCORE = 0;
const PLAYER_NAMES = {
    human: 'You',
    ai:    'Opponent'
};
