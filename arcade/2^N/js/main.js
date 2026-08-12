// main.js

let currentGame = null;
let currentDifficulty = '11';
let puzzleInput = null;
window.isDifficultyModalOpen = false;

function initPuzzleInput() {
    const boardEl = document.getElementById('gameBoard');

    if (currentGame) {
        currentGame.renderer = AdPuzzle.createRenderer(boardEl);
    }

    if (puzzleInput) {
        puzzleInput.destroy();
    }

    puzzleInput = AdPuzzle.createInput({
        onMove: (dir) => {
            if (!currentGame || currentGame.gameOver || currentGame.waitingForInitials) return;
            const moved = currentGame.move(dir);
            if (moved) {
                currentGame.addRandomTile();
                currentGame.render();
                document.getElementById('score').textContent = currentGame.score;
                if (currentGame.checkGameOver()) {
                    if (currentGame.justWon) {
                        const game = currentGame;
                        setTimeout(() => game.handleGameOver(), 500);
                    } else {
                        currentGame.handleGameOver();
                    }
                }
            }
        },
        isActive: () => {
            return currentGame
                && !currentGame.gameOver
                && !currentGame.waitingForInitials
                && document.querySelector('.container').classList.contains('game-active')
                && !document.querySelector('.scoreboard-modal.active')
                && !document.querySelector('.instructions-modal.active')
                && !document.querySelector('.credits-modal.active');
        },
    }, boardEl);
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Start loading scores
        await loadScores();

        // Hide loading screen
        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500); // Wait for fade out animation

        // Title screen controls
        const titleScreen = document.getElementById('titleScreen');
        const difficultyModal = document.getElementById('difficultyModal');
        const startButton = document.getElementById('startButton');
        
        // Start button click
        startButton.addEventListener('click', () => {
            titleScreen.classList.remove('active');
            difficultyModal.classList.add('active');
            window.isDifficultyModalOpen = true;
        });
        
        // Spacebar to start
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && titleScreen.classList.contains('active')) {
                e.preventDefault();
                titleScreen.classList.remove('active');
                difficultyModal.classList.add('active');
                window.isDifficultyModalOpen = true;
            }
        });

        // Setup difficulty selection with dropdown
        const difficultyButtons = document.querySelectorAll('.difficulty-btn');
        
        // Difficulty Dropdown
        const difficultyDropdown = document.getElementById('difficultyDropdown');
        const difficultyDropdownSelected = document.getElementById('difficultyDropdownSelected');
        const difficultyDropdownOptions = document.getElementById('difficultyDropdownOptions');
        const selectedDifficultyText = document.getElementById('selectedDifficulty');
        
        let selectedDifficulty = '11';
        let selectedTarget = 2048;
        
        // Toggle dropdown
        difficultyDropdownSelected.addEventListener('click', () => {
            difficultyDropdown.classList.toggle('open');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (difficultyDropdown && !difficultyDropdown.contains(e.target)) {
                difficultyDropdown.classList.remove('open');
            }
        });
        
        // Handle option selection
        const difficultyOptions = document.querySelectorAll('.dropdown-option-diff');
        difficultyOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const difficulty = option.dataset.difficulty;
                const target = parseInt(option.dataset.target);
                const label = option.querySelector('.option-label-diff').textContent;
                const targetText = option.querySelector('.option-target-diff').textContent;
                
                // Update selected difficulty
                selectedDifficulty = difficulty;
                selectedTarget = target;
                
                // Update selected text
                selectedDifficultyText.textContent = `${label} • ${targetText}`;
                
                // Close dropdown
                difficultyDropdown.classList.remove('open');
            });
        });
        
        // Start Game button
        document.getElementById('startGameBtn').addEventListener('click', () => {
            const difficulty = selectedDifficulty;
            const target = selectedTarget;
            currentDifficulty = difficulty;
            
            // Update game title to show N value
            const gameTitle = document.getElementById('gameTitle');
            if (gameTitle) {
                if (difficulty === 'endless') {
                    gameTitle.textContent = '2^∞';
                } else {
                    gameTitle.textContent = `2^${difficulty}`;
                }
            }
            
            // Update target display
            const targetDisplay = document.getElementById('targetDisplay');
            if (targetDisplay) {
                if (difficulty === 'endless') {
                    targetDisplay.textContent = '∞ ENDLESS MODE - NO LIMIT';
                } else {
                    targetDisplay.textContent = `TARGET: ${target}`;
                }
            }
            
            // Show the game container
            document.querySelector('.container').classList.add('game-active');
            
            // Hide difficulty modal
            difficultyModal.classList.remove('active');
            window.isDifficultyModalOpen = false;
            
            // Start game with selected difficulty
            currentGame = new Game2048(difficulty, target);
            initPuzzleInput();
        });
        
        // Legacy support for any remaining difficulty buttons
        difficultyButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const difficulty = btn.dataset.difficulty;
                const target = parseInt(btn.dataset.target);
                currentDifficulty = difficulty;
                
                // Update game title to show N value
                const gameTitle = document.getElementById('gameTitle');
                if (gameTitle) {
                    if (difficulty === 'endless') {
                        gameTitle.textContent = '2^∞';
                    } else {
                        gameTitle.textContent = `2^${difficulty}`;
                    }
                }
                
                // Update target display
                const targetDisplay = document.getElementById('targetDisplay');
                if (targetDisplay) {
                    if (difficulty === 'endless') {
                        targetDisplay.textContent = '∞ ENDLESS MODE - NO LIMIT';
                    } else {
                        targetDisplay.textContent = `TARGET: ${target}`;
                    }
                }
                
                // Show the game container
                document.querySelector('.container').classList.add('game-active');
                
                // Hide difficulty modal
                difficultyModal.classList.remove('active');
                window.isDifficultyModalOpen = false;
                
                // Start game with selected difficulty
                currentGame = new Game2048(difficulty, target);
                initPuzzleInput();
            });
        });

        let scoreboardOpen = false;

        // Scoreboard modal controls
        document.getElementById('toggleScoreboard').addEventListener('click', () => {
            if (scoreboardOpen) return; // Prevent double-clicks
            scoreboardOpen = true;
            
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                updateScoreboard('overall'); // Default to overall leaderboard
                document.getElementById('scoreboardModal').classList.add('active');
            }, 10);
        });

        document.getElementById('closeScoreboard').addEventListener('click', () => {
            document.getElementById('scoreboardModal').classList.remove('active');
            scoreboardOpen = false;
            // Show difficulty modal again immediately if we're in difficulty selection mode
            if (window.isDifficultyModalOpen) {
                document.getElementById('difficultyModal').classList.add('active');
            }
        });

        // Close modal when clicking outside the content
        document.getElementById('scoreboardModal').addEventListener('click', (e) => {
            if (e.target.id === 'scoreboardModal') {
                document.getElementById('scoreboardModal').classList.remove('active');
                scoreboardOpen = false;
                // Show difficulty modal again immediately if we're in difficulty selection mode
                if (window.isDifficultyModalOpen) {
                    document.getElementById('difficultyModal').classList.add('active');
                }
            }
        });

        // Custom Dropdown for Mode Selection
        const dropdown = document.getElementById('modeDropdown');
        const dropdownSelected = document.getElementById('dropdownSelected');
        const dropdownOptions = document.getElementById('dropdownOptions');
        const selectedModeText = document.getElementById('selectedMode');
        
        dropdownSelected.addEventListener('click', () => {
            dropdown.classList.toggle('open');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('open');
            }
        });
        
        // Handle option selection
        const options = document.querySelectorAll('.dropdown-option');
        options.forEach(option => {
            option.addEventListener('click', () => {
                const difficulty = option.dataset.difficulty;
                const label = option.querySelector('.option-label').textContent;
                const target = option.querySelector('.option-target').textContent;
                
                // Update selected text
                selectedModeText.textContent = `${label} (${target})`;
                
                // Close dropdown
                dropdown.classList.remove('open');
                
                // Update scoreboard
                updateScoreboard(difficulty);
            });
        });

        // Instructions modal controls
        document.getElementById('toggleInstructions').addEventListener('click', () => {
            document.getElementById('instructionsModal').classList.add('active');
        });

        document.getElementById('closeInstructions').addEventListener('click', () => {
            document.getElementById('instructionsModal').classList.remove('active');
            // Show difficulty modal again immediately if we're in difficulty selection mode
            if (window.isDifficultyModalOpen) {
                document.getElementById('difficultyModal').classList.add('active');
            }
        });

        // Close modal when clicking outside the content
        document.getElementById('instructionsModal').addEventListener('click', (e) => {
            if (e.target.id === 'instructionsModal') {
                document.getElementById('instructionsModal').classList.remove('active');
                // Show difficulty modal again immediately if we're in difficulty selection mode
                if (window.isDifficultyModalOpen) {
                    document.getElementById('difficultyModal').classList.add('active');
                }
            }
        });

        // Credits modal controls
        document.getElementById('toggleCredits').addEventListener('click', () => {
            document.getElementById('creditsModal').classList.add('active');
        });

        document.getElementById('closeCredits').addEventListener('click', () => {
            document.getElementById('creditsModal').classList.remove('active');
            // Show difficulty modal again immediately if we're in difficulty selection mode
            if (window.isDifficultyModalOpen) {
                document.getElementById('difficultyModal').classList.add('active');
            }
        });

        // Close modal when clicking outside the content
        document.getElementById('creditsModal').addEventListener('click', (e) => {
            if (e.target.id === 'creditsModal') {
                document.getElementById('creditsModal').classList.remove('active');
                // Show difficulty modal again immediately if we're in difficulty selection mode
                if (window.isDifficultyModalOpen) {
                    document.getElementById('difficultyModal').classList.add('active');
                }
            }
        });

        // Difficulty modal menu buttons
        document.getElementById('difficultyHowToPlay').addEventListener('click', () => {
            // Hide difficulty modal temporarily to show instructions
            document.getElementById('difficultyModal').classList.remove('active');
            document.getElementById('instructionsModal').classList.add('active');
        });

        document.getElementById('difficultyHighScores').addEventListener('click', () => {
            // Hide difficulty modal temporarily to show scoreboard
            document.getElementById('difficultyModal').classList.remove('active');
            updateScoreboard('overall');
            document.getElementById('scoreboardModal').classList.add('active');
        });

        document.getElementById('difficultyCredits').addEventListener('click', () => {
            // Hide difficulty modal temporarily to show credits
            document.getElementById('difficultyModal').classList.remove('active');
            document.getElementById('creditsModal').classList.add('active');
        });
    } catch (error) {
        console.error('Error initializing game:', error);
        // Hide loading screen even if there's an error
        document.getElementById('loadingScreen').classList.add('hidden');
    }
});
