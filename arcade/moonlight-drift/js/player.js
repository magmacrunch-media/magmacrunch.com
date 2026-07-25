// Player module - handles player state and physics
const player = {
    x: 80,
    y: 300,
    velocity: 0,
    thrust: -0.6,
    gravity: 0.4,
    maxVelocity: 10
};

// Get current character's hitbox
function getPlayerHitbox() {
    const currentChar = getCurrentCharacter();
    const char = window.characters[currentChar];
    
    if (char && char.hitbox) {
        return {
            width: char.hitbox.width,
            height: char.hitbox.height,
            offsetX: char.hitbox.offsetX || 0,
            offsetY: char.hitbox.offsetY || 0
        };
    }
    
    // Default fallback
    return {
        width: 40,
        height: 35,
        offsetX: 0,
        offsetY: 0
    };
}

function updatePlayer(thrustActive, canvasHeight) {
    const hitbox = getPlayerHitbox();
    
    if (thrustActive) {
        player.velocity += player.thrust;
    } else {
        player.velocity += player.gravity;
    }
    
    player.velocity = Math.max(-player.maxVelocity, Math.min(player.maxVelocity, player.velocity));
    player.y += player.velocity;
    
    // Check boundaries using actual hitbox
    if (player.y + hitbox.offsetY < 0 || 
        player.y + hitbox.offsetY + hitbox.height > canvasHeight) {
        return true;
    }
    
    return false;
}

function resetPlayer() {
    player.y = 300;
    player.velocity = 0;
    
    // Apply character-specific physics on reset
    const currentChar = getCurrentCharacter();
    if (window.applyCharacterPhysics) {
        window.applyCharacterPhysics(player, currentChar);
    }
}

function drawPlayer(ctx, thrustActive, isGameRunning, animationTime) {
    drawCurrentCharacter(ctx, player.x, player.y, thrustActive, isGameRunning, animationTime);
}

// Make hitbox function available to other modules
window.getPlayerHitbox = getPlayerHitbox;