/**
 * network.js — WebSocket client for SORRY!
 * Depends on game-state.js (applyAction, ActionTypes, getState) being loaded first.
 */

var _COLOR_BY_ORDER = ['red', 'blue', 'yellow', 'green'];
var _playerColorMap = {};  // playerName → board slot ('red'|'blue'|'yellow'|'green')

var _socket      = null;
var _myName      = null;
var _amHost      = false;
var _isMyTurn    = false;
var _isSpectator = false;
var _cardInPlay  = false;  // true after draw_card sent, cleared by turn_update

var Network = {

  // ── UI Callbacks — assign these in ui.js before Network.connect() ──
  onConnected:        function() {},
  onDisconnected:     function() {},
  onRejected:         function(reason) {},
  onWelcome:          function(playerName, isHost, confirmedHex) {},
  onSpectatorJoined:  function(spectatorName) {},
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

  // ── Getters ──
  getMyName:         function() { return _myName; },
  getMyColor:        function() { return _myName ? _playerColorMap[_myName] : null; },
  getMyConfirmedHex: function() { return Network._myConfirmedHex || null; },
  amIHost:        function() { return _amHost; },
  isMyTurn:       function() { return _isMyTurn; },
  isSpectator:    function() { return _isSpectator; },
  isConnected:    function() { return _socket && _socket.readyState === WebSocket.OPEN; },

  _myConfirmedHex: null,

  // ── Connect ──
  //
  // Server address resolution order:
  //   1. ?server=host:port  query parameter in the URL  (highest priority)
  //   2. ?server=host       query parameter, default port 8765
  //   3. Fallback hardcoded address below
  //
  // Examples:
  //   index.html?server=192.168.1.16:8765        (local network)
  //   index.html?server=4.tcp.ngrok.io:12345     (ngrok session)
  //   index.html?server=mygame.example.com:8765  (VPS)
  //
  _resolveServer: function() {
    var fallback = 'sorry.magmacrunch.com';
    try {
      var param = new URLSearchParams(window.location.search).get('server');
      if (param && param.trim()) return param.trim();
    } catch(e) {}
    return fallback;
  },

  // Reconnect and optionally fire a pending action once connected.
  // Used by the rejected-overlay buttons (server closes socket on rejection).
  _pendingAction: null,
  _savedColorForRejoin: null,
  reconnectAndDo: function(actionFn) {
    Network._pendingAction = actionFn;
    if (_socket) { try { _socket.close(); } catch(e) {} }
    Network.connect();
  },

  // Use wss:// (secure) by default for production (required when page is served over https://).
  // Falls back to ws:// only when a ?server= param contains a raw IP or localhost,
  // which is useful for local testing without a certificate.
  connect: function() {
    var addr = Network._resolveServer();
    var isLocal = addr.match(/^(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.)/);
    var scheme  = isLocal ? 'ws://' : 'wss://';
    _socket = new WebSocket(scheme + addr);

    _socket.addEventListener('open', function() {
      Network.onConnected();
    });

    _socket.addEventListener('close', function() {
      _myName = null; _amHost = false; _isMyTurn = false; _isSpectator = false;
      Network.onDisconnected();
    });

    _socket.addEventListener('error', function() {
      Network.onError('Connection error — is server.py running?');
    });

    _socket.addEventListener('message', function(e) {
      var msg;
      try { msg = JSON.parse(e.data); }
      catch(err) { console.error('[Network] Bad JSON:', e.data); return; }
      Network._handle(msg);
    });
  },

  // ── Senders ──
  _send: function(obj) {
    if (Network.isConnected()) _socket.send(JSON.stringify(obj));
    else console.warn('[Network] Not connected, cannot send:', obj);
  },
  // color is the player's chosen hex value from the palette
  joinGame:  function(name, color) { Network._send({ type: 'join', name: name, color: color }); },
  joinLate:  function(name, color) { Network._send({ type: 'join_late', name: name, color: color }); },
  spectate:  function(name) {
    _isSpectator = true;
    Network._send({ type: 'spectate', name: name });
  },
  quitGame:  function() { Network._send({ type: 'quit_game' }); },
  startGame: function()            { Network._send({ type: 'start_game' }); },
  drawCard:  function() {
    if (_isMyTurn && !_cardInPlay) {
      _cardInPlay = true;
      Network._send({ type: 'draw_card' });
    }
  },
  movePawn:  function(color, pawnIndex, newPosition, lapped) {
    Network._send({ type: 'move_pawn', color, pawnIndex, newPosition, lapped: !!lapped });
  },
  movePawnPartial: function(color, pawnIndex, newPosition, lapped) {
    Network._send({ type: 'move_pawn_partial', color, pawnIndex, newPosition, lapped: !!lapped });
  },
  bumpPawn:  function(color, pawnIndex) {
    Network._send({ type: 'bump_pawn', color, pawnIndex });
  },
  swapPawn:  function(color, pawnIndex, newPosition) {
    const state   = getState();
    const oppPawn = state.pawns[color] && state.pawns[color][pawnIndex];
    const oppLapped = oppPawn ? !!oppPawn.lapped : false;
    Network._send({ type: 'swap_pawn', color, pawnIndex, newPosition, oppLapped });
  },
  skipTurn:     function() { Network._send({ type: 'skip_turn' }); },
  changeColor:  function(hex) { Network._send({ type: 'change_color', color: hex }); },
  sendChat:  function(text) { Network._send({ type: 'chat', text: text }); },

  // ── Message handler ──
  _handle: function(msg) {
    switch (msg.type) {

      case 'rejected':
        Network.onRejected(msg.reason);
        break;

      case 'welcome':
        _myName = msg.playerName;
        _amHost = msg.isHost;
        _isSpectator = false;
        if (msg.slot) {
          _playerColorMap[msg.playerName] = msg.slot;
        }
        // Store server-confirmed hex so onWelcome callback can theme immediately
        Network._myConfirmedHex = msg.chosenColor || null;
        Network.onWelcome(msg.playerName, msg.isHost, msg.chosenColor || null);
        break;

      case 'spectator_welcome':
        _myName = msg.playerName;
        _isSpectator = true;
        _amHost = false;
        Network.onSpectatorJoined(msg.playerName);
        break;

      case 'promoted_to_host':
        _amHost = true;
        Network.onPromotedToHost();
        break;

      case 'lobby_update':
        // Keep slot color map in sync with server's authoritative slot assignment
        if (msg.playersInfo) {
          msg.playersInfo.forEach(function(info) {
            if (info.slot) {
              _playerColorMap[info.name] = info.slot;
            }
          });
        }
        Network.onLobbyUpdate(msg);
        break;

      case 'system':
        Network.onSystemMessage(msg.text);
        break;

      case 'error':
        Network.onError(msg.text);
        break;

      case 'chat':
        Network.onChatMessage(msg.from, msg.text, msg.color || '');
        break;

      case 'game_started':
        // Pass colorMap (slot→hex) to UI before triggering state change
        Network.onGameStarted(msg.colorMap || {});
        // Tell game-state the game is live → triggers onStateChange → showGameView()
        applyAction({ type: ActionTypes.START_GAME });
        break;

      case 'turn_update':
        _isMyTurn = (msg.currentTurnName === _myName);
        _cardInPlay = false;
        var turnColor = _playerColorMap[msg.currentTurnName];
        if (turnColor && getState().currentTurn !== turnColor) {
          applyAction({ type: ActionTypes.SYNC_TURN_COLOR, payload: { color: turnColor } });
        }
        Network.onTurnUpdate(msg.currentTurnName);
        break;

      case 'card_drawn':
        Network.onCardDrawn(msg.from, msg.card, msg.cardsRemaining);
        break;

      case 'pawn_moved':
        applyAction({
          type: ActionTypes.MOVE_PAWN,
          payload: { pawnId: msg.pawnId, color: msg.color, newPosition: msg.newPosition, lapped: msg.lapped }
        });
        Network.onPawnMoved(msg.color, msg.pawnId, msg.newPosition, msg.lapped);
        break;

      case 'color_changed':
        // Update our confirmed hex if it's our own color that changed
        if (msg.playerName === _myName && msg.colorMap) {
          var mySlot = _playerColorMap[_myName];
          if (mySlot && msg.colorMap[mySlot]) {
            Network._myConfirmedHex = msg.colorMap[mySlot];
          }
        }
        Network.onColorChanged(msg.playerName, msg.colorMap || {});
        break;

      case 'player_quit':
        Network.onPlayerQuit(msg.playerName, msg.color);
        break;

      default:
        console.warn('[Network] Unknown message:', msg.type);
    }
  },
};
