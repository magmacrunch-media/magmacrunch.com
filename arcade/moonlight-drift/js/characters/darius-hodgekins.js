// Darius Hodgekins - Solo post-rock guitarist with "true class"
function drawDariusHodgekins(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // === DRAW CHARACTER FIRST (BEHIND GUITAR) ===
    
    // Head (focused expression)
    ctx.fillStyle = '#f4d5b5';
    ctx.beginPath();
    ctx.arc(x + 20, y + 8, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Neat, professional hair (shorter, more put-together)
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.arc(x + 20, y + 6, 6, Math.PI, Math.PI * 2);
    ctx.fill();
    // Side part
    ctx.strokeStyle = '#2c1810';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 5);
    ctx.lineTo(x + 18, y + 8);
    ctx.stroke();
    
    // Glasses (classy, intellectual)
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 1.2;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    // Left lens
    ctx.beginPath();
    ctx.arc(x + 18, y + 8, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Right lens
    ctx.beginPath();
    ctx.arc(x + 22, y + 8, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Bridge
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 8);
    ctx.lineTo(x + 20, y + 8);
    ctx.stroke();
    // Temples
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 8);
    ctx.lineTo(x + 14, y + 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 24, y + 8);
    ctx.lineTo(x + 26, y + 8);
    ctx.stroke();
    
    // Eyes behind glasses (focused)
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(x + 18, y + 8, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 22, y + 8, 1, 0, Math.PI * 2);
    ctx.fill();
    
    // Slight concentrated smile
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(x + 20, y + 11, 2, 0.1, Math.PI - 0.1);
    ctx.stroke();
    
    // Nose
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 9);
    ctx.lineTo(x + 20, y + 10);
    ctx.stroke();
    
    // Body (wearing classy button-up shirt)
    ctx.fillStyle = '#34495e'; // Dark blue button-up
    ctx.beginPath();
    ctx.rect(x + 13, y + 14, 14, 14);
    ctx.fill();
    
    // Shirt buttons
    ctx.fillStyle = '#ecf0f1';
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x + 20, y + 17 + i * 3, 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Shirt collar
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.moveTo(x + 17, y + 14);
    ctx.lineTo(x + 15, y + 16);
    ctx.lineTo(x + 17, y + 17);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 23, y + 14);
    ctx.lineTo(x + 25, y + 16);
    ctx.lineTo(x + 23, y + 17);
    ctx.closePath();
    ctx.fill();
    
    // Dark jeans
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(x + 16, y + 28, 8, 6);
    
    // Belt
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + 16, y + 28, 8, 1);
    // Belt buckle
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(x + 19, y + 28, 2, 1);
    
    // Legs
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 34);
    ctx.lineTo(x + 17, y + 37);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 22, y + 34);
    ctx.lineTo(x + 23, y + 37);
    ctx.stroke();
    
    // Nice shoes (loafers/dress shoes)
    ctx.fillStyle = '#654321';
    ctx.beginPath();
    ctx.ellipse(x + 17, y + 38, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 23, y + 38, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Shoe shine/highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x + 17.5, y + 37.5, 1, 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 23.5, y + 37.5, 1, 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // === NOW DRAW GUITAR IN FRONT ===
    
    // Guitar body (centered, in front of chest)
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.ellipse(x + 20, y + 22, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Black outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Pickguard
    ctx.fillStyle = '#ecf0f1';
    ctx.beginPath();
    ctx.ellipse(x + 19, y + 22, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Pickups
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(x + 16, y + 20, 4, 1.5);
    ctx.fillRect(x + 18, y + 22, 4, 1.5);
    ctx.fillRect(x + 20, y + 24, 4, 1.5);
    
    // Knobs
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(x + 22, y + 26, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 25, y + 26, 1, 0, Math.PI * 2);
    ctx.fill();
    
    // Guitar neck (extending to the right, horizontally)
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(x + 27, y + 20, 18, 3.5);
    
    // Neck outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 27, y + 20, 18, 3.5);
    
    // Fret markers
    ctx.fillStyle = '#ecf0f1';
    ctx.beginPath();
    ctx.arc(x + 30, y + 21.75, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 34, y + 21.75, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 38, y + 21.75, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 42, y + 21.75, 0.8, 0, Math.PI * 2);
    ctx.fill();
    
    // Strings (horizontal)
    ctx.strokeStyle = '#d4d4d4';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 27, y + 20.5 + i * 0.5);
        ctx.lineTo(x + 45, y + 20.5 + i * 0.5);
        ctx.stroke();
    }
    
    // Headstock (at right end)
    ctx.fillStyle = '#8b4513';
    ctx.beginPath();
    ctx.moveTo(x + 45, y + 20);
    ctx.lineTo(x + 47, y + 19);
    ctx.lineTo(x + 47, y + 24.5);
    ctx.lineTo(x + 45, y + 23.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Tuning pegs
    ctx.fillStyle = '#c0c0c0';
    for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(x + 47, y + 19.5 + i * 0.8, 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // === ARMS ON TOP OF GUITAR ===
    ctx.strokeStyle = '#f4d5b5';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    
    // Right arm (HIS right, our left - strumming over body)
    const strumMotion = thrustActive && isGameRunning ? Math.sin(animationTime / 70) * 2 : 0;
    ctx.beginPath();
    ctx.moveTo(x + 13, y + 16);
    ctx.lineTo(x + 16, y + 20);
    ctx.lineTo(x + 18, y + 24 + strumMotion);
    ctx.stroke();
    
    // Left arm (HIS left, our right - reaching to neck for fretting)
    ctx.beginPath();
    ctx.moveTo(x + 27, y + 16);
    ctx.lineTo(x + 28, y + 18);
    ctx.lineTo(x + 34, y + 20);
    ctx.stroke();
    
    // Hands
    ctx.fillStyle = '#f4d5b5';
    // Right hand strumming (our left)
    ctx.beginPath();
    ctx.arc(x + 18, y + 24 + strumMotion, 2, 0, Math.PI * 2);
    ctx.fill();
    // Left hand on neck (our right)
    ctx.beginPath();
    ctx.arc(x + 34, y + 20, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Pick in strumming hand (right hand, our left)
    ctx.fillStyle = '#e74c3c';
    ctx.save();
    ctx.translate(x + 18, y + 24 + strumMotion);
    ctx.rotate(0.8);
    ctx.beginPath();
    ctx.moveTo(0, -1.5);
    ctx.lineTo(-1, 1);
    ctx.lineTo(1, 1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    
    // Thrust effect - sophisticated ambient post-rock waves
    if (thrustActive && isGameRunning) {
        const pulse = Math.sin(animationTime / 180);
        
        ctx.strokeStyle = `rgba(192, 57, 43, ${0.2 + pulse * 0.08})`;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.arc(x + 20, y + 22, 10 + i * 6 + pulse * 2, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Elegant note trails
        ctx.fillStyle = 'rgba(236, 240, 241, 0.4)';
        for (let i = 0; i < 4; i++) {
            const drift = Math.sin(animationTime / 120 + i * 0.7) * 3;
            ctx.beginPath();
            ctx.arc(x - 8 - i * 6, y + 20 + drift, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Delay lines
        ctx.strokeStyle = 'rgba(192, 57, 43, 0.25)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(x - 6 - i * 5, y + 17);
            ctx.lineTo(x - 11 - i * 5, y + 17);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x - 6 - i * 5, y + 23);
            ctx.lineTo(x - 11 - i * 5, y + 23);
            ctx.stroke();
        }
        
        // "True class" indicator
        ctx.fillStyle = 'rgba(52, 73, 94, 0.4)';
        ctx.font = 'italic 7px Arial';
        ctx.fillText('class', x - 18, y + 20);
    }
}

// Register the character
if (window.characters) {
    window.characters['darius-hodgekins'] = {
        name: 'Darius Hodgekins',
        draw: drawDariusHodgekins,
        hitbox: {
            width: 40,
            height: 35,
            offsetX: 0,
            offsetY: 0
        }
    };
}