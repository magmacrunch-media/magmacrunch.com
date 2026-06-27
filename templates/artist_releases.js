/* ═══════════════════════════════════════════════
   magmacrunch media — releases page template
   templates/artist_releases.js

   The stub HTML file provides all static structure
   (nav, main skeleton, footer). This script handles:
     1. Injecting page-specific styles (accent color)
     2. Populating dynamic stub elements (ticker,
        breadcrumb, sub-nav, artist label)
     3. Fetching and rendering releases from MusicBrainz

   Requires window.ARTIST_CONFIG (defined in stub) = {
     id:        string   — MusicBrainz artist ID
     name:      string   — full artist name
     abbr:      string   — short label (e.g. "THLD")
     accent:    string   — CSS var name without --
                           (releases pages are typically "rose")
     backColor: string   — nav-card class for ← back
     siblings:  string[] — sibling page names
     depth:     string   — path prefix to site root
     ticker:    string[] — extra ticker phrases
   }
   ═══════════════════════════════════════════════ */

(function () {
    const C = window.ARTIST_CONFIG;
    if (!C) { console.error('artist_releases.js: window.ARTIST_CONFIG is not defined'); return; }

    const d      = C.depth  || '../../../';
    const accent = C.accent || 'rose';

const COLOR_MAP = {
        about:       'c-about',
        photography: 'c-photography',
        events:      'c-events',
        recordings:  'c-recordings',
        releases:    'c-releases',
        works:       'c-works',
        'music-videos': 'c-events',
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
        teal:   '26,122,94',
        brick:  '168,72,48',
        deep:   '122,48,16',
        gold:   '245,200,66',
        sky:    '96,104,120',
    };
    const accentRgb = ACCENT_RGB[accent] || '255,61,110';
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
        .disambiguation { font-family: 'Courier Prime', monospace; font-size: 11px; color: var(--dim); font-style: italic; }
        .release-info p { font-family: 'Courier Prime', monospace; font-size: 12px; color: var(--white); opacity: 0.8; margin-bottom: 5px; line-height: 1.5; }
        .release-info p strong { font-family: 'Press Start 2P', monospace; font-size: 8px; color: var(--dim); letter-spacing: 0.08em; margin-right: 6px; }
        .release-info a { color: ${accentVar}; text-decoration: none; }
        .release-info a:hover { color: var(--white); }

        .tag { display: inline-block; background: #1a1a2e; border: 1px solid #2a2a4a; padding: 2px 7px; margin: 2px; font-family: 'Courier Prime', monospace; font-size: 11px; color: var(--dim); }
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
            <a href="${d}archive/index.html">archive</a>
            <span class="sep">›</span>
            <a href="${d}archive/by-artist/index.html">by artist</a>
            <span class="sep">›</span>
            <a href="index.html">${C.abbr.toLowerCase()}</a>
        `;
    }

    const artistLabelEl = document.getElementById('artist-label');
    if (artistLabelEl) artistLabelEl.textContent = `// ${C.name} //`;

    const subNavEl = document.getElementById('sub-nav');
    if (subNavEl) {
        subNavEl.innerHTML = [
            `<a href="index.html" class="nav-card c-back">← back</a>`,
            ...(C.siblings || []).filter(s => s !== 'releases').map(s => {
                const label = s.replace(/-/g, ' ');
                return `<a href="${s}.html" class="nav-card ${s === 'network' ? 'c-teal' : (COLOR_MAP[s] || 'c-cyan')}">${label}</a>`;
            })
        ].join('\n');
    }

    // ══════════════════════════════════════════
    // 3. API LOGIC
    // ══════════════════════════════════════════
    const artistId = C.id;
    const delay    = ms => new Promise(r => setTimeout(r, ms));

    // ── CACHE ──
    let _cache = null;
    async function loadCache() {
        if (window.__MB_CACHE) { _cache = window.__MB_CACHE; return; }
        try {
            const r = await fetch(d + 'archive/_cache/artists/' + artistId + '.json');
            if (r.ok) { const j = await r.json(); if (j.fetchedAt) _cache = j; }
        } catch {}
    }
    async function cached(path, cacheData) {
        if (cacheData !== undefined) return cacheData;
        return fetchWithRetry('https://musicbrainz.org/ws/2/' + path);
    }
    await loadCache();

    // Escape HTML special chars to safely insert API text into innerHTML
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
            try {
                res = await fetch(url);
            } catch (err) {
                if (i === retries - 1) throw err;
                await delay(1000 * Math.pow(2, i));
                continue;
            }
            if (res.status === 429 || res.status === 503) {
                const wait = 1000 * Math.pow(2, i);
                await delay(wait);
                continue;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        }
        throw new Error(`fetchWithRetry failed after ${retries} attempts: ${url}`);
    }

    (async () => {
        const statusEl = document.getElementById('status-bar');
        const countBar = document.getElementById('count-bar');
        const list     = document.getElementById('releases-list');

        try {
            // ── fetch all release stubs with pagination ──
            let allReleases = [], offset = 0, totalCount = 0;
            const cachedList = _cache?.subpages?.releases?.list;
            if (cachedList) {
                totalCount = cachedList['release-count'];
                allReleases = cachedList.releases || [];
                statusEl.textContent = `loaded ${allReleases.length} releases from cache`;
            } else {
                do {
                    const data = await fetchWithRetry(`https://musicbrainz.org/ws/2/release?artist=${artistId}&limit=100&offset=${offset}&fmt=json`);
                    totalCount  = data['release-count'];
                    allReleases = allReleases.concat(data.releases);
                    offset += 100;
                    statusEl.textContent = `fetching releases… ${allReleases.length} of ${totalCount}`;
                    if (offset < totalCount) await delay(1000);
                } while (offset < totalCount);
            }

            if (totalCount === 0) { statusEl.textContent = 'no releases found.'; return; }

            // sort newest first
            allReleases.sort((a, b) => (b.date || '0000').localeCompare(a.date || '0000'));
            countBar.textContent = `found ${totalCount} release${totalCount !== 1 ? 's' : ''} (newest first):`;

            // ── fetch full details one at a time, 1000ms between each ──
            let completed = 0, failed = 0;

            for (let i = 0; i < allReleases.length; i++) {
                const rel = allReleases[i];
                try {
                    const d = await cached(`release/${rel.id}?inc=artists+labels+recordings+release-groups&fmt=json`, _cache?.subpages?.releases?.details?.[rel.id]);

                    const artists     = d['artist-credit']?.map(ac => esc(ac.name)).join(', ') || 'various artists';
                    const format      = esc(d.media?.[0]?.format?.toLowerCase() || 'n/a');
                    const trackCount  = d.media?.[0]?.['track-count'] ?? 'n/a';
                    const releaseType = esc(d['release-group']?.['primary-type']?.toLowerCase() || 'unknown');
                    const disambig    = d.disambiguation ? `<span class="disambiguation"> (${esc(d.disambiguation)})</span>` : '';

                    const labelInfo = d['label-info'] || [];
                    const hasNonMagma = labelInfo.some(li => (li.label?.name || '').toLowerCase() !== 'magmacrunch media');
                    const catalogLabel = hasNonMagma ? 'label & catalog number' : 'catalog number';
                    const catalogNumber = labelInfo.map(li => {
                        const lName = li.label?.name || 'unknown';
                        const cat   = esc(li['catalog-number'] || 'n/a');
                        return lName.toLowerCase() === 'magmacrunch media' ? cat : `${esc(lName)}: ${cat}`;
                    }).join(', ') || 'n/a';

                    // fetch tags from the release-group
                    let tags = '';
                    if (d['release-group']?.id) {
                        try {
                            const rg = await cached(`release-group/${d['release-group'].id}?inc=tags&fmt=json`, _cache?.subpages?.releases?.releaseGroups?.[d['release-group'].id]);
                            tags = rg.tags?.map(t => `<span class="tag">${esc(t.name)}</span>`).join('') || '';
                            if (!_cache?.subpages?.releases?.releaseGroups?.[d['release-group'].id]) await delay(500);
                        } catch {}
                    }

                    list.insertAdjacentHTML('beforeend', `
                        <div class="release-card">
                            <div class="album-art">
                                <img src="https://coverartarchive.org/release/${esc(rel.id)}/front-250" alt="" loading="lazy" onerror="this.style.display='none'">
                            </div>
                            <div class="release-info">
                                <h3>
                                    <a href="https://musicbrainz.org/release/${esc(d.id)}" target="_blank" rel="noopener">${esc(d.title)}</a>
                                    ${disambig}
                                </h3>
                                <p><strong>artist(s)</strong>${artists}</p>
                                <p><strong>type</strong>${releaseType}</p>
                                <p><strong>release date</strong>${esc(d.date || 'unknown')}</p>
                                <p><strong>${catalogLabel}</strong>${catalogNumber}</p>
                                <p><strong>format</strong>${format}</p>
                                <p><strong>tracks</strong>${trackCount}</p>
                                <p><strong>barcode</strong>${esc(d.barcode || 'n/a')}</p>
                                <p><strong>status</strong>${esc(d.status?.toLowerCase() || 'n/a')}</p>
                                ${tags ? `<div style="margin-top:8px"><strong style="font-family:'Press Start 2P',monospace;font-size:6px;color:var(--dim);letter-spacing:0.08em;margin-right:6px;">tags</strong>${tags}</div>` : ''}
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
                statusEl.textContent = `loading details… ${completed} of ${totalCount}${failed ? ` (${failed} failed)` : ''}`;
                if (i < allReleases.length - 1) await delay(1000);
            }

            statusEl.textContent = `all ${totalCount} releases loaded!${failed ? ` (${failed} failed — try refreshing)` : ''}`;

        } catch (err) {
            statusEl.textContent = 'error loading releases — check your connection and refresh.';
            console.error('artist_releases.js fetch failed:', err);
        }
    })();
})();
