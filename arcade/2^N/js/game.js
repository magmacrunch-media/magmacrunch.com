// game.js

class Game2048 {
    constructor(difficulty = '11', target = 2048) {
        this.size = 4;
        this.board = [];
        this.score = 0;
        this.gameOver = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.waitingForInitials = false;
        this.difficulty = difficulty;
        this.target = target;
        
        this.init();
    }
    
    init() {
        this.board = Array(this.size).fill().map(() => Array(this.size).fill(0));
        this.tileStates = {};
        this.score = 0;
        this.gameOver = false;
        this.waitingForInitials = false;
        this.addRandomTile();
        this.addRandomTile();
        
        // Clear "new" flags
        allScores.forEach(s => s.isNew = false);
        
        this.render();
    }
    
    addRandomTile() {
        const emptyCells = [];
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.board[i][j] === 0) {
                    emptyCells.push({row: i, col: j});
                }
            }
        }
        
        if (emptyCells.length > 0) {
            const {row, col} = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.board[row][col] = Math.random() < 0.9 ? 2 : 4;
            this.tileStates[`${row},${col}`] = 'new';
        }
    }
    
    move(direction) {
        const originalBoard = JSON.stringify(this.board);
        
        if (direction === 'left') {
            this.moveLeft();
        } else if (direction === 'right') {
            this.rotateBoard(2);
            this.moveLeft();
            this.rotateBoard(2);
        } else if (direction === 'up') {
            this.rotateBoard(3);
            this.moveLeft();
            this.rotateBoard(1);
        } else if (direction === 'down') {
            this.rotateBoard(1);
            this.moveLeft();
            this.rotateBoard(3);
        }
        
        return originalBoard !== JSON.stringify(this.board);
    }
    
    moveLeft() {
        for (let i = 0; i < this.size; i++) {
            let row = this.board[i].filter(val => val !== 0);
            
            for (let j = 0; j < row.length - 1; j++) {
                if (row[j] === row[j + 1]) {
                    row[j] *= 2;
                    this.score += row[j];
                    row.splice(j + 1, 1);
                }
            }
            
            while (row.length < this.size) {
                row.push(0);
            }
            
            this.board[i] = row;
        }
    }
    
    rotateBoard(times) {
        for (let t = 0; t < times; t++) {
            const newBoard = Array(this.size).fill().map(() => Array(this.size).fill(0));
            for (let i = 0; i < this.size; i++) {
                for (let j = 0; j < this.size; j++) {
                    newBoard[j][this.size - 1 - i] = this.board[i][j];
                }
            }
            this.board = newBoard;
        }
    }
    
    checkGameOver() {
        this.justWon = false;
        
        // Check if player reached the target (win condition)
        if (this.difficulty !== 'endless') {
            for (let i = 0; i < this.size; i++) {
                for (let j = 0; j < this.size; j++) {
                    if (this.board[i][j] >= this.target) {
                        this.gameOver = true;
                        this.justWon = true;
                        return true;
                    }
                }
            }
        }
        
        // Check for empty cells
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.board[i][j] === 0) return false;
            }
        }
        
        // Check for possible merges
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const current = this.board[i][j];
                if (j < this.size - 1 && current === this.board[i][j + 1]) return false;
                if (i < this.size - 1 && current === this.board[i + 1][j]) return false;
            }
        }
        
        this.gameOver = true;
        return true;
    }
    
    handleGameOver() {
        // Ensure allScores is an array
        if (!Array.isArray(allScores)) {
            allScores = [];
        }
        
        // Filter scores for current difficulty
        const difficultyScores = allScores
            .filter(s => s.difficulty === this.difficulty)
            .sort((a, b) => b.score - a.score);
        const lowestTopScore = difficultyScores.length >= 10 ? difficultyScores[9].score : -1;
        
        if (difficultyScores.length < 10 || this.score > lowestTopScore) {
            // It's a high score! Calculate what rank it will be
            let rank = 1;
            for (let i = 0; i < difficultyScores.length; i++) {
                if (this.score > difficultyScores[i].score) {
                    break;
                }
                rank++;
            }
            
            this.waitingForInitials = true;
            
            // Update the prompt with rank info (removed emoji to prevent encoding issues)
            const promptTitle = document.querySelector('#initialsPrompt h3');
            promptTitle.textContent = `NEW HIGH SCORE! YOU'RE #${rank}`;
            
            document.getElementById('initialsPrompt').classList.add('active');
            setTimeout(() => document.getElementById('initialsInput').focus(), 100);
        } else {
            // Not a high score, just show game over
            this.showGameOver();
        }
    }    
    
    submitInitials() {
        // Prevent double submission
        if (this.submittingInitials) {
            return;
        }
        this.submittingInitials = true;
        
        const initialsInput = document.getElementById('initialsInput');
        let initials = initialsInput.value.trim();
        
        // Only default if truly empty
        if (!initials || initials.length === 0) {
            initials = 'AAA';
        }
        
        // Ensure allScores is an array
        if (!Array.isArray(allScores)) {
            allScores = [];
        }
        
        allScores.push({ 
            initials: initials, 
            score: this.score, 
            difficulty: this.difficulty,
            isNew: true 
        });
        
        // Sort all scores (we'll filter by difficulty when displaying)
        allScores.sort((a, b) => b.score - a.score);
        
        scoreClient.save('2n', initials, this.score, { difficulty: this.difficulty });
        updateScoreboard(this.difficulty);
        
        // Hide prompt and clear input
        document.getElementById('initialsPrompt').classList.remove('active');
        initialsInput.value = '';
        this.waitingForInitials = false;
        
        // Wait before allowing another submission to prevent rapid duplicates
        setTimeout(() => {
            this.submittingInitials = false;
        }, 1000);
        
        this.showGameOver();
    }
    
    showGameOver() {
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOver').classList.add('active');
    }
    
    render() {
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.innerHTML = '';
        
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const tile = document.createElement('div');
                const state = this.tileStates[`${i},${j}`];
                tile.className = state ? `tile ${state}` : 'tile';
                const value = this.board[i][j];
                
                if (value !== 0) {
                    tile.textContent = value;
                    tile.setAttribute('data-value', value);
                }
                
                gameBoard.appendChild(tile);
            }
        }
        
        document.getElementById('score').textContent = this.score;
        this.tileStates = {};
    }
}

