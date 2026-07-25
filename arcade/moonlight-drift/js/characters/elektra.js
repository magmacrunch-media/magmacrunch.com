// Elektra - Cool poetry chick orange with round sunglasses
// Beatnik/bohemian vibes, artsy and laid-back
function drawElektra(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    // Color palette - electric orange colors
    const colors = {
        orangeBase: '#ff6f00',
        orangeLight: '#ff8f00',
        orangeHighlight: '#ffa726',
        orangeDark: '#e65100',
        orangeShadow: '#bf360c',
        sunglassesFrame: '#2c2c2c',
        sunglassesLens: 'rgba(40, 40, 80, 0.7)',
        sunglassesReflection: 'rgba(200, 200, 255, 0.3)',
        stem: '#8d6e63',
        lipColor: '#d84315',
        turtleneckBlack: '#1a1a1a',
        leaf: '#558b2f'
    };
    
    // Orange body (side view - slightly oval, facing right)
    ctx.fillStyle = colors.orangeBase;
    ctx.beginPath();
    ctx.ellipse(x + 20, y + 18, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Side highlight
    ctx.fillStyle = colors.orangeLight;
    ctx.beginPath();
    ctx.arc(x + 22, y + 16, 2.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Shadow on bottom
    ctx.fillStyle = colors.orangeDark;
    ctx.beginPath();
    ctx.arc(x + 19, y + 22, 6, 0, Math.PI);
    ctx.fill();
    
    // Stem (side angle)
    ctx.fillStyle = colors.stem;
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 9);
    ctx.lineTo(x + 22, y + 6);
    ctx.lineTo(x + 23, y + 7);
    ctx.lineTo(x + 21, y + 10);
    ctx.closePath();
    ctx.fill();
    
    // Small leaf on stem
    ctx.fillStyle = colors.leaf;
    ctx.beginPath();
    ctx.ellipse(x + 22, y + 7, 2, 1, 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Round sunglasses (side view - one lens visible)
    ctx.fillStyle = colors.sunglassesLens;
    ctx.beginPath();
    ctx.arc(x + 21, y + 16, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Frame
    ctx.strokeStyle = colors.sunglassesFrame;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + 21, y + 16, 3, 0, Math.PI * 2);
    ctx.stroke();
    
    // Temple extending back
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 24, y + 16);
    ctx.lineTo(x + 13, y + 16);
    ctx.stroke();
    
    // Lens reflection
    ctx.fillStyle = colors.sunglassesReflection;
    ctx.beginPath();
    ctx.arc(x + 20, y + 15, 1, 0, Math.PI * 2);
    ctx.fill();
    
    // Smile (side view)
    ctx.strokeStyle = colors.lipColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + 24, y + 20, 2, -0.3, 0.8);
    ctx.stroke();
    
    // Black turtleneck (side view)
    ctx.fillStyle = colors.turtleneckBlack;
    ctx.fillRect(x + 14, y + 26, 12, 4);
    ctx.fillRect(x + 15, y + 30, 10, 2);
    
    // Legs (side view)
    ctx.strokeStyle = colors.orangeShadow;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    // Front leg
    ctx.beginPath();
    ctx.moveTo(x + 23, y + 32);
    ctx.lineTo(x + 22, y + 38);
    ctx.stroke();
    
    // Back leg
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 32);
    ctx.lineTo(x + 16, y + 38);
    ctx.stroke();
    
    // Thrust effect - Poetry vibes! Words and creative energy
    if (thrustActive && isGameRunning) {
        // Poetic words flowing downward (beatnik style)
        ctx.fillStyle = 'rgba(255, 111, 0, 0.5)';
        ctx.font = 'italic bold 8px serif';
        ctx.textAlign = 'center';
        
        const words = ['cool', 'dig', 'jazz', 'vibe', 'free'];
        const wordIndex = Math.floor(animationTime / 100) % words.length;
        const yOffset = (animationTime % 100) / 4;
        
        ctx.fillText(words[wordIndex], x + 20, y + 40 + yOffset);
        
        // Artistic sparkles/creative energy
        ctx.fillStyle = 'rgba(255, 167, 38, 0.6)';
        for (let i = 0; i < 3; i++) {
            const sparkleX = x + 20 + Math.cos(animationTime / 50 + i * 2) * 12;
            const sparkleY = y + 30 + Math.sin(animationTime / 50 + i * 2) * 8;
            ctx.beginPath();
            ctx.arc(sparkleX, sparkleY, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Smoky creative aura
        const pulse = Math.sin(animationTime / 80) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255, 143, 0, ${0.15 * pulse})`;
        ctx.beginPath();
        ctx.arc(x + 20, y + 20, 18 + pulse * 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Register the character
if (window.characters) {
    window.characters['elektra'] = {
        name: 'Elektra',
        draw: drawElektra,
        hitbox: {
            width: 38,
            height: 38,
            offsetX: 1,
            offsetY: 0
        }
    };
}
