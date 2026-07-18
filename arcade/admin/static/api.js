/**
 * api.js — MAGMA//OPS API Keys tab
 * Manages API keys for MEDIA//SEARCH tool
 */

(function() {
    'use strict';

    const $ = (sel) => document.querySelector(sel);

    const PROVIDER_META = {
        pexels:     { label: 'Pexels',           needsKey: true,  url: 'https://www.pexels.com/api/' },
        pixabay:    { label: 'Pixabay',          needsKey: true,  url: 'https://pixabay.com/api/docs/' },
        openverse:  { label: 'Openverse',        needsKey: false, url: 'https://openverse.org' },
        met_museum: { label: 'Met Museum',       needsKey: false, url: 'https://metmuseum.github.io/' },
        smithsonian:{ label: 'Smithsonian',      needsKey: false, url: 'https://api.data.gov/docs/' },
        archive:    { label: 'Internet Archive',  needsKey: false, url: 'https://archive.org/apis/' }
    };

    const apiKeysGrid = $('#api-keys-grid');
    const btnLoadKeys = $('#btn-load-keys');
    const btnSaveKeys = $('#btn-save-keys');

    function renderApiKeys(keys) {
        apiKeysGrid.innerHTML = '';
        Object.keys(PROVIDER_META).forEach(id => {
            const meta = PROVIDER_META[id];
            const val = keys[id] || '';
            const card = document.createElement('div');
            card.className = 'api-key-card';
            card.innerHTML = `
                <div class="api-key-card-header">
                    <span class="api-key-name">${meta.label}</span>
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
                <a class="api-key-link" href="${meta.url}" target="_blank" rel="noopener">Get key &rarr;</a>
            `;
            apiKeysGrid.appendChild(card);
        });

        apiKeysGrid.querySelectorAll('[data-toggle]').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = apiKeysGrid.querySelector(`[data-provider="${btn.dataset.toggle}"]`);
                if (input) input.type = input.type === 'password' ? 'text' : 'password';
            });
        });
    }

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
    }

    // ── Listen for API key responses ──────────────────────────────────────

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
        }
    };

    // ── Event listeners ───────────────────────────────────────────────────

    btnLoadKeys.addEventListener('click', loadApiKeys);
    btnSaveKeys.addEventListener('click', saveApiKeys);

})();
