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

/**
 * Each page's own presence, keyed by port id.
 *
 * The aggregate is what the server hears, and it is 'here' if ANY page says
 * so. This has to live here rather than in the page: one socket carries every
 * tab, so a single hidden tab is not the same thing as an absent person, and
 * only the worker can see all of them at once.
 */
var pagePresence = new Map();
var publishedPresence = null;

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

// ── Presence ───────────────────────────────────────────────────────────────

function aggregatePresence() {
    var here = false;
    pagePresence.forEach(function(state) {
        if (state === 'here') here = true;
    });
    return here ? 'here' : 'away';
}

function publishPresence(force) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (pagePresence.size === 0) return;      // nothing to report yet
    var state = aggregatePresence();
    if (!force && state === publishedPresence) return;
    publishedPresence = state;
    try { ws.send(JSON.stringify({ type: 'presence', state: state })); } catch(e) {}
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
        // A new socket is a new session as far as the server is concerned, so
        // whatever it knew about who is at these pages is gone. Say it again.
        publishedPresence = null;
        publishPresence(true);
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
        pagePresence.delete(portId);
        publishPresence(false);
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

        case 'presence':
            pagePresence.set(msg._portId, msg.state === 'away' ? 'away' : 'here');
            publishPresence(false);
            break;

        case 'disconnect':
            pages.delete(msg._portId);
            pagePresence.delete(msg._portId);
            publishPresence(false);
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
