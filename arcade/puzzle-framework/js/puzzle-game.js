/**
 * puzzle-game.js — Game state machine for sliding tile puzzles
 * Provides: Game lifecycle, move handling, win/loss detection
 *
 * Usage: Games extend this by overriding methods on the returned object:
 *   - addRandomTile()
 *   - moveLeft() (merge/slide logic)
 *   - checkWin()
 *   - checkGameState()
 *   - addInitialTiles()
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
     * @param {string} config.gameName - Name for scoring (e.g., '2048', 'fifteen-puzzle')
     * @param {boolean} config.spawnTiles - Whether to spawn random tiles after moves (default: true)
     */
    function create(config) {
        config = config || {};
        var size = config.size || 4;
        var difficulty = config.difficulty || 'normal';
        var gameName = config.gameName || 'puzzle';
        var spawnTiles = config.spawnTiles !== undefined ? config.spawnTiles : true;

        var state = {
            size: size,
            difficulty: difficulty,
            gameName: gameName,
            spawnTiles: spawnTiles,
            grid: null,
            score: 0,
            moves: 0,
            gameOver: false,
            won: false,
            startTime: null,
            endTime: null,
            input: null,
            scoring: null,
            lastDirection: null,

            // Callbacks (set by game implementations)
            onRender: null,
            onStateChange: null,
            onGameOver: null,
            onWin: null
        };

        // ── Public API (defined early so internal functions can reference it) ──
        var api = {
            // Properties
            get size() { return state.size; },
            get difficulty() { return state.difficulty; },
            get gameName() { return state.gameName; },
            get spawnTiles() { return state.spawnTiles; },
            get lastDirection() { return state.lastDirection; },
            get grid() { return state.grid; },
            set grid(val) { state.grid = val; },
            get score() { return state.score; },
            set score(val) { state.score = val; api.notifyStateChange(); },
            get moves() { return state.moves; },
            set moves(val) { state.moves = val; },
            get gameOver() { return state.gameOver; },
            set gameOver(val) { state.gameOver = val; },
            get won() { return state.won; },
            set won(val) { state.won = val; },
            get startTime() { return state.startTime; },
            get endTime() { return state.endTime; },
            set endTime(val) { state.endTime = val; },

            // ── Overridable methods (game implementations replace these) ────

            addRandomTile: function() {},

            moveLeft: function() {},

            checkWin: function() { return false; },

            /**
             * Default game-state check: win detection + full-board game-over.
             * Override entirely for games with different end conditions.
             */
            checkGameState: function() {
                if (api.checkWin()) {
                    state.won = true;
                    state.endTime = Date.now();
                    if (state.onWin) state.onWin(api);
                    api.notifyStateChange();
                    return;
                }

                if (PuzzleGrid.isFull(state.grid) && !PuzzleGrid.hasAdjacentMatches(state.grid)) {
                    state.gameOver = true;
                    state.endTime = Date.now();
                    if (state.onGameOver) state.onGameOver(api);
                    api.notifyStateChange();
                }
            },

            /**
             * Default initial tiles: add two random tiles.
             * Override for games that need full-board setup (e.g., 15 puzzle).
             */
            addInitialTiles: function() {
                api.addRandomTile();
                api.addRandomTile();
            },

            // ── Core methods ────────────────────────────────────────────────

            init: function() {
                state.grid = PuzzleGrid.create(size);
                state.score = 0;
                state.moves = 0;
                state.gameOver = false;
                state.won = false;
                state.startTime = Date.now();
                state.endTime = null;

                api.addInitialTiles();
                api.render();
            },

            isActive: function() {
                return !state.gameOver && !state.won;
            },

            getElapsedTime: function() {
                if (!state.startTime) return 0;
                var end = state.endTime || Date.now();
                return Math.floor((end - state.startTime) / 1000);
            },

            handleMove: function(direction) {
                if (!api.isActive()) return false;

                var original = PuzzleGrid.clone(state.grid);
                api.moveInDirection(direction);

                var moved = !PuzzleGrid.equals(state.grid, original);
                if (moved) {
                    state.moves++;
                    state.lastDirection = direction;
                    if (state.spawnTiles) {
                        api.addRandomTile();
                    }
                    api.checkGameState();
                    api.render();
                }
                return moved;
            },

            moveInDirection: function(direction) {
                switch (direction) {
                    case 'left':
                        api.moveLeft();
                        break;
                    case 'right':
                        PuzzleGrid.rotate(state.grid, 2);
                        api.moveLeft();
                        PuzzleGrid.rotate(state.grid, 2);
                        break;
                    case 'up':
                        PuzzleGrid.rotate(state.grid, 3);
                        api.moveLeft();
                        PuzzleGrid.rotate(state.grid, 1);
                        break;
                    case 'down':
                        PuzzleGrid.rotate(state.grid, 1);
                        api.moveLeft();
                        PuzzleGrid.rotate(state.grid, 3);
                        break;
                }
            },

            notifyStateChange: function() {
                if (state.onStateChange) {
                    state.onStateChange({
                        score: state.score,
                        moves: state.moves,
                        gameOver: state.gameOver,
                        won: state.won,
                        elapsed: api.getElapsedTime(),
                        grid: state.grid
                    });
                }
            },

            render: function() {
                if (state.onRender) {
                    state.onRender(api);
                }
            },

            // ── Callback setters ────────────────────────────────────────────

            setOnRender: function(cb) { state.onRender = cb; },
            setOnStateChange: function(cb) { state.onStateChange = cb; },
            setOnGameOver: function(cb) { state.onGameOver = cb; },
            setOnWin: function(cb) { state.onWin = cb; },

            // ── Grid accessors ──────────────────────────────────────────────

            getGrid: function() { return state.grid; },
            setGrid: function(g) { state.grid = g; }
        };

        return api;
    }

    return {
        create: create
    };

})();
