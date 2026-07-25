// Main game module - orchestrates all other modules and runs the game loop

const gameOverDisplay = document.getElementById('gameOver');
const instructionsDisplay = document.getElementById('instructions');
const titleOverlay = document.getElementById('titleOverlay');
const muteBtn = document.getElementById('muteBtn');

// Web Audio API setup for gapless looping
let audioContext;
let audioBuffer;
let crashSoundBuffer;
let buttonSoundBuffer;
let buttonSound2Buffer;
let sourceNode;
let gainNode;
let musicStarted = false;
let isMuted = false;
let audioLoaded = false;
let crashSoundLoaded = false;
let buttonSoundLoaded = false;
let buttonSound2Loaded = false;

async function loadAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        const response = await fetch('audio/moonlightdrift-gameloop.ogg');
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioLoaded = true;

        const crashResponse = await fetch('audio/crashsound.ogg');
        const crashArrayBuffer = await crashResponse.arrayBuffer();
        crashSoundBuffer = await audioContext.decodeAudioData(crashArrayBuffer);
        crashSoundLoaded = true;

        const buttonResponse = await fetch('audio/buttonsound1.ogg');
        const buttonArrayBuffer = await buttonResponse.arrayBuffer();
        buttonSoundBuffer = await audioContext.decodeAudioData(buttonArrayBuffer);
        buttonSoundLoaded = true;

        const button2Response = await fetch('audio/buttonsound2.ogg');
        const button2ArrayBuffer = await button2Response.arrayBuffer();
        buttonSound2Buffer = await audioContext.decodeAudioData(button2ArrayBuffer);
        buttonSound2Loaded = true;
    } catch (e) {
        console.error('Error loading audio:', e);
    }
}

async function playMusic() {
    if (!audioLoaded || musicStarted || !audioContext || !audioBuffer) {
        return;
    }

    try {
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        gainNode = audioContext.createGain();
        gainNode.gain.value = 0;
        gainNode.connect(audioContext.destination);

        sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(gainNode);
        sourceNode.loop = true;
        sourceNode.start(0);

        const targetVolume = isMuted ? 0 : 0.3;
        const currentTime = audioContext.currentTime;

        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(targetVolume, currentTime + 2.0);

        musicStarted = true;
    } catch (e) {
        console.error('Error starting music:', e);
        musicStarted = false;
    }
}

function toggleMute() {
    isMuted = !isMuted;
    if (gainNode && audioContext) {
        const targetVolume = isMuted ? 0 : 0.3;
        const currentTime = audioContext.currentTime;

        gainNode.gain.cancelScheduledValues(currentTime);
        gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
        gainNode.gain.linearRampToValueAtTime(targetVolume, currentTime + 0.5);
    }
    const buttonText = isMuted ? 'SFX OFF' : 'SFX ON';

    if (muteBtn) {
        muteBtn.textContent = buttonText;
    }
    const modalMuteBtn = document.getElementById('modalMuteBtn');
    if (modalMuteBtn) {
        modalMuteBtn.textContent = buttonText;
    }
}

function playCrashSound() {
    if (!crashSoundLoaded || !audioContext || isMuted) {
        return;
    }

    try {
        const sfxSource = audioContext.createBufferSource();
        sfxSource.buffer = crashSoundBuffer;

        const sfxGain = audioContext.createGain();
        sfxGain.gain.value = 0.5;

        sfxSource.connect(sfxGain);
        sfxGain.connect(audioContext.destination);

        sfxSource.start(0);
    } catch (e) {
        console.error('Error playing crash sound:', e);
    }
}

function playButtonSound() {
    if (!buttonSoundLoaded || !audioContext || isMuted) {
        return;
    }

    try {
        const sfxSource = audioContext.createBufferSource();
        sfxSource.buffer = buttonSoundBuffer;

        const sfxGain = audioContext.createGain();
        sfxGain.gain.value = 0.4;

        sfxSource.connect(sfxGain);
        sfxGain.connect(audioContext.destination);

        sfxSource.start(0);
    } catch (e) {
        console.error('Error playing button sound:', e);
    }
}

