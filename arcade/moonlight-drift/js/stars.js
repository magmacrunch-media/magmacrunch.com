// Stars module - SUPER CHUNKY SNES-STYLE PIXEL STARS for gameplay canvas
// These will be VERY visible and retro-looking!

let stars = [];

// SNES-style LIMITED color palette - high contrast!
const SNES_STAR_COLORS = [
    '#ffffff', // Bright white (most common)
    '#ffffff', // Bright white (increased frequency)
    '#ffffff', // Bright white (increased frequency)
    '#e0e0ff', // Very light blue-white
    '#ffe0e0', // Very light pink-white
    '#00d4ff', // Cyan accent (matches your UI)
    '#ffd700', // Gold accent
];

// Chunky pixel star patterns
const STAR_PATTERNS = {
    // Single pixel (rare, distant)
    'dot': (ctx, x, y, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
    },
    
    // 2x2 square (common)
    'square': (ctx, x, y, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 2, 2);
    },
    
    // 3x3 square (medium bright)
    'square3': (ctx, x, y, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 3, 3);
    },
    
    // Plus/cross shape (classic SNES star)
    'plus': (ctx, x, y, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(x + 1, y, 1, 3);     // Vertical
        ctx.fillRect(x, y + 1, 3, 1);     // Horizontal
    },
    
    // Large plus
    'plus5': (ctx, x, y, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(x + 2, y, 1, 5);     // Vertical
        ctx.fillRect(x, y + 2, 5, 1);     // Horizontal
    },
    
    // Diamond shape
    'diamond': (ctx, x, y, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(x + 2, y, 1, 1);     // Top
        ctx.fillRect(x + 1, y + 1, 3, 1); // Upper middle
        ctx.fillRect(x, y + 2, 5, 1);     // Wide middle
        ctx.fillRect(x + 1, y + 3, 3, 1); // Lower middle
        ctx.fillRect(x + 2, y + 4, 1, 1); // Bottom
    },
    
    // 8-point star (brightest!)
    'star8': (ctx, x, y, color) => {
        ctx.fillStyle = color;
        // Center
        ctx.fillRect(x + 2, y + 2, 2, 2);
        // 4 main points
        ctx.fillRect(x + 2, y, 2, 1);     // Top
        ctx.fillRect(x + 2, y + 5, 2, 1); // Bottom
        ctx.fillRect(x, y + 2, 1, 2);     // Left
        ctx.fillRect(x + 5, y + 2, 1, 2); // Right
        // 4 diagonal points
        ctx.fillRect(x + 1, y + 1, 1, 1); // Top-left
        ctx.fillRect(x + 4, y + 1, 1, 1); // Top-right
        ctx.fillRect(x + 1, y + 4, 1, 1); // Bottom-left
        ctx.fillRect(x + 4, y + 4, 1, 1); // Bottom-right
    }
};

function createStars(canvasWidth, canvasHeight) {
    stars = [];
    
    // Create variety of stars with different sizes and behaviors
    const patterns = Object.keys(STAR_PATTERNS);
    
    for (let i = 0; i < 60; i++) { // 60 stars - not too many, not too few
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        
        // Weight towards white stars for better visibility
        const colorIndex = Math.floor(Math.random() * SNES_STAR_COLORS.length);
        
        stars.push({
            x: Math.random() * canvasWidth,
            y: Math.random() * canvasHeight,
            pattern: pattern,
            color: SNES_STAR_COLORS[colorIndex],
            
            // Frame-based blinking (not smooth!)
            blinkFrame: Math.floor(Math.random() * 4), // 0-3
            blinkSpeed: Math.floor(Math.random() * 40) + 30, // 30-70 frames between blinks
            frameCounter: 0,
            visible: true,
            
            // Some stars pulse between two brightness levels
            pulseState: 0, // 0 = dim, 1 = bright
            isPulsing: Math.random() < 0.3 // 30% of stars pulse
        });
    }
}

