/**
 * mc1.js — MAGMA//OPS MC1 tab
 * Windows PC health monitoring and service management
 */

(function() {
    'use strict';

    var $ = function(sel) { return document.querySelector(sel); };

    // ── DOM refs ──────────────────────────────────────────────────────────

    var mc1InfoGrid = $('#mc1-info-grid');
    var mc1ServicesGrid = $('#mc1-services-grid');
    var mc1PowerGrid = $('#mc1-power-grid');
    var btnRefreshServices = $('#btn-refresh-mc1-services');
    var btnReboot = $('#btn-mc1-reboot');
    var btnWol = $('#btn-mc1-wol');
    var btnRefreshPower = $('#btn-refresh-power');
    var btnPowerAlwaysOn = $('#btn-power-always-on');
    var btnPowerSleep = $('#btn-power-sleep');

    // ── Message handler ───────────────────────────────────────────────────

    var origOnMessage = window.OPS.onMessage;
    window.OPS.onMessage = function(msg) {
        if (origOnMessage) origOnMessage(msg);
        switch (msg.type) {
            case 'mc1_info':
                renderMc1Info(msg);
                break;
            case 'mc1_services':
                renderMc1Services(msg.services, msg.error);
                break;
            case 'mc1_restart_result':
                window.OPS.toast('MC1 ' + msg.service + ': ' + (msg.result || msg.error || 'done'));
                requestMc1Services();
                break;
            case 'mc1_reboot':
                window.OPS.toast(msg.result || msg.error || 'Rebooting MC1...');
                break;
            case 'mc1_wol':
                window.OPS.toast(msg.result || msg.error || 'WoL packet sent');
                break;
            case 'mc1_power_settings':
                renderPowerSettings(msg);
                break;
            case 'mc1_set_power_mode':
                window.OPS.toast(msg.result || msg.error || 'Power mode updated');
                requestPowerSettings();
                break;
        }
    };

    var origOnConnect = window.OPS.onConnect;
    window.OPS.onConnect = function() {
        if (origOnConnect) origOnConnect();
        requestMc1Info();
        requestMc1Services();
        requestPowerSettings();
    };

    // ── Actions ───────────────────────────────────────────────────────────

    function requestMc1Info() {
        window.OPS.send({ action: 'mc1_info', token: window.OPS.authToken });
    }

    function requestMc1Services() {
        window.OPS.send({ action: 'mc1_services', token: window.OPS.authToken });
    }

    function requestPowerSettings() {
        window.OPS.send({ action: 'mc1_power_settings', token: window.OPS.authToken });
    }

    // ── Render system info ────────────────────────────────────────────────

    function renderMc1Info(msg) {
        // Update header stats
        var hdrUptime = document.getElementById('mc1-uptime');
        var hdrCpu = document.getElementById('mc1-cpu');
        var hdrMem = document.getElementById('mc1-mem');
        var hdrDisk = document.getElementById('mc1-disk');

        if (msg.error) {
            mc1InfoGrid.innerHTML = '<div class="log-welcome">ERROR: ' + window.OPS.escapeHtml(msg.error) + '</div>';
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

        mc1InfoGrid.innerHTML = '';
        items.forEach(function(item) {
            var card = document.createElement('div');
            card.className = 'mc1-info-card';
            card.innerHTML =
                '<span class="system-info-label">' + item.label + '</span>' +
                '<span class="system-info-value">' + window.OPS.escapeHtml(item.value || '—') + '</span>';
            mc1InfoGrid.appendChild(card);
        });
    }

    // ── Render power settings ─────────────────────────────────────────────

    function renderPowerSettings(msg) {
        if (msg.error) {
            mc1PowerGrid.innerHTML = '<div class="log-welcome">ERROR: ' + window.OPS.escapeHtml(msg.error) + '</div>';
            return;
        }
        var settings = msg.settings;

        var items = [
            { label: 'POWER MODE', value: settings.power_mode === 'always-on' ? 'ALWAYS-ON' : 'SLEEP' },
            { label: 'SLEEP TIMEOUT', value: settings.sleep_timeout_ac === 0 ? 'NEVER' : settings.sleep_timeout_ac + ' min' },
            { label: 'HIBERNATE TIMEOUT', value: settings.hibernate_timeout_ac === 0 ? 'NEVER' : settings.hibernate_timeout_ac + ' min' },
            { label: 'HIBERNATE', value: settings.hibernate_enabled ? 'ENABLED' : 'DISABLED' }
        ];

        mc1PowerGrid.innerHTML = '';
        items.forEach(function(item) {
            var card = document.createElement('div');
            card.className = 'mc1-info-card';
            card.innerHTML =
                '<span class="system-info-label">' + item.label + '</span>' +
                '<span class="system-info-value">' + window.OPS.escapeHtml(item.value) + '</span>';
            mc1PowerGrid.appendChild(card);
        });

        // Update button states
        if (btnPowerAlwaysOn && btnPowerSleep) {
            if (settings.power_mode === 'always-on') {
                btnPowerAlwaysOn.classList.add('btn-active');
                btnPowerSleep.classList.remove('btn-active');
            } else {
                btnPowerAlwaysOn.classList.remove('btn-active');
                btnPowerSleep.classList.add('btn-active');
            }
        }
    }

    // ── Render services ───────────────────────────────────────────────────

    function renderMc1Services(services, error) {
        if (error) {
            mc1ServicesGrid.innerHTML = '<div class="log-welcome">ERROR: ' + window.OPS.escapeHtml(error) + '</div>';
            return;
        }

        mc1ServicesGrid.innerHTML = '';
        if (!services || services.length === 0) {
            mc1ServicesGrid.innerHTML = '<div class="log-welcome">No services found.</div>';
            return;
        }

        // Key services to show first
        var KEY_SERVICES = [
            'actions.runner.magmacrunchmedia-magmacrunch.com.MC1-linux',
            'Tailscale',
            'OpenSSH'
        ];
        var keySvcLower = KEY_SERVICES.map(function(k) { return k.toLowerCase(); });

        var sorted = services.slice().sort(function(a, b) {
            var aIdx = keySvcLower.indexOf(a.name.toLowerCase());
            var bIdx = keySvcLower.indexOf(b.name.toLowerCase());
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
            if (aIdx !== -1) return -1;
            if (bIdx !== -1) return 1;
            return a.name.localeCompare(b.name);
        });

        sorted.forEach(function(svc) {
            var card = document.createElement('div');
            card.className = 'server-card ' + (svc.ok ? 'running' : 'stopped');
            card.innerHTML =
                '<div class="card-header">' +
                    '<span class="card-name" title="' + window.OPS.escapeHtml(svc.name) + '">' + window.OPS.escapeHtml(svc.name) + '</span>' +
                '</div>' +
                '<div class="card-details">' +
                    '<span class="card-status ' + (svc.ok ? 'online' : 'offline') + '">' +
                        (svc.ok ? 'RUNNING' : 'STOPPED') +
                    '</span>' +
                '</div>' +
                '<div class="card-actions">' +
                    '<button class="btn btn-cyan btn-sm" data-action="mc1-restart" data-service="' + window.OPS.escapeHtml(svc.name) + '">' +
                        'RESTART' +
                    '</button>' +
                '</div>';
            mc1ServicesGrid.appendChild(card);
        });

        mc1ServicesGrid.querySelectorAll('[data-action="mc1-restart"]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var svcName = btn.dataset.service;
                window.OPS.confirm('Restart ' + svcName + '?', '', function() {
                    window.OPS.send({
                        action: 'mc1_restart_service',
                        service: svcName,
                        token: window.OPS.authToken
                    });
                });
            });
        });
    }

    // ── Event listeners ───────────────────────────────────────────────────

    if (btnRefreshServices) {
        btnRefreshServices.addEventListener('click', requestMc1Services);
    }

    if (btnReboot) {
        btnReboot.addEventListener('click', function() {
            window.OPS.confirm('REBOOT MC1', 'This will reboot the Windows PC. It should come back automatically.', function() {
                window.OPS.send({ action: 'mc1_reboot', token: window.OPS.authToken });
            });
        });
    }

    if (btnWol) {
        btnWol.addEventListener('click', function() {
            window.OPS.confirm('WAKE ON LAN', 'Send a Wake-on-LAN magic packet to MC1? This will wake it from sleep/hibernate.', function() {
                window.OPS.send({ action: 'mc1_wol', token: window.OPS.authToken });
            });
        });
    }

    if (btnRefreshPower) {
        btnRefreshPower.addEventListener('click', requestPowerSettings);
    }

    if (btnPowerAlwaysOn) {
        btnPowerAlwaysOn.addEventListener('click', function() {
            window.OPS.confirm('SET ALWAYS-ON MODE', 'MC1 will never sleep or hibernate. Use this when running local LLMs.', function() {
                window.OPS.send({ action: 'mc1_set_power_mode', mode: 'always-on', token: window.OPS.authToken });
            });
        });
    }

    if (btnPowerSleep) {
        btnPowerSleep.addEventListener('click', function() {
            window.OPS.confirm('SET SLEEP MODE', 'MC1 will sleep after 30 minutes of inactivity. You can wake it with Wake-on-LAN.', function() {
                window.OPS.send({ action: 'mc1_set_power_mode', mode: 'sleep', token: window.OPS.authToken });
            });
        });
    }

    // ── Auto-refresh MC1 info every 60 seconds ───────────────────────────

    setInterval(function() {
        if (window.OPS.authToken) requestMc1Info();
    }, 60000);

})();
