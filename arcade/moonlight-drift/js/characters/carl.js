// Carl - The Psychedelic Pineapple
// Adapted for Moonlight Drift - Side view with psychedelic color cycling
function drawCarl(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // === ANIMATION CALCULATIONS ===
    
    // 1. Bobbing Motion (smooth continuous bob)
    const bobOffset = Math.sin(animationTime / 200) * 2.0;
    
    // 2. Psychedelic Color Cycling (continuous hue rotation)
    const baseHue = (animationTime * 0.5) % 360; 
    const oppHue = (baseHue + 180) % 360; // Opposite color for contrast
    
    const colors = {
        // Body: Bright neon cycle
        bodyMain: `hsl(${baseHue}, 90%, 60%)`,
        bodyDark: `hsl(${baseHue}, 100%, 35%)`, // For shading
        
        // Scales: Contrast color
        scaleLines: `hsla(${oppHue}, 80%, 40%, 0.5)`, // Slightly transparent
        scaleDots: `hsl(${oppHue}, 100%, 80%)`,
        
        // Leaves: Cool neon cycle
        leaf1: `hsl(${(baseHue + 90) % 360}, 80%, 50%)`,
        leaf2: `hsl(${(baseHue + 120) % 360}, 80%, 50%)`,
        
        // Aura
        glowOuter: `hsla(${baseHue}, 100%, 60%, 0.2)`,
        glowInner: `hsla(${(baseHue + 40) % 360}, 100%, 70%, 0.4)`,
        
        // Face
        eyes: '#ffffff',
        smile: '#ffffff'
    };

    ctx.save();
    
    // === 1. GLOW AURA (Behind Body) ===
    const pulseSize = Math.sin(animationTime / 100) * 3;
    const glowRadius = 14 + pulseSize;
    
    const glowGradient = ctx.createRadialGradient(
        x + 20, y + 20 + bobOffset, 0,
        x + 20, y + 20 + bobOffset, glowRadius
    );
    glowGradient.addColorStop(0, colors.glowInner);
    glowGradient.addColorStop(0.6, colors.glowOuter);
    glowGradient.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x + 20, y + 20 + bobOffset, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // === 2. BODY & PATTERN (Side View - slightly compressed) ===
    // Define the teardrop pineapple shape
    ctx.beginPath();
    // Side view: narrower width for perspective
    ctx.ellipse(x + 20, y + 20 + bobOffset, 7, 13, 0, 0, Math.PI * 2);
    
    // A. Draw Base Color
    ctx.fillStyle = colors.bodyMain;
    ctx.fill();
    
    // B. Save context to apply Clipping for the pattern
    ctx.save(); 
    ctx.clip(); // Pattern stays inside the body shape
    
    // Draw the Diamond Pattern (clipped to body)
    ctx.strokeStyle = colors.scaleLines;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // Draw grid of lines larger than the body, but clipped
    for (let i = -10; i <= 10; i++) {
        // Diagonal /
        ctx.moveTo(x + 5 + i * 4, y + 5 + bobOffset);
        ctx.lineTo(x + 25 + i * 4, y + 40 + bobOffset);
        
        // Diagonal \
        ctx.moveTo(x + 35 - i * 4, y + 5 + bobOffset);
        ctx.lineTo(x + 15 - i * 4, y + 40 + bobOffset);
    }
    ctx.stroke();
    
    // 3D Shading (Glassy look)
    const shineGrad = ctx.createRadialGradient(
        x + 17, y + 15 + bobOffset, 1,
        x + 20, y + 20 + bobOffset, 12
    );
    shineGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
    shineGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shineGrad;
    ctx.fill();
    
    ctx.restore(); // Remove clipping

    // === 3. SCALE DOTS (The "Eyes" of the pineapple texture) ===
    ctx.fillStyle = colors.scaleDots;
    const dotPositions = [
        [0, -6], [-3, -2], [3, -2], [0, 2], [-3, 6], [3, 6], [0, 10]
    ];
    
    ctx.beginPath();
    dotPositions.forEach(([dx, dy]) => {
        // Compress width for side view
        const xOff = dx * 0.4;
        ctx.moveTo(x + 20 + xOff, y + 20 + dy + bobOffset);
        ctx.arc(x + 20 + xOff, y + 20 + dy + bobOffset, 1.5, 0, Math.PI * 2);
    });
    ctx.fill();

    // === 4. THE CROWN (Leaves) - Side View ===
    const leafCount = 6;
    for (let i = 0; i < leafCount; i++) {
        ctx.fillStyle = i % 2 === 0 ? colors.leaf1 : colors.leaf2;
        
        // Adjust angles for side view - leaves fan out more to the right
        const angle = (i / leafCount) * Math.PI * 2 - Math.PI / 2;
        const leafLen = 9 + (i % 2) * 2;
        
        ctx.save();
        ctx.translate(x + 20, y + 7 + bobOffset);
        
        // Angle leaves more forward for side view
        const rot = angle - 0.5;
        
        ctx.rotate(rot);
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-2, -leafLen/2, 0, -leafLen);
        ctx.quadraticCurveTo(2, -leafLen/2, 0, 0);
        ctx.fill();
        ctx.restore();
    }

    // === 5. FACE (Side View - one eye visible) ===
    ctx.fillStyle = colors.eyes;
    ctx.shadowColor = colors.eyes;
    ctx.shadowBlur = 5; 
    
    // Single eye for side view
    ctx.beginPath(); 
    ctx.arc(x + 22, y + 18 + bobOffset, 2.5, 0, Math.PI * 2); 
    ctx.fill();
    
    // Side smile
    ctx.strokeStyle = colors.smile;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + 22, y + 21 + bobOffset, 3, 0.5, 2.5);
    ctx.stroke();
    
    ctx.shadowBlur = 0;

    // === 6. LEGS (Side View with walking animation) ===
    ctx.strokeStyle = colors.bodyDark;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    const legY = y + 33 + bobOffset;
    
    // Animated leg swing
    const legSwing = Math.sin(animationTime / 150) * 2;
    
    // Back leg
    ctx.beginPath();
    ctx.moveTo(x + 17, legY);
    ctx.lineTo(x + 17 - legSwing, legY + 4);
    ctx.stroke();
    
    // Front leg
    ctx.beginPath();
    ctx.moveTo(x + 23, legY);
    ctx.lineTo(x + 23 + legSwing, legY + 4);
    ctx.stroke();

    // === 7. THRUST EFFECT - Psychedelic Rainbow Explosion! ===
    if (thrustActive && isGameRunning) {
        // Rainbow energy waves
        for (let i = 0; i < 3; i++) {
            const waveHue = (baseHue + i * 40) % 360;
            const waveOffset = (animationTime + i * 30) % 150;
            const waveY = waveOffset / 5;
            const waveAlpha = 0.6 - waveY / 40;
            
            ctx.fillStyle = `hsla(${waveHue}, 100%, 60%, ${waveAlpha})`;
            ctx.beginPath();
            ctx.arc(x + 20, y + 36 + bobOffset + waveY, 3 + waveY / 8, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Psychedelic particles orbiting
        for (let i = 0; i < 8; i++) {
            const particleHue = (baseHue + i * 45) % 360;
            const angle = (i * Math.PI * 2) / 8 + animationTime / 100;
            const radius = 12 + Math.sin(animationTime / 80 + i) * 3;
            const particleX = x + 20 + Math.cos(angle) * radius;
            const particleY = y + 20 + bobOffset + Math.sin(angle) * radius;
            
            ctx.fillStyle = `hsl(${particleHue}, 100%, 70%)`;
            ctx.beginPath();
            ctx.arc(particleX, particleY, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Extra glow pulse when thrusting
        const thrustGlow = Math.sin(animationTime / 60) * 0.3 + 0.7;
        ctx.fillStyle = `hsla(${baseHue}, 100%, 70%, ${0.2 * thrustGlow})`;
        ctx.beginPath();
        ctx.arc(x + 20, y + 20 + bobOffset, 20 + thrustGlow * 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Trailing rainbow streaks
        for (let i = 0; i < 4; i++) {
            const streakHue = (baseHue + i * 30) % 360;
            const streakX = x + 8 - i * 6;
            const streakY = y + 20 + bobOffset + Math.sin(animationTime / 100 + i) * 2;
            const streakAlpha = 0.5 - i * 0.1;
            
            ctx.fillStyle = `hsla(${streakHue}, 100%, 60%, ${streakAlpha})`;
            ctx.beginPath();
            ctx.ellipse(streakX, streakY, 3, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();
}

// Register the character
if (window.characters) {
    window.characters['carl'] = {
        name: 'Carl',
        draw: drawCarl,
        hitbox: {
            width: 38,
            height: 38,
            offsetX: 1,
            offsetY: 0
        }
    };
}
