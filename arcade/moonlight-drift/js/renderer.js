// Renderer module - handles all canvas drawing operations

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function drawBackground() {
    // Just clear the canvas - stars will be visible through transparent canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw boundary lines to show collision zones
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)'; // Subtle cyan
    ctx.lineWidth = 2;
    
    // Top boundary line
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(canvas.width, 0);
    ctx.stroke();
    
    // Bottom boundary line
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.stroke();
}

function updateCanvasScale() {
    // This function can be used to handle canvas scaling if needed
    // Currently placeholder
}

function renderGame(thrustActive, isGameRunning, timestamp = 0, showCharacter = true) {
    updateCanvasScale();
    drawBackground();
    drawStars(ctx);
    drawObstacles(ctx, canvas.height);
    drawMilestoneMarkers(ctx, canvas.height);
    
    // Only draw character if showCharacter is true
    if (showCharacter) {
        drawPlayer(ctx, thrustActive, isGameRunning, timestamp);
    }
    
    // Only draw score when game is actually running (not on title/character/ready screens)
    if (isGameRunning) {
        drawScoreOnCanvas(ctx);
    }
}

function getCanvas() {
    return canvas;
}

function getContext() {
    return ctx;
}