// deck.js

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
            
            // Check if it's a face card
            if (this.rank === 'J' || this.rank === 'Q' || this.rank === 'K') {
                card.innerHTML = this.getFaceCardHTML();
            } else if (this.rank === 'A') {
                card.innerHTML = this.getAceHTML();
            } else {
                card.innerHTML = this.getNumberCardHTML();
            }
        } else {
            card.classList.add('face-down');
            card.innerHTML = this.getSimpleCardBackHTML();
        }
        
        return card;
    }
    
    getSimpleCardBackHTML() {
        return `
            <div class="card-back-wrapper">
                <img src="images/card-back.jpg" alt="Card Back" class="card-back-image" onerror="this.style.display='none';">
            </div>
        `;
    }
    
    getAceHTML() {
        const symbol = SUIT_SYMBOLS[this.suit];
        return `
            <div class="card-corner top-left">
                <div class="corner-rank">A</div>
                <div class="corner-suit">${symbol}</div>
            </div>
            <div class="card-suit-center single">
                <div class="suit-symbol">${symbol}</div>
            </div>
            <div class="card-corner bottom-right">
                <div class="corner-rank">A</div>
                <div class="corner-suit">${symbol}</div>
            </div>
        `;
    }
    
    getNumberCardHTML() {
        const symbol = SUIT_SYMBOLS[this.suit];
        const layout = this.getSuitLayout(this.rank, symbol);
        
        return `
            <div class="card-corner top-left">
                <div class="corner-rank">${this.rank}</div>
                <div class="corner-suit">${symbol}</div>
            </div>
            <div class="card-suit-center">
                ${layout}
            </div>
            <div class="card-corner bottom-right">
                <div class="corner-rank">${this.rank}</div>
                <div class="corner-suit">${symbol}</div>
            </div>
        `;
    }
    
    getSuitLayout(rank, symbol) {
        const layouts = {
            '2': `
                <div class="suit-row"><div class="suit-symbol">${symbol}</div></div>
                <div class="suit-row"><div class="suit-symbol rotated">${symbol}</div></div>
            `,
            '3': `
                <div class="suit-row"><div class="suit-symbol">${symbol}</div></div>
                <div class="suit-row"><div class="suit-symbol">${symbol}</div></div>
                <div class="suit-row"><div class="suit-symbol rotated">${symbol}</div></div>
            `,
            '4': `
                <div class="suit-row">
                    <div class="suit-symbol">${symbol}</div>
                    <div class="suit-symbol">${symbol}</div>
                </div>
                <div class="suit-row">
                    <div class="suit-symbol rotated">${symbol}</div>
                    <div class="suit-symbol rotated">${symbol}</div>
                </div>
            `,
            '5': `
                <div class="suit-row">
                    <div class="suit-symbol">${symbol}</div>
                    <div class="suit-symbol">${symbol}</div>
                </div>
                <div class="suit-row">
                    <div class="suit-symbol">${symbol}</div>
                </div>
                <div class="suit-row">
                    <div class="suit-symbol rotated">${symbol}</div>
                    <div class="suit-symbol rotated">${symbol}</div>
                </div>
            `,
            '6': `
                <div class="suit-row">
                    <div class="suit-symbol">${symbol}</div>
                    <div class="suit-symbol">${symbol}</div>
                </div>
                <div class="suit-row">
                    <div class="suit-symbol">${symbol}</div>
                    <div class="suit-symbol">${symbol}</div>
                </div>
                <div class="suit-row">
                    <div class="suit-symbol rotated">${symbol}</div>
                    <div class="suit-symbol rotated">${symbol}</div>
                </div>
            `,
            '7': `
                <div class="suit-row">
                    <div class="suit-symbol">${symbol}</div>
                    <div class="suit-symbol">${symbol}</div>
                </div>
                <div class="suit-row">
                    <div class="suit-symbol">${symbol}</div>
                </div>
                <div class="suit-row">
                    <div class="suit-symbol">${symbol}</div>
                    <div class="suit-symbol">${symbol}</div>
                </div>
                <div class="suit-row">
                    <div class="suit-symbol rotated">${symbol}</div>
                    <div class="suit-symbol rotated">${symbol}</div>
                </div>
            `,
            '8': `
                <div class="suit-row">
                    <div class="suit-symbol">${symbol}</div>
                    <div class="suit-symbol">${symbol}</div>
                </div>
                <div class="suit-row">
                    <div class="suit-symbol">${symbol}</div>
                </div>
                <div class="suit-row">
                    <div class="suit-symbol">${symbol}</div>
                    <div class="suit-symbol">${symbol}</div>
                </div>
                <div class="suit-row">
                    <div class="suit-symbol rotated">${symbol}</div>
                </div>
                <div class="suit-row">
                    <div class="suit-symbol rotated">${symbol}</div>
                    <div class="suit-symbol rotated">${symbol}</div>
                </div>
            `,
            '9': `
                <div class="suit-row">
                    <div class="suit-symbol">${symbol}</div>
                    <div class="suit-symbol">${symbol}</div>
                </div>
                <div class="suit-row">
                    <div class="suit-symbol">${symbol}</div>
                    <div class="suit-symbol">${symbol}</div>
                </div>
                <div class="suit-row">
                    <div class="suit-symbol">${symbol}</div>
                </div>
                <div class="suit-row">
                    <div class="suit-symbol rotated">${symbol}</div>
                    <div class="suit-symbol rotated">${symbol}</div>
                </div>
                <div class="suit-row">
                    <div class="suit-symbol rotated">${symbol}</div>
                    <div class="suit-symbol rotated">${symbol}</div>
                </div>
            `,
            '10': `
                <div class="suit-row">
                    <div class="suit-symbol">${symbol}</div>
                    <div class="suit-symbol">${symbol}</div>
                </div>
                <div class="suit-row">
                    <div class="suit-symbol">${symbol}</div>
                </div>
                <div class="suit-row">
                    <div class="suit-symbol">${symbol}</div>
                    <div class="suit-symbol">${symbol}</div>
                </div>
                <div class="suit-row">
                    <div class="suit-symbol rotated">${symbol}</div>
                    <div class="suit-symbol rotated">${symbol}</div>
                </div>
                <div class="suit-row">
                    <div class="suit-symbol rotated">${symbol}</div>
                </div>
                <div class="suit-row">
                    <div class="suit-symbol rotated">${symbol}</div>
                    <div class="suit-symbol rotated">${symbol}</div>
                </div>
            `
        };
        
        return layouts[rank] || '';
    }

    getFaceCardHTML() {
        const symbol = SUIT_SYMBOLS[this.suit];
        const faceNames = {
            'J': 'Jack',
            'Q': 'Queen',
            'K': 'King'
        };
        
        const imagePath = `images/${this.rank.toLowerCase()}-${this.suit}.jpg`;
        
        return `
            <div class="face-card">
                <div class="face-card-corner top-left">
                    <div class="corner-rank">${this.rank}</div>
                    <div class="corner-suit">${symbol}</div>
                </div>
                <div class="face-card-suit-large top">${symbol}</div>
                <div class="face-card-center">
                    <img src="${imagePath}" alt="${faceNames[this.rank]} of ${this.suit}" class="face-card-image">
                </div>
                <div class="face-card-suit-large bottom">${symbol}</div>
                <div class="face-card-corner bottom-right">
                    <div class="corner-rank">${this.rank}</div>
                    <div class="corner-suit">${symbol}</div>
                </div>
            </div>
        `;
    }    
}

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