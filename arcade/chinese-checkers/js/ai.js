/**
 * ai.js — AI opponent strategy
 * Handles multi-player games with different strategies
 */

var AI = (function() {

    // ── Choose Best Move ─────────────────────────────────────────────────────
    function chooseMove(boardState, playerIdx, playerCount) {
        Board.setState(boardState);
        var moves = Board.getLegalMoves(playerIdx);
        if (moves.length === 0) return null;
        if (moves.length === 1) return moves[0];

        var bestScore = -Infinity;
        var bestIndex = 0;

        for (var i = 0; i < moves.length; i++) {
            var score = evaluateMove(boardState, moves[i], playerIdx, playerCount);
            if (score > bestScore) {
                bestScore = score;
                bestIndex = i;
            }
        }

        return moves[bestIndex];
    }

    // ── Evaluate Move ────────────────────────────────────────────────────────
    function evaluateMove(boardState, move, playerIdx, playerCount) {
        var score = 0;

        // Distance to goal center before and after move
        var goalCenter = getGoalCenter(playerIdx);
        var fromDist = cubeDistance(move.from, goalCenter);
        var toDist = cubeDistance(move.to, goalCenter);

        // Primary: move toward goal
        score += (fromDist - toDist) * 10;

        // Bonus for being in goal
        if (isInGoal(playerIdx, move.to)) {
            score += 50;
        }

        // Penalty for leaving goal
        if (isInGoal(playerIdx, move.from) && !isInGoal(playerIdx, move.to)) {
            score -= 40;
        }

        // Bonus for multi-hop (more efficient movement)
        if (move.type === CC.MOVE_TYPE.MULTI_HOP) {
            score += 15 * move.hops.length;
        }

        // Slight bonus for moving pieces that are further from goal
        score += fromDist * 0.5;

        // Multi-player considerations
        if (playerCount > 2) {
            // Consider blocking opponents
            score += evaluateBlocking(move, playerIdx, playerCount);
        }

        return score;
    }

    // ── Evaluate blocking potential (multi-player) ───────────────────────────
    function evaluateBlocking(move, playerIdx, playerCount) {
        var score = 0;
        var activePlayers = Board.getActivePlayers();

        // Check if move blocks any opponent
        for (var i = 0; i < activePlayers.length; i++) {
            var opponent = activePlayers[i];
            if (opponent === playerIdx) continue;

            var opponentGoal = getGoalCenter(opponent);
            var distToOpponentGoal = cubeDistance(move.to, opponentGoal);

            // Small bonus for being near opponent's goal (potential blocking)
            if (distToOpponentGoal <= 2) {
                score += 3;
            }
        }

        return score;
    }

    // ── Helper: Get goal center position ─────────────────────────────────────
    function getGoalCenter(playerIdx) {
        var goal = CC.getGoalPositions(playerIdx);
        var sumQ = 0, sumR = 0, sumS = 0;
        for (var i = 0; i < goal.length; i++) {
            sumQ += goal[i][0];
            sumR += goal[i][1];
            sumS += goal[i][2];
        }
        return [
            Math.round(sumQ / goal.length),
            Math.round(sumR / goal.length),
            Math.round(sumS / goal.length)
        ];
    }

    // ── Helper: Check if position is in goal ─────────────────────────────────
    function isInGoal(playerIdx, pos) {
        var goal = CC.getGoalPositions(playerIdx);
        for (var i = 0; i < goal.length; i++) {
            if (goal[i][0] === pos[0] && goal[i][1] === pos[1] && goal[i][2] === pos[2]) {
                return true;
            }
        }
        return false;
    }

    // ── Helper: Cube distance ────────────────────────────────────────────────
    function cubeDistance(a, b) {
        return Math.max(
            Math.abs(a[0] - b[0]),
            Math.abs(a[1] - b[1]),
            Math.abs(a[2] - b[2])
        );
    }

    return {
        chooseMove: chooseMove
    };

})();
