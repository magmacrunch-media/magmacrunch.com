/**
 * board.js — Board representation and move validation
 * Pure logic, no DOM dependencies
 */

var Board = (function() {

    // ── State ────────────────────────────────────────────────────────────────
    var board = [];

    function init() {
        board = [];
        for (var r = 0; r < CK.BOARD_SIZE; r++) {
            board[r] = [];
            for (var c = 0; c < CK.BOARD_SIZE; c++) {
                board[r][c] = CK.INITIAL_BOARD[r][c];
            }
        }
    }

    function getState() {
        var copy = [];
        for (var r = 0; r < CK.BOARD_SIZE; r++) {
            copy[r] = board[r].slice();
        }
        return copy;
    }

    function setState(state) {
        board = [];
        for (var r = 0; r < CK.BOARD_SIZE; r++) {
            board[r] = state[r].slice();
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    function isDarkSquare(row, col) {
        return (row + col) % 2 === 1;
    }

    function isInBounds(row, col) {
        return row >= 0 && row < CK.BOARD_SIZE && col >= 0 && col < CK.BOARD_SIZE;
    }

    function getPiece(row, col) {
        if (!isInBounds(row, col)) return null;
        return board[row][col];
    }

    function isPlayerPiece(piece) {
        return piece === CK.PLAYER_PIECE || piece === CK.PLAYER_KING;
    }

    function isAIPiece(piece) {
        return piece === CK.AI_PIECE || piece === CK.AI_KING;
    }

    function isKing(piece) {
        return piece === CK.PLAYER_KING || piece === CK.AI_KING;
    }

    function getOwner(piece) {
        if (isPlayerPiece(piece)) return CK.PLAYER;
        if (isAIPiece(piece)) return CK.AI;
        return null;
    }

    function getDirection(player) {
        return player === CK.PLAYER ? -1 : 1; // Player moves up, AI moves down
    }

    function getKingRow(player) {
        return player === CK.PLAYER ? 0 : CK.BOARD_SIZE - 1;
    }

    // ── Move Generation ──────────────────────────────────────────────────────
    function getMovesForPiece(row, col) {
        var piece = getPiece(row, col);
        if (piece === CK.EMPTY) return [];

        var player = getOwner(piece);
        var moves = [];
        var jumps = [];

        // Directions: regular pieces move forward, kings move both directions
        var directions = [];
        if (isKing(piece)) {
            directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        } else {
            var dir = getDirection(player);
            directions = [[dir, -1], [dir, 1]];
        }

        // Check each direction
        for (var i = 0; i < directions.length; i++) {
            var dr = directions[i][0];
            var dc = directions[i][1];
            var newRow = row + dr;
            var newCol = col + dc;

            // Normal move
            if (isInBounds(newRow, newCol) && getPiece(newRow, newCol) === CK.EMPTY) {
                moves.push({
                    from: { row: row, col: col },
                    to: { row: newRow, col: newCol },
                    type: CK.MOVE_TYPE.NORMAL,
                    jumps: []
                });
            }

            // Jump move
            var jumpRow = row + dr * 2;
            var jumpCol = col + dc * 2;
            if (isInBounds(jumpRow, jumpCol) && getPiece(jumpRow, jumpCol) === CK.EMPTY) {
                var midPiece = getPiece(newRow, newCol);
                if (midPiece !== CK.EMPTY && getOwner(midPiece) !== player) {
                    jumps.push({
                        from: { row: row, col: col },
                        to: { row: jumpRow, col: jumpCol },
                        type: CK.MOVE_TYPE.JUMP,
                        jumped: { row: newRow, col: newCol },
                        jumps: [{ row: newRow, col: newCol }]
                    });
                }
            }
        }

        // Check for multi-jumps
        for (var i = 0; i < jumps.length; i++) {
            var jump = jumps[i];
            var multiJumps = getMultiJumps(jump.to.row, jump.to.col, [jump.from, jump.to], [jump.jumped]);
            for (var j = 0; j < multiJumps.length; j++) {
                jumps.push(multiJumps[j]);
            }
        }

        // Jumps are mandatory if available
        if (jumps.length > 0) {
            return jumps;
        }

        return moves;
    }

    function getMultiJumps(row, col, visited, jumpedPieces) {
        var piece = getPiece(row, col);
        if (piece === CK.EMPTY) return [];

        var player = getOwner(piece);
        var multiJumps = [];

        var directions = [];
        if (isKing(piece)) {
            directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        } else {
            var dir = getDirection(player);
            directions = [[dir, -1], [dir, 1]];
        }

        for (var i = 0; i < directions.length; i++) {
            var dr = directions[i][0];
            var dc = directions[i][1];
            var midRow = row + dr;
            var midCol = col + dc;
            var jumpRow = row + dr * 2;
            var jumpCol = col + dc * 2;

            if (isInBounds(jumpRow, jumpCol) && getPiece(jumpRow, jumpCol) === CK.EMPTY) {
                var midPiece = getPiece(midRow, midCol);
                if (midPiece !== CK.EMPTY && getOwner(midPiece) !== player) {
                    // Check if we already jumped this piece
                    var alreadyJumped = false;
                    for (var j = 0; j < jumpedPieces.length; j++) {
                        if (jumpedPieces[j].row === midRow && jumpedPieces[j].col === midCol) {
                            alreadyJumped = true;
                            break;
                        }
                    }

                    if (!alreadyJumped) {
                        var newVisited = visited.slice();
                        newVisited.push({ row: jumpRow, col: jumpCol });

                        var newJumped = jumpedPieces.slice();
                        newJumped.push({ row: midRow, col: midCol });

                        var jumpMove = {
                            from: visited[0],
                            to: { row: jumpRow, col: jumpCol },
                            type: CK.MOVE_TYPE.MULTI_JUMP,
                            jumped: { row: midRow, col: midCol },
                            jumps: newJumped
                        };

                        multiJumps.push(jumpMove);

                        // Check for further jumps
                        var furtherJumps = getMultiJumps(jumpRow, jumpCol, newVisited, newJumped);
                        for (var k = 0; k < furtherJumps.length; k++) {
                            multiJumps.push(furtherJumps[k]);
                        }
                    }
                }
            }
        }

        return multiJumps;
    }

    function getLegalMoves(player) {
        var allMoves = [];
        var allJumps = [];

        for (var r = 0; r < CK.BOARD_SIZE; r++) {
            for (var c = 0; c < CK.BOARD_SIZE; c++) {
                var piece = getPiece(r, c);
                if (piece !== CK.EMPTY && getOwner(piece) === player) {
                    var moves = getMovesForPiece(r, c);
                    for (var i = 0; i < moves.length; i++) {
                        if (moves[i].type === CK.MOVE_TYPE.JUMP || moves[i].type === CK.MOVE_TYPE.MULTI_JUMP) {
                            allJumps.push(moves[i]);
                        } else {
                            allMoves.push(moves[i]);
                        }
                    }
                }
            }
        }

        // Jumps are mandatory
        if (allJumps.length > 0) {
            return allJumps;
        }

        return allMoves;
    }

    function getMovesFromPosition(row, col) {
        return getMovesForPiece(row, col);
    }

    // ── Apply Move ───────────────────────────────────────────────────────────
    function applyMove(move) {
        var piece = getPiece(move.from.row, move.from.col);
        var player = getOwner(piece);

        // Remove piece from source
        board[move.from.row][move.from.col] = CK.EMPTY;

        // Remove jumped pieces
        if (move.jumps) {
            for (var i = 0; i < move.jumps.length; i++) {
                board[move.jumps[i].row][move.jumps[i].col] = CK.EMPTY;
            }
        }

        // Place piece at destination
        board[move.to.row][move.to.col] = piece;

        // Check for king promotion
        if (move.to.row === getKingRow(player)) {
            if (player === CK.PLAYER && piece === CK.PLAYER_PIECE) {
                board[move.to.row][move.to.col] = CK.PLAYER_KING;
            } else if (player === CK.AI && piece === CK.AI_PIECE) {
                board[move.to.row][move.to.col] = CK.AI_KING;
            }
        }

        return {
            promoted: move.to.row === getKingRow(player) && !isKing(piece)
        };
    }

    // ── Win Detection ────────────────────────────────────────────────────────
    function getPlayerPieceCount(player) {
        var count = 0;
        for (var r = 0; r < CK.BOARD_SIZE; r++) {
            for (var c = 0; c < CK.BOARD_SIZE; c++) {
                if (getOwner(getPiece(r, c)) === player) {
                    count++;
                }
            }
        }
        return count;
    }

    function hasMoves(player) {
        return getLegalMoves(player).length > 0;
    }

    function getWinner() {
        var playerPieces = getPlayerPieceCount(CK.PLAYER);
        var aiPieces = getPlayerPieceCount(CK.AI);

        if (playerPieces === 0) return CK.AI;
        if (aiPieces === 0) return CK.PLAYER;

        if (!hasMoves(CK.PLAYER)) return CK.AI;
        if (!hasMoves(CK.AI)) return CK.PLAYER;

        return null;
    }

    // ── Debug ────────────────────────────────────────────────────────────────
    function toString() {
        var s = '';
        for (var r = 0; r < CK.BOARD_SIZE; r++) {
            for (var c = 0; c < CK.BOARD_SIZE; c++) {
                var piece = board[r][c];
                if (piece === CK.EMPTY) s += '.';
                else if (piece === CK.PLAYER_PIECE) s += 'p';
                else if (piece === CK.AI_PIECE) s += 'a';
                else if (piece === CK.PLAYER_KING) s += 'P';
                else if (piece === CK.AI_KING) s += 'A';
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
        isDarkSquare: isDarkSquare,
        isInBounds: isInBounds,
        getPiece: getPiece,
        isPlayerPiece: isPlayerPiece,
        isAIPiece: isAIPiece,
        isKing: isKing,
        getOwner: getOwner,
        getMovesForPiece: getMovesForPiece,
        getLegalMoves: getLegalMoves,
        getMovesFromPosition: getMovesFromPosition,
        applyMove: applyMove,
        getPlayerPieceCount: getPlayerPieceCount,
        hasMoves: hasMoves,
        getWinner: getWinner,
        toString: toString
    };

})();
