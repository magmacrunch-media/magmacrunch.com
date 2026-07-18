/**
 * ui.js — Results grid rendering, pagination, loading states
 */
(function() {
    'use strict';

    const resultsGrid = document.getElementById('resultsGrid');
    const emptyState = document.getElementById('emptyState');
    const loadingBar = document.getElementById('loadingBar');
    const btnLoadMore = document.getElementById('btnLoadMore');
    const resultCount = document.getElementById('resultCount');

    let currentResults = [];
    let onCardClick = null;

    function setOnCardClick(fn) {
        onCardClick = fn;
    }

    function showLoading() {
        loadingBar.classList.remove('hidden');
    }

    function hideLoading() {
        loadingBar.classList.add('hidden');
    }

    function renderResults(results, append) {
        if (!append) {
            resultsGrid.innerHTML = '';
            currentResults = [];
        }

        if (results.length === 0 && !append) {
            resultsGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">&#9734;</div>
                    <div class="empty-text">NO RESULTS FOUND</div>
                    <div class="empty-sub">Try different keywords or adjust filters</div>
                </div>
            `;
            resultCount.textContent = '0 RESULTS';
            btnLoadMore.classList.add('hidden');
            return;
        }

        // Remove empty state if present
        const existingEmpty = resultsGrid.querySelector('.empty-state');
        if (existingEmpty) existingEmpty.remove();

        results.forEach((item, i) => {
            const card = document.createElement('div');
            const globalIdx = currentResults.length + i;
            card.className = `result-card src-${item.source}`;

            const isVideo = item.type === 'video';

            card.innerHTML = `
                <img class="result-thumb${isVideo ? ' is-video' : ''}"
                     src="${escapeAttr(item.thumbnail)}"
                     alt="${escapeAttr(item.title)}"
                     loading="lazy"
                     onerror="this.style.display='none'">
                ${isVideo ? '<div class="result-play">&#9654;</div>' : ''}
                <div class="result-card-footer">
                    <span class="result-title">${escapeHtml(item.title)}</span>
                    <span class="result-badge">${item.source.replace('_', ' ')}</span>
                </div>
            `;

            card.addEventListener('click', () => {
                if (onCardClick) onCardClick(globalIdx);
            });

            resultsGrid.appendChild(card);
        });

        currentResults.push(...results);
        resultCount.textContent = `${currentResults.length} RESULTS`;
    }

    function showLoadMore(show) {
        btnLoadMore.classList.toggle('hidden', !show);
    }

    function getResults() {
        return currentResults;
    }

    function clearResults() {
        resultsGrid.innerHTML = '';
        currentResults = [];
        resultCount.textContent = '0 RESULTS';
        btnLoadMore.classList.add('hidden');
    }

    function escapeHtml(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    function escapeAttr(text) {
        return (text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    window.UI = {
        renderResults,
        showLoading,
        hideLoading,
        showLoadMore,
        getResults,
        clearResults,
        setOnCardClick
    };
})();
