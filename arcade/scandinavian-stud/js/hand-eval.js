// hand-eval.js — Sökö (Scandinavian Stud) | MagmaCrunch Media © 2026
// Evaluates the best 5-card poker hand with Sökö-specific hands:
// - Four-Card Flush (4 cards same suit, ranked above Two Pair)
// - Four-Card Straight (4 sequential cards, ranked above One Pair)

class HandEvaluator {

    // ── Main entry point ─────────────────────────────────────
    // Takes an array of 5 Card objects, returns the best result

    evaluate(cards) {
        if (!cards || cards.length < 2) {
            return this._emptyResult();
        }

        // If fewer than 5 cards, evaluate what we have as-is (partial hand)
        if (cards.length < 5) {
            return this._evaluatePartial(cards);
        }

        // Generate all 5-card combinations and find the best
        const combos = this._combinations(cards, 5);
        let best = null;

        for (const combo of combos) {
            const result = this._evaluateFive(combo);
            if (!best || this._compareTo(result, best) > 0) {
                best = result;
            }
        }

        return best;
    }

    // ── Evaluate exactly 5 cards ─────────────────────────────

    _evaluateFive(cards) {
        const sorted  = [...cards].sort((a, b) => b.value - a.value);
        const isFlush    = this._isFlush(cards);
        const isStraight = this._isStraight(sorted);
        const counts     = this._getValueCounts(cards);
        const countVals  = Object.values(counts).sort((a, b) => b - a);

        let name, rank, tiebreakers;

        // Royal Flush
        if (isFlush && isStraight && sorted[0].value === 14 && sorted[1].value === 13) {
            name = 'Royal Flush';
            rank = HAND_RANKS['Royal Flush'];
            tiebreakers = [14];
        }
        // Straight Flush
        else if (isFlush && isStraight) {
            name = 'Straight Flush';
            rank = HAND_RANKS['Straight Flush'];
            tiebreakers = [this._straightHighCard(sorted)];
        }
        // Four of a Kind
        else if (countVals[0] === 4) {
            name = 'Four of a Kind';
            rank = HAND_RANKS['Four of a Kind'];
            tiebreakers = this._tiebreakByCount(counts, [4, 1]);
        }
        // Full House
        else if (countVals[0] === 3 && countVals[1] === 2) {
            name = 'Full House';
            rank = HAND_RANKS['Full House'];
            tiebreakers = this._tiebreakByCount(counts, [3, 2]);
        }
        // Flush (5 cards)
        else if (isFlush) {
            name = 'Flush';
            rank = HAND_RANKS['Flush'];
            tiebreakers = sorted.map(c => c.value);
        }
        // Straight (5 cards)
        else if (isStraight) {
            name = 'Straight';
            rank = HAND_RANKS['Straight'];
            tiebreakers = [this._straightHighCard(sorted)];
        }
        // Three of a Kind
        else if (countVals[0] === 3) {
            name = 'Three of a Kind';
            rank = HAND_RANKS['Three of a Kind'];
            tiebreakers = this._tiebreakByCount(counts, [3, 1, 1]);
        }
        // Two Pair
        else if (countVals[0] === 2 && countVals[1] === 2) {
            name = 'Two Pair';
            rank = HAND_RANKS['Two Pair'];
            tiebreakers = this._tiebreakByCount(counts, [2, 2, 1]);
        }
        // Four-Card Flush (4 of 5 cards same suit)
        else if (this._isFourCardFlush(cards)) {
            name = 'Four-Card Flush';
            rank = HAND_RANKS['Four-Card Flush'];
            tiebreakers = sorted.map(c => c.value);
        }
        // Four-Card Straight (4 of 5 cards sequential)
        else if (this._isFourCardStraight(sorted)) {
            name = 'Four-Card Straight';
            rank = HAND_RANKS['Four-Card Straight'];
            tiebreakers = this._fourCardStraightHigh(sorted);
        }
        // One Pair
        else if (countVals[0] === 2) {
            name = 'One Pair';
            rank = HAND_RANKS['One Pair'];
            tiebreakers = this._tiebreakByCount(counts, [2, 1, 1, 1]);
        }
        // High Card
        else {
            name = 'High Card';
            rank = HAND_RANKS['High Card'];
            tiebreakers = sorted.map(c => c.value);
        }

        return {
            name,
            rank,
            points:      HAND_POINTS[name],
            tiebreakers,
            cards:       sorted,
            description: this._describe(name, sorted)
        };
    }