// Global event handlers — set up once, not per game instance
if (!window.gameHandlersSetup) {
    window.gameHandlersSetup = true;
    
    // ── Keyboard input ──
    document.addEventListener('keydown', (e) => {
        if (!currentGame || currentGame.gameOver || currentGame.waitingForInitials) return;
        if (!document.querySelector('.container').classList.contains('game-active')) return;
        if (document.querySelector('.scoreboard-modal.active') ||
            document.querySelector('.instructions-modal.active') ||
            document.querySelector('.credits-modal.active')) return;
        
        let moved = false;
        switch(e.key) {
            case 'ArrowUp':
                e.preventDefault();
                moved = currentGame.move('up');
                break;
            case 'ArrowDown':
                e.preventDefault();
                moved = currentGame.move('down');
                break;
            case 'ArrowLeft':
                e.preventDefault();
                moved = currentGame.move('left');
                break;
            case 'ArrowRight':
                e.preventDefault();
                moved = currentGame.move('right');
                break;
        }
        
        if (moved) {
            currentGame.addRandomTile();
            currentGame.render();
            if (currentGame.checkGameOver()) {
                if (currentGame.justWon) {
                    const game = currentGame;
                    setTimeout(() => game.handleGameOver(), 500);
                } else {
                    currentGame.handleGameOver();
                }
            }
        }
    });
    
    // ── Touch input ──
    const gameBoard = document.getElementById('gameBoard');
    gameBoard.addEventListener('touchstart', (e) => {
        if (!currentGame) return;
        currentGame.touchStartX = e.touches[0].clientX;
        currentGame.touchStartY = e.touches[0].clientY;
    });
    
    gameBoard.addEventListener('touchend', (e) => {
        if (!currentGame || currentGame.gameOver || currentGame.waitingForInitials) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const dx = touchEndX - currentGame.touchStartX;
        const dy = touchEndY - currentGame.touchStartY;
        
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        
        if (Math.max(absDx, absDy) > 30) {
            let moved = false;
            if (absDx > absDy) {
                moved = dx > 0 ? currentGame.move('right') : currentGame.move('left');
            } else {
                moved = dy > 0 ? currentGame.move('down') : currentGame.move('up');
            }
            
            if (moved) {
                currentGame.addRandomTile();
                currentGame.render();
                if (currentGame.checkGameOver()) {
                    if (currentGame.justWon) {
                        const game = currentGame;
                        setTimeout(() => game.handleGameOver(), 500);
                    } else {
                        currentGame.handleGameOver();
                    }
                }
            }
        }
    });
    
    // ── New Game button ──
    document.getElementById('newGame').addEventListener('click', () => {
        document.querySelector('.container').classList.remove('game-active');
        document.getElementById('difficultyModal').classList.add('active');
        window.isDifficultyModalOpen = true;
    });
    
    // ── Restart (play again) button ──
    document.getElementById('restartGame').addEventListener('click', () => {
        document.getElementById('gameOver').classList.remove('active');
        document.querySelector('.container').classList.remove('game-active');
        document.getElementById('difficultyModal').classList.add('active');
        window.isDifficultyModalOpen = true;
    });
    
    // ── Initials input handlers ──
    const initialsInput = document.getElementById('initialsInput');
    
    initialsInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
    });
    
    initialsInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && currentGame && !currentGame.submittingInitials) {
            currentGame.submitInitials();
        }
    });
    
    document.getElementById('submitInitials').addEventListener('click', () => {
        if (currentGame && !currentGame.submittingInitials) {
            currentGame.submitInitials();
        }
    });
}
