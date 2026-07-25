// New character: Paper Airplane
function drawPaperAirplane(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // Main body - white paper
    ctx.fillStyle = '#ecf0f1';
    
    // Front triangle
    ctx.beginPath();
    ctx.moveTo(x + 35, y + 15);
    ctx.lineTo(x + 5, y + 5);
    ctx.lineTo(x + 5, y + 25);
    ctx.closePath();
    ctx.fill();
    
    // Wings
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 15);
    ctx.lineTo(x + 20, y + 5);
    ctx.lineTo(x + 20, y + 15);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 15);
    ctx.lineTo(x + 20, y + 25);
    ctx.lineTo(x + 20, y + 15);
    ctx.closePath();
    ctx.fill();
    
    // Shadow/fold lines
    ctx.strokeStyle = '#bdc3c7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 15);
    ctx.lineTo(x + 35, y + 15);
    ctx.stroke();
    
    // Wind trail when thrusting
    if (thrustActive && isGameRunning) {
        ctx.strokeStyle = 'rgba(52, 152, 219, 0.3)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(x - 10 - i * 8, y + 10 + i * 5);
            ctx.lineTo(x - 5 - i * 8, y + 10 + i * 5);
            ctx.stroke();
        }
    }
}