    // ── Partial hand (fewer than 5 cards) ────────────────────
    // Used during dealing to show current best without full eval

    _evaluatePartial(cards) {
        const sorted = [...cards].sort((a, b) => b.value - a.value);
        const counts = this._getValueCounts(cards);
        const countVals = Object.values(counts).sort((a, b) => b - a);

        let name = 'High Card';
        if (countVals[0] === 4) name = 'Four of a Kind';
        else if (countVals[0] === 3 && countVals[1] === 2) name = 'Full House';
        else if (countVals[0] === 3) name = 'Three of a Kind';
        else if (countVals[0] === 2 && countVals[1] === 2) name = 'Two Pair';
        else if (countVals[0] === 2) name = 'One Pair';

        return {
            name,
            rank:        HAND_RANKS[name] || 0,
            points:      HAND_POINTS[name] || 0,
            tiebreakers: sorted.map(c => c.value),
            cards:       sorted,
            description: `${name} (partial)`,
            partial:     true
        };
    }

    _emptyResult() {
        return {
            name:        'No Cards',
            rank:        -1,
            points:      0,
            tiebreakers: [],
            cards:       [],
            description: 'No cards dealt',
            partial:     true
        };
    }

    // ── Comparison ───────────────────────────────────────────
    // Returns positive if a > b, negative if a < b, 0 if equal

    _compareTo(a, b) {
        if (a.rank !== b.rank) return a.rank - b.rank;
        // Same hand rank — compare tiebreakers left to right
        for (let i = 0; i < Math.max(a.tiebreakers.length, b.tiebreakers.length); i++) {
            const av = a.tiebreakers[i] || 0;
            const bv = b.tiebreakers[i] || 0;
            if (av !== bv) return av - bv;
        }
        return 0;
    }

    // ── Hand checkers ────────────────────────────────────────

    _isFlush(cards) {
        const suit = cards[0].suit;
        return cards.every(c => c.suit === suit);
    }

    _isStraight(sortedCards) {
        // Standard straight: each card one less than previous
        let straight = true;
        for (let i = 0; i < sortedCards.length - 1; i++) {
            if (sortedCards[i].value - sortedCards[i + 1].value !== 1) {
                straight = false;
                break;
            }
        }
        if (straight) return true;

        // Wheel: A-2-3-4-5 (Ace plays low)
        const values = sortedCards.map(c => c.value).sort((a, b) => a - b);
        if (values[4] === 14 &&
            values[0] === 2 &&
            values[1] === 3 &&
            values[2] === 4 &&
            values[3] === 5) {
            return true;
        }

        return false;
    }

    _straightHighCard(sortedCards) {
        // For wheel (A-2-3-4-5), high card is 5
        const values = sortedCards.map(c => c.value).sort((a, b) => a - b);
        if (values[4] === 14 && values[0] === 2 && values[3] === 5) return 5;
        return sortedCards[0].value; // Already sorted high to low
    }

    // ── Sökö-specific: Four-Card Flush ───────────────────────
    // 4 of 5 cards share the same suit

    _isFourCardFlush(cards) {
        const suitCounts = {};
        cards.forEach(c => {
            suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
        });
        return Object.values(suitCounts).some(count => count >= 4);
    }

    // ── Sökö-specific: Four-Card Straight ────────────────────
    // 4 of 5 cards are sequential (order doesn't matter)

    _isFourCardStraight(sortedCards) {
        const values = sortedCards.map(c => c.value).sort((a, b) => a - b);
        
        // Check all 4-card subsets for sequential cards
        // Try removing each card and check if remaining 4 are sequential
        for (let skip = 0; skip < 5; skip++) {
            const subset = values.filter((_, i) => i !== skip);
            if (this._isSequential(subset)) return true;
        }
        
        // Special case: A-2-3-4 (wheel partial)
        if (values.includes(14)) {
            const lowValues = values.filter(v => v !== 14);
            if (lowValues.includes(2) && lowValues.includes(3) && lowValues.includes(4)) {
                return true;
            }
        }
        
        return false;
    }

    _isSequential(sortedValues) {
        // Check if 4 sorted values are sequential
        for (let i = 0; i < sortedValues.length - 1; i++) {
            if (sortedValues[i + 1] - sortedValues[i] !== 1) return false;
        }
        return true;
    }

