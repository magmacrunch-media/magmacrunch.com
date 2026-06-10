// Juanito Thompson - Mind Satellite theme (abstract, spacey, contemplative)
function drawJuanitoThompson(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // === FIGURE (simple, contemplative) ===
    
    // Legs (standing, grounded)
    ctx.strokeStyle = '#34495e';
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
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.ellipse(x + 17, y + 36, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 23, y + 36, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body (simple hoodie)
    ctx.fillStyle = '#2c3e50'; // Dark blue/gray
    ctx.beginPath();
    ctx.rect(x + 14, y + 14, 12, 14);
    ctx.fill();
    
    // Hood
    ctx.fillStyle = '#1a252f';
    ctx.beginPath();
    ctx.arc(x + 20, y + 8, 7, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();
    
    // Head (tilted slightly down, contemplative)
    ctx.fillStyle = '#f4d5b5';
    ctx.beginPath();
    ctx.arc(x + 20, y + 10, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes closed (deep in thought/meditation)
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + 18, y + 10, 1.5, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 22, y + 10, 1.5, 0, Math.PI);
    ctx.stroke();
    
    // Nose
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 11);
    ctx.lineTo(x + 20, y + 12);
    ctx.stroke();
    
    // Slight peaceful expression
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 13);
    ctx.lineTo(x + 22, y + 13);
    ctx.stroke();
    
    // Arms at sides, relaxed
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 14, y + 18);
    ctx.lineTo(x + 12, y + 24);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 26, y + 18);
    ctx.lineTo(x + 28, y + 24);
    ctx.stroke();
    
    // Hands
    ctx.fillStyle = '#f4d5b5';
    ctx.beginPath();
    ctx.arc(x + 12, y + 24, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 28, y + 24, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // === MIND SATELLITE (orbiting around head) ===
    
    // Orbital path (faint circle around head)
    const orbitRadius = 12;
    ctx.strokeStyle = 'rgba(52, 152, 219, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.arc(x + 20, y + 10, orbitRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Satellite position (orbits around head)
    const orbitSpeed = animationTime / 2000;
    const satelliteX = x + 20 + Math.cos(orbitSpeed) * orbitRadius;
    const satelliteY = y + 10 + Math.sin(orbitSpeed) * orbitRadius;
    
    // Satellite body (small, geometric)
    ctx.save();
    ctx.translate(satelliteX, satelliteY);
    ctx.rotate(orbitSpeed);
    
    // Main satellite body
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(-2, -1.5, 4, 3);
    
    // Solar panels
    ctx.fillStyle = '#3498db';
    ctx.fillRect(-4, -1, 2, 2);
    ctx.fillRect(2, -1, 2, 2);
    
    // Antenna
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -1.5);
    ctx.lineTo(0, -3.5);
    ctx.stroke();
    
    // Antenna tip (blinking light)
    if (Math.sin(animationTime / 200) > 0) {
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(0, -3.5, 0.8, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
    
    // === AMBIENT SPACE THOUGHTS ===
    
    // Floating thought particles (ambient, drifting)
    for (let i = 0; i < 6; i++) {
        const angle = (animationTime / 1500 + i * Math.PI / 3) % (Math.PI * 2);
        const distance = 16 + Math.sin(animationTime / 800 + i) * 3;
        const particleX = x + 20 + Math.cos(angle) * distance;
        const particleY = y + 10 + Math.sin(angle) * distance;
        const opacity = 0.2 + Math.abs(Math.sin(animationTime / 600 + i)) * 0.3;
        
        ctx.fillStyle = `rgba(52, 152, 219, ${opacity})`;
        ctx.beginPath();
        ctx.arc(particleX, particleY, 0.8, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Constellation lines (connecting thoughts)
    ctx.strokeStyle = 'rgba(52, 152, 219, 0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
        const angle1 = (animationTime / 1500 + i * Math.PI / 1.5) % (Math.PI * 2);
        const angle2 = (animationTime / 1500 + (i + 1) * Math.PI / 1.5) % (Math.PI * 2);
        const distance = 16;
        
        ctx.beginPath();
        ctx.moveTo(
            x + 20 + Math.cos(angle1) * distance,
            y + 10 + Math.sin(angle1) * distance
        );
        ctx.lineTo(
            x + 20 + Math.cos(angle2) * distance,
            y + 10 + Math.sin(angle2) * distance
        );
        ctx.stroke();
    }
    
    // Thrust effect - expansive cosmic waves
    if (thrustActive && isGameRunning) {
        const pulse = Math.sin(animationTime / 250);
        
        // Cosmic ripples emanating from mind
        ctx.strokeStyle = `rgba(41, 128, 185, ${0.15 + pulse * 0.08})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(x + 20, y + 10, 18 + i * 8 + pulse * 3, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Signal waves trailing behind (like radio waves)
        ctx.strokeStyle = 'rgba(52, 152, 219, 0.2)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
            const waveY = y + 15 + Math.sin(animationTime / 100 + i * 0.5) * 3;
            ctx.beginPath();
            ctx.moveTo(x - 8 - i * 6, waveY);
            ctx.lineTo(x - 13 - i * 6, waveY);
            ctx.stroke();
        }
        
        // Stars/distant signals appearing
        for (let i = 0; i < 4; i++) {
            const starX = x - 10 - i * 8;
            const starY = y + 8 + Math.sin(animationTime / 120 + i) * 5;
            const twinkle = Math.abs(Math.sin(animationTime / 150 + i * 0.7));
            
            ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.4})`;
            ctx.beginPath();
            ctx.arc(starX, starY, 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Satellite signal beam (occasional)
        if (Math.sin(animationTime / 300) > 0.7) {
            ctx.strokeStyle = 'rgba(52, 152, 219, 0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(satelliteX, satelliteY);
            ctx.lineTo(x + 20, y + 10);
            ctx.stroke();
        }
        
        // Cosmic text
        ctx.fillStyle = 'rgba(52, 152, 219, 0.25)';
        ctx.font = 'italic 7px Arial';
        ctx.fillText('orbit', x - 22, y + 12);
    }
}

// Register the character
if (window.characters) {
    window.characters['juanito-thompson'] = {
        name: 'Juanito Thompson',
        draw: drawJuanitoThompson,
        hitbox: {
            width: 40,
            height: 35,
            offsetX: 0,
            offsetY: 0
        }
    };
}