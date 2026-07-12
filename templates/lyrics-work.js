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
    const accent = C.accent || 'red';

    const ENTITY_MAP = window.__ENTITY_MAP || {};
    function archiveLink(id, name, type) {
        if (!id || !name) return esc(name || '');
        const path = ENTITY_MAP[id];
        if (path) return '<a href="' + path + '">' + esc(name) + '</a>';
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

    // ── inject styles ──
    const style = document.createElement('style');
    style.textContent = `
        .mb-work-meta {
            width: min(700px, 90vw);
            border: 2px solid #c8c0a8;
            background: #e8dcc0;
            padding: 24px 28px;
            margin-top: 40px;
            animation: fadeUp 0.5s 0.2s ease both;
        }
        .mb-work-meta h2 {
            font-family: 'Press Start 2P', monospace;
            font-size: 8px;
            color: #c02828;
            letter-spacing: 0.1em;
            margin-bottom: 16px;
        }
        .mb-work-meta p {
            font-family: 'Courier Prime', monospace;
            font-size: 12px;
            color: #555;
            line-height: 1.7;
            margin-bottom: 6px;
        }
        .mb-work-meta p strong {
            font-family: 'Press Start 2P', monospace;
            font-size: 7px;
            color: #999;
            letter-spacing: 0.08em;
            margin-right: 6px;
        }
        .mb-work-meta a {
            color: #c02828;
            text-decoration: underline;
            text-decoration-color: rgba(192,40,40,0.3);
        }
        .mb-work-meta a:hover { color: #8a1a1a; }
        .mb-work-meta .rec-list {
            margin-top: 12px;
            padding-left: 16px;
        }
        .mb-work-meta .rec-item {
            font-family: 'Courier Prime', monospace;
            font-size: 12px;
            color: #555;
            margin-bottom: 4px;
        }
        .mb-work-meta .mb-tag {
            display: inline-block;
            background: #ddd4b8;
            border: 1px solid #c8c0a8;
            padding: 1px 6px;
            margin: 2px;
            font-family: 'Courier Prime', monospace;
            font-size: 10px;
            color: #777;
        }
        .mb-loading {
            font-family: 'Press Start 2P', monospace;
            font-size: 7px;
            color: #999;
            letter-spacing: 0.1em;
        }
    `;
    document.head.appendChild(style);

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

    // ── render ──
    async function run() {
        const container = document.getElementById('mb-work-meta');
        if (!container) return;

        await loadCache();

        try {
            const workData = await cached(
                `work/${workId}?inc=artist-rels+recording-rels+tags+aliases&fmt=json`,
                _cache?.data
            );

            let html = '<h2>// musicbrainz //</h2>';

            // work type
            if (workData.type) {
                html += `<p><strong>type</strong> ${esc(workData.type)}</p>`;
            }

            // language
            if (workData.language) {
                html += `<p><strong>language</strong> ${esc(workData.language)}</p>`;
            }

            // ISWC
            if (workData.iswc) {
                html += `<p><strong>iswc</strong> ${esc(workData.iswc)}</p>`;
            }

            // aliases
            const aliases = workData.aliases?.map(a => a.name).filter(n => n !== workData.title);
            if (aliases?.length) {
                html += `<p><strong>also known as</strong> ${aliases.map(esc).join(', ')}</p>`;
            }

            // credits
            const makeArtistRel = r =>
                archiveLink(r.artist?.id, r.artist?.name, 'artist')
                + (r.attributes?.length ? ` (${r.attributes.map(esc).join(', ')})` : '');

            const composers = workData.relations?.filter(r => r['target-type'] === 'artist' && r.type === 'composer').map(makeArtistRel);
            const lyricists = workData.relations?.filter(r => r['target-type'] === 'artist' && r.type === 'lyricist').map(makeArtistRel);
            const writers = workData.relations?.filter(r => r['target-type'] === 'artist' && r.type === 'writer').map(makeArtistRel);

            if (composers?.length) html += `<p><strong>composer</strong> ${composers.join(', ')}</p>`;
            if (lyricists?.length) html += `<p><strong>lyricist</strong> ${lyricists.join(', ')}</p>`;
            if (writers?.length) html += `<p><strong>writer</strong> ${writers.join(', ')}</p>`;

            // recordings
            const recRels = workData.relations?.filter(r => r['target-type'] === 'recording' && r.type === 'performance') || [];
            if (recRels.length > 0) {
                html += '<p><strong>recordings</strong></p><div class="rec-list">';
                for (const r of recRels) {
                    const rec = r.recording;
                    if (!rec) continue;
                    const labels = [];
                    if (rec.video) labels.push('<span class="mb-tag">video</span>');
                    html += `<div class="rec-item">` + archiveLink(rec.id, rec.title, 'recording') + (labels.length ? ' ' + labels.join('') : '') + `</div>`;
                }
                html += '</div>';
            }

            // tags
            const tags = workData.tags?.sort((a, b) => b.count - a.count).slice(0, 8);
            if (tags?.length) {
                html += '<p><strong>tags</strong></p><div>' + tags.map(t => `<span class="mb-tag">${esc(t.name)}</span>`).join('') + '</div>';
            }

            // link to MB
            html += `<p style="margin-top: 12px;"><a href="https://musicbrainz.org/work/${esc(workId)}" target="_blank" rel="noopener">view on musicbrainz →</a></p>`;

            container.innerHTML = html;
        } catch (err) {
            console.error('lyrics-work.js:', err);
            container.innerHTML = `<p class="mb-loading">could not load musicbrainz data</p>`;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();
