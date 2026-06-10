// Main game module - orchestrates all other modules and runs the game loop

const gameOverDisplay = document.getElementById('gameOver');
const instructionsDisplay = document.getElementById('instructions');
const titleOverlay = document.getElementById('titleOverlay');
const muteBtn = document.getElementById('muteBtn');

// Web Audio API setup for gapless looping
let audioContext;
let audioBuffer;
let crashSoundBuffer; // New: crash sound effect
let buttonSoundBuffer; // New: button click sound (character selector)
let buttonSound2Buffer; // New: general button click sound
let sourceNode;
let gainNode;
let musicStarted = false;
let isMuted = false;
let audioLoaded = false;
let crashSoundLoaded = false; // New: track crash sound loading
let buttonSoundLoaded = false; // New: track button sound loading
let buttonSound2Loaded = false; // New: track button sound 2 loading

async function loadAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Load music
        console.log('Loading audio from: audio/moonlightdrift-gameloop.ogg');
        const response = await fetch('audio/moonlightdrift-gameloop.ogg');
        console.log('Response status:', response.status);
        const arrayBuffer = await response.arrayBuffer();
        console.log('Audio buffer size:', arrayBuffer.byteLength);
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioLoaded = true;
        console.log('Audio loaded successfully!');
        
        // Load crash sound effect
        console.log('Loading crash sound from: audio/crashsound.ogg');
        const crashResponse = await fetch('audio/crashsound.ogg');
        const crashArrayBuffer = await crashResponse.arrayBuffer();
        crashSoundBuffer = await audioContext.decodeAudioData(crashArrayBuffer);
        crashSoundLoaded = true;
        console.log('Crash sound loaded successfully!');
        
        // Load button sound effect
        console.log('Loading button sound from: audio/buttonsound1.ogg');
        const buttonResponse = await fetch('audio/buttonsound1.ogg');
        const buttonArrayBuffer = await buttonResponse.arrayBuffer();
        buttonSoundBuffer = await audioContext.decodeAudioData(buttonArrayBuffer);
        buttonSoundLoaded = true;
        console.log('Button sound loaded successfully!');
        
        // Load button sound 2 effect
        console.log('Loading button sound 2 from: audio/buttonsound2.ogg');
        const button2Response = await fetch('audio/buttonsound2.ogg');
        const button2ArrayBuffer = await button2Response.arrayBuffer();
        buttonSound2Buffer = await audioContext.decodeAudioData(button2ArrayBuffer);
        buttonSound2Loaded = true;
        console.log('Button sound 2 loaded successfully!');
    } catch (e) {
        console.error('Error loading audio:', e);
    }
}

async function playMusic() {
    if (!audioLoaded) {
        console.log('Audio not yet loaded, waiting...');
        return;
    }
    
    if (musicStarted) {
        console.log('Music already started');
        return;
    }
    
    if (!audioContext || !audioBuffer) {
        console.log('Audio context or buffer missing');
        return;
    }
    
    try {
        // Resume AudioContext if suspended (required on mobile and some browsers)
        if (audioContext.state === 'suspended') {
            console.log('Resuming suspended AudioContext...');
            await audioContext.resume();
        }
        
        console.log('AudioContext state:', audioContext.state);
        
        // Create gain node for volume control
        gainNode = audioContext.createGain();
        // Start at 0 for fade-in effect
        gainNode.gain.value = 0;
        gainNode.connect(audioContext.destination);
        
        // Function to play the audio buffer
        sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(gainNode);
        sourceNode.loop = true; // Perfect gapless loop!
        sourceNode.start(0);
        
        // Fade in over 2 seconds
        const targetVolume = isMuted ? 0 : 0.3;
        const fadeInDuration = 2.0; // 2 seconds
        const currentTime = audioContext.currentTime;
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(targetVolume, currentTime + fadeInDuration);
        
        musicStarted = true;
        console.log('Music started successfully with fade-in! State:', audioContext.state);
    } catch (e) {
        console.error('Error starting music:', e);
        musicStarted = false; // Reset so we can try again
    }
}

