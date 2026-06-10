// config.js - Texas Hold'Em Lava Dome | MagmaCrunch Media © 2024

// ── JSONBin (high scores) ────────────────────────────────────
const JSONBIN_API_KEY = '$2a$10$JiB3vjivV/azBnUh7jKjbuiiU7T9UnaOKTC0C9WnTR5WfLhnGSS.W';
const JSONBIN_BIN_ID  = '6995078143b1c97be9872947';

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

const RANK_VALUES = {
    'A': 14,
    '2': 2,  '3': 3,  '4': 4,  '5': 5,
    '6': 6,  '7': 7,  '8': 8,  '9': 9,
    '10': 10, 'J': 11, 'Q': 12, 'K': 13
};

// ── Hand rankings (higher = better) ─────────────────────────
const HAND_RANKS = {
    'Royal Flush':    9,
    'Straight Flush': 8,
    'Four of a Kind': 7,
    'Full House':     6,
    'Flush':          5,
    'Straight':       4,
    'Three of a Kind':3,
    'Two Pair':       2,
    'One Pair':       1,
    'High Card':      0
};

// Point values for hand resolution
const HAND_POINTS = {
    'Royal Flush':    1000,
    'Straight Flush': 500,
    'Four of a Kind': 250,
    'Full House':     150,
    'Flush':          100,
    'Straight':       75,
    'Three of a Kind':50,
    'Two Pair':       25,
    'One Pair':       10,
    'High Card':      0
};

// ── Chip configuration ───────────────────────────────────────
const STARTING_CHIPS     = 500;   // Chip stack at session start
const MIN_BET            = 10;    // Minimum bet per street
const MAX_BET_MULTIPLIER = 10;    // Max bet = ante * this

// ── Dome ante schedule ───────────────────────────────────────
// Ante paid at the start of each round (index = round number, 0-based)
// After the schedule runs out, the last value repeats + ANTE_ESCALATION_RATE
const ANTE_SCHEDULE = [
    10,   // Round 1  — Lithosphere
    10,   // Round 2
    20,   // Round 3  — Contemplate the Plate Tectonic
    20,   // Round 4
    30,   // Round 5  — Figure the Shoreline
    30,   // Round 6
    50,   // Round 7  — Penultimate Drop
    50,   // Round 8
    75,   // Round 9  — Pendant Stop
    75,   // Round 10
    100,  // Round 11 — Hazardous Metals in Ambient Air
    125,  // Round 12
    150,  // Round 13 — I would go up to the hot lava
    200,  // Round 14 — Millstone, 2063
    250   // Round 15+ — All All & All (repeats, +25 each round after)
];
const ANTE_ESCALATION_RATE = 25; // Added per round beyond schedule

// ── Dome depth labels (themed after band songs) ──────────────
// Shown as flavor text for current round depth
const DOME_DEPTHS = [
    { round: 1,  label: 'I keep my cards close to my heart'                       },
    { round: 2,  label: 'Eager for second chances'                       },
    { round: 3,  label: 'Contemplate the Plate Tectonic'    },
    { round: 4,  label: 'Contemplate the Plate Tectonic'    },
    { round: 5,  label: 'Figure the Shoreline'             },
    { round: 6,  label: 'Figure the Shoreline'             },
    { round: 7,  label: 'Penultimate Drop'                  },
    { round: 8,  label: 'Penultimate Drop'                  },
    { round: 9,  label: 'Pendant Stop'                      },
    { round: 10, label: 'Pendant Stop'                       },
    { round: 11, label: 'Hazardous Metals in Ambient Air'   },
    { round: 12, label: 'Hazardous Metals in Ambient Air'   },
    { round: 13, label: 'I Would Go Up to the Hot Lava'    },
    { round: 14, label: 'Millstone, 2063'                   },
    { round: 15, label: 'All All & All'                      }
];

// ── Dome point threshold ─────────────────────────────────────
// Your hand must score >= this to "beat" the dome each round
// Scales with round number
const DOME_BASE_THRESHOLD  = 10;   // Round 1 threshold (One Pair territory)
const DOME_THRESHOLD_SCALE = 5;    // Added per round

// ── Payout multipliers ───────────────────────────────────────
// Win: get back bet * multiplier based on hand strength
const PAYOUT_MULTIPLIERS = {
    'Royal Flush':    10,
    'Straight Flush': 6,
    'Four of a Kind': 4,
    'Full House':     3,
    'Flush':          2.5,
    'Straight':       2,
    'Three of a Kind':1.5,
    'Two Pair':       1.25,
    'One Pair':       1,
    'High Card':      0   // Can't beat the dome with high card
};

// ── Street names ─────────────────────────────────────────────
const STREETS = ['hole', 'flop', 'turn', 'river'];

// ── Flavor text ──────────────────────────────────────────────
// Random quips shown at various moments
const FLAVOR_BUST = [
    'The dome has claimed another soul.',
    'Bus full of time-traveling twenty-somethings — and you.',
    'What happened to you in all the confusion?',
    'The dome is not forgiving.',
    'Millstone, 2063. That\'s you now.'
];

const FLAVOR_WIN_BIG = [
    'I keep my cards close to my heart.',
    'Maybe the instruments failed and maybe they didn\'t.',
    'This has always been true.',
    'Ocean of storms — you surfed it.',
    'Hello World, Love Space.'
];

const FLAVOR_ESCAPE = [
    'You escaped the dome. For now.',
    'Friendship 7 4 fun — and profit.',
    'A pine tree caught electrical fire, but not you.',
    'Secret conference rooms await.',
    'Rendezvous at 44i boo. Mission complete.'
];

// ── Lava theme colors (reference) ───────────────────────────
const LAVA_COLORS = {
    black:       '#0a0000',
    darkRed:     '#1c0000',
    deepRed:     '#3b0000',
    lavaDark:    '#6b0000',
    lavaMid:     '#9b0000',
    lavaBright:  '#cc2200',
    orange:      '#dd4400',
    orangeHot:   '#ff5500',
    orangeGlow:  '#ff7700',
    yellow:      '#ffcc00',
    yellowPale:  '#ffe680',
    white:       '#fff8f0'
};
