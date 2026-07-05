/* ═══════════════════════════════════════════════
   magmacrunch media — place recordings page template
   templates/place_recordings.js

   The stub HTML file provides all static structure
   (nav, main skeleton, footer). This script handles:
     1. Injecting page-specific styles (accent color)
     2. Populating dynamic stub elements (ticker,
        breadcrumb, sub-nav, place label)
     3. Fetching and rendering recordings from MusicBrainz

   Requires window.PLACE_CONFIG (defined in stub) = {
     id:        string   — MusicBrainz place ID
     name:      string   — full place name
     abbr:      string   — short label
     accent:    string   — CSS var name without --  (e.g. 'cyan')
     backColor: string   — nav-card class for ← back (e.g. 'c-magenta')
     siblings:  string[] — sibling page names
     depth:     string   — path prefix to site root
     ticker:    string[] — extra ticker phrases
   }
   ═══════════════════════════════════════════════ */

(function () {
    const C = window.PLACE_CONFIG;
    if (!C) { console.error('place_recordings.js: window.PLACE_CONFIG is not defined'); return; }

    const d      = C.depth  || '../../../';
    const accent = C.accent || 'cyan';

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
        'c-green':     'var(--green)',
        'c-cyan':      'var(--cyan)',
        'c-rose':      'var(--rose)',
        'c-yellow':    'var(--yellow)',
        'c-orange':    'var(--orange)',
        'c-purple':    'var(--purple)',
        'c-slate':     'var(--slate)',
        'c-blue':      'var(--blue)',
        'c-magenta':   'var(--magenta)',
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
    const accentRgb = ACCENT_RGB[accent] || '0,245,255';
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

        .recording-card { border: 1px solid #1e1e2e; background: var(--deep); padding: 18px 20px; margin-bottom: 12px; transition: border-color 0.15s; }
        .recording-card:hover { border-color: ${accentVar}; }

        .recording-card h3 { font-family: 'Press Start 2P', monospace; font-size: 12px; color: var(--white); letter-spacing: 0.05em; margin-bottom: 12px; line-height: 1.7; }
        .recording-card h3 a { color: ${accentVar}; text-decoration: none; }
        .recording-card h3 a:hover { color: var(--white); }

        .video-label { font-family: 'Courier Prime', monospace; font-size: 12px; color: var(--purple); font-style: italic; margin-left: 6px; }
        .disambiguation { font-family: 'Courier Prime', monospace; font-size: 12px; color: var(--dim); font-style: italic; }

        .recording-card p { font-family: 'Courier Prime', monospace; font-size: 14px; color: var(--white); opacity: 0.8; margin-bottom: 5px; line-height: 1.5; }
        .recording-card p strong { font-family: 'Press Start 2P', monospace; font-size: 8px; color: var(--dim); letter-spacing: 0.08em; margin-right: 6px; }
        .recording-card a { color: ${accentVar}; text-decoration: none; }
        .recording-card a:hover { color: var(--white); }

        .place-rel-badge { display: inline-block; padding: 2px 8px; margin: 2px; font-family: 'Press Start 2P', monospace; font-size: 8px; letter-spacing: 0.06em; background: ${accentVar}; color: #000; }

        .tag { display: inline-block; background: #1a1a2e; border: 1px solid #2a2a4a; padding: 2px 7px; margin: 2px; font-family: 'Courier Prime', monospace; font-size: 11px; color: var(--dim); }
        .error-msg { color: var(--rose); opacity: 0.7; }
    `;
    document.head.appendChild(style);

    // ── 2. POPULATE DYNAMIC STUB ELEMENTS ──

    const tickerPhrases = [C.name, 'recordings', ...(C.ticker || [])];
    const tickerEl = document.getElementById('ticker-content');
    if (tickerEl) {
        tickerEl.innerHTML = [...tickerPhrases, ...tickerPhrases]
            .map(p => `${p} <span class="sep">✦</span>`).join(' ');
    }

    const breadcrumbEl = document.querySelector('.breadcrumb');
    if (breadcrumbEl) {
        breadcrumbEl.innerHTML = `
            <a href="${d}archive/index.html">archive</a>
            <span class="sep">›</span>
            <a href="${d}archive/by-place/index.html">by place</a>
            <span class="sep">›</span>
            <a href="index.html">${C.abbr.toLowerCase()}</a>
        `;
    }

    const placeLabelEl = document.getElementById('place-label');
    if (placeLabelEl) placeLabelEl.textContent = `// ${C.name} //`;

    const subNavEl = document.getElementById('sub-nav');
    if (subNavEl) {
        subNavEl.innerHTML = [
            `<a href="index.html" class="nav-card ${C.backColor || 'c-cyan'}">← back</a>`,
            ...(C.siblings || []).filter(s => s !== 'recordings').map(s =>
                `<a href="${s}.html" class="nav-card ${COLOR_MAP[s] || 'c-cyan'}">${s}</a>`
            )
        ].join('\n');
    }

    // ══════════════════════════════════════════
    // 3. API LOGIC
    // ══════════════════════════════════════════
    const placeId = C.id;
    const delay   = ms => new Promise(r => setTimeout(r, ms));

    // ── CACHE ──
    let _cache = null;
    async function loadCache() {
        if (window.__MB_CACHE) { _cache = window.__MB_CACHE; return; }
        try {
            const r = await fetch(d + 'archive/_cache/places/' + placeId + '.json');
            if (r.ok) { const j = await r.json(); if (j.fetchedAt) _cache = j; }
        } catch {}
    }
    async function cached(path, cacheData) {
        if (cacheData !== undefined) return cacheData;
        return fetchWithRetry('https://musicbrainz.org/ws/2/' + path);
    }

    function esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function fmtLength(ms) {
        if (!ms) return 'n/a';
        const s   = Math.round(ms / 1000);
        const m   = Math.floor(s / 60);
        const sec = String(s % 60).padStart(2, '0');
        return `${m}:${sec}`;
    }

    const formatDate = (begin, end, ended) => {
        if (!begin && !end) return '';
        if (begin && end && begin === end) return ` (${esc(begin)})`;
        if (begin && !end) return ` (${esc(begin)}${ended ? '' : '–present'})`;
        if (begin && end) return (begin.includes('-') && end.includes('-'))
            ? ` (${esc(begin)} to ${esc(end)})` : ` (${esc(begin)}–${esc(end)})`;
        return '';
    };

    const formatAttrs = attrs => attrs?.length ? ` (${attrs.map(esc).join(', ')})` : '';

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

    (async () => {
        await loadCache();
        const statusEl = document.getElementById('status-bar');
        const countBar = document.getElementById('count-bar');
        const list     = document.getElementById('recordings-list');

        try {
            // ── Collect recording IDs via place relations ──
            // MusicBrainz doesn't expose a direct recording?place= endpoint,
            // so we page through recording search using the place's linked recordings.
            // The most reliable route is fetching the place entity with recording-rels,
            // then walking each recording's full detail record.
            statusEl.textContent = 'fetching place data…';
            const placeData = _cache?.subpages?.recordings?.placeData || await fetchWithRetry(
                `https://musicbrainz.org/ws/2/place/${placeId}?inc=recording-rels&fmt=json`
            );
            const recRels = placeData.relations?.filter(r => r['target-type'] === 'recording') || [];

            if (recRels.length === 0) { statusEl.textContent = 'no recordings found.'; return; }

            // Deduplicate by recording ID, preserving place-relation metadata
            const seen = new Map();
            for (const rel of recRels) {
                const id = rel.recording?.id;
                if (!id) continue;
                if (!seen.has(id)) seen.set(id, { rel, id, title: rel.recording?.title || 'unknown' });
            }
            const unique = Array.from(seen.values());

            // Shuffle for variety (mirrors artist_recordings / place_works pattern)
            unique.sort(() => Math.random() - 0.5);

            countBar.textContent = `found ${unique.length} recording${unique.length !== 1 ? 's' : ''} (shuffled):`;

            let completed = 0, failed = 0;

            for (let i = 0; i < unique.length; i++) {
                const { id: recId, title: fallbackTitle, rel: placeRel } = unique[i];
                statusEl.textContent = `loading details… ${completed + 1} of ${unique.length}${failed ? ` (${failed} failed)` : ''}`;

                try {
                    const d = _cache?.subpages?.recordings?.details?.[recId] || await fetchWithRetry(
                        `https://musicbrainz.org/ws/2/recording/${recId}?inc=artists+isrcs+tags+artist-rels+place-rels+releases+work-rels+aliases+recording-rels&fmt=json`
                    );

                    const isVideo  = d.video === true;
                    const length   = fmtLength(d.length);
                    const isrcs    = d.isrcs?.map(esc).join(', ') || 'n/a';
                    const firstRel = esc(d['first-release-date'] || 'unknown');
                    const disambig = d.disambiguation
                        ? `<span class="disambiguation"> (${esc(d.disambiguation)})</span>` : '';

                    const artists = d['artist-credit']?.map(ac =>
                        archiveLink(ac.artist?.id, ac.name, 'artist')
                    ).join(', ') || 'various artists';

                    const aliases = d.aliases
                        ?.map(a => a.name).filter(n => n !== d.title).map(esc).join(', ') || '';

                    // Badge(s) for this place's specific relationship to the recording
                    const thisPlaceRels = d.relations?.filter(r => r['target-type'] === 'place' && r.place?.id === placeId) || [];
                    const badges = thisPlaceRels.map(r => {
                        let label = r.type;
                        if (r.attributes?.length) label += ` (${r.attributes.join(', ')})`;
                        label += formatDate(r.begin, r.end, r.ended);
                        return `<span class="place-rel-badge">${esc(label)}</span>`;
                    }).join('');

                    // Other places this recording is linked to
                    const otherPlaces = (d.relations?.filter(r => r['target-type'] === 'place' && r.place?.id !== placeId) || [])
                        .map(r => archiveLink(r.place?.id, r['target-credit'] || r.place?.name, 'place') + ` (${esc(r.type)}${formatAttrs(r.attributes)})${formatDate(r.begin, r.end, r.ended)}`)
                        .join(', ');

                    // Works performed in this recording
                    const works = d.relations
                        ?.filter(r => r['target-type'] === 'work' && r.type === 'performance')
                        .map(r => `<a href="https://musicbrainz.org/work/${esc(r.work?.id)}" target="_blank" rel="noopener">${esc(r.work?.title)}</a>${r.attributes?.includes('cover') ? ' [cover]' : ''}`)
                        .join(', ') || '';

                    // Releases
                    const releases = d.releases?.map(r => {
                        const year = r.date ? ` (${esc(r.date.substring(0, 4))})` : '';
                        return `<a href="https://musicbrainz.org/release/${esc(r.id)}" target="_blank" rel="noopener">${esc(r.title)}</a>${year}`;
                    }).join(', ') || '';

                    // Recording-to-recording relationships (remixes, live versions, etc.)
                    const recRelsHtml = d.relations
                        ?.filter(r => r['target-type'] === 'recording')
                        .map(r => {
                            let type = r.type;
                            if (r.type === 'remix')   type = r.direction === 'backward' ? 'remix of'        : 'has remix';
                            if (r.type === 'live')    type = r.direction === 'backward' ? 'live version of' : 'has live version';
                            if (r.type === 'cover')   type = r.direction === 'backward' ? 'cover of'        : 'has cover';
                            if (r.type === 'edit of') type = r.direction === 'backward' ? 'edit of'         : 'has edit';
                            if (r.type === 'video')   type = r.direction === 'backward' ? 'music video for' : 'has music video';
                            const year = r.recording?.['first-release-date']
                                ? ` (${esc(r.recording['first-release-date'].substring(0, 4))})` : '';
                            return `${esc(type)}: <a href="https://musicbrainz.org/recording/${esc(r.recording?.id)}" target="_blank" rel="noopener">${esc(r.recording?.title)}</a>${year}`;
                        }).join(', ') || '';

                    // Performers — group by artist, collecting all roles
                    const perfMap = new Map();
                    d.relations?.filter(r => r['target-type'] === 'artist' && ['vocal', 'instrument', 'performer'].includes(r.type))
                        .forEach(r => {
                            if (!perfMap.has(r.artist.id)) perfMap.set(r.artist.id, { name: r.artist.name, id: r.artist.id, roles: [] });
                            const p = perfMap.get(r.artist.id);
                            if (r.type === 'vocal') {
                                p.roles.push(...(r.attributes?.length ? r.attributes.map(a => a.toLowerCase().includes('vocal') ? a : a + ' vocals') : ['vocals']));
                            } else if (r.type === 'instrument') {
                                p.roles.push(...(r.attributes?.length ? r.attributes : ['instrument']));
                            } else {
                                p.roles.push(...(r.attributes?.length ? r.attributes : [r.type]));
                            }
                        });
                    const performers = Array.from(perfMap.values())
                        .map(p => archiveLink(p.id, p.name, 'artist') + (p.roles.length ? ` <span class="credit-sub">(${p.roles.map(esc).join(', ')})</span>` : ''))
                        .join(', ');

                    // Production credits
                    const production = d.relations
                        ?.filter(r => r['target-type'] === 'artist' && ['engineer', 'mix', 'producer', 'recording', 'mastering'].includes(r.type))
                        .map(r => archiveLink(r.artist?.id, r.artist?.name, 'artist') + ` (${esc(r.type)})`)
                        .join(', ') || '';

                    const tags = d.tags?.map(t => `<span class="tag">${esc(t.name)}</span>`).join('') || '';

                    list.insertAdjacentHTML('beforeend', `
                        <div class="recording-card">
                            <h3>
                                <a href="https://musicbrainz.org/recording/${esc(d.id)}" target="_blank" rel="noopener">${esc(d.title)}</a>
                                ${isVideo ? '<span class="video-label">[music video]</span>' : ''}
                                ${disambig}
                            </h3>
                            ${badges      ? `<p>${badges}</p>`                                              : ''}
                            ${aliases     ? `<p><strong>also known as</strong>${aliases}</p>`               : ''}
                            <p><strong>artist(s)</strong>${artists}</p>
                            ${works       ? `<p><strong>work(s)</strong>${works}</p>`                       : ''}
                            ${recRelsHtml ? `<p><strong>related recordings</strong>${recRelsHtml}</p>`      : ''}
                            ${performers  ? `<p><strong>performers</strong>${performers}</p>`               : ''}
                            ${production  ? `<p><strong>production</strong>${production}</p>`               : ''}
                            ${otherPlaces ? `<p><strong>other places</strong>${otherPlaces}</p>`            : ''}
                            <p><strong>first release</strong>${firstRel}</p>
                            <p><strong>length</strong>${length}</p>
                            <p><strong>isrc</strong>${isrcs}</p>
                            ${releases    ? `<p><strong>appears on</strong>${releases}</p>`                 : ''}
                            ${tags        ? `<div style="margin-top:8px"><strong style="font-family:'Press Start 2P',monospace;font-size:6px;color:var(--dim);letter-spacing:0.08em;margin-right:6px;">tags</strong>${tags}</div>` : ''}
                        </div>
                    `);

                    completed++;
                } catch {
                    list.insertAdjacentHTML('beforeend', `
                        <div class="recording-card">
                            <h3>${esc(fallbackTitle)}</h3>
                            <p class="error-msg">failed to load — <a href="https://musicbrainz.org/recording/${esc(recId)}" target="_blank" rel="noopener">view on MusicBrainz</a></p>
                        </div>
                    `);
                    failed++;
                    completed++;
                }

                statusEl.textContent = `loading details… ${completed} of ${unique.length}${failed ? ` (${failed} failed)` : ''}`;
                if (i < unique.length - 1) await delay(1000);
            }

            statusEl.textContent = `all ${unique.length} recordings loaded!${failed ? ` (${failed} failed — try refreshing)` : ''}`;

        } catch (err) {
            statusEl.textContent = 'error loading recordings — check your connection and refresh.';
    console.error('place_recordings.js fetch failed:', err);
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
