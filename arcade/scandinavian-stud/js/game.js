// game.js — Sökö (Scandinavian Stud) | MagmaCrunch Media © 2026
// Core game logic: dealing, betting, AI, showdown

class SokoGame {
    constructor() {
        this.deck = null;
        this.players = [];
        this.pot = 0;
        this.currentBet = 0;
        this.round = 0;           // Current street (0=hole, 1-4=up cards)
        this.bettingRound = 0;    // Which betting round we're in
        this.dealerIndex = 0;     // Who is dealer
        this.currentPlayerIndex = 0;
        this.gameOver = false;
        this.phase = 'waiting';   // waiting, dealing, betting, showdown
        this.betsThisRound = {};  // Track bets per player this round
        this.raisesThisRound = 0;
        this.totalRounds = 0;     // Total hands played
        this.handEvaluater = new HandEvaluator();
        this.language = 'fi';     // Finnish by default
        this.lastWinner = null;   // Winner of the last hand
    }

    // ── Initialize a new hand ────────────────────────────────

    newHand() {
        this.deck = new Deck();
        this.deck.shuffle();
        this.pot = 0;
        this.currentBet = 0;
        this.round = 0;
        this.bettingRound = 0;
        this.gameOver = false;
        this.lastWinner = null;
        this.phase = 'dealing';
        this.betsThisRound = {};
        this.raisesThisRound = 0;

        // Reset players
        this.players.forEach(p => {
            p.cards = [];
            p.folded = false;
            p.allIn = false;
            p.currentBet = 0;
            p.hand = null;
        });

        // Post antes
        this.players.forEach(p => {
            if (p.chips >= ANTE_AMOUNT) {
                p.chips -= ANTE_AMOUNT;
                p.currentBet = ANTE_AMOUNT;
                this.pot += ANTE_AMOUNT;
            } else {
                // All-in for less
                this.pot += p.chips;
                p.currentBet = p.chips;
                p.chips = 0;
                p.allIn = true;
            }
        });

        // Deal hole card (face down) to each player
        this.players.forEach(p => {
            const card = this.deck.deal();
            card.faceUp = false;
            p.cards.push(card);
        });

        // Deal first face-up card
        this._dealNextStreet();
    }

    // ── Deal next street ─────────────────────────────────────

    _dealNextStreet() {
        this.round++;
        this.raisesThisRound = 0;
        this.betsThisRound = {};

        this.players.forEach(p => {
            if (!p.folded) {
                const card = this.deck.deal();
                card.faceUp = true;
                p.cards.push(card);
            }
        });

        // Evaluate hands
        this._evaluateAllHands();
    }

    // ── Evaluate all hands ──────────────────────────────────

    _evaluateAllHands() {
        this.players.forEach(p => {
            if (!p.folded) {
                p.hand = this.handEvaluater.evaluate(p.cards);
            }
        });
    }

    // ── Start betting round ─────────────────────────────────

    startBettingRound() {
        this.phase = 'betting';
        this.raisesThisRound = 0;
        this.betsThisRound = {};
        this.currentBet = 0;
        this.bettingRound = this.round - 1; // 0-indexed: round 1→br0, round 2→br1, etc.

        // Reset active players' per-round bet tracking
        this.players.forEach(p => {
            if (!p.folded) p.currentBet = 0;
        });

        // Find first active player after dealer
        this.currentPlayerIndex = this._nextActivePlayer(this.dealerIndex);
        this._actionLog(`${LABELS[this.language].round} ${this.round}`);
    }

    // ── Get current player ──────────────────────────────────

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    // ── Check if betting is complete ────────────────────────

    isBettingComplete() {
        const activePlayers = this.players.filter(p => !p.folded && !p.allIn);
        
        // Only one player left
        if (activePlayers.length <= 1) return true;

        // All active players have bet the same amount
        const bets = activePlayers.map(p => p.currentBet);
        const allEqual = bets.every(b => b === bets[0]);

        // And all have had a chance to act
        const allActed = activePlayers.every(p => this.betsThisRound[p.id]);

        return allEqual && allActed;
    }

    // ── Player actions ──────────────────────────────────────

    call(player) {
        const callAmount = this.currentBet - player.currentBet;
        if (callAmount <= 0) {
            // Already matched or ahead — check
        } else if (player.chips <= callAmount) {
            // All-in for less
            const allIn = player.chips;
            player.currentBet += allIn;
            this.pot += allIn;
            player.chips = 0;
            player.allIn = true;
        } else {
            player.chips -= callAmount;
            player.currentBet += callAmount;
            this.pot += callAmount;
        }

        this.betsThisRound[player.id] = true;
        this._nextPlayer();
    }

    raise(player, amount = null) {
        if (this.raisesThisRound >= MAXRaises_PER_ROUND) {
            this.call(player);
            return;
        }

        const betIncrement = this.bettingRound < 2 ? SMALL_BET : BIG_BET;
        const minRaise = this.currentBet + betIncrement;
        const raiseAmount = amount || minRaise;
        const totalBet = Math.min(raiseAmount, player.chips + player.currentBet);
        const additional = totalBet - player.currentBet;

        if (additional <= 0) {
            this.call(player);
            return;
        }

        player.chips -= additional;
        this.pot += additional;
        player.currentBet = totalBet;
        this.currentBet = totalBet;
        this.raisesThisRound++;

        // Reset bets for this round since we raised
        this.betsThisRound = {};
        this.betsThisRound[player.id] = true;

        this._nextPlayer();
    }

