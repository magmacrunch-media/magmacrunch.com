// game-logic.js - Poker Solitaire game rules and moves

class GameLogic {
    constructor(gameState) {
        this.state = gameState;
    }
    
    canPlaceCard(row, col) {
        // Check if cell is empty
        if (this.state.grid[row][col] !== null) {
            return false;
        }
        
        // Check if we have a card to place
        if (this.state.currentCard === null) {
            return false;
        }
        
        // Check if game is over
        if (this.state.gameOver) {
            return false;
        }
        
        return true;
    }
    
    handleCellClick(row, col) {
        if (!this.canPlaceCard(row, col)) {
            return false;
        }
        
        // Place the card
        const placed = this.state.placeCard(row, col);
        
        if (placed) {
            // Update score display (showing current progress)
            this.updateCurrentScore();
            
            // Check if game is complete
            if (this.state.gameOver) {
                this.handleGameComplete();
            }
        }
        
        return placed;
    }
    
    updateCurrentScore() {
        // Calculate and display current score
        const currentScore = this.state.calculateScore();
        this.state.updateScore(currentScore);
    }
    
    handleGameComplete() {
        const finalScore = this.state.score;
        const finalTime = `${Math.floor(this.state.elapsedSeconds / 60)}:${(this.state.elapsedSeconds % 60).toString().padStart(2, '0')}`;
        
        return { finalScore, finalTime };
    }
    
    getRowScore(rowIndex) {
        const cards = this.state.getRow(rowIndex);
        if (cards.length === GRID_SIZE) {
            return {
                score: this.state.evaluateHand(cards),
                handName: this.state.getHandName(cards)
            };
        }
        return { score: 0, handName: 'Incomplete' };
    }
    
    getColumnScore(colIndex) {
        const cards = this.state.getColumn(colIndex);
        if (cards.length === GRID_SIZE) {
            return {
                score: this.state.evaluateHand(cards),
                handName: this.state.getHandName(cards)
            };
        }
        return { score: 0, handName: 'Incomplete' };
    }
    
    getAllHandScores() {
        const handScores = {
            rows: [],
            columns: []
        };
        
        // Get all row scores
        for (let row = 0; row < GRID_SIZE; row++) {
            handScores.rows.push(this.getRowScore(row));
        }
        
        // Get all column scores
        for (let col = 0; col < GRID_SIZE; col++) {
            handScores.columns.push(this.getColumnScore(col));
        }
        
        return handScores;
    }
    
    getBestHand() {
        const allScores = this.getAllHandScores();
        let bestScore = 0;
        let bestHand = 'None';
        let bestType = null;
        let bestIndex = -1;
        
        // Check rows
        allScores.rows.forEach((hand, index) => {
            if (hand.score > bestScore) {
                bestScore = hand.score;
                bestHand = hand.handName;
                bestType = 'row';
                bestIndex = index;
            }
        });
        
        // Check columns
        allScores.columns.forEach((hand, index) => {
            if (hand.score > bestScore) {
                bestScore = hand.score;
                bestHand = hand.handName;
                bestType = 'column';
                bestIndex = index;
            }
        });
        
        return { bestScore, bestHand, bestType, bestIndex };
    }
}