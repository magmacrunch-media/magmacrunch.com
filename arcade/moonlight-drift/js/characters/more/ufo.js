// New character: UFO
function drawUFO(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // Main saucer body
    ctx.fillStyle = '#95a5a6';
    ctx.beginPath();
    ctx.ellipse(x + 20, y + 15, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Dome
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.arc(x + 20, y + 12, 8, Math.PI, 0, true);
    ctx.fill();
    
    // Dome highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(x + 18, y + 10, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Lights
    const lightColors = ['#e74c3c', '#f39c12', '#2ecc71'];
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = thrustActive && isGameRunning ? lightColors[i] : '#7f8c8d';
        ctx.beginPath();
        ctx.arc(x + 10 + i * 10, y + 18, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Beam when thrusting
    if (thrustActive && isGameRunning) {
        ctx.fillStyle = 'rgba(46, 204, 113, 0.3)';
        ctx.beginPath();
        ctx.moveTo(x + 12, y + 23);
        ctx.lineTo(x + 8, y + 40);
        ctx.lineTo(x + 32, y + 40);
        ctx.lineTo(x + 28, y + 23);
        ctx.closePath();
        ctx.fill();
    }
}
