// config.js — French Tarot | MagmaCrunch Media © 2026
// All constants for the 78-card Tarot Nouveau deck

// ── Deck composition ──────────────────────────────────────
const TAROT_SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];

// 14 ranks per suit (1-10 + 4 court cards)
const TAROT_RANKS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'V', 'C', 'D', 'R'];

// Court card names (French)
const COURT_NAMES = {
    'V': 'Valet',    // Jack
    'C': 'Cavalier', // Knight
    'D': 'Dame',     // Queen
    'R': 'Roi'       // King
};

// Suit symbols for rendering
const TAROT_SUIT_SYMBOLS = {
    hearts:   '♥',
    diamonds: '♦',
    clubs:    '♣',
    spades:   '♠'
};

// Suit colors
const TAROT_SUIT_COLORS = {
    hearts:   'red',
    diamonds: 'red',
    clubs:    'black',
    spades:   'black'
};

// Card point values for scoring (counter cards)
const CARD_POINTS = {
    'R': 4.5,  // King
    'D': 3.5,  // Queen
    'C': 2.5,  // Knight
    'V': 1.5   // Jack
};
// All other cards (number cards, non-oudler trumps) = 0.5 points

// ── Trumps (Atouts) ──────────────────────────────────────
// 21 numbered trumps + 1 Excuse (Fool)
const TRUMP_COUNT = 21;
const EXCUSE_NUMBER = 0; // The Excuse/Fool (unnumbered)

// Oudlers (honours) — these lower the point threshold
const OUDLERS = [1, 21, 0]; // Petit (1), Monde (21), Excuse (0)

// Points needed to win based on number of oudlers held
const OUDLER_THRESHOLDS = {
    0: 56,
    1: 51,
    2: 41,
    3: 36
};

// ── Bidding system ────────────────────────────────────────
const BIDS = {
    PASSE:        { name: 'Passe',       multiplier: 0, label: 'Pass' },
    PRISE:        { name: 'Prise',       multiplier: 1, label: 'Take (1×)' },
    GARDE:        { name: 'Garde',       multiplier: 2, label: 'Guard (2×)' },
    GARDE_SANS:   { name: 'Garde Sans',  multiplier: 4, label: 'Guard Without (4×)' },
    GARDE_CONTRE: { name: 'Garde Contre', multiplier: 6, label: 'Guard Against (6×)' }
};

const BID_ORDER = ['PASSE', 'PRISE', 'GARDE', 'GARDE_SANS', 'GARDE_CONTRE'];

// ── Game configuration ────────────────────────────────────
const DOG_SIZE = 6;
const HAND_SIZE = 18;     // 78 cards / 4 players = 18.5, but 6 go to dog: (78-6)/4 = 18
const TRICK_COUNT = 18;   // Same as hand size
const TOTAL_POINTS = 91;  // Total card points in the deck
const WINNING_SCORE = 1000;

// ── Scoring bonuses ───────────────────────────────────────
const BONUSES = {
    POIGNEE_SIMPLE:  { trumps: 10, points: 20 },
    POIGNEE_DOUBLE:  { trumps: 13, points: 40 },
    POIGNEE_TRIPLE:  { trumps: 15, points: 60 },
    PETIT_AU_BOUT:   10,
    CHELEM_ANNOUNCED: 400,
    CHELEM_UNANNOUNCED: 200,
    CHELEM_FAILED:   -200
};

// ── Game phases ───────────────────────────────────────────
const PHASE = {
    IDLE:           'idle',
    DEAL:           'deal',
    BIDDING:        'bidding',
    DOG_EXCHANGE:   'dog_exchange',
    TRICK_PLAY:     'trick_play',
    ROUND_SCORING:  'round_scoring',
    GAME_OVER:      'game_over'
};

// ── Player positions (4-player) ───────────────────────────
// Positions relative to dealer (index 0 = dealer)
const POSITIONS = ['south', 'west', 'north', 'east'];

const PLAYER_NAMES = {
    south: 'You',
    west:  'West',
    north: 'North',
    east:  'East'
};
