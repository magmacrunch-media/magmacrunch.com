/**
 * app.js — Main entry point, wires everything together
 */
(function() {
    'use strict';

    // ── Config ──────────────────────────────────────────────────────────────

    const PI_HOST = 'http://192.168.1.16:8780'; // MAGMA//OPS host for API keys
    const PER_PAGE = 24;

    // ── DOM refs ──────────────────────────────────────────────────────────

    const searchInput = document.getElementById('searchInput');
    const btnSearch = document.getElementById('btnSearch');
    const btnClear = document.getElementById('btnClear');
    const sourceToggles = document.getElementById('sourceToggles');
    const filterType = document.getElementById('filterType');
    const filterLicense = document.getElementById('filterLicense');
    const filterOrientation = document.getElementById('filterOrientation');
    const btnLoadMore = document.getElementById('btnLoadMore');

    // ── State ─────────────────────────────────────────────────────────────

    let currentQuery = '';
    let currentPage = 1;
    let isLoading = false;

    // ── Source toggles ────────────────────────────────────────────────────

    const PROVIDERS = [
        { id: 'openverse',    label: 'OPENVERSE',    color: '#a78bfa', needsKey: false },
        { id: 'pexels',       label: 'PEXELS',       color: '#2ee8a5', needsKey: true },
        { id: 'pixabay',      label: 'PIXABAY',      color: '#4dc9f6', needsKey: true },
        { id: 'met_museum',   label: 'MET MUSEUM',   color: '#f5c542', needsKey: false },
        { id: 'smithsonian',  label: 'SMITHSONIAN',   color: '#f4845f', needsKey: false },
        { id: 'archive',      label: 'ARCHIVE.ORG',   color: '#e8637a', needsKey: false }
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
        if (!PI_HOST) return {};
        try {
            const res = await fetch(`${PI_HOST}/api-keys.json`);
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

        const keys = await loadApiKeys();
        Search.setApiKeys(keys);

        // Check cache
        const cached = Cache.get(currentQuery, sources, filters);
        if (cached && !append) {
            UI.renderResults(cached, false);
            UI.showLoadMore(false);
            isLoading = false;
            return;
        }

        if (!append) UI.clearResults();
        UI.showLoading();

        try {
            const result = await Search.search(currentQuery, currentPage, PER_PAGE, filters);
            UI.renderResults(result.results, append);
            UI.showLoadMore(result.hasMore);

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

    btnClear.addEventListener('click', () => {
        searchInput.value = '';
        currentQuery = '';
        currentPage = 1;
        isLoading = false;
        UI.hideLoading();
        UI.resetToEmpty();
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doSearch(searchInput.value, 1);
        if (e.key === 'Escape') {
            searchInput.value = '';
            searchInput.blur();
        }
    });

    btnLoadMore.addEventListener('click', () => {
        doSearch(currentQuery, currentPage + 1, true);
    });

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

    let toastCount = 0;

    function showToast(msg) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        toast.style.bottom = (20 + toastCount * 40) + 'px';
        document.body.appendChild(toast);
        toastCount++;
        setTimeout(() => {
            toast.remove();
            toastCount = Math.max(0, toastCount - 1);
        }, 2500);
    }

    // ── Init ──────────────────────────────────────────────────────────────

    renderSourceToggles();

})();
