// ═══════════════════════════════════════════════════════════════════════════
// excuse-card.js — MagmaCrunch Tarot Deck
// The Excuse (Fool) card — jester character with cap and bells
// ═══════════════════════════════════════════════════════════════════════════

const TarotExcuse = {

    getExcuseHTML() {
        const color = 'var(--t-excuse-pink)';

        const corners = `
            <div class="t-card-corner top-left">
                <div class="corner-rank" style="color:${color};font-size:10px;">★</div>
                <div class="corner-suit" style="color:${color};font-size:6px;">EXC</div>
            </div>
            <div class="t-card-corner bottom-right">
                <div class="corner-rank" style="color:${color};font-size:10px;">★</div>
                <div class="corner-suit" style="color:${color};font-size:6px;">EXC</div>
            </div>`;

        // Jester pixel art — small figure with cap, bells, and stick
        const jesterSVG = `
            <svg viewBox="0 0 32 48" width="32" height="48"
                 style="shape-rendering:crispEdges;image-rendering:pixelated;">
                <!-- Jester cap (three points with bells) -->
                <rect x="10" y="4" width="4" height="2" fill="${color}"/>
                <rect x="18" y="4" width="4" height="2" fill="${color}"/>
                <rect x="14" y="2" width="4" height="2" fill="${color}"/>
                <rect x="8" y="6" width="16" height="2" fill="${color}"/>
                <!-- Bells on cap tips -->
                <rect x="10" y="2" width="2" height="2" fill="#ffd700"/>
                <rect x="20" y="2" width="2" height="2" fill="#ffd700"/>
                <rect x="15" y="0" width="2" height="2" fill="#ffd700"/>
                <!-- Face -->
                <rect x="10" y="8" width="12" height="8" fill="var(--t-fc-skin)"/>
                <rect x="12" y="10" width="2" height="2" fill="var(--t-fc-black)"/>
                <rect x="18" y="10" width="2" height="2" fill="var(--t-fc-black)"/>
                <rect x="14" y="14" width="4" height="2" fill="var(--t-fc-red)"/>
                <!-- Collar (ruffled) -->
                <rect x="8" y="16" width="16" height="2" fill="#ffd700"/>
                <rect x="10" y="18" width="12" height="2" fill="#ffd700"/>
                <!-- Body -->
                <rect x="10" y="20" width="12" height="10" fill="${color}"/>
                <rect x="12" y="22" width="8" height="6" fill="#ffd700"/>
                <!-- Arms -->
                <rect x="6" y="20" width="4" height="6" fill="${color}"/>
                <rect x="22" y="20" width="4" height="6" fill="${color}"/>
                <!-- Stick in right hand -->
                <rect x="24" y="14" width="2" height="20" fill="#ffd700"/>
                <rect x="22" y="12" width="6" height="4" fill="${color}"/>
                <!-- Legs -->
                <rect x="10" y="30" width="4" height="8" fill="${color}"/>
                <rect x="18" y="30" width="4" height="8" fill="${color}"/>
                <!-- Shoes with bells -->
                <rect x="8" y="38" width="6" height="2" fill="#ffd700"/>
                <rect x="18" y="38" width="6" height="2" fill="#ffd700"/>
            </svg>`;

        return `
            <div class="t-card excuse">
                ${corners}
                <div class="t-excuse-center">
                    ${jesterSVG}
                    <div style="font-family:'Press Start 2P',monospace;
                                font-size:7px;color:${color};
                                text-shadow:0 0 8px rgba(255,45,120,0.5);
                                margin-top:6px;letter-spacing:0.1em;">
                        EXCUSE
                    </div>
                </div>
            </div>`;
    }
};
