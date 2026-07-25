// SVFP Van - Sex Van Floor Plan riot-grrrl punk band van
function drawSVFPVan(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // Van body (beat-up panel van)
    ctx.fillStyle = '#ff1493'; // Hot pink
    ctx.fillRect(x + 5, y + 15, 35, 15);
    
    // Van roof
    ctx.fillStyle = '#d4127a';
    ctx.fillRect(x + 6, y + 12, 33, 3);
    
    // Windshield
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    ctx.moveTo(x + 35, y + 12);
    ctx.lineTo(x + 38, y + 15);
    ctx.lineTo(x + 35, y + 15);
    ctx.closePath();
    ctx.fill();
    
    // Windshield glare
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.moveTo(x + 35, y + 13);
    ctx.lineTo(x + 37, y + 15);
    ctx.lineTo(x + 35, y + 15);
    ctx.closePath();
    ctx.fill();
    
    // Front bumper/hood
    ctx.fillStyle = '#ff1493';
    ctx.fillRect(x + 38, y + 18, 4, 8);
    
    // Headlight
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(x + 40, y + 20, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Side window
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(x + 30, y + 15, 4, 4);
    
    // Window glare
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(x + 30, y + 15, 2, 2);
    
    // Rust spots (beat-up van aesthetic)
    ctx.fillStyle = '#8b4513';
    ctx.beginPath();
    ctx.arc(x + 15, y + 25, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 25, y + 18, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 35, y + 28, 1, 0, Math.PI * 2);
    ctx.fill();
    
    // "SVFP" text on side (punk style, hand-painted look - BOLD and visible!)
    // Black outline for contrast
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 10px Arial';
    ctx.fillText('SVFP', x + 11, y + 25);
    ctx.fillText('SVFP', x + 13, y + 25);
    ctx.fillText('SVFP', x + 12, y + 24);
    ctx.fillText('SVFP', x + 12, y + 26);
    
    // White text on top
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SVFP', x + 12, y + 25);
    
    // Punk stickers/graffiti (moved away from SVFP text)
    // Anarchy symbol (moved to left side)
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + 8, y + 20, 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 18);
    ctx.lineTo(x + 8, y + 22);
    ctx.stroke();
    
    // X marks (moved to right side, away from text)
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 30, y + 26);
    ctx.lineTo(x + 33, y + 29);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 33, y + 26);
    ctx.lineTo(x + 30, y + 29);
    ctx.stroke();
    
    // Star sticker (moved to upper right)
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.moveTo(x + 28, y + 17);
    ctx.lineTo(x + 29, y + 19);
    ctx.lineTo(x + 31, y + 19);
    ctx.lineTo(x + 29.5, y + 20.5);
    ctx.lineTo(x + 30, y + 22);
    ctx.lineTo(x + 28, y + 21);
    ctx.lineTo(x + 26, y + 22);
    ctx.lineTo(x + 26.5, y + 20.5);
    ctx.lineTo(x + 25, y + 19);
    ctx.lineTo(x + 27, y + 19);
    ctx.closePath();
    ctx.fill();
    
    // Door outline
    ctx.strokeStyle = '#b30f6e';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 22, y + 19, 6, 11);
    
    // Door handle
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(x + 26, y + 24, 1.5, 1);
    
    // Wheels
    ctx.fillStyle = '#2c2c2c';
    ctx.beginPath();
    ctx.arc(x + 12, y + 30, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 32, y + 30, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Wheel rims
    ctx.strokeStyle = '#808080';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + 12, y + 30, 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 32, y + 30, 2, 0, Math.PI * 2);
    ctx.stroke();
    
    // Wheel spokes
    for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI / 2) + (thrustActive ? animationTime / 100 : 0);
        ctx.beginPath();
        ctx.moveTo(x + 12, y + 30);
        ctx.lineTo(x + 12 + Math.cos(angle) * 2, y + 30 + Math.sin(angle) * 2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x + 32, y + 30);
        ctx.lineTo(x + 32 + Math.cos(angle) * 2, y + 30 + Math.sin(angle) * 2);
        ctx.stroke();
    }
    
    // Exhaust pipe
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(x + 4, y + 28, 2, 1.5);
    
    // Side mirror
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 38, y + 17);
    ctx.lineTo(x + 41, y + 16);
    ctx.stroke();
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(x + 41, y + 15, 2, 2);
    
    // Antenna with flag
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 15, y + 12);
    ctx.lineTo(x + 15, y + 6);
    ctx.stroke();
    
    // Riot grrrl flag
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.moveTo(x + 15, y + 6);
    ctx.lineTo(x + 20, y + 8);
    ctx.lineTo(x + 15, y + 10);
    ctx.closePath();
    ctx.fill();
    
    // Thrust effect - punk rock exhaust and music notes
    if (thrustActive && isGameRunning) {
        // Exhaust smoke (dark and chunky)
        ctx.fillStyle = 'rgba(60, 60, 60, 0.6)';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(x - 2 - i * 5, y + 28 + Math.sin(animationTime / 50 + i) * 2, 2 + i, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Punk music notes/sound waves blasting from van
        ctx.fillStyle = '#ff1493';
        ctx.font = 'bold 10px Arial';
        ctx.fillText('♪', x - 8, y + 20);
        ctx.fillText('♫', x - 12, y + 24);
        
        // Aggressive sound waves
        ctx.strokeStyle = 'rgba(255, 20, 147, 0.4)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 2; i++) {
            ctx.beginPath();
            ctx.arc(x + 5, y + 22, 10 + i * 8, Math.PI * 0.5, Math.PI * 1.5);
            ctx.stroke();
        }
        
        // Punk rock text flying out
        ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.font = 'bold 6px Arial';
        ctx.fillText('RIOT', x - 15, y + 18);
        
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.fillText('GRRRL', x - 18, y + 26);
        
        // Sparks from exhaust
        ctx.fillStyle = '#ffff00';
        for (let i = 0; i < 3; i++) {
            const sparkX = x - 5 - Math.random() * 8;
            const sparkY = y + 28 + Math.random() * 4 - 2;
            ctx.beginPath();
            ctx.arc(sparkX, sparkY, 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Register the character
if (window.characters) {
    window.characters['svfp-van'] = {
        name: 'Sex Van Floor Plan',
        draw: drawSVFPVan,
        hitbox: {
            width: 36,
            height: 18,
            offsetX: 4,
            offsetY: 12
        }
    };
}