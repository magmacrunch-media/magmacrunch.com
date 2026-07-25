/**
 * puzzle-render.js — Grid and tile rendering
 * Provides: Grid rendering, tile creation, animation hooks
 */

var PuzzleRender = (function() {

    /**
     * Create a new PuzzleRender instance
     * @param {HTMLElement} boardElement - The game board container
     * @param {object} config - Optional configuration
     */
    function create(boardElement, config) {
        config = config || {};
        var tileClass = config.tileClass || 'tile';
        var emptyClass = config.emptyClass || 'tile-empty';

        // ── Grid Rendering ───────────────────────────────────────────────────

        /**
         * Render a grid to the board element
         * @param {object} grid - The grid to render
         * @param {function} tileRenderer - Optional custom tile renderer
         */
        function renderGrid(grid, tileRenderer) {
            boardElement.innerHTML = '';

            for (var r = 0; r < grid.size; r++) {
                for (var c = 0; c < grid.size; c++) {
                    var value = grid.board[r][c];
                    var tile;

                    if (tileRenderer) {
                        tile = tileRenderer(r, c, value);
                    } else {
                        tile = createDefaultTile(r, c, value);
                    }

                    boardElement.appendChild(tile);
                }
            }
        }

        /**
         * Create a default tile element
         */
        function createDefaultTile(row, col, value) {
            var tile = document.createElement('div');
            tile.className = tileClass;
            tile.dataset.row = row;
            tile.dataset.col = col;

            if (value === 0) {
                tile.classList.add(emptyClass);
            } else {
                tile.textContent = value;
                tile.dataset.value = value;
            }

            return tile;
        }

        /**
         * Render grid with special tiles (e.g., logic gates)
         * @param {object} grid - The grid to render
         * @param {function} getTileContent - Function to get tile content/type
         */
        function renderGridWithSpecial(grid, getTileContent) {
            boardElement.innerHTML = '';

            for (var r = 0; r < grid.size; r++) {
                for (var c = 0; c < grid.size; c++) {
                    var value = grid.board[r][c];
                    var tileInfo = getTileContent(value);

                    var tile = document.createElement('div');
                    tile.className = tileClass;
                    tile.dataset.row = r;
                    tile.dataset.col = c;

                    if (value === 0) {
                        tile.classList.add(emptyClass);
                    } else {
                        tile.textContent = tileInfo.text;
                        if (tileInfo.classes) {
                            tileInfo.classes.forEach(function(cls) {
                                tile.classList.add(cls);
                            });
                        }
                        if (tileInfo.attributes) {
                            Object.keys(tileInfo.attributes).forEach(function(key) {
                                tile.dataset[key] = tileInfo.attributes[key];
                            });
                        }
                    }

                    boardElement.appendChild(tile);
                }
            }
        }

        /**
         * Update a single tile without re-rendering the whole grid
         */
        function updateTile(row, col, value, extraClasses) {
            var tile = boardElement.querySelector(
                '[data-row="' + row + '"][data-col="' + col + '"]'
            );
            if (!tile) return;

            tile.className = tileClass;
            tile.textContent = '';
            tile.dataset.value = '';

            if (value === 0) {
                tile.classList.add(emptyClass);
            } else {
                tile.textContent = value;
                tile.dataset.value = value;
            }

            if (extraClasses) {
                extraClasses.forEach(function(cls) {
                    tile.classList.add(cls);
                });
            }
        }

        /**
         * Get tile element at position
         */
        function getTile(row, col) {
            return boardElement.querySelector(
                '[data-row="' + row + '"][data-col="' + col + '"]'
            );
        }

        /**
         * Get all tile elements
         */
        function getAllTiles() {
            return boardElement.querySelectorAll('.' + tileClass);
        }

        /**
         * Clear the board
         */
        function clear() {
            boardElement.innerHTML = '';
        }

        return {
            renderGrid: renderGrid,
            renderGridWithSpecial: renderGridWithSpecial,
            createDefaultTile: createDefaultTile,
            updateTile: updateTile,
            getTile: getTile,
            getAllTiles: getAllTiles,
            clear: clear
        };
    }

    return {
        create: create
    };

})();
