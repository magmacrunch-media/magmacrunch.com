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
            if (isMultiplayer) {
                hideActionButtons();
                messageArea.textContent = data.playerName + ' left the game.';
            }
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
            const colorEl = document.createElement('div');
            colorEl.className = 'lobby-player-color';
            colorEl.style.backgroundColor = p.color;
            const nameEl = document.createElement('div');
            nameEl.className = 'lobby-player-name';
            nameEl.textContent = p.name;
            div.appendChild(colorEl);
            div.appendChild(nameEl);
            if (p.isHost) {
                const hostEl = document.createElement('div');
                hostEl.className = 'lobby-player-host';
                hostEl.textContent = 'HOST';
                div.appendChild(hostEl);
            }
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
        const nameEl = document.createElement('span');
        nameEl.className = 'chat-name';
        nameEl.style.color = color || '#4a6a7a';
        nameEl.textContent = from + ':';
        div.appendChild(nameEl);
        div.appendChild(document.createTextNode(' ' + text));
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
    //
    // The server sends the whole table as `state` on every frame, every card
    // included with the hole card marked, and what the player to act may do
    // in state.actions. Until 2026-10-14 the page asked the single-player
    // engine for those actions, so it offered buttons for a game that was not
    // being played, and it never showed anybody their own hole card.

    let lastMultiplayerState = null;

    function startMultiplayerGame(data) {
        isMultiplayer = true;
        startScreen.style.display = 'none';
        gameScreen.style.display = 'block';
        if (document.getElementById('gameChat')) {
            document.getElementById('gameChat').style.display = 'flex';
        }
        ChipAnim.init('chipAnimDisplay', 'chipAnimLegend');
        messageArea.innerHTML = '';
        if (data.state) syncMultiplayerState(data.state);
    }

    function syncMultiplayerState(state) {
        if (!state) return;
        lastMultiplayerState = state;

        document.getElementById('potAmount').textContent = state.pot || 0;
        document.getElementById('roundDisplay').textContent = state.round || 1;

        const myPlayer = state.players ? state.players.find(p => p.id === myPlayerId) : null;
        if (myPlayer) {
            document.getElementById('playerChips').textContent = myPlayer.chips;
            ChipAnim.setChips(myPlayer.chips);
        }

        const streetNames = LABELS[lang].streetNames;
        document.getElementById('streetLabel').textContent = streetNames[state.round] || `Street ${state.round}`;

        if (state.players) renderMultiplayerPlayers(state);
        renderMultiplayerActionLog(state.actionLog);

        const myActions = (state.actions && state.actions[myPlayerId]) || [];
        if (state.phase === 'betting' && state.currentTurn === myPlayerId && myActions.length) {
            showMultiplayerActionButtons(myActions, state, myPlayer);
        } else {
            hideActionButtons();
        }

        if (state.gameOver) {
            showMultiplayerGameOver(state);
        } else {
            const turn = state.players && state.players.find(p => p.id === state.currentTurn);
            messageArea.innerHTML = '';
            const div = document.createElement('div');
            div.className = 'game-message';
            div.textContent = state.currentTurn === myPlayerId
                ? 'Your turn'
                : (turn ? `${turn.name} to act` : '');
            messageArea.appendChild(div);
        }
    }

    function renderMultiplayerPlayers(state) {
        const players = state.players;
        const aiAreas = document.getElementById('aiAreas');
        const playerArea = document.getElementById('playerArea');
        const reveal = !!state.showdown;

        aiAreas.innerHTML = '';
        players.filter(p => p.id !== myPlayerId).forEach(p => {
            const area = document.createElement('div');
            area.className = `ai-area ${p.folded ? 'folded' : ''}`;

            const nameTag = document.createElement('div');
            nameTag.className = 'ai-name';
            const nameText = document.createElement('span');
            nameText.className = 'ai-name-text';
            nameText.textContent = p.name + (p.id === state.currentTurn ? ' ◀' : '');
            const chipsSpan = document.createElement('span');
            chipsSpan.className = 'ai-chips';
            chipsSpan.textContent = p.chips;
            nameTag.appendChild(nameText);
            nameTag.appendChild(chipsSpan);

            const cardsDiv = document.createElement('div');
            cardsDiv.className = 'ai-cards';
            p.cards.forEach(card => {
                cardsDiv.appendChild(createCardElement(card, !card.hole || (reveal && !p.folded)));
            });

            area.appendChild(nameTag);
            area.appendChild(cardsDiv);

            // Their hand is read with the hole card in it, so it is shown
            // only once the hole card is.
            if (reveal && p.hand && !p.folded) {
                const handLabel = document.createElement('div');
                handLabel.className = 'ai-hand';
                handLabel.textContent = p.hand.description;
                area.appendChild(handLabel);
            }

            aiAreas.appendChild(area);
        });

        const myPlayer = players.find(p => p.id === myPlayerId);
        if (myPlayer) {
            playerArea.innerHTML = '';
            const cardsDiv = document.createElement('div');
            cardsDiv.className = 'player-cards';
            myPlayer.cards.forEach(card => cardsDiv.appendChild(createCardElement(card, true)));
            playerArea.appendChild(cardsDiv);

            if (myPlayer.hand && !myPlayer.folded) {
                const handLabel = document.createElement('div');
                handLabel.className = 'player-hand';
                handLabel.textContent = myPlayer.hand.description;
                playerArea.appendChild(handLabel);
            }
        }
    }

    function handleMultiplayerAction(action) {
        if (!action || !action.state) return;
        syncMultiplayerState(action.state);
    }

    function showMultiplayerActionButtons(actions, state, me) {
        actionButtons.innerHTML = '';

        actions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = 'action-btn';

            switch (action) {
                case 'check':
                    btn.innerHTML = `${LABELS[lang].check} <span class="btn-sub">/ check</span>`;
                    btn.classList.add('check');
                    break;
                case 'call': {
                    const owed = Math.min(state.currentBet - ((me && me.currentBet) || 0), (me && me.chips) || 0);
                    btn.innerHTML = `${LABELS[lang].call} <span class="btn-sub">/ call ${owed}</span>`;
                    btn.classList.add('call');
                    break;
                }
                case 'raise':
                    btn.innerHTML = `${LABELS[lang].raise} <span class="btn-sub">/ raise</span>`;
                    btn.classList.add('raise');
                    break;
                case 'fold':
                    btn.innerHTML = `${LABELS[lang].fold} <span class="btn-sub">/ fold</span>`;
                    btn.classList.add('fold');
                    break;
            }
            btn.dataset.action = action;
            btn.addEventListener('click', () => {
                hideActionButtons();
                MP.sendAction({ type: 'player_action', action: action });
            });

            actionButtons.appendChild(btn);
        });
    }

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

        messageArea.innerHTML = '';
        const box = document.createElement('div');
        box.className = `game-over-message ${isPlayerWin ? 'win' : 'lose'}`;
        const h = document.createElement('h2');
        const line = document.createElement('p');
        const btn = document.createElement('button');
        btn.className = 'action-btn';

        if (state.matchOver) {
            // One player holds every chip: the match is over, not just the hand.
            const won = state.matchWinner === myPlayerId;
            box.className = `game-over-message ${won ? 'win' : 'lose'}`;
            h.textContent = won ? LABELS[lang].youWin : `${state.matchWinner} wins the table`;
            line.textContent = won ? 'You took every chip at the table.' : 'You are out of chips.';
            btn.id = 'backToMenuBtn';
            btn.textContent = 'Menu';
            btn.addEventListener('click', () => location.reload());
        } else {
            h.textContent = isPlayerWin ? LABELS[lang].youWin : LABELS[lang].youLose;
            const how = winner && winner.hand && state.showdown ? `, ${winner.hand.description}` : '';
            line.textContent = `${winner ? winner.name : LABELS[lang].player}${how} (${state.pot})`;
            btn.id = 'nextHandBtn';
            btn.textContent = 'Seuraava käsi / next hand';
            btn.addEventListener('click', () => {
                btn.disabled = true;
                MP.sendAction({ type: 'next_hand' });
            });
        }

        box.appendChild(h);
        box.appendChild(line);
        box.appendChild(btn);
        messageArea.appendChild(box);
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
