// New character: Dragon
function drawDragon(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // Body
    ctx.fillStyle = '#27ae60';
    ctx.beginPath();
    ctx.ellipse(x + 20, y + 18, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Head
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.arc(x + 28, y + 15, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Snout
    ctx.fillStyle = '#27ae60';
    ctx.beginPath();
    ctx.ellipse(x + 33, y + 16, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Horns
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.moveTo(x + 26, y + 12);
    ctx.lineTo(x + 25, y + 8);
    ctx.lineTo(x + 27, y + 11);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(x + 30, y + 12);
    ctx.lineTo(x + 31, y + 8);
    ctx.lineTo(x + 29, y + 11);
    ctx.closePath();
    ctx.fill();
    
    // Eye
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(x + 29, y + 14, 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(x + 29, y + 14, 1, 0, Math.PI * 2);
    ctx.fill();
    
    // Wings
    ctx.fillStyle = 'rgba(46, 204, 113, 0.6)';
    
    // Wing motion when thrusting
    const wingY = thrustActive && isGameRunning ? -2 : 0;
    
    ctx.beginPath();
    ctx.moveTo(x + 15, y + 15 + wingY);
    ctx.quadraticCurveTo(x + 5, y + 10 + wingY, x + 8, y + 18 + wingY);
    ctx.lineTo(x + 15, y + 20);
    ctx.closePath();
    ctx.fill();
    
    // Tail
    ctx.strokeStyle = '#27ae60';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 20);
    ctx.quadraticCurveTo(x + 5, y + 22, x + 3, y + 18);
    ctx.stroke();
    
    // Tail tip
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 16);
    ctx.lineTo(x + 1, y + 18);
    ctx.lineTo(x + 3, y + 20);
    ctx.closePath();
    ctx.fill();
    
    // Fire breath when thrusting
    if (thrustActive && isGameRunning) {
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.moveTo(x + 37, y + 16);
        ctx.lineTo(x + 45, y + 14);
        ctx.lineTo(x + 45, y + 18);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(x + 40, y + 16);
        ctx.lineTo(x + 47, y + 15);
        ctx.lineTo(x + 47, y + 17);
        ctx.closePath();
        ctx.fill();
    }
}
