/**
 * ai.js — Simple AI opponent logic for Aggravation
 * Priority: capture > advance farthest > leave home > move any
 */

var AI = (function() {
    'use strict';

    var THINK_DELAY = 600;

    function chooseMove(color, diceValue, pawnPositions) {
        var moves = AC.getLegalMoves(color, diceValue, pawnPositions);
        if (moves.length === 0) return null;
        if (moves.length === 1) return moves[0];

        // Score each move
        var scored = moves.map(function(move) {
            var score = 0;

            // Highest priority: capture an opponent
            if (move.capture) score += 1000;

            // Second: enter from yard (if we have marbles stuck)
            if (move.enterFromYard) score += 500;

            // Third: enter home run or advance in home run
            if (move.enteredHome) score += 400;
            if (move.newPos && typeof move.newPos === 'object' && 'home' in move.newPos) {
                score += 300 + move.newPos.home * 10;
            }

            // Fourth: finish a marble
            if (move.newPos === 'finished') score += 800;

            // Fifth: advance further on track (relative to entry position)
            if (move.newPos && typeof move.newPos === 'object' && 'track' in move.newPos) {
                var entry = AC.COLOR_CONFIG[color].entry;
                var trackPos = move.newPos.track;
                // Distance from entry going clockwise
                var distFromEntry = (trackPos - entry + AC.TRACK_SIZE) % AC.TRACK_SIZE;
                score += distFromEntry;
            }

            // Small random factor for variety
            score += Math.random() * 5;

            return { move: move, score: score };
        });

        scored.sort(function(a, b) { return b.score - a.score; });
        return scored[0].move;
    }

    function getThinkDelay() { return THINK_DELAY; }

    return { chooseMove: chooseMove, getThinkDelay: getThinkDelay };
})();
