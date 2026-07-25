// Updated Gangsta Beaver - more upright, with gun, hat, gold chain, purple shoes
function drawGangstaBeava(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // Beaver body (upright stance)
    ctx.fillStyle = '#654321';
    ctx.beginPath();
    ctx.ellipse(x + 20, y + 20, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Beaver head (on top of body)
    ctx.fillStyle = '#704829';
    ctx.beginPath();
    ctx.ellipse(x + 20, y + 8, 7, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Ears
    ctx.fillStyle = '#5a3a1f';
    ctx.beginPath();
    ctx.arc(x + 15, y + 5, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 25, y + 5, 2.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Flat-brim baseball cap (more streetwear style)
    ctx.fillStyle = '#8b6914';
    // Hat crown (rounded top)
    ctx.beginPath();
    ctx.ellipse(x + 20, y + 1, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Flat brim (rectangular, extending forward)
    ctx.fillStyle = '#a67c1a';
    ctx.beginPath();
    ctx.rect(x + 12, y + 4, 18, 2);
    ctx.fill();
    // Brim underside shadow
    ctx.fillStyle = '#6b5410';
    ctx.fillRect(x + 12, y + 5.5, 18, 0.5);
    
    // Snout/muzzle
    ctx.fillStyle = '#8b6644';
    ctx.beginPath();
    ctx.ellipse(x + 25, y + 10, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Nose
    ctx.fillStyle = '#2c2c2c';
    ctx.beginPath();
    ctx.arc(x + 27, y + 9, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Buck teeth (iconic beaver teeth)
    ctx.fillStyle = '#f5f5dc';
    ctx.fillRect(x + 25, y + 11, 1.5, 3);
    ctx.fillRect(x + 27, y + 11, 1.5, 3);
    
    // Eye
    ctx.fillStyle = '#2c2c2c';
    ctx.beginPath();
    ctx.arc(x + 22, y + 8, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Sunglasses (more rectangular, streetwear style)
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(20, 20, 40, 0.8)';
    // Left lens
    ctx.beginPath();
    ctx.rect(x + 18, y + 6.5, 4.5, 3);
    ctx.fill();
    ctx.stroke();
    // Right lens (partially visible)
    ctx.beginPath();
    ctx.rect(x + 22.5, y + 6.5, 3, 3);
    ctx.fill();
    ctx.stroke();
    // Bridge
    ctx.beginPath();
    ctx.moveTo(x + 22, y + 8);
    ctx.lineTo(x + 23, y + 8);
    ctx.stroke();
    
    // Gold chain around neck
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 20, y + 14, 5, -0.3, Math.PI + 0.3);
    ctx.stroke();
    
    // Chain pendant (large "B" for Beaver)
    ctx.fillStyle = '#ffd700';
    ctx.strokeStyle = '#cc9900';
    ctx.lineWidth = 0.5;
    // Pendant backing (circular)
    ctx.beginPath();
    ctx.arc(x + 20, y + 19, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Large "B" letter
    ctx.fillStyle = '#6b4dff'; // Purple B to match shoes
    ctx.font = 'bold 5px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('B', x + 20, y + 19);
    
    // Arms - one holding gun
    ctx.fillStyle = '#654321';
    // Left arm (down)
    ctx.beginPath();
    ctx.ellipse(x + 13, y + 18, 2.5, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Right arm (holding gun forward)
    ctx.beginPath();
    ctx.ellipse(x + 27, y + 16, 2.5, 5, -0.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Gun (pistol)
    ctx.fillStyle = '#2c2c2c';
    // Gun barrel
    ctx.fillRect(x + 30, y + 14, 8, 2);
    // Gun handle
    ctx.fillRect(x + 28, y + 16, 3, 5);
    // Gun trigger guard
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + 29, y + 18, 1.5, 0, Math.PI);
    ctx.stroke();
    
    // Legs (upright stance)
    ctx.fillStyle = '#654321';
    ctx.beginPath();
    ctx.ellipse(x + 16, y + 28, 3, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 24, y + 28, 3, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Tail (behind body, smaller since upright)
    ctx.fillStyle = '#4a3020';
    ctx.beginPath();
    ctx.ellipse(x + 12, y + 24, 6, 4, 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Tail texture (scales/pattern)
    ctx.strokeStyle = '#3a2010';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 9 + i * 2, y + 22);
        ctx.lineTo(x + 10 + i * 2, y + 25);
        ctx.stroke();
    }
    
    // Purple sneakers (gangsta style)
    ctx.fillStyle = '#6b4dff';
    ctx.beginPath();
    ctx.ellipse(x + 16, y + 34, 3.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 24, y + 34, 3.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Sneaker details (white stripes)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 14, y + 34);
    ctx.lineTo(x + 18, y + 34);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 22, y + 34);
    ctx.lineTo(x + 26, y + 34);
    ctx.stroke();
    
    // Thrust effect - smoke from gun or water splash
    if (thrustActive && isGameRunning) {
        // Muzzle flash from gun
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(x + 38, y + 15, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255, 200, 0, 0.5)';
        ctx.beginPath();
        ctx.moveTo(x + 38, y + 15);
        ctx.lineTo(x + 42, y + 13);
        ctx.lineTo(x + 42, y + 17);
        ctx.closePath();
        ctx.fill();
    }
}

// Register the character
if (window.characters) {
    window.characters['gangsta-beaver'] = {
        name: 'Gangsta Beava',
        draw: drawGangstaBeava,
        hitbox: {
            width: 40,
            height: 35,
            offsetX: 0,
            offsetY: 0
        }
    };
}