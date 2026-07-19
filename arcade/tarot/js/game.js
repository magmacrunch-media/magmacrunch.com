// game.js — French Tarot | MagmaCrunch Media © 2026
// Game state machine: deal, bidding, trick play, scoring

class TarotGame {
    constructor() {
        this.reset();
    }

    reset() {
        this.phase = PHASE.IDLE;
        this.deck = new TarotDeck();
        this.hands = [[], [], [], []];
        this.dog = [];
        this.takerIndex = -1;
        this.takerBid = null;
        this.currentBidder = 0;
        this.highestBid = 'PASSE';
        this.bidsPlaced = 0;

        // Dealer rotation (C6 fix)
        this.dealer = 0;

        // Trick state
        this.currentTrick = { cards: [], ledSuit: null, ledTrump: false, highestTrump: 0 };
        this.trickNumber = 0;
        this.currentPlayer = 0;
        this.trickWinner = -1;

        // Scoring
        this.tricksWon = [[], [], [], []];
        this.scores = [0, 0, 0, 0];
        this.roundScores = [0, 0, 0, 0];

        // Poignee
        this.declaredPoignee = null;

        // Excuse tracking
        this.excuseCompensation = [];

        // Game history (C7 fix: cleared per round)
        this.history = [];
    }

    // ── Deal phase ─────────────────────────────────────────
    deal() {
        this.deck = new TarotDeck();
        this.deck.shuffle();

        const dealt = this.deck.deal();
        this.hands = dealt.hands;
        this.dog = dealt.dog;

        // C6 fix: use dealer index for rotation
        this.currentPlayer = this.dealer;
        this.currentBidder = (this.dealer + 1) % 4;

        this.phase = PHASE.BIDDING;

        return {
            hands: this.hands.map(h => [...h]),
            dog: [...this.dog],
            firstBidder: this.currentBidder
        };
    }

    // ── Bidding phase ──────────────────────────────────────
    placeBid(playerIndex, bidType) {
        if (this.phase !== PHASE.BIDDING) return false;
        if (playerIndex !== this.currentBidder) return false;

        const bid = BIDS[bidType];
        if (!bid) return false;

        this.bidsPlaced++;

        if (bidType !== 'PASSE') {
            const currentBidIndex = BID_ORDER.indexOf(this.highestBid);
            const newBidIndex = BID_ORDER.indexOf(bidType);

            if (newBidIndex > currentBidIndex) {
                this.highestBid = bidType;
                this.takerIndex = playerIndex;
                this.takerBid = bid;
            }
        }

        this.history.push({ type: 'bid', player: playerIndex, bid: bidType });

        // Move to next bidder
        this.currentBidder = (this.currentBidder + 1) % 4;

        // Check if bidding is complete
        if (this.bidsPlaced >= 4 || this.highestBid === 'GARDE_CONTRE') {
            return this.finishBidding();
        }

        return true;
    }

    finishBidding() {
        if (this.takerIndex === -1) {
            this.history.push({ type: 'redeal', reason: 'no_bids' });
            return { event: 'redeal' };
        }

        // C5/M3/M4/M5 fix: Garde Sans and Garde Contre bypass dog exchange
        if (this.takerBid.name === 'Garde Sans') {
            // Dog goes directly to taker's trick pile unseen
            this.tricksWon[this.takerIndex].push(...this.dog);
            this.startTrickPlay();
            return {
                event: 'trick_start',
                taker: this.takerIndex,
                bid: this.takerBid,
                dog: null, // hidden
                firstLeader: this.currentPlayer
            };
        }

        if (this.takerBid.name === 'Garde Contre') {
            // Dog goes directly to defenders' trick piles unseen
            const defenderIndices = [0, 1, 2, 3].filter(i => i !== this.takerIndex);
            defenderIndices.forEach(i => {
                this.tricksWon[i].push(...this.dog);
            });
            this.startTrickPlay();
            return {
                event: 'trick_start',
                taker: this.takerIndex,
                bid: this.takerBid,
                dog: null, // hidden
                firstLeader: this.currentPlayer
            };
        }

        // Prise/Garde: reveal dog and enter dog exchange
        this.phase = PHASE.DOG_EXCHANGE;
        this.dog.forEach(c => c.faceUp = true);

        return {
            event: 'dog_reveal',
            taker: this.takerIndex,
            bid: this.takerBid,
            dog: [...this.dog]
        };
    }

