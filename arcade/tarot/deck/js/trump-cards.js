// ═══════════════════════════════════════════════════════════════════════════
// trump-cards.js — MagmaCrunch Tarot Deck
// 21 trump cards with themed 8×8 pixel art icons
// ═══════════════════════════════════════════════════════════════════════════

const TarotTrumps = {

    // ── TRUMP ICONS (8×8 pixel art) ───────────────────────────────────────
    // Each icon is a function returning SVG rects for a small themed symbol

    ICONS: {
        // Trump 1 — Jester hat (triangle with bells)
        1: (c) => `
            <rect x="12" y="6" width="4" height="2" fill="${c}"/>
            <rect x="20" y="6" width="4" height="2" fill="${c}"/>
            <rect x="10" y="8" width="8" height="2" fill="${c}"/>
            <rect x="18" y="8" width="8" height="2" fill="${c}"/>
            <rect x="12" y="10" width="12" height="2" fill="${c}"/>
            <rect x="14" y="12" width="8" height="2" fill="${c}"/>
            <rect x="16" y="14" width="4" height="2" fill="${c}"/>`,

        // Trump 10 — Mountain (triangle peak)
        10: (c) => `
            <rect x="16" y="4" width="4" height="2" fill="${c}"/>
            <rect x="14" y="6" width="8" height="2" fill="${c}"/>
            <rect x="12" y="8" width="12" height="2" fill="${c}"/>
            <rect x="10" y="10" width="16" height="2" fill="${c}"/>
            <rect x="8" y="12" width="20" height="2" fill="${c}"/>
            <rect x="6" y="14" width="24" height="2" fill="${c}"/>`,

        // Trump 21 — Crown (three points)
        21: (c) => `
            <rect x="8" y="6" width="2" height="2" fill="${c}"/>
            <rect x="14" y="4" width="4" height="2" fill="${c}"/>
            <rect x="22" y="6" width="2" height="2" fill="${c}"/>
            <rect x="8" y="8" width="18" height="2" fill="${c}"/>
            <rect x="8" y="10" width="18" height="2" fill="${c}"/>
            <rect x="10" y="12" width="14" height="2" fill="${c}"/>
            <rect x="8" y="14" width="18" height="2" fill="${c}"/>`
    },

    // Default icon for trump cards without specific art (large number)
    getDefaultIcon(number, color) {
        const fontSize = number >= 10 ? 24 : 30;
        return `
            <text x="16" y="17" font-family="'Press Start 2P', monospace"
                  font-size="${fontSize}" fill="${color}" text-anchor="middle"
                  dominant-baseline="central">${number}</text>`;
    },

    // ── RENDER A TRUMP CARD ───────────────────────────────────────────────
    getTrumpHTML(number) {
        const isOudler = number === 1 || number === 21;
        const color = isOudler ? 'var(--t-trump-gold)' : 'var(--t-trump-cyan)';

        // Corner labels
        const corners = `
            <div class="t-card-corner top-left">
                <div class="corner-rank" style="color:${color}">${number}</div>
                <div class="corner-suit" style="color:${color};font-size:6px;">T</div>
            </div>
            <div class="t-card-corner bottom-right">
                <div class="corner-rank" style="color:${color}">${number}</div>
                <div class="corner-suit" style="color:${color};font-size:6px;">T</div>
            </div>`;

        // Center icon or default number
        let centerContent;
        if (this.ICONS[number]) {
            centerContent = `
                <svg viewBox="0 0 32 20" width="32" height="20"
                     style="shape-rendering:crispEdges;image-rendering:pixelated;">
                    ${this.ICONS[number](color)}
                </svg>`;
        } else {
            centerContent = `
                <div style="font-family:'Press Start 2P',monospace;
                            font-size:${number >= 10 ? '28px' : '36px'};
                            color:${color};
                            text-shadow:0 0 10px ${isOudler ? 'var(--t-oudler-glow)' : 'rgba(0,229,255,0.3)'};
                            line-height:1;">
                    ${number}
                </div>`;
        }

        return `
            <div class="t-card trump ${isOudler ? 'oudler' : ''}">
                ${corners}
                <div class="t-trump-center">
                    ${centerContent}
                    <div class="t-trump-label" style="color:${color}">ATOUT</div>
                </div>
            </div>`;
    }
};
