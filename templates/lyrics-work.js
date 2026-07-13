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

    // ── inject styles ──
    const isDark = C.dark;
    const accent = C.accent || 'red';
    const ACCENT_HEX = { red: '#c02828', purple: '#d946ef', cyan: '#00f5ff', green: '#39ff6e', yellow: '#ffe03a', orange: '#ff7c1f', rose: '#ff3d6e' };
    const accentHex = ACCENT_HEX[accent] || '#c02828';
    const accentRgba = accentHex.replace('#', '').match(/.{2}/g).map(h => parseInt(h, 16)).join(',');

    const cardBg = isDark ? '#1e2235' : '#e8dcc0';
    const cardBorder = isDark ? '#6020b0' : '#c8c0a8';
    const cardText = isDark ? '#c8b8e8' : '#555';
    const cardStrong = isDark ? '#f5d0ff' : '#999';
    const cardMeta = isDark ? '#9858d8' : '#777';

    const style = document.createElement('style');
    style.textContent = `
        .mb-work-meta {
            width: min(700px, 90vw);
            border: 2px solid ${cardBorder};
            background: ${cardBg};
            padding: 24px 28px;
            margin-top: 40px;
            animation: fadeUp 0.5s 0.2s ease both;
        }
        .mb-work-meta h2 {
            font-family: 'Press Start 2P', monospace;
            font-size: 8px;
            color: ${accentHex};
            letter-spacing: 0.1em;
            margin-bottom: 16px;
        }
        .mb-work-meta p {
            font-family: 'Courier Prime', monospace;
            font-size: 12px;
            color: ${cardText};
            line-height: 1.7;
            margin-bottom: 6px;
        }
        .mb-work-meta p strong {
            font-family: 'Press Start 2P', monospace;
            font-size: 7px;
            color: ${cardStrong};
            letter-spacing: 0.08em;
            margin-right: 6px;
        }
        .mb-work-meta a {
            color: ${accentHex};
            text-decoration: underline;
            text-decoration-color: rgba(${accentRgba},0.3);
        }
        .mb-work-meta a:hover { opacity: 0.8; }
        .mb-work-meta .rec-list {
            margin-top: 8px;
            padding-left: 16px;
        }
        .mb-work-meta .rec-item {
            font-family: 'Courier Prime', monospace;
            font-size: 12px;
            color: ${cardText};
            margin-bottom: 12px;
            line-height: 1.6;
            display: block;
        }
        .mb-work-meta .rec-date {
            font-family: 'Courier Prime', monospace;
            font-size: 11px;
            color: ${cardStrong};
            margin-left: 6px;
        }
        .mb-work-meta .rec-releases {
            display: block;
            font-family: 'Courier Prime', monospace;
            font-size: 11px;
            color: ${cardMeta};
            margin-top: 4px;
            padding-left: 12px;
        }
        .mb-work-meta .rec-line {
            font-family: 'Courier Prime', monospace;
            font-size: 11px;
            color: ${cardMeta};
            margin-top: 4px;
            padding-left: 12px;
        }
        .mb-work-meta .mb-tag {
            display: inline-block;
            background: ${isDark ? '#2e1a50' : '#ddd4b8'};
            border: 1px solid ${cardBorder};
            padding: 1px 6px;
            margin: 2px;
            font-family: 'Courier Prime', monospace;
            font-size: 10px;
            color: ${cardMeta};
        }
        .mb-loading {
            font-family: 'Press Start 2P', monospace;
            font-size: 7px;
            color: ${cardStrong};
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
                `work/${workId}?inc=artist-rels+recording-rels+place-rels+tags+aliases&fmt=json`,
                _cache?.data
            );

            let html = '<h2>// info //</h2>';

            // ISWC
            if (workData.iswc) {
                html += `<p><strong>iswc</strong> ${esc(workData.iswc)}</p>`;
            }

            // aliases
            const aliases = workData.aliases?.map(a => a.name).filter(n => n !== workData.title);
            if (aliases?.length) {
                html += `<p><strong>also known as</strong> ${aliases.map(esc).join(', ')}</p>`;
            }

            // credits with dates — combine roles for same artist
            const artistRels = workData.relations?.filter(r => r['target-type'] === 'artist' && ['composer','lyricist','writer'].includes(r.type)) || [];
            const artistMap = {};
            for (const r of artistRels) {
                const id = r.artist?.id;
                if (!id) continue;
                if (!artistMap[id]) artistMap[id] = { artist: r.artist, roles: [], begin: r.begin, end: r.end, ended: r.ended };
                artistMap[id].roles.push(r.type);
                if (r.begin && (!artistMap[id].begin || r.begin < artistMap[id].begin)) artistMap[id].begin = r.begin;
                if (r.end && (!artistMap[id].end || r.end > artistMap[id].end)) artistMap[id].end = r.end;
            }
            for (const { artist, roles, begin, end, ended } of Object.values(artistMap)) {
                const label = roles.length > 1 ? roles.join(', ') : roles[0];
                let dateStr = '';
                if (begin || end) {
                    if (begin && end && begin === end) dateStr = fmtDate(begin);
                    else if (begin && end) dateStr = `${fmtDate(begin)}–${fmtDate(end)}`;
                    else if (begin) dateStr = fmtDate(begin) + (ended ? '' : '–present');
                }
                const credit = archiveLink(artist?.id, artist?.name, 'artist')
                    + (dateStr ? ` <span class="rec-date">${dateStr}</span>` : '');
                html += `<p><strong>${esc(label)}</strong> ${credit}</p>`;
            }

            // publisher (from config, with archive link)
            if (C.publisherLabel) {
                const pubPath = ENTITY_MAP[C.publisherLabel.id];
                const fixed = pubPath ? pubPath.replace(/^\.\.\/\.\.\//, '../../../archive/') : null;
                const pubLink = fixed
                    ? `<a href="${fixed}">${esc(C.publisherLabel.name)}</a>`
                    : `<a href="https://musicbrainz.org/label/${esc(C.publisherLabel.id)}" target="_blank" rel="noopener">${esc(C.publisherLabel.name)}</a>`;
                html += `<p><strong>publisher</strong> ${pubLink}</p>`;
            }

            // recordings with dates and releases
            const recRels = workData.relations?.filter(r => r['target-type'] === 'recording' && r.type === 'performance') || [];
            const recDataCache = {};  // collect recording data for first-release calc
            if (recRels.length > 0) {
                html += '<p><strong>recordings</strong></p><div class="rec-list">';
                for (const r of recRels) {
                    const rec = r.recording;
                    if (!rec) continue;

                    // recording date from relationship
                    let dateStr = '';
                    if (r.begin || r.end) {
                        if (r.begin && r.end && r.begin === r.end) dateStr = fmtDate(r.begin);
                        else if (r.begin && r.end) dateStr = `${fmtDate(r.begin)}–${fmtDate(r.end)}`;
                        else if (r.begin) dateStr = fmtDate(r.begin);
                    }

                    // labels
                    const labels = (r.attributes || []).map(a => esc(a.toLowerCase()));

                    let item = archiveLink(rec.id, rec.title, 'recording');
                    if (dateStr) item += ` <span class="rec-date">${esc(dateStr)}</span>`;
                    if (labels.length) item += ' ' + labels.map(l => `<span class="mb-tag">${l}</span>`).join(' ');

                    // fetch recording details for releases (from cache or API)
                    const cachedRec = _cache?.recordings?.[rec.id];
                    let recData;
                    if (cachedRec !== undefined) {
                        recData = cachedRec;
                    } else {
                        recData = await cached(`recording/${rec.id}?inc=releases+place-rels+event-rels&fmt=json`);
                        await delay(1100);  // respect MB rate limit
                    }
                    recDataCache[rec.id] = recData;

                    if (recData?.releases?.length) {
                        const releases = recData.releases
                            .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
                            .map(rel => {
                                const date = rel.date ? ` — ${fmtDate(rel.date.substring(0, 10))}` : '';
                                return esc(rel.title) + date;
                            });
                        item += `<div class="rec-line">appears on: ${releases.join(', ')}</div>`;
                    }

                    // places (recorded at, mixed at, etc.)
                    const placeRels = recData?.relations?.filter(r => r['target-type'] === 'place') || [];
                    if (placeRels.length) {
                        const places = placeRels.map(r => {
                            const role = r.type ? esc(r.type) + ' at ' : '';
                            const placeId = r.place?.id;
                            const placeName = r.place?.name;
                            const placePath = ENTITY_MAP[placeId];
                            const placeLink = placePath
                                ? `<a href="${placePath.replace(/^\.\.\/\.\.\//, '../../../archive/')}">${esc(placeName)}</a>`
                                : esc(placeName);
                            return role + placeLink;
                        });
                        item += `<div class="rec-line">${places.join(', ')}</div>`;
                    }

                    html += `<div class="rec-item">${item}</div>`;
                }
                html += '</div>';

                // derived first release date (from cached recording data)
                const allDates = [];
                for (const recId of Object.keys(recDataCache)) {
                    const rd = recDataCache[recId];
                    if (rd?.releases) {
                        for (const rel of rd.releases) {
                            if (rel.date) allDates.push(rel.date);
                        }
                    }
                }
                if (allDates.length) {
                    const earliest = allDates.sort()[0];
                    html += `<p><strong>first released</strong> ${esc(earliest.substring(0, 4))}</p>`;
                }
            }

            // tags
            const tags = workData.tags?.sort((a, b) => b.count - a.count).slice(0, 8);
            if (tags?.length) {
                html += '<p><strong>tags</strong></p><div>' + tags.map(t => `<span class="mb-tag">${esc(t.name)}</span>`).join(' ') + '</div>';
            }

            // link to MB + artist/contributor page
            html += `<p style="margin-top: 12px;"><a href="https://musicbrainz.org/work/${esc(workId)}" target="_blank" rel="noopener">view on musicbrainz →</a></p>`;
            if (C.artistId) {
                const contribPath = ENTITY_MAP[C.artistId];
                if (contribPath) {
                    const fixed = contribPath.replace(/^\.\.\/\.\.\//, '../../../archive/');
                    const label = C.artistPageLabel || 'view artist page →';
                    html += `<p><a href="${fixed}">${esc(label)}</a></p>`;
                }
            }

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
