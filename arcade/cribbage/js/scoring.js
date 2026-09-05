// scoring.js — Cribbage scoring | MagmaCrunch Media © 2026
//
// The rules everything else in the game counts by, browser and tests alike.
//
// This deliberately does not use AdCards.CribbageHandEval. That scorer builds
// runs out of pegging values, so J-Q-K reads as three tens rather than a run,
// and it pays every sub-run of a sequence instead of the longest one only —
// 2-3-4-5 scores 10 there where cribbage pays 4. Both are wrong on ordinary
// hands. The logic here mirrors arcade/cribbage/server.py, which the
// multiplayer server has scored by all along and which tests/test_game_logic.py
// covers.

(function (root) {
    'use strict';

    // Where a card sits in a run. J, Q and K stay distinct here.
    const ORDER = {
        A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
        '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13
    };

    const SCORE = {
        FIFTEEN: 2,
        PAIR: 2,
        THREE_OF_KIND: 6,
        FOUR_OF_KIND: 12,
        FLUSH_4: 4,
        FLUSH_5: 5,
        NOBS: 1,        // Jack in hand matching the starter's suit
        HIS_HEELS: 2,   // Jack turned as the starter
        GO: 1,
        THIRTY_ONE: 2
    };

    // What a card is worth toward fifteen and thirty-one: every court card ten.
    function value(rank) {
        return Math.min(ORDER[rank], 10);
    }

    // Where a card sits in a run.
    function order(rank) {
        return ORDER[rank];
    }

    function countTo(cards) {
        return cards.reduce((sum, card) => sum + value(card.rank), 0);
    }

    // Every subset summing to fifteen, two points each.
    function countFifteens(cards) {
        let fifteens = 0;
        for (let mask = 1; mask < 1 << cards.length; mask++) {
            let sum = 0;
            for (let i = 0; i < cards.length; i++) {
                if (mask & (1 << i)) sum += value(cards[i].rank);
            }
            if (sum === 15) fifteens++;
        }
        return fifteens * SCORE.FIFTEEN;
    }

    function countPairs(cards) {
        const byRank = {};
        for (const card of cards) byRank[card.rank] = (byRank[card.rank] || 0) + 1;

        let points = 0;
        for (const rank in byRank) {
            if (byRank[rank] === 2) points += SCORE.PAIR;
            else if (byRank[rank] === 3) points += SCORE.THREE_OF_KIND;
            else if (byRank[rank] === 4) points += SCORE.FOUR_OF_KIND;
        }
        return points;
    }

    // Only the longest run in a sequence scores, once for each way of building
    // it from duplicate ranks — a double run of three is 8, not 3 + 3 + 3.
    function countRuns(cards) {
        if (cards.length < 3) return 0;

        const counts = {};
        for (const card of cards) {
            const val = order(card.rank);
            counts[val] = (counts[val] || 0) + 1;
        }
        const values = Object.keys(counts).map(Number).sort((a, b) => a - b);

        let points = 0;
        let i = 0;
        while (i < values.length) {
            let j = i;
            while (j + 1 < values.length && values[j + 1] === values[j] + 1) j++;

            const length = j - i + 1;
            if (length >= 3) {
                let ways = 1;
                for (let k = i; k <= j; k++) ways *= counts[values[k]];
                points += length * ways;
            }
            i = j + 1;
        }
        return points;
    }

    // The starter never makes a four-card flush, and a crib flush must be five.
    function countFlush(hand, starter, isCrib) {
        if (hand.length < 4) return 0;

        const suit = hand[0].suit;
        if (!hand.every(card => card.suit === suit)) return 0;

        if (starter && starter.suit === suit) return SCORE.FLUSH_5;
        return isCrib ? 0 : SCORE.FLUSH_4;
    }

    function countNobs(hand, starter) {
        if (!starter) return 0;
        return hand.some(card => card.rank === 'J' && card.suit === starter.suit)
            ? SCORE.NOBS
            : 0;
    }

    function scoreHand(hand, starter, isCrib = false) {
        const all = starter ? [...hand, starter] : [...hand];
        const breakdown = {
            fifteens: countFifteens(all),
            pairs: countPairs(all),
            runs: countRuns(all),
            flush: countFlush(hand, starter, isCrib),
            nobs: countNobs(hand, starter)
        };
        const total = Object.values(breakdown).reduce((sum, n) => sum + n, 0);
        return { total, breakdown };
    }

    // Score laying `card` on top of `playedCards`, the series so far this go.
    function scorePegging(card, playedCards) {
        const sequence = [...playedCards, card];
        const count = countTo(sequence);

        let points = 0;
        const parts = [];

        if (count === 15) {
            points += SCORE.FIFTEEN;
            parts.push('Fifteen!');
        }
        if (count === 31) {
            points += SCORE.THIRTY_ONE;
            parts.push('Thirty-one!');
        }

        // Pairs count back from the card just laid, so a pair royal only scores
        // while the equal ranks are unbroken.
        let matching = 1;
        for (let i = playedCards.length - 1; i >= 0 && playedCards[i].rank === card.rank; i--) {
            matching++;
        }
        if (matching === 2) {
            points += SCORE.PAIR;
            parts.push('Pair!');
        } else if (matching === 3) {
            points += SCORE.THREE_OF_KIND;
            parts.push('Pair royal!');
        } else if (matching >= 4) {
            points += SCORE.FOUR_OF_KIND;
            parts.push('Double pair royal!');
        }

        // The longest tail of the series that forms a run, played in any order.
        for (let length = sequence.length; length >= 3; length--) {
            const tail = sequence.slice(-length)
                .map(c => order(c.rank))
                .sort((a, b) => a - b);
            const consecutive = tail.every((val, i) => i === 0 || val === tail[i - 1] + 1);
            if (consecutive) {
                points += length;
                parts.push(`Run of ${length}!`);
                break;
            }
        }

        return { points, description: parts.join(' + ') };
    }

    const CribbageScore = {
        ORDER,
        SCORE,
        value,
        order,
        countTo,
        countFifteens,
        countPairs,
        countRuns,
        countFlush,
        countNobs,
        scoreHand,
        scorePegging
    };

    root.CribbageScore = CribbageScore;
    if (typeof module !== 'undefined' && module.exports) module.exports = CribbageScore;
})(typeof globalThis !== 'undefined' ? globalThis : this);
