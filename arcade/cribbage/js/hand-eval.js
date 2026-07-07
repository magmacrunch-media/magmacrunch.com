// hand-eval.js — Cribbage hand evaluator | MagmaCrunch Media © 2026
// Scores hands and crib using standard cribbage rules

const CribbageHandEval = {

    // ── Count all 15s in a set of cards ────────────────────────
    // Returns number of 15 combinations (each worth 2 points)
    countFifteens(cards) {
        let count = 0;
        const n = cards.length;

        // Check all subsets of 2+ cards
        for (let mask = 1; mask < (1 << n); mask++) {
            let sum = 0;
            for (let i = 0; i < n; i++) {
                if (mask & (1 << i)) {
                    sum += RANK_VALUES[cards[i].rank];
                }
            }
            if (sum === 15) count++;
        }

        return count;
    },

    // ── Count pairs in a set of cards ─────────────────────────
    // Returns points: 2 for pair, 6 for three of a kind, 12 for four of a kind
    countPairs(cards) {
        const rankCounts = {};
        for (const card of cards) {
            rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
        }

        let points = 0;
        for (const rank in rankCounts) {
            const count = rankCounts[rank];
            if (count === 2) points += SCORE.PAIR;
            else if (count === 3) points += SCORE.THREE_OF_KIND;
            else if (count === 4) points += SCORE.FOUR_OF_KIND;
        }

        return points;
    },

    // ── Count runs in a set of cards ──────────────────────────
    // Returns points for longest run found (3+ cards)
    countRuns(cards) {
        // Sort cards by value
        const sorted = [...cards].sort((a, b) => RANK_VALUES[a.rank] - RANK_VALUES[b.rank]);

        // Get unique values (for run detection)
        const values = [...new Set(sorted.map(c => RANK_VALUES[c.rank]))];

        // Find longest consecutive sequence
        let longestRun = 0;
        let currentRun = 1;
        let runStart = 0;
        let bestRunStart = 0;

        for (let i = 1; i < values.length; i++) {
            if (values[i] === values[i - 1] + 1) {
                currentRun++;
            } else {
                if (currentRun > longestRun) {
                    longestRun = currentRun;
                    bestRunStart = runStart;
                }
                currentRun = 1;
                runStart = i;
            }
        }
        if (currentRun > longestRun) {
            longestRun = currentRun;
            bestRunStart = runStart;
        }

        // Only score runs of 3+
        if (longestRun < 3) return 0;

        // Get the run values
        const runValues = values.slice(bestRunStart, bestRunStart + longestRun);

        // Count how many cards of each rank are in the run
        const rankCounts = {};
        for (const card of cards) {
            const val = RANK_VALUES[card.rank];
            if (runValues.includes(val)) {
                rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
            }
        }

        // Multiply run length by product of card counts
        // e.g., 3-4-5-5 = run of 3 × 2 fives = 6 points
        let multiplier = 1;
        for (const rank in rankCounts) {
            multiplier *= rankCounts[rank];
        }

        return longestRun * multiplier;
    },

    // ── Count flush ───────────────────────────────────────────
    // Returns points: 4 for 4-card flush (hand only), 5 for 5-card (hand + starter)
    countFlush(hand, starter, isCrib) {
        if (!starter) return 0;

        // Check if all 4 hand cards are same suit
        const handSuit = hand[0].suit;
        const isHandFlush = hand.every(c => c.suit === handSuit);

        if (!isHandFlush) return 0;

        // 4-card flush in hand = 4 points
        // 5-card flush (including starter) = 5 points
        if (starter.suit === handSuit) {
            return SCORE.FLUSH_5;
        }

        // In crib, flush requires all 5 cards (hand + starter) to match
        if (isCrib) return 0;

        return SCORE.FLUSH_4;
    },

    // ── Count nobs ────────────────────────────────────────────
    // Returns 1 point for Jack in hand matching starter suit
    countNobs(hand, starter) {
        if (!starter) return 0;

        for (const card of hand) {
            if (card.rank === 'J' && card.suit === starter.suit) {
                return SCORE.NIBS;
            }
        }

        return 0;
    },

    // ── Score a complete hand ─────────────────────────────────
    // hand: 4 cards, starter: 1 card, isCrib: boolean
    // Returns: { total, breakdown: { fifteens, pairs, runs, flush, nobs } }
    scoreHand(hand, starter, isCrib = false) {
        const allCards = starter ? [...hand, starter] : [...hand];

        const fifteens = this.countFifteens(allCards) * SCORE.FIFTEEN;
        const pairs = this.countPairs(allCards);
        const runs = this.countRuns(allCards);
        const flush = this.countFlush(hand, starter, isCrib);
        const nobs = this.countNobs(hand, starter);

        return {
            total: fifteens + pairs + runs + flush + nobs,
            breakdown: { fifteens, pairs, runs, flush, nobs }
        };
    },

    // ── Score a pegging play ──────────────────────────────────
    // card: played card, playedCards: all cards played so far in this count
    // Returns: { points, description }
    scorePeggingPlay(card, playedCards) {
        const count = playedCards.reduce((sum, c) => sum + RANK_VALUES[c.rank], 0) + RANK_VALUES[card.rank];
        let points = 0;
        let description = '';

        // Check for 31
        if (count === 31) {
            points += SCORE.THIRTY_ONE;
            description = 'Thirty-one!';
            return { points, description };
        }

        // Check for 15
        if (count === 15) {
            points += SCORE.FIFTEEN;
            description = 'Fifteen!';
        }

        // Check for pairs (last two cards same rank)
        if (playedCards.length >= 1) {
            const lastCard = playedCards[playedCards.length - 1];
            if (card.rank === lastCard.rank) {
                points += SCORE.PAIR;
                description = 'Pair!';

                // Check for three of a kind
                if (playedCards.length >= 2 && playedCards[playedCards.length - 2].rank === card.rank) {
                    points = SCORE.THREE_OF_KIND;
                    description = 'Three of a kind!';
                }

                // Check for four of a kind
                if (playedCards.length >= 3 && playedCards[playedCards.length - 3].rank === card.rank) {
                    points = SCORE.FOUR_OF_KIND;
                    description = 'Four of a kind!';
                }
            }
        }

        // Check for runs (cards ending with current card)
        if (playedCards.length >= 2) {
            // Look back through played cards to find longest run ending with current card
            const allPlayed = [...playedCards, card];
            let runLength = 1;

            // Check backwards from the end
            for (let i = allPlayed.length - 2; i >= 0; i--) {
                if (RANK_VALUES[allPlayed[i].rank] === RANK_VALUES[allPlayed[i + 1].rank] - 1) {
                    runLength++;
                } else {
                    break;
                }
            }

            // Also check forwards (in case the new card extends a run)
            if (runLength === 1 && allPlayed.length >= 2) {
                for (let i = allPlayed.length - 2; i >= 0; i--) {
                    if (RANK_VALUES[allPlayed[i].rank] === RANK_VALUES[allPlayed[i + 1].rank] + 1) {
                        runLength++;
                    } else {
                        break;
                    }
                }
            }

            if (runLength >= 3) {
                points = runLength;
                description = `Run of ${runLength}!`;
            }
        }

        return { points, description };
    }
};