function toggleMute() {
    isMuted = !isMuted;
    if (gainNode && audioContext) {
        const targetVolume = isMuted ? 0 : 0.3;
        const currentTime = audioContext.currentTime;
        const transitionDuration = 0.5; // 0.5 seconds for mute/unmute
        
        // Smooth transition instead of instant change
        gainNode.gain.cancelScheduledValues(currentTime);
        gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
        gainNode.gain.linearRampToValueAtTime(targetVolume, currentTime + transitionDuration);
    }
    const buttonText = isMuted ? 'SFX OFF' : 'SFX ON';
    
    // Update both mute buttons
    if (muteBtn) {
        muteBtn.textContent = buttonText;
    }
    const modalMuteBtn = document.getElementById('modalMuteBtn');
    if (modalMuteBtn) {
        modalMuteBtn.textContent = buttonText;
    }
}

// Play crash sound effect
function playCrashSound() {
    if (!crashSoundLoaded || !audioContext || isMuted) {
        return;
    }
    
    try {
        // Create a new source node for the sound effect
        const sfxSource = audioContext.createBufferSource();
        sfxSource.buffer = crashSoundBuffer;
        
        // Create gain node for sound effect volume
        const sfxGain = audioContext.createGain();
        sfxGain.gain.value = 0.5; // Adjust volume as needed (0.5 = 50%)
        
        // Connect: source -> gain -> destination
        sfxSource.connect(sfxGain);
        sfxGain.connect(audioContext.destination);
        
        // Play the sound
        sfxSource.start(0);
    } catch (e) {
        console.error('Error playing crash sound:', e);
    }
}

// Play button click sound effect
function playButtonSound() {
    if (!buttonSoundLoaded || !audioContext || isMuted) {
        return;
    }
    
    try {
        // Create a new source node for the sound effect
        const sfxSource = audioContext.createBufferSource();
        sfxSource.buffer = buttonSoundBuffer;
        
        // Create gain node for sound effect volume
        const sfxGain = audioContext.createGain();
        sfxGain.gain.value = 0.4; // Slightly quieter for UI sounds
        
        // Connect: source -> gain -> destination
        sfxSource.connect(sfxGain);
        sfxGain.connect(audioContext.destination);
        
        // Play the sound
        sfxSource.start(0);
    } catch (e) {
        console.error('Error playing button sound:', e);
    }
}

// Play button sound 2 (general buttons)
function playButtonSound2() {
    if (!buttonSound2Loaded || !audioContext || isMuted) {
        return;
    }
    
    try {
        // Create a new source node for the sound effect
        const sfxSource = audioContext.createBufferSource();
        sfxSource.buffer = buttonSound2Buffer;
        
        // Create gain node for sound effect volume
        const sfxGain = audioContext.createGain();
        sfxGain.gain.value = 0.4; // Slightly quieter for UI sounds
        
        // Connect: source -> gain -> destination
        sfxSource.connect(sfxGain);
        sfxGain.connect(audioContext.destination);
        
        // Play the sound
        sfxSource.start(0);
    } catch (e) {
        console.error('Error playing button sound 2:', e);
    }
}

// Make sound functions available globally
window.playCrashSound = playCrashSound;
window.playButtonSound = playButtonSound;
window.playButtonSound2 = playButtonSound2;

let gameRunning = false;
let gameStarted = false;
let frameCount = 0;
let modalOpen = false;
let characterSelected = false; // Track if character has been chosen
let readyToStart = false; // Track if we're on the "ready" screen

// Make gameRunning accessible globally for input handler
window.gameRunning = false;

async function showCharacterSelectorOnStart() {
    // Hide title overlay and show character selector modal
    titleOverlay.style.display = 'none';
    
    // Show the control buttons now that we're past the start screen
    const characterSelector = document.getElementById('characterSelector');
    if (characterSelector) {
        characterSelector.style.display = 'flex';
    }
    
    modalOpen = true;
    characterModal.style.display = 'flex';
    renderCharacterGrid();
    
    // Start music on first user interaction (required for browser autoplay policies)
    if (!musicStarted && audioLoaded) {
        console.log('Attempting to start music after user interaction...');
        await playMusic();
    } else if (!audioLoaded) {
        console.log('Audio not loaded yet, music will not play');
    }
}

