/**
 * ai.js — AI opponent with minimax and alpha-beta pruning
 */

var AI = (function() {

    // ── Positional Bonus Tables ──────────────────────────────────────────────
    // Pawns: prefer center advancement
    var PAWN_TABLE = [
        [ 0,  0,  0,  0,  0,  0,  0,  0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [ 5,  5, 10, 25, 25, 10,  5,  5],
        [ 0,  0,  0, 20, 20,  0,  0,  0],
        [ 5, -5,-10,  0,  0,-10, -5,  5],
        [ 5, 10, 10,-20,-20, 10, 10,  5],
        [ 0,  0,  0,  0,  0,  0,  0,  0]
    ];

    // Knight: prefer center squares
    var KNIGHT_TABLE = [
        [-50,-40,-30,-30,-30,-30,-40,-50],
        [-40,-20,  0,  0,  0,  0,-20,-40],
        [-30,  0, 10, 15, 15, 10,  0,-30],
        [-30,  5, 15, 20, 20, 15,  5,-30],
        [-30,  0, 15, 20, 20, 15,  0,-30],
        [-30,  5, 10, 15, 15, 10,  5,-30],
        [-40,-20,  0,  5,  5,  0,-20,-40],
        [-50,-40,-30,-30,-30,-30,-40,-50]
    ];

    // Bishop: prefer diagonals toward center
    var BISHOP_TABLE = [
        [-20,-10,-10,-10,-10,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0, 10, 10, 10, 10,  0,-10],
        [-10,  5,  5, 10, 10,  5,  5,-10],
        [-10,  0, 10, 10, 10, 10,  0,-10],
        [-10, 10, 10, 10, 10, 10, 10,-10],
        [-10,  5,  0,  0,  0,  0,  5,-10],
        [-20,-10,-10,-10,-10,-10,-10,-20]
    ];

    // Rook: prefer open files and 7th rank
    var ROOK_TABLE = [
        [ 0,  0,  0,  0,  0,  0,  0,  0],
        [ 5, 10, 10, 10, 10, 10, 10,  5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [ 0,  0,  0,  5,  5,  0,  0,  0]
    ];

    // Queen: prefer center
    var QUEEN_TABLE = [
        [-20,-10,-10, -5, -5,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5,  5,  5,  5,  0,-10],
        [ -5,  0,  5,  5,  5,  5,  0, -5],
        [  0,  0,  5,  5,  5,  5,  0, -5],
        [-10,  5,  5,  5,  5,  5,  0,-10],
        [-10,  0,  5,  0,  0,  0,  0,-10],
        [-20,-10,-10, -5, -5,-10,-10,-20]
    ];

    // King: prefer corners early, center in endgame
    var KING_MIDDLE_TABLE = [
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-20,-30,-30,-40,-40,-30,-30,-20],
        [-10,-20,-20,-20,-20,-20,-20,-10],
        [ 20, 20,  0,  0,  0,  0, 20, 20],
        [ 20, 30, 10,  0,  0, 10, 30, 20]
    ];

    var POSITION_TABLES = {
        pawn: PAWN_TABLE,
        knight: KNIGHT_TABLE,
        bishop: BISHOP_TABLE,
        rook: ROOK_TABLE,
        queen: QUEEN_TABLE,
        king: KING_MIDDLE_TABLE
    };

    // ── Main AI Function ─────────────────────────────────────────────────────
    function chooseMove(boardState, castling, enPassant, difficulty) {
        Board.setState(boardState);
        Board.setCastlingRights(castling);
        Board.setEnPassantTarget(enPassant);

        var depth = CH.AI_DIFFICULTY[difficulty].depth;
        var moves = Board.getAllLegalMoves(CH.AI);

        if (moves.length === 0) return null;
        if (moves.length === 1) return moves[0];

        // Move ordering: captures first, then center moves
        moves.sort(function(a, b) {
            return getMoveScore(b) - getMoveScore(a);
        });

        var bestMove = null;
        var bestScore = -Infinity;

        for (var i = 0; i < moves.length; i++) {
            var savedBoard = Board.getState();
            var savedCastling = Board.getCastlingRights();
            var savedEnPassant = Board.getEnPassantTarget();

            Board.applyMove(moves[i]);

            var score = minimax(depth - 1, -Infinity, Infinity, false);

            Board.setState(savedBoard);
            Board.setCastlingRights(savedCastling);
            Board.setEnPassantTarget(savedEnPassant);

            if (score > bestScore) {
                bestScore = score;
                bestMove = moves[i];
            }
        }

        return bestMove;
    }

    // ── Minimax with Alpha-Beta Pruning ──────────────────────────────────────
    function minimax(depth, alpha, beta, isMaximizing) {
        if (depth === 0) {
            return evaluateBoard();
        }

        var player = isMaximizing ? CH.AI : CH.PLAYER;
        var moves = Board.getAllLegalMoves(player);

        if (moves.length === 0) {
            if (Board.isInCheck(player)) {
                return isMaximizing ? -100000 + (CH.AI_DIFFICULTY.hard.depth - depth) : 100000 - (CH.AI_DIFFICULTY.hard.depth - depth);
            }
            return 0; // Stalemate
        }

        // Move ordering
        moves.sort(function(a, b) {
            return getMoveScore(b) - getMoveScore(a);
        });

        if (isMaximizing) {
            var maxScore = -Infinity;
            for (var i = 0; i < moves.length; i++) {
                var savedBoard = Board.getState();
                var savedCastling = Board.getCastlingRights();
                var savedEnPassant = Board.getEnPassantTarget();

                Board.applyMove(moves[i]);

                var score = minimax(depth - 1, alpha, beta, false);

                Board.setState(savedBoard);
                Board.setCastlingRights(savedCastling);
                Board.setEnPassantTarget(savedEnPassant);

                maxScore = Math.max(maxScore, score);
                alpha = Math.max(alpha, score);
                if (beta <= alpha) break;
            }
            return maxScore;
        } else {
            var minScore = Infinity;
            for (var i = 0; i < moves.length; i++) {
                var savedBoard = Board.getState();
                var savedCastling = Board.getCastlingRights();
                var savedEnPassant = Board.getEnPassantTarget();

                Board.applyMove(moves[i]);

                var score = minimax(depth - 1, alpha, beta, true);

                Board.setState(savedBoard);
                Board.setCastlingRights(savedCastling);
                Board.setEnPassantTarget(savedEnPassant);

                minScore = Math.min(minScore, score);
                beta = Math.min(beta, score);
                if (beta <= alpha) break;
            }
            return minScore;
        }
    }

    // ── Board Evaluation ─────────────────────────────────────────────────────
    function evaluateBoard() {
        var score = 0;

        for (var r = 0; r < CH.BOARD_SIZE; r++) {
            for (var c = 0; c < CH.BOARD_SIZE; c++) {
                var piece = Board.getPiece(r, c);
                if (piece) {
                    var materialValue = CH.PIECE_VALUES[piece.type];
                    var positionValue = getPositionValue(piece.type, r, c, piece.owner);

                    if (piece.owner === CH.AI) {
                        score += materialValue + positionValue;
                    } else {
                        score -= materialValue + positionValue;
                    }
                }
            }
        }

        return score;
    }

    function getPositionValue(pieceType, row, col, owner) {
        var table = POSITION_TABLES[pieceType];
        if (!table) return 0;

        // Flip table for AI (black) since tables are from white's perspective
        var r = owner === CH.PLAYER ? row : 7 - row;
        return table[r][col];
    }

    function getMoveScore(move) {
        var score = 0;
        var piece = Board.getPiece(move.from.row, move.from.col);
        var target = Board.getPiece(move.to.row, move.to.col);

        // Capture value
        if (target) {
            score += CH.PIECE_VALUES[target.type] * 10 - CH.PIECE_VALUES[piece.type];
        }

        // Promotion bonus
        if (move.promotion) {
            score += 800;
        }

        // Center control
        var centerDist = Math.abs(move.to.row - 3.5) + Math.abs(move.to.col - 3.5);
        score += (7 - centerDist) * 2;

        return score;
    }

    return {
        chooseMove: chooseMove
    };

})();
