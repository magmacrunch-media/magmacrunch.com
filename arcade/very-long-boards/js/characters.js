// ═══════════════════════════════════════════════
// Very Long Boards — Character Sprites
// Three variants of Carl Spatski
// ═══════════════════════════════════════════════

const characterSprites = {

    'office-carl': {
        draw(ctx, x, y, lean, frame) {
            const s = Math.sin(frame * 0.1) * 0.5;
            
            // Longboard
            ctx.save();
            ctx.translate(x + 16, y + 42);
            ctx.rotate(lean * 0.3);
            ctx.fillStyle = '#8B4513';
            ctx.beginPath();
            ctx.ellipse(0, 0, 14, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            // Wheels
            ctx.fillStyle = '#333';
            ctx.fillRect(-10, 2, 4, 3);
            ctx.fillRect(6, 2, 4, 3);
            ctx.restore();
            
            // Legs (dress pants)
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x + 13, y + 32);
            ctx.lineTo(x + 11 + s, y + 38);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 19, y + 32);
            ctx.lineTo(x + 21 - s, y + 38);
            ctx.stroke();
            
            // Shoes
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x + 9, y + 37, 5, 3);
            ctx.fillRect(x + 19, y + 37, 5, 3);
            
            // Body (dress shirt)
            ctx.fillStyle = '#4a90d9';
            ctx.fillRect(x + 11, y + 16, 10, 16);
            
            // Tie (loosened)
            ctx.fillStyle = '#c0392b';
            ctx.fillRect(x + 14, y + 16, 3, 12);
            ctx.fillRect(x + 13, y + 26, 5, 3);
            
            // Arms (holding briefcase)
            ctx.strokeStyle = '#f0d5a8';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            // Left arm
            ctx.beginPath();
            ctx.moveTo(x + 11, y + 18);
            ctx.lineTo(x + 6, y + 24);
            ctx.lineTo(x + 4, y + 28);
            ctx.stroke();
            // Right arm (holding briefcase)
            ctx.beginPath();
            ctx.moveTo(x + 21, y + 18);
            ctx.lineTo(x + 28, y + 22);
            ctx.stroke();
            
            // Briefcase
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(x + 26, y + 20, 8, 6);
            ctx.fillStyle = '#8d6e63';
            ctx.fillRect(x + 28, y + 21, 4, 2);
            
            // Head
            ctx.fillStyle = '#f0d5a8';
            ctx.beginPath();
            ctx.ellipse(x + 16, y + 10, 5, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Hair (neat, side-parted)
            ctx.fillStyle = '#5d4037';
            ctx.beginPath();
            ctx.arc(x + 16, y + 7, 5, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(x + 12, y + 5, 8, 3);
            
            // Glasses
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 12, y + 8, 4, 3);
            ctx.strokeRect(x + 17, y + 8, 4, 3);
            ctx.beginPath();
            ctx.moveTo(x + 16, y + 9);
            ctx.lineTo(x + 17, y + 9);
            ctx.stroke();
            
            // Neutral expression
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + 14, y + 14);
            ctx.lineTo(x + 18, y + 14);
            ctx.stroke();
        },
    },

    'party-carl': {
        draw(ctx, x, y, lean, frame) {
            const s = Math.sin(frame * 0.15) * 2;
            const wobble = Math.cos(frame * 0.12) * 1.5;
            
            // Longboard (neon)
            ctx.save();
            ctx.translate(x + 16, y + 40);
            ctx.rotate(lean * 0.4 + Math.sin(frame * 0.2) * 0.1);
            ctx.fillStyle = '#ffeb3b';
            ctx.beginPath();
            ctx.ellipse(0, 0, 14, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            // Stickers
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(-6, -1, 3, 2);
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(3, -1, 4, 2);
            ctx.restore();
            
            // Wheels (mismatched)
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(x + 2, y + 42, 4, 3);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(x + 26, y + 42, 4, 3);
            
            // Legs (orange pants, awkward stance)
            ctx.strokeStyle = '#ff4500';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x + 13, y + 30);
            ctx.lineTo(x + 10 + wobble, y + 36);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 19, y + 30);
            ctx.lineTo(x + 22 - wobble, y + 36);
            ctx.stroke();
            
            // Mismatched shoes
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.ellipse(x + 10, y + 37, 3, 2, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#00ff00';
            ctx.beginPath();
            ctx.ellipse(x + 22, y + 37, 3, 2, 0.3, 0, Math.PI * 2);
            ctx.fill();
            
            // Body (Hawaiian shirt)
            ctx.fillStyle = '#4169e1';
            ctx.fillRect(x + 11, y + 14, 10, 16);
            // Shirt pattern
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(x + 14, y + 17, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ff69b4';
            ctx.beginPath();
            ctx.arc(x + 18, y + 22, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#00ff00';
            ctx.beginPath();
            ctx.arc(x + 15, y + 25, 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Arms (flailing wildly)
            ctx.strokeStyle = '#f0d5a8';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x + 11, y + 16);
            ctx.lineTo(x + 4 + s, y + 10);
            ctx.lineTo(x + 2 + s, y + 14);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 21, y + 16);
            ctx.lineTo(x + 30 - s, y + 12);
            ctx.stroke();
            
            // Hands
            ctx.fillStyle = '#f0d5a8';
            ctx.beginPath();
            ctx.arc(x + 2 + s, y + 14, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + 30 - s, y + 12, 2.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Head (goofy proportions)
            ctx.fillStyle = '#f0d5a8';
            ctx.beginPath();
            ctx.ellipse(x + 16, y + 8, 6, 7, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Wild spiky hair
            ctx.fillStyle = '#8b4513';
            ctx.beginPath();
            ctx.arc(x + 16, y + 4, 6, Math.PI, Math.PI * 2);
            ctx.fill();
            // Spikes
            const spikes = [[-4, -3], [-1, -5], [2, -4], [5, -3], [7, -1]];
            spikes.forEach(([dx, dy]) => {
                ctx.beginPath();
                ctx.moveTo(x + 14 + dx, y + 4 + dy + 2);
                ctx.lineTo(x + 14 + dx, y + 4 + dy);
                ctx.lineTo(x + 16 + dx, y + 4 + dy + 2);
                ctx.fill();
            });
            
            // Headphones (hot pink)
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x + 16, y + 8, 8, -0.9, 0.9);
            ctx.stroke();
            ctx.fillStyle = '#ff00ff';
            ctx.beginPath();
            ctx.arc(x + 9, y + 8, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + 23, y + 8, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Wild eyes (googly, looking different directions)
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(x + 13, y + 8, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + 19, y + 9, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.arc(x + 12 + wobble, y + 7, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + 20 + wobble, y + 9, 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Big goofy grin
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(x + 16, y + 12, 4, 0.2, Math.PI - 0.2);
            ctx.stroke();
            
            // Buck teeth
            ctx.fillStyle = '#fff';
            ctx.fillRect(x + 15, y + 14, 1.5, 2);
            ctx.fillRect(x + 17, y + 14, 1.5, 2);
        },
    },

    'dark-carl': {
        draw(ctx, x, y, lean, frame) {
            const s = Math.sin(frame * 0.08) * 0.8;
            
            // Longboard (black chrome)
            ctx.save();
            ctx.translate(x + 16, y + 42);
            ctx.rotate(lean * 0.25);
            ctx.fillStyle = '#0f0f0f';
            ctx.beginPath();
            ctx.ellipse(0, 0, 14, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            // Purple accent line
            ctx.strokeStyle = '#7c3aed';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(10, 0);
            ctx.stroke();
            ctx.restore();
            
            // Wheels (dark)
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x + 2, y + 42, 4, 3);
            ctx.fillRect(x + 26, y + 42, 4, 3);
            
            // Legs (black pants)
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x + 13, y + 32);
            ctx.lineTo(x + 12 + s, y + 38);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 19, y + 32);
            ctx.lineTo(x + 20 - s, y + 38);
            ctx.stroke();
            
            // Shoes (black)
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(x + 10, y + 37, 5, 3);
            ctx.fillRect(x + 18, y + 37, 5, 3);
            
            // Body (black outfit)
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(x + 11, y + 15, 10, 17);
            // Purple accent stripe
            ctx.fillStyle = '#7c3aed';
            ctx.fillRect(x + 11, y + 15, 10, 2);
            
            // Arms (close to body, tense)
            ctx.strokeStyle = '#c9b896';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x + 11, y + 18);
            ctx.lineTo(x + 8, y + 26);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 21, y + 18);
            ctx.lineTo(x + 24, y + 26);
            ctx.stroke();
            
            // Hands (fists)
            ctx.fillStyle = '#c9b896';
            ctx.beginPath();
            ctx.arc(x + 8, y + 27, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + 24, y + 27, 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Head
            ctx.fillStyle = '#c9b896';
            ctx.beginPath();
            ctx.ellipse(x + 16, y + 9, 5, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Hair (slicked back, dark)
            ctx.fillStyle = '#1a1a2e';
            ctx.beginPath();
            ctx.arc(x + 16, y + 6, 5, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(x + 11, y + 4, 10, 3);
            
            // Sunglasses (dark, reflective)
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(x + 11, y + 7, 10, 4);
            // Lens reflection
            ctx.fillStyle = 'rgba(124, 58, 237, 0.4)';
            ctx.fillRect(x + 12, y + 8, 3, 2);
            ctx.fillRect(x + 17, y + 8, 3, 2);
            
            // Stoic expression (straight line mouth)
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + 14, y + 14);
            ctx.lineTo(x + 18, y + 14);
            ctx.stroke();
        },
    },
};
