// Input module - handles all user input events

// Make thrustActive global to ensure it's accessible
window.thrustActive = false;
let onStartGame = null;
let onSubmitInitials = null;

function setThrustActive(value) {
    window.thrustActive = value;
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
    // Keyboard controls
    document.addEventListener('keydown', async (e) => {
        if (e.code === 'Space') {
            e.preventDefault();

            if (typeof isWaitingForInitials === 'function' && isWaitingForInitials()) {
                return;
            }

            // Check if game is running via global flags
            const isGameRunning = window.gameRunning || false;

            if (onStartGame && !isGameRunning) {
                // Play button sound
                if (window.playButtonSound2) {
                    window.playButtonSound2();
                }
                const gameStarted = await onStartGame();
                // Only activate thrust if game actually started (returned true)
                if (gameStarted) {
                    window.thrustActive = true;
                }
            } else {
                // Game is already running, just activate thrust
                window.thrustActive = true;
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            window.thrustActive = false;
        }
    });
}

// Mouse controls
function setupCanvasInput(canvas) {
    canvas.addEventListener('mousedown', async (e) => {
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
            }
        } else {
            window.thrustActive = true;
        }
    });

    canvas.addEventListener('mouseup', () => {
        window.thrustActive = false;
    });

    // Touch controls
    canvas.addEventListener('touchstart', async (e) => {
        e.preventDefault();
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
            }
        } else {
            window.thrustActive = true;
        }
    });

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
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
