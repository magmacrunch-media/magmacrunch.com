// game.js

class Solitaire {
    constructor() {
        this.deck = new Deck();
        this.tableau = [[], [], [], [], [], [], []]; // 7 columns
        this.foundation = [[], [], [], []]; // 4 foundation piles (one per suit)
        this.stock = []; // Draw pile
        this.waste = []; // Discard pile
        this.selectedCard = null;
        this.selectedPile = null;
        this.moves = 0;
        this.score = 0;
        this.timeStarted = null;
        this.timerInterval = null;
        this.elapsedSeconds = 0;
        this.highScores = [];
        this.gameStarted = false;
        
        // Preload card back image
        this.cardBackImg = new Image();
        this.cardBackImg.src = 'images/card-back.jpg';
        
        this.setupEventListeners();
        this._scoresLoaded = this.loadHighScores();
        // Don't call init() yet - wait for start button
    }
    
    async loadHighScores() {
        try {
            this.highScores = await scoreClient.load('solitaire');
            this.displayHighScores();
        } catch (error) {
            console.error('Error loading high scores:', error);
        }
    }
    
    async saveHighScores() {
        try {
            localStorage.setItem('mc_scores_solitaire', JSON.stringify(this.highScores));
        } catch (error) {
            console.error('Error saving high scores:', error);
        }
    }
    
    displayHighScores() {
        const scoreboardEl = document.getElementById('highScoresList');
        if (!scoreboardEl) return;
        
        scoreboardEl.innerHTML = '';
        
        if (this.highScores.length === 0) {
            scoreboardEl.innerHTML = '<div style="text-align: center; color: #a5d6a7; padding: 20px;">No scores yet. Be the first!</div>';
            return;
        }
        
        this.highScores.slice(0, 10).forEach((entry, index) => {
            const scoreEntry = document.createElement('div');
            scoreEntry.className = 'score-entry';
            if (entry.isNew) {
                scoreEntry.classList.add('new-score');
            }
            
            scoreEntry.innerHTML = `
                <span class="rank">#${index + 1}</span>
                <span class="initials">${entry.initials || 'AAA'}</span>
                <span class="score-value">${entry.score || 0}</span>
                <span class="time">${entry.time || '--:--'}</span>
            `;
            
            scoreboardEl.appendChild(scoreEntry);
        });
    }
    
    isHighScore(score) {
        if (score <= 0) return false;
        return this.highScores.length < 10 || score > this.highScores[9].score;
    }
    
    promptForInitials(finalScore, finalTime) {
        const modal = document.getElementById('initialsModal');
        const input = document.getElementById('initialsInput');
        const submitBtn = document.getElementById('submitInitials');
        
        modal.classList.add('active');
        input.value = '';
        input.focus();
        
        const submitScore = () => {
            const initials = input.value.trim().toUpperCase() || 'AAA';
            
            // Clear any previous "new" flags
            this.highScores.forEach(s => s.isNew = false);
            
            // Add new score
            this.highScores.push({
                initials: initials,
                score: finalScore,
                time: finalTime,
                isNew: true
            });
            
            // Sort and trim to top 10
            this.highScores.sort((a, b) => b.score - a.score);
            this.highScores = this.highScores.slice(0, 10);
            
            // Save and display
            this.saveHighScores();
            this.displayHighScores();
            
            modal.classList.remove('active');
            document.getElementById('highScoresModal').classList.add('active');
        };
        
        submitBtn.onclick = submitScore;
        input.onkeypress = (e) => {
            if (e.key === 'Enter') submitScore();
        };
    }
    
