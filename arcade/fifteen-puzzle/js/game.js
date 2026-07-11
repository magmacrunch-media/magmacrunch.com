/**
 * game.js — 15 Puzzle game logic
 * Extends PuzzleGame for slide-only mechanics
 * Supports grid sizes from 3x3 to 6x6
 */

var FifteenPuzzle = (function() {

    function create(size) {
        size = size || 4;
        var totalTiles = size * size - 1;
        var shuffleMoves = size * size * 20;

        var game = PuzzleGame.create({
            size: size,
            spawnTiles: false,
            gameName: 'fifteen-puzzle-' + size + 'x' + size
        });

        function generateSolvedBoard() {
            var board = [];
            var val = 1;
            for (var r = 0; r < size; r++) {
                board[r] = [];
                for (var c = 0; c < size; c++) {
                    if (r === size - 1 && c === size - 1) {
                        board[r][c] = 0;
                    } else {
                        board[r][c] = val++;
                    }
                }
            }
            return board;
        }

        var solvedBoard = generateSolvedBoard();

        game.addInitialTiles = function() {
            for (var r = 0; r < size; r++) {
                for (var c = 0; c < size; c++) {
                    game.grid.board[r][c] = solvedBoard[r][c];
                }
            }
            shuffle();
        };

        game.moveLeft = function() {
            var empty = PuzzleGrid.findCell(game.grid, 0);
            if (empty && empty.col + 1 < size) {
                PuzzleGrid.swap(game.grid, empty.row, empty.col, empty.row, empty.col + 1);
            }
        };

        game.checkWin = function() {
            return PuzzleGrid.isSolved(game.grid, solvedBoard);
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

            for (var i = 0; i < shuffleMoves; i++) {
                var dir;
                do {
                    dir = directions[Math.floor(Math.random() * 4)];
                } while (dir === lastDir);

                lastDir = dir;
                game.moveInDirection(dir);
            }

            if (PuzzleGrid.isSolved(game.grid, solvedBoard)) {
                shuffle();
            }
        }

        return game;
    }

    return {
        create: create
    };

})();
