/**
 * puzzle-grid.js — Core grid engine for sliding tile puzzles
 * Provides: NxN grid, rotation-based movement, move detection
 */

var PuzzleGrid = (function() {

    /**
     * Create a new PuzzleGrid
     * @param {number} size - Grid dimension (default: 4)
     */
    function create(size) {
        size = size || 4;
        var board = [];
        for (var r = 0; r < size; r++) {
            board[r] = [];
            for (var c = 0; c < size; c++) {
                board[r][c] = 0;
            }
        }
        return {
            size: size,
            board: board
        };
    }

    /**
     * Clone a grid (deep copy)
     */
    function clone(grid) {
        var copy = [];
        for (var r = 0; r < grid.size; r++) {
            copy[r] = grid.board[r].slice();
        }
        return {
            size: grid.size,
            board: copy
        };
    }

    /**
     * Get all empty cells in the grid
     * Returns array of {row, col} objects
     */
    function getEmptyCells(grid) {
        var cells = [];
        for (var r = 0; r < grid.size; r++) {
            for (var c = 0; c < grid.size; c++) {
                if (grid.board[r][c] === 0) {
                    cells.push({ row: r, col: c });
                }
            }
        }
        return cells;
    }

    /**
     * Check if grid is full (no empty cells)
     */
    function isFull(grid) {
        return getEmptyCells(grid).length === 0;
    }

    /**
     * Rotate grid 90 degrees clockwise
     * @param {object} grid - The grid to rotate
     * @param {number} times - Number of 90-degree rotations (default: 1)
     */
    function rotate(grid, times) {
        times = times || 1;
        for (var t = 0; t < times; t++) {
            var newBoard = [];
            for (var r = 0; r < grid.size; r++) {
                newBoard[r] = [];
                for (var c = 0; c < grid.size; c++) {
                    newBoard[c][grid.size - 1 - r] = grid.board[r][c];
                }
            }
            grid.board = newBoard;
        }
    }

    /**
     * Compare two grids for equality
     */
    function equals(grid1, grid2) {
        if (grid1.size !== grid2.size) return false;
        for (var r = 0; r < grid1.size; r++) {
            for (var c = 0; c < grid1.size; c++) {
                if (grid1.board[r][c] !== grid2.board[r][c]) return false;
            }
        }
        return true;
    }

    /**
     * Check if any adjacent cells have equal values
     * Used for game-over detection in 2048-style games
     */
    function hasAdjacentMatches(grid) {
        for (var r = 0; r < grid.size; r++) {
            for (var c = 0; c < grid.size; c++) {
                var val = grid.board[r][c];
                if (val === 0) continue;
                // Check right neighbor
                if (c < grid.size - 1 && grid.board[r][c + 1] === val) return true;
                // Check bottom neighbor
                if (r < grid.size - 1 && grid.board[r + 1][c] === val) return true;
            }
        }
        return false;
    }

    /**
     * Get all non-zero values from the grid
     */
    function getValues(grid) {
        var values = [];
        for (var r = 0; r < grid.size; r++) {
            for (var c = 0; c < grid.size; c++) {
                if (grid.board[r][c] !== 0) {
                    values.push(grid.board[r][c]);
                }
            }
        }
        return values;
    }

    /**
     * Get the maximum value in the grid
     */
    function getMaxValue(grid) {
        var max = 0;
        for (var r = 0; r < grid.size; r++) {
            for (var c = 0; c < grid.size; c++) {
                if (grid.board[r][c] > max) {
                    max = grid.board[r][c];
                }
            }
        }
        return max;
    }

    /**
     * Count occurrences of a value in the grid
     */
    function countValue(grid, value) {
        var count = 0;
        for (var r = 0; r < grid.size; r++) {
            for (var c = 0; c < grid.size; c++) {
                if (grid.board[r][c] === value) count++;
            }
        }
        return count;
    }

    /**
     * Debug: convert grid to string
     */
    function toString(grid) {
        var s = '';
        for (var r = 0; r < grid.size; r++) {
            for (var c = 0; c < grid.size; c++) {
                s += (grid.board[r][c] === 0 ? '.' : grid.board[r][c]);
                s += '\t';
            }
            s += '\n';
        }
        return s;
    }

    return {
        create: create,
        clone: clone,
        getEmptyCells: getEmptyCells,
        isFull: isFull,
        rotate: rotate,
        equals: equals,
        hasAdjacentMatches: hasAdjacentMatches,
        getValues: getValues,
        getMaxValue: getMaxValue,
        countValue: countValue,
        toString: toString
    };

})();
