let gameCamera;
let gameInitialized = false;
let gameMusic;
let isMuted = false;

function init() {
    document.querySelector('.loading-spinner').classList.add('active');
    document.getElementById('startButton').style.display = 'none';
    
    setTimeout(() => {
        const { scene, camera, canvas } = initRenderer();
        gameCamera = camera;
        
        initRoomSystem(scene);
        
        createMaze(scene);
        createInscriptions(scene);
        createVoidEffects(scene);
        createRoomPortals(scene, 1);
        initPlayer(camera);
        initInput(canvas);
        
        const roomConfig = ROOMS[1];
        if (roomConfig.hasNPC && typeof createNPC !== 'undefined') {
            createNPC(scene, roomConfig.npcPosition.x, roomConfig.npcPosition.z, roomConfig.npcId);
        }
        
        initializeEnvironmentMap();
        
        gameInitialized = true;
        initLoreSystem();
        
        hideTitle();
        updateRoomNameDisplay(1);
        
        gameLoop();
    }, 500);
}

function hideTitle() {
    const titleScreen = document.getElementById('titleScreen');
    titleScreen.classList.add('hidden');
    
    setTimeout(() => {
        titleScreen.style.display = 'none';
        document.getElementById('openingMessage').style.display = 'flex';
    }, 800);
}

function updateRoomNameDisplay(roomNumber) {
    const roomNameEl = document.getElementById('roomName');
    const room = ROOMS[roomNumber];
    if (roomNameEl && room) {
        roomNameEl.textContent = room.name;
    }
}

function startMusic() {
    gameMusic = document.getElementById('gameMusic');
    if (gameMusic) {
        gameMusic.volume = MUSIC_VOLUME;
        gameMusic.play().catch(err => {
            console.log('Audio playback failed:', err);
        });
    }
}

function toggleMute() {
    isMuted = !isMuted;
    const muteButton = document.getElementById('muteButton');
    
    if (gameMusic) {
        gameMusic.muted = isMuted;
    }
    
    if (muteButton) {
        muteButton.textContent = isMuted ? '🔇' : '🔊';
    }
}

function gameLoop() {
    requestAnimationFrame(gameLoop);
    
    if (!gameInitialized) return;
    
    if (!getIsOutside()) {
        updatePlayer();
        updateVoidEffects();
        updateInscriptions();
        updateAtmosphericText();
        
        if (typeof updateRoomPortals !== 'undefined') {
            updateRoomPortals();
        }

        if (typeof checkRoomTransition !== 'undefined' && !isInTransition()) {
            const transitionResult = checkRoomTransition(getCurrentRoom());
            if (transitionResult.shouldTransition) {
                loadRoom(transitionResult.destinationRoom, true, transitionResult.spawnData);
            }
        }
        
        if (typeof updateNPC !== 'undefined') {
            updateNPC();
        }
    }
    
    render(gameCamera);
}

function fullGameReset() {
    const scene = getScene();
    
    resetOutside();
    
    setTimeout(() => {
        gameInitialized = false;
        
        if (typeof loadRoom !== 'undefined') {
            loadRoom(1, false);
        }
        
        resetPlayer();
        
        if (typeof resetLoreSystem !== 'undefined') {
            resetLoreSystem();
        }
        
        document.getElementById('ui').style.display = 'block';
        
        if (typeof initializeEnvironmentMap !== 'undefined') {
            initializeEnvironmentMap();
        }
        
        gameInitialized = true;
        
        updateRoomNameDisplay(1);
        
        if (gameMusic) {
            gameMusic.currentTime = 0;
            gameMusic.play();
        }
    }, 100);
}

window.addEventListener('load', () => {
    document.getElementById('startButton').addEventListener('click', () => {
        init();
    });
    
    const closeMessageBtn = document.getElementById('closeMessageBtn');
    if (closeMessageBtn) {
        closeMessageBtn.addEventListener('click', () => {
            document.getElementById('openingMessage').style.display = 'none';
            document.getElementById('ui').style.display = 'block';
            startMusic();
        });
    }
    
    const muteButton = document.getElementById('muteButton');
    if (muteButton) {
        muteButton.addEventListener('click', toggleMute);
    }
    
    const playAgainBtn = document.getElementById('playAgainBtn');
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', () => {
            document.getElementById('victory').style.display = 'none';
            fullGameReset();
        });
    }
    
    const creditsButton = document.getElementById('creditsButton');
    if (creditsButton) {
        creditsButton.addEventListener('click', () => {
            document.getElementById('creditsModal').style.display = 'block';
        });
    }
    
    const closeCreditsBtn = document.getElementById('closeCreditsBtn');
    if (closeCreditsBtn) {
        closeCreditsBtn.addEventListener('click', () => {
            document.getElementById('creditsModal').style.display = 'none';
        });
    }
    
    const creditsModal = document.getElementById('creditsModal');
    if (creditsModal) {
        creditsModal.addEventListener('click', (e) => {
            if (e.target.id === 'creditsModal') {
                document.getElementById('creditsModal').style.display = 'none';
            }
        });
    }
    
    const helpButton = document.getElementById('helpButton');
    if (helpButton) {
        helpButton.addEventListener('click', () => {
            const instructions = document.getElementById('instructions');
            instructions.classList.toggle('visible');
        });
    }
    
    const closeHelp = document.querySelector('.close-help');
    if (closeHelp) {
        closeHelp.addEventListener('click', () => {
            document.getElementById('instructions').classList.remove('visible');
        });
    }
    
    gameLoop();
});