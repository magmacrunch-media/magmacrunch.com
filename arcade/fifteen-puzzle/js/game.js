/**
 * game.js — 15 Puzzle game logic
 * Extends PuzzleGame for slide-only mechanics
 */

var FifteenPuzzle = (function() {

    var SIZE = 4;
    var SOLVED_BOARD = [
        [1,  2,  3,  4],
        [5,  6,  7,  8],
        [9,  10, 11, 12],
        [13, 14, 15, 0]
    ];
    var SHUFFLE_MOVES = 300;

    function create() {
        var game = PuzzleGame.create({
            size: SIZE,
            spawnTiles: false,
            gameName: 'fifteen-puzzle'
        });

        var lastDirection = null;

        game.addInitialTiles = function() {
            for (var r = 0; r < SIZE; r++) {
                for (var c = 0; c < SIZE; c++) {
                    game.grid.board[r][c] = SOLVED_BOARD[r][c];
                }
            }
            shuffle();
        };

        game.moveLeft = function() {
            var empty = PuzzleGrid.findCell(game.grid, 0);
            if (empty && empty.col + 1 < SIZE) {
                PuzzleGrid.swap(game.grid, empty.row, empty.col, empty.row, empty.col + 1);
            }
        };

        game.checkWin = function() {
            return PuzzleGrid.isSolved(game.grid, SOLVED_BOARD);
        };

        game.checkGameState = function() {
            if (game.checkWin()) {
                game.won = true;
                game.endTime = Date.now();
                if (game.onWin) game.onWin(game);
                game.notifyStateChange();
            }
        };

        function shuffle() {
            var directions = ['left', 'right', 'up', 'down'];
            var lastDir = null;

            for (var i = 0; i < SHUFFLE_MOVES; i++) {
                var dir;
                do {
                    dir = directions[Math.floor(Math.random() * 4)];
                } while (dir === lastDir);

                lastDir = dir;
                game.moveInDirection(dir);
            }

            if (PuzzleGrid.isSolved(game.grid, SOLVED_BOARD)) {
                shuffle();
            }
        }

        return game;
    }

    return {
        create: create
    };

})();
