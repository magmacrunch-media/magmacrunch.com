/**
 * chat.js — Global + Room chat client
 * Shared by multiplayer games (checkers, backgammon, etc.)
 * Place in arcade/shared/chat.js and include via script tag.
 *
 * Requires DOM elements:
 *   #chatMessagesGlobal, #chatMessagesRoom, #chatOnline, #chatOnlineList,
 *   #chatRoomTab, #chatRoomCode, #chatHeaderTitle, #chatOnlineCount,
 *   #chatMyName, #chatEditName, #chatPickColor, #colorPickerPopup,
 *   #colorStrip, #colorPreview, #chatTyping, #chatInput, #chatSend
 */

var Chat = (function() {

    // ── Server URL ──────────────────────────────────────────────────────────
    var CHAT_SERVER = (() => {
        try {
            var param = new URLSearchParams(window.location.search).get('server');
            if (param) return 'ws://' + param;
        } catch(e) {}
        var h = window.location.hostname;
        if (h === 'localhost' || h === '127.0.0.1') return 'ws://192.168.1.16:8768';
        return 'ws://98.49.52.35:8768';
    })();

    // ── State ───────────────────────────────────────────────────────────────
    var socket = null;
    var currentRoom = null;
    var myName = null;
    var myColor = null;
    var typingTimeout = null;
    var typingHideTimer = null;
    var colorPickerOpen = false;

    // ── DOM Elements ────────────────────────────────────────────────────────
    var el = {};

    function cacheElements() {
        el.globalMessages = document.getElementById('chatMessagesGlobal');
        el.roomMessages   = document.getElementById('chatMessagesRoom');
        el.onlinePanel    = document.getElementById('chatOnline');
        el.onlineList     = document.getElementById('chatOnlineList');
        el.roomTab        = document.getElementById('chatRoomTab');
        el.roomCode       = document.getElementById('chatRoomCode');
        el.headerTitle    = document.getElementById('chatHeaderTitle');
        el.onlineCount    = document.getElementById('chatOnlineCount');
        el.myName         = document.getElementById('chatMyName');
        el.editName       = document.getElementById('chatEditName');
        el.pickColor      = document.getElementById('chatPickColor');
        el.colorPopup     = document.getElementById('colorPickerPopup');
        el.colorStrip     = document.getElementById('colorStrip');
        el.colorPreview   = document.getElementById('colorPreview');
        el.typing         = document.getElementById('chatTyping');
        el.input          = document.getElementById('chatInput');
        el.sendBtn        = document.getElementById('chatSend');
    }

    // ── Connection ──────────────────────────────────────────────────────────
    function connect() {
        if (socket && socket.readyState === WebSocket.OPEN) return;
        cacheElements();

        socket = new WebSocket(CHAT_SERVER);

        socket.onopen = function() {
            console.log('[Chat] Connected');
            addMessage('global', { from: 'system', text: 'Connected to arcade chat', color: '#8a7fa8' });
            // Send name if we have one
            var savedName = localStorage.getItem('arcade_username');
            if (savedName) {
                socket.send(JSON.stringify({ type: 'set_name', name: savedName }));
            }
            // Send color if we have one
            var savedColor = localStorage.getItem('arcade_color');
            if (savedColor) {
                socket.send(JSON.stringify({ type: 'set_color', color: savedColor }));
                myColor = savedColor;
                updateColorDisplay();
            }
        };

        socket.onmessage = function(e) {
            try {
                var msg = JSON.parse(e.data);
                handleMessage(msg);
            } catch(err) {}
        };

        socket.onclose = function() {
            console.log('[Chat] Disconnected, reconnecting in 5s...');
            myName = null;
            setTimeout(connect, 5000);
        };

        socket.onerror = function() {
            socket.close();
        };

        // Wire up send button and enter key
        if (el.sendBtn) {
            el.sendBtn.addEventListener('click', send);
        }
        if (el.input) {
            el.input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') send();
            });
            el.input.addEventListener('input', handleTyping);
        }

        // Wire up name edit
        if (el.editName) {
            el.editName.addEventListener('click', startEditName);
        }

        // Wire up color picker
        if (el.pickColor) {
            el.pickColor.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleColorPicker();
            });
        }

        // Wire up tabs
        initTabs();

        // Initialize color picker
        initColorPicker();
    }

    function disconnect() {
        if (currentRoom) {
            leaveRoom(currentRoom);
        }
        if (socket) {
            socket.close();
            socket = null;
        }
        myName = null;
        myColor = null;
    }

    // ── Message Handler ─────────────────────────────────────────────────────
    function handleMessage(msg) {
        switch(msg.type) {
            case 'history':
                if (msg.messages) {
                    msg.messages.forEach(function(m) { addMessage('global', m); });
                }
                break;

            case 'chat':
                addMessage('global', msg);
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

    // ── Room Management ─────────────────────────────────────────────────────
    function joinRoom(roomCode) {
        currentRoom = roomCode;
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'join_room', room: roomCode }));
            var savedName = localStorage.getItem('arcade_username');
            if (savedName) {
                socket.send(JSON.stringify({ type: 'set_name', name: savedName }));
            }
        }
        showRoomTab(roomCode);
    }

    function leaveRoom(roomCode) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'leave_room', room: roomCode }));
        }
        if (currentRoom === roomCode) {
            currentRoom = null;
            hideRoomTab();
        }
    }

    // ── Send ────────────────────────────────────────────────────────────────
    function send() {
        if (!el.input || !socket || socket.readyState !== WebSocket.OPEN) return;
        var text = el.input.value.trim();
        if (!text) return;

        var name = myName || localStorage.getItem('arcade_username') || 'Player';
        socket.send(JSON.stringify({ type: 'set_name', name: name }));

        var msg = { type: 'chat', text: text };
        if (currentRoom) msg.room = currentRoom;
        socket.send(JSON.stringify(msg));

        // Show own message locally (server broadcasts to others, not sender)
        addMessage(currentRoom ? 'room' : 'global', {
            from: name,
            text: text,
            color: myColor || '#39ff6e'
        });

        el.input.value = '';
    }

    // ── Name Management ─────────────────────────────────────────────────────
    function setName(name) {
        if (!name || !socket || socket.readyState !== WebSocket.OPEN) return;
        myName = name;
        localStorage.setItem('arcade_username', name);
        socket.send(JSON.stringify({ type: 'set_name', name: name }));
        updateNameDisplay();
    }

    function startEditName() {
        if (!el.myName) return;
        var currentName = myName || localStorage.getItem('arcade_username') || '';

        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'chat-name-input';
        input.value = currentName;
        input.maxLength = 20;

        el.myName.style.display = 'none';
        el.editName.style.display = 'none';
        el.myName.parentNode.insertBefore(input, el.myName.nextSibling);
        input.focus();
        input.select();

        function finishEdit() {
            var newName = input.value.trim();
            if (newName) {
                setName(newName);
            }
            input.remove();
            el.myName.style.display = '';
            el.editName.style.display = '';
        }

        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') finishEdit();
        });
        input.addEventListener('blur', finishEdit);
    }

    function updateNameDisplay() {
        if (el.myName) {
            el.myName.textContent = myName || '...';
        }
    }

    // ── Color Management ────────────────────────────────────────────────────
    function setColor(color) {
        myColor = color;
        localStorage.setItem('arcade_color', color);
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'set_color', color: color }));
        }
        updateColorDisplay();
        updateColorIndicator();
    }

    function resetColor() {
        myColor = null;
        localStorage.removeItem('arcade_color');
        // Server will reassign on next user_list
        updateColorDisplay();
        updateColorIndicator();
    }

    function updateColorDisplay() {
        if (el.myName) {
            el.myName.style.color = myColor || '#39ff6e';
        }
        if (el.colorPreview) {
            el.colorPreview.style.background = myColor || '#39ff6e';
        }
    }

    // ── Color Picker ────────────────────────────────────────────────────────
    function initColorPicker() {
        if (!el.colorStrip) return;

        // Set up gradient strip
        el.colorStrip.style.background = 'linear-gradient(to right, ' +
            'hsl(0,100%,50%), hsl(30,100%,50%), hsl(60,100%,50%), ' +
            'hsl(90,100%,50%), hsl(120,100%,50%), hsl(150,100%,50%), ' +
            'hsl(180,100%,50%), hsl(210,100%,50%), hsl(240,100%,50%), ' +
            'hsl(270,100%,50%), hsl(300,100%,50%), hsl(330,100%,50%), ' +
            'hsl(360,100%,50%))';

        // Click to pick color
        el.colorStrip.addEventListener('click', function(e) {
            var rect = el.colorStrip.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var hue = (x / rect.width) * 360;
            var color = hslToHex(hue, 100, 50);
            setColor(color);
        });

        // Reset button
        var resetBtn = document.getElementById('colorResetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', function() {
                resetColor();
            });
        }

        // Close on outside click
        document.addEventListener('click', function(e) {
            if (colorPickerOpen && el.colorPopup &&
                !el.colorPopup.contains(e.target) &&
                e.target !== el.pickColor) {
                toggleColorPicker(false);
            }
        });

        // Load saved color
        var savedColor = localStorage.getItem('arcade_color');
        if (savedColor) {
            myColor = savedColor;
            updateColorDisplay();
        }

        updateColorIndicator();
    }

    function toggleColorPicker(show) {
        if (!el.colorPopup) return;
        if (show === undefined) {
            colorPickerOpen = !colorPickerOpen;
        } else {
            colorPickerOpen = show;
        }
        el.colorPopup.style.display = colorPickerOpen ? 'block' : 'none';
        if (colorPickerOpen) {
            updateColorIndicator();
        }
    }

    function updateColorIndicator() {
        if (!el.colorStrip || !myColor) return;
        var indicator = document.getElementById('colorIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'colorIndicator';
            indicator.className = 'color-indicator';
            el.colorStrip.appendChild(indicator);
        }
        var hue = hexToHue(myColor);
        var x = (hue / 360) * el.colorStrip.offsetWidth;
        indicator.style.left = (x - 6) + 'px'; // Center the indicator
        indicator.style.display = 'block';
    }

    // ── Color Conversion Helpers ────────────────────────────────────────────
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

    function hexToHue(hex) {
        var r = parseInt(hex.slice(1, 3), 16) / 255;
        var g = parseInt(hex.slice(3, 5), 16) / 255;
        var b = parseInt(hex.slice(5, 7), 16) / 255;
        var max = Math.max(r, g, b);
        var min = Math.min(r, g, b);
        var h = 0;
        if (max !== min) {
            var d = max - min;
            if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
            else if (max === g) h = ((b - r) / d + 2) / 6;
            else h = ((r - g) / d + 4) / 6;
        }
        return Math.round(h * 360);
    }

    // ── Typing Indicator ────────────────────────────────────────────────────
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

    function showTyping(name, room) {
        var isGlobal = !room && !currentRoom;
        var isRoom = room && room === currentRoom;
        if (!isGlobal && !isRoom) return;
        if (!el.typing) return;

        el.typing.textContent = name + ' is typing...';
        el.typing.style.display = 'block';
        if (typingHideTimer) clearTimeout(typingHideTimer);
        typingHideTimer = setTimeout(function() {
            el.typing.style.display = 'none';
        }, 3000);
    }

    // ── UI Updates ──────────────────────────────────────────────────────────
    function addMessage(target, msg) {
        var containerId = (target === 'room') ? 'chatMessagesRoom' : 'chatMessagesGlobal';
        var container = document.getElementById(containerId);
        if (!container) return;

        var div = document.createElement('div');
        div.className = 'chat-msg';
        if (msg.from === 'system') div.className += ' system';
        div.innerHTML = '<span class="chat-name" style="color:' + escapeHtml(msg.color || '#ff2e9c') + '">' +
            escapeHtml(msg.from) + ':</span> ' + escapeHtml(msg.text);
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    function updateOnlineList(users) {
        if (!el.onlineList) return;
        el.onlineList.innerHTML = '';
        if (users) {
            users.forEach(function(u) {
                var div = document.createElement('div');
                div.className = 'chat-online-user';
                var dot = document.createElement('span');
                dot.className = 'chat-online-dot';
                dot.style.background = u.color;
                var nameEl = document.createElement('span');
                nameEl.className = 'chat-online-name';
                nameEl.textContent = u.name;
                var statusEl = document.createElement('span');
                statusEl.className = 'chat-online-status';
                if (u.game) {
                    statusEl.textContent = u.game;
                } else if (u.rooms && u.rooms.length > 0) {
                    statusEl.textContent = 'In Room';
                } else {
                    statusEl.textContent = 'Online';
                }
                div.appendChild(dot);
                div.appendChild(nameEl);
                div.appendChild(statusEl);
                el.onlineList.appendChild(div);
            });
        }
    }

    function updateOnlineCount(count) {
        if (el.onlineCount) {
            el.onlineCount.textContent = count;
        }
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ── Tab Management ──────────────────────────────────────────────────────
    function initTabs() {
        var tabs = document.querySelectorAll('.chat-tab');
        tabs.forEach(function(tab) {
            tab.addEventListener('click', function() {
                switchTab(this.dataset.tab);
            });
        });
    }

    function switchTab(tab) {
        if (!el.globalMessages || !el.roomMessages || !el.onlinePanel) return;

        var tabs = document.querySelectorAll('.chat-tab');
        tabs.forEach(function(t) { t.classList.remove('active'); });

        el.globalMessages.style.display = 'none';
        el.roomMessages.style.display = 'none';
        el.onlinePanel.style.display = 'none';

        if (tab === 'global') {
            el.globalMessages.style.display = '';
            var globalTab = document.querySelector('[data-tab="global"]');
            if (globalTab) globalTab.classList.add('active');
        } else if (tab === 'online') {
            el.onlinePanel.style.display = '';
            var onlineTab = document.querySelector('[data-tab="online"]');
            if (onlineTab) onlineTab.classList.add('active');
        } else if (tab === 'room') {
            el.roomMessages.style.display = '';
            var roomTab = document.querySelector('[data-tab="room"]');
            if (roomTab) roomTab.classList.add('active');
        }
    }

    function showRoomTab(roomCode) {
        if (el.roomTab) {
            el.roomTab.style.display = '';
        }
        if (el.roomCode) {
            el.roomCode.textContent = roomCode;
        }
        if (el.headerTitle) {
            el.headerTitle.textContent = '// ROOM ' + roomCode + ' //';
        }
        switchTab('room');
    }

    function hideRoomTab() {
        if (el.roomTab) {
            el.roomTab.style.display = 'none';
        }
        if (el.headerTitle) {
            el.headerTitle.textContent = '// ARCADE CHAT //';
        }
        switchTab('global');
    }

    // ── Public API ──────────────────────────────────────────────────────────
    return {
        connect: connect,
        disconnect: disconnect,
        joinRoom: joinRoom,
        leaveRoom: leaveRoom,
        send: send,
        setName: setName,
        setColor: setColor,
        resetColor: resetColor,
        getCurrentRoom: function() { return currentRoom; },
        getMyName: function() { return myName; },
        getMyColor: function() { return myColor; }
    };

})();
