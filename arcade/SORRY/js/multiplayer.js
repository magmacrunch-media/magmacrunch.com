/**
 * multiplayer.js — SORRY! multiplayer bridge layer
 * Wraps the shared MP framework with SORRY-specific networking.
 * Depends on: protocol.js, network.js (shared MP), board-config.js (SLOT_COLORS)
 */

var Multiplayer = {

    // ── Callbacks — assign in ui.js before connecting ────────────────────────
    onConnected:        function() {},
    onDisconnected:     function() {},
    onRejected:         function(reason) {},
    onWelcome:          function(playerName, isHost, confirmedHex, slot) {},
    onSpectatorJoined:  function(playerName) {},
    onPromotedToHost:   function() {},
    onLobbyUpdate:      function(data) {},
    onGameStarted:      function(colorMap) {},
    onSystemMessage:    function(text) {},
    onChatMessage:      function(from, text, color) {},
    onCardDrawn:        function(from, card, cardsRemaining) {},
    onPawnMoved:        function(color, pawnId, newPosition, lapped) {},
    onTurnUpdate:       function(currentTurnName) {},
    onPlayerQuit:       function(playerName, color) {},
    onColorChanged:     function(playerName, colorMap) {},
    onError:            function(text) {},
    onGameOver:         function(winner, winnerColor) {},

    // ── Internal state ─────────────────────────────────────────────────────
    _roomCode: null,
    _isActive: false,
    _mySlot: null,
    _sides: {},
    _slotColorMap: {},
    _pendingAction: null,
    _savedColorForRejoin: null,

    // ── Getters ────────────────────────────────────────────────────────────
    getMyName:      function() { return MP.getMyName(); },
    getMyColor:     function() { return Multiplayer._mySlot; },
    getMySlot:      function() { return Multiplayer._mySlot; },
    getMyConfirmedHex: function() {
        var slot = Multiplayer._mySlot;
        return (slot && Multiplayer._slotColorMap[slot]) || null;
    },
    amIHost:        function() { return MP.amIHost(); },
    isMyTurn:       function() { return false; },
    isSpectator:    function() { return MP.isSpectator(); },
    isConnected:    function() { return MP.isConnected(); },
    getRoomCode:    function() { return Multiplayer._roomCode; },
    getSlotColorMap: function() { return Multiplayer._slotColorMap; },

    // ── Send methods ───────────────────────────────────────────────────────
    connect: function() {
        MP.connect();
    },

    join: function(name, color, room) {
        MP.join(name, color, room || null);
    },

    spectate: function(name, room) {
        MP.spectate(name, room);
    },

    startGame: function() {
        MP.startGame();
    },

    drawCard: function() {
        MP.sendAction({ type: 'draw_card' });
    },

    movePawn: function(color, pawnIndex, newPosition, lapped) {
        MP.sendAction({ type: 'move_pawn', color: color, pawnIndex: pawnIndex, newPosition: newPosition, lapped: !!lapped });
    },

    movePawnPartial: function(color, pawnIndex, newPosition, lapped) {
        MP.sendAction({ type: 'move_pawn_partial', color: color, pawnIndex: pawnIndex, newPosition: newPosition, lapped: !!lapped });
    },

    bumpPawn: function(color, pawnIndex) {
        MP.sendAction({ type: 'bump_pawn', color: color, pawnIndex: pawnIndex });
    },

    swapPawn: function(color, pawnIndex, newPosition, oppLapped) {
        MP.sendAction({ type: 'swap_pawn', color: color, pawnIndex: pawnIndex, newPosition: newPosition, oppLapped: !!oppLapped });
    },

    skipTurn: function() {
        MP.sendAction({ type: 'skip_turn' });
    },

    changeColor: function(hex) {
        MP.sendAction({ type: 'change_color', color: hex });
    },

    sendChat: function(text) {
        MP.sendChat(text);
    },

    quit: function() {
        MP.quit();
        Multiplayer._isActive = false;
        Multiplayer._mySlot = null;
        Multiplayer._roomCode = null;
    },

    reconnectAndDo: function(actionFn) {
        Multiplayer._pendingAction = actionFn;
        if (MP._socket) { try { MP._socket.close(); } catch(e) {} }
        MP.connect();
    },
};

// ── Wire up MP callbacks ──────────────────────────────────────────────────────

