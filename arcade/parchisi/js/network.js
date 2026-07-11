/**
 * network.js — WebSocket client for Parchís multiplayer
 */

var Network = (function() {
    'use strict';

    var ws = null;
    var connected = false;
    var myName = '';
    var myColor = '';
    var isHost = false;
    var roomCode = '';

    // ── Callbacks (set by ui.js before connect) ───────────────────────────────
    var onWelcome      = function() {};
    var onLobbyUpdate  = function() {};
    var onGameStarted  = function() {};
    var onDiceRolled   = function() {};
    var onTurnUpdate   = function() {};
    var onPawnMoved    = function() {};
    var onSystem       = function() {};
    var onChat         = function() {};
    var onError        = function() {};
    var onPlayerQuit   = function() {};
    var onPromotedHost = function() {};
    var onRejected     = function() {};
    var onDisconnect   = function() {};
    var onSpectator    = function() {};
    var onGameOver     = function() {};

    // ── Server address ────────────────────────────────────────────────────────
    function getServerUrl() {
        var params = new URLSearchParams(window.location.search);
        var serverParam = params.get('server');
        if (serverParam) {
            var proto = serverParam.match(/^(\d|localhost)/) ? 'ws' : 'wss';
            return proto + '://' + serverParam;
        }
        // Default to magmacrunch server
        return 'ws://98.49.52.35:8773';
    }

    // ── Connect ───────────────────────────────────────────────────────────────
    function connect(serverUrl) {
        var url = serverUrl || getServerUrl();

        try {
            ws = new WebSocket(url);
        } catch (e) {
            onError('Could not connect to server');
            return;
        }

        ws.onopen = function() {
            connected = true;
            console.log('[Network] Connected to', url);
        };

        ws.onmessage = function(evt) {
            try {
                var msg = JSON.parse(evt.data);
                _handle(msg);
            } catch (e) {
                console.error('[Network] Bad message:', e);
            }
        };

        ws.onclose = function() {
            connected = false;
            onDisconnect();
        };

        ws.onerror = function() {
            onError('Connection error');
        };
    }

    // ── Message handler ───────────────────────────────────────────────────────
    function _handle(msg) {
        switch (msg.type) {
            case 'welcome':
                myName = msg.playerName || '';
                isHost = msg.isHost || false;
                myColor = msg.chosenColor || '';
                roomCode = msg.room || '';
                onWelcome(msg);
                break;

            case 'lobby_snapshot':
            case 'lobby_update':
                onLobbyUpdate(msg);
                break;

            case 'game_started':
                onGameStarted(msg);
                break;

            case 'dice_rolled':
                onDiceRolled(msg);
                break;

            case 'turn_update':
                onTurnUpdate(msg);
                break;

            case 'pawn_moved':
                onPawnMoved(msg);
                break;

            case 'system':
                onSystem(msg);
                break;

            case 'chat':
                onChat(msg);
                break;

            case 'error':
                onError(msg.text || 'Unknown error');
                break;

            case 'player_quit':
                onPlayerQuit(msg);
                break;

            case 'promoted_to_host':
                isHost = true;
                onPromotedHost(msg);
                break;

            case 'rejected':
                onRejected(msg);
                break;

            case 'spectator_welcome':
                onSpectator(msg);
                break;

            case 'game_over':
                onGameOver(msg);
                break;

            default:
                console.log('[Network] Unknown message type:', msg.type);
        }
    }

    // ── Send helpers ──────────────────────────────────────────────────────────
    function _send(msg) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(msg));
        }
    }

    function join(name, color) {
        _send({ type: 'join', name: name, color: color });
    }

    function joinRoom(name, color, room) {
        _send({ type: 'join_room', name: name, color: color, room: room });
    }

    function createRoom(name, color) {
        _send({ type: 'create_room', name: name, color: color });
    }

    function spectate(name, room) {
        _send({ type: 'spectate', name: name, room: room });
    }

    function startGame() {
        _send({ type: 'start_game' });
    }

    function rollDice() {
        _send({ type: 'game_action', action: { type: 'roll_dice' } });
    }

    function movePawn(color, pawnIndex, newPos, capture) {
        _send({
            type: 'game_action',
            action: {
                type: 'move_pawn',
                color: color,
                pawnIndex: pawnIndex,
                newPos: newPos,
                capture: capture,
            }
        });
    }

    function penaltyPawn(color, pawnIndex) {
        _send({
            type: 'game_action',
            action: {
                type: 'penalty_pawn',
                color: color,
                pawnIndex: pawnIndex,
            }
        });
    }

    function skipTurn() {
        _send({ type: 'game_action', action: { type: 'skip_turn' } });
    }

    function chat(text) {
        _send({ type: 'chat', text: text });
    }

    function quit() {
        _send({ type: 'quit_game' });
    }

    function changeColor(color) {
        _send({ type: 'change_color', color: color });
    }

    // ── Getters ───────────────────────────────────────────────────────────────
    function isConnected() { return connected; }
    function getMyName()   { return myName; }
    function getMyColor()  { return myColor; }
    function getIsHost()   { return isHost; }
    function getRoomCode() { return roomCode; }

    // ── Callback setters ──────────────────────────────────────────────────────
    function setCallbacks(cbs) {
        if (cbs.onWelcome)      onWelcome      = cbs.onWelcome;
        if (cbs.onLobbyUpdate)  onLobbyUpdate  = cbs.onLobbyUpdate;
        if (cbs.onGameStarted)  onGameStarted  = cbs.onGameStarted;
        if (cbs.onDiceRolled)   onDiceRolled   = cbs.onDiceRolled;
        if (cbs.onTurnUpdate)   onTurnUpdate   = cbs.onTurnUpdate;
        if (cbs.onPawnMoved)    onPawnMoved    = cbs.onPawnMoved;
        if (cbs.onSystem)       onSystem       = cbs.onSystem;
        if (cbs.onChat)         onChat         = cbs.onChat;
        if (cbs.onError)        onError        = cbs.onError;
        if (cbs.onPlayerQuit)   onPlayerQuit   = cbs.onPlayerQuit;
        if (cbs.onPromotedHost) onPromotedHost = cbs.onPromotedHost;
        if (cbs.onRejected)     onRejected     = cbs.onRejected;
        if (cbs.onDisconnect)   onDisconnect   = cbs.onDisconnect;
        if (cbs.onSpectator)    onSpectator    = cbs.onSpectator;
        if (cbs.onGameOver)     onGameOver     = cbs.onGameOver;
    }

    return {
        connect: connect,
        join: join,
        joinRoom: joinRoom,
        createRoom: createRoom,
        spectate: spectate,
        startGame: startGame,
        rollDice: rollDice,
        movePawn: movePawn,
        penaltyPawn: penaltyPawn,
        skipTurn: skipTurn,
        chat: chat,
        quit: quit,
        changeColor: changeColor,
        isConnected: isConnected,
        getMyName: getMyName,
        getMyColor: getMyColor,
        getIsHost: getIsHost,
        getRoomCode: getRoomCode,
        setCallbacks: setCallbacks,
        getServerUrl: getServerUrl,
    };
})();
