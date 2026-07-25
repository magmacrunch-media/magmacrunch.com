// scoring.js — French Tarot | MagmaCrunch Media © 2026
// Point counting, oudler detection, contract evaluation

const Scoring = {

    // Count oudlers in a set of cards
    countOudlers(cards) {
        return cards.filter(c => c.isOudler).length;
    },

    // Calculate total card points in a set of cards
    countPoints(cards) {
        let points = 0;
        for (const card of cards) {
            points += card.pointValue;
        }
        return points;
    },

    // Get the point threshold needed to win based on oudler count
    getThreshold(oudlerCount) {
        return OUDLER_THRESHOLDS[oudlerCount] || 56;
    },

    // Determine if the taker made the contract
    evaluateContract(takerCards, oudlerCount) {
        const points = this.countPoints(takerCards);
        const threshold = this.getThreshold(oudlerCount);
        const difference = points - threshold;

        return {
            points,
            threshold,
            difference,
            made: difference >= 0,
            oudlers: oudlerCount
        };
    },

    // Calculate the base hand score (before multiplier)
    calculateBaseScore(difference, petitAuBout) {
        let base = 25 + Math.abs(difference);
        if (petitAuBout) {
            base += BONUSES.PETIT_AU_BOUT;
        }
        return base;
    },

    // Calculate the final hand score with multiplier and bonuses
    calculateHandScore(made, difference, multiplier, petitAuBout, poignee) {
        let baseScore = this.calculateBaseScore(difference, petitAuBout);
        let handScore = baseScore * multiplier;

        // Add poignee bonus (not multiplied)
        if (poignee) {
            handScore += poignee.points;
        }

        // If taker failed, score is positive (defenders gain)
        // If taker succeeded, score is negative (defenders lose)
        return made ? -handScore : handScore;
    },

    // Distribute scores to all players
    distributeScores(takerIndex, handScore, playerCount) {
        const scores = new Array(playerCount).fill(0);

        if (handScore < 0) {
            // Taker won: taker gets positive, defenders lose
            scores[takerIndex] = Math.abs(handScore) * (playerCount - 1);
            for (let i = 0; i < playerCount; i++) {
                if (i !== takerIndex) {
                    scores[i] = handScore; // negative
                }
            }
        } else {
            // Defenders won: taker loses, defenders each gain
            scores[takerIndex] = -handScore * (playerCount - 1);
            for (let i = 0; i < playerCount; i++) {
                if (i !== takerIndex) {
                    scores[i] = handScore; // each defender gains handScore
                }
            }
        }

        return scores;
    },

    // Evaluate a hand for bidding purposes (0-100 scale)
    evaluateHandForBidding(hand) {
        let points = 0;

        // Oudlers are very valuable
        for (const card of hand) {
            if (card.type === 'excuse') {
                points += 20;
            } else if (card.type === 'trump' && card.number === 21) {
                points += 16;
            } else if (card.type === 'trump' && card.number === 1) {
                points += 10;
            } else if (card.type === 'trump') {
                // High trumps are worth more
                if (card.number >= 16) points += 4;
                else if (card.number >= 10) points += 2;
                else points += 1;
            }
        }

        // Count trumps
        const trumpCount = hand.filter(c => c.type === 'trump').length;
        if (trumpCount >= 8) points += (trumpCount - 7) * 2;

        // Count voids and singletons
        const suitCounts = {};
        for (const card of hand) {
            if (card.type === 'suited') {
                suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
            }
        }
        for (const suit of TAROT_SUITS) {
            const count = suitCounts[suit] || 0;
            if (count === 0) points += 6;
            else if (count === 1) points += 3;
        }

        // Kings are valuable
        const kings = hand.filter(c => c.rank === 'R').length;
        points += kings * 4;

        return Math.min(points, 100);
    },

    // Determine suggested bid based on hand evaluation
    suggestBid(hand) {
        const eval_ = this.evaluateHandForBidding(hand);

        if (eval_ >= 80) return 'GARDE_CONTRE';
        if (eval_ >= 65) return 'GARDE_SANS';
        if (eval_ >= 50) return 'GARDE';
        if (eval_ >= 35) return 'PRISE';
        return 'PASSE';
    }
};
