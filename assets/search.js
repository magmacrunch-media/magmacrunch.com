/* ═══════════════════════════════════════════════
   magmacrunch media — site search
   assets/search.js
   ═══════════════════════════════════════════════ */

(function () {
    'use strict';

    /* ── CONFIG ── */
    const MAX_RESULTS = 12;
    const INDEX_VERSION = 5;

    /* Compute root path for search-index.json */
    function getRoot() {
        const depth = window.location.pathname.split('/').length - 2;
        return depth > 0 ? '../'.repeat(depth) : '';
    }
    const INDEX_URL = getRoot() + 'search-index.json?v=' + INDEX_VERSION;

    /* ── CATEGORY LABELS ── */
    const CAT_LABELS = {
        music: 'MUSIC', song: 'SONG', artist: 'ARTIST', place: 'PLACE',
        label: 'LABEL', contributor: 'CONTRIBUTOR', arcade: 'ARCADE',
        press: 'PRESS', tool: 'TOOL', page: 'PAGE'
    };

    /* Field weights for scoring */
    const FIELD_WEIGHTS = { t: 3, a: 2.5, d: 1.5, b: 1, c: 0.5 };

    /* ── SVG ICONS ── */
    const SEARCH_SVG = `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="8" height="8" rx="0" stroke="currentColor" stroke-width="2"/>
        <rect x="9" y="9" width="2" height="2" fill="currentColor"/>
        <rect x="11" y="11" width="2" height="2" fill="currentColor"/>
        <rect x="13" y="13" width="1" height="1" fill="currentColor"/>
    </svg>`;

    /* ── STATE ── */
    let index = [];
    let overlay = null;
    let input = null;
    let resultsEl = null;
    let activeIdx = -1;
    let currentResults = [];

    /* ── LOAD SEARCH INDEX ── */
    function loadIndex() {
        return fetch(INDEX_URL)
            .then(r => r.json())
            .then(data => { index = data; })
            .catch(() => { index = []; });
    }

    /* ── TOKEN SEARCH ── */
    function search(query) {
        const words = query.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
        if (!words.length || !index.length) return [];

        const results = [];

        for (const item of index) {
            /* Check if ALL words appear in at least one field */
            let totalScore = 0;
            let allFieldsMatch = true;
            const matches = [];

            for (const [key, weight] of Object.entries(FIELD_WEIGHTS)) {
                const text = (item[key] || '').toLowerCase();
                if (!text) continue;

                const fieldMatches = [];
                let fieldAllMatch = true;

                for (const word of words) {
                    const idx = text.indexOf(word);
                    if (idx === -1) {
                        fieldAllMatch = false;
                        break;
                    }
                    fieldMatches.push([idx, idx + word.length - 1]);
                }

                if (fieldAllMatch) {
                    totalScore += weight;
                    matches.push({ key, indices: fieldMatches, value: item[key] });
                }
            }

            /* All words must appear in at least one field */
            if (totalScore > 0) {
                results.push({ item, score: totalScore, matches });
            }
        }

        /* Sort by score descending */
        results.sort((a, b) => b.score - a.score);
        return results.slice(0, MAX_RESULTS);
    }

    /* ── BUILD MODAL DOM ── */
    function createModal() {
        if (overlay) return;

        overlay = document.createElement('div');
        overlay.className = 'search-overlay';
        overlay.innerHTML = `
            <div class="search-modal">
                <div class="search-input-wrap">
                    <span class="search-icon-svg">${SEARCH_SVG}</span>
                    <input type="text" class="search-input" id="searchInput"
                           placeholder="search magmacrunch..." autocomplete="off" spellcheck="false">
                    <button class="search-close-btn" id="searchClose">ESC</button>
                </div>
                <div class="search-results" id="searchResults"></div>
                <div class="search-footer">
                    <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
                    <span><kbd>↵</kbd> select</span>
                    <span><kbd>esc</kbd> close</span>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        input = overlay.querySelector('#searchInput');
        resultsEl = overlay.querySelector('#searchResults');
        const closeBtn = overlay.querySelector('#searchClose');

        /* ── Event listeners ── */
        input.addEventListener('input', onInput);
        input.addEventListener('keydown', onKeyDown);
        closeBtn.addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
    }

    /* ── OPEN / CLOSE ── */
    function open() {
        createModal();
        activeIdx = -1;
        currentResults = [];
        input.value = '';
        resultsEl.innerHTML = '';
        overlay.classList.add('open');
        setTimeout(() => input.focus(), 50);
    }

    function close() {
        if (overlay) overlay.classList.remove('open');
    }

    function isOpen() {
        return overlay && overlay.classList.contains('open');
    }

    /* ── SEARCH ── */
    function onInput() {
        const q = input.value.trim();
        if (!q) {
            resultsEl.innerHTML = '';
            currentResults = [];
            activeIdx = -1;
            return;
        }

        const results = search(q);
        currentResults = results;
        activeIdx = results.length > 0 ? 0 : -1;
        renderResults(results, q);
    }

    /* ── BODY TEXT SNIPPET ── */
    function getBodySnippet(item, matches) {
        if (!item.b || !matches) return '';
        const bodyMatch = matches.find(m => m.key === 'b');
        if (!bodyMatch || !bodyMatch.indices.length) return '';
        const [start] = bodyMatch.indices[0];
        const snippetStart = Math.max(0, start - 40);
        const snippetEnd = Math.min(item.b.length, start + 60);
        let snippet = item.b.slice(snippetStart, snippetEnd);
        if (snippetStart > 0) snippet = '...' + snippet;
        if (snippetEnd < item.b.length) snippet = snippet + '...';
        return snippet;
    }

    /* ── RENDER ── */
    function renderResults(results, query) {
        if (results.length === 0) {
            resultsEl.innerHTML = `<div class="search-empty">no results for "${escHtml(query)}"</div>`;
            return;
        }

        /* Group by category */
        const groups = {};
        for (const r of results) {
            const cat = r.item.c;
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(r);
        }

        let html = '';
        let globalIdx = 0;
        const catOrder = ['music', 'song', 'artist', 'place', 'label', 'contributor', 'arcade', 'press', 'tool', 'page'];

        for (const cat of catOrder) {
            const items = groups[cat];
            if (!items) continue;

            html += `<div class="search-category" data-cat="${cat}">
                <div class="search-category-label">${CAT_LABELS[cat] || cat.toUpperCase()}</div>`;

            for (const r of items) {
                const title = highlightMatches(r.item.t, r.matches, 't');
                const desc = r.item.d ? escHtml(r.item.d) : '';
                const snippet = getBodySnippet(r.item, r.matches);
                const snippetHtml = snippet
                    ? `<div class="search-result-snippet">${escHtml(snippet)}</div>`
                    : '';
                const isActive = globalIdx === activeIdx ? ' active' : '';
                html += `<a class="search-result-item${isActive}" data-idx="${globalIdx}"
                            href="${r.item.u}">
                    <div class="search-result-title">${title}</div>
                    <div class="search-result-desc">${desc}</div>
                    ${snippetHtml}
                </a>`;
                globalIdx++;
            }
            html += `</div>`;
        }

        resultsEl.innerHTML = html;

        /* Attach click handlers */
        resultsEl.querySelectorAll('.search-result-item').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const href = el.getAttribute('href');
                navigateTo(href);
            });
        });
    }

    /* ── HIGHLIGHT MATCHES ── */
    function highlightMatches(text, matches, key) {
        if (!matches) return escHtml(text);

        const match = matches.find(m => m.key === key);
        if (!match) return escHtml(text);

        let result = text;
        const indices = match.indices.slice().sort((a, b) => b[0] - a[0]);

        for (const [start, end] of indices) {
            const before = result.slice(0, start);
            const matched = result.slice(start, end + 1);
            const after = result.slice(end + 1);
            result = before + '<span class="search-highlight">' + escHtml(matched) + '</span>' + after;
        }

        return result;
    }

    /* ── KEYBOARD NAVIGATION ── */
    function onKeyDown(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            close();
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (currentResults.length > 0) {
                activeIdx = (activeIdx + 1) % currentResults.length;
                updateActive();
            }
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentResults.length > 0) {
                activeIdx = (activeIdx - 1 + currentResults.length) % currentResults.length;
                updateActive();
            }
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIdx >= 0 && activeIdx < currentResults.length) {
                navigateTo(currentResults[activeIdx].item.u);
            }
            return;
        }
    }

    function updateActive() {
        const items = resultsEl.querySelectorAll('.search-result-item');
        items.forEach((el, i) => {
            el.classList.toggle('active', i === activeIdx);
        });
        /* Scroll active into view */
        const active = resultsEl.querySelector('.search-result-item.active');
        if (active) active.scrollIntoView({ block: 'nearest' });
    }

    /* ── NAVIGATE ── */
    function navigateTo(href) {
        close();
        window.location.href = href;
    }

    /* ── HELPERS ── */
    function escHtml(s) {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    /* ── GLOBAL KEYBOARD SHORTCUTS ── */
    document.addEventListener('keydown', (e) => {
        /* Don't trigger if typing in an input/textarea */
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        /* / or Ctrl+K or Cmd+K */
        if (e.key === '/' || (e.key === 'k' && (e.ctrlKey || e.metaKey))) {
            e.preventDefault();
            if (isOpen()) {
                close();
            } else {
                open();
            }
        }
    });

    /* ── NAV ICON INJECTION ── */
    function injectSearchIcon() {
        const nav = document.querySelector('nav');
        if (!nav) return;

        /* Check if icon already exists */
        if (nav.querySelector('.nav-search-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'nav-search-btn';
        btn.innerHTML = SEARCH_SVG;
        btn.title = 'Search (/)';
        btn.setAttribute('aria-label', 'search');
        btn.addEventListener('click', () => {
            if (isOpen()) close(); else open();
        });

        /* Insert before hamburger if present, otherwise append */
        const hamburger = nav.querySelector('.hamburger');
        if (hamburger) {
            nav.insertBefore(btn, hamburger);
        } else {
            nav.appendChild(btn);
        }
    }

    /* ── INIT ── */
    function init() {
        injectSearchIcon();
        loadIndex();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
