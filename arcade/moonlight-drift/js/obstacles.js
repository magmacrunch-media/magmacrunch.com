// Obstacles module - handles obstacle generation, movement, and collision detection

let obstacles = [];
let obstacleCount = 0;

// Color generation helpers
function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

// Generate a random color palette
function generateRandomTheme() {
    // Pick a random base hue (0-360)
    const baseHue = Math.floor(Math.random() * 360);
    
    // Pick random saturation and lightness ranges for variety
    const baseSaturation = 40 + Math.floor(Math.random() * 40); // 40-80%
    const baseLightness = 30 + Math.floor(Math.random() * 30);  // 30-60%
    
    // Create harmonious colors using the base hue
    const primary = hslToHex(baseHue, baseSaturation, baseLightness);
    const secondary = hslToHex(baseHue, baseSaturation + 10, baseLightness - 10);
    const accent = hslToHex(baseHue, baseSaturation - 10, baseLightness + 20);
    
    // Generate a descriptive name based on hue
    const themeNames = [
        ['Crimson', 'Ruby', 'Scarlet', 'Rose'],           // Red (0-30)
        ['Amber', 'Bronze', 'Copper', 'Rust'],            // Orange (30-60)
        ['Golden', 'Honey', 'Saffron', 'Citrus'],         // Yellow (60-90)
        ['Lime', 'Jade', 'Emerald', 'Forest'],            // Green (90-150)
        ['Teal', 'Cyan', 'Aqua', 'Ocean'],                // Cyan (150-210)
        ['Azure', 'Sapphire', 'Cobalt', 'Navy'],          // Blue (210-270)
        ['Violet', 'Amethyst', 'Indigo', 'Purple'],       // Purple (270-330)
        ['Magenta', 'Fuchsia', 'Rose', 'Crimson']         // Magenta (330-360)
    ];
    
    const hueIndex = Math.floor(baseHue / 45) % themeNames.length;
    const nameIndex = Math.floor(Math.random() * themeNames[hueIndex].length);
    const suffix = ['Depths', 'Caverns', 'Crystals', 'Void', 'Realm', 'Zone'];
    const name = `${themeNames[hueIndex][nameIndex]} ${suffix[Math.floor(Math.random() * suffix.length)]}`;
    
    return {
        name: name,
        primary: primary,
        secondary: secondary,
        accent: accent
    };
}

// Change theme every 50 obstacles
const THEME_CHANGE_INTERVAL = 10;
let currentTheme = generateRandomTheme();
let lastThemeChangeCount = 0;

function getCurrentTheme() {
    // Check if it's time to change themes
    if (obstacleCount - lastThemeChangeCount >= THEME_CHANGE_INTERVAL) {
        currentTheme = generateRandomTheme();
        lastThemeChangeCount = obstacleCount;
    }
    
    return currentTheme;
}

function createObstacle(canvasWidth, canvasHeight) {
    const minHeight = 50;
    const maxHeight = canvasHeight - GAP - minHeight;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
    
    obstacleCount++;
    
    const obstacle = {
        x: canvasWidth,
        topHeight: topHeight,
        bottomY: topHeight + GAP,
        passed: false,
        theme: getCurrentTheme(), // Store theme with obstacle
        // Pre-generate random variations for this obstacle
        seed: Math.random(),
        roughness: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
        asymmetry: Math.random() * 2 - 1, // -1 to 1
        styleIndex: Math.floor(Math.random() * 3) // Store which visual style (0, 1, or 2)
    };
    
    // Mark every 10th obstacle as a milestone
    if (obstacleCount % 10 === 0) {
        obstacle.milestone = obstacleCount;
    }
    
    obstacles.push(obstacle);
}

