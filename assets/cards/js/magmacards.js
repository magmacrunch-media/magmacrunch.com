// ── MagmaCrunch Cards First Edition ───────────────────────
// Card and Deck classes.
// Uses SUITS, RANKS, SUIT_COLORS etc - set up by config.js which runs AFTER this script.

// Fallback values (used if config hasn't run yet or game doesn't define them)
var SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
var RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
var SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
var SUIT_COLORS = { hearts: 'red', diamonds: 'red', clubs: 'black', spades: 'black' };
var RANK_VALUES = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13 };

// But if config defined const values, use those instead (they shadow our fallbacks via global)
if (typeof SUITS !== 'undefined') { var SUITS = SUITS; }
if (typeof RANKS !== 'undefined') { var RANKS = RANKS; }
if (typeof SUIT_SYMBOLS !== 'undefined') { var SUIT_SYMBOLS = SUIT_SYMBOLS; }
if (typeof SUIT_COLORS !== 'undefined') { var SUIT_COLORS = SUIT_COLORS; }
if (typeof RANK_VALUES !== 'undefined') { var RANK_VALUES = RANK_VALUES; }

// ── Helpers ────────────────────────────────────────────────
function pipColor(suit) {
    return (suit === 'hearts' || suit === 'diamonds') ? '#cc0000' : '#111111';
}

function getSuitSymbol(suit) {
    return SUIT_SYMBOLS[suit] || '';
}

function isRed(suit) {
    return suit === 'hearts' || suit === 'diamonds';
}

// ── Corner pip SVG (pixel art) ───────────────────────────────
function cornerPipSVG(suit, color) {
    const shapes = {
        hearts: `<svg viewBox="0 0 8 7" xmlns="http://www.w3.org/2000/svg" style="shape-rendering:crispEdges;display:block;">
            <rect x="1" y="0" width="2" height="1" fill="${color}"/>
            <rect x="5" y="0" width="2" height="1" fill="${color}"/>
            <rect x="0" y="1" width="8" height="2" fill="${color}"/>
            <rect x="1" y="3" width="6" height="1" fill="${color}"/>
            <rect x="2" y="4" width="4" height="1" fill="${color}"/>
            <rect x="3" y="5" width="2" height="1" fill="${color}"/>
            <rect x="3" y="6" width="2" height="1" fill="${color}"/>
          </svg>`,
        diamonds: `<svg viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg" style="shape-rendering:crispEdges;display:block;">
            <rect x="3" y="0" width="2" height="1" fill="${color}"/>
            <rect x="2" y="1" width="4" height="1" fill="${color}"/>
            <rect x="1" y="2" width="6" height="1" fill="${color}"/>
            <rect x="0" y="3" width="8" height="1" fill="${color}"/>
            <rect x="1" y="4" width="6" height="1" fill="${color}"/>
            <rect x="2" y="5" width="4" height="1" fill="${color}"/>
            <rect x="3" y="6" width="2" height="1" fill="${color}"/>
          </svg>`,
        spades: `<svg viewBox="0 0 8 9" xmlns="http://www.w3.org/2000/svg" style="shape-rendering:crispEdges;display:block;">
            <rect x="3" y="0" width="2" height="1" fill="${color}"/>
            <rect x="2" y="1" width="4" height="1" fill="${color}"/>
            <rect x="1" y="2" width="6" height="1" fill="${color}"/>
            <rect x="0" y="3" width="8" height="1" fill="${color}"/>
            <rect x="1" y="4" width="6" height="1" fill="${color}"/>
            <rect x="3" y="5" width="2" height="1" fill="${color}"/>
            <rect x="1" y="6" width="6" height="1" fill="${color}"/>
            <rect x="2" y="7" width="4" height="1" fill="${color}"/>
          </svg>`,
        clubs: `<svg viewBox="0 0 8 9" xmlns="http://www.w3.org/2000/svg" style="shape-rendering:crispEdges;display:block;">
            <rect x="3" y="0" width="2" height="1" fill="${color}"/>
            <rect x="2" y="1" width="4" height="2" fill="${color}"/>
            <rect x="0" y="2" width="3" height="2" fill="${color}"/>
            <rect x="5" y="2" width="3" height="2" fill="${color}"/>
            <rect x="2" y="2" width="4" height="4" fill="${color}"/>
            <rect x="0" y="4" width="8" height="1" fill="${color}"/>
            <rect x="1" y="5" width="6" height="1" fill="${color}"/>
            <rect x="3" y="6" width="2" height="1" fill="${color}"/>
            <rect x="2" y="7" width="4" height="1" fill="${color}"/>
          </svg>`
    };
    return shapes[suit] || '';
}

