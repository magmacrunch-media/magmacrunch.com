// New character: Backpack Man
function drawBackpackMan(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // Backpack (worn and thin, behind body)
    ctx.fillStyle = '#8b7355';
    ctx.beginPath();
    ctx.roundRect(x + 8, y + 8, 10, 14, 2);
    ctx.fill();
    
    // Backpack straps
    ctx.strokeStyle = '#6b5a45';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 11, y + 8);
    ctx.lineTo(x + 15, y + 15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 15, y + 8);
    ctx.lineTo(x + 19, y + 15);
    ctx.stroke();
    
    // Backpack pocket/flap
    ctx.fillStyle = '#6b5a45';
    ctx.fillRect(x + 10, y + 12, 6, 4);
    
    // Worn patches on backpack
    ctx.strokeStyle = '#5a4935';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + 13, y + 18, 1.5, 0, Math.PI * 2);
    ctx.stroke();
    
    // Body (old tattered coat)
    ctx.fillStyle = '#4a5f7a';
    ctx.beginPath();
    ctx.ellipse(x + 20, y + 18, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Coat details (tattered edges)
    ctx.strokeStyle = '#3a4f6a';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 12 + i * 4, y + 28);
        ctx.lineTo(x + 13 + i * 4, y + 30);
        ctx.stroke();
    }
    
    // Faded shirt underneath
    ctx.fillStyle = '#d4c5a9';
    ctx.fillRect(x + 17, y + 16, 6, 8);
    
    // Head (old weathered face)
    ctx.fillStyle = '#f4d5b5';
    ctx.beginPath();
    ctx.arc(x + 20, y + 8, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Curly hair peeking out
    ctx.fillStyle = '#8b6f47';
    ctx.beginPath();
    ctx.arc(x + 17, y + 6, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 23, y + 6, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 20, y + 5, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Pointed hat (whimsical, like a jester or elf)
    ctx.fillStyle = '#8b4789';
    ctx.beginPath();
    ctx.moveTo(x + 20, y - 2);
    ctx.lineTo(x + 15, y + 3);
    ctx.lineTo(x + 25, y + 3);
    ctx.closePath();
    ctx.fill();
    
    // Hat brim
    ctx.fillStyle = '#6b3769';
    ctx.fillRect(x + 14, y + 3, 12, 2);
    
    // Mischievous eyes (lighthearted)
    ctx.fillStyle = '#2c2c2c';
    ctx.beginPath();
    ctx.arc(x + 18, y + 8, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 22, y + 8, 1, 0, Math.PI * 2);
    ctx.fill();
    
    // Happy smile (clown-like warmth)
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + 20, y + 10, 2, 0.2, Math.PI - 0.2);
    ctx.stroke();
    
    // Rosy cheeks (lighthearted)
    ctx.fillStyle = 'rgba(255, 150, 150, 0.5)';
    ctx.beginPath();
    ctx.arc(x + 16, y + 9, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 24, y + 9, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Arms (beckoning gesture)
    ctx.strokeStyle = '#4a5f7a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 18);
    ctx.lineTo(x + 8, y + 22);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 28, y + 18);
    ctx.lineTo(x + 32, y + 22);
    ctx.stroke();
    
    // Hands
    ctx.fillStyle = '#f4d5b5';
    ctx.beginPath();
    ctx.arc(x + 8, y + 22, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 32, y + 22, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Legs (wandering)
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 17, y + 28);
    ctx.lineTo(x + 16, y + 34);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 23, y + 28);
    ctx.lineTo(x + 24, y + 34);
    ctx.stroke();
    
    // Old worn boots
    ctx.fillStyle = '#5a4a3a';
    ctx.beginPath();
    ctx.ellipse(x + 16, y + 34, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 24, y + 34, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Toys peeking out of backpack (cherished treasures)
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(x + 10, y + 6, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#4ecdc4';
    ctx.beginPath();
    ctx.arc(x + 14, y + 5, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#ffe66d';
    ctx.fillRect(x + 16, y + 6, 2, 2);
    
    // Thrust effect - magical sparkles (whimsical energy)
    if (thrustActive && isGameRunning) {
        const sparkleColors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#b388ff'];
        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = sparkleColors[i];
            ctx.beginPath();
            ctx.arc(x + 20 + (i - 2) * 4, y + 36 + i, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Extra sparkle trail
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(x + 18 + i * 4, y + 38 + i * 2, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

if (window.characters) {
    window.characters['backpack-man'] = {
        name: 'Backpack Man',
        draw: drawBackpackMan,
        hitbox: {
            width: 34,
            height: 36,
            offsetX: 6,
            offsetY: -2
        }
    };
}