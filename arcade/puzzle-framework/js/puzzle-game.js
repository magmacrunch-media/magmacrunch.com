/**
 * puzzle-game.js — Game state machine for sliding tile puzzles
 * Provides: Game lifecycle, move handling, win/loss detection
 *
 * Usage: Games extend this by overriding:
 *   - addRandomTile()
 *   - moveLeft() (merge logic)
 *   - checkWin()
 *   - render()
 *   - onWin()
 *   - onGameOver()
 */

var PuzzleGame = (function() {

    /**
     * Create a new PuzzleGame
     * @param {object} config
     * @param {number} config.size - Grid dimension (default: 4)
     * @param {string} config.difficulty - Difficulty key
     * @param {string} config.gameName - Name for scoring (e.g., '2048', 'george-boole')
     */
    function create(config) {
        config = config || {};
        var size = config.size || 4;
        var difficulty = config.difficulty || 'normal';
        var gameName = config.gameName || 'puzzle';

        var game = {
            size: size,
            difficulty: difficulty,
            gameName: gameName,
            grid: null,
            score: 0,
            moves: 0,
            gameOver: false,
            won: false,
            startTime: null,
            endTime: null,
            input: null,
            scoring: null,

            // Callbacks (set by game implementations)
            onRender: null,
            onStateChange: null,
            onGameOver: null,
            onWin: null
        };

        // ── Initialization ───────────────────────────────────────────────────
        function init() {
            game.grid = PuzzleGrid.create(size);
            game.score = 0;
            game.moves = 0;
            game.gameOver = false;
            game.won = false;
            game.startTime = Date.now();
            game.endTime = null;

            addInitialTiles();
            render();
        }

        function addInitialTiles() {
            addRandomTile();
            addRandomTile();
        }

        // ── State ────────────────────────────────────────────────────────────
        function isActive() {
            return !game.gameOver && !game.won;
        }

        function getElapsedTime() {
            if (!game.startTime) return 0;
            var end = game.endTime || Date.now();
            return Math.floor((end - game.startTime) / 1000);
        }

        // ── Moves ────────────────────────────────────────────────────────────
        function handleMove(direction) {
            if (!isActive()) return false;

            var original = PuzzleGrid.clone(game.grid);
            moveInDirection(direction);

            var moved = !PuzzleGrid.equals(game.grid, original);
            if (moved) {
                game.moves++;
                addRandomTile();
                checkGameState();
                render();
            }
            return moved;
        }

        function moveInDirection(direction) {
            switch (direction) {
                case 'left':
                    moveLeft();
                    break;
                case 'right':
                    PuzzleGrid.rotate(game.grid, 2);
                    moveLeft();
                    PuzzleGrid.rotate(game.grid, 2);
                    break;
                case 'up':
                    PuzzleGrid.rotate(game.grid, 3);
                    moveLeft();
                    PuzzleGrid.rotate(game.grid, 1);
                    break;
                case 'down':
                    PuzzleGrid.rotate(game.grid, 1);
                    moveLeft();
                    PuzzleGrid.rotate(game.grid, 3);
                    break;
            }
        }

        // ── Game State Checks ────────────────────────────────────────────────
        function checkGameState() {
            if (checkWin()) {
                game.won = true;
                game.endTime = Date.now();
                if (game.onWin) game.onWin(game);
                notifyStateChange();
                return;
            }

            if (PuzzleGrid.isFull(game.grid) && !PuzzleGrid.hasAdjacentMatches(game.grid)) {
                game.gameOver = true;
                game.endTime = Date.now();
                if (game.onGameOver) game.onGameOver(game);
                notifyStateChange();
            }
        }

        // ── State Change Notification ────────────────────────────────────────
        function notifyStateChange() {
            if (game.onStateChange) {
                game.onStateChange({
                    score: game.score,
                    moves: game.moves,
                    gameOver: game.gameOver,
                    won: game.won,
                    elapsed: getElapsedTime(),
                    grid: game.grid
                });
            }
        }

        // ── Rendering ────────────────────────────────────────────────────────
        function render() {
            if (game.onRender) {
                game.onRender(game);
            }
        }

        // ── Callback Setters ─────────────────────────────────────────────────
        function setOnRender(cb) { game.onRender = cb; }
        function setOnStateChange(cb) { game.onStateChange = cb; }
        function setOnGameOver(cb) { game.onGameOver = cb; }
        function setOnWin(cb) { game.onWin = cb; }

        // ── Public API ───────────────────────────────────────────────────────
        return {
            // Properties
            get size() { return game.size; },
            get difficulty() { return game.difficulty; },
            get gameName() { return game.gameName; },
            get grid() { return game.grid; },
            get score() { return game.score; },
            set score(val) { game.score = val; notifyStateChange(); },
            get moves() { return game.moves; },
            get gameOver() { return game.gameOver; },
            get won() { return game.won; },
            get startTime() { return game.startTime; },

            // Methods
            init: init,
            isActive: isActive,
            handleMove: handleMove,
            moveInDirection: moveInDirection,
            getElapsedTime: getElapsedTime,
            render: render,
            notifyStateChange: notifyStateChange,

            // Callback setters
            setOnRender: setOnRender,
            setOnStateChange: setOnStateChange,
            setOnGameOver: setOnGameOver,
            setOnWin: setOnWin,

            // Functions to override in game implementations
            addRandomTile: function() {},
            moveLeft: function() {},
            checkWin: function() { return false; },

            // Expose grid functions
            getGrid: function() { return game.grid; },
            setGrid: function(g) { game.grid = g; }
        };
    }

    return {
        create: create
    };

})();
