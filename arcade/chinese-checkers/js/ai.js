/**
 * ai.js — AI opponent strategy
 * Greedy AI that moves pieces toward the goal
 */

var AI = (function() {

    // ── Choose Best Move ─────────────────────────────────────────────────────
    function chooseMove(boardState) {
        Board.setState(boardState);
        var moves = Board.getLegalMoves(CC.PLAYER2);
        if (moves.length === 0) return null;
        if (moves.length === 1) return moves[0];

        var bestScore = -Infinity;
        var bestIndex = 0;

        for (var i = 0; i < moves.length; i++) {
            var score = evaluateMove(boardState, moves[i]);
            if (score > bestScore) {
                bestScore = score;
                bestIndex = i;
            }
        }

        return moves[bestIndex];
    }

    // ── Evaluate Move ────────────────────────────────────────────────────────
    function evaluateMove(boardState, move) {
        var score = 0;

        // Distance to goal center before and after move
        var goalCenter = getGoalCenter(CC.PLAYER2);
        var startCenter = getGoalCenter(CC.PLAYER1);

        var fromDist = cubeDistance(move.from, goalCenter);
        var toDist = cubeDistance(move.to, goalCenter);

        // Primary: move toward goal
        score += (fromDist - toDist) * 10;

        // Bonus for being in goal
        if (isInGoal(CC.PLAYER2, move.to)) {
            score += 50;
        }

        // Penalty for leaving goal
        if (isInGoal(CC.PLAYER2, move.from) && !isInGoal(CC.PLAYER2, move.to)) {
            score -= 40;
        }

        // Bonus for multi-hop (more efficient movement)
        if (move.type === CC.MOVE_TYPE.MULTI_HOP) {
            score += 15 * move.hops.length;
        } else if (move.type === CC.MOVE_TYPE.HOP) {
            score += 10;
        }

        // Slight bonus for moving pieces that are further from goal
        // (helps spread out movement)
        score += fromDist * 0.5;

        // Bonus for moving pieces that are blocking others
        var neighbors = getNeighborCount(boardState, move.from);
        if (neighbors > 2) {
            score += 5;
        }

        return score;
    }

    // ── Helper: Get goal center position ─────────────────────────────────────
    function getGoalCenter(player) {
        var goal = Board.getGoalPositions(player);
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
    function isInGoal(player, pos) {
        var goal = Board.getGoalPositions(player);
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

    // ── Helper: Count occupied neighbors ─────────────────────────────────────
    function getNeighborCount(boardState, pos) {
        var count = 0;
        for (var i = 0; i < CC.DIRECTIONS.length; i++) {
            var d = CC.DIRECTIONS[i];
            var nq = pos[0] + d[0];
            var nr = pos[1] + d[1];
            var ns = pos[2] + d[2];
            var key = CC.posKey(nq, nr, ns);
            if (boardState[key] && boardState[key] !== CC.EMPTY) {
                count++;
            }
        }
        return count;
    }

    return {
        chooseMove: chooseMove
    };

})();
