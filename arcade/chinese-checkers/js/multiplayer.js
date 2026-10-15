/**
 * multiplayer.js — Multiplayer mode for Chinese Checkers
 * Bridges the shared MP framework with the Chinese Checkers game logic.
 */

var Multiplayer = (function() {

    var mySide = null;     // Player index (0, 1, 2, etc.)
    var isActive = false;
    var onStateUpdate = null;
    var onGameStart = null;
    var onGameEnd = null;
    var onChatMessage = null;
    var _roomCode = null;

    function connect() {
        MP.connect();
    }

    function joinRoom(name, roomCode) {
        MP.join(name, null, roomCode || null);
    }

    function startGame() {
        MP.startGame();
    }

    function sendMove(from, to) {
        if (!isActive || mySide === null) return;
        MP.sendAction({
            type: 'move',
            from: from,
            to: to,
        });
    }

    function resign() {
        if (!isActive || mySide === null) return;
        MP.sendAction({ type: 'resign' });
    }

    function quit() {
        MP.quit();
        isActive = false;
        mySide = null;
    }

    function isMyTurn(state) {
        return state && state.currentTurnIdx === mySide;
    }

    function getMySide() {
        return mySide;
    }

    function isMultiplayerActive() {
        return isActive;
    }

    // ── MP Callbacks ────────────────────────────────────────────────────────

    MP.onWelcome = function(data) {
        console.log('[MP] Welcome:', data.playerName, 'room:', data.room);
        _roomCode = data.room;
        if (onStateUpdate) {
            onStateUpdate({ type: 'welcome', room: data.room, isHost: data.isHost });
        }
    };

    MP.onLobbySnapshot = function(msg) {
        if (onStateUpdate) {
            onStateUpdate({ type: 'snapshot', rooms: msg.rooms || [] });
        }
    };

    MP.onLobbyUpdate = function(msg) {
        if (onStateUpdate) {
            onStateUpdate({ type: 'lobby', players: msg.players || [], canStart: msg.canStart });
        }
    };

    MP.onGameStarted = function(msg) {
        isActive = true;
        var state = msg.state;
        mySide = null;

        // Determine my side from the state.sides map
        // sides maps NAME to seat index here, the other way round from
        // chess and checkers. Reading it their way never matched, so mySide
        // stayed null and sendMove dropped every move.
        if (state.sides && typeof state.sides[MP.getMyName()] === 'number') {
            mySide = state.sides[MP.getMyName()];
        }

        console.log('[MP] Game started. My side:', mySide);

        if (onGameStart) {
            onGameStart(state, mySide);
        }
    };

    MP.onGameState = function(state) {
        if (onStateUpdate) {
            onStateUpdate({ type: 'state', state: state });
        }
    };

    MP.onGameAction = function(msg) {
        if (msg.gameOver) {
            // Show the last move before the result, or the losers never see it.
            if (msg.state && onStateUpdate) {
                onStateUpdate({ type: 'move', msg: msg });
            }
            var winnerIdx = msg.winnerIdx;
            var won = winnerIdx === mySide;
            isActive = false;
            if (onGameEnd) {
                onGameEnd(won, msg.winner, winnerIdx);
            }
            return;
        }

        if (onStateUpdate) {
            onStateUpdate({ type: 'move', msg: msg });
        }
    };

    MP.onChatMessage = function(from, text, color) {
        // Per-match chat, relayed by this game's own server. server_base.py's
        // _handle_chat takes the room from the connection, so a message cannot
        // reach another match. This used to read "Chat handled by shared
        // framework", meaning the arcade's global widget, which put every match
        // on the site into one room and never scoped itself to this one.
        if (onChatMessage) onChatMessage(from, text, color);
    };

    MP.onError = function(text) {
        console.error('[MP] Error:', text);
    };

    MP.onDisconnected = function() {
        if (isActive) {
            isActive = false;
            if (onStateUpdate) {
                onStateUpdate({ type: 'disconnected' });
            }
        }
    };

    MP.onPlayerQuit = function(msg) {
        if (isActive) {
            isActive = false;
            if (onGameEnd) {
                onGameEnd(true, msg.playerName, null);
            }
        }
    };

    // ── Callbacks ───────────────────────────────────────────────────────────

    function setOnStateUpdate(cb) { onStateUpdate = cb; }
    function setOnGameStart(cb) { onGameStart = cb; }
    function setOnGameEnd(cb) { onGameEnd = cb; }
    function setOnChatMessage(cb) { onChatMessage = cb; }

    function sendChat(text) { MP.sendChat(text); }

    return {
        connect: connect,
        joinRoom: joinRoom,
        startGame: startGame,
        sendMove: sendMove,
        resign: resign,
        quit: quit,
        isMyTurn: isMyTurn,
        getMySide: getMySide,
        isActive: isMultiplayerActive,
        setOnStateUpdate: setOnStateUpdate,
        setOnGameStart: setOnGameStart,
        setOnGameEnd: setOnGameEnd,
        setOnChatMessage: setOnChatMessage,
        sendChat: sendChat,
    };

})();
