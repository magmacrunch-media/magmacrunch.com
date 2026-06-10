// card-renderer.js — MagmaCrunch Cards First Edition
// Shared card rendering for all arcade games
// © 2026 MagmaCrunch Media — All Rights Reserved

// ═════════════════════════════════════════════════════════════════════════════
// CARD RENDERER — First Edition
// Pixel-art SVG playing cards for Klondike Solitaire, Texas Hold'Em Lava Dome, etc.
// ═════════════════════════════════════════════════════════════════════════════

const MagmaCards = {
    version: '1.0.0',
    edition: 'First Edition',

    // ─────────────────────────────────────────────────────────────────────
    // Configuration
    // ─────────────────────────────────────────────────────────────────────
    config: {
        // Card dimensions
        width: 100,
        height: 140,
        
        // Corner label settings
        cornerRankSize: 10,
        cornerSuitSize: 8,
        
        // Font settings
        fontFamily: 'Arial, sans-serif',
        
        // Suit colors (can be overridden by CSS variables)
        redColor: '#cc0000',
        blackColor: '#111111'
    },

    // ═════════════════════════════════════════════════════════════════════════
    // SUIT HELPERS
    // ═════════════════════════════════════════════════════════════════════════
    
    SUITS: ['hearts', 'diamonds', 'clubs', 'spades'],
    RANKS: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'],
    
    getSuitSymbol(suit) {
        const symbols = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
        return symbols[suit] || '';
    },
    
    getColor(suit) {
        return (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
    },
    
    isRed(suit) {
        return suit === 'hearts' || suit === 'diamonds';
    },

    // ═════════════════════════════════════════════════════════════════════════
    // PIXEL-ART CORNER PIPS (for number cards)
    // ═════════════════════════════════════════════════════════════════════════
    
    getCornerPipSVG(suit, color) {
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
    },

    // ═════════════════════════════════════════════════════════════════════════
    // CARD BACK DESIGN
    // ═════════════════════════════════════════════════════════════════════════
    
    getCardBackSVG() {
        return `<svg width="100%" height="100%" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" style="display:block;">
            <rect width="100" height="140" fill="var(--card-back-bg, #1a4a4a)"/>
            <rect x="4" y="4" width="92" height="132" fill="none" stroke="var(--card-back-border, #2a6a6a)" stroke-width="2"/>
            <g fill="var(--card-back-pattern, #2a6a6a)">
                ${this.getCardBackPattern()}
            </g>
            <rect x="8" y="8" width="84" height="124" fill="none" stroke="var(--card-back-border, #2a6a6a)" stroke-width="1"/>
        </svg>`;
    },
    
    getCardBackPattern() {
        let pattern = '';
        for (let row = 0; row < 7; row++) {
            for (let col = 0; col < 10; col++) {
                if ((row + col) % 2 === 0) {
                    pattern += `<rect x="${10 + col * 8}" y="${10 + row * 18}" width="6" height="6"/>`;
                }
            }
        }
        return pattern;
    },

    // ═════════════════════════════════════════════════════════════════════════
    // CARD CORNER HTML
    // ═════════════════════════════════════════════════════════════════════════
    
    getCornerHTML(rank, suit, position) {
        const color = this.isRed(suit) ? 'var(--card-red, #cc0000)' : 'var(--card-black, #111111)';
        const symbol = this.getSuitSymbol(suit);
        
        return `
            <div class="card-corner card-corner-${position}">
                <div class="corner-rank" style="color:${color}">${rank}</div>
                <div class="corner-suit" style="color:${color}">${symbol}</div>
            </div>
        `;
    },

    // ═════════════════════════════════════════════════════════════════════════
    // NUMBER CARD (A-10) — pip layout
    // ═════════════════════════════════════════════════════════════════════════
    
    getNumberCardHTML(rank, suit) {
        const color = this.isRed(suit) ? 'var(--card-red, #cc0000)' : 'var(--card-black, #111111)';
        const symbol = this.getSuitSymbol(suit);
        
        const corners = this.getCornerHTML(rank, suit, 'top-left') + 
                       this.getCornerHTML(rank, suit, 'bottom-right');
        
        const pips = this.getPipsHTML(rank, suit, color);
        
        return `
            <div class="card card-${suit} ${this.isRed(suit) ? 'red' : 'black'}">
                ${corners}
                <div class="card-pips">${pips}</div>
            </div>
        `;
    },
    
    getPipsHTML(rank, suit, color) {
        const symbol = this.getSuitSymbol(suit);
        
        // Traditional pip layouts matching standard playing cards
        const layouts = {
            'A': `<div class="pip-container"><div class="pip-row single"><span class="pip" style="color:${color}">${symbol}</span></div></div>`,
            '2': `<div class="pip-container">
                <div class="pip-row"><span class="pip" style="color:${color}">${symbol}</span></div>
                <div class="pip-row"><span class="pip rotated" style="color:${color}">${symbol}</span></div>
            </div>`,
            '3': `<div class="pip-container">
                <div class="pip-row"><span class="pip" style="color:${color}">${symbol}</span></div>
                <div class="pip-row"><span class="pip" style="color:${color}">${symbol}</span></div>
                <div class="pip-row"><span class="pip rotated" style="color:${color}">${symbol}</span></div>
            </div>`,
            '4': `<div class="pip-container">
                <div class="pip-row"><span class="pip" style="color:${color}">${symbol}</span><span class="pip" style="color:${color}">${symbol}</span></div>
                <div class="pip-row"><span class="pip rotated" style="color:${color}">${symbol}</span><span class="pip rotated" style="color:${color}">${symbol}</span></div>
            </div>`,
            '5': `<div class="pip-container">
                <div class="pip-row"><span class="pip" style="color:${color}">${symbol}</span><span class="pip" style="color:${color}">${symbol}</span></div>
                <div class="pip-row"><span class="pip" style="color:${color}">${symbol}</span></div>
                <div class="pip-row"><span class="pip rotated" style="color:${color}">${symbol}</span><span class="pip rotated" style="color:${color}">${symbol}</span></div>
            </div>`,
            '6': `<div class="pip-container">
                <div class="pip-row"><span class="pip" style="color:${color}">${symbol}</span><span class="pip" style="color:${color}">${symbol}</span></div>
                <div class="pip-row"><span class="pip" style="color:${color}">${symbol}</span><span class="pip" style="color:${color}">${symbol}</span></div>
                <div class="pip-row"><span class="pip rotated" style="color:${color}">${symbol}</span><span class="pip rotated" style="color:${color}">${symbol}</span></div>
            </div>`,
            '7': `<div class="pip-container">
                <div class="pip-row"><span class="pip" style="color:${color}">${symbol}</span><span class="pip" style="color:${color}">${symbol}</span></div>
                <div class="pip-row"><span class="pip" style="color:${color}">${symbol}</span></div>
                <div class="pip-row"><span class="pip" style="color:${color}">${symbol}</span><span class="pip" style="color:${color}">${symbol}</span></div>
                <div class="pip-row"><span class="pip rotated" style="color:${color}">${symbol}</span><span class="pip rotated" style="color:${color}">${symbol}</span></div>
            </div>`,
            '8': `<div class="pip-container">
                <div class="pip-row"><span class="pip" style="color:${color}">${symbol}</span><span class="pip" style="color:${color}">${symbol}</span></div>
                <div class="pip-row"><span class="pip" style="color:${color}">${symbol}</span></div>
                <div class="pip-row"><span class="pip" style="color:${color}">${symbol}</span><span class="pip" style="color:${color}">${symbol}</span></div>
                <div class="pip-row"><span class="pip rotated" style="color:${color}">${symbol}</span></div>
                <div class="pip-row"><span class="pip rotated" style="color:${color}">${symbol}</span><span class="pip rotated" style="color:${color}">${symbol}</span></div>
            </div>`,
            '9': `<div class="pip-container">
                <div class="pip-row"><span class="pip" style="color:${color}">${symbol}</span><span class="pip" style="color:${color}">${symbol}</span></div>
                <div class="pip-row"><span class="pip" style="color:${color}">${symbol}</span><span class="pip" style="color:${color}">${symbol}</span></div>
                <div class="pip-row"><span class="pip" style="color:${color}">${symbol}</span></div>
                <div class="pip-row"><span class="pip rotated" style="color:${color}">${symbol}</span><span class="pip rotated" style="color:${color}">${symbol}</span></div>
                <div class="pip-row"><span class="pip rotated" style="color:${color}">${symbol}</span><span class="pip rotated" style="color:${color}">${symbol}</span></div>
            </div>`,
            '10': `<div class="pip-container">
                <div class="pip-row"><span class="pip" style="color:${color}">${symbol}</span><span class="pip" style="color:${color}">${symbol}</span></div>
                <div class="pip-row"><span class="pip" style="color:${color}">${symbol}</span><span class="pip" style="color:${color}">${symbol}</span></div>
                <div class="pip-row"><span class="pip" style="color:${color}">${symbol}</span><span class="pip" style="color:${color}">${symbol}</span></div>
                <div class="pip-row"><span class="pip rotated" style="color:${color}">${symbol}</span><span class="pip rotated" style="color:${color}">${symbol}</span></div>
                <div class="pip-row"><span class="pip rotated" style="color:${color}">${symbol}</span><span class="pip rotated" style="color:${color}">${symbol}</span></div>
            </div>`
        };
        
        return layouts[rank] || '';
    },

    // ═════════════════════════════════════════════════════════════════════════
    // FACE CARDS (J, Q, K)
    // ═════════════════════════════════════════════════════════════════════════
    
    getFaceCardHTML(rank, suit) {
        const color = this.isRed(suit) ? 'var(--card-red, #cc0000)' : 'var(--card-black, #111111)';
        
        const corners = this.getCornerHTML(rank, suit, 'top-left') + 
                       this.getCornerHTML(rank, suit, 'bottom-right');
        
        const faceSVG = this.getFaceCardSVG(rank, suit);
        
        return `
            <div class="card card-${suit} ${this.isRed(suit) ? 'red' : 'black'}">
                ${corners}
                <div class="card-face">
                    ${faceSVG}
                </div>
            </div>
        `;
    },
    
    getFaceCardSVG(rank, suit) {
        // Face card SVGs stored in FACE_CARDS object
        const key = `${rank.toLowerCase()}-${suit}`;
        return FACE_CARDS[key] ? FACE_CARDS[key]() : this.getGenericFaceSVG(rank, suit);
    },
    
    getGenericFaceSVG(rank, suit) {
        const color = this.isRed(suit) ? 'var(--card-red, #cc0000)' : 'var(--card-black, #111111)';
        const symbol = this.getSuitSymbol(suit);
        return `<svg width="100%" height="100%" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="140" fill="var(--card-face-bg, #f8f9fa)"/>
            <text x="50" y="80" text-anchor="middle" fill="${color}" font-size="48">${rank}</text>
            <text x="50" y="110" text-anchor="middle" fill="${color}" font-size="24">${symbol}</text>
        </svg>`;
    },

    // ═════════════════════════════════════════════════════════════════════════
    // MAIN RENDER METHOD
    // ═════════════════════════════════════════════════════════════════════════
    
    render(rank, suit, options = {}) {
        // Validate
        if (!this.RANKS.includes(rank)) return `<div class="card card-invalid">Invalid</div>`;
        if (!this.SUITS.includes(suit)) return `<div class="card card-invalid">Invalid</div>`;
        
        // Face cards
        if (rank === 'J' || rank === 'Q' || rank === 'K') {
            return this.getFaceCardHTML(rank, suit);
        }
        
        // Number cards
        return this.getNumberCardHTML(rank, suit);
    },
    
    renderBack() {
        return `<div class="card card-back">
            <div class="card-back-inner">
                ${this.getCardBackSVG()}
            </div>
        </div>`;
    },
    
    // ═════════════════════════════════════════════════════════════════════════
    // DECK GENERATION
    // ═════════════════════════════════════════════════════════════════════════
    
    createDeck() {
        const deck = [];
        for (const suit of this.SUITS) {
            for (const rank of this.RANKS) {
                deck.push({ rank, suit });
            }
        }
        return deck;
    },
    
    shuffleDeck(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }
};

// ═════════════════════════════════════════════════════════════════════════════
// FACE CARD SVG DEFINITIONS
// Pixel-art Jack, Queen, King for all 4 suits
// ═════════════════════════════════════════════════════════════════════════════

const FACE_CARDS = {
    // ═══════════════════════════════════════════════════════════════════════
    // JACKS
    // ═══════════════════════════════════════════════════════════════════════
    
    'j-clubs': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="140" fill="var(--fc-art-bg, #f8f9fa)"/>
            <g>
                <!-- Jack figure -->
                <rect x="30" y="20" width="40" height="6" fill="var(--fc-gold, #d4a017)"/>
                <rect x="32" y="26" width="36" height="4" fill="var(--fc-black, #111)"/>
                <rect x="28" y="30" width="44" height="30" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="34" y="32" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="62" y="32" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="38" width="28" height="20" fill="var(--fc-blue, #1a4a7a)"/>
                <rect x="40" y="60" width="20" height="8" fill="var(--fc-red, #cc0000)"/>
                <rect x="26" y="60" width="10" height="30" fill="var(--fc-gold, #d4a017)"/>
                <rect x="64" y="60" width="10" height="30" fill="var(--fc-gold, #d4a017)"/>
                <rect x="36" y="90" width="28" height="20" fill="var(--fc-blue, #1a4a7a)"/>
            </g>
            <g transform="rotate(180 50 70)">
                <rect x="30" y="20" width="40" height="6" fill="var(--fc-gold, #d4a017)"/>
                <rect x="32" y="26" width="36" height="4" fill="var(--fc-black, #111)"/>
                <rect x="28" y="30" width="44" height="30" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="34" y="32" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="62" y="32" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="38" width="28" height="20" fill="var(--fc-blue, #1a4a7a)"/>
                <rect x="40" y="60" width="20" height="8" fill="var(--fc-red, #cc0000)"/>
                <rect x="26" y="60" width="10" height="30" fill="var(--fc-gold, #d4a017)"/>
                <rect x="64" y="60" width="10" height="30" fill="var(--fc-gold, #d4a017)"/>
                <rect x="36" y="90" width="28" height="20" fill="var(--fc-blue, #1a4a7a)"/>
            </g>
        </svg>
    `,
    
    'j-diamonds': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="140" fill="var(--fc-art-bg, #f8f9fa)"/>
            <g>
                <rect x="30" y="20" width="40" height="6" fill="var(--fc-gold, #d4a017)"/>
                <rect x="32" y="26" width="36" height="4" fill="var(--fc-black, #111)"/>
                <rect x="28" y="30" width="44" height="30" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="34" y="32" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="62" y="32" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="38" width="28" height="20" fill="var(--fc-red, #cc0000)"/>
                <rect x="40" y="60" width="20" height="8" fill="var(--fc-red, #cc0000)"/>
                <rect x="26" y="60" width="10" height="30" fill="var(--fc-gold, #d4a017)"/>
                <rect x="64" y="60" width="10" height="30" fill="var(--fc-gold, #d4a017)"/>
                <rect x="36" y="90" width="28" height="20" fill="var(--fc-red, #cc0000)"/>
            </g>
            <g transform="rotate(180 50 70)">
                <rect x="30" y="20" width="40" height="6" fill="var(--fc-gold, #d4a017)"/>
                <rect x="32" y="26" width="36" height="4" fill="var(--fc-black, #111)"/>
                <rect x="28" y="30" width="44" height="30" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="34" y="32" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="62" y="32" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="38" width="28" height="20" fill="var(--fc-red, #cc0000)"/>
                <rect x="40" y="60" width="20" height="8" fill="var(--fc-red, #cc0000)"/>
                <rect x="26" y="60" width="10" height="30" fill="var(--fc-gold, #d4a017)"/>
                <rect x="64" y="60" width="10" height="30" fill="var(--fc-gold, #d4a017)"/>
                <rect x="36" y="90" width="28" height="20" fill="var(--fc-red, #cc0000)"/>
            </g>
        </svg>
    `,
    
    'j-hearts': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="140" fill="var(--fc-art-bg, #f8f9fa)"/>
            <g>
                <rect x="30" y="20" width="40" height="6" fill="var(--fc-gold, #d4a017)"/>
                <rect x="32" y="26" width="36" height="4" fill="var(--fc-black, #111)"/>
                <rect x="28" y="30" width="44" height="30" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="34" y="32" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="62" y="32" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="38" width="28" height="20" fill="var(--fc-red, #cc0000)"/>
                <rect x="40" y="60" width="20" height="8" fill="var(--fc-blue, #1a4a7a)"/>
                <rect x="26" y="60" width="10" height="30" fill="var(--fc-gold, #d4a017)"/>
                <rect x="64" y="60" width="10" height="30" fill="var(--fc-gold, #d4a017)"/>
                <rect x="36" y="90" width="28" height="20" fill="var(--fc-red, #cc0000)"/>
            </g>
            <g transform="rotate(180 50 70)">
                <rect x="30" y="20" width="40" height="6" fill="var(--fc-gold, #d4a017)"/>
                <rect x="32" y="26" width="36" height="4" fill="var(--fc-black, #111)"/>
                <rect x="28" y="30" width="44" height="30" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="34" y="32" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="62" y="32" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="38" width="28" height="20" fill="var(--fc-red, #cc0000)"/>
                <rect x="40" y="60" width="20" height="8" fill="var(--fc-blue, #1a4a7a)"/>
                <rect x="26" y="60" width="10" height="30" fill="var(--fc-gold, #d4a017)"/>
                <rect x="64" y="60" width="10" height="30" fill="var(--fc-gold, #d4a017)"/>
                <rect x="36" y="90" width="28" height="20" fill="var(--fc-red, #cc0000)"/>
            </g>
        </svg>
    `,
    
    'j-spades': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="140" fill="var(--fc-art-bg, #f8f9fa)"/>
            <g>
                <rect x="30" y="20" width="40" height="6" fill="var(--fc-gold, #d4a017)"/>
                <rect x="32" y="26" width="36" height="4" fill="var(--fc-black, #111)"/>
                <rect x="28" y="30" width="44" height="30" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="34" y="32" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="62" y="32" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="38" width="28" height="20" fill="var(--fc-black, #111)"/>
                <rect x="40" y="60" width="20" height="8" fill="var(--fc-red, #cc0000)"/>
                <rect x="26" y="60" width="10" height="30" fill="var(--fc-gold, #d4a017)"/>
                <rect x="64" y="60" width="10" height="30" fill="var(--fc-gold, #d4a017)"/>
                <rect x="36" y="90" width="28" height="20" fill="var(--fc-black, #111)"/>
            </g>
            <g transform="rotate(180 50 70)">
                <rect x="30" y="20" width="40" height="6" fill="var(--fc-gold, #d4a017)"/>
                <rect x="32" y="26" width="36" height="4" fill="var(--fc-black, #111)"/>
                <rect x="28" y="30" width="44" height="30" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="34" y="32" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="62" y="32" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="38" width="28" height="20" fill="var(--fc-black, #111)"/>
                <rect x="40" y="60" width="20" height="8" fill="var(--fc-red, #cc0000)"/>
                <rect x="26" y="60" width="10" height="30" fill="var(--fc-gold, #d4a017)"/>
                <rect x="64" y="60" width="10" height="30" fill="var(--fc-gold, #d4a017)"/>
                <rect x="36" y="90" width="28" height="20" fill="var(--fc-black, #111)"/>
            </g>
        </svg>
    `,
    
    // ═══════════════════════════════════════════════════════════════════════
    // QUEENS
    // ═══════════════════════════════════════════════════════════════════════
    
    'q-clubs': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="140" fill="var(--fc-art-bg, #f8f9fa)"/>
            <g>
                <!-- Crown -->
                <rect x="30" y="14" width="40" height="6" fill="var(--fc-gold, #d4a017)"/>
                <rect x="32" y="8" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="60" y="8" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="44" y="6" width="12" height="10" fill="var(--fc-gold, #d4a017)"/>
                <!-- Face -->
                <rect x="28" y="24" width="44" height="32" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="34" y="28" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="62" y="28" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="34" width="28" height="18" fill="var(--fc-purple, #6a1b9a)"/>
                <rect x="42" y="54" width="16" height="8" fill="var(--fc-skin, #e8b89d)"/>
                <!-- Dress -->
                <rect x="26" y="56" width="48" height="40" fill="var(--fc-purple, #6a1b9a)"/>
                <rect x="30" y="60" width="40" height="4" fill="var(--fc-gold, #d4a017)"/>
                <rect x="36" y="68" width="28" height="24" fill="var(--fc-red, #cc0000)"/>
            </g>
            <g transform="rotate(180 50 70)">
                <rect x="30" y="14" width="40" height="6" fill="var(--fc-gold, #d4a017)"/>
                <rect x="32" y="8" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="60" y="8" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="44" y="6" width="12" height="10" fill="var(--fc-gold, #d4a017)"/>
                <rect x="28" y="24" width="44" height="32" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="34" y="28" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="62" y="28" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="34" width="28" height="18" fill="var(--fc-purple, #6a1b9a)"/>
                <rect x="42" y="54" width="16" height="8" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="26" y="56" width="48" height="40" fill="var(--fc-purple, #6a1b9a)"/>
                <rect x="30" y="60" width="40" height="4" fill="var(--fc-gold, #d4a017)"/>
                <rect x="36" y="68" width="28" height="24" fill="var(--fc-red, #cc0000)"/>
            </g>
        </svg>
    `,
    
    'q-diamonds': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="140" fill="var(--fc-art-bg, #f8f9fa)"/>
            <g>
                <rect x="30" y="14" width="40" height="6" fill="var(--fc-gold, #d4a017)"/>
                <rect x="32" y="8" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="60" y="8" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="44" y="6" width="12" height="10" fill="var(--fc-gold, #d4a017)"/>
                <rect x="28" y="24" width="44" height="32" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="34" y="28" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="62" y="28" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="34" width="28" height="18" fill="var(--fc-red, #cc0000)"/>
                <rect x="42" y="54" width="16" height="8" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="26" y="56" width="48" height="40" fill="var(--fc-red, #cc0000)"/>
                <rect x="30" y="60" width="40" height="4" fill="var(--fc-gold, #d4a017)"/>
                <rect x="36" y="68" width="28" height="24" fill="var(--fc-purple, #6a1b9a)"/>
            </g>
            <g transform="rotate(180 50 70)">
                <rect x="30" y="14" width="40" height="6" fill="var(--fc-gold, #d4a017)"/>
                <rect x="32" y="8" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="60" y="8" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="44" y="6" width="12" height="10" fill="var(--fc-gold, #d4a017)"/>
                <rect x="28" y="24" width="44" height="32" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="34" y="28" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="62" y="28" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="34" width="28" height="18" fill="var(--fc-red, #cc0000)"/>
                <rect x="42" y="54" width="16" height="8" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="26" y="56" width="48" height="40" fill="var(--fc-red, #cc0000)"/>
                <rect x="30" y="60" width="40" height="4" fill="var(--fc-gold, #d4a017)"/>
                <rect x="36" y="68" width="28" height="24" fill="var(--fc-purple, #6a1b9a)"/>
            </g>
        </svg>
    `,
    
    'q-hearts': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="140" fill="var(--fc-art-bg, #f8f9fa)"/>
            <g>
                <rect x="30" y="14" width="40" height="6" fill="var(--fc-gold, #d4a017)"/>
                <rect x="32" y="8" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="60" y="8" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="44" y="6" width="12" height="10" fill="var(--fc-gold, #d4a017)"/>
                <rect x="28" y="24" width="44" height="32" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="34" y="28" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="62" y="28" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="34" width="28" height="18" fill="var(--fc-red, #cc0000)"/>
                <rect x="42" y="54" width="16" height="8" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="26" y="56" width="48" height="40" fill="var(--fc-red, #cc0000)"/>
                <rect x="30" y="60" width="40" height="4" fill="var(--fc-gold, #d4a017)"/>
                <rect x="36" y="68" width="28" height="24" fill="var(--fc-black, #111)"/>
            </g>
            <g transform="rotate(180 50 70)">
                <rect x="30" y="14" width="40" height="6" fill="var(--fc-gold, #d4a017)"/>
                <rect x="32" y="8" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="60" y="8" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="44" y="6" width="12" height="10" fill="var(--fc-gold, #d4a017)"/>
                <rect x="28" y="24" width="44" height="32" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="34" y="28" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="62" y="28" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="34" width="28" height="18" fill="var(--fc-red, #cc0000)"/>
                <rect x="42" y="54" width="16" height="8" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="26" y="56" width="48" height="40" fill="var(--fc-red, #cc0000)"/>
                <rect x="30" y="60" width="40" height="4" fill="var(--fc-gold, #d4a017)"/>
                <rect x="36" y="68" width="28" height="24" fill="var(--fc-black, #111)"/>
            </g>
        </svg>
    `,
    
    'q-spades': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="140" fill="var(--fc-art-bg, #f8f9fa)"/>
            <g>
                <rect x="30" y="14" width="40" height="6" fill="var(--fc-gold, #d4a017)"/>
                <rect x="32" y="8" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="60" y="8" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="44" y="6" width="12" height="10" fill="var(--fc-gold, #d4a017)"/>
                <rect x="28" y="24" width="44" height="32" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="34" y="28" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="62" y="28" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="34" width="28" height="18" fill="var(--fc-black, #111)"/>
                <rect x="42" y="54" width="16" height="8" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="26" y="56" width="48" height="40" fill="var(--fc-black, #111)"/>
                <rect x="30" y="60" width="40" height="4" fill="var(--fc-gold, #d4a017)"/>
                <rect x="36" y="68" width="28" height="24" fill="var(--fc-purple, #6a1b9a)"/>
            </g>
            <g transform="rotate(180 50 70)">
                <rect x="30" y="14" width="40" height="6" fill="var(--fc-gold, #d4a017)"/>
                <rect x="32" y="8" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="60" y="8" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="44" y="6" width="12" height="10" fill="var(--fc-gold, #d4a017)"/>
                <rect x="28" y="24" width="44" height="32" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="34" y="28" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="62" y="28" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="34" width="28" height="18" fill="var(--fc-black, #111)"/>
                <rect x="42" y="54" width="16" height="8" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="26" y="56" width="48" height="40" fill="var(--fc-black, #111)"/>
                <rect x="30" y="60" width="40" height="4" fill="var(--fc-gold, #d4a017)"/>
                <rect x="36" y="68" width="28" height="24" fill="var(--fc-purple, #6a1b9a)"/>
            </g>
        </svg>
    `,
    
    // ═══════════════════════════════════════════════════════════════════════
    // KINGS
    // ═══════════════════════════════════════════════════════════════════════
    
    'k-clubs': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="140" fill="var(--fc-art-bg, #f8f9fa)"/>
            <g>
                <!-- Crown -->
                <rect x="26" y="10" width="48" height="6" fill="var(--fc-gold, #d4a017)"/>
                <rect x="28" y="4" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="64" y="4" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="44" y="2" width="12" height="10" fill="var(--fc-gold, #d4a017)"/>
                <!-- Face -->
                <rect x="28" y="20" width="44" height="34" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="34" y="24" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="62" y="24" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="30" width="28" height="20" fill="var(--fc-red, #cc0000)"/>
                <!-- Robe -->
                <rect x="26" y="54" width="48" height="50" fill="var(--fc-red, #cc0000)"/>
                <rect x="30" y="58" width="40" height="4" fill="var(--fc-gold, #d4a017)"/>
                <rect x="36" y="66" width="28" height="34" fill="var(--fc-black, #111)"/>
            </g>
            <g transform="rotate(180 50 70)">
                <rect x="26" y="10" width="48" height="6" fill="var(--fc-gold, #d4a017)"/>
                <rect x="28" y="4" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="64" y="4" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="44" y="2" width="12" height="10" fill="var(--fc-gold, #d4a017)"/>
                <rect x="28" y="20" width="44" height="34" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="34" y="24" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="62" y="24" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="30" width="28" height="20" fill="var(--fc-red, #cc0000)"/>
                <rect x="26" y="54" width="48" height="50" fill="var(--fc-red, #cc0000)"/>
                <rect x="30" y="58" width="40" height="4" fill="var(--fc-gold, #d4a017)"/>
                <rect x="36" y="66" width="28" height="34" fill="var(--fc-black, #111)"/>
            </g>
        </svg>
    `,
    
    'k-diamonds': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="140" fill="var(--fc-art-bg, #f8f9fa)"/>
            <g>
                <rect x="26" y="10" width="48" height="6" fill="var(--fc-gold, #d4a017)"/>
                <rect x="28" y="4" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="64" y="4" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="44" y="2" width="12" height="10" fill="var(--fc-gold, #d4a017)"/>
                <rect x="28" y="20" width="44" height="34" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="34" y="24" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="62" y="24" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="30" width="28" height="20" fill="var(--fc-red, #cc0000)"/>
                <rect x="26" y="54" width="48" height="50" fill="var(--fc-gold, #d4a017)"/>
                <rect x="30" y="58" width="40" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="66" width="28" height="34" fill="var(--fc-red, #cc0000)"/>
            </g>
            <g transform="rotate(180 50 70)">
                <rect x="26" y="10" width="48" height="6" fill="var(--fc-gold, #d4a017)"/>
                <rect x="28" y="4" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="64" y="4" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="44" y="2" width="12" height="10" fill="var(--fc-gold, #d4a017)"/>
                <rect x="28" y="20" width="44" height="34" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="34" y="24" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="62" y="24" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="30" width="28" height="20" fill="var(--fc-red, #cc0000)"/>
                <rect x="26" y="54" width="48" height="50" fill="var(--fc-gold, #d4a017)"/>
                <rect x="30" y="58" width="40" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="66" width="28" height="34" fill="var(--fc-red, #cc0000)"/>
            </g>
        </svg>
    `,
    
    'k-hearts': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="140" fill="var(--fc-art-bg, #f8f9fa)"/>
            <g>
                <rect x="26" y="10" width="48" height="6" fill="var(--fc-gold, #d4a017)"/>
                <rect x="28" y="4" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="64" y="4" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="44" y="2" width="12" height="10" fill="var(--fc-gold, #d4a017)"/>
                <rect x="28" y="20" width="44" height="34" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="34" y="24" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="62" y="24" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="30" width="28" height="20" fill="var(--fc-red, #cc0000)"/>
                <rect x="26" y="54" width="48" height="50" fill="var(--fc-red, #cc0000)"/>
                <rect x="30" y="58" width="40" height="4" fill="var(--fc-gold, #d4a017)"/>
                <rect x="36" y="66" width="28" height="34" fill="var(--fc-black, #111)"/>
            </g>
            <g transform="rotate(180 50 70)">
                <rect x="26" y="10" width="48" height="6" fill="var(--fc-gold, #d4a017)"/>
                <rect x="28" y="4" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="64" y="4" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="44" y="2" width="12" height="10" fill="var(--fc-gold, #d4a017)"/>
                <rect x="28" y="20" width="44" height="34" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="34" y="24" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="62" y="24" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="30" width="28" height="20" fill="var(--fc-red, #cc0000)"/>
                <rect x="26" y="54" width="48" height="50" fill="var(--fc-red, #cc0000)"/>
                <rect x="30" y="58" width="40" height="4" fill="var(--fc-gold, #d4a017)"/>
                <rect x="36" y="66" width="28" height="34" fill="var(--fc-black, #111)"/>
            </g>
        </svg>
    `,
    
    'k-spades': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="140" fill="var(--fc-art-bg, #f8f9fa)"/>
            <g>
                <rect x="26" y="10" width="48" height="6" fill="var(--fc-gold, #d4a017)"/>
                <rect x="28" y="4" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="64" y="4" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="44" y="2" width="12" height="10" fill="var(--fc-gold, #d4a017)"/>
                <rect x="28" y="20" width="44" height="34" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="34" y="24" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="62" y="24" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="30" width="28" height="20" fill="var(--fc-black, #111)"/>
                <rect x="26" y="54" width="48" height="50" fill="var(--fc-black, #111)"/>
                <rect x="30" y="58" width="40" height="4" fill="var(--fc-gold, #d4a017)"/>
                <rect x="36" y="66" width="28" height="34" fill="var(--fc-red, #cc0000)"/>
            </g>
            <g transform="rotate(180 50 70)">
                <rect x="26" y="10" width="48" height="6" fill="var(--fc-gold, #d4a017)"/>
                <rect x="28" y="4" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="64" y="4" width="8" height="8" fill="var(--fc-gold, #d4a017)"/>
                <rect x="44" y="2" width="12" height="10" fill="var(--fc-gold, #d4a017)"/>
                <rect x="28" y="20" width="44" height="34" fill="var(--fc-skin, #e8b89d)"/>
                <rect x="34" y="24" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="62" y="24" width="4" height="4" fill="var(--fc-black, #111)"/>
                <rect x="36" y="30" width="28" height="20" fill="var(--fc-black, #111)"/>
                <rect x="26" y="54" width="48" height="50" fill="var(--fc-black, #111)"/>
                <rect x="30" y="58" width="40" height="4" fill="var(--fc-gold, #d4a017)"/>
                <rect x="36" y="66" width="28" height="34" fill="var(--fc-red, #cc0000)"/>
            </g>
        </svg>
    `
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MagmaCards;
}
