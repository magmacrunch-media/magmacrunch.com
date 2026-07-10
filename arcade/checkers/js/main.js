/**
 * main.js — DOM rendering, click handlers, UI
 */

var UI = (function() {

    // ── DOM References ───────────────────────────────────────────────────────
    var elements = {};
    var highlightedSquares = [];

    // ── Initialize ───────────────────────────────────────────────────────────
    function init() {
        cacheElements();
        setupEventListeners();
        Game.setOnStateChange(onStateChange);
        Game.setOnGameEnd(onGameEnd);
    }

    function cacheElements() {
        elements.startScreen = document.getElementById('startScreen');
        elements.gameScreen = document.getElementById('gameScreen');
        elements.startGameBtn = document.getElementById('startGameBtn');
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
    }

    function setupEventListeners() {
        elements.startGameBtn.addEventListener('click', startGame);
        elements.newGameBtn.addEventListener('click', startGame);
        elements.menuBtn.addEventListener('click', showMenu);
        elements.helpBtn.addEventListener('click', showInstructions);
        elements.creditsBtn.addEventListener('click', showCredits);
        elements.closeInstructions.addEventListener('click', hideInstructions);
        elements.closeInstructionsBtn.addEventListener('click', hideInstructions);
        elements.closeCredits.addEventListener('click', hideCredits);
        elements.closeCreditsBtn.addEventListener('click', hideCredits);
        elements.playAgainBtn.addEventListener('click', startGame);

        document.addEventListener('keydown', function(e) {
            if (e.code === 'Space') {
                e.preventDefault();
                if (elements.startScreen.style.display !== 'none') {
                    startGame();
                }
            }
        });
    }

    // ── Game Flow ────────────────────────────────────────────────────────────
    function startGame() {
        elements.startScreen.style.display = 'none';
        elements.gameScreen.style.display = 'flex';
        hideGameOver();
        Game.startGame();
        renderBoard();
        updateUI();
    }

    function showMenu() {
        elements.startScreen.style.display = 'flex';
        elements.gameScreen.style.display = 'none';
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
        counts.innerHTML = 
            '<div class="piece-count player">' +
                '<span class="piece-count-label">YOU</span>' +
                '<span class="piece-count-value" id="playerPiecesCount">' + Board.getPlayerPieceCount(CK.PLAYER) + '</span>' +
            '</div>' +
            '<div class="piece-count ai">' +
                '<span class="piece-count-label">AI</span>' +
                '<span class="piece-count-value" id="aiPiecesCount">' + Board.getPlayerPieceCount(CK.AI) + '</span>' +
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
                // Try to move to this square
                var moved = Game.executeMove(row, col);
                if (!moved) {
                    // Try selecting a different piece
                    Game.selectPiece(row, col);
                }
            }
        }
    }

    function handleSquareClick(e) {
        var row = parseInt(e.currentTarget.dataset.row);
        var col = parseInt(e.currentTarget.dataset.col);

        if (Game.getState() === CK.STATE.MOVING) {
            Game.executeMove(row, col);
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

    function hideGameOver() {
        elements.gameOverModal.classList.remove('active');
    }

    return {
        init: init
    };

})();

// ── Initialize on DOM load ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', UI.init);