    startTrickPlay() {
        this.phase = PHASE.TRICK_PLAY;
        this.trickNumber = 1;
        this.currentPlayer = this.takerIndex;

        // Check for poignee
        this.declaredPoignee = TarotAI.checkPoignee(this.hands[this.takerIndex]);
    }

    // ── Dog exchange phase ─────────────────────────────────
    takerDiscard(cardIds) {
        if (this.phase !== PHASE.DOG_EXCHANGE) return false;
        if (cardIds.length !== DOG_SIZE) return false;

        // M6 fix: Validate no Kings or Oudlers in discards
        const takerHand = this.hands[this.takerIndex];
        for (const id of cardIds) {
            const card = takerHand.find(c => c.id === id);
            if (!card) return false;
            if (card.rank === 'R') return false; // Cannot discard Kings
            if (card.isOudler) return false;     // Cannot discard Oudlers
        }

        // Move dog cards to taker's hand
        this.hands[this.takerIndex].push(...this.dog);

        // Remove selected cards from taker's hand
        const discards = [];
        for (const id of cardIds) {
            const idx = this.hands[this.takerIndex].findIndex(c => c.id === id);
            if (idx >= 0) {
                discards.push(this.hands[this.takerIndex].splice(idx, 1)[0]);
            }
        }

        // Discards go to taker's trick pile
        this.tricksWon[this.takerIndex].push(...discards);

        this.startTrickPlay();

        return {
            event: 'trick_start',
            firstLeader: this.currentPlayer,
            poignee: this.declaredPoignee
        };
    }

    // ── Trick play phase ───────────────────────────────────
    playCard(playerIndex, cardId) {
        if (this.phase !== PHASE.TRICK_PLAY) return null;
        if (playerIndex !== this.currentPlayer) return null;

        const card = this.hands[playerIndex].find(c => c.id === cardId);
        if (!card) return null;

        // Validate play
        if (!TrickLogic.validatePlay(card, this.hands[playerIndex], this.currentTrick)) {
            return null;
        }

        // Remove card from hand
        const idx = this.hands[playerIndex].findIndex(c => c.id === cardId);
        this.hands[playerIndex].splice(idx, 1);

        // Add to current trick
        this.currentTrick.cards.push({
            card,
            playerIndex
        });

        // Update trick state
        if (card.type === 'suited' && !this.currentTrick.ledTrump) {
            if (!this.currentTrick.ledSuit) {
                this.currentTrick.ledSuit = card.suit;
            }
        }
        if (card.type === 'trump') {
            this.currentTrick.ledTrump = true;
            if (card.number > this.currentTrick.highestTrump) {
                this.currentTrick.highestTrump = card.number;
            }
        }

        this.history.push({
            type: 'play',
            player: playerIndex,
            card: card.id,
            trick: this.trickNumber
        });

        // Move to next player
        this.currentPlayer = (this.currentPlayer + 1) % 4;

        // Check if trick is complete (4 cards played)
        if (this.currentTrick.cards.length === 4) {
            return this.completeTrick();
        }

        return {
            event: 'card_played',
            player: playerIndex,
            card: card,
            nextPlayer: this.currentPlayer
        };
    }

    completeTrick() {
        // Determine winner
        const winnerIndex = TrickLogic.determineWinner(this.currentTrick.cards);

        // Add trick cards to winner's pile
        const trickCards = this.currentTrick.cards.map(tc => tc.card);
        this.tricksWon[winnerIndex].push(...trickCards);

        // Handle Excuse compensation
        const excuseInfo = TrickLogic.handleExcuse(this.currentTrick.cards, winnerIndex);
        if (excuseInfo && excuseInfo.needsCompensation) {
            this.excuseCompensation.push(excuseInfo);
        }

        // Check for Petit au bout
        const petitAuBout = TrickLogic.checkPetitAuBout(
            this.currentTrick.cards,
            this.trickNumber >= TRICK_COUNT
        );

        this.trickWinner = winnerIndex;

        const result = {
            event: 'trick_complete',
            trickNumber: this.trickNumber,
            winner: winnerIndex,
            cards: trickCards,
            petitAuBout
        };

        // Reset for next trick
        this.currentTrick = { cards: [], ledSuit: null, ledTrump: false, highestTrump: 0 };
        this.trickNumber++;

        // Check if round is over
        if (this.trickNumber > TRICK_COUNT) {
            return {
                ...result,
                nextEvent: 'round_complete',
                roundResult: this.calculateRoundResult()
            };
        }

        // Next trick led by winner
        this.currentPlayer = winnerIndex;

        return {
            ...result,
            nextPlayer: this.currentPlayer
        };
    }