// Style-specific collision detection functions
function checkCandyStripedCollision(obs, playerLeft, playerRight, playerTop, playerBottom) {
    // Quick AABB check first (performance optimization)
    if (playerRight <= obs.x || playerLeft >= obs.x + OBSTACLE_WIDTH) {
        return false;
    }
    
    const centerX = obs.x + OBSTACLE_WIDTH / 2;
    const FLAME_HEIGHT = 15;
    const playerBodyBottom = playerBottom - FLAME_HEIGHT;
    
    // Check TOP obstacle
    if (playerTop < obs.topHeight) {
        // Player is in the top obstacle zone - check tapered collision
        const yPos = Math.max(0, Math.min(obs.topHeight - 1, playerTop));
        const progress = yPos / obs.topHeight;
        let currentWidth = Math.max(22, OBSTACLE_WIDTH * (1 - progress * 0.65));
        const offset = Math.sin(obs.seed * 100 + yPos * 0.1) * 6 * obs.asymmetry;
        const actualLeft = centerX - currentWidth / 2 + offset;
        const actualRight = actualLeft + currentWidth;
        
        if (playerRight > actualLeft && playerLeft < actualRight) {
            return true;
        }
    }
    
    // Check BOTTOM obstacle
    if (playerBottom > obs.bottomY) {
        const bottomHeight = 500;
        const yPos = Math.min(bottomHeight, playerBottom - obs.bottomY);
        const progress = yPos / bottomHeight;
        let currentWidth = Math.min(OBSTACLE_WIDTH, 22 + OBSTACLE_WIDTH * progress * 0.65);
        const offset = Math.sin(obs.seed * 100 + yPos * 0.1) * 6 * obs.asymmetry;
        const actualLeft = centerX - currentWidth / 2 + offset;
        const actualRight = actualLeft + currentWidth;
        
        if (playerRight > actualLeft && playerLeft < actualRight) {
            return true;
        }
    }
    
    return false;
}

function checkFacetedCrystalCollision(obs, playerLeft, playerRight, playerTop, playerBottom) {
    // Quick AABB check first
    if (playerRight <= obs.x || playerLeft >= obs.x + OBSTACLE_WIDTH) {
        return false;
    }
    
    const centerX = obs.x + OBSTACLE_WIDTH / 2;
    const FLAME_HEIGHT = 15;
    const playerBodyBottom = playerBottom - FLAME_HEIGHT;
    
    // Check TOP obstacle
    if (playerTop < obs.topHeight) {
        const yPos = Math.max(0, Math.min(obs.topHeight - 1, playerTop));
        const progress = yPos / obs.topHeight;
        let currentWidth = Math.max(24, OBSTACLE_WIDTH * (1 - progress * 0.6));
        const wobble = Math.sin(obs.seed * 50 + yPos * 0.2) * 4;
        const actualLeft = centerX - currentWidth / 2 + wobble;
        const actualRight = actualLeft + currentWidth;
        
        if (playerRight > actualLeft && playerLeft < actualRight) {
            return true;
        }
    }
    
    // Check BOTTOM obstacle
    if (playerBottom > obs.bottomY) {
        const bottomHeight = 500;
        const yPos = Math.min(bottomHeight, playerBottom - obs.bottomY);
        const progress = yPos / bottomHeight;
        let currentWidth = Math.min(OBSTACLE_WIDTH, 24 + OBSTACLE_WIDTH * progress * 0.6);
        const wobble = Math.sin(obs.seed * 50 + yPos * 0.2) * 4;
        const actualLeft = centerX - currentWidth / 2 + wobble;
        const actualRight = actualLeft + currentWidth;
        
        if (playerRight > actualLeft && playerLeft < actualRight) {
            return true;
        }
    }
    
    return false;
}

function checkRoughCrystalCollision(obs, playerLeft, playerRight, playerTop, playerBottom) {
    // Quick AABB check first
    if (playerRight <= obs.x || playerLeft >= obs.x + OBSTACLE_WIDTH) {
        return false;
    }
    
    const centerX = obs.x + OBSTACLE_WIDTH / 2;
    const FLAME_HEIGHT = 15;
    const playerBodyBottom = playerBottom - FLAME_HEIGHT;
    
    // Check TOP obstacle
    if (playerTop < obs.topHeight) {
        const yPos = Math.max(0, Math.min(obs.topHeight - 1, playerTop));
        const progress = yPos / obs.topHeight;
        let currentWidth = Math.max(20, OBSTACLE_WIDTH * (1 - progress * 0.65));
        const roughnessVar = Math.sin(obs.seed * 200 + yPos * 0.5) * 8 * obs.roughness;
        const actualLeft = centerX - currentWidth / 2 + roughnessVar;
        const actualRight = actualLeft + currentWidth;
        
        if (playerRight > actualLeft && playerLeft < actualRight) {
            return true;
        }
    }
    
    // Check BOTTOM obstacle
    if (playerBottom > obs.bottomY) {
        const bottomHeight = 500;
        const yPos = Math.min(bottomHeight, playerBottom - obs.bottomY);
        const progress = yPos / bottomHeight;
        let currentWidth = Math.min(OBSTACLE_WIDTH, 20 + OBSTACLE_WIDTH * progress * 0.65);
        const roughnessVar = Math.sin(obs.seed * 200 + yPos * 0.5) * 8 * obs.roughness;
        const actualLeft = centerX - currentWidth / 2 + roughnessVar;
        const actualRight = actualLeft + currentWidth;
        
        if (playerRight > actualLeft && playerLeft < actualRight) {
            return true;
        }
    }
    
    return false;
}

