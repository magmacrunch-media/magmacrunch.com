// main.js - WITH SOUND EFFECTS SYSTEM

let currentGame = null;
let currentDifficulty = '6'; // Default game difficulty (not used for scoreboard default)

// Returns the difficulty to show in the scoreboard:
// - 'overall' if no game has been played this session (or ever)
// - otherwise the last-played mode (persisted across page loads)
function getScoreboardDefault() {
    return localStorage.getItem('lastPlayedDifficulty') || 'overall';
}
let gameMusic = null;
let musicEnabled = true;
let sfxEnabled = true;
let musicHasFadedIn = false; // Track if music has done initial fade-in

// Store active fade interval to prevent leaks
let activeFadeInterval = null;

// Track if we opened instructions/credits from settings
let returnToSettings = false;

// Track if we opened instructions from difficulty modal
let returnToLoreScreen = false;

// Binary display mode - enabled by default
let binaryDisplayMode = true;

// Sound Effects Manager - OPTIMIZED with audio pool
const SoundEffects = {
    sounds: {},
    audioPool: {}, // Pre-created audio elements for reuse
    poolSize: 3, // Number of instances per sound
    
    // Initialize all sound effects with audio pool
    init() {
        const soundFiles = {
            merge: 'audio/sfx/merge.ogg',
            spawn: 'audio/sfx/spawn.ogg',
            victory: 'audio/sfx/victory.ogg',
            gameOver: 'audio/sfx/gameover.ogg',
            move: 'audio/sfx/move.ogg',
            highScore: 'audio/sfx/highscore.ogg'
        };
        
        // Create audio pools for each sound
        Object.keys(soundFiles).forEach(soundName => {
            this.audioPool[soundName] = [];
            for (let i = 0; i < this.poolSize; i++) {
                const audio = new Audio();
                audio.src = soundFiles[soundName];
                audio.preload = 'auto';
                audio.volume = 0.3;
                
                // Handle loading errors gracefully
                audio.addEventListener('error', (e) => {
                    if (i === 0) { // Only log once per sound type
                        console.warn(`Sound effect not found: ${soundFiles[soundName]}`);
                    }
                });
                
                this.audioPool[soundName].push(audio);
            }
        });
        
        // Keep reference to first instance for volume control
        Object.keys(soundFiles).forEach(soundName => {
            this.sounds[soundName] = this.audioPool[soundName][0];
        });
    },
    
    // Play a sound effect using the audio pool
    play(soundName) {
        if (!sfxEnabled) return;
        
        const pool = this.audioPool[soundName];
        if (!pool || pool.length === 0) {
            console.warn(`Sound "${soundName}" not found`);
            return;
        }
        
        // Find an available audio element (not currently playing)
        let audio = pool.find(a => a.paused || a.ended);
        
        // If all are playing, use the first one anyway
        if (!audio) {
            audio = pool[0];
        }
        
        // Reset and play
        audio.currentTime = 0;
        audio.play().catch(err => {
            // Browser may block audio, that's ok
            // Removed console.log for performance
        });
    },
    
    // Set volume for a specific sound (0.0 to 1.0)
    setVolume(soundName, volume) {
        const pool = this.audioPool[soundName];
        if (pool) {
            pool.forEach(audio => {
                audio.volume = Math.max(0, Math.min(1, volume));
            });
        }
    },
    
    // Set volume for all sounds
    setGlobalVolume(volume) {
        Object.keys(this.audioPool).forEach(soundName => {
            this.setVolume(soundName, volume);
        });
    }
};

