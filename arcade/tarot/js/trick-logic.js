// trick-logic.js — French Tarot | MagmaCrunch Media © 2026
// Trick-taking rules: follow suit, overtrump, Excuse handling

const TrickLogic = {

    // Determine the legal plays for a player given the current trick state
    getLegalPlays(hand, trickState) {
        if (!trickState || trickState.cards.length === 0) {
            // Leading: can play anything
            return hand.map(c => c.id);
        }

        const ledSuit = trickState.ledSuit;
        const ledTrump = trickState.ledTrump; // Whether a trump was led
        const highestTrump = trickState.highestTrump; // Highest trump played so far

        // Check what the player has
        const suitedCards = hand.filter(c => c.type === 'suited' && c.suit === ledSuit);
        const trumps = hand.filter(c => c.type === 'trump');
        const excuse = hand.find(c => c.type === 'excuse');

        // Must follow suit if possible (Excuse is always legal)
        if (suitedCards.length > 0) {
            const legal = suitedCards.map(c => c.id);
            if (excuse) legal.push(excuse.id);
            return legal;
        }

        // Can't follow suit — must trump if possible
        if (trumps.length > 0) {
            // Must overtrump if possible
            const overtrumps = trumps.filter(c => c.number > highestTrump);
            if (overtrumps.length > 0) {
                const legal = overtrumps.map(c => c.id);
                if (excuse) legal.push(excuse.id);
                return legal;
            }
            // Can't overtrump — play any trump
            const legal = trumps.map(c => c.id);
            if (excuse) legal.push(excuse.id);
            return legal;
        }

        // Can't follow suit or trump — play anything (can't win)
        return hand.map(c => c.id);
    },

    // Determine the winner of a trick
    determineWinner(trickCards) {
        if (trickCards.length === 0) return null;

        // Find the first non-Excuse card to determine led suit
        let ledSuit = null;
        let ledTrump = false;
        for (const tc of trickCards) {
            if (tc.card.type === 'excuse') continue;
            if (tc.card.type === 'trump') {
                ledTrump = true;
                break;
            }
            if (tc.card.type === 'suited') {
                ledSuit = tc.card.suit;
                break;
            }
        }

        let winner = null;
        let highestTrump = 0;

        for (const tc of trickCards) {
            // Excuse never wins
            if (tc.card.type === 'excuse') continue;

            // Current card is a trump
            if (tc.card.type === 'trump') {
                if (tc.card.number > highestTrump) {
                    winner = tc;
                    highestTrump = tc.card.number;
                }
            }
            // Current card is suited and no trumps have been played
            else if (!ledTrump && tc.card.suit === ledSuit) {
                if (!winner || winner.card.type === 'excuse') {
                    // First valid suited card
                    winner = tc;
                } else if (winner.card.type === 'suited') {
                    // Compare ranks
                    const currentRank = TAROT_RANKS.indexOf(tc.card.rank);
                    const winnerRank = TAROT_RANKS.indexOf(winner.card.rank);
                    if (currentRank > winnerRank) {
                        winner = tc;
                    }
                }
            }
        }

        // Fallback: if no winner found (all excused or no valid plays), first card wins
        if (!winner) {
            winner = trickCards[0];
        }

        return winner.playerIndex;
    },

    // Check if a trick is the last trick
    isLastTrick(trickNumber) {
        return trickNumber >= TRICK_COUNT;
    },

    // Check for Petit au bout (1 of trumps in last trick)
    checkPetitAuBout(trickCards, isLastTrick) {
        if (!isLastTrick) return false;
        return trickCards.some(tc => tc.card.type === 'trump' && tc.card.number === 1);
    },

    // Handle Excuse card rules after trick is won
    handleExcuse(trickCards, trickWinner) {
        const excusePlay = trickCards.find(tc => tc.card.type === 'excuse');
        if (!excusePlay) return null;

        // Excuse stays with the player who played it
        // Compensation (0.5pt card transfer) only needed when Excuse player's team loses
        return {
            excusePlayer: excusePlay.playerIndex,
            trickWinner: trickWinner,
            needsCompensation: excusePlay.playerIndex !== trickWinner
        };
    },

    // Validate a card play against legal moves
    validatePlay(card, hand, trickState) {
        const legalPlays = this.getLegalPlays(hand, trickState);
        return legalPlays.includes(card.id);
    }
};