function updateObstacles(playerObj) {
    let collision = false;
    let scoreIncrement = 0;
    
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= OBSTACLE_SPEED;
        // Remove off-screen obstacles
        if (obs.x + OBSTACLE_WIDTH < 0) {
            obstacles.splice(i, 1);
            continue;
        }
        
        // Check collision with player using style-specific collision detection
        const hitbox = getPlayerHitbox();
        const playerLeft = playerObj.x + hitbox.offsetX;
        const playerRight = playerLeft + hitbox.width;
        const playerTop = playerObj.y + hitbox.offsetY;
        const playerBottom = playerTop + hitbox.height;
        
        // Use appropriate collision function based on obstacle's styleIndex
        let hasCollision = false;
        switch(obs.styleIndex) {
            case 0:
                hasCollision = checkCandyStripedCollision(obs, playerLeft, playerRight, playerTop, playerBottom);
                break;
            case 1:
                hasCollision = checkFacetedCrystalCollision(obs, playerLeft, playerRight, playerTop, playerBottom);
                break;
            case 2:
            default:
                hasCollision = checkRoughCrystalCollision(obs, playerLeft, playerRight, playerTop, playerBottom);
                break;
        }
        
        if (hasCollision) {
            collision = true;
            // Play crash sound effect
            if (window.playCrashSound) {
                window.playCrashSound();
            }
        }
        
        // Check if player passed obstacle
        if (!obs.passed && obs.x + OBSTACLE_WIDTH < playerObj.x) {
            obs.passed = true;
            scoreIncrement++;
        }
    }
    return { collision, scoreIncrement };
}

function drawObstacles(ctx, canvasHeight) {
    obstacles.forEach(obs => {
        const theme = obs.theme;
        
        // Use the obstacle's stored styleIndex (set when obstacle was created)
        const styleIndex = obs.styleIndex;
        
        switch(styleIndex) {
            case 0:
                drawCandyStripedObstacle(ctx, obs, theme, canvasHeight);
                break;
            case 1:
                drawFacetedCrystalObstacle(ctx, obs, theme, canvasHeight);
                break;
            default:
                drawRoughCrystalObstacle(ctx, obs, theme, canvasHeight);
                break;
        }
        
        // Add sparkle effects using seed for consistency
        if ((obs.seed * 100) % 100 < 8) {
            drawSparkle(ctx, obs);
        }
    });
}

