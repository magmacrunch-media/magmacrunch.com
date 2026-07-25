/**
 * board-renderer.js — Canvas pixel art renderer for Aggravation board
 * Neon retro aesthetic with CRT scanline feel.
 */

var BoardRenderer = (function() {
    'use strict';

    var canvas, ctx;
    var CELL = 10;
    var BOARD_PX = AC.BOARD_SIZE * CELL;

    var COLORS = {
        bg:         '#0a0612',
        grid:       '#1a1028',
        track:      '#1a1028',
        trackLine:  '#2a1a40',
        trackSafe:  '#ffe03a',
        home:       '#f0ead8',
        highlight:  '#ffe03a',
        yard:       '#0d0820',
    };

    var COLOR_FG = {
        red: '#ff3d6e', blue: '#00f5ff', green: '#39ff6e',
        yellow: '#ffe03a', purple: '#c45fff', orange: '#ff7c1f',
    };

    var COLOR_BG = {
        red: '#3a0a18', blue: '#0a1a2a', green: '#0a2a10',
        yellow: '#2a2a08', purple: '#1a0a2a', orange: '#2a1a08',
    };

    // ── Draw board ────────────────────────────────────────────────────────────

    function drawBoard(canvasEl) {
        canvas = canvasEl;
        ctx = canvas.getContext('2d');
        canvas.width = BOARD_PX;
        canvas.height = BOARD_PX;

        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, BOARD_PX, BOARD_PX);

        drawTrackCells();
        drawHomeRuns();
        drawYards();
        drawCenter();
    }

    function drawTrackCells() {
        var coords = AC.getTrackCoords();

        for (var i = 0; i < coords.length; i++) {
            var col = coords[i][0];
            var row = coords[i][1];
            var x = col * CELL;
            var y = row * CELL;

            ctx.fillStyle = COLORS.track;
            ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);

            ctx.strokeStyle = COLORS.trackLine;
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);

            // Safe squares — colored dot
            if (AC.isSafeSquare(i)) {
                ctx.fillStyle = COLORS.trackSafe + '80';
                ctx.beginPath();
                ctx.arc(x + CELL / 2, y + CELL / 2, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Entry squares — colored glow
            AC.COLORS.forEach(function(color) {
                if (AC.COLOR_CONFIG[color].entry === i) {
                    ctx.fillStyle = COLOR_FG[color] + '40';
                    ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
                    drawStar(x, y, CELL, COLOR_FG[color] + '50');
                }
            });
        }
    }

    function drawHomeRuns() {
        AC.COLORS.forEach(function(color) {
            var coords = AC.HOME_COORDS[color];
            coords.forEach(function(pos, idx) {
                var x = pos[0] * CELL;
                var y = pos[1] * CELL;

                ctx.fillStyle = COLOR_BG[color] + '60';
                ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);

                ctx.strokeStyle = COLOR_FG[color] + '50';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);

                // Arrow pattern toward center
                if (idx % 2 === 0) {
                    drawDiamond(x, y, CELL, COLOR_FG[color] + '20');
                }
            });
        });
    }

    function drawYards() {
        AC.COLORS.forEach(function(color) {
            var cells = AC.YARD_POSITIONS[color];
            cells.forEach(function(pos) {
                var x = pos[0] * CELL;
                var y = pos[1] * CELL;

                ctx.fillStyle = COLOR_BG[color] + '40';
                ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);

                ctx.strokeStyle = COLOR_FG[color] + '30';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
            });
        });
    }

    function drawCenter() {
        var cx = 10 * CELL;
        var cy = 10 * CELL;

        // Central area glow
        ctx.fillStyle = '#ffe03a10';
        ctx.fillRect(cx - CELL * 2, cy - CELL * 2, CELL * 4, CELL * 4);

        ctx.strokeStyle = '#ffe03a30';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - CELL * 2, cy - CELL * 2, CELL * 4, CELL * 4);

        drawStar(cx - CELL, cy - CELL, CELL * 2, '#ffe03a15');
    }

    // ── Decorative patterns ───────────────────────────────────────────────────

    function drawStar(x, y, size, color) {
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

    function drawDiamond(x, y, size, color) {
        var cx = x + size / 2;
        var cy = y + size / 2;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(cx, y + 1);
        ctx.lineTo(x + size - 1, cy);
        ctx.lineTo(cx, y + size - 1);
        ctx.lineTo(x + 1, cy);
        ctx.closePath();
        ctx.fill();
    }

    // ── Draw tokens ────────────────────────────────────────────────────────────

    function drawTokens(pawnPositions, colorMap) {
        AC.COLORS.forEach(function(color) {
            var hex = (colorMap && colorMap[color]) || COLOR_FG[color];
            var pawns = pawnPositions[color];
            if (!pawns) return;

            for (var i = 0; i < AC.NUM_PAWNS; i++) {
                var pos = pawns[i];
                if (pos === null) {
                    var yardPos = AC.YARD_POSITIONS[color][i];
                    drawTokenAt(yardPos[0], yardPos[1], hex, i);
                } else if (pos === 'finished') {
                    drawFinishedToken(color, i, hex);
                } else if ('home' in pos) {
                    var homeCoord = AC.HOME_COORDS[color][pos.home];
                    if (homeCoord) drawTokenAt(homeCoord[0], homeCoord[1], hex, i);
                } else if ('track' in pos) {
                    var trackCoord = AC.TRACK_COORDS[pos.track];
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

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x + ox, y + oy, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(x + ox, y + oy, 3, 0, Math.PI * 2);
        ctx.stroke();
    }

    function drawFinishedToken(color, index, hex) {
        var cx = 10 * CELL + CELL / 2;
        var cy = 10 * CELL + CELL / 2;
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

    function highlightMoves(moves, color) {
        clearHighlights();

        moves.forEach(function(move) {
            var coord = null;

            if (move.enterFromYard) {
                coord = AC.TRACK_COORDS[AC.COLOR_CONFIG[color].entry];
            } else if (move.newPos === null) {
                return;
            } else if (move.newPos === 'finished') {
                coord = [10, 10]; // center
            } else if ('home' in move.newPos) {
                coord = AC.HOME_COORDS[color][move.newPos.home];
            } else if ('track' in move.newPos) {
                coord = AC.TRACK_COORDS[move.newPos.track];
            }

            if (coord) {
                var x = coord[0] * CELL;
                var y = coord[1] * CELL;

                ctx.fillStyle = COLORS.highlight + '40';
                ctx.fillRect(x, y, CELL, CELL);
                ctx.strokeStyle = COLORS.highlight;
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);

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
    };
})();
