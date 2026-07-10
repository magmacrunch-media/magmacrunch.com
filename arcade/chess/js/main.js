/**
 * main.js — DOM rendering, pixel art, notation, UI
 */

var UI = (function() {

    // ── DOM References ───────────────────────────────────────────────────────
    var elements = {};
    var lastMoveFrom = null;
    var lastMoveTo = null;

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
        hideGameOver();
        Game.startGame();
        lastMoveFrom = null;
        lastMoveTo = null;
        renderBoard();
        updateUI();
    }

    function showMenu() {
        elements.startScreen.style.display = 'flex';
        elements.gameScreen.style.display = 'none';
    }

    // ── State Change Handler ─────────────────────────────────────────────────
    function onStateChange(data) {
        // Track last move for highlighting
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

        for (var r = 0; r < CH.BOARD_SIZE; r++) {
            for (var c = 0; c < CH.BOARD_SIZE; c++) {
                var square = createSquare(r, c, board[r][c], files[c]);
                boardEl.appendChild(square);
            }
        }

        container.appendChild(boardEl);
    }

    function createSquare(row, col, piece, file) {
        var square = document.createElement('div');
        var isDark = (row + col) % 2 === 1;
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
        if (piece && piece.type === CH.KING && piece.owner === Game.getCurrentPlayer()) {
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

        // Add square labels (file and rank)
        if (row === 7) {
            var fileLabel = document.createElement('div');
            fileLabel.className = 'square-label file';
            fileLabel.textContent = file;
            square.appendChild(fileLabel);
        }
        if (col === 0) {
            var rankLabel = document.createElement('div');
            rankLabel.className = 'square-label rank';
            rankLabel.textContent = 8 - row;
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
        var color = owner === CH.PLAYER ? CH.COLORS.player : CH.COLORS.ai;

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
        // Base
        ctx.fillStyle = color;
        ctx.fillRect(8, 26, 16, 4);
        // Stem
        ctx.fillRect(12, 18, 8, 8);
        // Crown
        ctx.fillRect(6, 12, 20, 6);
        // Crown points
        ctx.fillRect(6, 8, 2, 4);
        ctx.fillRect(11, 8, 2, 4);
        ctx.fillRect(15, 8, 2, 4);
        ctx.fillRect(20, 8, 2, 4);
        // Cross on top
        ctx.fillRect(14, 4, 4, 6);
        ctx.fillRect(12, 6, 8, 2);
        // Gems
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(15, 14, 2, 2);
    }

    function drawQueen(ctx, color) {
        // Base
        ctx.fillStyle = color;
        ctx.fillRect(6, 26, 20, 4);
        // Stem
        ctx.fillRect(10, 18, 12, 8);
        // Crown
        ctx.fillRect(6, 12, 20, 6);
        // Crown points
        ctx.fillRect(6, 6, 3, 6);
        ctx.fillRect(14, 4, 4, 8);
        ctx.fillRect(23, 6, 3, 6);
        // Gems
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(15, 14, 2, 2);
    }

    function drawRook(ctx, color) {
        // Base
        ctx.fillStyle = color;
        ctx.fillRect(8, 26, 16, 4);
        // Body
        ctx.fillRect(10, 12, 12, 14);
        // Battlements
        ctx.fillRect(6, 6, 20, 6);
        // Notches
        ctx.fillRect(8, 6, 2, 3);
        ctx.fillRect(14, 6, 4, 3);
        ctx.fillRect(22, 6, 2, 3);
    }

    function drawBishop(ctx, color) {
        // Base
        ctx.fillStyle = color;
        ctx.fillRect(8, 26, 16, 4);
        // Body
        ctx.fillRect(11, 16, 10, 10);
        // Pointed top
        ctx.fillRect(12, 10, 8, 6);
        ctx.fillRect(13, 6, 6, 4);
        ctx.fillRect(14, 2, 4, 4);
        // Cross on top
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(15, 0, 2, 4);
    }

    function drawKnight(ctx, color) {
        // Base
        ctx.fillStyle = color;
        ctx.fillRect(8, 26, 16, 4);
        // Body
        ctx.fillRect(10, 14, 12, 12);
        // Head
        ctx.fillRect(8, 6, 14, 8);
        // Ear
        ctx.fillRect(8, 2, 4, 6);
        // Nose
        ctx.fillRect(20, 8, 4, 4);
        // Eye
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(16, 8, 2, 2);
    }

    function drawPawn(ctx, color) {
        // Base
        ctx.fillStyle = color;
        ctx.fillRect(10, 26, 12, 4);
        // Body
        ctx.fillRect(12, 18, 8, 8);
        // Head
        ctx.fillRect(11, 12, 10, 6);
        // Top
        ctx.fillRect(12, 8, 8, 4);
        // Highlight
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(14, 10, 2, 2);
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
                }
            }
        }
    }

    function handleSquareClick(e) {
        var row = parseInt(e.currentTarget.dataset.row);
        var col = parseInt(e.currentTarget.dataset.col);

        if (Game.getState() === CH.STATE.MOVING) {
            Game.executeMove(row, col);
        } else if (Game.getState() === CH.STATE.SELECTING) {
            var piece = Board.getPiece(row, col);
            if (piece && piece.owner === CH.PLAYER) {
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

        for (var i = 0; i < pieces.length; i++) {
            var pieceBtn = document.createElement('div');
            pieceBtn.className = 'promotion-piece';
            pieceBtn.dataset.piece = pieces[i];

            var canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            drawPiece(canvas, pieces[i], CH.PLAYER);
            pieceBtn.appendChild(canvas);

            pieceBtn.addEventListener('click', function() {
                var pieceType = this.dataset.piece;
                Game.completePromotion(pieceType);
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
