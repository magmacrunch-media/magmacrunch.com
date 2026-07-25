// Mountain Gnome - Journey to the source of thought
// Inspired by Transcendental Meditation and Maharishi Mahesh Yogi
function drawMountainGnome(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // Meditation aura/glow (pulsing energy field)
    if (thrustActive && isGameRunning) {
        const pulse = Math.sin(animationTime / 100) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(200, 150, 255, ${0.15 * pulse})`;
        ctx.beginPath();
        ctx.arc(x + 20, y + 20, 25 + pulse * 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = `rgba(150, 200, 255, ${0.2 * pulse})`;
        ctx.beginPath();
        ctx.arc(x + 20, y + 20, 18 + pulse * 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Gnome body (sitting in lotus position)
    ctx.fillStyle = '#8b4513';
    ctx.beginPath();
    ctx.ellipse(x + 20, y + 22, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Simple robe/tunic (earth tones)
    ctx.fillStyle = '#d2691e';
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 18);
    ctx.lineTo(x + 10, y + 28);
    ctx.lineTo(x + 30, y + 28);
    ctx.lineTo(x + 28, y + 18);
    ctx.closePath();
    ctx.fill();
    
    // Robe trim (golden accent)
    ctx.strokeStyle = '#daa520';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + 20, y + 22, 7, -0.3, Math.PI + 0.3);
    ctx.stroke();
    
    // Legs in lotus position
    ctx.fillStyle = '#a0522d';
    // Left leg crossed
    ctx.beginPath();
    ctx.ellipse(x + 14, y + 30, 5, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Right leg crossed
    ctx.beginPath();
    ctx.ellipse(x + 26, y + 30, 5, 3, -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Bare feet (peaceful meditation)
    ctx.fillStyle = '#deb887';
    ctx.beginPath();
    ctx.ellipse(x + 16, y + 31, 2.5, 2, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 24, y + 31, 2.5, 2, -0.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Gnome head
    ctx.fillStyle = '#deb887';
    ctx.beginPath();
    ctx.arc(x + 20, y + 10, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Long white beard (wise gnome)
    ctx.fillStyle = '#f0f0f0';
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 11);
    ctx.lineTo(x + 14, y + 20);
    ctx.lineTo(x + 26, y + 20);
    ctx.lineTo(x + 24, y + 11);
    ctx.closePath();
    ctx.fill();
    
    // Beard texture (flowing strands)
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 16 + i * 2.5, y + 12);
        ctx.lineTo(x + 15 + i * 2.5, y + 19);
        ctx.stroke();
    }
    
    // Iconic tall pointed gnome hat (mountain peak!)
    ctx.fillStyle = '#c41e3a';
    ctx.beginPath();
    ctx.moveTo(x + 20, y - 6);
    ctx.lineTo(x + 14, y + 6);
    ctx.lineTo(x + 26, y + 6);
    ctx.closePath();
    ctx.fill();
    
    // Hat shadow/depth
    ctx.fillStyle = '#a01828';
    ctx.beginPath();
    ctx.moveTo(x + 20, y - 6);
    ctx.lineTo(x + 23, y + 2);
    ctx.lineTo(x + 26, y + 6);
    ctx.closePath();
    ctx.fill();
    
    // Cosmic star on hat (connection to universal intelligence)
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const radius = i % 2 === 0 ? 2 : 1;
        const px = x + 20 + Math.cos(angle) * radius;
        const py = y + 1 + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    
    // Eyes closed in deep meditation
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    // Peaceful closed eyes (curved upward - serene expression)
    ctx.beginPath();
    ctx.arc(x + 17, y + 10, 1.5, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 23, y + 10, 1.5, 0.2, Math.PI - 0.2);
    ctx.stroke();
    
    // Small nose
    ctx.fillStyle = '#c19a6b';
    ctx.beginPath();
    ctx.ellipse(x + 20, y + 11, 1.5, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Third eye chakra (spiritual awakening)
    const thirdEyePulse = Math.sin(animationTime / 150) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(138, 43, 226, ${0.6 * thirdEyePulse})`;
    ctx.beginPath();
    ctx.arc(x + 20, y + 7, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = `rgba(200, 150, 255, ${0.8 * thirdEyePulse})`;
    ctx.beginPath();
    ctx.arc(x + 20, y + 7, 0.8, 0, Math.PI * 2);
    ctx.fill();
    
    // Arms in meditation mudra (hands resting on knees)
    ctx.strokeStyle = '#deb887';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    
    // Left arm
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 20);
    ctx.lineTo(x + 10, y + 26);
    ctx.lineTo(x + 14, y + 30);
    ctx.stroke();
    
    // Right arm
    ctx.beginPath();
    ctx.moveTo(x + 28, y + 20);
    ctx.lineTo(x + 30, y + 26);
    ctx.lineTo(x + 26, y + 30);
    ctx.stroke();
    
    // Hands in meditation position (thumb and index finger touching - Gyan Mudra)
    ctx.fillStyle = '#deb887';
    ctx.beginPath();
    ctx.arc(x + 14, y + 30, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 26, y + 30, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Meditation symbols (Om-like symbols near hands)
    ctx.strokeStyle = '#daa520';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + 12, y + 28, 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 28, y + 28, 1.5, 0, Math.PI * 2);
    ctx.stroke();
    
    // Thrust effect - Flow of thought energy and cosmic particles
    if (thrustActive && isGameRunning) {
        // Thought waves flowing upward (representing accessing reservoir of intelligence)
        const wave1 = Math.sin(animationTime / 80) * 3;
        const wave2 = Math.sin(animationTime / 80 + Math.PI / 2) * 3;
        const wave3 = Math.sin(animationTime / 80 + Math.PI) * 3;
        
        // Energy streams (reservoir of energy and intelligence)
        ctx.strokeStyle = 'rgba(200, 150, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 20, y + 32);
        ctx.bezierCurveTo(x + 15 + wave1, y + 25, x + 12 + wave2, y + 18, x + 10, y + 10);
        ctx.stroke();
        
        ctx.strokeStyle = 'rgba(150, 200, 255, 0.5)';
        ctx.beginPath();
        ctx.moveTo(x + 20, y + 32);
        ctx.bezierCurveTo(x + 25 + wave2, y + 25, x + 28 + wave1, y + 18, x + 30, y + 10);
        ctx.stroke();
        
        // Cosmic particles (intelligence particles)
        ctx.fillStyle = '#ffd700';
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6 + animationTime / 100;
            const radius = 12 + Math.sin(animationTime / 50 + i) * 2;
            ctx.beginPath();
            ctx.arc(
                x + 20 + Math.cos(angle) * radius,
                y + 20 + Math.sin(angle) * radius,
                1.2,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
        
        // Transcendent symbols rising upward
        ctx.fillStyle = 'rgba(138, 43, 226, 0.4)';
        ctx.font = 'bold 8px serif';
        ctx.textAlign = 'center';
        const symbolY = (animationTime % 200) / 8;
        ctx.fillText('✧', x + 20, y - symbolY);
        ctx.fillText('✧', x + 15, y - symbolY + 10);
        ctx.fillText('✧', x + 25, y - symbolY + 10);
        
        // Inner light radiating outward (source of thought visualization)
        const innerGlow = Math.sin(animationTime / 60) * 0.4 + 0.6;
        ctx.fillStyle = `rgba(255, 255, 200, ${0.3 * innerGlow})`;
        ctx.beginPath();
        ctx.arc(x + 20, y + 20, 8 * innerGlow, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Register the character
if (window.characters) {
    window.characters['mountain-gnome'] = {
        name: 'Mountain Gnome',
        draw: drawMountainGnome,
        hitbox: {
            width: 32,
            height: 32,
            offsetX: 4,
            offsetY: 0
        }
    };
}
