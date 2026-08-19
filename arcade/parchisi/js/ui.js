/**
 * ui.js — Controlador principal de Parchis
 */

var UI = (function() {
    'use strict';

    var mySlot = null;
    var selectedPawn = null;
    var legalMoves = [];
    var gameActive = false;

    var els = {};

    function cacheDom() {
        els.startScreen   = document.getElementById('startScreen');
        els.gameScreen    = document.getElementById('gameScreen');
        els.lobbyOverlay  = document.getElementById('lobbyOverlay');
        els.nameInput     = document.getElementById('nameInput');
        els.roomInput     = document.getElementById('roomInput');
        els.joinBtn       = document.getElementById('joinBtn');
        els.createBtn     = document.getElementById('createBtn');
        els.spectateBtn   = document.getElementById('spectateBtn');
        els.lobbyPlayers  = document.getElementById('lobbyPlayers');
        els.lobbyStatus   = document.getElementById('lobbyStatus');
        els.startGameBtn  = document.getElementById('startGameBtn');
        els.boardCanvas   = document.getElementById('boardCanvas');
        els.rollBtn       = document.getElementById('rollBtn');
        els.diceDisplay   = document.getElementById('diceDisplay');
        els.turnInfo      = document.getElementById('turnInfo');
        els.statusMsg     = document.getElementById('statusMsg');
        els.chatInput     = document.getElementById('chatInput');
        els.chatBtn       = document.getElementById('chatBtn');
        els.chatMessages  = document.getElementById('chatMessages');
        els.quitBtn       = document.getElementById('quitBtn');
        els.gameOverModal = document.getElementById('gameOverModal');
        els.winnerText    = document.getElementById('winnerText');
        els.playAgainBtn  = document.getElementById('playAgainBtn');
        els.debugLog      = document.getElementById('debugLog');
        els.roomCodeDisplay = document.getElementById('roomCodeDisplay');
        els.settingsBtn   = document.getElementById('settingsBtn');
        els.settingsModal = document.getElementById('settingsModal');
        els.closeSettings = document.getElementById('closeSettings');
    }

    var SLOT_COLORS = {
        red:    '#AA151B',
        blue:   '#4059c8',
        green:  '#39d353',
        yellow: '#F1BF00',
    };

    function injectColorMap(colorMap) {
        var root = document.documentElement;
        PC.COLORS.forEach(function(slot) {
            var hex = (colorMap && colorMap[slot]) || SLOT_COLORS[slot];
            root.style.setProperty('--slot-' + slot, hex);
        });
        var activeColors = [];
        PC.COLORS.forEach(function(slot) {
            if (colorMap && colorMap[slot]) activeColors.push(colorMap[slot]);
        });
        if (activeColors.length > 0) {
            root.style.setProperty('--board-center', blendColors(activeColors));
        }
    }

    function blendColors(hexColors) {
        var r = 0, g = 0, b = 0;
        hexColors.forEach(function(hex) {
            var c = hexToRgb(hex);
            r += c.r; g += c.g; b += c.b;
        });
        r = Math.round(r / hexColors.length);
        g = Math.round(g / hexColors.length);
        b = Math.round(b / hexColors.length);
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    function hexToRgb(hex) {
        hex = hex.replace('#', '');
        return {
            r: parseInt(hex.substring(0, 2), 16),
            g: parseInt(hex.substring(2, 4), 16),
            b: parseInt(hex.substring(4, 6), 16),
        };
    }

    function init() {
        cacheDom();
        bindEvents();
        setupNetworkCallbacks();
        showStartScreen();
        // Init i18n and settings modal
        I18n.init();
    }

    function bindEvents() {
        els.joinBtn.addEventListener('click', handleJoin);
        els.createBtn.addEventListener('click', handleCreate);
        els.spectateBtn.addEventListener('click', handleSpectate);
        els.startGameBtn.addEventListener('click', handleStartGame);
        els.rollBtn.addEventListener('click', handleRoll);
        els.boardCanvas.addEventListener('click', handleBoardClick);
        els.quitBtn.addEventListener('click', handleQuit);
        els.playAgainBtn.addEventListener('click', handlePlayAgain);
        els.chatBtn.addEventListener('click', handleChat);
        els.chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') handleChat();
        });
        els.nameInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') handleJoin();
        });
        // Settings
        els.settingsBtn.addEventListener('click', function() {
            els.settingsModal.classList.add('active');
        });
        els.closeSettings.addEventListener('click', function() {
            els.settingsModal.classList.remove('active');
        });
        els.settingsModal.addEventListener('click', function(e) {
            if (e.target === els.settingsModal) els.settingsModal.classList.remove('active');
        });
    }

    function setupNetworkCallbacks() {
        Network.setCallbacks({
            onWelcome: function(msg) {
                mySlot = msg.slot;
                debug('Joined as ' + msg.playerName + ' (slot: ' + msg.slot + ')');
                if (els.roomCodeDisplay) els.roomCodeDisplay.textContent = msg.room || '----';
                showLobby();
            },

            onLobbyUpdate: function(msg) {
                updateLobby(msg);
            },

            onGameStarted: function(msg) {
                debug('Game started!');
                gameActive = true;
                if (msg.colorMap) injectColorMap(msg.colorMap);
                showGameScreen();
                var state = GameState.getState();
                if (state) BoardRenderer.render(els.boardCanvas, state.pawns, state.colorMap);
            },

            onDiceRolled: function(msg) {
                GameState.applyAction({
                    type: GameState.ActionTypes.ROLL_DICE,
                    dice: msg.dice,
                });
                showDice(msg.dice);
                updateStatus(msg.playerName + ' rolled ' + msg.dice[0] + ' + ' + msg.dice[1] +
                    (msg.dice[0] === msg.dice[1] ? ' (' + I18n.t('doubles') + ')' : ''));

                if (msg.playerName === Network.getMyName()) {
                    var state = GameState.getState();
                    legalMoves = PC.getLegalMoves(
                        mySlot, msg.dice, state.pawns, state.consecutiveDoubles
                    );
                    if (legalMoves.length === 0) {
                        updateStatus(I18n.t('noMoves'));
                        setTimeout(function() { Network.skipTurn(); }, 1000);
                    } else {
                        updateStatus(I18n.t('selectPiece'));
                        highlightLegalMoves();
                    }
                }
            },

            onTurnUpdate: function(msg) {
                GameState.applyAction({ type: GameState.ActionTypes.ADVANCE_TURN });
                var isMyTurn = msg.currentTurnName === Network.getMyName();
                updateTurnInfo(msg.currentTurnName, isMyTurn);
                els.rollBtn.disabled = !isMyTurn;
                els.rollBtn.classList.toggle('active', isMyTurn);
                selectedPawn = null;
                legalMoves = [];
                BoardRenderer.clearHighlights();
                if (isMyTurn) updateStatus(I18n.t('rollPrompt'));
            },

            onPawnMoved: function(msg) {
                var newPos = msg.newPosition;
                if (newPos === 'yard') newPos = null;
                GameState.applyAction({
                    type: GameState.ActionTypes.MOVE_PAWN,
                    color: msg.color,
                    pawnIndex: msg.pawnIndex,
                    newPos: newPos,
                    capture: msg.capture || null,
                });
                var updatedState = GameState.getState();
                BoardRenderer.render(els.boardCanvas, updatedState.pawns, updatedState.colorMap);
                if (msg.capture) {
                    updateStatus(msg.color + ' ' + I18n.t('captureSuffix') + ' ' + msg.capture.color);
                }
            },

            onSystem: function(msg) {
                debug(msg.text);
                addChatMessage(I18n.t('systemLabel'), '', msg.text);
            },

            onChat: function(msg) {
                addChatMessage(msg.from, msg.color, msg.text);
            },

            onError: function(text) {
                debug('Error: ' + text);
                updateStatus('Error: ' + text);
            },

            onPlayerQuit: function(msg) {
                debug(msg.playerName + ' left');
                GameState.applyAction({
                    type: GameState.ActionTypes.PLAYER_LEAVE,
                    color: msg.color,
                });
                addChatMessage(I18n.t('systemLabel'), '', msg.playerName + ' ' + I18n.t('playerJoined'));
            },

            onPromotedHost: function() {
                debug(I18n.t('promotedHost'));
                updateStatus(I18n.t('promotedHost'));
            },

            onRejected: function(msg) {
                debug('Rejected: ' + msg.reason);
                updateStatus(msg.reason);
            },

            onDisconnect: function() {
                debug('Disconnected');
                updateStatus(I18n.t('disconnected'));
                gameActive = false;
            },

            onSpectator: function(msg) {
                debug('Spectating: ' + msg.playerName);
                mySlot = null;
                showGameScreen();
            },

            onGameOver: function(msg) {
                debug('Game over! Winner: ' + msg.winner);
                gameActive = false;
                BoardRenderer.clearHighlights();
                legalMoves = [];
                els.winnerText.textContent = msg.winner + ' ' + I18n.t('wins') + '!';
                els.gameOverModal.classList.add('active');
            },
        });
    }

    // -- Lobby --

    function handleJoin() {
        var name = els.nameInput.value.trim() || I18n.t('playerDefault');
        var room = els.roomInput.value.trim().toUpperCase();
        if (room) { Network.joinRoom(name, '', room); }
        else { Network.join(name, ''); }
    }

    function handleCreate() {
        var name = els.nameInput.value.trim() || I18n.t('playerDefault');
        Network.createRoom(name, '');
    }

    function handleSpectate() {
        var name = els.nameInput.value.trim() || I18n.t('spectatorDefault');
        var room = els.roomInput.value.trim().toUpperCase();
        Network.spectate(name, room);
    }

    function handleStartGame() { Network.startGame(); }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function updateLobby(msg) {
        if (msg.playersInfo) {
            els.lobbyPlayers.innerHTML = msg.playersInfo.map(function(p) {
                var dot = '<span class="player-dot" style="background:' + escapeHtml(p.color) + '"></span>';
                var host = p.isHost ? ' <span class="host-badge">' + I18n.t('hostBadge') + '</span>' : '';
                return '<div class="lobby-player">' + dot + ' ' + escapeHtml(p.name) + host + '</div>';
            }).join('');
        }
        var count = msg.playerCount || 0;
        var max = msg.maxPlayers || 4;
        els.lobbyStatus.innerHTML = count + '/' + max + ' <span data-i18n="playerCount">' + I18n.t('playerCount') + '</span>';
        if (els.startGameBtn) {
            els.startGameBtn.disabled = !msg.canStart;
            els.startGameBtn.style.display = msg.canStart ? 'block' : 'none';
        }
    }

    // -- Game --

    function handleRoll() {
        if (!gameActive) return;
        Network.rollDice();
        els.rollBtn.disabled = true;
    }

    function handleBoardClick(e) {
        if (!gameActive || !mySlot || legalMoves.length === 0) return;
        var rect = els.boardCanvas.getBoundingClientRect();
        var scaleX = els.boardCanvas.width / rect.width;
        var scaleY = els.boardCanvas.height / rect.height;
        var canvasX = (e.clientX - rect.left) * scaleX;
        var canvasY = (e.clientY - rect.top) * scaleY;
        var clickedMove = BoardRenderer.handleClick(canvasX, canvasY);
        if (clickedMove) executeMove(clickedMove);
    }

    function executeMove(move) {
        if (move.penalty === 'three_doubles') {
            Network.penaltyPawn(mySlot, move.pawnIndex);
            GameState.applyAction({ type: GameState.ActionTypes.PENALTY_PAWN, color: mySlot, pawnIndex: move.pawnIndex });
        } else {
            Network.movePawn(mySlot, move.pawnIndex, move.newPos, move.capture);
        }
        legalMoves = [];
        BoardRenderer.clearHighlights();
        selectedPawn = null;
        var updatedState = GameState.getState();
        BoardRenderer.render(els.boardCanvas, updatedState.pawns, updatedState.colorMap);
    }

    function highlightLegalMoves() {
        if (!mySlot || legalMoves.length === 0) return;
        BoardRenderer.highlightMoves(legalMoves, mySlot, executeMove);
    }

    function handleQuit() {
        if (confirm(I18n.t('confirmQuit'))) {
            ChatWidget.disconnect();
            Network.quit();
            showStartScreen();
        }
    }

    function handlePlayAgain() {
        GameState.reset();
        showStartScreen();
    }

    // -- Chat --

    function handleChat() {
        var text = els.chatInput.value.trim();
        if (!text) return;
        Network.chat(text);
        addChatMessage(Network.getMyName(), Network.getMyColor(), text);
        els.chatInput.value = '';
    }

    function addChatMessage(from, color, text) {
        var div = document.createElement('div');
        div.className = 'chat-msg';
        var nameSpan = document.createElement('span');
        nameSpan.className = 'chat-name';
        nameSpan.style.color = color || '#a88a7f';
        nameSpan.textContent = from + ': ';
        div.appendChild(nameSpan);
        var textSpan = document.createElement('span');
        textSpan.textContent = text;
        div.appendChild(textSpan);
        els.chatMessages.appendChild(div);
        els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
    }

    // -- UI updates --

    function showStartScreen() {
        els.startScreen.style.display = 'flex';
        els.gameScreen.style.display = 'none';
        els.lobbyOverlay.style.display = 'none';
        ChatWidget.disconnect();
    }

    function showLobby() {
        els.startScreen.style.display = 'none';
        els.gameScreen.style.display = 'none';
        els.lobbyOverlay.style.display = 'flex';
        if (document.getElementById('gameChat')) {
            document.getElementById('gameChat').style.display = 'none';
        }
    }

    function showGameScreen() {
        els.startScreen.style.display = 'none';
        els.lobbyOverlay.style.display = 'none';
        els.gameScreen.style.display = 'flex';
        if (document.getElementById('gameChat')) {
            document.getElementById('gameChat').style.display = 'flex';
        }
        ChatWidget.connect(MC_CHAT_OPTS);
    }

    function showDice(dice) {
        els.diceDisplay.textContent = dice[0] + ' + ' + dice[1];
        els.diceDisplay.classList.add('rolled');
        setTimeout(function() { els.diceDisplay.classList.remove('rolled'); }, 500);
    }

    function updateTurnInfo(playerName, isMyTurn) {
        els.turnInfo.textContent = isMyTurn ? I18n.t('yourTurn') : I18n.t('turnOf') + playerName.toUpperCase();
        els.turnInfo.style.color = isMyTurn ? '#F1BF00' : '#a88a7f';
    }

    function updateStatus(text) {
        if (els.statusMsg) els.statusMsg.textContent = text;
    }

    function debug(text) {
        if (els.debugLog) {
            var time = new Date().toLocaleTimeString();
            els.debugLog.textContent += '[' + time + '] ' + text + '\n';
            els.debugLog.scrollTop = els.debugLog.scrollHeight;
        }
        console.log('[UI]', text);
    }

    return {
        init: init,
        mySlot: function() { return mySlot; },
    };
})();

document.addEventListener('DOMContentLoaded', function() {
    UI.init();
    Network.connect();
});
