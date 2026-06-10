// game-state.js - Poker Solitaire game state management and initialization

class GameState {
    constructor() {
        // Game data structures
        this.deck = new Deck();
        this.grid = []; // 5x5 grid of cards (or null)
        this.currentCard = null; // Card currently being placed
        this.cardsPlaced = 0;
        
        // Game state
        this.score = 0;
        this.timeStarted = null;
        this.timerInterval = null;
        this.elapsedSeconds = 0;
        this.isRendering = false;
        this.gameOver = false;
        
        // High scores
        this.highScores = [];
        
        // Preload card back image
        this.cardBackImg = new Image();
        this.cardBackImg.src = 'images/card-back.jpg';
    }
    
    init() {
        // Reset everything
        this.deck = new Deck();
        this.deck.shuffle();
        this.grid = [];
        this.currentCard = null;
        this.cardsPlaced = 0;
        this.score = 0;
        this.elapsedSeconds = 0;
        this.gameOver = false;
        
        // Initialize empty 5x5 grid
        for (let row = 0; row < GRID_SIZE; row++) {
            this.grid[row] = [];
            for (let col = 0; col < GRID_SIZE; col++) {
                this.grid[row][col] = null;
            }
        }
        
        // Draw first card
        this.drawCard();
        
        // Stop old timer and start new one
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        this.timeStarted = Date.now();
        this.timerInterval = setInterval(() => {
            this.elapsedSeconds = Math.floor((Date.now() - this.timeStarted) / 1000);
            this.updateTimer();
        }, 1000);
    }
    
    drawCard() {
        if (this.deck.cards.length > 0) {
            this.currentCard = this.deck.deal();
            this.currentCard.flip(); // Face up
            return true;
        }
        return false;
    }
    
    placeCard(row, col) {
        if (this.grid[row][col] !== null) {
            return false; // Cell already occupied
        }
        
        if (this.currentCard === null) {
            return false; // No card to place
        }
        
        // Place the card
        this.grid[row][col] = this.currentCard;
        this.cardsPlaced++;
        
        // Draw next card
        if (this.cardsPlaced < TOTAL_CARDS) {
            this.drawCard();
        } else {
            this.currentCard = null;
            this.endGame();
        }
        
        return true;
    }
    
    getRow(rowIndex) {
        return this.grid[rowIndex].filter(card => card !== null);
    }
    
    getColumn(colIndex) {
        const column = [];
        for (let row = 0; row < GRID_SIZE; row++) {
            if (this.grid[row][colIndex] !== null) {
                column.push(this.grid[row][colIndex]);
            }
        }
        return column;
    }
    
    calculateScore() {
        let totalScore = 0;
        
        // Score each row
        for (let row = 0; row < GRID_SIZE; row++) {
            const cards = this.getRow(row);
            if (cards.length === GRID_SIZE) {
                const handScore = this.evaluateHand(cards);
                totalScore += handScore;
            }
        }
        
        // Score each column
        for (let col = 0; col < GRID_SIZE; col++) {
            const cards = this.getColumn(col);
            if (cards.length === GRID_SIZE) {
                const handScore = this.evaluateHand(cards);
                totalScore += handScore;
            }
        }
        
        this.score = totalScore;
        return totalScore;
    }
    
    evaluateHand(cards) {
        if (cards.length !== 5) return 0;
        
        // Sort cards by value for easier evaluation
        const sorted = [...cards].sort((a, b) => a.value - b.value);
        
        const isFlush = this.checkFlush(cards);
        const isStraight = this.checkStraight(sorted);
        const counts = this.getValueCounts(cards);
        
        // Royal Flush (A-K-Q-J-10 of same suit)
        if (isFlush && isStraight && sorted[4].rank === 'A' && sorted[3].rank === 'K') {
            return POKER_SCORES['Royal Flush'];
        }
        
        // Straight Flush
        if (isFlush && isStraight) {
            return POKER_SCORES['Straight Flush'];
        }
        
        // Four of a Kind
        if (counts.includes(4)) {
            return POKER_SCORES['Four of a Kind'];
        }
        
        // Full House
        if (counts.includes(3) && counts.includes(2)) {
            return POKER_SCORES['Full House'];
        }
        
        // Flush
        if (isFlush) {
            return POKER_SCORES['Flush'];
        }
        
        // Straight
        if (isStraight) {
            return POKER_SCORES['Straight'];
        }
        
        // Three of a Kind
        if (counts.includes(3)) {
            return POKER_SCORES['Three of a Kind'];
        }
        
        // Two Pair
        if (counts.filter(c => c === 2).length === 2) {
            return POKER_SCORES['Two Pair'];
        }
        
        // One Pair
        if (counts.includes(2)) {
            return POKER_SCORES['One Pair'];
        }
        
        // High Card
        return POKER_SCORES['High Card'];
    }
    
    checkFlush(cards) {
        const suit = cards[0].suit;
        return cards.every(card => card.suit === suit);
    }
    
    checkStraight(sortedCards) {
        // Check regular straight
        let isStraight = true;
        for (let i = 0; i < 4; i++) {
            if (sortedCards[i + 1].value !== sortedCards[i].value + 1) {
                isStraight = false;
                break;
            }
        }
        
        if (isStraight) return true;
        
        // Check for wheel (A-2-3-4-5)
        if (sortedCards[0].rank === '2' && 
            sortedCards[1].rank === '3' && 
            sortedCards[2].rank === '4' && 
            sortedCards[3].rank === '5' && 
            sortedCards[4].rank === 'A') {
            return true;
        }
        
        return false;
    }
    
    getValueCounts(cards) {
        const valueCounts = {};
        cards.forEach(card => {
            valueCounts[card.rank] = (valueCounts[card.rank] || 0) + 1;
        });
        return Object.values(valueCounts);
    }
    
    getHandName(cards) {
        if (cards.length !== 5) return 'Incomplete';
        
        const sorted = [...cards].sort((a, b) => a.value - b.value);
        const isFlush = this.checkFlush(cards);
        const isStraight = this.checkStraight(sorted);
        const counts = this.getValueCounts(cards);
        
        if (isFlush && isStraight && sorted[4].rank === 'A' && sorted[3].rank === 'K') {
            return 'Royal Flush';
        }
        if (isFlush && isStraight) return 'Straight Flush';
        if (counts.includes(4)) return 'Four of a Kind';
        if (counts.includes(3) && counts.includes(2)) return 'Full House';
        if (isFlush) return 'Flush';
        if (isStraight) return 'Straight';
        if (counts.includes(3)) return 'Three of a Kind';
        if (counts.filter(c => c === 2).length === 2) return 'Two Pair';
        if (counts.includes(2)) return 'One Pair';
        return 'High Card';
    }
    
    endGame() {
        this.gameOver = true;
        this.stopTimer();
        this.calculateScore();
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    updateTimer() {
        const minutes = Math.floor(this.elapsedSeconds / 60);
        const seconds = this.elapsedSeconds % 60;
        const timerEl = document.getElementById('timer');
        if (timerEl) {
            timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    updateScore(points) {
        this.score = points;
        document.getElementById('score').textContent = this.score;
    }
}