// Input module - handles all user input events

// Make thrustActive global to ensure it's accessible
window.thrustActive = false;
let onStartGame = null;
let onSubmitInitials = null;

function setThrustActive(value) {
    window.thrustActive = value;
    console.log('setThrustActive called:', value);
}

function getThrustActive() {
    return window.thrustActive;
}

function setStartGameCallback(callback) {
    onStartGame = callback;
}

function setSubmitInitialsCallback(callback) {
    onSubmitInitials = callback;
}

// Initialize input after DOM is ready
function initializeInput() {
    console.log('Initializing input handlers...');
    
    // Keyboard controls
    document.addEventListener('keydown', async (e) => {
        console.log('Keydown event:', e.code);
        if (e.code === 'Space') {
            e.preventDefault();
            console.log('Space pressed');
            
            if (typeof isWaitingForInitials === 'function' && isWaitingForInitials()) {
                console.log('Waiting for initials, ignoring input');
                return;
            }
            
            // Check if game is running via global flags
            const isGameRunning = window.gameRunning || false;
            
            if (onStartGame && !isGameRunning) {
                console.log('Game not running, calling onStartGame');
                // Play button sound
                if (window.playButtonSound2) {
                    window.playButtonSound2();
                }
                const gameStarted = await onStartGame();
                console.log('onStartGame returned:', gameStarted);
                // Only activate thrust if game actually started (returned true)
                if (gameStarted) {
                    window.thrustActive = true;
                    console.log('Game started, thrust activated');
                }
            } else {
                // Game is already running, just activate thrust
                window.thrustActive = true;
                console.log('Game running, thrust activated');
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        console.log('Keyup event:', e.code);
        if (e.code === 'Space') {
            window.thrustActive = false;
            console.log('Space released, thrust deactivated');
        }
    });
    
    console.log('Keyboard event listeners attached');
}

// Mouse controls
function setupCanvasInput(canvas) {
    console.log('Setting up canvas input for:', canvas);
    
    canvas.addEventListener('mousedown', async (e) => {
        console.log('Mouse down on canvas');
        if (typeof isWaitingForInitials === 'function' && isWaitingForInitials()) {
            return;
        }
        
        const isGameRunning = window.gameRunning || false;
        
        if (onStartGame && !isGameRunning) {
            // Play button sound
            if (window.playButtonSound2) {
                window.playButtonSound2();
            }
            const gameStarted = await onStartGame();
            // Only activate thrust if game actually started
            if (gameStarted) {
                window.thrustActive = true;
                console.log('Mouse: thrust activated');
            }
        } else {
            window.thrustActive = true;
            console.log('Mouse: thrust activated (game running)');
        }
    });

    canvas.addEventListener('mouseup', () => {
        console.log('Mouse up on canvas');
        window.thrustActive = false;
    });

    // Touch controls
    canvas.addEventListener('touchstart', async (e) => {
        e.preventDefault();
        console.log('Touch start on canvas');
        if (typeof isWaitingForInitials === 'function' && isWaitingForInitials()) {
            return;
        }
        
        const isGameRunning = window.gameRunning || false;
        
        if (onStartGame && !isGameRunning) {
            // Play button sound
            if (window.playButtonSound2) {
                window.playButtonSound2();
            }
            const gameStarted = await onStartGame();
            // Only activate thrust if game actually started
            if (gameStarted) {
                window.thrustActive = true;
                console.log('Touch: thrust activated');
            }
        } else {
            window.thrustActive = true;
            console.log('Touch: thrust activated (game running)');
        }
    });

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        console.log('Touch end on canvas');
        window.thrustActive = false;
    });
}

// Submit button for initials
function setupSubmitButton(button) {
    button.addEventListener('click', () => {
        if (onSubmitInitials) {
            onSubmitInitials();
        }
    });
}

// Call initialization immediately
initializeInput();