// Vinny Bobarino - Post-rock musician with tennis racket/bass hybrid
function drawVinnyBobarino(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // Tennis racket as bass guitar (held like an instrument)
    // Racket frame (thick, clear oval)
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(x + 32, y + 20, 7, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner frame
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#34495e';
    ctx.beginPath();
    ctx.ellipse(x + 32, y + 20, 6, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Tennis racket strings (grid pattern)
    ctx.strokeStyle = '#ecf0f1';
    ctx.lineWidth = 0.6;
    // Vertical strings
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 27 + i * 2.5, y + 13);
        ctx.lineTo(x + 27 + i * 2.5, y + 27);
        ctx.stroke();
    }
    // Horizontal strings
    for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 26, y + 13 + i * 2);
        ctx.lineTo(x + 38, y + 13 + i * 2);
        ctx.stroke();
    }
    
    // Racket handle (long, tapered)
    ctx.fillStyle = '#cd853f';
    ctx.beginPath();
    ctx.moveTo(x + 32, y + 29);
    ctx.lineTo(x + 30, y + 29);
    ctx.lineTo(x + 11, y + 24);
    ctx.lineTo(x + 11, y + 22);
    ctx.lineTo(x + 30, y + 27);
    ctx.lineTo(x + 32, y + 27);
    ctx.closePath();
    ctx.fill();
    
    // Handle grip wrap
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 12 + i * 2.2, y + 22.3);
        ctx.lineTo(x + 13 + i * 2.2, y + 23.7);
        ctx.stroke();
    }
    
    // Handle end cap/butt
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.ellipse(x + 11, y + 23, 1.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body (wearing shirt that says "SALEM HIGH TENNIS")
    ctx.fillStyle = '#27ae60'; // Tennis court green
    ctx.beginPath();
    ctx.rect(x + 14, y + 14, 14, 15);
    ctx.fill();
    
    // "SALEM" text on shirt
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 4px Arial';
    ctx.fillText('SALEM', x + 16, y + 20);
    
    // "HIGH" text
    ctx.fillText('HIGH', x + 17, y + 24);
    
    // Tennis ball logo on shirt
    ctx.fillStyle = '#e8f442';
    ctx.beginPath();
    ctx.arc(x + 21, y + 26, 2, 0, Math.PI * 2);
    ctx.fill();
    // Tennis ball curve lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(x + 21, y + 26, 1.5, 0.5, Math.PI - 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 21, y + 26, 1.5, Math.PI + 0.5, Math.PI * 2 - 0.5);
    ctx.stroke();
    
    // Head (chill expression)
    ctx.fillStyle = '#f4d5b5';
    ctx.beginPath();
    ctx.arc(x + 21, y + 8, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Shaggy indie hair (2000s style)
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.arc(x + 21, y + 6, 6.5, Math.PI, Math.PI * 2);
    ctx.fill();
    // Side-swept bangs
    ctx.beginPath();
    ctx.ellipse(x + 24, y + 6, 4, 3, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 18, y + 7, 3, 2.5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Wristband (tennis player style)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 10, y + 21, 2, 3);
    
    // Eyes (half-closed, zoned out)
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + 19, y + 8, 1.5, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 23, y + 8, 1.5, 0, Math.PI);
    ctx.stroke();
    
    // Slight smile (content, jamming)
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + 21, y + 11, 2, 0.2, Math.PI - 0.2);
    ctx.stroke();
    
    // Nose
    ctx.beginPath();
    ctx.moveTo(x + 21, y + 9);
    ctx.lineTo(x + 21, y + 10);
    ctx.stroke();
    
    // Arms
    ctx.strokeStyle = '#f4d5b5';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    
    // Left arm (holding handle)
    ctx.beginPath();
    ctx.moveTo(x + 14, y + 16);
    ctx.lineTo(x + 11, y + 19);
    ctx.lineTo(x + 11, y + 22);
    ctx.stroke();
    
    // Right arm (strumming/hitting the strings on racket)
    const strumMotion = thrustActive && isGameRunning ? Math.sin(animationTime / 80) * 2 : 0;
    ctx.beginPath();
    ctx.moveTo(x + 28, y + 16);
    ctx.lineTo(x + 33, y + 17 + strumMotion);
    ctx.lineTo(x + 34, y + 20 + strumMotion);
    ctx.stroke();
    
    // Hands
    ctx.fillStyle = '#f4d5b5';
    ctx.beginPath();
    ctx.arc(x + 11, y + 22, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 34, y + 20 + strumMotion, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Tennis shorts
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 16, y + 29, 10, 5);
    
    // Legs
    ctx.strokeStyle = '#f4d5b5';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 34);
    ctx.lineTo(x + 17, y + 36);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 24, y + 34);
    ctx.lineTo(x + 25, y + 36);
    ctx.stroke();
    
    // Tennis shoes (white)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x + 17, y + 37, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 25, y + 37, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Shoe swoosh/stripes
    ctx.strokeStyle = '#27ae60';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 15, y + 37);
    ctx.quadraticCurveTo(x + 17, y + 36, x + 19, y + 37);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 23, y + 37);
    ctx.quadraticCurveTo(x + 25, y + 36, x + 27, y + 37);
    ctx.stroke();
    
    // Tennis ball tucked in waistband
    ctx.fillStyle = '#e8f442';
    ctx.beginPath();
    ctx.arc(x + 27, y + 30, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(x + 27, y + 30, 1.5, 0.5, Math.PI - 0.5);
    ctx.stroke();
    
    // Thrust effect - post-rock ambient waves + tennis ball bounce trails
    if (thrustActive && isGameRunning) {
        // Ethereal reverb waves
        const pulse = Math.sin(animationTime / 150);
        
        ctx.strokeStyle = `rgba(39, 174, 96, ${0.25 + pulse * 0.1})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(x + 32, y + 20, 12 + i * 8 + pulse * 3, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Bouncing tennis balls (trailing)
        ctx.fillStyle = 'rgba(232, 244, 66, 0.5)';
        for (let i = 0; i < 3; i++) {
            const bounce = Math.abs(Math.sin(animationTime / 100 + i * 0.8)) * 4;
            ctx.beginPath();
            ctx.arc(x - 8 - i * 6, y + 20 - bounce, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Delay/echo effect lines
        ctx.strokeStyle = 'rgba(39, 174, 96, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(x - 5 - i * 4, y + 15);
            ctx.lineTo(x - 10 - i * 4, y + 15);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x - 5 - i * 4, y + 25);
            ctx.lineTo(x - 10 - i * 4, y + 25);
            ctx.stroke();
        }
        
        // "we practice about a few times a year"
        ctx.fillStyle = 'rgba(149, 165, 166, 0.4)';
        ctx.font = 'italic 6px Arial';
        ctx.fillText('~jam~', x - 15, y + 20);
    }
}

// Register the character
if (window.characters) {
    window.characters['vinny-bobarino'] = {
        name: 'Vinny Bobarino',
        draw: drawVinnyBobarino,
        hitbox: {
            width: 35,
            height: 35,
            offsetX: 15,
            offsetY: 0
        }
    };
}