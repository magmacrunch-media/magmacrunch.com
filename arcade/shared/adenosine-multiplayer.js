"use strict";
var AdMP = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    BoardGameTemplate: () => BoardGameTemplate,
    MP: () => MP,
    MP_PALETTE: () => MP_PALETTE,
    MSG: () => MSG
  });

  // src/protocol.ts
  var MSG = {
    // ── Client → Server ──────────────────────────────────────────────────────
    JOIN: "join",
    CREATE_ROOM: "create_room",
    JOIN_ROOM: "join_room",
    SPECTATE: "spectate",
    START_GAME: "start_game",
    GAME_ACTION: "game_action",
    CHAT: "chat",
    QUIT: "quit",
    // ── Server → Client ──────────────────────────────────────────────────────
    LOBBY_SNAPSHOT: "lobby_snapshot",
    WELCOME: "welcome",
    SPECTATOR_WELCOME: "spectator_welcome",
    REJECTED: "rejected",
    LOBBY_UPDATE: "lobby_update",
    GAME_STARTED: "game_started",
    GAME_STATE: "game_state",
    GAME_ACTION_BC: "game_action",
    // broadcast game action
    CHAT_MSG: "chat",
    SYSTEM_MSG: "system",
    PLAYER_QUIT: "player_quit"
  };
  var MP_PALETTE = [
    "#ff2d55",
    "#ff7c1e",
    "#ffe135",
    "#39d353",
    "#6cd4f5",
    "#4059c8",
    "#9b30ff",
    "#ff69b4",
    "#fff5e1",
    "#00fa9a",
    "#ff4f6d",
    "#7b68ee"
  ];

  // src/network.ts
  function str(msg, key) {
    const v = msg[key];
    return typeof v === "string" ? v : "";
  }
  var MP = {
    // ── Callbacks (assign before calling connect) ────────────────────────────
    onConnected() {
    },
    onDisconnected() {
    },
    onRejected(_reason) {
    },
    onWelcome(_data) {
    },
    onSpectatorWelcome(_data) {
    },
    onLobbyUpdate(_data) {
    },
    onLobbySnapshot(_data) {
    },
    onGameStarted(_data) {
    },
    onGameState(_state) {
    },
    onGameAction(_action) {
    },
    onChatMessage(_from, _text, _color) {
    },
    onSystemMessage(_text) {
    },
    onPlayerJoined(_data) {
    },
    onPlayerQuit(_data) {
    },
    onRoomCreated(_code) {
    },
    onRoomJoined(_code) {
    },
    onError(_text) {
    },
    // ── State ────────────────────────────────────────────────────────────────
    _socket: null,
    _myName: null,
    _myColor: null,
    _roomCode: null,
    _isHost: false,
    _isSpectator: false,
    // ── Getters ──────────────────────────────────────────────────────────────
    getMyName() {
      return MP._myName;
    },
    getMyColor() {
      return MP._myColor;
    },
    getRoomCode() {
      return MP._roomCode;
    },
    amIHost() {
      return MP._isHost;
    },
    isSpectator() {
      return MP._isSpectator;
    },
    isConnected() {
      return MP._socket !== null && MP._socket.readyState === WebSocket.OPEN;
    },
    // ── Connect ──────────────────────────────────────────────────────────────
    connect(server) {
      const addr = server || MP._resolveServer();
      const url = addr.startsWith("ws") ? addr : MP._scheme(addr) + addr;
      MP._socket = new WebSocket(url);
      MP._socket.addEventListener("open", () => {
        MP.onConnected();
      });
      MP._socket.addEventListener("close", () => {
        MP._myName = null;
        MP._myColor = null;
        MP._roomCode = null;
        MP._isHost = false;
        MP._isSpectator = false;
        MP.onDisconnected();
      });
      MP._socket.addEventListener("error", () => {
        MP.onError("Connection error \u2014 is the server running?");
      });
      MP._socket.addEventListener("message", (e) => {
        let msg;
        try {
          msg = JSON.parse(String(e.data));
        } catch {
          console.error("[MP] Bad JSON:", e.data);
          return;
        }
        MP._handle(msg);
      });
    },
    // Deployment wiring from configure(). Empty by default: an install that
    // configures nothing talks to its own origin and nowhere else.
    _config: {},
    /**
     * Declare where this deployment's game server lives.
     *
     * Call before connect(). Both fields are optional and merge over whatever a
     * previous call set, so a page can name its server without restating the
     * allowlist.
     */
    configure(cfg) {
      MP._config = { ...MP._config, ...cfg };
    },
    // Hosts the ?server= override is allowed to name. Without this a crafted link
    // can point a visitor's game socket, and the name they play under, at any
    // host the attacker chooses.
    //
    // The page's own origin is always allowed; anything else a deployment needs
    // it declares through configure({ allowlist }). Hardcoding one deployment's
    // hosts here would hand every other install a socket pointed at a stranger.
    _allowlist() {
      const extra = MP._config.allowlist ?? [];
      const own = ["localhost", "127.0.0.1"];
      try {
        if (window.location.hostname) own.push(window.location.hostname);
      } catch {
      }
      return [...own, ...extra];
    },
    // RFC1918. Note 172 is only private from 172.16 to 172.31 — a bare /^172\./
    // also swallows public addresses such as 172.217.14.5.
    _PRIVATE: /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/,
    _hostOf(addr) {
      return String(addr).replace(/^wss?:\/\//, "").split("/")[0].split(":")[0];
    },
    _isAllowed(addr) {
      const host = MP._hostOf(addr);
      if (MP._PRIVATE.test(host)) return true;
      return MP._allowlist().indexOf(host) !== -1;
    },
    // A ws: socket opened from an https: page is blocked as mixed content, so the
    // scheme has to follow the page rather than the address. Loopback and LAN
    // addresses have no certificate and stay on plain ws:.
    _scheme(addr) {
      const host = MP._hostOf(addr);
      if (host === "localhost" || host === "127.0.0.1" || MP._PRIVATE.test(host)) return "ws://";
      try {
        return window.location.protocol === "https:" ? "wss://" : "ws://";
      } catch {
        return "ws://";
      }
    },
    _resolveServer() {
      try {
        const param = new URLSearchParams(window.location.search).get("server");
        if (param && param.trim()) {
          if (MP._isAllowed(param.trim())) return param.trim();
          console.warn("[MP] ignoring ?server= override for non-allowlisted host: " + MP._hostOf(param));
        }
      } catch {
      }
      if (MP._config.defaultServer) return MP._config.defaultServer;
      if (typeof MP_DEFAULT_SERVER !== "undefined") return MP_DEFAULT_SERVER;
      try {
        return window.location.host;
      } catch {
        return "localhost";
      }
    },
    // ── Senders ──────────────────────────────────────────────────────────────
    _send(obj) {
      if (MP.isConnected()) MP._socket.send(JSON.stringify(obj));
      else console.warn("[MP] Not connected, cannot send:", obj);
    },
    join(name, color, room) {
      MP._myName = name;
      MP._send({ type: "join", name, color, room: room || null });
    },
    createRoom(name, color, roomCode) {
      MP._myName = name;
      MP._send({ type: "create_room", name, color, room: roomCode });
    },
    joinRoom(name, color, roomCode) {
      MP._myName = name;
      MP._send({ type: "join_room", name, color, room: roomCode });
    },
    spectate(name, room) {
      MP._isSpectator = true;
      MP._myName = name;
      MP._send({ type: "spectate", name, room: room || null });
    },
    startGame() {
      MP._send({ type: "start_game" });
    },
    sendAction(action) {
      MP._send({ type: "game_action", action });
    },
    sendChat(text) {
      MP._send({ type: "chat", text });
    },
    quit() {
      MP._send({ type: "quit" });
      MP._myName = null;
      MP._roomCode = null;
    },
    // ── Message Handler ──────────────────────────────────────────────────────
    _handle(msg) {
      switch (msg.type) {
        case "lobby_snapshot":
          MP.onLobbySnapshot(msg);
          break;
        case "welcome":
          MP._myName = str(msg, "playerName");
          MP._roomCode = str(msg, "room");
          MP._isHost = msg["isHost"] === true;
          MP._myColor = str(msg, "chosenColor");
          MP._isSpectator = false;
          MP.onWelcome(msg);
          MP.onRoomJoined(str(msg, "room"));
          break;
        case "spectator_welcome":
          MP._myName = str(msg, "playerName");
          MP._roomCode = str(msg, "room");
          MP._isSpectator = true;
          MP._isHost = false;
          MP.onSpectatorWelcome(msg);
          MP.onRoomJoined(str(msg, "room"));
          break;
        case "rejected":
          MP.onRejected(str(msg, "reason"));
          break;
        case "lobby_update":
          MP.onLobbyUpdate(msg);
          break;
        case "game_started":
          MP.onGameStarted(msg);
          break;
        case "game_state":
          MP.onGameState(msg["state"]);
          break;
        case "game_action":
          MP.onGameAction(msg["action"]);
          break;
        case "chat":
          MP.onChatMessage(str(msg, "from"), str(msg, "text"), str(msg, "color"));
          break;
        case "system":
          MP.onSystemMessage(str(msg, "text"));
          break;
        case "player_quit":
          MP.onPlayerQuit(msg);
          break;
        default:
          console.warn("[MP] Unknown message:", msg.type);
      }
    }
  };

  // src/board-game-template.ts
  var BoardGameTemplate = (function() {
    "use strict";
    function esc(s) {
      var d = document.createElement("div");
      d.textContent = s;
      return d.innerHTML;
    }
    function render(cfg) {
      var title = cfg.title || "GAME";
      var subtitle = cfg.subtitle || "// NEON EDITION //";
      var footer = cfg.footer || ["CLASSIC BOARD GAME"];
      var buttons = cfg.buttons || [
        { id: "startGameBtn", label: "\u25B6\xA0\xA0CLICK OR PRESS SPACE TO START", cls: "primary" },
        { id: "helpBtn", label: "HOW TO PLAY" },
        { id: "creditsBtn", label: "CREDITS" }
      ];
      var gameControls = cfg.gameControls || [
        { id: "newGameBtn", label: "NEW GAME" },
        { id: "menuBtn", label: "MENU" }
      ];
      var btnsHtml = "";
      for (const b of buttons) {
        const cls = "start-btn" + (b.cls ? " " + b.cls : "");
        const icon = b.icon ? b.icon + "&nbsp;&nbsp;" : "";
        btnsHtml += '<button id="' + esc(b.id) + '" class="' + cls + '">' + icon + esc(b.label) + "</button>\n";
      }
      var footerHtml = "";
      for (const line of footer) {
        footerHtml += "<p>" + esc(line) + "</p>\n";
      }
      var controlsHtml = "";
      for (const c of gameControls) {
        controlsHtml += '<button id="' + esc(c.id) + '" class="control-btn">' + esc(c.label) + "</button>\n";
      }
      var gameBody = cfg.gameBody || "";
      var extraStats = cfg.gameHeader || "";
      var instructions = cfg.instructions || "<h3>Rules</h3><p>Game instructions go here.</p>";
      var credits = cfg.credits || "<h3>" + esc(title) + "</h3>";
      var html = "";
      html += '<div id="startScreen" class="start-screen">\n';
      html += '  <div class="start-content">\n';
      html += '    <h1 class="game-title">' + esc(title) + "</h1>\n";
      html += '    <p class="game-subtitle">' + subtitle + "</p>\n";
      html += '    <div class="start-divider"></div>\n';
      html += '    <div class="start-buttons">\n' + btnsHtml + "    </div>\n";
      if (cfg.extraStart) html += cfg.extraStart + "\n";
      html += '    <div class="start-footer">\n' + footerHtml + "    </div>\n";
      html += "  </div>\n";
      html += "</div>\n\n";
      html += '<div id="gameScreen" class="game-screen" style="display: none;">\n';
      html += '  <div class="game-header">\n';
      html += '    <h1><span style="color: #00f5ff;">\u25C4</span> ' + esc(title) + ' <span style="color: #ff2d78;">\u25BA</span></h1>\n';
      html += '    <div class="game-stats">\n';
      html += '      <div class="stat-item"><span class="stat-label">TURN</span><span class="stat-value" id="turnIndicator">YOUR TURN</span></div>\n';
      html += extraStats;
      html += "    </div>\n";
      html += "  </div>\n\n";
      html += '  <div class="game-layout">\n';
      html += '    <div class="board-area">\n';
      html += '      <div id="boardContainer" class="board-container"></div>\n';
      html += "    </div>\n";
      html += gameBody;
      html += "  </div>\n\n";
      html += '  <div class="message-area">\n';
      html += '    <div id="gameMessage" class="game-message">Select a piece to move</div>\n';
      html += "  </div>\n\n";
      html += '  <div class="game-controls">\n' + controlsHtml + "  </div>\n";
      html += "</div>\n";
      html += '<div id="lobbyOverlay" class="modal-overlay" style="display: none;">\n';
      html += '  <div class="modal-content lobby-content">\n';
      html += '    <div class="modal-titlebar"><span>ONLINE LOBBY</span><button id="closeLobby" class="modal-close">\u2715</button></div>\n';
      html += '    <div class="modal-body">\n';
      html += '      <div id="lobbyStatus" class="lobby-status">Connecting...</div>\n';
      html += '      <div id="roomCodeDisplay" class="room-code-display" style="display: none;"><span class="room-code-label">ROOM</span><span id="roomCodeValue" class="room-code-value">----</span></div>\n';
      html += '      <div class="lobby-players"><div class="lobby-players-header">PLAYERS</div><div id="lobbyPlayerList" class="lobby-player-list"></div></div>\n';
      html += '      <div class="lobby-actions">\n';
      html += '        <button id="startMultiplayerBtn" class="start-btn primary" style="display: none;">START GAME</button>\n';
      html += '        <button id="spectateBtn" class="start-btn">SPECTATE</button>\n';
      html += '        <button id="leaveLobbyBtn" class="start-btn">LEAVE</button>\n';
      html += "      </div>\n";
      html += "    </div>\n";
      html += "  </div>\n";
      html += "</div>\n\n";
      html += '<div id="instructionsModal" class="modal-overlay">\n';
      html += '  <div class="modal-content">\n';
      html += '    <div class="modal-titlebar"><span>HOW TO PLAY</span><button id="closeInstructions" class="modal-close">\u2715</button></div>\n';
      html += '    <div class="modal-body">\n' + instructions + "\n";
      html += '      <div class="modal-footer"><button id="closeInstructionsBtn">GOT IT!</button></div>\n';
      html += "    </div>\n";
      html += "  </div>\n";
      html += "</div>\n\n";
      html += '<div id="creditsModal" class="modal-overlay">\n';
      html += '  <div class="modal-content">\n';
      html += '    <div class="modal-titlebar"><span>CREDITS</span><button id="closeCredits" class="modal-close">\u2715</button></div>\n';
      html += '    <div class="modal-body">\n' + credits + "\n";
      html += '      <div class="modal-footer"><button id="closeCreditsBtn">OK</button></div>\n';
      html += "    </div>\n";
      html += "  </div>\n";
      html += "</div>\n\n";
      html += '<div id="gameOverModal" class="modal-overlay">\n';
      html += '  <div class="modal-content game-over-content">\n';
      html += '    <div class="modal-titlebar"><span>GAME OVER</span></div>\n';
      html += '    <div class="modal-body">\n';
      html += '      <div class="game-over-icon">\u{1F3C6}</div>\n';
      html += '      <div id="gameOverTitle" class="game-over-title win">' + esc(cfg.gameOverTitle || "YOU WIN!") + "</div>\n";
      html += '      <div id="gameOverMessage" class="game-over-message">' + esc(cfg.gameOverMsg || "Congratulations!") + "</div>\n";
      html += '      <div class="modal-footer"><button id="playAgainBtn">PLAY AGAIN</button></div>\n';
      html += "    </div>\n";
      html += "  </div>\n";
      html += "</div>\n\n";
      var container = document.querySelector(".container");
      if (container) {
        container.insertAdjacentHTML("beforeend", html);
      }
      return html;
    }
    return { render };
  })();
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=index.global.js.map