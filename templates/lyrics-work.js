/* ═══════════════════════════════════════════════
   magmacrunch media — lyrics work template
   templates/lyrics-work.js

   Fetches MusicBrainz work data and renders metadata
   alongside static lyrics on press/lyrics pages.

   Requires window.__LYRICS_CONFIG (defined in stub) = {
     workId:      string   — MusicBrainz work ID
     artistName:  string   — display name for artist
     artistId:    string   — MusicBrainz artist ID (for archive link)
     accent:      string   — accent color (default 'red')
   }
   ═══════════════════════════════════════════════ */

(function () {
    'use strict';

    const C = window.__LYRICS_CONFIG;
    if (!C) { console.error('lyrics-work.js: window.__LYRICS_CONFIG is not defined'); return; }

    const workId = C.workId;
    const d = '../../../';

    const ENTITY_MAP = window.__ENTITY_MAP || {};
    function archiveLink(id, name, type) {
        if (!id || !name) return esc(name || '');
        const path = ENTITY_MAP[id];
        if (path) {
            // Entity map paths are relative to archive/ — adjust for lyrics section
            const fixed = path.replace(/^\.\.\/\.\.\//, '../../../archive/');
            return '<a href="' + fixed + '">' + esc(name) + '</a>';
        }
        return '<a href="https://musicbrainz.org/' + (type || 'artist') + '/' + esc(id) + '" target="_blank" rel="noopener">' + esc(name) + '</a>';
    }

    function esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function fmtLength(ms) {
        if (!ms) return '';
        const totalSec = Math.floor(ms / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        return min + ':' + String(sec).padStart(2, '0');
    }

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const LANGUAGES = { eng:'English', spa:'Spanish', fra:'French', deu:'German', ita:'Italian', jpn:'Japanese', por:'Portuguese', zho:'Chinese', kor:'Korean', und:'Unknown' };

    function fmtDate(d) {
        if (!d) return '';
        const parts = d.split('-');
        if (parts.length === 3) return `${MONTHS[parseInt(parts[1],10)-1]} ${parseInt(parts[2],10)}, ${parts[0]}`;
        if (parts.length === 2) return `${MONTHS[parseInt(parts[1],10)-1]} ${parts[0]}`;
        return d;
    }

    const formatDate = (begin, end, ended) => {
        if (!begin && !end) return '';
        const b = fmtDate(begin), e = fmtDate(end);
        if (begin && end && begin === end) return ` (${b})`;
        if (begin && !end) return ` (${b}${ended ? '' : '–present'})`;
        if (begin && end) return ` (${b}–${e})`;
        return '';
    };

    const delay = ms => new Promise(r => setTimeout(r, ms));

    async function fetchWithRetry(url, retries = 4) {
        for (let i = 0; i < retries; i++) {
            let res;
            try { res = await fetch(url); } catch (err) {
                if (i === retries - 1) throw err;
                await delay(1000 * Math.pow(2, i));
                continue;
            }
            if (res.status === 429 || res.status === 503) {
                await delay(1000 * Math.pow(2, i));
                continue;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        }
        throw new Error(`fetchWithRetry failed: ${url}`);
    }

    // styles are defined in each page's <style> block — no JS injection

    // ── cache + fetch ──
    let _cache = null;
    async function loadCache() {
        if (window.__MB_CACHE) { _cache = window.__MB_CACHE; return; }
        try {
            const r = await fetch(d + 'archive/_cache/works/' + workId + '.json');
            if (r.ok) { const j = await r.json(); if (j.fetchedAt) _cache = j; }
        } catch {}
    }

    async function cached(path, cacheData) {
        if (cacheData !== undefined) return cacheData;
        return fetchWithRetry('https://musicbrainz.org/ws/2/' + path);
    }

    // ── render (disabled) ──
    // async function run() { ... }
})();
