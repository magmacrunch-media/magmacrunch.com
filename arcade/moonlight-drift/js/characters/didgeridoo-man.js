// Didgeridoo Man - Mysterious didgeridoo player
function drawDidgeridooMan(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // The Didgeridoo (long wooden instrument)
    ctx.fillStyle = '#8b4513';
    ctx.save();
    ctx.translate(x + 23, y + 13);  // Position mouthpiece at mouth
    ctx.rotate(0.6);  // Angle it downward
    
    // Didgeridoo body (tapered tube)
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(30, -2);
    ctx.lineTo(30, 2);
    ctx.lineTo(0, 3);
    ctx.closePath();
    ctx.fill();
    
    // Didgeridoo patterns (Aboriginal-inspired dots and lines)
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(5 + i * 4, -1, 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(5 + i * 4, 1, 0.8, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Didgeridoo bands (decorative)
    ctx.fillStyle = '#ff6b35';
    ctx.fillRect(8, -3, 2, 6);
    ctx.fillRect(16, -3, 2, 6);
    
    // Mouthpiece end (darker)
    ctx.fillStyle = '#654321';
    ctx.fillRect(-1, -2.5, 2, 5);
    
    // Bell end (flared)
    ctx.fillStyle = '#654321';
    ctx.beginPath();
    ctx.moveTo(30, -2);
    ctx.lineTo(33, -3);
    ctx.lineTo(33, 3);
    ctx.lineTo(30, 2);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
    
    // Body (wearing simple shirt/tunic)
    ctx.fillStyle = '#5b9aa0';
    ctx.fillRect(x + 14, y + 14, 12, 14);
    
    // Shirt collar
    ctx.fillStyle = '#4a7a7f';
    ctx.beginPath();
    ctx.moveTo(x + 17, y + 14);
    ctx.lineTo(x + 20, y + 16);
    ctx.lineTo(x + 23, y + 14);
    ctx.stroke();
    
    // Simple buttons
    ctx.fillStyle = '#333';
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x + 20, y + 17 + i * 3, 0.8, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Head (mysterious, calm expression)
    ctx.fillStyle = '#c19a6b';
    ctx.beginPath();
    ctx.arc(x + 20, y + 10, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Simple cap/beanie (neutral, non-stereotypical)
    ctx.fillStyle = '#8b4513';
    ctx.beginPath();
    ctx.arc(x + 20, y + 7, 6.5, Math.PI, 0);
    ctx.fill();
    
    // Cap brim
    ctx.fillStyle = '#654321';
    ctx.fillRect(x + 14, y + 7, 12, 1.5);
    
    // Long hair (flowing down)
    ctx.fillStyle = '#2c2c2c';
    ctx.beginPath();
    ctx.moveTo(x + 14, y + 9);
    ctx.lineTo(x + 12, y + 16);
    ctx.lineTo(x + 14, y + 16);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 26, y + 9);
    ctx.lineTo(x + 28, y + 16);
    ctx.lineTo(x + 26, y + 16);
    ctx.closePath();
    ctx.fill();
    
    // Eyes (closed in concentration while playing)
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + 18, y + 10, 1.5, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 22, y + 10, 1.5, 0, Math.PI);
    ctx.stroke();
    
    // Nose
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 11);
    ctx.lineTo(x + 20, y + 12);
    ctx.lineTo(x + 21, y + 12);
    ctx.stroke();
    
    // Mouth (blowing into didgeridoo - pursed lips)
    ctx.fillStyle = '#8b4513';
    ctx.beginPath();
    ctx.ellipse(x + 20, y + 13, 2, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Facial hair (small goatee)
    ctx.fillStyle = '#2c2c2c';
    ctx.beginPath();
    ctx.ellipse(x + 20, y + 14.5, 1.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Arms
    ctx.strokeStyle = '#c19a6b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    // Left arm (supporting middle of didgeridoo)
    ctx.beginPath();
    ctx.moveTo(x + 14, y + 18);
    ctx.lineTo(x + 16, y + 24);
    ctx.lineTo(x + 22, y + 26);
    ctx.stroke();
    
    // Right arm (holding didgeridoo near mouthpiece at mouth)
    ctx.beginPath();
    ctx.moveTo(x + 26, y + 18);
    ctx.lineTo(x + 24, y + 15);
    ctx.lineTo(x + 23, y + 13);
    ctx.stroke();
    
    // Hands
    ctx.fillStyle = '#c19a6b';
    ctx.beginPath();
    ctx.arc(x + 22, y + 26, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 23, y + 13, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Legs (standing position)
    ctx.fillStyle = '#2c5f77';
    ctx.fillRect(x + 15, y + 28, 4, 8);
    ctx.fillRect(x + 21, y + 28, 4, 8);
    
    // Shoes
    ctx.fillStyle = '#654321';
    ctx.beginPath();
    ctx.ellipse(x + 17, y + 36, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 23, y + 36, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Thrust effect - deep droning sound waves and mystical particles
    if (thrustActive && isGameRunning) {
        // Sound waves from didgeridoo bell (now pointing down and to the right)
        const pulse = Math.sin(animationTime / 100);
        
        ctx.strokeStyle = `rgba(139, 69, 19, ${0.3 + pulse * 0.2})`;
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(x + 48, y + 30, 8 + i * 6 + pulse * 2, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Mystical particles/notes flowing downward
        ctx.fillStyle = '#ff6b35';
        for (let i = 0; i < 4; i++) {
            const wobble = Math.sin(animationTime / 80 + i) * 3;
            ctx.beginPath();
            ctx.arc(x + 48 + wobble, y + 32 + i * 4, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Deep bass note indicator
        ctx.fillStyle = 'rgba(139, 69, 19, 0.4)';
        ctx.font = 'bold 10px Arial';
        ctx.fillText('~', x + 44, y + 35);
        ctx.fillText('~', x + 48, y + 38);
        ctx.fillText('~', x + 52, y + 35);
        
        // Vibration lines
        ctx.strokeStyle = 'rgba(255, 107, 53, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(x + 40 + i * 2, y + 25);
            ctx.lineTo(x + 40 + i * 2, y + 45);
            ctx.stroke();
        }
    }
}

// Register the character
if (window.characters) {
    window.characters['didgeridoo-man'] = {
        name: 'Didgeridoo Man',
        draw: drawDidgeridooMan,
        hitbox: {
            width: 45,
            height: 35,
            offsetX: 0,
            offsetY: 0
        }        
    };
}