/**
 * ui.js — Main controller for Aggravation
 * Supports both local AI and online multiplayer.
 */

var UI = (function() {
    'use strict';

    var els = {};
    var humanColor = null;
    var gameActive = false;
    var gameMode = null;  // 'local' or 'online'
    var aiTimers = [];
    var legalMoves = [];

    var SLOT_COLORS = {
        red: '#ff3d6e', blue: '#00f5ff', green: '#39ff6e',
        yellow: '#ffe03a', purple: '#c45fff', orange: '#ff7c1f',
    };

    function cacheDom() {
        els.startScreen    = document.getElementById('startScreen');
        els.gameScreen     = document.getElementById('gameScreen');
        els.lobbyOverlay   = document.getElementById('lobbyOverlay');
        els.localBtn       = document.getElementById('localBtn');
        els.playerCount    = document.getElementById('playerCount');
        els.nameInput      = document.getElementById('nameInput');
        els.roomInput      = document.getElementById('roomInput');
        els.joinBtn        = document.getElementById('joinBtn');
        els.createBtn      = document.getElementById('createBtn');
        els.spectateBtn    = document.getElementById('spectateBtn');
        els.startGameBtn   = document.getElementById('startGameBtn');
        els.lobbyPlayers   = document.getElementById('lobbyPlayers');
        els.lobbyStatus    = document.getElementById('lobbyStatus');
        els.lobbyRoomCode  = document.getElementById('lobbyRoomCode');
        els.chatMessages   = document.getElementById('chatMessages');
        els.chatInput      = document.getElementById('chatInput');
        els.chatBtn        = document.getElementById('chatBtn');
        els.lobbyQuitBtn   = document.getElementById('lobbyQuitBtn');
        els.boardCanvas    = document.getElementById('boardCanvas');
        els.rollBtn        = document.getElementById('rollBtn');
        els.diceDisplay    = document.getElementById('diceDisplay');
        els.turnInfo       = document.getElementById('turnInfo');
        els.statusMsg2     = document.getElementById('statusMsg2');
        els.scoresBar      = document.getElementById('scoresBar');
        els.chatMessages2  = document.getElementById('chatMessages2');
        els.chatInput2     = document.getElementById('chatInput2');
        els.chatBtn2       = document.getElementById('chatBtn2');
        els.quitBtn        = document.getElementById('quitBtn');
        els.gameOverModal  = document.getElementById('gameOverModal');
        els.winnerText     = document.getElementById('winnerText');
        els.playAgainBtn   = document.getElementById('playAgainBtn');
    }

    function init() {
        cacheDom();
        bindEvents();
        setupNetworkCallbacks();
        showStartScreen();
    }

    function bindEvents() {
        // Start screen — local
        els.localBtn.addEventListener('click', handleLocalStart);

        // Start screen — online
        els.joinBtn.addEventListener('click', handleJoin);
        els.createBtn.addEventListener('click', handleCreate);
        els.spectateBtn.addEventListener('click', handleSpectate);

        // Lobby
        els.startGameBtn.addEventListener('click', handleStartGame);
        els.chatBtn.addEventListener('click', handleChat);
        els.chatInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') handleChat(); });
        els.lobbyQuitBtn.addEventListener('click', handleLobbyQuit);
        els.nameInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') handleJoin(); });

        // Game
        els.rollBtn.addEventListener('click', handleRoll);
        els.boardCanvas.addEventListener('click', handleBoardClick);
        els.quitBtn.addEventListener('click', handleQuit);
        els.playAgainBtn.addEventListener('click', handlePlayAgain);
        els.chatBtn2.addEventListener('click', handleChat2);
        els.chatInput2.addEventListener('keydown', function(e) { if (e.key === 'Enter') handleChat2(); });

        document.addEventListener('keydown', function(e) {
            if (e.key === ' ' || e.key === 'Enter') {
                if (els.startScreen.style.display !== 'none' && els.startScreen.style.display !== '') {
                    return; // Don't intercept start screen
                }
                if (gameActive && !els.rollBtn.disabled) {
                    e.preventDefault();
                    handleRoll();
                }
            }
        });
    }

    // ── Network callbacks ──────────────────────────────────────────────────────

    function setupNetworkCallbacks() {
        Network.setCallbacks({
            onWelcome: function(msg) {
                updateStatus('Connected! Room: ' + (msg.room || '----'));
                showLobby(msg);
            },

            onLobbyUpdate: function(msg) {
                updateLobby(msg);
            },

            onGameStarted: function(msg) {
                gameMode = 'online';
                gameActive = true;

                // Initialize GameState with server data
                var turnOrder = msg.turnOrder || [];
                var playerNames = msg.playerNames || {};
                var colorMap = msg.colorMap || {};
                var playerTypes = {};
                var mySlot = Network.getMySlot();

                turnOrder.forEach(function(slot) {
                    playerTypes[slot] = (slot === mySlot) ? 'human' : 'human'; // all human in online
                });

                GameState.reset();
                GameState.applyAction({
                    type: GameState.ActionTypes.START_GAME,
                    turnOrder: turnOrder,
                    colorMap: colorMap,
                    playerNames: playerNames,
                    playerTypes: playerTypes,
                });

                showGameScreen();
                var state = GameState.getState();
                BoardRenderer.render(els.boardCanvas, state.pawns, state.colorMap);
                updateScores(state);
                updateTurnInfo(state);
            },

            onDiceRolled: function(msg) {
                GameState.applyAction({ type: GameState.ActionTypes.ROLL_DICE, dice: msg.dice });
                showDice(msg.dice);

                var mySlot = Network.getMySlot();
                if (msg.slot === mySlot) {
                    var state = GameState.getState();
                    legalMoves = AC.getLegalMoves(mySlot, msg.dice, state.pawns);
                    if (legalMoves.length === 0) {
                        updateStatus2('No legal moves');
                        setTimeout(function() { Network.skipTurn(); }, 1000);
                    } else {
                        updateStatus2('Choose a marble');
                        highlightLegalMoves();
                    }
                }
            },

            onTurnUpdate: function(msg) {
                var state = GameState.getState();
                var newTurnSlot = msg.slot;

                // Only advance if the turn actually changed (avoid double-advance on game start)
                if (state.currentTurn !== newTurnSlot) {
                    GameState.applyAction({ type: GameState.ActionTypes.ADVANCE_TURN });
                }

                state = GameState.getState();
                updateTurnInfo(state);
                renderBoard();

                var mySlot = Network.getMySlot();
                var isMyTurn = msg.slot === mySlot;
                els.rollBtn.disabled = !isMyTurn;
                legalMoves = [];
                BoardRenderer.clearHighlights();

                if (isMyTurn) {
                    updateStatus2('Your turn — roll!');
                }
            },

            onPawnMoved: function(msg) {
                var newPos = msg.newPos;
                GameState.applyAction({
                    type: GameState.ActionTypes.MOVE_PAWN,
                    color: msg.color,
                    pawnIndex: msg.pawnIndex,
                    newPos: newPos,
                    capture: msg.capture || null,
                });
                var state = GameState.getState();
                BoardRenderer.render(els.boardCanvas, state.pawns, state.colorMap);
                updateScores(state);

                if (msg.capture) {
                    updateStatus2(msg.color + ' captured ' + msg.capture.color);
                }
            },

            onSystem: function(msg) {
                addChatMessage('system', '', msg.text, els.chatMessages);
            },

            onChat: function(msg) {
                addChatMessage(msg.from, msg.color, msg.text, els.chatMessages);
            },

            onError: function(text) {
                updateStatus(text);
            },

            onPlayerQuit: function(msg) {
                var quitColor = msg.color;
                if (quitColor) {
                    GameState.applyAction({ type: GameState.ActionTypes.PLAYER_LEAVE, color: quitColor });
                }
                addChatMessage('system', '', msg.playerName + ' left', els.chatMessages);

                if (!gameActive) {
                    showStartScreen();
                }
            },

            onPromotedHost: function() {
                updateStatus('You are now host');
            },

            onRejected: function(msg) {
                updateStatus(msg.reason || 'Rejected');
            },

            onDisconnect: function() {
                updateStatus('Disconnected');
                if (gameActive) {
                    updateStatus2('Disconnected from server');
                }
            },

            onGameOver: function(msg) {
                var winnerColor = msg.winnerSlot;
                showGameOver(winnerColor);
            },

            onSpectator: function(msg) {
                updateStatus('Spectating: ' + msg.playerName);
                showGameScreen();
            },
        });
    }

    // ── Start screen actions ───────────────────────────────────────────────────

    function handleLocalStart() {
        gameMode = 'local';
        var count = parseInt(els.playerCount.value) || 4;
        if (count < 2) count = 2;
        if (count > 6) count = 6;

        var turnOrder = AC.COLORS.slice(0, count);
        var playerNames = {};
        var playerTypes = {};
        var colorMap = {};

        turnOrder.forEach(function(c, i) {
            colorMap[c] = SLOT_COLORS[c];
            if (i === 0) {
                playerNames[c] = 'YOU';
                playerTypes[c] = 'human';
                humanColor = c;
            } else {
                playerNames[c] = c.toUpperCase();
                playerTypes[c] = 'ai';
            }
        });

        GameState.reset();
        GameState.applyAction({
            type: GameState.ActionTypes.START_GAME,
            turnOrder: turnOrder,
            colorMap: colorMap,
            playerNames: playerNames,
            playerTypes: playerTypes,
        });

        gameActive = true;
        showGameScreen();
        renderBoard();

        var state = GameState.getState();
        updateTurnInfo(state);
        updateScores(state);
        updateStatus2('Roll the dice!');
        els.rollBtn.disabled = false;
    }

    function handleJoin() {
        var name = els.nameInput.value.trim() || 'Player';
        var room = els.roomInput.value.trim().toUpperCase();
        Network.connect();
        if (room) {
            setTimeout(function() { Network.joinRoom(name, '', room); }, 200);
        } else {
            setTimeout(function() { Network.join(name, ''); }, 200);
        }
    }

    function handleCreate() {
        var name = els.nameInput.value.trim() || 'Player';
        Network.connect();
        setTimeout(function() { Network.createRoom(name, ''); }, 200);
    }

    function handleSpectate() {
        var name = els.nameInput.value.trim() || 'Spectator';
        Network.connect();
        setTimeout(function() { Network.spectate(name); }, 200);
    }

    // ── Lobby actions ──────────────────────────────────────────────────────────

    function showLobby(msg) {
        els.startScreen.style.display = 'none';
        els.gameScreen.style.display = 'none';
        els.lobbyOverlay.style.display = 'flex';
        if (msg) {
            els.lobbyRoomCode.textContent = msg.room || '----';
        }
    }

    function updateLobby(msg) {
        if (msg.playersInfo) {
            els.lobbyPlayers.innerHTML = msg.playersInfo.map(function(p) {
                var dot = '<span class="player-dot" style="background:' + p.color + '"></span>';
                var host = p.isHost ? ' <span class="host-badge">HOST</span>' : '';
                var slot = p.slot ? ' <span class="slot-badge">' + p.slot.toUpperCase() + '</span>' : '';
                return '<div class="lobby-player">' + dot + ' ' + p.name + host + slot + '</div>';
            }).join('');
        }
        var count = msg.playerCount || 0;
        var max = msg.maxPlayers || 6;
        els.lobbyStatus.textContent = count + ' / ' + max + ' players';

        if (els.startGameBtn) {
            els.startGameBtn.style.display = (msg.canStart && Network.getIsHost()) ? 'block' : 'none';
        }
    }

    function handleStartGame() {
        Network.startGame();
    }

    function handleLobbyQuit() {
        Network.quit();
        showStartScreen();
    }

    function handleChat() {
        var text = els.chatInput.value.trim();
        if (!text) return;
        var hex = SLOT_COLORS[Network.getMyColor()] || '#aaa';
        Network.chat(text);
        addChatMessage(Network.getMyName(), hex, text, els.chatMessages);
        els.chatInput.value = '';
    }

    function addChatMessage(from, color, text, container) {
        var div = document.createElement('div');
        div.className = 'chat-msg';
        var nameSpan = document.createElement('span');
        nameSpan.className = 'chat-name';
        nameSpan.style.color = color || '#8a7fa8';
        nameSpan.textContent = from + ': ';
        div.appendChild(nameSpan);
        var textSpan = document.createElement('span');
        textSpan.textContent = text;
        div.appendChild(textSpan);
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    // ── Game actions ───────────────────────────────────────────────────────────

    function handleRoll() {
        if (!gameActive) return;
        var state = GameState.getState();
        var color = state.currentTurn;

        if (gameMode === 'local') {
            if (state.playerTypes[color] !== 'human') return;
            els.rollBtn.disabled = true;
            var value = Dice.roll();
            GameState.applyAction({ type: GameState.ActionTypes.ROLL_DICE, dice: value });
            showDice(value);
            legalMoves = AC.getLegalMoves(color, value, state.pawns);
            if (legalMoves.length === 0) {
                updateStatus2('No moves — turn passed');
                setTimeout(function() { advanceTurn(); }, 1000);
            } else {
                updateStatus2('Choose a marble to move');
                highlightLegalMoves();
            }
        } else {
            els.rollBtn.disabled = true;
            Network.rollDice();
        }
    }

    function handleBoardClick(e) {
        if (!gameActive || legalMoves.length === 0) return;

        if (gameMode === 'online') {
            var state = GameState.getState();
            var mySlot = Network.getMySlot();
            if (state.currentTurn !== mySlot) return;
        }

        var rect = els.boardCanvas.getBoundingClientRect();
        var scaleX = els.boardCanvas.width / rect.width;
        var scaleY = els.boardCanvas.height / rect.height;
        var canvasX = (e.clientX - rect.left) * scaleX;
        var canvasY = (e.clientY - rect.top) * scaleY;

        var clickedMove = BoardRenderer.handleClick(canvasX, canvasY);
        if (clickedMove) executeMove(clickedMove);
    }

    function executeMove(move) {
        var state = GameState.getState();
        var color = state.currentTurn;

        if (gameMode === 'local') {
            GameState.applyAction({
                type: GameState.ActionTypes.MOVE_PAWN,
                color: color,
                pawnIndex: move.pawnIndex,
                newPos: move.newPos,
                capture: move.capture || null,
            });
            legalMoves = [];
            BoardRenderer.clearHighlights();
            renderBoard();
            state = GameState.getState();
            updateScores(state);

            if (state.phase === 'finished') {
                showGameOver(state.winner);
                return;
            }

            if (move.capture) {
                updateStatus2(color.toUpperCase() + ' captured ' + move.capture.color + '!');
            }

            if (state.dice === 6 && state.consecutiveSixes < 3) {
                updateStatus2('Rolled 6 — extra turn!');
                setTimeout(function() {
                    state.diceRolled = false;
                    GameState.setState(state);
                    updateTurnInfo(state);
                    if (state.playerTypes[state.currentTurn] === 'human') {
                        els.rollBtn.disabled = false;
                        updateStatus2('Extra turn — roll again!');
                    } else {
                        scheduleAiTurn(state.currentTurn);
                    }
                }, 800);
            } else {
                setTimeout(function() { advanceTurn(); }, 600);
            }
        } else {
            // Online mode
            Network.movePawn(move.pawnIndex, move.newPos, move.capture || null);
            legalMoves = [];
            BoardRenderer.clearHighlights();
        }
    }

    function highlightLegalMoves() {
        if (legalMoves.length === 0) return;
        var state = GameState.getState();
        var color = state.currentTurn;
        if (gameMode === 'online') {
            color = Network.getMySlot();
        }
        BoardRenderer.highlightMoves(legalMoves, color);
    }

    // ── Turn management (local) ────────────────────────────────────────────────

    function advanceTurn() {
        GameState.applyAction({ type: GameState.ActionTypes.ADVANCE_TURN });
        var state = GameState.getState();
        updateTurnInfo(state);
        renderBoard();
        updateScores(state);

        if (state.playerTypes[state.currentTurn] === 'human') {
            els.rollBtn.disabled = false;
            updateStatus2('Your turn — roll the dice!');
        } else {
            scheduleAiTurn(state.currentTurn);
        }
    }

    function scheduleAiTurn(color) {
        updateStatus2(color.toUpperCase() + ' is thinking...');
        var timer = setTimeout(function() {
            if (!gameActive) return;
            aiDoTurn(color);
        }, AI.getThinkDelay());
        aiTimers.push(timer);
    }

    function aiDoTurn(color) {
        var value = Dice.roll();
        GameState.applyAction({ type: GameState.ActionTypes.ROLL_DICE, dice: value });
        showDice(value);

        var state = GameState.getState();
        var moves = AC.getLegalMoves(color, value, state.pawns);

        if (moves.length === 0) {
            updateStatus2(color.toUpperCase() + ' has no moves');
            setTimeout(function() { advanceTurn(); }, 800);
            return;
        }

        var chosen = AI.chooseMove(color, value, state.pawns);
        setTimeout(function() {
            if (!gameActive) return;
            GameState.applyAction({
                type: GameState.ActionTypes.MOVE_PAWN,
                color: color,
                pawnIndex: chosen.pawnIndex,
                newPos: chosen.newPos,
                capture: chosen.capture || null,
            });
            renderBoard();
            state = GameState.getState();
            updateScores(state);

            if (state.phase === 'finished') {
                showGameOver(state.winner);
                return;
            }

            if (chosen.capture) {
                updateStatus2(color.toUpperCase() + ' captured ' + chosen.capture.color + '!');
            }

            if (state.dice === 6 && state.consecutiveSixes < 3) {
                setTimeout(function() {
                    var s = GameState.getState();
                    s.diceRolled = false;
                    GameState.setState(s);
                    scheduleAiTurn(color);
                }, 600);
            } else {
                setTimeout(function() { advanceTurn(); }, 600);
            }
        }, 400);
    }

    // ── UI updates ────────────────────────────────────────────────────────────

    function renderBoard() {
        var state = GameState.getState();
        BoardRenderer.render(els.boardCanvas, state.pawns, state.colorMap);
    }

    function showDice(value) {
        els.diceDisplay.textContent = value;
        els.diceDisplay.classList.add('rolled');
        setTimeout(function() { els.diceDisplay.classList.remove('rolled'); }, 500);
    }

    function updateTurnInfo(state) {
        var color = state.currentTurn;
        var name = state.playerNames[color] || color;
        var isHuman = gameMode === 'local' ? state.playerTypes[color] === 'human' : color === Network.getMySlot();
        els.turnInfo.textContent = isHuman ? 'YOUR TURN' : name.toUpperCase();
        els.turnInfo.style.color = SLOT_COLORS[color] || '#ffe03a';
    }

    function updateStatus(text) {
        var el = document.getElementById('statusMsg');
        if (el) el.textContent = text;
    }

    function updateStatus2(text) {
        if (els.statusMsg2) els.statusMsg2.textContent = text;
    }

    function updateScores(state) {
        var html = '';
        state.turnOrder.forEach(function(color) {
            var score = state.scores[color] || 0;
            var name = state.playerNames[color] || color;
            var hex = SLOT_COLORS[color];
            html += '<div class="score-item">' +
                '<div class="score-dot" style="background:' + hex + '"></div>' +
                '<span class="score-name" style="color:' + hex + '">' + name + '</span>' +
                '<span class="score-value">' + score + '/' + AC.NUM_PAWNS + '</span>' +
                '</div>';
        });
        els.scoresBar.innerHTML = html;
    }

    function showGameOver(winner) {
        gameActive = false;
        clearAiTimers();
        var name = GameState.getState().playerNames[winner] || winner;
        var isHuman = winner === humanColor;
        els.winnerText.innerHTML = isHuman ?
            '<span style="color:' + SLOT_COLORS[winner] + '">YOU WIN!</span>' :
            '<span style="color:' + SLOT_COLORS[winner] + '">' + name + '</span> WINS!';
        els.gameOverModal.classList.add('active');
    }

    function handlePlayAgain() {
        els.gameOverModal.classList.remove('active');
        gameActive = false;
        clearAiTimers();
        legalMoves = [];
        humanColor = null;
        gameMode = null;
        GameState.reset();
        showStartScreen();
    }

    function handleQuit() {
        if (gameMode === 'online') {
            Network.quit();
        }
        gameActive = false;
        clearAiTimers();
        legalMoves = [];
        humanColor = null;
        gameMode = null;
        GameState.reset();
        showStartScreen();
    }

    function handleChat2() {
        if (gameMode === 'online') {
            var text = els.chatInput2.value.trim();
            if (!text) return;
            var hex = SLOT_COLORS[Network.getMyColor()] || '#aaa';
            Network.chat(text);
            addChatMessage(Network.getMyName(), hex, text, els.chatMessages2);
            els.chatInput2.value = '';
        }
    }

    // ── Screen management ─────────────────────────────────────────────────────

    function showStartScreen() {
        els.startScreen.style.display = 'flex';
        els.gameScreen.style.display = 'none';
        els.lobbyOverlay.style.display = 'none';
        els.gameOverModal.classList.remove('active');
    }

    function showGameScreen() {
        els.startScreen.style.display = 'none';
        els.lobbyOverlay.style.display = 'none';
        els.gameScreen.style.display = 'flex';
    }

    function clearAiTimers() {
        aiTimers.forEach(clearTimeout);
        aiTimers = [];
    }

    return { init: init };
})();

document.addEventListener('DOMContentLoaded', function() {
    UI.init();
});