    init() {
        // Reset everything
        this.deck = new Deck();
        this.deck.shuffle();
        this.tableau = [[], [], [], [], [], [], []];
        this.foundation = [[], [], [], []];
        this.stock = [];
        this.waste = [];
        this.selectedCard = null;
        this.selectedPile = null;
        this.moves = 0;
        this.score = 0;
        this.elapsedSeconds = 0;
        
        // Stop old timer and start new one
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        this.timeStarted = Date.now();
        this.timerInterval = setInterval(() => {
            this.elapsedSeconds = Math.floor((Date.now() - this.timeStarted) / 1000);
            this.updateTimer();
        }, 1000);
        
        // Deal cards to tableau
        for (let col = 0; col < 7; col++) {
            for (let row = 0; row <= col; row++) {
                const card = this.deck.deal();
                if (row === col) {
                    card.flip(); // Flip the top card
                }
                this.tableau[col].push(card);
            }
        }
        
        // Remaining cards go to stock
        while (this.deck.cards.length > 0) {
            this.stock.push(this.deck.deal());
        }
        
        this.render();
    }

    setupEventListeners() {
        // ── Menu bar ──────────────────────────────────────────────
        document.getElementById('menuGame').addEventListener('click', () => {
            if (document.getElementById('gameScreen').style.display === 'none') {
                this.showGameScreen();
            } else {
                this.init();
            }
        });

        document.getElementById('menuOptions').addEventListener('click', async () => {
            await this._scoresLoaded;
            this.displayHighScores();
            document.getElementById('highScoresModal').classList.add('active');
        });

        document.getElementById('menuHelp').addEventListener('click', () => {
            document.getElementById('instructionsModal').classList.add('active');
        });

        document.getElementById('menuCredits').addEventListener('click', () => {
            document.getElementById('creditsModal').classList.add('active');
        });

        // ── Start screen: single button + spacebar ────────────────
        document.getElementById('startGameBtn').addEventListener('click', () => {
            this.showGameScreen();
        });

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' &&
                document.getElementById('startScreen').style.display !== 'none') {
                e.preventDefault();
                this.showGameScreen();
            }
        });

        // ── Modal close buttons ───────────────────────────────────
        document.getElementById('closeInstructions').addEventListener('click', () => {
            document.getElementById('instructionsModal').classList.remove('active');
        });
        document.getElementById('instructionsModal').addEventListener('click', (e) => {
            if (e.target.id === 'instructionsModal') {
                document.getElementById('instructionsModal').classList.remove('active');
            }
        });

        document.getElementById('closeHighScores').addEventListener('click', () => {
            document.getElementById('highScoresModal').classList.remove('active');
        });
        document.getElementById('highScoresModal').addEventListener('click', (e) => {
            if (e.target.id === 'highScoresModal') {
                document.getElementById('highScoresModal').classList.remove('active');
            }
        });

        document.getElementById('closeCredits').addEventListener('click', () => {
            document.getElementById('creditsModal').classList.remove('active');
        });
        document.getElementById('creditsModal').addEventListener('click', (e) => {
            if (e.target.id === 'creditsModal') {
                document.getElementById('creditsModal').classList.remove('active');
            }
        });

        // ── Initials input ────────────────────────────────────────
        const initialsInput = document.getElementById('initialsInput');
        initialsInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
        });
    }
    
    showGameScreen() {
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'block';
        this.init();
    }
    
    updateScore(points) {
        this.score += points;
        if (this.score < 0) this.score = 0; // Don't go below 0
        document.getElementById('score').textContent = this.score;
    }
    
    updateTimer() {
        const minutes = Math.floor(this.elapsedSeconds / 60);
        const seconds = this.elapsedSeconds % 60;
        document.getElementById('timer').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
        
    drawFromStock() {
        if (this.stock.length > 0) {
            // Draw up to 3 cards
            const cardsToDraw = Math.min(3, this.stock.length);
            for (let i = 0; i < cardsToDraw; i++) {
                const card = this.stock.pop();
                card.flip();
                this.waste.push(card);
            }
            this.moves++;
            document.getElementById('moves').textContent = this.moves;
            // No score change for drawing cards
        } else if (this.waste.length > 0) {
            // Reset stock from waste - penalty for going through deck
            while (this.waste.length > 0) {
                const card = this.waste.pop();
                card.flip();
                this.stock.push(card);
            }
            this.score -= 100;
            if (this.score < 0) this.score = 0;
            document.getElementById('score').textContent = this.score;
        }
        this.render();
    }
    
    canPlaceOnTableau(card, targetPile) {
        if (targetPile.length === 0) {
            return card.rank === 'K'; // Only kings on empty tableau
        }
        
        const topCard = targetPile[targetPile.length - 1];
        return topCard.faceUp && 
               topCard.color !== card.color && 
               topCard.value === card.value + 1;
    }
    
    canPlaceOnFoundation(card, foundationIndex) {
        const foundation = this.foundation[foundationIndex];
        
        if (foundation.length === 0) {
            return card.rank === 'A'; // Only aces on empty foundation
        }
        
        const topCard = foundation[foundation.length - 1];
        return topCard.suit === card.suit && 
               topCard.value === card.value - 1;
    }
    
    handleCardClick(card, pileType, pileIndex, cardIndex) {
        // If no card selected, select this card
        if (!this.selectedCard && card.faceUp) {
            this.selectedCard = card;
            this.selectedPile = { type: pileType, index: pileIndex, cardIndex: cardIndex };
            this.render();
            return;
        }
        
        // If card already selected, try to move it
        if (this.selectedCard) {
            this.tryMove(pileType, pileIndex);
        }
    }
    
    tryMove(targetType, targetIndex) {
        const { type: sourceType, index: sourceIndex, cardIndex } = this.selectedPile;
        let moved = false;
        let scoreChange = 0;
        
        if (targetType === 'tableau') {
            const targetPile = this.tableau[targetIndex];
            
            if (this.canPlaceOnTableau(this.selectedCard, targetPile)) {
                // Move card(s) from source to target
                if (sourceType === 'tableau') {
                    const sourcePile = this.tableau[sourceIndex];
                    const cardsToMove = sourcePile.splice(cardIndex);
                    this.tableau[targetIndex].push(...cardsToMove);
                    
                    // Flip top card of source pile if needed
                    if (sourcePile.length > 0 && !sourcePile[sourcePile.length - 1].faceUp) {
                        sourcePile[sourcePile.length - 1].flip();
                        scoreChange += 5; // +5 for turning over a tableau card
                    }
                } else if (sourceType === 'waste') {
                    const card = this.waste.pop();
                    this.tableau[targetIndex].push(card);
                    scoreChange += 5; // +5 for waste to tableau
                } else if (sourceType === 'foundation') {
                    // Moving from foundation to tableau
                    const card = this.foundation[sourceIndex].pop();
                    this.tableau[targetIndex].push(card);
                    scoreChange -= 15; // -15 for foundation to tableau
                }
                moved = true;
                this.moves++;
                document.getElementById('moves').textContent = this.moves;
            }
        } else if (targetType === 'foundation') {
            if (this.canPlaceOnFoundation(this.selectedCard, targetIndex)) {
                if (sourceType === 'tableau') {
                    const sourcePile = this.tableau[sourceIndex];
                    const card = sourcePile.pop();
                    this.foundation[targetIndex].push(card);
                    scoreChange += 10; // +10 for tableau to foundation
                    
                    // Flip top card of source pile if needed
                    if (sourcePile.length > 0 && !sourcePile[sourcePile.length - 1].faceUp) {
                        sourcePile[sourcePile.length - 1].flip();
                        scoreChange += 5; // +5 for turning over a tableau card
                    }
                } else if (sourceType === 'waste') {
                    const card = this.waste.pop();
                    this.foundation[targetIndex].push(card);
                    scoreChange += 10; // +10 for waste to foundation
                }
                moved = true;
                this.moves++;
                document.getElementById('moves').textContent = this.moves;
            }
        }
        
        // Apply score change
        if (scoreChange !== 0) {
            this.score += scoreChange;
            if (this.score < 0) this.score = 0;
            document.getElementById('score').textContent = this.score;
        }
        
        // Clear selection
        this.selectedCard = null;
        this.selectedPile = null;
        
        if (moved && this.checkWin()) {
            clearInterval(this.timerInterval);
            
            // Win bonus — classic Microsoft Windows Solitaire formula:
            // bonus = (700,000 ÷ seconds elapsed) × 35
            // Rewards speed: a 5-min win adds ~81,000 pts, 10-min adds ~40,000, etc.
            const timeBonus = this.elapsedSeconds > 0
                ? Math.floor((700000 / this.elapsedSeconds) * 35)
                : 0;
            this.score += timeBonus;
            document.getElementById('score').textContent = this.score;
            
            const finalScore = this.score;
            const finalTime = `${Math.floor(this.elapsedSeconds / 60)}:${(this.elapsedSeconds % 60).toString().padStart(2, '0')}`;
            const isNew = this.isHighScore(finalScore);

            setTimeout(() => {
                this.showWinModal(finalScore, finalTime, this.moves, isNew);
            }, 400);
        }
        
        this.render();
    }

    showWinModal(finalScore, finalTime, moves, isNew) {
        const modal    = document.getElementById('winModal');
        const titleEl  = document.getElementById('winTitleText');
        const badge    = document.getElementById('winHighScoreBadge');
        const bonusEl  = document.getElementById('winBonusLine');
        const content  = modal.querySelector('.win-modal-content');

        // High score vs regular win styling
        if (isNew) {
            titleEl.textContent = 'YOU WIN!';
            badge.style.display = 'block';
            content.classList.add('win-is-highscore');
        } else {
            titleEl.textContent = 'YOU WIN!';
            badge.style.display = 'none';
            content.classList.remove('win-is-highscore');
        }

        // Set stats
        document.getElementById('winTime').textContent  = finalTime;
        document.getElementById('winMoves').textContent = moves;

        // Animate score counting up
        const scoreEl = document.getElementById('winScore');
        scoreEl.textContent = '0';
        const duration = 1200;
        const start    = performance.now();
        const countUp  = (now) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            scoreEl.textContent = Math.floor(eased * finalScore).toLocaleString();
            if (t < 1) requestAnimationFrame(countUp);
        };
        requestAnimationFrame(countUp);

        // Bonus line
        const timeBonus = finalScore - (finalScore - Math.floor((700000 / Math.max(this.elapsedSeconds, 1)) * 35));
        bonusEl.textContent = `+${Math.floor((700000 / Math.max(this.elapsedSeconds, 1)) * 35).toLocaleString()} TIME BONUS`;

        // Spawn particles
        this._spawnWinParticles();

        // Show modal
        modal.classList.add('active');

        // Wire continue button
        const btn = document.getElementById('winContinueBtn');
        const onContinue = () => {
            modal.classList.remove('active');
            btn.removeEventListener('click', onContinue);
            if (isNew) {
                this.promptForInitials(finalScore, finalTime);
            } else {
                this.displayHighScores();
                document.getElementById('highScoresModal').classList.add('active');
            }
        };
        btn.addEventListener('click', onContinue);
    }

    _spawnWinParticles() {
        const container = document.getElementById('winParticles');
        container.innerHTML = '';
        const symbols = ['♥','♦','♠','♣','★','◆'];
        const colors  = ['#ff2d78','#00e5ff','#ffd700','#7b2fff','#ff2d78','#00e5ff'];
        for (let i = 0; i < 30; i++) {
            const p = document.createElement('span');
            p.className   = 'win-particle';
            p.textContent = symbols[i % symbols.length];
            p.style.cssText = `
                left: ${Math.random() * 100}%;
                animation-delay: ${Math.random() * 2}s;
                animation-duration: ${1.5 + Math.random() * 2}s;
                color: ${colors[i % colors.length]};
                font-size: ${10 + Math.floor(Math.random() * 14)}px;
            `;
            container.appendChild(p);
        }
    }

    checkWin() {
        return this.foundation.every(pile => pile.length === 13);
    }
    
    render() {
        // Prevent multiple simultaneous renders
        if (this.isRendering) return;
        this.isRendering = true;
        
        requestAnimationFrame(() => {
            this._doRender();
            this.isRendering = false;
        });
    }
    
    _doRender() {
        // Render stock and waste
        const stockEl = document.getElementById('stock');
        const freshStock = stockEl.cloneNode(false);
        stockEl.parentNode.replaceChild(freshStock, stockEl);
        freshStock.addEventListener('click', () => { this.drawFromStock(); });

        if (this.stock.length > 0) {
            const card = new Card('spades', 'A');
            card.faceUp = false;
            const cardEl = card.getHTML();
            cardEl.style.cursor = 'pointer';
            freshStock.appendChild(cardEl);
        } else if (this.waste.length > 0) {
            const resetEl = document.createElement('div');
            resetEl.className = 'card reset-stock';
            resetEl.innerHTML = '↺';
            resetEl.style.cursor = 'pointer';
            freshStock.appendChild(resetEl);
        }

        const wasteEl = document.getElementById('waste');
        wasteEl.innerHTML = '';
        if (this.waste.length > 0) {
            // Show up to 3 cards from the waste pile
            const cardsToShow = Math.min(3, this.waste.length);
            const startIndex = this.waste.length - cardsToShow;
            
            for (let i = startIndex; i < this.waste.length; i++) {
                const card = this.waste[i];
                const cardEl = card.getHTML();
                
                // Only the top card is selectable
                if (i === this.waste.length - 1) {
                    if (this.selectedCard === card) {
                        cardEl.classList.add('selected');
                    }
                    cardEl.addEventListener('click', () => {
                        this.handleCardClick(card, 'waste', 0, this.waste.length - 1);
                    });
                } else {
                    cardEl.style.cursor = 'default';
                }
                
                // Offset cards slightly so you can see all 3
                cardEl.style.position = 'absolute';
                cardEl.style.left = `${(i - startIndex) * 25}px`;
                
                wasteEl.appendChild(cardEl);
            }
        }
        
        // Render foundations
        for (let i = 0; i < 4; i++) {
            const foundationEl = document.getElementById(`foundation-${i}`);
            // Clone to strip all accumulated event listeners
            const freshFoundation = foundationEl.cloneNode(false);
            foundationEl.parentNode.replaceChild(freshFoundation, foundationEl);

            freshFoundation.addEventListener('click', () => {
                if (this.selectedCard) {
                    this.tryMove('foundation', i);
                }
            });

            if (this.foundation[i].length > 0) {
                const topCard = this.foundation[i][this.foundation[i].length - 1];
                const cardEl = topCard.getHTML();
                cardEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.handleCardClick(topCard, 'foundation', i, this.foundation[i].length - 1);
                });
                freshFoundation.appendChild(cardEl);
            }
        }

        // Render tableau
        for (let col = 0; col < 7; col++) {
            const tableauCol = document.getElementById(`tableau-${col}`);
            // Clone to strip all accumulated event listeners
            const freshCol = tableauCol.cloneNode(false);
            tableauCol.parentNode.replaceChild(freshCol, tableauCol);

            freshCol.addEventListener('click', () => {
                if (this.selectedCard && this.tableau[col].length === 0) {
                    this.tryMove('tableau', col);
                }
            });

            this.tableau[col].forEach((card, cardIndex) => {
                const cardEl = card.getHTML();

                if (this.selectedCard === card) {
                    cardEl.classList.add('selected');
                }

                if (card.faceUp) {
                    cardEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.handleCardClick(card, 'tableau', col, cardIndex);
                    });
                }

                freshCol.appendChild(cardEl);
            });
        }
        
        // Update score and moves counter
        document.getElementById('moves').textContent = this.moves;
        document.getElementById('score').textContent = this.score;
    }
}