    _fourCardStraightHigh(sortedCards) {
        const values = sortedCards.map(c => c.value).sort((a, b) => a - b);
        
        // Find the highest 4-card straight
        let bestHigh = 0;
        
        for (let skip = 0; skip < 5; skip++) {
            const subset = values.filter((_, i) => i !== skip);
            if (this._isSequential(subset)) {
                bestHigh = Math.max(bestHigh, subset[3]); // Highest card in the 4-card run
            }
        }
        
        // Special case: A-2-3-4 (wheel partial)
        if (values.includes(14)) {
            const lowValues = values.filter(v => v !== 14);
            if (lowValues.includes(2) && lowValues.includes(3) && lowValues.includes(4)) {
                bestHigh = Math.max(bestHigh, 5); // 5 is high in this wheel partial
            }
        }
        
        return bestHigh;
    }

    // ── Count helpers ────────────────────────────────────────

    _getValueCounts(cards) {
        const counts = {};
        cards.forEach(c => {
            counts[c.value] = (counts[c.value] || 0) + 1;
        });
        return counts;
    }

    // Returns card values ordered by their count pattern
    // e.g. pattern [3,1,1] returns [tripValue, kickerHigh, kickerLow]
    _tiebreakByCount(counts, pattern) {
        const groups = {};
        Object.entries(counts).forEach(([val, cnt]) => {
            if (!groups[cnt]) groups[cnt] = [];
            groups[cnt].push(parseInt(val));
        });

        // Sort each group descending
        Object.values(groups).forEach(g => g.sort((a, b) => b - a));

        const result = [];
        const seen = new Set();

        for (const targetCount of pattern) {
            if (groups[targetCount]) {
                for (const val of groups[targetCount]) {
                    if (!seen.has(val)) {
                        result.push(val);
                        seen.add(val);
                        break;
                    }
                }
            }
        }

        return result;
    }

    // ── Combinations generator ───────────────────────────────
    // Generates all k-length combinations from an array

    _combinations(arr, k) {
        const results = [];

        function combine(start, current) {
            if (current.length === k) {
                results.push([...current]);
                return;
            }
            for (let i = start; i < arr.length; i++) {
                current.push(arr[i]);
                combine(i + 1, current);
                current.pop();
            }
        }

        combine(0, []);
        return results;
    }

    // ── Description string ───────────────────────────────────

    _describe(name, sortedCards) {
        const top = sortedCards[0];
        switch (name) {
            case 'Royal Flush':
                return `Royal Flush — ${top.suit}`;
            case 'Straight Flush':
                return `Straight Flush — ${top.rank} high`;
            case 'Four of a Kind':
                return `Four ${top.rank}s`;
            case 'Full House': {
                const counts = this._getValueCounts(sortedCards);
                const triple = Object.entries(counts).find(([,v]) => v === 3);
                const pair   = Object.entries(counts).find(([,v]) => v === 2);
                const rankName = r => sortedCards.find(c => c.value === parseInt(r)).rank;
                return `Full House — ${rankName(triple[0])}s full of ${rankName(pair[0])}s`;
            }
            case 'Flush':
                return `Flush — ${top.rank} high (${top.suit})`;
            case 'Straight':
                return `Straight — ${top.rank} high`;
            case 'Three of a Kind':
                return `Three ${top.rank}s`;
            case 'Two Pair': {
                const counts = this._getValueCounts(sortedCards);
                const pairs = Object.entries(counts)
                    .filter(([,v]) => v === 2)
                    .map(([k]) => sortedCards.find(c => c.value === parseInt(k)).rank)
                    .join('s and ');
                return `Two Pair — ${pairs}s`;
            }
            case 'Four-Card Flush': {
                const suitCounts = {};
                sortedCards.forEach(c => {
                    suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
                });
                const flushSuit = Object.entries(suitCounts).find(([,v]) => v === 4)[0];
                return `Four-Card Flush — ${top.rank} high (${flushSuit})`;
            }
            case 'Four-Card Straight': {
                const high = this._fourCardStraightHigh(sortedCards);
                return `Four-Card Straight — ${high} high`;
            }
            case 'One Pair': {
                const counts = this._getValueCounts(sortedCards);
                const pair = Object.entries(counts).find(([,v]) => v === 2);
                const pairRank = sortedCards.find(c => c.value === parseInt(pair[0])).rank;
                return `Pair of ${pairRank}s`;
            }
            case 'High Card':
                return `${top.rank} high`;
            default:
                return name;
        }
    }
}
