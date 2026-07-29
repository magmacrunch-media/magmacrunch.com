/* ═══════════════════════════════════════════════
   magmacrunch media — collective releases template
   templates/collective_releases.js

   Multi-artist variant of artist_releases.js.
   Fetches releases from all IDs in COLLECTIVE_CONFIG.ids,
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
     cssVarPrefix:  string — CSS var prefix (e.g. 'thld' for var(--thld-rose))
     accentRgbMap:  object — custom RGB values per color key
     mutedColorVar: string — muted text color CSS var
   }
   ═══════════════════════════════════════════════ */

(function () {
    const C = window.COLLECTIVE_CONFIG;
    const __navIdAtStart = window.__mcNavId;
    if (!C || !C.ids?.length) { console.error('collective_releases.js: window.COLLECTIVE_CONFIG missing or has no ids'); return; }

    const d      = C.depth  || '../../../';
    const accent = C.accent || 'rose';
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
        links:       'c-links',
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
    const accentRgb = ACCENT_RGB[accent] || '255,61,110';
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

        .release-card { display: flex; gap: 18px; border: 1px solid #1e1e2e; background: var(--deep); padding: 0; margin-bottom: 14px; transition: border-color 0.15s; }
        .release-card:hover { border-color: ${accentVar}; }

        .album-art { width: 120px; min-width: 120px; height: 120px; background: #0d0d18; border-right: 1px solid #1e1e2e; flex-shrink: 0; overflow: hidden; }
        .album-art img { width: 100%; height: 100%; object-fit: cover; display: block; }

        .release-info { padding: 16px 18px 16px 0; flex: 1; }
        .release-info h3 { font-family: 'Press Start 2P', monospace; font-size: 12px; color: var(--white); letter-spacing: 0.05em; margin-bottom: 12px; line-height: 1.7; }
        .release-info h3 a { color: ${accentVar}; text-decoration: none; }
        .release-info h3 a:hover { color: var(--yellow); }
        .disambiguation { font-family: 'Courier Prime', monospace; font-size: 11px; color: ${mutedVar}; font-style: italic; }
        .release-info p { font-family: 'Courier Prime', monospace; font-size: 12px; color: var(--white); opacity: 0.8; margin-bottom: 5px; line-height: 1.5; }
        .release-info p strong { font-family: 'Press Start 2P', monospace; font-size: 8px; color: var(--dim); letter-spacing: 0.08em; margin-right: 6px; }
        .release-info a { color: ${accentVar}; text-decoration: none; }
        .release-info a:hover { color: var(--white); }

        .tag { display: inline-block; background: #1a1a2e; border: 1px solid #2a2a4a; padding: 2px 7px; margin: 2px; font-family: 'Courier Prime', monospace; font-size: 11px; color: ${mutedVar}; }
        .error-msg { color: var(--rose); opacity: 0.7; }

        @media (max-width: 500px) { .album-art { width: 72px; min-width: 72px; height: 72px; } }
    `;
    document.head.appendChild(style);

    // ── 2. POPULATE DYNAMIC STUB ELEMENTS ──

    const tickerPhrases = [C.name, 'releases', ...(C.ticker || [])];
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
            ...(C.siblings || []).filter(s => s !== 'releases').map(s => {
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

    function esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    async function fetchWithRetry(url, retries = 4) {
        if (window.__mcNavId !== __navIdAtStart) throw new Error('page navigated away');
        for (let i = 0; i < retries; i++) {
            let res;
            try { res = await fetch(url); }
            catch (err) { if (i === retries - 1) throw err; await delay(1000 * Math.pow(2, i)); continue; }
            if (res.status === 429 || res.status === 503) { await delay(1000 * Math.pow(2, i)); continue; }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        }
        throw new Error(`fetchWithRetry failed: ${url}`);
    }

    async function fetchAllReleasesForArtist(artistId) {
        let all = [], offset = 0, total = 0;
        do {
            const data = await fetchWithRetry(`https://musicbrainz.org/ws/2/release?artist=${artistId}&limit=100&offset=${offset}&fmt=json`);
            total = data['release-count'];
            all = all.concat(data.releases);
            offset += 100;
            if (offset < total) await delay(1000);
        } while (offset < total);
        return all;
    }

    (async () => {
        await loadCache();
        const statusEl = document.getElementById('status-bar');
        const countBar = document.getElementById('count-bar');
        const list     = document.getElementById('releases-list');

        try {
            let all;
            if (_cache?.releases?.list) {
                all = _cache.releases.list;
                statusEl.textContent = `loaded ${all.length} releases from cache`;
            } else {
                statusEl.textContent = 'fetching releases for all members…';
                const perArtist = await Promise.all(C.ids.map(id => fetchAllReleasesForArtist(id)));
                const seen = new Set();
                all = [];
                for (const batch of perArtist) {
                    for (const rel of batch) {
                        if (!seen.has(rel.id)) { seen.add(rel.id); all.push(rel); }
                    }
                }
            }

            if (all.length === 0) { statusEl.textContent = 'no releases found.'; return; }

            all.sort((a, b) => (b.date || '0000').localeCompare(a.date || '0000'));
            const total = all.length;
            countBar.textContent = `found ${total} release${total !== 1 ? 's' : ''} (newest first):`;

            let completed = 0, failed = 0;

            for (let i = 0; i < all.length; i++) {
                const rel = all[i];
                try {
                    const det = await cached(`release/${rel.id}?inc=artists+labels+recordings+release-groups&fmt=json`, _cache?.releases?.details?.[rel.id]);

                    const artists     = det['artist-credit']?.map(ac => archiveLink(ac.artist?.id, ac.name, 'artist')).join(', ') || 'various artists';
                    const format      = esc(det.media?.[0]?.format?.toLowerCase() || 'n/a');
                    const trackCount  = det.media?.[0]?.['track-count'] ?? 'n/a';
                    const releaseType = esc(det['release-group']?.['primary-type']?.toLowerCase() || 'unknown');
                    const disambig    = det.disambiguation ? `<span class="disambiguation"> (${esc(det.disambiguation)})</span>` : '';

                    const labelInfo = det['label-info'] || [];
                    const hasNonMagma = labelInfo.some(li => (li.label?.name || '').toLowerCase() !== 'magmacrunch media');
                    const catalogLabel = hasNonMagma ? 'label & catalog number' : 'catalog number';
                    const catalogNumber = labelInfo.map(li => {
                        const lName = li.label?.name || 'unknown';
                        const cat   = esc(li['catalog-number'] || 'n/a');
                        return lName.toLowerCase() === 'magmacrunch media' ? cat : `${esc(lName)}: ${cat}`;
                    }).join(', ') || 'n/a';

                    let tags = '';
                    if (det['release-group']?.id) {
                        const rgId = det['release-group'].id;
                        const cachedRg = _cache?.releases?.releaseGroups?.[rgId];
                        if (cachedRg) {
                            tags = cachedRg.tags?.map(t => `<span class="tag">${esc(t.name)}</span>`).join('') || '';
                        } else {
                            try {
                                const rg = await cached(`release-group/${rgId}?inc=tags&fmt=json`);
                                tags = rg.tags?.map(t => `<span class="tag">${esc(t.name)}</span>`).join('') || '';
                                if (!_cache?.releases?.releaseGroups?.[rgId]) await delay(500);
                            } catch {}
                        }
                    }

                    list.insertAdjacentHTML('beforeend', `
                        <div class="release-card">
                            <div class="album-art">
                                <img src="https://coverartarchive.org/release/${esc(rel.id)}/front-250" alt="" loading="lazy" onerror="this.style.display='none'">
                            </div>
                            <div class="release-info">
                                <h3>
                                    <a href="https://musicbrainz.org/release/${esc(det.id)}" target="_blank" rel="noopener">${esc(det.title)}</a>
                                    ${disambig}
                                </h3>
                                <p><strong>artist(s)</strong>${artists}</p>
                                <p><strong>type</strong>${releaseType}</p>
                                <p><strong>release date</strong>${esc(det.date || 'unknown')}</p>
                                <p><strong>${catalogLabel}</strong>${catalogNumber}</p>
                                <p><strong>format</strong>${format}</p>
                                <p><strong>tracks</strong>${trackCount}</p>
                                <p><strong>barcode</strong>${esc(det.barcode || 'n/a')}</p>
                                <p><strong>status</strong>${esc(det.status?.toLowerCase() || 'n/a')}</p>
                                ${tags ? `<div style="margin-top:8px"><strong style="font-family:'Press Start 2P',monospace;font-size:6px;color:${mutedVar};letter-spacing:0.08em;margin-right:6px;">tags</strong>${tags}</div>` : ''}
                            </div>
                        </div>
                    `);

                    completed++;
                } catch {
                    list.insertAdjacentHTML('beforeend', `
                        <div class="release-card">
                            <div class="album-art"></div>
                            <div class="release-info">
                                <h3>${esc(rel.title || 'unknown')}</h3>
                                <p class="error-msg">failed to load — <a href="https://musicbrainz.org/release/${esc(rel.id)}" target="_blank" rel="noopener">view on MusicBrainz</a></p>
                            </div>
                        </div>
                    `);
                    failed++;
                    completed++;
                }
                statusEl.textContent = `loading details… ${completed} of ${total}${failed ? ` (${failed} failed)` : ''}`;
                if (apiCallsMade && i < all.length - 1) await delay(1000);
            }

            statusEl.textContent = `all ${total} releases loaded!${failed ? ` (${failed} failed — try refreshing)` : ''}`;

        } catch (err) {
            statusEl.textContent = 'error loading releases — check your connection and refresh.';
            console.error('collective_releases.js fetch failed:', err);
        }

        // MusicBrainz attribution
        (function() {
            if (window.__mcNavId !== __navIdAtStart) return;
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
