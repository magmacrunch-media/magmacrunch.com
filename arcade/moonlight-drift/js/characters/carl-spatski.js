// Fixed Carl Spatski - removed Date.now() and Math.random() from inside function
function drawCarlSpatski(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // Use animationTime parameter instead of Date.now()
    const boardTilt = Math.sin(animationTime / 200) * 0.1;
    
    // Longboard (skateboard) - slightly tilted for dynamic energy
    ctx.save();
    ctx.translate(x + 20, y + 38);
    ctx.rotate(boardTilt);
    ctx.fillStyle = '#ff6b35';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Board design - chaotic stickers/designs
    ctx.fillStyle = '#ffeb3b';
    ctx.fillRect(-8, -1, 4, 2);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(-2, -1.5, 3, 3);
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(5, -1, 5, 2);
    ctx.restore();
    
    // Wheels
    ctx.fillStyle = '#2c2c2c';
    ctx.beginPath();
    ctx.arc(x + 8, y + 40, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 32, y + 40, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Legs (one bent weird, spazzy stance)
    ctx.strokeStyle = '#ff4500'; // Orange pants
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    // Left leg (bent weird)
    ctx.beginPath();
    ctx.moveTo(x + 17, y + 28);
    ctx.lineTo(x + 14, y + 32);
    ctx.lineTo(x + 15, y + 35);
    ctx.stroke();
    // Right leg (more normal but still awkward)
    ctx.beginPath();
    ctx.moveTo(x + 23, y + 28);
    ctx.lineTo(x + 26, y + 35);
    ctx.stroke();
    
    // Mismatched shoes (because Carl is chaotic)
    // Left shoe - red
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.ellipse(x + 15, y + 36, 3, 2, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Right shoe - green
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.ellipse(x + 26, y + 36, 3, 2, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Body/torso (Hawaiian shirt vibes - "Grilled Cheese In Paradise")
    ctx.fillStyle = '#4169e1'; // Blue base
    ctx.beginPath();
    ctx.rect(x + 14, y + 15, 12, 13);
    ctx.fill();
    // Shirt pattern - chaotic flowers/shapes
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(x + 17, y + 18, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff69b4';
    ctx.beginPath();
    ctx.arc(x + 23, y + 22, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(x + 19, y + 25, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Arms (flailing wildly)
    ctx.strokeStyle = '#f0d5a8'; // Skin tone
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    // Left arm (up and out - spazzy)
    ctx.beginPath();
    ctx.moveTo(x + 14, y + 17);
    ctx.lineTo(x + 10, y + 12);
    ctx.lineTo(x + 7, y + 15);
    ctx.stroke();
    // Right arm (pointing or gesturing wildly)
    ctx.beginPath();
    ctx.moveTo(x + 26, y + 17);
    ctx.lineTo(x + 33, y + 14);
    ctx.stroke();
    
    // Hands (exaggerated)
    ctx.fillStyle = '#f0d5a8';
    ctx.beginPath();
    ctx.arc(x + 7, y + 15, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 33, y + 14, 2.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Head (slightly oval, goofy proportions)
    ctx.fillStyle = '#f0d5a8';
    ctx.beginPath();
    ctx.ellipse(x + 20, y + 10, 6, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Wild, spiky hair (mad scientist vibes)
    ctx.fillStyle = '#8b4513';
    ctx.beginPath();
    ctx.arc(x + 20, y + 6, 7, Math.PI, Math.PI * 2);
    ctx.fill();
    // Spiky tufts going everywhere
    ctx.beginPath();
    ctx.moveTo(x + 14, y + 5);
    ctx.lineTo(x + 12, y + 1);
    ctx.lineTo(x + 15, y + 4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 3);
    ctx.lineTo(x + 18, y - 1);
    ctx.lineTo(x + 20, y + 3);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 22, y + 3);
    ctx.lineTo(x + 23, y - 1);
    ctx.lineTo(x + 24, y + 4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 26, y + 5);
    ctx.lineTo(x + 28, y + 1);
    ctx.lineTo(x + 25, y + 5);
    ctx.fill();
    
    // Headphones (big, chunky, retro)
    ctx.strokeStyle = '#ff00ff'; // Hot pink/magenta
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x + 20, y + 10, 9, -0.9, 0.9);
    ctx.stroke();
    // Left ear cup
    ctx.fillStyle = '#ff00ff';
    ctx.beginPath();
    ctx.arc(x + 13, y + 10, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Right ear cup
    ctx.beginPath();
    ctx.arc(x + 27, y + 10, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Headphone details (speaker grilles)
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 12, y + 9 + i);
        ctx.lineTo(x + 14, y + 9 + i);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 26, y + 9 + i);
        ctx.lineTo(x + 28, y + 9 + i);
        ctx.stroke();
    }
    
    // Face - WILD expression
    // Big googly eyes (uneven for extra zaniness)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + 17, y + 10, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 23, y + 11, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Pupils (looking different directions)
    ctx.fillStyle = '#2c2c2c';
    ctx.beginPath();
    ctx.arc(x + 16, y + 9, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 24, y + 11, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Big goofy grin
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + 20, y + 14, 4, 0.2, Math.PI - 0.2);
    ctx.stroke();
    
    // Buck teeth (for extra goofiness)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 19, y + 16, 1.5, 2);
    ctx.fillRect(x + 21, y + 16, 1.5, 2);
    
    // Nose (slightly big and round)
    ctx.fillStyle = '#f0a5a8';
    ctx.beginPath();
    ctx.arc(x + 20, y + 13, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Vocoder mic (appears when thrusting or based on animation cycle)
    // Use deterministic animation instead of random
    const showMic = thrustActive || (Math.sin(animationTime / 1000) > 0);
    if (showMic) {
        ctx.strokeStyle = '#808080';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 33, y + 14);
        ctx.lineTo(x + 36, y + 12);
        ctx.stroke();
        ctx.fillStyle = '#2c2c2c';
        ctx.beginPath();
        ctx.arc(x + 36, y + 12, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + 36, y + 12, 1, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Thrust effect - CHAOTIC energy bursts
    if (thrustActive && isGameRunning) {
        // Random colored energy lines (but deterministic based on animationTime)
        const colors = ['#ff00ff', '#00ffff', '#ffff00', '#ff0000', '#00ff00'];
        for (let i = 0; i < 5; i++) {
            ctx.strokeStyle = colors[i % colors.length];
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            const wobble = Math.sin(animationTime / 100 + i) * 3;
            ctx.moveTo(x - 5 - i * 3, y + 30 + wobble);
            ctx.lineTo(x - 12 - i * 3, y + 32 + wobble);
            ctx.stroke();
        }
        
        // Motion blur letters spelling "SPATSKI"
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.font = 'bold 8px Arial';
        ctx.fillText('!!', x - 10, y + 25);
    }
}

// Register the character
if (window.characters) {
    window.characters['carl-spatski'] = {
        name: 'Carl Spatski',
        draw: drawCarlSpatski,
        hitbox: {
            width: 42,
            height: 42,
            offsetX: -1,
            offsetY: -2
        }
    };
}