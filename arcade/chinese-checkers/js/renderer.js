/**
 * renderer.js — Canvas rendering of the hex board
 * Draws hex grid, pieces, highlights, and animations
 * Supports 2-6 player configurations
 */

var Renderer = (function() {

    var canvas, ctx;
    var boardWidth, boardHeight;
    var offsetX, offsetY;

    // ── Initialize ───────────────────────────────────────────────────────────
    function init(canvasEl) {
        canvas = canvasEl;
        ctx = canvas.getContext('2d');
        calculateDimensions();
    }

    function calculateDimensions() {
        var minX = Infinity, maxX = -Infinity;
        var minY = Infinity, maxY = -Infinity;

        for (var i = 0; i < CC.POSITIONS.length; i++) {
            var pos = CC.POSITIONS[i];
            var pixel = CC.hexToPixel(pos[0], pos[1]);
            minX = Math.min(minX, pixel.x);
            maxX = Math.max(maxX, pixel.x);
            minY = Math.min(minY, pixel.y);
            maxY = Math.max(maxY, pixel.y);
        }

        boardWidth = maxX - minX + CC.HEX_SIZE * 2;
        boardHeight = maxY - minY + CC.HEX_SIZE * 2;
        offsetX = -minX + CC.HEX_SIZE + CC.BOARD_PADDING;
        offsetY = -minY + CC.HEX_SIZE + CC.BOARD_PADDING;

        canvas.width = boardWidth + CC.BOARD_PADDING * 2;
        canvas.height = boardHeight + CC.BOARD_PADDING * 2;
    }

    // ── Draw hexagon path ────────────────────────────────────────────────────
    function drawHexPath(cx, cy, size) {
        ctx.beginPath();
        for (var i = 0; i < 6; i++) {
            var angle = Math.PI / 180 * (60 * i);
            var hx = cx + size * Math.cos(angle);
            var hy = cy + size * Math.sin(angle);
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
    }

    // ── Get pixel coordinates for a board position ───────────────────────────
    function getCellPixel(q, r) {
        var pixel = CC.hexToPixel(q, r);
        return {
            x: pixel.x + offsetX,
            y: pixel.y + offsetY
        };
    }

    // ── Find cell at pixel coordinates ───────────────────────────────────────
    function getCellAtPixel(px, py) {
        var closest = null;
        var closestDist = Infinity;

        for (var i = 0; i < CC.POSITIONS.length; i++) {
            var pos = CC.POSITIONS[i];
            var pixel = getCellPixel(pos[0], pos[1]);
            var dx = px - pixel.x;
            var dy = py - pixel.y;
            var dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < CC.HEX_SIZE && dist < closestDist) {
                closest = pos;
                closestDist = dist;
            }
        }

        return closest;
    }

    // ── Draw the board ───────────────────────────────────────────────────────
    function drawBoard() {
        ctx.fillStyle = CC.COLORS.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (var i = 0; i < CC.POSITIONS.length; i++) {
            var pos = CC.POSITIONS[i];
            var pixel = getCellPixel(pos[0], pos[1]);

            drawHexPath(pixel.x, pixel.y, CC.HEX_SIZE - 2);
            ctx.fillStyle = CC.COLORS.cellEmpty;
            ctx.fill();
            ctx.strokeStyle = CC.COLORS.cellBorder;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    // ── Draw pieces for all active players ───────────────────────────────────
    function drawPieces(activePlayers) {
        for (var p = 0; p < activePlayers.length; p++) {
            var playerIdx = activePlayers[p];
            var color = CC.PLAYER_COLORS[playerIdx];
            var glow = CC.PLAYER_GLOWS[playerIdx];

            // Find all pieces for this player
            for (var key in Board.getState()) {
                if (Board.getState()[key] === playerIdx) {
                    var pos = CC.parseKey(key);
                    var pixel = getCellPixel(pos[0], pos[1]);
                    drawPiece(pixel.x, pixel.y, color, glow);
                }
            }
        }
    }

    // ── Draw a piece ─────────────────────────────────────────────────────────
    function drawPiece(cx, cy, color, glow) {
        ctx.shadowColor = glow;
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.arc(cx, cy, CC.HEX_SIZE * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Inner highlight
        ctx.beginPath();
        ctx.arc(cx - 3, cy - 3, CC.HEX_SIZE * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }

    // ── Draw selected piece highlight ────────────────────────────────────────
    function drawSelected(q, r, s, playerIdx) {
        var pixel = getCellPixel(q, r);
        var color = CC.PLAYER_COLORS[playerIdx];

        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 20;

        drawHexPath(pixel.x, pixel.y, CC.HEX_SIZE - 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }

    // ── Draw legal move highlights ───────────────────────────────────────────
    function drawMoves(moves) {
        for (var i = 0; i < moves.length; i++) {
            var move = moves[i];
            var pixel = getCellPixel(move.to[0], move.to[1]);
            var isHop = move.type === CC.MOVE_TYPE.MULTI_HOP;
            var color = isHop ? CC.COLORS.highlightHop : CC.COLORS.highlight;
            var glow = isHop ? CC.COLORS.highlightHopGlow : CC.COLORS.highlightGlow;

            ctx.shadowColor = glow;
            ctx.shadowBlur = 10;

            drawHexPath(pixel.x, pixel.y, CC.HEX_SIZE - 4);
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.3;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }
    }

    // ── Draw goal area indicators ────────────────────────────────────────────
    function drawGoalAreas(activePlayers) {
        for (var p = 0; p < activePlayers.length; p++) {
            var playerIdx = activePlayers[p];
            var color = CC.PLAYER_COLORS[playerIdx];
            var goal = CC.getGoalPositions(playerIdx);

            for (var i = 0; i < goal.length; i++) {
                var pixel = getCellPixel(goal[i][0], goal[i][1]);
                drawHexPath(pixel.x, pixel.y, CC.HEX_SIZE - 1);
                ctx.strokeStyle = color;
                ctx.globalAlpha = 0.2;
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }
    }

    // ── Full render pass ─────────────────────────────────────────────────────
    function render(selectedPiece, legalMoves, currentPlayer, activePlayers) {
        drawBoard();
        drawGoalAreas(activePlayers);
        drawPieces(activePlayers);

        if (selectedPiece) {
            drawSelected(selectedPiece[0], selectedPiece[1], selectedPiece[2], currentPlayer);
            drawMoves(legalMoves);
        }
    }

    // ── Getters ──────────────────────────────────────────────────────────────
    function getCanvas() { return canvas; }

    return {
        init: init,
        render: render,
        getCanvas: getCanvas,
        getCellAtPixel: getCellAtPixel,
        getCellPixel: getCellPixel
    };

})();
