/**
 * board.js — Board representation and move validation
 * Pure logic, no DOM dependencies
 * Supports 2-6 players
 */

var Board = (function() {

    // ── State ────────────────────────────────────────────────────────────────
    var cells = {};
    var activePlayers = [];
    var playerCount = 2;

    function init() {
        cells = {};
        for (var i = 0; i < CC.POSITIONS.length; i++) {
            var pos = CC.POSITIONS[i];
            cells[CC.posKey(pos[0], pos[1], pos[2])] = CC.EMPTY;
        }
    }

    function reset(numPlayers) {
        init();
        playerCount = numPlayers || 2;
        activePlayers = CC.getActivePlayers(playerCount);

        // Place pieces for each active player
        for (var p = 0; p < activePlayers.length; p++) {
            var playerIdx = activePlayers[p];
            var starts = CC.getStartPositions(playerIdx);
            for (var i = 0; i < starts.length; i++) {
                var pos = starts[i];
                cells[CC.posKey(pos[0], pos[1], pos[2])] = playerIdx;
            }
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

    function getPlayerCount() {
        return playerCount;
    }

    function getActivePlayers() {
        return activePlayers.slice();
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

    function isPlayerPiece(q, r, s, player) {
        return getPiece(q, r, s) === player;
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

    // ── Get multi-hop moves (chain of hops) ──────────────────────────────────
    function getMultiHopMoves(q, r, s, player) {
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

                if (isValidPosition(mq, mr, ms) && isValidPosition(lq, lr, ls)) {
                    var midKey = CC.posKey(mq, mr, ms);
                    var midPiece = cells[midKey];
                    var landPiece = cells[lkey];

                    if (midPiece !== CC.EMPTY && midPiece !== player &&
                        (landPiece === CC.EMPTY || landPiece === undefined) &&
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

                        findHops(lq, lr, ls, newPath);
                    }
                }
            }
        }

        findHops(q, r, s, []);
        return allMoves;
    }

    // ── Get all legal moves for a piece ──────────────────────────────────────
    function getMovesForPiece(q, r, s) {
        var piece = getPiece(q, r, s);
        if (piece === CC.EMPTY || piece === null) return [];

        var adjacent = getAdjacentMoves(q, r, s);
        var hops = getMultiHopMoves(q, r, s, piece);

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

    function countPiecesInGoal(player) {
        var count = 0;
        var goal = CC.getGoalPositions(player);
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
        for (var i = 0; i < activePlayers.length; i++) {
            if (hasWon(activePlayers[i])) {
                return activePlayers[i];
            }
        }
        return null;
    }

    function getNextPlayer(currentPlayer) {
        var idx = activePlayers.indexOf(currentPlayer);
        if (idx === -1) return activePlayers[0];
        return activePlayers[(idx + 1) % activePlayers.length];
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
                    if (cells[key] === CC.EMPTY) line += '. ';
                    else line += cells[key] + ' ';
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
        getPlayerCount: getPlayerCount,
        getActivePlayers: getActivePlayers,
        getPiece: getPiece,
        setPiece: setPiece,
        isEmpty: isEmpty,
        isValidPosition: isValidPosition,
        isPlayerPiece: isPlayerPiece,
        getNeighbors: getNeighbors,
        getMovesForPiece: getMovesForPiece,
        getLegalMoves: getLegalMoves,
        applyMove: applyMove,
        getPlayerPieceCount: getPlayerPieceCount,
        countPiecesInGoal: countPiecesInGoal,
        hasWon: hasWon,
        getWinner: getWinner,
        getNextPlayer: getNextPlayer,
        toString: toString
    };

})();
