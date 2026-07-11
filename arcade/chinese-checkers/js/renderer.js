/**
 * renderer.js — Canvas rendering of the hex board
 * Draws hex grid, pieces, highlights, and animations
 */

var Renderer = (function() {

    var canvas, ctx;
    var boardWidth, boardHeight;
    var offsetX, offsetY;
    var hoveredCell = null;

    // ── Initialize ───────────────────────────────────────────────────────────
    function init(canvasEl) {
        canvas = canvasEl;
        ctx = canvas.getContext('2d');
        calculateDimensions();
    }

    function calculateDimensions() {
        // Find bounds of all positions in pixel space
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

        // Set canvas size
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

        // Draw each cell
        for (var i = 0; i < CC.POSITIONS.length; i++) {
            var pos = CC.POSITIONS[i];
            var pixel = getCellPixel(pos[0], pos[1]);
            var piece = Board.getPiece(pos[0], pos[1], pos[2]);

            // Draw hex cell
            drawHexPath(pixel.x, pixel.y, CC.HEX_SIZE - 2);
            ctx.fillStyle = CC.COLORS.cellEmpty;
            ctx.fill();
            ctx.strokeStyle = CC.COLORS.cellBorder;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Draw piece if present
            if (piece !== CC.EMPTY) {
                drawPiece(pixel.x, pixel.y, piece);
            }
        }
    }

    // ── Draw a piece ─────────────────────────────────────────────────────────
    function drawPiece(cx, cy, player) {
        var color = player === CC.PLAYER1 ? CC.COLORS.player1 : CC.COLORS.player2;
        var glow = player === CC.PLAYER1 ? CC.COLORS.player1Glow : CC.COLORS.player2Glow;

        // Glow effect
        ctx.shadowColor = glow;
        ctx.shadowBlur = 12;

        // Piece circle
        ctx.beginPath();
        ctx.arc(cx, cy, CC.HEX_SIZE * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Inner highlight
        ctx.beginPath();
        ctx.arc(cx - 3, cy - 3, CC.HEX_SIZE * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }

    // ── Draw selected piece highlight ────────────────────────────────────────
    function drawSelected(q, r, s) {
        var pixel = getCellPixel(q, r);

        ctx.shadowColor = CC.COLORS.selectedGlow;
        ctx.shadowBlur = 20;

        drawHexPath(pixel.x, pixel.y, CC.HEX_SIZE - 2);
        ctx.strokeStyle = CC.COLORS.selected;
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
            var isHop = move.type === CC.MOVE_TYPE.HOP || move.type === CC.MOVE_TYPE.MULTI_HOP;
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

    // ── Draw hover highlight ─────────────────────────────────────────────────
    function drawHover(q, r, s, player) {
        if (q === null) return;

        var piece = Board.getPiece(q, r, s);
        var pixel = getCellPixel(q, r);

        if (piece === player) {
            // Hovering over own piece
            drawHexPath(pixel.x, pixel.y, CC.HEX_SIZE);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    // ── Draw goal areas ──────────────────────────────────────────────────────
    function drawGoalAreas(player1Color, player2Color) {
        // Player 1 goal (bottom triangle) - subtle highlight
        var p1Goal = CC.PLAYER1_GOAL;
        for (var i = 0; i < p1Goal.length; i++) {
            var pixel = getCellPixel(p1Goal[i][0], p1Goal[i][1]);
            drawHexPath(pixel.x, pixel.y, CC.HEX_SIZE - 1);
            ctx.strokeStyle = 'rgba(0, 245, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Player 2 goal (top triangle) - subtle highlight
        var p2Goal = CC.PLAYER2_GOAL;
        for (var i = 0; i < p2Goal.length; i++) {
            var pixel = getCellPixel(p2Goal[i][0], p2Goal[i][1]);
            drawHexPath(pixel.x, pixel.y, CC.HEX_SIZE - 1);
            ctx.strokeStyle = 'rgba(255, 45, 120, 0.15)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    // ── Full render pass ─────────────────────────────────────────────────────
    function render(selectedPiece, legalMoves, currentPlayer, hoverPos) {
        drawBoard();
        drawGoalAreas();

        if (selectedPiece) {
            drawSelected(selectedPiece[0], selectedPiece[1], selectedPiece[2]);
            drawMoves(legalMoves);
        }

        if (hoverPos && !selectedPiece) {
            drawHover(hoverPos[0], hoverPos[1], hoverPos[2], currentPlayer);
        }
    }

    // ── Getters ──────────────────────────────────────────────────────────────
    function getCanvas() { return canvas; }
    function getCellAtPixelPublic(px, py) { return getCellAtPixel(px, py); }

    return {
        init: init,
        render: render,
        getCanvas: getCanvas,
        getCellAtPixel: getCellAtPixelPublic,
        getCellPixel: getCellPixel
    };

})();
