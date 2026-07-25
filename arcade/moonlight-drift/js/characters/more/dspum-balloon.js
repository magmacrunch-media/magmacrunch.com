// New character: Hot Air Balloon
function drawHotAirBalloon(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // Balloon envelope - colorful stripes
    const colors = ['#e74c3c', '#f39c12', '#f1c40f', '#2ecc71', '#3498db'];
    const stripeWidth = 40 / colors.length;
    
    colors.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x + 20, y + 12, 12, 
            Math.PI + (i * Math.PI / colors.length), 
            Math.PI + ((i + 1) * Math.PI / colors.length));
        ctx.lineTo(x + 20, y + 12);
        ctx.closePath();
        ctx.fill();
    });
    
    // Balloon outline
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 20, y + 12, 12, Math.PI, 0);
    ctx.stroke();
    
    // Basket
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(x + 14, y + 24, 12, 8);
    
    // Basket weave pattern
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 14, y + 26 + i * 2);
        ctx.lineTo(x + 26, y + 26 + i * 2);
        ctx.stroke();
    }
    
    // Ropes
    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 20);
    ctx.lineTo(x + 14, y + 24);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 30, y + 20);
    ctx.lineTo(x + 26, y + 24);
    ctx.stroke();
    
    // Fire/burner when thrusting
    if (thrustActive && isGameRunning) {
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.moveTo(x + 17, y + 24);
        ctx.lineTo(x + 20, y + 20);
        ctx.lineTo(x + 23, y + 24);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(x + 18, y + 24);
        ctx.lineTo(x + 20, y + 22);
        ctx.lineTo(x + 22, y + 24);
        ctx.closePath();
        ctx.fill();
    }
}

// Register the character
if (window.characters) {
    window.characters['dspum-balloon'] = {
        name: 'dspum balloon',
        draw: drawHotAirBalloon
    };
}