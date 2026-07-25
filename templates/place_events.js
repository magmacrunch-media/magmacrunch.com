/* ═══════════════════════════════════════════════
   magmacrunch media — place events page template
   templates/place_events.js

   Requires window.PLACE_CONFIG (defined in stub) = {
     id:        string   — MusicBrainz place ID
     name:      string   — full place name
     abbr:      string   — short label
     accent:    string   — CSS var name without --  (e.g. 'green')
     backColor: string   — nav-card class for ← back (e.g. 'c-magenta')
     siblings:  string[] — sibling page names
     depth:     string   — path prefix to site root
     ticker:    string[] — extra ticker phrases
   }
   ═══════════════════════════════════════════════ */

(function () {
    const C = window.PLACE_CONFIG;
    if (!C) { console.error('place_events.js: window.PLACE_CONFIG is not defined'); return; }

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
        events:     'c-events',
        recordings: 'c-recordings',
        works:      'c-works',
        personnel:  'c-personnel',
    };

    const BACK_COLOR_VAR = {
        'c-green':   'var(--green)',
        'c-cyan':    'var(--cyan)',
        'c-rose':    'var(--rose)',
        'c-yellow':  'var(--yellow)',
        'c-orange':  'var(--orange)',
        'c-purple':  'var(--purple)',
        'c-slate':   'var(--slate)',
        'c-blue':    'var(--blue)',
        'c-magenta': 'var(--magenta)',
        'c-darkgreen': 'var(--darkgreen)',
    };
    const backColorVar = BACK_COLOR_VAR[C.backColor] || 'var(--cyan)';

    const ACCENT_RGB = {
        green:   '57,255,110',
        cyan:    '0,245,255',
        rose:    '255,61,110',
        yellow:  '255,224,58',
        orange:  '255,124,31',
        purple:  '196,95,255',
        slate:   '136,153,170',
        blue:    '70,120,255',
        magenta: '255,45,120',
    };
    const accentRgb = ACCENT_RGB[accent] || '57,255,110';
    const accentVar = `var(--${accent})`;

    // ── 1. INJECT PAGE STYLES ──
    const style = document.createElement('style');
    style.textContent = `
        main { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 72px 20px 60px; }

        .breadcrumb { position: relative; z-index: 10; font-family: 'Press Start 2P', monospace; font-size: 7px; color: var(--dim); letter-spacing: 0.1em; margin-top: -8px; margin-bottom: 16px; align-self: flex-start; }
        .breadcrumb a { color: ${accentVar}; text-decoration: none; transition: color 0.15s; }
        .breadcrumb a:hover { color: ${accentVar}; }
        .breadcrumb .sep { margin: 0 8px; color: ${accentVar}; opacity: 0.7; }
        .breadcrumb .current { color: ${accentVar}; }

        .page-header { width: 100%; max-width: 960px; margin-bottom: 32px; animation: fadeUp 0.5s ease both; }
        .place-label { font-family: 'Press Start 2P', monospace; font-size: 10px; color: ${backColorVar}; letter-spacing: 0.2em; margin-bottom: 8px; opacity: 0.8; }
        .page-title { font-family: 'Press Start 2P', monospace; font-size: clamp(12px, 2.5vw, 20px); color: ${accentVar}; letter-spacing: 0.08em; line-height: 1.6; margin-bottom: 20px; text-shadow: 0 0 20px rgba(${accentRgb}, 0.45); }
        .sub-nav { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 36px; }

        .catalog-wrap { width: 100%; max-width: 960px; animation: fadeUp 0.5s 0.1s ease both; }
        #status-bar { font-family: 'Press Start 2P', monospace; font-size: 7px; color: var(--white); letter-spacing: 0.1em; margin-bottom: 16px; min-height: 18px; }
        #count-bar { font-family: 'Press Start 2P', monospace; font-size: 8px; color: var(--dim); letter-spacing: 0.08em; margin-bottom: 24px; }

        .event-card { display: flex; gap: 16px; border: 1px solid #1e1e2e; background: var(--deep); margin-bottom: 12px; transition: border-color 0.15s; overflow: hidden; }
        .event-card:hover { border-color: ${accentVar}; }
        .event-card.cancelled { border-color: #2a2a3a; opacity: 0.65; }

        .event-poster { width: 110px; min-width: 110px; height: 110px; background: #0d0d18; border-right: 1px solid #1e1e2e; flex-shrink: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .event-poster img { width: 100%; height: 100%; object-fit: cover; display: block; cursor: pointer; }
        .event-card.no-art .event-poster { display: none; }

        .event-info { padding: 14px 16px 14px 0; flex: 1; }
        .event-info h3 { font-family: 'Press Start 2P', monospace; font-size: 12px; color: var(--white); letter-spacing: 0.05em; margin-bottom: 10px; line-height: 1.7; }
        .event-info h3 a { color: ${accentVar}; text-decoration: none; }
        .event-info h3 a:hover { color: var(--white); }
        .event-type { font-family: 'Courier Prime', monospace; font-size: 11px; color: ${backColorVar}; font-style: italic; margin-left: 6px; }
        .cancelled-label { font-family: 'Press Start 2P', monospace; font-size: 5px; color: var(--rose); letter-spacing: 0.06em; margin-left: 8px; }
        .event-info p { font-family: 'Courier Prime', monospace; font-size: 12px; color: var(--white); opacity: 0.8; margin-bottom: 5px; line-height: 1.5; }
        .event-info p strong { font-family: 'Press Start 2P', monospace; font-size: 8px; color: var(--dim); letter-spacing: 0.08em; margin-right: 6px; }
        .event-info a { color: ${accentVar}; text-decoration: none; }
        .event-info a:hover { color: var(--white); }
        .performer-cancelled { color: var(--rose); font-style: italic; font-size: 10px; }

        @media (max-width: 500px) { .event-poster { width: 72px; min-width: 72px; height: 72px; } }
    `;
    document.head.appendChild(style);

    // ── 2. POPULATE DYNAMIC STUB ELEMENTS ──

    const tickerPhrases = [C.name, 'events', ...(C.ticker || [])];
    const tickerEl = document.getElementById('ticker-content');
    if (tickerEl) {
        tickerEl.innerHTML = [...tickerPhrases, ...tickerPhrases]
            .map(p => `${p} <span class="sep">✦</span>`).join(' ');
    }

    const breadcrumbEl = document.querySelector('.breadcrumb');
    if (breadcrumbEl) {
        breadcrumbEl.innerHTML = `
            <a href="${d}archive/">archive</a>
            <span class="sep">›</span>
            <a href="${d}archive/by-place/">by place</a>
            <span class="sep">›</span>
            <a href="./">${C.abbr.toLowerCase()}</a>
        `;
    }

    const placeLabelEl = document.getElementById('place-label');
    if (placeLabelEl) placeLabelEl.textContent = `// ${C.name} //`;

    const subNavEl = document.getElementById('sub-nav');
    if (subNavEl) {
        subNavEl.innerHTML = [
            `<a href="./" class="nav-card ${C.backColor || 'c-cyan'}">← back</a>`,
            ...(C.siblings || []).filter(s => s !== 'events').map(s =>
                `<a href="${s}.html" class="nav-card ${COLOR_MAP[s] || 'c-cyan'}">${s}</a>`
            )
        ].join('\n');
    }

    // ══════════════════════════════════════════
    // 3. API LOGIC
    // ══════════════════════════════════════════
    const placeId         = C.id;
    const PERFORMER_TYPES = ['main performer', 'support act', 'performer', 'guest'];
    const delay           = ms => new Promise(r => setTimeout(r, ms));

    // ── CACHE ──
    let _cache = null;
    let apiCallsMade = false;
    async function loadCache() {
        if (window.__MB_CACHE) { _cache = window.__MB_CACHE; return; }
        try {
            const r = await fetch(d + 'archive/_cache/places/' + placeId + '.json');
            if (r.ok) { const j = await r.json(); if (j.fetchedAt) _cache = j; }
        } catch {}
    }
    async function cached(path, cacheData) {
        if (cacheData !== undefined) return cacheData;
        apiCallsMade = true;
        return fetchWithRetry('https://musicbrainz.org/ws/2/' + path);
    }

    function esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    async function fetchWithRetry(url, retries = 4) {
        for (let i = 0; i < retries; i++) {
            let res;
            try { res = await fetch(url); }
            catch (err) {
                if (i === retries - 1) throw err;
                await delay(1000 * Math.pow(2, i));
                continue;
            }
            if (res.status === 429 || res.status === 503) { await delay(1000 * Math.pow(2, i)); continue; }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        }
        throw new Error(`fetchWithRetry failed after ${retries} attempts: ${url}`);
    }

    let posterQueue = Promise.resolve();
    function loadPoster(eventId) {
        posterQueue = posterQueue.then(() => delay(300)).then(() => {
            const art = document.getElementById(`art-${eventId}`);
            const row = document.getElementById(`event-${eventId}`);
            if (!art || !row) return;
            return fetch(`https://eventartarchive.org/event/${eventId}`)
                .then(r => r.ok ? r.json() : Promise.reject())
                .then(data => {
                    if (data.images?.length) {
                        const img = data.images.find(i => i.front) || data.images[0];
                        const url = img.thumbnails?.['250'] || img.image;
                        art.innerHTML = `<a href="https://musicbrainz.org/event/${eventId}/event-art" target="_blank" rel="noopener"><img src="${esc(url)}" loading="lazy" onerror="this.parentElement.parentElement.remove();document.getElementById('event-${eventId}').classList.add('no-art');"></a>`;
                    } else { art.remove(); row.classList.add('no-art'); }
                })
                .catch(() => { art.remove(); row.classList.add('no-art'); });
        });
    }

    (async () => {
        await loadCache();
        const statusEl = document.getElementById('status-bar');
        const countBar = document.getElementById('count-bar');
        const list     = document.getElementById('events-list');

        try {
            let allEvents = [], offset = 0, totalCount = 0;
            const cachedList = _cache?.subpages?.events?.list;
            if (cachedList) {
                totalCount = cachedList['event-count'];
                allEvents = cachedList.events || [];
                statusEl.textContent = `loaded ${allEvents.length} events from cache`;
            } else {
                do {
                    const data = await fetchWithRetry(`https://musicbrainz.org/ws/2/event?place=${placeId}&limit=100&offset=${offset}&fmt=json`);
                    totalCount = data['event-count'];
                    allEvents  = allEvents.concat(data.events);
                    offset += 100;
                    statusEl.textContent = `fetching events… ${allEvents.length} of ${totalCount}`;
                    if (offset < totalCount) await delay(1000);
                } while (offset < totalCount);
            }

            if (totalCount === 0) { statusEl.textContent = 'no events found.'; return; }

            allEvents.sort((a, b) => {
                const da = a['life-span']?.begin || '0000-01-01';
                const db = b['life-span']?.begin || '0000-01-01';
                return db.localeCompare(da);
            });
            countBar.textContent = `found ${totalCount} event${totalCount !== 1 ? 's' : ''} (newest first):`;

            allEvents.forEach(e => {
                list.insertAdjacentHTML('beforeend', `
                    <div class="event-card" id="event-${e.id}">
                        <div class="event-poster" id="art-${e.id}"></div>
                        <div class="event-info"><h3>${esc(e.name)}</h3><p>loading details…</p></div>
                    </div>
                `);
            });

            let completed = 0, failed = 0;
            for (let i = 0; i < allEvents.length; i++) {
                const e = allEvents[i];
                try {
                    const d = await cached(`event/${e.id}?inc=place-rels+artist-rels&fmt=json`, _cache?.subpages?.events?.details?.[e.id]);
                    const isCancelled = d.cancelled === true;
                    if (isCancelled) document.getElementById(`event-${e.id}`)?.classList.add('cancelled');

                    const performers = (d.relations?.filter(r =>
                        r['target-type'] === 'artist' && PERFORMER_TYPES.includes(r.type)
                    ) || []).map(r => {
                        const wasCancelled = Array.isArray(r.attributes) && r.attributes.includes('cancelled');
                        const typeLabel = r.type !== 'main performer' ? ` (${r.type})` : '';
                        return archiveLink(r.artist.id, r.artist.name, 'artist') + typeLabel + (wasCancelled ? ' <span class="performer-cancelled">(cancelled)</span>' : '');
                    }).join(', ');

                    const eventType = d.type ? (d.type.toLowerCase() === 'concert' ? 'show' : esc(d.type.toLowerCase())) : 'event';

                    document.querySelector(`#event-${e.id} .event-info`).innerHTML = `
                        <h3>
                            <a href="https://musicbrainz.org/event/${esc(d.id)}" target="_blank" rel="noopener">${esc(d.name)}</a>
                            <span class="event-type">[${eventType}]</span>
                            ${isCancelled ? '<span class="cancelled-label">CANCELLED</span>' : ''}
                        </h3>
                        <p><strong>date</strong>${esc(d['life-span']?.begin || 'unknown')}${d.time ? ` at ${esc(d.time)}` : ''}</p>
                        ${performers ? `<p><strong>performers</strong>${performers}</p>` : ''}
                    `;
                    loadPoster(e.id);
                    completed++;
                } catch {
                    document.querySelector(`#event-${e.id} .event-info`).innerHTML = `
                        <h3>${esc(e.name)}</h3>
                        <p style="color:var(--rose);opacity:0.7;">failed to load — <a href="https://musicbrainz.org/event/${esc(e.id)}" target="_blank" rel="noopener">view on MusicBrainz</a></p>
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
            console.error('place_events.js fetch failed:', err);
        }
    })();
})();
