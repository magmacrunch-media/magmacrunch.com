// Dag Henderson - Juanito Thompson's Transatlantic Colleague (dreamlike, mirror reflections)
function drawDagHenderson(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // === MAIN FIGURE ===
    
    // Legs
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 28);
    ctx.lineTo(x + 17, y + 35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 22, y + 28);
    ctx.lineTo(x + 23, y + 35);
    ctx.stroke();
    
    // Shoes
    ctx.fillStyle = '#34495e';
    ctx.beginPath();
    ctx.ellipse(x + 17, y + 36, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 23, y + 36, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body (European style - peacoat/jacket)
    ctx.fillStyle = '#34495e';
    ctx.beginPath();
    ctx.rect(x + 14, y + 14, 12, 14);
    ctx.fill();
    
    // Collar (formal)
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.moveTo(x + 17, y + 14);
    ctx.lineTo(x + 15, y + 16);
    ctx.lineTo(x + 17, y + 17);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 23, y + 14);
    ctx.lineTo(x + 25, y + 16);
    ctx.lineTo(x + 23, y + 17);
    ctx.closePath();
    ctx.fill();
    
    // Buttons (double-breasted style)
    ctx.fillStyle = '#95a5a6';
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x + 18, y + 18 + i * 3, 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 22, y + 18 + i * 3, 0.7, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Head
    ctx.fillStyle = '#f4d5b5';
    ctx.beginPath();
    ctx.arc(x + 20, y + 9, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Sophisticated European hair (neat, parted)
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.arc(x + 20, y + 7, 5.5, Math.PI, Math.PI * 2);
    ctx.fill();
    // Side part
    ctx.strokeStyle = '#4a2c2a';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + 19, y + 5);
    ctx.lineTo(x + 19, y + 8);
    ctx.stroke();
    
    // Eyes (looking thoughtfully to the side/distance)
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.ellipse(x + 18, y + 9, 1, 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 22, y + 9, 1, 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Contemplative expression
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 11);
    ctx.lineTo(x + 22, y + 11);
    ctx.stroke();
    
    // Nose
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 10);
    ctx.lineTo(x + 20, y + 11);
    ctx.stroke();
    
    // Scarf (European winter detail)
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(x + 17, y + 13, 6, 2);
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 18 + i * 2, y + 13);
        ctx.lineTo(x + 18 + i * 2, y + 15);
        ctx.stroke();
    }
    
    // Arms (one holding something invisible, reaching)
    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    
    const reachMotion = thrustActive && isGameRunning ? Math.sin(animationTime / 200) * 2 : 0;
    
    // Left arm
    ctx.beginPath();
    ctx.moveTo(x + 14, y + 18);
    ctx.lineTo(x + 10, y + 22 + reachMotion);
    ctx.stroke();
    
    // Right arm (reaching toward mirror line)
    ctx.beginPath();
    ctx.moveTo(x + 26, y + 18);
    ctx.lineTo(x + 32, y + 20);
    ctx.stroke();
    
    // Hands
    ctx.fillStyle = '#f4d5b5';
    ctx.beginPath();
    ctx.arc(x + 10, y + 22 + reachMotion, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 32, y + 20, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // === MIRROR LINE (vertical, symbolic boundary) ===
    const mirrorX = x + 38;
    
    // The mirror line itself
    ctx.strokeStyle = 'rgba(52, 152, 219, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(mirrorX, y - 5);
    ctx.lineTo(mirrorX, y + 40);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // === REFLECTION/HOLOGRAM (ghostly mirrored version) ===
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(animationTime / 300) * 0.1;
    
    // Flip horizontally for reflection
    ctx.translate(mirrorX * 2, 0);
    ctx.scale(-1, 1);
    
    // Reflected figure (simplified, ghostly)
    // Head
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.arc(x + 20, y + 9, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Body
    ctx.fillStyle = 'rgba(52, 152, 219, 0.4)';
    ctx.fillRect(x + 14, y + 14, 12, 14);
    
    // Legs (faint)
    ctx.strokeStyle = 'rgba(52, 152, 219, 0.3)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 28);
    ctx.lineTo(x + 17, y + 35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 22, y + 28);
    ctx.lineTo(x + 23, y + 35);
    ctx.stroke();
    
    ctx.restore();
    
    // === DREAM PARTICLES (floating between figure and reflection) ===
    for (let i = 0; i < 5; i++) {
        const driftY = Math.sin(animationTime / 400 + i * 0.8) * 6;
        const driftX = mirrorX - 6 - i * 3;
        const opacity = 0.2 + Math.abs(Math.sin(animationTime / 500 + i)) * 0.2;
        
        ctx.fillStyle = `rgba(149, 165, 166, ${opacity})`;
        ctx.beginPath();
        ctx.arc(driftX, y + 15 + driftY, 1, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // === HYPNAGOGIC STATE SYMBOLS (transitional dream symbols) ===
    // Fragmenting geometric shapes
    const shapeY = y + 5 + Math.sin(animationTime / 600) * 3;
    ctx.strokeStyle = 'rgba(149, 165, 166, 0.25)';
    ctx.lineWidth = 1;
    
    // Triangle
    ctx.beginPath();
    ctx.moveTo(mirrorX - 3, shapeY);
    ctx.lineTo(mirrorX - 1, shapeY + 3);
    ctx.lineTo(mirrorX - 5, shapeY + 3);
    ctx.closePath();
    ctx.stroke();
    
    // Square (rotating slightly)
    ctx.save();
    ctx.translate(mirrorX - 3, y + 25);
    ctx.rotate(animationTime / 1000);
    ctx.strokeRect(-2, -2, 4, 4);
    ctx.restore();
    
    // === THRUST EFFECT - Decrystallization waves ===
    if (thrustActive && isGameRunning) {
        const pulse = Math.sin(animationTime / 280);
        
        // Crystalline breaking waves
        ctx.strokeStyle = `rgba(52, 152, 219, ${0.2 + pulse * 0.1})`;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.arc(x + 20, y + 20, 15 + i * 7 + pulse * 2, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Fragmenting particles (decrystallization)
        for (let i = 0; i < 6; i++) {
            const angle = (animationTime / 800 + i * Math.PI / 3);
            const distance = 18 + Math.sin(animationTime / 300 + i) * 4;
            const fragX = x + 20 + Math.cos(angle) * distance;
            const fragY = y + 20 + Math.sin(angle) * distance;
            const shimmer = Math.abs(Math.sin(animationTime / 200 + i));
            
            ctx.fillStyle = `rgba(236, 240, 241, ${shimmer * 0.4})`;
            ctx.save();
            ctx.translate(fragX, fragY);
            ctx.rotate(animationTime / 400 + i);
            ctx.fillRect(-1, -1, 2, 2);
            ctx.restore();
        }
        
        // Trailing echo waves
        ctx.strokeStyle = 'rgba(52, 152, 219, 0.15)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const echoY = y + 18 + Math.sin(animationTime / 120 + i) * 2;
            ctx.beginPath();
            ctx.moveTo(x - 10 - i * 7, echoY);
            ctx.lineTo(x - 15 - i * 7, echoY);
            ctx.stroke();
        }
        
        // "Through the mirror" text
        ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
        ctx.font = 'italic 6px Arial';
        ctx.fillText('dream', x - 20, y + 15);
        
        // Time distortion (shoelace express reference - things moving fast)
        if (Math.sin(animationTime / 250) > 0.6) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 0.8;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(x - 8 - i * 5, y + 25);
                ctx.lineTo(x - 12 - i * 5, y + 25);
                ctx.stroke();
            }
        }
    }
}

// Register the character
if (window.characters) {
    window.characters['dag-henderson'] = {
        name: 'Dag Henderson',
        draw: drawDagHenderson,
        hitbox: {
            width: 40,
            height: 35,
            offsetX: 0,
            offsetY: 0
        }
    };
}