    // ── Round scoring ──────────────────────────────────────
    calculateRoundResult() {
        this.phase = PHASE.ROUND_SCORING;

        // Handle remaining Excuse compensations
        this.resolveExcuseCompensations();

        // Count oudlers and points for taker
        const takerCards = this.tricksWon[this.takerIndex];
        const oudlerCount = Scoring.countOudlers(takerCards);
        const pointTotal = Scoring.countPoints(takerCards);

        // Evaluate contract
        const contract = Scoring.evaluateContract(takerCards, oudlerCount);

        // C7 fix: Petit au bout only from this round's history
        const roundHistory = this.history.filter(h => h.type === 'trick_complete');
        const petitAuBout = roundHistory.some(h => h.petitAuBout);

        // Calculate hand score
        const handScore = Scoring.calculateHandScore(
            contract.made,
            contract.difference,
            this.takerBid.multiplier,
            petitAuBout,
            this.declaredPoignee
        );

        // Distribute scores
        const roundScores = Scoring.distributeScores(
            this.takerIndex,
            handScore,
            4
        );

        // Update total scores
        for (let i = 0; i < 4; i++) {
            this.scores[i] += roundScores[i];
            this.roundScores[i] = roundScores[i];
        }

        // Check for game over
        const gameOver = this.scores.some(s => s >= WINNING_SCORE);

        return {
            taker: this.takerIndex,
            bid: this.takerBid,
            oudlers: oudlerCount,
            points: pointTotal,
            threshold: contract.threshold,
            made: contract.made,
            difference: contract.difference,
            petitAuBout,
            poignee: this.declaredPoignee,
            handScore,
            roundScores: [...roundScores],
            totalScores: [...this.scores],
            gameOver,
            winner: gameOver ? this.scores.findIndex(s => s >= WINNING_SCORE) : -1
        };
    }

    resolveExcuseCompensations() {
        for (const comp of this.excuseCompensation) {
            const excusePlayerTricks = this.tricksWon[comp.excusePlayer];
            const halfPointCard = excusePlayerTricks.find(c =>
                c.type === 'suited' || (c.type === 'trump' && !c.isOudler)
            );

            if (halfPointCard) {
                const idx = excusePlayerTricks.indexOf(halfPointCard);
                excusePlayerTricks.splice(idx, 1);
                this.tricksWon[comp.trickWinner].push(halfPointCard);
            }
        }
        this.excuseCompensation = [];
    }

    // ── New round ──────────────────────────────────────────
    newRound() {
        // C6 fix: rotate dealer
        this.dealer = (this.dealer + 1) % 4;

        // C7 fix: clear history and dog
        this.history = [];
        this.dog = [];

        this.trickNumber = 0;
        this.tricksWon = [[], [], [], []];
        this.currentTrick = { cards: [], ledSuit: null, ledTrump: false, highestTrump: 0 };
        this.takerIndex = -1;
        this.takerBid = null;
        this.highestBid = 'PASSE';
        this.bidsPlaced = 0;
        this.declaredPoignee = null;
        this.excuseCompensation = [];
        this.phase = PHASE.DEAL;
    }

    // ── Get game state ─────────────────────────────────────
    getState() {
        return {
            phase: this.phase,
            hands: this.hands.map(h => [...h]),
            dog: [...this.dog],
            currentPlayer: this.currentPlayer,
            currentBidder: this.currentBidder,
            takerIndex: this.takerIndex,
            takerBid: this.takerBid,
            highestBid: this.highestBid,
            trickNumber: this.trickNumber,
            // L1 fix: deep copy trick cards
            currentTrick: {
                ...this.currentTrick,
                cards: this.currentTrick.cards.map(c => ({ ...c }))
            },
            tricksWon: this.tricksWon.map(t => [...t]),
            scores: [...this.scores],
            roundScores: [...this.roundScores],
            history: [...this.history],
            dealer: this.dealer
        };
    }
}
