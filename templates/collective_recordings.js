/* ═══════════════════════════════════════════════
   magmacrunch media — collective recordings template
   templates/collective_recordings.js

   Multi-artist variant of artist_recordings.js.
   Fetches recordings from all IDs in COLLECTIVE_CONFIG.ids,
   deduplicates, and renders.

   Requires window.COLLECTIVE_CONFIG (defined in stub) = {
     ids:       string[] — MusicBrainz artist IDs
     name:      string   — full collective name
     abbr:      string   — short label (e.g. "FLDB")
     accent:    string   — CSS var name without --
     backColor: string   — nav-card class for ← back
     siblings:  string[] — sibling page names
     depth:     string   — path prefix to site root
     slug:      string   — cache key (optional)
     ticker:    string[] — extra ticker phrases (optional)

     // Theme overrides (optional):
     cssVarPrefix:  string — CSS var prefix (e.g. 'thld' for var(--thld-cyan))
     accentRgbMap:  object — custom RGB values per color key
     mutedColorVar: string — muted text color CSS var
   }
   ═══════════════════════════════════════════════ */

(function () {
    const C = window.COLLECTIVE_CONFIG;
    if (!C || !C.ids?.length) { console.error('collective_recordings.js: window.COLLECTIVE_CONFIG missing or has no ids'); return; }

    const d      = C.depth  || '../../../';
    const accent = C.accent || 'cyan';
    const prefix = C.cssVarPrefix ? C.cssVarPrefix + '-' : '';

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
        'music-videos': 'c-music-videos',
        games:       'c-games',
    };

    const BACK_COLOR_VAR = {
        'c-green':  'var(--green)',
        'c-cyan':   'var(--cyan)',
        'c-rose':   'var(--rose)',
        'c-yellow': 'var(--yellow)',
        'c-orange': 'var(--orange)',
        'c-purple': 'var(--purple)',
        'c-slate':  'var(--slate)',
        'c-blue':   'var(--blue)',
        'c-magenta':'var(--magenta)',
        'c-darkgreen': 'var(--darkgreen)',
        'c-teal':   'var(--jt-teal)',
        'c-brick':  'var(--jt-brick)',
        'c-deep':   'var(--jt-deep)',
        'c-gold':   'var(--jt-gold)',
        'c-sky':    'var(--jt-steel)',
    };
    const backColorVar = BACK_COLOR_VAR[C.backColor] || 'var(--orange)';

    const DEFAULT_ACCENT_RGB = {
        green:  '57,255,110',
        cyan:   '0,245,255',
        rose:   '255,61,110',
        yellow: '255,224,58',
        orange: '255,124,31',
        purple: '196,95,255',
        slate:  '136,153,170',
        blue:    '70,120,255',
        magenta:'255,45,120',
        teal:   '26,122,94',
        brick:  '168,72,48',
        deep:   '122,48,16',
        gold:   '245,200,66',
        sky:    '96,104,120',
        'green-light':   '128,168,88',
        'arc-blue-light': '88,152,216',
        'arc-red':        '168,40,32',
        'arc-yellow':     '216,208,64',
        'nature-glow':    '106,154,122',
        '4b-chart':       '168,216,72',
    };
    const ACCENT_RGB = C.accentRgbMap ? { ...DEFAULT_ACCENT_RGB, ...C.accentRgbMap } : DEFAULT_ACCENT_RGB;
    const accentRgb = ACCENT_RGB[accent] || '0,245,255';
    const accentVar = `var(--${prefix}${accent})`;
    const mutedVar  = C.mutedColorVar || 'var(--dim)';

    // ── 1. INJECT PAGE-SPECIFIC STYLES ──
    const style = document.createElement('style');
    style.textContent = `
        .breadcrumb a { color: var(--dim); text-decoration: none; transition: color 0.15s; }
        .breadcrumb a:hover { color: ${accentVar}; }
        .breadcrumb .sep { margin: 0 8px; color: ${accentVar}; opacity: 0.7; }
        .breadcrumb .current { color: ${accentVar}; }

        .page-header { width: 100%; max-width: 960px; margin-bottom: 32px; animation: fadeUp 0.5s ease both; }
        .artist-label { font-family: 'Press Start 2P', monospace; font-size: 10px; color: ${backColorVar}; letter-spacing: 0.2em; margin-bottom: 8px; opacity: 0.8; }
        .page-title { font-family: 'Press Start 2P', monospace; font-size: clamp(12px, 2.5vw, 20px); color: ${accentVar}; letter-spacing: 0.08em; line-height: 1.6; margin-bottom: 20px; text-shadow: 0 0 20px rgba(${accentRgb},0.45); }
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
        .disambiguation { font-family: 'Courier Prime', monospace; font-size: 12px; color: ${mutedVar}; font-style: italic; }

        .recording-card p { font-family: 'Courier Prime', monospace; font-size: 14px; color: var(--white); opacity: 0.8; margin-bottom: 5px; line-height: 1.5; }
        .recording-card p strong { font-family: 'Press Start 2P', monospace; font-size: 8px; color: var(--dim); letter-spacing: 0.08em; margin-right: 6px; }
        .recording-card a { color: ${accentVar}; text-decoration: none; }
        .recording-card a:hover { color: var(--white); }

        .tag { display: inline-block; background: #1a1a2e; border: 1px solid #2a2a4a; padding: 2px 7px; margin: 2px; font-family: 'Courier Prime', monospace; font-size: 11px; color: ${mutedVar}; }
        .hidden-video { display: none; }
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
            <a href="${d}archive/">archive</a>
            <span class="sep">›</span>
            <a href="${d}archive/by-artist/">by artist</a>
            <span class="sep">›</span>
            <a href="./">${C.abbr.toLowerCase()}</a>
        `;
    }

    const artistLabelEl = document.getElementById('artist-label');
    if (artistLabelEl) artistLabelEl.textContent = `// ${C.name} //`;

    const subNavEl = document.getElementById('sub-nav');
    if (subNavEl) {
        subNavEl.innerHTML = [
            `<a href="./" class="nav-card ${C.backColor || 'c-back'}">← back</a>`,
            ...(C.siblings || []).filter(s => s !== 'recordings').map(s => {
                const label = s.replace(/-/g, ' ');
                return `<a href="${s}.html" class="nav-card ${COLOR_MAP[s] || 'c-cyan'}">${label}</a>`;
            })
        ].join('\n');
    }

    // ══════════════════════════════════════════
    // 3. API LOGIC
    // ══════════════════════════════════════════
    const delay = ms => new Promise(r => setTimeout(r, ms));

    let _cache = null;
    let apiCallsMade = false;
    async function loadCache() {
        if (!C.slug) return;
        try {
            const r = await fetch(d + 'archive/_cache/collectives/' + C.slug + '.json');
            if (r.ok) { const j = await r.json(); if (j.fetchedAt) _cache = j; }
        } catch {}
    }
    async function cached(path, cacheData) {
        if (cacheData !== undefined) return cacheData;
        apiCallsMade = true;
        return fetchWithRetry('https://musicbrainz.org/ws/2/' + path);
    }

    async function fetchWithRetry(url, retries = 4) {
        if (window.__mcPageAborted) throw new Error('page navigated away');
        for (let i = 0; i < retries; i++) {
            let res;
            try { res = await fetch(url); }
            catch (err) { if (i === retries - 1) throw err; await delay(1500 * (i + 1)); continue; }
            if (res.status === 429 || res.status === 503) { await delay(2500 * (i + 1)); continue; }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        }
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
        return `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
    }

    async function fetchAllForArtist(artistId, statusEl) {
        let all = [], offset = 0, hasMore = true;
        while (hasMore) {
            try {
                const data = await fetchWithRetry(`https://musicbrainz.org/ws/2/recording?artist=${artistId}&limit=100&offset=${offset}&fmt=json`);
                all = all.concat(data.recordings || []);
                statusEl.textContent = `fetching recordings… ${all.length} found (${artistId.slice(0, 8)}…)`;
                if ((data.recordings || []).length === 100) { offset += 100; await delay(1000); }
                else hasMore = false;
            } catch { hasMore = false; }
        }
        return all;
    }

    (async () => {
        await loadCache();
        const statusEl = document.getElementById('status-bar');
        const countBar = document.getElementById('count-bar');
        const list     = document.getElementById('recordings-list');

        try {
            let all;
            if (_cache?.recordings?.list) {
                all = _cache.recordings.list;
                statusEl.textContent = `loaded ${all.length} recordings from cache`;
            } else {
                statusEl.textContent = 'fetching recordings for all members…';
                const perArtist = await Promise.all(C.ids.map(id => fetchAllForArtist(id, statusEl)));
                const seen = new Set();
                all = [];
                for (const batch of perArtist) {
                    for (const rec of batch) {
                        if (!seen.has(rec.id)) { seen.add(rec.id); all.push(rec); }
                    }
                }
            }

            const total = all.length;
            if (total === 0) { statusEl.textContent = 'no recordings found.'; return; }

            all.sort(() => Math.random() - 0.5);
            countBar.textContent = `found ${total} recording${total !== 1 ? 's' : ''} (shuffled):`;

            let completed = 0, failed = 0;

            for (let i = 0; i < all.length; i++) {
                const rec = all[i];
                try {
                    const det = await cached(`recording/${rec.id}?inc=artists+isrcs+tags+artist-rels+place-rels+releases+work-rels+aliases+recording-rels&fmt=json`, _cache?.recordings?.details?.[rec.id]);

                    const artists = det['artist-credit']?.map(ac =>
                        archiveLink(ac.artist?.id, ac.name, 'artist')
                    ).join(', ') || 'various artists';

                    const isVideo      = det.video === true;
                    const length       = fmtLength(det.length);
                    const isrcs        = det.isrcs?.map(esc).join(', ') || 'n/a';
                    const firstRelease = esc(det['first-release-date'] || 'unknown');
                    const disambig     = det.disambiguation ? `<span class="disambiguation"> (${esc(det.disambiguation)})</span>` : '';

                    const aliases = det.aliases
                        ?.map(a => a.name).filter(n => n !== det.title).map(esc).join(', ') || '';

                    const works = det.relations
                        ?.filter(r => r['target-type'] === 'work' && r.type === 'performance')
                        .map(r => `<a href="https://musicbrainz.org/work/${esc(r.work?.id)}" target="_blank" rel="noopener">${esc(r.work?.title)}</a>${r.attributes?.includes('cover') ? ' [cover]' : ''}`)
                        .join(', ') || '';

                    const releases = det.releases?.map(r => {
                        const year = r.date ? ` (${esc(r.date.substring(0, 4))})` : '';
                        return `<a href="https://musicbrainz.org/release/${esc(r.id)}" target="_blank" rel="noopener">${esc(r.title)}</a>${year}`;
                    }).join(', ') || '';

                    const recRels = det.relations
                        ?.filter(r => r['target-type'] === 'recording')
                        .map(r => {
                            let type = r.type;
                            if (r.type === 'remix')   type = r.direction === 'backward' ? 'remix of'         : 'has remix';
                            if (r.type === 'live')    type = r.direction === 'backward' ? 'live version of'  : 'has live version';
                            if (r.type === 'cover')   type = r.direction === 'backward' ? 'cover of'         : 'has cover';
                            if (r.type === 'edit of') type = r.direction === 'backward' ? 'edit of'          : 'has edit';
                            if (r.type === 'video')   type = r.direction === 'backward' ? 'music video for'  : 'has music video';
                            const year = r.recording?.['first-release-date']
                                ? ` (${esc(r.recording['first-release-date'].substring(0, 4))})` : '';
                            return `${esc(type)}: <a href="https://musicbrainz.org/recording/${esc(r.recording?.id)}" target="_blank" rel="noopener">${esc(r.recording?.title)}</a>${year}`;
                        }).join(', ') || '';

                    const perfMap = new Map();
                    det.relations?.filter(r => r['target-type'] === 'artist' && ['vocal', 'instrument', 'performer'].includes(r.type))
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

                    const production = det.relations
                        ?.filter(r => r['target-type'] === 'artist' && ['engineer', 'mix', 'producer', 'recording', 'mastering'].includes(r.type))
                        .map(r => archiveLink(r.artist?.id, r.artist?.name, 'artist') + ` (${esc(r.type)})`)
                        .join(', ') || '';

                    const recordedAt = det.relations
                        ?.filter(r => r['target-type'] === 'place' && r.type === 'recorded at')
                        .map(r => archiveLink(r.place?.id, r.place?.name, 'place') + (r.begin ? ` (${esc(r.begin)})` : ''))
                        .join(', ') || '';

                    const tags = det.tags?.map(t => `<span class="tag">${esc(t.name)}</span>`).join('') || '';

                    list.insertAdjacentHTML('beforeend', `
                        <div class="recording-card${isVideo ? ' hidden-video' : ''}">
                            <h3>
                                <a href="https://musicbrainz.org/recording/${esc(det.id)}" target="_blank" rel="noopener">${esc(det.title)}</a>
                                ${isVideo ? '<span class="video-label">[music video]</span>' : ''}
                                ${disambig}
                            </h3>
                            ${aliases    ? `<p><strong>also known as</strong>${aliases}</p>`           : ''}
                            <p><strong>artist(s)</strong>${artists}</p>
                            ${works      ? `<p><strong>work(s)</strong>${works}</p>`                   : ''}
                            ${recRels    ? `<p><strong>related recordings</strong>${recRels}</p>`      : ''}
                            ${performers ? `<p><strong>performers</strong>${performers}</p>`           : ''}
                            ${production ? `<p><strong>production</strong>${production}</p>`          : ''}
                            ${recordedAt ? `<p><strong>recorded at</strong>${recordedAt}</p>`         : ''}
                            <p><strong>first release</strong>${firstRelease}</p>
                            <p><strong>length</strong>${length}</p>
                            <p><strong>isrc</strong>${isrcs}</p>
                            ${releases   ? `<p><strong>appears on</strong>${releases}</p>`            : ''}
                            ${tags       ? `<div style="margin-top:8px"><strong style="font-family:'Press Start 2P',monospace;font-size:6px;color:${mutedVar};letter-spacing:0.08em;margin-right:6px;">tags</strong>${tags}</div>` : ''}
                        </div>
                    `);

                    completed++;
                } catch {
                    list.insertAdjacentHTML('beforeend', `
                        <div class="recording-card">
                            <h3>${esc(rec.title || 'unknown')}</h3>
                            <p class="error-msg">failed to load — <a href="https://musicbrainz.org/recording/${esc(rec.id)}" target="_blank" rel="noopener">view on MusicBrainz</a></p>
                        </div>
                    `);
                    failed++;
                    completed++;
                }
                statusEl.textContent = `loading details… ${completed} of ${total}${failed ? ` (${failed} failed)` : ''}`;
                if (apiCallsMade && i < all.length - 1) await delay(1000);
            }

            statusEl.textContent = `all ${total} recordings loaded!${failed ? ` (${failed} failed — try refreshing)` : ''}`;

        } catch (err) {
            statusEl.textContent = 'error loading recordings — check your connection and refresh.';
            console.error('collective_recordings.js fetch failed:', err);
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
