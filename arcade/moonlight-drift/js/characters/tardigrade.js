// Fixed Tardigrade - removed Date.now() from inside function
function drawTardigrade(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // Horizontal body orientation - head pointing right (direction of travel)
    ctx.fillStyle = '#95a5a6';
    
    // Tail end (left side)
    ctx.beginPath();
    ctx.ellipse(x + 8, y + 16, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body segments (horizontal, left to right)
    ctx.beginPath();
    ctx.ellipse(x + 14, y + 16, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(x + 21, y + 16, 6, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Head (right side - pointing forward)
    ctx.fillStyle = '#a0a0a0';
    ctx.beginPath();
    ctx.ellipse(x + 28, y + 15, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body segment lines
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 11, y + 11);
    ctx.lineTo(x + 11, y + 21);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 10);
    ctx.lineTo(x + 18, y + 22);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 25, y + 10);
    ctx.lineTo(x + 25, y + 21);
    ctx.stroke();
    
    // Mouth parts (stylets pointing forward/right)
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 31, y + 14);
    ctx.lineTo(x + 34, y + 13);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 31, y + 16);
    ctx.lineTo(x + 34, y + 17);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 31, y + 15);
    ctx.lineTo(x + 34, y + 15);
    ctx.stroke();
    
    // Eye spots (simple dots on head)
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(x + 28, y + 13, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 28, y + 17, 1, 0, Math.PI * 2);
    ctx.fill();
    
    // Eight legs (4 pairs) - all pointing downward from the bottom
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 2;
    
    // Use animationTime parameter instead of Date.now()
    const legAnimation = thrustActive && isGameRunning ? Math.sin(animationTime / 100) * 1.5 : 0;
    
    // First pair (front right)
    ctx.beginPath();
    ctx.moveTo(x + 24, y + 20);
    ctx.lineTo(x + 24, y + 25 + legAnimation);
    ctx.lineTo(x + 23, y + 27 + legAnimation);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 27, y + 20);
    ctx.lineTo(x + 28, y + 25 - legAnimation);
    ctx.lineTo(x + 28, y + 27 - legAnimation);
    ctx.stroke();
    
    // Second pair
    ctx.beginPath();
    ctx.moveTo(x + 19, y + 22);
    ctx.lineTo(x + 18, y + 27 - legAnimation);
    ctx.lineTo(x + 17, y + 29 - legAnimation);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 22, y + 22);
    ctx.lineTo(x + 23, y + 27 + legAnimation);
    ctx.lineTo(x + 23, y + 29 + legAnimation);
    ctx.stroke();
    
    // Third pair
    ctx.beginPath();
    ctx.moveTo(x + 13, y + 21);
    ctx.lineTo(x + 12, y + 26 + legAnimation);
    ctx.lineTo(x + 11, y + 28 + legAnimation);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 21);
    ctx.lineTo(x + 16, y + 26 - legAnimation);
    ctx.lineTo(x + 15, y + 28 - legAnimation);
    ctx.stroke();
    
    // Fourth pair (back left)
    ctx.beginPath();
    ctx.moveTo(x + 7, y + 20);
    ctx.lineTo(x + 6, y + 25 - legAnimation);
    ctx.lineTo(x + 5, y + 27 - legAnimation);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 20);
    ctx.lineTo(x + 10, y + 25 + legAnimation);
    ctx.lineTo(x + 9, y + 27 + legAnimation);
    ctx.stroke();
    
    // Claws on legs (tiny details)
    ctx.fillStyle = '#5a5a5a';
    const clawPositions = [
        [23, 27 + legAnimation], [28, 27 - legAnimation],
        [17, 29 - legAnimation], [23, 29 + legAnimation],
        [11, 28 + legAnimation], [15, 28 - legAnimation],
        [5, 27 - legAnimation], [9, 27 + legAnimation]
    ];
    clawPositions.forEach(([cx, cy]) => {
        ctx.beginPath();
        ctx.arc(x + cx, y + cy, 1, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Water bubble effect when thrusting (tardigrades are aquatic)
    if (thrustActive && isGameRunning) {
        ctx.strokeStyle = 'rgba(52, 152, 219, 0.4)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(x + 2 - i * 4, y + 16 + (i % 2) * 4, 3 - i * 0.5, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

// Register the character
if (window.characters) {
    window.characters['tardigrade'] = {
        name: 'Tardigrade',
        draw: drawTardigrade,
        hitbox: {
            width: 26,
            height: 25,
            offsetX: 7,
            offsetY: 8
        }
    };
}