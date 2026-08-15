/**
 * github.js — MAGMA//OPS GitHub tab
 * Token config, deploy status, sync controls, backup triggers
 */

(function() {
    'use strict';

    // ── DOM refs ──────────────────────────────────────────────────────────

    var tokenInput = document.getElementById('gh-token-input');
    var btnTest = document.getElementById('gh-btn-test');
    var btnShow = document.getElementById('gh-btn-show-token');
    var statusDot = document.getElementById('gh-status-dot');
    var statusText = document.getElementById('gh-status-text');
    var commitMsgInput = document.getElementById('gh-commit-msg');
    var btnSyncAll = document.getElementById('gh-btn-sync-all');
    var btnBackupMB = document.getElementById('gh-btn-backup-mb');
    var btnBackupTMDB = document.getElementById('gh-btn-backup-tmdb');
    var syncLog = document.getElementById('gh-sync-log');

    // ── Log helper ─────────────────────────────────────────────────────────

    function log(msg) {
        var line = document.createElement('div');
        line.className = 'gh-log-line';
        var ts = new Date().toLocaleTimeString();
        line.textContent = '[' + ts + '] ' + msg;
        syncLog.prepend(line);
        while (syncLog.children.length > 50) syncLog.lastChild.remove();
    }

    function getCommitMessage() {
        return (commitMsgInput && commitMsgInput.value) || 'Update via MAGMA//OPS';
    }

    // ── Listen for server responses ────────────────────────────────────────

    var origOnMessage = window.OPS.onMessage;
    window.OPS.onMessage = function(msg) {
        if (origOnMessage) origOnMessage(msg);

        switch (msg.type) {
            case 'github_test_result':
                if (msg.ok) {
                    statusDot.className = 'gh-status-dot connected';
                    statusText.textContent = 'CONNECTED — ' + msg.repo + ' (' + msg.default_branch + ')';
                    log('Connected to ' + msg.repo);
                    window.OPS.toast('GitHub connected');
                    // Save token to config
                    window.OPS.send({
                        action: 'github_config_save',
                        github_token: tokenInput.value,
                        token: window.OPS.authToken,
                    });
                } else {
                    statusDot.className = 'gh-status-dot error';
                    statusText.textContent = 'ERROR — ' + msg.error;
                    log('Connection failed: ' + msg.error);
                    window.OPS.toast('GitHub: ' + msg.error, true);
                }
                break;

            case 'github_jukebox_result':
                handleDeployResult('JUKEBOX', msg, msg.songs_count);
                break;

            case 'github_tv_result':
                handleDeployResult('TV CHANNELS', msg, msg.channels_count);
                break;

            case 'github_themes_result':
                handleDeployResult('THEMES', msg, msg.themes_count);
                break;

            case 'github_sync_result':
                btnSyncAll.disabled = false;
                btnSyncAll.textContent = 'SYNC ALL TO GITHUB';
                if (msg.ok) {
                    if (msg.files_changed && msg.files_changed.length > 0) {
                        log('Synced ' + msg.files_changed.length + ' files: ' + msg.files_changed.join(', '));
                        window.OPS.toast('Synced ' + msg.files_changed.length + ' files to GitHub');
                        if (msg.commit_url) log('Commit: ' + msg.commit_url);
                    } else {
                        log('Everything already in sync');
                        window.OPS.toast('Already in sync');
                    }
                } else {
                    log('Sync failed: ' + msg.error);
                    window.OPS.toast('Sync failed: ' + msg.error, true);
                }
                break;

            case 'github_backup_progress':
                log(msg.status);
                break;

            case 'github_backup_result':
                btnBackupMB.disabled = false;
                btnBackupTMDB.disabled = false;
                btnBackupMB.textContent = 'MUSICBRAINZ BACKUP';
                btnBackupTMDB.textContent = 'TMDB BACKUP';
                if (msg.ok) {
                    var count = msg.files_changed ? msg.files_changed.length : 0;
                    log('Backup committed — ' + count + ' files updated');
                    if (msg.commit_url) log('Commit: ' + msg.commit_url);
                    window.OPS.toast('Backup committed to GitHub');
                } else {
                    log('Backup issue: ' + (msg.error || 'see output'));
                    window.OPS.toast(msg.error || 'Backup completed locally', true);
                }
                break;

            case 'github_config_saved':
                // silent
                break;

            case 'github_config_loaded':
                if (msg.ok) {
                    // Show masked token so user knows it's saved
                    if (msg.masked) {
                        tokenInput.value = msg.masked;
                        tokenInput.placeholder = msg.masked;
                    }
                    // Auto-test the connection
                    window.OPS.send({
                        action: 'github_test',
                        token: window.OPS.authToken,
                    });
                }
                break;
        }
    };

    function handleDeployResult(label, msg, count) {
        if (msg.ok) {
            log(label + ' deployed — ' + (count || '') + ' items committed');
            if (msg.commit_url) log('Commit: ' + msg.commit_url);
            window.OPS.toast(label + ' deployed to GitHub');
        } else {
            log(label + ' deploy failed: ' + msg.error);
            window.OPS.toast(label + ' deploy failed', true);
        }
    }

    // ── Button bindings ────────────────────────────────────────────────────

    btnTest.addEventListener('click', function() {
        log('Testing GitHub connection...');
        window.OPS.send({
            action: 'github_test',
            github_token: tokenInput.value,
            token: window.OPS.authToken,
        });
    });

    btnShow.addEventListener('click', function() {
        tokenInput.type = tokenInput.type === 'password' ? 'text' : 'password';
        btnShow.textContent = tokenInput.type === 'password' ? 'SHOW' : 'HIDE';
    });

    btnSyncAll.addEventListener('click', function() {
        window.OPS.confirm('SYNC ALL TO GITHUB', 'This will push all local changes (jukebox, TV, themes, scores) to production.', function() {
            btnSyncAll.disabled = true;
            btnSyncAll.textContent = 'SYNCING...';
            window.OPS.send({
                action: 'github_sync_all',
                message: getCommitMessage(),
                token: window.OPS.authToken,
            });
            log('Syncing all changes...');
        });
    });

    btnBackupMB.addEventListener('click', function() {
        btnBackupMB.disabled = true;
        btnBackupMB.textContent = 'BACKING UP...';
        window.OPS.send({
            action: 'github_backup',
            backup_type: 'musicbrainz',
            message: getCommitMessage(),
            token: window.OPS.authToken,
        });
        log('Starting MusicBrainz backup...');
    });

    btnBackupTMDB.addEventListener('click', function() {
        btnBackupTMDB.disabled = true;
        btnBackupTMDB.textContent = 'BACKING UP...';
        window.OPS.send({
            action: 'github_backup',
            backup_type: 'tmdb',
            message: getCommitMessage(),
            token: window.OPS.authToken,
        });
        log('Starting TMDB backup...');
    });

    // ── Init ──────────────────────────────────────────────────────────────

    statusDot.className = 'gh-status-dot';
    statusText.textContent = 'CHECKING...';

    // Check for saved token on server (wait for WS connection)
    var origOnConnect = window.OPS.onConnect;
    window.OPS.onConnect = function() {
        if (origOnConnect) origOnConnect();
        window.OPS.send({
            action: 'github_config_load',
            token: window.OPS.authToken,
        });
    };

})();
