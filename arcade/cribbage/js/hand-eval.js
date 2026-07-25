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
    // Returns points for all runs found (3+ cards)
    countRuns(cards) {
        if (cards.length < 3) return 0;

        // Sort cards by value
        const sorted = [...cards].sort((a, b) => RANK_VALUES[a.rank] - RANK_VALUES[b.rank]);

        // Get unique values and their counts
        const valueCounts = {};
        for (const card of cards) {
            const val = RANK_VALUES[card.rank];
            valueCounts[val] = (valueCounts[val] || 0) + 1;
        }

        // Get sorted unique values
        const uniqueValues = Object.keys(valueCounts).map(Number).sort((a, b) => a - b);

        // Find all consecutive sequences of 3+ cards
        let totalPoints = 0;
        let i = 0;

        while (i < uniqueValues.length) {
            // Find the end of the current consecutive sequence
            let j = i;
            while (j + 1 < uniqueValues.length && uniqueValues[j + 1] === uniqueValues[j] + 1) {
                j++;
            }

            const seqLength = j - i + 1;

            // Only score sequences of 3+
            if (seqLength >= 3) {
                // For each starting position in the sequence, calculate the score
                // A sequence of length N contains N-2 runs of length 3, N-3 runs of length 4, etc.
                for (let start = i; start <= j - 2; start++) {
                    for (let end = start + 2; end <= j; end++) {
                        const runLength = end - start + 1;

                        // Calculate multiplier (product of card counts in this run)
                        let multiplier = 1;
                        for (let k = start; k <= end; k++) {
                            multiplier *= valueCounts[uniqueValues[k]];
                        }

                        totalPoints += runLength * multiplier;
                    }
                }
            }

            i = j + 1;
        }

        return totalPoints;
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
        let descriptions = [];

        // Check for 31
        if (count === 31) {
            points += SCORE.THIRTY_ONE;
            descriptions.push('Thirty-one!');
            return { points, description: descriptions.join(' + ') };
        }

        // Check for 15
        if (count === 15) {
            points += SCORE.FIFTEEN;
            descriptions.push('Fifteen!');
        }

        // Check for pairs (last cards same rank)
        if (playedCards.length >= 1) {
            const lastCard = playedCards[playedCards.length - 1];
            if (card.rank === lastCard.rank) {
                // Check for four of a kind
                if (playedCards.length >= 3 && playedCards[playedCards.length - 2].rank === card.rank &&
                    playedCards[playedCards.length - 3].rank === card.rank) {
                    points += SCORE.FOUR_OF_KIND;
                    descriptions.push('Four of a kind!');
                }
                // Check for three of a kind
                else if (playedCards.length >= 2 && playedCards[playedCards.length - 2].rank === card.rank) {
                    points += SCORE.THREE_OF_KIND;
                    descriptions.push('Three of a kind!');
                }
                // Pair
                else {
                    points += SCORE.PAIR;
                    descriptions.push('Pair!');
                }
            }
        }

        // Check for runs (cards ending with current card)
        if (playedCards.length >= 2) {
            // Look back through played cards to find longest run ending with current card
            const allPlayed = [...playedCards, card];
            let runLength = 0;

            // Check all possible run lengths (from 3 up to all played cards)
            for (let len = Math.min(allPlayed.length, 7); len >= 3; len--) {
                // Check the last 'len' cards
                const lastN = allPlayed.slice(-len);
                const values = lastN.map(c => RANK_VALUES[c.rank]).sort((a, b) => a - b);

                // Check if values are consecutive
                let isRun = true;
                for (let i = 1; i < values.length; i++) {
                    if (values[i] !== values[i - 1] + 1) {
                        isRun = false;
                        break;
                    }
                }

                if (isRun) {
                    runLength = len;
                    break;
                }
            }

            if (runLength >= 3) {
                points += runLength;
                descriptions.push(`Run of ${runLength}!`);
            }
        }

        return { points, description: descriptions.join(' + ') || '' };
    }
};
