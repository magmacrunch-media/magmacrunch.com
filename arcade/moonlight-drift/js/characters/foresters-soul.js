// Forester's Soul - Abstract, vibrating ethereal soul lost in the cold
function drawForestersSoul(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // Vibration/shimmer effect
    const shimmer = Math.sin(animationTime / 100) * 0.5;
    const pulseAlpha = 0.6 + Math.sin(animationTime / 300) * 0.2;
    
    // === ETHEREAL SOUL FIGURE (translucent, shimmering) ===
    ctx.save();
    ctx.globalAlpha = pulseAlpha;
    
    // Ghostly glow aura
    const gradient = ctx.createRadialGradient(x + 20, y + 20, 5, x + 20, y + 20, 20);
    gradient.addColorStop(0, 'rgba(200, 230, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(200, 230, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x + 20, y + 20, 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Main soul form (humanoid but abstract)
    ctx.strokeStyle = `rgba(200, 230, 255, ${0.7 + shimmer * 0.2})`;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    // Head (glowing orb)
    ctx.fillStyle = `rgba(220, 240, 255, ${0.5 + shimmer * 0.3})`;
    ctx.beginPath();
    ctx.arc(x + 20 + shimmer, y + 8, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner light in head
    ctx.fillStyle = `rgba(255, 255, 255, ${0.6 + Math.sin(animationTime / 200) * 0.3})`;
    ctx.beginPath();
    ctx.arc(x + 20 + shimmer, y + 8, 2.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes (sad, hollow)
    ctx.fillStyle = `rgba(100, 150, 200, ${0.4 + shimmer * 0.2})`;
    ctx.beginPath();
    ctx.arc(x + 18 + shimmer, y + 8, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 22 + shimmer, y + 8, 1, 0, Math.PI * 2);
    ctx.fill();
    
    // Body (flowing, ghostly)
    ctx.strokeStyle = `rgba(200, 230, 255, ${0.6 + shimmer * 0.2})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 20 + shimmer, y + 13);
    ctx.lineTo(x + 20, y + 28);
    ctx.stroke();
    
    // Shoulders/chest (ethereal)
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 13, y + 16);
    ctx.lineTo(x + 20 + shimmer, y + 15);
    ctx.lineTo(x + 27, y + 16);
    ctx.stroke();
    
    // Arms (reaching, searching)
    const armSway = Math.sin(animationTime / 400) * 2;
    ctx.lineWidth = 2;
    
    // Left arm
    ctx.beginPath();
    ctx.moveTo(x + 13, y + 16);
    ctx.lineTo(x + 10, y + 22 + armSway);
    ctx.lineTo(x + 8, y + 26);
    ctx.stroke();
    
    // Right arm
    ctx.beginPath();
    ctx.moveTo(x + 27, y + 16);
    ctx.lineTo(x + 30, y + 22 - armSway);
    ctx.lineTo(x + 32, y + 26);
    ctx.stroke();
    
    // Hands (reaching out)
    ctx.fillStyle = `rgba(200, 230, 255, ${0.4 + shimmer * 0.2})`;
    ctx.beginPath();
    ctx.arc(x + 8, y + 26, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 32, y + 26, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Legs (fading into nothing, lost)
    ctx.strokeStyle = `rgba(200, 230, 255, ${0.5 + shimmer * 0.2})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 28);
    ctx.lineTo(x + 17, y + 35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 22, y + 28);
    ctx.lineTo(x + 23, y + 35);
    ctx.stroke();
    
    // Feet (barely there, fading)
    ctx.globalAlpha = pulseAlpha * 0.3;
    ctx.fillStyle = 'rgba(200, 230, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x + 17, y + 36, 2, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 23, y + 36, 2, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    // === FOOTSTEPS IN SNOW (treasure my steps, buried by snow) ===
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let i = 0; i < 4; i++) {
        const stepX = x - 8 - i * 6;
        const stepY = y + 36 + (i % 2) * 2;
        const fade = 1 - (i / 4);
        
        ctx.globalAlpha = fade * 0.3;
        ctx.beginPath();
        ctx.ellipse(stepX, stepY, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    
    // === MEMORY WISPS (memories and dreams) ===
    for (let i = 0; i < 4; i++) {
        const angle = (animationTime / 1200 + i * Math.PI / 2) % (Math.PI * 2);
        const distance = 15 + Math.sin(animationTime / 600 + i) * 3;
        const wispX = x + 20 + Math.cos(angle) * distance;
        const wispY = y + 15 + Math.sin(angle) * distance * 0.8;
        const wispAlpha = 0.15 + Math.abs(Math.sin(animationTime / 500 + i)) * 0.2;
        
        ctx.fillStyle = `rgba(255, 255, 200, ${wispAlpha})`;
        ctx.beginPath();
        ctx.arc(wispX, wispY, 1.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Wisp trail
        ctx.strokeStyle = `rgba(255, 255, 200, ${wispAlpha * 0.3})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(wispX, wispY);
        ctx.lineTo(
            wispX - Math.cos(angle) * 3,
            wispY - Math.sin(angle) * 3
        );
        ctx.stroke();
    }
    
    // === STARS (wish upon the stars) ===
    const starPositions = [
        {x: x + 10, y: y - 5},
        {x: x + 30, y: y - 3},
        {x: x + 5, y: y + 5},
        {x: x + 35, y: y + 8}
    ];
    
    starPositions.forEach((star, i) => {
        const twinkle = Math.abs(Math.sin(animationTime / 400 + i * 0.7));
        ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.5})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, 0.8, 0, Math.PI * 2);
        ctx.fill();
        
        // Star points
        ctx.strokeStyle = `rgba(255, 255, 255, ${twinkle * 0.3})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(star.x - 1.5, star.y);
        ctx.lineTo(star.x + 1.5, star.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(star.x, star.y - 1.5);
        ctx.lineTo(star.x, star.y + 1.5);
        ctx.stroke();
    });
    
    // === SNOWFLAKES (lost in the cold) ===
    for (let i = 0; i < 6; i++) {
        const snowX = x - 5 + (animationTime / 50 + i * 30) % 50;
        const snowY = y + (animationTime / 80 + i * 40) % 45;
        const snowAlpha = 0.2 + Math.sin(animationTime / 300 + i) * 0.1;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${snowAlpha})`;
        ctx.beginPath();
        ctx.arc(snowX, snowY, 1, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // === THRUST EFFECT - Intensified loneliness ===
    if (thrustActive && isGameRunning) {
        const pulse = Math.sin(animationTime / 250);
        
        // Cold wind waves
        ctx.strokeStyle = `rgba(180, 220, 255, ${0.15 + pulse * 0.05})`;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.arc(x + 20, y + 20, 18 + i * 8 + pulse * 2, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // More intense snow
        for (let i = 0; i < 8; i++) {
            const windX = x - 15 - i * 5;
            const windY = y + 15 + Math.sin(animationTime / 100 + i) * 5;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(windX, windY, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Loneliness echo
        ctx.strokeStyle = 'rgba(200, 230, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(x - 10 - i * 7, y + 18);
            ctx.lineTo(x - 15 - i * 7, y + 18);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x - 10 - i * 7, y + 24);
            ctx.lineTo(x - 15 - i * 7, y + 24);
            ctx.stroke();
        }
        
        // Fading memories text
        ctx.fillStyle = 'rgba(200, 230, 255, 0.2)';
        ctx.font = 'italic 6px Arial';
        ctx.fillText('alone', x - 22, y + 20);
        
        // Way back when - temporal distortion
        ctx.strokeStyle = 'rgba(255, 255, 200, 0.15)';
        ctx.lineWidth = 0.8;
        const distortY = y + 10 + Math.sin(animationTime / 150) * 2;
        ctx.beginPath();
        ctx.moveTo(x - 12, distortY);
        ctx.quadraticCurveTo(x - 15, distortY - 3, x - 18, distortY);
        ctx.stroke();
    }
}

// Register the character
if (window.characters) {
    window.characters['foresters-soul'] = {
        name: "Forester's Soul",
        draw: drawForestersSoul,
        hitbox: {
            width: 40,
            height: 40,
            offsetX: 0,
            offsetY: -2
        }
    };
}