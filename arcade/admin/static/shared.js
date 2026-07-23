/**
 * shared.js — MAGMA//OPS shared infrastructure
 * WebSocket, auth, toast, confirm, tab routing
 */

(function() {
    'use strict';

    const WS_PORT_OFFSET = 1;
    const wsUrl = `ws://${window.location.hostname}:${parseInt(window.location.port) + WS_PORT_OFFSET}`;

    // ── Public namespace ──────────────────────────────────────────────────

    window.OPS = {
        ws: null,
        authToken: null,
        send: send,
        onMessage: null,   // set by tab modules to receive messages
        onConnect: null,   // called when WS connects (for initial data loads)
    };

    // ── State ─────────────────────────────────────────────────────────────

    let reconnectTimer = null;
    let statusTimer = null;
    let tConnected = 0;

    // ── DOM refs ──────────────────────────────────────────────────────────

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const loginOverlay = $('#login-overlay');
    const usernameInput = $('#username-input');
    const passwordInput = $('#password-input');
    const loginBtn = $('#login-btn');
    const loginError = $('#login-error');
    const confirmModal = $('#confirm-modal');
    const confirmTitle = $('#confirm-title');
    const confirmMessage = $('#confirm-message');
    const confirmYes = $('#confirm-yes');
    const confirmNo = $('#confirm-no');

    let pendingAction = null;

    // ── WebSocket ─────────────────────────────────────────────────────────

    function connect() {
        if (window.OPS.ws && window.OPS.ws.readyState === WebSocket.OPEN) return;

        const ws = new WebSocket(wsUrl);
        window.OPS.ws = ws;

        ws.onopen = () => {
            tConnected = performance.now();
            console.log('[OPS] Connected');
            clearTimeout(reconnectTimer);
            statusTimer = setInterval(() => {
                if (window.OPS.authToken) requestStatus();
            }, 10000);
            setInterval(() => {
                if (window.OPS.authToken) requestSystemInfo();
            }, 30000);
            if (window.OPS.onConnect) window.OPS.onConnect();
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

        ws.onerror = () => {
            console.error('[OPS] WebSocket error');
        };
    }

    function send(msg) {
        if (window.OPS.ws && window.OPS.ws.readyState === WebSocket.OPEN) {
            window.OPS.ws.send(JSON.stringify(msg));
        }
    }

    function requestStatus() {
        send({ action: 'status', token: window.OPS.authToken });
    }

    function requestSystemInfo() {
        send({ action: 'system_info', token: window.OPS.authToken });
    }

    // ── Message handler ───────────────────────────────────────────────────

    function handleMessage(msg) {
        switch (msg.type) {
            case 'auth_required':
                showLogin();
                break;

            case 'login_ok':
                window.OPS.authToken = msg.token;
                hideLogin();
                console.log('[OPS] Login OK');
                requestStatus();
                requestSystemInfo();
                if (window.OPS.onConnect) window.OPS.onConnect();
                break;

            case 'login_fail':
                loginError.classList.remove('hidden');
                passwordInput.value = '';
                break;

            case 'system_info':
                renderSystemInfo(msg.info);
                break;
        }

        // Forward to active tab module
        if (window.OPS.onMessage) window.OPS.onMessage(msg);
    }

    // ── System info (header stats) ────────────────────────────────────────

    function renderSystemInfo(info) {
        const sysUptime = $('#system-uptime');
        const sysCpu = $('#system-cpu');
        const sysMem = $('#system-mem');
        const sysTemp = $('#system-temp');
        if (sysUptime) sysUptime.textContent = `UP: ${info.uptime || 'N/A'}`;
        if (sysCpu) sysCpu.textContent = `CPU: ${info.cpu_load || 'N/A'}`;
        if (sysMem) sysMem.textContent = `MEM: ${info.memory || 'N/A'}`;
        if (sysTemp) sysTemp.textContent = `TEMP: ${info.cpu_temp || 'N/A'}°C`;
    }

    // ── Auth ──────────────────────────────────────────────────────────────

    function showLogin() {
        loginOverlay.classList.remove('hidden');
        passwordInput.focus();
    }

    function hideLogin() {
        loginOverlay.classList.add('hidden');
    }

    loginBtn.addEventListener('click', () => {
        const username = usernameInput.value || 'admin';
        const pw = passwordInput.value;
        if (pw) send({ action: 'login', username: username, password: pw });
    });

    passwordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') loginBtn.click();
    });

    usernameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') passwordInput.focus();
    });

    // ── Toast ─────────────────────────────────────────────────────────────

    window.OPS.toast = function(msg, isError) {
        const toast = document.createElement('div');
        toast.className = 'ops-toast' + (isError ? ' error' : '');
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    };

    // ── Confirm modal ─────────────────────────────────────────────────────

    window.OPS.confirm = function(title, message, onConfirm) {
        confirmTitle.textContent = title || 'ARE YOU SURE?';
        confirmMessage.textContent = message || '';
        confirmModal.classList.remove('hidden');
        pendingAction = onConfirm;
    };

    confirmYes.addEventListener('click', () => {
        confirmModal.classList.add('hidden');
        if (pendingAction) pendingAction();
        pendingAction = null;
    });

    confirmNo.addEventListener('click', () => {
        confirmModal.classList.add('hidden');
        pendingAction = null;
    });

    // ── Tab routing ───────────────────────────────────────────────────────

    const TABS = ['arcade', 'jukebox', 'themes', 'accounts', 'security', 'tv', 'github'];

    function getActiveTab() {
        const hash = window.location.hash.replace('#', '');
        return TABS.includes(hash) ? hash : 'arcade';
    }

    function switchTab(tabId) {
        if (!TABS.includes(tabId)) tabId = 'arcade';
        window.location.hash = tabId;
        renderTabs();
    }

    function renderTabs() {
        const active = getActiveTab();

        // Update tab bar
        $$('.ops-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === active);
        });

        // Show/hide tab panels
        $$('.tab-panel').forEach(panel => {
            panel.classList.toggle('hidden', panel.id !== `tab-${active}`);
        });
    }

    // Tab bar click handling
    document.addEventListener('click', (e) => {
        const tab = e.target.closest('.ops-tab');
        if (tab) switchTab(tab.dataset.tab);
    });

    window.addEventListener('hashchange', renderTabs);

    // ── Escape HTML ───────────────────────────────────────────────────────

    window.OPS.escapeHtml = function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    // ── Init ──────────────────────────────────────────────────────────────

    renderTabs();
    connect();

})();
