// config.js — Sökö (Scandinavian Stud) | MagmaCrunch Media © 2026

// ── Score backend is now handled by ScoreClient (MAGMA//OPS dashboard) ──
// No external API keys needed

// ── Card configuration ───────────────────────────────────────
// Suit symbols come from the engine (identical values). SUITS, RANKS,
// SUIT_COLORS and RANK_VALUES used to be declared here but nothing read them —
// AdCards carries its own copies for rendering, and js/hand-eval.js has its own
// rank ordering. Note that AdCards is ace-low (RANK_VALUES.A === 1), so do NOT
// reach for AdCards.RANK_VALUES here without checking: Sökö is ace-high.
const { SUIT_SYMBOLS } = AdCards;

const RANK_DISPLAY = {
    'A': 'A', '2': '2', '3': '3', '4': '4', '5': '5',
    '6': '6', '7': '7', '8': '8', '9': '9', '10': '10',
    'J': 'J', 'Q': 'Q', 'K': 'K'
};

// ── Sökö hand rankings (higher = better) ────────────────────
// Unique to Sökö: 4-Card Flush and 4-Card Straight
const HAND_RANKS = {
    'Royal Flush':        11,
    'Straight Flush':     10,
    'Four of a Kind':     9,
    'Full House':         8,
    'Flush':              7,
    'Straight':           6,
    'Three of a Kind':    5,
    'Two Pair':           4,
    'Four-Card Flush':    3,
    'Four-Card Straight': 2,
    'One Pair':           1,
    'High Card':          0
};

// Point values for hand resolution
const HAND_POINTS = {
    'Royal Flush':        1000,
    'Straight Flush':     500,
    'Four of a Kind':     250,
    'Full House':         150,
    'Flush':              100,
    'Straight':           75,
    'Three of a Kind':    50,
    'Two Pair':           25,
    'Four-Card Flush':    15,
    'Four-Card Straight': 10,
    'One Pair':           5,
    'High Card':          0
};

// ── Game configuration ──────────────────────────────────────
const STARTING_CHIPS  = 1000;
const ANTE_AMOUNT     = 25;
const SMALL_BET       = 25;    // Betting rounds 1-2
const BIG_BET         = 50;    // Betting rounds 3-4
const MAXRaises_PER_ROUND = 3; // Cap per betting round

const NUM_AI_OPPONENTS = 3;    // Number of AI players

// ── AI difficulty settings ──────────────────────────────────
// AI thresholds for calling/raising based on hand strength
const AI_AGGRESSION = {
    conservative: { call: 0.3, raise: 0.1 },  // Folds more, rarely raises
    moderate:     { call: 0.5, raise: 0.2 },  // Balanced
    aggressive:   { call: 0.7, raise: 0.4 }   // Stays in more, raises often
};

