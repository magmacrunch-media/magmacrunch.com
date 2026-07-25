// face-cards.js - Texas Hold'Em Lava Dome | MagmaCrunch Media © 2024
// Inline SVG pixel art for all 12 face cards (J/Q/K × 4 suits).
// Colors reference CSS variables defined in base.css (--fc-* prefix).
// getFaceCardHTML() in deck.js dispatches to this lookup table.

// ── Corner label config ───────────────────────────────────────
// Tweak these constants to reposition the corner rank + suit glyph:
//   FC_RANK_Y   : vertical position of the rank letter baseline
//   FC_GLYPH_Y  : vertical position of the suit glyph baseline
//                 (increase to move it down, decrease to move it up)
const FC_RANK_SIZE      = 8;
const FC_PIP_SIZE       = 7;    // small corner suit glyph
const FC_LARGE_PIP_SIZE = 14;   // large inner suit symbol — ← adjust to resize
const FC_FONT           = "Arial, sans-serif";
const FC_RANK_X         = 3;
const FC_RANK_Y         = 8;
const FC_GLYPH_X        = 3.5;
const FC_GLYPH_Y        = 15;   // ← small corner glyph vertical position
const FC_LARGE_PIP_X    = 12;   // ← large pip horizontal position
const FC_LARGE_PIP_Y    = 12;   // ← large pip vertical position (baseline)

// ── Pixel art pip shapes ──────────────────────────────────────
// Each suit drawn on an 8×8 grid of 1×1 SVG rects.
// These are purely decorative art within the card body — not the corner label.
const FC_PIP_ART = {
    // ♠  spades — inverted heart head, flared base
    spades: (c) => `
              <rect x="17" y="3" width="2" height="1" fill="${c}"/>
              <rect x="16" y="4" width="4" height="1" fill="${c}"/>
              <rect x="15" y="5" width="6" height="1" fill="${c}"/>
              <rect x="14" y="6" width="8" height="1" fill="${c}"/>
              <rect x="15" y="7" width="6" height="1" fill="${c}"/>
              <rect x="17" y="8" width="2" height="1" fill="${c}"/>
              <rect x="15" y="9" width="6" height="1" fill="${c}"/>
              <rect x="16" y="10" width="4" height="1" fill="${c}"/>`,
    // ♥  hearts — classic heart, two lobes + point
    hearts: (c) => `
              <rect x="15" y="3" width="2" height="1" fill="${c}"/>
              <rect x="19" y="3" width="2" height="1" fill="${c}"/>
              <rect x="14" y="4" width="8" height="1" fill="${c}"/>
              <rect x="14" y="5" width="8" height="1" fill="${c}"/>
              <rect x="15" y="6" width="6" height="1" fill="${c}"/>
              <rect x="16" y="7" width="4" height="1" fill="${c}"/>
              <rect x="17" y="8" width="2" height="1" fill="${c}"/>`,
    // ♦  diamonds — clean rhombus
    diamonds: (c) => `
              <rect x="17" y="3" width="2" height="1" fill="${c}"/>
              <rect x="16" y="4" width="4" height="1" fill="${c}"/>
              <rect x="15" y="5" width="6" height="1" fill="${c}"/>
              <rect x="14" y="6" width="8" height="1" fill="${c}"/>
              <rect x="15" y="7" width="6" height="1" fill="${c}"/>
              <rect x="16" y="8" width="4" height="1" fill="${c}"/>
              <rect x="17" y="9" width="2" height="1" fill="${c}"/>`,
    // ♣  clubs — solid trefoil: top lobe, two side lobes fully filled, stem + base
    clubs: (c) => `
              <rect x="17" y="3" width="2" height="1" fill="${c}"/>
              <rect x="16" y="4" width="4" height="1" fill="${c}"/>
              <rect x="15" y="5" width="6" height="1" fill="${c}"/>
              <rect x="14" y="6" width="8" height="1" fill="${c}"/>
              <rect x="15" y="7" width="6" height="1" fill="${c}"/>
              <rect x="16" y="8" width="4" height="1" fill="${c}"/>
              <rect x="17" y="9" width="2" height="1" fill="${c}"/>
              <rect x="16" y="10" width="4" height="1" fill="${c}"/>`,
};

// Helper — generates corner labels + pixel art pip for one face card half.
// rank  : 'J' | 'Q' | 'K'
// suit  : 'clubs' | 'diamonds' | 'hearts' | 'spades'
// color : CSS var — 'var(--fc-black)' or 'var(--fc-red)'
function FC_CORNERS(rank, suit, color) {
    const suitSymbol = { clubs:'♣', diamonds:'♦', hearts:'♥', spades:'♠' }[suit];
    return (
        // Small rank letter (top-left column)
        `<text x="${FC_RANK_X}" y="${FC_RANK_Y}" font-family="${FC_FONT}" font-size="${FC_RANK_SIZE}" font-weight="bold" text-anchor="start" fill="${color}">${rank}</text>\n` +
        // Small suit glyph below rank
        `              <text x="${FC_GLYPH_X}" y="${FC_GLYPH_Y}" font-family="Arial, sans-serif" font-size="${FC_PIP_SIZE}" text-anchor="start" fill="${color}">${suitSymbol}</text>\n` +
        // Large suit symbol to the right — clearly readable, replaces pixelated pip art
        `              <text x="${FC_LARGE_PIP_X}" y="${FC_LARGE_PIP_Y}" font-family="Arial, sans-serif" font-size="${FC_LARGE_PIP_SIZE}" text-anchor="start" fill="${color}">${suitSymbol}</text>`
    );
}