// ── Card back SVG ─────────────────────────────────────────
function getCardBackSVG() {
    return `
    <svg class="card-back-svg" viewBox="0 0 64 88" xmlns="http://www.w3.org/2000/svg"
         style="shape-rendering:crispEdges; image-rendering:pixelated;">
      <defs>
        <pattern id="vwgrid" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#0d0028"/>
          <line x1="0" y1="0" x2="8" y2="8" stroke="#ff2d78" stroke-width="0.6" opacity="0.55"/>
          <line x1="8" y1="0" x2="0" y2="8" stroke="#00e5ff" stroke-width="0.6" opacity="0.45"/>
        </pattern>
      </defs>
      <rect x="0" y="0" width="64" height="88" fill="#0d0028"/>
      <line x1="0" y1="0" x2="64" y2="0"  stroke="#4a107a" stroke-width="1"/>
      <line x1="0" y1="0" x2="0"  y2="88" stroke="#4a107a" stroke-width="1"/>
      <line x1="63" y1="0" x2="63" y2="88" stroke="#06000f" stroke-width="1"/>
      <line x1="0" y1="87" x2="64" y2="87" stroke="#06000f" stroke-width="1"/>
      <rect x="3" y="3" width="58" height="82" fill="none" stroke="#ff2d78" stroke-width="0.75" opacity="0.6"/>
      <rect x="5" y="5" width="54" height="78" fill="none" stroke="#00e5ff" stroke-width="0.5" opacity="0.4"/>
      <rect x="6" y="6" width="52" height="76" fill="url(#vwgrid)"/>
      <rect x="15" y="29" width="34" height="30" rx="2" ry="2" fill="#060018"/>
      <rect x="16" y="30" width="32" height="28" rx="1" ry="1" fill="none" stroke="#ffd700" stroke-width="0.75" opacity="0.7"/>
      <rect x="30" y="34" width="2" height="2" fill="#ff6000" opacity="0.9"/>
      <rect x="34" y="34" width="2" height="2" fill="#ff2d00" opacity="0.8"/>
      <rect x="27" y="35" width="2" height="2" fill="#ff2d00" opacity="0.7"/>
      <rect x="32" y="35" width="2" height="2" fill="#ffaa00" opacity="0.95"/>
      <rect x="36" y="36" width="2" height="2" fill="#ff6000" opacity="0.7"/>
      <rect x="29" y="36" width="2" height="1" fill="#ffaa00" opacity="0.8"/>
      <rect x="28" y="38" width="3" height="2" fill="#ffd700" opacity="0.9"/>
      <rect x="33" y="38" width="3" height="2" fill="#ffd700" opacity="0.9"/>
      <rect x="31" y="38" width="2" height="2" fill="#ff4400" opacity="1"/>
      <rect x="27" y="40" width="10" height="2" fill="#cc8800" opacity="0.95"/>
      <rect x="25" y="42" width="14" height="2" fill="#bb7700" opacity="0.95"/>
      <rect x="22" y="44" width="20" height="2" fill="#aa6600" opacity="0.95"/>
      <rect x="19" y="46" width="26" height="2" fill="#996600" opacity="0.95"/>
      <rect x="17" y="48" width="30" height="2" fill="#885500" opacity="0.95"/>
      <rect x="16" y="50" width="32" height="2" fill="#774400" opacity="0.95"/>
      <rect x="20" y="51" width="6"  height="1" fill="#ff6600" opacity="0.6"/>
      <rect x="28" y="51" width="8"  height="1" fill="#ff8800" opacity="0.55"/>
      <rect x="37" y="51" width="5"  height="1" fill="#ff4400" opacity="0.5"/>
      <line x1="10" y1="27" x2="54" y2="27" stroke="#ffd700" stroke-width="0.5" opacity="0.35"/>
      <line x1="10" y1="61" x2="54" y2="61" stroke="#ffd700" stroke-width="0.5" opacity="0.35"/>
      <rect x="7"  y="7"  width="3" height="3" fill="#ff2d78" opacity="0.9"/>
      <rect x="54" y="7"  width="3" height="3" fill="#ff2d78" opacity="0.9"/>
      <rect x="7"  y="78" width="3" height="3" fill="#ff2d78" opacity="0.9"/>
      <rect x="54" y="78" width="3" height="3" fill="#ff2d78" opacity="0.9"/>
      <rect x="11" y="11" width="2" height="2" fill="#00e5ff" opacity="0.7"/>
      <rect x="51" y="11" width="2" height="2" fill="#00e5ff" opacity="0.7"/>
      <rect x="11" y="75" width="2" height="2" fill="#00e5ff" opacity="0.7"/>
      <rect x="51" y="75" width="2" height="2" fill="#00e5ff" opacity="0.7"/>
    </svg>`;
}