// Candy striped - horizontal bands like candy canes/icicles
function drawCandyStripedObstacle(ctx, obs, theme, canvasHeight) {
    const centerX = obs.x + OBSTACLE_WIDTH / 2;
    const seed = obs.seed;
    
    // TOP OBSTACLE
    const stripeHeight = 6;
    let currentWidth = OBSTACLE_WIDTH;
    
    for (let y = 0; y < obs.topHeight; y += stripeHeight) {
        const progress = y / obs.topHeight;
        
        // Chunky width changes every few stripes
        if (y % 24 < stripeHeight) {
            currentWidth = Math.max(22, OBSTACLE_WIDTH * (1 - progress * 0.65));
        }
        
        // Slight horizontal wobble using seed
        const offset = Math.sin(seed * 100 + y * 0.1) * 6 * obs.asymmetry;
        const x = centerX - currentWidth / 2 + offset;
        
        // Candy stripe pattern - 3 colors alternating
        const stripeIndex = Math.floor(y / stripeHeight) % 3;
        if (stripeIndex === 0) {
            ctx.fillStyle = theme.primary;
        } else if (stripeIndex === 1) {
            ctx.fillStyle = theme.secondary;
        } else {
            ctx.fillStyle = theme.accent;
        }
        
        ctx.fillRect(x, y, currentWidth, stripeHeight);
        
        // SHINY EFFECT: Multiple highlight layers for depth
        // Main glossy highlight stripe (left side)
        ctx.fillStyle = theme.accent;
        const mainHighlightWidth = Math.max(4, currentWidth * 0.2);
        ctx.fillRect(x + 3, y, mainHighlightWidth, stripeHeight);
        
        // Bright shine spot (smaller, brighter)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        const shineWidth = Math.max(2, currentWidth * 0.1);
        ctx.fillRect(x + 5, y + 1, shineWidth, stripeHeight - 2);
        
        // Edge highlight for extra shine
        if (stripeIndex === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(x, y, 2, stripeHeight);
        }
    }
    
    // Sharp pointed tip with shine
    ctx.fillStyle = theme.accent;
    const tipStartY = Math.max(0, obs.topHeight - 16);
    const tipWidth = currentWidth * 0.4;
    for (let i = 0; i < 16; i += 2) {
        const w = tipWidth * (1 - (i / 16));
        if (tipStartY + i < obs.topHeight) {
            ctx.fillRect(centerX - w / 2, tipStartY + i, w, 2);
            // Tip shine
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillRect(centerX - w / 2 + 1, tipStartY + i, Math.max(1, w * 0.3), 2);
            ctx.fillStyle = theme.accent;
        }
    }
    
    // BOTTOM OBSTACLE
    const bottomStart = obs.bottomY;
    const bottomLength = canvasHeight - obs.bottomY;
    currentWidth = 22;
    
    for (let y = 0; y < bottomLength; y += stripeHeight) {
        const progress = y / bottomLength;
        
        if (y % 24 < stripeHeight) {
            currentWidth = Math.min(OBSTACLE_WIDTH, 22 + OBSTACLE_WIDTH * progress * 0.65);
        }
        
        const offset = Math.sin(seed * 90 + y * 0.1) * 6 * obs.asymmetry;
        const x = centerX - currentWidth / 2 + offset;
        
        const stripeIndex = Math.floor(y / stripeHeight) % 3;
        if (stripeIndex === 0) {
            ctx.fillStyle = theme.primary;
        } else if (stripeIndex === 1) {
            ctx.fillStyle = theme.secondary;
        } else {
            ctx.fillStyle = theme.accent;
        }
        
        ctx.fillRect(x, bottomStart + y, currentWidth, stripeHeight);
        
        // SHINY EFFECT: Right side highlights for bottom
        ctx.fillStyle = theme.accent;
        const mainHighlightWidth2 = Math.max(4, currentWidth * 0.2);
        ctx.fillRect(x + currentWidth - mainHighlightWidth2 - 3, bottomStart + y, mainHighlightWidth2, stripeHeight);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        const shineWidth2 = Math.max(2, currentWidth * 0.1);
        ctx.fillRect(x + currentWidth - shineWidth2 - 5, bottomStart + y + 1, shineWidth2, stripeHeight - 2);
        
        if (stripeIndex === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(x + currentWidth - 2, bottomStart + y, 2, stripeHeight);
        }
    }
    
    // Bottom tip pointing up with shine
    ctx.fillStyle = theme.accent;
    for (let i = 0; i < 16; i += 2) {
        const w = tipWidth * (i / 16);
        if (i < bottomLength) {
            ctx.fillRect(centerX - w / 2, bottomStart + i, w, 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillRect(centerX - w / 2 + 1, bottomStart + i, Math.max(1, w * 0.3), 2);
            ctx.fillStyle = theme.accent;
        }
    }
}

// Faceted crystal - angular planes catching light
function drawFacetedCrystalObstacle(ctx, obs, theme, canvasHeight) {
    const centerX = obs.x + OBSTACLE_WIDTH / 2;
    const seed = obs.seed;
    
    // TOP CRYSTAL
    const facetHeight = 8;
    let currentWidth = OBSTACLE_WIDTH;
    
    for (let y = 0; y < obs.topHeight; y += facetHeight) {
        const progress = y / obs.topHeight;
        const facetIndex = Math.floor(y / facetHeight);
        
        // Width changes in steps
        if (facetIndex % 3 === 0) {
            currentWidth = Math.max(24, OBSTACLE_WIDTH * (1 - progress * 0.6));
        }
        
        // Angular offsets based on seed
        const angle = Math.sin(seed * 200 + facetIndex);
        const offset = angle * 10 * obs.asymmetry;
        
        // Base facet color
        const colorPattern = (facetIndex + Math.floor(seed * 10)) % 4;
        if (colorPattern === 0) {
            ctx.fillStyle = theme.primary;
        } else if (colorPattern === 1) {
            ctx.fillStyle = theme.secondary;
        } else if (colorPattern === 2) {
            ctx.fillStyle = theme.accent;
        } else {
            ctx.fillStyle = theme.primary;
        }
        
        const x = centerX - currentWidth / 2 + offset;
        ctx.fillRect(x, y, currentWidth, facetHeight);
        
        // SHINY EFFECT: Angled facet highlights based on angle
        if (angle > 0.2) {
            // Left-facing facet catches light
            const highlightW = currentWidth * 0.35;
            ctx.fillStyle = theme.accent;
            ctx.fillRect(x, y, highlightW, facetHeight);
            
            // Bright spot
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(x + 2, y + 1, highlightW * 0.4, facetHeight - 2);
        } else if (angle < -0.2) {
            // Right-facing facet catches light
            const highlightW = currentWidth * 0.35;
            ctx.fillStyle = theme.accent;
            ctx.fillRect(x + currentWidth - highlightW, y, highlightW, facetHeight);
            
            // Bright spot
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(x + currentWidth - highlightW * 0.6, y + 1, highlightW * 0.4, facetHeight - 2);
        } else {
            // Center facet - subtle shine
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            const centerHighlight = currentWidth * 0.2;
            ctx.fillRect(x + (currentWidth - centerHighlight) / 2, y + 1, centerHighlight, facetHeight - 2);
        }
        
        // Edge lines for crystal definition
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, y, currentWidth, 1);
    }
    
    // Crystal point with shine
    ctx.fillStyle = theme.accent;
    const tipY = Math.max(0, obs.topHeight - 12);
    for (let i = 0; i < 12; i += 2) {
        const w = (currentWidth * 0.4) * (1 - i / 12);
        if (tipY + i < obs.topHeight) {
            ctx.fillRect(centerX - w / 2, tipY + i, w, 2);
            // Bright tip shine
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillRect(centerX - w / 4, tipY + i, w / 2, 2);
            ctx.fillStyle = theme.accent;
        }
    }
    
    // BOTTOM CRYSTAL (same shiny treatment)
    const bottomStart = obs.bottomY;
    const bottomLength = canvasHeight - obs.bottomY;
    currentWidth = 24;
    
    for (let y = 0; y < bottomLength; y += facetHeight) {
        const progress = y / bottomLength;
        const facetIndex = Math.floor(y / facetHeight);
        
        if (facetIndex % 3 === 0) {
            currentWidth = Math.min(OBSTACLE_WIDTH, 24 + OBSTACLE_WIDTH * progress * 0.6);
        }
        
        const angle = Math.cos(seed * 180 + facetIndex);
        const offset = angle * 10 * obs.asymmetry;
        
        const colorPattern = (facetIndex + Math.floor(seed * 10)) % 4;
        if (colorPattern === 0) {
            ctx.fillStyle = theme.primary;
        } else if (colorPattern === 1) {
            ctx.fillStyle = theme.secondary;
        } else if (colorPattern === 2) {
            ctx.fillStyle = theme.accent;
        } else {
            ctx.fillStyle = theme.primary;
        }
        
        const x = centerX - currentWidth / 2 + offset;
        ctx.fillRect(x, bottomStart + y, currentWidth, facetHeight);
        
        // SHINY EFFECT
        if (angle > 0.2) {
            const highlightW = currentWidth * 0.35;
            ctx.fillStyle = theme.accent;
            ctx.fillRect(x, bottomStart + y, highlightW, facetHeight);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(x + 2, bottomStart + y + 1, highlightW * 0.4, facetHeight - 2);
        } else if (angle < -0.2) {
            const highlightW = currentWidth * 0.35;
            ctx.fillStyle = theme.accent;
            ctx.fillRect(x + currentWidth - highlightW, bottomStart + y, highlightW, facetHeight);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(x + currentWidth - highlightW * 0.6, bottomStart + y + 1, highlightW * 0.4, facetHeight - 2);
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            const centerHighlight = currentWidth * 0.2;
            ctx.fillRect(x + (currentWidth - centerHighlight) / 2, bottomStart + y + 1, centerHighlight, facetHeight - 2);
        }
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, bottomStart + y, currentWidth, 1);
    }
    
    // Bottom point with shine
    ctx.fillStyle = theme.accent;
    for (let i = 0; i < 12; i += 2) {
        const w = (currentWidth * 0.4) * (i / 12);
        if (i < bottomLength) {
            ctx.fillRect(centerX - w / 2, bottomStart + i, w, 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillRect(centerX - w / 4, bottomStart + i, w / 2, 2);
            ctx.fillStyle = theme.accent;
        }
    }
}

