// New character: Helicopter
function drawHelicopter(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // Main body/cockpit
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.ellipse(x + 20, y + 20, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Windshield
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.arc(x + 25, y + 18, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Tail boom
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(x + 8, y + 19, 10, 3);
    
    // Tail rotor (vertical)
    ctx.fillStyle = '#95a5a6';
    if (thrustActive && isGameRunning) {
        // Spinning - just show motion blur
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillRect(x + 6, y + 15, 2, 10);
        ctx.restore();
    } else {
        ctx.fillRect(x + 7, y + 15, 1, 10);
    }
    
    // Main rotor (on top)
    ctx.fillStyle = '#34495e';
    if (thrustActive && isGameRunning) {
        // Spinning blur effect
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillRect(x + 5, y + 10, 30, 3);
        ctx.fillRect(x + 18, y - 2, 4, 18);
        ctx.restore();
    } else {
        ctx.fillRect(x + 5, y + 11, 30, 1);
    }
    
    // Rotor mast
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(x + 19, y + 12, 2, 8);
    
    // Skids
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 26);
    ctx.lineTo(x + 28, y + 26);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x + 14, y + 24);
    ctx.lineTo(x + 14, y + 28);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 26, y + 24);
    ctx.lineTo(x + 26, y + 28);
    ctx.stroke();
}