// ── Number card HTML ────────────────────────────────────────
function getNumberCardHTML(suit, rank) {
    const color = pipColor(suit);
    const symbol = SUIT_SYMBOLS[suit];
    const cornerSvg = cornerPipSVG(suit, color);
    
    // Pip layout by rank
    const layouts = {
        '2': { top: 1, center: 0, bottom: 1 },
        '3': { top: 1, center: 1, bottom: 1 },
        '4': { top: 2, center: 0, bottom: 2 },
        '5': { top: 2, center: 1, bottom: 2 },
        '6': { top: 3, center: 0, bottom: 3 },
        '7': { top: 3, center: 1, bottom: 3 },
        '8': { top: 3, center: 2, bottom: 3 },
        '9': { top: 4, center: 1, bottom: 4 },
        '10': { top: 4, center: 2, bottom: 4 }
    };
    
    const layout = layouts[rank];
    const rows = [];
    
    if (layout) {
        for (let i = 0; i < layout.top; i++) {
            rows.push(`<div class="suit-row"><span class="pip">${symbol}</span></div>`);
        }
        if (layout.center) {
            rows.push(`<div class="suit-row"><span class="pip">${symbol}</span></div>`);
        }
        for (let i = 0; i < layout.bottom; i++) {
            rows.push(`<div class="suit-row"><span class="pip rotated">${symbol}</span></div>`);
        }
    }
    
    const suitRows = rows.join('');
    const count = rank === '10' ? '10' : rank;
    const suitCenterAttr = layout && layout.center ? '' : 'data-rank="' + rank + '"';
    
    return `
        <div class="card-corner top-left">
            <div class="corner-rank">${count}</div>
            <div class="corner-suit">${cornerSvg}</div>
        </div>
        <div class="card-corner bottom-right">
            <div class="corner-rank">${count}</div>
            <div class="corner-suit">${cornerSvg}</div>
        </div>
        <div class="card-suit-center ${layout && !layout.center ? 'single' : ''}" ${suitCenterAttr}>
            ${suitRows}
        </div>`;
}

// ── Ace card HTML ──────────────────────────────────────────
function getAceHTML(suit) {
    const color = pipColor(suit);
    const symbol = SUIT_SYMBOLS[suit];
    const cornerSvg = cornerPipSVG(suit, color);
    
    return `
        <div class="card-corner top-left">
            <div class="corner-rank">A</div>
            <div class="corner-suit">${cornerSvg}</div>
        </div>
        <div class="card-corner bottom-right">
            <div class="corner-rank">A</div>
            <div class="corner-suit">${cornerSvg}</div>
        </div>
        <div class="card-suit-center single">
            <span class="pip-ace">${symbol}</span>
        </div>`;
}

// ── Face card SVG lookup ────────────────────────────────
const FACE_CARD_SVG = {};

function initFaceCard(key, svgFn) {
    FACE_CARD_SVG[key] = svgFn;
}

