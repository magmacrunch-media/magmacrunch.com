// tarot-cards.js — French Tarot | MagmaCrunch Media © 2026
// SVG rendering for 78-card Tarot deck
// MVP: Trumps show numbers, suited cards use pip layouts, Cavalier has pixel art

// ── Trump card rendering (1-21) ───────────────────────────
// MVP: Large centered number with "ATOUT" label
function getTrumpHTML(number) {
    const isOudler = OUDLERS.includes(number);
    const bgColor = isOudler ? '#1a0a2a' : '#0d0028';
    const borderColor = isOudler ? '#ffd700' : '#4a107a';
    const textColor = isOudler ? '#ffd700' : '#00e5ff';
    const glowColor = isOudler ? 'rgba(255,215,0,0.5)' : 'rgba(0,229,255,0.3)';

    return `
    <div class="card-corner top-left">
        <div class="corner-rank" style="color: ${textColor}">${number}</div>
        <div class="corner-suit" style="color: ${textColor}; font-size: 6px;">T</div>
    </div>
    <div class="trump-center" style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
    ">
        <div style="
            font-family: 'Press Start 2P', monospace;
            font-size: ${number >= 10 ? '28px' : '36px'};
            color: ${textColor};
            text-shadow: 0 0 10px ${glowColor}, 0 0 20px ${glowColor};
            line-height: 1;
        ">${number}</div>
        <div style="
            font-family: 'Press Start 2P', monospace;
            font-size: 6px;
            color: ${textColor};
            opacity: 0.7;
            margin-top: 8px;
            letter-spacing: 0.1em;
        ">ATOUT</div>
    </div>
    <div class="card-corner bottom-right">
        <div class="corner-rank" style="color: ${textColor}">${number}</div>
        <div class="corner-suit" style="color: ${textColor}; font-size: 6px;">T</div>
    </div>`;
}

// ── Excuse (Fool) card rendering ──────────────────────────
function getExcuseHTML() {
    return `
    <div class="card-corner top-left">
        <div class="corner-rank" style="color: #ff2d78; font-size: 10px;">★</div>
        <div class="corner-suit" style="color: #ff2d78; font-size: 6px;">EXC</div>
    </div>
    <div class="excuse-center" style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
    ">
        <div style="
            font-size: 42px;
            line-height: 1;
        ">🃏</div>
        <div style="
            font-family: 'Press Start 2P', monospace;
            font-size: 7px;
            color: #ff2d78;
            text-shadow: 0 0 8px rgba(255,45,120,0.5);
            margin-top: 6px;
            letter-spacing: 0.1em;
        ">EXCUSE</div>
    </div>
    <div class="card-corner bottom-right">
        <div class="corner-rank" style="color: #ff2d78; font-size: 10px;">★</div>
        <div class="corner-suit" style="color: #ff2d78; font-size: 6px;">EXC</div>
    </div>`;
}

// ── Suited card rendering ─────────────────────────────────
// Number cards: pip layout. Court cards: pixel art SVG.

function getSuitedCardHTML(suit, rank) {
    const symbol = TAROT_SUIT_SYMBOLS[suit];
    const color = TAROT_SUIT_COLORS[suit];
    const fillColor = color === 'red' ? '#cc0000' : '#111111';

    // Court cards
    if (rank === 'V' || rank === 'C' || rank === 'D' || rank === 'R') {
        return getCourtCardHTML(suit, rank, fillColor);
    }

    // Number cards (1-10)
    return getNumberCardHTML(suit, rank, symbol, fillColor);
}

// ── Number card with pip layout ───────────────────────────
function getNumberCardHTML(suit, rank, symbol, fillColor) {
    const numPips = parseInt(rank);
    const pipPositions = getPipPositions(numPips);

    let pipsHTML = '';
    for (const pos of pipPositions) {
        const rotation = pos.inverted ? 'transform: rotate(180deg);' : '';
        pipsHTML += `<span class="pip" style="
            position: absolute;
            left: ${pos.x}%;
            top: ${pos.y}%;
            transform: translate(-50%, -50%) ${pos.inverted ? 'rotate(180deg)' : ''};
            font-size: 16px;
            color: ${fillColor};
        ">${symbol}</span>`;
    }

    return `
    <div class="card-corner top-left">
        <div class="corner-rank" style="color: ${fillColor}">${rank}</div>
        <div class="corner-suit" style="color: ${fillColor}">${symbol}</div>
    </div>
    <div class="card-pips" style="
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    ">
        ${pipsHTML}
    </div>
    <div class="card-corner bottom-right">
        <div class="corner-rank" style="color: ${fillColor}">${rank}</div>
        <div class="corner-suit" style="color: ${fillColor}">${symbol}</div>
    </div>`;
}

