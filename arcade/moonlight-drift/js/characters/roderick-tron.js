// Roderick Tron - Classical Electronic Robot (SNES pixel art style)
function drawRoderickTron(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // SNES-style limited color palette
    const darkBlue = '#1a2332';
    const medBlue = '#2c4a73';
    const brightBlue = '#3d6db5';
    const accentBlue = '#5a9ff7';
    const darkGray = '#1f1f1f';
    const medGray = '#3f3f3f';
    const lightGray = '#6f6f6f';
    const redGlow = '#ff2244';
    const redCore = '#cc1133';
    const energyPink = '#ff6699';
    
    // === LEGS (chunky robot boots) ===
    // Left leg
    ctx.fillStyle = darkBlue;
    ctx.fillRect(x + 13, y + 24, 6, 10);
    ctx.fillStyle = brightBlue;
    ctx.fillRect(x + 14, y + 24, 4, 1); // knee highlight
    ctx.fillStyle = medBlue;
    ctx.fillRect(x + 13, y + 30, 6, 4); // shin
    
    // Right leg
    ctx.fillStyle = darkBlue;
    ctx.fillRect(x + 21, y + 24, 6, 10);
    ctx.fillStyle = brightBlue;
    ctx.fillRect(x + 22, y + 24, 4, 1); // knee highlight
    ctx.fillStyle = medBlue;
    ctx.fillRect(x + 21, y + 30, 6, 4); // shin
    
    // Boots/feet (blocky)
    ctx.fillStyle = darkGray;
    ctx.fillRect(x + 12, y + 34, 7, 3);
    ctx.fillRect(x + 20, y + 34, 7, 3);
    ctx.fillStyle = accentBlue;
    ctx.fillRect(x + 13, y + 34, 1, 2); // boot accent
    ctx.fillRect(x + 21, y + 34, 1, 2);
    
    // === TORSO (main body) ===
    // Main chassis
    ctx.fillStyle = darkBlue;
    ctx.fillRect(x + 12, y + 12, 16, 12);
    
    // Chest panel (darker inset)
    ctx.fillStyle = darkGray;
    ctx.fillRect(x + 15, y + 14, 10, 8);
    
    // Chest core (pulsing energy)
    const corePulse = Math.sin(animationTime / 200) * 0.3 + 0.7;
    ctx.fillStyle = redCore;
    ctx.fillRect(x + 18, y + 17, 4, 4);
    
    // Core glow
    ctx.fillStyle = `rgba(255, 34, 68, ${corePulse * 0.6})`;
    ctx.fillRect(x + 17, y + 16, 6, 6);
    ctx.fillStyle = `rgba(255, 34, 68, ${corePulse * 0.3})`;
    ctx.fillRect(x + 16, y + 15, 8, 8);
    
    // Shoulder plates
    ctx.fillStyle = medBlue;
    ctx.fillRect(x + 10, y + 12, 4, 5);
    ctx.fillRect(x + 26, y + 12, 4, 5);
    ctx.fillStyle = brightBlue;
    ctx.fillRect(x + 10, y + 12, 4, 1); // top highlight
    ctx.fillRect(x + 26, y + 12, 4, 1);
    
    // === ARMS (robotic with joint segments) ===
    const armSwing = thrustActive && isGameRunning ? Math.sin(animationTime / 150) * 3 : 0;
    
    // Left arm
    ctx.fillStyle = medBlue;
    ctx.fillRect(x + 8, y + 14, 4, 8);
    ctx.fillStyle = darkBlue;
    ctx.fillRect(x + 8, y + 18, 4, 1); // elbow joint
    ctx.fillStyle = brightBlue;
    ctx.fillRect(x + 8, y + 14, 1, 8); // edge highlight
    
    // Left hand/claw
    ctx.fillStyle = lightGray;
    ctx.fillRect(x + 7, y + 22 + armSwing, 3, 3);
    ctx.fillStyle = darkGray;
    ctx.fillRect(x + 7, y + 22 + armSwing, 1, 3); // finger separation
    ctx.fillRect(x + 9, y + 22 + armSwing, 1, 3);
    
    // Right arm
    ctx.fillStyle = medBlue;
    ctx.fillRect(x + 28, y + 14, 4, 8);
    ctx.fillStyle = darkBlue;
    ctx.fillRect(x + 28, y + 18, 4, 1); // elbow joint
    ctx.fillStyle = brightBlue;
    ctx.fillRect(x + 31, y + 14, 1, 8); // edge highlight
    
    // Right hand/claw
    ctx.fillStyle = lightGray;
    ctx.fillRect(x + 30, y + 22 - armSwing, 3, 3);
    ctx.fillStyle = darkGray;
    ctx.fillRect(x + 30, y + 22 - armSwing, 1, 3); // finger separation
    ctx.fillRect(x + 32, y + 22 - armSwing, 1, 3);
    
    // === HEAD ===
    // Main head block
    ctx.fillStyle = darkBlue;
    ctx.fillRect(x + 14, y + 4, 12, 8);
    
    // Head top piece (antenna mount)
    ctx.fillStyle = medBlue;
    ctx.fillRect(x + 17, y + 2, 6, 2);
    ctx.fillStyle = brightBlue;
    ctx.fillRect(x + 17, y + 2, 6, 1); // top shine
    
    // Antenna
    ctx.fillStyle = lightGray;
    ctx.fillRect(x + 19, y + 0, 2, 2);
    
    // Antenna orb (pulsing red eye)
    const eyePulse = Math.sin(animationTime / 250) * 0.4 + 0.6;
    ctx.fillStyle = redGlow;
    ctx.fillRect(x + 19, y + 0, 2, 1);
    ctx.fillStyle = `rgba(255, 34, 68, ${eyePulse})`;
    ctx.fillRect(x + 18, y - 1, 4, 3);
    
    // Face plate
    ctx.fillStyle = darkGray;
    ctx.fillRect(x + 16, y + 6, 8, 5);
    
    // Visor/eye slit (glowing)
    ctx.fillStyle = redCore;
    ctx.fillRect(x + 17, y + 8, 6, 1);
    ctx.fillStyle = `rgba(255, 34, 68, ${eyePulse * 0.7})`;
    ctx.fillRect(x + 17, y + 7, 6, 3);
    
    // Head side vents
    ctx.fillStyle = medGray;
    ctx.fillRect(x + 14, y + 6, 1, 4);
    ctx.fillRect(x + 25, y + 6, 1, 4);
    
    // === CLASSICAL MUSIC SYMBOLS (floating) ===
    // Musical notation appears when idle or thrusting
    if (isGameRunning) {
        const noteFloat = Math.sin(animationTime / 400) * 2;
        const noteAlpha = 0.3 + Math.sin(animationTime / 300) * 0.2;
        
        ctx.fillStyle = `rgba(93, 159, 247, ${noteAlpha})`;
        
        // Treble clef suggestion (simplified pixel version)
        ctx.fillRect(x + 32, y + 8 + noteFloat, 1, 4);
        ctx.fillRect(x + 33, y + 7 + noteFloat, 2, 1);
        ctx.fillRect(x + 33, y + 10 + noteFloat, 2, 1);
        
        // Note stem
        ctx.fillRect(x + 35, y + 14 + noteFloat * 1.5, 1, 4);
        ctx.fillRect(x + 36, y + 14 + noteFloat * 1.5, 2, 1);
    }
    
    // === THRUST EFFECT (energy exhaust) ===
    if (thrustActive && isGameRunning) {
        const thrustPulse = Math.sin(animationTime / 100);
        const thrustIntensity = 0.6 + thrustPulse * 0.4;
        
        // Main exhaust plume (pixelated flame)
        ctx.fillStyle = accentBlue;
        ctx.fillRect(x + 17, y + 37, 6, 3);
        ctx.fillRect(x + 18, y + 40, 4, 2);
        
        ctx.fillStyle = energyPink;
        ctx.fillRect(x + 18, y + 37, 4, 2);
        ctx.fillRect(x + 19, y + 39, 2, 2);
        
        // Inner white core
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 19, y + 38, 2, 1);
        
        // Energy particles (pixel particles)
        for (let i = 0; i < 6; i++) {
            const particleX = x + 15 + Math.random() * 10;
            const particleY = y + 38 + i * 2 + Math.random() * 2;
            const particleAlpha = (1 - i / 6) * thrustIntensity;
            
            if (i % 2 === 0) {
                ctx.fillStyle = `rgba(93, 159, 247, ${particleAlpha})`;
            } else {
                ctx.fillStyle = `rgba(255, 102, 153, ${particleAlpha})`;
            }
            ctx.fillRect(particleX, particleY, 1, 1);
        }
        
        // Side exhaust vents
        ctx.fillStyle = `rgba(93, 159, 247, ${thrustIntensity * 0.5})`;
        ctx.fillRect(x + 11, y + 28, 2, 1);
        ctx.fillRect(x + 27, y + 28, 2, 1);
        
        // Electronic music waves (when thrusting)
        ctx.strokeStyle = `rgba(93, 159, 247, ${thrustIntensity * 0.4})`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const waveY = y + 15 + Math.sin(animationTime / 120 + i) * 2;
            ctx.beginPath();
            ctx.moveTo(x - 5 - i * 4, waveY);
            ctx.lineTo(x - 8 - i * 4, waveY + 1);
            ctx.lineTo(x - 11 - i * 4, waveY);
            ctx.stroke();
        }
        
        // Sound wave text effect
        if (Math.sin(animationTime / 180) > 0.5) {
            ctx.fillStyle = `rgba(93, 159, 247, 0.3)`;
            ctx.font = '6px monospace';
            ctx.fillText('♪', x - 12, y + 12);
        }
    }
    
    // === IDLE STANCE EFFECTS ===
    if (!thrustActive && isGameRunning) {
        // Gentle power hum visualization
        const humAlpha = Math.sin(animationTime / 400) * 0.15 + 0.15;
        ctx.strokeStyle = `rgba(93, 159, 247, ${humAlpha})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 11, y + 11, 18, 14);
        
        // Classical notation idle animation
        if (Math.sin(animationTime / 600) > 0.7) {
            ctx.fillStyle = 'rgba(93, 159, 247, 0.25)';
            ctx.font = '7px serif';
            ctx.fillText('♫', x + 30, y + 10);
        }
    }
    
    // === BOOT THRUSTERS (small accent) ===
    if (thrustActive && isGameRunning) {
        ctx.fillStyle = `rgba(93, 159, 247, 0.4)`;
        ctx.fillRect(x + 13, y + 37, 2, 1);
        ctx.fillRect(x + 22, y + 37, 2, 1);
    }
}

// Register the character
if (window.characters) {
    window.characters['roderick-tron'] = {
        name: 'Roderick Tron',
        draw: drawRoderickTron,
        hitbox: {
            width: 40,
            height: 35,
            offsetX: 0,
            offsetY: 0
        }
    };
}
