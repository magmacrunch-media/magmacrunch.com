"use strict";
var AdChat = (() => {
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
    ChatWidget: () => ChatWidget
  });

  // src/chat-widget.ts
  var ChatWidget = (function() {
    "use strict";
    var WS_SCHEME = (function() {
      try {
        return window.location.protocol === "https:" ? "wss://" : "ws://";
      } catch (e) {
        return "ws://";
      }
    })();
    function hostOf(addr) {
      return String(addr).replace(/^wss?:\/\//, "").split("/")[0].split(":")[0];
    }
    function isAllowedServer(addr, extra, configured) {
      var host = hostOf(addr);
      var allowed = ["localhost", "127.0.0.1"];
      try {
        if (window.location.hostname) allowed.push(window.location.hostname);
      } catch (e) {
      }
      if (configured) allowed.push(hostOf(configured));
      if (extra) allowed = allowed.concat(extra);
      for (var i = 0; i < allowed.length; i++) {
        if (host === allowed[i]) return true;
      }
      return false;
    }
    var chatServer = null;
    function resolveChatServer(opts) {
      var withScheme = function(addr) {
        return /^wss?:\/\//.test(addr) ? addr : WS_SCHEME + addr;
      };
      try {
        var param = new URLSearchParams(window.location.search).get("server");
        if (param && isAllowedServer(param, opts && opts.allowlist, opts && opts.server)) {
          return withScheme(param);
        }
        if (param) {
          console.warn("[ChatWidget] ignoring ?server= override for non-allowlisted host: " + hostOf(param));
        }
      } catch (e) {
      }
      if (opts && opts.server) return withScheme(opts.server);
      try {
        return WS_SCHEME + window.location.host;
      } catch (e) {
        return "ws://localhost";
      }
    }
    var OWN_SCRIPT_SRC = typeof document !== "undefined" && document.currentScript && document.currentScript.src || null;
    function resolveWorkerUrl(explicit) {
      if (explicit) return explicit;
      if (OWN_SCRIPT_SRC) return OWN_SCRIPT_SRC.replace(/[^/]*$/, "chat-worker.js");
      var scripts = typeof document !== "undefined" ? Array.from(document.getElementsByTagName("script")) : [];
      for (let i = scripts.length - 1; i >= 0; i--) {
        const src = scripts[i].src;
        if (src && /(chat-widget|adenosine-chat|index\.global)\.js(\?|$)/.test(src)) {
          return src.replace(/[^/]*$/, "chat-worker.js");
        }
      }
      return window.location.href.replace(/[^/]*$/, "chat-worker.js");
    }
    let sock = null;
    let worker = null;
    let usingWorker = false;
    let currentRoom = null;
    let myName = null;
    let myColor = null;
    let typingTimeout = null;
    let typingHideTimer = null;
    let unreadCount = 0;
    let isExpanded = false;
    let widgetEl = null;
    function getSessionToken() {
      try {
        var token = localStorage.getItem("adenosine_chat_session");
        if (!token) {
          token = Math.random().toString(36).substring(2) + Date.now().toString(36);
          localStorage.setItem("adenosine_chat_session", token);
        }
        return token;
      } catch (e) {
        return null;
      }
    }
    function createWidget() {
      if (widgetEl) return;
      var w = document.createElement("div");
      w.id = "arcadeChatWidget";
      w.className = "acw minimized";
      w.innerHTML = [
        '<div class="acw-bar" id="acwBar">',
        '  <div class="acw-icon"></div>',
        '  <span class="acw-online-count" id="acwOnlineCount">0</span>',
        '  <span class="acw-badge" id="acwBadge" style="display:none">0</span>',
        "</div>",
        '<div class="acw-header">',
        '  <span class="acw-header-title" id="chatHeaderTitle">// ARCADE CHAT //</span>',
        '  <button class="acw-minimize" id="acwMinimize" aria-label="minimize">\u2014</button>',
        "</div>",
        '<div class="acw-window" id="acwWindow">',
        '  <div class="acw-name-row">',
        '    <span id="chatMyName" class="acw-my-name"></span>',
        '    <button id="chatEditName" class="acw-edit-name" title="Edit name">\u270E</button>',
        '    <button id="chatPickColor" class="acw-pick-color" title="Pick color">\u{1F3A8}</button>',
        "  </div>",
        '  <div id="colorPickerPopup" class="acw-color-popup" style="display:none">',
        '    <div id="colorStrip" class="acw-color-strip"></div>',
        '    <div class="acw-color-preview-row">',
        "      <span>Current:</span>",
        '      <div id="colorPreview" class="acw-color-preview"></div>',
        '      <button id="colorResetBtn" class="acw-color-reset-btn">Reset</button>',
        "    </div>",
        "  </div>",
        '  <div class="acw-tabs">',
        '    <button class="acw-tab active" data-tab="global">GLOBAL</button>',
        '    <button class="acw-tab" data-tab="online">ONLINE</button>',
        "  </div>",
        '  <div class="acw-messages" id="chatMessagesGlobal">',
        '    <div class="acw-msg system">Welcome to the arcade! Say hello.</div>',
        "  </div>",
        '  <div class="acw-online-panel" id="chatOnline">',
        '    <div id="chatOnlineList"></div>',
        "  </div>",
        '  <div class="acw-typing" id="chatTyping" style="display:none"></div>',
        '  <div class="acw-input">',
        '    <input id="chatInput" type="text" placeholder="Type a message..." maxlength="200">',
        '    <button id="chatSend">\u25B6</button>',
        "  </div>",
        "</div>"
      ].join("\n");
      document.body.appendChild(w);
      widgetEl = w;
      var savedState = localStorage.getItem("adenosine_expanded");
      if (savedState === "true") {
        expand();
      } else {
        minimize();
      }
      var savedName = localStorage.getItem("adenosine_username");
      if (savedName) {
        myName = savedName;
      }
      var savedColor = localStorage.getItem("adenosine_color");
      if (savedColor) {
        myColor = savedColor;
      }
      wireEvents();
    }
    function wireEvents() {
      var bar = document.getElementById("acwBar");
      if (bar) {
        bar.addEventListener("click", function(e) {
          if (e.target?.closest(".acw-badge")) return;
          toggle();
        });
      }
      var minBtn = document.getElementById("acwMinimize");
      if (minBtn) {
        minBtn.addEventListener("click", function(e) {
          e.stopPropagation();
          minimize();
        });
      }
      var sendBtn = document.getElementById("chatSend");
      if (sendBtn) {
        sendBtn.addEventListener("click", send);
      }
      var input = document.getElementById("chatInput");
      if (input) {
        input.addEventListener("keypress", function(e) {
          if (e.key === "Enter") send();
        });
        input.addEventListener("input", handleTyping);
      }
      var editName = document.getElementById("chatEditName");
      if (editName) {
        editName.addEventListener("click", startEditName);
      }
      var pickColor = document.getElementById("chatPickColor");
      if (pickColor) {
        pickColor.addEventListener("click", function(e) {
          e.stopPropagation();
          toggleColorPicker();
        });
      }
      var colorStrip = document.getElementById("colorStrip");
      if (colorStrip) {
        colorStrip.addEventListener("click", function(e) {
          var rect = colorStrip.getBoundingClientRect();
          var x = e.clientX - rect.left;
          var hue = x / rect.width * 360;
          var color = hslToHex(hue, 100, 50);
          setColor(color);
        });
      }
      var resetBtn = document.getElementById("colorResetBtn");
      if (resetBtn) {
        resetBtn.addEventListener("click", function() {
          myColor = null;
          localStorage.removeItem("adenosine_color");
          updateColorDisplay();
          sendToServer({ type: "set_color", color: null });
        });
      }
      const tabs = widgetEl.querySelectorAll(".acw-tab");
      tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          switchTab(tab.dataset["tab"] ?? "global");
        });
      });
      document.addEventListener("click", function(e) {
        var popup = document.getElementById("colorPickerPopup");
        if (popup && popup.style.display !== "none") {
          if (!popup.contains(e.target) && e.target !== pickColor) {
            popup.style.display = "none";
          }
        }
      });
    }
    function toggle() {
      if (isExpanded) {
        minimize();
      } else {
        expand();
      }
    }
    function expand() {
      if (!widgetEl) return;
      isExpanded = true;
      widgetEl.classList.remove("minimized");
      widgetEl.classList.add("expanded");
      localStorage.setItem("adenosine_expanded", "true");
      unreadCount = 0;
      updateBadge();
      var input = document.getElementById("chatInput");
      if (input) setTimeout(function() {
        input.focus();
      }, 100);
    }
    function minimize() {
      if (!widgetEl) return;
      isExpanded = false;
      widgetEl.classList.remove("expanded");
      widgetEl.classList.add("minimized");
      localStorage.setItem("adenosine_expanded", "false");
    }
    function addUnread() {
      if (isExpanded) return;
      unreadCount++;
      updateBadge();
    }
    function updateBadge() {
      var badge = document.getElementById("acwBadge");
      if (!badge) return;
      if (unreadCount > 0) {
        badge.style.display = "";
        badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
      } else {
        badge.style.display = "none";
      }
    }
    function connect(opts) {
      chatServer = resolveChatServer(opts);
      createWidget();
      if (typeof SharedWorker !== "undefined" && !worker) {
        try {
          worker = new SharedWorker(resolveWorkerUrl(opts && opts.workerUrl));
          usingWorker = true;
          worker.port.onmessage = function(e) {
            handleWorkerMessage(e.data);
          };
          worker.port.start();
          worker.port.postMessage(JSON.stringify({ _worker: "connect", url: chatServer }));
          window.addEventListener("pagehide", function() {
            try {
              worker.port.postMessage(JSON.stringify({ _worker: "disconnect" }));
            } catch (e) {
            }
          });
          return;
        } catch (e) {
          worker = null;
          usingWorker = false;
        }
      }
      connectDirect();
    }
    function connectDirect() {
      if (sock) return;
      sock = new WebSocket(chatServer || resolveChatServer());
      sock.onopen = function() {
        widgetEl.classList.remove("disconnected");
        sendSavedCredentials();
      };
      sock.onmessage = function(e) {
        try {
          handleMessage(JSON.parse(e.data));
        } catch (err) {
        }
      };
      sock.onclose = function() {
        widgetEl.classList.add("disconnected");
        clearOnlinePresence();
        sock = null;
        setTimeout(connectDirect, 5e3);
      };
      sock.onerror = function() {
        sock.close();
      };
    }
    function sendSavedCredentials() {
      var token = getSessionToken();
      const nameMsg = { type: "set_name", name: myName || "Player" };
      if (token) nameMsg["session_token"] = token;
      sendToServer(nameMsg);
      if (myColor) sendToServer({ type: "set_color", color: myColor });
    }
    function handleWorkerMessage(data) {
      var msg;
      try {
        msg = JSON.parse(data);
      } catch (e) {
        return;
      }
      if (msg._worker === "connect") {
        widgetEl.classList.remove("disconnected");
        sendSavedCredentials();
        return;
      }
      if (msg._worker === "disconnect") {
        widgetEl.classList.add("disconnected");
        clearOnlinePresence();
        return;
      }
      handleMessage(msg);
    }
    function sendToServer(obj) {
      if (usingWorker && worker) {
        worker.port.postMessage(JSON.stringify({ _worker: "send", data: obj }));
      } else if (sock && sock.readyState === WebSocket.OPEN) {
        sock.send(JSON.stringify(obj));
      }
    }
    function disconnect() {
      if (currentRoom) leaveRoom(currentRoom);
      if (usingWorker && worker) {
        try {
          worker.port.postMessage(JSON.stringify({ _worker: "disconnect" }));
        } catch (e) {
        }
        try {
          worker.port.close();
        } catch (e) {
        }
        worker = null;
        usingWorker = false;
      }
      if (sock) {
        try {
          sock.close();
        } catch (e) {
        }
      }
      sock = null;
      myName = null;
      myColor = null;
    }
    function handleMessage(msg) {
      switch (msg.type) {
        case "history":
          if (Array.isArray(msg["messages"])) {
            msg["messages"].forEach((m) => {
              addMessage("global", m);
            });
          }
          break;
        case "chat":
          addMessage("global", msg);
          addUnread();
          break;
        case "room_history":
          if (Array.isArray(msg["messages"])) {
            msg["messages"].forEach((m) => {
              addMessage("room", m);
            });
          }
          break;
        case "room_chat":
          addMessage("room", msg);
          break;
        case "name_assigned":
          myName = field(msg, "name");
          localStorage.setItem("adenosine_username", field(msg, "name"));
          updateNameDisplay();
          break;
        case "user_list":
          const users = Array.isArray(msg["users"]) ? msg["users"] : [];
          updateOnlineList(users);
          updateOnlineCount(typeof msg["count"] === "number" ? msg["count"] : users.length);
          if (myName) {
            for (const u of users) {
              if (u.name === myName) {
                myColor = u.color ?? null;
                updateColorDisplay();
                break;
              }
            }
          }
          break;
        case "typing":
          showTyping(field(msg, "from"), field(msg, "room"));
          break;
        case "status":
          break;
      }
    }
    function joinRoom(roomCode) {
      currentRoom = roomCode;
      sendToServer({ type: "join_room", room: roomCode });
      if (myName) {
        var token = getSessionToken();
        const nameMsg = { type: "set_name", name: myName };
        if (token) nameMsg["session_token"] = token;
        sendToServer(nameMsg);
      }
      var headerTitle = document.getElementById("chatHeaderTitle");
      if (headerTitle) headerTitle.textContent = "// ROOM " + roomCode + " //";
      const roomTab = widgetEl.querySelector('[data-tab="room"]');
      if (roomTab) roomTab.style.display = "";
      switchTab("global");
    }
    function leaveRoom(roomCode) {
      sendToServer({ type: "leave_room", room: roomCode });
      if (currentRoom === roomCode) {
        currentRoom = null;
        var headerTitle = document.getElementById("chatHeaderTitle");
        if (headerTitle) headerTitle.textContent = "// ARCADE CHAT //";
      }
    }
    function send() {
      var input = document.getElementById("chatInput");
      if (!input) return;
      var connected = usingWorker && worker || sock && sock.readyState === WebSocket.OPEN;
      if (!connected) return;
      const text = input.value.trim();
      if (!text) return;
      var name = myName || "Player";
      var token = getSessionToken();
      const nameMsg = { type: "set_name", name };
      if (token) nameMsg["session_token"] = token;
      sendToServer(nameMsg);
      var msg = { type: "chat", text };
      if (currentRoom) msg["room"] = currentRoom;
      sendToServer(msg);
      addMessage(currentRoom ? "room" : "global", {
        type: "chat",
        from: name,
        text,
        color: myColor || "#39ff6e"
      });
      input.value = "";
    }
    function setName(name) {
      if (!name) return;
      var connected = usingWorker && worker || sock && sock.readyState === WebSocket.OPEN;
      if (!connected) return;
      myName = name;
      localStorage.setItem("adenosine_username", name);
      var token = getSessionToken();
      const nameMsg = { type: "set_name", name };
      if (token) nameMsg["session_token"] = token;
      sendToServer(nameMsg);
      updateNameDisplay();
    }
    function startEditName() {
      var nameEl = document.getElementById("chatMyName");
      var editBtn = document.getElementById("chatEditName");
      if (!nameEl) return;
      var currentName = myName || "";
      var input = document.createElement("input");
      input.type = "text";
      input.className = "acw-name-input";
      input.value = currentName;
      input.maxLength = 20;
      nameEl.style.display = "none";
      editBtn.style.display = "none";
      nameEl.parentNode.insertBefore(input, nameEl.nextSibling);
      input.focus();
      input.select();
      function finishEdit() {
        var newName = input.value.trim();
        if (newName) {
          setName(newName);
        }
        input.remove();
        nameEl.style.display = "";
        editBtn.style.display = "";
      }
      input.addEventListener("keypress", function(e) {
        if (e.key === "Enter") finishEdit();
      });
      input.addEventListener("blur", finishEdit);
    }
    function updateNameDisplay() {
      var nameEl = document.getElementById("chatMyName");
      if (nameEl) {
        nameEl.textContent = myName || "...";
      }
    }
    function setColor(color) {
      myColor = color;
      localStorage.setItem("adenosine_color", color);
      sendToServer({ type: "set_color", color });
      updateColorDisplay();
      var popup = document.getElementById("colorPickerPopup");
      if (popup) popup.style.display = "none";
    }
    function updateColorDisplay() {
      var nameEl = document.getElementById("chatMyName");
      if (nameEl) {
        nameEl.style.color = myColor || "#39ff6e";
      }
      var preview = document.getElementById("colorPreview");
      if (preview) {
        preview.style.background = myColor || "#39ff6e";
      }
    }
    function toggleColorPicker() {
      var popup = document.getElementById("colorPickerPopup");
      if (!popup) return;
      popup.style.display = popup.style.display === "none" ? "block" : "none";
      if (popup.style.display === "block") {
        updateColorDisplay();
      }
    }
    function switchTab(tab) {
      var messages = document.getElementById("chatMessagesGlobal");
      var online = document.getElementById("chatOnline");
      const tabs = widgetEl.querySelectorAll(".acw-tab");
      tabs.forEach(function(t) {
        t.classList.toggle("active", t.dataset["tab"] === tab);
      });
      if (tab === "global") {
        if (messages) messages.style.display = "";
        if (online) online.style.display = "none";
      } else if (tab === "online") {
        if (messages) messages.style.display = "none";
        if (online) online.style.display = "";
      }
    }
    function addMessage(_target, msg) {
      var container = document.getElementById("chatMessagesGlobal");
      if (!container) return;
      var div = document.createElement("div");
      div.className = "acw-msg";
      if (field(msg, "from") === "system") div.className += " system";
      var nameEl = document.createElement("span");
      nameEl.className = "chat-name";
      nameEl.style.color = field(msg, "color") || "#ff2e9c";
      nameEl.textContent = field(msg, "from") + ":";
      div.appendChild(nameEl);
      div.appendChild(document.createTextNode(" " + field(msg, "text")));
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;
    }
    function updateOnlineList(users) {
      var list = document.getElementById("chatOnlineList");
      if (!list) return;
      list.innerHTML = "";
      if (users) {
        users.forEach(function(u) {
          var div = document.createElement("div");
          div.className = "acw-online-user";
          var dot = document.createElement("span");
          dot.className = "acw-online-dot";
          dot.style.background = u.color ?? "";
          var nameEl = document.createElement("span");
          nameEl.className = "acw-online-name";
          nameEl.textContent = u.name;
          var statusEl = document.createElement("span");
          statusEl.className = "acw-online-status";
          statusEl.textContent = u.game || (u.rooms && u.rooms.length ? "In Room" : "Online");
          div.appendChild(dot);
          div.appendChild(nameEl);
          div.appendChild(statusEl);
          list.appendChild(div);
        });
      }
    }
    function updateOnlineCount(count) {
      var el = document.getElementById("acwOnlineCount");
      if (el) el.textContent = String(count);
    }
    function clearOnlinePresence() {
      var el = document.getElementById("acwOnlineCount");
      if (el) el.textContent = "\u2014";
      updateOnlineList([]);
    }
    function showTyping(name, _room) {
      var el = document.getElementById("chatTyping");
      if (!el) return;
      el.textContent = name + " is typing...";
      el.style.display = "block";
      if (typingHideTimer) clearTimeout(typingHideTimer);
      typingHideTimer = setTimeout(function() {
        el.style.display = "none";
      }, 3e3);
    }
    function handleTyping() {
      if (typingTimeout) return;
      var msg = { type: "typing" };
      if (currentRoom) msg["room"] = currentRoom;
      sendToServer(msg);
      typingTimeout = setTimeout(function() {
        typingTimeout = null;
      }, 2e3);
    }
    function field(msg, key) {
      const v = msg[key];
      return typeof v === "string" ? v : "";
    }
    function hslToHex(h, s, l) {
      s /= 100;
      l /= 100;
      var c = (1 - Math.abs(2 * l - 1)) * s;
      var x = c * (1 - Math.abs(h / 60 % 2 - 1));
      var m = l - c / 2;
      var r, g, b;
      if (h < 60) {
        r = c;
        g = x;
        b = 0;
      } else if (h < 120) {
        r = x;
        g = c;
        b = 0;
      } else if (h < 180) {
        r = 0;
        g = c;
        b = x;
      } else if (h < 240) {
        r = 0;
        g = x;
        b = c;
      } else if (h < 300) {
        r = x;
        g = 0;
        b = c;
      } else {
        r = c;
        g = 0;
        b = x;
      }
      r = Math.round((r + m) * 255).toString(16).padStart(2, "0");
      g = Math.round((g + m) * 255).toString(16).padStart(2, "0");
      b = Math.round((b + m) * 255).toString(16).padStart(2, "0");
      return "#" + r + g + b;
    }
    return {
      connect,
      disconnect,
      joinRoom,
      leaveRoom,
      setName,
      setColor,
      expand,
      minimize,
      getMyName: function() {
        return myName;
      },
      getMyColor: function() {
        return myColor;
      },
      getCurrentRoom: function() {
        return currentRoom;
      }
    };
  })();
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=index.global.js.map