// Rough crystal - chunky irregular surface
function drawRoughCrystalObstacle(ctx, obs, theme, canvasHeight) {
    const centerX = obs.x + OBSTACLE_WIDTH / 2;
    const seed = obs.seed;
    const roughness = obs.roughness;
    
    // TOP FORMATION
    const blockHeight = 10;
    let currentWidth = OBSTACLE_WIDTH;
    
    for (let y = 0; y < obs.topHeight; y += blockHeight) {
        const progress = y / obs.topHeight;
        const blockIndex = Math.floor(y / blockHeight);
        
        // Irregular width changes
        if (blockIndex % 2 === 0) {
            const widthVar = Math.sin(seed * 300 + blockIndex) * 10 * roughness;
            currentWidth = Math.max(20, OBSTACLE_WIDTH * (1 - progress * 0.65) + widthVar);
        }
        
        // Rough horizontal displacement
        const offset = Math.sin(seed * 250 + blockIndex * 0.7) * 12 * obs.asymmetry;
        const x = centerX - currentWidth / 2 + offset;
        
        // Color with roughness variation
        const colorSeed = Math.floor(seed * 1000 + blockIndex * 7) % 3;
        if (colorSeed === 0) {
            ctx.fillStyle = theme.primary;
        } else if (colorSeed === 1) {
            ctx.fillStyle = theme.secondary;
        } else {
            ctx.fillStyle = theme.accent;
        }
        
        ctx.fillRect(x, y, currentWidth, blockHeight);
        
        // Add chunky protrusions based on seed
        const hasJut = Math.sin(seed * 400 + blockIndex) > 0.6;
        if (hasJut) {
            const jutSize = 6 + Math.floor(Math.sin(seed * 500 + blockIndex) * 4);
            const jutLeft = Math.cos(seed * 150 + blockIndex) > 0;
            ctx.fillStyle = theme.accent;
            if (jutLeft) {
                ctx.fillRect(x - jutSize, y + 2, jutSize, blockHeight - 4);
                // Shine on jut
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(x - jutSize + 1, y + 3, Math.max(1, jutSize * 0.4), blockHeight - 6);
            } else {
                ctx.fillRect(x + currentWidth, y + 2, jutSize, blockHeight - 4);
                // Shine on jut
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(x + currentWidth + 1, y + 3, Math.max(1, jutSize * 0.4), blockHeight - 6);
            }
        }
        
        // SHINY EFFECT: Crystal shine highlight
        ctx.fillStyle = theme.accent;
        ctx.fillRect(x + 2, y, 4, blockHeight);
        // Bright shine spot
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(x + 3, y + 1, 2, blockHeight - 2);
    }
    
    // Rough tip with shine
    ctx.fillStyle = theme.accent;
    const tipY = Math.max(0, obs.topHeight - 14);
    for (let i = 0; i < 14; i += 2) {
        const w = (currentWidth * 0.35) * (1 - i / 14);
        const wobble = Math.sin(seed * 100 + i) * 2;
        if (tipY + i < obs.topHeight) {
            ctx.fillRect(centerX - w / 2 + wobble, tipY + i, w, 2);
            // Tip shine
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillRect(centerX - w / 4 + wobble, tipY + i, w / 2, 2);
            ctx.fillStyle = theme.accent;
        }
    }
    
    // BOTTOM FORMATION (same shiny treatment)
    const bottomStart = obs.bottomY;
    const bottomLength = canvasHeight - obs.bottomY;
    currentWidth = 20;
    
    for (let y = 0; y < bottomLength; y += blockHeight) {
        const progress = y / bottomLength;
        const blockIndex = Math.floor(y / blockHeight);
        
        if (blockIndex % 2 === 0) {
            const widthVar = Math.cos(seed * 280 + blockIndex) * 10 * roughness;
            currentWidth = Math.min(OBSTACLE_WIDTH, 20 + OBSTACLE_WIDTH * progress * 0.65 + widthVar);
        }
        
        const offset = Math.cos(seed * 230 + blockIndex * 0.6) * 12 * obs.asymmetry;
        const x = centerX - currentWidth / 2 + offset;
        
        const colorSeed = Math.floor(seed * 1000 + blockIndex * 7) % 3;
        if (colorSeed === 0) {
            ctx.fillStyle = theme.primary;
        } else if (colorSeed === 1) {
            ctx.fillStyle = theme.secondary;
        } else {
            ctx.fillStyle = theme.accent;
        }
        
        ctx.fillRect(x, bottomStart + y, currentWidth, blockHeight);
        
        const hasJut = Math.cos(seed * 380 + blockIndex) > 0.6;
        if (hasJut) {
            const jutSize = 6 + Math.floor(Math.cos(seed * 480 + blockIndex) * 4);
            const jutLeft = Math.sin(seed * 140 + blockIndex) > 0;
            ctx.fillStyle = theme.accent;
            if (jutLeft) {
                ctx.fillRect(x - jutSize, bottomStart + y + 2, jutSize, blockHeight - 4);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(x - jutSize + 1, bottomStart + y + 3, Math.max(1, jutSize * 0.4), blockHeight - 6);
            } else {
                ctx.fillRect(x + currentWidth, bottomStart + y + 2, jutSize, blockHeight - 4);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(x + currentWidth + 1, bottomStart + y + 3, Math.max(1, jutSize * 0.4), blockHeight - 6);
            }
        }
        
        // SHINY EFFECT
        ctx.fillStyle = theme.accent;
        ctx.fillRect(x + currentWidth - 6, bottomStart + y, 4, blockHeight);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(x + currentWidth - 5, bottomStart + y + 1, 2, blockHeight - 2);
    }
    
    // Bottom tip with shine
    ctx.fillStyle = theme.accent;
    for (let i = 0; i < 14; i += 2) {
        const w = (currentWidth * 0.35) * (i / 14);
        const wobble = Math.cos(seed * 90 + i) * 2;
        if (i < bottomLength) {
            ctx.fillRect(centerX - w / 2 + wobble, bottomStart + i, w, 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillRect(centerX - w / 4 + wobble, bottomStart + i, w / 2, 2);
            ctx.fillStyle = theme.accent;
        }
    }
}

// Add sparkle effects using seed for consistency
function drawSparkle(ctx, obs) {
    // Use obstacle seed to determine sparkle positions (will be consistent)
    const sparkle1X = obs.x + (obs.seed * OBSTACLE_WIDTH);
    const sparkle1Y = (obs.seed * 100 < 50) 
        ? (obs.seed * 200 % 1) * obs.topHeight 
        : obs.bottomY + ((obs.seed * 300 % 1) * 100);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sparkle1X, sparkle1Y, 2, 2);
    ctx.fillRect(sparkle1X - 3, sparkle1Y, 2, 2);
    ctx.fillRect(sparkle1X + 3, sparkle1Y, 2, 2);
    ctx.fillRect(sparkle1X, sparkle1Y - 3, 2, 2);
    ctx.fillRect(sparkle1X, sparkle1Y + 3, 2, 2);
}

