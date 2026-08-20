/**
 * status.js — MAGMA//OPS Status tab (lite mode)
 * Consolidated Pi services + MC1 system info + power controls
 */

(function() {
    'use strict';

    var $ = function(sel) { return document.querySelector(sel); };

    // ── DOM refs ──────────────────────────────────────────────────────────

    var piGrid = $('#status-pi-grid');
    var mc1Grid = $('#status-mc1-grid');
    var btnRefreshMc1 = $('#btn-status-mc1-refresh');
    var btnRestartPi = $('#btn-status-restart-pi');
    var btnRebootMc1 = $('#btn-status-reboot-mc1');
    var btnWolMc1 = $('#btn-status-wol-mc1');

    // ── Message handler ───────────────────────────────────────────────────

    var origOnMessage = window.OPS.onMessage;
    window.OPS.onMessage = function(msg) {
        if (origOnMessage) origOnMessage(msg);
        if (!window.OPS.liteMode) return;
        switch (msg.type) {
            case 'status':
                if (msg.services) renderPiServices(msg.services, msg.statuses);
                break;
            case 'mc1_info':
                renderMc1Info(msg);
                break;
            case 'mc1_reboot':
                window.OPS.toast(msg.result || msg.error || 'Rebooting MC1...');
                break;
            case 'mc1_wol':
                window.OPS.toast(msg.result || msg.error || 'WoL packet sent');
                break;
            case 'restart_result':
                window.OPS.toast(msg.service + ': ' + (msg.result || 'done'));
                requestStatus();
                break;
        }
    };

    var origOnConnect = window.OPS.onConnect;
    window.OPS.onConnect = function() {
        if (origOnConnect) origOnConnect();
        if (!window.OPS.liteMode) return;
        requestStatus();
        requestMc1Info();
    };

    // ── Actions ───────────────────────────────────────────────────────────

    function requestStatus() {
        window.OPS.send({ action: 'status', token: window.OPS.authToken });
    }

    function requestMc1Info() {
        window.OPS.send({ action: 'mc1_info', token: window.OPS.authToken });
    }

    // ── Render Pi services ────────────────────────────────────────────────

    function renderPiServices(services, statuses) {
        piGrid.innerHTML = '';

        services.forEach(function(svc) {
            var status = statuses[svc.unit] || 'unknown';
            var isRunning = status === 'active';

            var card = document.createElement('div');
            card.className = 'server-card ' + (isRunning ? 'running' : 'stopped');

            card.innerHTML =
                '<div class="card-header">' +
                    '<span class="card-name">' + svc.name + '</span>' +
                    '<span class="card-icon">' + svc.icon + '</span>' +
                '</div>' +
                '<div class="card-details">' +
                    '<span class="card-port">:' + svc.port + '</span>' +
                    '<span class="card-status ' + (isRunning ? 'online' : 'offline') + '">' +
                        (isRunning ? 'ONLINE' : 'OFFLINE') +
                    '</span>' +
                '</div>';

            piGrid.appendChild(card);
        });
    }

    // ── Render MC1 info ───────────────────────────────────────────────────

    function renderMc1Info(msg) {
        // Update header stats
        var hdrUptime = document.getElementById('mc1-uptime');
        var hdrCpu = document.getElementById('mc1-cpu');
        var hdrMem = document.getElementById('mc1-mem');
        var hdrDisk = document.getElementById('mc1-disk');

        if (msg.error) {
            mc1Grid.innerHTML = '<div class="log-welcome">ERROR: ' + window.OPS.escapeHtml(msg.error) + '</div>';
            if (hdrUptime) hdrUptime.textContent = 'OFFLINE';
            if (hdrCpu) hdrCpu.textContent = '';
            if (hdrMem) hdrMem.textContent = '';
            if (hdrDisk) hdrDisk.textContent = '';
            return;
        }

        var info = msg.info;

        // Update header
        if (hdrUptime) hdrUptime.textContent = info.uptime || '—';
        if (hdrCpu) hdrCpu.textContent = info.cpu_load || '—';
        if (hdrMem) hdrMem.textContent = info.memory || '—';
        if (hdrDisk) hdrDisk.textContent = info.disk_free || '—';

        // Update tab panel
        var items = [
            { label: 'HOSTNAME', value: info.hostname },
            { label: 'UPTIME', value: info.uptime },
            { label: 'CPU', value: (info.cpu_name || '—') + (info.cpu_cores ? ' (' + info.cpu_cores + ' cores)' : '') },
            { label: 'CPU LOAD', value: info.cpu_load },
            { label: 'MEMORY', value: info.memory },
            { label: 'DISK', value: info.disk_free + (info.disk_free_gb ? ' (' + info.disk_free_gb + ')' : '') },
            { label: 'OS', value: info.os_version }
        ];

        mc1Grid.innerHTML = '';
        items.forEach(function(item) {
            var card = document.createElement('div');
            card.className = 'mc1-info-card';
            card.innerHTML =
                '<span class="system-info-label">' + item.label + '</span>' +
                '<span class="system-info-value">' + window.OPS.escapeHtml(item.value || '—') + '</span>';
            mc1Grid.appendChild(card);
        });
    }

    // ── Button handlers ───────────────────────────────────────────────────

    if (btnRefreshMc1) {
        btnRefreshMc1.addEventListener('click', function() {
            requestMc1Info();
        });
    }

    if (btnRestartPi) {
        btnRestartPi.addEventListener('click', function() {
            window.OPS.confirm('RESTART PI?', 'All services will be briefly interrupted.', function() {
                window.OPS.send({ action: 'restart_pi', token: window.OPS.authToken });
                window.OPS.showRebootOverlay('RESTARTING PI');
            });
        });
    }

    if (btnRebootMc1) {
        btnRebootMc1.addEventListener('click', function() {
            window.OPS.confirm('REBOOT MC1?', 'This will restart the Windows PC.', function() {
                window.OPS.send({ action: 'mc1_reboot', token: window.OPS.authToken });
                window.OPS.showRebootOverlay('REBOOTING MC1');
            });
        });
    }

    if (btnWolMc1) {
        btnWolMc1.addEventListener('click', function() {
            window.OPS.send({ action: 'mc1_wol', token: window.OPS.authToken });
        });
    }

    // ── Auto-refresh MC1 info every 60s (lite mode only) ──────────────────

    setInterval(function() {
        if (window.OPS.liteMode && window.OPS.authToken) requestMc1Info();
    }, 60000);

})();
