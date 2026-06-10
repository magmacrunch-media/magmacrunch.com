// Prince Vince - "I could be convinced..." (SNES pixel art style)
function drawPrinceVince(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // SNES-style royal color palette
    const royalPurple = '#6a1b9a';
    const purpleLight = '#8e24aa';
    const purpleDark = '#4a148c';
    const goldCrown = '#ffd700';
    const goldShine = '#ffed4e';
    const goldDark = '#daa520';
    const capeRed = '#c62828';
    const capeDark = '#b71c1c';
    const skinTone = '#f4c7a8';
    const hairBlond = '#f4e5a8';
    const hairLight = '#fff9c4';
    const bootBrown = '#5d4037';
    const bootLight = '#6d4c41';
    const beltGold = '#ffc107';
    const gemGreen = '#00e676';
    const gemBlue = '#00b0ff';
    
    // === CAPE (behind character) ===
    ctx.fillStyle = capeRed;
    // Cape flowing back
    const capeFlow = thrustActive && isGameRunning ? Math.sin(animationTime / 200) * 3 : 0;
    ctx.fillRect(x + 7, y + 14, 3, 12 + capeFlow);
    ctx.fillRect(x + 30, y + 14, 3, 12 + capeFlow);
    
    // Cape shadow/depth
    ctx.fillStyle = capeDark;
    ctx.fillRect(x + 8, y + 15, 1, 10);
    ctx.fillRect(x + 31, y + 15, 1, 10);
    
    // === LEGS ===
    // Purple royal pants/leggings
    ctx.fillStyle = royalPurple;
    ctx.fillRect(x + 15, y + 24, 4, 8);
    ctx.fillRect(x + 21, y + 24, 4, 8);
    
    // Pants highlight
    ctx.fillStyle = purpleLight;
    ctx.fillRect(x + 15, y + 24, 1, 8);
    ctx.fillRect(x + 21, y + 24, 1, 8);
    
    // Royal boots
    ctx.fillStyle = bootBrown;
    ctx.fillRect(x + 14, y + 32, 6, 4);
    ctx.fillRect(x + 20, y + 32, 6, 4);
    
    // Boot cuffs (fold over)
    ctx.fillStyle = bootLight;
    ctx.fillRect(x + 14, y + 32, 6, 1);
    ctx.fillRect(x + 20, y + 32, 6, 1);
    
    // Gold boot buckles
    ctx.fillStyle = goldCrown;
    ctx.fillRect(x + 16, y + 33, 2, 1);
    ctx.fillRect(x + 22, y + 33, 2, 1);
    
    // === TORSO - ROYAL TUNIC ===
    // Main tunic body
    ctx.fillStyle = royalPurple;
    ctx.fillRect(x + 13, y + 14, 14, 10);
    
    // Tunic trim (gold)
    ctx.fillStyle = goldCrown;
    ctx.fillRect(x + 13, y + 14, 14, 1); // top trim
    ctx.fillRect(x + 13, y + 23, 14, 1); // bottom trim
    ctx.fillRect(x + 13, y + 14, 1, 10); // left trim
    ctx.fillRect(x + 26, y + 14, 1, 10); // right trim
    
    // Chest emblem (royal crest)
    ctx.fillStyle = goldDark;
    ctx.fillRect(x + 18, y + 17, 4, 4);
    ctx.fillStyle = gemGreen;
    ctx.fillRect(x + 19, y + 18, 2, 2);
    
    // Belt
    ctx.fillStyle = beltGold;
    ctx.fillRect(x + 13, y + 23, 14, 2);
    
    // Belt buckle
    ctx.fillStyle = goldShine;
    ctx.fillRect(x + 18, y + 23, 4, 2);
    ctx.fillStyle = goldDark;
    ctx.fillRect(x + 19, y + 23, 2, 2);
    
    // === ARMS (persuasive gesturing) ===
    const gestureMotion = thrustActive && isGameRunning ? Math.sin(animationTime / 250) * 4 : 0;
    
    // Left arm (gesturing "I could be convinced")
    ctx.fillStyle = purpleLight;
    ctx.fillRect(x + 10, y + 15 + gestureMotion, 3, 7);
    
    // Gold trim on sleeve
    ctx.fillStyle = goldCrown;
    ctx.fillRect(x + 10, y + 15 + gestureMotion, 3, 1);
    
    // Left hand (palm up, persuasive gesture)
    ctx.fillStyle = skinTone;
    ctx.fillRect(x + 8, y + 22 + gestureMotion, 4, 3);
    
    // Right arm
    ctx.fillStyle = purpleLight;
    ctx.fillRect(x + 27, y + 16, 3, 6);
    
    // Gold trim on right sleeve
    ctx.fillStyle = goldCrown;
    ctx.fillRect(x + 27, y + 16, 3, 1);
    
    // Right hand (also gesturing)
    ctx.fillStyle = skinTone;
    ctx.fillRect(x + 28, y + 22 - gestureMotion * 0.5, 4, 3);
    
    // === HEAD ===
    // Head base
    ctx.fillStyle = skinTone;
    ctx.fillRect(x + 17, y + 5, 6, 9);
    
    // Hair (princely, swept)
    ctx.fillStyle = hairBlond;
    ctx.fillRect(x + 17, y + 3, 6, 3); // top
    ctx.fillRect(x + 16, y + 5, 1, 5); // left side
    ctx.fillRect(x + 23, y + 5, 1, 5); // right side
    
    // Hair highlights (lustrous)
    ctx.fillStyle = hairLight;
    ctx.fillRect(x + 18, y + 4, 3, 1);
    ctx.fillRect(x + 19, y + 5, 2, 1);
    
    // === CROWN (the real prince identifier!) ===
    ctx.fillStyle = goldCrown;
    ctx.fillRect(x + 17, y + 2, 6, 2);
    
    // Crown points
    ctx.fillRect(x + 17, y + 0, 1, 2);
    ctx.fillRect(x + 19, y + 1, 1, 1);
    ctx.fillRect(x + 20, y + 0, 1, 2);
    ctx.fillRect(x + 22, y + 1, 1, 1);
    
    // Crown jewels
    ctx.fillStyle = gemBlue;
    ctx.fillRect(x + 17, y + 0, 1, 1);
    ctx.fillRect(x + 20, y + 0, 1, 1);
    ctx.fillStyle = gemGreen;
    ctx.fillRect(x + 19, y + 2, 2, 1);
    
    // Crown shine
    ctx.fillStyle = goldShine;
    ctx.fillRect(x + 18, y + 2, 1, 1);
    ctx.fillRect(x + 21, y + 2, 1, 1);
    
    // === FACE (smirking, knowing expression) ===
    // Eyes (confident, smooth)
    ctx.fillStyle = '#3d2817';
    ctx.fillRect(x + 18, y + 8, 2, 2);
    ctx.fillRect(x + 21, y + 8, 2, 2);
    
    // Eye highlights (charismatic sparkle)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 19, y + 8, 1, 1);
    ctx.fillRect(x + 22, y + 8, 1, 1);
    
    // Eyebrows (raised, persuasive)
    ctx.fillStyle = hairBlond;
    ctx.fillRect(x + 18, y + 7, 2, 1);
    ctx.fillRect(x + 21, y + 7, 2, 1);
    
    // Nose (noble)
    ctx.fillStyle = '#d4a089';
    ctx.fillRect(x + 19, y + 9, 2, 2);
    
    // Smirk (that "I could be convinced" smile)
    ctx.fillStyle = '#3d2817';
    ctx.fillRect(x + 18, y + 12, 1, 1);
    ctx.fillRect(x + 19, y + 12, 2, 1);
    ctx.fillRect(x + 21, y + 12, 2, 1);
    // One side of mouth slightly higher (smirk)
    ctx.fillRect(x + 22, y + 11, 1, 1);
    
    // === ROYAL SCEPTER (optional, in hand when thrusting) ===
    if (thrustActive && isGameRunning) {
        // Scepter in left hand
        ctx.fillStyle = goldDark;
        ctx.fillRect(x + 9, y + 18 + gestureMotion, 1, 8);
        
        // Scepter orb top
        ctx.fillStyle = goldCrown;
        ctx.fillRect(x + 8, y + 17 + gestureMotion, 3, 2);
        
        // Orb gem
        ctx.fillStyle = gemGreen;
        ctx.fillRect(x + 9, y + 17 + gestureMotion, 1, 1);
        
        // Sparkle from scepter
        ctx.fillStyle = goldShine;
        ctx.fillRect(x + 9, y + 16 + gestureMotion, 1, 1);
    }
    
    // === "I COULD BE CONVINCED" EFFECT ===
    // Persuasion sparkles
    const persuasionPulse = Math.sin(animationTime / 300);
    
    for (let i = 0; i < 4; i++) {
        const sparkX = x + 10 + i * 6 + Math.sin(animationTime / 200 + i) * 3;
        const sparkY = y + 6 + Math.cos(animationTime / 180 + i) * 2;
        const sparkAlpha = Math.abs(Math.sin(animationTime / 250 + i)) * 0.4;
        
        ctx.fillStyle = `rgba(255, 215, 0, ${sparkAlpha})`;
        ctx.fillRect(sparkX, sparkY, 1, 1);
        ctx.fillRect(sparkX - 1, sparkY, 1, 1);
        ctx.fillRect(sparkX + 1, sparkY, 1, 1);
    }
    
    // === THRUST EFFECT (royal decree energy) ===
    if (thrustActive && isGameRunning) {
        // Purple royal energy
        ctx.fillStyle = 'rgba(138, 43, 226, 0.4)';
        ctx.fillRect(x + 16, y + 36, 8, 4);
        ctx.fillRect(x + 17, y + 40, 6, 3);
        
        // Gold energy core
        ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.fillRect(x + 18, y + 37, 4, 2);
        
        // Persuasion waves trailing behind
        ctx.strokeStyle = 'rgba(106, 27, 154, 0.4)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const waveX = x - 6 - i * 5;
            const waveY = y + 18 + Math.sin(animationTime / 130 + i) * 3;
            ctx.beginPath();
            ctx.moveTo(waveX, waveY);
            ctx.lineTo(waveX - 4, waveY);
            ctx.lineTo(waveX - 5, waveY + 1);
            ctx.stroke();
        }
        
        // Crown glow (royal authority)
        ctx.fillStyle = 'rgba(255, 237, 78, 0.5)';
        ctx.fillRect(x + 16, y + 1, 8, 3);
        
        // Charm sparkles (intense)
        for (let i = 0; i < 6; i++) {
            const charmX = x + 12 + Math.sin(animationTime / 150 + i) * 8;
            const charmY = y + 10 + Math.cos(animationTime / 140 + i) * 6;
            const charmAlpha = Math.abs(Math.sin(animationTime / 200 + i)) * 0.6;
            
            ctx.fillStyle = `rgba(255, 215, 0, ${charmAlpha})`;
            // Star sparkle
            ctx.fillRect(charmX, charmY, 1, 1);
            ctx.fillRect(charmX - 1, charmY, 1, 1);
            ctx.fillRect(charmX + 1, charmY, 1, 1);
            ctx.fillRect(charmX, charmY - 1, 1, 1);
            ctx.fillRect(charmX, charmY + 1, 1, 1);
        }
        
        // "Convincing" text effect
        if (Math.sin(animationTime / 400) > 0.7) {
            ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
            ctx.font = '6px monospace';
            ctx.fillText('$$$', x - 10, y + 12);
        }
        
        // Money bags (he could be convinced... with the right offer)
        const bagFloat = Math.sin(animationTime / 250) * 2;
        ctx.fillStyle = 'rgba(34, 139, 34, 0.5)';
        ctx.fillRect(x + 32, y + 8 + bagFloat, 3, 4);
        ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.fillRect(x + 32, y + 8 + bagFloat, 3, 1); // $ symbol suggestion
    }
    
    // === IDLE ANIMATION (confident stance) ===
    if (!thrustActive && isGameRunning) {
        // Subtle crown shine
        if (Math.sin(animationTime / 600) > 0.7) {
            ctx.fillStyle = 'rgba(255, 237, 78, 0.5)';
            ctx.fillRect(x + 20, y + 1, 1, 1);
        }
        
        // Occasional persuasive sparkle
        if (Math.sin(animationTime / 800) > 0.8) {
            ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
            ctx.fillRect(x + 11, y + 23, 1, 1);
        }
    }
}

// Register the character
if (window.characters) {
    window.characters['prince-vince'] = {
        name: 'Prince Vince',
        draw: drawPrinceVince,
        hitbox: {
            width: 27,
            height: 38,
            offsetX: 7,
            offsetY: -3
        }
    };
}
