// Original cat on synth drawing function (moved from player.js)
function drawCatSynth(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // Draw synthesizer body
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(x, y + 18, 40, 12);
    
    // Draw synth details (control panel)
    ctx.fillStyle = '#34495e';
    ctx.fillRect(x + 2, y + 20, 10, 3);
    
    // Draw knobs
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(x + 4, y + 22, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 8, y + 22, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw piano keys
    ctx.fillStyle = '#ecf0f1';
    for (let i = 0; i < 6; i++) {
        ctx.fillRect(x + 14 + i * 4, y + 23, 3, 6);
    }
    
    // Draw black keys
    ctx.fillStyle = '#2c3e50';
    for (let i = 0; i < 5; i++) {
        if (i !== 2) {
            ctx.fillRect(x + 16 + i * 4, y + 23, 2, 4);
        }
    }
    
    // Draw cat body
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.ellipse(x + 20, y + 12, 8, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw cat head
    ctx.beginPath();
    ctx.arc(x + 20, y + 5, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw cat ears
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 3);
    ctx.lineTo(x + 14, y - 1);
    ctx.lineTo(x + 17, y + 1);
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(x + 24, y + 3);
    ctx.lineTo(x + 26, y - 1);
    ctx.lineTo(x + 23, y + 1);
    ctx.fill();
    
    // Inner ear pink
    ctx.fillStyle = '#e91e63';
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 2);
    ctx.lineTo(x + 15, y);
    ctx.lineTo(x + 17, y + 1);
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(x + 24, y + 2);
    ctx.lineTo(x + 25, y);
    ctx.lineTo(x + 23, y + 1);
    ctx.fill();
    
    // Draw cat eyes
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(x + 18, y + 5, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 22, y + 5, 1, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw cat nose
    ctx.fillStyle = '#e91e63';
    ctx.beginPath();
    ctx.arc(x + 20, y + 7, 1, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw cat paws on keys
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.ellipse(x + 16, y + 16, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 24, y + 16, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw tail
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 27, y + 14);
    ctx.quadraticCurveTo(x + 32, y + 10, x + 35, y + 8);
    ctx.stroke();
    
    // Tail tip
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.arc(x + 35, y + 8, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw thrust flame
    if (thrustActive && isGameRunning) {
        ctx.fillStyle = '#00d4ff';
        ctx.beginPath();
        ctx.moveTo(x + 15, y + 30);
        ctx.lineTo(x + 20, y + 42);
        ctx.lineTo(x + 25, y + 30);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(x + 17, y + 30);
        ctx.lineTo(x + 20, y + 38);
        ctx.lineTo(x + 23, y + 30);
        ctx.fill();
    }
}

// Register the character
if (window.characters) {
    window.characters['cat-synth'] = {
        name: 'Synth Cat',
        draw: drawCatSynth,
        hitbox: {
            width: 42,
            height: 30,
            offsetX: -1,
            offsetY: 18
        }        
    };
}