// New character: Plantain Jane (1950s bad girl plantain with red cat-eye sunglasses)
function drawPlantainJane(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // Color palette - plantain (greener/more yellow-green than banana)
    const colors = {
        plantainYellow: '#d4c04a',
        plantainGreen: '#b8a84f',
        plantainHighlight: '#e8d85f',
        plantainDark: '#9a8a3a',
        plantainEdge: '#8a7a2a',
        stem: '#7a6a30',
        catEyeFrameRed: '#d32f2f',      // Classic red cat-eye frames
        catEyeLens: 'rgba(20, 20, 20, 0.85)',
        catEyeGoldAccent: '#ffd700',
        lipstickRed: '#c62828',         // Dark dramatic red
        cigarette: '#f5f5f5',
        cigaretteFilter: '#ffb74d',
        smoke: 'rgba(200, 200, 200, 0.6)'
    };
    
    // Plantain body - curved side view, TALLER and more angular than banana
    ctx.fillStyle = colors.plantainYellow;
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 3);
    ctx.quadraticCurveTo(x + 12, y + 6, x + 10, y + 14);
    ctx.quadraticCurveTo(x + 9, y + 23, x + 12, y + 30);
    ctx.lineTo(x + 20, y + 30);
    ctx.quadraticCurveTo(x + 18, y + 23, x + 19, y + 14);
    ctx.quadraticCurveTo(x + 21, y + 6, x + 25, y + 3);
    ctx.closePath();
    ctx.fill();
    
    // Bottom taper (makes it look like real plantain end)
    ctx.fillStyle = colors.plantainDark;
    ctx.beginPath();
    ctx.ellipse(x + 16, y + 31, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Plantain ridge/highlight (plantains have more defined ridges)
    ctx.strokeStyle = colors.plantainHighlight;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 4);
    ctx.quadraticCurveTo(x + 16, y + 14, x + 17, y + 29);
    ctx.stroke();
    
    // Side ridge (greener)
    ctx.strokeStyle = colors.plantainGreen;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 14, y + 5);
    ctx.quadraticCurveTo(x + 12, y + 14, x + 13, y + 28);
    ctx.stroke();
    
    // Darker plantain edge
    ctx.strokeStyle = colors.plantainEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 3);
    ctx.quadraticCurveTo(x + 12, y + 6, x + 10, y + 14);
    ctx.quadraticCurveTo(x + 9, y + 23, x + 12, y + 30);
    ctx.stroke();
    
    // Plantain stem (top)
    ctx.fillStyle = colors.stem;
    ctx.beginPath();
    ctx.moveTo(x + 21, y + 3);
    ctx.lineTo(x + 20, y);
    ctx.lineTo(x + 22, y - 1);
    ctx.lineTo(x + 24, y + 2);
    ctx.closePath();
    ctx.fill();
    
    // Cat-eye sunglasses (side view - one lens with dramatic wing)
    // Main lens
    ctx.fillStyle = colors.catEyeLens;
    ctx.beginPath();
    ctx.ellipse(x + 15, y + 11, 4, 3, -0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Red cat-eye frame
    ctx.strokeStyle = colors.catEyeFrameRed;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x + 15, y + 11, 4, 3, -0.2, 0, Math.PI * 2);
    ctx.stroke();
    
    // Dramatic cat-eye wing extending back
    ctx.strokeStyle = colors.catEyeFrameRed;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 11, y + 9);
    ctx.lineTo(x + 8, y + 8);
    ctx.stroke();
    
    // Temple arm going back with gold accent
    ctx.strokeStyle = colors.catEyeFrameRed;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 11, y + 11);
    ctx.lineTo(x + 8, y + 11);
    ctx.stroke();
    
    // Gold accent on temple
    ctx.strokeStyle = colors.catEyeGoldAccent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 11, y + 11.5);
    ctx.lineTo(x + 8, y + 11.5);
    ctx.stroke();
    
    // Cool reflection on lens
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(x + 14, y + 10, 1, 0, Math.PI * 2);
    ctx.fill();
    
    // Red lipstick lips (side profile - sultry smirk)
    ctx.fillStyle = colors.lipstickRed;
    ctx.beginPath();
    ctx.arc(x + 16, y + 17, 2, -0.3, 0.5);
    ctx.fill();
    
    // Shine on lips
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(x + 16, y + 16.5, 0.7, 0, Math.PI);
    ctx.fill();
    
    // Cigarette (held in corner of mouth)
    ctx.fillStyle = colors.cigarette;
    ctx.fillRect(x + 17, y + 17, 10, 2);
    
    // Orange filter tip
    ctx.fillStyle = colors.cigaretteFilter;
    ctx.fillRect(x + 17, y + 17, 2, 2);
    
    // Cigarette end detail
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(x + 26.5, y + 17, 0.5, 2);
    
    // Cigarette tip (not lit - cool and collected)
    ctx.fillStyle = '#b0b0b0';
    ctx.fillRect(x + 27, y + 16.5, 1, 3);
    
    // Smoke wisps (elegant, curling smoke)
    ctx.strokeStyle = colors.smoke;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 28, y + 17);
    ctx.quadraticCurveTo(x + 30, y + 15, x + 31, y + 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 29, y + 17.5);
    ctx.quadraticCurveTo(x + 32, y + 15, x + 33, y + 11);
    ctx.stroke();
    
    // When thrusting - MORE SMOKE (she's taking a drag)
    if (thrustActive && isGameRunning) {
        // Additional smoke puffs
        ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(x + 30 + i * 4, y + 14 - i * 3, 2 - i * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Dramatic exhale cloud below
        ctx.fillStyle = 'rgba(236, 240, 241, 0.4)';
        ctx.beginPath();
        ctx.ellipse(x + 16, y + 36, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Arm holding cigarette (delicate, feminine)
    ctx.strokeStyle = colors.plantainGreen;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 13, y + 19);
    ctx.lineTo(x + 16, y + 18);
    ctx.stroke();
    
    // Bottom "legs" - confident stance at tapered bottom
    ctx.strokeStyle = colors.plantainDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 31);
    ctx.lineTo(x + 10, y + 34);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 31);
    ctx.lineTo(x + 22, y + 34);
    ctx.stroke();
}

// Register the character
if (window.characters) {
    window.characters['plantain-jane'] = {
        name: 'PLANTAIN JANE',
        draw: drawPlantainJane,
        hitbox: {
            width: 38,
            height: 38,
            offsetX: 1,
            offsetY: -2
        }
    };
}