function showReadyScreen() {
    // Show the ready screen after character selection
    readyToStart = true;
    const readyOverlay = document.getElementById('readyOverlay');
    if (readyOverlay) {
        readyOverlay.style.display = 'block';
    }
}

async function actuallyStartGame() {
    // This is the real game start after character selection
    gameStarted = true;
    gameRunning = true;
    window.gameRunning = true; // Update global flag
    readyToStart = false;
    gameOverDisplay.style.display = 'none';
    instructionsDisplay.style.display = 'none';
    titleOverlay.style.display = 'none';
    
    // Hide ready overlay
    const readyOverlay = document.getElementById('readyOverlay');
    if (readyOverlay) {
        readyOverlay.style.display = 'none';
    }
    
    hideInitialsPrompt();
    
    resetPlayer();
    
    // Apply character-specific physics after resetting player
    const currentChar = getCurrentCharacter();
    if (window.applyCharacterPhysics) {
        window.applyCharacterPhysics(player, currentChar);
        console.log('Applied physics for character:', currentChar);
    }
    
    resetObstacles();
    resetScore();
    frameCount = 0;
    clearNewScoreFlags();
    
    return true;
}

async function startGame() {
    console.log('startGame called - gameStarted:', gameStarted, 'gameRunning:', gameRunning, 'characterSelected:', characterSelected, 'readyToStart:', readyToStart);
    
    // Don't start if not in right state
    if (gameStarted && gameRunning) {
        console.log('Game already running, returning false');
        return false;
    }
    
    // If this is the first time starting, show character selector
    if (!characterSelected) {
        console.log('Character not selected, showing selector');
        showCharacterSelectorOnStart();
        return false;
    }
    
    // If we're on the ready screen, start the game
    if (readyToStart) {
        console.log('Ready to start, calling actuallyStartGame');
        return await actuallyStartGame();
    }
    
    // Otherwise, restart the game (after game over)
    console.log('Restarting game (after game over)');
    return await actuallyStartGame();
}

function handleGameOver() {
    gameRunning = false;
    window.gameRunning = false; // Update global flag
    const finalScore = getScore();
    setLastScore(finalScore);
    
    // Update final score in game over message
    const finalScoreSpan = document.getElementById('finalScore');
    if (finalScoreSpan) {
        finalScoreSpan.textContent = finalScore;
    }
    
    // Call showGameOverAchievement to prepare achievement banner and border styling
    showGameOverAchievement(finalScore);
    
    // Check if it's a high score
    if (isHighScore(finalScore)) {
        // For high scores: show initials prompt FIRST, game over screen will show after submission
        showInitialsPrompt();
    } else {
        // For non-high scores: show game over immediately
        gameOverDisplay.style.display = 'block';
    }
}

function handleSubmitInitials() {
    // Play button sound
    if (window.playButtonSound2) {
        window.playButtonSound2();
    }
    submitInitials(() => {
        gameOverDisplay.style.display = 'block';
    });
}

function update() {
    if (!gameRunning) return;
    
    frameCount++;
    
    const canvas = getCanvas();
    const thrustActive = getThrustActive() || false;;
    
    // Update player physics and check boundary collision
    const boundaryCollision = updatePlayer(thrustActive, canvas.height);
    if (boundaryCollision) {
        handleGameOver();
        return;
    }
    
    // Create new obstacles periodically
    if (frameCount % 120 === 0) {
        createObstacle(canvas.width, canvas.height);
    }
    
    // Update obstacles and check collisions
    const { collision, scoreIncrement } = updateObstacles(player);
    
    if (collision) {
        handleGameOver();
        return;
    }
    
    // Update score
    for (let i = 0; i < scoreIncrement; i++) {
        incrementScore();
    }
}

function draw(timestamp = 0) {
    // Skip rendering when modal is open to prevent conflicts
    if (modalOpen) return;
    
    const thrustActive = getThrustActive();
    // Show character if one has been selected (includes ready screen and gameplay)
    renderGame(thrustActive, gameRunning, timestamp, characterSelected);
}

function gameLoop(timestamp) {
    update();
    draw(timestamp);
    requestAnimationFrame(gameLoop);
}

