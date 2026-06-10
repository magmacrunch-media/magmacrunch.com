// game-scoring.js - High scores management for Poker Solitaire

class GameScoring {
    constructor(gameState) {
        this.state = gameState;
        this.isLoading = false;
        this.isSaving = false;
    }
    
    async loadHighScores() {
        if (this.isLoading) return; // Prevent duplicate loads
        this.isLoading = true;
        
        try {
            const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
                headers: { 'X-Access-Key': JSONBIN_API_KEY }
            });
            if (response.ok) {
                const data = await response.json();
                this.state.highScores = data.record || [];
                this.displayHighScores();
            }
        } catch (error) {
            console.error('Error loading high scores:', error);
        } finally {
            this.isLoading = false;
        }
    }
    
    async saveHighScores() {
        if (this.isSaving) return; // Prevent duplicate saves
        this.isSaving = true;
        
        try {
            await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Access-Key': JSONBIN_API_KEY
                },
                body: JSON.stringify(this.state.highScores)
            });
        } catch (error) {
            console.error('Error saving high scores:', error);
        } finally {
            this.isSaving = false;
        }
    }
    
    displayHighScores() {
        const scoreboardEl = document.getElementById('highScoresList');
        if (!scoreboardEl) return;
        
        // Clear existing content
        scoreboardEl.innerHTML = '';
        
        if (this.state.highScores.length === 0) {
            scoreboardEl.innerHTML = '<div style="text-align: center; color: #FFD700; padding: 20px;">No scores yet. Be the first!</div>';
            return;
        }
        
        // Create a document fragment to batch DOM updates
        const fragment = document.createDocumentFragment();
        
        this.state.highScores.slice(0, 10).forEach((entry, index) => {
            const scoreEntry = document.createElement('div');
            scoreEntry.className = 'score-entry';
            if (entry.isNew) {
                scoreEntry.classList.add('new-score');
            }
            
            scoreEntry.innerHTML = `
                <span class="rank">#${index + 1}</span>
                <span class="initials">${entry.initials || 'AAA'}</span>
                <span class="score-value">${entry.score || 0}</span>
            `;
            
            fragment.appendChild(scoreEntry);
        });
        
        scoreboardEl.appendChild(fragment);
    }
    
    isHighScore(score) {
        if (score <= 0) return false;
        return this.state.highScores.length < 10 || score > this.state.highScores[9].score;
    }
    
    promptForInitials(finalScore, finalTime) {
        const modal = document.getElementById('initialsModal');
        const input = document.getElementById('initialsInput');
        const submitBtn = document.getElementById('submitInitials');
        
        modal.classList.add('active');
        input.value = '';
        
        // Use setTimeout to ensure focus happens after modal is visible
        setTimeout(() => input.focus(), 100);
        
        // Remove any existing listeners to prevent duplicates
        const newSubmitBtn = submitBtn.cloneNode(true);
        submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
        
        const submitScore = () => {
            const initials = input.value.trim().toUpperCase() || 'AAA';
            
            // Clear any previous "new" flags
            this.state.highScores.forEach(s => s.isNew = false);
            
            // Add new score
            this.state.highScores.push({
                initials: initials,
                score: finalScore,
                isNew: true
            });
            
            // Sort and trim to top 10
            this.state.highScores.sort((a, b) => b.score - a.score);
            this.state.highScores = this.state.highScores.slice(0, 10);
            
            // Save and display
            this.saveHighScores();
            this.displayHighScores();
            
            modal.classList.remove('active');
            document.getElementById('highScoresModal').classList.add('active');
        };
        
        newSubmitBtn.onclick = submitScore;
        
        // Remove old keypress listener by cloning input
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        newInput.value = '';
        newInput.focus();
        
        newInput.onkeypress = (e) => {
            if (e.key === 'Enter') submitScore();
        };
    }
}