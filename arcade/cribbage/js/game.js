// game.js — Cribbage game state machine | MagmaCrunch Media © 2026
// Handles all game phases: deal, crib, pegging, scoring

class CribbageGame {
    constructor() {
        this.reset();
    }

    // ── Reset game state ──────────────────────────────────────
    reset() {
        this.phase = PHASE.DEAL;
        this.deck = [];
        this.playerHand = [];
        this.aiHand = [];
        this.crib = [];
        this.starter = null;

        this.isPlayerDealer = true;
        this.scores = { player: STARTING_SCORE, ai: STARTING_SCORE };

        // Pegging state
        this.currentCount = 0;
        this.playedCards = [];
        this.playerPeggedCards = [];
        this.aiPeggedCards = [];
        this.lastToPlay = null;
        this.goCalled = false;

        // Turn tracking
        this.currentTurn = 'player'; // 'player' or 'ai'
        this.turnCount = 0;

        // Hand selection
        this.selectedForCrib = [];
    }

    // ── Deal new hand ─────────────────────────────────────────
    deal() {
        this.deck = new AdCards.Deck();
        this.deck.shuffle();

        this.playerHand = [];
        this.aiHand = [];
        for (let i = 0; i < CARDS_PER_HAND; i++) {
            this.playerHand.push(this.deck.deal());
            this.aiHand.push(this.deck.deal());
        }

        // Set face up for player
        this.playerHand.forEach(c => c.faceUp = true);
        this.aiHand.forEach(c => c.faceUp = false);

        this.crib = [];
        this.starter = null;
        this.selectedForCrib = [];
        this.phase = PHASE.CRIB_SELECTION;

        return {
            playerHand: this.playerHand,
            aiHand: this.aiHand
        };
    }

    // ── Select card for crib ──────────────────────────────────
    selectForCrib(card) {
        if (this.phase !== PHASE.CRIB_SELECTION) return false;

        const index = this.selectedForCrib.findIndex(c =>
            c.suit === card.suit && c.rank === card.rank
        );

        if (index >= 0) {
            this.selectedForCrib.splice(index, 1);
        } else if (this.selectedForCrib.length < 2) {
            this.selectedForCrib.push(card);
        }

        return true;
    }

    // ── Confirm crib selection ────────────────────────────────
    confirmCribSelection() {
        if (this.phase !== PHASE.CRIB_SELECTION) return false;
        if (this.selectedForCrib.length !== 2) return false;

        // Move selected cards to crib
        this.crib.push(...this.selectedForCrib);

        // Remove from player hand
        this.playerHand = this.playerHand.filter(c =>
            !this.selectedForCrib.some(sc => sc.suit === c.suit && sc.rank === c.rank)
        );

        // AI selects cards for crib
        const aiCribCards = CribbageAI.selectCribCards(this.aiHand, this.isPlayerDealer);
        this.crib.push(...aiCribCards);

        // Remove from AI hand
        this.aiHand = this.aiHand.filter(c =>
            !aiCribCards.some(sc => sc.suit === c.suit && sc.rank === c.rank)
        );

        // Both hands should now have 4 cards each
        this.selectedForCrib = [];
        this.phase = PHASE.STARTER_CUT;

        return true;
    }

    // ── Cut for starter ───────────────────────────────────────
    cutStarter() {
        if (this.phase !== PHASE.STARTER_CUT) return null;

        // Cut the deck
        const cutIndex = Math.floor(Math.random() * this.deck.length);
        this.starter = this.deck[cutIndex];
        this.starter.faceUp = true;

        // Check for His Heels (Jack as starter)
        if (this.starter.rank === 'J') {
            this.scores[this.isPlayerDealer ? 'player' : 'ai'] += SCORE.HIS_HEELS;
        }

        this.phase = PHASE.PEGGING;
        this.currentTurn = this.isPlayerDealer ? 'ai' : 'player'; // Non-dealer goes first
        this.currentCount = 0;
        this.playedCards = [];
        this.playerPeggedCards = [];
        this.aiPeggedCards = [];
        this.turnCount = 0;
        this.goCalled = false;

        return this.starter;
    }

