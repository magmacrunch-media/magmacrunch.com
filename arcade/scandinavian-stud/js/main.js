// main.js — Sökö (Scandinavian Stud) | MagmaCrunch Media © 2026
// Bootstrap and UI management
const { ChipAnim } = AdCards;

document.addEventListener('DOMContentLoaded', () => {
    const game = new SokoGame();
    const lang = game.language;
    let highScores = [];

    // Initialize chip animation
    ChipAnim.init('chipAnimDisplay', 'chipAnimLegend');

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
    const actionLog = document.getElementById('actionLog');

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
        game.totalRounds = 0;
        game.newHand();
        game.startBettingRound();
        ChipAnim.setChips(game.players[0].chips);
        renderGame();
    }

    // ── Render game state ───────────────────────────────────

    function renderGame() {
        const state = game.getState();

        // Update displays
        potDisplay.textContent = state.pot;
        chipDisplay.textContent = game.players[0].chips;
        ChipAnim.setChips(game.players[0].chips);
        roundDisplay.textContent = state.round;
        
        const streetNames = LABELS[lang].streetNames;
        streetLabel.textContent = streetNames[state.round] || `Street ${state.round}`;

        // Render AI areas
        renderAIPlayers(state.players.filter(p => !p.isHuman));

        // Render human player
        renderHumanPlayer(state.players.find(p => p.isHuman));

        // Render action log
        renderActionLog(state.actionLog);

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
            const actions = game.getAvailableActions();
            if (actions.length > 0) {
                showActionButtons();
            } else {
                // Human has no actions (all-in) — auto-advance
                hideActionButtons();
                setTimeout(() => {
                    game.check(game.players[0]);
                    renderGame();
                }, 400);
            }
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
            
            const nameText = document.createElement('span');
            nameText.className = 'ai-name-text';
            nameText.textContent = player.name;
            
            const chipsSpan = document.createElement('span');
            chipsSpan.className = 'ai-chips';
            chipsSpan.textContent = player.chips;
            
            nameTag.appendChild(nameText);
            nameTag.appendChild(chipsSpan);
            
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

    // ── Render action log ──────────────────────────────────

    function renderActionLog(log) {
        if (!log || log.length === 0) {
            actionLog.innerHTML = '';
            return;
        }

        // Show last 5 entries
        const recentLog = log.slice(-5);
        actionLog.innerHTML = '';
        
        recentLog.forEach(entry => {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            
            const playerSpan = document.createElement('span');
            playerSpan.className = 'log-player';
            playerSpan.textContent = entry.player;
            
            const actionSpan = document.createElement('span');
            actionSpan.className = 'log-action';
            actionSpan.textContent = entry.action;
            
            logEntry.appendChild(playerSpan);
            logEntry.appendChild(document.createTextNode(' '));
            logEntry.appendChild(actionSpan);
            
            if (entry.amount) {
                const amountSpan = document.createElement('span');
                amountSpan.className = 'log-amount';
                amountSpan.textContent = entry.amount;
                logEntry.appendChild(document.createTextNode(' '));
                logEntry.appendChild(amountSpan);
            }
            
            actionLog.appendChild(logEntry);
        });

        // Auto-scroll to bottom
        actionLog.scrollTop = actionLog.scrollHeight;
    }

    // ── Show action buttons ────────────────────────────────

    function showActionButtons() {
        actionButtons.innerHTML = '';
        const actions = game.getAvailableActions();
        const enLabels = {
            check: 'check',
            call: 'call',
            raise: 'raise',
            fold: 'fold'
        };
        
        actions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = 'action-btn';
            
            switch (action) {
                case 'check':
                    btn.innerHTML = `${LABELS[lang].check} <span class="btn-sub">/ ${enLabels.check}</span>`;
                    btn.classList.add('check');
                    btn.addEventListener('click', () => {
                        game.check(game.players[0]);
                        renderGame();
                    });
                    break;
                case 'call': {
                    const amt = game.currentBet - game.players[0].currentBet;
                    btn.innerHTML = `${LABELS[lang].call} <span class="btn-sub">/ ${enLabels.call} ${amt}</span>`;
                    btn.classList.add('call');
                    btn.addEventListener('click', () => {
                        game.call(game.players[0]);
                        renderGame();
                    });
                    break;
                }
                case 'raise':
                    btn.innerHTML = `${LABELS[lang].raise} <span class="btn-sub">/ ${enLabels.raise}</span>`;
                    btn.classList.add('raise');
                    btn.addEventListener('click', () => {
                        game.raise(game.players[0]);
                        renderGame();
                    });
                    break;
                case 'fold':
                    btn.innerHTML = `${LABELS[lang].fold} <span class="btn-sub">/ ${enLabels.fold}</span>`;
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
        const winner = state.lastWinner;
        const isPlayerWin = winner && winner.isHuman;
        const isTournamentWin = isPlayerWin && state.allOpponentsEliminated;
        const playerChips = game.players[0].chips;
        
        if (isTournamentWin) {
            messageArea.innerHTML = `
                <div class="game-over-message win">
                    <h2>VOITIT PEILIN</h2>
                    <p>You conquered the table! ${playerChips} chips</p>
                    <div style="margin: 12px 0;">
                        <input id="stud-initials" type="text" maxlength="3" placeholder="AAA"
                            style="width: 60px; text-align: center; font-family: 'Press Start 2P', monospace;
                            font-size: 12px; padding: 6px; text-transform: uppercase;
                            background: #1a1a2e; color: #ffe03a; border: 2px solid #ffe03a;">
                        <button id="stud-save-btn" class="action-btn" style="margin-left: 8px;">TALLENNA / save</button>
                    </div>
                    <button id="nextHandBtn" class="action-btn">${LABELS[lang].newGame} <span class="btn-sub">/ new game</span></button>
                </div>
            `;
            
            const initialsInput = document.getElementById('stud-initials');
            initialsInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
            });
            
            document.getElementById('stud-save-btn').addEventListener('click', () => {
                const initials = initialsInput.value.trim() || 'AAA';
                scoreClient.save('scandinavian-stud', initials, playerChips, { rounds: game.totalRounds });
                document.getElementById('stud-save-btn').textContent = 'SAVED!';
                document.getElementById('stud-save-btn').disabled = true;
                initialsInput.disabled = true;
            });
        } else {
            messageArea.innerHTML = `
                <div class="game-over-message ${isPlayerWin ? 'win' : 'lose'}">
                    <h2>${isPlayerWin ? LABELS[lang].youWin : LABELS[lang].youLose}</h2>
                    <p>${winner ? winner.name : LABELS[lang].player} — ${isPlayerWin ? LABELS[lang].gameOverWin : LABELS[lang].gameOverLose} (${state.pot})</p>
                    <button id="nextHandBtn" class="action-btn">Seuraava käsi / next hand <span class="btn-sub">/ next hand</span></button>
                </div>
            `;
        }
        
        document.getElementById('nextHandBtn').addEventListener('click', () => {
            messageArea.innerHTML = '';
            if (isTournamentWin) {
                startGame();
            } else {
                game.prepareNextHand();
                renderGame();
            }
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
        ChatWidget.disconnect();
        if (document.getElementById('gameChat')) {
            document.getElementById('gameChat').style.display = 'none';
        }
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
            highScores = await scoreClient.load('scandinavian-stud');
        } catch (e) {
            console.log('Could not load high scores');
            highScores = [];
        }
    }

    loadHighScores();

    // ══════════════════════════════════════════════════════════════════════
    // MULTIPLAYER MODE
    // ══════════════════════════════════════════════════════════════════════

    let isMultiplayer = false;
    let myName = '';
    let myColor = '';
    let roomCode = '';
    let myPlayerId = null;

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
            myPlayerId = data.playerName; // Use name as ID for simplicity
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
        gameScreen.style.display = 'block';
        if (document.getElementById('gameChat')) {
            document.getElementById('gameChat').style.display = 'flex';
        }
        ChatWidget.connect();

        // Initialize game state from server
        if (data.state) {
            syncMultiplayerState(data.state);
        }

        // Initialize chip animation
        ChipAnim.init('chipAnimDisplay', 'chipAnimLegend');

        showMessage('Game started! Waiting for cards...');
    }

    function syncMultiplayerState(state) {
        if (!state) return;

        // Update stats
        document.getElementById('potAmount').textContent = state.pot || 0;
        document.getElementById('roundDisplay').textContent = state.round || 1;

        // Update player's chips
        const myPlayer = state.players ? state.players.find(p => p.id === myPlayerId) : null;
        if (myPlayer) {
            document.getElementById('playerChips').textContent = myPlayer.chips;
            ChipAnim.setChips(myPlayer.chips);
        }

        // Update street label
        const streetNames = LABELS[lang].streetNames;
        document.getElementById('streetLabel').textContent = streetNames[state.round] || `Street ${state.round}`;

        // Render players
        if (state.players) {
            renderMultiplayerPlayers(state.players);
        }

        // Show action buttons if it's my turn
        if (state.phase === 'betting' && state.currentTurn === myPlayerId) {
            const actions = game.getAvailableActions ? game.getAvailableActions(myPlayerId) : [];
            showMultiplayerActionButtons(actions);
        } else {
            hideActionButtons();
        }

        // Check for game over
        if (state.gameOver) {
            showMultiplayerGameOver(state);
        }
    }

    function renderMultiplayerPlayers(players) {
        const aiAreas = document.getElementById('aiAreas');
        const playerArea = document.getElementById('playerArea');

        // Render other players
        aiAreas.innerHTML = '';
        players.filter(p => p.id !== myPlayerId).forEach(p => {
            const area = document.createElement('div');
            area.className = `ai-area ${p.folded ? 'folded' : ''}`;

            const nameTag = document.createElement('div');
            nameTag.className = 'ai-name';

            const nameText = document.createElement('span');
            nameText.className = 'ai-name-text';
            nameText.textContent = p.name;

            const chipsSpan = document.createElement('span');
            chipsSpan.className = 'ai-chips';
            chipsSpan.textContent = p.chips;

            nameTag.appendChild(nameText);
            nameTag.appendChild(chipsSpan);

            const cardsDiv = document.createElement('div');
            cardsDiv.className = 'ai-cards';

            // Show cards face up during showdown, otherwise hide
            const showCards = lastMultiplayerState && lastMultiplayerState.phase === 'showdown';
            p.cards.forEach(card => {
                const cardEl = createCardElement(card, showCards);
                cardsDiv.appendChild(cardEl);
            });

            area.appendChild(nameTag);
            area.appendChild(cardsDiv);

            if (p.hand && !p.folded) {
                const handLabel = document.createElement('div');
                handLabel.className = 'ai-hand';
                handLabel.textContent = p.hand.description;
                area.appendChild(handLabel);
            }

            aiAreas.appendChild(area);
        });

        // Render human player
        const myPlayer = players.find(p => p.id === myPlayerId);
        if (myPlayer) {
            playerArea.innerHTML = '';

            const cardsDiv = document.createElement('div');
            cardsDiv.className = 'player-cards';

            myPlayer.cards.forEach(card => {
                const cardEl = createCardElement(card, true);
                cardEl.addEventListener('click', () => handleMultiplayerCardClick(card));
                cardsDiv.appendChild(cardEl);
            });

            playerArea.appendChild(cardsDiv);

            if (myPlayer.hand && !myPlayer.folded) {
                const handLabel = document.createElement('div');
                handLabel.className = 'player-hand';
                handLabel.textContent = myPlayer.hand.description;
                playerArea.appendChild(handLabel);
            }
        }
    }

    let lastMultiplayerState = null;

    function handleMultiplayerCardClick(card) {
        // Card clicks during multiplayer are handled by action buttons
    }

    function handleMultiplayerAction(action) {
        if (!action) return;

        lastMultiplayerState = action.state || lastMultiplayerState;

        if (action.state) {
            syncMultiplayerState(action.state);
        }

        // Show action log
        if (action.state && action.state.actionLog) {
            renderMultiplayerActionLog(action.state.actionLog);
        }
    }

    function showMultiplayerActionButtons(actions) {
        actionButtons.innerHTML = '';

        actions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = 'action-btn';

            switch (action) {
                case 'check':
                    btn.innerHTML = `${LABELS[lang].check} <span class="btn-sub">/ check</span>`;
                    btn.classList.add('check');
                    btn.addEventListener('click', () => {
                        MP.sendAction({ type: 'player_action', action: 'check' });
                    });
                    break;
                case 'call': {
                    const callAmount = lastMultiplayerState ? lastMultiplayerState.currentBet - (myPlayerCurrentBet || 0) : 0;
                    btn.innerHTML = `${LABELS[lang].call} <span class="btn-sub">/ call ${callAmount}</span>`;
                    btn.classList.add('call');
                    btn.addEventListener('click', () => {
                        MP.sendAction({ type: 'player_action', action: 'call' });
                    });
                    break;
                }
                case 'raise':
                    btn.innerHTML = `${LABELS[lang].raise} <span class="btn-sub">/ raise</span>`;
                    btn.classList.add('raise');
                    btn.addEventListener('click', () => {
                        MP.sendAction({ type: 'player_action', action: 'raise' });
                    });
                    break;
                case 'fold':
                    btn.innerHTML = `${LABELS[lang].fold} <span class="btn-sub">/ fold</span>`;
                    btn.classList.add('fold');
                    btn.addEventListener('click', () => {
                        MP.sendAction({ type: 'player_action', action: 'fold' });
                    });
                    break;
            }

            actionButtons.appendChild(btn);
        });
    }

    let myPlayerCurrentBet = 0;

    function renderMultiplayerActionLog(log) {
        const actionLog = document.getElementById('actionLog');
        if (!actionLog || !log) return;

        actionLog.innerHTML = '';
        log.slice(-5).forEach(entry => {
            const div = document.createElement('div');
            div.className = 'log-entry';
            div.innerHTML = `<span class="log-player">${escapeHtml(entry.player)}</span> <span class="log-action">${escapeHtml(entry.action)}</span>${entry.amount ? ` <span class="log-amount">${entry.amount}</span>` : ''}`;
            actionLog.appendChild(div);
        });

        actionLog.scrollTop = actionLog.scrollHeight;
    }

    function showMultiplayerGameOver(state) {
        const winner = state.lastWinner;
        const isPlayerWin = winner && winner.id === myPlayerId;

        messageArea.innerHTML = `
            <div class="game-over-message ${isPlayerWin ? 'win' : 'lose'}">
                <h2>${isPlayerWin ? LABELS[lang].youWin : LABELS[lang].youLose}</h2>
                <p>${winner ? winner.name : LABELS[lang].player} — ${isPlayerWin ? LABELS[lang].gameOverWin : LABELS[lang].gameOverLose} (${state.pot})</p>
                <button id="nextHandBtn" class="action-btn">Seuraava käsi / next hand</button>
            </div>
        `;

        document.getElementById('nextHandBtn').addEventListener('click', () => {
            MP.sendAction({ type: 'next_hand' });
        });
    }

    function createCardElement(card, faceUp) {
        const div = document.createElement('div');
        div.className = `card ${faceUp ? 'face-up' : 'face-down'} ${card.suit}`;

        if (faceUp) {
            div.innerHTML = `
                <div class="card-corner top-left">
                    <span class="corner-rank">${card.rank}</span>
                    <span class="corner-suit">${SUIT_SYMBOLS[card.suit]}</span>
                </div>
                <div class="card-center">${SUIT_SYMBOLS[card.suit]}</div>
                <div class="card-corner bottom-right">
                    <span class="corner-rank">${card.rank}</span>
                    <span class="corner-suit">${SUIT_SYMBOLS[card.suit]}</span>
                </div>
            `;
        } else {
            div.innerHTML = `<div class="card-back">🂠</div>`;
        }

        return div;
    }
});
