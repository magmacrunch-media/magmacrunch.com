// config.js — MagmaCards First Edition | MagmaCrunch Media © 2026
// Card configuration constants - only define if not already present

(function(global) {
    if (!global.SUITS) {
        global.SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
    }
    if (!global.RANKS) {
        global.RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    }
    if (!global.SUIT_COLORS) {
        global.SUIT_COLORS = {
            hearts: 'red',
            diamonds: 'red',
            clubs: 'black',
            spades: 'black'
        };
    }
    if (!global.RANK_VALUES) {
        global.RANK_VALUES = {
            'A': 1, '2': 2, '3': 3, '4': 4, '5': 5,
            '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
            'J': 11, 'Q': 12, 'K': 13
        };
    }
})(window);