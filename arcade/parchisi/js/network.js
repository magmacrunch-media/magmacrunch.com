/**
 * network.js -- Parchis's multiplayer client, on adenosine's MP.
 *
 * The socket, the protocol and the server address all belong to MP now
 * (../shared/adenosine-multiplayer.js). Until 2026-10-14 this file opened its
 * own WebSocket and re-implemented all three, and it read ?server= with no
 * allowlist, so a crafted link could point a player's socket and name at any
 * host. MP refuses a ?server= host that is not this page's own, the configured
 * default, or a private address.
 *
 * What stays here is the API ui.js already calls -- the same functions, and
 * callbacks receiving the same message shapes -- so ui.js did not change. MP
 * hands some frames over as fields rather than messages (chat, system,
 * rejected), and those are rebuilt into the objects ui.js reads.
 */

var Network = (function() {
    'use strict';

    var outbox = [];   // sends made while the socket is still opening

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

    // ── Game frames, delivered inside server_base's game_action envelope ─────
    function _handleGame(action) {
        switch (action && action.type) {
            case 'dice_rolled': onDiceRolled(action); break;
            case 'turn_update': onTurnUpdate(action); break;
            case 'pawn_moved':  onPawnMoved(action);  break;
            case 'game_over':   onGameOver(action);   break;
            default: console.log('[Network] Unknown game frame:', action && action.type);
        }
    }

    function _wire() {
        MP.onConnected = function() {
            while (outbox.length) outbox.shift()();
        };
        MP.onDisconnected = function() { onDisconnect(); };
        MP.onError = function(text) { onError(text); };
        MP.onWelcome = function(msg) { onWelcome(msg); };
        MP.onLobbySnapshot = function(msg) { onLobbyUpdate(msg); };
        MP.onLobbyUpdate = function(msg) { onLobbyUpdate(msg); };
        MP.onGameStarted = function(msg) { onGameStarted(msg); };
        MP.onGameAction = _handleGame;
        MP.onSystemMessage = function(text) { onSystem({ type: 'system', text: text }); };
        MP.onChatMessage = function(from, text, color) {
            onChat({ type: 'chat', from: from, text: text, color: color });
        };
        MP.onPlayerQuit = function(msg) { onPlayerQuit(msg); };
        MP.onRejected = function(reason) { onRejected({ type: 'rejected', reason: reason }); };
        MP.onSpectatorWelcome = function(msg) { onSpectator(msg); };
    }

    // ── Connect ───────────────────────────────────────────────────────────────
    function connect(serverUrl) {
        outbox = [];
        _wire();
        try {
            MP.connect(serverUrl);
        } catch (e) {
            onError('Could not connect to server');
        }
    }

    // ── Send helpers ──────────────────────────────────────────────────────────
    // MP drops a send made before the socket is open, so hold it until
    // onConnected rather than losing a JOIN pressed during the handshake.
    function _send(fn) {
        if (MP.isConnected()) fn();
        else outbox.push(fn);
    }

    function join(name, color) {
        _send(function() { MP.join(name, color); });
    }

    function joinRoom(name, color, room) {
        _send(function() { MP.joinRoom(name, color, room); });
    }

    function createRoom(name, color) {
        _send(function() { MP.createRoom(name, color); });
    }

    function spectate(name, room) {
        _send(function() { MP.spectate(name, room); });
    }

    function startGame() {
        _send(function() { MP.startGame(); });
    }

    function rollDice() {
        _send(function() { MP.sendAction({ type: 'roll_dice' }); });
    }

    function movePawn(color, pawnIndex, newPos, capture) {
        _send(function() {
            MP.sendAction({
                type: 'move_pawn',
                color: color,
                pawnIndex: pawnIndex,
                newPos: newPos,
                capture: capture,
            });
        });
    }

    function penaltyPawn(color, pawnIndex) {
        _send(function() {
            MP.sendAction({
                type: 'penalty_pawn',
                color: color,
                pawnIndex: pawnIndex,
            });
        });
    }

    function skipTurn() {
        _send(function() { MP.sendAction({ type: 'skip_turn' }); });
    }

    function chat(text) {
        _send(function() { MP.sendChat(text); });
    }

    // server_base knows 'quit', and reaches a game's own actions only
    // through game_action; 'quit_game' and a bare 'change_color' were ignored.
    function quit() {
        if (MP.isConnected()) MP.quit();
        outbox = [];
    }

    function changeColor(color) {
        _send(function() { MP.sendAction({ type: 'change_color', color: color }); });
    }

    // ── Getters ───────────────────────────────────────────────────────────────
    function isConnected() { return MP.isConnected(); }
    function getMyName()   { return MP.getMyName() || ''; }
    function getMyColor()  { return MP.getMyColor() || ''; }
    function getIsHost()   { return MP.amIHost(); }
    function getRoomCode() { return MP.getRoomCode() || ''; }

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
    };
})();
