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
let touchStartTime = 0;
let touchActive = false;

document.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    touchStartTime = Date.now();
    touchActive = true;

    const screenW = window.innerWidth;
    const x = e.touches[0].clientX;
    if (x < screenW * 0.35) {
        input.left = true;
        input.right = false;
    } else if (x > screenW * 0.65) {
        input.right = true;
        input.left = false;
    } else {
        input.left = false;
        input.right = false;
    }
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    if (!touchActive) return;
    e.preventDefault();
    const screenW = window.innerWidth;
    const x = e.touches[0].clientX;
    if (x < screenW * 0.35) {
        input.left = true;
        input.right = false;
    } else if (x > screenW * 0.65) {
        input.right = true;
        input.left = false;
    } else {
        input.left = false;
        input.right = false;
    }
}, { passive: false });

document.addEventListener('touchend', (e) => {
    const elapsed = Date.now() - touchStartTime;
    if (touchActive && elapsed < 200 && !input.left && !input.right) {
        input.trick = true;
        input.enter = true;
    }
    touchActive = false;
    input.left = false;
    input.right = false;
    input.brake = false;
});
