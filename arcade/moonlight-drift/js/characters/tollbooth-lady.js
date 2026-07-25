// Tollbooth Lady - "She was very nice, she was very nice to me" (SNES pixel art style)
function drawTollboothLady(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // SNES-style color palette - BRIGHT VISIBILITY
    const neonYellow = '#e8ff00';
    const neonLime = '#ccff00';
    const reflectiveGray = '#c0c0c0';
    const reflectiveWhite = '#f0f0f0';
    const vestShadow = '#b8cc00';
    const skinTone = '#f4c7a8';
    const hairBrown = '#6d4c2f';
    const hairLight = '#8b6647';
    const pantsNavy = '#2c3e50';
    const pantsLight = '#34495e';
    const coinGold = '#ffd700';
    const coinShine = '#ffed4e';
    const ticketWhite = '#ffffff';
    const ticketPink = '#ff9bb8';
    
    // === LEGS ===
    // Left leg
    ctx.fillStyle = pantsNavy;
    ctx.fillRect(x + 15, y + 24, 4, 10);
    ctx.fillStyle = pantsLight;
    ctx.fillRect(x + 15, y + 24, 1, 10); // highlight
    
    // Right leg
    ctx.fillStyle = pantsNavy;
    ctx.fillRect(x + 21, y + 24, 4, 10);
    ctx.fillStyle = pantsLight;
    ctx.fillRect(x + 21, y + 24, 1, 10); // highlight
    
    // Shoes
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + 14, y + 34, 6, 2);
    ctx.fillRect(x + 20, y + 34, 6, 2);
    
    // === TORSO - ICONIC NEON SAFETY VEST ===
    // Main vest body (BRIGHT NEON YELLOW)
    ctx.fillStyle = neonYellow;
    ctx.fillRect(x + 13, y + 14, 14, 10);
    
    // Vest opening/collar (V-neck)
    ctx.fillStyle = pantsNavy;
    ctx.fillRect(x + 18, y + 14, 4, 3); // shirt showing through
    
    // REFLECTIVE STRIPES (horizontal - the key visual!)
    ctx.fillStyle = reflectiveGray;
    ctx.fillRect(x + 13, y + 17, 14, 2);
    ctx.fillRect(x + 13, y + 21, 14, 2);
    
    // Reflective stripe highlights (make them pop)
    ctx.fillStyle = reflectiveWhite;
    ctx.fillRect(x + 13, y + 17, 14, 1);
    ctx.fillRect(x + 13, y + 21, 14, 1);
    
    // Vest shadow/edge
    ctx.fillStyle = vestShadow;
    ctx.fillRect(x + 13, y + 23, 14, 1);
    
    // === HEAD ===
    // Head base
    ctx.fillStyle = skinTone;
    ctx.fillRect(x + 17, y + 6, 6, 8);
    
    // Hair (ponytail or bun)
    ctx.fillStyle = hairBrown;
    ctx.fillRect(x + 17, y + 4, 6, 3); // top
    ctx.fillRect(x + 16, y + 6, 1, 6); // left side
    ctx.fillRect(x + 23, y + 6, 1, 6); // right side
    
    // Ponytail/bun back
    ctx.fillRect(x + 23, y + 8, 2, 3);
    ctx.fillStyle = hairLight;
    ctx.fillRect(x + 23, y + 8, 1, 2); // highlight
    
    // Eyes (warm and friendly)
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(x + 18, y + 9, 1, 2);
    ctx.fillRect(x + 21, y + 9, 1, 2);
    
    // Eye sparkle (she's nice!)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 18, y + 9, 1, 1);
    ctx.fillRect(x + 21, y + 9, 1, 1);
    
    // Friendly smile
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(x + 18, y + 12, 1, 1);
    ctx.fillRect(x + 19, y + 12, 2, 1);
    ctx.fillRect(x + 21, y + 12, 1, 1);
    
    // Rosy cheeks
    ctx.fillStyle = 'rgba(255, 155, 184, 0.5)';
    ctx.fillRect(x + 17, y + 10, 2, 2);
    ctx.fillRect(x + 21, y + 10, 2, 2);
    
    // === ARMS WITH SAFETY VEST SLEEVES ===
    const waveMotion = thrustActive && isGameRunning ? Math.sin(animationTime / 250) * 4 : 0;
    
    // Left arm (waving!)
    ctx.fillStyle = neonYellow;
    ctx.fillRect(x + 10, y + 15 + waveMotion, 3, 6);
    
    // Reflective stripe on sleeve
    ctx.fillStyle = reflectiveGray;
    ctx.fillRect(x + 10, y + 17 + waveMotion, 3, 1);
    ctx.fillStyle = reflectiveWhite;
    ctx.fillRect(x + 10, y + 17 + waveMotion, 3, 1);
    
    // Left hand (waving)
    ctx.fillStyle = skinTone;
    ctx.fillRect(x + 9, y + 21 + waveMotion, 3, 3);
    
    // Right arm
    ctx.fillStyle = neonYellow;
    ctx.fillRect(x + 27, y + 16, 3, 6);
    
    // Reflective stripe on right sleeve
    ctx.fillStyle = reflectiveGray;
    ctx.fillRect(x + 27, y + 18, 3, 1);
    ctx.fillStyle = reflectiveWhite;
    ctx.fillRect(x + 27, y + 18, 3, 1);
    
    // Right hand (holding ticket)
    ctx.fillStyle = skinTone;
    ctx.fillRect(x + 29, y + 22, 3, 3);
    
    // === TICKET IN HAND ===
    ctx.fillStyle = ticketWhite;
    ctx.fillRect(x + 31, y + 20, 4, 6);
    ctx.fillStyle = ticketPink;
    ctx.fillRect(x + 32, y + 21, 2, 4);
    
    // Ticket perforations
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(x + 31, y + 23, 4, 1);
    
    // === FLOATING COINS ===
    const coinFloat1 = Math.sin(animationTime / 400) * 3;
    const coinFloat2 = Math.sin(animationTime / 400 + 2) * 3;
    const coinFloat3 = Math.sin(animationTime / 400 + 4) * 3;
    
    // Coin 1 (quarter)
    ctx.fillStyle = coinGold;
    ctx.fillRect(x + 32, y + 8 + coinFloat1, 3, 3);
    ctx.fillStyle = coinShine;
    ctx.fillRect(x + 33, y + 8 + coinFloat1, 1, 1);
    
    // Coin 2
    ctx.fillStyle = coinGold;
    ctx.fillRect(x + 6, y + 10 + coinFloat2, 3, 3);
    ctx.fillStyle = coinShine;
    ctx.fillRect(x + 7, y + 10 + coinFloat2, 1, 1);
    
    // Coin 3
    ctx.fillStyle = coinGold;
    ctx.fillRect(x + 34, y + 14 + coinFloat3, 2, 2);
    ctx.fillStyle = coinShine;
    ctx.fillRect(x + 34, y + 14 + coinFloat3, 1, 1);
    
    // === SAFETY VEST GLOW (it's reflective!) ===
    if (Math.sin(animationTime / 300) > 0.6) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x + 14, y + 17, 2, 1);
        ctx.fillRect(x + 24, y + 21, 2, 1);
    }
    
    // === THRUST EFFECT ===
    if (thrustActive && isGameRunning) {
        // Ticket confetti trail
        for (let i = 0; i < 5; i++) {
            const confettiX = x + 14 + i * 3;
            const confettiY = y + 28 + Math.sin(animationTime / 180 + i) * 3;
            const confettiAlpha = 0.7 - i * 0.12;
            
            if (i % 2 === 0) {
                ctx.fillStyle = `rgba(255, 155, 184, ${confettiAlpha})`;
                ctx.fillRect(confettiX, confettiY, 2, 3);
            } else {
                ctx.fillStyle = `rgba(255, 215, 0, ${confettiAlpha})`;
                ctx.fillRect(confettiX, confettiY, 3, 2);
            }
        }
        
        // More coins flying (change being given)
        const extraCoin1 = Math.sin(animationTime / 300 + 1) * 4;
        const extraCoin2 = Math.sin(animationTime / 300 + 3) * 4;
        
        ctx.fillStyle = coinGold;
        ctx.fillRect(x + 8, y + 20 + extraCoin1, 2, 2);
        ctx.fillRect(x + 30, y + 24 + extraCoin2, 2, 2);
        
        ctx.fillStyle = coinShine;
        ctx.fillRect(x + 8, y + 20 + extraCoin1, 1, 1);
        ctx.fillRect(x + 30, y + 24 + extraCoin2, 1, 1);
        
        // Sparkles (she's very nice!)
        for (let i = 0; i < 6; i++) {
            const sparkX = x + 10 + i * 5 + Math.sin(animationTime / 140 + i) * 2;
            const sparkY = y + 8 + Math.cos(animationTime / 160 + i) * 3;
            const sparkAlpha = Math.abs(Math.sin(animationTime / 220 + i)) * 0.6;
            
            ctx.fillStyle = `rgba(255, 237, 78, ${sparkAlpha})`;
            // Plus sign sparkle
            ctx.fillRect(sparkX, sparkY, 1, 1);
            ctx.fillRect(sparkX - 1, sparkY, 1, 1);
            ctx.fillRect(sparkX + 1, sparkY, 1, 1);
            ctx.fillRect(sparkX, sparkY - 1, 1, 1);
            ctx.fillRect(sparkX, sparkY + 1, 1, 1);
        }
        
        // Hearts (she was very nice!)
        const heartPulse = Math.sin(animationTime / 180);
        if (heartPulse > 0.3) {
            ctx.fillStyle = 'rgba(255, 155, 184, 0.7)';
            // Pixel heart
            ctx.fillRect(x + 5, y + 5, 2, 1);
            ctx.fillRect(x + 4, y + 6, 1, 1);
            ctx.fillRect(x + 5, y + 6, 2, 2);
            ctx.fillRect(x + 7, y + 6, 1, 1);
            ctx.fillRect(x + 5, y + 8, 2, 1);
            ctx.fillRect(x + 6, y + 9, 1, 1);
        }
        
        // "Have a nice day!" energy waves
        ctx.strokeStyle = `rgba(232, 255, 0, 0.4)`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const waveX = x - 6 - i * 5;
            const waveY = y + 16 + Math.sin(animationTime / 130 + i) * 2;
            ctx.beginPath();
            ctx.moveTo(waveX, waveY);
            ctx.lineTo(waveX - 4, waveY);
            ctx.stroke();
        }
        
        // Reflective vest glow (super bright when active)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(x + 13, y + 17, 14, 1);
        ctx.fillRect(x + 13, y + 21, 14, 1);
    }
    
    // === IDLE ANIMATION ===
    if (!thrustActive && isGameRunning) {
        // Gentle sparkle
        if (Math.sin(animationTime / 700) > 0.8) {
            ctx.fillStyle = 'rgba(255, 237, 78, 0.4)';
            ctx.fillRect(x + 9, y + 22 + Math.sin(animationTime / 300), 1, 1);
        }
    }
}

// Register the character
if (window.characters) {
    window.characters['tollbooth-lady'] = {
        name: 'Tollbooth Lady',
        draw: drawTollboothLady,
        hitbox: {
            width: 40,
            height: 35,
            offsetX: 0,
            offsetY: 0
        }
    };
}
