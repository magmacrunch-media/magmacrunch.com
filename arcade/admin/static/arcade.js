/**
 * arcade.js — MAGMA//OPS Arcade tab
 * Server status, live logs, chat history, high scores, system controls
 */

(function() {
    'use strict';

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // ── State ─────────────────────────────────────────────────────────────

    let streaming = false;
    let chatHistory = [];
    let chatRoomHistories = {};

    // ── Temperature monitoring ────────────────────────────────────────────

    let highTempCount = 0;
    const CRITICAL_TEMP = 80;
    const AUTO_RESTART_DELAY = 30;
    let autoRestartTimer = null;

    // ── DOM refs ──────────────────────────────────────────────────────────

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
    const chatViewer = $('#chat-viewer');
    const chatRoomFilter = $('#chat-room-filter');
    const btnRefreshChat = $('#btn-refresh-chat');
    const btnClearChat = $('#btn-clear-chat');
    const scoresGrid = $('#scores-grid');
    const btnRefreshScores = $('#btn-refresh-scores');
    const btnResetScores = $('#btn-reset-scores');
    const systemModal = $('#system-modal');
    const btnSystemMenu = $('#btn-system-menu');
    const closeSystemModal = $('#close-system-modal');
    const modalUptime = $('#modal-uptime');
    const modalTemp = $('#modal-temp');
    const modalMemory = $('#modal-memory');
    const modalLoad = $('#modal-load');
    const modalRestartPi = $('#modal-restart-pi');
    const modalPoweroffPi = $('#modal-poweroff-pi');
    const trafficLines = $('#traffic-lines');
    const trafficTotal = $('#traffic-total');
    const trafficGrid = $('#traffic-grid');
    const btnRefreshTraffic = $('#btn-refresh-traffic');

    // ── Message handler ───────────────────────────────────────────────────

    window.OPS.onMessage = function(msg) {
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
                window.OPS.toast(`${msg.service} restart: ${msg.result || 'done'}`);
                break;

            case 'system_info':
                if (msg.info.cpu_temp) checkTemperature(msg.info.cpu_temp);
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
                chatHistory.push(msg);
                if (chatRoomFilter.value === 'global' && !msg.room) {
                    appendChatMessage(msg);
                }
                break;

            case 'scores_all':
                renderScores(msg.games);
                break;

            case 'score_reset':
                if (msg.ok) {
                    window.OPS.toast(`Scores reset for ${msg.game}`);
                    requestScores();
                }
                break;

            case 'nginx_traffic':
                renderTraffic(msg);
                break;
        }
    };

    window.OPS.onConnect = function() {
        loadApiKeys();
        requestChatHistory();
    };

    // ── Actions ───────────────────────────────────────────────────────────

    function requestStatus() {
        window.OPS.send({ action: 'status', token: window.OPS.authToken });
    }

    function requestSystemInfo() {
        window.OPS.send({ action: 'system_info', token: window.OPS.authToken });
    }

    function requestLogs(service, lines) {
        window.OPS.send({ action: 'logs', service, lines, token: window.OPS.authToken });
    }

    function requestLogsErrors() {
        window.OPS.send({ action: 'logs_errors', token: window.OPS.authToken });
    }

    function requestLogsToday() {
        window.OPS.send({ action: 'logs_today', token: window.OPS.authToken });
    }

    function restartService(unit) {
        window.OPS.confirm(`Restart ${unit}?`, '', () => {
            window.OPS.send({ action: 'restart', service: unit, token: window.OPS.authToken });
            markStarting(unit);
        });
    }

    function restartAll() {
        window.OPS.confirm('Restart ALL servers?', '', () => {
            window.OPS.send({ action: 'restart_all', token: window.OPS.authToken });
            $$('.server-card').forEach(card => card.classList.add('starting'));
        });
    }

    function startStream() {
        const service = logFilter.value;
        window.OPS.send({ action: 'stream_start', service, token: window.OPS.authToken });
        streaming = true;
        btnStream.classList.add('hidden');
        btnStopStream.classList.remove('hidden');
    }

    function stopStream() {
        window.OPS.send({ action: 'stream_stop', token: window.OPS.authToken });
        streaming = false;
        btnStopStream.classList.add('hidden');
        btnStream.classList.remove('hidden');
    }

    function requestChatHistory() {
        window.OPS.send({ action: 'chat_history', token: window.OPS.authToken });
    }

    function requestScores() {
        window.OPS.send({ action: 'scores_all', token: window.OPS.authToken });
    }

    function loadApiKeys() {
        window.OPS.send({ action: 'api_keys_load', token: window.OPS.authToken });
    }

    function requestTraffic() {
        const lines = parseInt(trafficLines.value, 10) || 1000;
        window.OPS.send({ action: 'nginx_traffic', lines, token: window.OPS.authToken });
    }

    // ── Render status grid ────────────────────────────────────────────────

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

            const opt = document.createElement('option');
            opt.value = svc.unit;
            opt.textContent = svc.name;
            logFilter.appendChild(opt);
        });

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

    // ── Log viewer ────────────────────────────────────────────────────────

    function appendLogs(text, service) {
        if (!text) return;
        const welcome = logViewer.querySelector('.log-welcome');
        if (welcome) welcome.remove();

        text.split('\n').forEach(line => {
            if (line.trim()) appendLogLine(line);
        });
    }

    function appendLogLine(text) {
        const welcome = logViewer.querySelector('.log-welcome');
        if (welcome) welcome.remove();

        const line = document.createElement('div');
        line.className = 'log-line';

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
        logViewer.scrollTop = logViewer.scrollHeight;

        while (logViewer.children.length > 500) {
            logViewer.removeChild(logViewer.firstChild);
        }
    }

    function clearLog() {
        logViewer.innerHTML = '<div class="log-welcome">Log cleared.</div>';
    }

    // ── Chat ──────────────────────────────────────────────────────────────

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
        const color = msg.color || '#f0ead8';
        const text = msg.text || '';

        div.innerHTML = `
            <span class="chat-time">${time}</span>
            <span class="chat-name" style="color:${color}">${name}:</span>
            <span class="chat-text">${window.OPS.escapeHtml(text)}</span>
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
        if (chatRoomFilter.querySelector(`option[value="${current}"]`)) {
            chatRoomFilter.value = current;
        }
    }

    // ── Scores ────────────────────────────────────────────────────────────

    const gameNames = {
        '2n': '2^N', 'george-boole': 'George Boole', 'moonlight-drift': 'Moonlight Drift',
        'solitaire': 'Solitaire', 'solitaire-thld': 'Solitaire THLD', 'tetris': 'Tetris',
        'scandinavian-stud': 'Scandinavian Stud', 'roderick-tron': 'Roderick Tron',
        'very-long-boards': 'Very Long Boards', 'klotski': 'Klotski',
        'fifteen-puzzle': 'Fifteen Puzzle', 'threes': 'Threes', 'cribbage': 'Cribbage'
    };

    const MODE_LABELS = {
        '2n': { '2': '2-BIT', '3': '3-BIT', '4': '4-BIT', '5': '5-BIT', '6': '6-BIT', '7': '7-BIT', '8': '8-BIT', '9': '9-BIT', '10': '10-BIT', '11': '11-BIT', '12': '12-BIT', '13': '13-BIT', '14': '14-BIT', '15': '15-BIT', '16': '16-BIT', 'endless': 'ENDLESS' },
        'george-boole': { '2': '2-BIT', '3': '3-BIT', '4': '4-BIT', '5': '5-BIT', '6': '6-BIT', '7': '7-BIT', '8': '8-BIT', 'endless': 'GAUNTLET', '11': 'CLASSIC' }
    };

    function renderScores(games) {
        scoresGrid.innerHTML = '';
        if (!games || Object.keys(games).length === 0) {
            scoresGrid.innerHTML = '<div class="log-welcome">No score data found.</div>';
            return;
        }

        function renderScoreCard(name, scores, subtitle, resetId) {
            const card = document.createElement('div');
            card.className = 'score-card';

            let scoresHtml = '';
            if (scores.length === 0) {
                scoresHtml = '<div class="score-empty">NO SCORES YET</div>';
            } else {
                scores.slice(0, 10).forEach((s, i) => {
                    const scoreVal = s.score != null ? s.score.toLocaleString() :
                                     s.totalScore != null ? s.totalScore.toLocaleString() : '0';
                    const extra = s.level != null ? ` LV${s.level}` :
                                  s.time != null ? ` ${s.time}` :
                                  s.rounds != null ? ` R${s.rounds}` : '';
                    scoresHtml += `
                        <div class="score-row">
                            <span class="score-rank">#${i + 1}</span>
                            <span class="score-name">${s.initials || '???'}</span>
                            <span class="score-val">${scoreVal}${extra}</span>
                        </div>`;
                });
            }

            card.innerHTML = `
                <div class="score-card-header">
                    <div>
                        <span class="score-card-name">${name}</span>
                        ${subtitle ? `<span class="score-card-sub">${subtitle}</span>` : ''}
                    </div>
                    <span class="score-card-count">${scores.length} entries</span>
                </div>
                <div class="score-card-scores">${scoresHtml}</div>
                <div class="score-card-actions">
                    <button class="btn btn-rose btn-xs" data-reset="${resetId}">RESET</button>
                </div>
            `;
            scoresGrid.appendChild(card);
        }

        Object.keys(games).sort().forEach(gameId => {
            const game = games[gameId];
            const scores = game.scores || [];
            const name = gameNames[gameId] || gameId;
            const modeLabels = MODE_LABELS[gameId];
            const hasDifficulty = modeLabels && scores.some(s => s.difficulty != null);

            if (hasDifficulty) {
                const groups = {};
                scores.forEach(s => {
                    const d = s.difficulty || 'unknown';
                    if (!groups[d]) groups[d] = [];
                    groups[d].push(s);
                });

                const sortedKeys = Object.keys(groups).sort((a, b) => {
                    const na = parseInt(a), nb = parseInt(b);
                    if (!isNaN(na) && !isNaN(nb)) return na - nb;
                    if (!isNaN(na)) return -1;
                    if (!isNaN(nb)) return 1;
                    return a.localeCompare(b);
                });

                sortedKeys.forEach(diff => {
                    const label = modeLabels[diff] || diff.toUpperCase();
                    renderScoreCard(name, groups[diff], label, gameId);
                });
            } else {
                renderScoreCard(name, scores, null, gameId);
            }
        });

        scoresGrid.querySelectorAll('[data-reset]').forEach(btn => {
            btn.addEventListener('click', () => {
                window.OPS.confirm(`Reset all scores for ${btn.dataset.reset}?`, '', () => {
                    window.OPS.send({ action: 'score_reset', game: btn.dataset.reset, token: window.OPS.authToken });
                });
            });
        });
    }

    // ── System Modal ──────────────────────────────────────────────────────

    function openSystemModal() {
        const temp = $('#system-temp').textContent || '—';
        const uptime = $('#system-uptime').textContent || '—';
        const mem = $('#system-mem').textContent || '—';
        const cpu = $('#system-cpu').textContent || '—';
        modalTemp.textContent = temp;
        modalUptime.textContent = uptime;
        modalMemory.textContent = mem;
        modalLoad.textContent = cpu;
        systemModal.classList.remove('hidden');
    }

    function closeSystemModalFn() {
        systemModal.classList.add('hidden');
    }

    btnSystemMenu.addEventListener('click', openSystemModal);
    closeSystemModal.addEventListener('click', closeSystemModalFn);
    systemModal.addEventListener('click', (e) => {
        if (e.target === systemModal) closeSystemModalFn();
    });

    modalRestartPi.addEventListener('click', () => {
        closeSystemModalFn();
        window.OPS.confirm('RESTART PI', 'This will reboot the Raspberry Pi. All servers will restart automatically.', () => {
            window.OPS.showRebootOverlay();
            window.OPS.send({ action: 'restart_pi', token: window.OPS.authToken });
        });
    });

    modalPoweroffPi.addEventListener('click', () => {
        closeSystemModalFn();
        window.OPS.confirm('POWER OFF', 'This will shut down the Raspberry Pi completely. You will need physical access to turn it back on.', () => {
            window.OPS.showRebootOverlay();
            window.OPS.send({ action: 'poweroff_pi', token: window.OPS.authToken });
        });
    });

    // ── Temperature Monitoring ────────────────────────────────────────────

    function checkTemperature(tempStr) {
        const match = tempStr.match(/([\d.]+)/);
        if (!match) return;
        const temp = parseFloat(match[1]);

        if (temp >= CRITICAL_TEMP) {
            highTempCount++;
            if (highTempCount >= 2) triggerAutoRestart(temp);
        } else {
            highTempCount = 0;
        }
    }

    function triggerAutoRestart(temp) {
        if (autoRestartTimer) return;

        window.OPS.confirm(
            'AUTO-RESTART',
            `CPU temperature is ${temp}°C (critical: ${CRITICAL_TEMP}°C). Pi will auto-restart in ${AUTO_RESTART_DELAY} seconds unless cancelled.`,
            () => {
                window.OPS.showRebootOverlay();
                window.OPS.send({ action: 'restart_pi', token: window.OPS.authToken });
            }
        );

        autoRestartTimer = setTimeout(() => {
            window.OPS.showRebootOverlay();
            window.OPS.send({ action: 'restart_pi', token: window.OPS.authToken });
            autoRestartTimer = null;
        }, AUTO_RESTART_DELAY * 1000);
    }

    // ── Traffic rendering ─────────────────────────────────────────────────

    function renderTraffic(msg) {
        const total = parseInt(msg.total, 10);
        if (!isNaN(total)) {
            trafficTotal.textContent = `TOTAL REQUESTS: ${total.toLocaleString()}`;
        }

        trafficGrid.innerHTML = '';

        const sections = [
            { title: 'TOP IPs', data: msg.top_ips },
            { title: 'STATUS CODES', data: msg.status_codes },
            { title: 'USER AGENTS', data: msg.user_agents },
        ];

        sections.forEach(({ title, data }) => {
            const card = document.createElement('div');
            card.className = 'traffic-card';
            card.innerHTML = `<h3 class="traffic-card-title">${title}</h3>`;

            const lines = (data || '').split('\n').filter(l => l.trim());
            if (lines.length === 0) {
                card.innerHTML += '<div class="log-welcome">No data</div>';
            } else {
                const table = document.createElement('div');
                table.className = 'traffic-table';
                lines.forEach(line => {
                    const parts = line.trim().split(/\s+/);
                    const count = parts[0];
                    const label = parts.slice(1).join(' ');
                    const row = document.createElement('div');
                    row.className = 'traffic-row';

                    const suspicious = isSuspicious(label, title);
                    if (suspicious) row.classList.add('suspicious');

                    row.innerHTML = `<span class="traffic-count">${count}</span><span class="traffic-label">${window.OPS.escapeHtml(label)}</span>`;
                    table.appendChild(row);
                });
                card.appendChild(table);
            }
            trafficGrid.appendChild(card);
        });
    }

    function isSuspicious(label, section) {
        if (section === 'USER AGENTS') {
            if (!label || label === '-') return true;
            if (/MSIE 7\.0|Chrome\/1[0-4]\.|Trident/i.test(label)) return true;
            if (/libredtail|Scrapy|curl|wget|python-requests/i.test(label)) return true;
        }
        if (section === 'STATUS CODES') {
            if (label === '426' || label === '400' || label === '403' || label === '404') return true;
        }
        return false;
    }

    // ── Event listeners ───────────────────────────────────────────────────

    btnRefresh.addEventListener('click', requestStatus);
    btnRestartAll.addEventListener('click', restartAll);
    btnStream.addEventListener('click', startStream);
    btnStopStream.addEventListener('click', stopStream);
    btnClearLog.addEventListener('click', clearLog);
    btnLoadErrors.addEventListener('click', requestLogsErrors);
    btnLoadToday.addEventListener('click', requestLogsToday);
    btnLoad50.addEventListener('click', () => requestLogs(logFilter.value, 50));

    logFilter.addEventListener('change', () => {
        if (streaming) { stopStream(); startStream(); }
    });

    btnRefreshChat.addEventListener('click', requestChatHistory);
    btnClearChat.addEventListener('click', () => {
        chatViewer.innerHTML = '<div class="log-welcome">Chat cleared.</div>';
    });
    chatRoomFilter.addEventListener('change', renderChat);

    btnRefreshScores.addEventListener('click', requestScores);
    btnResetScores.addEventListener('click', () => {
        window.OPS.confirm('Reset ALL high scores across ALL games?', '', () => {
            const gameIds = ['2n', 'george-boole', 'moonlight-drift', 'solitaire', 'solitaire-thld', 'tetris', 'scandinavian-stud', 'roderick-tron', 'very-long-boards', 'klotski', 'fifteen-puzzle', 'threes', 'cribbage'];
            gameIds.forEach(id => window.OPS.send({ action: 'score_reset', game: id, token: window.OPS.authToken }));
            setTimeout(requestScores, 1000);
        });
    });

    btnRefreshTraffic.addEventListener('click', requestTraffic);

})();
