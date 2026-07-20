// ═══════════════════════════════════════════════════════════════════════════
// suited-cards.js — MagmaCrunch Tarot Deck
// Number cards (1-10) + Court cards (J, C, D, R) for all 4 suits
// ═══════════════════════════════════════════════════════════════════════════

const TarotSuited = {

    SUITS: ['hearts', 'diamonds', 'clubs', 'spades'],
    RANKS: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'V', 'C', 'D', 'R'],

    SUIT_SYMBOLS: { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' },

    isRed(suit) { return suit === 'hearts' || suit === 'diamonds'; },

    getColor(suit) { return this.isRed(suit) ? 'var(--t-card-red)' : 'var(--t-card-black)'; },

    // ── CORNER LABEL ──────────────────────────────────────────────────────
    cornerHTML(rank, suit, position) {
        const color = this.getColor(suit);
        const symbol = this.SUIT_SYMBOLS[suit];
        return `
            <div class="t-card-corner ${position}">
                <div class="corner-rank" style="color:${color}">${rank}</div>
                <div class="corner-suit" style="color:${color}">${symbol}</div>
            </div>`;
    },

    // ── NUMBER CARD (1-10) ────────────────────────────────────────────────
    getNumberCardHTML(rank, suit) {
        const color = this.getColor(suit);
        const symbol = this.SUIT_SYMBOLS[suit];
        const corners = this.cornerHTML(rank, suit, 'top-left') +
                        this.cornerHTML(rank, suit, 'bottom-right');
        const pips = this.getPipsHTML(rank, symbol, color);
        return `
            <div class="t-card t-card-${suit} ${this.isRed(suit) ? 'red' : 'black'}">
                ${corners}
                <div class="t-card-pips">${pips}</div>
            </div>`;
    },

    getPipsHTML(rank, symbol, color) {
        const p = (c) => `<span class="t-pip" style="color:${c}">${symbol}</span>`;
        const pr = (c) => `<span class="t-pip rotated" style="color:${c}">${symbol}</span>`;
        const row = (...children) => `<div class="t-pip-row">${children.join('')}</div>`;
        const single = (...children) => `<div class="t-pip-row single">${children.join('')}</div>`;

        const layouts = {
            '1':  `<div class="t-pip-container">${single(p(color))}</div>`,
            '2':  `<div class="t-pip-container">${row(p(color))}${row(pr(color))}</div>`,
            '3':  `<div class="t-pip-container">${row(p(color))}${row(p(color))}${row(pr(color))}</div>`,
            '4':  `<div class="t-pip-container">${row(p(color),p(color))}${row(pr(color),pr(color))}</div>`,
            '5':  `<div class="t-pip-container">${row(p(color),p(color))}${row(p(color))}${row(pr(color),pr(color))}</div>`,
            '6':  `<div class="t-pip-container">${row(p(color),p(color))}${row(p(color),p(color))}${row(pr(color),pr(color))}</div>`,
            '7':  `<div class="t-pip-container">${row(p(color),p(color))}${row(p(color))}${row(p(color),p(color))}${row(pr(color),pr(color))}</div>`,
            '8':  `<div class="t-pip-container">${row(p(color),p(color))}${row(p(color))}${row(p(color),p(color))}${row(pr(color))}${row(pr(color),pr(color))}</div>`,
            '9':  `<div class="t-pip-container">${row(p(color),p(color))}${row(p(color),p(color))}${row(p(color))}${row(pr(color),pr(color))}${row(pr(color),pr(color))}</div>`,
            '10': `<div class="t-pip-container">${row(p(color),p(color))}${row(p(color),p(color))}${row(p(color),p(color))}${row(pr(color),pr(color))}${row(pr(color),pr(color))}</div>`
        };
        return layouts[rank] || '';
    },

    // ── FACE CARD (J, Q, R) — pixel art SVG ───────────────────────────────
    getFaceCardHTML(rank, suit) {
        const color = this.getColor(suit);
        const corners = this.cornerHTML(rank, suit, 'top-left') +
                        this.cornerHTML(rank, suit, 'bottom-right');
        const key = `${rank.toLowerCase()}-${suit}`;
        const svg = TAROT_FACE_SVGS[key] ? TAROT_FACE_SVGS[key]() : this.getFallbackFaceSVG(rank, suit);
        return `
            <div class="t-card t-card-${suit} ${this.isRed(suit) ? 'red' : 'black'}">
                ${corners}
                <div class="t-card-face">${svg}</div>
            </div>`;
    },

    // ── CAVALIER (C) — new pixel art ──────────────────────────────────────
    getCavalierHTML(suit) {
        const color = this.getColor(suit);
        const corners = this.cornerHTML('C', suit, 'top-left') +
                        this.cornerHTML('C', suit, 'bottom-right');
        const key = `c-${suit}`;
        const svg = TAROT_FACE_SVGS[key] ? TAROT_FACE_SVGS[key]() : this.getFallbackFaceSVG('C', suit);
        return `
            <div class="t-card t-card-${suit} ${this.isRed(suit) ? 'red' : 'black'}">
                ${corners}
                <div class="t-card-face">${svg}</div>
            </div>`;
    },

    getFallbackFaceSVG(rank, suit) {
        const color = this.getColor(suit);
        const symbol = this.SUIT_SYMBOLS[suit];
        return `<svg width="100%" height="100%" viewBox="0 0 100 159" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="159" fill="var(--t-fc-art-bg)"/>
            <text x="50" y="80" text-anchor="middle" fill="${color}" font-size="48">${rank}</text>
            <text x="50" y="120" text-anchor="middle" fill="${color}" font-size="24">${symbol}</text>
        </svg>`;
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// FACE CARD SVGs — Pixel art for J, C (Cavalier), D, R × 4 suits
// Adapted from MagmaCrunch Cards First Edition for Tarot (100×159 viewBox)
// ═══════════════════════════════════════════════════════════════════════════

const TAROT_FACE_SVGS = {

    // ── VALET (JACK) ──────────────────────────────────────────────────────

    'v-clubs': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 159" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="159" fill="var(--t-fc-art-bg)"/>
            <g>
                <rect x="30" y="22" width="40" height="6" fill="var(--t-fc-gold)"/>
                <rect x="32" y="28" width="36" height="4" fill="var(--t-fc-black)"/>
                <rect x="28" y="32" width="44" height="34" fill="var(--t-fc-skin)"/>
                <rect x="34" y="34" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="62" y="34" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="40" width="28" height="22" fill="var(--t-fc-blue)"/>
                <rect x="40" y="62" width="20" height="8" fill="var(--t-fc-red)"/>
                <rect x="26" y="62" width="10" height="34" fill="var(--t-fc-gold)"/>
                <rect x="64" y="62" width="10" height="34" fill="var(--t-fc-gold)"/>
                <rect x="36" y="96" width="28" height="22" fill="var(--t-fc-blue)"/>
            </g>
            <g transform="rotate(180 50 79.5)">
                <rect x="30" y="22" width="40" height="6" fill="var(--t-fc-gold)"/>
                <rect x="32" y="28" width="36" height="4" fill="var(--t-fc-black)"/>
                <rect x="28" y="32" width="44" height="34" fill="var(--t-fc-skin)"/>
                <rect x="34" y="34" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="62" y="34" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="40" width="28" height="22" fill="var(--t-fc-blue)"/>
                <rect x="40" y="62" width="20" height="8" fill="var(--t-fc-red)"/>
                <rect x="26" y="62" width="10" height="34" fill="var(--t-fc-gold)"/>
                <rect x="64" y="62" width="10" height="34" fill="var(--t-fc-gold)"/>
                <rect x="36" y="96" width="28" height="22" fill="var(--t-fc-blue)"/>
            </g>
        </svg>`,

    'v-diamonds': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 159" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="159" fill="var(--t-fc-art-bg)"/>
            <g>
                <rect x="30" y="22" width="40" height="6" fill="var(--t-fc-gold)"/>
                <rect x="32" y="28" width="36" height="4" fill="var(--t-fc-black)"/>
                <rect x="28" y="32" width="44" height="34" fill="var(--t-fc-skin)"/>
                <rect x="34" y="34" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="62" y="34" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="40" width="28" height="22" fill="var(--t-fc-red)"/>
                <rect x="40" y="62" width="20" height="8" fill="var(--t-fc-red)"/>
                <rect x="26" y="62" width="10" height="34" fill="var(--t-fc-gold)"/>
                <rect x="64" y="62" width="10" height="34" fill="var(--t-fc-gold)"/>
                <rect x="36" y="96" width="28" height="22" fill="var(--t-fc-red)"/>
            </g>
            <g transform="rotate(180 50 79.5)">
                <rect x="30" y="22" width="40" height="6" fill="var(--t-fc-gold)"/>
                <rect x="32" y="28" width="36" height="4" fill="var(--t-fc-black)"/>
                <rect x="28" y="32" width="44" height="34" fill="var(--t-fc-skin)"/>
                <rect x="34" y="34" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="62" y="34" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="40" width="28" height="22" fill="var(--t-fc-red)"/>
                <rect x="40" y="62" width="20" height="8" fill="var(--t-fc-red)"/>
                <rect x="26" y="62" width="10" height="34" fill="var(--t-fc-gold)"/>
                <rect x="64" y="62" width="10" height="34" fill="var(--t-fc-gold)"/>
                <rect x="36" y="96" width="28" height="22" fill="var(--t-fc-red)"/>
            </g>
        </svg>`,

    'v-hearts': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 159" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="159" fill="var(--t-fc-art-bg)"/>
            <g>
                <rect x="30" y="22" width="40" height="6" fill="var(--t-fc-gold)"/>
                <rect x="32" y="28" width="36" height="4" fill="var(--t-fc-black)"/>
                <rect x="28" y="32" width="44" height="34" fill="var(--t-fc-skin)"/>
                <rect x="34" y="34" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="62" y="34" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="40" width="28" height="22" fill="var(--t-fc-blue)"/>
                <rect x="40" y="62" width="20" height="8" fill="var(--t-fc-blue)"/>
                <rect x="26" y="62" width="10" height="34" fill="var(--t-fc-gold)"/>
                <rect x="64" y="62" width="10" height="34" fill="var(--t-fc-gold)"/>
                <rect x="36" y="96" width="28" height="22" fill="var(--t-fc-red)"/>
            </g>
            <g transform="rotate(180 50 79.5)">
                <rect x="30" y="22" width="40" height="6" fill="var(--t-fc-gold)"/>
                <rect x="32" y="28" width="36" height="4" fill="var(--t-fc-black)"/>
                <rect x="28" y="32" width="44" height="34" fill="var(--t-fc-skin)"/>
                <rect x="34" y="34" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="62" y="34" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="40" width="28" height="22" fill="var(--t-fc-blue)"/>
                <rect x="40" y="62" width="20" height="8" fill="var(--t-fc-blue)"/>
                <rect x="26" y="62" width="10" height="34" fill="var(--t-fc-gold)"/>
                <rect x="64" y="62" width="10" height="34" fill="var(--t-fc-gold)"/>
                <rect x="36" y="96" width="28" height="22" fill="var(--t-fc-red)"/>
            </g>
        </svg>`,

    'v-spades': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 159" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="159" fill="var(--t-fc-art-bg)"/>
            <g>
                <rect x="30" y="22" width="40" height="6" fill="var(--t-fc-gold)"/>
                <rect x="32" y="28" width="36" height="4" fill="var(--t-fc-black)"/>
                <rect x="28" y="32" width="44" height="34" fill="var(--t-fc-skin)"/>
                <rect x="34" y="34" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="62" y="34" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="40" width="28" height="22" fill="var(--t-fc-black)"/>
                <rect x="40" y="62" width="20" height="8" fill="var(--t-fc-red)"/>
                <rect x="26" y="62" width="10" height="34" fill="var(--t-fc-gold)"/>
                <rect x="64" y="62" width="10" height="34" fill="var(--t-fc-gold)"/>
                <rect x="36" y="96" width="28" height="22" fill="var(--t-fc-black)"/>
            </g>
            <g transform="rotate(180 50 79.5)">
                <rect x="30" y="22" width="40" height="6" fill="var(--t-fc-gold)"/>
                <rect x="32" y="28" width="36" height="4" fill="var(--t-fc-black)"/>
                <rect x="28" y="32" width="44" height="34" fill="var(--t-fc-skin)"/>
                <rect x="34" y="34" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="62" y="34" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="40" width="28" height="22" fill="var(--t-fc-black)"/>
                <rect x="40" y="62" width="20" height="8" fill="var(--t-fc-red)"/>
                <rect x="26" y="62" width="10" height="34" fill="var(--t-fc-gold)"/>
                <rect x="64" y="62" width="10" height="34" fill="var(--t-fc-gold)"/>
                <rect x="36" y="96" width="28" height="22" fill="var(--t-fc-black)"/>
            </g>
        </svg>`,

    // ── CAVALIER (KNIGHT) — new card type ─────────────────────────────────
    // Mounted knight on horseback with lance, double-headed

    'c-clubs': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 159" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="159" fill="var(--t-fc-art-bg)"/>
            <g>
                <!-- Lance -->
                <rect x="68" y="14" width="2" height="44" fill="var(--t-fc-gold)"/>
                <rect x="66" y="10" width="6" height="6" fill="var(--t-fc-gold)"/>
                <!-- Horse head -->
                <rect x="24" y="30" width="16" height="4" fill="var(--t-fc-black)"/>
                <rect x="22" y="34" width="20" height="4" fill="var(--t-fc-black)"/>
                <rect x="20" y="38" width="10" height="6" fill="var(--t-fc-black)"/>
                <rect x="36" y="38" width="8" height="4" fill="var(--t-fc-skin)"/>
                <!-- Horse body -->
                <rect x="18" y="44" width="28" height="4" fill="var(--t-fc-gold)"/>
                <rect x="16" y="48" width="30" height="4" fill="var(--t-fc-gold)"/>
                <!-- Rider body -->
                <rect x="26" y="24" width="14" height="10" fill="var(--t-fc-blue)"/>
                <rect x="28" y="18" width="10" height="8" fill="var(--t-fc-skin)"/>
                <rect x="30" y="20" width="2" height="2" fill="var(--t-fc-black)"/>
                <rect x="34" y="20" width="2" height="2" fill="var(--t-fc-black)"/>
                <!-- Horse legs -->
                <rect x="20" y="52" width="4" height="10" fill="var(--t-fc-gold)"/>
                <rect x="36" y="52" width="4" height="10" fill="var(--t-fc-gold)"/>
            </g>
            <g transform="rotate(180 50 79.5)">
                <rect x="68" y="14" width="2" height="44" fill="var(--t-fc-gold)"/>
                <rect x="66" y="10" width="6" height="6" fill="var(--t-fc-gold)"/>
                <rect x="24" y="30" width="16" height="4" fill="var(--t-fc-black)"/>
                <rect x="22" y="34" width="20" height="4" fill="var(--t-fc-black)"/>
                <rect x="20" y="38" width="10" height="6" fill="var(--t-fc-black)"/>
                <rect x="36" y="38" width="8" height="4" fill="var(--t-fc-skin)"/>
                <rect x="18" y="44" width="28" height="4" fill="var(--t-fc-gold)"/>
                <rect x="16" y="48" width="30" height="4" fill="var(--t-fc-gold)"/>
                <rect x="26" y="24" width="14" height="10" fill="var(--t-fc-blue)"/>
                <rect x="28" y="18" width="10" height="8" fill="var(--t-fc-skin)"/>
                <rect x="30" y="20" width="2" height="2" fill="var(--t-fc-black)"/>
                <rect x="34" y="20" width="2" height="2" fill="var(--t-fc-black)"/>
                <rect x="20" y="52" width="4" height="10" fill="var(--t-fc-gold)"/>
                <rect x="36" y="52" width="4" height="10" fill="var(--t-fc-gold)"/>
            </g>
        </svg>`,

    'c-diamonds': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 159" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="159" fill="var(--t-fc-art-bg)"/>
            <g>
                <rect x="68" y="14" width="2" height="44" fill="var(--t-fc-gold)"/>
                <rect x="66" y="10" width="6" height="6" fill="var(--t-fc-gold)"/>
                <rect x="24" y="30" width="16" height="4" fill="var(--t-fc-black)"/>
                <rect x="22" y="34" width="20" height="4" fill="var(--t-fc-black)"/>
                <rect x="20" y="38" width="10" height="6" fill="var(--t-fc-black)"/>
                <rect x="36" y="38" width="8" height="4" fill="var(--t-fc-skin)"/>
                <rect x="18" y="44" width="28" height="4" fill="var(--t-fc-gold)"/>
                <rect x="16" y="48" width="30" height="4" fill="var(--t-fc-gold)"/>
                <rect x="26" y="24" width="14" height="10" fill="var(--t-fc-red)"/>
                <rect x="28" y="18" width="10" height="8" fill="var(--t-fc-skin)"/>
                <rect x="30" y="20" width="2" height="2" fill="var(--t-fc-black)"/>
                <rect x="34" y="20" width="2" height="2" fill="var(--t-fc-black)"/>
                <rect x="20" y="52" width="4" height="10" fill="var(--t-fc-gold)"/>
                <rect x="36" y="52" width="4" height="10" fill="var(--t-fc-gold)"/>
            </g>
            <g transform="rotate(180 50 79.5)">
                <rect x="68" y="14" width="2" height="44" fill="var(--t-fc-gold)"/>
                <rect x="66" y="10" width="6" height="6" fill="var(--t-fc-gold)"/>
                <rect x="24" y="30" width="16" height="4" fill="var(--t-fc-black)"/>
                <rect x="22" y="34" width="20" height="4" fill="var(--t-fc-black)"/>
                <rect x="20" y="38" width="10" height="6" fill="var(--t-fc-black)"/>
                <rect x="36" y="38" width="8" height="4" fill="var(--t-fc-skin)"/>
                <rect x="18" y="44" width="28" height="4" fill="var(--t-fc-gold)"/>
                <rect x="16" y="48" width="30" height="4" fill="var(--t-fc-gold)"/>
                <rect x="26" y="24" width="14" height="10" fill="var(--t-fc-red)"/>
                <rect x="28" y="18" width="10" height="8" fill="var(--t-fc-skin)"/>
                <rect x="30" y="20" width="2" height="2" fill="var(--t-fc-black)"/>
                <rect x="34" y="20" width="2" height="2" fill="var(--t-fc-black)"/>
                <rect x="20" y="52" width="4" height="10" fill="var(--t-fc-gold)"/>
                <rect x="36" y="52" width="4" height="10" fill="var(--t-fc-gold)"/>
            </g>
        </svg>`,

    'c-hearts': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 159" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="159" fill="var(--t-fc-art-bg)"/>
            <g>
                <rect x="68" y="14" width="2" height="44" fill="var(--t-fc-gold)"/>
                <rect x="66" y="10" width="6" height="6" fill="var(--t-fc-gold)"/>
                <rect x="24" y="30" width="16" height="4" fill="var(--t-fc-black)"/>
                <rect x="22" y="34" width="20" height="4" fill="var(--t-fc-black)"/>
                <rect x="20" y="38" width="10" height="6" fill="var(--t-fc-black)"/>
                <rect x="36" y="38" width="8" height="4" fill="var(--t-fc-skin)"/>
                <rect x="18" y="44" width="28" height="4" fill="var(--t-fc-gold)"/>
                <rect x="16" y="48" width="30" height="4" fill="var(--t-fc-gold)"/>
                <rect x="26" y="24" width="14" height="10" fill="var(--t-fc-red)"/>
                <rect x="28" y="18" width="10" height="8" fill="var(--t-fc-skin)"/>
                <rect x="30" y="20" width="2" height="2" fill="var(--t-fc-black)"/>
                <rect x="34" y="20" width="2" height="2" fill="var(--t-fc-black)"/>
                <rect x="20" y="52" width="4" height="10" fill="var(--t-fc-gold)"/>
                <rect x="36" y="52" width="4" height="10" fill="var(--t-fc-gold)"/>
            </g>
            <g transform="rotate(180 50 79.5)">
                <rect x="68" y="14" width="2" height="44" fill="var(--t-fc-gold)"/>
                <rect x="66" y="10" width="6" height="6" fill="var(--t-fc-gold)"/>
                <rect x="24" y="30" width="16" height="4" fill="var(--t-fc-black)"/>
                <rect x="22" y="34" width="20" height="4" fill="var(--t-fc-black)"/>
                <rect x="20" y="38" width="10" height="6" fill="var(--t-fc-black)"/>
                <rect x="36" y="38" width="8" height="4" fill="var(--t-fc-skin)"/>
                <rect x="18" y="44" width="28" height="4" fill="var(--t-fc-gold)"/>
                <rect x="16" y="48" width="30" height="4" fill="var(--t-fc-gold)"/>
                <rect x="26" y="24" width="14" height="10" fill="var(--t-fc-red)"/>
                <rect x="28" y="18" width="10" height="8" fill="var(--t-fc-skin)"/>
                <rect x="30" y="20" width="2" height="2" fill="var(--t-fc-black)"/>
                <rect x="34" y="20" width="2" height="2" fill="var(--t-fc-black)"/>
                <rect x="20" y="52" width="4" height="10" fill="var(--t-fc-gold)"/>
                <rect x="36" y="52" width="4" height="10" fill="var(--t-fc-gold)"/>
            </g>
        </svg>`,

    'c-spades': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 159" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="159" fill="var(--t-fc-art-bg)"/>
            <g>
                <rect x="68" y="14" width="2" height="44" fill="var(--t-fc-gold)"/>
                <rect x="66" y="10" width="6" height="6" fill="var(--t-fc-gold)"/>
                <rect x="24" y="30" width="16" height="4" fill="var(--t-fc-black)"/>
                <rect x="22" y="34" width="20" height="4" fill="var(--t-fc-black)"/>
                <rect x="20" y="38" width="10" height="6" fill="var(--t-fc-black)"/>
                <rect x="36" y="38" width="8" height="4" fill="var(--t-fc-skin)"/>
                <rect x="18" y="44" width="28" height="4" fill="var(--t-fc-gold)"/>
                <rect x="16" y="48" width="30" height="4" fill="var(--t-fc-gold)"/>
                <rect x="26" y="24" width="14" height="10" fill="var(--t-fc-black)"/>
                <rect x="28" y="18" width="10" height="8" fill="var(--t-fc-skin)"/>
                <rect x="30" y="20" width="2" height="2" fill="var(--t-fc-black)"/>
                <rect x="34" y="20" width="2" height="2" fill="var(--t-fc-black)"/>
                <rect x="20" y="52" width="4" height="10" fill="var(--t-fc-gold)"/>
                <rect x="36" y="52" width="4" height="10" fill="var(--t-fc-gold)"/>
            </g>
            <g transform="rotate(180 50 79.5)">
                <rect x="68" y="14" width="2" height="44" fill="var(--t-fc-gold)"/>
                <rect x="66" y="10" width="6" height="6" fill="var(--t-fc-gold)"/>
                <rect x="24" y="30" width="16" height="4" fill="var(--t-fc-black)"/>
                <rect x="22" y="34" width="20" height="4" fill="var(--t-fc-black)"/>
                <rect x="20" y="38" width="10" height="6" fill="var(--t-fc-black)"/>
                <rect x="36" y="38" width="8" height="4" fill="var(--t-fc-skin)"/>
                <rect x="18" y="44" width="28" height="4" fill="var(--t-fc-gold)"/>
                <rect x="16" y="48" width="30" height="4" fill="var(--t-fc-gold)"/>
                <rect x="26" y="24" width="14" height="10" fill="var(--t-fc-black)"/>
                <rect x="28" y="18" width="10" height="8" fill="var(--t-fc-skin)"/>
                <rect x="30" y="20" width="2" height="2" fill="var(--t-fc-black)"/>
                <rect x="34" y="20" width="2" height="2" fill="var(--t-fc-black)"/>
                <rect x="20" y="52" width="4" height="10" fill="var(--t-fc-gold)"/>
                <rect x="36" y="52" width="4" height="10" fill="var(--t-fc-gold)"/>
            </g>
        </svg>`,

    // ── DAME (QUEEN) ──────────────────────────────────────────────────────

    'd-clubs': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 159" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="159" fill="var(--t-fc-art-bg)"/>
            <g>
                <rect x="30" y="16" width="40" height="6" fill="var(--t-fc-gold)"/>
                <rect x="32" y="10" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="60" y="10" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="44" y="8" width="12" height="10" fill="var(--t-fc-gold)"/>
                <rect x="28" y="26" width="44" height="34" fill="var(--t-fc-skin)"/>
                <rect x="34" y="30" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="62" y="30" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="36" width="28" height="20" fill="var(--t-fc-purple)"/>
                <rect x="42" y="56" width="16" height="8" fill="var(--t-fc-skin)"/>
                <rect x="26" y="58" width="48" height="44" fill="var(--t-fc-purple)"/>
                <rect x="30" y="62" width="40" height="4" fill="var(--t-fc-gold)"/>
                <rect x="36" y="70" width="28" height="28" fill="var(--t-fc-red)"/>
            </g>
            <g transform="rotate(180 50 79.5)">
                <rect x="30" y="16" width="40" height="6" fill="var(--t-fc-gold)"/>
                <rect x="32" y="10" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="60" y="10" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="44" y="8" width="12" height="10" fill="var(--t-fc-gold)"/>
                <rect x="28" y="26" width="44" height="34" fill="var(--t-fc-skin)"/>
                <rect x="34" y="30" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="62" y="30" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="36" width="28" height="20" fill="var(--t-fc-purple)"/>
                <rect x="42" y="56" width="16" height="8" fill="var(--t-fc-skin)"/>
                <rect x="26" y="58" width="48" height="44" fill="var(--t-fc-purple)"/>
                <rect x="30" y="62" width="40" height="4" fill="var(--t-fc-gold)"/>
                <rect x="36" y="70" width="28" height="28" fill="var(--t-fc-red)"/>
            </g>
        </svg>`,

    'd-diamonds': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 159" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="159" fill="var(--t-fc-art-bg)"/>
            <g>
                <rect x="30" y="16" width="40" height="6" fill="var(--t-fc-gold)"/>
                <rect x="32" y="10" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="60" y="10" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="44" y="8" width="12" height="10" fill="var(--t-fc-gold)"/>
                <rect x="28" y="26" width="44" height="34" fill="var(--t-fc-skin)"/>
                <rect x="34" y="30" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="62" y="30" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="36" width="28" height="20" fill="var(--t-fc-red)"/>
                <rect x="42" y="56" width="16" height="8" fill="var(--t-fc-skin)"/>
                <rect x="26" y="58" width="48" height="44" fill="var(--t-fc-red)"/>
                <rect x="30" y="62" width="40" height="4" fill="var(--t-fc-gold)"/>
                <rect x="36" y="70" width="28" height="28" fill="var(--t-fc-purple)"/>
            </g>
            <g transform="rotate(180 50 79.5)">
                <rect x="30" y="16" width="40" height="6" fill="var(--t-fc-gold)"/>
                <rect x="32" y="10" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="60" y="10" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="44" y="8" width="12" height="10" fill="var(--t-fc-gold)"/>
                <rect x="28" y="26" width="44" height="34" fill="var(--t-fc-skin)"/>
                <rect x="34" y="30" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="62" y="30" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="36" width="28" height="20" fill="var(--t-fc-red)"/>
                <rect x="42" y="56" width="16" height="8" fill="var(--t-fc-skin)"/>
                <rect x="26" y="58" width="48" height="44" fill="var(--t-fc-red)"/>
                <rect x="30" y="62" width="40" height="4" fill="var(--t-fc-gold)"/>
                <rect x="36" y="70" width="28" height="28" fill="var(--t-fc-purple)"/>
            </g>
        </svg>`,

    'd-hearts': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 159" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="159" fill="var(--t-fc-art-bg)"/>
            <g>
                <rect x="30" y="16" width="40" height="6" fill="var(--t-fc-gold)"/>
                <rect x="32" y="10" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="60" y="10" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="44" y="8" width="12" height="10" fill="var(--t-fc-gold)"/>
                <rect x="28" y="26" width="44" height="34" fill="var(--t-fc-skin)"/>
                <rect x="34" y="30" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="62" y="30" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="36" width="28" height="20" fill="var(--t-fc-red)"/>
                <rect x="42" y="56" width="16" height="8" fill="var(--t-fc-skin)"/>
                <rect x="26" y="58" width="48" height="44" fill="var(--t-fc-red)"/>
                <rect x="30" y="62" width="40" height="4" fill="var(--t-fc-gold)"/>
                <rect x="36" y="70" width="28" height="28" fill="var(--t-fc-black)"/>
            </g>
            <g transform="rotate(180 50 79.5)">
                <rect x="30" y="16" width="40" height="6" fill="var(--t-fc-gold)"/>
                <rect x="32" y="10" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="60" y="10" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="44" y="8" width="12" height="10" fill="var(--t-fc-gold)"/>
                <rect x="28" y="26" width="44" height="34" fill="var(--t-fc-skin)"/>
                <rect x="34" y="30" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="62" y="30" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="36" width="28" height="20" fill="var(--t-fc-red)"/>
                <rect x="42" y="56" width="16" height="8" fill="var(--t-fc-skin)"/>
                <rect x="26" y="58" width="48" height="44" fill="var(--t-fc-red)"/>
                <rect x="30" y="62" width="40" height="4" fill="var(--t-fc-gold)"/>
                <rect x="36" y="70" width="28" height="28" fill="var(--t-fc-black)"/>
            </g>
        </svg>`,

    'd-spades': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 159" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="159" fill="var(--t-fc-art-bg)"/>
            <g>
                <rect x="30" y="16" width="40" height="6" fill="var(--t-fc-gold)"/>
                <rect x="32" y="10" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="60" y="10" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="44" y="8" width="12" height="10" fill="var(--t-fc-gold)"/>
                <rect x="28" y="26" width="44" height="34" fill="var(--t-fc-skin)"/>
                <rect x="34" y="30" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="62" y="30" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="36" width="28" height="20" fill="var(--t-fc-black)"/>
                <rect x="42" y="56" width="16" height="8" fill="var(--t-fc-skin)"/>
                <rect x="26" y="58" width="48" height="44" fill="var(--t-fc-black)"/>
                <rect x="30" y="62" width="40" height="4" fill="var(--t-fc-gold)"/>
                <rect x="36" y="70" width="28" height="28" fill="var(--t-fc-purple)"/>
            </g>
            <g transform="rotate(180 50 79.5)">
                <rect x="30" y="16" width="40" height="6" fill="var(--t-fc-gold)"/>
                <rect x="32" y="10" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="60" y="10" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="44" y="8" width="12" height="10" fill="var(--t-fc-gold)"/>
                <rect x="28" y="26" width="44" height="34" fill="var(--t-fc-skin)"/>
                <rect x="34" y="30" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="62" y="30" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="36" width="28" height="20" fill="var(--t-fc-black)"/>
                <rect x="42" y="56" width="16" height="8" fill="var(--t-fc-skin)"/>
                <rect x="26" y="58" width="48" height="44" fill="var(--t-fc-black)"/>
                <rect x="30" y="62" width="40" height="4" fill="var(--t-fc-gold)"/>
                <rect x="36" y="70" width="28" height="28" fill="var(--t-fc-purple)"/>
            </g>
        </svg>`,

    // ── ROI (KING) ────────────────────────────────────────────────────────

    'r-clubs': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 159" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="159" fill="var(--t-fc-art-bg)"/>
            <g>
                <rect x="26" y="12" width="48" height="6" fill="var(--t-fc-gold)"/>
                <rect x="28" y="6" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="64" y="6" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="44" y="4" width="12" height="10" fill="var(--t-fc-gold)"/>
                <rect x="28" y="22" width="44" height="36" fill="var(--t-fc-skin)"/>
                <rect x="34" y="26" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="62" y="26" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="32" width="28" height="22" fill="var(--t-fc-red)"/>
                <rect x="26" y="58" width="48" height="54" fill="var(--t-fc-red)"/>
                <rect x="30" y="62" width="40" height="4" fill="var(--t-fc-gold)"/>
                <rect x="36" y="70" width="28" height="38" fill="var(--t-fc-black)"/>
            </g>
            <g transform="rotate(180 50 79.5)">
                <rect x="26" y="12" width="48" height="6" fill="var(--t-fc-gold)"/>
                <rect x="28" y="6" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="64" y="6" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="44" y="4" width="12" height="10" fill="var(--t-fc-gold)"/>
                <rect x="28" y="22" width="44" height="36" fill="var(--t-fc-skin)"/>
                <rect x="34" y="26" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="62" y="26" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="32" width="28" height="22" fill="var(--t-fc-red)"/>
                <rect x="26" y="58" width="48" height="54" fill="var(--t-fc-red)"/>
                <rect x="30" y="62" width="40" height="4" fill="var(--t-fc-gold)"/>
                <rect x="36" y="70" width="28" height="38" fill="var(--t-fc-black)"/>
            </g>
        </svg>`,

    'r-diamonds': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 159" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="159" fill="var(--t-fc-art-bg)"/>
            <g>
                <rect x="26" y="12" width="48" height="6" fill="var(--t-fc-gold)"/>
                <rect x="28" y="6" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="64" y="6" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="44" y="4" width="12" height="10" fill="var(--t-fc-gold)"/>
                <rect x="28" y="22" width="44" height="36" fill="var(--t-fc-skin)"/>
                <rect x="34" y="26" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="62" y="26" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="32" width="28" height="22" fill="var(--t-fc-red)"/>
                <rect x="26" y="58" width="48" height="54" fill="var(--t-fc-gold)"/>
                <rect x="30" y="62" width="40" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="70" width="28" height="38" fill="var(--t-fc-red)"/>
            </g>
            <g transform="rotate(180 50 79.5)">
                <rect x="26" y="12" width="48" height="6" fill="var(--t-fc-gold)"/>
                <rect x="28" y="6" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="64" y="6" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="44" y="4" width="12" height="10" fill="var(--t-fc-gold)"/>
                <rect x="28" y="22" width="44" height="36" fill="var(--t-fc-skin)"/>
                <rect x="34" y="26" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="62" y="26" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="32" width="28" height="22" fill="var(--t-fc-red)"/>
                <rect x="26" y="58" width="48" height="54" fill="var(--t-fc-gold)"/>
                <rect x="30" y="62" width="40" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="70" width="28" height="38" fill="var(--t-fc-red)"/>
            </g>
        </svg>`,

    'r-hearts': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 159" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="159" fill="var(--t-fc-art-bg)"/>
            <g>
                <rect x="26" y="12" width="48" height="6" fill="var(--t-fc-gold)"/>
                <rect x="28" y="6" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="64" y="6" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="44" y="4" width="12" height="10" fill="var(--t-fc-gold)"/>
                <rect x="28" y="22" width="44" height="36" fill="var(--t-fc-skin)"/>
                <rect x="34" y="26" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="62" y="26" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="32" width="28" height="22" fill="var(--t-fc-red)"/>
                <rect x="26" y="58" width="48" height="54" fill="var(--t-fc-red)"/>
                <rect x="30" y="62" width="40" height="4" fill="var(--t-fc-gold)"/>
                <rect x="36" y="70" width="28" height="38" fill="var(--t-fc-black)"/>
            </g>
            <g transform="rotate(180 50 79.5)">
                <rect x="26" y="12" width="48" height="6" fill="var(--t-fc-gold)"/>
                <rect x="28" y="6" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="64" y="6" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="44" y="4" width="12" height="10" fill="var(--t-fc-gold)"/>
                <rect x="28" y="22" width="44" height="36" fill="var(--t-fc-skin)"/>
                <rect x="34" y="26" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="62" y="26" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="32" width="28" height="22" fill="var(--t-fc-red)"/>
                <rect x="26" y="58" width="48" height="54" fill="var(--t-fc-red)"/>
                <rect x="30" y="62" width="40" height="4" fill="var(--t-fc-gold)"/>
                <rect x="36" y="70" width="28" height="38" fill="var(--t-fc-black)"/>
            </g>
        </svg>`,

    'r-spades': () => `
        <svg width="100%" height="100%" viewBox="0 0 100 159" xmlns="http://www.w3.org/2000/svg" style="display:block;shape-rendering:crispEdges;">
            <rect width="100" height="159" fill="var(--t-fc-art-bg)"/>
            <g>
                <rect x="26" y="12" width="48" height="6" fill="var(--t-fc-gold)"/>
                <rect x="28" y="6" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="64" y="6" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="44" y="4" width="12" height="10" fill="var(--t-fc-gold)"/>
                <rect x="28" y="22" width="44" height="36" fill="var(--t-fc-skin)"/>
                <rect x="34" y="26" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="62" y="26" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="32" width="28" height="22" fill="var(--t-fc-black)"/>
                <rect x="26" y="58" width="48" height="54" fill="var(--t-fc-black)"/>
                <rect x="30" y="62" width="40" height="4" fill="var(--t-fc-gold)"/>
                <rect x="36" y="70" width="28" height="38" fill="var(--t-fc-red)"/>
            </g>
            <g transform="rotate(180 50 79.5)">
                <rect x="26" y="12" width="48" height="6" fill="var(--t-fc-gold)"/>
                <rect x="28" y="6" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="64" y="6" width="8" height="8" fill="var(--t-fc-gold)"/>
                <rect x="44" y="4" width="12" height="10" fill="var(--t-fc-gold)"/>
                <rect x="28" y="22" width="44" height="36" fill="var(--t-fc-skin)"/>
                <rect x="34" y="26" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="62" y="26" width="4" height="4" fill="var(--t-fc-black)"/>
                <rect x="36" y="32" width="28" height="22" fill="var(--t-fc-black)"/>
                <rect x="26" y="58" width="48" height="54" fill="var(--t-fc-black)"/>
                <rect x="30" y="62" width="40" height="4" fill="var(--t-fc-gold)"/>
                <rect x="36" y="70" width="28" height="38" fill="var(--t-fc-red)"/>
            </g>
        </svg>`
};
