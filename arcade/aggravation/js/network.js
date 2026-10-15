/**
 * network.js — WebSocket client for Aggravation multiplayer
 * Standalone pattern (matching Parchisi)
 */

var Network = (function() {
    'use strict';

    var ws = null;
    var connected = false;
    var myName = '';
    var mySlot = '';
    var isHost = false;
    var roomCode = '';
    var outbox = [];   // sends made while the socket is still opening

    // Callbacks
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

    // Where the game server is. mpServerFor (../shared/mp-server.js) is the
    // arcade's one answer: the nginx path on the public site, the port itself
    // on the LAN or tailnet. This used to hardcode
    // wss://aggravation.magmacrunch.com, which fails its TLS handshake because
    // the Pi's certificate names only magmacrunch.duckdns.org.
    function getServerUrl() {
        var params = new URLSearchParams(window.location.search);
        var addr = params.get('server') || mpServerFor('aggravation', 8774);
        if (/^wss?:\/\//.test(addr)) return addr;
        var plain = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.)/.test(addr)
            || window.location.protocol === 'http:';
        return (plain ? 'ws://' : 'wss://') + addr;
    }

    function connect(serverUrl) {
        var url = serverUrl || getServerUrl();
        outbox = [];
        try {
            ws = new WebSocket(url);
        } catch (e) {
            onError('Could not connect to server');
            return;
        }

        ws.onopen = function() {
            connected = true;
            console.log('[Network] Connected to', url);
            while (outbox.length) ws.send(outbox.shift());
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

    function _handle(msg) {
        switch (msg.type) {
            case 'game_action':
                // server_base wraps every game frame in this envelope.
                if (msg.action && msg.action.type !== 'game_action') _handle(msg.action);
                break;
            case 'welcome':
                // The server confirms the name (it may truncate it) but sends
                // no slot: the slot comes from game_started, below.
                myName = msg.playerName || myName;
                mySlot = '';
                isHost = msg.isHost || false;
                roomCode = msg.room || '';
                onWelcome(msg);
                break;
            case 'lobby_snapshot':
            case 'lobby_update':
                onLobbyUpdate(msg);
                break;
            case 'game_started':
                // playerNames maps board colour -> player name.
                mySlot = '';
                for (var slot in (msg.playerNames || {})) {
                    if (msg.playerNames[slot] === myName) mySlot = slot;
                }
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
            case 'game_over':
                onGameOver(msg);
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
            default:
                console.log('[Network] Unknown:', msg.type);
        }
    }

    // ui.js connects on JOIN and sends 200 ms later, which loses to a TLS
    // handshake through nginx, and a send on a socket still CONNECTING used to
    // be dropped without a word. Hold it until onopen instead.
    function _send(msg) {
        if (!ws) return;
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(msg));
        } else if (ws.readyState === WebSocket.CONNECTING) {
            outbox.push(JSON.stringify(msg));
        }
    }

    function join(name, color) {
        myName = name;
        _send({ type: 'join', name: name, color: color });
    }

    function joinRoom(name, color, room) {
        myName = name;
        _send({ type: 'join_room', name: name, color: color, room: room });
    }

    function createRoom(name, color) {
        myName = name;
        _send({ type: 'create_room', name: name, color: color });
    }

    function spectate(name) {
        myName = name;
        _send({ type: 'spectate', name: name });
    }

    function startGame() {
        _send({ type: 'start_game' });
    }

    function rollDice() {
        _send({ type: 'game_action', action: { type: 'roll_dice' } });
    }

    function movePawn(pawnIndex, newPos, capture) {
        _send({
            type: 'game_action',
            action: {
                type: 'move_pawn',
                pawnIndex: pawnIndex,
                newPos: newPos,
                capture: capture,
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
        _send({ type: 'quit' });
        myName = '';
        mySlot = '';
    }

    function isConnected() { return connected; }
    function getMyName()   { return myName; }
    function getMySlot()   { return mySlot; }
    function getMyColor()  { return mySlot; } // slot IS the color name
    function getIsHost()   { return isHost; }
    function getRoomCode() { return roomCode; }

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
        skipTurn: skipTurn,
        chat: chat,
        quit: quit,
        isConnected: isConnected,
        getMyName: getMyName,
        getMySlot: getMySlot,
        getMyColor: getMyColor,
        getIsHost: getIsHost,
        getRoomCode: getRoomCode,
        setCallbacks: setCallbacks,
        getServerUrl: getServerUrl,
    };
})();
