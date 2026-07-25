// New character: Simple Rocket
function drawRocket(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // Rocket body
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(x + 10, y + 10, 20, 20);
    
    // Rocket nose cone
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.moveTo(x + 20, y);
    ctx.lineTo(x + 10, y + 10);
    ctx.lineTo(x + 30, y + 10);
    ctx.closePath();
    ctx.fill();
    
    // Window
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.arc(x + 20, y + 18, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Wings
    ctx.fillStyle = '#95a5a6';
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 25);
    ctx.lineTo(x + 5, y + 30);
    ctx.lineTo(x + 10, y + 30);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(x + 30, y + 25);
    ctx.lineTo(x + 35, y + 30);
    ctx.lineTo(x + 30, y + 30);
    ctx.closePath();
    ctx.fill();
    
    // Thrust flame
    if (thrustActive && isGameRunning) {
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.moveTo(x + 12, y + 30);
        ctx.lineTo(x + 20, y + 42);
        ctx.lineTo(x + 28, y + 30);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(x + 15, y + 30);
        ctx.lineTo(x + 20, y + 38);
        ctx.lineTo(x + 25, y + 30);
        ctx.closePath();
        ctx.fill();
    }
}