    fold(player) {
        player.folded = true;
        this.betsThisRound[player.id] = true;

        // Check if only one player left
        const active = this.players.filter(p => !p.folded);
        if (active.length === 1) {
            this._endHand(active[0]);
            return;
        }

        this._nextPlayer();
    }

    check(player) {
        this.betsThisRound[player.id] = true;
        this._nextPlayer();
    }

    // ── AI Decision Making ──────────────────────────────────

    aiDecide(player) {
        if (player.folded || player.allIn) return;

        const handStrength = this._evaluatePartialStrength(player);
        const aggression = this._getAIAggression(player);
        const shouldCall = handStrength > aggression.call;
        const shouldRaise = handStrength > aggression.raise && this.raisesThisRound < MAXRaises_PER_ROUND;

        if (shouldRaise) {
            this.raise(player);
        } else if (shouldCall) {
            this.call(player);
        } else {
            // Check if possible, otherwise fold
            if (this.currentBet === player.currentBet) {
                this.check(player);
            } else {
                this.fold(player);
            }
        }
    }

    _evaluatePartialStrength(player) {
        // Evaluate strength of current cards (0-1 scale)
        if (!player.cards || player.cards.length === 0) return 0;

        const hand = this.handEvaluater.evaluate(player.cards);
        const maxRank = HAND_RANKS['Royal Flush'];
        return hand.rank / maxRank;
    }

    _getAIAggression(player) {
        const styles = Object.values(AI_AGGRESSION);
        return styles[player.aiStyle || 1]; // Default moderate
    }

    // ── Advance to next street ──────────────────────────────

    advanceStreet() {
        if (this.round >= 4) {
            // All 4 face-up cards dealt + 4 betting rounds done — showdown
            this.showdown();
            return;
        }

        this._dealNextStreet();
        this.startBettingRound();
    }

    // ── Showdown ─────────────────────────────────────────────

    showdown() {
        this.phase = 'showdown';
        
        // Reveal all hole cards
        this.players.forEach(p => {
            if (!p.folded) {
                p.cards.forEach(c => c.faceUp = true);
            }
        });

        // Find winner
        const activePlayers = this.players.filter(p => !p.folded);
        let winner = activePlayers[0];
        
        for (let i = 1; i < activePlayers.length; i++) {
            const comparison = this.handEvaluater._compareTo(activePlayers[i].hand, winner.hand);
            if (comparison > 0) {
                winner = activePlayers[i];
            }
        }

        this._endHand(winner);
    }

    // ── End hand ─────────────────────────────────────────────

    _endHand(winner) {
        this.gameOver = true;
        this.phase = 'complete';
        this.lastWinner = winner;
        winner.chips += this.pot;
        this.totalRounds++;
        
        return {
            winner: winner,
            pot: this.pot,
            hand: winner.hand
        };
    }

    // ── Helper methods ──────────────────────────────────────

    _nextActivePlayer(fromIndex) {
        let next = (fromIndex + 1) % this.players.length;
        while (this.players[next].folded || this.players[next].allIn) {
            next = (next + 1) % this.players.length;
            if (next === fromIndex) break; // Wrap around
        }
        return next;
    }

    _nextPlayer() {
        this.currentPlayerIndex = this._nextActivePlayer(this.currentPlayerIndex);
        
        // Check if betting is complete
        if (this.isBettingComplete()) {
            this.phase = 'waiting';
        }
    }

    _actionLog(message) {
        // Can be overridden by UI
        console.log(message);
    }

    // ── Get game state for UI ───────────────────────────────

    getState() {
        return {
            pot: this.pot,
            currentBet: this.currentBet,
            round: this.round,
            bettingRound: this.bettingRound,
            phase: this.phase,
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                chips: p.chips,
                cards: p.cards,
                folded: p.folded,
                allIn: p.allIn,
                currentBet: p.currentBet,
                hand: p.hand,
                isHuman: p.isHuman
            })),
            currentPlayerIndex: this.currentPlayerIndex,
            dealerIndex: this.dealerIndex,
            totalRounds: this.totalRounds,
            gameOver: this.gameOver,
            lastWinner: this.lastWinner ? {
                id: this.lastWinner.id,
                name: this.lastWinner.name,
                isHuman: this.lastWinner.isHuman,
                hand: this.lastWinner.hand
            } : null
        };
    }

    // ── Get available actions for current player ─────────────

    getAvailableActions() {
        const player = this.getCurrentPlayer();
        if (!player || player.folded || player.allIn) return [];

        const actions = [];
        const callAmount = this.currentBet - player.currentBet;

        if (callAmount <= 0) {
            actions.push('check');
        } else if (player.chips >= callAmount) {
            actions.push('call');
        }

        if (player.chips > callAmount && this.raisesThisRound < MAXRaises_PER_ROUND) {
            actions.push('raise');
        }

        actions.push('fold');

        return actions;
    }

    // ── Start new round (after showdown) ────────────────────

    prepareNextHand() {
        this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
        this.totalRounds++;
        this.newHand();
        this.startBettingRound();
    }
}
