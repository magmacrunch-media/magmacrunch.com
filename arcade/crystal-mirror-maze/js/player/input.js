// Input handling

const keys = {};
let isDragging = false;
let lastMouseX = 0;

// Mobile touch controls
let touchStartX = 0;
let touchStartY = 0;
let isTouching = false;
let joystickActive = false;
let joystickDeltaX = 0;
let joystickDeltaY = 0;

function initInput(canvas) {
    // Keyboard input
    document.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        
        // Handle NPC interaction with spacebar (only trigger once per press)
        if (e.key === ' ' && !keys[' ']) {
            if (typeof handleNPCInteraction !== 'undefined') {
                handleNPCInteraction(' ');
                e.preventDefault(); // Prevent page scroll
            }
        }
        
        keys[key] = true;
        if (e.key === ' ') keys[' '] = true; // Store spacebar separately
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
        if (e.key === ' ') keys[' '] = false;
    });
    
    // Mouse drag for camera (works with trackpad)
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastMouseX = e.clientX;
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - lastMouseX;
            updateCameraRotation(deltaX * 0.005);
            lastMouseX = e.clientX;
        }
    });
    
    // Mobile touch controls
    createMobileControls();
    
    // Touch for camera rotation (swipe anywhere on screen)
    let touchStartRotation = 0;
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1 && !isTouchingButton(e.touches[0])) {
            touchStartX = e.touches[0].clientX;
            touchStartRotation = touchStartX;
            e.preventDefault();
        }
    });
    
    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1 && !joystickActive) {
            const deltaX = e.touches[0].clientX - touchStartRotation;
            updateCameraRotation(deltaX * 0.003);
            touchStartRotation = e.touches[0].clientX;
            e.preventDefault();
        }
    });
    
    canvas.addEventListener('touchend', (e) => {
        touchStartX = 0;
        touchStartY = 0;
        e.preventDefault();
    });
}

function createMobileControls() {
    // Only show on touch devices
    if (!('ontouchstart' in window)) return;
    
    // Create virtual joystick container
    const joystickContainer = document.createElement('div');
    joystickContainer.id = 'joystick-container';
    joystickContainer.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 30px;
        width: 120px;
        height: 120px;
        background: rgba(100, 100, 100, 0.3);
        border: 2px solid rgba(150, 150, 150, 0.5);
        border-radius: 50%;
        z-index: 1000;
        touch-action: none;
    `;
    
    const joystick = document.createElement('div');
    joystick.id = 'joystick';
    joystick.style.cssText = `
        position: absolute;
        width: 50px;
        height: 50px;
        background: rgba(150, 150, 200, 0.6);
        border: 2px solid rgba(200, 200, 255, 0.8);
        border-radius: 50%;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        touch-action: none;
    `;
    
    joystickContainer.appendChild(joystick);
    document.body.appendChild(joystickContainer);
    
    // Joystick touch handling
    let joystickCenterX = 0;
    let joystickCenterY = 0;
    
    joystickContainer.addEventListener('touchstart', (e) => {
        const rect = joystickContainer.getBoundingClientRect();
        joystickCenterX = rect.left + rect.width / 2;
        joystickCenterY = rect.top + rect.height / 2;
        joystickActive = true;
        handleJoystickMove(e.touches[0].clientX, e.touches[0].clientY, joystickCenterX, joystickCenterY, joystick);
        e.preventDefault();
    });
    
    joystickContainer.addEventListener('touchmove', (e) => {
        if (joystickActive) {
            handleJoystickMove(e.touches[0].clientX, e.touches[0].clientY, joystickCenterX, joystickCenterY, joystick);
            e.preventDefault();
        }
    });
    
    joystickContainer.addEventListener('touchend', (e) => {
        joystickActive = false;
        joystickDeltaX = 0;
        joystickDeltaY = 0;
        joystick.style.transform = 'translate(-50%, -50%)';
        e.preventDefault();
    });
    
    // Interaction button (for NPC dialogue)
    const interactButton = document.createElement('button');
    interactButton.id = 'interact-button';
    interactButton.textContent = 'TALK';
    interactButton.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 80px;
        height: 80px;
        background: rgba(153, 102, 255, 0.7);
        border: 3px solid rgba(200, 150, 255, 0.9);
        border-radius: 50%;
        color: white;
        font-size: 14px;
        font-weight: bold;
        z-index: 1000;
        touch-action: manipulation;
    `;
    
    interactButton.addEventListener('touchstart', (e) => {
        if (typeof handleNPCInteraction !== 'undefined') {
            handleNPCInteraction(' ');
        }
        e.preventDefault();
    });
    
    document.body.appendChild(interactButton);
}

function handleJoystickMove(touchX, touchY, centerX, centerY, joystick) {
    const deltaX = touchX - centerX;
    const deltaY = touchY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = 35;
    
    if (distance > maxDistance) {
        const angle = Math.atan2(deltaY, deltaX);
        joystickDeltaX = Math.cos(angle) * maxDistance;
        joystickDeltaY = Math.sin(angle) * maxDistance;
    } else {
        joystickDeltaX = deltaX;
        joystickDeltaY = deltaY;
    }
    
    joystick.style.transform = `translate(calc(-50% + ${joystickDeltaX}px), calc(-50% + ${joystickDeltaY}px))`;
}

function isTouchingButton(touch) {
    const joystick = document.getElementById('joystick-container');
    const interactBtn = document.getElementById('interact-button');
    
    if (joystick) {
        const rect = joystick.getBoundingClientRect();
        if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
            touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
            return true;
        }
    }
    
    if (interactBtn) {
        const rect = interactBtn.getBoundingClientRect();
        if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
            touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
            return true;
        }
    }
    
    return false;
}

function isKeyPressed(key) {
    return keys[key] || false;
}

function getIsDragging() {
    return isDragging;
}

function getJoystickInput() {
    return { x: joystickDeltaX, y: joystickDeltaY, active: joystickActive };
}