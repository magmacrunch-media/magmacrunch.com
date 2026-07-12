/**
 * admin.js — MagmaCrunch Operations Dashboard
 * Frontend logic for server monitoring and management.
 */

(function() {
    'use strict';

    // ── Config ──────────────────────────────────────────────────────────────

    const WS_PORT_OFFSET = 1; // WebSocket runs on HTTP port + 1
    const wsUrl = `ws://${window.location.hostname}:${parseInt(window.location.port) + WS_PORT_OFFSET}`;

    // ── State ───────────────────────────────────────────────────────────────

    let ws = null;
    let authToken = null;
    let streaming = false;
    let reconnectTimer = null;
    let statusTimer = null;

    // ── DOM refs ────────────────────────────────────────────────────────────

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const loginOverlay = $('#login-overlay');
    const passwordInput = $('#password-input');
    const loginBtn = $('#login-btn');
    const loginError = $('#login-error');
    const statusGrid = $('#status-grid');
    const logViewer = $('#log-viewer');
    const logFilter = $('#log-filter');
    const btnStream = $('#btn-stream');
    const btnStopStream = $('#btn-stop-stream');
    const btnClearLog = $('#btn-clear-log');
    const btnRefresh = $('#btn-refresh');
    const btnRestartAll = $('#btn-restart-all');
    const btnLoadErrors = $('#btn-load-errors');
    const btnLoadToday = $('#btn-load-today');
    const btnLoad50 = $('#btn-load-50');
    const sysUptime = $('#system-uptime');
    const sysCpu = $('#system-cpu');
    const sysMem = $('#system-mem');
    const sysTemp = $('#system-temp');
    const chatViewer = $('#chat-viewer');
    const chatRoomFilter = $('#chat-room-filter');
    const btnRefreshChat = $('#btn-refresh-chat');
    const btnClearChat = $('#btn-clear-chat');

    // ── Chat state ───────────────────────────────────────────────────────────
    let chatHistory = [];
    let chatRoomHistories = {};

    // ── WebSocket ───────────────────────────────────────────────────────────

    let tConnected = 0;

    function connect() {
        if (ws && ws.readyState === WebSocket.OPEN) return;

        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            tConnected = performance.now();
            console.log('[OPS] Connected');
            clearTimeout(reconnectTimer);
            requestStatus();
            statusTimer = setInterval(() => {
                if (authToken) requestStatus();
            }, 10000);
            setInterval(() => {
                if (authToken) requestSystemInfo();
            }, 30000);
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                handleMessage(msg);
            } catch (e) {
                console.error('[OPS] Parse error:', e);
            }
        };

        ws.onclose = () => {
            console.log('[OPS] Disconnected');
            clearInterval(statusTimer);
            reconnectTimer = setTimeout(connect, 3000);
        };

        ws.onerror = (err) => {
            console.error('[OPS] WebSocket error');
        };
    }

    function send(msg) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            const elapsed = Math.round(performance.now() - tConnected);
            console.log(`[OPS] Sending ${msg.action || msg.type || '?'} at ${elapsed}ms`);
            ws.send(JSON.stringify(msg));
        }
    }

    // ── Message handler ─────────────────────────────────────────────────────

    function handleMessage(msg) {
        const elapsed = performance.now() - tConnected;
        console.log(`[OPS] Received ${msg.type} at ${Math.round(elapsed)}ms`);
        switch (msg.type) {
            case 'status':
                if (msg.services) renderStatusGrid(msg.services, msg.statuses);
                break;

            case 'logs':
                appendLogs(msg.text, msg.service);
                break;

            case 'log':
                appendLogLine(msg.text);
                break;

            case 'restart_result':
                showNotification(`${msg.service} restart: ${msg.result || 'done'}`);
                break;

            case 'system_info':
                renderSystemInfo(msg.info);
                break;

            case 'auth_required':
                showLogin();
                break;

            case 'login_ok':
                authToken = msg.token;
                hideLogin();
                const tLogin = performance.now();
                console.log('[OPS] Login OK, sending data requests');
                requestStatus();
                requestSystemInfo();
                requestChatHistory();
                break;

            case 'login_fail':
                loginError.classList.remove('hidden');
                loginInput.value = '';
                break;

            case 'history':
                chatHistory = msg.messages || [];
                renderChat();
                break;

            case 'room_histories':
                chatRoomHistories = msg.rooms || {};
                updateChatRoomFilter();
                break;

            case 'chat':
            case 'room_chat':
                // Live chat message from chat server subscription
                chatHistory.push(msg);
                if (chatRoomFilter.value === 'global' && !msg.room) {
                    appendChatMessage(msg);
                }
                break;
        }
    }

    // ── Actions ─────────────────────────────────────────────────────────────

    function requestStatus() {
        send({ action: 'status', token: authToken });
    }

    function requestSystemInfo() {
        send({ action: 'system_info', token: authToken });
    }

    function requestLogs(service, lines) {
        send({ action: 'logs', service: service, lines: lines, token: authToken });
    }

    function requestLogsErrors() {
        send({ action: 'logs_errors', token: authToken });
    }

    function requestLogsToday() {
        send({ action: 'logs_today', token: authToken });
    }

    function restartService(unit) {
        if (!confirm(`Restart ${unit}?`)) return;
        send({ action: 'restart', service: unit, token: authToken });
        markStarting(unit);
    }

    function restartAll() {
        if (!confirm('Restart ALL servers?')) return;
        send({ action: 'restart_all', token: authToken });
        $$('.server-card').forEach(card => card.classList.add('starting'));
    }

    function startStream() {
        const service = logFilter.value;
        send({ action: 'stream_start', service: service, token: authToken });
        streaming = true;
        btnStream.classList.add('hidden');
        btnStopStream.classList.remove('hidden');
    }

    function stopStream() {
        send({ action: 'stream_stop', token: authToken });
        streaming = false;
        btnStopStream.classList.add('hidden');
        btnStream.classList.remove('hidden');
    }

    // ── Chat functions ───────────────────────────────────────────────────────

    function requestChatHistory() {
        send({ action: 'chat_history', token: authToken });
    }

    function renderChat() {
        chatViewer.innerHTML = '';
        const filter = chatRoomFilter.value;

        if (filter === 'global') {
            chatHistory.forEach(msg => appendChatMessage(msg));
        } else {
            const msgs = chatRoomHistories[filter] || [];
            msgs.forEach(msg => appendChatMessage(msg));
        }
    }

    function appendChatMessage(msg) {
        const div = document.createElement('div');
        div.className = 'chat-msg';

        const time = msg.timestamp ? new Date(msg.timestamp * 1000).toLocaleTimeString() : '';
        const name = msg.from || '???';
        const color = msg.color || '#fff';
        const text = msg.text || '';

        div.innerHTML = `
            <span class="chat-time">${time}</span>
            <span class="chat-name" style="color:${color}">${name}:</span>
            <span class="chat-text">${escapeHtml(text)}</span>
        `;

        chatViewer.appendChild(div);
        chatViewer.scrollTop = chatViewer.scrollHeight;
    }

    function updateChatRoomFilter() {
        const current = chatRoomFilter.value;
        chatRoomFilter.innerHTML = '<option value="global">GLOBAL CHAT</option>';
        Object.keys(chatRoomHistories).sort().forEach(room => {
            const opt = document.createElement('option');
            opt.value = room;
            opt.textContent = `ROOM ${room}`;
            chatRoomFilter.appendChild(opt);
        });
        // Restore selection if still exists
        if (chatRoomFilter.querySelector(`option[value="${current}"]`)) {
            chatRoomFilter.value = current;
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ── Render status grid ──────────────────────────────────────────────────

    function renderStatusGrid(services, statuses) {
        statusGrid.innerHTML = '';
        logFilter.innerHTML = '<option value="all">ALL SERVERS</option>';

        services.forEach(svc => {
            const status = statuses[svc.unit] || 'unknown';
            const isRunning = status === 'active';

            const card = document.createElement('div');
            card.className = `server-card ${isRunning ? 'running' : 'stopped'}`;
            card.id = `card-${svc.unit}`;

            card.innerHTML = `
                <div class="card-header">
                    <span class="card-name">${svc.name}</span>
                    <span class="card-icon">${svc.icon}</span>
                </div>
                <div class="card-details">
                    <span class="card-port">:${svc.port}</span>
                    <span class="card-status ${isRunning ? 'online' : 'offline'}">
                        ${isRunning ? 'ONLINE' : 'OFFLINE'}
                    </span>
                </div>
                <div class="card-actions">
                    <button class="btn btn-cyan btn-sm" data-action="restart" data-unit="${svc.unit}">
                        RESTART
                    </button>
                    <button class="btn btn-yellow btn-sm" data-action="logs" data-unit="${svc.unit}">
                        LOGS
                    </button>
                </div>
            `;

            statusGrid.appendChild(card);

            // Add to log filter
            const opt = document.createElement('option');
            opt.value = svc.unit;
            opt.textContent = svc.name;
            logFilter.appendChild(opt);
        });

        // Bind card buttons
        statusGrid.querySelectorAll('[data-action="restart"]').forEach(btn => {
            btn.addEventListener('click', () => restartService(btn.dataset.unit));
        });

        statusGrid.querySelectorAll('[data-action="logs"]').forEach(btn => {
            btn.addEventListener('click', () => {
                logFilter.value = btn.dataset.unit;
                requestLogs(btn.dataset.unit, 50);
            });
        });
    }

    function markStarting(unit) {
        const card = $(`#card-${unit}`);
        if (card) {
            card.classList.remove('running', 'stopped');
            card.classList.add('starting');
            const statusEl = card.querySelector('.card-status');
            statusEl.className = 'card-status pending';
            statusEl.textContent = 'STARTING';
        }
    }

    // ── Render system info ──────────────────────────────────────────────────

    function renderSystemInfo(info) {
        sysUptime.textContent = `UP: ${info.uptime || 'N/A'}`;
        sysCpu.textContent = `CPU: ${info.cpu_load || 'N/A'}`;
        sysMem.textContent = `MEM: ${info.memory || 'N/A'}`;
        sysTemp.textContent = `TEMP: ${info.cpu_temp || 'N/A'}°C`;
    }

    // ── Log viewer ──────────────────────────────────────────────────────────

    function appendLogs(text, service) {
        if (!text) return;
        // Clear welcome message on first load
        const welcome = logViewer.querySelector('.log-welcome');
        if (welcome) welcome.remove();

        const lines = text.split('\n');
        lines.forEach(line => {
            if (line.trim()) appendLogLine(line);
        });
    }

    function appendLogLine(text) {
        const welcome = logViewer.querySelector('.log-welcome');
        if (welcome) welcome.remove();

        const line = document.createElement('div');
        line.className = 'log-line';

        // Color-code by content
        const lower = text.toLowerCase();
        if (lower.includes('error') || lower.includes('traceback') || lower.includes('exception')) {
            line.classList.add('error');
        } else if (lower.includes('warning') || lower.includes('warn')) {
            line.classList.add('warn');
        } else if (lower.includes('started') || lower.includes('running') || lower.includes('online')) {
            line.classList.add('success');
        } else if (lower.includes('listening') || lower.includes('connected')) {
            line.classList.add('info');
        }

        line.textContent = text;
        logViewer.appendChild(line);

        // Auto-scroll
        logViewer.scrollTop = logViewer.scrollHeight;

        // Limit lines to prevent memory issues
        while (logViewer.children.length > 500) {
            logViewer.removeChild(logViewer.firstChild);
        }
    }

    function clearLog() {
        logViewer.innerHTML = '<div class="log-welcome">Log cleared.</div>';
    }

    // ── Auth ────────────────────────────────────────────────────────────────

    function showLogin() {
        loginOverlay.classList.remove('hidden');
        passwordInput.focus();
    }

    function hideLogin() {
        loginOverlay.classList.add('hidden');
    }

    // ── Notifications ───────────────────────────────────────────────────────

    function showNotification(text) {
        // Simple alert for now — could be a toast later
        console.log('[OPS]', text);
    }

    // ── Event listeners ─────────────────────────────────────────────────────

    btnRefresh.addEventListener('click', requestStatus);
    btnRestartAll.addEventListener('click', restartAll);
    btnStream.addEventListener('click', startStream);
    btnStopStream.addEventListener('click', stopStream);
    btnClearLog.addEventListener('click', clearLog);
    btnLoadErrors.addEventListener('click', requestLogsErrors);
    btnLoadToday.addEventListener('click', requestLogsToday);
    btnLoad50.addEventListener('click', () => {
        const service = logFilter.value;
        requestLogs(service, 50);
    });

    logFilter.addEventListener('change', () => {
        if (streaming) {
            stopStream();
            startStream();
        }
    });

    loginBtn.addEventListener('click', () => {
        const pw = passwordInput.value;
        if (pw) {
            send({ action: 'login', password: pw });
        }
    });

    passwordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') loginBtn.click();
    });

    btnRefreshChat.addEventListener('click', requestChatHistory);
    btnClearChat.addEventListener('click', () => {
        chatViewer.innerHTML = '<div class="log-welcome">Chat cleared.</div>';
    });
    chatRoomFilter.addEventListener('change', renderChat);

    // ── Init ────────────────────────────────────────────────────────────────

    connect();

})();