function drawStars(ctx) {
    // CRITICAL: Disable anti-aliasing for pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;
    
    stars.forEach(star => {
        // Frame-based animation (SNES-style stepwise, not smooth)
        star.frameCounter++;
        
        if (star.frameCounter >= star.blinkSpeed) {
            star.frameCounter = 0;
            star.blinkFrame = (star.blinkFrame + 1) % 4;
            
            // Blinking pattern: visible for 3 frames, off for 1
            if (star.blinkFrame === 3) {
                star.visible = false;
            } else {
                star.visible = true;
                
                // Update pulse state
                if (star.isPulsing && star.blinkFrame === 0) {
                    star.pulseState = (star.pulseState + 1) % 2;
                }
            }
        }
        
        if (!star.visible) return;
        
        // Snap to integer pixel positions for crisp edges
        const x = Math.floor(star.x);
        const y = Math.floor(star.y);
        
        // Adjust color brightness based on pulse state
        let color = star.color;
        if (star.isPulsing && star.pulseState === 0) {
            // Dim version - add transparency
            color = star.color + '88'; // Add 50% alpha in hex
        }
        
        // Draw the star using its pattern
        const drawFunc = STAR_PATTERNS[star.pattern];
        if (drawFunc) {
            drawFunc(ctx, x, y, color);
        }
    });
    
    // Re-enable smoothing for other game elements
    ctx.imageSmoothingEnabled = true;
}

function initializeStarLayers() {
    // ASCII art background stars (outside gameplay canvas)
    for (let i = 1; i <= 15; i++) {
        const layer = document.getElementById(`starLayer${i}`);
        if (layer) {
            layer.textContent = STAR_CONTENT;
        }
    }
}

/* ================================================
   OPTIONAL: SHOOTING STARS FOR EXTRA SNES FLAIR
   ================================================ */

let shootingStars = [];

// Call this from your game loop occasionally for shooting stars
function updateShootingStars(canvasWidth, canvasHeight) {
    // Very rare shooting stars
    if (Math.random() < 0.003) { // 0.3% chance per frame
        shootingStars.push({
            x: canvasWidth + 10,
            y: Math.random() * (canvasHeight * 0.6), // Top 60% of screen
            vx: -6 - Math.random() * 3, // Fast horizontal
            vy: 1 + Math.random() * 2,  // Slight downward
            length: 8,
            life: 40, // Frames
            color: Math.random() < 0.5 ? '#ffffff' : '#00d4ff'
        });
    }
}

function drawShootingStars(ctx) {
    ctx.imageSmoothingEnabled = false;
    
    shootingStars = shootingStars.filter(star => {
        star.x += star.vx;
        star.y += star.vy;
        star.life--;
        
        if (star.life <= 0 || star.x < -20) return false;
        
        // Draw chunky pixel trail
        for (let i = 0; i < star.length; i++) {
            const trailX = Math.floor(star.x + i * 2);
            const trailY = Math.floor(star.y + i * 0.4);
            const alpha = Math.floor((1 - i / star.length) * 255).toString(16).padStart(2, '0');
            
            if (parseInt(alpha, 16) > 50) {
                ctx.fillStyle = star.color + alpha;
                ctx.fillRect(trailX, trailY, 2, 2); // 2x2 pixel chunks
                
                // Add glow on bright parts
                if (i < 3) {
                    ctx.fillStyle = star.color + '44'; // 25% alpha
                    ctx.fillRect(trailX - 1, trailY, 1, 2);
                    ctx.fillRect(trailX + 2, trailY, 1, 2);
                }
            }
        }
        
        return true;
    });
    
    ctx.imageSmoothingEnabled = true;
}

/* ================================================
   INTEGRATION INSTRUCTIONS
   ================================================
   
   Your renderer.js already calls drawStars(ctx), so this will
   automatically work when you replace stars.js!
   
   OPTIONAL: For shooting stars, add to your game loop in main.js:
   
   In the gameLoop() function, after drawStars(ctx):
   
   if (gameRunning) {
       updateShootingStars(canvas.width, canvas.height);
       drawShootingStars(ctx);
   }
   
   This will give you occasional dramatic shooting stars!
   
   ================================================ */
