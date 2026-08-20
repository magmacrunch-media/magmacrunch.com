/**
 * shared.js — MAGMA//OPS shared infrastructure
 * WebSocket, auth, toast, confirm, tab routing, sidebar
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
        liteMode: false,   // true when server runs with --lite
        allowedTabs: null, // array of tab IDs allowed in current mode
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

    // ── Sidebar ───────────────────────────────────────────────────────────

    const sidebar = $('#sidebar');
    const sidebarToggle = $('#sidebar-toggle');
    const sidebarBackdrop = $('#sidebar-backdrop');

    // Restore sidebar state from localStorage
    if (sidebar) {
        const collapsed = localStorage.getItem('ops-sidebar-collapsed');
        if (collapsed === 'true') {
            sidebar.classList.add('collapsed');
        }
    }

    // Toggle sidebar
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                sidebar.classList.toggle('open');
                sidebarBackdrop.classList.toggle('hidden');
            } else {
                sidebar.classList.toggle('collapsed');
                localStorage.setItem('ops-sidebar-collapsed', sidebar.classList.contains('collapsed'));
            }
        });
    }

    // Close mobile sidebar on backdrop click
    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarBackdrop.classList.add('hidden');
        });
    }

    // Sidebar group expand/collapse
    document.addEventListener('click', (e) => {
        const groupBtn = e.target.closest('.sidebar-group-btn');
        if (groupBtn) {
            const group = groupBtn.closest('.sidebar-group');
            if (group) group.classList.toggle('open');
            return;
        }

        // Sidebar item click — switch tab, close mobile sidebar
        const item = e.target.closest('.sidebar-item');
        if (item) {
            switchTab(item.dataset.tab);
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
                sidebarBackdrop.classList.add('hidden');
            }
            return;
        }
    });

    // ── WebSocket ─────────────────────────────────────────────────────────

    function connect() {
        if (window.OPS.ws && window.OPS.ws.readyState === WebSocket.OPEN) return;

        const ws = new WebSocket(wsUrl);
        window.OPS.ws = ws;

        ws.onopen = () => {
            tConnected = performance.now();
            console.log('[OPS] Connected');
            clearTimeout(reconnectTimer);
            hideRebootOverlay();
            requestStatus();
            requestSystemInfo();
            send({ action: 'get_mode', token: window.OPS.authToken });
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

            case 'mode':
                window.OPS.liteMode = msg.lite;
                window.OPS.allowedTabs = msg.tabs;
                applyMode();
                break;
        }

        // Forward to active tab module
        if (window.OPS.onMessage) window.OPS.onMessage(msg);
    }

    // ── System info (header stats) ────────────────────────────────────────

    function renderSystemInfo(info) {
        const piUptime = $('#pi-uptime');
        const piTemp = $('#pi-temp');
        const piMem = $('#pi-mem');
        if (piUptime) piUptime.textContent = info.uptime || '—';
        if (piTemp) piTemp.textContent = info.cpu_temp || '—';
        if (piMem) piMem.textContent = info.memory || '—';
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

    // ── Reboot overlay ────────────────────────────────────────────────────

    let _rebootOverlay = null;

    window.OPS.showRebootOverlay = function(title) {
        if (_rebootOverlay) return;
        _rebootOverlay = document.createElement('div');
        _rebootOverlay.className = 'reboot-overlay';
        _rebootOverlay.innerHTML = '<div class="spinner"></div><h2>' + (title || 'REBOOTING') + '</h2><p>This page will reconnect automatically.</p>';
        document.body.appendChild(_rebootOverlay);
    };

    function hideRebootOverlay() {
        if (_rebootOverlay) {
            _rebootOverlay.remove();
            _rebootOverlay = null;
        }
    }

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

    let TABS = ['arcade', 'mc1', 'bots', 'jukebox', 'tv', 'favicon', 'themes', 'plays', 'traffic', 'security', 'github', 'accounts'];

    function getActiveTab() {
        const hash = window.location.hash.replace('#', '');
        return TABS.includes(hash) ? hash : TABS[0];
    }

    function switchTab(tabId) {
        if (!TABS.includes(tabId)) tabId = TABS[0];
        window.location.hash = tabId;
        renderTabs();
    }

    function renderTabs() {
        const active = getActiveTab();

        // Update sidebar items
        $$('.sidebar-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === active);
        });

        // Show/hide tab panels
        $$('.tab-panel').forEach(panel => {
            panel.classList.toggle('hidden', panel.id !== 'tab-' + active);
        });

        // Expand the group containing the active tab
        $$('.sidebar-group').forEach(group => {
            const hasActive = group.querySelector('.sidebar-item[data-tab="' + active + '"]');
            if (hasActive) group.classList.add('open');
        });
    }

    function applyMode() {
        if (window.OPS.allowedTabs) {
            TABS = window.OPS.allowedTabs;
        }
        // Hide/show sidebar items based on allowed tabs
        $$('.sidebar-item').forEach(btn => {
            var tab = btn.dataset.tab;
            btn.classList.toggle('hidden', !TABS.includes(tab));
        });
        if (window.OPS.liteMode) {
            document.body.classList.add('lite');
            // Hide sidebar groups not relevant to lite mode
            $$('.sidebar-group[data-group="media"], .sidebar-group[data-group="config"]').forEach(g => {
                g.classList.add('hidden');
            });
            // Hide sidebar power buttons that are redundant (power controls are in the Status tab)
            var restartPi = $('#sidebar-restart-pi');
            var rebootMc1 = $('#sidebar-reboot-mc1');
            if (restartPi) restartPi.classList.add('hidden');
            if (rebootMc1) rebootMc1.classList.add('hidden');
        }
        // Ensure current hash is a valid tab
        var hash = window.location.hash.replace('#', '');
        if (!TABS.includes(hash)) {
            window.location.hash = TABS[0];
        }
        renderTabs();
    }

    window.addEventListener('hashchange', renderTabs);

    // Keyboard shortcuts: Alt+1 through Alt+4 for sidebar groups
    document.addEventListener('keydown', (e) => {
        if (e.altKey && !e.ctrlKey && !e.metaKey) {
            var groups = ['systems', 'media', 'data', 'config'];
            var idx = parseInt(e.key) - 1;
            if (idx >= 0 && idx < groups.length) {
                e.preventDefault();
                var group = document.querySelector('.sidebar-group[data-group="' + groups[idx] + '"]');
                if (group) group.classList.toggle('open');
            }
        }
    });

    // ── Escape HTML ───────────────────────────────────────────────────────

    window.OPS.escapeHtml = function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    // ── Init ──────────────────────────────────────────────────────────────

    renderTabs();
    connect();

    // Service worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(function() {});
    }

})();