// Audio fade-in function (only fades in first time, then loops seamlessly)
function fadeInMusic(audioElement, duration = 2000) {
    if (!musicEnabled) return;
    
    // Clear any existing fade interval to prevent leaks
    if (activeFadeInterval !== null) {
        clearInterval(activeFadeInterval);
        activeFadeInterval = null;
    }
    
    // If music has already faded in once, just play at full volume
    if (musicHasFadedIn && audioElement.paused) {
        audioElement.volume = 1;
        audioElement.play().catch(() => {
            // Browser may block audio, that's ok
        });
        return;
    }

    // First time: fade in from 0 to 1 (OPTIMIZED: 15 steps instead of 50)
    audioElement.volume = 0;
    audioElement.play().catch(() => {
        // Browser may block audio, that's ok
    });
    
    const steps = 15; // Reduced from 50 for better performance
    const stepTime = duration / steps;
    const volumeIncrement = 1 / steps;
    let currentStep = 0;
    
    activeFadeInterval = setInterval(() => {
        currentStep++;
        audioElement.volume = Math.min(currentStep * volumeIncrement, 1);
        
        if (currentStep >= steps) {
            clearInterval(activeFadeInterval);
            activeFadeInterval = null;
            musicHasFadedIn = true; // Mark that initial fade-in is complete
        }
    }, stepTime);
}

// Audio fade-out function (OPTIMIZED: 15 steps instead of 50)
function fadeOutMusic(audioElement, duration = 1000) {
    // Clear any existing fade interval to prevent leaks
    if (activeFadeInterval !== null) {
        clearInterval(activeFadeInterval);
        activeFadeInterval = null;
    }
    
    const steps = 15; // Reduced from 50 for better performance
    const stepTime = duration / steps;
    const volumeDecrement = audioElement.volume / steps;
    let currentStep = 0;
    
    activeFadeInterval = setInterval(() => {
        currentStep++;
        audioElement.volume = Math.max(audioElement.volume - volumeDecrement, 0);
        
        if (currentStep >= steps) {
            clearInterval(activeFadeInterval);
            activeFadeInterval = null;
            audioElement.pause();
            musicHasFadedIn = false; // Reset flag when music stops
        }
    }, stepTime);
}

