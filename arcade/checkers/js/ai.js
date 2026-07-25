/**
 * ai.js — AI opponent strategy
 */

var AI = (function() {

    // ── Choose Best Move ─────────────────────────────────────────────────────
    function chooseMove(boardState) {
        Board.setState(boardState);
        var moves = Board.getLegalMoves(CK.AI);
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

        // Multi-jump is best
        if (move.type === CK.MOVE_TYPE.MULTI_JUMP) {
            score += 100 * move.jumps.length;
        }
        // Single jump is good
        else if (move.type === CK.MOVE_TYPE.JUMP) {
            score += 80;
        }
        // Normal move
        else {
            score += 10;
        }

        // King promotion
        var piece = boardState[move.from.row][move.from.col];
        if (!isKing(piece) && move.to.row === getKingRow(CK.AI)) {
            score += 60;
        }

        // Control center
        var centerDist = Math.abs(move.to.row - 3.5) + Math.abs(move.to.col - 3.5);
        score += (7 - centerDist) * 2;

        // Protect pieces - don't leave pieces vulnerable
        if (move.type === CK.MOVE_TYPE.NORMAL) {
            if (isVulnerable(boardState, move.to.row, move.to.col)) {
                score -= 30;
            }
        }

        // Advance toward king row
        if (piece === CK.AI_PIECE) {
            score += move.to.row * 3;
        }

        // Protect own pieces
        if (move.type === CK.MOVE_TYPE.NORMAL) {
            // Check if moving exposes other pieces
            var tempBoard = copyBoard(boardState);
            tempBoard[move.from.row][move.from.col] = CK.EMPTY;
            tempBoard[move.to.row][move.to.col] = piece;

            // Count how many of our pieces are now vulnerable
            var vulnerableCount = 0;
            for (var r = 0; r < CK.BOARD_SIZE; r++) {
                for (var c = 0; c < CK.BOARD_SIZE; c++) {
                    if (Board.isAIPiece(tempBoard[r][c]) && isVulnerable(tempBoard, r, c)) {
                        vulnerableCount++;
                    }
                }
            }
            score -= vulnerableCount * 15;
        }

        return score;
    }

    // ── Helper Functions ─────────────────────────────────────────────────────
    function isKing(piece) {
        return piece === CK.PLAYER_KING || piece === CK.AI_KING;
    }

    function getKingRow(player) {
        return player === CK.PLAYER ? 0 : CK.BOARD_SIZE - 1;
    }

    function copyBoard(boardState) {
        var copy = [];
        for (var r = 0; r < CK.BOARD_SIZE; r++) {
            copy[r] = boardState[r].slice();
        }
        return copy;
    }

    function isVulnerable(boardState, row, col) {
        // Check if an opponent can jump this piece
        var piece = boardState[row][col];
        if (piece === CK.EMPTY) return false;

        var player = Board.getOwner(piece);
        var opponent = player === CK.PLAYER ? CK.AI : CK.PLAYER;

        // Check all diagonal directions for opponent pieces that could jump
        var directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        for (var i = 0; i < directions.length; i++) {
            var dr = directions[i][0];
            var dc = directions[i][1];

            // Check if opponent piece is adjacent
            var adjRow = row + dr;
            var adjCol = col + dc;
            if (Board.isInBounds(adjRow, adjCol)) {
                var adjPiece = boardState[adjRow][adjCol];
                if (adjPiece !== CK.EMPTY && Board.getOwner(adjPiece) === opponent) {
                    // Check if it can jump us
                    var jumpRow = row - dr;
                    var jumpCol = col - dc;
                    if (Board.isInBounds(jumpRow, jumpCol) && boardState[jumpRow][jumpCol] === CK.EMPTY) {
                        // Check if the opponent piece can move in this direction
                        if (Board.isKing(adjPiece) || (opponent === CK.AI && dr === -1) || (opponent === CK.PLAYER && dr === 1)) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    return {
        chooseMove: chooseMove
    };

})();
