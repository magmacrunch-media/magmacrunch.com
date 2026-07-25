/**
 * multiplayer.js — Chess multiplayer bridge layer
 * Wraps the shared MP framework with chess-specific networking.
 */

var Multiplayer = (function() {

    var _roomCode = null;
    var _isActive = false;
    var _mySide = null;  // 'white' or 'black'
    var _timeControl = 'none';

    // Callbacks
    var _onStateUpdate = null;
    var _onGameStart = null;
    var _onGameEnd = null;

    function connect() {
        MP.connect();
    }

    function joinRoom(name, roomCode) {
        MP.join(name, null, roomCode || null);
    }

    function spectate(name, roomCode) {
        MP.spectate(name, roomCode);
    }

    function startGame(timeControl) {
        _timeControl = timeControl || 'none';
        // Send time control to server first, then start
        // The game_action is processed before start_game since WebSocket is ordered
        MP.sendAction({ type: 'set_time_control', timeControl: _timeControl });
        MP.startGame();
    }

    function sendMove(from, to) {
        MP.sendAction({ type: 'move', from: from, to: to });
    }

    function sendPromotion(pieceType) {
        MP.sendAction({ type: 'promotion_choice', pieceType: pieceType });
    }

    function resign() {
        MP.sendAction({ type: 'resign' });
    }

    function quit() {
        MP.quit();
        _isActive = false;
        _mySide = null;
        _roomCode = null;
    }

    function getTimeControl() {
        return _timeControl;
    }

    // ── MP Callbacks ────────────────────────────────────────────────────────

    MP.onWelcome = function(data) {
        _roomCode = data.room;
        if (_onStateUpdate) _onStateUpdate({ type: 'welcome', room: data.room, isHost: data.isHost });
    };

    MP.onSpectatorWelcome = function(data) {
        _roomCode = data.room;
        if (_onStateUpdate) _onStateUpdate({ type: 'spectator_welcome', room: data.room });
    };

    MP.onLobbySnapshot = function(data) {
        if (_onStateUpdate) _onStateUpdate({ type: 'snapshot', rooms: data.rooms });
    };

    MP.onLobbyUpdate = function(data) {
        if (_onStateUpdate) _onStateUpdate({ type: 'lobby', players: data.players, canStart: data.canStart });
    };

    MP.onGameStarted = function(data) {
        _isActive = true;
        var state = data.state;
        var myName = MP.getMyName();

        // Determine my side from the sides map
        _mySide = null;
        if (state.sides) {
            for (var side in state.sides) {
                if (state.sides[side] === myName) {
                    _mySide = side;
                    break;
                }
            }
        }

        // Store time control from server state
        if (state.timeControl) {
            _timeControl = state.timeControl;
        }

        if (_onGameStart) _onGameStart(state, _mySide);
    };

    MP.onGameState = function(state) {
        if (_onStateUpdate) _onStateUpdate({ type: 'state', state: state });
    };

    MP.onGameAction = function(action) {
        // Handle resignations first to avoid double-firing gameOver + resigned
        if (action.type === 'player_resigned') {
            var iWon = (action.winner === MP.getMyName());
            if (_onGameEnd) _onGameEnd(iWon, action.winner, action.winnerSide, 'resignation');
            return;
        }

        if (action.gameOver) {
            var won = false;
            if (action.winner) {
                won = (action.winner === MP.getMyName());
            }
            if (_onGameEnd) _onGameEnd(won, action.winner, action.winnerSide, action.result);
        }

        if (action.type === 'move_made') {
            if (_onStateUpdate) _onStateUpdate({ type: 'move', msg: action });
        } else if (action.type === 'promotion_pending') {
            if (_onStateUpdate) _onStateUpdate({ type: 'promotion_pending', msg: action });
        } else {
            if (_onStateUpdate) _onStateUpdate({ type: 'action', msg: action });
        }
    };

    MP.onPlayerQuit = function(data) {
        _isActive = false;
        if (_onGameEnd) _onGameEnd(true, data.playerName, null, 'opponent_quit');
    };

    MP.onDisconnected = function() {
        _isActive = false;
        _mySide = null;
        if (_onStateUpdate) _onStateUpdate({ type: 'disconnected' });
    };

    MP.onRejected = function(reason) {
        if (_onStateUpdate) _onStateUpdate({ type: 'rejected', reason: reason });
    };

    // ── Setters ────────────────────────────────────────────────────────────

    function setOnStateUpdate(cb) { _onStateUpdate = cb; }
    function setOnGameStart(cb) { _onGameStart = cb; }
    function setOnGameEnd(cb) { _onGameEnd = cb; }

    // ── Getters ────────────────────────────────────────────────────────────

    function isActive() { return _isActive; }
    function getMySide() { return _mySide; }
    function getRoomCode() { return _roomCode; }

    return {
        connect: connect,
        joinRoom: joinRoom,
        spectate: spectate,
        startGame: startGame,
        sendMove: sendMove,
        sendPromotion: sendPromotion,
        resign: resign,
        quit: quit,
        getTimeControl: getTimeControl,
        isActive: isActive,
        getMySide: getMySide,
        getRoomCode: getRoomCode,
        setOnStateUpdate: setOnStateUpdate,
        setOnGameStart: setOnGameStart,
        setOnGameEnd: setOnGameEnd
    };

})();
