// number-cards.js - Solitaire Deluxe | MagmaCrunch Media © 2026
// Corner labels: pixel-art SVG pips (matches face card style)
// Center body pips: smooth Unicode (clean, legible at larger sizes)

const SUIT_CHAR = { hearts:'♥', diamonds:'♦', clubs:'♣', spades:'♠' };

function pipColor(suit) {
    return (suit === 'hearts' || suit === 'diamonds') ? '#cc0000' : '#111111';
}

// ── Pixel-art pip SVG for corner labels ───────────────────────
// Small, crisp, matches the face card corner pip style.
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
          </svg>`,
    };
    return shapes[suit] || '';
}

// ── Corner label: pixel pip + rank ────────────────────────────
function cornerHTML(rank, suit, color) {
    const s = SUIT_CHAR[suit];
    return `
        <div class="card-corner top-left">
            <div class="corner-rank" style="color:${color}">${rank}</div>
            <div class="corner-suit" style="color:${color}">${s}</div>
        </div>
        <div class="card-corner bottom-right">
            <div class="corner-rank" style="color:${color}">${rank}</div>
            <div class="corner-suit" style="color:${color}">${s}</div>
        </div>`;
}

// ── Ace ───────────────────────────────────────────────────────
function getAceHTML(suit, rank) {
    const color = pipColor(suit);
    return `
        ${cornerHTML('A', suit, color)}
        <div class="card-suit-center single">
            <div class="pip-ace" style="color:${color}">${SUIT_CHAR[suit]}</div>
        </div>`;
}

// ── Number cards ──────────────────────────────────────────────
function getNumberCardHTML(suit, rank) {
    const color = pipColor(suit);
    return `
        ${cornerHTML(rank, suit, color)}
        <div class="card-suit-center">
            ${getSuitLayout(rank, suit, color)}
        </div>`;
}

// ── Center pip: smooth Unicode span ──────────────────────────
function pu(suit, color) {
    return `<span class="pip" style="color:${color}">${SUIT_CHAR[suit]}</span>`;
}
function pr(suit, color) {
    return `<span class="pip rotated" style="color:${color}">${SUIT_CHAR[suit]}</span>`;
}

function getSuitLayout(rank, suit, color) {
    const layouts = {
        '2': `
            <div class="suit-row">${pu(suit,color)}</div>
            <div class="suit-row">${pr(suit,color)}</div>`,
        '3': `
            <div class="suit-row">${pu(suit,color)}</div>
            <div class="suit-row">${pu(suit,color)}</div>
            <div class="suit-row">${pr(suit,color)}</div>`,
        '4': `
            <div class="suit-row">${pu(suit,color)}${pu(suit,color)}</div>
            <div class="suit-row">${pr(suit,color)}${pr(suit,color)}</div>`,
        '5': `
            <div class="suit-row">${pu(suit,color)}${pu(suit,color)}</div>
            <div class="suit-row">${pu(suit,color)}</div>
            <div class="suit-row">${pr(suit,color)}${pr(suit,color)}</div>`,
        '6': `
            <div class="suit-row">${pu(suit,color)}${pu(suit,color)}</div>
            <div class="suit-row">${pu(suit,color)}${pu(suit,color)}</div>
            <div class="suit-row">${pr(suit,color)}${pr(suit,color)}</div>`,
        '7': `
            <div class="suit-row">${pu(suit,color)}${pu(suit,color)}</div>
            <div class="suit-row">${pu(suit,color)}</div>
            <div class="suit-row">${pu(suit,color)}${pu(suit,color)}</div>
            <div class="suit-row">${pr(suit,color)}${pr(suit,color)}</div>`,
        '8': `
            <div class="suit-row">${pu(suit,color)}${pu(suit,color)}</div>
            <div class="suit-row">${pu(suit,color)}</div>
            <div class="suit-row">${pu(suit,color)}${pu(suit,color)}</div>
            <div class="suit-row">${pr(suit,color)}</div>
            <div class="suit-row">${pr(suit,color)}${pr(suit,color)}</div>`,
        '9': `
            <div class="suit-row">${pu(suit,color)}${pu(suit,color)}</div>
            <div class="suit-row">${pu(suit,color)}${pu(suit,color)}</div>
            <div class="suit-row">${pu(suit,color)}</div>
            <div class="suit-row">${pr(suit,color)}${pr(suit,color)}</div>
            <div class="suit-row">${pr(suit,color)}${pr(suit,color)}</div>`,
        '10': `
            <div class="suit-row">${pu(suit,color)}${pu(suit,color)}</div>
            <div class="suit-row">${pu(suit,color)}</div>
            <div class="suit-row">${pu(suit,color)}${pu(suit,color)}</div>
            <div class="suit-row">${pr(suit,color)}${pr(suit,color)}</div>
            <div class="suit-row">${pr(suit,color)}</div>
            <div class="suit-row">${pr(suit,color)}${pr(suit,color)}</div>`,
    };
    return layouts[rank] || '';
}
