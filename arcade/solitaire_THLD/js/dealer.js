// dealer.js - Texas Hold'Em Lava Dome
// Manages the deck and deals cards through each street of a Hold'Em hand

class Dealer {
    constructor(state) {
        this.state = state;
    }

    // ── New round setup ──────────────────────────────────────

    newRound() {
        // Fresh shuffled deck
        this.state.deck = new Deck();
        this.state.deck.shuffle();

        // Clear cards from previous round
        this.state.holeCards      = [];
        this.state.communityCards = [];
        this.state.bestHand       = null;
        this.state.currentBet     = 0;
        this.state.potWin         = 0;
        this.state.beatDome       = false;

        // Set dome values for this round
        this.state.ante          = this.state.currentAnte;
        this.state.domeThreshold = this.state.currentDomeThreshold;
    }

    // ── Dealing ──────────────────────────────────────────────

    dealHoleCards() {
        if (this.state.holeCards.length > 0) {
            console.warn('Dealer: hole cards already dealt');
            return false;
        }

        // Deal 2 face-up hole cards to the player
        for (let i = 0; i < 2; i++) {
            const card = this.state.deck.deal();
            card.faceUp = true;
            this.state.holeCards.push(card);
        }

        this.state.phase = 'betting';
        return true;
    }

    dealFlop() {
        if (this.state.communityCards.length !== 0) {
            console.warn('Dealer: flop already dealt or wrong state');
            return false;
        }

        // Burn one card (standard poker practice)
        this.state.deck.deal();

        // Deal 3 face-up community cards
        for (let i = 0; i < 3; i++) {
            const card = this.state.deck.deal();
            card.faceUp = true;
            this.state.communityCards.push(card);
        }

        this.state.phase = 'flop';
        return true;
    }

    dealTurn() {
        if (this.state.communityCards.length !== 3) {
            console.warn('Dealer: wrong state for turn');
            return false;
        }

        // Burn one card
        this.state.deck.deal();

        const card = this.state.deck.deal();
        card.faceUp = true;
        this.state.communityCards.push(card);

        this.state.phase = 'turn';
        return true;
    }

    dealRiver() {
        if (this.state.communityCards.length !== 4) {
            console.warn('Dealer: wrong state for river');
            return false;
        }

        // Burn one card
        this.state.deck.deal();

        const card = this.state.deck.deal();
        card.faceUp = true;
        this.state.communityCards.push(card);

        this.state.phase = 'river';
        return true;
    }

    // ── Street advancement ───────────────────────────────────
    // Convenience method — advances to the next street from current phase

    advanceStreet() {
        switch (this.state.phase) {
            case 'betting': return this.dealFlop();
            case 'flop':    return this.dealTurn();
            case 'turn':    return this.dealRiver();
            case 'river':
                this.state.phase = 'resolve';
                return true;
            default:
                console.warn('Dealer: advanceStreet called in unexpected phase:', this.state.phase);
                return false;
        }
    }

    // ── Fold ─────────────────────────────────────────────────

    fold() {
        // Player forfeits their current bet — move to cashout phase
        this.state.potWin  = -this.state.currentBet;
        this.state.beatDome = false;
        this.state.phase   = 'cashout';
        return { folded: true, chipsLost: this.state.currentBet };
    }

    // ── Helpers ──────────────────────────────────────────────

    get communityLabel() {
        switch (this.state.communityCards.length) {
            case 0: return 'Pre-Flop';
            case 3: return 'Flop';
            case 4: return 'Turn';
            case 5: return 'River';
            default: return '';
        }
    }

    get nextActionLabel() {
        switch (this.state.phase) {
            case 'betting': return 'Deal Flop';
            case 'flop':    return 'Deal Turn';
            case 'turn':    return 'Deal River';
            case 'river':   return 'Resolve Hand';
            default:        return '';
        }
    }

    get streetCount() {
        // How many betting opportunities have passed (0–4)
        switch (this.state.phase) {
            case 'betting': return 0;
            case 'flop':    return 1;
            case 'turn':    return 2;
            case 'river':   return 3;
            case 'resolve': return 4;
            default:        return 0;
        }
    }
}