// Initialize game
async function initGame() {
    const canvas = getCanvas();
    const submitBtn = document.getElementById('submitInitials');
    
    // Load audio file
    await loadAudio();
    
    // Setup input handlers
    setStartGameCallback(startGame);
    setSubmitInitialsCallback(handleSubmitInitials);
    setupCanvasInput(canvas);
    setupSubmitButton(submitBtn);
    
    // Initialize visual elements
    initializeStarLayers();
    createStars(canvas.width, canvas.height);
    
    // Load scores
    await loadScores();
    
    // Hide loading screen with fade
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
    
    // Start game loop
    gameLoop();
}

// Start everything when DOM is ready
initGame();

// Make title overlay clickable to start game
if (titleOverlay) {
    titleOverlay.addEventListener('click', async () => {
        console.log('Title overlay clicked');
        await startGame();
    });
}

// Make ready overlay clickable to start game
const readyOverlay = document.getElementById('readyOverlay');
if (readyOverlay) {
    readyOverlay.addEventListener('click', async () => {
        console.log('Ready overlay clicked');
        await startGame();
    });
}

// Responsive canvas handling - let CSS handle the scaling
function resizeCanvas() {
    // Canvas size is handled by CSS now (100% of container)
    // Container maintains 16:9 aspect ratio via max-width/max-height
    // No manual sizing needed here
}

// Call on load and resize
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => {
    setTimeout(resizeCanvas, 100); // Small delay for orientation change
});
resizeCanvas();

function positionOverlays() {
    const canvas = document.getElementById('gameCanvas');
    const titleOverlay = document.getElementById('titleOverlay');
    const gameOver = document.getElementById('gameOver');
    const initialsPrompt = document.getElementById('initialsPrompt');
    
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Position title overlay
    if (titleOverlay) {
        titleOverlay.style.position = 'fixed';
        titleOverlay.style.left = centerX + 'px';
        titleOverlay.style.top = centerY + 'px';
        titleOverlay.style.transform = 'translate(-50%, -50%)';
    }
    
    // Position game over
    if (gameOver) {
        gameOver.style.position = 'fixed';
        gameOver.style.left = centerX + 'px';
        gameOver.style.top = centerY + 'px';
        gameOver.style.transform = 'translate(-50%, -50%)';
    }
    
    // Position initials prompt (new high score entry)
    if (initialsPrompt) {
        initialsPrompt.style.position = 'fixed';
        initialsPrompt.style.left = centerX + 'px';
        initialsPrompt.style.top = centerY + 'px';
        initialsPrompt.style.transform = 'translate(-50%, -50%)';
    }
}

// Call it initially and on resize
positionOverlays();
window.addEventListener('resize', positionOverlays);
window.addEventListener('scroll', positionOverlays);

// Also reposition after scores load with smooth transition
const originalUpdateScoreboard = updateScoreboard;
updateScoreboard = function() {
    const titleOverlay = document.getElementById('titleOverlay');
    
    // Briefly hide to prevent glitch
    if (titleOverlay && titleOverlay.style.display !== 'none') {
        titleOverlay.style.opacity = '0';
    }
    
    originalUpdateScoreboard();
    
    // Reposition and show again
    setTimeout(() => {
        positionOverlays();
        if (titleOverlay && titleOverlay.style.display !== 'none') {
            titleOverlay.style.opacity = '1';
        }
    }, 10);
};

// Character selector
const characterModal = document.getElementById('characterModal');
const changeCharacterBtn = document.getElementById('changeCharacterBtn');
const closeModalBtn = document.getElementById('closeModal');
const characterGrid = document.getElementById('characterGrid');

if (changeCharacterBtn) {
    changeCharacterBtn.addEventListener('click', () => {
        // Play button sound
        if (window.playButtonSound2) {
            window.playButtonSound2();
        }
        modalOpen = true;
        characterModal.style.display = 'flex';
        renderCharacterGrid();
    });
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        // Play button sound
        if (window.playButtonSound2) {
            window.playButtonSound2();
        }
        modalOpen = false;
        characterModal.style.display = 'none';
        
        // If this was the initial character selection, show ready screen
        if (!characterSelected) {
            characterSelected = true;
            showReadyScreen();
        }
    });
}

