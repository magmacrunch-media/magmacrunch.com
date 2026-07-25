// scoring.js

let allScores = [];
let isUpdating = false; // Prevent concurrent updates

// Load scores from MAGMA//OPS backend (with localStorage fallback)
async function loadScores() {
    try {
        allScores = await scoreClient.load('2n');
    } catch (error) {
        console.error('Error loading scores:', error);
        allScores = [];
    }
}

// Save scores via MAGMA//OPS backend (with localStorage fallback)
async function saveScores() {
    try {
        // ScoreClient handles persistence — just save to localStorage as backup
        localStorage.setItem('mc_scores_2n', JSON.stringify(allScores));
    } catch (error) {
        console.error('Error saving scores:', error);
    }
}

function updateScoreboard(difficulty = 'overall') {
    // Prevent concurrent updates
    if (isUpdating) {
        return;
    }
    
    isUpdating = true;
    
    try {
        const scoreColumns = document.getElementById('scoreColumns');
        if (!scoreColumns) {
            console.warn('scoreColumns element not found - modal may not be in DOM yet');
            return;
        }
        
        // Update the dropdown display text to match the current difficulty
        const selectedModeText = document.getElementById('selectedMode');
        if (selectedModeText) {
            const difficultyMap = {
                'overall': { label: '★ OVERALL', target: 'all modes' },
                '2': { label: '2-BIT MODE', target: '4' },
                '3': { label: '3-BIT MODE', target: '8' },
                '4': { label: '4-BIT MODE', target: '16' },
                '5': { label: '5-BIT MODE', target: '32' },
                '6': { label: '6-BIT MODE', target: '64' },
                '7': { label: '7-BIT MODE', target: '128' },
                '8': { label: '8-BIT MODE', target: '256' },
                '9': { label: '9-BIT MODE', target: '512' },
                '10': { label: '10-BIT MODE', target: '1024' },
                '11': { label: '11-BIT MODE', target: '2048' },
                '12': { label: '12-BIT MODE', target: '4096' },
                '13': { label: '13-BIT MODE', target: '8192' },
                '14': { label: '14-BIT MODE', target: '16384' },
                '15': { label: '15-BIT MODE', target: '32768' },
                '16': { label: '16-BIT MODE', target: '65536' },
                'endless': { label: 'ENDLESS MODE', target: 'no limit' }
            };
            
            const modeInfo = difficultyMap[difficulty] || difficultyMap['overall'];
            selectedModeText.textContent = `${modeInfo.label} (${modeInfo.target})`;
        }
        
        // Clear existing content
        scoreColumns.innerHTML = '';
        
        // Ensure allScores is an array
        if (!Array.isArray(allScores)) {
            allScores = [];
        }

        const isOverall = difficulty === 'overall';
        
        // Filter (or don't) scores based on mode
        const difficultyScores = (isOverall
            ? [...allScores]
            : allScores.filter(s => s.difficulty === difficulty)
        )
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
        
        const leftColumn = document.createElement('div');
        leftColumn.className = 'score-column';
        leftColumn.innerHTML = '<div class="column-title">top 5</div>';
        
        const rightColumn = document.createElement('div');
        rightColumn.className = 'score-column';
        rightColumn.innerHTML = '<div class="column-title">ranks 6-10</div>';
        
        const difficultyLabel = {
            '2': '2-BIT', '3': '3-BIT', '4': '4-BIT', '5': '5-BIT',
            '6': '6-BIT', '7': '7-BIT', '8': '8-BIT', '9': '9-BIT',
            '10': '10-BIT', '11': '11-BIT', '12': '12-BIT', '13': '13-BIT',
            '14': '14-BIT', '15': '15-BIT', '16': '16-BIT', 'endless': '∞'
        };
        
        // Only create entries if there are scores
        if (difficultyScores.length > 0) {
            difficultyScores.forEach((entry, index) => {
                if (!entry || typeof entry !== 'object') {
                    return;
                }
                
                const div = document.createElement('div');
                div.className = 'score-entry' + (entry.isNew ? ' new-score' : '');

                const modeTag = isOverall
                    ? `<span class="score-mode">${difficultyLabel[entry.difficulty] || '?'}</span>`
                    : '';

                div.innerHTML = `
                    <span class="score-rank">#${index + 1}</span>
                    <span class="score-initials">${entry.initials || '???'}</span>
                    ${modeTag}
                    <span class="score-value">${entry.score || 0}</span>
                `;
                
                if (index < 5) {
                    leftColumn.appendChild(div);
                } else {
                    rightColumn.appendChild(div);
                }
            });
        } else {
            // Show "No scores yet" message
            const noScoresMsg = document.createElement('div');
            noScoresMsg.style.color = '#ffa07a';
            noScoresMsg.style.textAlign = 'center';
            noScoresMsg.style.padding = '10px';
            noScoresMsg.style.fontSize = '10px';
            noScoresMsg.textContent = 'No scores yet for this mode!';
            leftColumn.appendChild(noScoresMsg);
        }
        
        scoreColumns.appendChild(leftColumn);
        scoreColumns.appendChild(rightColumn);
    } finally {
        // Always reset the flag, even if there was an error
        isUpdating = false;
    }
}
