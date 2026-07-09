/**
 * network.js — Shared multiplayer client layer
 * Game-agnostic WebSocket client for magmacrunch arcade games.
 *
 * Usage:
 *   MP.connect('wss://myserver.com');
 *   MP.onConnected = function() { ... };
 *   MP.onGameState = function(state) { ... };
 *   MP.sendAction({ type: 'play_card', card: {...} });
 */

var MP = {

  // ── Callbacks (assign before calling connect) ────────────────────────────

  onConnected:        function() {},
  onDisconnected:     function() {},
  onRejected:         function(reason) {},
  onWelcome:          function(data) {},
  onSpectatorWelcome: function(data) {},
  onLobbyUpdate:      function(data) {},
  onLobbySnapshot:    function(data) {},
  onGameStarted:      function(data) {},
  onGameState:        function(state) {},
  onGameAction:       function(action) {},
  onChatMessage:      function(from, text, color) {},
  onSystemMessage:    function(text) {},
  onPlayerJoined:     function(data) {},
  onPlayerQuit:       function(data) {},
  onRoomCreated:      function(code) {},
  onRoomJoined:       function(code) {},
  onError:            function(text) {},

  // ── State ────────────────────────────────────────────────────────────────

  _socket: null,
  _myName: null,
  _myColor: null,
  _roomCode: null,
  _isHost: false,
  _isSpectator: false,

  // ── Getters ──────────────────────────────────────────────────────────────

  getMyName:     function() { return MP._myName; },
  getMyColor:    function() { return MP._myColor; },
  getRoomCode:   function() { return MP._roomCode; },
  amIHost:       function() { return MP._isHost; },
  isSpectator:   function() { return MP._isSpectator; },
  isConnected:   function() { return MP._socket && MP._socket.readyState === WebSocket.OPEN; },

  // ── Connect ──────────────────────────────────────────────────────────────

  connect: function(server) {
    var addr = server || MP._resolveServer();
    var isLocal = addr.match(/^(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.)/);
    var scheme  = isLocal ? 'ws://' : 'wss://';
    var url = addr.startsWith('ws') ? addr : scheme + addr;

    MP._socket = new WebSocket(url);

    MP._socket.addEventListener('open', function() {
      MP.onConnected();
    });

    MP._socket.addEventListener('close', function() {
      MP._myName = null;
      MP._myColor = null;
      MP._roomCode = null;
      MP._isHost = false;
      MP._isSpectator = false;
      MP.onDisconnected();
    });

    MP._socket.addEventListener('error', function() {
      MP.onError('Connection error — is the server running?');
    });

    MP._socket.addEventListener('message', function(e) {
      var msg;
      try { msg = JSON.parse(e.data); }
      catch(err) { console.error('[MP] Bad JSON:', e.data); return; }
      MP._handle(msg);
    });
  },

  _resolveServer: function() {
    try {
      var param = new URLSearchParams(window.location.search).get('server');
      if (param && param.trim()) return param.trim();
    } catch(e) {}
    // Use MP_DEFAULT_SERVER if set by game, otherwise default to 8765
    return (typeof MP_DEFAULT_SERVER !== 'undefined') ? MP_DEFAULT_SERVER : 'localhost:8765';
  },

  // ── Senders ──────────────────────────────────────────────────────────────

  _send: function(obj) {
    if (MP.isConnected()) MP._socket.send(JSON.stringify(obj));
    else console.warn('[MP] Not connected, cannot send:', obj);
  },

  join: function(name, color, room) {
    MP._myName = name;
    MP._send({ type: 'join', name: name, color: color, room: room || null });
  },

  createRoom: function(name, color, roomCode) {
    MP._myName = name;
    MP._send({ type: 'create_room', name: name, color: color, room: roomCode });
  },

  joinRoom: function(name, color, roomCode) {
    MP._myName = name;
    MP._send({ type: 'join_room', name: name, color: color, room: roomCode });
  },

  spectate: function(name, room) {
    MP._isSpectator = true;
    MP._myName = name;
    MP._send({ type: 'spectate', name: name, room: room || null });
  },

  startGame: function() {
    MP._send({ type: 'start_game' });
  },

  sendAction: function(action) {
    MP._send({ type: 'game_action', action: action });
  },

  sendChat: function(text) {
    MP._send({ type: 'chat', text: text });
  },

  quit: function() {
    MP._send({ type: 'quit' });
    MP._myName = null;
    MP._roomCode = null;
  },

  // ── Message Handler ──────────────────────────────────────────────────────

  _handle: function(msg) {
    switch (msg.type) {

      case 'lobby_snapshot':
        MP.onLobbySnapshot(msg);
        break;

      case 'welcome':
        MP._myName = msg.playerName;
        MP._roomCode = msg.room;
        MP._isHost = msg.isHost;
        MP._myColor = msg.chosenColor;
        MP._isSpectator = false;
        MP.onWelcome(msg);
        MP.onRoomJoined(msg.room);
        break;

      case 'spectator_welcome':
        MP._myName = msg.playerName;
        MP._roomCode = msg.room;
        MP._isSpectator = true;
        MP._isHost = false;
        MP.onSpectatorWelcome(msg);
        MP.onRoomJoined(msg.room);
        break;

      case 'rejected':
        MP.onRejected(msg.reason);
        break;

      case 'lobby_update':
        MP.onLobbyUpdate(msg);
        break;

      case 'game_started':
        MP.onGameStarted(msg);
        break;

      case 'game_state':
        MP.onGameState(msg.state);
        break;

      case 'game_action':
        MP.onGameAction(msg.action);
        break;

      case 'chat':
        MP.onChatMessage(msg.from, msg.text, msg.color || '');
        break;

      case 'system':
        MP.onSystemMessage(msg.text);
        break;

      case 'player_quit':
        MP.onPlayerQuit(msg);
        break;

      default:
        console.warn('[MP] Unknown message:', msg.type);
    }
  }
};
