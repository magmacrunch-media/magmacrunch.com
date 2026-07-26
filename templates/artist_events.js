/* ═══════════════════════════════════════════════
   magmacrunch media — events page template
   templates/artist_events.js

   The stub HTML file provides all static structure
   (nav, main skeleton, footer). This script handles:
     1. Injecting page-specific styles (accent color)
     2. Populating dynamic stub elements (ticker,
        breadcrumb, sub-nav, artist label)
     3. Fetching and rendering events from MusicBrainz

   Requires window.ARTIST_CONFIG (defined in stub) = {
     id:        string   — MusicBrainz artist ID
     name:      string   — full artist name
     abbr:      string   — short label (e.g. "THLD")
     accent:    string   — CSS var name without --
     backColor: string   — nav-card class for ← back
     siblings:  string[] — sibling page names
     depth:     string   — path prefix to site root
     ticker:    string[] — extra ticker phrases
   }
   ═══════════════════════════════════════════════ */

(function () {
    const C = window.ARTIST_CONFIG;
    if (!C) { console.error('artist_events.js: window.ARTIST_CONFIG is not defined'); return; }

    const d      = C.depth  || '../../../';
    const accent = C.accent || 'green';

    const ENTITY_MAP = window.__ENTITY_MAP || {};
    function archiveLink(id, name, type) {
        if (!id || !name) return esc(name || '');
        const path = ENTITY_MAP[id];
        if (path) return '<a href="' + path + '">' + esc(name) + '</a>';
        return '<a href="https://musicbrainz.org/' + (type || 'artist') + '/' + esc(id) + '" target="_blank" rel="noopener">' + esc(name) + '</a>';
    }

const COLOR_MAP = {
        about:       'c-about',
        photography: 'c-photography',
        events:      'c-events',
        recordings:  'c-recordings',
        releases:    'c-releases',
        works:       'c-works',
        'music-videos': 'c-blue',
    };

    const ACCENT_RGB = {
        green:  '57,255,110',
        cyan:   '0,245,255',
        rose:   '255,61,110',
        yellow: '255,224,58',
        orange: '255,124,31',
        purple: '196,95,255',
        slate:  '136,153,170',
        blue:    '70,120,255',
        magenta:'255,45,120',
    };
    const accentRgb = ACCENT_RGB[accent] || '57,255,110';
    const accentVar = `var(--${accent})`;

    // ── 1. INJECT PAGE-SPECIFIC STYLES ──
    const style = document.createElement('style');
    style.textContent = `
        main { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 72px 20px 60px; }

        .breadcrumb { position: relative; z-index: 10; font-family: 'Press Start 2P', monospace; font-size: 7px; color: var(--dim); letter-spacing: 0.1em; margin-top: -8px; margin-bottom: 16px; align-self: flex-start; }
        .breadcrumb a { color: var(--dim); text-decoration: none; transition: color 0.15s; }
        .breadcrumb a:hover { color: ${accentVar}; }
        .breadcrumb .sep { margin: 0 8px; color: ${accentVar}; opacity: 0.7; }
        .breadcrumb .current { color: ${accentVar}; }

        .page-header { width: 100%; max-width: 960px; margin-bottom: 32px; animation: fadeUp 0.5s ease both; }
        .artist-label { font-family: 'Press Start 2P', monospace; font-size: 10px; color: ${accentVar}; letter-spacing: 0.2em; margin-bottom: 8px; opacity: 0.8; }
        .page-title { font-family: 'Press Start 2P', monospace; font-size: clamp(12px, 2.5vw, 20px); color: ${accentVar}; letter-spacing: 0.08em; line-height: 1.6; margin-bottom: 20px; text-shadow: 0 0 20px rgba(${accentRgb},0.45); }
        .sub-nav { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 36px; }

        .catalog-wrap { width: 100%; max-width: 960px; animation: fadeUp 0.5s 0.1s ease both; }
        #status-bar { font-family: 'Press Start 2P', monospace; font-size: 7px; color: var(--white); letter-spacing: 0.1em; margin-bottom: 16px; min-height: 18px; }
        #count-bar { font-family: 'Press Start 2P', monospace; font-size: 8px; color: var(--dim); letter-spacing: 0.08em; margin-bottom: 24px; }

        .event-card { display: flex; gap: 18px; border: 1px solid #1e1e2e; background: var(--deep); padding: 0; margin-bottom: 14px; transition: border-color 0.15s; }
        .event-card:hover { border-color: var(--rose); }
        .event-card.cancelled-event { opacity: 0.6; border-color: #2a1a2a; }
        .event-card.no-art .event-art { display: none; }

        .event-art { width: 120px; min-width: 120px; height: 120px; background: #0d0d18; border-right: 1px solid #1e1e2e; display: flex; align-items: center; justify-content: center; font-family: 'Press Start 2P', monospace; font-size: 5px; color: var(--dim); overflow: hidden; flex-shrink: 0; }
        .event-art img { width: 100%; height: 100%; object-fit: cover; cursor: pointer; }

        .event-info { padding: 16px 18px 16px 0; flex: 1; }
        .event-info h3 { font-family: 'Press Start 2P', monospace; font-size: 12px; color: var(--white); letter-spacing: 0.06em; margin-bottom: 10px; line-height: 1.7; }
        .event-info h3 a { color: ${accentVar}; text-decoration: none; }
        .event-info h3 a:hover { color: var(--yellow); }
        .event-type { font-family: 'Courier Prime', monospace; font-size: 12px; color: ${accentVar}; font-style: italic; margin-left: 6px; }
        .event-info p { font-family: 'Courier Prime', monospace; font-size: 14px; color: var(--white); opacity: 0.8; margin-bottom: 5px; line-height: 1.5; }
        .event-info p strong { font-family: 'Press Start 2P', monospace; font-size: 8px; color: var(--dim); letter-spacing: 0.08em; margin-right: 6px; }
        .event-info a { color: ${accentVar}; text-decoration: none; }
        .event-info a:hover { color: var(--white); }
        .cancelled-tag { font-family: 'Press Start 2P', monospace; font-size: 6px; color: var(--rose); letter-spacing: 0.1em; margin-left: 8px; }
        .pullout-tag { font-family: 'Press Start 2P', monospace; font-size: 6px; color: var(--rose); letter-spacing: 0.1em; margin-left: 8px; }
        .error-msg { font-family: 'Courier Prime', monospace; font-size: 12px; color: var(--rose); opacity: 0.7; }

        @media (max-width: 500px) { .event-art { width: 72px; min-width: 72px; height: 72px; } }
    `;
    document.head.appendChild(style);

    // ── 2. POPULATE DYNAMIC STUB ELEMENTS ──

    // ticker
    const tickerPhrases = [C.name, 'events', ...(C.ticker || [])];
    const tickerEl = document.getElementById('ticker-content');
    if (tickerEl) {
        tickerEl.innerHTML = [...tickerPhrases, ...tickerPhrases]
            .map(p => `${p} <span class="sep">✦</span>`).join(' ');
    }

    // breadcrumb
    const breadcrumbEl = document.querySelector('.breadcrumb');
    if (breadcrumbEl) {
        breadcrumbEl.innerHTML = `
            <a href="${d}archive/">archive</a>
            <span class="sep">›</span>
            <a href="${d}archive/by-artist/">by artist</a>
            <span class="sep">›</span>
            <a href="./">${C.abbr.toLowerCase()}</a>
        `;
    }

    // artist label
    const artistLabelEl = document.getElementById('artist-label');
    if (artistLabelEl) artistLabelEl.textContent = `// ${C.name} //`;

    // sub-nav
    const subNavEl = document.getElementById('sub-nav');
    if (subNavEl) {
        subNavEl.innerHTML = [
            `<a href="./" class="nav-card c-back">← back</a>`,
            ...(C.siblings || []).filter(s => s !== 'events').map(s => {
                const label = s.replace(/-/g, ' ');
                return `<a href="${s}.html" class="nav-card ${COLOR_MAP[s] || 'c-cyan'}">${label}</a>`;
            })
        ].join('\n');
    }

    // ══════════════════════════════════════════
    // 3. API LOGIC
    // ══════════════════════════════════════════
    const artistId        = C.id;
    const PERFORMER_TYPES = ['main performer', 'support act', 'performer', 'guest'];
    const delay           = ms => new Promise(r => setTimeout(r, ms));

    // ── CACHE ──
    let _cache = null;
    let apiCallsMade = false;
    async function loadCache() {
        if (window.__MB_CACHE) { _cache = window.__MB_CACHE; return; }
        try {
            const r = await fetch(d + 'archive/_cache/artists/' + artistId + '.json');
            if (r.ok) { const j = await r.json(); if (j.fetchedAt) _cache = j; }
        } catch {}
    }
    async function cached(path, cacheData) {
        if (cacheData !== undefined) return cacheData;
        apiCallsMade = true;
        return fetchWithRetry('https://musicbrainz.org/ws/2/' + path);
    }

    // Escape HTML special chars to safely insert API text into innerHTML
    function esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Area name cache — keyed by areaId, stores resolved strings.
    // Avoids re-fetching the same city/region across multiple events.
    const areaCache = new Map();

    async function fetchWithRetry(url, retries = 4) {
        if (window.__mcPageAborted) throw new Error('page navigated away');
        for (let i = 0; i < retries; i++) {
            let res;
            try {
                res = await fetch(url);
            } catch (networkErr) {
                if (i === retries - 1) throw networkErr;
                await delay(1500 * (i + 1));
                continue;
            }
            if (res.status === 429 || res.status === 503) {
                if (i === retries - 1) throw new Error(`HTTP ${res.status} after ${retries} attempts`);
                await delay(2500 * (i + 1));
                continue;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        }
    }

    // Posters load sequentially in the background with a small gap,
    // so they never interfere with the main event detail loop.
    let posterQueue = Promise.resolve();
    function loadPoster(eventId) {
        posterQueue = posterQueue.then(() => delay(300)).then(() => {
            if (window.__mcPageAborted) return;
            const art = document.getElementById(`art-${eventId}`);
            const row = document.getElementById(`event-${eventId}`);
            if (!art || !row) return;
            return fetch(`https://eventartarchive.org/event/${eventId}`)
                .then(r => r.ok ? r.json() : Promise.reject())
                .then(data => {
                    if (data.images?.length) {
                        const img = data.images.find(i => i.front) || data.images[0];
                        const url = img.thumbnails?.['250'] || img.image;
                        art.innerHTML = `<a href="https://musicbrainz.org/event/${eventId}/event-art" target="_blank"><img src="${esc(url)}" loading="lazy" onerror="this.parentElement.parentElement.remove();document.getElementById('event-${eventId}').classList.add('no-art');"></a>`;
                    } else { art.remove(); row.classList.add('no-art'); }
                })
                .catch(() => { art.remove(); row.classList.add('no-art'); });
        });
    }

    async function getFullAreaName(areaId) {
        if (areaCache.has(areaId)) return areaCache.get(areaId);
        const cachedArea = _cache?.subpages?.events?.areaChains?.[areaId];
        if (cachedArea !== undefined) { areaCache.set(areaId, cachedArea); return cachedArea; }
        try {
            const data = await fetchWithRetry(`https://musicbrainz.org/ws/2/area/${areaId}?inc=area-rels&fmt=json`);
            const names = [], seen = new Set();
            async function addAreaChain(areaData) {
                if (!areaData?.name || seen.has(areaData.id)) return;
                seen.add(areaData.id);
                if (!['County'].includes(areaData.type)) names.push(areaData.name);
                if (areaData.type === 'Country' || names.length >= 4) return;
                const partOfRel = areaData.relations?.find(r => r.type === 'part of' && r['target-type'] === 'area');
                if (partOfRel?.area?.id) {
                    await delay(200);
                    try {
                        const parentData = await fetchWithRetry(`https://musicbrainz.org/ws/2/area/${partOfRel.area.id}?inc=area-rels&fmt=json`);
                        await addAreaChain(parentData);
                    } catch {}
                }
            }
            await addAreaChain(data);
            const result = names.join(', ');
            areaCache.set(areaId, result);
            return result;
        } catch {
            return '';
        }
    }

    (async () => {
        await loadCache();
        const statusEl = document.getElementById('status-bar');
        const countBar = document.getElementById('count-bar');
        const list     = document.getElementById('events-list');

        try {
            // ── fetch all event stubs with pagination ──
            let allEvents = [], offset = 0, totalCount = 0;
            const cachedList = _cache?.subpages?.events?.list;
            if (cachedList) {
                totalCount = cachedList['event-count'];
                allEvents = cachedList.events || [];
                statusEl.textContent = `loaded ${allEvents.length} events from cache`;
            } else {
                do {
                    const data = await fetchWithRetry(`https://musicbrainz.org/ws/2/event?artist=${artistId}&limit=100&offset=${offset}&fmt=json`);
                    totalCount = data['event-count'];
                    allEvents  = allEvents.concat(data.events);
                    offset += 100;
                    statusEl.textContent = `fetching events… ${allEvents.length} of ${totalCount}`;
                    if (offset < totalCount) await delay(1000);
                } while (offset < totalCount);
            }

            if (totalCount === 0) {
                statusEl.textContent = 'no events found.';
                return;
            }

            allEvents.sort((a, b) => {
                const da = a['life-span']?.begin || '0000-01-01';
                const db = b['life-span']?.begin || '0000-01-01';
                return db.localeCompare(da);
            });

            countBar.textContent = `found ${totalCount} event${totalCount !== 1 ? 's' : ''} (newest first):`;

            // ── render placeholder cards in sorted order ──
            allEvents.forEach(e => {
                list.insertAdjacentHTML('beforeend', `
                    <div class="event-card" id="event-${e.id}">
                        <div class="event-art" id="art-${e.id}">…</div>
                        <div class="event-info"><h3>${esc(e.name)}</h3><p>loading details…</p></div>
                    </div>
                `);
            });

            // ── fetch details strictly one at a time, 1000ms between each ──
            let completed = 0, failed = 0;

            for (let i = 0; i < allEvents.length; i++) {
                const e = allEvents[i];
                try {
                    const d = await cached(`event/${e.id}?inc=place-rels+artist-rels&fmt=json`, _cache?.subpages?.events?.details?.[e.id]);
                    const placeRel    = d.relations?.find(r => r.type === 'held at');
                    const place       = placeRel?.place;
                    const isCancelled = d.cancelled === true;
                    if (isCancelled) document.getElementById(`event-${e.id}`)?.classList.add('cancelled-event');

                    // Fall back to place.area.name if full chain lookup fails
                    let location = '';
                    if (place?.area?.id) {
                        try {
                            location = await getFullAreaName(place.area.id);
                        } catch {
                            location = place.area.name || '';
                        }
                    }

                    // Find the main artist's relation to check if they pulled out
                    const mainRel = d.relations?.find(r =>
                        r['target-type'] === 'artist' && PERFORMER_TYPES.includes(r.type) && r.artist?.id === artistId
                    );
                    const mainPulledOut = mainRel && Array.isArray(mainRel.attributes) && mainRel.attributes.includes('cancelled');

                    const others = d.relations?.filter(r =>
                        r['target-type'] === 'artist' && PERFORMER_TYPES.includes(r.type) && r.artist?.id !== artistId
                    ) || [];
                    const othersHtml = others.length
                        ? `<p><strong>also:</strong> ${others.map(r => {
                            const wasCancelled = Array.isArray(r.attributes) && r.attributes.includes('cancelled');
                            return archiveLink(r.artist.id, r.artist.name, 'artist') + (wasCancelled ? ' <span class="cancelled-tag">(cancelled)</span>' : '');
                        }).join(', ')}</p>` : '';

                    document.querySelector(`#event-${e.id} .event-info`).innerHTML = `
                        <h3>
                            <a href="https://musicbrainz.org/event/${esc(d.id)}" target="_blank">${esc(d.name)}</a>
                            <span class="event-type">[${d.type ? (d.type.toLowerCase() === 'concert' ? 'show' : esc(d.type.toLowerCase())) : 'event'}]</span>
                            ${isCancelled ? '<span class="cancelled-tag">cancelled</span>' : ''}
                            ${mainPulledOut ? '<span class="pullout-tag">(pulled out)</span>' : ''}
                        </h3>
                        <p><strong>date</strong>${esc(d['life-span']?.begin) || 'unknown'}${d.time ? ` at ${esc(d.time)}` : ''}</p>
                        <p><strong>venue</strong>${esc(place?.name) || 'unknown'}</p>
                        ${location ? `<p><strong>location</strong>${esc(location)}</p>` : ''}
                        ${othersHtml}
                    `;
                    loadPoster(e.id);
                    completed++;
                } catch {
                    document.querySelector(`#event-${e.id} .event-info`).innerHTML = `
                        <h3>${esc(e.name)}</h3>
                        <p class="error-msg">failed to load — <a href="https://musicbrainz.org/event/${esc(e.id)}" target="_blank">view on MusicBrainz</a></p>
                    `;
                    failed++;
                    completed++;
                }
                statusEl.textContent = `loading details… ${completed} of ${totalCount}${failed ? ` (${failed} failed)` : ''}`;
                if (apiCallsMade && i < allEvents.length - 1) await delay(1000);
            }

            statusEl.textContent = `all ${totalCount} events loaded!${failed ? ` (${failed} failed — try refreshing)` : ''}`;

        } catch (err) {
            statusEl.textContent = 'error loading events — check your connection and refresh.';
    console.error('artist_events.js fetch failed:', err);
}

// MusicBrainz attribution
(function() {
    var footer = document.querySelector('footer');
    if (footer && !footer.querySelector('.mb-data-attribution')) {
        footer.insertAdjacentHTML('beforeend',
            '<div class="mb-data-attribution">' +
                '<img src="' + d + 'assets/logos/MB_logo.svg" alt="MusicBrainz">' +
                '<p>Music data provided by <a href="https://musicbrainz.org" target="_blank" rel="noopener">MusicBrainz</a>. ' +
                'Licensed under <a href="https://creativecommons.org/licenses/by-nc-sa/3.0/" target="_blank" rel="noopener">CC BY-NC-SA 3.0</a>.</p>' +
            '</div>'
        );
    }
})();
})();
})();
