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
        this.setupEventListeners();
    }
    
    init() {
        this.board = Array(this.size).fill().map(() => Array(this.size).fill(0));
        this.score = 0;
        this.gameOver = false;
        this.waitingForInitials = false;
        this.addRandomTile();
        this.addRandomTile();
        
        // Clear "new" flags
        allScores.forEach(s => s.isNew = false);
        
        this.render();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (this.gameOver || this.waitingForInitials) return;
            
            let moved = false;
            switch(e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    moved = this.move('up');
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    moved = this.move('down');
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    moved = this.move('left');
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    moved = this.move('right');
                    break;
            }
            
            if (moved) {
                this.addRandomTile();
                this.render();
                if (this.checkGameOver()) {
                    this.handleGameOver();
                }
            }
        });
        
        // Touch support
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        });
        
        gameBoard.addEventListener('touchend', (e) => {
            if (this.gameOver || this.waitingForInitials) return;
            
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            const dx = touchEndX - this.touchStartX;
            const dy = touchEndY - this.touchStartY;
            
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);
            
            if (Math.max(absDx, absDy) > 30) {
                let moved = false;
                if (absDx > absDy) {
                    moved = dx > 0 ? this.move('right') : this.move('left');
                } else {
                    moved = dy > 0 ? this.move('down') : this.move('up');
                }
                
                if (moved) {
                    this.addRandomTile();
                    this.render();
                    if (this.checkGameOver()) {
                        this.handleGameOver();
                    }
                }
            }
        });
        
        document.getElementById('newGame').addEventListener('click', () => {
            // Hide the game container and show difficulty selector
            document.querySelector('.container').classList.remove('game-active');
            document.getElementById('difficultyModal').classList.add('active');
            window.isDifficultyModalOpen = true;
        });
        
        document.getElementById('restartGame').addEventListener('click', () => {
            document.getElementById('gameOver').classList.remove('active');
            // Hide the game container and show difficulty selector
            document.querySelector('.container').classList.remove('game-active');
            document.getElementById('difficultyModal').classList.add('active');
            window.isDifficultyModalOpen = true;
        });
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
        // Check if player reached the target (win condition)
        if (this.difficulty !== 'endless') {
            for (let i = 0; i < this.size; i++) {
                for (let j = 0; j < this.size; j++) {
                    if (this.board[i][j] >= this.target) {
                        this.gameOver = true;
                        this.handleVictory();
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
    
    handleVictory() {
        // Small delay to show the winning tile
        setTimeout(() => {
            this.handleGameOver();
        }, 500);
    }
    
    handleGameOver() {
        // Ensure allScores is an array
        if (!Array.isArray(allScores)) {
            allScores = [];
        }
        
        // Filter scores for current difficulty
        const difficultyScores = allScores.filter(s => s.difficulty === this.difficulty);
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
        
        saveScores();
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
                tile.className = 'tile';
                const value = this.board[i][j];
                
                if (value !== 0) {
                    tile.textContent = value;
                    tile.setAttribute('data-value', value);
                }
                
                gameBoard.appendChild(tile);
            }
        }
        
        document.getElementById('score').textContent = this.score;
    }
}

// Global initials input handlers - only set up once, not per game instance
if (!window.initialsHandlersSetup) {
    window.initialsHandlersSetup = true;
    
    const initialsInput = document.getElementById('initialsInput');
    
    // Uppercase and letters only
    initialsInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
    });
    
    // Handle Enter key
    initialsInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && currentGame && !currentGame.submittingInitials) {
            currentGame.submitInitials();
        }
    });
    
    // Handle button click
    document.getElementById('submitInitials').addEventListener('click', () => {
        if (currentGame && !currentGame.submittingInitials) {
            currentGame.submitInitials();
        }
    });
}