function playButtonSound2() {
    if (!buttonSound2Loaded || !audioContext || isMuted) {
        return;
    }

    try {
        const sfxSource = audioContext.createBufferSource();
        sfxSource.buffer = buttonSound2Buffer;

        const sfxGain = audioContext.createGain();
        sfxGain.gain.value = 0.4;

        sfxSource.connect(sfxGain);
        sfxGain.connect(audioContext.destination);

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
window.modalOpen = false;
let characterSelected = false;
let readyToStart = false;

// Make gameRunning accessible globally for input handler
window.gameRunning = false;

async function showCharacterSelectorOnStart() {
    titleOverlay.style.display = 'none';

    const characterSelector = document.getElementById('characterSelector');
    if (characterSelector) {
        characterSelector.style.display = 'flex';
    }

    window.modalOpen = true;
    characterModal.style.display = 'flex';
    renderCharacterGrid();

    if (!musicStarted && audioLoaded) {
        await playMusic();
    }
}

function showReadyScreen() {
    readyToStart = true;
    const readyOverlay = document.getElementById('readyOverlay');
    if (readyOverlay) {
        readyOverlay.style.display = 'block';
    }
}

async function actuallyStartGame() {
    gameStarted = true;
    gameRunning = true;
    window.gameRunning = true;
    readyToStart = false;
    gameOverDisplay.style.display = 'none';
    instructionsDisplay.style.display = 'none';
    titleOverlay.style.display = 'none';

    const readyOverlay = document.getElementById('readyOverlay');
    if (readyOverlay) {
        readyOverlay.style.display = 'none';
    }

    hideInitialsPrompt();

    resetPlayer();

    const currentChar = getCurrentCharacter();
    if (window.applyCharacterPhysics) {
        window.applyCharacterPhysics(player, currentChar);
    }

    resetObstacles();
    resetScore();
    frameCount = 0;
    clearNewScoreFlags();

    return true;
}

async function startGame() {
    if (gameStarted && gameRunning) {
        return false;
    }

    if (!characterSelected) {
        showCharacterSelectorOnStart();
        return false;
    }

    if (readyToStart) {
        return await actuallyStartGame();
    }

    return await actuallyStartGame();
}

function handleGameOver() {
    gameRunning = false;
    window.gameRunning = false;
    const finalScore = getScore();
    setLastScore(finalScore);

    const finalScoreSpan = document.getElementById('finalScore');
    if (finalScoreSpan) {
        finalScoreSpan.textContent = finalScore;
    }

    showGameOverAchievement(finalScore);

    if (isHighScore(finalScore)) {
        showInitialsPrompt();
    } else {
        gameOverDisplay.style.display = 'block';
    }
}

function handleSubmitInitials() {
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
    const thrustActive = getThrustActive() || false;

    const boundaryCollision = updatePlayer(thrustActive, canvas.height);
    if (boundaryCollision) {
        handleGameOver();
        return;
    }

    if (frameCount % 120 === 0) {
        createObstacle(canvas.width, canvas.height);
    }

    const { collision, scoreIncrement } = updateObstacles(player);

    if (collision) {
        handleGameOver();
        return;
    }

    for (let i = 0; i < scoreIncrement; i++) {
        incrementScore();
    }
}

function draw(timestamp = 0) {
    if (window.modalOpen) return;

    const thrustActive = getThrustActive();
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

    await loadAudio();

    setStartGameCallback(startGame);
    setSubmitInitialsCallback(handleSubmitInitials);
    setupCanvasInput(canvas);
    setupSubmitButton(submitBtn);

    initializeStarLayers();
    createStars(canvas.width, canvas.height);

    await loadScores();

    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }

    gameLoop();
}

initGame();

if (titleOverlay) {
    titleOverlay.addEventListener('click', async () => {
        await startGame();
    });
}

const readyOverlay = document.getElementById('readyOverlay');
if (readyOverlay) {
    readyOverlay.addEventListener('click', async () => {
        await startGame();
    });
}

function resizeCanvas() {
    // Canvas size is handled by CSS (100% of container)
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => {
    setTimeout(resizeCanvas, 100);
});
resizeCanvas();

// Character selector
const characterModal = document.getElementById('characterModal');
const changeCharacterBtn = document.getElementById('changeCharacterBtn');
const closeModalBtn = document.getElementById('closeModal');
const characterGrid = document.getElementById('characterGrid');

if (changeCharacterBtn) {
    changeCharacterBtn.addEventListener('click', () => {
        if (window.playButtonSound2) {
            window.playButtonSound2();
        }
        window.modalOpen = true;
        characterModal.style.display = 'flex';
        renderCharacterGrid();
    });
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        if (window.playButtonSound2) {
            window.playButtonSound2();
        }
        window.modalOpen = false;
        characterModal.style.display = 'none';

        if (!characterSelected) {
            characterSelected = true;
            showReadyScreen();
        }
    });
}

if (characterModal) {
    characterModal.addEventListener('click', (e) => {
        if (e.target === characterModal) {
            window.modalOpen = false;
            characterModal.style.display = 'none';

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

        previewCtx.fillStyle = '#1a1a2e';
        previewCtx.fillRect(0, 0, 100, 100);

        try {
            if (window.characters && window.characters[char.id] && window.characters[char.id].draw) {
                previewCtx.save();
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
        if (window.playButtonSound2) {
            window.playButtonSound2();
        }
        window.modalOpen = true;
        creditsModal.style.display = 'flex';
    });
}

if (closeCreditsBtn) {
    closeCreditsBtn.addEventListener('click', () => {
        if (window.playButtonSound2) {
            window.playButtonSound2();
        }
        window.modalOpen = false;
        creditsModal.style.display = 'none';
    });
}

if (creditsModal) {
    creditsModal.addEventListener('click', (e) => {
        if (e.target === creditsModal) {
            window.modalOpen = false;
            creditsModal.style.display = 'none';
        }
    });
}
