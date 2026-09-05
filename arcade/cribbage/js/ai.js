// ai.js — Cribbage AI opponent | MagmaCrunch Media © 2026
// Card selection for crib and pegging strategy

const CribbageAI = {

    // ── Select 2 cards for the crib ───────────────────────────
    // Returns array of 2 cards to discard. `cribIsOpponents` is true when the
    // human deals, so the crib these cards land in is not the AI's to score.
    selectCribCards(hand, cribIsOpponents) {
        if (hand.length !== 6) return hand.slice(0, 2);

        // Score each possible pair of cards to discard
        let bestDiscard = null;
        let bestScore = -Infinity;

        for (let i = 0; i < hand.length; i++) {
            for (let j = i + 1; j < hand.length; j++) {
                const discard = [hand[i], hand[j]];
                const remaining = hand.filter((_, idx) => idx !== i && idx !== j);

                // Score this discard
                const score = this.scoreCribDiscard(remaining, discard, cribIsOpponents);
                if (score > bestScore) {
                    bestScore = score;
                    bestDiscard = discard;
                }
            }
        }

        return bestDiscard || hand.slice(0, 2);
    },

    // ── Score a crib discard choice ───────────────────────────
    // Higher score = better discard
    scoreCribDiscard(remaining, discard, cribIsOpponents) {
        let score = 0;

        // Keep cards that make 15s
        for (let i = 0; i < remaining.length; i++) {
            for (let j = i + 1; j < remaining.length; j++) {
                if (pegValue(remaining[i].rank) + pegValue(remaining[j].rank) === 15) {
                    score += 4;
                }
            }
        }

        // Keep pairs
        const rankCounts = {};
        for (const card of remaining) {
            rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
        }
        for (const rank in rankCounts) {
            if (rankCounts[rank] === 2) score += 2;
        }

        // Keep runs
        const values = remaining.map(c => CribbageScore.order(c.rank)).sort((a, b) => a - b);
        for (let i = 0; i < values.length - 2; i++) {
            if (values[i + 1] === values[i] + 1 && values[i + 2] === values[i] + 2) {
                score += 3;
            }
        }

        // Keep flush potential
        const suits = remaining.map(c => c.suit);
        const suitCounts = {};
        for (const suit of suits) {
            suitCounts[suit] = (suitCounts[suit] || 0) + 1;
        }
        for (const suit in suitCounts) {
            if (suitCounts[suit] === 3) score += 2;
        }

        // Keep 5s (good for making 15s with 10-value cards)
        for (const card of remaining) {
            if (card.rank === '5') score += 1;
        }

        // Penalize giving good cards to the opponent's crib
        if (cribIsOpponents) {
            for (const card of discard) {
                if (card.rank === '5') score -= 2;
                if (['10', 'J', 'Q', 'K'].includes(card.rank)) score -= 1;
            }
        }

        return score;
    },

    // ── Select card for pegging ───────────────────────────────
    // Returns the best card to play
    selectPeggingCard(hand, currentCount, playedCards) {
        const playable = hand.filter(c => pegValue(c.rank) + currentCount <= MAX_PEG_COUNT);

        if (playable.length === 0) return null; // Go

        if (playable.length === 1) return playable[0];

        // Score each playable card
        let bestCard = null;
        let bestScore = -Infinity;

        for (const card of playable) {
            const score = this.scorePeggingPlay(card, currentCount, playedCards, hand);
            if (score > bestScore) {
                bestScore = score;
                bestCard = card;
            }
        }

        return bestCard || playable[0];
    },

    // ── Score a pegging play ──────────────────────────────────
    // Higher score = better play
    scorePeggingPlay(card, currentCount, playedCards, hand) {
        let score = 0;
        const newCount = currentCount + pegValue(card.rank);

        // Check for 15 or 31
        if (newCount === 15 || newCount === 31) {
            score += 2;
        }

        // Check for pair
        if (playedCards.length > 0) {
            const lastCard = playedCards[playedCards.length - 1];
            if (card.rank === lastCard.rank) {
                score += 2;

                // Check for three of a kind
                if (playedCards.length >= 2 && playedCards[playedCards.length - 2].rank === card.rank) {
                    score += 4; // Total 6 for three of a kind
                }

                // Check for four of a kind
                if (playedCards.length >= 3 && playedCards[playedCards.length - 3].rank === card.rank) {
                    score += 6; // Total 12 for four of a kind
                }
            }
        }

        // Check for run
        if (playedCards.length >= 2) {
            const lastN = playedCards.slice(-2).concat(card);
            const sorted = [...lastN].sort((a, b) => CribbageScore.order(a.rank) - CribbageScore.order(b.rank));
            const isRun = sorted.every((c, i) => i === 0 || CribbageScore.order(c.rank) === CribbageScore.order(sorted[i - 1].rank) + 1);
            if (isRun) score += lastN.length;
        }

        // Avoid giving opponent 15s and 31s
        // (This is a simple heuristic - a better AI would look ahead)
        if (newCount === 15 || newCount === 31) {
            // These are good for us, already scored above
        } else if (newCount === 10 || newCount === 20 || newCount === 25) {
            // These positions make it easy for opponent to hit 15 or 31
            score -= 1;
        }

        // Prefer playing low cards when count is high
        if (newCount > 25) {
            score -= pegValue(card.rank) / 10;
        }

        // Prefer playing cards that leave good options
        const remainingAfter = hand.filter(c => c !== card);
        const playableAfter = remainingAfter.filter(c => pegValue(c.rank) + newCount <= MAX_PEG_COUNT);
        score += playableAfter.length * 0.5;

        return score;
    },

    // ── Decide whether to add to crib ────────────────────────
    // (For simplicity, AI always adds to crib when it's their turn)
    shouldAddToCrib(isDealer) {
        // In standard cribbage, players always add to the crib
        return true;
    }
};
