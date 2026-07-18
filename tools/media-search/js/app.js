/**
 * app.js — Main entry point, wires everything together
 */
(function() {
    'use strict';

    // ── DOM refs ──────────────────────────────────────────────────────────

    const searchInput = document.getElementById('searchInput');
    const btnSearch = document.getElementById('btnSearch');
    const sourceToggles = document.getElementById('sourceToggles');
    const filterType = document.getElementById('filterType');
    const filterLicense = document.getElementById('filterLicense');
    const filterOrientation = document.getElementById('filterOrientation');
    const btnLoadMore = document.getElementById('btnLoadMore');
    const btnSettings = document.getElementById('btnSettings');
    const settingsModal = document.getElementById('settingsModal');
    const settingPiHost = document.getElementById('settingPiHost');
    const settingPerPage = document.getElementById('settingPerPage');
    const settingsSave = document.getElementById('settingsSave');
    const settingsCancel = document.getElementById('settingsCancel');

    // ── State ─────────────────────────────────────────────────────────────

    let currentQuery = '';
    let currentPage = 1;
    let perPage = 24;
    let isLoading = false;
    let piHost = localStorage.getItem('media-search-pi-host') || 'http://192.168.1.16:8780';

    // ── Settings ──────────────────────────────────────────────────────────

    function loadSettings() {
        settingPiHost.value = piHost;
        perPage = parseInt(localStorage.getItem('media-search-per-page')) || 24;
        settingPerPage.value = perPage;
    }

    function saveSettings() {
        piHost = settingPiHost.value.trim();
        perPage = parseInt(settingPerPage.value) || 24;
        localStorage.setItem('media-search-pi-host', piHost);
        localStorage.setItem('media-search-per-page', perPage);
        settingsModal.classList.add('hidden');
        showToast('SETTINGS SAVED');
    }

    btnSettings.addEventListener('click', () => {
        loadSettings();
        settingsModal.classList.remove('hidden');
    });

    settingsSave.addEventListener('click', saveSettings);
    settingsCancel.addEventListener('click', () => settingsModal.classList.add('hidden'));

    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) settingsModal.classList.add('hidden');
    });

    // ── Source toggles ────────────────────────────────────────────────────

    const PROVIDERS = [
        { id: 'openverse',    label: 'OPENVERSE',    color: '#c45fff', needsKey: false },
        { id: 'pexels',       label: 'PEXELS',       color: '#39ff6e', needsKey: true },
        { id: 'pixabay',      label: 'PIXABAY',      color: '#00f5ff', needsKey: true },
        { id: 'met_museum',   label: 'MET MUSEUM',   color: '#ffe03a', needsKey: false },
        { id: 'smithsonian',  label: 'SMITHSONIAN',   color: '#ff7c1f', needsKey: false },
        { id: 'archive',      label: 'ARCHIVE.ORG',   color: '#ff3d6e', needsKey: false }
    ];

    function renderSourceToggles() {
        sourceToggles.innerHTML = '';
        PROVIDERS.forEach(p => {
            const label = document.createElement('label');
            label.className = 'source-toggle';
            label.style.setProperty('--src-color', p.color);
            label.innerHTML = `
                <input type="checkbox" data-source="${p.id}" checked>
                <span class="source-dot" style="background:${p.color}"></span>
                <span>${p.label}</span>
            `;
            sourceToggles.appendChild(label);
        });
    }

    function getEnabledSources() {
        const checked = sourceToggles.querySelectorAll('input[type="checkbox"]:checked');
        return Array.from(checked).map(cb => cb.dataset.source);
    }

    // ── API key loading ───────────────────────────────────────────────────

    async function loadApiKeys() {
        if (!piHost) return {};
        try {
            const res = await fetch(`${piHost}/api-keys.json`);
            if (!res.ok) return {};
            return await res.json();
        } catch {
            return {};
        }
    }

    // ── Search ────────────────────────────────────────────────────────────

    async function doSearch(query, page, append) {
        if (isLoading) return;
        if (!query.trim()) return;

        currentQuery = query.trim();
        currentPage = page || 1;
        isLoading = true;

        const filters = {
            type: filterType.value,
            license: filterLicense.value,
            orientation: filterOrientation.value
        };

        const sources = getEnabledSources();
        Search.setEnabledProviders(sources);

        // Load API keys
        const keys = await loadApiKeys();
        Search.setApiKeys(keys);

        // Check cache
        const cached = Cache.get(currentQuery, sources, filters);
        if (cached && !append) {
            UI.renderResults(cached, false);
            UI.showLoadMore(true);
            isLoading = false;
            return;
        }

        if (!append) UI.clearResults();
        UI.showLoading();

        try {
            const result = await Search.search(currentQuery, currentPage, perPage, filters);
            UI.renderResults(result.results, append);
            UI.showLoadMore(result.hasMore);

            // Cache first page
            if (!append) {
                Cache.set(currentQuery, sources, filters, result.results);
            }
        } catch (err) {
            console.error('[App] Search failed:', err);
            showToast('SEARCH FAILED');
        } finally {
            UI.hideLoading();
            isLoading = false;
        }
    }

    // ── Event listeners ───────────────────────────────────────────────────

    btnSearch.addEventListener('click', () => doSearch(searchInput.value, 1));

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doSearch(searchInput.value, 1);
    });

    btnLoadMore.addEventListener('click', () => {
        doSearch(currentQuery, currentPage + 1, true);
    });

    // Filter changes re-search
    [filterType, filterLicense, filterOrientation].forEach(el => {
        el.addEventListener('change', () => {
            if (currentQuery) doSearch(currentQuery, 1);
        });
    });

    sourceToggles.addEventListener('change', () => {
        if (currentQuery) doSearch(currentQuery, 1);
    });

    // ── Card click → lightbox ─────────────────────────────────────────────

    UI.setOnCardClick((index) => {
        const results = UI.getResults();
        Lightbox.open(index, results);
    });

    // ── Toast ─────────────────────────────────────────────────────────────

    function showToast(msg) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    }

    // ── Init ──────────────────────────────────────────────────────────────

    renderSourceToggles();
    loadSettings();

})();
