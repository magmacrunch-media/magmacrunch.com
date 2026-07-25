// Fire Toad - Inspired by "These Toads" (Fire-bellied toad style)
function drawFireToad(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // More elongated toad body - less round, more stretched
    // Green/olive top with black spots
    ctx.fillStyle = '#6b8e23'; // Olive green
    ctx.beginPath();
    // Longer, lower body shape
    ctx.ellipse(x + 18, y + 22, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Black spots on green back - larger and more defined
    ctx.fillStyle = '#1a1a1a';
    const backSpots = [
        [12, 20, 2.5], [16, 23, 2], [20, 21, 2.5], [23, 24, 2], [10, 24, 1.5]
    ];
    backSpots.forEach(([sx, sy, size]) => {
        ctx.beginPath();
        ctx.arc(x + sx, y + sy, size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Fire belly (bright orange-red) - more visible, longer
    ctx.fillStyle = '#ff4500'; // Orange-red fire belly
    ctx.beginPath();
    ctx.ellipse(x + 22, y + 26, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Black spots on orange belly - bold and clear
    ctx.fillStyle = '#1a1a1a';
    const bellySpots = [
        [18, 25, 1.5], [22, 27, 1.5], [25, 26, 1.5], [20, 28, 1]
    ];
    bellySpots.forEach(([sx, sy, size]) => {
        ctx.beginPath();
        ctx.arc(x + sx, y + sy, size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Head - more distinct from body, clearly toad-shaped
    ctx.fillStyle = '#6b8e23'; // Green
    ctx.beginPath();
    // Wider, flatter head
    ctx.ellipse(x + 30, y + 18, 7, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Clear snout/nose area
    ctx.fillStyle = '#7aa02a';
    ctx.beginPath();
    ctx.ellipse(x + 34, y + 18, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Black spots on head - fewer, clearer
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(x + 28, y + 16, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 30, y + 21, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Large prominent toad eyes - side view, very clear
    // Bulging, golden eyes
    ctx.fillStyle = '#1a1a1a';
    // Eye socket/outline
    ctx.beginPath();
    ctx.arc(x + 31, y + 13, 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#d4af37'; // Golden
    ctx.beginPath();
    ctx.arc(x + 31, y + 13, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Bright highlight
    ctx.fillStyle = '#fff8dc';
    ctx.beginPath();
    ctx.arc(x + 32, y + 12, 1.8, 0, Math.PI * 2);
    ctx.fill();
    
    // Horizontal slit pupil - very visible
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 29, y + 12.8, 4, 1.4);
    
    // Nostril - clear and visible
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(x + 36, y + 17, 1.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Mouth line - clear toad expression
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 34, y + 20);
    ctx.quadraticCurveTo(x + 32, y + 21, x + 30, y + 21);
    ctx.stroke();
    
    // Warty/bumpy texture - clearer bumps
    ctx.fillStyle = '#556b2f';
    const warts = [
        [14, 19, 1.5], [18, 20, 1.2], [22, 19, 1.3], [25, 22, 1.2]
    ];
    warts.forEach(([wx, wy, size]) => {
        ctx.beginPath();
        ctx.arc(x + wx, y + wy, size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Back legs (left side) - more defined
    ctx.fillStyle = '#6b8e23';
    ctx.beginPath();
    ctx.ellipse(x + 12, y + 28, 3.5, 5, 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Black spot on back leg
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(x + 12, y + 28, 1.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Back foot - with visible toes
    ctx.fillStyle = '#6b8e23';
    ctx.beginPath();
    ctx.ellipse(x + 10, y + 32, 3.5, 2, 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Front legs (right side) - clearly visible
    ctx.fillStyle = '#6b8e23';
    ctx.beginPath();
    ctx.ellipse(x + 28, y + 28, 3.5, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Front foot - showing orange underside
    ctx.fillStyle = '#ff4500';
    ctx.beginPath();
    ctx.ellipse(x + 30, y + 32, 4, 2.5, -0.1, 0, Math.PI * 2);
    ctx.fill();
    
    // Clear, visible toes - orange/red 
    ctx.strokeStyle = '#ff6347';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    // Front foot toes (4 toes clearly visible)
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 27 + i * 2, y + 32);
        ctx.lineTo(x + 27 + i * 2, y + 35);
        ctx.stroke();
    }
    
    // Back foot toes
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 8 + i * 2, y + 32);
        ctx.lineTo(x + 8 + i * 2, y + 34);
        ctx.stroke();
    }
    
    // FIRE ELEMENTS - More prominent flames
    const flameIntensity = thrustActive && isGameRunning ? 2 : 1;
    const flicker = Math.sin(animationTime / 80) * 3;
    
    // Main flame crown - larger, more dramatic
    ctx.fillStyle = '#ff4500'; // Orange
    ctx.beginPath();
    ctx.moveTo(x + 30, y + 5);
    ctx.quadraticCurveTo(x + 27, y + 9 - flicker * flameIntensity, x + 25, y + 12);
    ctx.lineTo(x + 30, y + 10);
    ctx.lineTo(x + 35, y + 12);
    ctx.quadraticCurveTo(x + 33, y + 9 - flicker * flameIntensity, x + 30, y + 5);
    ctx.fill();
    
    // Middle flame layer
    ctx.fillStyle = '#ff6347'; // Tomato red
    ctx.beginPath();
    ctx.moveTo(x + 30, y + 7);
    ctx.quadraticCurveTo(x + 28, y + 9.5 - flicker * flameIntensity * 0.7, x + 26, y + 11);
    ctx.lineTo(x + 30, y + 10);
    ctx.lineTo(x + 34, y + 11);
    ctx.quadraticCurveTo(x + 32, y + 9.5 - flicker * flameIntensity * 0.7, x + 30, y + 7);
    ctx.fill();
    
    // Hot core
    ctx.fillStyle = '#ffa500'; // Bright orange
    ctx.beginPath();
    ctx.arc(x + 30, y + 9, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // White hot center
    ctx.fillStyle = '#fff8dc';
    ctx.beginPath();
    ctx.arc(x + 30, y + 9, 0.8, 0, Math.PI * 2);
    ctx.fill();
    
    // Additional flame wisps around the toad when active
    if (thrustActive && isGameRunning) {
        // Flickering flames on back
        ctx.fillStyle = 'rgba(255, 69, 0, 0.6)';
        const backFlameY = y + 18 + Math.sin(animationTime / 100) * 2;
        ctx.beginPath();
        ctx.moveTo(x + 15, backFlameY);
        ctx.quadraticCurveTo(x + 14, backFlameY - 3, x + 13, backFlameY - 5);
        ctx.lineTo(x + 15, backFlameY - 3);
        ctx.lineTo(x + 17, backFlameY - 5);
        ctx.quadraticCurveTo(x + 16, backFlameY - 3, x + 15, backFlameY);
        ctx.fill();
    }
    
    // Thrust effect - FIRE BREATHING + trailing flames
    // Fire breathed forward from mouth, flames trail behind
    if (thrustActive && isGameRunning) {
        // FIRE BREATH - shooting forward from mouth!
        const breathFlicker = Math.sin(animationTime / 60) * 2;
        
        // Large fire breath blast
        for (let i = 0; i < 3; i++) {
            const breathX = x + 36 + i * 6;
            const breathY = y + 20 + Math.sin(animationTime / 80 + i) * 2;
            const breathAlpha = 0.8 - i * 0.2;
            const breathSize = 1.2 - i * 0.25;
            
            // Outer flame (orange-red)
            ctx.fillStyle = `rgba(255, 69, 0, ${breathAlpha})`;
            ctx.beginPath();
            ctx.moveTo(breathX + 8 * breathSize, breathY);
            ctx.quadraticCurveTo(breathX + 5 * breathSize, breathY - 4 * breathSize + breathFlicker, breathX, breathY - 3 * breathSize);
            ctx.lineTo(breathX + 2 * breathSize, breathY);
            ctx.lineTo(breathX, breathY + 3 * breathSize);
            ctx.quadraticCurveTo(breathX + 5 * breathSize, breathY + 4 * breathSize - breathFlicker, breathX + 8 * breathSize, breathY);
            ctx.fill();
            
            // Inner flame (bright orange)
            ctx.fillStyle = `rgba(255, 140, 0, ${breathAlpha})`;
            ctx.beginPath();
            ctx.moveTo(breathX + 6 * breathSize, breathY);
            ctx.quadraticCurveTo(breathX + 4 * breathSize, breathY - 2.5 * breathSize, breathX + 1 * breathSize, breathY - 2 * breathSize);
            ctx.lineTo(breathX + 2 * breathSize, breathY);
            ctx.lineTo(breathX + 1 * breathSize, breathY + 2 * breathSize);
            ctx.quadraticCurveTo(breathX + 4 * breathSize, breathY + 2.5 * breathSize, breathX + 6 * breathSize, breathY);
            ctx.fill();
            
            // Hot core
            ctx.fillStyle = `rgba(255, 220, 100, ${breathAlpha})`;
            ctx.beginPath();
            ctx.arc(breathX + 3 * breathSize, breathY, 1.5 * breathSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Fire particles from breath
        for (let i = 0; i < 6; i++) {
            const particleX = x + 38 + i * 8 + Math.sin(animationTime / 70 + i * 1.5) * 3;
            const particleY = y + 20 + Math.cos(animationTime / 90 + i) * 4;
            const particleSize = 1 + Math.random() * 1.5;
            
            ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 140, 0, 0.9)' : 'rgba(255, 200, 0, 0.8)';
            ctx.beginPath();
            ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Large flame burst trail behind the toad
        for (let i = 0; i < 4; i++) {
            const flameX = x + 8 - i * 7;
            const flameY = y + 24 + Math.sin(animationTime / 100 + i) * 3;
            const flameAlpha = 0.7 - i * 0.15;
            const flameSize = 1.2 - i * 0.2;
            
            // Outer flame (orange)
            ctx.fillStyle = `rgba(255, 69, 0, ${flameAlpha})`;
            ctx.beginPath();
            ctx.moveTo(flameX, flameY - 6 * flameSize);
            ctx.quadraticCurveTo(flameX - 4 * flameSize, flameY - 2 * flameSize, flameX - 3 * flameSize, flameY + 2 * flameSize);
            ctx.lineTo(flameX, flameY);
            ctx.lineTo(flameX + 3 * flameSize, flameY + 2 * flameSize);
            ctx.quadraticCurveTo(flameX + 4 * flameSize, flameY - 2 * flameSize, flameX, flameY - 6 * flameSize);
            ctx.fill();
            
            // Inner flame (bright orange)
            ctx.fillStyle = `rgba(255, 140, 0, ${flameAlpha})`;
            ctx.beginPath();
            ctx.moveTo(flameX, flameY - 4 * flameSize);
            ctx.quadraticCurveTo(flameX - 2 * flameSize, flameY - 1 * flameSize, flameX - 1.5 * flameSize, flameY + 1 * flameSize);
            ctx.lineTo(flameX, flameY);
            ctx.lineTo(flameX + 1.5 * flameSize, flameY + 1 * flameSize);
            ctx.quadraticCurveTo(flameX + 2 * flameSize, flameY - 1 * flameSize, flameX, flameY - 4 * flameSize);
            ctx.fill();
        }
        
        // Heart-shaped flames (in her heart there's toads) - smaller, integrated
        for (let i = 0; i < 2; i++) {
            const heartX = x + 6 - i * 8;
            const heartY = y + 26 + Math.sin(animationTime / 120 + i * 2) * 2;
            const heartAlpha = 0.5 - i * 0.2;
            
            // Heart flame shape
            ctx.fillStyle = `rgba(255, 99, 71, ${heartAlpha})`;
            ctx.beginPath();
            ctx.moveTo(heartX, heartY + 3);
            ctx.bezierCurveTo(heartX, heartY + 1, heartX - 2, heartY - 1, heartX - 2, heartY + 1);
            ctx.bezierCurveTo(heartX - 2, heartY - 1, heartX - 4, heartY - 1, heartX - 4, heartY + 2);
            ctx.bezierCurveTo(heartX - 4, heartY + 4, heartX, heartY + 6, heartX, heartY + 6);
            ctx.bezierCurveTo(heartX, heartY + 6, heartX + 4, heartY + 4, heartX + 4, heartY + 2);
            ctx.bezierCurveTo(heartX + 4, heartY - 1, heartX + 2, heartY - 1, heartX + 2, heartY + 1);
            ctx.bezierCurveTo(heartX + 2, heartY - 1, heartX, heartY + 1, heartX, heartY + 3);
            ctx.fill();
        }
        
        // Fiery ember particles behind - lots of them!
        for (let i = 0; i < 8; i++) {
            const emberX = x + 5 - i * 4 + Math.sin(animationTime / 60 + i) * 3;
            const emberY = y + 22 + Math.cos(animationTime / 80 + i * 2) * 4;
            const emberSize = 0.8 + Math.random() * 1.2;
            
            ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 140, 0, 0.8)' : 'rgba(255, 69, 0, 0.7)';
            ctx.beginPath();
            ctx.arc(emberX, emberY, emberSize, 0, Math.PI * 2);
            ctx.fill();
            
            // Bright core on some embers
            if (i % 3 === 0) {
                ctx.fillStyle = 'rgba(255, 255, 200, 0.9)';
                ctx.beginPath();
                ctx.arc(emberX, emberY, emberSize * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Heat shimmer effect around mouth
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.4)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 2; i++) {
            ctx.beginPath();
            ctx.arc(x + 38 + i * 8, y + 20, 4 + i * 2, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Heat shimmer behind
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.3)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(x - 2 - i * 6, y + 24, 5 + i * 2, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Smoke trail
        ctx.fillStyle = 'rgba(120, 120, 120, 0.2)';
        for (let i = 0; i < 3; i++) {
            const smokeX = x - 10 - i * 5;
            const smokeY = y + 20 - i * 2;
            ctx.beginPath();
            ctx.arc(smokeX, smokeY, 3 + i, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Register the character
if (window.characters) {
    window.characters['fire-toad'] = {
        name: 'Fire Toad',
        draw: drawFireToad,
        hitbox: {
            width: 32,
            height: 32,
            offsetX: 4,
            offsetY: 0
        }
    };
}
