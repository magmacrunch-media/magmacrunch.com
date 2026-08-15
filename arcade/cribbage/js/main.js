// main.js — Cribbage UI management | MagmaCrunch Media © 2026
// Handles user interactions and updates the display

// Destructure AdCards constants for use in this file
const { SUIT_SYMBOLS, RANK_VALUES } = AdCards;

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize AdAudio (placeholder URLs — replace with actual audio files)
    try {
        await AdAudio.init({
            music: { url: 'audio/background.ogg', volume: 0.3, fadeIn: 2.0 },
            sfx: {
                deal:    { url: 'audio/sfx/deal.ogg',    volume: 0.5, pool: 3 },
                shuffle: { url: 'audio/sfx/shuffle.ogg',  volume: 0.4, pool: 2 },
                score:   { url: 'audio/sfx/score.ogg',    volume: 0.5, pool: 2 },
                win:     { url: 'audio/sfx/win.ogg',      volume: 0.6, pool: 1 },
            },
        });
        AdAudio.handleVisibility({ pauseMusic: true });
    } catch (e) {
        console.warn('AdAudio init failed (audio files not yet added):', e.message);
    }

    const game = new CribbageGame();

    // ── DOM Elements ────────────────────────────────────────────
    const startScreen = document.getElementById('startScreen');
    const gameScreen = document.getElementById('gameScreen');
    const startBtn = document.getElementById('startGameBtn');
    const rulesBtn = document.getElementById('viewRulesBtn');
    const scoresBtn = document.getElementById('viewScoresBtn');
    const newGameBtn = document.getElementById('newGameBtn');
    const menuBtn = document.getElementById('menuBtn');
    const backLink = document.querySelector('.mc-back');

    // Game areas
    const playerHandEl = document.getElementById('playerHand');
    const aiHandEl = document.getElementById('aiHand');
    const cribAreaEl = document.getElementById('cribArea');
    const starterCardEl = document.getElementById('starterCard');
    const countDisplayEl = document.getElementById('countDisplay');
    const messageAreaEl = document.getElementById('messageArea');
    const actionButtonsEl = document.getElementById('actionButtons');

    // ── Event Listeners ─────────────────────────────────────────
    startBtn.addEventListener('click', startGame);
    rulesBtn.addEventListener('click', showRules);
    scoresBtn.addEventListener('click', showHighScores);
    newGameBtn.addEventListener('click', startGame);
    menuBtn.addEventListener('click', showMenu);

    // Board toggle (collapse/expand)
    const boardToggle = document.getElementById('boardToggle');
    const cribbageBoard = document.getElementById('cribbageBoard');
    if (boardToggle && cribbageBoard) {
        boardToggle.addEventListener('click', () => {
            cribbageBoard.classList.toggle('collapsed');
            const collapsed = cribbageBoard.classList.contains('collapsed');
            boardToggle.textContent = collapsed ? '▶ Scores' : '▼ Board';
        });
    }

    // ── Start new game ──────────────────────────────────────────
    function startGame() {
        startScreen.style.display = 'none';
        gameScreen.style.display = 'flex';

        game.reset();
        CribbageBoard.init('cribbageBoard');

        dealNewHand();
    }

    // ── Deal new hand ───────────────────────────────────────────
    function dealNewHand() {
        const { playerHand, aiHand } = game.deal();
        renderHands();
        showMessage(`Select 2 cards for the crib (${game.isPlayerDealer ? 'your' : "opponent's"} crib)`);
        showCribSelectionButtons();
    }

    // ── Render hands ────────────────────────────────────────────
    function renderHands() {
        const state = game.getState();

        // Player hand
        playerHandEl.innerHTML = '';
        state.playerHand.forEach(card => {
            const cardEl = createCardElement(card, true);
            cardEl.addEventListener('click', () => handleCardClick(card));
            playerHandEl.appendChild(cardEl);
        });

        // AI hand (face down)
        aiHandEl.innerHTML = '';
        state.aiHand.forEach(card => {
            const cardEl = createCardElement(card, false);
            aiHandEl.appendChild(cardEl);
        });

        // Update crib display
        cribAreaEl.innerHTML = '';
        state.crib.forEach(card => {
            const cardEl = createCardElement(card, false);
            cribAreaEl.appendChild(cardEl);
        });

        // Update starter card
        starterCardEl.innerHTML = '';
        if (state.starter) {
            const cardEl = createCardElement(state.starter, true);
            starterCardEl.appendChild(cardEl);
        }

        // Update count display
        countDisplayEl.textContent = state.currentCount;
    }

    // ── Create card element ─────────────────────────────────────
    function createCardElement(card, faceUp) {
        card.faceUp = faceUp;
        return card.getHTML();
    }

    // ── Handle card click ───────────────────────────────────────
    function handleCardClick(card) {
        const state = game.getState();

        switch (state.phase) {
            case PHASE.CRIB_SELECTION:
                game.selectForCrib(card);
                renderHands();
                updateCribSelectionButtons();
                break;

            case PHASE.PEGGING:
                if (state.currentTurn === 'player') {
                    const result = game.playPeggingCard(card, 'player');
                    if (result) {
                        renderHands();
                        updatePeggingDisplay(result);
                        checkGamePhase();
                    }
                }
                break;
        }
    }

    // ── Show crib selection buttons ─────────────────────────────
    function showCribSelectionButtons() {
        actionButtonsEl.innerHTML = '';
        updateCribSelectionButtons();
    }

    // ── Update crib selection buttons ───────────────────────────
    function updateCribSelectionButtons() {
        const state = game.getState();
        const selected = state.selectedForCrib.length;

        actionButtonsEl.innerHTML = '';

        if (selected === 2) {
            const btn = document.createElement('button');
            btn.className = 'action-btn confirm';
            btn.textContent = `Send to Crib`;
            btn.addEventListener('click', confirmCrib);
            actionButtonsEl.appendChild(btn);
        } else {
            const msg = document.createElement('div');
            msg.className = 'selection-hint';
            msg.textContent = `Select ${2 - selected} more card${selected === 1 ? '' : 's'}`;
            actionButtonsEl.appendChild(msg);
        }
    }

    // ── Confirm crib selection ──────────────────────────────────
    function confirmCrib() {
        game.confirmCribSelection();
        renderHands();
        showMessage('Cut for starter...');
        showStarterCutButton();
    }

    // ── Show starter cut button ─────────────────────────────────
    function showStarterCutButton() {
        actionButtonsEl.innerHTML = '';
        const btn = document.createElement('button');
        btn.className = 'action-btn cut';
        btn.textContent = 'Cut Deck';
        btn.addEventListener('click', cutStarter);
        actionButtonsEl.appendChild(btn);
    }

    // ── Cut for starter ─────────────────────────────────────────
    function cutStarter() {
        const starter = game.cutStarter();
        renderHands();

        if (starter.rank === 'J') {
            showMessage(`His Heels! Jack turned - ${game.isPlayerDealer ? 'You' : 'Opponent'} gets 2 points`);
        } else {
            showMessage(`Starter: ${starter.rank}${SUIT_SYMBOLS[starter.suit]}`);
        }

        setTimeout(() => {
            showMessage(`${game.isPlayerDealer ? "Opponent's" : 'Your'} turn to play`);
            showPeggingButtons();
        }, 1500);
    }

    // ── Show pegging buttons ────────────────────────────────────
    function showPeggingButtons() {
        actionButtonsEl.innerHTML = '';
        const state = game.getState();

        if (state.currentTurn === 'player') {
            // Show playable cards
            const playable = state.playerHand.filter(c =>
                RANK_VALUES[c.rank] + state.currentCount <= MAX_PEG_COUNT
            );

            if (playable.length === 0) {
                // Must say Go (only if count > 0, otherwise we just started a new round)
                if (state.currentCount > 0) {
                    const btn = document.createElement('button');
                    btn.className = 'action-btn go';
                    btn.textContent = 'Go';
                    btn.addEventListener('click', sayGo);
                    actionButtonsEl.appendChild(btn);
                } else {
                    // Count is 0 but no playable cards = hand is empty, auto-advance
                    showMessage('Waiting...');
                    setTimeout(() => {
                        game.phase = PHASE.HAND_SCORING;
                        checkGamePhase();
                    }, 500);
                }
            } else {
                showMessage('Your turn - click a card to play');
            }
        } else {
            // AI's turn
            setTimeout(aiPlay, 1000);
        }
    }

    // ── AI play ─────────────────────────────────────────────────
    function aiPlay() {
        const state = game.getState();
        if (state.currentTurn !== 'ai' || state.phase !== PHASE.PEGGING) return;

        const card = CribbageAI.selectPeggingCard(state.aiHand, state.currentCount, state.playedCards);

        if (card) {
            const result = game.playPeggingCard(card, 'ai');
            renderHands();
            updatePeggingDisplay(result);
            checkGamePhase();
        } else if (state.currentCount > 0) {
            // AI can't play, count > 0 = Go
            sayGo();
        } else {
            // Count is 0 but AI has no cards = hand is empty, auto-advance
            showMessage('Waiting...');
            setTimeout(() => {
                game.phase = PHASE.HAND_SCORING;
                checkGamePhase();
            }, 500);
        }
    }

    // ── Say Go ──────────────────────────────────────────────────
    function sayGo() {
        const state = game.getState();
        const playerWhoCantPlay = state.currentTurn;

        // Point already added in game.playPeggingCard(), just reset and switch turns
        game.resetCount();

        // After Go, the player who couldn't play goes first next round
        game.currentTurn = playerWhoCantPlay;

        renderHands();
        showMessage('Go!');
        CribbageBoard.updatePegs(game.scores.player, game.scores.ai);

        setTimeout(() => {
            checkGamePhase();
        }, 1000);
    }

    // ── Update pegging display ──────────────────────────────────
    function updatePeggingDisplay(result) {
        CribbageBoard.updatePegs(game.scores.player, game.scores.ai);

        if (result && result.description) {
            showMessage(result.description);
        }

        countDisplayEl.textContent = game.currentCount;
    }

    // ── Check game phase and proceed ────────────────────────────
    function checkGamePhase() {
        const state = game.getState();

        // Check for winner
        const winner = game.checkWinner();
        if (winner) {
            showGameOver(winner);
            return;
        }

        switch (state.phase) {
            case PHASE.PEGGING:
                // If a Go was just called (count is 0 and it's a new round), auto-proceed
                if (game.currentCount === 0 && game.goCalled) {
                    // Go was just handled, proceed to next player's turn
                    showPeggingButtons();
                } else {
                    showPeggingButtons();
                }
                break;

            case PHASE.HAND_SCORING:
                showHandScoring();
                break;

            case PHASE.DEAL:
                setTimeout(dealNewHand, 2000);
                break;
        }
    }

    // ── Show hand scoring ──────────────────────────────────────
    function showHandScoring() {
        const results = game.scoreHands();
        if (!results) return;

        let message = 'Hand scoring:\n';
        results.forEach(result => {
            const playerName = result.player === 'crib' ? 'Crib' :
                             result.player === 'player' ? 'You' : 'Opponent';
            message += `${playerName}: ${result.score.total} points\n`;

            // Show breakdown
            const b = result.score.breakdown;
            if (b.fifteens > 0) message += `  15s: ${b.fifteens}\n`;
            if (b.pairs > 0) message += `  Pairs: ${b.pairs}\n`;
            if (b.runs > 0) message += `  Runs: ${b.runs}\n`;
            if (b.flush > 0) message += `  Flush: ${b.flush}\n`;
            if (b.nobs > 0) message += `  Nobs: ${b.nobs}\n`;
        });

        showMessage(message);
        CribbageBoard.updatePegs(game.scores.player, game.scores.ai);

        // Check for winner
        const winner = game.checkWinner();
        if (winner) {
            setTimeout(() => showGameOver(winner), 2000);
        } else {
            // Proceed to next hand after delay
            setTimeout(() => {
                checkGamePhase();
            }, 3000);
        }
    }

    // ── Show game over ──────────────────────────────────────────
    async function showGameOver(winner) {
        const isPlayerWin = winner === 'player';
        messageAreaEl.innerHTML = `
            <div class="game-over-message ${isPlayerWin ? 'win' : 'lose'}">
                <h2>${isPlayerWin ? 'You Win!' : 'Opponent Wins!'}</h2>
                <p>Final Score: ${game.scores.player} - ${game.scores.ai}</p>
                <button id="playAgainBtn" class="action-btn">Play Again</button>
            </div>
        `;

        // Save score (metrics TBD — for now just win/loss + final score)
        if (isPlayerWin) {
            try {
                const initials = prompt('Enter your initials (3 chars):') || 'AAA';
                await scoreClient.save('cribbage', initials.slice(0, 3).toUpperCase(), game.scores.player, {
                    finalScore: game.scores.player
                });
            } catch (e) {
                console.warn('Failed to save score:', e);
            }
        }

        document.getElementById('playAgainBtn').addEventListener('click', startGame);
    }

    // ── Show message ────────────────────────────────────────────
    function showMessage(text) {
        messageAreaEl.innerHTML = `<div class="game-message">${text.replace(/\n/g, '<br>')}</div>`;
    }

    // ── Show rules ──────────────────────────────────────────────
    function showRules() {
        const modal = createModal('Cribbage Rules', `
            <div class="rules-content">
                <h3>Objective</h3>
                <p>Be the first to 121 points.</p>

                <h3>Card Values</h3>
                <p>A=1, 2-10 face value, J=11, Q=12, K=13</p>

                <h3>Phases</h3>
                <ol>
                    <li><strong>Deal:</strong> 6 cards to each player</li>
                    <li><strong>Crib:</strong> Each player discards 2 cards to the crib</li>
                    <li><strong>Starter:</strong> Cut deck, top card turned face up</li>
                    <li><strong>Pegging:</strong> Alternate playing cards, scoring points</li>
                    <li><strong>Scoring:</strong> Count hands and crib</li>
                </ol>

                <h3>Pegging Points</h3>
                <ul>
                    <li>15: 2 points</li>
                    <li>31: 2 points</li>
                    <li>Pair: 2 points</li>
                    <li>Three of a kind: 6 points</li>
                    <li>Four of a kind: 12 points</li>
                    <li>Run: points = run length</li>
                    <li>Go: 1 point</li>
                </ul>

                <h3>Hand Scoring</h3>
                <ul>
                    <li>15s: 2 points each</li>
                    <li>Pairs: 2 points</li>
                    <li>Runs: points = run length</li>
                    <li>Flush (4 cards): 4 points</li>
                    <li>Flush (5 cards): 5 points</li>
                    <li>Nobs (Jack matching starter): 1 point</li>
                </ul>
            </div>
        `);
        document.body.appendChild(modal);
    }

    // ── Show high scores ────────────────────────────────────────
    async function showHighScores() {
        const modal = createModal('High Scores', '<p>Loading scores...</p>');
        document.body.appendChild(modal);
        
        try {
            const scores = await scoreClient.load('cribbage');
            const modalContent = modal.querySelector('.modal');
            if (scores.length === 0) {
                modalContent.innerHTML = '<h2>High Scores</h2><p>No scores yet. Be the first!</p>';
            } else {
                const scoresHtml = scores.slice(0, 10).map((s, i) => 
                    `<div class="score-row"><span class="score-rank">${i + 1}.</span><span class="score-name">${s.initials || 'AAA'}</span><span class="score-pts">${s.score}</span></div>`
                ).join('');
                modalContent.innerHTML = `<h2>High Scores</h2>${scoresHtml}`;
            }
        } catch (e) {
            const modalContent = modal.querySelector('.modal');
            modalContent.innerHTML = '<h2>High Scores</h2><p>Could not load scores.</p>';
        }
    }

    // ── Show menu ───────────────────────────────────────────────
    function showMenu() {
        const modal = createModal('Menu', `
            <div class="menu-buttons">
                <button class="start-btn primary" onclick="location.reload()">New Game</button>
                <button class="start-btn" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
        `);
        document.body.appendChild(modal);
    }

    // ── Create modal ────────────────────────────────────────────
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

    // ══════════════════════════════════════════════════════════════════════
    // MULTIPLAYER MODE
    // ══════════════════════════════════════════════════════════════════════

    let isMultiplayer = false;
    let myName = '';
    let myColor = '';
    let roomCode = '';

    const multiplayerBtn = document.getElementById('multiplayerBtn');
    const lobbyOverlay = document.getElementById('lobbyOverlay');
    const lobbyPlayerList = document.getElementById('lobbyPlayerList');
    const lobbyColorGrid = document.getElementById('lobbyColorGrid');
    const lobbyChatMessages = document.getElementById('lobbyChatMessages');
    const lobbyChatInput = document.getElementById('lobbyChatInput');
    const lobbyChatSend = document.getElementById('lobbyChatSend');
    const lobbyCreateRoom = document.getElementById('lobbyCreateRoom');
    const lobbyJoinRoom = document.getElementById('lobbyJoinRoom');
    const lobbyStartGame = document.getElementById('lobbyStartGame');
    const lobbyLeave = document.getElementById('lobbyLeave');
    const lobbyStatus = document.getElementById('lobbyStatus');
    const lobbyRoomCode = document.getElementById('lobbyRoomCode');
    const roomCodeValue = document.getElementById('roomCodeValue');

    multiplayerBtn.addEventListener('click', showLobby);

    function showLobby() {
        startScreen.style.display = 'none';
        lobbyOverlay.style.display = 'flex';
        initColorPicker();
        connectToServer();
    }

    function initColorPicker() {
        lobbyColorGrid.innerHTML = '';
        MP_PALETTE.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'lobby-color-swatch';
            swatch.style.backgroundColor = color;
            swatch.dataset.color = color;
            swatch.addEventListener('click', () => selectColor(color));
            lobbyColorGrid.appendChild(swatch);
        });
    }

    function selectColor(color) {
        myColor = color;
        document.querySelectorAll('.lobby-color-swatch').forEach(s => {
            s.classList.toggle('selected', s.dataset.color === color);
        });
    }

    function connectToServer() {
        lobbyStatus.textContent = 'Connecting to server...';
        lobbyStatus.className = 'lobby-status';

        MP.onConnected = function() {
            lobbyStatus.textContent = 'Connected! Enter your name and create or join a room.';
        };

        MP.onDisconnected = function() {
            lobbyStatus.textContent = 'Disconnected from server.';
            lobbyStatus.className = 'lobby-status';
        };

        MP.onRejected = function(reason) {
            lobbyStatus.textContent = 'Rejected: ' + reason;
            lobbyStatus.className = 'lobby-status';
        };

        MP.onWelcome = function(data) {
            myName = data.playerName;
            myColor = data.chosenColor;
            roomCode = data.room;
            updateLobbyUI(data);
        };

        MP.onLobbyUpdate = function(data) {
            updatePlayerList(data.players);
            updateTakenColors(data.takenColors);
            lobbyStartGame.style.display = data.canStart ? 'block' : 'none';
        };

        MP.onGameStarted = function(data) {
            lobbyOverlay.style.display = 'none';
            startMultiplayerGame(data);
        };

        MP.onChatMessage = function(from, text, color) {
            addLobbyChatMessage(from, text, color);
        };

        MP.onSystemMessage = function(text) {
            addLobbyChatMessage('System', text, '');
        };

        MP.onPlayerQuit = function(data) {
            addLobbyChatMessage('System', data.playerName + ' left the game', '');
        };

        MP.onGameAction = function(action) {
            handleMultiplayerAction(action);
        };

        MP.onGameState = function(state) {
            syncMultiplayerState(state);
        };

        MP.connect();
    }

    function updateLobbyUI(data) {
        lobbyRoomCode.style.display = 'block';
        roomCodeValue.textContent = data.room;
        lobbyStatus.textContent = `Welcome, ${data.playerName}! Room: ${data.room}`;

        if (data.isHost) {
            lobbyStartGame.style.display = 'block';
            lobbyStatus.textContent += ' (You are the host)';
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function updatePlayerList(players) {
        lobbyPlayerList.innerHTML = '';
        if (!players) return;

        players.forEach(p => {
            const div = document.createElement('div');
            div.className = 'lobby-player';
            div.innerHTML = `
                <div class="lobby-player-color" style="background-color: ${escapeHtml(p.color)}"></div>
                <div class="lobby-player-name">${escapeHtml(p.name)}</div>
                ${p.isHost ? '<div class="lobby-player-host">HOST</div>' : ''}
            `;
            lobbyPlayerList.appendChild(div);
        });
    }

    function updateTakenColors(takenColors) {
        document.querySelectorAll('.lobby-color-swatch').forEach(swatch => {
            const color = swatch.dataset.color;
            const isTaken = takenColors && takenColors.includes(color);
            const isMine = color === myColor;
            swatch.classList.toggle('taken', isTaken && !isMine);
        });
    }

    function addLobbyChatMessage(from, text, color) {
        const div = document.createElement('div');
        div.className = 'lobby-chat-msg';
        div.innerHTML = `<span class="chat-name" style="color: ${escapeHtml(color || '#4a6a7a')}">${escapeHtml(from)}:</span> ${escapeHtml(text)}`;
        lobbyChatMessages.appendChild(div);
        lobbyChatMessages.scrollTop = lobbyChatMessages.scrollHeight;
    }

    // Lobby button handlers
    lobbyCreateRoom.addEventListener('click', () => {
        let name = localStorage.getItem('arcade_username');
        if (!name) name = prompt('Enter your name:');
        if (!name) return;
        localStorage.setItem('arcade_username', name);
        if (!myColor) myColor = MP_PALETTE[0];
        MP.createRoom(name, myColor, null);
    });

    lobbyJoinRoom.addEventListener('click', () => {
        let name = localStorage.getItem('arcade_username');
        if (!name) name = prompt('Enter your name:');
        if (!name) return;
        localStorage.setItem('arcade_username', name);
        const code = prompt('Enter room code:');
        if (!code) return;
        if (!myColor) myColor = MP_PALETTE[0];
        MP.joinRoom(name, myColor, code.toUpperCase());
    });

    lobbyStartGame.addEventListener('click', () => {
        MP.startGame();
    });

    lobbyLeave.addEventListener('click', () => {
        MP.quit();
        lobbyOverlay.style.display = 'none';
        startScreen.style.display = 'flex';
    });

    lobbyChatSend.addEventListener('click', sendLobbyChat);
    lobbyChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendLobbyChat();
    });

    function sendLobbyChat() {
        const text = lobbyChatInput.value.trim();
        if (!text) return;
        MP.sendChat(text);
        addLobbyChatMessage(myName, text, myColor);
        lobbyChatInput.value = '';
    }

    // ── Multiplayer Game Logic ─────────────────────────────────

    function startMultiplayerGame(data) {
        isMultiplayer = true;
        startScreen.style.display = 'none';
        gameScreen.style.display = 'flex';

        // Initialize game state from server
        if (data.state) {
            syncMultiplayerState(data.state);
        }

        CribbageBoard.init('cribbageBoard');
        showMessage('Game started! Waiting for cards...');
    }

    function syncMultiplayerState(state) {
        if (!state) return;

        // Update hands
        if (state.playerHands && state.playerHands[myName]) {
            renderMultiplayerHand(state.playerHands[myName], 'playerHand', true);
        }

        // Update crib
        if (state.crib) {
            cribAreaEl.innerHTML = '';
            state.crib.forEach(card => {
                const cardEl = createCardElement(card, false);
                cribAreaEl.appendChild(cardEl);
            });
        }

        // Update starter
        if (state.starter) {
            starterCardEl.innerHTML = '';
            const cardEl = createCardElement(state.starter, true);
            starterCardEl.appendChild(cardEl);
        }

        // Update count
        if (state.currentCount !== undefined) {
            countDisplayEl.textContent = state.currentCount;
        }

        // Update board
        if (state.scores) {
            CribbageBoard.updatePegs(state.scores[myName] || 0, getOpponentScore(state.scores));
        }
    }

    function renderMultiplayerHand(cards, containerId, faceUp) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        cards.forEach(card => {
            const cardEl = createCardElement(card, faceUp);
            cardEl.addEventListener('click', () => handleMultiplayerCardClick(card));
            container.appendChild(cardEl);
        });
    }

    function handleMultiplayerCardClick(card) {
        const state = lastMultiplayerState;
        if (!state) return;

        switch (state.phase) {
            case 'crib_selection':
                MP.sendAction({ type: 'select_crib', card: card });
                break;
            case 'pegging':
                if (state.currentTurn === myName) {
                    MP.sendAction({ type: 'play_card', card: card });
                }
                break;
        }
    }

    let lastMultiplayerState = null;

    function handleMultiplayerAction(action) {
        if (!action) return;

        lastMultiplayerState = action.state || lastMultiplayerState;

        switch (action.type) {
            case 'crib_selection_update':
                if (action.player === myName) {
                    // Update our selection UI
                    renderMultiplayerHand(getMyHandFromState(lastMultiplayerState), 'playerHand', true);
                    updateMultiplayerCribButtons(action.selectedCount);
                }
                break;

            case 'crib_confirmed':
                showMessage(`${action.player} confirmed their crib selection`);
                break;

            case 'starter_cut':
                if (action.starter) {
                    starterCardEl.innerHTML = '';
                    const cardEl = createCardElement(action.starter, true);
                    starterCardEl.appendChild(cardEl);
                    showMessage(`Starter: ${action.starter.rank}${SUIT_SYMBOLS[action.starter.suit]}`);
                }
                break;

            case 'card_played':
                if (action.player !== myName) {
                    // Show opponent's card in their hand area
                    // For now, just show it played
                }
                showMessage(`${action.player} played ${action.card.rank}${SUIT_SYMBOLS[action.card.suit]} - Count: ${action.count}`);
                if (action.description) {
                    showMessage(action.description);
                }
                break;

            case 'go_called':
                showMessage(`${action.player} says Go!`);
                break;

            case 'game_over':
                showMessage(`${action.winner} wins! Final score: ${JSON.stringify(action.scores)}`);
                break;
        }
    }

    function getMyHandFromState(state) {
        if (!state || !state.playerHands) return [];
        return state.playerHands[myName] || [];
    }

    function getOpponentScore(scores) {
        const opponentName = Object.keys(scores).find(k => k !== myName);
        return opponentName ? scores[opponentName] : 0;
    }

    function updateMultiplayerCribButtons(selectedCount) {
        actionButtonsEl.innerHTML = '';

        if (selectedCount === 2) {
            const btn = document.createElement('button');
            btn.className = 'action-btn confirm';
            btn.textContent = 'Send to Crib';
            btn.addEventListener('click', () => {
                MP.sendAction({ type: 'confirm_crib' });
            });
            actionButtonsEl.appendChild(btn);
        } else {
            const msg = document.createElement('div');
            msg.className = 'selection-hint';
            msg.textContent = `Select ${2 - selectedCount} more card${selectedCount === 1 ? '' : 's'}`;
            actionButtonsEl.appendChild(msg);
        }
    }
});
