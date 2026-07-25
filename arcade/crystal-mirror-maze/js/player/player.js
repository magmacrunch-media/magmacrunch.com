// Player movement and camera control

let playerPosition = { x: PLAYER_START_X, z: PLAYER_START_Z };
let cameraRotation = 0;
let camera;

function initPlayer(cam) {
    camera = cam;
    camera.position.set(playerPosition.x, PLAYER_HEIGHT, playerPosition.z);
    camera.rotation.order = 'YXZ';
}

function updateCameraRotation(delta) {
    cameraRotation += delta;
    camera.rotation.y = cameraRotation;
}

function updatePlayer() {
    let moveX = 0;
    let moveZ = 0;
    
    // Calculate forward and right directions based on camera rotation
    const forward = {
        x: -Math.sin(cameraRotation),
        z: -Math.cos(cameraRotation)
    };
    const right = {
        x: Math.cos(cameraRotation),
        z: -Math.sin(cameraRotation)
    };
    
    // Check for joystick input (mobile)
    const joystick = typeof getJoystickInput !== 'undefined' ? getJoystickInput() : { x: 0, y: 0, active: false };
    
    if (joystick.active) {
        // Use joystick for movement
        const normalizedX = joystick.x / 35; // Normalize to -1 to 1
        const normalizedY = -joystick.y / 35; // Invert Y (joystick down = forward)
        
        moveX += (forward.x * normalizedY + right.x * normalizedX) * MOVE_SPEED;
        moveZ += (forward.z * normalizedY + right.z * normalizedX) * MOVE_SPEED;
    } else {
        // Keyboard controls (desktop)
        if (isKeyPressed('w') || isKeyPressed('arrowup')) {
            moveX += forward.x * MOVE_SPEED;
            moveZ += forward.z * MOVE_SPEED;
        }
        if (isKeyPressed('s') || isKeyPressed('arrowdown')) {
            moveX -= forward.x * MOVE_SPEED;
            moveZ -= forward.z * MOVE_SPEED;
        }
        if (isKeyPressed('a')) {
            moveX -= right.x * MOVE_SPEED;
            moveZ -= right.z * MOVE_SPEED;
        }
        if (isKeyPressed('d')) {
            moveX += right.x * MOVE_SPEED;
            moveZ += right.z * MOVE_SPEED;
        }
        
        // Rotation keys (Q/E)
        if (isKeyPressed('q') || isKeyPressed('arrowleft')) {
            cameraRotation += TURN_SPEED;
        }
        if (isKeyPressed('e') || isKeyPressed('arrowright')) {
            cameraRotation -= TURN_SPEED;
        }
    }
    
    // Apply movement with collision detection and sliding
    const newX = playerPosition.x + moveX;
    const newZ = playerPosition.z + moveZ;
    
    // Try moving in both directions
    if (!checkCollision(newX, newZ)) {
        // No collision - move normally
        playerPosition.x = newX;
        playerPosition.z = newZ;
    } else {
        // Collision detected - try sliding along walls
        // Try moving only in X direction
        if (!checkCollision(newX, playerPosition.z)) {
            playerPosition.x = newX;
        }
        // Try moving only in Z direction
        if (!checkCollision(playerPosition.x, newZ)) {
            playerPosition.z = newZ;
        }
    }
    
    camera.position.set(playerPosition.x, PLAYER_HEIGHT, playerPosition.z);
    camera.rotation.y = cameraRotation;
}

function checkCollision(x, z) {
    // Get current maze layout
    const layout = MAZE_LAYOUT;
    
    // Check collision points around the player (circle collision)
    const numPoints = 8;
    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const checkX = x + Math.cos(angle) * COLLISION_RADIUS;
        const checkZ = z + Math.sin(angle) * COLLISION_RADIUS;
        
        const gridX = Math.floor(checkX);
        const gridZ = Math.floor(checkZ);
        
        // Check bounds
        if (gridZ < 0 || gridZ >= layout.length || gridX < 0 || gridX >= layout[0].length) {
            return true; // Out of bounds = collision
        }
        
        const cellValue = layout[gridZ][gridX];
        
        // CRITICAL FIX: Portal cells (71-79) should NOT cause collision
        // Only actual walls (value 1) block movement
        if (cellValue === 1) {
            return true;
        }
    }
    
    return false;
}

function resetPlayer() {
    playerPosition = { x: PLAYER_START_X, z: PLAYER_START_Z };
    cameraRotation = 0;
    camera.position.set(playerPosition.x, PLAYER_HEIGHT, playerPosition.z);
    camera.rotation.y = cameraRotation;
}

function getPlayerPosition() {
    return playerPosition;
}