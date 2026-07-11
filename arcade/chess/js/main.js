/**
 * main.js — DOM rendering, pixel art, notation, UI
 * Includes multiplayer lobby, board flipping, chat panel.
 */

var UI = (function() {

    // ── DOM References ───────────────────────────────────────────────────────
    var elements = {};
    var lastMoveFrom = null;
    var lastMoveTo = null;
    var boardFlipped = false; // true when viewing from black's perspective

    // ── Initialize ───────────────────────────────────────────────────────────
    function init() {
        cacheElements();
        setupEventListeners();
        Game.setOnStateChange(onStateChange);
        Game.setOnGameEnd(onGameEnd);
        Multiplayer.setOnStateUpdate(onMultiplayerStateUpdate);
        Multiplayer.setOnGameStart(onMultiplayerGameStart);
        Multiplayer.setOnGameEnd(onMultiplayerGameEnd);
    }

    function cacheElements() {
        elements.startScreen = document.getElementById('startScreen');
        elements.gameScreen = document.getElementById('gameScreen');
        elements.startGameBtn = document.getElementById('startGameBtn');
        elements.multiplayerBtn = document.getElementById('multiplayerBtn');
        elements.boardContainer = document.getElementById('boardContainer');
        elements.moveHistoryList = document.getElementById('moveHistoryList');
        elements.message = document.getElementById('gameMessage');
        elements.turnIndicator = document.getElementById('turnIndicator');
        elements.playerTime = document.getElementById('playerTime');
        elements.aiTime = document.getElementById('aiTime');
        elements.timerContainer = document.getElementById('timerContainer');
        elements.settingsModal = document.getElementById('settingsModal');
        elements.instructionsModal = document.getElementById('instructionsModal');
        elements.promotionModal = document.getElementById('promotionModal');
        elements.creditsModal = document.getElementById('creditsModal');
        elements.gameOverModal = document.getElementById('gameOverModal');
        elements.gameOverTitle = document.getElementById('gameOverTitle');
        elements.gameOverMessage = document.getElementById('gameOverMessage');
        elements.playAgainBtn = document.getElementById('playAgainBtn');
        elements.newGameBtn = document.getElementById('newGameBtn');
        elements.menuBtn = document.getElementById('menuBtn');
        elements.helpBtn = document.getElementById('helpBtn');
        elements.settingsBtn = document.getElementById('settingsBtn');
        elements.creditsBtn = document.getElementById('creditsBtn');
        elements.startSettingsBtn = document.getElementById('startSettingsBtn');

        // Lobby elements
        elements.lobbyOverlay = document.getElementById('lobbyOverlay');
        elements.closeLobby = document.getElementById('closeLobby');
        elements.lobbyStatus = document.getElementById('lobbyStatus');
        elements.roomCodeDisplay = document.getElementById('roomCodeDisplay');
        elements.roomCodeValue = document.getElementById('roomCodeValue');
        elements.lobbyPlayerList = document.getElementById('lobbyPlayerList');
        elements.lobbyTimeControl = document.getElementById('lobbyTimeControl');
        elements.startMultiplayerBtn = document.getElementById('startMultiplayerBtn');
        elements.spectateBtn = document.getElementById('spectateBtn');
        elements.leaveLobbyBtn = document.getElementById('leaveLobbyBtn');

        // Chat elements
        elements.chatPanel = document.getElementById('chatPanel');
        elements.chatMessages = document.getElementById('chatMessages');
        elements.chatInput = document.getElementById('chatInput');
        elements.chatSendBtn = document.getElementById('chatSendBtn');
    }

    function setupEventListeners() {
        elements.startGameBtn.addEventListener('click', startGameWithSettings);
        elements.startSettingsBtn.addEventListener('click', showSettings);
        elements.newGameBtn.addEventListener('click', showSettings);
        elements.menuBtn.addEventListener('click', showMenu);
        elements.helpBtn.addEventListener('click', showInstructions);
        elements.settingsBtn.addEventListener('click', showSettings);
        elements.creditsBtn.addEventListener('click', showCredits);
        elements.playAgainBtn.addEventListener('click', showSettings);
        elements.closeSettings = document.getElementById('closeSettings');
        elements.closeSettingsBtn = document.getElementById('closeSettingsBtn');
        elements.closeInstructions = document.getElementById('closeInstructions');
        elements.closeInstructionsBtn = document.getElementById('closeInstructionsBtn');
        elements.closeCredits = document.getElementById('closeCredits');
        elements.closeCreditsBtn = document.getElementById('closeCreditsBtn');
        elements.settingsForm = document.getElementById('settingsForm');

        if (elements.closeSettings) elements.closeSettings.addEventListener('click', hideSettings);
        if (elements.closeSettingsBtn) elements.closeSettingsBtn.addEventListener('click', function() {
            if (elements.settingsForm) elements.settingsForm.requestSubmit();
        });
        if (elements.closeInstructions) elements.closeInstructions.addEventListener('click', hideInstructions);
        if (elements.closeInstructionsBtn) elements.closeInstructionsBtn.addEventListener('click', hideInstructions);
        if (elements.closeCredits) elements.closeCredits.addEventListener('click', hideCredits);
        if (elements.closeCreditsBtn) elements.closeCreditsBtn.addEventListener('click', hideCredits);

        if (elements.settingsForm) {
            elements.settingsForm.addEventListener('submit', function(e) {
                e.preventDefault();
                applySettingsAndStart();
            });
        }

        // Multiplayer buttons
        if (elements.multiplayerBtn) elements.multiplayerBtn.addEventListener('click', openLobby);
        if (elements.closeLobby) elements.closeLobby.addEventListener('click', closeLobby);
        if (elements.startMultiplayerBtn) elements.startMultiplayerBtn.addEventListener('click', startMultiplayerGame);
        if (elements.spectateBtn) elements.spectateBtn.addEventListener('click', spectateGame);
        if (elements.leaveLobbyBtn) elements.leaveLobbyBtn.addEventListener('click', leaveLobby);

        // Chat
        if (elements.chatSendBtn) elements.chatSendBtn.addEventListener('click', sendChat);
        if (elements.chatInput) elements.chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') sendChat();
        });

        document.addEventListener('keydown', function(e) {
            if (e.code === 'Space') {
                e.preventDefault();
                if (elements.startScreen.style.display !== 'none') {
                    showSettings();
                }
            }
        });
    }

    // ── Game Flow ────────────────────────────────────────────────────────────
    function showSettings() {
        var settings = Game.getSettings();
        var difficultyInput = document.querySelector('input[name="difficulty"][value="' + settings.difficulty + '"]');
        var timeInput = document.querySelector('input[name="timeControl"][value="' + settings.timeControl + '"]');
        if (difficultyInput) difficultyInput.checked = true;
        if (timeInput) timeInput.checked = true;
        elements.settingsModal.classList.add('active');
    }

    function hideSettings() {
        elements.settingsModal.classList.remove('active');
    }

    function startGameWithSettings() {
        if (!Game.hasPlayedBefore()) {
            showSettings();
        } else {
            startGame();
        }
    }

    function applySettingsAndStart() {
        var difficulty = document.querySelector('input[name="difficulty"]:checked');
        var timeControl = document.querySelector('input[name="timeControl"]:checked');

        var settings = {
            difficulty: difficulty ? difficulty.value : 'medium',
            timeControl: timeControl ? timeControl.value : 'none'
        };

        Game.saveSettings(settings);
        hideSettings();
        startGame();
    }

    function startGame() {
        elements.startScreen.style.display = 'none';
        elements.gameScreen.style.display = 'flex';
        elements.chatPanel.style.display = 'none';
        hideGameOver();
        Game.startGame(false);
        lastMoveFrom = null;
        lastMoveTo = null;
        boardFlipped = false;
        renderBoard();
        updateUI();
    }

    function showMenu() {
        Multiplayer.quit();
        elements.startScreen.style.display = 'flex';
        elements.gameScreen.style.display = 'none';
        elements.chatPanel.style.display = 'none';
    }

    // ── Lobby ────────────────────────────────────────────────────────────────
    function openLobby() {
        elements.lobbyOverlay.classList.add('active');
        elements.lobbyStatus.textContent = 'Connecting...';
        elements.roomCodeDisplay.style.display = 'none';
        elements.lobbyPlayerList.innerHTML = '';
        elements.lobbyTimeControl.style.display = 'none';
        elements.startMultiplayerBtn.style.display = 'none';
        Multiplayer.connect();
    }

    function closeLobby() {
        elements.lobbyOverlay.classList.remove('active');
        Multiplayer.quit();
    }

    function leaveLobby() {
        Multiplayer.quit();
        elements.roomCodeDisplay.style.display = 'none';
        elements.lobbyPlayerList.innerHTML = '';
        elements.lobbyTimeControl.style.display = 'none';
        elements.startMultiplayerBtn.style.display = 'none';
        elements.lobbyStatus.textContent = 'Left lobby. Click a room to rejoin.';
    }

    function startMultiplayerGame() {
        var tc = document.querySelector('input[name="mpTimeControl"]:checked');
        var timeControl = tc ? tc.value : 'none';
        Multiplayer.startGame(timeControl);
    }

    function spectateGame() {
        var name = localStorage.getItem('arcade_username') || 'Spectator';
        Multiplayer.spectate(name);
    }

    function sendChat() {
        if (!elements.chatInput) return;
        var text = elements.chatInput.value.trim();
        if (!text) return;
        MP.sendChat(text);
        // Show own message locally
        addChatMessage(localStorage.getItem('arcade_username') || 'You', text, '#39ff6e');
        elements.chatInput.value = '';
    }

    function addChatMessage(from, text, color) {
        if (!elements.chatMessages) return;
        var div = document.createElement('div');
        div.className = 'chat-msg';
        div.innerHTML = '<span class="chat-name" style="color:' + (color || '#ff2e9c') + '">' +
            escapeHtml(from) + ':</span> ' + escapeHtml(text);
        elements.chatMessages.appendChild(div);
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ── Multiplayer State Handlers ───────────────────────────────────────────
    function onMultiplayerStateUpdate(update) {
        switch (update.type) {
            case 'welcome':
                elements.lobbyStatus.textContent = 'You joined room ' + update.room;
                elements.roomCodeDisplay.style.display = 'flex';
                elements.roomCodeValue.textContent = update.room;
                if (update.isHost) {
                    elements.lobbyTimeControl.style.display = 'block';
                    elements.startMultiplayerBtn.style.display = 'block';
                } else {
                    elements.lobbyTimeControl.style.display = 'none';
                    elements.startMultiplayerBtn.style.display = 'none';
                }
                break;

            case 'spectator_welcome':
                elements.lobbyStatus.textContent = 'Spectating room ' + update.room;
                elements.roomCodeDisplay.style.display = 'flex';
                elements.roomCodeValue.textContent = update.room;
                elements.lobbyTimeControl.style.display = 'none';
                elements.startMultiplayerBtn.style.display = 'none';
                break;

            case 'snapshot':
                // Could show room list, for now just show status
                if (update.rooms && update.rooms.length > 0) {
                    var waiting = update.rooms.filter(function(r) { return !r.started && r.players < r.maxPlayers; });
                    if (waiting.length > 0) {
                        elements.lobbyStatus.textContent = 'Found ' + waiting.length + ' open room(s). Create or join one.';
                    } else {
                        elements.lobbyStatus.textContent = 'No open rooms. Create one!';
                    }
                } else {
                    elements.lobbyStatus.textContent = 'No rooms yet. Create one!';
                }
                break;

            case 'lobby':
                renderLobbyPlayers(update.players);
                if (MP.amIHost() && !MP.isSpectator()) {
                    elements.startMultiplayerBtn.style.display = update.canStart ? 'block' : 'none';
                }
                break;

            case 'rejected':
                elements.lobbyStatus.textContent = 'Rejected: ' + update.reason;
                break;

            case 'disconnected':
                elements.lobbyStatus.textContent = 'Disconnected from server.';
                elements.roomCodeDisplay.style.display = 'none';
                elements.lobbyPlayerList.innerHTML = '';
                elements.lobbyTimeControl.style.display = 'none';
                elements.startMultiplayerBtn.style.display = 'none';
                break;

            case 'move':
                applyServerState(update.msg.state);
                break;

            case 'state':
                applyServerState(update.state);
                break;

            case 'promotion_pending':
                // Handled in main flow
                break;
        }
    }

    function renderLobbyPlayers(players) {
        if (!elements.lobbyPlayerList) return;
        elements.lobbyPlayerList.innerHTML = '';
        if (!players) return;
        for (var i = 0; i < players.length; i++) {
            var p = players[i];
            var div = document.createElement('div');
            div.className = 'lobby-player';
            var hostBadge = p.isHost ? ' <span class="host-badge">HOST</span>' : '';
            div.innerHTML = '<span class="player-dot" style="background:' + escapeHtml(p.color) + '"></span>' +
                '<span class="player-name">' + escapeHtml(p.name) + '</span>' + hostBadge;
            elements.lobbyPlayerList.appendChild(div);
        }
    }

    function onMultiplayerGameStart(state, mySide) {
        elements.lobbyOverlay.classList.remove('active');
        elements.startScreen.style.display = 'none';
        elements.gameScreen.style.display = 'flex';
        elements.chatPanel.style.display = 'flex';
        hideGameOver();

        // Board flipping: flip if black
        boardFlipped = (mySide === 'black');

        // Start the game in multiplayer mode
        Game.startGame(true, mySide);
        lastMoveFrom = null;
        lastMoveTo = null;

        // Apply initial state
        applyServerState(state);
    }

    function onMultiplayerGameEnd(won, winnerName, winnerSide, result) {
        var title, message;

        if (result === 'opponent_quit') {
            title = 'OPPONENT LEFT';
            message = winnerName + ' disconnected. You win!';
            elements.gameOverTitle.className = 'game-over-title win';
        } else if (result === 'resignation') {
            if (won) {
                title = 'YOU WIN!';
                message = winnerName + ' resigned.';
                elements.gameOverTitle.className = 'game-over-title win';
            } else {
                title = 'YOU LOSE';
                message = 'You resigned.';
                elements.gameOverTitle.className = 'game-over-title lose';
            }
        } else if (result && result.indexOf('checkmate') >= 0) {
            if (won) {
                title = 'YOU WIN!';
                message = 'Checkmate! You captured the king.';
                elements.gameOverTitle.className = 'game-over-title win';
            } else {
                title = 'YOU LOSE';
                message = 'Checkmate! Your king was captured.';
                elements.gameOverTitle.className = 'game-over-title lose';
            }
        } else if (result === 'stalemate') {
            title = 'DRAW';
            message = 'Stalemate! No legal moves available.';
            elements.gameOverTitle.className = 'game-over-title draw';
        } else {
            title = 'GAME OVER';
            message = winnerName ? winnerName + ' wins.' : 'Game ended.';
            elements.gameOverTitle.className = 'game-over-title draw';
        }

        elements.gameOverTitle.textContent = title;
        elements.gameOverMessage.textContent = message;
        elements.gameOverModal.classList.add('active');

        Multiplayer.quit();
    }

    function applyServerState(state) {
        if (!state) return;
        Game.applyServerState(state, Multiplayer.getMySide());

        // Update last move from state
        if (state.moveCount > 0) {
            // Server doesn't send last move coordinates, but we track via state
        }

        renderBoard();
        updateMultiplayerUI();
    }

    function updateMultiplayerUI() {
        var state = Game.getState();
        var mySide = Multiplayer.getMySide();

        if (state === CH.STATE.OPPONENT_TURN) {
            elements.turnIndicator.textContent = 'OPPONENT\'S TURN';
            elements.turnIndicator.style.color = '#ff2d78';
            setMessage('Waiting for opponent...');
        } else if (state === CH.STATE.SELECTING) {
            elements.turnIndicator.textContent = 'YOUR TURN';
            elements.turnIndicator.style.color = '#00f5ff';
            setMessage('Select a piece to move');
        } else if (state === CH.STATE.MOVING) {
            elements.turnIndicator.textContent = 'YOUR TURN';
            elements.turnIndicator.style.color = '#00f5ff';
            setMessage('Select destination');
        } else if (state === CH.STATE.PROMOTING) {
            showPromotionModal();
        }

        updateMoveHistory();
    }

    // ── State Change Handler ─────────────────────────────────────────────────
    function onStateChange(data) {
        if (Game.getIsMultiplayer()) {
            updateMultiplayerUI();
            return;
        }

        // Single-player mode
        var lastMove = Board.getLastMove();
        if (lastMove) {
            lastMoveFrom = lastMove.from;
            lastMoveTo = lastMove.to;
        }

        renderBoard();
        updateUI();
        updateTimerDisplay(data);

        if (data.state === CH.STATE.AI_TURN) {
            setTimeout(executeAIMove, 300);
        }
    }

    function onGameEnd(result) {
        showGameOver(result);
    }

    // ── Board Rendering ──────────────────────────────────────────────────────
    function renderBoard() {
        var board = Board.getState();
        var container = elements.boardContainer;
        container.innerHTML = '';

        var boardEl = document.createElement('div');
        boardEl.className = 'board';

        var files = 'abcdefgh';
        var startRow = boardFlipped ? 7 : 0;
        var endRow = boardFlipped ? -1 : 8;
        var rowStep = boardFlipped ? -1 : 1;
        var startCol = boardFlipped ? 7 : 0;
        var endCol = boardFlipped ? -1 : 8;
        var colStep = boardFlipped ? -1 : 1;

        var displayRow = 0;
        for (var r = startRow; r !== endRow; r += rowStep) {
            var displayCol = 0;
            for (var c = startCol; c !== endCol; c += colStep) {
                var square = createSquare(r, c, displayRow, displayCol, board[r][c], files[c]);
                boardEl.appendChild(square);
                displayCol++;
            }
            displayRow++;
        }

        container.appendChild(boardEl);
    }

    function createSquare(row, col, displayRow, displayCol, piece, file) {
        var square = document.createElement('div');
        var isDark = (displayRow + displayCol) % 2 === 1;
        square.className = 'square ' + (isDark ? 'dark' : 'light');
        square.dataset.row = row;
        square.dataset.col = col;

        // Highlight last move
        if (lastMoveFrom && lastMoveFrom.row === row && lastMoveFrom.col === col) {
            square.classList.add('last-move');
        }
        if (lastMoveTo && lastMoveTo.row === row && lastMoveTo.col === col) {
            square.classList.add('last-move');
        }

        // Highlight check on king
        var currentSide = Game.getMySide();
        var checkOwner = currentSide || CH.PLAYER;
        if (piece && piece.type === CH.KING && piece.owner === checkOwner) {
            if (Board.isInCheck(piece.owner)) {
                square.classList.add('in-check');
            }
        }

        // Highlight selected piece
        var selectedPiece = Game.getSelectedPiece();
        if (selectedPiece && selectedPiece.row === row && selectedPiece.col === col) {
            square.classList.add('selected');
        }

        // Highlight legal moves
        if (selectedPiece && Game.getState() === CH.STATE.MOVING) {
            var legalMoves = Game.getLegalMovesList();
            for (var i = 0; i < legalMoves.length; i++) {
                if (legalMoves[i].to.row === row && legalMoves[i].to.col === col) {
                    var isCapture = Board.getPiece(row, col) !== null;
                    square.classList.add(isCapture ? 'highlighted-capture' : 'highlighted');
                    break;
                }
            }
        }

        // Add square labels (file and rank) - use display position
        if (displayRow === 7) {
            var fileLabel = document.createElement('div');
            fileLabel.className = 'square-label file';
            fileLabel.textContent = boardFlipped ? files[7 - displayCol] : files[displayCol];
            square.appendChild(fileLabel);
        }
        if (displayCol === 0) {
            var rankLabel = document.createElement('div');
            rankLabel.className = 'square-label rank';
            rankLabel.textContent = boardFlipped ? (displayRow + 1) : (8 - displayRow);
            square.appendChild(rankLabel);
        }

        // Create piece if exists
        if (piece) {
            var pieceEl = document.createElement('div');
            pieceEl.className = 'piece';

            if (selectedPiece && selectedPiece.row === row && selectedPiece.col === col) {
                pieceEl.classList.add('selected');
            }

            var canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            drawPiece(canvas, piece.type, piece.owner);
            pieceEl.appendChild(canvas);

            pieceEl.dataset.row = row;
            pieceEl.dataset.col = col;
            pieceEl.addEventListener('click', handlePieceClick);
            square.appendChild(pieceEl);
        }

        square.addEventListener('click', handleSquareClick);
        return square;
    }

    // ── Pixel Art Drawing ────────────────────────────────────────────────────
    function drawPiece(canvas, pieceType, owner) {
        var ctx = canvas.getContext('2d');
        var color;
        if (Game.getIsMultiplayer()) {
            var mySide = Game.getMySide();
            color = (owner === mySide) ? '#00f5ff' : '#ff2d78';
        } else {
            color = owner === CH.PLAYER ? CH.COLORS.player : CH.COLORS.ai;
        }

        ctx.clearRect(0, 0, 32, 32);

        switch(pieceType) {
            case 'king': drawKing(ctx, color); break;
            case 'queen': drawQueen(ctx, color); break;
            case 'rook': drawRook(ctx, color); break;
            case 'bishop': drawBishop(ctx, color); break;
            case 'knight': drawKnight(ctx, color); break;
            case 'pawn': drawPawn(ctx, color); break;
        }
    }

    function drawKing(ctx, color) {
        var dark = shadeColor(color, -40);
        var light = shadeColor(color, 40);

        ctx.fillStyle = dark;
        ctx.fillRect(7, 28, 18, 3);
        ctx.fillStyle = color;
        ctx.fillRect(8, 27, 16, 3);

        ctx.fillStyle = color;
        ctx.fillRect(11, 17, 10, 10);
        ctx.fillStyle = dark;
        ctx.fillRect(11, 17, 2, 10);
        ctx.fillRect(19, 17, 2, 10);
        ctx.fillStyle = light;
        ctx.fillRect(14, 17, 3, 10);

        ctx.fillStyle = dark;
        ctx.fillRect(10, 16, 12, 2);

        ctx.fillStyle = color;
        ctx.fillRect(9, 12, 14, 4);
        ctx.fillStyle = dark;
        ctx.fillRect(9, 12, 14, 1);

        ctx.fillStyle = color;
        ctx.fillRect(9, 8, 2, 4);
        ctx.fillRect(13, 6, 2, 6);
        ctx.fillRect(17, 6, 2, 6);
        ctx.fillRect(21, 8, 2, 4);

        ctx.fillStyle = light;
        ctx.fillRect(9, 7, 2, 2);
        ctx.fillRect(13, 5, 2, 2);
        ctx.fillRect(17, 5, 2, 2);
        ctx.fillRect(21, 7, 2, 2);

        ctx.fillStyle = color;
        ctx.fillRect(15, 1, 2, 6);
        ctx.fillRect(13, 3, 6, 2);
        ctx.fillStyle = light;
        ctx.fillRect(15, 1, 2, 1);
        ctx.fillRect(13, 3, 1, 2);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(16, 13, 1, 1);
    }

    function drawQueen(ctx, color) {
        var dark = shadeColor(color, -40);
        var light = shadeColor(color, 40);

        ctx.fillStyle = dark;
        ctx.fillRect(7, 28, 18, 3);
        ctx.fillStyle = color;
        ctx.fillRect(8, 27, 16, 3);

        ctx.fillStyle = color;
        ctx.fillRect(11, 18, 10, 9);
        ctx.fillStyle = dark;
        ctx.fillRect(11, 18, 2, 9);
        ctx.fillRect(19, 18, 2, 9);
        ctx.fillStyle = light;
        ctx.fillRect(14, 18, 3, 9);

        ctx.fillStyle = dark;
        ctx.fillRect(10, 17, 12, 2);

        ctx.fillStyle = color;
        ctx.fillRect(9, 13, 14, 4);
        ctx.fillStyle = dark;
        ctx.fillRect(9, 13, 14, 1);

        ctx.fillStyle = color;
        ctx.fillRect(8, 8, 2, 5);
        ctx.fillRect(11, 5, 2, 8);
        ctx.fillRect(14, 3, 2, 10);
        ctx.fillRect(17, 5, 2, 8);
        ctx.fillRect(20, 8, 2, 5);

        ctx.fillStyle = light;
        ctx.fillRect(8, 7, 2, 2);
        ctx.fillRect(11, 4, 2, 2);
        ctx.fillRect(14, 2, 2, 2);
        ctx.fillRect(17, 4, 2, 2);
        ctx.fillRect(20, 7, 2, 2);

        ctx.fillStyle = color;
        ctx.fillRect(15, 0, 2, 4);
        ctx.fillRect(14, 2, 4, 2);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(12, 14, 1, 1);
        ctx.fillRect(16, 14, 1, 1);
        ctx.fillRect(20, 14, 1, 1);
    }

    function drawRook(ctx, color) {
        var dark = shadeColor(color, -40);
        var light = shadeColor(color, 40);

        ctx.fillStyle = dark;
        ctx.fillRect(6, 28, 20, 3);
        ctx.fillStyle = color;
        ctx.fillRect(7, 27, 18, 3);

        ctx.fillStyle = color;
        ctx.fillRect(9, 13, 14, 14);
        ctx.fillStyle = dark;
        ctx.fillRect(9, 13, 2, 14);
        ctx.fillRect(21, 13, 2, 14);
        ctx.fillStyle = light;
        ctx.fillRect(13, 13, 3, 14);

        ctx.fillStyle = dark;
        ctx.fillRect(14, 16, 4, 1);
        ctx.fillRect(14, 20, 4, 1);

        ctx.fillStyle = dark;
        ctx.fillRect(7, 12, 18, 2);

        ctx.fillStyle = color;
        ctx.fillRect(6, 6, 20, 6);
        ctx.fillStyle = dark;
        ctx.fillRect(6, 6, 20, 1);

        ctx.fillStyle = '#0d0820';
        ctx.fillRect(8, 8, 3, 4);
        ctx.fillRect(14, 8, 4, 4);
        ctx.fillRect(21, 8, 3, 4);

        ctx.fillStyle = light;
        ctx.fillRect(6, 6, 20, 1);
    }

    function drawBishop(ctx, color) {
        var dark = shadeColor(color, -40);
        var light = shadeColor(color, 40);

        ctx.fillStyle = dark;
        ctx.fillRect(7, 28, 18, 3);
        ctx.fillStyle = color;
        ctx.fillRect(8, 27, 16, 3);

        ctx.fillStyle = color;
        ctx.fillRect(11, 18, 10, 9);
        ctx.fillStyle = dark;
        ctx.fillRect(11, 18, 2, 9);
        ctx.fillRect(19, 18, 2, 9);
        ctx.fillStyle = light;
        ctx.fillRect(14, 18, 3, 9);

        ctx.fillStyle = dark;
        ctx.fillRect(10, 17, 12, 2);

        ctx.fillStyle = color;
        ctx.fillRect(11, 10, 10, 7);
        ctx.fillStyle = dark;
        ctx.fillRect(11, 10, 2, 7);
        ctx.fillRect(19, 10, 2, 7);
        ctx.fillStyle = light;
        ctx.fillRect(14, 10, 3, 7);

        ctx.fillStyle = color;
        ctx.fillRect(12, 6, 8, 4);
        ctx.fillRect(13, 4, 6, 2);
        ctx.fillRect(14, 2, 4, 2);
        ctx.fillRect(15, 0, 2, 2);

        ctx.fillStyle = dark;
        ctx.fillRect(15, 6, 2, 8);
        ctx.fillStyle = light;
        ctx.fillRect(15, 6, 1, 8);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(16, 1, 1, 1);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(12, 17, 1, 1);
        ctx.fillRect(19, 17, 1, 1);
    }

    function drawKnight(ctx, color) {
        var dark = shadeColor(color, -40);
        var light = shadeColor(color, 40);

        ctx.fillStyle = dark;
        ctx.fillRect(7, 28, 18, 3);
        ctx.fillStyle = color;
        ctx.fillRect(8, 27, 16, 3);

        ctx.fillStyle = color;
        ctx.fillRect(10, 18, 12, 9);
        ctx.fillStyle = dark;
        ctx.fillRect(10, 18, 2, 9);
        ctx.fillStyle = light;
        ctx.fillRect(14, 18, 3, 9);

        ctx.fillStyle = color;
        ctx.fillRect(9, 15, 10, 3);

        ctx.fillStyle = color;
        ctx.fillRect(7, 7, 16, 8);
        ctx.fillStyle = dark;
        ctx.fillRect(7, 7, 16, 1);
        ctx.fillRect(7, 7, 1, 8);
        ctx.fillStyle = light;
        ctx.fillRect(10, 9, 4, 4);

        ctx.fillStyle = color;
        ctx.fillRect(7, 3, 3, 5);
        ctx.fillRect(11, 2, 2, 6);
        ctx.fillStyle = dark;
        ctx.fillRect(7, 3, 1, 5);
        ctx.fillRect(11, 2, 1, 6);

        ctx.fillStyle = dark;
        ctx.fillRect(20, 8, 3, 6);
        ctx.fillRect(21, 6, 2, 2);

        ctx.fillStyle = color;
        ctx.fillRect(20, 10, 5, 4);
        ctx.fillStyle = dark;
        ctx.fillRect(20, 10, 5, 1);
        ctx.fillStyle = light;
        ctx.fillRect(21, 12, 3, 2);

        ctx.fillStyle = dark;
        ctx.fillRect(23, 11, 1, 1);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(14, 9, 2, 2);
        ctx.fillStyle = '#000000';
        ctx.fillRect(15, 9, 1, 1);
    }

    function drawPawn(ctx, color) {
        var dark = shadeColor(color, -40);
        var light = shadeColor(color, 40);

        ctx.fillStyle = dark;
        ctx.fillRect(8, 28, 16, 3);
        ctx.fillStyle = color;
        ctx.fillRect(9, 27, 14, 3);

        ctx.fillStyle = color;
        ctx.fillRect(10, 22, 12, 5);
        ctx.fillStyle = dark;
        ctx.fillRect(10, 22, 2, 5);
        ctx.fillRect(20, 22, 2, 5);

        ctx.fillStyle = dark;
        ctx.fillRect(11, 20, 10, 2);

        ctx.fillStyle = color;
        ctx.fillRect(12, 14, 8, 6);
        ctx.fillStyle = dark;
        ctx.fillRect(12, 14, 1, 6);
        ctx.fillRect(19, 14, 1, 6);
        ctx.fillStyle = light;
        ctx.fillRect(15, 14, 2, 6);

        ctx.fillStyle = color;
        ctx.fillRect(13, 12, 6, 2);

        ctx.fillStyle = color;
        ctx.fillRect(11, 6, 10, 6);
        ctx.fillStyle = dark;
        ctx.fillRect(11, 6, 10, 1);
        ctx.fillRect(11, 6, 1, 6);
        ctx.fillStyle = light;
        ctx.fillRect(14, 7, 3, 4);

        ctx.fillStyle = color;
        ctx.fillRect(12, 4, 8, 2);
        ctx.fillRect(13, 3, 6, 1);
        ctx.fillRect(14, 2, 4, 1);

        ctx.fillStyle = light;
        ctx.fillRect(13, 4, 2, 1);
    }

    function shadeColor(hex, amount) {
        var num = parseInt(hex.replace('#', ''), 16);
        var r = Math.min(255, Math.max(0, (num >> 16) + amount));
        var g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
        var b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
        return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
    }

    // ── Event Handlers ───────────────────────────────────────────────────────
    function handlePieceClick(e) {
        e.stopPropagation();
        var row = parseInt(e.currentTarget.dataset.row);
        var col = parseInt(e.currentTarget.dataset.col);

        if (Game.getState() === CH.STATE.SELECTING) {
            Game.selectPiece(row, col);
        } else if (Game.getState() === CH.STATE.MOVING) {
            var selectedPiece = Game.getSelectedPiece();
            if (selectedPiece && selectedPiece.row === row && selectedPiece.col === col) {
                Game.deselectPiece();
            } else {
                var moved = Game.executeMove(row, col);
                if (!moved) {
                    Game.selectPiece(row, col);
                } else if (Game.getIsMultiplayer()) {
                    // Send move to server
                    var sel = Game.getSelectedPiece();
                    // The move was already applied locally, send it
                    Multiplayer.sendMove(
                        { row: selectedPiece.row, col: selectedPiece.col },
                        { row: row, col: col }
                    );
                }
            }
        }
    }

    function handleSquareClick(e) {
        var row = parseInt(e.currentTarget.dataset.row);
        var col = parseInt(e.currentTarget.dataset.col);

        if (Game.getState() === CH.STATE.MOVING) {
            var selectedPiece = Game.getSelectedPiece();
            Game.executeMove(row, col);
            if (Game.getIsMultiplayer() && selectedPiece) {
                Multiplayer.sendMove(
                    { row: selectedPiece.row, col: selectedPiece.col },
                    { row: row, col: col }
                );
            }
        } else if (Game.getState() === CH.STATE.SELECTING) {
            var piece = Board.getPiece(row, col);
            var myOwner = Game.getIsMultiplayer() ? Game.getMySide() : CH.PLAYER;
            if (piece && piece.owner === myOwner) {
                Game.selectPiece(row, col);
            }
        }
    }

    // ── AI Move ──────────────────────────────────────────────────────────────
    function executeAIMove() {
        Game.executeAIMove();
    }

    // ── UI Updates ───────────────────────────────────────────────────────────
    function updateUI() {
        var state = Game.getState();
        var currentPlayer = Game.getCurrentPlayer();

        if (currentPlayer === CH.PLAYER) {
            elements.turnIndicator.textContent = 'YOUR TURN';
            elements.turnIndicator.style.color = CH.COLORS.player;
        } else {
            elements.turnIndicator.textContent = 'AI THINKING...';
            elements.turnIndicator.style.color = CH.COLORS.ai;
        }

        if (state === CH.STATE.SELECTING) {
            setMessage('Select a piece to move');
        } else if (state === CH.STATE.MOVING) {
            setMessage('Select destination');
        } else if (state === CH.STATE.AI_TURN) {
            setMessage('AI is thinking...');
        } else if (state === CH.STATE.PROMOTING) {
            showPromotionModal();
        }

        if (Board.isInCheck(CH.PLAYER)) {
            setMessage('CHECK! Your king is in danger!', 'check');
        }

        updateMoveHistory();
    }

    function updateTimerDisplay(data) {
        var tc = CH.TIME_CONTROLS[data.settings.timeControl];
        if (tc && tc.seconds > 0) {
            elements.timerContainer.style.display = 'flex';
            elements.playerTime.textContent = Game.getFormattedTime('player');
            elements.aiTime.textContent = Game.getFormattedTime('ai');

            elements.playerTime.classList.toggle('active', data.currentPlayer === CH.PLAYER);
            elements.aiTime.classList.toggle('active', data.currentPlayer === CH.AI);
        } else {
            elements.timerContainer.style.display = 'none';
        }
    }

    function updateMoveHistory() {
        var notations = Game.getMoveNotations();
        var html = '';

        for (var i = 0; i < notations.length; i += 2) {
            var moveNum = Math.floor(i / 2) + 1;
            var whiteMove = notations[i];
            var blackMove = notations[i + 1];

            html += '<div class="move-pair">';
            html += '<span class="move-number">' + moveNum + '.</span>';
            html += '<span class="move-white">' + whiteMove + '</span>';
            if (blackMove) {
                html += '<span class="move-black">' + blackMove + '</span>';
            }
            html += '</div>';
        }

        elements.moveHistoryList.innerHTML = html;
        elements.moveHistoryList.scrollTop = elements.moveHistoryList.scrollHeight;
    }

    function setMessage(text, type) {
        elements.message.textContent = text;
        elements.message.className = 'game-message' + (type ? ' ' + type : '');
    }

    // ── Promotion Modal ──────────────────────────────────────────────────────
    function showPromotionModal() {
        var pieces = ['queen', 'rook', 'bishop', 'knight'];
        var container = document.getElementById('promotionPieces');
        container.innerHTML = '';

        var pieceColor = Game.getIsMultiplayer() ? '#00f5ff' : CH.PLAYER;

        for (var i = 0; i < pieces.length; i++) {
            var pieceBtn = document.createElement('div');
            pieceBtn.className = 'promotion-piece';
            pieceBtn.dataset.piece = pieces[i];

            var canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            drawPiece(canvas, pieces[i], pieceColor);
            pieceBtn.appendChild(canvas);

            pieceBtn.addEventListener('click', function() {
                var pieceType = this.dataset.piece;
                if (Game.getIsMultiplayer()) {
                    Game.completePromotion(pieceType);
                    Multiplayer.sendPromotion(pieceType);
                } else {
                    Game.completePromotion(pieceType);
                }
                elements.promotionModal.classList.remove('active');
            });

            container.appendChild(pieceBtn);
        }

        elements.promotionModal.classList.add('active');
    }

    // ── Modals ───────────────────────────────────────────────────────────────
    function showInstructions() {
        elements.instructionsModal.classList.add('active');
    }

    function hideInstructions() {
        elements.instructionsModal.classList.remove('active');
    }

    function showCredits() {
        elements.creditsModal.classList.add('active');
    }

    function hideCredits() {
        elements.creditsModal.classList.remove('active');
    }

    function showGameOver(result) {
        var title, message;

        if (result === 'checkmate-player') {
            title = 'YOU WIN!';
            message = 'Checkmate! You captured the AI king!';
            elements.gameOverTitle.className = 'game-over-title win';
        } else if (result === 'checkmate-ai') {
            title = 'AI WINS';
            message = 'Checkmate! The AI captured your king.';
            elements.gameOverTitle.className = 'game-over-title lose';
        } else if (result === 'stalemate') {
            title = 'DRAW';
            message = 'Stalemate! No legal moves available.';
            elements.gameOverTitle.className = 'game-over-title draw';
        } else if (result === 'timeout-player') {
            title = 'YOU WIN!';
            message = 'AI ran out of time!';
            elements.gameOverTitle.className = 'game-over-title win';
        } else if (result === 'timeout-ai') {
            title = 'AI WINS';
            message = 'You ran out of time.';
            elements.gameOverTitle.className = 'game-over-title lose';
        } else {
            title = 'GAME OVER';
            message = result;
            elements.gameOverTitle.className = 'game-over-title draw';
        }

        elements.gameOverTitle.textContent = title;
        elements.gameOverMessage.textContent = message;
        elements.gameOverModal.classList.add('active');
    }

    function hideGameOver() {
        elements.gameOverModal.classList.remove('active');
    }

    return {
        init: init
    };

})();

// ── Initialize on DOM load ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', UI.init);
