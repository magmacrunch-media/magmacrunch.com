/**
 * app.js — Main entry point, wires everything together
 */
(function() {
    'use strict';

    // ── Config ──────────────────────────────────────────────────────────────

    const PER_PAGE = 24;

    // ── DOM refs ──────────────────────────────────────────────────────────

    const searchInput = document.getElementById('searchInput');
    const btnSearch = document.getElementById('btnSearch');
    const btnClear = document.getElementById('btnClear');
    const sourceToggles = document.getElementById('sourceToggles');
    const btnLoadMore = document.getElementById('btnLoadMore');

    // ── State ─────────────────────────────────────────────────────────────

    let currentQuery = '';
    let currentPage = 1;
    let isLoading = false;

    // ── Custom dropdowns ──────────────────────────────────────────────────
    // Implementation is shared with album-art-maker and pixel-process:
    // ware/shell/dropdown.js. This app defaults a missing selection to
    // 'all', which its filter payload depends on.
    const setupRetroDropdown = (id, onSelect) => RetroDropdown.setup(id, onSelect);
    const getDropdownValue = (id) => RetroDropdown.getValue(id, 'all');

    // Toast is shell chrome (ware/shell/toast.js), shared with album//art.
    // Aliased up here, not beside its old call sites, because those sit above
    // it in the file and a `const` would still be in its dead zone there.
    const showToast = Toast.show;

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

    /* ── API key loading ──────────────────────────────────────────────────
       api-keys.json IS PUBLIC. It is committed to the repo and served by
       GitHub Pages, so anything in it is readable by anyone who opens
       devtools or browses the repo — this is not a leak to be patched, it is
       what a static site with a client-side fetch necessarily means.

       That is a deliberate choice, not an oversight. Pexels and Pixabay keys
       are free and per-account, and neither provider supports restricting a
       key by referrer, so the alternatives were to make visitors paste their
       own key or to drop both sources. Keeping them public keeps the tool
       working for everyone who lands on it, at the cost of a rate limit
       anyone can burn.

       So: never put a key here that can do anything but read a free public
       search API. No key that can write, spend, or reach another service.
       If the quota starts getting drained, rotate — do not go looking for a
       way to hide the file, because there isn't one. */

    let _apiKeys = null;
    let _apiKeysLoaded = false;

    async function loadApiKeys() {
        if (_apiKeysLoaded) return _apiKeys || {};
        try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 4000);
            const res = await fetch('api-keys.json', { signal: ctrl.signal });
            clearTimeout(timer);
            if (!res.ok) return {};
            _apiKeys = await res.json();
            _apiKeysLoaded = true;
            return _apiKeys;
        } catch {
            _apiKeysLoaded = true;
            return {};
        }
    }

    // ── Search ────────────────────────────────────────────────────────────

    function getFilters() {
        return {
            type: getDropdownValue('filterTypeDropdown'),
            license: getDropdownValue('filterLicenseDropdown'),
            orientation: getDropdownValue('filterOrientationDropdown')
        };
    }

    async function doSearch(query, page, append) {
        if (isLoading) return;
        if (!query.trim()) return;

        currentQuery = query.trim();
        currentPage = page || 1;
        isLoading = true;

        const filters = getFilters();
        const sources = getEnabledSources();
        Search.setEnabledProviders(sources);

        const keys = await loadApiKeys();
        Search.setApiKeys(keys);

        // Warn if enabled providers are missing keys
        if (!keys.pexels && sources.includes('pexels')) showToast('PEXELS: NO API KEY');
        if (!keys.pixabay && sources.includes('pixabay')) showToast('PIXABAY: NO API KEY');

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

    function onFilterChange() {
        if (currentQuery) doSearch(currentQuery, 1);
    }

    setupRetroDropdown('filterTypeDropdown', onFilterChange);
    setupRetroDropdown('filterLicenseDropdown', onFilterChange);
    setupRetroDropdown('filterOrientationDropdown', onFilterChange);

    sourceToggles.addEventListener('change', () => {
        if (currentQuery) doSearch(currentQuery, 1);
    });

    // ── Card click → lightbox ─────────────────────────────────────────────

    UI.setOnCardClick((index) => {
        const results = UI.getResults();
        Lightbox.open(index, results);
    });

    // ── Init ──────────────────────────────────────────────────────────────

    renderSourceToggles();

})();