// Pause audio when tab is hidden to save resources
function setupVisibilityHandler() {
    document.addEventListener('visibilitychange', () => {
        if (!gameMusic) return;
        
        if (document.hidden) {
            // Tab hidden - pause to save CPU
            if (!gameMusic.paused) {
                gameMusic.pause();
            }
        } else {
            // Tab visible again - resume if music is enabled
            if (musicEnabled && gameMusic.paused) {
                gameMusic.play().catch(() => {
                    // Browser may block audio, that's ok
                });
            }
        }
    });
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize sound effects first
        SoundEffects.init();
        
        // Get audio element
        gameMusic = document.getElementById('gameMusic');
        
        // Setup visibility handler for better performance
        setupVisibilityHandler();
        
        // Start loading scores
        await loadScores();

        // Hide loading screen
        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);

        // Title screen navigation
        const titleScreen = document.getElementById('titleScreen');
        const loreScreen = document.getElementById('loreScreen');
        const difficultyModal = document.getElementById('difficultyModal');
        
        // Function to show the lore/rules screen
        const startGame = () => {
            titleScreen.classList.remove('active');
            loreScreen.classList.add('active');
            
            // Start music with fade-in
            if (gameMusic) {
                fadeInMusic(gameMusic, 2000);
            }
        };
        
        // Function to advance from lore screen to difficulty selector
        const showDifficulty = () => {
            loreScreen.classList.remove('active');
            difficultyModal.classList.add('active');
            
            // Sync quick toggle states with current settings
            const quickMusicToggle = document.getElementById('quickMusicToggle');
            const quickSfxToggle = document.getElementById('quickSfxToggle');
            
            if (quickMusicToggle) {
                if (musicEnabled) {
                    quickMusicToggle.classList.add('active');
                } else {
                    quickMusicToggle.classList.remove('active');
                }
                quickMusicToggle.querySelector('.toggle-state').textContent = musicEnabled ? 'ON' : 'OFF';
            }
            
            if (quickSfxToggle) {
                if (sfxEnabled) {
                    quickSfxToggle.classList.add('active');
                } else {
                    quickSfxToggle.classList.remove('active');
                }
                quickSfxToggle.querySelector('.toggle-state').textContent = sfxEnabled ? 'ON' : 'OFF';
            }
        };
        
        // Click handler for start button (title → lore)
        document.getElementById('startButton').addEventListener('click', startGame);
        
        // Click handler for continue button (lore → difficulty)
        document.getElementById('loreContinue').addEventListener('click', showDifficulty);
        
        // Spacebar handler: title screen OR lore screen
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                if (titleScreen.classList.contains('active')) {
                    e.preventDefault();
                    startGame();
                } else if (loreScreen.classList.contains('active')) {
                    e.preventDefault();
                    showDifficulty();
                }
            }
        });
        
        // Quick action button handlers
        const quickHighScores = document.getElementById('quickHighScores');
        const quickSettings = document.getElementById('quickSettings');
        
        // High Scores button - opens scoreboard from difficulty modal
        if (quickHighScores) {
            quickHighScores.addEventListener('click', () => {
                loreScreen.classList.remove('active');
                returnToLoreScreen = true;
                const scoreDefault = getScoreboardDefault();
                updateCustomDropdownValue(scoreDefault);
                updateScoreboard(scoreDefault);
                document.getElementById('scoreboardModal').classList.add('active');
                document.getElementById('scoreboardModal').classList.add('menu-mode');
            });
        }
        
        // Settings button - opens settings from difficulty modal
        if (quickSettings) {
            quickSettings.addEventListener('click', () => {
                loreScreen.classList.remove('active');
                returnToLoreScreen = true;
                document.getElementById('settingsModal').classList.add('active');
                document.getElementById('settingsModal').classList.add('menu-mode');
            });
        }

        // Setup difficulty selection
        const difficultyButtons = document.querySelectorAll('.difficulty-btn');
        
        difficultyButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const difficulty = btn.dataset.difficulty;
                const target = parseInt(btn.dataset.target);
                const theme = btn.dataset.theme || 'snes';
                currentDifficulty = difficulty;
                localStorage.setItem('lastPlayedDifficulty', difficulty);
                
                // Clean up old game instance to prevent memory leaks
                if (currentGame) {
                    currentGame.destroy();
                }
                
                // Apply theme to body
                document.body.setAttribute('data-theme', theme);
                
                // Add game-active class to enable animations
                document.body.classList.add('game-active');
                
                // Mark gauntlet mode for side panel highlighting
                if (difficulty === 'endless') {
                    document.body.classList.add('game-active-gauntlet');
                } else {
                    document.body.classList.remove('game-active-gauntlet');
                }
                
                // Hide difficulty modal
                difficultyModal.classList.remove('active');
                
                // Start game with selected difficulty
                currentGame = new Game2048(difficulty, target);
            });
        });

        let scoreboardOpen = false;

        // Scoreboard modal controls
        document.getElementById('toggleScoreboard').addEventListener('click', () => {
            if (scoreboardOpen) return;
            scoreboardOpen = true;
            
            setTimeout(() => {
                // Show overall if no game played yet, otherwise last-played mode
                const scoreDefault = getScoreboardDefault();
                updateCustomDropdownValue(scoreDefault);
                updateScoreboard(scoreDefault);
                document.getElementById('scoreboardModal').classList.add('active');
            }, 10);
        });

        document.getElementById('closeScoreboard').addEventListener('click', () => {
            document.getElementById('scoreboardModal').classList.remove('active');
            document.getElementById('scoreboardModal').classList.remove('menu-mode');
            
            // If we came from lore screen, go back to it
            if (returnToLoreScreen) {
                loreScreen.classList.add('active');
                returnToLoreScreen = false;
            }
            
            setTimeout(() => {
                scoreboardOpen = false;
            }, 300);
        });

        // Close modal when clicking outside the content
        document.getElementById('scoreboardModal').addEventListener('click', (e) => {
            if (e.target.id === 'scoreboardModal') {
                document.getElementById('scoreboardModal').classList.remove('active');
                document.getElementById('scoreboardModal').classList.remove('menu-mode');
                
                // If we came from lore screen, go back to it
                if (returnToLoreScreen) {
                    loreScreen.classList.add('active');
                    returnToLoreScreen = false;
                }
                
                setTimeout(() => {
                    scoreboardOpen = false;
                }, 300);
            }
        });

        // Custom dropdown functionality
        const customDropdown = document.getElementById('customDropdown');
        const dropdownSelected = document.getElementById('dropdownSelected');
        const dropdownOptions = document.getElementById('dropdownOptions');
        
        // Toggle dropdown open/closed
        if (dropdownSelected) {
            dropdownSelected.addEventListener('click', (e) => {
                e.stopPropagation();
                customDropdown.classList.toggle('open');
            });
        }
        
        // Handle option selection
        if (dropdownOptions) {
            dropdownOptions.addEventListener('click', (e) => {
                if (e.target.classList.contains('dropdown-option')) {
                    const value = e.target.dataset.value;
                    const text = e.target.textContent;
                    
                    // Update selected display
                    document.querySelector('.selected-text').textContent = text;
                    
                    // Update active state
                    document.querySelectorAll('.dropdown-option').forEach(opt => {
                        opt.classList.remove('active');
                    });
                    e.target.classList.add('active');
                    
                    // Close dropdown
                    customDropdown.classList.remove('open');
                    
                    // Update scoreboard
                    updateScoreboard(value);
                }
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (customDropdown && !customDropdown.contains(e.target)) {
                customDropdown.classList.remove('open');
            }
        });
        
        // Helper function to update dropdown value
        function updateCustomDropdownValue(difficulty) {
            const options = document.querySelectorAll('.dropdown-option');
            options.forEach(opt => {
                if (opt.dataset.value === difficulty) {
                    document.querySelector('.selected-text').textContent = opt.textContent;
                    opt.classList.add('active');
                } else {
                    opt.classList.remove('active');
                }
            });
        }

        // Instructions modal controls
        document.getElementById('closeInstructions').addEventListener('click', () => {
            document.getElementById('instructionsModal').classList.remove('active');
            returnToSettings = false;
        });

        document.getElementById('instructionsToSettings').addEventListener('click', () => {
            document.getElementById('instructionsModal').classList.remove('active');
            document.getElementById('settingsModal').classList.add('active');
            returnToSettings = false;
        });

        document.getElementById('instructionsModal').addEventListener('click', (e) => {
            if (e.target.id === 'instructionsModal') {
                document.getElementById('instructionsModal').classList.remove('active');
                returnToSettings = false;
            }
        });

        // Settings modal controls
        document.getElementById('toggleSettings').addEventListener('click', () => {
            document.getElementById('settingsModal').classList.add('active');
        });

        document.getElementById('closeSettings').addEventListener('click', () => {
            document.getElementById('settingsModal').classList.remove('active');
            document.getElementById('settingsModal').classList.remove('menu-mode');
            
            // If we came from lore screen, go back to it
            if (returnToLoreScreen) {
                loreScreen.classList.add('active');
                returnToLoreScreen = false;
            }
        });

        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') {
                document.getElementById('settingsModal').classList.remove('active');
                document.getElementById('settingsModal').classList.remove('menu-mode');
                
                // If we came from lore screen, go back to it
                if (returnToLoreScreen) {
                    loreScreen.classList.add('active');
                    returnToLoreScreen = false;
                }
            }
        });

        // Settings links to other modals
        document.getElementById('settingsHowToPlay').addEventListener('click', () => {
            returnToSettings = true; // Remember we came from settings
            document.getElementById('settingsModal').classList.remove('active');
            const instructionsModal = document.getElementById('instructionsModal');
            instructionsModal.classList.add('active');
            
            // Reset scroll position to top
            const instructionsContent = instructionsModal.querySelector('.instructions-content');
            if (instructionsContent) {
                instructionsContent.scrollTop = 0;
            }
        });

        document.getElementById('settingsCredits').addEventListener('click', () => {
            returnToSettings = true; // Remember we came from settings
            document.getElementById('settingsModal').classList.remove('active');
            document.getElementById('creditsModal').classList.add('active');
        });

        // Side panel "full rules" link opens instructions modal
        const sidePanelHowToPlay = document.getElementById('sidePanelHowToPlay');
        if (sidePanelHowToPlay) {
            sidePanelHowToPlay.addEventListener('click', () => {
                const instructionsModal = document.getElementById('instructionsModal');
                instructionsModal.classList.add('active');
                const instructionsContent = instructionsModal.querySelector('.instructions-content');
                if (instructionsContent) {
                    instructionsContent.scrollTop = 0;
                }
            });
        }

        // Music toggle - with proper cleanup
        document.getElementById('musicToggle').addEventListener('click', function() {
            musicEnabled = !musicEnabled;
            this.classList.toggle('active');
            this.querySelector('.toggle-status').textContent = musicEnabled ? 'ON' : 'OFF';
            
            if (musicEnabled && gameMusic) {
                fadeInMusic(gameMusic, 1000);
            } else if (gameMusic) {
                fadeOutMusic(gameMusic, 1000);
            }
        });

        // SFX toggle
        document.getElementById('sfxToggle').addEventListener('click', function() {
            sfxEnabled = !sfxEnabled;
            this.classList.toggle('active');
            this.querySelector('.toggle-status').textContent = sfxEnabled ? 'ON' : 'OFF';
            
            // Play a test sound when enabling
            if (sfxEnabled) {
                SoundEffects.play('spawn');
            }
        });

        // Binary display toggle
        const binaryToggle = document.getElementById('binaryToggle');
        if (binaryToggle) {
            binaryToggle.addEventListener('click', function() {
                binaryDisplayMode = !binaryDisplayMode;
                this.classList.toggle('active');
                this.querySelector('.toggle-status').textContent = binaryDisplayMode ? 'ON' : 'OFF';
                
                // Re-render the game board if game is active
                if (currentGame) {
                    currentGame.render();
                }
            });
        }

        // Performance mode toggle
        const performanceToggle = document.getElementById('performanceToggle');
        if (performanceToggle) {
            performanceToggle.addEventListener('click', function() {
                const performanceModeEnabled = document.body.classList.toggle('performance-mode');
                this.classList.toggle('active');
                this.querySelector('.toggle-status').textContent = performanceModeEnabled ? 'ON' : 'OFF';
            });
        }

        // Credits modal controls
        document.getElementById('closeCredits').addEventListener('click', () => {
            document.getElementById('creditsModal').classList.remove('active');
            returnToSettings = false;
        });

        document.getElementById('creditsToSettings').addEventListener('click', () => {
            document.getElementById('creditsModal').classList.remove('active');
            document.getElementById('settingsModal').classList.add('active');
            returnToSettings = false;
        });

        document.getElementById('creditsModal').addEventListener('click', (e) => {
            if (e.target.id === 'creditsModal') {
                document.getElementById('creditsModal').classList.remove('active');
                returnToSettings = false;
            }
        });
    } catch (error) {
        console.error('Error initializing game:', error);
        document.getElementById('loadingScreen').classList.add('hidden');
    }
});

// Cleanup on page unload to prevent memory leaks
window.addEventListener('beforeunload', () => {
    if (activeFadeInterval !== null) {
        clearInterval(activeFadeInterval);
        activeFadeInterval = null;
    }
    if (gameMusic) {
        gameMusic.pause();
        gameMusic.src = '';
    }
});
