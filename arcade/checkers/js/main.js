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

    // Ids this game reads that BoardGameTemplate still does not emit. The lobby
    // ids it used to be missing are now part of the template; these remaining
    // ones are vestigial, cached but never written to. el() substitutes a
    // detached node for them and warns about anything unexpected.
    var UNRENDERED = ['playerPieces', 'aiPieces'];

    function el(id) {
        var found = document.getElementById(id);
        if (found) return found;
        if (UNRENDERED.indexOf(id) === -1) console.warn('[UI] missing element: ' + id);
        return document.createElement('div');
    }

    function cacheElements() {
        elements.startScreen = el('startScreen');
        elements.gameScreen = el('gameScreen');
        elements.startGameBtn = el('startGameBtn');
        elements.onlineBtn = el('onlineBtn');
        elements.boardContainer = el('boardContainer');
        elements.message = el('gameMessage');
        elements.turnIndicator = el('turnIndicator');
        elements.playerPieces = el('playerPieces');
        elements.aiPieces = el('aiPieces');
        elements.instructionsModal = el('instructionsModal');
        elements.closeInstructions = el('closeInstructions');
        elements.closeInstructionsBtn = el('closeInstructionsBtn');
        elements.creditsModal = el('creditsModal');
        elements.closeCredits = el('closeCredits');
        elements.closeCreditsBtn = el('closeCreditsBtn');
        elements.gameOverModal = el('gameOverModal');
        elements.gameOverTitle = el('gameOverTitle');
        elements.gameOverMessage = el('gameOverMessage');
        elements.playAgainBtn = el('playAgainBtn');
        elements.newGameBtn = el('newGameBtn');
        elements.menuBtn = el('menuBtn');
        elements.helpBtn = el('helpBtn');
        elements.creditsBtn = el('creditsBtn');
        elements.lobbyOverlay = el('lobbyOverlay');
        elements.lobbyStatus = el('lobbyStatus');
        elements.lobbyRoomInput = el('roomCodeInput');
        elements.lobbyJoinBtn = el('lobbyJoinBtn');
        elements.lobbyBackBtn = el('lobbyBackBtn');
        elements.lobbyPlayers = el('lobbyPlayers');
        elements.lobbyPlayerList = el('lobbyPlayerList');
        elements.lobbyRoomCode = el('lobbyRoomCode');
        elements.roomCodeDisplay = el('roomCodeDisplay');
        elements.lobbyStartArea = el('lobbyStartArea');
        elements.lobbyStartBtn = el('lobbyStartBtn');
        elements.gameChat = el('gameChat');
    }

    // Bind only if the element exists. The lobby markup these games were written
    // against no longer matches what BoardGameTemplate emits (they expect
    // lobbyJoinBtn / lobbyBackBtn / lobbyStartBtn / roomCodeInput; the template
    // renders lobbyCreateRoom / lobbyJoinRoom / lobbyStartGame). Unguarded, the
    // first missing element threw and aborted init() before the board rendered —
    // which nobody noticed, because these scripts never executed at all.
    function on(el, evt, fn) {
        if (el) el.addEventListener(evt, fn);
    }

    function setupEventListeners() {
        on(elements.startGameBtn, 'click', startLocalGame);
        on(elements.onlineBtn, 'click', openLobby);
        on(elements.newGameBtn, 'click', startLocalGame);
        on(elements.menuBtn, 'click', showMenu);
        on(elements.helpBtn, 'click', showInstructions);
        on(elements.creditsBtn, 'click', showCredits);
        on(elements.closeInstructions, 'click', hideInstructions);
        on(elements.closeInstructionsBtn, 'click', hideInstructions);
        on(elements.closeCredits, 'click', hideCredits);
        on(elements.closeCreditsBtn, 'click', hideCredits);
        on(elements.playAgainBtn, 'click', isMultiplayer ? openLobby : startLocalGame);
        on(elements.lobbyJoinBtn, 'click', joinLobby);
        on(elements.lobbyBackBtn, 'click', closeLobby);
        on(elements.lobbyStartBtn, 'click', function() {
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
        ChatWidget.disconnect();
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
        ChatWidget.disconnect();
        elements.startScreen.style.display = 'flex';
        elements.gameScreen.style.display = 'none';
        elements.gameChat.style.display = 'none';
    }

    // ── Lobby ────────────────────────────────────────────────────────────────
    function openLobby() {
        elements.startScreen.style.display = 'none';
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
        elements.startScreen.style.display = 'flex';
    }

    function joinLobby() {
        var roomCode = elements.lobbyRoomInput.value.trim().toUpperCase() || null;
        var playerName = localStorage.getItem('arcade_username') || 'Player' + Math.floor(Math.random() * 999);
        elements.lobbyStatus.textContent = 'Joining room...';
        Multiplayer.joinRoom(playerName, roomCode);
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
                div.innerHTML = '<span class="lobby-player-dot" style="background:' + escapeHtml(p.color) + '"></span>' + escapeHtml(p.name) + (p.isHost ? ' (host)' : '');
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
        elements.startScreen.style.display = 'none';
        elements.gameScreen.style.display = 'flex';
        elements.gameChat.style.display = 'flex';
        hideGameOver();
        isMultiplayer = true;
        applyServerState(state);
        ChatWidget.connect(MC_CHAT_OPTS);
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
