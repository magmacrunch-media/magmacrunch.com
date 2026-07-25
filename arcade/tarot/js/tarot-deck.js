// tarot-deck.js — French Tarot | MagmaCrunch Media © 2026
// TarotCard class and TarotDeck (78 cards)

class TarotCard {
    constructor(type, suit, rank, number) {
        this.type = type;       // 'suited', 'trump', or 'excuse'
        this.suit = suit;       // 'hearts','diamonds','clubs','spades' or null
        this.rank = rank;       // '1'-'10','V','C','D','R' for suited; null for trumps
        this.number = number;   // 0=Excuse, 1-21=trumps, null for suited
        this.faceUp = false;
        this.owner = null;      // Which player owns this card (for scoring)

        // Computed properties
        if (this.type === 'suited') {
            this.color = TAROT_SUIT_COLORS[this.suit];
            this.isOudler = false;
            this.pointValue = CARD_POINTS[this.rank] || 0.5;
        } else if (this.type === 'trump') {
            this.color = 'trump';
            this.isOudler = OUDLERS.includes(this.number);
            this.pointValue = this.isOudler ? 4.5 : 0.5;
        } else { // excuse
            this.color = 'excuse';
            this.isOudler = true;
            this.pointValue = 4.5;
        }
    }

    // For trick comparison: trump value (0 = not a trump)
    getTrumpValue() {
        if (this.type === 'excuse') return 0; // Excuse never wins
        if (this.type === 'trump') return this.number;
        return 0;
    }

    // Unique ID for comparison
    get id() {
        if (this.type === 'excuse') return 'excuse';
        if (this.type === 'trump') return `trump-${this.number}`;
        return `${this.suit}-${this.rank}`;
    }

    // Display name
    get displayName() {
        if (this.type === 'excuse') return 'Excuse';
        if (this.type === 'trump') return `Trump ${this.number}`;
        return `${this.rank}${TAROT_SUIT_SYMBOLS[this.suit]}`;
    }

    flip() {
        this.faceUp = !this.faceUp;
    }
}

class TarotDeck {
    constructor() {
        this.cards = [];
        this.createDeck();
    }

    createDeck() {
        this.cards = [];

        // 4 suits × 14 cards = 56 suited cards
        for (const suit of TAROT_SUITS) {
            for (const rank of TAROT_RANKS) {
                this.cards.push(new TarotCard('suited', suit, rank, null));
            }
        }

        // 21 numbered trumps
        for (let i = 1; i <= TRUMP_COUNT; i++) {
            this.cards.push(new TarotCard('trump', null, null, i));
        }

        // 1 Excuse (Fool)
        this.cards.push(new TarotCard('excuse', null, null, EXCUSE_NUMBER));
    }

    // Soft shuffle (French Tarot tradition — minimal shuffling)
    shuffle() {
        // In real French Tarot, cards are "soft shuffled" — just collected
        // and dealt. We do a mild shuffle to randomize a bit.
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    // Deal 18 cards to each of 4 players + 6 to dog
    deal() {
        const hands = [[], [], [], []];
        const dog = [];

        // Deal in packets of 3, anticlockwise
        // Simplified: deal one card at a time to players, then dog
        let cardIndex = 0;

        // Deal to 4 players in rotation, 18 rounds
        for (let round = 0; round < HAND_SIZE; round++) {
            for (let player = 0; player < 4; player++) {
                hands[player].push(this.cards[cardIndex++]);
            }
        }

        // Deal 6 cards to dog
        for (let i = 0; i < DOG_SIZE; i++) {
            dog.push(this.cards[cardIndex++]);
        }

        return { hands, dog };
    }

    // Get a card by its ID
    getCard(id) {
        return this.cards.find(c => c.id === id);
    }
}