// Pip positions for number cards (1-10)
function getPipPositions(count) {
    const positions = {
        1: [{ x: 50, y: 50 }],
        2: [{ x: 50, y: 25 }, { x: 50, y: 75, inverted: true }],
        3: [{ x: 50, y: 25 }, { x: 50, y: 50 }, { x: 50, y: 75, inverted: true }],
        4: [{ x: 35, y: 25 }, { x: 65, y: 25 }, { x: 35, y: 75, inverted: true }, { x: 65, y: 75, inverted: true }],
        5: [{ x: 35, y: 25 }, { x: 65, y: 25 }, { x: 50, y: 50 }, { x: 35, y: 75, inverted: true }, { x: 65, y: 75, inverted: true }],
        6: [{ x: 35, y: 25 }, { x: 65, y: 25 }, { x: 35, y: 50 }, { x: 65, y: 50 }, { x: 35, y: 75, inverted: true }, { x: 65, y: 75, inverted: true }],
        7: [{ x: 35, y: 20 }, { x: 65, y: 20 }, { x: 50, y: 35 }, { x: 35, y: 50 }, { x: 65, y: 50 }, { x: 35, y: 80, inverted: true }, { x: 65, y: 80, inverted: true }],
        8: [{ x: 35, y: 20 }, { x: 65, y: 20 }, { x: 35, y: 40 }, { x: 65, y: 40 }, { x: 35, y: 60, inverted: true }, { x: 65, y: 60, inverted: true }, { x: 35, y: 80, inverted: true }, { x: 65, y: 80, inverted: true }],
        9: [{ x: 35, y: 18 }, { x: 65, y: 18 }, { x: 35, y: 38 }, { x: 65, y: 38 }, { x: 50, y: 50 }, { x: 35, y: 62, inverted: true }, { x: 65, y: 62, inverted: true }, { x: 35, y: 82, inverted: true }, { x: 65, y: 82, inverted: true }],
        10: [{ x: 35, y: 18 }, { x: 65, y: 18 }, { x: 50, y: 28 }, { x: 35, y: 38 }, { x: 65, y: 38 }, { x: 35, y: 62, inverted: true }, { x: 65, y: 62, inverted: true }, { x: 50, y: 72, inverted: true }, { x: 35, y: 82, inverted: true }, { x: 65, y: 82, inverted: true }]
    };
    return positions[count] || positions[1];
}

// ── Court card rendering (V, C, D, R) ────────────────────
function getCourtCardHTML(suit, rank, fillColor) {
    const symbol = TAROT_SUIT_SYMBOLS[suit];
    const courtName = COURT_NAMES[rank];
    const rankLetter = rank;

    // Special SVG for Cavalier (new card type)
    if (rank === 'C') {
        return getCavalierSVG(suit, fillColor, symbol);
    }

    // For V, D, R — use styled pixel art
    return `
    <div class="card-corner top-left">
        <div class="corner-rank" style="color: ${fillColor}">${rankLetter}</div>
        <div class="corner-suit" style="color: ${fillColor}">${symbol}</div>
    </div>
    <div class="court-card-center" style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
    ">
        <div style="
            font-size: 36px;
            line-height: 1;
        ">${getCourtEmoji(rank)}</div>
        <div style="
            font-family: 'Press Start 2P', monospace;
            font-size: 6px;
            color: ${fillColor};
            margin-top: 4px;
            letter-spacing: 0.05em;
        ">${courtName.toUpperCase()}</div>
    </div>
    <div class="card-corner bottom-right">
        <div class="corner-rank" style="color: ${fillColor}">${rankLetter}</div>
        <div class="corner-suit" style="color: ${fillColor}">${symbol}</div>
    </div>`;
}

// Court card emojis (MVP placeholder)
function getCourtEmoji(rank) {
    const emojis = {
        'V': '🃏',  // Jack
        'D': '👑',  // Queen
        'R': '🤴'   // King
    };
    return emojis[rank] || '🃏';
}

