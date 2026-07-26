// ═══════════════════════════════════════════════════════════════════════════
// tarot-card-factory.js — MagmaCrunch Tarot Deck
// Main API: creates DOM elements for any of the 78 cards
// ═══════════════════════════════════════════════════════════════════════════

const TarotCardFactory = {

    // ── CARD BACK (vaporwave design) ──────────────────────────────────────
    getCardBackHTML() {
        return `
        <svg class="t-card-back-svg" viewBox="0 0 64 88" xmlns="http://www.w3.org/2000/svg"
             style="shape-rendering:crispEdges;image-rendering:pixelated;width:100%;height:100%;display:block;">
          <defs>
            <pattern id="vwgrid" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" fill="#0d0028"/>
              <line x1="0" y1="0" x2="8" y2="8" stroke="#ff2d78" stroke-width="0.6" opacity="0.55"/>
              <line x1="8" y1="0" x2="0" y2="8" stroke="#00e5ff" stroke-width="0.6" opacity="0.45"/>
            </pattern>
          </defs>
          <rect width="64" height="88" fill="#0d0028"/>
          <rect x="3" y="3" width="58" height="82" fill="none" stroke="#ff2d78" stroke-width="0.75" opacity="0.6"/>
          <rect x="5" y="5" width="54" height="78" fill="none" stroke="#00e5ff" stroke-width="0.5" opacity="0.4"/>
          <rect x="6" y="6" width="52" height="76" fill="url(#vwgrid)"/>
          <!-- Center badge -->
          <rect x="15" y="29" width="34" height="30" rx="2" ry="2" fill="#060018"/>
          <rect x="16" y="30" width="32" height="28" rx="1" ry="1" fill="none" stroke="#ffd700" stroke-width="0.75" opacity="0.7"/>
          <!-- Volcano -->
          <rect x="30" y="34" width="2" height="2" fill="#ff6000" opacity="0.9"/>
          <rect x="34" y="34" width="2" height="2" fill="#ff2d00" opacity="0.8"/>
          <rect x="32" y="35" width="2" height="2" fill="#ffaa00" opacity="0.95"/>
          <rect x="28" y="38" width="3" height="2" fill="#ffd700" opacity="0.9"/>
          <rect x="33" y="38" width="3" height="2" fill="#ffd700" opacity="0.9"/>
          <rect x="31" y="38" width="2" height="2" fill="#ff4400"/>
          <rect x="27" y="40" width="10" height="2" fill="#cc8800"/>
          <rect x="25" y="42" width="14" height="2" fill="#bb7700"/>
          <rect x="22" y="44" width="20" height="2" fill="#aa6600"/>
          <rect x="19" y="46" width="26" height="2" fill="#996600"/>
          <rect x="17" y="48" width="30" height="2" fill="#885500"/>
          <rect x="16" y="50" width="32" height="2" fill="#774400"/>
          <!-- Corner accents -->
          <rect x="7" y="7" width="3" height="3" fill="#ff2d78" opacity="0.9"/>
          <rect x="54" y="7" width="3" height="3" fill="#ff2d78" opacity="0.9"/>
          <rect x="7" y="78" width="3" height="3" fill="#ff2d78" opacity="0.9"/>
          <rect x="54" y="78" width="3" height="3" fill="#ff2d78" opacity="0.9"/>
          <rect x="11" y="11" width="2" height="2" fill="#00e5ff" opacity="0.7"/>
          <rect x="51" y="11" width="2" height="2" fill="#00e5ff" opacity="0.7"/>
          <rect x="11" y="75" width="2" height="2" fill="#00e5ff" opacity="0.7"/>
          <rect x="51" y="75" width="2" height="2" fill="#00e5ff" opacity="0.7"/>
        </svg>`;
    },

    // ── CREATE A SINGLE CARD DOM ELEMENT ──────────────────────────────────
    createCard(card) {
        const el = document.createElement('div');
        el.className = 't-card';
        el.dataset.cardId = card.id;

        if (!card.faceUp) {
            el.classList.add('face-down');
            el.innerHTML = this.getCardBackHTML();
            return el;
        }

        el.classList.add('face-up');

        if (card.type === 'excuse') {
            el.classList.add('excuse');
            el.innerHTML = TarotExcuse.getExcuseHTML().replace(/<\/?div class="t-card[^"]*">/g, '');
        } else if (card.type === 'trump') {
            el.classList.add('trump');
            if (card.isOudler) el.classList.add('oudler');
            el.innerHTML = TarotTrumps.getTrumpHTML(card.number).replace(/<\/?div class="t-card[^"]*">/g, '');
        } else {
            // Suited card
            el.classList.add(card.suit);
            if (TarotSuited.isRed(card.suit)) {
                el.classList.add('red');
            } else {
                el.classList.add('black');
            }

            if (card.rank === 'V' || card.rank === 'D' || card.rank === 'R') {
                el.innerHTML = TarotSuited.getFaceCardHTML(card.rank, card.suit)
                    .replace(/<\/?div class="t-card[^"]*">/g, '');
            } else if (card.rank === 'C') {
                el.innerHTML = TarotSuited.getCavalierHTML(card.suit)
                    .replace(/<\/?div class="t-card[^"]*">/g, '');
            } else {
                el.innerHTML = TarotSuited.getNumberCardHTML(card.rank, card.suit)
                    .replace(/<\/?div class="t-card[^"]*">/g, '');
            }
        }

        return el;
    },

    // ── CREATE CARD BACK ELEMENT ──────────────────────────────────────────
    createCardBack() {
        const el = document.createElement('div');
        el.className = 't-card face-down';
        el.innerHTML = this.getCardBackHTML();
        return el;
    }
};