MP.onConnected = function() {
    Multiplayer.onConnected();
    // Fire pending action from reconnectAndDo
    if (Multiplayer._pendingAction) {
        var fn = Multiplayer._pendingAction;
        Multiplayer._pendingAction = null;
        fn();
    }
};

MP.onDisconnected = function() {
    Multiplayer._isActive = false;
    Multiplayer._mySlot = null;
    Multiplayer.onDisconnected();
};

MP.onRejected = function(reason) {
    Multiplayer.onRejected(reason);
};

MP.onWelcome = function(data) {
    Multiplayer._roomCode = data.room;

    // Derive slot from playerCount (I just joined, so my index is playerCount - 1)
    var myIndex = (data.playerCount || 1) - 1;
    var SLOT_ORDER = ['red', 'blue', 'yellow', 'green'];
    Multiplayer._mySlot = (myIndex < SLOT_ORDER.length) ? SLOT_ORDER[myIndex] : null;

    Multiplayer.onWelcome(data.playerName, data.isHost, data.chosenColor || null, Multiplayer._mySlot);
};

MP.onSpectatorWelcome = function(data) {
    Multiplayer._roomCode = data.room;
    Multiplayer.onSpectatorJoined(data.playerName);
};

MP.onLobbySnapshot = function(data) {
    // Not used by SORRY (single-room)
};

MP.onLobbyUpdate = function(data) {
    // Update slot from authoritative players list (in case playerCount was wrong)
    var myName = MP.getMyName();
    var players = data.players || data.playersInfo || [];
    for (var i = 0; i < players.length; i++) {
        var p = players[i];
        if (p.name === myName && p.slot) {
            Multiplayer._mySlot = p.slot;
            break;
        }
    }
    Multiplayer.onLobbyUpdate(data);
};

MP.onGameStarted = function(data) {
    Multiplayer._isActive = true;
    var state = data.state || {};
    var colorMap = data.colorMap || {};  // {playerName: hex}

    Multiplayer._sides = state.sides || {};

    // Derive my slot from sides map
    var myName = MP.getMyName();
    Multiplayer._mySlot = null;
    for (var s in Multiplayer._sides) {
        if (Multiplayer._sides[s] === myName) {
            Multiplayer._mySlot = s;
            break;
        }
    }

    // Convert player-based colorMap to slot-based colorMap
    Multiplayer._slotColorMap = {};
    for (var pname in colorMap) {
        var slot = Multiplayer._sides[pname];
        if (slot) {
            Multiplayer._slotColorMap[slot] = colorMap[pname];
        }
    }

    Multiplayer.onGameStarted(Multiplayer._slotColorMap);

    // Trigger game start in game-state
    applyAction({ type: ActionTypes.START_GAME });
};

MP.onGameState = function(state) {
    // Full state sync (for spectators)
};

MP.onGameAction = function(action) {
    var t = action.type;

    if (t === 'card_drawn') {
        Multiplayer.onCardDrawn(action.from, action.card, action.cardsRemaining);
    }
    else if (t === 'pawn_moved') {
        applyAction({
            type: ActionTypes.MOVE_PAWN,
            payload: { pawnId: action.pawnId, color: action.color, newPosition: action.newPosition, lapped: action.lapped }
        });
        Multiplayer.onPawnMoved(action.color, action.pawnId, action.newPosition, action.lapped);
    }
    else if (t === 'turn_update') {
        Multiplayer.onTurnUpdate(action.currentTurnName);
    }
    else if (t === 'color_changed') {
        Multiplayer._slotColorMap = action.colorMap || {};
        Multiplayer.onColorChanged(action.playerName, Multiplayer._slotColorMap);
    }
    else if (t === 'game_over') {
        Multiplayer.onGameOver(action.winner, action.winnerColor);
    }
    else if (t === 'system') {
        Multiplayer.onSystemMessage(action.text);
    }
};

MP.onChatMessage = function(from, text, color) {
    Multiplayer.onChatMessage(from, text, color);
};

MP.onSystemMessage = function(text) {
    Multiplayer.onSystemMessage(text);
};

MP.onPlayerQuit = function(data) {
    Multiplayer.onPlayerQuit(data.playerName, data.color);
};

MP.onError = function(text) {
    Multiplayer.onError(text);
};
