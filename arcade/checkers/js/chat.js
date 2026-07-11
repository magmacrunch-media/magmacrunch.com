/**
 * chat.js — Global arcade chat connection
 * Connects to the shared chat server on port 8768
 */

var Chat = (function() {

    var CHAT_SERVER = (() => {
        try {
            var param = new URLSearchParams(window.location.search).get('server');
            if (param) return 'ws://' + param;
        } catch(e) {}
        var h = window.location.hostname;
        if (h === 'localhost' || h === '127.0.0.1') return 'ws://192.168.1.16:8768';
        return 'ws://98.49.52.35:8768';
    })();

    var socket = null;
    var chatInput = null;
    var chatSend = null;
    var chatMessages = null;

    function connect() {
        if (socket && socket.readyState === WebSocket.OPEN) return;

        chatMessages = document.getElementById('chatMessages');
        chatInput = document.getElementById('chatInput');
        chatSend = document.getElementById('chatSend');

        socket = new WebSocket(CHAT_SERVER);

        socket.onopen = function() {
            console.log('[Chat] Connected');
            if (chatMessages) {
                chatMessages.innerHTML = '<div class="chat-msg system">Connected to arcade chat</div>';
            }
        };

        socket.onmessage = function(e) {
            try {
                var msg = JSON.parse(e.data);
                if (msg.type === 'history') {
                    msg.messages.forEach(addMessage);
                } else if (msg.type === 'chat') {
                    addMessage(msg);
                }
            } catch(err) {}
        };

        socket.onclose = function() {
            console.log('[Chat] Disconnected, reconnecting in 5s...');
            setTimeout(connect, 5000);
        };

        socket.onerror = function() {
            socket.close();
        };

        // Wire up send button and enter key
        if (chatSend) {
            chatSend.addEventListener('click', send);
        }
        if (chatInput) {
            chatInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') send();
            });
        }
    }

    function send() {
        if (!chatInput || !socket || socket.readyState !== WebSocket.OPEN) return;
        var text = chatInput.value.trim();
        if (!text) return;

        var name = localStorage.getItem('arcade_username') || 'Player';
        socket.send(JSON.stringify({ type: 'chat', name: name, text: text }));
        chatInput.value = '';
    }

    function addMessage(msg) {
        if (!chatMessages) chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        var div = document.createElement('div');
        div.className = 'chat-msg';
        div.innerHTML = '<span class="chat-name" style="color:' + escapeHtml(msg.color || '#ff2e9c') + '">' +
            escapeHtml(msg.from) + ':</span> ' + escapeHtml(msg.text);
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function disconnect() {
        if (socket) {
            socket.close();
            socket = null;
        }
    }

    return {
        connect: connect,
        send: send,
        disconnect: disconnect
    };

})();
