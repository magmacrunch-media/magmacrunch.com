/**
 * main.js — Entry point, UI bindings, event handlers
 * Supports both AI and multiplayer modes
 */

(function() {

    // ── DOM Elements ─────────────────────────────────────────────────────────
    var startScreen = document.getElementById('startScreen');
    var gameScreen = document.getElementById('gameScreen');
    var startGameBtn = document.getElementById('startGameBtn');
    var onlineBtn = document.getElementById('onlineBtn');
    var helpBtn = document.getElementById('helpBtn');
    var creditsBtn = document.getElementById('creditsBtn');
    var newGameBtn = document.getElementById('newGameBtn');
    var menuBtn = document.getElementById('menuBtn');
    var boardCanvas = document.getElementById('boardCanvas');
    var turnIndicator = document.getElementById('turnIndicator');
    var goalCount = document.getElementById('goalCount');
    var gameMessage = document.getElementById('gameMessage');
    var instructionsModal = document.getElementById('instructionsModal');
    var creditsModal = document.getElementById('creditsModal');
    var gameOverModal = document.getElementById('gameOverModal');
    var gameOverTitle = document.getElementById('gameOverTitle');
    var gameOverMessage = document.getElementById('gameOverMessage');
    var playAgainBtn = document.getElementById('playAgainBtn');

    // Lobby elements
    var lobbyOverlay = document.getElementById('lobbyOverlay');
    var lobbyStatus = document.getElementById('lobbyStatus');
    var lobbyRoomCode = document.getElementById('lobbyRoomCode');
    var roomCodeDisplay = document.getElementById('roomCodeDisplay');
    var roomCodeInput = document.getElementById('roomCodeInput');
    var lobbyJoinBtn = document.getElementById('lobbyJoinBtn');
    var lobbyBackBtn = document.getElementById('lobbyBackBtn');
    var lobbyPlayers = document.getElementById('lobbyPlayers');
    var lobbyPlayerList = document.getElementById('lobbyPlayerList');
    var lobbyStartArea = document.getElementById('lobbyStartArea');
    var lobbyStartBtn = document.getElementById('lobbyStartBtn');

    // ── State ────────────────────────────────────────────────────────────────
    var hoverPos = null;
    var isMultiplayerMode = false;

    // ── Initialize ───────────────────────────────────────────────────────────
    function init() {
        Renderer.init(boardCanvas);
        setupEventListeners();
        setupMultiplayer();
        showStartScreen();
    }

    // ── Event Listeners ──────────────────────────────────────────────────────
    function setupEventListeners() {
        // Start screen buttons
        startGameBtn.addEventListener('click', function() {
            startNewGame(true);
        });

        onlineBtn.addEventListener('click', function() {
            showLobby();
        });

        helpBtn.addEventListener('click', function() {
            showModal(instructionsModal);
        });

        creditsBtn.addEventListener('click', function() {
            showModal(creditsModal);
        });

        // Game controls
        newGameBtn.addEventListener('click', function() {
            if (isMultiplayerMode) {
                Multiplayer.quit();
                showLobby();
            } else {
                startNewGame(Game.isVsAI());
            }
        });

        menuBtn.addEventListener('click', function() {
            if (isMultiplayerMode) {
                Multiplayer.quit();
            }
            showStartScreen();
        });

        playAgainBtn.addEventListener('click', function() {
            hideModal(gameOverModal);
            if (isMultiplayerMode) {
                showLobby();
            } else {
                startNewGame(Game.isVsAI());
            }
        });

        // Modal close buttons
        document.getElementById('closeInstructions').addEventListener('click', function() {
            hideModal(instructionsModal);
        });

        document.getElementById('closeInstructionsBtn').addEventListener('click', function() {
            hideModal(instructionsModal);
        });

        document.getElementById('closeCredits').addEventListener('click', function() {
            hideModal(creditsModal);
        });

        document.getElementById('closeCreditsBtn').addEventListener('click', function() {
            hideModal(creditsModal);
        });

        // Lobby buttons
        lobbyJoinBtn.addEventListener('click', function() {
            var roomCode = roomCodeInput.value.trim() || null;
            Multiplayer.joinRoom('Player', roomCode);
            lobbyJoinBtn.disabled = true;
            lobbyJoinBtn.textContent = 'CONNECTING...';
        });

        lobbyBackBtn.addEventListener('click', function() {
            hideLobby();
            showStartScreen();
        });

        lobbyStartBtn.addEventListener('click', function() {
            Multiplayer.startGame();
        });

        // Board interactions
        boardCanvas.addEventListener('click', handleBoardClick);
        boardCanvas.addEventListener('mousemove', handleBoardMouseMove);
        boardCanvas.addEventListener('mouseleave', function() {
            hoverPos = null;
            renderBoard();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.key === ' ' || e.key === 'Enter') {
                if (startScreen.style.display !== 'none') {
                    e.preventDefault();
                    startNewGame(true);
                }
            }
            if (e.key === 'Escape') {
                hideModal(instructionsModal);
                hideModal(creditsModal);
                hideModal(gameOverModal);
            }
        });

        // Game state callbacks
        Game.setOnStateChange(handleStateChange);
        Game.setOnGameEnd(handleGameEnd);
    }

    // ── Multiplayer Setup ────────────────────────────────────────────────────
    function setupMultiplayer() {
        Multiplayer.setOnStateUpdate(handleMultiplayerUpdate);
        Multiplayer.setOnGameStart(handleMultiplayerGameStart);
        Multiplayer.setOnGameEnd(handleMultiplayerGameEnd);
    }

    // ── Lobby Management ─────────────────────────────────────────────────────
    function showLobby() {
        startScreen.style.display = 'none';
        gameScreen.style.display = 'none';
        lobbyOverlay.style.display = 'flex';

        // Reset lobby state
        lobbyStatus.textContent = 'Connecting...';
        lobbyRoomCode.style.display = 'none';
        lobbyPlayers.style.display = 'none';
        lobbyStartArea.style.display = 'none';
        lobbyJoinBtn.disabled = false;
        lobbyJoinBtn.textContent = 'JOIN / CREATE ROOM';
        roomCodeInput.value = '';

        // Connect to server
        Multiplayer.connect();
    }

    function hideLobby() {
        lobbyOverlay.style.display = 'none';
    }

    // ── Multiplayer Handlers ─────────────────────────────────────────────────
    function handleMultiplayerUpdate(update) {
        switch (update.type) {
            case 'welcome':
                lobbyStatus.textContent = 'Connected! Room: ' + update.room;
                lobbyRoomCode.style.display = 'block';
                roomCodeDisplay.textContent = update.room;
                lobbyJoinBtn.style.display = 'none';
                lobbyBackBtn.style.display = 'none';
                roomCodeInput.style.display = 'none';
                break;

            case 'lobby':
                lobbyPlayers.style.display = 'block';
                lobbyPlayerList.innerHTML = '';
                update.players.forEach(function(player) {
                    var div = document.createElement('div');
                    div.className = 'lobby-player';
                    div.innerHTML = '<span class="player-dot" style="background:' + player.color + '"></span> ' + player.name + (player.isHost ? ' (host)' : '');
                    lobbyPlayerList.appendChild(div);
                });

                if (update.canStart) {
                    lobbyStartArea.style.display = 'block';
                    lobbyStartBtn.textContent = 'START GAME (' + update.players.length + ' PLAYERS)';
                } else {
                    lobbyStartArea.style.display = 'none';
                }

                lobbyStatus.textContent = 'Waiting for players... (' + update.players.length + '/6)';
                break;

            case 'disconnected':
                lobbyStatus.textContent = 'Disconnected. Try again.';
                lobbyJoinBtn.disabled = false;
                lobbyJoinBtn.textContent = 'RECONNECT';
                lobbyJoinBtn.style.display = 'block';
                lobbyBackBtn.style.display = 'block';
                roomCodeInput.style.display = 'block';
                lobbyPlayers.style.display = 'none';
                lobbyStartArea.style.display = 'none';
                break;

            case 'move':
                // Handle opponent's move
                if (update.msg && update.msg.state) {
                    applyMultiplayerState(update.msg.state);
                }
                break;
        }
    }

    function handleMultiplayerGameStart(state, mySide) {
        hideLobby();
        showGameScreen();
        isMultiplayerMode = true;

        // Apply initial state
        applyMultiplayerState(state);

        // Update UI
        updateMultiplayerUI(state, mySide);
    }

    function handleMultiplayerGameEnd(won, winnerName, winnerIdx) {
        isMultiplayerMode = false;

        gameOverTitle.textContent = won ? 'YOU WIN!' : winnerName + ' WINS!';
        gameOverTitle.className = 'game-over-title ' + (won ? 'win' : 'lose');
        gameOverMessage.textContent = won
            ? 'Congratulations! You filled your goal triangle!'
            : 'Better luck next time!';

        showModal(gameOverModal);
    }

    function applyMultiplayerState(state) {
        // Clear board
        Board.init();

        // Apply pieces from server state
        if (state.board) {
            for (var key in state.board) {
                var playerIdx = state.board[key];
                var pos = CC.parseKey(key);
                Board.setPiece(pos[0], pos[1], pos[2], playerIdx);
            }
        }

        // Update turn indicator
        if (state.currentTurnIdx !== undefined) {
            var playerNames = ['CYAN', 'MAGENTA', 'GREEN', 'YELLOW', 'ORANGE', 'PURPLE'];
            turnIndicator.textContent = playerNames[state.currentTurnIdx] + "'S TURN";
            turnIndicator.style.color = CC.COLORS['player' + (state.currentTurnIdx + 1)] || CC.COLORS.player1;
        }

        // Update goal counts
        var mySide = Multiplayer.getMySide();
        if (mySide !== null) {
            goalCount.textContent = Board.countPiecesInGoal(mySide) + ' / 10';
        }

        renderBoard();
    }

    function updateMultiplayerUI(state, mySide) {
        var playerNames = ['CYAN', 'MAGENTA', 'GREEN', 'YELLOW', 'ORANGE', 'PURPLE'];
        gameMessage.textContent = 'You are ' + playerNames[mySide];
        gameMessage.className = 'game-message';
    }

    // ── Board Click Handler ──────────────────────────────────────────────────
    function handleBoardClick(e) {
        var state = Game.getState();

        // In multiplayer mode, check if it's my turn
        if (isMultiplayerMode) {
            if (!Multiplayer.isActive()) return;
            var currentTurn = parseInt(document.getElementById('turnIndicator').textContent.split("'")[0]);
            var mySide = Multiplayer.getMySide();
            if (currentTurn !== mySide) return;
        } else {
            if (state === CC.STATE.AI_TURN) return;
            if (state === CC.STATE.GAME_OVER) return;
        }

        var rect = boardCanvas.getBoundingClientRect();
        var scaleX = boardCanvas.width / rect.width;
        var scaleY = boardCanvas.height / rect.height;
        var px = (e.clientX - rect.left) * scaleX;
        var py = (e.clientY - rect.top) * scaleY;

        var cell = Renderer.getCellAtPixel(px, py);
        if (!cell) return;

        var q = cell[0], r = cell[1], s = cell[2];

        if (isMultiplayerMode) {
            handleMultiplayerClick(q, r, s);
        } else {
            handleAIClick(q, r, s);
        }
    }

    function handleAIClick(q, r, s) {
        var state = Game.getState();

        if (state === CC.STATE.SELECTING) {
            Game.selectPiece(q, r, s);
        } else if (state === CC.STATE.MOVING) {
            var piece = Board.getPiece(q, r, s);
            if (piece === Game.getCurrentPlayer()) {
                Game.deselectPiece();
                Game.selectPiece(q, r, s);
                return;
            }

            var moved = Game.executeMove(q, r, s);
            if (!moved) {
                Game.deselectPiece();
            }
        }

        renderBoard();
    }

    function handleMultiplayerClick(q, r, s) {
        // Simple selection/move for multiplayer
        var selected = Game.getSelectedPiece();
        var piece = Board.getPiece(q, r, s);
        var mySide = Multiplayer.getMySide();

        if (selected === null) {
            // Try to select a piece
            if (piece === mySide) {
                Game.selectPiece(q, r, s);
            }
        } else {
            // Try to move or reselect
            if (piece === mySide) {
                Game.deselectPiece();
                Game.selectPiece(q, r, s);
            } else {
                // Try to execute move
                var legalMoves = Board.getMovesForPiece(selected[0], selected[1], selected[2]);
                var validMove = null;
                for (var i = 0; i < legalMoves.length; i++) {
                    if (legalMoves[i].to[0] === q && legalMoves[i].to[1] === r && legalMoves[i].to[2] === s) {
                        validMove = legalMoves[i];
                        break;
                    }
                }

                if (validMove) {
                    // Execute locally
                    Board.applyMove(validMove);
                    Game.deselectPiece();

                    // Send to server
                    Multiplayer.sendMove(selected, [q, r, s]);

                    // Update UI
                    goalCount.textContent = Board.countPiecesInGoal(mySide) + ' / 10';
                    gameMessage.textContent = 'Waiting for opponent...';
                } else {
                    Game.deselectPiece();
                }
            }
        }

        renderBoard();
    }

    // ── Board Hover Handler ──────────────────────────────────────────────────
    function handleBoardMouseMove(e) {
        var rect = boardCanvas.getBoundingClientRect();
        var scaleX = boardCanvas.width / rect.width;
        var scaleY = boardCanvas.height / rect.height;
        var px = (e.clientX - rect.left) * scaleX;
        var py = (e.clientY - rect.top) * scaleY;

        hoverPos = Renderer.getCellAtPixel(px, py);
        renderBoard();
    }

    // ── Game State Change Handler ────────────────────────────────────────────
    function handleStateChange(info) {
        updateUI(info);

        // If it's AI's turn, execute AI move after a short delay
        if (info.state === CC.STATE.AI_TURN) {
            setTimeout(function() {
                Game.executeAIMove();
                renderBoard();
            }, 500);
        }
    }

    // ── Game End Handler ─────────────────────────────────────────────────────
    function handleGameEnd(winner) {
        var isWin = winner === CC.PLAYER1;

        gameOverTitle.textContent = isWin ? 'YOU WIN!' : 'AI WINS!';
        gameOverTitle.className = 'game-over-title ' + (isWin ? 'win' : 'lose');
        gameOverMessage.textContent = isWin
            ? 'Congratulations! You moved all your marbles to the goal!'
            : 'Better luck next time! The AI reached its goal first.';

        showModal(gameOverModal);
    }

    // ── Update UI ────────────────────────────────────────────────────────────
    function updateUI(info) {
        if (info.state === CC.STATE.AI_TURN) {
            turnIndicator.textContent = 'AI THINKING...';
            turnIndicator.style.color = CC.COLORS.player2;
        } else if (info.state === CC.STATE.SELECTING) {
            turnIndicator.textContent = 'YOUR TURN';
            turnIndicator.style.color = CC.COLORS.player1;
        } else if (info.state === CC.STATE.MOVING) {
            turnIndicator.textContent = 'SELECT DESTINATION';
            turnIndicator.style.color = CC.COLORS.highlight;
        } else if (info.state === CC.STATE.GAME_OVER) {
            turnIndicator.textContent = 'GAME OVER';
            turnIndicator.style.color = CC.COLORS.highlight;
        }

        goalCount.textContent = info.player1GoalCount + ' / 10';

        if (info.state === CC.STATE.SELECTING) {
            gameMessage.textContent = 'Click a piece to move';
            gameMessage.className = 'game-message';
        } else if (info.state === CC.STATE.MOVING) {
            gameMessage.textContent = 'Click a highlighted cell to move there';
            gameMessage.className = 'game-message';
        } else if (info.state === CC.STATE.AI_TURN) {
            gameMessage.textContent = 'AI is thinking...';
            gameMessage.className = 'game-message';
        } else if (info.state === CC.STATE.GAME_OVER) {
            gameMessage.textContent = 'Game over!';
            gameMessage.className = 'game-message';
        }
    }

    // ── Render Board ─────────────────────────────────────────────────────────
    function renderBoard() {
        Renderer.render(
            Game.getSelectedPiece(),
            Game.getLegalMoves(),
            Game.getCurrentPlayer(),
            hoverPos
        );
    }

    // ── Screen Management ────────────────────────────────────────────────────
    function showStartScreen() {
        startScreen.style.display = 'flex';
        gameScreen.style.display = 'none';
        lobbyOverlay.style.display = 'none';
        isMultiplayerMode = false;
    }

    function showGameScreen() {
        startScreen.style.display = 'none';
        gameScreen.style.display = 'flex';
        lobbyOverlay.style.display = 'none';
    }

    // ── Start New Game ───────────────────────────────────────────────────────
    function startNewGame(vsAI) {
        hideModal(gameOverModal);
        showGameScreen();
        isMultiplayerMode = false;
        Game.startGame(vsAI);
        renderBoard();
    }

    // ── Modal Management ─────────────────────────────────────────────────────
    function showModal(modal) {
        modal.classList.add('active');
    }

    function hideModal(modal) {
        modal.classList.remove('active');
    }

    // ── Start ────────────────────────────────────────────────────────────────
    init();

})();