// Close modal when clicking outside
if (characterModal) {
    characterModal.addEventListener('click', (e) => {
        if (e.target === characterModal) {
            modalOpen = false;
            characterModal.style.display = 'none';
            
            // If this was the initial character selection, show ready screen
            if (!characterSelected) {
                characterSelected = true;
                showReadyScreen();
            }
        }
    });
}

function renderCharacterGrid() {
    characterGrid.innerHTML = '';
    const allChars = getAllCharacters();
    const current = getCurrentCharacter();
    
    allChars.forEach(char => {
        const option = document.createElement('div');
        option.className = 'character-option' + (char.id === current ? ' selected' : '');
        
        const preview = document.createElement('canvas');
        preview.className = 'character-preview';
        preview.width = 100;
        preview.height = 100;
        const previewCtx = preview.getContext('2d');
        
        // Clear canvas with background
        previewCtx.fillStyle = '#1a1a2e';
        previewCtx.fillRect(0, 0, 100, 100);
        
        // Draw character preview directly using window.characters
        try {
            if (window.characters && window.characters[char.id] && window.characters[char.id].draw) {
                // Save and restore context to prevent interference
                previewCtx.save();
                // Pass 0 as animationTime for static preview
                window.characters[char.id].draw(previewCtx, 30, 30, false, true, 0);
                previewCtx.restore();
            }
        } catch (e) {
            console.error('Error drawing character preview:', e);
        }
        
        const name = document.createElement('div');
        name.className = 'character-name';
        name.textContent = char.name;
        
        option.appendChild(preview);
        option.appendChild(name);
        
        // Add character stats
        if (window.getCharacterStats) {
            const stats = window.getCharacterStats(char.id);
            if (stats) {
                const statsDiv = document.createElement('div');
                statsDiv.className = 'character-stats';
                statsDiv.innerHTML = `
                    <div class="stat-row">
                        <span class="stat-label">size:</span>
                        <span class="stat-stars">${'★'.repeat(stats.sizeRating)}${'☆'.repeat(5-stats.sizeRating)}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">agility:</span>
                        <span class="stat-stars">${'★'.repeat(stats.agilityRating)}${'☆'.repeat(5-stats.agilityRating)}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">control:</span>
                        <span class="stat-stars">${'★'.repeat(stats.controlRating)}${'☆'.repeat(5-stats.controlRating)}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">survival:</span>
                        <span class="stat-stars">${'★'.repeat(stats.survivabilityRating)}${'☆'.repeat(5-stats.survivabilityRating)}</span>
                    </div>
                `;
                option.appendChild(statsDiv);
            }
        }
        
        option.addEventListener('click', () => {
            // Play button sound
            if (window.playButtonSound) {
                window.playButtonSound();
            }
            setCurrentCharacter(char.id);
            renderCharacterGrid();
        });
        
        characterGrid.appendChild(option);
    });
}

// Mute button handlers
if (muteBtn) {
    muteBtn.addEventListener('click', toggleMute);
}

const modalMuteBtn = document.getElementById('modalMuteBtn');
if (modalMuteBtn) {
    modalMuteBtn.addEventListener('click', toggleMute);
}




// Credits modal
const creditsModal = document.getElementById('creditsModal');
const creditsBtn = document.getElementById('creditsBtn');
const closeCreditsBtn = document.getElementById('closeCreditsModal');

if (creditsBtn) {
    creditsBtn.addEventListener('click', () => {
        // Play button sound
        if (window.playButtonSound2) {
            window.playButtonSound2();
        }
        modalOpen = true;
        creditsModal.style.display = 'flex';
    });
}

if (closeCreditsBtn) {
    closeCreditsBtn.addEventListener('click', () => {
        // Play button sound
        if (window.playButtonSound2) {
            window.playButtonSound2();
        }
        modalOpen = false;
        creditsModal.style.display = 'none';
    });
}

// Close credits modal when clicking outside
if (creditsModal) {
    creditsModal.addEventListener('click', (e) => {
        if (e.target === creditsModal) {
            modalOpen = false;
            creditsModal.style.display = 'none';
        }
    });
}