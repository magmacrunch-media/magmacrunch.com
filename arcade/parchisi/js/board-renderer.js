/**
 * board-renderer.js — Canvas pixel art renderer for Parchís board
 * Spanish tile (azulejo) inspired board with Moorish geometric patterns.
 */

var BoardRenderer = (function() {
    'use strict';

    var canvas, ctx;
    var CELL = 10;
    var BOARD_PX = PC.BOARD_SIZE * CELL;

    // ── Spanish tile palette ──────────────────────────────────────────────────
    var COLORS = {
        bg:         '#1a0a0a',
        grid:       '#2a1410',
        red:        '#AA151B',
        redDark:    '#6a0a10',
        blue:       '#4059c8',
        blueDark:   '#2a3a80',
        green:      '#39d353',
        greenDark:  '#1a8030',
        yellow:     '#F1BF00',
        yellowDark: '#a07a00',
        safe:       '#F1BF00',
        track:      '#2a1410',
        trackLine:  '#3a2018',
        home:       '#f0ead8',
        highlight:  '#F1BF00',
        tile:       '#3a2018',
        tileAccent: '#4a2a1a',
    };

    var COLOR_FG = {
        red: COLORS.red, blue: COLORS.blue,
        green: COLORS.green, yellow: COLORS.yellow,
    };

    var COLOR_BG = {
        red: COLORS.redDark, blue: COLORS.blueDark,
        green: COLORS.greenDark, yellow: COLORS.yellowDark,
    };

    var HOME_COORDS = {
        red:    [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8],[7,7],[7,6]],
        blue:   [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7],[6,6],[7,7]],
        green:  [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7],[8,8],[7,7]],
        yellow: [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6],[6,8],[7,7]],
    };

    var YARD_POSITIONS = {
        red:    [[2,11],[3,11],[2,12],[3,12]],
        blue:   [[2,2],[3,2],[2,3],[3,3]],
        green:  [[11,2],[12,2],[11,3],[12,3]],
        yellow: [[11,11],[12,11],[11,12],[12,12]],
    };

    // ── Moorish tile pattern ──────────────────────────────────────────────────
    function drawTilePattern(x, y, size, color1, color2) {
        // Draw a small geometric tile pattern inspired by azulejos
        var s = size;
        var cx = x + s / 2;
        var cy = y + s / 2;

        // Diamond in center
        ctx.fillStyle = color1;
        ctx.beginPath();
        ctx.moveTo(cx, y + 1);
        ctx.lineTo(x + s - 1, cy);
        ctx.lineTo(cx, y + s - 1);
        ctx.lineTo(x + 1, cy);
        ctx.closePath();
        ctx.fill();

        // Corner triangles
        ctx.fillStyle = color2;
        ctx.beginPath();
        ctx.moveTo(x + 1, y + 1);
        ctx.lineTo(cx, y + 1);
        ctx.lineTo(x + 1, cy);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x + s - 1, y + 1);
        ctx.lineTo(cx, y + 1);
        ctx.lineTo(x + s - 1, cy);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x + 1, y + s - 1);
        ctx.lineTo(cx, y + s - 1);
        ctx.lineTo(x + 1, cy);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x + s - 1, y + s - 1);
        ctx.lineTo(cx, y + s - 1);
        ctx.lineTo(x + s - 1, cy);
        ctx.closePath();
        ctx.fill();
    }

    function drawCrossPattern(x, y, size, color) {
        // Simple cross/plus pattern
        var s = size;
        var mid = Math.floor(s / 2);
        ctx.fillStyle = color;
        ctx.fillRect(x + mid - 1, y + 1, 2, s - 2);
        ctx.fillRect(x + 1, y + mid - 1, s - 2, 2);
    }

    function drawStarPattern(x, y, size, color) {
        // 8-pointed star
        var cx = x + size / 2;
        var cy = y + size / 2;
        var r = size / 2 - 1;
        ctx.fillStyle = color;
        ctx.beginPath();
        for (var i = 0; i < 8; i++) {
            var angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
            var px = cx + Math.cos(angle) * r * (i % 2 === 0 ? 1 : 0.5);
            var py = cy + Math.sin(angle) * r * (i % 2 === 0 ? 1 : 0.5);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }

    // ── Draw board ────────────────────────────────────────────────────────────

    function drawBoard(canvasEl) {
        canvas = canvasEl;
        ctx = canvas.getContext('2d');
        canvas.width = BOARD_PX;
        canvas.height = BOARD_PX;

        // Warm dark background
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, BOARD_PX, BOARD_PX);

        drawGrid();
        drawQuadrants();
        drawTrackCells();
        drawHomeRuns();
        drawYards();
        drawCenter();
    }

    function drawGrid() {
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 0.5;
        for (var x = 0; x <= PC.BOARD_SIZE; x++) {
            ctx.beginPath();
            ctx.moveTo(x * CELL, 0);
            ctx.lineTo(x * CELL, BOARD_PX);
            ctx.stroke();
        }
        for (var y = 0; y <= PC.BOARD_SIZE; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * CELL);
            ctx.lineTo(BOARD_PX, y * CELL);
            ctx.stroke();
        }
    }

    function drawQuadrants() {
        // Each quadrant gets a subtle tile background
        // Bottom-left (red)
        ctx.fillStyle = COLORS.redDark + '30';
        ctx.fillRect(0, 9 * CELL, 6 * CELL, 6 * CELL);
        drawQuadrantTiles(0, 9, 6, 6, COLORS.redDark, COLORS.red);

        // Top-left (blue)
        ctx.fillStyle = COLORS.blueDark + '30';
        ctx.fillRect(0, 0, 6 * CELL, 6 * CELL);
        drawQuadrantTiles(0, 0, 6, 6, COLORS.blueDark, COLORS.blue);

        // Top-right (green)
        ctx.fillStyle = COLORS.greenDark + '30';
        ctx.fillRect(9 * CELL, 0, 6 * CELL, 6 * CELL);
        drawQuadrantTiles(9, 0, 6, 6, COLORS.greenDark, COLORS.green);

        // Bottom-right (yellow)
        ctx.fillStyle = COLORS.yellowDark + '30';
        ctx.fillRect(9 * CELL, 9 * CELL, 6 * CELL, 6 * CELL);
        drawQuadrantTiles(9, 9, 6, 6, COLORS.yellowDark, COLORS.yellow);
    }

    function drawQuadrantTiles(col, row, w, h, color1, color2) {
        // Draw subtle tile patterns in quadrant backgrounds
        for (var c = col; c < col + w; c++) {
            for (var r = row; r < row + h; r++) {
                var x = c * CELL;
                var y = r * CELL;
                // Alternate between cross and diamond patterns
                if ((c + r) % 3 === 0) {
                    drawCrossPattern(x, y, CELL, color1 + '40');
                } else if ((c + r) % 3 === 1) {
                    drawTilePattern(x, y, CELL, color1 + '30', color2 + '15');
                }
            }
        }
    }

    function drawTrackCells() {
        var coords = PC.getTrackCoords();
        var entrySquares = PC.COLORS.map(function(c) { return PC.COLOR_CONFIG[c].entry; });

        for (var i = 0; i < coords.length; i++) {
            var col = coords[i][0];
            var row = coords[i][1];
            var x = col * CELL;
            var y = row * CELL;

            // Track cell with tile pattern
            ctx.fillStyle = COLORS.track;
            ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);

            // Inner border (tile edge)
            ctx.strokeStyle = COLORS.trackLine;
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);

            // Small geometric detail in track cells
            if ((col + row) % 2 === 0) {
                drawCrossPattern(x, y, CELL, COLORS.tileAccent + '40');
            }

            // Entry squares — golden highlight
            var entryIdx = entrySquares.indexOf(i);
            if (entryIdx !== -1) {
                ctx.fillStyle = COLOR_FG[PC.COLORS[entryIdx]] + '60';
                ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
                // Star pattern on entry squares
                drawStarPattern(x, y, CELL, COLORS.yellow + '50');
            }

            // Safe squares — golden dot
            if (PC.isSafeSquare(i)) {
                ctx.fillStyle = COLORS.safe + '60';
                ctx.beginPath();
                ctx.arc(x + CELL / 2, y + CELL / 2, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function drawHomeRuns() {
        PC.COLORS.forEach(function(color) {
            var coords = HOME_COORDS[color];
            coords.forEach(function(pos) {
                var x = pos[0] * CELL;
                var y = pos[1] * CELL;

                // Home run cells with colored tile pattern
                ctx.fillStyle = COLOR_FG[color] + '30';
                ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);

                ctx.strokeStyle = COLOR_FG[color] + '60';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);

                // Diamond pattern inside home run cells
                drawTilePattern(x, y, CELL, COLOR_FG[color] + '25', COLOR_BG[color] + '20');
            });
        });
    }

    function drawYards() {
        PC.COLORS.forEach(function(color) {
            var cells = YARD_POSITIONS[color];
            cells.forEach(function(pos) {
                var x = pos[0] * CELL;
                var y = pos[1] * CELL;

                // Yard cells with colored border
                ctx.fillStyle = COLOR_BG[color] + '50';
                ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);

                ctx.strokeStyle = COLOR_FG[color] + '40';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);

                // Cross pattern in yard cells
                drawCrossPattern(x, y, CELL, COLOR_FG[color] + '20');
            });
        });
    }

    function drawCenter() {
        var cx = 7 * CELL;
        var cy = 7 * CELL;

        // Center area — golden with star pattern
        ctx.fillStyle = COLORS.home + '15';
        ctx.fillRect(cx - CELL, cy - CELL, CELL * 3, CELL * 3);

        ctx.strokeStyle = COLORS.yellow + '60';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - CELL, cy - CELL, CELL * 3, CELL * 3);

        // Central star
        drawStarPattern(cx, cy, CELL * 3, COLORS.yellow + '25');

        // Small star in very center
        drawStarPattern(cx + CELL, cy + CELL, CELL, COLORS.yellow + '40');
    }

    // ── Draw tokens ────────────────────────────────────────────────────────────

    function drawTokens(pawnPositions, colorMap) {
        PC.COLORS.forEach(function(color) {
            var hex = (colorMap && colorMap[color]) || COLOR_FG[color];
            var pawns = pawnPositions[color];
            if (!pawns) return;

            for (var i = 0; i < 4; i++) {
                var pos = pawns[i];
                if (pos === null) {
                    var yardPos = YARD_POSITIONS[color][i];
                    drawTokenAt(yardPos[0], yardPos[1], hex, i);
                } else if (pos === 'finished') {
                    drawFinishedToken(color, i, hex);
                } else if ('home' in pos) {
                    var homeCoord = HOME_COORDS[color][pos.home];
                    if (homeCoord) drawTokenAt(homeCoord[0], homeCoord[1], hex, i);
                } else if ('track' in pos) {
                    var trackCoord = PC.getTrackCoords()[pos.track];
                    if (trackCoord) drawTokenAt(trackCoord[0], trackCoord[1], hex, i);
                }
            }
        });
    }

    function drawTokenAt(col, row, color, index) {
        var x = col * CELL + CELL / 2;
        var y = row * CELL + CELL / 2;
        var offsets = [[-1,-1],[1,-1],[-1,1],[1,1]];
        var ox = offsets[index][0] * 1.5;
        var oy = offsets[index][1] * 1.5;

        // Token body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x + ox, y + oy, 3, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(x + ox, y + oy, 3, 0, Math.PI * 2);
        ctx.stroke();
    }

    function drawFinishedToken(color, index, hex) {
        var cx = 7 * CELL + CELL / 2;
        var cy = 7 * CELL + CELL / 2;
        var angle = (index / 4) * Math.PI * 2 - Math.PI / 2;
        var dist = 4;
        var x = cx + Math.cos(angle) * dist;
        var y = cy + Math.sin(angle) * dist;

        ctx.fillStyle = hex;
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.stroke();
    }

    // ── Highlight legal moves ──────────────────────────────────────────────────

    var currentHighlights = [];

    function highlightMoves(moves, color, onMoveClick) {
        clearHighlights();

        moves.forEach(function(move) {
            var coord = null;

            if (move.enterFromYard) {
                var entry = PC.COLOR_CONFIG[color].entry;
                coord = PC.getTrackCoords()[entry];
            } else if (move.newPos === null) {
                return;
            } else if (move.newPos === 'finished') {
                coord = [7, 7];
            } else if ('home' in move.newPos) {
                coord = HOME_COORDS[color][move.newPos.home];
            } else if ('track' in move.newPos) {
                coord = PC.getTrackCoords()[move.newPos.track];
            }

            if (coord) {
                var x = coord[0] * CELL;
                var y = coord[1] * CELL;

                // Golden highlight for Spanish theme
                ctx.fillStyle = COLORS.highlight + '40';
                ctx.fillRect(x, y, CELL, CELL);
                ctx.strokeStyle = COLORS.highlight;
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);

                ctx.shadowColor = 'rgba(241,191,0,0.4)';
                ctx.shadowBlur = 4;
                ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
                ctx.shadowBlur = 0;

                currentHighlights.push({ x: x, y: y, move: move });
            }
        });
    }

    function clearHighlights() {
        currentHighlights = [];
    }

    function handleClick(canvasX, canvasY) {
        for (var i = 0; i < currentHighlights.length; i++) {
            var h = currentHighlights[i];
            if (canvasX >= h.x && canvasX < h.x + CELL &&
                canvasY >= h.y && canvasY < h.y + CELL) {
                return h.move;
            }
        }
        return null;
    }

    // ── Full render ────────────────────────────────────────────────────────────

    function render(canvasEl, pawnPositions, colorMap) {
        drawBoard(canvasEl);
        drawTokens(pawnPositions, colorMap);
    }

    function updateTokens(canvasEl, pawnPositions, colorMap) {
        canvas = canvasEl;
        ctx = canvas.getContext('2d');
        drawBoard(canvasEl);
        drawTokens(pawnPositions, colorMap);
    }

    return {
        drawBoard: drawBoard,
        drawTokens: drawTokens,
        highlightMoves: highlightMoves,
        clearHighlights: clearHighlights,
        handleClick: handleClick,
        render: render,
        updateTokens: updateTokens,
        CELL: CELL,
        BOARD_PX: BOARD_PX,
        HOME_COORDS: HOME_COORDS,
        YARD_POSITIONS: YARD_POSITIONS,
    };
})();
