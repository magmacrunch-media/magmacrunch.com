// New character: Bee
function drawBee(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // Body stripes
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.ellipse(x + 20, y + 18, 10, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Black stripes
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(x + 13, y + 12, 14, 3);
    ctx.fillRect(x + 13, y + 18, 14, 3);
    ctx.fillRect(x + 13, y + 24, 14, 3);
    
    // Head
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(x + 20, y + 8, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + 18, y + 7, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 22, y + 7, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupils
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(x + 18, y + 7, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 22, y + 7, 1, 0, Math.PI * 2);
    ctx.fill();
    
    // Antennae
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 4);
    ctx.lineTo(x + 16, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 22, y + 4);
    ctx.lineTo(x + 24, y);
    ctx.stroke();
    
    // Wings - flap when thrusting
    const wingAngle = thrustActive && isGameRunning ? 0.3 : 0.1;
    ctx.fillStyle = 'rgba(236, 240, 241, 0.7)';
    
    // Left wing
    ctx.save();
    ctx.translate(x + 15, y + 15);
    ctx.rotate(-wingAngle);
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Right wing
    ctx.save();
    ctx.translate(x + 25, y + 15);
    ctx.rotate(wingAngle);
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Stinger
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 30);
    ctx.lineTo(x + 20, y + 35);
    ctx.lineTo(x + 22, y + 30);
    ctx.closePath();
    ctx.fill();
}
