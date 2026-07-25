// DSPUM Balloon - Reference to "balloon" by Dino Spumoni
// Classic round red birthday balloon with three people in the basket (slowcore emo aesthetic)
function drawHotAirBalloon(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // Gentle float/sway animation
    const sway = Math.sin(animationTime / 500) * 0.5;
    const bob = Math.sin(animationTime / 300) * 0.3;
    
    // Classic BIRTHDAY BALLOON shape (slightly taller oval, not perfect circle)
    ctx.fillStyle = '#d32f2f'; // Deep red
    ctx.beginPath();
    ctx.ellipse(x + 20 + sway, y + 9 + bob, 13, 15, 0, 0, Math.PI * 2); // Taller oval!
    ctx.fill();
    
    // Balloon highlight (gives it that shiny latex/rubber look)
    ctx.fillStyle = 'rgba(255, 120, 120, 0.5)';
    ctx.beginPath();
    ctx.arc(x + 15 + sway, y + 6 + bob, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Darker shading on bottom right of balloon
    ctx.fillStyle = 'rgba(139, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(x + 23 + sway, y + 15 + bob, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Balloon outline
    ctx.strokeStyle = '#8b0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x + 20 + sway, y + 9 + bob, 13, 15, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Balloon knot/tie at bottom (pinched narrow part)
    ctx.fillStyle = '#a01010';
    ctx.beginPath();
    ctx.ellipse(x + 20 + sway, y + 24 + bob, 1.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8b0000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x + 20 + sway, y + 24 + bob, 1.5, 3, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // STRING from balloon knot to basket (long visible string!)
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 20 + sway, y + 27 + bob); // From knot
    // Slight curve in the string for realism
    ctx.quadraticCurveTo(
        x + 20 + sway * 2, y + 34 + bob, // Control point
        x + 20 + sway, y + 41 + bob  // To basket rim
    );
    ctx.stroke();
    
    // Basket (wicker brown, larger and clearer for 3 people)
    ctx.fillStyle = '#8b6914';
    ctx.fillRect(x + 10 + sway, y + 41 + bob, 20, 6);
    
    // Basket rim (darker)
    ctx.fillStyle = '#654321';
    ctx.fillRect(x + 10 + sway, y + 41 + bob, 20, 1);
    
    // Basket weave pattern
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 0.8;
    // Vertical lines
    for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 10 + i * 5 + sway, y + 41 + bob);
        ctx.lineTo(x + 10 + i * 5 + sway, y + 47 + bob);
        ctx.stroke();
    }
    
    // THREE PEOPLE in the basket (improved details!)
    const personY = y + 43 + bob;
    
    // PERSON 1 (LEFT) - Dark curly/messy hair, black shirt
    // Head
    ctx.fillStyle = '#f5ddc4'; // Skin tone
    ctx.beginPath();
    ctx.arc(x + 13 + sway, personY, 2.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Dark messy/curly hair (more volume!)
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(x + 13 + sway, personY - 1.5, 2.8, 2, 0, Math.PI, 0, true); // Top of head
    ctx.fill();
    // Curly bits sticking out
    ctx.beginPath();
    ctx.arc(x + 11 + sway, personY - 1.5, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 15 + sway, personY - 1.5, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 13 + sway, personY - 2.5, 1, 0, Math.PI * 2);
    ctx.fill();
    
    // Face details
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 12 + sway, personY - 0.5, 0.6, 0.6); // Left eye
    ctx.fillRect(x + 13.8 + sway, personY - 0.5, 0.6, 0.6); // Right eye
    // Small smile
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(x + 13 + sway, personY + 0.5, 0.8, 0.2, Math.PI - 0.2);
    ctx.stroke();
    
    // Black shirt (maybe with text hint)
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 11 + sway, personY + 2, 4, 2.5);
    // White text suggestion
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 11.5 + sway, personY + 2.5, 3, 0.5);
    ctx.fillRect(x + 11.5 + sway, personY + 3.2, 3, 0.5);
    
    // PERSON 2 (CENTER) - Brown hair with bangs, dark outfit, BLUE LIPSTICK
    // Head
    ctx.fillStyle = '#f5ddc4';
    ctx.beginPath();
    ctx.arc(x + 20 + sway, personY, 2.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Brown hair with bangs
    ctx.fillStyle = '#6b4423';
    ctx.beginPath();
    ctx.ellipse(x + 20 + sway, personY - 1.5, 2.8, 2, 0, Math.PI, 0, true);
    ctx.fill();
    // Bangs hanging down
    ctx.fillRect(x + 17.5 + sway, personY - 2, 5, 1.5);
    
    // Eyes with eyeliner vibe
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 18.8 + sway, personY - 0.5, 0.7, 0.7);
    ctx.fillRect(x + 20.5 + sway, personY - 0.5, 0.7, 0.7);
    // Eyeliner wings
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + 18.5 + sway, personY - 0.5);
    ctx.lineTo(x + 18 + sway, personY - 0.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 21.5 + sway, personY - 0.5);
    ctx.lineTo(x + 22 + sway, personY - 0.8);
    ctx.stroke();
    
    // BLUE LIPSTICK (signature!)
    ctx.fillStyle = '#4169e1';
    ctx.beginPath();
    ctx.ellipse(x + 20 + sway, personY + 1, 1.2, 0.7, 0, 0, Math.PI);
    ctx.fill();
    // Lip shine
    ctx.fillStyle = 'rgba(200, 220, 255, 0.5)';
    ctx.beginPath();
    ctx.ellipse(x + 20 + sway, personY + 0.8, 0.8, 0.3, 0, 0, Math.PI);
    ctx.fill();
    
    // Black outfit
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + 18 + sway, personY + 2, 4, 2.5);
    
    // PERSON 3 (RIGHT) - Long dark hair, colorful jacket, big smile
    // Head
    ctx.fillStyle = '#f5ddc4';
    ctx.beginPath();
    ctx.arc(x + 27 + sway, personY, 2.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Long dark hair
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.ellipse(x + 27 + sway, personY - 1.5, 2.8, 2, 0, Math.PI, 0, true);
    ctx.fill();
    // Long hair flowing down both sides
    ctx.fillRect(x + 24 + sway, personY - 1, 1.2, 3.5);
    ctx.fillRect(x + 28.8 + sway, personY - 1, 1.2, 3.5);
    
    // Eyes
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 25.8 + sway, personY - 0.5, 0.6, 0.6);
    ctx.fillRect(x + 27.6 + sway, personY - 0.5, 0.6, 0.6);
    
    // Big happy smile
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(x + 27 + sway, personY + 0.7, 1.2, 0.1, Math.PI - 0.1);
    ctx.stroke();
    
    // Colorful blue/purple jacket with pattern
    ctx.fillStyle = '#5a7fa8';
    ctx.fillRect(x + 25 + sway, personY + 2, 4, 2.5);
    // Pink/purple accent stripe
    ctx.fillStyle = '#e574bc';
    ctx.fillRect(x + 26.2 + sway, personY + 2, 0.8, 2.5);
    // Another accent
    ctx.fillStyle = '#8a9fff';
    ctx.fillRect(x + 27.5 + sway, personY + 2, 0.8, 2.5);
    
    // Burner flame when thrusting (appears below basket)
    if (thrustActive && isGameRunning) {
        // Muted flame colors
        ctx.fillStyle = 'rgba(243, 156, 18, 0.7)';
        ctx.beginPath();
        ctx.moveTo(x + 17 + sway, y + 41 + bob);
        ctx.lineTo(x + 20 + sway, y + 37 + bob);
        ctx.lineTo(x + 23 + sway, y + 41 + bob);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = 'rgba(231, 76, 60, 0.6)';
        ctx.beginPath();
        ctx.moveTo(x + 18 + sway, y + 41 + bob);
        ctx.lineTo(x + 20 + sway, y + 39 + bob);
        ctx.lineTo(x + 22 + sway, y + 41 + bob);
        ctx.closePath();
        ctx.fill();
    }
}

// Register the character
if (window.characters) {
    window.characters['dspum-balloon'] = {
        name: 'dspum balloon',
        draw: drawHotAirBalloon,
        hitbox: {
            width: 30,
            height: 38,
            offsetX: 5,
            offsetY: -3
        }        
    };
}
