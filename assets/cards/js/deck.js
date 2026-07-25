// deck.js — MagmaCards First Edition | MagmaCrunch Media © 2026
// Card + Deck classes using shared MagmaCards renderer

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
            card.innerHTML = MagmaCards.render(this.rank, this.suit);
        } else {
            card.classList.add('face-down');
            card.innerHTML = MagmaCards.renderBack();
        }

        return card;
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