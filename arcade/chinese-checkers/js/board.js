/**
 * board.js — Board representation and move validation
 * Pure logic, no DOM dependencies
 */

var Board = (function() {

    // ── State ────────────────────────────────────────────────────────────────
    // Map from position key to player (CC.PLAYER1, CC.PLAYER2, or CC.EMPTY)
    var cells = {};

    function init() {
        cells = {};
        // Initialize all positions as empty
        for (var i = 0; i < CC.POSITIONS.length; i++) {
            var pos = CC.POSITIONS[i];
            cells[CC.posKey(pos[0], pos[1], pos[2])] = CC.EMPTY;
        }
    }

    function reset() {
        init();
        // Place player 1 pieces (top triangle)
        for (var i = 0; i < CC.PLAYER1_START.length; i++) {
            var pos = CC.PLAYER1_START[i];
            cells[CC.posKey(pos[0], pos[1], pos[2])] = CC.PLAYER1;
        }
        // Place player 2 pieces (bottom triangle)
        for (var i = 0; i < CC.PLAYER2_START.length; i++) {
            var pos = CC.PLAYER2_START[i];
            cells[CC.posKey(pos[0], pos[1], pos[2])] = CC.PLAYER2;
        }
    }

    function getState() {
        var copy = {};
        for (var key in cells) {
            copy[key] = cells[key];
        }
        return copy;
    }

    function setState(state) {
        cells = {};
        for (var key in state) {
            cells[key] = state[key];
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    function getPiece(q, r, s) {
        var key = CC.posKey(q, r, s);
        return cells[key] !== undefined ? cells[key] : null;
    }

    function setPiece(q, r, s, player) {
        var key = CC.posKey(q, r, s);
        if (cells[key] !== undefined) {
            cells[key] = player;
        }
    }

    function isEmpty(q, r, s) {
        return getPiece(q, r, s) === CC.EMPTY;
    }

    function isValidPosition(q, r, s) {
        return cells[CC.posKey(q, r, s)] !== undefined;
    }

    function getOwner(q, r, s) {
        var piece = getPiece(q, r, s);
        if (piece === CC.PLAYER1 || piece === CC.PLAYER2) return piece;
        return null;
    }

    // ── Get neighbors of a position ──────────────────────────────────────────
    function getNeighbors(q, r, s) {
        var neighbors = [];
        for (var i = 0; i < CC.DIRECTIONS.length; i++) {
            var d = CC.DIRECTIONS[i];
            var nq = q + d[0];
            var nr = r + d[1];
            var ns = s + d[2];
            if (isValidPosition(nq, nr, ns)) {
                neighbors.push([nq, nr, ns]);
            }
        }
        return neighbors;
    }

    // ── Get adjacent moves (move to empty neighbor) ──────────────────────────
    function getAdjacentMoves(q, r, s) {
        var moves = [];
        var neighbors = getNeighbors(q, r, s);
        for (var i = 0; i < neighbors.length; i++) {
            var n = neighbors[i];
            if (isEmpty(n[0], n[1], n[2])) {
                moves.push({
                    from: [q, r, s],
                    to: n,
                    type: CC.MOVE_TYPE.ADJACENT,
                    hops: []
                });
            }
        }
        return moves;
    }

    // ── Get hop moves (jump over neighbor into empty space) ──────────────────
    function getHopMoves(q, r, s) {
        var moves = [];
        for (var i = 0; i < CC.DIRECTIONS.length; i++) {
            var d = CC.DIRECTIONS[i];
            // Middle position (the piece we jump over)
            var mq = q + d[0];
            var mr = r + d[1];
            var ms = s + d[2];
            // Landing position
            var lq = q + d[0] * 2;
            var lr = r + d[1] * 2;
            var ls = s + d[2] * 2;

            if (isValidPosition(mq, mr, ms) && !isEmpty(mq, mr, ms) &&
                isValidPosition(lq, lr, ls) && isEmpty(lq, lr, ls)) {
                moves.push({
                    from: [q, r, s],
                    to: [lq, lr, ls],
                    type: CC.MOVE_TYPE.HOP,
                    hops: [[mq, mr, ms]]
                });
            }
        }
        return moves;
    }

    // ── Get multi-hop moves (chain of hops in same direction) ────────────────
    function getMultiHopMoves(q, r, s) {
        var allMoves = [];
        var visited = {};
        visited[CC.posKey(q, r, s)] = true;

        function findHops(cq, cr, cs, path) {
            for (var i = 0; i < CC.DIRECTIONS.length; i++) {
                var d = CC.DIRECTIONS[i];
                var mq = cq + d[0];
                var mr = cr + d[1];
                var ms = cs + d[2];
                var lq = cq + d[0] * 2;
                var lr = cr + d[1] * 2;
                var ls = cs + d[2] * 2;
                var lkey = CC.posKey(lq, lr, ls);

                if (isValidPosition(mq, mr, ms) && !isEmpty(mq, mr, ms) &&
                    isValidPosition(lq, lr, ls) && isEmpty(lq, lr, ls) &&
                    !visited[lkey]) {

                    visited[lkey] = true;
                    var newPath = path.slice();
                    newPath.push([mq, mr, ms]);

                    allMoves.push({
                        from: [q, r, s],
                        to: [lq, lr, ls],
                        type: CC.MOVE_TYPE.MULTI_HOP,
                        hops: newPath.slice()
                    });

                    // Continue hopping from new position
                    findHops(lq, lr, ls, newPath);
                }
            }
        }

        findHops(q, r, s, []);
        return allMoves;
    }

    // ── Get all legal moves for a piece ──────────────────────────────────────
    function getMovesForPiece(q, r, s) {
        var piece = getPiece(q, r, s);
        if (piece === CC.EMPTY) return [];

        var adjacent = getAdjacentMoves(q, r, s);
        var hops = getMultiHopMoves(q, r, s);

        // If hops are available, only hops are allowed (you must maximize movement)
        // Actually in Chinese checkers, you CAN choose to just move adjacent
        // But multi-hop is optional - you can stop at any point
        return adjacent.concat(hops);
    }

    // ── Get all legal moves for a player ─────────────────────────────────────
    function getLegalMoves(player) {
        var allMoves = [];
        for (var key in cells) {
            if (cells[key] === player) {
                var pos = CC.parseKey(key);
                var moves = getMovesForPiece(pos[0], pos[1], pos[2]);
                for (var i = 0; i < moves.length; i++) {
                    allMoves.push(moves[i]);
                }
            }
        }
        return allMoves;
    }

    // ── Apply a move ─────────────────────────────────────────────────────────
    function applyMove(move) {
        var piece = getPiece(move.from[0], move.from[1], move.from[2]);
        setPiece(move.from[0], move.from[1], move.from[2], CC.EMPTY);
        setPiece(move.to[0], move.to[1], move.to[2], piece);
    }

    // ── Win detection ────────────────────────────────────────────────────────
    function getPlayerPieceCount(player) {
        var count = 0;
        for (var key in cells) {
            if (cells[key] === player) count++;
        }
        return count;
    }

    function getGoalPositions(player) {
        if (player === CC.PLAYER1) return CC.PLAYER1_GOAL;
        if (player === CC.PLAYER2) return CC.PLAYER2_GOAL;
        return [];
    }

    function getStartPositions(player) {
        if (player === CC.PLAYER1) return CC.PLAYER1_START;
        if (player === CC.PLAYER2) return CC.PLAYER2_START;
        return [];
    }

    function isInGoal(player, q, r, s) {
        var goal = getGoalPositions(player);
        for (var i = 0; i < goal.length; i++) {
            if (goal[i][0] === q && goal[i][1] === r && goal[i][2] === s) {
                return true;
            }
        }
        return false;
    }

    function countPiecesInGoal(player) {
        var count = 0;
        var goal = getGoalPositions(player);
        for (var i = 0; i < goal.length; i++) {
            if (getPiece(goal[i][0], goal[i][1], goal[i][2]) === player) {
                count++;
            }
        }
        return count;
    }

    function hasWon(player) {
        return countPiecesInGoal(player) === 10;
    }

    function getWinner() {
        if (hasWon(CC.PLAYER1)) return CC.PLAYER1;
        if (hasWon(CC.PLAYER2)) return CC.PLAYER2;
        return null;
    }

    // ── Get opponent ─────────────────────────────────────────────────────────
    function getOpponent(player) {
        return player === CC.PLAYER1 ? CC.PLAYER2 : CC.PLAYER1;
    }

    // ── Debug ────────────────────────────────────────────────────────────────
    function toString() {
        var s = '';
        for (var r = -8; r <= 8; r++) {
            var indent = '';
            for (var i = 0; i < Math.abs(r); i++) indent += '  ';
            var line = indent;
            for (var q = -8; q <= 8; q++) {
                var cube_s = -q - r;
                var key = CC.posKey(q, r, cube_s);
                if (cells[key] !== undefined) {
                    if (cells[key] === CC.PLAYER1) line += 'X ';
                    else if (cells[key] === CC.PLAYER2) line += 'O ';
                    else line += '. ';
                }
            }
            if (line.trim()) s += line + '\n';
        }
        return s;
    }

    return {
        init: init,
        reset: reset,
        getState: getState,
        setState: setState,
        getPiece: getPiece,
        setPiece: setPiece,
        isEmpty: isEmpty,
        isValidPosition: isValidPosition,
        getOwner: getOwner,
        getNeighbors: getNeighbors,
        getMovesForPiece: getMovesForPiece,
        getLegalMoves: getLegalMoves,
        applyMove: applyMove,
        getPlayerPieceCount: getPlayerPieceCount,
        getGoalPositions: getGoalPositions,
        getStartPositions: getStartPositions,
        isInGoal: isInGoal,
        countPiecesInGoal: countPiecesInGoal,
        hasWon: hasWon,
        getWinner: getWinner,
        getOpponent: getOpponent,
        toString: toString
    };

})();
