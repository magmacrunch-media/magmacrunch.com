/**
 * multiplayer.js — Multiplayer mode for Backgammon
 * Bridges the shared MP framework with the Backgammon game logic.
 */

var Multiplayer = (function() {

    var mySide = null;     // 'player' or 'ai'
    var isActive = false;
    var onStateUpdate = null;
    var onGameStart = null;
    var onGameEnd = null;

    function connect() {
        MP.connect();
    }

    function joinRoom(name, roomCode) {
        MP.join(name, null, roomCode || null);
    }

    function startGame() {
        MP.startGame();
    }

    function sendMove(moveIndex) {
        if (!isActive || !mySide) return;
        MP.sendAction({
            type: 'move',
            moveIndex: moveIndex,
        });
    }

    function sendDouble() {
        if (!isActive || !mySide) return;
        MP.sendAction({ type: 'double' });
    }

    function sendAcceptDouble() {
        if (!isActive || !mySide) return;
        MP.sendAction({ type: 'accept_double' });
    }

    function sendRejectDouble() {
        if (!isActive || !mySide) return;
        MP.sendAction({ type: 'reject_double' });
    }

    function resign() {
        if (!isActive || !mySide) return;
        MP.sendAction({ type: 'resign' });
    }

    function quit() {
        MP.quit();
        isActive = false;
        mySide = null;
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
        if (state.sides) {
            var myName = MP.getMyName();
            for (var side in state.sides) {
                if (state.sides[side] === myName) {
                    mySide = side;
                    break;
                }
            }
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
            var winnerSide = msg.winnerSide;
            var won = winnerSide === mySide;
            isActive = false;
            if (onGameEnd) {
                onGameEnd(won, msg.winner, winnerSide);
            }
            return;
        }

        if (onStateUpdate) {
            onStateUpdate({ type: 'action', msg: msg });
        }
    };

    MP.onChatMessage = function(from, text, color) {};

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
                onGameEnd(true, msg.name, null);
            }
        }
    };

    // ── Callbacks ───────────────────────────────────────────────────────────

    function setOnStateUpdate(cb) { onStateUpdate = cb; }
    function setOnGameStart(cb) { onGameStart = cb; }
    function setOnGameEnd(cb) { onGameEnd = cb; }

    return {
        connect: connect,
        joinRoom: joinRoom,
        startGame: startGame,
        sendMove: sendMove,
        sendDouble: sendDouble,
        sendAcceptDouble: sendAcceptDouble,
        sendRejectDouble: sendRejectDouble,
        resign: resign,
        quit: quit,
        getMySide: getMySide,
        isActive: isMultiplayerActive,
        setOnStateUpdate: setOnStateUpdate,
        setOnGameStart: setOnGameStart,
        setOnGameEnd: setOnGameEnd,
    };

})();
