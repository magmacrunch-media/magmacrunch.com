// deck.js — Solitaire Deluxe | MagmaCrunch Media © 2026
// Card + Deck classes.
// Face cards  → face-cards.js   (pixel art SVG, 12 cards)
// Number cards → number-cards.js (pip layout HTML)
// Card back   → inline SVG pixel art (no image file needed)

// ─────────────────────────────────────────────────────────────
//  Vaporwave card back  (64×88 viewBox)
//  Deep purple · pink & cyan grid · gold pixel sunburst badge
// ─────────────────────────────────────────────────────────────
function getCardBackSVG() {
    return `
    <svg class="card-back-svg" viewBox="0 0 64 88" xmlns="http://www.w3.org/2000/svg"
         style="shape-rendering:crispEdges; image-rendering:pixelated;">
      <defs>
        <!-- Diagonal crosshatch: thin pink + cyan lines -->
        <pattern id="vwgrid" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#0d0028"/>
          <line x1="0" y1="0" x2="8" y2="8" stroke="#ff2d78" stroke-width="0.6" opacity="0.55"/>
          <line x1="8" y1="0" x2="0" y2="8" stroke="#00e5ff" stroke-width="0.6" opacity="0.45"/>
        </pattern>
      </defs>

      <!-- Card body: deep purple -->
      <rect x="0" y="0" width="64" height="88" fill="#0d0028"/>

      <!-- Outer bevel -->
      <line x1="0" y1="0" x2="64" y2="0"  stroke="#4a107a" stroke-width="1"/>
      <line x1="0" y1="0" x2="0"  y2="88" stroke="#4a107a" stroke-width="1"/>
      <line x1="63" y1="0" x2="63" y2="88" stroke="#06000f" stroke-width="1"/>
      <line x1="0" y1="87" x2="64" y2="87" stroke="#06000f" stroke-width="1"/>

      <!-- Inner border frame (pink) -->
      <rect x="3" y="3" width="58" height="82" fill="none"
            stroke="#ff2d78" stroke-width="0.75" opacity="0.6"/>
      <!-- Second inner frame (cyan) -->
      <rect x="5" y="5" width="54" height="78" fill="none"
            stroke="#00e5ff" stroke-width="0.5" opacity="0.4"/>

      <!-- Grid fill -->
      <rect x="6" y="6" width="52" height="76" fill="url(#vwgrid)"/>

      <!-- Center badge: centered on card (viewBox 64x88, center=32,44) -->
      <!-- Badge: 34x30, top-left=(15,29), center=(32,44) -->
      <rect x="15" y="29" width="34" height="30" rx="2" ry="2" fill="#060018"/>
      <rect x="16" y="30" width="32" height="28" rx="1" ry="1" fill="none"
            stroke="#ffd700" stroke-width="0.75" opacity="0.7"/>

      <!-- Pixel-art volcano - centered within badge -->
      <!-- Badge inner: x=17..47, y=31..57. Volcano 20px tall, start y=34 -->

      <!-- Lava eruption particles -->
      <rect x="30" y="34" width="2" height="2" fill="#ff6000" opacity="0.9"/>
      <rect x="34" y="34" width="2" height="2" fill="#ff2d00" opacity="0.8"/>
      <rect x="27" y="35" width="2" height="2" fill="#ff2d00" opacity="0.7"/>
      <rect x="32" y="35" width="2" height="2" fill="#ffaa00" opacity="0.95"/>
      <rect x="36" y="36" width="2" height="2" fill="#ff6000" opacity="0.7"/>
      <rect x="29" y="36" width="2" height="1" fill="#ffaa00" opacity="0.8"/>

      <!-- Crater rim -->
      <rect x="28" y="38" width="3" height="2" fill="#ffd700" opacity="0.9"/>
      <rect x="33" y="38" width="3" height="2" fill="#ffd700" opacity="0.9"/>
      <rect x="31" y="38" width="2" height="2" fill="#ff4400" opacity="1"/>

      <!-- Volcano body: 5 stepped rows -->
      <rect x="27" y="40" width="10" height="2" fill="#cc8800" opacity="0.95"/>
      <rect x="25" y="42" width="14" height="2" fill="#bb7700" opacity="0.95"/>
      <rect x="22" y="44" width="20" height="2" fill="#aa6600" opacity="0.95"/>
      <rect x="19" y="46" width="26" height="2" fill="#996600" opacity="0.95"/>
      <rect x="17" y="48" width="30" height="2" fill="#885500" opacity="0.95"/>

      <!-- Ground base -->
      <rect x="16" y="50" width="32" height="2" fill="#774400" opacity="0.95"/>

      <!-- Lava glow at base -->
      <rect x="20" y="51" width="6"  height="1" fill="#ff6600" opacity="0.6"/>
      <rect x="28" y="51" width="8"  height="1" fill="#ff8800" opacity="0.55"/>
      <rect x="37" y="51" width="5"  height="1" fill="#ff4400" opacity="0.5"/>

      <!-- Thin gold rules above and below badge -->
      <line x1="10" y1="27" x2="54" y2="27" stroke="#ffd700" stroke-width="0.5" opacity="0.35"/>
      <line x1="10" y1="61" x2="54" y2="61" stroke="#ffd700" stroke-width="0.5" opacity="0.35"/>

            <!-- Corner accent marks: pink 2×2 squares -->
      <rect x="7"  y="7"  width="3" height="3" fill="#ff2d78" opacity="0.9"/>
      <rect x="54" y="7"  width="3" height="3" fill="#ff2d78" opacity="0.9"/>
      <rect x="7"  y="78" width="3" height="3" fill="#ff2d78" opacity="0.9"/>
      <rect x="54" y="78" width="3" height="3" fill="#ff2d78" opacity="0.9"/>

      <!-- Cyan dots just inside corners -->
      <rect x="11" y="11" width="2" height="2" fill="#00e5ff" opacity="0.7"/>
      <rect x="51" y="11" width="2" height="2" fill="#00e5ff" opacity="0.7"/>
      <rect x="11" y="75" width="2" height="2" fill="#00e5ff" opacity="0.7"/>
      <rect x="51" y="75" width="2" height="2" fill="#00e5ff" opacity="0.7"/>
    </svg>`;
}

// ─────────────────────────────────────────────────────────────
//  Card class
// ─────────────────────────────────────────────────────────────
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
                card.innerHTML = getAceHTML(this.suit, this.rank);
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

// ─────────────────────────────────────────────────────────────
//  Deck class
// ─────────────────────────────────────────────────────────────
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