function resetObstacles() { 
    obstacles = []; 
    obstacleCount = 0;
    currentTheme = generateRandomTheme();
    lastThemeChangeCount = 0;
}

function getObstacles() { return obstacles; }

function drawMilestoneMarkers(ctx, canvasHeight) {
    obstacles.forEach(obs => {
        // Check if this obstacle represents a milestone (every 10th obstacle)
        if (obs.milestone) {
            const theme = obs.theme;
            
            // Calculate TRUE complementary color (180 degrees opposite on color wheel)
            const complementaryColor = getComplementaryColor(theme.primary);
            
            // Draw SNES-style chunky dashed line
            ctx.strokeStyle = complementaryColor;
            ctx.lineWidth = 4;
            ctx.setLineDash([8, 8]); // Chunkier dashes for pixel aesthetic
            ctx.beginPath();
            ctx.moveTo(obs.x + OBSTACLE_WIDTH / 2, 0);
            ctx.lineTo(obs.x + OBSTACLE_WIDTH / 2, canvasHeight);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Draw SNES-style box background for the number
            ctx.save();
            
            const text = obs.milestone.toString();
            const textY = obs.topHeight + (obs.bottomY - obs.topHeight) / 2;
            const boxWidth = 80;
            const boxHeight = 50;
            const boxX = obs.x + OBSTACLE_WIDTH / 2 - boxWidth / 2;
            const boxY = textY - boxHeight / 2;
            
            // SNES-style box with chunky borders
            // Outer dark border
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(boxX - 4, boxY - 4, boxWidth + 8, boxHeight + 8);
            
            // Main box background (slightly transparent)
            ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
            ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
            
            // Layered SNES-style borders using the complementary color
            // Outer highlight
            ctx.strokeStyle = complementaryColor;
            ctx.lineWidth = 3;
            ctx.strokeRect(boxX - 2, boxY - 2, boxWidth + 4, boxHeight + 4);
            
            // Inner border
            ctx.strokeStyle = theme.secondary;
            ctx.lineWidth = 2;
            ctx.strokeRect(boxX + 2, boxY + 2, boxWidth - 4, boxHeight - 4);
            
            // Draw the milestone number with Press Start 2P pixel font
            ctx.fillStyle = complementaryColor;
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 4;
            ctx.font = '20px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Draw text shadow/outline for visibility
            ctx.strokeText(text, obs.x + OBSTACLE_WIDTH / 2, textY);
            // Draw text fill
            ctx.fillText(text, obs.x + OBSTACLE_WIDTH / 2, textY);
            
            // Draw pixel-style star icon above the box
            const starX = obs.x + OBSTACLE_WIDTH / 2;
            const starY = boxY - 15;
            
            // SNES-style chunky pixel star
            ctx.fillStyle = complementaryColor;
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            
            // Draw a chunky 8-bit style star using rectangles
            const pixelSize = 3;
            const starPattern = [
                [0, 0, 1, 0, 0],
                [0, 1, 1, 1, 0],
                [1, 1, 1, 1, 1],
                [0, 1, 1, 1, 0],
                [1, 0, 1, 0, 1]
            ];
            
            const offsetX = starX - (starPattern[0].length * pixelSize) / 2;
            const offsetY = starY - (starPattern.length * pixelSize) / 2;
            
            starPattern.forEach((row, y) => {
                row.forEach((pixel, x) => {
                    if (pixel === 1) {
                        ctx.fillRect(
                            offsetX + x * pixelSize,
                            offsetY + y * pixelSize,
                            pixelSize,
                            pixelSize
                        );
                        // Add pixel outline for extra crispness
                        ctx.strokeRect(
                            offsetX + x * pixelSize,
                            offsetY + y * pixelSize,
                            pixelSize,
                            pixelSize
                        );
                    }
                });
            });
            
            ctx.restore();
        }
    });
}

// Helper function to calculate true complementary color (180 degrees on color wheel)
function getComplementaryColor(hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    
    // Convert RGB to HSL
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    
    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case rNorm: h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6; break;
            case gNorm: h = ((bNorm - rNorm) / d + 2) / 6; break;
            case bNorm: h = ((rNorm - gNorm) / d + 4) / 6; break;
        }
    }
    
    // Add 180 degrees (0.5 in normalized 0-1 range) for complementary
    h = (h + 0.5) % 1;
    
    // Boost saturation and lightness for better visibility
    s = Math.min(1, s * 1.3);
    l = Math.max(0.5, Math.min(0.7, l * 1.2)); // Keep it bright but not too light
    
    // Convert back to RGB
    let r2, g2, b2;
    
    if (s === 0) {
        r2 = g2 = b2 = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        
        r2 = hue2rgb(p, q, h + 1/3);
        g2 = hue2rgb(p, q, h);
        b2 = hue2rgb(p, q, h - 1/3);
    }
    
    // Convert back to hex
    const toHex = (c) => {
        const hex = Math.round(c * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
}

// Optional: Display current theme name on screen
function getCurrentThemeName() {
    return getCurrentTheme().name;
}