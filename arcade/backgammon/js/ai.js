/**
 * ai.js — AI opponent strategy
 */

var AI = (function() {

    // ── Choose Best Move ─────────────────────────────────────────────────────
    function chooseMove(boardState, dice, moveCombos) {
        if (moveCombos.length === 0) return 0;
        if (moveCombos.length === 1) return 0;

        var bestScore = -Infinity;
        var bestIndex = 0;

        for (var i = 0; i < moveCombos.length; i++) {
            var score = evaluateMoveCombo(boardState, moveCombos[i]);
            if (score > bestScore) {
                bestScore = score;
                bestIndex = i;
            }
        }

        return bestIndex;
    }

    // ── Evaluate Move Combination ────────────────────────────────────────────
    function evaluateMoveCombo(boardState, moves) {
        var tempBoard = boardState.slice();
        var totalScore = 0;

        for (var i = 0; i < moves.length; i++) {
            totalScore += evaluateSingleMove(tempBoard, moves[i]);
            applyMoveToTemp(tempBoard, moves[i]);
        }

        return totalScore;
    }

    // ── Evaluate Single Move ─────────────────────────────────────────────────
    function evaluateSingleMove(board, move) {
        var score = 0;

        // Bearing off is very good
        if (move.type === BG.MOVE_TYPE.BEAR_OFF) {
            score += 100;
            return score;
        }

        // Hitting a blot is good
        if (move.type === BG.MOVE_TYPE.HIT) {
            score += 50;
        }

        // Entering from bar is necessary
        if (move.type === BG.MOVE_TYPE.BAR) {
            score += 80;
            return score;
        }

        // Making a point (having 2+ checkers) is good
        var destCount = Math.abs(board[move.to]);
        if (destCount === 1) {
            // Making a new point
            score += 30;
        }

        // Advancing runners
        var distance = move.to - move.from;
        if (distance > 0) {
            score += distance * 2;
        }

        // Prefer moving from higher points (further from home)
        score += move.from * 0.5;

        // Avoid leaving blots
        var fromCount = Math.abs(board[move.from]);
        if (fromCount === 2) {
            // Leaving a blot
            score -= 20;
        }

        // Prefer points in home board
        if (move.to >= 19 && move.to <= 24) {
            score += 10;
        }

        // Prefer making points on 5, 7 (key points)
        if (move.to === 5 || move.to === 7 || move.to === 19 || move.to === 20) {
            score += 15;
        }

        return score;
    }

    // ── Apply Move to Temp Board ─────────────────────────────────────────────
    function applyMoveToTemp(board, move) {
        var player = board[move.from] < 0 ? BG.AI : BG.PLAYER;

        // Remove from source
        board[move.from] += player === BG.PLAYER ? -1 : 1;

        // Hit blot
        if (move.type === BG.MOVE_TYPE.HIT) {
            var hitPlayer = player === BG.PLAYER ? BG.AI : BG.PLAYER;
            var barPoint = hitPlayer === BG.PLAYER ? BG.BAR_PLAYER : BG.BAR_AI;
            board[move.to] = 0;
            board[barPoint] += hitPlayer === BG.PLAYER ? 1 : -1;
        }

        // Add to destination
        if (move.type === BG.MOVE_TYPE.BEAR_OFF) {
            var offPoint = player === BG.PLAYER ? BG.OFF_PLAYER : BG.OFF_AI;
            board[offPoint] += player === BG.PLAYER ? 1 : -1;
        } else {
            board[move.to] += player === BG.PLAYER ? -1 : 1;
        }
    }

    return {
        chooseMove: chooseMove
    };

})();
