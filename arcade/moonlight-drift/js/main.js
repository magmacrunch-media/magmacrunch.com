// Main game module - orchestrates all other modules and runs the game loop

const gameOverDisplay = document.getElementById('gameOver');
const instructionsDisplay = document.getElementById('instructions');
const titleOverlay = document.getElementById('titleOverlay');
const muteBtn = document.getElementById('muteBtn');

// Web Audio API setup via adenosine-audio
let musicStarted = false;

// iOS has no Ogg Vorbis decoder, and every browser on iOS is WebKit, so Chrome
// and Firefox there fail identically - the audio was simply silent on every
// iPhone and iPad. Each clip now ships as .ogg and .mp3; pick whichever this
// browser can actually decode. Ogg stays preferred where it works, since the
// mp3 is a transcode of it.
const AUDIO_EXT = document.createElement('audio')
    .canPlayType('audio/ogg; codecs="vorbis"') ? '.ogg' : '.mp3';
const audioSrc = (path) => path.replace(/\.ogg$/, AUDIO_EXT);

async function loadAudio() {
    await AdAudio.init({
        music: { url: audioSrc('audio/moonlightdrift-gameloop.ogg'), volume: 0.3, fadeIn: 2.0 },
        sfx: {
            crash:   { url: audioSrc('audio/crashsound.ogg'), volume: 0.5 },
            button1: { url: audioSrc('audio/buttonsound1.ogg'), volume: 0.4 },
            button2: { url: audioSrc('audio/buttonsound2.ogg'), volume: 0.4 },
        },
    });
    AdAudio.handleVisibility({ pauseMusic: true });
}

async function playMusic() {
    if (musicStarted) return;
    await AdAudio.playMusic();
    musicStarted = true;
}

function toggleMute() {
    const muted = AdAudio.toggleMusicMute();
    AdAudio.setSfxMuted(muted);
    const buttonText = muted ? 'SFX OFF' : 'SFX ON';

    if (muteBtn) {
        muteBtn.textContent = buttonText;
    }
    const modalMuteBtn = document.getElementById('modalMuteBtn');
    if (modalMuteBtn) {
        modalMuteBtn.textContent = buttonText;
    }
}

function playCrashSound() {
    AdAudio.playSfx('crash');
}

function playButtonSound() {
    AdAudio.playSfx('button1');
}

function playButtonSound2() {
    AdAudio.playSfx('button2');
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

    if (!musicStarted) {
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

window.addEventListener('beforeunload', () => {
    AdAudio.destroy();
});
