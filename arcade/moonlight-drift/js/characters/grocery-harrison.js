// Grocery Harrison - Weird folk musician with grocery bag
function drawGroceryHarrison(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // Acoustic guitar (held across body)
    ctx.fillStyle = '#d2691e';
    ctx.beginPath();
    ctx.ellipse(x + 15, y + 20, 6, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Guitar sound hole
    ctx.fillStyle = '#2c2c2c';
    ctx.beginPath();
    ctx.arc(x + 15, y + 20, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Guitar neck (going up and left)
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(x + 10, y + 5, 3, 13);
    
    // Guitar headstock
    ctx.fillStyle = '#8b4513';
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 5);
    ctx.lineTo(x + 8, y + 2);
    ctx.lineTo(x + 11, y + 2);
    ctx.lineTo(x + 13, y + 5);
    ctx.closePath();
    ctx.fill();
    
    // Tuning pegs
    ctx.fillStyle = '#ffd700';
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x + 9, y + 2.5 + i * 1, 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Guitar strings
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 11 + i * 0.5, y + 5);
        ctx.lineTo(x + 15 + i * 0.3, y + 25);
        ctx.stroke();
    }
    
    // Body (wearing flannel shirt)
    ctx.fillStyle = '#8b0000';
    ctx.beginPath();
    ctx.rect(x + 16, y + 15, 14, 14);
    ctx.fill();
    
    // Flannel pattern (checkered)
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 16, y + 17 + i * 4);
        ctx.lineTo(x + 30, y + 17 + i * 4);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x + 18 + i * 4, y + 15);
        ctx.lineTo(x + 18 + i * 4, y + 29);
        ctx.stroke();
    }
    
    // Grocery bag (brown paper bag on back/side)
    ctx.fillStyle = '#8b7355';
    ctx.beginPath();
    ctx.rect(x + 28, y + 12, 8, 12);
    ctx.fill();
    
    // Bag top (crumpled)
    ctx.fillStyle = '#6b5a45';
    ctx.beginPath();
    ctx.moveTo(x + 28, y + 12);
    ctx.lineTo(x + 30, y + 10);
    ctx.lineTo(x + 32, y + 12);
    ctx.lineTo(x + 34, y + 10);
    ctx.lineTo(x + 36, y + 12);
    ctx.closePath();
    ctx.fill();
    
    // Groceries peeking out
    // Baguette
    ctx.fillStyle = '#daa520';
    ctx.fillRect(x + 33, y + 6, 2, 8);
    ctx.strokeStyle = '#8b7355';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + 33.5, y + 7);
    ctx.lineTo(x + 34.5, y + 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 33.5, y + 9);
    ctx.lineTo(x + 34.5, y + 9);
    ctx.stroke();
    
    // Green onions/leeks sticking out
    ctx.strokeStyle = '#228b22';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 30, y + 8);
    ctx.lineTo(x + 29, y + 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 31, y + 9);
    ctx.lineTo(x + 30, y + 5);
    ctx.stroke();
    
    // Head (bearded folk musician)
    ctx.fillStyle = '#f4d5b5';
    ctx.beginPath();
    ctx.arc(x + 23, y + 8, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Shaggy hair
    ctx.fillStyle = '#4a3020';
    ctx.beginPath();
    ctx.arc(x + 23, y + 6, 6.5, Math.PI, Math.PI * 2);
    ctx.fill();
    // Hair tufts (messy)
    ctx.beginPath();
    ctx.arc(x + 18, y + 5, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 28, y + 5, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 23, y + 3, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Bushy beard
    ctx.fillStyle = '#4a3020';
    ctx.beginPath();
    ctx.ellipse(x + 23, y + 11, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Beard texture
    ctx.strokeStyle = '#3a2010';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 20 + i * 1.5, y + 10);
        ctx.lineTo(x + 20 + i * 1.5, y + 13);
        ctx.stroke();
    }
    
    // Eyes (tired folk musician eyes)
    ctx.fillStyle = '#2c2c2c';
    ctx.beginPath();
    ctx.ellipse(x + 21, y + 8, 1, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 25, y + 8, 1, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyebrows (expressive)
    ctx.strokeStyle = '#4a3020';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 19, y + 6);
    ctx.lineTo(x + 22, y + 6.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 24, y + 6.5);
    ctx.lineTo(x + 27, y + 6);
    ctx.stroke();
    
    // Nose
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 23, y + 9);
    ctx.lineTo(x + 23, y + 10);
    ctx.stroke();
    
    // Mouth (singing/open)
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + 23, y + 10.5, 2, 0.3, Math.PI - 0.3);
    ctx.stroke();
    
    // Arms
    ctx.strokeStyle = '#8b0000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    // Left arm (holding guitar neck)
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 17);
    ctx.lineTo(x + 12, y + 10);
    ctx.stroke();
    // Right arm (strumming)
    const strumAngle = thrustActive && isGameRunning ? Math.sin(animationTime / 50) * 0.3 : 0;
    ctx.beginPath();
    ctx.moveTo(x + 30, y + 17);
    ctx.lineTo(x + 27 + strumAngle * 3, y + 23 + strumAngle * 2);
    ctx.stroke();
    
    // Hands
    ctx.fillStyle = '#f4d5b5';
    ctx.beginPath();
    ctx.arc(x + 12, y + 10, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 27 + strumAngle * 3, y + 23 + strumAngle * 2, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Legs (jeans)
    ctx.strokeStyle = '#4169e1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 29);
    ctx.lineTo(x + 19, y + 35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 26, y + 29);
    ctx.lineTo(x + 27, y + 35);
    ctx.stroke();
    
    // Shoes (worn sneakers)
    ctx.fillStyle = '#696969';
    ctx.beginPath();
    ctx.ellipse(x + 19, y + 36, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 27, y + 36, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Thrust effect - musical notes and grocery items flying out
    if (thrustActive && isGameRunning) {
        // Musical notes
        ctx.fillStyle = '#ffeb3b';
        ctx.font = 'bold 8px Arial';
        ctx.fillText('♪', x - 5, y + 20);
        ctx.fillText('♫', x - 10, y + 25);
        ctx.fillText('♪', x - 8, y + 30);
        
        // Flying groceries
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(x - 12, y + 22, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#4ecdc4';
        ctx.fillRect(x - 15, y + 28, 3, 3);
        
        // Sound wave ripples
        ctx.strokeStyle = 'rgba(255, 235, 59, 0.4)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 2; i++) {
            ctx.beginPath();
            ctx.arc(x + 15, y + 20, 10 + i * 6, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

// Register the character
if (window.characters) {
    window.characters['grocery-harrison'] = {
        name: 'Grocery Harrison',
        draw: drawGroceryHarrison,
        hitbox: {
            width: 35,
            height: 30,
            offsetX: 8,
            offsetY: 5
        }
    };
}