    // ── Play card during pegging phase ────────────────────────
    playPeggingCard(card, player) {
        if (this.phase !== PHASE.PEGGING) return null;
        if (this.currentTurn !== player) return null;

        const value = RANK_VALUES[card.rank];
        if (this.currentCount + value > MAX_PEG_COUNT) return null;

        // Play the card
        this.currentCount += value;
        this.playedCards.push(card);

        if (player === 'player') {
            this.playerHand = this.playerHand.filter(c =>
                !(c.suit === card.suit && c.rank === card.rank)
            );
            this.playerPeggedCards.push(card);
        } else {
            this.aiHand = this.aiHand.filter(c =>
                !(c.suit === card.suit && c.rank === card.rank)
            );
            this.aiPeggedCards.push(card);
        }

        // Score the play
        const scoreResult = AdCards.CribbageHandEval.scorePeggingPlay(card, this.playedCards.slice(0, -1));

        // Update score
        if (scoreResult.points > 0) {
            this.scores[player] += scoreResult.points;
        }

        // Check for 31
        if (this.currentCount === 31) {
            this.lastToPlay = player;
            this.resetCount();
            this.turnCount++;
            return { ...scoreResult, hit31: true };
        }

        // Check for Go
        const opponent = player === 'player' ? 'ai' : 'player';
        const opponentHand = opponent === 'player' ? this.playerHand : this.aiHand;
        const canOpponentPlay = opponentHand.some(c => RANK_VALUES[c.rank] + this.currentCount <= MAX_PEG_COUNT);

        if (!canOpponentPlay) {
            // Go - point to the player who played last
            this.scores[player] += SCORE.GO;
            this.goCalled = true;
            this.lastToPlay = player;
            this.resetCount();
            this.turnCount++;
            return { ...scoreResult, go: true, points: scoreResult.points + SCORE.GO };
        }

        // Switch turns
        this.currentTurn = opponent;
        this.turnCount++;

        return scoreResult;
    }

    // ── Reset count (after 31 or Go) ─────────────────────────
    resetCount() {
        this.currentCount = 0;
        this.playedCards = [];
        this.goCalled = false;

        // Check if all cards played
        if (this.playerHand.length === 0 && this.aiHand.length === 0) {
            this.phase = PHASE.HAND_SCORING;
            return;
        }

        // Next turn starts fresh
        this.currentTurn = this.lastToPlay === 'player' ? 'ai' : 'player';
    }

    // ── Score hands after pegging ─────────────────────────────
    scoreHands() {
        if (this.phase !== PHASE.HAND_SCORING) return null;

        const results = [];

        // Non-dealer scores first
        const nonDealer = this.isPlayerDealer ? 'ai' : 'player';
        const nonDealerHand = this.isPlayerDealer ? this.aiHand : this.playerHand;
        const nonDealerScore = AdCards.CribbageHandEval.scoreHand(nonDealerHand, this.starter, false);
        this.scores[nonDealer] += nonDealerScore.total;
        results.push({ player: nonDealer, hand: nonDealerHand, score: nonDealerScore });

        // Dealer scores next
        const dealer = this.isPlayerDealer ? 'player' : 'ai';
        const dealerHand = this.isPlayerDealer ? this.playerHand : this.aiHand;
        const dealerScore = AdCards.CribbageHandEval.scoreHand(dealerHand, this.starter, false);
        this.scores[dealer] += dealerScore.total;
        results.push({ player: dealer, hand: dealerHand, score: dealerScore });

        // Crib scores last (dealer's)
        const cribScore = AdCards.CribbageHandEval.scoreHand(this.crib, this.starter, true);
        this.scores[dealer] += cribScore.total;
        results.push({ player: 'crib', hand: this.crib, score: cribScore });

        // Check for winner
        const winner = this.checkWinner();
        if (winner) {
            this.phase = PHASE.GAME_OVER;
        } else {
            // Rotate dealer and start new hand
            this.isPlayerDealer = !this.isPlayerDealer;
            this.phase = PHASE.DEAL;
        }

        return results;
    }

    // ── Check for winner ──────────────────────────────────────
    checkWinner() {
        if (this.scores.player >= WINNING_SCORE) return 'player';
        if (this.scores.ai >= WINNING_SCORE) return 'ai';
        return null;
    }

    // ── Get current game state ────────────────────────────────
    getState() {
        return {
            phase: this.phase,
            scores: { ...this.scores },
            playerHand: [...this.playerHand],
            aiHand: [...this.aiHand],
            crib: [...this.crib],
            starter: this.starter,
            currentCount: this.currentCount,
            currentTurn: this.currentTurn,
            isPlayerDealer: this.isPlayerDealer,
            selectedForCrib: [...this.selectedForCrib]
        };
    }
}
