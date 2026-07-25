/**
 * game.js — Klotski game logic
 * Classic Hengdao Lima (横刀立马) layout
 * 4×5 grid, multi-cell tiles, slide the 2×2 block to the exit
 */

var KlotskiGame = (function() {

    var COLS = 4;
    var ROWS = 5;

    // Tile types
    var TYPE_2x2 = '2x2';
    var TYPE_2x1 = '2x1';
    var TYPE_1x1 = '1x1';

    // Classic Hengdao Lima layout
    // Tile 1 = 2×2 (曹操 Cao Cao - the target)
    // Tiles 2-6 = 2×1 vertical blocks
    // Tiles 7-8 = 1×1 blocks
    var INITIAL_TILES = [
        { id: 1, type: TYPE_2x2, row: 0, col: 1, w: 2, h: 2, name: '曹操' },
        { id: 2, type: TYPE_2x1, row: 0, col: 0, w: 1, h: 2, name: '关羽' },
        { id: 3, type: TYPE_2x1, row: 0, col: 3, w: 1, h: 2, name: '张飞' },
        { id: 4, type: TYPE_2x1, row: 2, col: 0, w: 1, h: 2, name: '赵云' },
        { id: 5, type: TYPE_2x1, row: 2, col: 1, w: 1, h: 2, name: '马超' },
        { id: 6, type: TYPE_2x1, row: 2, col: 2, w: 1, h: 2, name: '黄忠' },
        { id: 7, type: TYPE_1x1, row: 4, col: 0, w: 1, h: 1, name: '卒' },
        { id: 8, type: TYPE_1x1, row: 4, col: 3, w: 1, h: 1, name: '卒' }
    ];

    // Exit position for the 2×2 block (bottom center)
    var EXIT_ROW = 3;
    var EXIT_COL = 1;

    function create() {
        var game = PuzzleGame.create({
            size: COLS,
            spawnTiles: false,
            gameName: 'klotski'
        });

        // Text mode for tile labels: 'chinese', 'english', 'both'
        game.textMode = 'both';

        var tiles = [];

        // ── Override init to create non-square grid ───────────────────────────
        game.init = function() {
            game.grid = PuzzleGrid.create(COLS, ROWS);
            game.score = 0;
            game.moves = 0;
            game.gameOver = false;
            game.won = false;
            game.startTime = Date.now();
            game.endTime = null;

            game.addInitialTiles();
            game.render();
        };

        // ── Initialize tiles ─────────────────────────────────────────────────
        function initTiles() {
            tiles = [];
            for (var i = 0; i < INITIAL_TILES.length; i++) {
                var t = INITIAL_TILES[i];
                tiles.push({ id: t.id, type: t.type, row: t.row, col: t.col, w: t.w, h: t.h, name: t.name });
            }
            syncBoard();
        }

        // ── Sync tile positions to grid board ────────────────────────────────
        function syncBoard() {
            // Clear board
            for (var r = 0; r < ROWS; r++) {
                for (var c = 0; c < COLS; c++) {
                    game.grid.board[r][c] = 0;
                }
            }
            // Write tile IDs to board
            for (var i = 0; i < tiles.length; i++) {
                var t = tiles[i];
                for (var dr = 0; dr < t.h; dr++) {
                    for (var dc = 0; dc < t.w; dc++) {
                        game.grid.board[t.row + dr][t.col + dc] = t.id;
                    }
                }
            }
        }

        // ── Get tile by ID ───────────────────────────────────────────────────
        function getTile(id) {
            for (var i = 0; i < tiles.length; i++) {
                if (tiles[i].id === id) return tiles[i];
            }
            return null;
        }

        // ── Check if cells are empty or belong to a specific tile ────────────
        function canOccupy(row, col, w, h, excludeId) {
            for (var dr = 0; dr < h; dr++) {
                for (var dc = 0; dc < w; dc++) {
                    var r = row + dr;
                    var c = col + dc;
                    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
                    var cell = game.grid.board[r][c];
                    if (cell !== 0 && cell !== excludeId) return false;
                }
            }
            return true;
        }

        // ── Move a single tile ───────────────────────────────────────────────
        function moveTile(tile, dr, dc) {
            var newRow = tile.row + dr;
            var newCol = tile.col + dc;
            if (!canOccupy(newRow, newCol, tile.w, tile.h, tile.id)) return false;
            tile.row = newRow;
            tile.col = newCol;
            return true;
        }

        // ── Move all tiles in a direction ────────────────────────────────────
        function moveDirection(dr, dc) {
            var moved = false;

            // Sort tiles so we process from the leading edge
            var sorted = tiles.slice();

            if (dc < 0) sorted.sort(function(a, b) { return a.col - b.col; }); // left
            else if (dc > 0) sorted.sort(function(a, b) { return b.col - a.col; }); // right
            else if (dr < 0) sorted.sort(function(a, b) { return a.row - b.row; }); // up
            else if (dr > 0) sorted.sort(function(a, b) { return b.row - a.row; }); // down

            for (var i = 0; i < sorted.length; i++) {
                if (moveTile(sorted[i], dr, dc)) {
                    moved = true;
                }
            }

            if (moved) {
                syncBoard();
            }
            return moved;
        }

        // ── Override framework methods ────────────────────────────────────────
        game.addInitialTiles = function() {
            initTiles();
        };

        game.moveInDirection = function(direction) {
            switch (direction) {
                case 'left':  return moveDirection(0, -1);
                case 'right': return moveDirection(0, 1);
                case 'up':    return moveDirection(-1, 0);
                case 'down':  return moveDirection(1, 0);
            }
            return false;
        };

        game.checkWin = function() {
            var target = getTile(1);
            return target && target.row === EXIT_ROW && target.col === EXIT_COL;
        };

        game.checkGameState = function() {
            if (game.checkWin()) {
                game.won = true;
                game.endTime = Date.now();
                if (game.onWin) game.onWin(game);
                game.notifyStateChange();
            }
        };

        // ── Expose tiles for rendering ───────────────────────────────────────
        game.getTiles = function() { return tiles; };
        game.getTile = getTile;

        return game;
    }

    return {
        create: create,
        TYPE_2x2: TYPE_2x2,
        TYPE_2x1: TYPE_2x1,
        TYPE_1x1: TYPE_1x1
    };

})();
