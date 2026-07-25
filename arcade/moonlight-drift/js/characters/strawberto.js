// Strawberto - Sophisticated strawberry gentleman with mustache and straw hat
function drawStrawberto(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // Color palette
    const colors = {
        strawberryRed: '#c62828',
        strawberryLight: '#e53935',
        strawberryDark: '#b71c1c',
        seedYellow: '#fdd835',
        leafGreen: '#558b2f',
        leafDark: '#33691e',
        leafLight: '#7cb342',
        mustacheBrown: '#4e342e',
        eyeWhite: '#ffffff',
        eyeBrown: '#3e2723',
        monocleGold: '#ffd700',
        monocleGlass: 'rgba(255, 255, 255, 0.3)'
    };
    
    // Strawberry body (side view - facing right)
    ctx.fillStyle = colors.strawberryRed;
    ctx.beginPath();
    ctx.moveTo(x + 14, y + 8);
    ctx.quadraticCurveTo(x + 22, y + 6, x + 28, y + 10);
    ctx.quadraticCurveTo(x + 30, y + 18, x + 28, y + 26);
    ctx.quadraticCurveTo(x + 24, y + 31, x + 20, y + 32);
    ctx.quadraticCurveTo(x + 16, y + 30, x + 13, y + 24);
    ctx.quadraticCurveTo(x + 12, y + 16, x + 14, y + 8);
    ctx.fill();
    
    // Highlight on body
    ctx.fillStyle = colors.strawberryLight;
    ctx.beginPath();
    ctx.ellipse(x + 22, y + 18, 3, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Seeds (scattered yellow dots)
    ctx.fillStyle = colors.seedYellow;
    const seedPositions = [
        [20, 12], [24, 14], [18, 18], [23, 21], [17, 24], [25, 24]
    ];
    seedPositions.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(x + sx, y + sy, 1, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Leaf cap (strawberry top)
    ctx.fillStyle = colors.leafGreen;
    ctx.beginPath();
    ctx.moveTo(x + 15, y + 8);
    ctx.lineTo(x + 17, y + 4);
    ctx.lineTo(x + 20, y + 6);
    ctx.lineTo(x + 23, y + 4);
    ctx.lineTo(x + 26, y + 7);
    ctx.lineTo(x + 24, y + 9);
    ctx.lineTo(x + 20, y + 8);
    ctx.closePath();
    ctx.fill();
    
    // Straw hat (side view - brim visible)
    // Crown
    ctx.fillStyle = colors.leafGreen;
    ctx.fillRect(x + 16, y - 2, 10, 6);
    
    // Brim (ellipse for perspective)
    ctx.fillStyle = colors.leafDark;
    ctx.beginPath();
    ctx.ellipse(x + 21, y + 4, 11, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Hat texture (weave lines on crown)
    ctx.strokeStyle = colors.leafDark;
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 16, y + i * 2);
        ctx.lineTo(x + 26, y + i * 2);
        ctx.stroke();
    }
    
    // Bushy eyebrow (one visible in side view)
    ctx.fillStyle = colors.mustacheBrown;
    ctx.beginPath();
    ctx.ellipse(x + 22, y + 13, 3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye
    ctx.fillStyle = colors.eyeWhite;
    ctx.beginPath();
    ctx.arc(x + 22, y + 16, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupil
    ctx.fillStyle = colors.eyeBrown;
    ctx.beginPath();
    ctx.arc(x + 22, y + 16, 1, 0, Math.PI * 2);
    ctx.fill();
    
    // Monocle (sophisticated!)
    ctx.strokeStyle = colors.monocleGold;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + 22, y + 16, 3.5, 0, Math.PI * 2);
    ctx.stroke();
    
    // Monocle chain
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 25.5, y + 16);
    ctx.lineTo(x + 27, y + 18);
    ctx.lineTo(x + 26, y + 20);
    ctx.stroke();
    
    // Glass reflection on monocle
    ctx.fillStyle = colors.monocleGlass;
    ctx.beginPath();
    ctx.arc(x + 23, y + 15, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Mustache (side view - walrus-style, flows forward)
    ctx.fillStyle = colors.mustacheBrown;
    ctx.beginPath();
    ctx.ellipse(x + 24, y + 19, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Mustache tip curl
    ctx.beginPath();
    ctx.arc(x + 28, y + 18, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Legs (side view)
    ctx.strokeStyle = colors.strawberryDark;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    // Back leg
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 32);
    ctx.lineTo(x + 17, y + 38);
    ctx.stroke();
    
    // Front leg
    ctx.beginPath();
    ctx.moveTo(x + 23, y + 32);
    ctx.lineTo(x + 22, y + 38);
    ctx.stroke();
    
    // Thrust effect - Gentlemanly puffs of steam/smoke (old-timey sophistication)
    if (thrustActive && isGameRunning) {
        // Pipe smoke effect (even though no pipe visible - just sophisticated vibes)
        const puff1Y = (animationTime % 150) / 6;
        const puff2Y = ((animationTime + 50) % 150) / 6;
        const puff3Y = ((animationTime + 100) % 150) / 6;
        
        ctx.fillStyle = `rgba(200, 200, 200, ${0.4 - puff1Y / 50})`;
        ctx.beginPath();
        ctx.arc(x + 20, y + 35 + puff1Y, 2 + puff1Y / 10, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = `rgba(200, 200, 200, ${0.4 - puff2Y / 50})`;
        ctx.beginPath();
        ctx.arc(x + 24, y + 35 + puff2Y, 2 + puff2Y / 10, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = `rgba(200, 200, 200, ${0.4 - puff3Y / 50})`;
        ctx.beginPath();
        ctx.arc(x + 22, y + 36 + puff3Y, 2 + puff3Y / 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Sparkles of sophistication
        ctx.fillStyle = colors.monocleGold;
        const twinkle = Math.sin(animationTime / 100);
        ctx.beginPath();
        ctx.arc(x + 22, y + 16, 0.5 + twinkle * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Gentlemanly aura
        const pulse = Math.sin(animationTime / 90) * 0.2 + 0.8;
        ctx.strokeStyle = `rgba(255, 215, 0, ${0.2 * pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + 20, y + 20, 14 + pulse * 2, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// Register the character
if (window.characters) {
    window.characters['strawberto'] = {
        name: 'Strawberto',
        draw: drawStrawberto,
        hitbox: {
            width: 36,
            height: 38,
            offsetX: 2,
            offsetY: 0
        }
    };
}