// Face card art functions (12 cards: J/Q/K × 4 suits)
function faceSpadesJ() { return '<svg viewBox="0 0 64 88" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;"><rect width="64" height="88" fill="#f8f9fa"/><text x="8" y="18" fill="#111" font-family="Arial" font-size="8">J</text><text x="56" y="86" fill="#111" font-family="Arial" font-size="8" transform="rotate(180 56 86)">J</text><text x="24" y="52" fill="#111" font-family="Arial" font-size="36">♠</text></svg>'; }
function faceSpadesQ() { return '<svg viewBox="0 0 64 88" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;"><rect width="64" height="88" fill="#f8f9fa"/><text x="8" y="18" fill="#111" font-family="Arial" font-size="8">Q</text><text x="56" y="86" fill="#111" font-family="Arial" font-size="8" transform="rotate(180 56 86)">Q</text><text x="24" y="52" fill="#111" font-family="Arial" font-size="36">♠</text></svg>'; }
function faceSpadesK() { return '<svg viewBox="0 0 64 88" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;"><rect width="64" height="88" fill="#f8f9fa"/><text x="8" y="18" fill="#111" font-family="Arial" font-size="8">K</text><text x="56" y="86" fill="#111" font-family="Arial" font-size="8" transform="rotate(180 56 86)">K</text><text x="24" y="52" fill="#111" font-family="Arial" font-size="36">♠</text></svg>'; }
function faceHeartsJ() { return '<svg viewBox="0 0 64 88" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;"><rect width="64" height="88" fill="#f8f9fa"/><text x="8" y="18" fill="#cc0000" font-family="Arial" font-size="8">J</text><text x="56" y="86" fill="#cc0000" font-family="Arial" font-size="8" transform="rotate(180 56 86)">J</text><text x="24" y="52" fill="#cc0000" font-family="Arial" font-size="36">♥</text></svg>'; }
function faceHeartsQ() { return '<svg viewBox="0 0 64 88" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;"><rect width="64" height="88" fill="#f8f9fa"/><text x="8" y="18" fill="#cc0000" font-family="Arial" font-size="8">Q</text><text x="56" y="86" fill="#cc0000" font-family="Arial" font-size="8" transform="rotate(180 56 86)">Q</text><text x="24" y="52" fill="#cc0000" font-family="Arial" font-size="36">♥</text></svg>'; }
function faceHeartsK() { return '<svg viewBox="0 0 64 88" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;"><rect width="64" height="88" fill="#f8f9fa"/><text x="8" y="18" fill="#cc0000" font-family="Arial" font-size="8">K</text><text x="56" y="86" fill="#cc0000" font-family="Arial" font-size="8" transform="rotate(180 56 86)">K</text><text x="24" y="52" fill="#cc0000" font-family="Arial" font-size="36">♥</text></svg>'; }
function faceDiamondsJ() { return '<svg viewBox="0 0 64 88" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;"><rect width="64" height="88" fill="#f8f9fa"/><text x="8" y="18" fill="#cc0000" font-family="Arial" font-size="8">J</text><text x="56" y="86" fill="#cc0000" font-family="Arial" font-size="8" transform="rotate(180 56 86)">J</text><text x="24" y="52" fill="#cc0000" font-family="Arial" font-size="36">♦</text></svg>'; }
function faceDiamondsQ() { return '<svg viewBox="0 0 64 88" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;"><rect width="64" height="88" fill="#f8f9fa"/><text x="8" y="18" fill="#cc0000" font-family="Arial" font-size="8">Q</text><text x="56" y="86" fill="#cc0000" font-family="Arial" font-size="8" transform="rotate(180 56 86)">Q</text><text x="24" y="52" fill="#cc0000" font-family="Arial" font-size="36">♦</text></svg>'; }
function faceDiamondsK() { return '<svg viewBox="0 0 64 88" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;"><rect width="64" height="88" fill="#f8f9fa"/><text x="8" y="18" fill="#cc0000" font-family="Arial" font-size="8">K</text><text x="56" y="86" fill="#cc0000" font-family="Arial" font-size="8" transform="rotate(180 56 86)">K</text><text x="24" y="52" fill="#cc0000" font-family="Arial" font-size="36">♦</text></svg>'; }
function faceClubsJ() { return '<svg viewBox="0 0 64 88" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;"><rect width="64" height="88" fill="#f8f9fa"/><text x="8" y="18" fill="#111" font-family="Arial" font-size="8">J</text><text x="56" y="86" fill="#111" font-family="Arial" font-size="8" transform="rotate(180 56 86)">J</text><text x="24" y="52" fill="#111" font-family="Arial" font-size="36">♣</text></svg>'; }
function faceClubsQ() { return '<svg viewBox="0 0 64 88" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;"><rect width="64" height="88" fill="#f8f9fa"/><text x="8" y="18" fill="#111" font-family="Arial" font-size="8">Q</text><text x="56" y="86" fill="#111" font-family="Arial" font-size="8" transform="rotate(180 56 86)">Q</text><text x="24" y="52" fill="#111" font-family="Arial" font-size="36">♣</text></svg>'; }
function faceClubsK() { return '<svg viewBox="0 0 64 88" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;"><rect width="64" height="88" fill="#f8f9fa"/><text x="8" y="18" fill="#111" font-family="Arial" font-size="8">K</text><text x="56" y="86" fill="#111" font-family="Arial" font-size="8" transform="rotate(180 56 86)">K</text><text x="24" y="52" fill="#111" font-family="Arial" font-size="36">♣</text></svg>'; }