// ── Finnish/English translations ────────────────────────────
const LABELS = {
    fi: {
        title: 'SÖKÖ',
        subtitle: 'skandinavialainen stud',
        start: 'Aloita peli',
        howToPlay: 'Ohjeet',
        highScores: 'Ennätykset',
        noScores: 'Ei vielä ennätyksiä',
        credits: 'Tekijät',
        ante: 'Alkupanos',
        bet: 'Panoksen',
        call: 'Maksaa',
        raise: 'Nostaa',
        fold: 'Luovuttaa',
        check: 'Sekötä',
        close: 'Sulje',
        pot: 'Potti',
        chips: 'Chipsiä',
        round: 'Kierros',
        showdown: 'Näytä kortit',
        youWin: 'Voitit!',
        youLose: 'Hävisit!',
        dealer: 'Jakaja',
        player: 'Pelaaja',
        holeCard: 'Piilokortti',
        streetNames: ['Piilokortti / hole card', 'Ensimmäinen avoin / first up', 'Toinen avoin / second up', 'Kolmas avoin / third up', 'Neljäs avoin / fourth up'],
        handNames: {
            'Royal Flush': 'Kuningasvärisuora',
            'Straight Flush': 'Värisuora',
            'Four of a Kind': 'Neloset',
            'Full House': 'Täyskäsi',
            'Flush': 'Väri',
            'Straight': 'Suora',
            'Three of a Kind': 'Kolmoset',
            'Two Pair': 'Kaksi paria',
            'Four-Card Flush': 'Neljän kortin väri',
            'Four-Card Straight': 'Neljän kortin suora',
            'One Pair': 'Pari',
            'High Card': 'Korkein kortti'
        },
        back: '← magmacrunch arcade',
        newGame: 'Uusi peli',
        menu: 'Valikko',
        gameOverWin: 'Voitit potin',
        gameOverLose: 'Hävisit',
        creditsText: 'Peli suunniteltu ja ohjelmoitu MagmaCrunch Median toimesta.',
        rulesTitle: 'Ohjeet',
        rules: [
            'Sökö on suomalainen pokerivariantti.',
            'Jokainen pelaaja saa yhden piilokortin ja neljä avokorttia.',
            'Neljä panostuskierrosta — yksi jokaisen avokortin jälkeen.',
            'Erikoiskädet: neljän kortin väri ja neljän kortin suora.',
            'Neljän kortin väri voittaa parin ja neljän kortin suoran.',
            'Voittaja on parhaan käden omistava pelaaja.'
        ]
    },
    en: {
        title: 'SÖKÖ',
        subtitle: 'scandinavian stud',
        start: 'Start Game',
        howToPlay: 'How to Play',
        highScores: 'High Scores',
        noScores: 'No scores yet',
        credits: 'Credits',
        ante: 'Ante',
        bet: 'Bet',
        call: 'Call',
        raise: 'Raise',
        fold: 'Fold',
        check: 'Check',
        close: 'Close',
        pot: 'Pot',
        chips: 'Chips',
        round: 'Round',
        showdown: 'Showdown',
        youWin: 'You Win!',
        youLose: 'You Lose!',
        dealer: 'Dealer',
        player: 'Player',
        holeCard: 'Hole Card',
        streetNames: ['Hole Card', 'First Up', 'Second Up', 'Third Up', 'Fourth Up'],
        handNames: {
            'Royal Flush': 'Royal Flush',
            'Straight Flush': 'Straight Flush',
            'Four of a Kind': 'Four of a Kind',
            'Full House': 'Full House',
            'Flush': 'Flush',
            'Straight': 'Straight',
            'Three of a Kind': 'Three of a Kind',
            'Two Pair': 'Two Pair',
            'Four-Card Flush': 'Four-Card Flush',
            'Four-Card Straight': 'Four-Card Straight',
            'One Pair': 'One Pair',
            'High Card': 'High Card'
        },
        back: '← magmacrunch arcade',
        newGame: 'New Game',
        menu: 'Menu',
        gameOverWin: 'You won the pot',
        gameOverLose: 'You lost',
        creditsText: 'Designed and coded by MagmaCrunch Media.',
        rulesTitle: 'How to Play',
        rules: [
            'Sökö is a Finnish poker variant.',
            'Each player gets one hole card and four face-up cards.',
            'Four betting rounds — one after each face-up card.',
            'Special hands: four-card flush and four-card straight.',
            'A four-card flush beats a pair and a four-card straight.',
            'The player with the best hand wins the pot.'
        ]
    }
};

// ── Theme colors ───────────────────────────────────────────
const SOKO_COLORS = {
    dark:      '#0a1628',
    darker:    '#060e1a',
    mid:       '#1a2a44',
    accent:    '#00f5ff',
    accentDim: '#007a80',
    green:     '#39ff6e',
    red:       '#ff3d6e',
    gold:      '#ffe03a',
    orange:    '#ff7c1f',
    white:     '#f0ead8',
    slate:     '#4a6a7a'
};
