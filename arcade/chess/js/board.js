/**
 * board.js — Board representation, move generation, validation
 * Pure logic, no DOM dependencies
 */

var Board = (function() {

    // ── State ────────────────────────────────────────────────────────────────
    var board = [];
    var castlingRights = { player: { kingside: true, queenside: true }, ai: { kingside: true, queenside: true } };
    var enPassantTarget = null; // { row, col } or null
    var lastMove = null; // { from: {row,col}, to: {row,col} }

    function init() {
        board = [];
        for (var r = 0; r < CH.BOARD_SIZE; r++) {
            board[r] = [];
            for (var c = 0; c < CH.BOARD_SIZE; c++) {
                var piece = CH.INITIAL_BOARD[r][c];
                if (piece) {
                    board[r][c] = { type: piece.type, owner: piece.owner };
                } else {
                    board[r][c] = null;
                }
            }
        }
        castlingRights = {
            player: { kingside: true, queenside: true },
            ai: { kingside: true, queenside: true }
        };
        enPassantTarget = null;
        lastMove = null;
    }

    function getState() {
        var copy = [];
        for (var r = 0; r < CH.BOARD_SIZE; r++) {
            copy[r] = [];
            for (var c = 0; c < CH.BOARD_SIZE; c++) {
                if (board[r][c]) {
                    copy[r][c] = { type: board[r][c].type, owner: board[r][c].owner };
                } else {
                    copy[r][c] = null;
                }
            }
        }
        return copy;
    }

    function setState(state) {
        board = [];
        for (var r = 0; r < CH.BOARD_SIZE; r++) {
            board[r] = [];
            for (var c = 0; c < CH.BOARD_SIZE; c++) {
                if (state[r][c]) {
                    board[r][c] = { type: state[r][c].type, owner: state[r][c].owner };
                } else {
                    board[r][c] = null;
                }
            }
        }
    }

    function setCastlingRights(rights) {
        castlingRights = JSON.parse(JSON.stringify(rights));
    }

    function getCastlingRights() {
        return JSON.parse(JSON.stringify(castlingRights));
    }

    function setEnPassantTarget(target) {
        enPassantTarget = target;
    }

    function getEnPassantTarget() {
        return enPassantTarget;
    }

    function setLastMove(move) {
        lastMove = move;
    }

    function getLastMove() {
        return lastMove;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    function isInBounds(row, col) {
        return row >= 0 && row < CH.BOARD_SIZE && col >= 0 && col < CH.BOARD_SIZE;
    }

    function getPiece(row, col) {
        if (!isInBounds(row, col)) return null;
        return board[row][col];
    }

    function getOwner(row, col) {
        var piece = getPiece(row, col);
        return piece ? piece.owner : null;
    }

    function isPlayerPiece(row, col) {
        return getOwner(row, col) === CH.PLAYER;
    }

    function isAIPiece(row, col) {
        return getOwner(row, col) === CH.AI;
    }

    function isEnemyPiece(row, col, player) {
        var owner = getOwner(row, col);
        return owner !== null && owner !== player;
    }

    function isFriendlyPiece(row, col, player) {
        return getOwner(row, col) === player;
    }

    function findKing(player) {
        for (var r = 0; r < CH.BOARD_SIZE; r++) {
            for (var c = 0; c < CH.BOARD_SIZE; c++) {
                var piece = board[r][c];
                if (piece && piece.type === CH.KING && piece.owner === player) {
                    return { row: r, col: c };
                }
            }
        }
        return null;
    }

    // ── Move Generation ──────────────────────────────────────────────────────
    function getSlidingMoves(row, col, directions) {
        var piece = board[row][col];
        if (!piece) return [];

        var moves = [];
        var player = piece.owner;

        for (var d = 0; d < directions.length; d++) {
            var dr = directions[d][0];
            var dc = directions[d][1];
            var r = row + dr;
            var c = col + dc;

            while (isInBounds(r, c)) {
                if (board[r][c] === null) {
                    moves.push({ from: { row: row, col: col }, to: { row: r, col: c } });
                } else if (isEnemyPiece(r, c, player)) {
                    moves.push({ from: { row: row, col: col }, to: { row: r, col: c } });
                    break;
                } else {
                    break;
                }
                r += dr;
                c += dc;
            }
        }

        return moves;
    }

    function getKnightMoves(row, col) {
        var piece = board[row][col];
        if (!piece) return [];

        var moves = [];
        var player = piece.owner;
        var offsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        for (var i = 0; i < offsets.length; i++) {
            var r = row + offsets[i][0];
            var c = col + offsets[i][1];
            if (isInBounds(r, c) && !isFriendlyPiece(r, c, player)) {
                moves.push({ from: { row: row, col: col }, to: { row: r, col: c } });
            }
        }

        return moves;
    }

    function getKingMoves(row, col) {
        var piece = board[row][col];
        if (!piece) return [];

        var moves = [];
        var player = piece.owner;
        var directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        for (var d = 0; d < directions.length; d++) {
            var r = row + directions[d][0];
            var c = col + directions[d][1];
            if (isInBounds(r, c) && !isFriendlyPiece(r, c, player)) {
                moves.push({ from: { row: row, col: col }, to: { row: r, col: c } });
            }
        }

        // Castling
        if (castlingRights[player].kingside) {
            if (!board[row][5] && !board[row][6] && board[row][7] && board[row][7].type === CH.ROOK && board[row][7].owner === player) {
                if (!isSquareAttacked(row, 4, player) && !isSquareAttacked(row, 5, player) && !isSquareAttacked(row, 6, player)) {
                    moves.push({ from: { row: row, col: 4 }, to: { row: row, col: 6 }, isKingsideCastle: true });
                }
            }
        }
        if (castlingRights[player].queenside) {
            if (!board[row][3] && !board[row][2] && !board[row][1] && board[row][0] && board[row][0].type === CH.ROOK && board[row][0].owner === player) {
                if (!isSquareAttacked(row, 4, player) && !isSquareAttacked(row, 3, player) && !isSquareAttacked(row, 2, player)) {
                    moves.push({ from: { row: row, col: 4 }, to: { row: row, col: 2 }, isQueensideCastle: true });
                }
            }
        }

        return moves;
    }

    function getPawnMoves(row, col) {
        var piece = board[row][col];
        if (!piece) return [];

        var moves = [];
        var player = piece.owner;
        var direction = player === CH.PLAYER ? -1 : 1;
        var startRow = player === CH.PLAYER ? 6 : 1;
        var promotionRow = player === CH.PLAYER ? 0 : 7;

        // Forward one
        var r = row + direction;
        if (isInBounds(r, col) && !board[r][col]) {
            if (r === promotionRow) {
                moves.push({ from: { row: row, col: col }, to: { row: r, col: col }, promotion: true });
            } else {
                moves.push({ from: { row: row, col: col }, to: { row: r, col: col } });
            }

            // Forward two from start
            if (row === startRow) {
                var r2 = row + direction * 2;
                if (isInBounds(r2, col) && !board[r2][col]) {
                    moves.push({ from: { row: row, col: col }, to: { row: r2, col: col }, enPassantCreate: true });
                }
            }
        }

        // Captures
        var captureCols = [col - 1, col + 1];
        for (var i = 0; i < captureCols.length; i++) {
            var c = captureCols[i];
            if (isInBounds(r, c)) {
                if (isEnemyPiece(r, c, player)) {
                    if (r === promotionRow) {
                        moves.push({ from: { row: row, col: col }, to: { row: r, col: c }, promotion: true });
                    } else {
                        moves.push({ from: { row: row, col: col }, to: { row: r, col: c } });
                    }
                }
                // En passant
                if (enPassantTarget && enPassantTarget.row === r && enPassantTarget.col === c) {
                    moves.push({ from: { row: row, col: col }, to: { row: r, col: c }, enPassant: true });
                }
            }
        }

        return moves;
    }

    function getRawMoves(row, col) {
        var piece = board[row][col];
        if (!piece) return [];

        switch (piece.type) {
            case CH.PAWN:
                return getPawnMoves(row, col);
            case CH.KNIGHT:
                return getKnightMoves(row, col);
            case CH.BISHOP:
                return getSlidingMoves(row, col, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
            case CH.ROOK:
                return getSlidingMoves(row, col, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
            case CH.QUEEN:
                return getSlidingMoves(row, col, [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]);
            case CH.KING:
                return getKingMoves(row, col);
            default:
                return [];
        }
    }

    // ── Check Detection ──────────────────────────────────────────────────────
    function isSquareAttacked(row, col, byPlayer) {
        var opponent = byPlayer === CH.PLAYER ? CH.AI : CH.PLAYER;

        // Check all opponent pieces
        for (var r = 0; r < CH.BOARD_SIZE; r++) {
            for (var c = 0; c < CH.BOARD_SIZE; c++) {
                var piece = board[r][c];
                if (piece && piece.owner === opponent) {
                    var attacks = [];
                    switch (piece.type) {
                        case CH.PAWN:
                            var dir = opponent === CH.PLAYER ? -1 : 1;
                            attacks = [
                                { row: r + dir, col: c - 1 },
                                { row: r + dir, col: c + 1 }
                            ];
                            for (var a = 0; a < attacks.length; a++) {
                                if (attacks[a].row === row && attacks[a].col === col) return true;
                            }
                            break;
                        case CH.KNIGHT:
                            var offsets = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
                            for (var o = 0; o < offsets.length; o++) {
                                if (r + offsets[o][0] === row && c + offsets[o][1] === col) return true;
                            }
                            break;
                        case CH.BISHOP:
                            attacks = getSlidingAttacks(r, c, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
                            for (var a = 0; a < attacks.length; a++) {
                                if (attacks[a].row === row && attacks[a].col === col) return true;
                            }
                            break;
                        case CH.ROOK:
                            attacks = getSlidingAttacks(r, c, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
                            for (var a = 0; a < attacks.length; a++) {
                                if (attacks[a].row === row && attacks[a].col === col) return true;
                            }
                            break;
                        case CH.QUEEN:
                            attacks = getSlidingAttacks(r, c, [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]);
                            for (var a = 0; a < attacks.length; a++) {
                                if (attacks[a].row === row && attacks[a].col === col) return true;
                            }
                            break;
                        case CH.KING:
                            var offsets = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
                            for (var o = 0; o < offsets.length; o++) {
                                if (r + offsets[o][0] === row && c + offsets[o][1] === col) return true;
                            }
                            break;
                    }
                }
            }
        }

        return false;
    }

    function getSlidingAttacks(row, col, directions) {
        var attacks = [];
        for (var d = 0; d < directions.length; d++) {
            var dr = directions[d][0];
            var dc = directions[d][1];
            var r = row + dr;
            var c = col + dc;
            while (isInBounds(r, c)) {
                if (board[r][c]) {
                    attacks.push({ row: r, col: c });
                    break;
                }
                r += dr;
                c += dc;
            }
        }
        return attacks;
    }

    function isInCheck(player) {
        var king = findKing(player);
        if (!king) return false;
        return isSquareAttacked(king.row, king.col, player);
    }

    // ── Move Validation ──────────────────────────────────────────────────────
    function wouldBeInCheck(move, player) {
        // Simulate the move and check if king is in check
        var savedBoard = getState();
        var savedEnPassant = enPassantTarget;
        var savedCastling = getCastlingRights();

        // Apply move
        applyMoveRaw(move);

        var inCheck = isInCheck(player);

        // Restore state
        setState(savedBoard);
        enPassantTarget = savedEnPassant;
        castlingRights = savedCastling;

        return inCheck;
    }

    function applyMoveRaw(move) {
        var piece = board[move.from.row][move.from.col];

        // Handle en passant capture
        if (move.enPassant) {
            var capturedRow = move.from.row;
            board[capturedRow][move.to.col] = null;
        }

        // Handle castling rook movement
        if (move.isKingsideCastle) {
            board[move.from.row][5] = board[move.from.row][7];
            board[move.from.row][7] = null;
        }
        if (move.isQueensideCastle) {
            board[move.from.row][3] = board[move.from.row][0];
            board[move.from.row][0] = null;
        }

        // Move piece
        board[move.to.row][move.to.col] = piece;
        board[move.from.row][move.from.col] = null;

        // Handle promotion (default to queen for raw moves)
        if (move.promotion) {
            board[move.to.row][move.to.col] = { type: CH.QUEEN, owner: piece.owner };
        }
    }

    function getLegalMoves(row, col) {
        var piece = board[row][col];
        if (!piece) return [];

        var rawMoves = getRawMoves(row, col);
        var legalMoves = [];

        for (var i = 0; i < rawMoves.length; i++) {
            if (!wouldBeInCheck(rawMoves[i], piece.owner)) {
                legalMoves.push(rawMoves[i]);
            }
        }

        return legalMoves;
    }

    function getAllLegalMoves(player) {
        var moves = [];
        for (var r = 0; r < CH.BOARD_SIZE; r++) {
            for (var c = 0; c < CH.BOARD_SIZE; c++) {
                var piece = board[r][c];
                if (piece && piece.owner === player) {
                    var pieceMoves = getLegalMoves(r, c);
                    for (var i = 0; i < pieceMoves.length; i++) {
                        pieceMoves[i].piece = piece;
                        moves.push(pieceMoves[i]);
                    }
                }
            }
        }
        return moves;
    }

    // ── Apply Move ───────────────────────────────────────────────────────────
    function applyMove(move) {
        var piece = board[move.from.row][move.from.col];
        if (!piece) return { captured: null, promoted: false, castled: false, enPassant: false };

        var player = piece.owner;
        var opponent = player === CH.PLAYER ? CH.AI : CH.PLAYER;
        var captured = null;
        var promoted = false;
        var castled = false;
        var enPassantCapture = false;

        // Update en passant target
        if (move.enPassantCreate) {
            enPassantTarget = {
                row: (move.from.row + move.to.row) / 2,
                col: move.to.col
            };
        } else {
            enPassantTarget = null;
        }

        // Handle en passant capture
        if (move.enPassant) {
            captured = board[move.from.row][move.to.col];
            board[move.from.row][move.to.col] = null;
            enPassantCapture = true;
        } else {
            captured = board[move.to.row][move.to.col];
        }

        // Handle castling
        if (move.isKingsideCastle) {
            board[move.from.row][5] = board[move.from.row][7];
            board[move.from.row][7] = null;
            castled = true;
        }
        if (move.isQueensideCastle) {
            board[move.from.row][3] = board[move.from.row][0];
            board[move.from.row][0] = null;
            castled = true;
        }

        // Update castling rights
        if (piece.type === CH.KING) {
            castlingRights[player].kingside = false;
            castlingRights[player].queenside = false;
        }
        if (piece.type === CH.ROOK) {
            if (move.from.col === 0) castlingRights[player].queenside = false;
            if (move.from.col === 7) castlingRights[player].kingside = false;
        }
        // If rook captured, remove opponent's castling rights
        if (captured && captured.type === CH.ROOK) {
            if (move.to.row === 0 && move.to.col === 0) castlingRights.ai.queenside = false;
            if (move.to.row === 0 && move.to.col === 7) castlingRights.ai.kingside = false;
            if (move.to.row === 7 && move.to.col === 0) castlingRights.player.queenside = false;
            if (move.to.row === 7 && move.to.col === 7) castlingRights.player.kingside = false;
        }

        // Move piece
        board[move.to.row][move.to.col] = piece;
        board[move.from.row][move.from.col] = null;

        // Handle promotion
        if (move.promotionType) {
            board[move.to.row][move.to.col] = { type: move.promotionType, owner: player };
            promoted = true;
        }

        // Update last move
        lastMove = { from: move.from, to: move.to };

        return {
            captured: captured,
            promoted: promoted,
            castled: castled,
            enPassant: enPassantCapture
        };
    }

    // ── Win Detection ────────────────────────────────────────────────────────
    function getWinner() {
        if (hasCheckmate(CH.AI)) return CH.PLAYER;
        if (hasCheckmate(CH.PLAYER)) return CH.AI;
        return null;
    }

    function hasCheckmate(player) {
        if (!isInCheck(player)) return false;
        return getAllLegalMoves(player).length === 0;
    }

    function hasStalemate(player) {
        if (isInCheck(player)) return false;
        return getAllLegalMoves(player).length === 0;
    }

    function isGameOver() {
        return getAllLegalMoves(CH.PLAYER).length === 0 || getAllLegalMoves(CH.AI).length === 0;
    }

    function getGameResult() {
        var playerMoves = getAllLegalMoves(CH.PLAYER);
        var aiMoves = getAllLegalMoves(CH.AI);

        if (playerMoves.length === 0) {
            if (isInCheck(CH.PLAYER)) return 'checkmate-ai';
            return 'stalemate';
        }
        if (aiMoves.length === 0) {
            if (isInCheck(CH.AI)) return 'checkmate-player';
            return 'stalemate';
        }
        return null;
    }

    // ── Piece Count ──────────────────────────────────────────────────────────
    function getPieceCount(player) {
        var count = 0;
        for (var r = 0; r < CH.BOARD_SIZE; r++) {
            for (var c = 0; c < CH.BOARD_SIZE; c++) {
                if (board[r][c] && board[r][c].owner === player) {
                    count++;
                }
            }
        }
        return count;
    }

    function getMaterialScore(player) {
        var score = 0;
        for (var r = 0; r < CH.BOARD_SIZE; r++) {
            for (var c = 0; c < CH.BOARD_SIZE; c++) {
                if (board[r][c] && board[r][c].owner === player) {
                    score += CH.PIECE_VALUES[board[r][c].type];
                }
            }
        }
        return score;
    }

    // ── Debug ────────────────────────────────────────────────────────────────
    function toString() {
        var s = '';
        for (var r = 0; r < CH.BOARD_SIZE; r++) {
            for (var c = 0; c < CH.BOARD_SIZE; c++) {
                var piece = board[r][c];
                if (!piece) s += '.';
                else if (piece.owner === CH.PLAYER) s += piece.type[0].toUpperCase();
                else s += piece.type[0].toLowerCase();
                s += ' ';
            }
            s += '\n';
        }
        return s;
    }

    return {
        init: init,
        getState: getState,
        setState: setState,
        setCastlingRights: setCastlingRights,
        getCastlingRights: getCastlingRights,
        setEnPassantTarget: setEnPassantTarget,
        getEnPassantTarget: getEnPassantTarget,
        setLastMove: setLastMove,
        getLastMove: getLastMove,
        isInBounds: isInBounds,
        getPiece: getPiece,
        getOwner: getOwner,
        findKing: findKing,
        isSquareAttacked: isSquareAttacked,
        isInCheck: isInCheck,
        getRawMoves: getRawMoves,
        getLegalMoves: getLegalMoves,
        getAllLegalMoves: getAllLegalMoves,
        applyMove: applyMove,
        wouldBeInCheck: wouldBeInCheck,
        getWinner: getWinner,
        hasCheckmate: hasCheckmate,
        hasStalemate: hasStalemate,
        isGameOver: isGameOver,
        getGameResult: getGameResult,
        getPieceCount: getPieceCount,
        getMaterialScore: getMaterialScore,
        toString: toString
    };

})();
