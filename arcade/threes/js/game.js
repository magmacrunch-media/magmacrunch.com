/**
 * game.js — Threes game logic
 * Extends PuzzleGame with Threes merge rules and edge spawning
 *
 * Merge rules:
 *   1 + 2 = 3 (or 2 + 1 = 3)
 *   N + N = 2N (where N >= 3)
 *   1+1 and 2+2 do NOT merge
 */

var ThreesGame = (function() {

    var SIZE = 4;
    var INITIAL_TILE_COUNT = 9;

    function create() {
        var game = PuzzleGame.create({
            size: SIZE,
            spawnTiles: true,
            gameName: 'threes'
        });

        // ── Initial tiles ────────────────────────────────────────────────────
        game.addInitialTiles = function() {
            var values = [];
            for (var i = 0; i < INITIAL_TILE_COUNT; i++) {
                var r = Math.random();
                values.push(r < 0.33 ? 1 : r < 0.67 ? 2 : 3);
            }
            var cells = PuzzleGrid.getEmptyCells(game.grid);
            for (var v = 0; v < values.length && cells.length > 0; v++) {
                var idx = Math.floor(Math.random() * cells.length);
                var cell = cells.splice(idx, 1)[0];
                game.grid.board[cell.row][cell.col] = values[v];
            }
        };

        // ── Merge logic ──────────────────────────────────────────────────────
        function canMerge(a, b) {
            if (a === 0 || b === 0) return false;
            if (a === 1 && b === 2) return true;
            if (a === 2 && b === 1) return true;
            if (a === b && a >= 3) return true;
            return false;
        }

        function merge(a, b) {
            if (a === 1 && b === 2) return 3;
            if (a === 2 && b === 1) return 3;
            return a + b;
        }

        game.moveLeft = function() {
            for (var r = 0; r < SIZE; r++) {
                var merged = [false, false, false, false];
                for (var c = 1; c < SIZE; c++) {
                    if (game.grid.board[r][c] === 0) continue;
                    var target = c - 1;
                    if (game.grid.board[r][target] === 0) {
                        game.grid.board[r][target] = game.grid.board[r][c];
                        game.grid.board[r][c] = 0;
                    } else if (!merged[target] && canMerge(game.grid.board[r][target], game.grid.board[r][c])) {
                        var val = merge(game.grid.board[r][target], game.grid.board[r][c]);
                        game.score += val;
                        game.grid.board[r][target] = val;
                        game.grid.board[r][c] = 0;
                        merged[target] = true;
                    }
                }
            }
        };

        // ── Edge spawning ────────────────────────────────────────────────────
        game.addRandomTile = function() {
            var edge = getSpawnEdge(game.lastDirection);
            var empty = [];
            for (var i = 0; i < edge.length; i++) {
                if (game.grid.board[edge[i].row][edge[i].col] === 0) {
                    empty.push(edge[i]);
                }
            }
            if (empty.length === 0) {
                var allEmpty = PuzzleGrid.getEmptyCells(game.grid);
                if (allEmpty.length === 0) return;
                empty = allEmpty;
            }
            var cell = empty[Math.floor(Math.random() * empty.length)];
            var r = Math.random();
            game.grid.board[cell.row][cell.col] = r < 0.75 ? 1 : r < 0.90 ? 2 : 3;
        };

        function getSpawnEdge(direction) {
            var cells = [];
            switch (direction) {
                case 'up':
                    for (var c = 0; c < SIZE; c++) cells.push({ row: SIZE - 1, col: c });
                    break;
                case 'down':
                    for (var c = 0; c < SIZE; c++) cells.push({ row: 0, col: c });
                    break;
                case 'left':
                    for (var r = 0; r < SIZE; r++) cells.push({ row: r, col: SIZE - 1 });
                    break;
                case 'right':
                    for (var r = 0; r < SIZE; r++) cells.push({ row: r, col: 0 });
                    break;
                default:
                    return PuzzleGrid.getEmptyCells(game.grid);
            }
            return cells;
        }

        // ── Win/loss detection ───────────────────────────────────────────────
        game.checkWin = function() {
            return false;
        };

        game.checkGameState = function() {
            if (!PuzzleGrid.isFull(game.grid)) return;
            if (hasValidMerges()) return;
            game.gameOver = true;
            game.endTime = Date.now();
            if (game.onGameOver) game.onGameOver(game);
            game.notifyStateChange();
        };

        function hasValidMerges() {
            for (var r = 0; r < SIZE; r++) {
                for (var c = 0; c < SIZE; c++) {
                    var val = game.grid.board[r][c];
                    if (c < SIZE - 1 && canMerge(val, game.grid.board[r][c + 1])) return true;
                    if (r < SIZE - 1 && canMerge(val, game.grid.board[r + 1][c])) return true;
                }
            }
            return false;
        }

        return game;
    }

    return {
        create: create
    };

})();
