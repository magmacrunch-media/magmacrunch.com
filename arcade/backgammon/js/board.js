/**
 * board.js — Board representation and move validation
 * Pure logic, no DOM dependencies
 */

var Board = (function() {

    // ── State ────────────────────────────────────────────────────────────────
    // board[i] = count (>0 = player, <0 = AI, 0 = empty)
    // Index 0 = bar player, 1-24 = points, 25 = bar AI, 26 = off player, 27 = off AI
    var board = new Array(BG.ARRAY_SIZE);

    function init() {
        for (var i = 0; i < BG.ARRAY_SIZE; i++) {
            board[i] = 0;
        }
        // Set up initial position
        for (var pt = 1; pt <= 24; pt++) {
            var pos = BG.INITIAL_POSITION[pt];
            if (pos) {
                board[pt] = pos.owner === BG.PLAYER ? pos.count : -pos.count;
            }
        }
    }

    function getState() {
        return board.slice();
    }

    function setState(state) {
        board = state.slice();
    }

    // ── Point Helpers ────────────────────────────────────────────────────────
    function getOwner(point) {
        if (board[point] > 0) return BG.PLAYER;
        if (board[point] < 0) return BG.AI;
        return null;
    }

    function getCount(point) {
        return Math.abs(board[point]);
    }

    function isBlot(point) {
        return Math.abs(board[point]) === 1;
    }

    function isOpen(point, player) {
        var val = board[point];
        if (val === 0) return true;
        if (player === BG.PLAYER) return val > 0; // own point
        return val < 0; // AI's own point
    }

    function canLand(point, player) {
        var val = board[point];
        if (val === 0) return true;
        if (player === BG.PLAYER) {
            return val >= 0 || Math.abs(val) <= 1;
        }
        return val <= 0 || Math.abs(val) <= 1;
    }

    // ── Bar Logic ────────────────────────────────────────────────────────────
    function hasBar(player) {
        return player === BG.PLAYER ? board[BG.BAR_PLAYER] > 0 : board[BG.BAR_AI] < 0;
    }

    function getBarCount(player) {
        return player === BG.PLAYER ? board[BG.BAR_PLAYER] : Math.abs(board[BG.BAR_AI]);
    }

    // ── Home Board ───────────────────────────────────────────────────────────
    // Player home: points 1-6, AI home: points 19-24
    function isInHomeBoard(point, player) {
        if (player === BG.PLAYER) return point >= 1 && point <= 6;
        return point >= 19 && point <= 24;
    }

    function allInHomeBoard(player) {
        if (hasBar(player)) return false;

        if (player === BG.PLAYER) {
            // Check all player checkers are in points 1-6
            for (var i = 7; i <= 24; i++) {
                if (board[i] > 0) return false;
            }
            return true;
        } else {
            // Check all AI checkers are in points 19-24
            for (var i = 1; i <= 18; i++) {
                if (board[i] < 0) return false;
            }
            return true;
        }
    }

    // ── Move Validation ──────────────────────────────────────────────────────
    function getDirection(player) {
        return player === BG.PLAYER ? -1 : 1;
    }

    function getHomePoint(player) {
        return player === BG.PLAYER ? 0 : 25;
    }

    function canBearOff(player) {
        return allInHomeBoard(player);
    }

    // Get legal moves for a single die value
    function getLegalMovesForDie(player, die) {
        var moves = [];
        var dir = getDirection(player);
        var barPoint = player === BG.PLAYER ? BG.BAR_PLAYER : BG.BAR_AI;

        // If player has checkers on bar, must enter first
        if (hasBar(player)) {
            var entryPoint = player === BG.PLAYER ? 25 - die : die;
            if (canLand(entryPoint, player)) {
                moves.push({
                    from: barPoint,
                    to: entryPoint,
                    type: BG.MOVE_TYPE.BAR,
                    die: die
                });
            }
            return moves;
        }

        // Normal moves
        for (var from = 1; from <= 24; from++) {
            if (getOwner(from) !== player) continue;

            var to = from + dir * die;

            // Bearing off
            if (to <= 0 || to >= 25) {
                if (canBearOff(player)) {
                    var homePoint = getHomePoint(player);
                    // Exact bear off
                    if (to === homePoint || (player === BG.PLAYER ? to < 0 : to > 25)) {
                        // Can only bear off from exact or if no checker is further
                        var isExact = to === homePoint;
                        if (!isExact) {
                            // Check if this is the furthest checker
                            var isFurthest = true;
                            if (player === BG.PLAYER) {
                                for (var check = from + 1; check <= 6; check++) {
                                    if (board[check] > 0) {
                                        isFurthest = false;
                                        break;
                                    }
                                }
                            } else {
                                for (var check = from - 1; check >= 19; check--) {
                                    if (board[check] < 0) {
                                        isFurthest = false;
                                        break;
                                    }
                                }
                            }
                            if (!isFurthest) continue;
                        }
                        moves.push({
                            from: from,
                            to: homePoint,
                            type: BG.MOVE_TYPE.BEAR_OFF,
                            die: die
                        });
                    }
                }
                continue;
            }

            // Normal move
            if (canLand(to, player)) {
                var moveType = isBlot(to) && getOwner(to) !== player ?
                    BG.MOVE_TYPE.HIT : BG.MOVE_TYPE.NORMAL;
                moves.push({
                    from: from,
                    to: to,
                    type: moveType,
                    die: die
                });
            }
        }

        return moves;
    }

    // Get all legal move combinations for a dice pair
    function getLegalMoves(player, die1, die2) {
        if (die1 === die2) {
            // Doubles: 4 moves with same die
            return getDoublesMoves(player, die1);
        }

        var combos = [];

        // Try die1 then die2
        var moves1 = getLegalMovesForDie(player, die1);
        for (var i = 0; i < moves1.length; i++) {
            var temp = board.slice();
            applyMove(moves1[i]);
            var moves2 = getLegalMovesForDie(player, die2);
            for (var j = 0; j < moves2.length; j++) {
                combos.push([moves1[i], moves2[j]]);
            }
            setState(temp);
        }

        // Try die2 then die1
        var moves2First = getLegalMovesForDie(player, die2);
        for (var i = 0; i < moves2First.length; i++) {
            var temp = board.slice();
            applyMove(moves2First[i]);
            var moves1Second = getLegalMovesForDie(player, die1);
            for (var j = 0; j < moves1Second.length; j++) {
                // Check if this combo is unique
                var combo = [moves2First[i], moves1Second[j]];
                if (!isDuplicateCombo(combos, combo)) {
                    combos.push(combo);
                }
            }
            setState(temp);
        }

        // Filter out combos where first die can't be used but second can
        if (combos.length === 0) {
            // If no combo with both, try using just one die
            var singleMoves1 = getLegalMovesForDie(player, die1);
            for (var i = 0; i < singleMoves1.length; i++) {
                combos.push([singleMoves1[i]]);
            }
            var singleMoves2 = getLegalMovesForDie(player, die2);
            for (var i = 0; i < singleMoves2.length; i++) {
                if (!isDuplicateSingle(combos, singleMoves2[i])) {
                    combos.push([singleMoves2[i]]);
                }
            }
        }

        return combos;
    }

    function getDoublesMoves(player, die) {
        // For doubles, player gets 4 moves with the same die
        // Generate all combinations of 4 moves
        var singleMoves = getLegalMovesForDie(player, die);
        if (singleMoves.length === 0) return [];

        var combos = [];

        // For simplicity, generate sequential move combos
        // Start with 1 move, then 2, then 3, then 4
        for (var count = 1; count <= 4; count++) {
            generateDoublesCombos(player, die, count, [], combos);
        }

        return combos;
    }

    function generateDoublesCombos(player, die, remaining, current, combos) {
        if (remaining === 0) {
            if (current.length > 0) {
                combos.push(current.slice());
            }
            return;
        }

        var moves = getLegalMovesForDie(player, die);
        for (var i = 0; i < moves.length; i++) {
            var temp = board.slice();
            applyMove(moves[i]);
            current.push(moves[i]);
            generateDoublesCombos(player, die, remaining - 1, current, combos);
            current.pop();
            setState(temp);
        }
    }

    function isDuplicateCombo(existing, newCombo) {
        for (var i = 0; i < existing.length; i++) {
            if (existing[i].length !== newCombo.length) continue;
            var match = true;
            for (var j = 0; j < newCombo.length; j++) {
                if (existing[i][j].from !== newCombo[j].from ||
                    existing[i][j].to !== newCombo[j].to) {
                    match = false;
                    break;
                }
            }
            if (match) return true;
        }
        return false;
    }

    function isDuplicateSingle(existing, move) {
        for (var i = 0; i < existing.length; i++) {
            if (existing[i].length === 1 &&
                existing[i][0].from === move.from &&
                existing[i][0].to === move.to) {
                return true;
            }
        }
        return false;
    }

    // ── Apply Move ───────────────────────────────────────────────────────────
    function applyMove(move) {
        var player = board[move.from] > 0 ? BG.PLAYER : BG.AI;

        // Remove from source
        if (move.from === BG.BAR_PLAYER || move.from === BG.BAR_AI) {
            board[move.from] += player === BG.PLAYER ? -1 : 1;
        } else {
            board[move.from] += player === BG.PLAYER ? -1 : 1;
        }

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
            board[move.to] += player === BG.PLAYER ? 1 : -1;
        }
    }

    function applyMoves(moves) {
        for (var i = 0; i < moves.length; i++) {
            applyMove(moves[i]);
        }
    }

    // ── Win Detection ────────────────────────────────────────────────────────
    function getWinner() {
        if (board[BG.OFF_PLAYER] >= 15) return BG.PLAYER;
        if (board[BG.OFF_AI] >= 15) return BG.AI;
        return null;
    }

    function getOffCount(player) {
        return player === BG.PLAYER ? board[BG.OFF_PLAYER] : Math.abs(board[BG.OFF_AI]);
    }

    // ── Debug ────────────────────────────────────────────────────────────────
    function toString() {
        var s = '';
        s += 'Bar(P:' + board[BG.BAR_PLAYER] + ' A:' + board[BG.BAR_AI] + ') ';
        s += 'Off(P:' + board[BG.OFF_PLAYER] + ' A:' + board[BG.OFF_AI] + ')\n';
        for (var i = 13; i <= 24; i++) {
            s += (board[i] >= 0 ? ' ' : '') + board[i] + ' ';
        }
        s += '\n';
        for (var i = 12; i >= 1; i--) {
            s += (board[i] >= 0 ? ' ' : '') + board[i] + ' ';
        }
        return s;
    }

    return {
        init: init,
        getState: getState,
        setState: setState,
        getOwner: getOwner,
        getCount: getCount,
        isBlot: isBlot,
        hasBar: hasBar,
        getBarCount: getBarCount,
        allInHomeBoard: allInHomeBoard,
        canBearOff: canBearOff,
        getLegalMovesForDie: getLegalMovesForDie,
        getLegalMoves: getLegalMoves,
        applyMove: applyMove,
        applyMoves: applyMoves,
        getWinner: getWinner,
        getOffCount: getOffCount,
        toString: toString
    };

})();
