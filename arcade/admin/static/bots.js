/**
 * bots.js — MAGMA//OPS Bots tab
 * Workflow bot status, triggering, activity log
 */

(function() {
    'use strict';

    // ── DOM refs ──────────────────────────────────────────────────────────

    var botsGrid = document.getElementById('bots-grid');
    var btnRefresh = document.getElementById('btn-refresh-bots');

    // ── Listen for server responses ────────────────────────────────────────

    var origOnMessage = window.OPS.onMessage;
    window.OPS.onMessage = function(msg) {
        if (origOnMessage) origOnMessage(msg);

        switch (msg.type) {
            case 'bots_list_result':
                if (msg.error) {
                    botsGrid.innerHTML = '<div class="log-welcome">' + window.OPS.escapeHtml(msg.error) + '</div>';
                    return;
                }
                renderBots(msg.workflows);
                break;

            case 'bots_trigger_result':
                if (msg.ok) {
                    window.OPS.toast('Triggered: ' + msg.workflow_id);
                } else {
                    window.OPS.toast('Trigger failed: ' + (msg.error || 'unknown'), true);
                }
                break;
        }
    };

    // ── Auto-load on connect ──────────────────────────────────────────────

    var origOnConnect = window.OPS.onConnect;
    window.OPS.onConnect = function() {
        if (origOnConnect) origOnConnect();
        requestBots();
    };

    // ── Actions ───────────────────────────────────────────────────────────

    function requestBots() {
        botsGrid.innerHTML = '<div class="log-welcome">Loading bot status...</div>';
        window.OPS.send({ action: 'bots_list', token: window.OPS.authToken });
    }

    function triggerBot(workflowId, name) {
        window.OPS.confirm('TRIGGER ' + name + '?', 'This will queue a new workflow run.', function() {
            window.OPS.send({
                action: 'bots_trigger',
                workflow_id: workflowId,
                token: window.OPS.authToken
            });
        });
    }

    // ── Render ────────────────────────────────────────────────────────────

    function renderBots(workflows) {
        if (!workflows || !workflows.length) {
            botsGrid.innerHTML = '<div class="log-welcome">No workflows found. Configure GitHub token in the GITHUB tab.</div>';
            return;
        }

        botsGrid.innerHTML = '';

        workflows.forEach(function(w) {
            var card = document.createElement('div');
            card.className = 'score-card';

            // Status dot
            var statusClass = 'status-dot';
            var statusIcon = '○';
            if (w.conclusion === 'success') {
                statusClass += ' status-ok';
                statusIcon = '✓';
            } else if (w.conclusion === 'failure') {
                statusClass += ' status-error';
                statusIcon = '✗';
            } else if (w.status === 'in_progress') {
                statusClass += ' status-running';
                statusIcon = '◎';
            } else if (w.status === 'queued') {
                statusClass += ' status-queued';
                statusIcon = '◌';
            } else {
                statusClass += ' status-unknown';
                statusIcon = '○';
            }

            // Relative time
            var relTime = formatRelativeTime(w.createdAt);

            card.innerHTML =
                '<div class="score-card-header">' +
                    '<span class="' + statusClass + '">' + statusIcon + '</span>' +
                    '<span class="score-card-name">' + window.OPS.escapeHtml(w.name) + '</span>' +
                '</div>' +
                '<div class="score-card-details">' +
                    '<div class="score-detail"><span class="score-detail-label">STATUS</span> <span>' + window.OPS.escapeHtml(w.conclusion || w.status || 'unknown') + '</span></div>' +
                    '<div class="score-detail"><span class="score-detail-label">LAST RUN</span> <span>' + relTime + '</span></div>' +
                    '<div class="score-detail"><span class="score-detail-label">TRIGGER</span> <span>' + window.OPS.escapeHtml(w.event || '—') + '</span></div>' +
                '</div>' +
                '<div class="score-card-actions">' +
                    '<button class="btn btn-orange btn-sm bots-trigger-btn" data-id="' + window.OPS.escapeHtml(w.file) + '" data-name="' + window.OPS.escapeHtml(w.name) + '">TRIGGER</button>' +
                    (w.htmlUrl ? '<a href="' + window.OPS.escapeHtml(w.htmlUrl) + '" target="_blank" class="btn btn-cyan btn-sm">LOGS</a>' : '') +
                '</div>';

            botsGrid.appendChild(card);
        });

        // Bind trigger buttons
        var triggerBtns = botsGrid.querySelectorAll('.bots-trigger-btn');
        for (var i = 0; i < triggerBtns.length; i++) {
            triggerBtns[i].addEventListener('click', function() {
                triggerBot(this.dataset.id, this.dataset.name);
            });
        }
    }

    function formatRelativeTime(isoString) {
        if (!isoString) return 'never';
        var diff = Date.now() - new Date(isoString).getTime();
        var mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return mins + 'm ago';
        var hours = Math.floor(mins / 60);
        if (hours < 24) return hours + 'h ago';
        var days = Math.floor(hours / 24);
        return days + 'd ago';
    }

    // ── Button bindings ───────────────────────────────────────────────────

    btnRefresh.addEventListener('click', requestBots);

    // ── Init ──────────────────────────────────────────────────────────────

    botsGrid.innerHTML = '<div class="log-welcome">Click REFRESH to load bot status.</div>';

})();
