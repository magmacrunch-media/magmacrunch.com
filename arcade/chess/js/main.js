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
        // Shadow color
        var dark = shadeColor(color, -40);
        var light = shadeColor(color, 40);

        // Base platform
        ctx.fillStyle = dark;
        ctx.fillRect(7, 28, 18, 3);
        ctx.fillStyle = color;
        ctx.fillRect(8, 27, 16, 3);

        // Body - tapered column
        ctx.fillStyle = color;
        ctx.fillRect(11, 17, 10, 10);
        ctx.fillStyle = dark;
        ctx.fillRect(11, 17, 2, 10);
        ctx.fillRect(19, 17, 2, 10);
        ctx.fillStyle = light;
        ctx.fillRect(14, 17, 3, 10);

        // Waist/collar
        ctx.fillStyle = dark;
        ctx.fillRect(10, 16, 12, 2);

        // Crown band
        ctx.fillStyle = color;
        ctx.fillRect(9, 12, 14, 4);
        ctx.fillStyle = dark;
        ctx.fillRect(9, 12, 14, 1);

        // Crown points (5 prongs)
        ctx.fillStyle = color;
        ctx.fillRect(9, 8, 2, 4);
        ctx.fillRect(13, 6, 2, 6);
        ctx.fillRect(17, 6, 2, 6);
        ctx.fillRect(21, 8, 2, 4);

        // Crown prong tips (gems)
        ctx.fillStyle = light;
        ctx.fillRect(9, 7, 2, 2);
        ctx.fillRect(13, 5, 2, 2);
        ctx.fillRect(17, 5, 2, 2);
        ctx.fillRect(21, 7, 2, 2);

        // Cross on top
        ctx.fillStyle = color;
        ctx.fillRect(15, 1, 2, 6);
        ctx.fillRect(13, 3, 6, 2);
        ctx.fillStyle = light;
        ctx.fillRect(15, 1, 2, 1);
        ctx.fillRect(13, 3, 1, 2);

        // Gem in center
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(16, 13, 1, 1);
    }

    function drawQueen(ctx, color) {
        var dark = shadeColor(color, -40);
        var light = shadeColor(color, 40);

        // Base platform
        ctx.fillStyle = dark;
        ctx.fillRect(7, 28, 18, 3);
        ctx.fillStyle = color;
        ctx.fillRect(8, 27, 16, 3);

        // Body - elegant taper
        ctx.fillStyle = color;
        ctx.fillRect(11, 18, 10, 9);
        ctx.fillStyle = dark;
        ctx.fillRect(11, 18, 2, 9);
        ctx.fillRect(19, 18, 2, 9);
        ctx.fillStyle = light;
        ctx.fillRect(14, 18, 3, 9);

        // Waist
        ctx.fillStyle = dark;
        ctx.fillRect(10, 17, 12, 2);

        // Crown band
        ctx.fillStyle = color;
        ctx.fillRect(9, 13, 14, 4);
        ctx.fillStyle = dark;
        ctx.fillRect(9, 13, 14, 1);

        // Crown points (7 prongs, alternating tall/short)
        ctx.fillStyle = color;
        ctx.fillRect(8, 8, 2, 5);
        ctx.fillRect(11, 5, 2, 8);
        ctx.fillRect(14, 3, 2, 10);
        ctx.fillRect(17, 5, 2, 8);
        ctx.fillRect(20, 8, 2, 5);

        // Crown tips with jewels
        ctx.fillStyle = light;
        ctx.fillRect(8, 7, 2, 2);
        ctx.fillRect(11, 4, 2, 2);
        ctx.fillRect(14, 2, 2, 2);
        ctx.fillRect(17, 4, 2, 2);
        ctx.fillRect(20, 7, 2, 2);

        // Central orb (globe + cross)
        ctx.fillStyle = color;
        ctx.fillRect(15, 0, 2, 4);
        ctx.fillRect(14, 2, 4, 2);

        // Gems in crown band
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(12, 14, 1, 1);
        ctx.fillRect(16, 14, 1, 1);
        ctx.fillRect(20, 14, 1, 1);
    }

    function drawRook(ctx, color) {
        var dark = shadeColor(color, -40);
        var light = shadeColor(color, 40);

        // Base platform
        ctx.fillStyle = dark;
        ctx.fillRect(6, 28, 20, 3);
        ctx.fillStyle = color;
        ctx.fillRect(7, 27, 18, 3);

        // Main body
        ctx.fillStyle = color;
        ctx.fillRect(9, 13, 14, 14);
        ctx.fillStyle = dark;
        ctx.fillRect(9, 13, 2, 14);
        ctx.fillRect(21, 13, 2, 14);
        ctx.fillStyle = light;
        ctx.fillRect(13, 13, 3, 14);

        // Arrow slit windows
        ctx.fillStyle = dark;
        ctx.fillRect(14, 16, 4, 1);
        ctx.fillRect(14, 20, 4, 1);

        // Upper ledge
        ctx.fillStyle = dark;
        ctx.fillRect(7, 12, 18, 2);

        // Battlements (crenellation)
        ctx.fillStyle = color;
        ctx.fillRect(6, 6, 20, 6);
        ctx.fillStyle = dark;
        ctx.fillRect(6, 6, 20, 1);

        // Battlement gaps
        ctx.fillStyle = '#0d0820';
        ctx.fillRect(8, 8, 3, 4);
        ctx.fillRect(14, 8, 4, 4);
        ctx.fillRect(21, 8, 3, 4);

        // Top edge highlights
        ctx.fillStyle = light;
        ctx.fillRect(6, 6, 20, 1);
    }

    function drawBishop(ctx, color) {
        var dark = shadeColor(color, -40);
        var light = shadeColor(color, 40);

        // Base platform
        ctx.fillStyle = dark;
        ctx.fillRect(7, 28, 18, 3);
        ctx.fillStyle = color;
        ctx.fillRect(8, 27, 16, 3);

        // Body
        ctx.fillStyle = color;
        ctx.fillRect(11, 18, 10, 9);
        ctx.fillStyle = dark;
        ctx.fillRect(11, 18, 2, 9);
        ctx.fillRect(19, 18, 2, 9);
        ctx.fillStyle = light;
        ctx.fillRect(14, 18, 3, 9);

        // Collar
        ctx.fillStyle = dark;
        ctx.fillRect(10, 17, 12, 2);

        // Mitre (pointed hat) - main
        ctx.fillStyle = color;
        ctx.fillRect(11, 10, 10, 7);
        ctx.fillStyle = dark;
        ctx.fillRect(11, 10, 2, 7);
        ctx.fillRect(19, 10, 2, 7);
        ctx.fillStyle = light;
        ctx.fillRect(14, 10, 3, 7);

        // Mitre - upper
        ctx.fillStyle = color;
        ctx.fillRect(12, 6, 8, 4);
        ctx.fillRect(13, 4, 6, 2);
        ctx.fillRect(14, 2, 4, 2);
        ctx.fillRect(15, 0, 2, 2);

        // Mitre slit (distinguishing feature)
        ctx.fillStyle = dark;
        ctx.fillRect(15, 6, 2, 8);
        ctx.fillStyle = light;
        ctx.fillRect(15, 6, 1, 8);

        // Gem at top
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(16, 1, 1, 1);

        // Collar gems
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(12, 17, 1, 1);
        ctx.fillRect(19, 17, 1, 1);
    }

    function drawKnight(ctx, color) {
        var dark = shadeColor(color, -40);
        var light = shadeColor(color, 40);

        // Base platform
        ctx.fillStyle = dark;
        ctx.fillRect(7, 28, 18, 3);
        ctx.fillStyle = color;
        ctx.fillRect(8, 27, 16, 3);

        // Body/neck
        ctx.fillStyle = color;
        ctx.fillRect(10, 18, 12, 9);
        ctx.fillStyle = dark;
        ctx.fillRect(10, 18, 2, 9);
        ctx.fillStyle = light;
        ctx.fillRect(14, 18, 3, 9);

        // Neck (angled)
        ctx.fillStyle = color;
        ctx.fillRect(9, 15, 10, 3);

        // Head main shape
        ctx.fillStyle = color;
        ctx.fillRect(7, 7, 16, 8);
        ctx.fillStyle = dark;
        ctx.fillRect(7, 7, 16, 1);
        ctx.fillRect(7, 7, 1, 8);
        ctx.fillStyle = light;
        ctx.fillRect(10, 9, 4, 4);

        // Ears (two pointed)
        ctx.fillStyle = color;
        ctx.fillRect(7, 3, 3, 5);
        ctx.fillRect(11, 2, 2, 6);
        ctx.fillStyle = dark;
        ctx.fillRect(7, 3, 1, 5);
        ctx.fillRect(11, 2, 1, 6);

        // Mane (back of head)
        ctx.fillStyle = dark;
        ctx.fillRect(20, 8, 3, 6);
        ctx.fillRect(21, 6, 2, 2);

        // Snout/muzzle
        ctx.fillStyle = color;
        ctx.fillRect(20, 10, 5, 4);
        ctx.fillStyle = dark;
        ctx.fillRect(20, 10, 5, 1);
        ctx.fillStyle = light;
        ctx.fillRect(21, 12, 3, 2);

        // Nostril
        ctx.fillStyle = dark;
        ctx.fillRect(23, 11, 1, 1);

        // Eye
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(14, 9, 2, 2);
        ctx.fillStyle = '#000000';
        ctx.fillRect(15, 9, 1, 1);
    }

    function drawPawn(ctx, color) {
        var dark = shadeColor(color, -40);
        var light = shadeColor(color, 40);

        // Base platform
        ctx.fillStyle = dark;
        ctx.fillRect(8, 28, 16, 3);
        ctx.fillStyle = color;
        ctx.fillRect(9, 27, 14, 3);

        // Lower body
        ctx.fillStyle = color;
        ctx.fillRect(10, 22, 12, 5);
        ctx.fillStyle = dark;
        ctx.fillRect(10, 22, 2, 5);
        ctx.fillRect(20, 22, 2, 5);

        // Waist/collar
        ctx.fillStyle = dark;
        ctx.fillRect(11, 20, 10, 2);

        // Upper body (tapered)
        ctx.fillStyle = color;
        ctx.fillRect(12, 14, 8, 6);
        ctx.fillStyle = dark;
        ctx.fillRect(12, 14, 1, 6);
        ctx.fillRect(19, 14, 1, 6);
        ctx.fillStyle = light;
        ctx.fillRect(15, 14, 2, 6);

        // Neck
        ctx.fillStyle = color;
        ctx.fillRect(13, 12, 6, 2);

        // Head
        ctx.fillStyle = color;
        ctx.fillRect(11, 6, 10, 6);
        ctx.fillStyle = dark;
        ctx.fillRect(11, 6, 10, 1);
        ctx.fillRect(11, 6, 1, 6);
        ctx.fillStyle = light;
        ctx.fillRect(14, 7, 3, 4);

        // Head top (rounded)
        ctx.fillStyle = color;
        ctx.fillRect(12, 4, 8, 2);
        ctx.fillRect(13, 3, 6, 1);
        ctx.fillRect(14, 2, 4, 1);

        // Highlight on head
        ctx.fillStyle = light;
        ctx.fillRect(13, 4, 2, 1);
    }

    // Helper: shade a hex color
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
