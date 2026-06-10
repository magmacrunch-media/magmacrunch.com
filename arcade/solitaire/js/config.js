// config.js

// JSONBin API Configuration
const JSONBIN_API_KEY = '$2a$10$JiB3vjivV/azBnUh7jKjbuiiU7T9UnaOKTC0C9WnTR5WfLhnGSS.W';
const JSONBIN_BIN_ID = '6954997843b1c97be90f995a';

// Card configuration
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Suit symbols for rendering
const SUIT_SYMBOLS = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
};

// Colors for each suit
const SUIT_COLORS = {
    hearts: 'red',
    diamonds: 'red',
    clubs: 'black',
    spades: 'black'
};

// Rank values (for comparing cards)
const RANK_VALUES = {
    'A': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    'J': 11,
    'Q': 12,
    'K': 13
};