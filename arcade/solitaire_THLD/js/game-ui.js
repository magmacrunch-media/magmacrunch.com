// game-ui.js - UI rendering, events, and modals for Poker Solitaire

class GameUI {
    constructor(gameState, gameLogic) {
        this.state = gameState;
        this.logic = gameLogic;
        this.scoring = null; // Will be set by PokerSolitaire class
    }
    
    setupEventListeners() {
        // Start screen buttons
        document.getElementById('startGameBtn').addEventListener('click', () => {
            this.showGameScreen();
        });
        
        document.getElementById('viewRulesBtn').addEventListener('click', () => {
            document.getElementById('instructionsModal').classList.add('active');
        });
        
        document.getElementById('viewScoresBtn').addEventListener('click', () => {
            document.getElementById('highScoresModal').classList.add('active');
        });
        
        // Game buttons
        document.getElementById('newGame').addEventListener('click', () => {
            this.state.init();
            this.render();
        });
        
        document.getElementById('toggleInstructions').addEventListener('click', () => {
            document.getElementById('instructionsModal').classList.add('active');
        });
        
        document.getElementById('closeInstructions').addEventListener('click', () => {
            document.getElementById('instructionsModal').classList.remove('active');
        });
        
        document.getElementById('instructionsModal').addEventListener('click', (e) => {
            if (e.target.id === 'instructionsModal') {
                document.getElementById('instructionsModal').classList.remove('active');
            }
        });
        
        document.getElementById('toggleHighScores').addEventListener('click', () => {
            document.getElementById('highScoresModal').classList.add('active');
        });
        
        document.getElementById('closeHighScores').addEventListener('click', () => {
            document.getElementById('highScoresModal').classList.remove('active');
        });
        
        document.getElementById('highScoresModal').addEventListener('click', (e) => {
            if (e.target.id === 'highScoresModal') {
                document.getElementById('highScoresModal').classList.remove('active');
            }
        });
        
        // Initials input formatting
        const initialsInput = document.getElementById('initialsInput');
        initialsInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
        });
        
        // Grid cell click delegation
        document.querySelector('.poker-grid').addEventListener('click', (e) => {
            const cell = e.target.closest('.grid-cell');
            if (cell && !cell.classList.contains('occupied')) {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                
                const placed = this.logic.handleCellClick(row, col);
                if (placed) {
                    this.render();
                    
                    // Check if game is complete
                    if (this.state.gameOver) {
                        this.handleGameComplete();
                    }
                }
            }
        });
    }
    
    showGameScreen() {
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'block';
        this.state.init();
        this.render();
    }
    
    handleGameComplete() {
        const { finalScore, finalTime } = this.logic.handleGameComplete();
        
        setTimeout(() => {
            const bestHand = this.logic.getBestHand();
            alert(`🎉 Game Complete! 🎉\n\nFinal Score: ${finalScore}\nBest Hand: ${bestHand.bestHand} (${bestHand.bestScore} pts)\nTime: ${finalTime}`);
            
            if (this.scoring.isHighScore(finalScore)) {
                this.scoring.promptForInitials(finalScore, finalTime);
            } else {
                document.getElementById('highScoresModal').classList.add('active');
            }
        }, 100);
    }
    
    render() {
        // Prevent multiple simultaneous renders
        if (this.state.isRendering) return;
        this.state.isRendering = true;
        
        requestAnimationFrame(() => {
            this._doRender();
            this.state.isRendering = false;
        });
    }
    
    _doRender() {
        this.renderCurrentCard();
        this.renderGrid();
        this.renderHandScores();
        this.updateDisplay();
    }
    
    renderCurrentCard() {
        const currentCardEl = document.getElementById('currentCard');
        currentCardEl.innerHTML = '';
        
        if (this.state.currentCard) {
            const cardEl = this.state.currentCard.getHTML();
            currentCardEl.appendChild(cardEl);
        } else if (this.state.gameOver) {
            currentCardEl.innerHTML = '<div style="color: #FFD700; text-align: center; font-weight: bold;">GAME OVER</div>';
        }
    }
    
    renderGrid() {
        const gridEl = document.getElementById('pokerGrid');
        gridEl.innerHTML = '';
        
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                const card = this.state.grid[row][col];
                if (card) {
                    cell.classList.add('occupied');
                    const cardEl = card.getHTML();
                    cell.appendChild(cardEl);
                }
                
                gridEl.appendChild(cell);
            }
        }
    }
    
    renderHandScores() {
        const handScores = this.logic.getAllHandScores();
        const bestHand = this.logic.getBestHand();
        
        // Render row scores
        const rowsEl = document.getElementById('rowScores');
        rowsEl.innerHTML = '';
        handScores.rows.forEach((hand, index) => {
            const item = document.createElement('div');
            item.className = 'hand-score-item';
            
            if (bestHand.bestType === 'row' && bestHand.bestIndex === index && hand.score > 0) {
                item.classList.add('best-hand');
            }
            
            item.innerHTML = `
                <span class="hand-name">Row ${index + 1}: ${hand.handName}</span>
                <span class="hand-value">${hand.score}</span>
            `;
            rowsEl.appendChild(item);
        });
        
        // Render column scores
        const colsEl = document.getElementById('colScores');
        colsEl.innerHTML = '';
        handScores.columns.forEach((hand, index) => {
            const item = document.createElement('div');
            item.className = 'hand-score-item';
            
            if (bestHand.bestType === 'column' && bestHand.bestIndex === index && hand.score > 0) {
                item.classList.add('best-hand');
            }
            
            item.innerHTML = `
                <span class="hand-name">Col ${index + 1}: ${hand.handName}</span>
                <span class="hand-value">${hand.score}</span>
            `;
            colsEl.appendChild(item);
        });
    }
    
    updateDisplay() {
        document.getElementById('score').textContent = this.state.score;
        document.getElementById('cardsPlaced').textContent = this.state.cardsPlaced;
    }
}