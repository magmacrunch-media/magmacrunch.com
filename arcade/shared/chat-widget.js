/**
 * chat-widget.js — Floating arcade chat widget
 * Self-contained: creates its own DOM, handles connection, state.
 *
 * Usage:
 *   <link rel="stylesheet" href="shared/chat-widget.css">
 *   <script src="shared/chat-widget.js"></script>
 *   <script>ChatWidget.connect();</script>
 *
 * Public API (matches Chat module):
 *   ChatWidget.connect()
 *   ChatWidget.disconnect()
 *   ChatWidget.joinRoom(code)
 *   ChatWidget.leaveRoom(code)
 *   ChatWidget.setName(name)
 *   ChatWidget.setColor(color)
 *   ChatWidget.getMyName()
 *   ChatWidget.getMyColor()
 */

var ChatWidget = (function() {
    'use strict';

    // ── Config ──────────────────────────────────────────────────────────

    var CHAT_SERVER = (function() {
        try {
            var param = new URLSearchParams(window.location.search).get('server');
            if (param) return 'ws://' + param;
        } catch(e) {}
        var h = window.location.hostname;
        if (h === 'localhost' || h === '127.0.0.1') return 'ws://192.168.1.16:8768';
        return 'ws://98.49.52.35:8768';
    })();

    // ── State ───────────────────────────────────────────────────────────

    var socket = null;
    var currentRoom = null;
    var myName = null;
    var myColor = null;
    var typingTimeout = null;
    var typingHideTimer = null;
    var unreadCount = 0;
    var isExpanded = false;
    var activeTab = 'global';
    var widgetEl = null;

    // ── DOM Creation ────────────────────────────────────────────────────

    function createWidget() {
        if (widgetEl) return;

        var w = document.createElement('div');
        w.id = 'arcadeChatWidget';
        w.className = 'acw minimized';
        w.innerHTML = [
            '<div class="acw-bar" id="acwBar">',
            '  <span class="acw-title">ARCADE CHAT</span>',
            '  <span class="acw-badge" id="acwBadge" style="display:none">0</span>',
            '  <span class="acw-online"><span class="dot">●</span> <span id="acwOnlineCount">0</span> online</span>',
            '</div>',
            '<div class="acw-window" id="acwWindow">',
            '  <div class="acw-header">',
            '    <span id="chatHeaderTitle">// ARCADE CHAT //</span>',
            '    <div class="acw-header-buttons">',
            '      <button class="acw-header-btn" id="acwMinimize" title="Minimize">—</button>',
            '    </div>',
            '  </div>',
            '  <div class="acw-name-row">',
            '    <span id="chatMyName" class="acw-my-name"></span>',
            '    <button id="chatEditName" class="acw-edit-name" title="Edit name">✎</button>',
            '    <button id="chatPickColor" class="acw-pick-color" title="Pick color">🎨</button>',
            '  </div>',
            '  <div id="colorPickerPopup" class="acw-color-popup" style="display:none">',
            '    <div id="colorStrip" class="acw-color-strip"></div>',
            '    <div class="acw-color-preview-row">',
            '      <span>Current:</span>',
            '      <div id="colorPreview" class="acw-color-preview"></div>',
            '      <button id="colorResetBtn" class="acw-color-reset-btn">Reset</button>',
            '    </div>',
            '  </div>',
            '  <div class="acw-tabs">',
            '    <button class="acw-tab active" data-tab="global">GLOBAL</button>',
            '    <button class="acw-tab" data-tab="online">ONLINE</button>',
            '  </div>',
            '  <div class="acw-messages" id="chatMessagesGlobal">',
            '    <div class="acw-msg system">Welcome to the arcade! Say hello.</div>',
            '  </div>',
            '  <div class="acw-online-panel" id="chatOnline">',
            '    <div id="chatOnlineList"></div>',
            '  </div>',
            '  <div class="acw-typing" id="chatTyping" style="display:none"></div>',
            '  <div class="acw-input">',
            '    <input id="chatInput" type="text" placeholder="Type a message..." maxlength="200">',
            '    <button id="chatSend">▶</button>',
            '  </div>',
            '</div>'
        ].join('\n');

        document.body.appendChild(w);
        widgetEl = w;

        // Load saved state
        var savedState = localStorage.getItem('acw_expanded');
        if (savedState === 'true') {
            expand();
        } else {
            minimize();
        }

        // Load saved name
        var savedName = localStorage.getItem('arcade_username');
        if (savedName) {
            myName = savedName;
        }

        // Load saved color
        var savedColor = localStorage.getItem('arcade_color');
        if (savedColor) {
            myColor = savedColor;
        }

        wireEvents();
    }

    // ── Event Wiring ────────────────────────────────────────────────────

    function wireEvents() {
        // Bar click → toggle
        var bar = document.getElementById('acwBar');
        if (bar) {
            bar.addEventListener('click', function(e) {
                if (e.target.closest('.acw-badge')) return;
                toggle();
            });
        }

        // Minimize button
        var minBtn = document.getElementById('acwMinimize');
        if (minBtn) {
            minBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                minimize();
            });
        }

        // Send button
        var sendBtn = document.getElementById('chatSend');
        if (sendBtn) {
            sendBtn.addEventListener('click', send);
        }

        // Input enter key
        var input = document.getElementById('chatInput');
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') send();
            });
            input.addEventListener('input', handleTyping);
        }

        // Edit name
        var editName = document.getElementById('chatEditName');
        if (editName) {
            editName.addEventListener('click', startEditName);
        }

        // Color picker
        var pickColor = document.getElementById('chatPickColor');
        if (pickColor) {
            pickColor.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleColorPicker();
            });
        }

        // Color strip
        var colorStrip = document.getElementById('colorStrip');
        if (colorStrip) {
            colorStrip.addEventListener('click', function(e) {
                var rect = colorStrip.getBoundingClientRect();
                var x = e.clientX - rect.left;
                var hue = (x / rect.width) * 360;
                var color = hslToHex(hue, 100, 50);
                setColor(color);
            });
        }

        // Reset color
        var resetBtn = document.getElementById('colorResetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', function() {
                myColor = null;
                localStorage.removeItem('arcade_color');
                updateColorDisplay();
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: 'set_color', color: null }));
                }
            });
        }

        // Tabs
        var tabs = widgetEl.querySelectorAll('.acw-tab');
        tabs.forEach(function(tab) {
            tab.addEventListener('click', function() {
                switchTab(this.dataset.tab);
            });
        });

        // Close color picker on outside click
        document.addEventListener('click', function(e) {
            var popup = document.getElementById('colorPickerPopup');
            if (popup && popup.style.display !== 'none') {
                if (!popup.contains(e.target) && e.target !== pickColor) {
                    popup.style.display = 'none';
                }
            }
        });
    }

    // ── Toggle / Expand / Minimize ──────────────────────────────────────

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
        widgetEl.classList.remove('minimized');
        widgetEl.classList.add('expanded');
        localStorage.setItem('acw_expanded', 'true');
        unreadCount = 0;
        updateBadge();
        // Focus input
        var input = document.getElementById('chatInput');
        if (input) setTimeout(function() { input.focus(); }, 100);
    }

    function minimize() {
        if (!widgetEl) return;
        isExpanded = false;
        widgetEl.classList.remove('expanded');
        widgetEl.classList.add('minimized');
        localStorage.setItem('acw_expanded', 'false');
    }

    // ── Badge / Notifications ───────────────────────────────────────────

    function addUnread() {
        if (isExpanded) return;
        unreadCount++;
        updateBadge();
    }

    function updateBadge() {
        var badge = document.getElementById('acwBadge');
        if (!badge) return;
        if (unreadCount > 0) {
            badge.style.display = '';
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        } else {
            badge.style.display = 'none';
        }
    }

    // ── Connection ──────────────────────────────────────────────────────

    function connect() {
        if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
        if (socket) { try { socket.close(); } catch(e) {} }
        createWidget();

        socket = new WebSocket(CHAT_SERVER);

        socket.onopen = function() {
            widgetEl.classList.remove('disconnected');
            // Send saved name
            if (myName) {
                socket.send(JSON.stringify({ type: 'set_name', name: myName }));
            }
            // Send saved color
            if (myColor) {
                socket.send(JSON.stringify({ type: 'set_color', color: myColor }));
            }
        };

        socket.onmessage = function(e) {
            try {
                var msg = JSON.parse(e.data);
                handleMessage(msg);
            } catch(err) {}
        };

        socket.onclose = function() {
            widgetEl.classList.add('disconnected');
            setTimeout(connect, 5000);
        };

        socket.onerror = function() {
            socket.close();
        };
    }

    function disconnect() {
        if (currentRoom) leaveRoom(currentRoom);
        if (socket) {
            socket.close();
            socket = null;
        }
        myName = null;
        myColor = null;
    }

    // ── Message Handler ─────────────────────────────────────────────────

    function handleMessage(msg) {
        switch(msg.type) {
            case 'history':
                if (msg.messages) {
                    msg.messages.forEach(function(m) { addMessage('global', m); });
                }
                break;

            case 'chat':
                addMessage('global', msg);
                addUnread();
                break;

            case 'room_history':
                if (msg.messages) {
                    msg.messages.forEach(function(m) { addMessage('room', m); });
                }
                break;

            case 'room_chat':
                addMessage('room', msg);
                break;

            case 'name_assigned':
                myName = msg.name;
                localStorage.setItem('arcade_username', msg.name);
                updateNameDisplay();
                break;

            case 'user_list':
                updateOnlineList(msg.users);
                updateOnlineCount(msg.count);
                // Find my color from the user list
                if (myName) {
                    for (var i = 0; i < msg.users.length; i++) {
                        if (msg.users[i].name === myName) {
                            myColor = msg.users[i].color;
                            updateColorDisplay();
                            break;
                        }
                    }
                }
                break;

            case 'typing':
                showTyping(msg.from, msg.room);
                break;

            case 'global_users':
                updateOnlineCount(msg.count);
                break;

            case 'status':
                break;
        }
    }

    // ── Room Management ─────────────────────────────────────────────────

    function joinRoom(roomCode) {
        currentRoom = roomCode;
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'join_room', room: roomCode }));
            if (myName) {
                socket.send(JSON.stringify({ type: 'set_name', name: myName }));
            }
        }
        var headerTitle = document.getElementById('chatHeaderTitle');
        if (headerTitle) headerTitle.textContent = '// ROOM ' + roomCode + ' //';
        // Show room tab if it exists
        var roomTab = widgetEl.querySelector('[data-tab="room"]');
        if (roomTab) roomTab.style.display = '';
        switchTab('global');
    }

    function leaveRoom(roomCode) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'leave_room', room: roomCode }));
        }
        if (currentRoom === roomCode) {
            currentRoom = null;
            var headerTitle = document.getElementById('chatHeaderTitle');
            if (headerTitle) headerTitle.textContent = '// ARCADE CHAT //';
        }
    }

    // ── Send ────────────────────────────────────────────────────────────

    function send() {
        var input = document.getElementById('chatInput');
        if (!input || !socket || socket.readyState !== WebSocket.OPEN) return;
        var text = input.value.trim();
        if (!text) return;

        var name = myName || 'Player';
        socket.send(JSON.stringify({ type: 'set_name', name: name }));

        var msg = { type: 'chat', text: text };
        if (currentRoom) msg.room = currentRoom;
        socket.send(JSON.stringify(msg));

        // Show own message locally
        addMessage(currentRoom ? 'room' : 'global', {
            from: name,
            text: text,
            color: myColor || '#39ff6e'
        });

        input.value = '';
    }

    // ── Name Management ─────────────────────────────────────────────────

    function setName(name) {
        if (!name || !socket || socket.readyState !== WebSocket.OPEN) return;
        myName = name;
        localStorage.setItem('arcade_username', name);
        socket.send(JSON.stringify({ type: 'set_name', name: name }));
        updateNameDisplay();
    }

    function startEditName() {
        var nameEl = document.getElementById('chatMyName');
        var editBtn = document.getElementById('chatEditName');
        if (!nameEl) return;

        var currentName = myName || '';

        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'acw-name-input';
        input.value = currentName;
        input.maxLength = 20;

        nameEl.style.display = 'none';
        editBtn.style.display = 'none';
        nameEl.parentNode.insertBefore(input, nameEl.nextSibling);
        input.focus();
        input.select();

        function finishEdit() {
            var newName = input.value.trim();
            if (newName) {
                setName(newName);
            }
            input.remove();
            nameEl.style.display = '';
            editBtn.style.display = '';
        }

        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') finishEdit();
        });
        input.addEventListener('blur', finishEdit);
    }

    function updateNameDisplay() {
        var nameEl = document.getElementById('chatMyName');
        if (nameEl) {
            nameEl.textContent = myName || '...';
        }
    }

    // ── Color Management ────────────────────────────────────────────────

    function setColor(color) {
        myColor = color;
        localStorage.setItem('arcade_color', color);
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'set_color', color: color }));
        }
        updateColorDisplay();
        var popup = document.getElementById('colorPickerPopup');
        if (popup) popup.style.display = 'none';
    }

    function updateColorDisplay() {
        var nameEl = document.getElementById('chatMyName');
        if (nameEl) {
            nameEl.style.color = myColor || '#39ff6e';
        }
        var preview = document.getElementById('colorPreview');
        if (preview) {
            preview.style.background = myColor || '#39ff6e';
        }
    }

    function toggleColorPicker() {
        var popup = document.getElementById('colorPickerPopup');
        if (!popup) return;
        popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
        if (popup.style.display === 'block') {
            updateColorDisplay();
        }
    }

    // ── Tabs ────────────────────────────────────────────────────────────

    function switchTab(tab) {
        activeTab = tab;
        var messages = document.getElementById('chatMessagesGlobal');
        var online = document.getElementById('chatOnline');
        var tabs = widgetEl.querySelectorAll('.acw-tab');

        tabs.forEach(function(t) {
            t.classList.toggle('active', t.dataset.tab === tab);
        });

        if (tab === 'global') {
            if (messages) messages.style.display = '';
            if (online) online.style.display = 'none';
        } else if (tab === 'online') {
            if (messages) messages.style.display = 'none';
            if (online) online.style.display = '';
        }
    }

    // ── UI Updates ──────────────────────────────────────────────────────

    function addMessage(target, msg) {
        var container = document.getElementById('chatMessagesGlobal');
        if (!container) return;

        var div = document.createElement('div');
        div.className = 'acw-msg';
        if (msg.from === 'system') div.className += ' system';
        div.innerHTML = '<span class="chat-name" style="color:' + escapeHtml(msg.color || '#ff2e9c') + '">' +
            escapeHtml(msg.from) + ':</span> ' + escapeHtml(msg.text);
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    function updateOnlineList(users) {
        var list = document.getElementById('chatOnlineList');
        if (!list) return;
        list.innerHTML = '';
        if (users) {
            users.forEach(function(u) {
                var div = document.createElement('div');
                div.className = 'acw-online-user';
                div.innerHTML = '<span class="acw-online-dot" style="background:' + escapeHtml(u.color) + '"></span>' +
                    '<span class="acw-online-name">' + escapeHtml(u.name) + '</span>' +
                    '<span class="acw-online-status">' + escapeHtml(u.game || (u.rooms && u.rooms.length ? 'In Room' : 'Online')) + '</span>';
                list.appendChild(div);
            });
        }
    }

    function updateOnlineCount(count) {
        var el = document.getElementById('acwOnlineCount');
        if (el) el.textContent = count;
    }

    function showTyping(name, room) {
        var el = document.getElementById('chatTyping');
        if (!el) return;
        el.textContent = name + ' is typing...';
        el.style.display = 'block';
        if (typingHideTimer) clearTimeout(typingHideTimer);
        typingHideTimer = setTimeout(function() {
            el.style.display = 'none';
        }, 3000);
    }

    function handleTyping() {
        if (typingTimeout) return;
        if (socket && socket.readyState === WebSocket.OPEN) {
            var msg = { type: 'typing' };
            if (currentRoom) msg.room = currentRoom;
            socket.send(JSON.stringify(msg));
        }
        typingTimeout = setTimeout(function() {
            typingTimeout = null;
        }, 2000);
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ── Color Helpers ───────────────────────────────────────────────────

    function hslToHex(h, s, l) {
        s /= 100;
        l /= 100;
        var c = (1 - Math.abs(2 * l - 1)) * s;
        var x = c * (1 - Math.abs((h / 60) % 2 - 1));
        var m = l - c / 2;
        var r, g, b;
        if (h < 60) { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        r = Math.round((r + m) * 255).toString(16).padStart(2, '0');
        g = Math.round((g + m) * 255).toString(16).padStart(2, '0');
        b = Math.round((b + m) * 255).toString(16).padStart(2, '0');
        return '#' + r + g + b;
    }

    // ── Public API ──────────────────────────────────────────────────────

    return {
        connect: connect,
        disconnect: disconnect,
        joinRoom: joinRoom,
        leaveRoom: leaveRoom,
        setName: setName,
        setColor: setColor,
        expand: expand,
        minimize: minimize,
        getMyName: function() { return myName; },
        getMyColor: function() { return myColor; },
        getCurrentRoom: function() { return currentRoom; }
    };

})();