const FACE_CARD_SVG = {

    // ── J♣ ───────────────────────────────────────────────────
    'j-clubs': () => `
        <svg width="100%" height="100%" viewBox="0 0 64 88"
             xmlns="http://www.w3.org/2000/svg" style="display:block; shape-rendering:crispEdges; position:absolute; top:0; left:0;">
          <rect x="0" y="0" width="64" height="88" fill="var(--fc-art-bg)"/>
          <g>
              ${FC_CORNERS('J', 'clubs', 'var(--fc-black)')}
              <rect x="50" y="6" width="4" height="38" fill="var(--fc-gold)"/>
              <rect x="52" y="10" width="4" height="6" fill="var(--fc-black)"/>
              <rect x="48" y="18" width="6" height="2" fill="var(--fc-black)"/>
              <rect x="24" y="10" width="20" height="2" fill="var(--fc-black)"/>
              <rect x="26" y="6" width="16" height="4" fill="var(--fc-blue)"/>
              <rect x="30" y="6" width="2" height="4" fill="var(--fc-red)"/>
              <rect x="36" y="6" width="2" height="4" fill="var(--fc-red)"/>
              <rect x="20" y="12" width="6" height="14" fill="var(--fc-gold)"/>
              <rect x="18" y="22" width="6" height="6" fill="var(--fc-gold)"/>
              <rect x="42" y="12" width="4" height="10" fill="var(--fc-gold)"/>
              <rect x="26" y="12" width="16" height="14" fill="var(--fc-skin)"/>
              <rect x="34" y="14" width="4" height="2" fill="var(--fc-black)"/>
              <rect x="36" y="16" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="38" y="22" width="6" height="2" fill="var(--fc-black)"/>
              <rect x="32" y="26" width="6" height="2" fill="var(--fc-black)"/>
              <rect x="10" y="28" width="14" height="12" fill="var(--fc-black)"/>
              <rect x="14" y="32" width="4" height="4" fill="var(--fc-blue)"/>
              <rect x="24" y="28" width="16" height="12" fill="var(--fc-blue)"/>
              <rect x="28" y="30" width="8" height="8" fill="var(--fc-red)"/>
              <rect x="40" y="28" width="10" height="12" fill="var(--fc-black)"/>
              <rect x="46" y="26" width="6" height="6" fill="var(--fc-skin)"/>
              <rect x="10" y="40" width="14" height="4" fill="var(--fc-gold)"/>
              <rect x="24" y="40" width="16" height="4" fill="var(--fc-red)"/>
              <rect x="40" y="40" width="14" height="4" fill="var(--fc-gold)"/>
          </g>
          <g transform="rotate(180 32 44)">
              ${FC_CORNERS('J', 'clubs', 'var(--fc-black)')}
              <rect x="50" y="6" width="4" height="38" fill="var(--fc-gold)"/>
              <rect x="52" y="10" width="4" height="6" fill="var(--fc-black)"/>
              <rect x="48" y="18" width="6" height="2" fill="var(--fc-black)"/>
              <rect x="24" y="10" width="20" height="2" fill="var(--fc-black)"/>
              <rect x="26" y="6" width="16" height="4" fill="var(--fc-blue)"/>
              <rect x="30" y="6" width="2" height="4" fill="var(--fc-red)"/>
              <rect x="36" y="6" width="2" height="4" fill="var(--fc-red)"/>
              <rect x="20" y="12" width="6" height="14" fill="var(--fc-gold)"/>
              <rect x="18" y="22" width="6" height="6" fill="var(--fc-gold)"/>
              <rect x="42" y="12" width="4" height="10" fill="var(--fc-gold)"/>
              <rect x="26" y="12" width="16" height="14" fill="var(--fc-skin)"/>
              <rect x="34" y="14" width="4" height="2" fill="var(--fc-black)"/>
              <rect x="36" y="16" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="38" y="22" width="6" height="2" fill="var(--fc-black)"/>
              <rect x="32" y="26" width="6" height="2" fill="var(--fc-black)"/>
              <rect x="10" y="28" width="14" height="12" fill="var(--fc-black)"/>
              <rect x="14" y="32" width="4" height="4" fill="var(--fc-blue)"/>
              <rect x="24" y="28" width="16" height="12" fill="var(--fc-blue)"/>
              <rect x="28" y="30" width="8" height="8" fill="var(--fc-red)"/>
              <rect x="40" y="28" width="10" height="12" fill="var(--fc-black)"/>
              <rect x="46" y="26" width="6" height="6" fill="var(--fc-skin)"/>
              <rect x="10" y="40" width="14" height="4" fill="var(--fc-gold)"/>
              <rect x="24" y="40" width="16" height="4" fill="var(--fc-red)"/>
              <rect x="40" y="40" width="14" height="4" fill="var(--fc-gold)"/>
          </g>
        </svg>
    `,

    // ── J♦ ───────────────────────────────────────────────────
    'j-diamonds': () => `
        <svg width="100%" height="100%" viewBox="0 0 64 88"
             xmlns="http://www.w3.org/2000/svg" style="display:block; shape-rendering:crispEdges; position:absolute; top:0; left:0;">
          <rect x="0" y="0" width="64" height="88" fill="var(--fc-art-bg)"/>
          <g>
              ${FC_CORNERS('J', 'diamonds', 'var(--fc-red)')}
              <rect x="52" y="6" width="2" height="38" fill="var(--fc-gold)"/>
              <rect x="48" y="8" width="4" height="8" fill="var(--fc-steel)"/>
              <rect x="46" y="10" width="2" height="4" fill="var(--fc-steel)"/>
              <rect x="54" y="10" width="2" height="4" fill="var(--fc-steel)"/>
              <rect x="24" y="10" width="20" height="2" fill="var(--fc-black)"/>
              <rect x="26" y="6" width="16" height="4" fill="var(--fc-red)"/>
              <rect x="30" y="6" width="2" height="4" fill="var(--fc-blue)"/>
              <rect x="36" y="6" width="2" height="4" fill="var(--fc-blue)"/>
              <rect x="20" y="12" width="6" height="14" fill="var(--fc-gold)"/>
              <rect x="18" y="22" width="6" height="6" fill="var(--fc-gold)"/>
              <rect x="42" y="12" width="4" height="10" fill="var(--fc-gold)"/>
              <rect x="44" y="18" width="4" height="6" fill="var(--fc-gold)"/>
              <rect x="26" y="12" width="16" height="14" fill="var(--fc-skin)"/>
              <rect x="42" y="18" width="2" height="4" fill="var(--fc-skin)"/>
              <rect x="34" y="14" width="4" height="2" fill="var(--fc-black)"/>
              <rect x="36" y="16" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="38" y="22" width="6" height="2" fill="var(--fc-black)"/>
              <rect x="32" y="26" width="6" height="2" fill="var(--fc-black)"/>
              <rect x="10" y="28" width="14" height="12" fill="var(--fc-gold)"/>
              <rect x="14" y="32" width="4" height="4" fill="var(--fc-red)"/>
              <rect x="24" y="28" width="16" height="12" fill="var(--fc-red)"/>
              <rect x="28" y="28" width="8" height="12" fill="var(--fc-blue)"/>
              <rect x="40" y="28" width="10" height="12" fill="var(--fc-gold)"/>
              <rect x="42" y="32" width="4" height="4" fill="var(--fc-red)"/>
              <rect x="48" y="28" width="6" height="6" fill="var(--fc-skin)"/>
              <rect x="10" y="40" width="14" height="4" fill="var(--fc-blue)"/>
              <rect x="24" y="40" width="16" height="4" fill="var(--fc-red)"/>
              <rect x="40" y="40" width="14" height="4" fill="var(--fc-blue)"/>
          </g>
          <g transform="rotate(180 32 44)">
              ${FC_CORNERS('J', 'diamonds', 'var(--fc-red)')}
              <rect x="52" y="6" width="2" height="38" fill="var(--fc-gold)"/>
              <rect x="48" y="8" width="4" height="8" fill="var(--fc-steel)"/>
              <rect x="46" y="10" width="2" height="4" fill="var(--fc-steel)"/>
              <rect x="54" y="10" width="2" height="4" fill="var(--fc-steel)"/>
              <rect x="24" y="10" width="20" height="2" fill="var(--fc-black)"/>
              <rect x="26" y="6" width="16" height="4" fill="var(--fc-red)"/>
              <rect x="30" y="6" width="2" height="4" fill="var(--fc-blue)"/>
              <rect x="36" y="6" width="2" height="4" fill="var(--fc-blue)"/>
              <rect x="20" y="12" width="6" height="14" fill="var(--fc-gold)"/>
              <rect x="18" y="22" width="6" height="6" fill="var(--fc-gold)"/>
              <rect x="42" y="12" width="4" height="10" fill="var(--fc-gold)"/>
              <rect x="44" y="18" width="4" height="6" fill="var(--fc-gold)"/>
              <rect x="26" y="12" width="16" height="14" fill="var(--fc-skin)"/>
              <rect x="42" y="18" width="2" height="4" fill="var(--fc-skin)"/>
              <rect x="34" y="14" width="4" height="2" fill="var(--fc-black)"/>
              <rect x="36" y="16" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="38" y="22" width="6" height="2" fill="var(--fc-black)"/>
              <rect x="32" y="26" width="6" height="2" fill="var(--fc-black)"/>
              <rect x="10" y="28" width="14" height="12" fill="var(--fc-gold)"/>
              <rect x="14" y="32" width="4" height="4" fill="var(--fc-red)"/>
              <rect x="24" y="28" width="16" height="12" fill="var(--fc-red)"/>
              <rect x="28" y="28" width="8" height="12" fill="var(--fc-blue)"/>
              <rect x="40" y="28" width="10" height="12" fill="var(--fc-gold)"/>
              <rect x="42" y="32" width="4" height="4" fill="var(--fc-red)"/>
              <rect x="48" y="28" width="6" height="6" fill="var(--fc-skin)"/>
              <rect x="10" y="40" width="14" height="4" fill="var(--fc-blue)"/>
              <rect x="24" y="40" width="16" height="4" fill="var(--fc-red)"/>
              <rect x="40" y="40" width="14" height="4" fill="var(--fc-blue)"/>
          </g>
        </svg>
    `,

    // ── J♥ ───────────────────────────────────────────────────
    'j-hearts': () => `
        <svg width="100%" height="100%" viewBox="0 0 64 88"
             xmlns="http://www.w3.org/2000/svg" style="display:block; shape-rendering:crispEdges; position:absolute; top:0; left:0;">
          <rect x="0" y="0" width="64" height="88" fill="var(--fc-art-bg)"/>
          <g>
              ${FC_CORNERS('J', 'hearts', 'var(--fc-red)')}
              <rect x="52" y="6" width="2" height="38" fill="var(--fc-gold)"/>
              <rect x="46" y="10" width="6" height="12" fill="var(--fc-steel)"/>
              <rect x="44" y="12" width="2" height="8" fill="var(--fc-steel)"/>
              <rect x="22" y="10" width="22" height="2" fill="var(--fc-black)"/>
              <rect x="24" y="6" width="18" height="4" fill="var(--fc-red)"/>
              <rect x="28" y="6" width="2" height="4" fill="var(--fc-gold)"/>
              <rect x="36" y="6" width="2" height="4" fill="var(--fc-gold)"/>
              <rect x="36" y="12" width="10" height="14" fill="var(--fc-gold)"/>
              <rect x="42" y="22" width="6" height="6" fill="var(--fc-gold)"/>
              <rect x="26" y="12" width="10" height="14" fill="var(--fc-skin)"/>
              <rect x="24" y="18" width="2" height="4" fill="var(--fc-skin)"/>
              <rect x="26" y="14" width="4" height="2" fill="var(--fc-black)"/>
              <rect x="28" y="16" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="22" y="24" width="6" height="2" fill="var(--fc-black)"/>
              <rect x="28" y="26" width="4" height="2" fill="var(--fc-black)"/>
              <rect x="14" y="24" width="6" height="4" fill="var(--fc-gold)"/>
              <rect x="16" y="28" width="6" height="6" fill="var(--fc-skin)"/>
              <rect x="10" y="34" width="14" height="6" fill="var(--fc-red)"/>
              <rect x="24" y="28" width="16" height="12" fill="var(--fc-blue)"/>
              <rect x="28" y="32" width="8" height="4" fill="var(--fc-gold)"/>
              <rect x="40" y="28" width="10" height="12" fill="var(--fc-red)"/>
              <rect x="10" y="40" width="14" height="4" fill="var(--fc-gold)"/>
              <rect x="24" y="40" width="16" height="4" fill="var(--fc-gold)"/>
              <rect x="40" y="40" width="14" height="4" fill="var(--fc-gold)"/>
          </g>
          <g transform="rotate(180 32 44)">
              ${FC_CORNERS('J', 'hearts', 'var(--fc-red)')}
              <rect x="52" y="6" width="2" height="38" fill="var(--fc-gold)"/>
              <rect x="46" y="10" width="6" height="12" fill="var(--fc-steel)"/>
              <rect x="44" y="12" width="2" height="8" fill="var(--fc-steel)"/>
              <rect x="22" y="10" width="22" height="2" fill="var(--fc-black)"/>
              <rect x="24" y="6" width="18" height="4" fill="var(--fc-red)"/>
              <rect x="28" y="6" width="2" height="4" fill="var(--fc-gold)"/>
              <rect x="36" y="6" width="2" height="4" fill="var(--fc-gold)"/>
              <rect x="36" y="12" width="10" height="14" fill="var(--fc-gold)"/>
              <rect x="42" y="22" width="6" height="6" fill="var(--fc-gold)"/>
              <rect x="26" y="12" width="10" height="14" fill="var(--fc-skin)"/>
              <rect x="24" y="18" width="2" height="4" fill="var(--fc-skin)"/>
              <rect x="26" y="14" width="4" height="2" fill="var(--fc-black)"/>
              <rect x="28" y="16" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="22" y="24" width="6" height="2" fill="var(--fc-black)"/>
              <rect x="28" y="26" width="4" height="2" fill="var(--fc-black)"/>
              <rect x="14" y="24" width="6" height="4" fill="var(--fc-gold)"/>
              <rect x="16" y="28" width="6" height="6" fill="var(--fc-skin)"/>
              <rect x="10" y="34" width="14" height="6" fill="var(--fc-red)"/>
              <rect x="24" y="28" width="16" height="12" fill="var(--fc-blue)"/>
              <rect x="28" y="32" width="8" height="4" fill="var(--fc-gold)"/>
              <rect x="40" y="28" width="10" height="12" fill="var(--fc-red)"/>
              <rect x="10" y="40" width="14" height="4" fill="var(--fc-gold)"/>
              <rect x="24" y="40" width="16" height="4" fill="var(--fc-gold)"/>
              <rect x="40" y="40" width="14" height="4" fill="var(--fc-gold)"/>
          </g>
        </svg>
    `,

    // ── J♠ ───────────────────────────────────────────────────
    'j-spades': () => `
        <svg width="100%" height="100%" viewBox="0 0 64 88"
             xmlns="http://www.w3.org/2000/svg" style="display:block; shape-rendering:crispEdges; position:absolute; top:0; left:0;">
          <rect x="0" y="0" width="64" height="88" fill="var(--fc-art-bg)"/>
          <g>
              ${FC_CORNERS('J', 'spades', 'var(--fc-black)')}
              <rect x="52" y="6" width="2" height="38" fill="var(--fc-gold)"/>
              <rect x="50" y="6" width="6" height="2" fill="var(--fc-gold)"/>
              <rect x="50" y="8" width="2" height="4" fill="var(--fc-gold)"/>
              <rect x="54" y="8" width="2" height="4" fill="var(--fc-gold)"/>
              <rect x="50" y="12" width="6" height="2" fill="var(--fc-gold)"/>
              <rect x="50" y="14" width="2" height="4" fill="var(--fc-gold)"/>
              <rect x="54" y="14" width="2" height="4" fill="var(--fc-gold)"/>
              <rect x="50" y="18" width="6" height="2" fill="var(--fc-gold)"/>
              <rect x="24" y="10" width="20" height="2" fill="var(--fc-black)"/>
              <rect x="26" y="6" width="16" height="4" fill="var(--fc-red)"/>
              <rect x="30" y="6" width="2" height="4" fill="var(--fc-gold)"/>
              <rect x="36" y="6" width="2" height="4" fill="var(--fc-gold)"/>
              <rect x="20" y="12" width="6" height="14" fill="var(--fc-gold)"/>
              <rect x="18" y="22" width="6" height="6" fill="var(--fc-gold)"/>
              <rect x="26" y="12" width="16" height="14" fill="var(--fc-skin)"/>
              <rect x="42" y="18" width="2" height="4" fill="var(--fc-skin)"/>
              <rect x="34" y="14" width="4" height="2" fill="var(--fc-black)"/>
              <rect x="36" y="16" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="38" y="22" width="6" height="2" fill="var(--fc-black)"/>
              <rect x="32" y="26" width="6" height="2" fill="var(--fc-black)"/>
              <rect x="10" y="28" width="14" height="12" fill="var(--fc-blue)"/>
              <rect x="14" y="32" width="2" height="2" fill="var(--fc-card-bg)"/>
              <rect x="18" y="36" width="2" height="2" fill="var(--fc-card-bg)"/>
              <rect x="24" y="28" width="16" height="12" fill="var(--fc-red)"/>
              <rect x="24" y="32" width="16" height="4" fill="var(--fc-gold)"/>
              <rect x="40" y="28" width="10" height="12" fill="var(--fc-blue)"/>
              <rect x="44" y="28" width="6" height="6" fill="var(--fc-card-bg)"/>
              <rect x="48" y="30" width="6" height="4" fill="var(--fc-skin)"/>
              <rect x="10" y="40" width="14" height="4" fill="var(--fc-red)"/>
              <rect x="24" y="40" width="16" height="4" fill="var(--fc-gold)"/>
              <rect x="40" y="40" width="14" height="4" fill="var(--fc-red)"/>
          </g>
          <g transform="rotate(180 32 44)">
              ${FC_CORNERS('J', 'spades', 'var(--fc-black)')}
              <rect x="52" y="6" width="2" height="38" fill="var(--fc-gold)"/>
              <rect x="50" y="6" width="6" height="2" fill="var(--fc-gold)"/>
              <rect x="50" y="8" width="2" height="4" fill="var(--fc-gold)"/>
              <rect x="54" y="8" width="2" height="4" fill="var(--fc-gold)"/>
              <rect x="50" y="12" width="6" height="2" fill="var(--fc-gold)"/>
              <rect x="50" y="14" width="2" height="4" fill="var(--fc-gold)"/>
              <rect x="54" y="14" width="2" height="4" fill="var(--fc-gold)"/>
              <rect x="50" y="18" width="6" height="2" fill="var(--fc-gold)"/>
              <rect x="24" y="10" width="20" height="2" fill="var(--fc-black)"/>
              <rect x="26" y="6" width="16" height="4" fill="var(--fc-red)"/>
              <rect x="30" y="6" width="2" height="4" fill="var(--fc-gold)"/>
              <rect x="36" y="6" width="2" height="4" fill="var(--fc-gold)"/>
              <rect x="20" y="12" width="6" height="14" fill="var(--fc-gold)"/>
              <rect x="18" y="22" width="6" height="6" fill="var(--fc-gold)"/>
              <rect x="26" y="12" width="16" height="14" fill="var(--fc-skin)"/>
              <rect x="42" y="18" width="2" height="4" fill="var(--fc-skin)"/>
              <rect x="34" y="14" width="4" height="2" fill="var(--fc-black)"/>
              <rect x="36" y="16" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="38" y="22" width="6" height="2" fill="var(--fc-black)"/>
              <rect x="32" y="26" width="6" height="2" fill="var(--fc-black)"/>
              <rect x="10" y="28" width="14" height="12" fill="var(--fc-blue)"/>
              <rect x="14" y="32" width="2" height="2" fill="var(--fc-card-bg)"/>
              <rect x="18" y="36" width="2" height="2" fill="var(--fc-card-bg)"/>
              <rect x="24" y="28" width="16" height="12" fill="var(--fc-red)"/>
              <rect x="24" y="32" width="16" height="4" fill="var(--fc-gold)"/>
              <rect x="40" y="28" width="10" height="12" fill="var(--fc-blue)"/>
              <rect x="44" y="28" width="6" height="6" fill="var(--fc-card-bg)"/>
              <rect x="48" y="30" width="6" height="4" fill="var(--fc-skin)"/>
              <rect x="10" y="40" width="14" height="4" fill="var(--fc-red)"/>
              <rect x="24" y="40" width="16" height="4" fill="var(--fc-gold)"/>
              <rect x="40" y="40" width="14" height="4" fill="var(--fc-red)"/>
          </g>
        </svg>
    `,

    // ── Q♣ ───────────────────────────────────────────────────
    'q-clubs': () => `
        <svg width="100%" height="100%" viewBox="0 0 64 88"
             xmlns="http://www.w3.org/2000/svg" style="display:block; shape-rendering:crispEdges; position:absolute; top:0; left:0;">
          <rect x="0" y="0" width="64" height="88" fill="var(--fc-art-bg)"/>
          <g>
              ${FC_CORNERS('Q', 'clubs', 'var(--fc-black)')}
              <rect x="16" y="24" width="2" height="12" fill="var(--fc-steel)"/>
              <rect x="14" y="20" width="6" height="6" fill="var(--fc-gold)"/>
              <rect x="16" y="22" width="2" height="2" fill="var(--fc-red)"/>
              <rect x="24" y="6" width="16" height="4" fill="var(--fc-gold)"/>
              <rect x="26" y="4" width="2" height="2" fill="var(--fc-black)"/>
              <rect x="30" y="2" width="4" height="4" fill="var(--fc-gold)"/>
              <rect x="36" y="4" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="36" y="10" width="8" height="20" fill="var(--fc-black)"/>
              <rect x="36" y="14" width="4" height="16" fill="var(--fc-steel)"/>
              <rect x="24" y="10" width="12" height="16" fill="var(--fc-skin)"/>
              <rect x="26" y="14" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="32" y="14" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="24" y="22" width="4" height="2" fill="var(--fc-red)"/>
              <rect x="20" y="26" width="24" height="4" fill="var(--fc-steel)"/>
              <rect x="22" y="28" width="20" height="2" fill="var(--fc-black)"/>
              <rect x="10" y="30" width="16" height="14" fill="var(--fc-gold)"/>
              <rect x="12" y="34" width="8" height="6" fill="var(--fc-red)"/>
              <rect x="26" y="30" width="12" height="14" fill="var(--fc-red)"/>
              <rect x="30" y="30" width="4" height="14" fill="var(--fc-gold)"/>
              <rect x="38" y="30" width="14" height="14" fill="var(--fc-gold)"/>
              <rect x="42" y="34" width="8" height="6" fill="var(--fc-red)"/>
              <rect x="18" y="28" width="6" height="6" fill="var(--fc-skin)"/>
          </g>
          <g transform="rotate(180 32 44)">
              ${FC_CORNERS('Q', 'clubs', 'var(--fc-black)')}
              <rect x="16" y="24" width="2" height="12" fill="var(--fc-steel)"/>
              <rect x="14" y="20" width="6" height="6" fill="var(--fc-gold)"/>
              <rect x="16" y="22" width="2" height="2" fill="var(--fc-red)"/>
              <rect x="24" y="6" width="16" height="4" fill="var(--fc-gold)"/>
              <rect x="26" y="4" width="2" height="2" fill="var(--fc-black)"/>
              <rect x="30" y="2" width="4" height="4" fill="var(--fc-gold)"/>
              <rect x="36" y="4" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="36" y="10" width="8" height="20" fill="var(--fc-black)"/>
              <rect x="36" y="14" width="4" height="16" fill="var(--fc-steel)"/>
              <rect x="24" y="10" width="12" height="16" fill="var(--fc-skin)"/>
              <rect x="26" y="14" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="32" y="14" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="24" y="22" width="4" height="2" fill="var(--fc-red)"/>
              <rect x="20" y="26" width="24" height="4" fill="var(--fc-steel)"/>
              <rect x="22" y="28" width="20" height="2" fill="var(--fc-black)"/>
              <rect x="10" y="30" width="16" height="14" fill="var(--fc-gold)"/>
              <rect x="12" y="34" width="8" height="6" fill="var(--fc-red)"/>
              <rect x="26" y="30" width="12" height="14" fill="var(--fc-red)"/>
              <rect x="30" y="30" width="4" height="14" fill="var(--fc-gold)"/>
              <rect x="38" y="30" width="14" height="14" fill="var(--fc-gold)"/>
              <rect x="42" y="34" width="8" height="6" fill="var(--fc-red)"/>
              <rect x="18" y="28" width="6" height="6" fill="var(--fc-skin)"/>
          </g>
        </svg>
    `,

    // ── Q♦ ───────────────────────────────────────────────────
    'q-diamonds': () => `
        <svg width="100%" height="100%" viewBox="0 0 64 88"
             xmlns="http://www.w3.org/2000/svg" style="display:block; shape-rendering:crispEdges; position:absolute; top:0; left:0;">
          <rect x="0" y="0" width="64" height="88" fill="var(--fc-art-bg)"/>
          <g>
              ${FC_CORNERS('Q', 'diamonds', 'var(--fc-red)')}
              <rect x="18" y="24" width="2" height="12" fill="var(--fc-steel)"/>
              <rect x="16" y="20" width="6" height="6" fill="var(--fc-blue)"/>
              <rect x="18" y="22" width="2" height="2" fill="var(--fc-gold)"/>
              <rect x="24" y="6" width="16" height="4" fill="var(--fc-gold)"/>
              <rect x="26" y="4" width="2" height="2" fill="var(--fc-red)"/>
              <rect x="30" y="2" width="4" height="4" fill="var(--fc-gold)"/>
              <rect x="36" y="4" width="2" height="2" fill="var(--fc-red)"/>
              <rect x="36" y="10" width="8" height="20" fill="var(--fc-blue)"/>
              <rect x="36" y="14" width="4" height="16" fill="var(--fc-steel)"/>
              <rect x="24" y="10" width="12" height="16" fill="var(--fc-skin)"/>
              <rect x="26" y="14" width="2" height="2" fill="var(--fc-black)"/>
              <rect x="32" y="14" width="2" height="2" fill="var(--fc-black)"/>
              <rect x="24" y="22" width="4" height="2" fill="var(--fc-red)"/>
              <rect x="20" y="26" width="24" height="4" fill="var(--fc-gold)"/>
              <rect x="22" y="28" width="20" height="2" fill="var(--fc-red)"/>
              <rect x="12" y="30" width="14" height="14" fill="var(--fc-blue)"/>
              <rect x="14" y="34" width="6" height="6" fill="var(--fc-gold)"/>
              <rect x="26" y="30" width="12" height="14" fill="var(--fc-red)"/>
              <rect x="30" y="30" width="4" height="14" fill="var(--fc-gold)"/>
              <rect x="38" y="30" width="14" height="14" fill="var(--fc-blue)"/>
              <rect x="42" y="34" width="8" height="6" fill="var(--fc-gold)"/>
              <rect x="20" y="28" width="6" height="6" fill="var(--fc-skin)"/>
          </g>
          <g transform="rotate(180 32 44)">
              ${FC_CORNERS('Q', 'diamonds', 'var(--fc-red)')}
              <rect x="18" y="24" width="2" height="12" fill="var(--fc-steel)"/>
              <rect x="16" y="20" width="6" height="6" fill="var(--fc-blue)"/>
              <rect x="18" y="22" width="2" height="2" fill="var(--fc-gold)"/>
              <rect x="24" y="6" width="16" height="4" fill="var(--fc-gold)"/>
              <rect x="26" y="4" width="2" height="2" fill="var(--fc-red)"/>
              <rect x="30" y="2" width="4" height="4" fill="var(--fc-gold)"/>
              <rect x="36" y="4" width="2" height="2" fill="var(--fc-red)"/>
              <rect x="36" y="10" width="8" height="20" fill="var(--fc-blue)"/>
              <rect x="36" y="14" width="4" height="16" fill="var(--fc-steel)"/>
              <rect x="24" y="10" width="12" height="16" fill="var(--fc-skin)"/>
              <rect x="26" y="14" width="2" height="2" fill="var(--fc-black)"/>
              <rect x="32" y="14" width="2" height="2" fill="var(--fc-black)"/>
              <rect x="24" y="22" width="4" height="2" fill="var(--fc-red)"/>
              <rect x="20" y="26" width="24" height="4" fill="var(--fc-gold)"/>
              <rect x="22" y="28" width="20" height="2" fill="var(--fc-red)"/>
              <rect x="12" y="30" width="14" height="14" fill="var(--fc-blue)"/>
              <rect x="14" y="34" width="6" height="6" fill="var(--fc-gold)"/>
              <rect x="26" y="30" width="12" height="14" fill="var(--fc-red)"/>
              <rect x="30" y="30" width="4" height="14" fill="var(--fc-gold)"/>
              <rect x="38" y="30" width="14" height="14" fill="var(--fc-blue)"/>
              <rect x="42" y="34" width="8" height="6" fill="var(--fc-gold)"/>
              <rect x="20" y="28" width="6" height="6" fill="var(--fc-skin)"/>
          </g>
        </svg>
    `,

    // ── Q♥ ───────────────────────────────────────────────────
    'q-hearts': () => `
        <svg width="100%" height="100%" viewBox="0 0 64 88"
             xmlns="http://www.w3.org/2000/svg" style="display:block; shape-rendering:crispEdges; position:absolute; top:0; left:0;">
          <rect x="0" y="0" width="64" height="88" fill="var(--fc-art-bg)"/>
          <g>
              ${FC_CORNERS('Q', 'hearts', 'var(--fc-red)')}
              <rect x="16" y="24" width="2" height="12" fill="var(--fc-steel)"/>
              <rect x="14" y="20" width="6" height="6" fill="var(--fc-red)"/>
              <rect x="16" y="22" width="2" height="2" fill="var(--fc-gold)"/>
              <rect x="24" y="6" width="16" height="4" fill="var(--fc-gold)"/>
              <rect x="26" y="4" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="30" y="2" width="4" height="4" fill="var(--fc-gold)"/>
              <rect x="36" y="4" width="2" height="2" fill="var(--fc-red)"/>
              <rect x="36" y="10" width="8" height="20" fill="var(--fc-gold)"/>
              <rect x="36" y="14" width="4" height="16" fill="var(--fc-red)"/>
              <rect x="24" y="10" width="12" height="16" fill="var(--fc-skin)"/>
              <rect x="26" y="14" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="32" y="14" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="24" y="22" width="4" height="2" fill="var(--fc-red)"/>
              <rect x="20" y="26" width="24" height="4" fill="var(--fc-gold)"/>
              <rect x="22" y="28" width="20" height="2" fill="var(--fc-blue)"/>
              <rect x="10" y="30" width="16" height="14" fill="var(--fc-red)"/>
              <rect x="12" y="34" width="8" height="6" fill="var(--fc-gold)"/>
              <rect x="26" y="30" width="12" height="14" fill="var(--fc-blue)"/>
              <rect x="30" y="30" width="4" height="14" fill="var(--fc-gold)"/>
              <rect x="38" y="30" width="14" height="14" fill="var(--fc-red)"/>
              <rect x="42" y="34" width="8" height="6" fill="var(--fc-gold)"/>
              <rect x="18" y="28" width="6" height="6" fill="var(--fc-skin)"/>
          </g>
          <g transform="rotate(180 32 44)">
              ${FC_CORNERS('Q', 'hearts', 'var(--fc-red)')}
              <rect x="16" y="24" width="2" height="12" fill="var(--fc-steel)"/>
              <rect x="14" y="20" width="6" height="6" fill="var(--fc-red)"/>
              <rect x="16" y="22" width="2" height="2" fill="var(--fc-gold)"/>
              <rect x="24" y="6" width="16" height="4" fill="var(--fc-gold)"/>
              <rect x="26" y="4" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="30" y="2" width="4" height="4" fill="var(--fc-gold)"/>
              <rect x="36" y="4" width="2" height="2" fill="var(--fc-red)"/>
              <rect x="36" y="10" width="8" height="20" fill="var(--fc-gold)"/>
              <rect x="36" y="14" width="4" height="16" fill="var(--fc-red)"/>
              <rect x="24" y="10" width="12" height="16" fill="var(--fc-skin)"/>
              <rect x="26" y="14" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="32" y="14" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="24" y="22" width="4" height="2" fill="var(--fc-red)"/>
              <rect x="20" y="26" width="24" height="4" fill="var(--fc-gold)"/>
              <rect x="22" y="28" width="20" height="2" fill="var(--fc-blue)"/>
              <rect x="10" y="30" width="16" height="14" fill="var(--fc-red)"/>
              <rect x="12" y="34" width="8" height="6" fill="var(--fc-gold)"/>
              <rect x="26" y="30" width="12" height="14" fill="var(--fc-blue)"/>
              <rect x="30" y="30" width="4" height="14" fill="var(--fc-gold)"/>
              <rect x="38" y="30" width="14" height="14" fill="var(--fc-red)"/>
              <rect x="42" y="34" width="8" height="6" fill="var(--fc-gold)"/>
              <rect x="18" y="28" width="6" height="6" fill="var(--fc-skin)"/>
          </g>
        </svg>
    `,

    // ── Q♠ ───────────────────────────────────────────────────
    'q-spades': () => `
        <svg width="100%" height="100%" viewBox="0 0 64 88"
             xmlns="http://www.w3.org/2000/svg" style="display:block; shape-rendering:crispEdges; position:absolute; top:0; left:0;">
          <rect x="0" y="0" width="64" height="88" fill="var(--fc-art-bg)"/>
          <g>
              ${FC_CORNERS('Q', 'spades', 'var(--fc-black)')}
              <rect x="50" y="8" width="2" height="22" fill="var(--fc-gold)"/>
              <rect x="48" y="4" width="6" height="6" fill="var(--fc-blue)"/>
              <rect x="50" y="4" width="2" height="2" fill="var(--fc-gold)"/>
              <rect x="22" y="6" width="16" height="4" fill="var(--fc-gold)"/>
              <rect x="24" y="4" width="2" height="2" fill="var(--fc-red)"/>
              <rect x="28" y="2" width="4" height="4" fill="var(--fc-gold)"/>
              <rect x="34" y="4" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="20" y="10" width="8" height="20" fill="var(--fc-black)"/>
              <rect x="24" y="14" width="4" height="16" fill="var(--fc-steel)"/>
              <rect x="28" y="10" width="12" height="16" fill="var(--fc-skin)"/>
              <rect x="32" y="14" width="2" height="2" fill="var(--fc-black)"/>
              <rect x="38" y="14" width="2" height="2" fill="var(--fc-black)"/>
              <rect x="36" y="22" width="4" height="2" fill="var(--fc-red)"/>
              <rect x="18" y="26" width="26" height="4" fill="var(--fc-gold)"/>
              <rect x="22" y="28" width="18" height="2" fill="var(--fc-red)"/>
              <rect x="12" y="30" width="16" height="14" fill="var(--fc-blue)"/>
              <rect x="16" y="34" width="8" height="6" fill="var(--fc-gold)"/>
              <rect x="28" y="30" width="12" height="14" fill="var(--fc-red)"/>
              <rect x="32" y="30" width="4" height="14" fill="var(--fc-gold)"/>
              <rect x="40" y="30" width="12" height="14" fill="var(--fc-blue)"/>
              <rect x="42" y="34" width="8" height="6" fill="var(--fc-gold)"/>
              <rect x="48" y="26" width="6" height="6" fill="var(--fc-skin)"/>
          </g>
          <g transform="rotate(180 32 44)">
              ${FC_CORNERS('Q', 'spades', 'var(--fc-black)')}
              <rect x="50" y="8" width="2" height="22" fill="var(--fc-gold)"/>
              <rect x="48" y="4" width="6" height="6" fill="var(--fc-blue)"/>
              <rect x="50" y="4" width="2" height="2" fill="var(--fc-gold)"/>
              <rect x="22" y="6" width="16" height="4" fill="var(--fc-gold)"/>
              <rect x="24" y="4" width="2" height="2" fill="var(--fc-red)"/>
              <rect x="28" y="2" width="4" height="4" fill="var(--fc-gold)"/>
              <rect x="34" y="4" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="20" y="10" width="8" height="20" fill="var(--fc-black)"/>
              <rect x="24" y="14" width="4" height="16" fill="var(--fc-steel)"/>
              <rect x="28" y="10" width="12" height="16" fill="var(--fc-skin)"/>
              <rect x="32" y="14" width="2" height="2" fill="var(--fc-black)"/>
              <rect x="38" y="14" width="2" height="2" fill="var(--fc-black)"/>
              <rect x="36" y="22" width="4" height="2" fill="var(--fc-red)"/>
              <rect x="18" y="26" width="26" height="4" fill="var(--fc-gold)"/>
              <rect x="22" y="28" width="18" height="2" fill="var(--fc-red)"/>
              <rect x="12" y="30" width="16" height="14" fill="var(--fc-blue)"/>
              <rect x="16" y="34" width="8" height="6" fill="var(--fc-gold)"/>
              <rect x="28" y="30" width="12" height="14" fill="var(--fc-red)"/>
              <rect x="32" y="30" width="4" height="14" fill="var(--fc-gold)"/>
              <rect x="40" y="30" width="12" height="14" fill="var(--fc-blue)"/>
              <rect x="42" y="34" width="8" height="6" fill="var(--fc-gold)"/>
              <rect x="48" y="26" width="6" height="6" fill="var(--fc-skin)"/>
          </g>
        </svg>
    `,

    // ── K♣ ───────────────────────────────────────────────────
    'k-clubs': () => `
        <svg width="100%" height="100%" viewBox="0 0 64 88"
             xmlns="http://www.w3.org/2000/svg" style="display:block; shape-rendering:crispEdges; position:absolute; top:0; left:0;">
          <rect x="0" y="0" width="64" height="88" fill="var(--fc-art-bg)"/>
          <g>
              ${FC_CORNERS('K', 'clubs', 'var(--fc-black)')}
              <rect x="48" y="4" width="4" height="26" fill="var(--fc-steel)"/>
              <rect x="50" y="4" width="2" height="26" fill="var(--fc-art-bg)"/>
              <rect x="46" y="30" width="10" height="2" fill="var(--fc-gold)"/>
              <rect x="48" y="32" width="4" height="6" fill="var(--fc-black)"/>
              <rect x="12" y="24" width="8" height="8" fill="var(--fc-gold)"/>
              <rect x="16" y="20" width="2" height="4" fill="var(--fc-gold)"/>
              <rect x="14" y="22" width="6" height="2" fill="var(--fc-gold)"/>
              <rect x="14" y="28" width="4" height="2" fill="var(--fc-red)"/>
              <rect x="24" y="6" width="16" height="4" fill="var(--fc-gold)"/>
              <rect x="26" y="4" width="4" height="2" fill="var(--fc-red)"/>
              <rect x="34" y="4" width="4" height="2" fill="var(--fc-blue)"/>
              <rect x="22" y="10" width="4" height="16" fill="var(--fc-steel)"/>
              <rect x="38" y="10" width="4" height="16" fill="var(--fc-steel)"/>
              <rect x="26" y="10" width="12" height="16" fill="var(--fc-skin)"/>
              <rect x="28" y="14" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="34" y="14" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="28" y="22" width="6" height="2" fill="var(--fc-black)"/>
              <rect x="20" y="26" width="24" height="4" fill="var(--fc-blue)"/>
              <rect x="10" y="30" width="14" height="14" fill="var(--fc-gold)"/>
              <rect x="14" y="34" width="6" height="6" fill="var(--fc-black)"/>
              <rect x="24" y="30" width="14" height="14" fill="var(--fc-red)"/>
              <rect x="28" y="30" width="6" height="14" fill="var(--fc-gold)"/>
              <rect x="38" y="30" width="12" height="14" fill="var(--fc-blue)"/>
              <rect x="40" y="34" width="6" height="6" fill="var(--fc-gold)"/>
              <rect x="46" y="34" width="6" height="6" fill="var(--fc-skin)"/>
          </g>
          <g transform="rotate(180 32 44)">
              ${FC_CORNERS('K', 'clubs', 'var(--fc-black)')}
              <rect x="48" y="4" width="4" height="26" fill="var(--fc-steel)"/>
              <rect x="50" y="4" width="2" height="26" fill="var(--fc-art-bg)"/>
              <rect x="46" y="30" width="10" height="2" fill="var(--fc-gold)"/>
              <rect x="48" y="32" width="4" height="6" fill="var(--fc-black)"/>
              <rect x="12" y="24" width="8" height="8" fill="var(--fc-gold)"/>
              <rect x="16" y="20" width="2" height="4" fill="var(--fc-gold)"/>
              <rect x="14" y="22" width="6" height="2" fill="var(--fc-gold)"/>
              <rect x="14" y="28" width="4" height="2" fill="var(--fc-red)"/>
              <rect x="24" y="6" width="16" height="4" fill="var(--fc-gold)"/>
              <rect x="26" y="4" width="4" height="2" fill="var(--fc-red)"/>
              <rect x="34" y="4" width="4" height="2" fill="var(--fc-blue)"/>
              <rect x="22" y="10" width="4" height="16" fill="var(--fc-steel)"/>
              <rect x="38" y="10" width="4" height="16" fill="var(--fc-steel)"/>
              <rect x="26" y="10" width="12" height="16" fill="var(--fc-skin)"/>
              <rect x="28" y="14" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="34" y="14" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="28" y="22" width="6" height="2" fill="var(--fc-black)"/>
              <rect x="20" y="26" width="24" height="4" fill="var(--fc-blue)"/>
              <rect x="10" y="30" width="14" height="14" fill="var(--fc-gold)"/>
              <rect x="14" y="34" width="6" height="6" fill="var(--fc-black)"/>
              <rect x="24" y="30" width="14" height="14" fill="var(--fc-red)"/>
              <rect x="28" y="30" width="6" height="14" fill="var(--fc-gold)"/>
              <rect x="38" y="30" width="12" height="14" fill="var(--fc-blue)"/>
              <rect x="40" y="34" width="6" height="6" fill="var(--fc-gold)"/>
              <rect x="46" y="34" width="6" height="6" fill="var(--fc-skin)"/>
          </g>
        </svg>
    `,

    // ── K♦ ───────────────────────────────────────────────────
    'k-diamonds': () => `
        <svg width="100%" height="100%" viewBox="0 0 64 88"
             xmlns="http://www.w3.org/2000/svg" style="display:block; shape-rendering:crispEdges; position:absolute; top:0; left:0;">
          <rect x="0" y="0" width="64" height="88" fill="var(--fc-art-bg)"/>
          <g>
              ${FC_CORNERS('K', 'diamonds', 'var(--fc-red)')}
              <rect x="46" y="4" width="2" height="36" fill="var(--fc-gold)"/>
              <rect x="48" y="8" width="6" height="12" fill="var(--fc-steel)"/>
              <rect x="54" y="6" width="2" height="16" fill="var(--fc-steel)"/>
              <rect x="50" y="10" width="2" height="8" fill="var(--fc-art-bg)"/>
              <rect x="24" y="6" width="14" height="4" fill="var(--fc-gold)"/>
              <rect x="26" y="4" width="4" height="2" fill="var(--fc-red)"/>
              <rect x="34" y="4" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="34" y="10" width="8" height="16" fill="var(--fc-steel)"/>
              <rect x="22" y="10" width="12" height="16" fill="var(--fc-skin)"/>
              <rect x="20" y="14" width="2" height="4" fill="var(--fc-skin)"/>
              <rect x="24" y="14" width="2" height="2" fill="var(--fc-black)"/>
              <rect x="20" y="22" width="6" height="2" fill="var(--fc-black)"/>
              <rect x="18" y="26" width="26" height="4" fill="var(--fc-gold)"/>
              <rect x="22" y="28" width="18" height="2" fill="var(--fc-red)"/>
              <rect x="12" y="30" width="18" height="14" fill="var(--fc-blue)"/>
              <rect x="16" y="34" width="6" height="6" fill="var(--fc-gold)"/>
              <rect x="30" y="30" width="14" height="14" fill="var(--fc-red)"/>
              <rect x="34" y="34" width="6" height="6" fill="var(--fc-black)"/>
              <rect x="44" y="28" width="6" height="6" fill="var(--fc-skin)"/>
          </g>
          <g transform="rotate(180 32 44)">
              ${FC_CORNERS('K', 'diamonds', 'var(--fc-red)')}
              <rect x="46" y="4" width="2" height="36" fill="var(--fc-gold)"/>
              <rect x="48" y="8" width="6" height="12" fill="var(--fc-steel)"/>
              <rect x="54" y="6" width="2" height="16" fill="var(--fc-steel)"/>
              <rect x="50" y="10" width="2" height="8" fill="var(--fc-art-bg)"/>
              <rect x="24" y="6" width="14" height="4" fill="var(--fc-gold)"/>
              <rect x="26" y="4" width="4" height="2" fill="var(--fc-red)"/>
              <rect x="34" y="4" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="34" y="10" width="8" height="16" fill="var(--fc-steel)"/>
              <rect x="22" y="10" width="12" height="16" fill="var(--fc-skin)"/>
              <rect x="20" y="14" width="2" height="4" fill="var(--fc-skin)"/>
              <rect x="24" y="14" width="2" height="2" fill="var(--fc-black)"/>
              <rect x="20" y="22" width="6" height="2" fill="var(--fc-black)"/>
              <rect x="18" y="26" width="26" height="4" fill="var(--fc-gold)"/>
              <rect x="22" y="28" width="18" height="2" fill="var(--fc-red)"/>
              <rect x="12" y="30" width="18" height="14" fill="var(--fc-blue)"/>
              <rect x="16" y="34" width="6" height="6" fill="var(--fc-gold)"/>
              <rect x="30" y="30" width="14" height="14" fill="var(--fc-red)"/>
              <rect x="34" y="34" width="6" height="6" fill="var(--fc-black)"/>
              <rect x="44" y="28" width="6" height="6" fill="var(--fc-skin)"/>
          </g>
        </svg>
    `,

    // ── K♥ ───────────────────────────────────────────────────
    'k-hearts': () => `
        <svg width="100%" height="100%" viewBox="0 0 64 88"
             xmlns="http://www.w3.org/2000/svg" style="display:block; shape-rendering:crispEdges; position:absolute; top:0; left:0;">
          <rect x="0" y="0" width="64" height="88" fill="var(--fc-art-bg)"/>
          <g>
              ${FC_CORNERS('K', 'hearts', 'var(--fc-red)')}
              <rect x="22" y="12" width="22" height="4" fill="var(--fc-steel)"/>
              <rect x="40" y="10" width="10" height="2" fill="var(--fc-gold)"/>
              <rect x="44" y="4" width="2" height="6" fill="var(--fc-black)"/>
              <rect x="42" y="2" width="6" height="2" fill="var(--fc-gold)"/>
              <rect x="26" y="6" width="12" height="4" fill="var(--fc-gold)"/>
              <rect x="28" y="4" width="8" height="2" fill="var(--fc-red)"/>
              <rect x="24" y="10" width="2" height="16" fill="var(--fc-steel)"/>
              <rect x="38" y="10" width="4" height="16" fill="var(--fc-steel)"/>
              <rect x="26" y="10" width="12" height="16" fill="var(--fc-skin)"/>
              <rect x="28" y="14" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="34" y="14" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="26" y="22" width="6" height="2" fill="var(--fc-black)"/>
              <rect x="42" y="6" width="6" height="6" fill="var(--fc-skin)"/>
              <rect x="14" y="26" width="30" height="4" fill="var(--fc-gold)"/>
              <rect x="12" y="30" width="16" height="14" fill="var(--fc-red)"/>
              <rect x="16" y="32" width="8" height="8" fill="var(--fc-black)"/>
              <rect x="28" y="30" width="16" height="14" fill="var(--fc-blue)"/>
              <rect x="32" y="32" width="8" height="8" fill="var(--fc-gold)"/>
          </g>
          <g transform="rotate(180 32 44)">
              ${FC_CORNERS('K', 'hearts', 'var(--fc-red)')}
              <rect x="22" y="12" width="22" height="4" fill="var(--fc-steel)"/>
              <rect x="40" y="10" width="10" height="2" fill="var(--fc-gold)"/>
              <rect x="44" y="4" width="2" height="6" fill="var(--fc-black)"/>
              <rect x="42" y="2" width="6" height="2" fill="var(--fc-gold)"/>
              <rect x="26" y="6" width="12" height="4" fill="var(--fc-gold)"/>
              <rect x="28" y="4" width="8" height="2" fill="var(--fc-red)"/>
              <rect x="24" y="10" width="2" height="16" fill="var(--fc-steel)"/>
              <rect x="38" y="10" width="4" height="16" fill="var(--fc-steel)"/>
              <rect x="26" y="10" width="12" height="16" fill="var(--fc-skin)"/>
              <rect x="28" y="14" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="34" y="14" width="2" height="2" fill="var(--fc-blue)"/>
              <rect x="26" y="22" width="6" height="2" fill="var(--fc-black)"/>
              <rect x="42" y="6" width="6" height="6" fill="var(--fc-skin)"/>
              <rect x="14" y="26" width="30" height="4" fill="var(--fc-gold)"/>
              <rect x="12" y="30" width="16" height="14" fill="var(--fc-red)"/>
              <rect x="16" y="32" width="8" height="8" fill="var(--fc-black)"/>
              <rect x="28" y="30" width="16" height="14" fill="var(--fc-blue)"/>
              <rect x="32" y="32" width="8" height="8" fill="var(--fc-gold)"/>
          </g>
        </svg>
    `,

    // ── K♠ ───────────────────────────────────────────────────
    'k-spades': () => `
        <svg width="100%" height="100%" viewBox="0 0 64 88"
             xmlns="http://www.w3.org/2000/svg" style="display:block; shape-rendering:crispEdges; position:absolute; top:0; left:0;">
          <rect x="0" y="0" width="64" height="88" fill="var(--fc-art-bg)"/>
          <g>
              ${FC_CORNERS('K', 'spades', 'var(--fc-black)')}
              <rect x="48" y="4" width="6" height="26" fill="var(--fc-steel)"/>
              <rect x="50" y="4" width="2" height="26" fill="var(--fc-card-bg)"/>
              <rect x="46" y="30" width="10" height="2" fill="var(--fc-gold)"/>
              <rect x="48" y="32" width="4" height="6" fill="var(--fc-black)"/>
              <rect x="46" y="38" width="8" height="2" fill="var(--fc-gold)"/>
              <rect x="22" y="6" width="18" height="4" fill="var(--fc-gold)"/>
              <rect x="24" y="4" width="4" height="2" fill="var(--fc-red)"/>
              <rect x="30" y="4" width="4" height="2" fill="var(--fc-blue)"/>
              <rect x="36" y="4" width="2" height="2" fill="var(--fc-red)"/>
              <rect x="20" y="10" width="6" height="18" fill="var(--fc-steel)"/>
              <rect x="38" y="10" width="6" height="18" fill="var(--fc-steel)"/>
              <rect x="26" y="10" width="12" height="16" fill="var(--fc-skin)"/>
              <rect x="30" y="14" width="2" height="2" fill="var(--fc-black)"/>
              <rect x="36" y="14" width="2" height="2" fill="var(--fc-black)"/>
              <rect x="34" y="16" width="2" height="4" fill="var(--fc-skin)"/>
              <rect x="34" y="22" width="4" height="2" fill="var(--fc-black)"/>
              <rect x="12" y="26" width="32" height="4" fill="var(--fc-blue)"/>
              <rect x="16" y="28" width="24" height="2" fill="var(--fc-gold)"/>
              <rect x="10" y="30" width="14" height="14" fill="var(--fc-red)"/>
              <rect x="14" y="34" width="6" height="6" fill="var(--fc-black)"/>
              <rect x="24" y="30" width="14" height="14" fill="var(--fc-gold)"/>
              <rect x="28" y="30" width="6" height="14" fill="var(--fc-blue)"/>
              <rect x="38" y="30" width="12" height="14" fill="var(--fc-red)"/>
              <rect x="40" y="34" width="6" height="6" fill="var(--fc-black)"/>
              <rect x="46" y="34" width="6" height="6" fill="var(--fc-skin)"/>
          </g>
          <g transform="rotate(180 32 44)">
              ${FC_CORNERS('K', 'spades', 'var(--fc-black)')}
              <rect x="48" y="4" width="6" height="26" fill="var(--fc-steel)"/>
              <rect x="50" y="4" width="2" height="26" fill="var(--fc-card-bg)"/>
              <rect x="46" y="30" width="10" height="2" fill="var(--fc-gold)"/>
              <rect x="48" y="32" width="4" height="6" fill="var(--fc-black)"/>
              <rect x="46" y="38" width="8" height="2" fill="var(--fc-gold)"/>
              <rect x="22" y="6" width="18" height="4" fill="var(--fc-gold)"/>
              <rect x="24" y="4" width="4" height="2" fill="var(--fc-red)"/>
              <rect x="30" y="4" width="4" height="2" fill="var(--fc-blue)"/>
              <rect x="36" y="4" width="2" height="2" fill="var(--fc-red)"/>
              <rect x="20" y="10" width="6" height="18" fill="var(--fc-steel)"/>
              <rect x="38" y="10" width="6" height="18" fill="var(--fc-steel)"/>
              <rect x="26" y="10" width="12" height="16" fill="var(--fc-skin)"/>
              <rect x="30" y="14" width="2" height="2" fill="var(--fc-black)"/>
              <rect x="36" y="14" width="2" height="2" fill="var(--fc-black)"/>
              <rect x="34" y="16" width="2" height="4" fill="var(--fc-skin)"/>
              <rect x="34" y="22" width="4" height="2" fill="var(--fc-black)"/>
              <rect x="12" y="26" width="32" height="4" fill="var(--fc-blue)"/>
              <rect x="16" y="28" width="24" height="2" fill="var(--fc-gold)"/>
              <rect x="10" y="30" width="14" height="14" fill="var(--fc-red)"/>
              <rect x="14" y="34" width="6" height="6" fill="var(--fc-black)"/>
              <rect x="24" y="30" width="14" height="14" fill="var(--fc-gold)"/>
              <rect x="28" y="30" width="6" height="14" fill="var(--fc-blue)"/>
              <rect x="38" y="30" width="12" height="14" fill="var(--fc-red)"/>
              <rect x="40" y="34" width="6" height="6" fill="var(--fc-black)"/>
              <rect x="46" y="34" width="6" height="6" fill="var(--fc-skin)"/>
          </g>
        </svg>
    `,
};
