// config.js — Cribbage | MagmaCrunch Media © 2026
// Card constants come from AdCards (now properly scoped in IIFE)
const { SUIT_SYMBOLS } = AdCards;

// ── Game configuration ───────────────────────────────────────
const WINNING_SCORE = 121;
const CARDS_PER_HAND = 6;    // Cards dealt to each player
const CRIB_SIZE = 4;         // Cards in the crib (2 from each player)
const MAX_PEG_COUNT = 31;    // Maximum count during pegging phase

// ── Scoring values ───────────────────────────────────────────
// Owned by scoring.js, which is also what the tests load.
const SCORE = CribbageScore.SCORE;

// Cribbage counts every court card as ten. AdCards.RANK_VALUES is the ordinal
// table (J=11, Q=12, K=13), which is right for ordering runs and wrong for
// counting to fifteen and thirty-one — reaching for it by habit is how a King
// ends up worth 13 toward the count, so the game asks scoring.js instead.
const pegValue = CribbageScore.value;

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
