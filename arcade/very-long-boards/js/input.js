// ═══════════════════════════════════════════════
// Very Long Boards — Input Handler
// ═══════════════════════════════════════════════

const input = {
    left: false,
    right: false,
    brake: false,
    trick: false,
    enter: false,
    escape: false,
};

const keyState = {};

document.addEventListener('keydown', (e) => {
    if (keyState[e.code]) return;
    keyState[e.code] = true;
    
    switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
            input.left = true;
            break;
        case 'ArrowRight':
        case 'KeyD':
            input.right = true;
            break;
        case 'Space':
        case 'ArrowDown':
        case 'KeyS':
            input.brake = true;
            break;
        case 'ArrowUp':
        case 'KeyW':
            input.trick = true;
            break;
        case 'Enter':
            input.enter = true;
            break;
        case 'Escape':
            input.escape = true;
            break;
    }
    
    // Prevent scrolling with arrow keys
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keyState[e.code] = false;
    
    switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
            input.left = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            input.right = false;
            break;
        case 'Space':
        case 'ArrowDown':
        case 'KeyS':
            input.brake = false;
            break;
        case 'ArrowUp':
        case 'KeyW':
            input.trick = false;
            break;
    }
});

function consumeInput() {
    const consumed = { ...input };
    input.enter = false;
    input.escape = false;
    input.trick = false;
    return consumed;
}

// Touch controls
let touchStartX = null;
let touchActive = false;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchActive = true;
    input.brake = true;
    input.enter = true; // Trigger enter on touch start
});

document.addEventListener('touchmove', (e) => {
    if (!touchActive) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - touchStartX;
    if (dx < -20) {
        input.left = true;
        input.right = false;
    } else if (dx > 20) {
        input.right = true;
        input.left = false;
    } else {
        input.left = false;
        input.right = false;
    }
});

document.addEventListener('touchend', () => {
    touchActive = false;
    input.left = false;
    input.right = false;
    input.brake = false;
});
