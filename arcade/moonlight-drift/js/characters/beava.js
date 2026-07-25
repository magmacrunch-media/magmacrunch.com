// Beava - Cartoon beaver with oversized accessories and tranquilizer dart gun
// Reference to "Anabolic Steroids and a Beaver Tranquilizer" / Dodgeball
function drawBeava(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // Beaver body (upright stance)
    ctx.fillStyle = '#8b6f47';
    ctx.beginPath();
    ctx.ellipse(x + 20, y + 20, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Lighter belly
    ctx.fillStyle = '#c19a6b';
    ctx.beginPath();
    ctx.ellipse(x + 20, y + 22, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Beaver head (on top of body)
    ctx.fillStyle = '#a0826d';
    ctx.beginPath();
    ctx.ellipse(x + 20, y + 8, 8, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Large cartoon ears
    ctx.fillStyle = '#8b6f47';
    ctx.beginPath();
    ctx.arc(x + 14, y + 4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 26, y + 4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner ears
    ctx.fillStyle = '#d4a574';
    ctx.beginPath();
    ctx.arc(x + 14, y + 4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 26, y + 4, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Oversized cartoon baseball cap (comically large) - BROWN like original
    ctx.fillStyle = '#8b6914';
    // Hat crown (bigger, rounder, more cartoony)
    ctx.beginPath();
    ctx.ellipse(x + 20, y - 1, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Giant flat brim (exaggerated)
    ctx.fillStyle = '#a67c1a';
    ctx.beginPath();
    ctx.ellipse(x + 24, y + 4, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Brim underside shadow
    ctx.fillStyle = '#6b5410';
    ctx.beginPath();
    ctx.ellipse(x + 24, y + 5, 9.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hat button on top
    ctx.fillStyle = '#a67c1a';
    ctx.beginPath();
    ctx.arc(x + 20, y - 4, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Snout/muzzle (beaver-style, centered for front view)
    ctx.fillStyle = '#c19a6b';
    ctx.beginPath();
    ctx.ellipse(x + 20, y + 11, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Big cartoon nose (centered)
    ctx.fillStyle = '#2c2c2c';
    ctx.beginPath();
    ctx.arc(x + 20, y + 10, 2, 0, Math.PI * 2);
    ctx.fill();
    // Nose highlight
    ctx.fillStyle = '#666666';
    ctx.beginPath();
    ctx.arc(x + 19.5, y + 9.5, 0.8, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes 
    ctx.fillStyle = '#2c2c2c';
    ctx.beginPath();
    ctx.arc(x + 17, y + 8, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 23, y + 8, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Oversized cartoon sunglasses (rectangular/square style)
    ctx.strokeStyle = '#556b2f'; // Dark olive green
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(30, 30, 50, 0.85)';
    // Left lens (rectangular)
    ctx.beginPath();
    ctx.rect(x + 13, y + 6, 5, 4);
    ctx.fill();
    ctx.stroke();
    // Right lens (rectangular)
    ctx.beginPath();
    ctx.rect(x + 22, y + 6, 5, 4);
    ctx.fill();
    ctx.stroke();
    // Bridge
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 8);
    ctx.lineTo(x + 22, y + 8);
    ctx.stroke();
    // Sunglasses arms
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 13, y + 8);
    ctx.lineTo(x + 11, y + 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 27, y + 8);
    ctx.lineTo(x + 29, y + 7);
    ctx.stroke();
    // Lens glare
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x + 14, y + 6.5, 2, 1.5);
    ctx.fillRect(x + 23, y + 6.5, 2, 1.5);
    
    // Simple necklace (more cartoony, less "bling")
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + 20, y + 15, 6, -0.3, Math.PI + 0.3);
    ctx.stroke();
    
    // Small pendant (just a simple circle)
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(x + 20, y + 20, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Arms - one holding tranquilizer gun
    ctx.fillStyle = '#8b6f47';
    // Left arm (down, relaxed)
    ctx.beginPath();
    ctx.ellipse(x + 12, y + 19, 3, 6, 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Right arm (holding tranquilizer gun)
    ctx.beginPath();
    ctx.ellipse(x + 28, y + 17, 3, 6, -0.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Hand/paw
    ctx.fillStyle = '#a0826d';
    ctx.beginPath();
    ctx.arc(x + 31, y + 17, 2.5, 0, Math.PI * 2);
    ctx.fill();
    
    // TRANQUILIZER DART GUN (cartoonish, clearly medical/veterinary style)
    // Gun body (bright medical cyan with white accents)
    ctx.fillStyle = '#00e5ff'; // Bright medical cyan
    ctx.strokeStyle = '#0097a7';
    ctx.lineWidth = 1.5;
    // Main body (longer, more pistol-shaped)
    ctx.fillRect(x + 32, y + 14, 10, 4);
    ctx.strokeRect(x + 32, y + 14, 10, 4);
    
    // Medical cross symbol on gun body (clearly medical equipment)
    ctx.fillStyle = '#ff1744'; // Red medical cross
    ctx.fillRect(x + 35, y + 15, 1, 2);
    ctx.fillRect(x + 34.5, y + 15.5, 2, 1);
    
    // "TRANQ" label on gun (clear identification)
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 3px Arial';
    ctx.fillText('TRANQ', x + 33, y + 17);
    
    // Clear dart chamber/cylinder (transparent with visible dart)
    ctx.strokeStyle = '#0097a7';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; // Transparent chamber
    ctx.fillRect(x + 37, y + 14.5, 5, 3);
    ctx.strokeRect(x + 37, y + 14.5, 5, 3);
    
    // Dart visible in transparent chamber (orange/yellow tip - clearly a dart)
    ctx.fillStyle = '#ff6b35'; // Orange dart body
    ctx.fillRect(x + 38, y + 15.5, 3, 1);
    // Bright yellow dart tip (tranquilizer fluid)
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.moveTo(x + 41, y + 16);
    ctx.lineTo(x + 42.5, y + 16);
    ctx.lineTo(x + 41.7, y + 15.5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 41, y + 16);
    ctx.lineTo(x + 42.5, y + 16);
    ctx.lineTo(x + 41.7, y + 16.5);
    ctx.closePath();
    ctx.fill();
    
    // Dart feathers/fins (red stabilizer fins)
    ctx.fillStyle = '#ff1744';
    ctx.beginPath();
    ctx.moveTo(x + 38, y + 15);
    ctx.lineTo(x + 37, y + 14.3);
    ctx.lineTo(x + 38.5, y + 15.5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 38, y + 17);
    ctx.lineTo(x + 37, y + 17.7);
    ctx.lineTo(x + 38.5, y + 16.5);
    ctx.closePath();
    ctx.fill();
    
    // Barrel (medical green/cyan, extends from chamber)
    ctx.fillStyle = '#00acc1';
    ctx.fillRect(x + 42, y + 15.2, 4, 1.6);
    // Barrel tip (darker)
    ctx.fillStyle = '#006064';
    ctx.fillRect(x + 45.5, y + 15.2, 0.8, 1.6);
    
    // Sight on top (pistol sight)
    ctx.fillStyle = '#ff6f00'; // Orange sight for visibility
    ctx.fillRect(x + 41, y + 13, 1.5, 1.5);
    
    // Gun handle (grip) - ergonomic medical grip
    ctx.fillStyle = '#00e5ff';
    ctx.strokeStyle = '#0097a7';
    ctx.lineWidth = 1.5;
    ctx.fillRect(x + 30, y + 18, 3, 6);
    ctx.strokeRect(x + 30, y + 18, 3, 6);
    // Grip texture lines (rubber grip)
    ctx.strokeStyle = '#006064';
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 30.5, y + 19 + i * 1.3);
        ctx.lineTo(x + 32.5, y + 19 + i * 1.3);
        ctx.stroke();
    }
    
    // Trigger (medical cyan to match gun)
    ctx.strokeStyle = '#0097a7';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x + 31, y + 19, 1.5, 0, Math.PI);
    ctx.stroke();
    
    // Warning label on handle (biohazard or caution symbol)
    ctx.fillStyle = '#ffeb3b'; // Yellow warning
    ctx.beginPath();
    ctx.moveTo(x + 31.5, y + 21);
    ctx.lineTo(x + 30.8, y + 22.2);
    ctx.lineTo(x + 32.2, y + 22.2);
    ctx.closePath();
    ctx.fill();
    // Exclamation mark in warning triangle
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 31.3, y + 21.5, 0.4, 0.4);
    
    // Big buck teeth (exaggerated, iconic beaver teeth) - CENTERED FOR FRONT VIEW
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1.5;
    // Make them bigger and more prominent
    // Left tooth 
    ctx.fillRect(x + 16.5, y + 13, 3.5, 6);
    ctx.strokeRect(x + 16.5, y + 13, 3.5, 6);
    // Right tooth 
    ctx.fillRect(x + 20, y + 13, 3.5, 6);
    ctx.strokeRect(x + 20, y + 13, 3.5, 6);
    // Tooth gap/separation
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(x + 19.5, y + 13);
    ctx.lineTo(x + 19.5, y + 19);
    ctx.stroke();
    
    // Legs (upright stance)
    ctx.fillStyle = '#8b6f47';
    ctx.beginPath();
    ctx.ellipse(x + 16, y + 29, 3.5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 24, y + 29, 3.5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Beaver tail (behind body, large and flat)
    ctx.fillStyle = '#6b5638';
    ctx.beginPath();
    ctx.ellipse(x + 10, y + 25, 7, 5, 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    // Tail texture (crosshatch pattern - iconic beaver tail)
    ctx.strokeStyle = '#5a4628';
    ctx.lineWidth = 0.8;
    // Horizontal lines
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 5, y + 22 + i * 2);
        ctx.lineTo(x + 13, y + 22 + i * 2);
        ctx.stroke();
    }
    // Vertical lines
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 7 + i * 2, y + 21);
        ctx.lineTo(x + 7 + i * 2, y + 28);
        ctx.stroke();
    }
    
    // Cartoon sneakers (bright purple, oversized, clearly cartoony) - PURPLE like original
    ctx.fillStyle = '#7b3ff2'; // Bright purple
    ctx.strokeStyle = '#5e2bb8';
    ctx.lineWidth = 1.5;
    // Left shoe
    ctx.beginPath();
    ctx.ellipse(x + 16, y + 36, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Right shoe
    ctx.beginPath();
    ctx.ellipse(x + 24, y + 36, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Exaggerated cartoon shoe details (white stripes/swoosh)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 13, y + 36);
    ctx.lineTo(x + 19, y + 36);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 21, y + 36);
    ctx.lineTo(x + 27, y + 36);
    ctx.stroke();
    
    // Shoe laces (cartoonish)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 15, y + 35);
    ctx.lineTo(x + 17, y + 35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 23, y + 35);
    ctx.lineTo(x + 25, y + 35);
    ctx.stroke();
    
    // Thrust effect - dart firing!
    if (thrustActive && isGameRunning) {
        // Dart flying out (more visible, clearly a tranquilizer dart)
        const dartX = x + 46 + (animationTime % 100) / 5;
        const dartAlpha = 1 - ((animationTime % 100) / 100) * 0.3; // Fade slightly as it travels
        
        // Dart body (orange with fins)
        ctx.fillStyle = `rgba(255, 107, 53, ${dartAlpha})`;
        ctx.fillRect(dartX, y + 15.5, 4, 1);
        
        // Bright yellow tip (tranquilizer fluid - very visible)
        ctx.fillStyle = `rgba(255, 235, 59, ${dartAlpha})`;
        ctx.beginPath();
        ctx.moveTo(dartX + 4, y + 16);
        ctx.lineTo(dartX + 6, y + 16);
        ctx.lineTo(dartX + 5, y + 15.3);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(dartX + 4, y + 16);
        ctx.lineTo(dartX + 6, y + 16);
        ctx.lineTo(dartX + 5, y + 16.7);
        ctx.closePath();
        ctx.fill();
        
        // Red stabilizer fins (clearly visible)
        ctx.fillStyle = `rgba(255, 23, 68, ${dartAlpha})`;
        ctx.beginPath();
        ctx.moveTo(dartX, y + 15);
        ctx.lineTo(dartX - 1.5, y + 14);
        ctx.lineTo(dartX + 1, y + 15.5);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(dartX, y + 17);
        ctx.lineTo(dartX - 1.5, y + 18);
        ctx.lineTo(dartX + 1, y + 16.5);
        ctx.closePath();
        ctx.fill();
        
        // Motion lines behind dart (speed effect)
        ctx.strokeStyle = `rgba(255, 235, 59, ${dartAlpha * 0.5})`;
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(dartX - 2 - i * 2, y + 16);
            ctx.lineTo(dartX - 4 - i * 2, y + 16);
            ctx.stroke();
        }
        
        // Puff of air/smoke from barrel (compressed air effect)
        ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
        ctx.beginPath();
        ctx.arc(x + 46, y + 16, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
        ctx.beginPath();
        ctx.arc(x + 48, y + 16, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 50, y + 16, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Register the character
if (window.characters) {
    window.characters['beava'] = {
        name: 'Beava',
        draw: drawBeava,
        hitbox: {
            width: 40,
            height: 35,
            offsetX: 0,
            offsetY: 0
        }
    };
}