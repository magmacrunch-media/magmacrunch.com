/**
 * api.js — MAGMA//OPS Security tab
 * API key management + admin password change + key status/testing
 */

(function() {
    'use strict';

    const $ = (sel) => document.querySelector(sel);

    const PROVIDER_META = {
        pexels:     { label: 'Pexels',           needsKey: true,  url: 'https://www.pexels.com/api/',
                      testUrl: 'https://api.pexels.com/v1/search?per_page=1', testHeaders: (k) => ({ 'Authorization': k }) },
        pixabay:    { label: 'Pixabay',          needsKey: true,  url: 'https://pixabay.com/api/docs/',
                      testUrl: (k) => `https://pixabay.com/api/?key=${k}&q=test&per_page=1` },
        openverse:  { label: 'Openverse',        needsKey: false, url: 'https://openverse.org' },
        met_museum: { label: 'Met Museum',       needsKey: false, url: 'https://metmuseum.github.io/' },
        smithsonian:{ label: 'Smithsonian',      needsKey: false, url: 'https://api.data.gov/docs/' },
        archive:    { label: 'Internet Archive',  needsKey: false, url: 'https://archive.org/apis/' },
        tmdb:       { label: 'TMDB',             needsKey: true,  url: 'https://www.themoviedb.org/settings/api',
                      testUrl: (k) => `https://api.themoviedb.org/3/movie/550?api_key=${k}` },
        musicbrainz:{ label: 'MusicBrainz',      needsKey: false, url: 'https://musicbrainz.org/doc/Development' },
        lastfm:     { label: 'Last.fm',           needsKey: true,  url: 'https://www.last.fm/api/account/create',
                      testUrl: (k) => `https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=test&api_key=${k}&format=json` }
    };

    const apiKeysGrid = $('#api-keys-grid');
    const btnLoadKeys = $('#btn-load-keys');
    const btnSaveKeys = $('#btn-save-keys');
    const btnChangePw = $('#btn-change-pw');
    const secCurrentPw = $('#sec-current-pw');
    const secNewPw = $('#sec-new-pw');
    const secConfirmPw = $('#sec-confirm-pw');

    const btnChangePrivatePw = $('#btn-change-private-pw');
    const secPrivateCurrentPw = $('#sec-private-current-pw');
    const secPrivateNewPw = $('#sec-private-new-pw');
    const secPrivateConfirmPw = $('#sec-private-confirm-pw');
    const currentPrivatePwEl = $('#current-private-pw');

    let lastSaved = null;
    let keyAges = {};  // provider -> ISO date string of first save

    // ── Current private password ───────────────────────────────────────────

    function loadCurrentPrivatePassword() {
        window.OPS.send({ action: 'get_current_private_password', token: window.OPS.authToken });
    }

    function renderCurrentPrivatePassword(msg) {
        if (msg.ok && currentPrivatePwEl) {
            currentPrivatePwEl.textContent = msg.password;
            currentPrivatePwEl.className = 'current-private-pw';
        } else if (currentPrivatePwEl) {
            currentPrivatePwEl.textContent = 'error loading';
            currentPrivatePwEl.className = 'current-private-pw error';
        }
    }

    // ── API Keys ──────────────────────────────────────────────────────────

    function renderApiKeys(keys) {
        apiKeysGrid.innerHTML = '';
        Object.keys(PROVIDER_META).forEach(id => {
            const meta = PROVIDER_META[id];
            const val = keys[id] || '';
            const hasKey = val.length > 0;
            const card = document.createElement('div');
            card.className = 'api-key-card';

            const age = keyAges[id];
            let ageText = '';
            if (age && hasKey) {
                const days = Math.floor((Date.now() - new Date(age).getTime()) / 86400000);
                ageText = days === 0 ? 'Today' : days === 1 ? '1 day ago' : `${days} days ago`;
            }

            let actionsHtml = '';
            if (meta.needsKey) {
                actionsHtml = `
                    <div class="api-key-actions">
                        <button class="btn btn-cyan btn-xs" data-test="${id}">TEST</button>
                        <button class="btn btn-slate btn-xs" data-copy-key="${id}">COPY</button>
                    </div>`;
            } else {
                actionsHtml = `
                    <div class="api-key-actions">
                        <button class="btn btn-slate btn-xs" data-copy-key="${id}">COPY</button>
                    </div>`;
            }

            card.innerHTML = `
                <div class="api-key-card-header">
                    <div class="api-key-name-row">
                        <span class="api-key-status ${hasKey ? 'active' : 'empty'}"></span>
                        <span class="api-key-name">${meta.label}</span>
                    </div>
                    <span class="api-key-badge ${meta.needsKey ? 'required' : 'optional'}">${meta.needsKey ? 'KEY REQ' : 'NO KEY'}</span>
                </div>
                <div class="api-key-input-row">
                    <input type="password"
                           class="api-key-input"
                           data-provider="${id}"
                           value="${window.OPS.escapeHtml(val)}"
                           placeholder="${meta.needsKey ? 'Enter API key...' : 'Not required'}"
                           ${!meta.needsKey ? 'disabled' : ''}>
                    <button class="btn-toggle-vis" data-toggle="${id}" title="Show/hide">&#128065;</button>
                </div>
                ${ageText ? `<div class="api-key-age">First saved: ${ageText}</div>` : ''}
                ${actionsHtml}
                <a class="api-key-link" href="${meta.url}" target="_blank" rel="noopener">Get key &rarr;</a>
            `;
            apiKeysGrid.appendChild(card);
        });

        // Toggle show/hide
        apiKeysGrid.querySelectorAll('[data-toggle]').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = apiKeysGrid.querySelector(`[data-provider="${btn.dataset.toggle}"]`);
                if (input) input.type = input.type === 'password' ? 'text' : 'password';
            });
        });

        // Test buttons
        apiKeysGrid.querySelectorAll('[data-test]').forEach(btn => {
            btn.addEventListener('click', () => testKey(btn.dataset.test));
        });

        // Copy buttons
        apiKeysGrid.querySelectorAll('[data-copy-key]').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = apiKeysGrid.querySelector(`[data-provider="${btn.dataset.copyKey}"]`);
                if (input && input.value) {
                    navigator.clipboard.writeText(input.value).then(
                        () => window.OPS.toast('Key copied'),
                        () => window.OPS.toast('Copy failed', true)
                    );
                } else {
                    window.OPS.toast('No key to copy', true);
                }
            });
        });

        // Update status dots on input change
        apiKeysGrid.querySelectorAll('.api-key-input').forEach(input => {
            input.addEventListener('input', () => {
                const dot = input.closest('.api-key-card').querySelector('.api-key-status');
                if (dot) {
                    dot.classList.toggle('active', input.value.length > 0);
                    dot.classList.toggle('empty', input.value.length === 0);
                }
            });
        });
    }

    // ── Test key ──────────────────────────────────────────────────────────

    async function testKey(providerId) {
        const meta = PROVIDER_META[providerId];
        const input = apiKeysGrid.querySelector(`[data-provider="${providerId}"]`);
        const key = input ? input.value.trim() : '';
        const btn = apiKeysGrid.querySelector(`[data-test="${providerId}"]`);

        if (!key) {
            window.OPS.toast('Enter a key first', true);
            return;
        }

        if (btn) { btn.textContent = 'TESTING...'; btn.disabled = true; }

        try {
            let url, headers = {};
            if (typeof meta.testUrl === 'function') {
                url = meta.testUrl(key);
            } else {
                url = meta.testUrl;
                if (meta.testHeaders) headers = meta.testHeaders(key);
            }

            const res = await fetch(url, { headers });
            if (res.ok) {
                window.OPS.toast(`${meta.label}: Key valid (${res.status})`);
            } else {
                window.OPS.toast(`${meta.label}: Invalid key (${res.status})`, true);
            }
        } catch (err) {
            window.OPS.toast(`${meta.label}: Test failed - ${err.message}`, true);
        } finally {
            if (btn) { btn.textContent = 'TEST'; btn.disabled = false; }
        }
    }

    // ── Collect / load / save ─────────────────────────────────────────────

    function collectApiKeys() {
        const keys = {};
        apiKeysGrid.querySelectorAll('.api-key-input').forEach(input => {
            keys[input.dataset.provider] = input.value.trim();
        });
        return keys;
    }

    function loadApiKeys() {
        window.OPS.send({ action: 'api_keys_load', token: window.OPS.authToken });
    }

    function saveApiKeys() {
        const keys = collectApiKeys();
        window.OPS.send({ action: 'api_keys_save', keys, token: window.OPS.authToken });
        lastSaved = Date.now();
        updateSaveTimestamp();

        // Track first-save dates for new keys
        Object.keys(keys).forEach(id => {
            if (keys[id] && !keyAges[id]) {
                keyAges[id] = new Date().toISOString();
            }
        });
    }

    function updateSaveTimestamp() {
        const el = document.getElementById('api-save-status');
        if (el && lastSaved) {
            const secs = Math.floor((Date.now() - lastSaved) / 1000);
            if (secs < 5) el.textContent = 'Saved just now';
            else if (secs < 60) el.textContent = `Saved ${secs}s ago`;
            else el.textContent = `Saved ${Math.floor(secs / 60)}m ago`;
        }
    }

    // Update timestamp display every 30s
    setInterval(updateSaveTimestamp, 30000);

    // ── Password change ───────────────────────────────────────────────────

    function changePassword() {
        const current = secCurrentPw.value;
        const newPw = secNewPw.value;
        const confirm = secConfirmPw.value;

        if (!current) { window.OPS.toast('Enter current password', true); return; }
        if (!newPw) { window.OPS.toast('Enter new password', true); return; }
        if (newPw !== confirm) { window.OPS.toast('New passwords do not match', true); return; }
        if (newPw.length < 4) { window.OPS.toast('Password must be at least 4 characters', true); return; }

        window.OPS.send({ action: 'change_password', current, new_password: newPw, token: window.OPS.authToken });
    }

    // ── Private password change ──────────────────────────────────────────

    function changePrivatePassword() {
        const current = secPrivateCurrentPw.value;
        const newPw = secPrivateNewPw.value;
        const confirm = secPrivateConfirmPw.value;

        if (!current) { window.OPS.toast('Enter current password', true); return; }
        if (!newPw) { window.OPS.toast('Enter new password', true); return; }
        if (newPw !== confirm) { window.OPS.toast('New passwords do not match', true); return; }
        if (newPw.length < 4) { window.OPS.toast('Password must be at least 4 characters', true); return; }

        window.OPS.send({ action: 'change_private_password', current, new_password: newPw, token: window.OPS.authToken });
    }

    // ── Listen for responses ──────────────────────────────────────────────

    const origOnMessage = window.OPS.onMessage;
    window.OPS.onMessage = function(msg) {
        if (origOnMessage) origOnMessage(msg);

        switch (msg.type) {
            case 'api_keys':
                renderApiKeys(msg.keys || {});
                break;
            case 'api_keys_saved':
                window.OPS.toast('API keys saved');
                break;
            case 'password_changed':
                if (msg.ok) {
                    window.OPS.toast('Password changed');
                    secCurrentPw.value = '';
                    secNewPw.value = '';
                    secConfirmPw.value = '';
                } else {
                    window.OPS.toast(msg.error || 'Password change failed', true);
                }
                break;
            case 'private_password_changed':
                if (msg.ok) {
                    window.OPS.toast('Private arcade password changed');
                    secPrivateCurrentPw.value = '';
                    secPrivateNewPw.value = '';
                    secPrivateConfirmPw.value = '';
                    loadCurrentPrivatePassword();
                } else {
                    window.OPS.toast(msg.error || 'Password change failed', true);
                }
                break;
            case 'current_private_password':
                renderCurrentPrivatePassword(msg);
                break;
        }
    };

    // ── Event listeners ───────────────────────────────────────────────────

    btnLoadKeys.addEventListener('click', loadApiKeys);
    btnSaveKeys.addEventListener('click', saveApiKeys);
    btnChangePw.addEventListener('click', changePassword);
    btnChangePrivatePw.addEventListener('click', changePrivatePassword);

    // Load current private password on connect
    const origOnConnect = window.OPS.onConnect;
    window.OPS.onConnect = function() {
        if (origOnConnect) origOnConnect();
        loadCurrentPrivatePassword();
    };

})();
