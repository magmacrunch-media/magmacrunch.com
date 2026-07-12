/**
 * main.js — DOM rendering, click handlers, UI
 */

var UI = (function() {

    // ── DOM References ───────────────────────────────────────────────────────
    var elements = {};
    var highlightedSquares = [];
    var isMultiplayer = false;

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
        elements.onlineBtn = document.getElementById('onlineBtn');
        elements.boardContainer = document.getElementById('boardContainer');
        elements.message = document.getElementById('gameMessage');
        elements.turnIndicator = document.getElementById('turnIndicator');
        elements.playerPieces = document.getElementById('playerPieces');
        elements.aiPieces = document.getElementById('aiPieces');
        elements.instructionsModal = document.getElementById('instructionsModal');
        elements.closeInstructions = document.getElementById('closeInstructions');
        elements.closeInstructionsBtn = document.getElementById('closeInstructionsBtn');
        elements.creditsModal = document.getElementById('creditsModal');
        elements.closeCredits = document.getElementById('closeCredits');
        elements.closeCreditsBtn = document.getElementById('closeCreditsBtn');
        elements.gameOverModal = document.getElementById('gameOverModal');
        elements.gameOverTitle = document.getElementById('gameOverTitle');
        elements.gameOverMessage = document.getElementById('gameOverMessage');
        elements.playAgainBtn = document.getElementById('playAgainBtn');
        elements.newGameBtn = document.getElementById('newGameBtn');
        elements.menuBtn = document.getElementById('menuBtn');
        elements.helpBtn = document.getElementById('helpBtn');
        elements.creditsBtn = document.getElementById('creditsBtn');
        elements.lobbyOverlay = document.getElementById('lobbyOverlay');
        elements.lobbyStatus = document.getElementById('lobbyStatus');
        elements.lobbyRoomInput = document.getElementById('roomCodeInput');
        elements.lobbyJoinBtn = document.getElementById('lobbyJoinBtn');
        elements.lobbyBackBtn = document.getElementById('lobbyBackBtn');
        elements.lobbyPlayers = document.getElementById('lobbyPlayers');
        elements.lobbyPlayerList = document.getElementById('lobbyPlayerList');
        elements.lobbyRoomCode = document.getElementById('lobbyRoomCode');
        elements.roomCodeDisplay = document.getElementById('roomCodeDisplay');
        elements.lobbyStartArea = document.getElementById('lobbyStartArea');
        elements.lobbyStartBtn = document.getElementById('lobbyStartBtn');
        elements.gameChat = document.getElementById('gameChat');
    }

    function setupEventListeners() {
        elements.startGameBtn.addEventListener('click', startLocalGame);
        elements.onlineBtn.addEventListener('click', openLobby);
        elements.newGameBtn.addEventListener('click', startLocalGame);
        elements.menuBtn.addEventListener('click', showMenu);
        elements.helpBtn.addEventListener('click', showInstructions);
        elements.creditsBtn.addEventListener('click', showCredits);
        elements.closeInstructions.addEventListener('click', hideInstructions);
        elements.closeInstructionsBtn.addEventListener('click', hideInstructions);
        elements.closeCredits.addEventListener('click', hideCredits);
        elements.closeCreditsBtn.addEventListener('click', hideCredits);
        elements.playAgainBtn.addEventListener('click', isMultiplayer ? openLobby : startLocalGame);
        elements.lobbyJoinBtn.addEventListener('click', joinLobby);
        elements.lobbyBackBtn.addEventListener('click', closeLobby);
        elements.lobbyStartBtn.addEventListener('click', function() {
            Multiplayer.startGame();
        });

        document.addEventListener('keydown', function(e) {
            if (e.code === 'Space') {
                e.preventDefault();
                if (elements.startScreen.style.display !== 'none') {
                    startLocalGame();
                }
            }
        });
    }

    // ── Local Game ───────────────────────────────────────────────────────────
    function startLocalGame() {
        isMultiplayer = false;
        Multiplayer.quit();
        Chat.disconnect();
        elements.startScreen.style.display = 'none';
        elements.gameScreen.style.display = 'flex';
        elements.gameChat.style.display = 'none';
        hideGameOver();
        Game.startGame();
        renderBoard();
        updateUI();
    }

    function showMenu() {
        isMultiplayer = false;
        Multiplayer.quit();
        Chat.disconnect();
        elements.startScreen.style.display = 'flex';
        elements.gameScreen.style.display = 'none';
        elements.gameChat.style.display = 'none';
    }

    // ── Lobby ────────────────────────────────────────────────────────────────
    function openLobby() {
        elements.startScreen.style.display = 'none';
        elements.lobbyOverlay.style.display = 'flex';
        elements.lobbyOverlay.classList.add('active');
        elements.lobbyStatus.textContent = 'Connecting...';
        elements.lobbyPlayers.style.display = 'none';
        elements.lobbyRoomCode.style.display = 'none';
        elements.lobbyStartArea.style.display = 'none';
        elements.lobbyRoomInput.value = '';
        elements.lobbyRoomInput.disabled = false;
        elements.lobbyJoinBtn.style.display = '';
        Multiplayer.connect();
    }

    function closeLobby() {
        Multiplayer.quit();
        elements.lobbyOverlay.classList.remove('active');
        elements.lobbyOverlay.style.display = 'none';
        elements.startScreen.style.display = 'flex';
    }

    function joinLobby() {
        var roomCode = elements.lobbyRoomInput.value.trim().toUpperCase() || null;
        var playerName = localStorage.getItem('arcade_username') || 'Player' + Math.floor(Math.random() * 999);
        elements.lobbyStatus.textContent = 'Joining room...';
        Multiplayer.joinRoom(playerName, roomCode);
    }

    // ── Multiplayer Callbacks ────────────────────────────────────────────────
    function onMultiplayerStateUpdate(update) {
        if (update.type === 'snapshot') {
            elements.lobbyStatus.textContent = 'Connected! Enter a room code or join an existing room.';
        } else if (update.type === 'welcome') {
            // Room joined — show room code
            elements.lobbyRoomCode.style.display = 'block';
            elements.roomCodeDisplay.textContent = update.room;
            elements.lobbyRoomInput.style.display = 'none';
            elements.lobbyJoinBtn.style.display = 'none';
            elements.lobbyStatus.textContent = update.isHost ? 'You are the host. Share the room code above.' : 'Joined room! Waiting for host to start...';
        } else if (update.type === 'lobby') {
            elements.lobbyStatus.textContent = 'Players in room:';
            elements.lobbyPlayers.style.display = 'block';
            elements.lobbyPlayerList.innerHTML = '';
            update.players.forEach(function(p) {
                var div = document.createElement('div');
                div.className = 'lobby-player';
                div.innerHTML = '<span class="lobby-player-dot" style="background:' + p.color + '"></span>' + p.name + (p.isHost ? ' (host)' : '');
                elements.lobbyPlayerList.appendChild(div);
            });
            // Show Start button only for host when 2 players
            var isHost = update.players.some(function(p) { return p.isHost; });
            if (isHost && update.canStart) {
                elements.lobbyStartArea.style.display = 'flex';
                elements.lobbyStatus.textContent = 'Ready! Click START GAME when you want to begin.';
            } else if (!isHost) {
                elements.lobbyStartArea.style.display = 'none';
                elements.lobbyStatus.textContent = 'Waiting for host to start the game...';
            }
        } else if (update.type === 'disconnected') {
            elements.lobbyStatus.textContent = 'Disconnected. Try again.';
            elements.lobbyPlayers.style.display = 'none';
            elements.lobbyStartArea.style.display = 'none';
        } else if (update.type === 'move') {
            var state = update.msg.state;
            if (state) {
                applyServerState(state);
            }
        } else if (update.type === 'state') {
            applyServerState(update.state);
        }
    }

    function onMultiplayerGameStart(state, side) {
        elements.lobbyOverlay.classList.remove('active');
        elements.lobbyOverlay.style.display = 'none';
        elements.startScreen.style.display = 'none';
        elements.gameScreen.style.display = 'flex';
        elements.gameChat.style.display = 'flex';
        hideGameOver();
        isMultiplayer = true;
        applyServerState(state);
        ChatWidget.connect();
    }

    function onMultiplayerGameEnd(won, winnerName, winnerSide) {
        showMultiplayerGameOver(won, winnerName);
    }

    function applyServerState(state) {
        // Apply board from server
        Board.setState(state.board);

        // Set whose turn it is
        var mySide = Multiplayer.getMySide();
        var currentSide = state.currentTurnSide;

        if (currentSide === mySide) {
            Game._internalSetTurn('player');
        } else {
            Game._internalSetTurn('opponent');
        }

        renderBoard();
        updateMultiplayerUI(state);
    }

    // ── State Change Handler ─────────────────────────────────────────────────
    function onStateChange(data) {
        renderBoard();
        updateUI();

        if (data.state === CK.STATE.AI_TURN) {
            setTimeout(executeAIMove, 500);
        }
    }

    function onGameEnd(winner) {
        showGameOver(winner);
    }

    // ── Board Rendering ──────────────────────────────────────────────────────
    function renderBoard() {
        var board = Board.getState();
        var container = elements.boardContainer;
        container.innerHTML = '';

        var boardEl = document.createElement('div');
        boardEl.className = 'board';

        for (var r = 0; r < CK.BOARD_SIZE; r++) {
            for (var c = 0; c < CK.BOARD_SIZE; c++) {
                var square = createSquare(r, c, board[r][c]);
                boardEl.appendChild(square);
            }
        }

        container.appendChild(boardEl);

        // Piece counts
        var counts = document.createElement('div');
        counts.className = 'piece-counts';
        var redCount = 0, blackCount = 0;
        for (var r = 0; r < CK.BOARD_SIZE; r++) {
            for (var c = 0; c < CK.BOARD_SIZE; c++) {
                var p = board[r][c];
                if (p === CK.PLAYER_PIECE || p === CK.PLAYER_KING) redCount++;
                if (p === CK.AI_PIECE || p === CK.AI_KING) blackCount++;
            }
        }
        counts.innerHTML =
            '<div class="piece-count player">' +
                '<span class="piece-count-label">' + (isMultiplayer ? 'RED' : 'YOU') + '</span>' +
                '<span class="piece-count-value" id="playerPiecesCount">' + redCount + '</span>' +
            '</div>' +
            '<div class="piece-count ai">' +
                '<span class="piece-count-label">' + (isMultiplayer ? 'BLACK' : 'AI') + '</span>' +
                '<span class="piece-count-value" id="aiPiecesCount">' + blackCount + '</span>' +
            '</div>';
        container.appendChild(counts);
    }

    function createSquare(row, col, piece) {
        var square = document.createElement('div');
        var isDark = Board.isDarkSquare(row, col);
        square.className = 'square ' + (isDark ? 'dark' : 'light');
        square.dataset.row = row;
        square.dataset.col = col;

        // Highlight legal moves
        var selectedPiece = Game.getSelectedPiece();
        if (selectedPiece && Game.getState() === CK.STATE.MOVING) {
            var legalMoves = Game.getLegalMoves();
            for (var i = 0; i < legalMoves.length; i++) {
                if (legalMoves[i].to.row === row && legalMoves[i].to.col === col) {
                    if (legalMoves[i].type === CK.MOVE_TYPE.JUMP || legalMoves[i].type === CK.MOVE_TYPE.MULTI_JUMP) {
                        square.classList.add('highlighted-jump');
                    } else {
                        square.classList.add('highlighted');
                    }
                    break;
                }
            }
        }

        // Highlight selected piece
        if (selectedPiece && selectedPiece.row === row && selectedPiece.col === col) {
            square.classList.add('selected');
        }

        // Create piece if exists
        if (piece !== CK.EMPTY) {
            var pieceEl = document.createElement('div');
            var isPlayer = Board.isPlayerPiece(piece);
            var isKing = Board.isKing(piece);

            pieceEl.className = 'piece ' + (isPlayer ? 'player' : 'ai');
            if (isKing) pieceEl.classList.add('king');

            // Highlight movable pieces
            if (Game.getState() === CK.STATE.SELECTING && Game.getCurrentPlayer() === CK.PLAYER) {
                if (isPlayer) {
                    var moves = Board.getMovesFromPosition(row, col);
                    if (moves.length > 0) {
                        pieceEl.classList.add('movable');
                    }
                }
            }

            pieceEl.dataset.row = row;
            pieceEl.dataset.col = col;
            pieceEl.addEventListener('click', handlePieceClick);
            square.appendChild(pieceEl);
        }

        square.addEventListener('click', handleSquareClick);
        return square;
    }

    // ── Event Handlers ───────────────────────────────────────────────────────
    function handlePieceClick(e) {
        e.stopPropagation();
        var row = parseInt(e.target.dataset.row);
        var col = parseInt(e.target.dataset.col);

        if (Game.getState() === CK.STATE.SELECTING) {
            Game.selectPiece(row, col);
        } else if (Game.getState() === CK.STATE.MOVING) {
            var selectedPiece = Game.getSelectedPiece();
            if (selectedPiece && selectedPiece.row === row && selectedPiece.col === col) {
                Game.deselectPiece();
            } else {
                var moved = Game.executeMove(row, col);
                if (!moved) {
                    Game.selectPiece(row, col);
                }
            }
        }
    }

    function handleSquareClick(e) {
        var row = parseInt(e.currentTarget.dataset.row);
        var col = parseInt(e.currentTarget.dataset.col);

        if (Game.getState() === CK.STATE.MOVING) {
            var selectedPiece = Game.getSelectedPiece();
            if (selectedPiece && isMultiplayer) {
                // In multiplayer, send the move to the server
                var legalMoves = Game.getLegalMoves();
                var move = null;
                for (var i = 0; i < legalMoves.length; i++) {
                    if (legalMoves[i].to.row === row && legalMoves[i].to.col === col) {
                        move = legalMoves[i];
                        break;
                    }
                }
                if (move) {
                    Game.executeMove(row, col);
                    Multiplayer.sendMove(
                        { row: selectedPiece.row, col: selectedPiece.col },
                        { row: row, col: col }
                    );
                }
            } else {
                Game.executeMove(row, col);
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

        if (isMultiplayer) return; // Handled by updateMultiplayerUI

        if (currentPlayer === CK.PLAYER) {
            elements.turnIndicator.textContent = 'YOUR TURN';
            elements.turnIndicator.style.color = CK.COLORS.player;
        } else {
            elements.turnIndicator.textContent = 'AI THINKING...';
            elements.turnIndicator.style.color = CK.COLORS.ai;
        }

        if (state === CK.STATE.SELECTING) {
            setMessage('Select a piece to move');
        } else if (state === CK.STATE.MOVING) {
            setMessage('Select destination');
        } else if (state === CK.STATE.AI_TURN) {
            setMessage('AI is thinking...');
        }
    }

    function updateMultiplayerUI(state) {
        var mySide = Multiplayer.getMySide();
        var isMyTurn = state.currentTurnSide === mySide;

        if (isMyTurn) {
            elements.turnIndicator.textContent = 'YOUR TURN';
            elements.turnIndicator.style.color = CK.COLORS.player;
        } else {
            elements.turnIndicator.textContent = 'OPPONENT\'S TURN';
            elements.turnIndicator.style.color = CK.COLORS.ai;
        }

        if (state.phase === 'playing') {
            if (isMyTurn) {
                setMessage('Select a piece to move');
            } else {
                setMessage('Waiting for opponent...');
            }
        }
    }

    function setMessage(text, type) {
        elements.message.textContent = text;
        elements.message.className = 'game-message' + (type ? ' ' + type : '');
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

    function showGameOver(winner) {
        if (winner === CK.PLAYER) {
            elements.gameOverTitle.textContent = 'YOU WIN!';
            elements.gameOverTitle.className = 'game-over-title win';
            elements.gameOverMessage.textContent = 'Congratulations! You beat the AI!';
        } else {
            elements.gameOverTitle.textContent = 'AI WINS';
            elements.gameOverTitle.className = 'game-over-title lose';
            elements.gameOverMessage.textContent = 'Better luck next time!';
        }

        elements.gameOverModal.classList.add('active');
    }

    function showMultiplayerGameOver(won, winnerName) {
        if (won) {
            elements.gameOverTitle.textContent = 'YOU WIN!';
            elements.gameOverTitle.className = 'game-over-title win';
            elements.gameOverMessage.textContent = 'Congratulations! You defeated ' + winnerName + '!';
        } else {
            elements.gameOverTitle.textContent = 'DEFEAT';
            elements.gameOverTitle.className = 'game-over-title lose';
            elements.gameOverMessage.textContent = winnerName + ' wins!';
        }
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
