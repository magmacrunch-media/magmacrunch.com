/**
 * chat-worker.js — SharedWorker for persistent arcade chat connection
 *
 * Holds a single WebSocket connection across all page navigations in the
 * browser. Pages connect via postMessage; the worker routes messages between
 * them and the chat server.
 *
 * Lifecycle:
 *   Page loads  → new port → worker sends cached state + _worker:connect
 *   Page closes → port disconnects → if no ports left, close WebSocket after 3s
 *   WebSocket drops → auto-reconnect with backoff, queue page messages
 */

// ── State ──────────────────────────────────────────────────────────────────

var ws = null;
var wsUrl = null;
var pages = new Map();
var nextPortId = 1;
var reconnectTimer = null;
var reconnectDelay = 1000;
var messageQueue = [];

var cachedHistory = null;
var cachedUserList = null;
var cachedStatus = null;

// ── Broadcast to all pages ─────────────────────────────────────────────────

function broadcast(msg) {
    var data = JSON.stringify(msg);
    pages.forEach(function(port) {
        try { port.postMessage(data); } catch(e) {}
    });
}

// ── Idle cleanup ───────────────────────────────────────────────────────────

var idleCheckTimer = null;

function scheduleIdleCheck() {
    if (idleCheckTimer) return;
    idleCheckTimer = setTimeout(function() {
        idleCheckTimer = null;
        if (pages.size === 0 && ws) {
            try { ws.close(); } catch(e) {}
            ws = null;
        }
    }, 3000);
}

// ── WebSocket management ───────────────────────────────────────────────────

function openSocket(url) {
    if (ws) {
        try { ws.close(); } catch(e) {}
        ws = null;
    }
    wsUrl = url;

    try {
        ws = new WebSocket(url);
    } catch(e) {
        scheduleReconnect();
        return;
    }

    ws.onopen = function() {
        reconnectDelay = 1000;
        var q = messageQueue.splice(0);
        for (var i = 0; i < q.length; i++) {
            try { ws.send(q[i]); } catch(e) {}
        }
        broadcast({ _worker: 'connect' });
        try { ws.send(JSON.stringify({ type: 'get_history' })); } catch(e) {}
    };

    ws.onmessage = function(e) {
        var msg;
        try { msg = JSON.parse(e.data); } catch(err) { return; }
        if (msg.type === 'history') cachedHistory = msg;
        else if (msg.type === 'user_list') cachedUserList = msg;
        else if (msg.type === 'status') cachedStatus = msg;
        broadcast(msg);
    };

    ws.onclose = function() {
        ws = null;
        broadcast({ _worker: 'disconnect' });
        scheduleReconnect();
    };

    ws.onerror = function() {
        if (ws) try { ws.close(); } catch(e) {}
    };
}

function scheduleReconnect() {
    if (reconnectTimer || pages.size === 0) return;
    reconnectTimer = setTimeout(function() {
        reconnectTimer = null;
        if (pages.size > 0 && wsUrl && !ws) {
            openSocket(wsUrl);
        }
    }, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 1.5, 30000);
}

function closeSocketIfIdle() {
    scheduleIdleCheck();
}

// ── Page port handling ─────────────────────────────────────────────────────

function onConnect(port) {
    var portId = nextPortId++;
    pages.set(portId, port);

    port.onmessage = function(e) {
        var msg;
        try { msg = JSON.parse(e.data); } catch(err) { return; }
        msg._portId = portId;
        handlePageMessage(msg, port);
    };

    port.onmessageerror = function() {
        pages.delete(portId);
        closeSocketIfIdle();
    };

    // If WebSocket is open, notify new page + send cached state
    if (ws && ws.readyState === WebSocket.OPEN) {
        try { port.postMessage(JSON.stringify({ _worker: 'connect' })); } catch(e) {}
        if (cachedHistory) {
            try { port.postMessage(JSON.stringify(cachedHistory)); } catch(e) {}
        }
        if (cachedUserList) {
            try { port.postMessage(JSON.stringify(cachedUserList)); } catch(e) {}
        }
        if (cachedStatus) {
            try { port.postMessage(JSON.stringify(cachedStatus)); } catch(e) {}
        }
    }
}

function handlePageMessage(msg, port) {
    switch (msg._worker) {
        case 'connect':
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                cachedHistory = null;
                cachedUserList = null;
                cachedStatus = null;
                openSocket(msg.url);
            } else {
                try { port.postMessage(JSON.stringify({ _worker: 'connect' })); } catch(e) {}
                if (cachedHistory) {
                    try { port.postMessage(JSON.stringify(cachedHistory)); } catch(e) {}
                }
                if (cachedUserList) {
                    try { port.postMessage(JSON.stringify(cachedUserList)); } catch(e) {}
                }
                if (cachedStatus) {
                    try { port.postMessage(JSON.stringify(cachedStatus)); } catch(e) {}
                }
            }
            break;

        case 'disconnect':
            pages.delete(msg._portId);
            closeSocketIfIdle();
            break;

        case 'send':
            if (ws && ws.readyState === WebSocket.OPEN) {
                try { ws.send(JSON.stringify(msg.data)); } catch(e) {}
            } else if (ws && ws.readyState === WebSocket.CONNECTING) {
                messageQueue.push(JSON.stringify(msg.data));
            }
            break;
    }
}

// ── Startup ────────────────────────────────────────────────────────────────

self.onconnect = function(e) {
    onConnect(e.ports[0]);
};