// ── Cavalier pixel art SVG ────────────────────────────────
function getCavalierSVG(suit, fillColor, symbol) {
    return `
    <div class="card-corner top-left">
        <div class="corner-rank" style="color: ${fillColor}">C</div>
        <div class="corner-suit" style="color: ${fillColor}">${symbol}</div>
    </div>
    <div class="cavalier-svg" style="
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    ">
        <svg viewBox="0 0 64 88" xmlns="http://www.w3.org/2000/svg"
             style="shape-rendering:crispEdges; image-rendering:pixelated; width: 100%; height: 100%;">
            <!-- Horse head -->
            <rect x="20" y="20" width="24" height="4" fill="${fillColor}"/>
            <rect x="18" y="24" width="28" height="4" fill="${fillColor}"/>
            <rect x="16" y="28" width="12" height="4" fill="${fillColor}"/>
            <rect x="36" y="28" width="8" height="8" fill="${fillColor}"/>
            <rect x="14" y="32" width="8" height="4" fill="${fillColor}"/>
            <!-- Horse neck -->
            <rect x="18" y="36" width="24" height="4" fill="${fillColor}"/>
            <rect x="16" y="40" width="24" height="4" fill="${fillColor}"/>
            <!-- Rider body -->
            <rect x="22" y="44" width="16" height="4" fill="${fillColor}"/>
            <rect x="24" y="48" width="12" height="8" fill="${fillColor}"/>
            <!-- Rider head -->
            <rect x="26" y="56" width="8" height="4" fill="${fillColor}"/>
            <rect x="28" y="60" width="4" height="4" fill="${fillColor}"/>
            <!-- Lance -->
            <rect x="40" y="20" width="2" height="24" fill="${fillColor}"/>
            <rect x="38" y="16" width="6" height="4" fill="${fillColor}"/>
            <!-- Horse legs -->
            <rect x="20" y="56" width="4" height="8" fill="${fillColor}"/>
            <rect x="32" y="56" width="4" height="8" fill="${fillColor}"/>
            <!-- Suit symbol on horse -->
            <text x="30" y="50" font-size="8" fill="white" text-anchor="middle" font-family="Arial">${symbol}</text>
        </svg>
    </div>
    <div class="card-corner bottom-right">
        <div class="corner-rank" style="color: ${fillColor}">C</div>
        <div class="corner-suit" style="color: ${fillColor}">${symbol}</div>
    </div>`;
}

// ── Main card HTML generator ──────────────────────────────
function getTarotCardHTML(card, faceUp) {
    if (!faceUp) {
        return getTarotCardBackHTML();
    }

    let inner = '';
    if (card.type === 'excuse') {
        inner = getExcuseHTML();
    } else if (card.type === 'trump') {
        inner = getTrumpHTML(card.number);
    } else {
        inner = getSuitedCardHTML(card.suit, card.rank);
    }

    return inner;
}

// ── Card back (reuses vaporwave design) ───────────────────
let _tarotBackIdCounter = 0;
function getTarotCardBackHTML() {
    const id = _tarotBackIdCounter++;
    return `
    <svg class="card-back-svg" viewBox="0 0 64 88" xmlns="http://www.w3.org/2000/svg"
         style="shape-rendering:crispEdges; image-rendering:pixelated;">
      <defs>
        <pattern id="vwgrid${id}" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
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
      <rect x="3" y="3" width="58" height="82" fill="none"
            stroke="#ff2d78" stroke-width="0.75" opacity="0.6"/>
      <rect x="5" y="5" width="54" height="78" fill="none"
            stroke="#00e5ff" stroke-width="0.5" opacity="0.4"/>
      <rect x="6" y="6" width="52" height="76" fill="url(#vwgrid${id})"/>
      <rect x="15" y="29" width="34" height="30" rx="2" ry="2" fill="#060018"/>
      <rect x="16" y="30" width="32" height="28" rx="1" ry="1" fill="none"
            stroke="#ffd700" stroke-width="0.75" opacity="0.7"/>
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

// ── Create card DOM element ───────────────────────────────
function createTarotCardElement(card, faceUp) {
    const div = document.createElement('div');
    div.className = 'tarot-card';
    div.dataset.cardId = card.id;

    if (faceUp) {
        div.classList.add('face-up');
        if (card.type === 'suited') {
            div.classList.add(card.color);
        } else if (card.type === 'trump') {
            div.classList.add('trump');
            if (card.isOudler) div.classList.add('oudler');
        } else {
            div.classList.add('excuse');
        }
        div.innerHTML = getTarotCardHTML(card, true);
    } else {
        div.classList.add('face-down');
        div.innerHTML = getTarotCardBackHTML();
    }

    return div;
}