// Initialize face cards
initFaceCard('j-spades', faceSpadesJ);
initFaceCard('q-spades', faceSpadesQ);
initFaceCard('k-spades', faceSpadesK);
initFaceCard('j-hearts', faceHeartsJ);
initFaceCard('q-hearts', faceHeartsQ);
initFaceCard('k-hearts', faceHeartsK);
initFaceCard('j-diamonds', faceDiamondsJ);
initFaceCard('q-diamonds', faceDiamondsQ);
initFaceCard('k-diamonds', faceDiamondsK);
initFaceCard('j-clubs', faceClubsJ);
initFaceCard('q-clubs', faceClubsQ);
initFaceCard('k-clubs', faceClubsK);

// ── Card class ────────────────────────────────────────
class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
        this.faceUp = false;
        this.color = SUIT_COLORS[suit];
        this.value = RANK_VALUES[rank];
    }

    flip() {
        this.faceUp = !this.faceUp;
    }

    getHTML() {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.suit = this.suit;
        card.dataset.rank = this.rank;

        if (this.faceUp) {
            card.classList.add('face-up', this.color);

            if (this.rank === 'J' || this.rank === 'Q' || this.rank === 'K') {
                const key = `${this.rank.toLowerCase()}-${this.suit}`;
                const svgFn = FACE_CARD_SVG[key];
                if (svgFn) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'face-card-svg-wrapper';
                    wrapper.innerHTML = svgFn();
                    card.appendChild(wrapper);
                } else {
                    card.innerHTML = this._fallbackFaceHTML();
                }
            } else if (this.rank === 'A') {
                card.innerHTML = getAceHTML(this.suit);
            } else {
                card.innerHTML = getNumberCardHTML(this.suit, this.rank);
            }
        } else {
            card.classList.add('face-down');
            card.innerHTML = getCardBackSVG();
        }

        return card;
    }

    _fallbackFaceHTML() {
        const symbol = SUIT_SYMBOLS[this.suit];
        return `
            <div class="card-corner top-left">
                <div class="corner-rank">${this.rank}</div>
                <div class="corner-suit">${symbol}</div>
            </div>
            <div class="card-suit-center single">
                <div class="suit-symbol">${symbol}</div>
            </div>
            <div class="card-corner bottom-right">
                <div class="corner-rank">${this.rank}</div>
                <div class="corner-suit">${symbol}</div>
            </div>`;
    }
}

// ── Deck class ──────────────────────────────────────────
class Deck {
    constructor() {
        this.cards = [];
        this.createDeck();
    }

    createDeck() {
        this.cards = [];
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                this.cards.push(new Card(suit, rank));
            }
        }
    }

shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal() {
        return this.cards.pop();
    }
}