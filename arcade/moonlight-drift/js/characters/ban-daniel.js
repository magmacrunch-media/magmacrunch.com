// New character: Ban Daniel (Banana with sunglasses - side view)
function drawBanDaniel(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // Banana body - curved side view with proper taper
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    // Draw a curved banana shape from the side - LONGER like RPG version
    ctx.moveTo(x + 18, y + 5);
    ctx.quadraticCurveTo(x + 12, y + 8, x + 10, y + 15);
    ctx.quadraticCurveTo(x + 9, y + 23, x + 12, y + 28);
    ctx.lineTo(x + 20, y + 28);
    ctx.quadraticCurveTo(x + 18, y + 23, x + 19, y + 15);
    ctx.quadraticCurveTo(x + 21, y + 8, x + 25, y + 5);
    ctx.closePath();
    ctx.fill();
    
    // Bottom taper (makes it look like real banana end)
    ctx.fillStyle = '#e8b40f';
    ctx.beginPath();
    ctx.ellipse(x + 16, y + 29, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Banana ridge/highlight on the curve
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 6);
    ctx.quadraticCurveTo(x + 16, y + 15, x + 17, y + 27);
    ctx.stroke();
    
    // Darker banana edge
    ctx.strokeStyle = '#e8b40f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 5);
    ctx.quadraticCurveTo(x + 12, y + 8, x + 10, y + 15);
    ctx.quadraticCurveTo(x + 9, y + 23, x + 12, y + 28);
    ctx.stroke();
    
    // Banana stem (top)
    ctx.fillStyle = '#8b7355';
    ctx.beginPath();
    ctx.moveTo(x + 21, y + 5);
    ctx.lineTo(x + 20, y + 2);
    ctx.lineTo(x + 22, y + 1);
    ctx.lineTo(x + 24, y + 4);
    ctx.closePath();
    ctx.fill();
    
    // Sunglasses (side view - only showing one lens)
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    // Main frame
    ctx.ellipse(x + 15, y + 13, 4, 3, -0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Temple arm going back
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 11, y + 13);
    ctx.lineTo(x + 8, y + 12);
    ctx.stroke();
    
    // Dark lens
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(x + 15, y + 13, 3, 2, -0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Cool reflection
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(x + 14, y + 12, 1, 0, Math.PI * 2);
    ctx.fill();
    
    // Mouth (cool smirk on side)
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + 14, y + 18, 2, 0.3, Math.PI - 0.5);
    ctx.stroke();
    
    // Cigarette/joint
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(x + 17, y + 18, 10, 2);
    
    // Cigarette filter end
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(x + 17, y + 18, 2, 2);
    
    // Cigarette tip (lit end)
    ctx.fillStyle = '#e67e22';
    ctx.fillRect(x + 27, y + 17.5, 2, 3);
    
    // Glow at tip
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(x + 28, y + 19, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Smoke
    if (thrustActive && isGameRunning) {
        ctx.fillStyle = 'rgba(189, 195, 199, 0.5)';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(x + 30 + i * 5, y + 16 - i * 3, 2 - i * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        // Gentle smoke even when not thrusting
        ctx.fillStyle = 'rgba(189, 195, 199, 0.3)';
        ctx.beginPath();
        ctx.arc(x + 30, y + 17, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Arm holding cigarette
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 13, y + 20);
    ctx.lineTo(x + 16, y + 19);
    ctx.stroke();
    
    // Bottom "sitting" part suggestion - attach at tapered bottom
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 29);
    ctx.lineTo(x + 10, y + 32);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 29);
    ctx.lineTo(x + 22, y + 32);
    ctx.stroke();
    
    // Thrust effect (exhale cloud)
    if (thrustActive && isGameRunning) {
        ctx.fillStyle = 'rgba(236, 240, 241, 0.4)';
        ctx.beginPath();
        ctx.ellipse(x + 16, y + 35, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Register the character
if (window.characters) {
    window.characters['ban-daniel'] = {
        name: 'BANDANIEL',
        draw: drawBanDaniel,
        hitbox: {
            width: 38,
            height: 38,
            offsetX: 1,
            offsetY: -2
        }
    };
}