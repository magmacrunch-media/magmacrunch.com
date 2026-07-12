/**
 * main.js — DOM wiring, rendering, event handlers
 */

var UI = (function() {

    // ── DOM References ───────────────────────────────────────────────────────
    var elements = {};
    var selectedChecker = null;
    var highlightedMoves = [];
    var diceAnimationInterval = null;
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
        elements.diceArea = document.getElementById('diceArea');
        elements.die1 = document.getElementById('die1');
        elements.die2 = document.getElementById('die2');
        elements.doublingCube = document.getElementById('doublingCube');
        elements.rollBtn = document.getElementById('rollBtn');
        elements.message = document.getElementById('gameMessage');
        elements.scoreValue = document.getElementById('scoreValue');
        elements.turnIndicator = document.getElementById('turnIndicator');
        elements.instructionsModal = document.getElementById('instructionsModal');
        elements.closeInstructions = document.getElementById('closeInstructions');
        elements.closeInstructionsBtn = document.getElementById('closeInstructionsBtn');
        elements.creditsModal = document.getElementById('creditsModal');
        elements.closeCredits = document.getElementById('closeCredits');
        elements.closeCreditsBtn = document.getElementById('closeCreditsBtn');
        elements.gameOverModal = document.getElementById('gameOverModal');
        elements.gameOverTitle = document.getElementById('gameOverTitle');
        elements.gameOverMessage = document.getElementById('gameOverMessage');
        elements.gameOverScore = document.getElementById('gameOverScore');
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
        elements.rollBtn.addEventListener('click', rollDice);
        elements.doublingCube.addEventListener('click', handleDouble);
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
        elements.lobbyRoomInput.style.display = '';
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
        } else if (update.type === 'action') {
            applyServerState(update.msg.state);
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

        // Update dice display
        if (state.dice) {
            updateDieDisplay(elements.die1, state.dice[0]);
            updateDieDisplay(elements.die2, state.dice[1]);
        }

        // Update doubling cube
        updateDoublingCube(state.doublingOwner, state.doublingCube);

        // Update stakes display
        elements.scoreValue.textContent = state.doublingCube || 1;

        // Set whose turn it is
        var mySide = Multiplayer.getMySide();
        var currentSide = state.currentTurnSide;

        if (currentSide === mySide) {
            elements.turnIndicator.textContent = 'YOUR TURN';
            elements.turnIndicator.style.color = BG.COLORS.checkerPlayer;
            setMessage('Select a checker to move');
            elements.rollBtn.disabled = false;
        } else {
            elements.turnIndicator.textContent = 'OPPONENT\'S TURN';
            elements.turnIndicator.style.color = BG.COLORS.checkerAi;
            setMessage('Waiting for opponent...');
            elements.rollBtn.disabled = true;
        }

        // Update game phase
        if (state.phase === 'doubling') {
            if (currentSide === mySide) {
                setMessage('Opponent wants to double! Accept or reject.');
            } else {
                setMessage('Waiting for opponent to accept double...');
            }
        }

        // Update off counts
        var playerOff = Board.getOffCount(BG.PLAYER);
        var aiOff = Board.getOffCount(BG.AI);

        renderBoard();
    }

    // ── State Change Handler ─────────────────────────────────────────────────
    function onStateChange(data) {
        if (isMultiplayer) return; // Handled by multiplayer
        renderBoard();
        updateUI();
        updateDice(data.dice);
        updateDoublingCube(data.doublingOwner, data.score);

        if (data.state === BG.STATE.MOVING && data.currentPlayer === BG.AI) {
            setTimeout(executeAIMove, 1000);
        }
    }

    function onGameEnd(winner) {
        if (isMultiplayer) return;
        showGameOver(winner);
    }

    // ── Board Rendering ──────────────────────────────────────────────────────
    function renderBoard() {
        var board = Board.getState();
        var container = elements.boardContainer;
        container.innerHTML = '';

        // Create board grid
        var boardEl = document.createElement('div');
        boardEl.className = 'board';

        // Top row (points 13-24)
        for (var i = 13; i <= 24; i++) {
            var point = createPoint(i, 'top', board[i]);
            boardEl.appendChild(point);
        }

        // Bar
        var bar = createBar(board);
        boardEl.appendChild(bar);

        // Bottom row (points 12-1)
        for (var i = 12; i >= 1; i--) {
            var point = createPoint(i, 'bottom', board[i]);
            boardEl.appendChild(point);
        }

        container.appendChild(boardEl);

        // Home labels — positioned to the right of the board
        var homeLabels = document.createElement('div');
        homeLabels.className = 'home-labels';
        homeLabels.innerHTML = 
            '<div class="home-label ai-home">AI HOME<br>(19-24)</div>' +
            '<div class="home-label player-home">YOUR HOME<br>(1-6)</div>';
        container.appendChild(homeLabels);

        // Off areas
        var offAreas = document.createElement('div');
        offAreas.className = 'off-areas';
        offAreas.innerHTML = 
            '<div class="off-area player-off" style="border-color: var(--bg-checker-player);">' +
                '<div class="off-label" style="color: var(--bg-checker-player);">YOU (cyan)</div>' +
                '<div class="off-count">' + Board.getOffCount(BG.PLAYER) + '/15</div>' +
            '</div>' +
            '<div class="off-area ai-off" style="border-color: var(--bg-checker-ai);">' +
                '<div class="off-label" style="color: var(--bg-checker-ai);">AI (magenta)</div>' +
                '<div class="off-count">' + Board.getOffCount(BG.AI) + '/15</div>' +
            '</div>';
        container.appendChild(offAreas);
    }

    function createPoint(num, position, value) {
        var point = document.createElement('div');
        var isInPlayerHome = num >= 1 && num <= 6;
        var isInAiHome = num >= 19 && num <= 24;
        
        var classes = 'point ' + position + ' ' + (num % 2 === 0 ? 'light' : 'dark');
        if (isInPlayerHome) classes += ' in-player-home';
        if (isInAiHome) classes += ' in-ai-home';
        
        point.className = classes;
        point.dataset.point = num;

        // Set grid column based on point number
        // Grid: cols 1-6 (left half), col 7 (bar), cols 8-13 (right half)
        var col;
        if (position === 'top') {
            // Top row: 13 14 15 16 17 18 | BAR | 19 20 21 22 23 24
            if (num <= 18) {
                col = num - 12; // 13→1, 14→2, ..., 18→6
            } else {
                col = num - 11; // 19→8, 20→9, ..., 24→13
            }
        } else {
            // Bottom row: 12 11 10 9 8 7 | BAR | 6 5 4 3 2 1
            if (num >= 7) {
                col = 13 - num; // 12→1, 11→2, ..., 7→6
            } else {
                col = 14 - num; // 6→8, 5→9, ..., 1→13
            }
        }
        point.style.gridColumn = col;

        // Point number
        var numEl = document.createElement('div');
        numEl.className = 'point-number';
        numEl.textContent = num;
        point.appendChild(numEl);

        // Checkers
        var count = Math.abs(value);
        var owner = value > 0 ? 'player' : (value < 0 ? 'ai' : null);

        if (count > 0) {
            var checkers = document.createElement('div');
            checkers.className = 'checkers';

            for (var i = 0; i < count; i++) {
                var checker = document.createElement('div');
                checker.className = 'checker ' + owner;
                checker.dataset.point = num;
                checker.addEventListener('click', handleCheckerClick);
                checkers.appendChild(checker);
            }

            point.appendChild(checkers);
        }

        // Click handler for point
        point.addEventListener('click', function() {
            handlePointClick(num);
        });

        return point;
    }

    function createBar(board) {
        var bar = document.createElement('div');
        bar.className = 'bar';

        var label = document.createElement('div');
        label.className = 'bar-label';
        label.textContent = 'BAR';
        bar.appendChild(label);

        // Player bar checkers
        var playerBarCount = board[BG.BAR_PLAYER];
        if (playerBarCount > 0) {
            var playerCheckers = document.createElement('div');
            playerCheckers.className = 'bar-checkers';
            for (var i = 0; i < playerBarCount; i++) {
                var checker = document.createElement('div');
                checker.className = 'bar-checker player';
                checker.addEventListener('click', function() {
                    handleBarClick(BG.PLAYER);
                });
                playerCheckers.appendChild(checker);
            }
            bar.appendChild(playerCheckers);
        }

        // AI bar checkers
        var aiBarCount = Math.abs(board[BG.BAR_AI]);
        if (aiBarCount > 0) {
            var aiCheckers = document.createElement('div');
            aiCheckers.className = 'bar-checkers';
            for (var i = 0; i < aiBarCount; i++) {
                var checker = document.createElement('div');
                checker.className = 'bar-checker ai';
                aiCheckers.appendChild(checker);
            }
            bar.appendChild(aiCheckers);
        }

        return bar;
    }

    // ── Event Handlers ───────────────────────────────────────────────────────
    function handleCheckerClick(e) {
        e.stopPropagation();
        var point = parseInt(e.target.dataset.point);
        var currentPlayer = Game.getCurrentPlayer();

        if (currentPlayer !== BG.PLAYER) return;
        if (Game.getState() !== BG.STATE.MOVING) return;

        var board = Board.getState();
        if (board[point] <= 0) return; // Not player's checker

        selectChecker(point);
    }

    function handlePointClick(point) {
        var currentPlayer = Game.getCurrentPlayer();

        if (isMultiplayer) {
            // In multiplayer, send the move to the server
            if (selectedChecker === null) return;
            var state = Multiplayer.getMySide ? Multiplayer.getMySide() : null;
            // Find the move index
            var moves = Game.getMovesRemaining();
            for (var i = 0; i < moves.length; i++) {
                for (var j = 0; j < moves[i].length; j++) {
                    if (moves[i][j].from === selectedChecker && moves[i][j].to === point) {
                        Multiplayer.sendMove(i);
                        clearSelection();
                        return;
                    }
                }
            }
            // If no move found, try selecting a checker on this point
            var board = Board.getState();
            if (board[point] > 0) {
                selectChecker(point);
            }
            return;
        }

        if (currentPlayer !== BG.PLAYER) return;
        if (Game.getState() !== BG.STATE.MOVING) return;
        if (selectedChecker === null) return;

        // Try to find a move to this point
        var moves = Game.getMovesRemaining();
        for (var i = 0; i < moves.length; i++) {
            for (var j = 0; j < moves[i].length; j++) {
                if (moves[i][j].from === selectedChecker && moves[i][j].to === point) {
                    Game.executeMove(i);
                    clearSelection();
                    return;
                }
            }
        }

        // If no move found, try selecting a checker on this point
        var board = Board.getState();
        if (board[point] > 0) {
            selectChecker(point);
        }
    }

    function handleBarClick(player) {
        if (player !== BG.PLAYER) return;
        if (Game.getCurrentPlayer() !== BG.PLAYER) return;
        if (Game.getState() !== BG.STATE.MOVING) return;

        var barCount = Board.getBarCount(BG.PLAYER);
        if (barCount > 0) {
            selectChecker(BG.BAR_PLAYER);
        }
    }

    function selectChecker(point) {
        clearSelection();
        selectedChecker = point;

        // Highlight the selected checker
        var checkers = document.querySelectorAll('.checker[data-point="' + point + '"]');
        checkers.forEach(function(c) {
            c.classList.add('selected');
        });

        // Show legal moves for this checker
        showLegalMoves(point);
    }

    function showLegalMoves(fromPoint) {
        var moves = Game.getMovesRemaining();
        highlightedMoves = [];

        for (var i = 0; i < moves.length; i++) {
            for (var j = 0; j < moves[i].length; j++) {
                if (moves[i][j].from === fromPoint) {
                    highlightedMoves.push({
                        moveIndex: i,
                        to: moves[i][j].to,
                        type: moves[i][j].type
                    });
                }
            }
        }

        // Highlight destination points
        highlightedMoves.forEach(function(move) {
            var pointEl = document.querySelector('.point[data-point="' + move.to + '"]');
            if (pointEl) {
                pointEl.classList.add('highlighted');
            }
        });
    }

    function clearSelection() {
        selectedChecker = null;
        highlightedMoves = [];

        document.querySelectorAll('.checker.selected').forEach(function(c) {
            c.classList.remove('selected');
        });

        document.querySelectorAll('.point.highlighted').forEach(function(p) {
            p.classList.remove('highlighted');
        });
    }

    // ── Dice ─────────────────────────────────────────────────────────────────
    function rollDice() {
        if (Game.getCurrentPlayer() !== BG.PLAYER) return;
        if (Game.getState() !== BG.STATE.MOVING) return;

        elements.rollBtn.disabled = true;
        Dice.setRolling(true);

        // Animate dice
        var frames = 0;
        diceAnimationInterval = setInterval(function() {
            var d1 = Dice.getRandomDie();
            var d2 = Dice.getRandomDie();
            updateDieDisplay(elements.die1, d1);
            updateDieDisplay(elements.die2, d2);
            frames++;

            if (frames >= BG.DICE_ANIMATION_FRAMES) {
                clearInterval(diceAnimationInterval);
                Dice.setRolling(false);
                var values = Dice.getValues();
                updateDieDisplay(elements.die1, values[0]);
                updateDieDisplay(elements.die2, values[1]);
            }
        }, BG.DICE_ANIMATION_SPEED);
    }

    function updateDice(dice) {
        if (dice[0] > 0 && dice[1] > 0) {
            updateDieDisplay(elements.die1, dice[0]);
            updateDieDisplay(elements.die2, dice[1]);
            elements.rollBtn.disabled = true;
        } else {
            elements.rollBtn.disabled = false;
        }
    }

    function updateDieDisplay(dieEl, value) {
        dieEl.setAttribute('data-value', value);
        dieEl.innerHTML = '';

        for (var i = 0; i < value; i++) {
            var dot = document.createElement('div');
            dot.className = 'die-dot';
            dieEl.appendChild(dot);
        }
    }

    // ── Doubling Cube ────────────────────────────────────────────────────────
    function handleDouble() {
        if (isMultiplayer) {
            Multiplayer.sendDouble();
            return;
        }

        if (Game.getCurrentPlayer() !== BG.PLAYER) return;
        if (!Dice.canDouble(BG.PLAYER)) return;

        if (Game.requestDouble()) {
            // AI decides whether to accept
            setTimeout(function() {
                // AI always accepts for now (can be made smarter)
                Game.acceptDouble();
            }, 500);
        }
    }

    function updateDoublingCube(owner, value) {
        elements.doublingCube.textContent = value;
        elements.doublingCube.className = 'doubling-cube';

        if (owner === BG.PLAYER) {
            elements.doublingCube.classList.add('player-owned');
        } else if (owner === BG.AI) {
            elements.doublingCube.classList.add('ai-owned');
        }

        if (!Dice.canDouble(BG.PLAYER)) {
            elements.doublingCube.classList.add('disabled');
        }
    }

    // ── UI Updates ───────────────────────────────────────────────────────────
    function updateUI() {
        var state = Game.getState();
        var currentPlayer = Game.getCurrentPlayer();
        var score = Game.getScore();

        elements.scoreValue.textContent = score;

        if (currentPlayer === BG.PLAYER) {
            elements.turnIndicator.textContent = 'YOUR TURN';
            elements.turnIndicator.style.color = BG.COLORS.checkerPlayer;
        } else {
            elements.turnIndicator.textContent = 'AI THINKING...';
            elements.turnIndicator.style.color = BG.COLORS.checkerAi;
        }

        if (state === BG.STATE.MOVING) {
            if (currentPlayer === BG.PLAYER) {
                setMessage('Select a checker to move');
            } else {
                setMessage('AI is thinking...');
            }
        }
    }

    function setMessage(text, type) {
        elements.message.textContent = text;
        elements.message.className = 'game-message' + (type ? ' ' + type : '');
    }

    // ── AI Move ──────────────────────────────────────────────────────────────
    function executeAIMove() {
        Game.executeAIMove();
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
        if (winner === BG.PLAYER) {
            elements.gameOverTitle.textContent = 'YOU WIN!';
            elements.gameOverTitle.className = 'game-over-title win';
            elements.gameOverMessage.textContent = 'Congratulations! You beat the AI!';
        } else {
            elements.gameOverTitle.textContent = 'AI WINS';
            elements.gameOverTitle.className = 'game-over-title lose';
            elements.gameOverMessage.textContent = 'Better luck next time!';
        }

        elements.gameOverScore.textContent = 'Score: ' + Game.getScore() + 'x';
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
        elements.gameOverScore.textContent = '';
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
