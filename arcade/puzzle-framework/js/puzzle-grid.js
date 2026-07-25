/**
 * puzzle-grid.js — Core grid engine for sliding tile puzzles
 * Provides: NxM grid, rotation-based movement, move detection
 * Supports both square (NxN) and rectangular (CxR) grids
 */

var PuzzleGrid = (function() {

    /**
     * Create a new PuzzleGrid
     * @param {number} cols - Grid columns (or grid dimension for square grids)
     * @param {number} rows - Grid rows (optional, defaults to cols for square grids)
     */
    function create(cols, rows) {
        rows = rows || cols;
        var board = [];
        for (var r = 0; r < rows; r++) {
            board[r] = [];
            for (var c = 0; c < cols; c++) {
                board[r][c] = 0;
            }
        }
        return {
            size: cols,
            cols: cols,
            rows: rows,
            board: board
        };
    }

    /**
     * Clone a grid (deep copy)
     */
    function clone(grid) {
        var copy = [];
        for (var r = 0; r < grid.rows; r++) {
            copy[r] = grid.board[r].slice();
        }
        return {
            size: grid.size,
            cols: grid.cols,
            rows: grid.rows,
            board: copy
        };
    }

    /**
     * Get all empty cells in the grid
     * Returns array of {row, col} objects
     */
    function getEmptyCells(grid) {
        var cells = [];
        for (var r = 0; r < grid.rows; r++) {
            for (var c = 0; c < grid.cols; c++) {
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
     * Only works for square grids
     * @param {object} grid - The grid to rotate
     * @param {number} times - Number of 90-degree rotations (default: 1)
     */
    function rotate(grid, times) {
        if (grid.cols !== grid.rows) {
            console.warn('PuzzleGrid.rotate: rotation not supported for non-square grids');
            return;
        }
        times = times || 1;
        for (var t = 0; t < times; t++) {
            var newBoard = [];
            for (var r = 0; r < grid.size; r++) {
                newBoard[r] = [];
            }
            for (var r = 0; r < grid.size; r++) {
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
        if (grid1.cols !== grid2.cols || grid1.rows !== grid2.rows) return false;
        for (var r = 0; r < grid1.rows; r++) {
            for (var c = 0; c < grid1.cols; c++) {
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
        for (var r = 0; r < grid.rows; r++) {
            for (var c = 0; c < grid.cols; c++) {
                var val = grid.board[r][c];
                if (val === 0) continue;
                if (c < grid.cols - 1 && grid.board[r][c + 1] === val) return true;
                if (r < grid.rows - 1 && grid.board[r + 1][c] === val) return true;
            }
        }
        return false;
    }

    /**
     * Get all non-zero values from the grid
     */
    function getValues(grid) {
        var values = [];
        for (var r = 0; r < grid.rows; r++) {
            for (var c = 0; c < grid.cols; c++) {
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
        for (var r = 0; r < grid.rows; r++) {
            for (var c = 0; c < grid.cols; c++) {
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
        for (var r = 0; r < grid.rows; r++) {
            for (var c = 0; c < grid.cols; c++) {
                if (grid.board[r][c] === value) count++;
            }
        }
        return count;
    }

    /**
     * Find the position of a value in the grid
     * @param {object} grid - The grid to search
     * @param {*} value - The value to find
     * @returns {object|null} {row, col} or null if not found
     */
    function findCell(grid, value) {
        for (var r = 0; r < grid.rows; r++) {
            for (var c = 0; c < grid.cols; c++) {
                if (grid.board[r][c] === value) {
                    return { row: r, col: c };
                }
            }
        }
        return null;
    }

    /**
     * Swap two cells in the grid
     * @param {object} grid - The grid
     * @param {number} r1 - Row of first cell
     * @param {number} c1 - Column of first cell
     * @param {number} r2 - Row of second cell
     * @param {number} c2 - Column of second cell
     */
    function swap(grid, r1, c1, r2, c2) {
        var temp = grid.board[r1][c1];
        grid.board[r1][c1] = grid.board[r2][c2];
        grid.board[r2][c2] = temp;
    }

    /**
     * Check if grid matches a solved target state
     * @param {object} grid - The grid to check
     * @param {Array<Array>} targetBoard - The solved board state
     * @returns {boolean}
     */
    function isSolved(grid, targetBoard) {
        for (var r = 0; r < grid.rows; r++) {
            for (var c = 0; c < grid.cols; c++) {
                if (grid.board[r][c] !== targetBoard[r][c]) return false;
            }
        }
        return true;
    }

    /**
     * Debug: convert grid to string
     */
    function toString(grid) {
        var s = '';
        for (var r = 0; r < grid.rows; r++) {
            for (var c = 0; c < grid.cols; c++) {
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
        findCell: findCell,
        swap: swap,
        isSolved: isSolved,
        toString: toString
    };

})();
