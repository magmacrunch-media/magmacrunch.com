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

    // Online turn. The server offers a whole turn as one of state.moves, a
    // list of move sequences, and takes back the index of the one played. The
    // page picks it one checker at a time: `played` is the steps made so far,
    // and a step is legal when some sequence starts with played plus it.
    // Until 2026-10-14 the page never set its turn from the server, so no
    // checker could be selected online, and a click sent the first sequence
    // that merely CONTAINED the step, playing the rest of the turn unasked.
    var mp = { combos: [], played: [], myTurn: false, state: null };

    // ── Initialize ───────────────────────────────────────────────────────────
    function init() {
        cacheElements();
        setupEventListeners();
        Game.setOnStateChange(onStateChange);
        Game.setOnGameEnd(onGameEnd);
        Multiplayer.setOnStateUpdate(onMultiplayerStateUpdate);
        Multiplayer.setOnGameStart(onMultiplayerGameStart);
        Multiplayer.setOnGameEnd(onMultiplayerGameEnd);
        Multiplayer.setOnChatMessage(addChatMessage);
    }

    // Ids this game reads that BoardGameTemplate still does not emit. The lobby
    // ids it used to be missing are now part of the template; these remaining
    // ones are vestigial, cached but never written to. el() substitutes a
    // detached node for them and warns about anything unexpected.
    var UNRENDERED = [];

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
        elements.diceArea = el('diceArea');
        elements.die1 = el('die1');
        elements.die2 = el('die2');
        elements.doublingCube = el('doublingCube');
        elements.rollBtn = el('rollBtn');
        elements.message = el('gameMessage');
        elements.scoreValue = el('scoreValue');
        elements.turnIndicator = el('turnIndicator');
        elements.instructionsModal = el('instructionsModal');
        elements.closeInstructions = el('closeInstructions');
        elements.closeInstructionsBtn = el('closeInstructionsBtn');
        elements.creditsModal = el('creditsModal');
        elements.closeCredits = el('closeCredits');
        elements.closeCreditsBtn = el('closeCreditsBtn');
        elements.gameOverModal = el('gameOverModal');
        elements.gameOverTitle = el('gameOverTitle');
        elements.gameOverMessage = el('gameOverMessage');
        elements.gameOverScore = el('gameOverScore');
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
        elements.chatMessages = el('chatMessages');
        elements.chatInput = el('chatInput');
        elements.chatSendBtn = el('chatSendBtn');
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

    // ── Chat ─────────────────────────────────────────────────────────────────
    // Scoped to this match by the game server, not by the page. The panel's
    // stylesheet and its show/hide were already here; only the contents and
    // these two functions were missing, because chat was the arcade widget's
    // job until it was retired.

    function addChatMessage(from, text, color) {
        if (!elements.chatMessages) return;
        var div = document.createElement('div');
        div.className = from === 'System' ? 'chat-msg system' : 'chat-msg';
        var nameEl = document.createElement('span');
        nameEl.className = 'chat-name';
        nameEl.style.color = color || '#00f5ff';
        nameEl.textContent = from + ': ';
        div.appendChild(nameEl);
        div.appendChild(document.createTextNode(text));
        elements.chatMessages.appendChild(div);
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    }

    function sendChat() {
        if (!elements.chatInput) return;
        var text = elements.chatInput.value.trim();
        if (!text) return;
        Multiplayer.sendChat(text);
        // _handle_chat excludes the sender from its broadcast, so this echo is
        // what puts your own line in the panel.
        addChatMessage(localStorage.getItem('arcade_username') || 'You', text, '#39ff6e');
        elements.chatInput.value = '';
    }

    function setupEventListeners() {
        on(elements.chatSendBtn, 'click', sendChat);
        on(elements.chatInput, 'keypress', function(e) {
            if (e.key === 'Enter') sendChat();
        });
        on(elements.startGameBtn, 'click', startLocalGame);
        on(elements.onlineBtn, 'click', openLobby);
        on(elements.rollBtn, 'click', rollDice);
        on(elements.doublingCube, 'click', handleDouble);
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
        elements.lobbyRoomInput.style.display = '';
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
                var dot = document.createElement('span');
                dot.className = 'lobby-player-dot';
                dot.style.background = p.color;
                div.appendChild(dot);
                div.appendChild(document.createTextNode(p.name + (p.isHost ? ' (host)' : '')));
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
        elements.startScreen.style.display = 'none';
        elements.gameScreen.style.display = 'flex';
        elements.gameChat.style.display = 'flex';
        hideGameOver();
        isMultiplayer = true;
        applyServerState(state);
    }

    function onMultiplayerGameEnd(won, winnerName, winnerSide) {
        showMultiplayerGameOver(won, winnerName);
    }

    // Board, the renderer and the move rules all treat BG.PLAYER as the side
    // moving down to 0, drawn in cyan along the bottom. The server's 'ai' seat
    // gets its board turned around with the signs swapped, so it plays as
    // BG.PLAYER too. mirror() maps a board index either way.
    function seatIsAi() {
        return isMultiplayer && Multiplayer.getMySide() === BG.AI;
    }

    function mirror(p) {
        if (!seatIsAi()) return p;
        if (p >= 0 && p <= 25) return 25 - p;
        if (p === BG.OFF_PLAYER) return BG.OFF_AI;
        if (p === BG.OFF_AI) return BG.OFF_PLAYER;
        return p;
    }

    function boardForSeat(board) {
        var out = [];
        for (var i = 0; i < board.length; i++) out[mirror(i)] = seatIsAi() ? (-board[i] || 0) : board[i];
        return out;
    }

    function sameStep(a, b) {
        return a.from === b.from && a.to === b.to;
    }

    // The next steps open to this seat, each with a sequence it belongs to.
    function stepOptions() {
        var out = [];
        if (!mp.myTurn) return out;
        var n = mp.played.length;
        for (var i = 0; i < mp.combos.length; i++) {
            var c = mp.combos[i];
            if (c.length <= n) continue;
            var ok = true;
            for (var j = 0; j < n; j++) {
                if (!sameStep(c[j], mp.played[j])) { ok = false; break; }
            }
            if (ok) out.push({ index: i, move: c[n] });
        }
        return out;
    }

    // Play one step locally; send the turn once no sequence goes further.
    function playStep(move) {
        Board.applyMove(move);
        mp.played.push(move);
        if (stepOptions().length) {
            renderBoard();
            setMessage('Move another checker');
            return;
        }
        for (var i = 0; i < mp.combos.length; i++) {
            var c = mp.combos[i];
            if (c.length !== mp.played.length) continue;
            var ok = true;
            for (var j = 0; j < c.length; j++) {
                if (!sameStep(c[j], mp.played[j])) { ok = false; break; }
            }
            if (ok) {
                mp.myTurn = false;
                Multiplayer.sendMove(i);
                renderBoard();
                setMessage('Waiting for opponent...');
                return;
            }
        }
    }

    function canDoubleOnline() {
        var s = mp.state;
        if (!s || !mp.myTurn || mp.played.length || s.phase !== 'playing') return false;
        if (s.doublingCube >= 64) return false;
        return s.doublingOwner === null || s.doublingOwner === Multiplayer.getMySide();
    }

    // The player offered a double answers it here. There was no way to, so a
    // double offered online stalled the game for good.
    function showDoubleAnswer(cube) {
        setMessage('Opponent doubles to ' + cube * 2 + '. ');
        [['ACCEPT', Multiplayer.sendAcceptDouble], ['DECLINE (FORFEIT)', Multiplayer.sendRejectDouble]].forEach(function(b) {
            var btn = document.createElement('button');
            btn.className = 'start-btn';
            btn.textContent = b[0];
            btn.style.margin = '0 4px';
            btn.addEventListener('click', function() { b[1](); setMessage('Answer sent'); });
            elements.message.appendChild(btn);
        });
    }

    function applyServerState(state) {
        // Apply board from server, turned to this seat
        Board.setState(boardForSeat(state.board));
        mp.state = state;
        mp.played = [];
        mp.combos = (state.moves || []).map(function(combo) {
            return combo.map(function(m) {
                return { from: mirror(m.from), to: mirror(m.to), type: m.type, die: m.die };
            });
        });
        clearSelection();

        // Update dice display
        if (state.dice) {
            updateDieDisplay(elements.die1, state.dice[0]);
            updateDieDisplay(elements.die2, state.dice[1]);
        }

        // Doubling cube owner, in this seat's terms
        var cubeOwner = state.doublingOwner;
        if (cubeOwner && seatIsAi()) cubeOwner = cubeOwner === BG.AI ? BG.PLAYER : BG.AI;

        // Update stakes display
        elements.scoreValue.textContent = state.doublingCube || 1;

        // Set whose turn it is
        var mySide = Multiplayer.getMySide();
        var currentSide = state.currentTurnSide;

        mp.myTurn = currentSide === mySide && state.phase === 'playing';
        updateDoublingCube(cubeOwner, state.doublingCube);
        // The server rolls for both seats; the button is a local-game control.
        elements.rollBtn.disabled = true;

        if (currentSide === mySide) {
            elements.turnIndicator.textContent = 'YOUR TURN';
            elements.turnIndicator.style.color = BG.COLORS.checkerPlayer;
            setMessage('Select a checker to move');
        } else {
            elements.turnIndicator.textContent = 'OPPONENT\'S TURN';
            elements.turnIndicator.style.color = BG.COLORS.checkerAi;
            setMessage('Waiting for opponent...');
        }

        // Update game phase. The doubler is the side to move; the other answers.
        if (state.phase === 'doubling') {
            if (currentSide === mySide) {
                setMessage('Waiting for opponent to accept double...');
            } else {
                showDoubleAnswer(state.doublingCube);
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

        // The tray is where a checker goes when it bears off. Nothing could be
        // clicked for that, so no human could bear off, online or against the
        // AI, and only the AI could ever finish a game.
        var tray = offAreas.querySelector('.player-off');
        tray.style.cursor = 'pointer';
        tray.addEventListener('click', function() { handlePointClick(0); });
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

        if (isMultiplayer) {
            if (Board.getState()[point] > 0 && stepOptions().length) selectChecker(point);
            return;
        }

        if (currentPlayer !== BG.PLAYER) return;
        if (Game.getState() !== BG.STATE.MOVING) return;

        var board = Board.getState();
        if (board[point] <= 0) return; // Not player's checker

        selectChecker(point);
    }

    function handlePointClick(point) {
        var currentPlayer = Game.getCurrentPlayer();

        if (isMultiplayer) {
            var options = stepOptions();
            if (selectedChecker !== null) {
                for (var k = 0; k < options.length; k++) {
                    if (options[k].move.from === selectedChecker && options[k].move.to === point) {
                        clearSelection();
                        playStep(options[k].move);
                        return;
                    }
                }
            }
            // If no move found, try selecting a checker on this point
            if (point > 0 && point < 25 && Board.getState()[point] > 0 && options.length) {
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
        if (isMultiplayer) {
            if (Board.getBarCount(BG.PLAYER) > 0 && stepOptions().length) selectChecker(BG.BAR_PLAYER);
            return;
        }
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
        var moves = isMultiplayer
            ? stepOptions().map(function(o) { return [o.move]; })
            : Game.getMovesRemaining();
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

        // Highlight destination points; 0 is bearing off, into the tray
        highlightedMoves.forEach(function(move) {
            var pointEl = move.to === 0
                ? document.querySelector('.off-area.player-off')
                : document.querySelector('.point[data-point="' + move.to + '"]');
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

        document.querySelectorAll('.point.highlighted, .off-area.highlighted').forEach(function(p) {
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
            if (canDoubleOnline()) Multiplayer.sendDouble();
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

        if (isMultiplayer ? !canDoubleOnline() : !Dice.canDouble(BG.PLAYER)) {
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
            elements.gameOverMessage.textContent = 'Congratulations! You won the match!';
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
