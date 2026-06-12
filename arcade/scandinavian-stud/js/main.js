// main.js — Sökö (Scandinavian Stud) | MagmaCrunch Media © 2026
// Bootstrap and UI management

document.addEventListener('DOMContentLoaded', () => {
    const game = new SokoGame();
    const lang = game.language;
    let highScores = [];

    // ── DOM Elements ────────────────────────────────────────
    const startScreen = document.getElementById('startScreen');
    const gameScreen = document.getElementById('gameScreen');
    const startBtn = document.getElementById('startGameBtn');
    const rulesBtn = document.getElementById('viewRulesBtn');
    const scoresBtn = document.getElementById('viewScoresBtn');
    const newGameBtn = document.getElementById('newGameBtn');
    const menuBtn = document.getElementById('menuBtn');
    const backLink = document.querySelector('.mc-back');

    // Game displays
    const playerArea = document.getElementById('playerArea');
    const aiAreas = document.getElementById('aiAreas');
    const potDisplay = document.getElementById('potAmount');
    const chipDisplay = document.getElementById('playerChips');
    const messageArea = document.getElementById('messageArea');
    const actionButtons = document.getElementById('actionButtons');
    const roundDisplay = document.getElementById('roundDisplay');
    const streetLabel = document.getElementById('streetLabel');

    // ── Start Screen ────────────────────────────────────────

    startBtn.addEventListener('click', startGame);
    rulesBtn.addEventListener('click', showRules);
    scoresBtn.addEventListener('click', showHighScores);
    newGameBtn.addEventListener('click', startGame);
    menuBtn.addEventListener('click', showMenu);

    // ── Initialize game ─────────────────────────────────────

    function startGame() {
        startScreen.style.display = 'none';
        gameScreen.style.display = 'block';
        backLink.style.display = 'none';

        // Create players
        game.players = [
            { id: 0, name: LABELS[lang].player, chips: STARTING_CHIPS, cards: [], folded: false, allIn: false, currentBet: 0, hand: null, isHuman: true },
            { id: 1, name: 'Mikko', chips: STARTING_CHIPS, cards: [], folded: false, allIn: false, currentBet: 0, hand: null, isHuman: false, aiStyle: 0 },
            { id: 2, name: 'Liisa', chips: STARTING_CHIPS, cards: [], folded: false, allIn: false, currentBet: 0, hand: null, isHuman: false, aiStyle: 1 },
            { id: 3, name: 'Jussi', chips: STARTING_CHIPS, cards: [], folded: false, allIn: false, currentBet: 0, hand: null, isHuman: false, aiStyle: 2 }
        ];

        game.dealerIndex = 0;
        game.newHand();
        game.startBettingRound();
        renderGame();
    }

    // ── Render game state ───────────────────────────────────

    function renderGame() {
        const state = game.getState();

        // Update displays
        potDisplay.textContent = state.pot;
        chipDisplay.textContent = game.players[0].chips;
        roundDisplay.textContent = state.round + 1;
        
        const streetNames = LABELS[lang].streetNames;
        streetLabel.textContent = streetNames[state.round] || `Street ${state.round}`;

        // Render AI areas
        renderAIPlayers(state.players.filter(p => !p.isHuman));

        // Render human player
        renderHumanPlayer(state.players.find(p => p.isHuman));

        // Show message if game over
        if (state.gameOver) {
            showGameOver(state);
            return;
        }

        // Handle phase transitions
        if (state.phase === 'waiting') {
            // Betting round complete — advance to next street
            hideActionButtons();
            setTimeout(() => {
                game.advanceStreet();
                renderGame();
            }, 600);
            return;
        }

        // Show action buttons for human player
        if (state.currentPlayerIndex === 0 && state.phase === 'betting') {
            showActionButtons();
        } else if (state.phase === 'betting') {
            // AI is thinking
            hideActionButtons();
            setTimeout(() => {
                const aiPlayer = game.getCurrentPlayer();
                if (aiPlayer && !aiPlayer.isHuman) {
                    game.aiDecide(aiPlayer);
                    renderGame();
                }
            }, 800);
        }
    }

    // ── Render AI players ──────────────────────────────────

    function renderAIPlayers(players) {
        aiAreas.innerHTML = '';
        
        players.forEach(player => {
            const area = document.createElement('div');
            area.className = `ai-area ${player.folded ? 'folded' : ''}`;
            
            const nameTag = document.createElement('div');
            nameTag.className = 'ai-name';
            nameTag.innerHTML = `
                <span class="ai-name-text">${player.name}</span>
                <span class="ai-chips">${player.chips}</span>
            `;
            
            const cardsDiv = document.createElement('div');
            cardsDiv.className = 'ai-cards';
            
            player.cards.forEach(card => {
                const cardEl = card.getHTML();
                cardsDiv.appendChild(cardEl);
            });
            
            area.appendChild(nameTag);
            area.appendChild(cardsDiv);
            
            if (player.hand && !player.folded) {
                const handLabel = document.createElement('div');
                handLabel.className = 'ai-hand';
                handLabel.textContent = player.hand.description;
                area.appendChild(handLabel);
            }
            
            aiAreas.appendChild(area);
        });
    }

    // ── Render human player ────────────────────────────────

    function renderHumanPlayer(player) {
        if (!player) return;
        
        playerArea.innerHTML = '';
        
        const cardsDiv = document.createElement('div');
        cardsDiv.className = 'player-cards';
        
        player.cards.forEach(card => {
            const cardEl = card.getHTML();
            cardsDiv.appendChild(cardEl);
        });
        
        playerArea.appendChild(cardsDiv);
        
        if (player.hand && !player.folded) {
            const handLabel = document.createElement('div');
            handLabel.className = 'player-hand';
            handLabel.textContent = player.hand.description;
            playerArea.appendChild(handLabel);
        }
    }

    // ── Show action buttons ────────────────────────────────

    function showActionButtons() {
        actionButtons.innerHTML = '';
        const actions = game.getAvailableActions();
        
        actions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = 'action-btn';
            
            switch (action) {
                case 'check':
                    btn.textContent = LABELS[lang].check;
                    btn.classList.add('check');
                    btn.addEventListener('click', () => {
                        game.check(game.players[0]);
                        renderGame();
                    });
                    break;
                case 'call':
                    btn.textContent = `${LABELS[lang].call} ${game.currentBet - game.players[0].currentBet}`;
                    btn.classList.add('call');
                    btn.addEventListener('click', () => {
                        game.call(game.players[0]);
                        renderGame();
                    });
                    break;
                case 'raise':
                    btn.textContent = LABELS[lang].raise;
                    btn.classList.add('raise');
                    btn.addEventListener('click', () => {
                        game.raise(game.players[0]);
                        renderGame();
                    });
                    break;
                case 'fold':
                    btn.textContent = LABELS[lang].fold;
                    btn.classList.add('fold');
                    btn.addEventListener('click', () => {
                        game.fold(game.players[0]);
                        renderGame();
                    });
                    break;
            }
            
            actionButtons.appendChild(btn);
        });
    }

    function hideActionButtons() {
        actionButtons.innerHTML = '';
    }

    // ── Show game over ─────────────────────────────────────

    function showGameOver(state) {
        const winner = state.players.find(p => p.chips > 0);
        const isPlayerWin = winner && winner.isHuman;
        
        messageArea.innerHTML = `
            <div class="game-over-message ${isPlayerWin ? 'win' : 'lose'}">
                <h2>${isPlayerWin ? LABELS[lang].youWin : LABELS[lang].youLose}</h2>
                <p>${winner ? winner.name : LABELS[lang].player} — ${isPlayerWin ? LABELS[lang].gameOverWin : LABELS[lang].gameOverLose} (${state.pot})</p>
                <button id="nextHandBtn" class="action-btn">${LABELS[lang].newGame}</button>
            </div>
        `;
        
        document.getElementById('nextHandBtn').addEventListener('click', () => {
            messageArea.innerHTML = '';
            game.prepareNextHand();
            renderGame();
        });
    }

    // ── Modals ──────────────────────────────────────────────

    function showRules() {
        const modal = createModal(LABELS[lang].rulesTitle, `
            <ul class="rules-list">
                ${LABELS[lang].rules.map(r => `<li>${r}</li>`).join('')}
            </ul>
        `);
        document.body.appendChild(modal);
    }

    function showHighScores() {
        const modal = createModal(LABELS[lang].highScores, `
            <div class="high-scores">
                ${highScores.length === 0 ? `<p>${LABELS[lang].noScores || 'Ei vielä ennätyksiä / no scores yet'}</p>` : 
                    highScores.map((s, i) => `
                        <div class="score-row">
                            <span class="rank">${i + 1}.</span>
                            <span class="initials">${s.initials}</span>
                            <span class="score">${s.score}</span>
                        </div>
                    `).join('')
                }
            </div>
        `);
        document.body.appendChild(modal);
    }

    function showMenu() {
        const modal = createModal(LABELS[lang].menu, `
            <div class="menu-buttons">
                <button class="start-btn primary" onclick="location.reload()">${LABELS[lang].newGame}</button>
                <button class="start-btn" onclick="this.closest('.modal-overlay').remove()">${LABELS[lang].close}</button>
            </div>
            <div class="menu-rules" style="margin-top:20px;text-align:left;">
                <div style="font-size:12px;color:var(--slate);margin-bottom:8px;">${LABELS[lang].rulesTitle}</div>
                <ul class="rules-list">
                    ${LABELS[lang].rules.map(r => `<li>${r}</li>`).join('')}
                </ul>
            </div>
        `);
        document.body.appendChild(modal);
    }

    function createModal(title, content) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal">
                <h2>${title}</h2>
                ${content}
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
        `;
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        return overlay;
    }

    // ── Load high scores ───────────────────────────────────

    async function loadHighScores() {
        try {
            const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
                headers: { 'X-Access-Key': JSONBIN_API_KEY }
            });
            const data = await response.json();
            highScores = data.record.scores || [];
        } catch (e) {
            console.log('Could not load high scores');
            highScores = [];
        }
    }

    loadHighScores();
});
