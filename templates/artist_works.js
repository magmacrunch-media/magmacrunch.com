/* ═══════════════════════════════════════════════
   magmacrunch media — works page template
   templates/artist_works.js

   The stub HTML file provides all static structure
   (nav, main skeleton, footer). This script handles:
     1. Injecting page-specific styles (accent color)
     2. Populating dynamic stub elements (ticker,
        breadcrumb, sub-nav, artist label)
     3. Fetching and rendering works from MusicBrainz

   Requires window.ARTIST_CONFIG (defined in stub) = {
     id:        string   — MusicBrainz artist ID
     name:      string   — full artist name
     abbr:      string   — short label (e.g. "THLD")
     accent:    string   — CSS var name without --
                           (works pages are typically "yellow")
     backColor: string   — nav-card class for ← back
     siblings:  string[] — sibling page names
     depth:     string   — path prefix to site root
     ticker:    string[] — extra ticker phrases
   }
   ═══════════════════════════════════════════════ */

(function () {
    const C = window.ARTIST_CONFIG;
    if (!C) { console.error('artist_works.js: window.ARTIST_CONFIG is not defined'); return; }

    const d          = C.depth      || '../../../';
    const accent     = C.accent     || 'yellow';
    const lyricsPath = C.lyricsPath || '';
    const lyricsMap  = C.lyricsMap  || {};

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
        'music-videos': 'c-events',
        games:       'c-green',
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
    const accentRgb = ACCENT_RGB[accent] || '255,224,58';
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

        .work-card { border: 1px solid #1e1e2e; background: var(--deep); padding: 18px 20px; margin-bottom: 12px; transition: border-color 0.15s; }
        .work-card:hover { border-color: ${accentVar}; }

        .work-card h3 { font-family: 'Press Start 2P', monospace; font-size: 8px; color: var(--white); letter-spacing: 0.05em; margin-bottom: 12px; line-height: 1.7; }
        .work-card h3 a { color: ${accentVar}; text-decoration: none; }
        .work-card h3 a:hover { color: var(--white); }

        .work-type { font-family: 'Courier Prime', monospace; font-size: 11px; color: var(--rose); font-style: italic; margin-left: 6px; }

        .work-card p { font-family: 'Courier Prime', monospace; font-size: 12px; color: var(--white); opacity: 0.8; margin-bottom: 5px; line-height: 1.5; }
        .work-card p strong { font-family: 'Press Start 2P', monospace; font-size: 8px; color: var(--dim); letter-spacing: 0.08em; margin-right: 6px; }
        .work-card a { color: ${accentVar}; text-decoration: none; }
        .work-card a:hover { color: var(--white); }

        .alternate-names { font-family: 'Courier Prime', monospace; font-size: 11px; color: var(--dim); font-style: italic; }

        .rec-label { display: inline-block; padding: 1px 5px; margin-left: 4px; font-family: 'Press Start 2P', monospace; font-size: 8px; letter-spacing: 0.05em; }
        .rec-label.live    { background: var(--rose);   color: var(--black); }
        .rec-label.partial { background: var(--orange); color: var(--black); }
        .rec-label.video   { background: ${accentVar};   color: var(--black); }

        .tag { display: inline-block; background: #1a1a2e; border: 1px solid #2a2a4a; padding: 2px 7px; margin: 2px; font-family: 'Courier Prime', monospace; font-size: 11px; color: var(--dim); }
        .lyrics-link { font-family: 'Press Start 2P', monospace; font-size: 7px; background: var(--white); color: var(--black); padding: 2px 7px; margin-left: 8px; text-decoration: none; vertical-align: middle; letter-spacing: 0.05em; }
        .lyrics-link:hover { opacity: 0.7; }
        .error-msg { color: var(--rose); opacity: 0.7; }
    `;
    document.head.appendChild(style);

    // ── 2. POPULATE DYNAMIC STUB ELEMENTS ──

    const tickerPhrases = [C.name, 'works', ...(C.ticker || [])];
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
            `<a href="./" class="nav-card c-back">← back</a>`,
            ...(C.siblings || []).filter(s => s !== 'works').map(s => {
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

    // Escape HTML special chars to safely insert API text into innerHTML
    function esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    const formatDate = (begin, end, ended) => {
        if (!begin && !end) return '';
        if (begin && end && begin === end) return ` (${esc(begin)})`;
        if (begin && !end) return ` (${esc(begin)}${ended ? '' : '–present'})`;
        if (begin && end) return begin.includes('-') && end.includes('-')
            ? ` (${esc(begin)} to ${esc(end)})`
            : ` (${esc(begin)}–${esc(end)})`;
        return '';
    };

    const formatAttrs = attrs => attrs?.length ? ` (${attrs.map(esc).join(', ')})` : '';

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
                await delay(1000 * Math.pow(2, i));
                continue;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        }
        throw new Error(`fetchWithRetry failed after ${retries} attempts: ${url}`);
    }

    (async () => {
        await loadCache();
        const statusEl = document.getElementById('status-bar');
        const countBar = document.getElementById('count-bar');
        const list     = document.getElementById('works-list');

        try {
            statusEl.textContent = 'fetching works list…';
            const artistData = await cached(`artist/${artistId}?inc=work-rels&fmt=json`, _cache?.subpages?.works?.artistWorkRels);
            let workRels = artistData.relations?.filter(r => r['target-type'] === 'work') || [];

            if (workRels.length === 0) { statusEl.textContent = 'no works found.'; return; }

            // shuffle for variety
            workRels.sort(() => Math.random() - 0.5);
            countBar.textContent = `found ${workRels.length} work${workRels.length !== 1 ? 's' : ''} (shuffled):`;

            const displayed = new Set();
            let failed = 0;

            for (let i = 0; i < workRels.length; i++) {
                const rel    = workRels[i];
                const workId = rel.work?.id;
                if (!workId || displayed.has(workId)) continue;
                displayed.add(workId);

                statusEl.textContent = `loading works… ${displayed.size} of ${workRels.length}`;

                try {
                    const w = await cached(`work/${workId}?inc=artist-rels+label-rels+url-rels+place-rels+tags+work-rels+aliases+recording-rels&fmt=json`, _cache?.subpages?.works?.details?.[workId]);

                    const workType  = w.type && w.type.toLowerCase() !== 'song' ? esc(w.type.toLowerCase()) : '';
                    const aliases   = w.aliases?.map(a => a.name).filter(n => n !== w.title).map(esc).join(', ') || '';

                    const lyricsFile = lyricsMap[(w.title || '').toLowerCase()];
                    const lyricsHtml = lyricsFile
                        ? `<a href="${lyricsPath}${lyricsFile}" class="lyrics-link">lyrics</a>`
                        : '';

                    const makeArtistRel = r =>
                        archiveLink(r.artist?.id, r.artist?.name, 'artist') + formatAttrs(r.attributes) + formatDate(r.begin, r.end, r.ended);

                    const composers  = w.relations?.filter(r => r['target-type'] === 'artist' && r.type === 'composer').map(makeArtistRel).join(', ') || '';
                    const lyricists  = w.relations?.filter(r => r['target-type'] === 'artist' && r.type === 'lyricist').map(makeArtistRel).join(', ') || '';
                    const writers    = w.relations?.filter(r => r['target-type'] === 'artist' && r.type === 'writer').map(makeArtistRel).join(', ') || '';

                    const publishers = w.relations?.filter(r => r['target-type'] === 'label' && r.type === 'publishing')
                        .map(r => `<a href="https://musicbrainz.org/label/${esc(r.label?.id)}" target="_blank" rel="noopener">${esc(r.label?.name)}</a>`)
                        .join(', ') || '';

                    const composedIn = w.relations?.filter(r => r['target-type'] === 'place' && r.type === 'composed in')
                        .map(r => archiveLink(r.place?.id, r.place?.name, 'place'))
                        .join(', ') || '';

                    const basedOn = w.relations?.filter(r =>
                        r['target-type'] === 'work' && ['based on', 'arrangement of', 'adaptation', 'parody of'].includes(r.type)
                    ).map(r => {
                        let type = esc(r.type);
                        if (r.type === 'based on')      type = r.direction === 'backward' ? 'based on'       : 'basis for';
                        if (r.type === 'arrangement of') type = r.direction === 'backward' ? 'arrangement of' : 'arranged into';
                        return `${type}: <a href="https://musicbrainz.org/work/${esc(r.work?.id)}" target="_blank" rel="noopener">${esc(r.work?.title)}</a>`;
                    }).join('<br>') || '';

                    const tags = w.tags?.map(t => `<span class="tag">${esc(t.name)}</span>`).join('') || '';

                    // recordings — fetch details for video / live / partial flags
                    const recRels = w.relations?.filter(r => r['target-type'] === 'recording' && r.type === 'performance') || [];
                    const recsWithDetails = [];
                    for (const r of recRels) {
                        const recId = r.recording?.id;
                        if (!recId) continue;
                        try {
                            const cachedFlags = _cache?.subpages?.works?.recordingFlags?.[recId];
                            if (cachedFlags) {
                                recsWithDetails.push({ rel: r, isVideo: cachedFlags.video === true, disambiguation: cachedFlags.disambiguation || '' });
                            } else {
                                const rd = await fetchWithRetry(`https://musicbrainz.org/ws/2/recording/${recId}?fmt=json`);
                                recsWithDetails.push({ rel: r, isVideo: rd.video === true, disambiguation: rd.disambiguation || '' });
                                await delay(100);
                            }
                        } catch {
                            recsWithDetails.push({ rel: r, isVideo: false, disambiguation: '' });
                        }
                    }

                    const recordings = recsWithDetails.map(({ rel: r, isVideo, disambiguation }) => {
                        const recId  = esc(r.recording?.id);
                        let title    = `<a href="https://musicbrainz.org/recording/${recId}" target="_blank" rel="noopener">${esc(r.recording?.title)}</a>`;
                        if (disambiguation) title += ` <span style="color:var(--dim);font-style:italic;">(${esc(disambiguation)})</span>`;
                        const isLive    = r.attributes?.some(a => a.toLowerCase() === 'live');
                        const isPartial = r.attributes?.some(a => a.toLowerCase() === 'partial');
                        let dateStr = '';
                        if (r.begin || r.end) {
                            if (r.begin && r.end && r.begin === r.end) dateStr = ` (${esc(r.begin)})`;
                            else if (r.begin && r.end)                  dateStr = ` (${esc(r.begin)}–${esc(r.end)})`;
                            else if (r.begin)                           dateStr = ` (${esc(r.begin)})`;
                        }
                        let labels = '';
                        if (isLive)    labels += '<span class="rec-label live">live</span>';
                        if (isPartial) labels += '<span class="rec-label partial">partial</span>';
                        if (isVideo)   labels += '<span class="rec-label video">video</span>';
                        return `${title}${dateStr}${labels}`;
                    }).join(', ') || '';

                    // other rels (urls, other works, etc.) — everything not already shown above
                    const SKIP_ARTIST_TYPES  = ['composer', 'lyricist', 'writer'];
                    const SKIP_WORK_TYPES    = ['based on', 'arrangement of', 'adaptation', 'parody of'];
                    const otherRels = (w.relations || []).filter(r => {
                        if (r['target-type'] === 'artist'    && SKIP_ARTIST_TYPES.includes(r.type))  return false;
                        if (r['target-type'] === 'label'     && r.type === 'publishing')              return false;
                        if (r['target-type'] === 'place')                                             return false;
                        if (r['target-type'] === 'work'      && SKIP_WORK_TYPES.includes(r.type))    return false;
                        if (r['target-type'] === 'recording' && r.type === 'performance')             return false;
                        return true;
                    }).map(r => {
                        const dateStr = formatDate(r.begin, r.end, r.ended);
                        const attrStr = formatAttrs(r.attributes);
                        let type = esc(r.type);
                        if (r.type === 'parts' && r['target-type'] === 'work')
                            type = r.direction === 'backward' ? 'part of' : 'has parts';
                        if (r['target-type'] === 'url')
                            return `${type}: <a href="${esc(r.url?.resource)}" target="_blank" rel="noopener">${esc(r.url?.resource)}</a>${attrStr}${dateStr}`;
                        if (r['target-type'] === 'work')
                            return `${type}: <a href="https://musicbrainz.org/work/${esc(r.work?.id)}" target="_blank" rel="noopener">${esc(r.work?.title)}</a>${attrStr}${dateStr}`;
                        if (r['target-type'] === 'artist')
                            return `${type}: ${archiveLink(r.artist?.id, r.artist?.name, 'artist')}${attrStr}${dateStr}`;
                        if (r['target-type'] === 'label')
                            return `${type}: <a href="https://musicbrainz.org/label/${esc(r.label?.id)}" target="_blank" rel="noopener">${esc(r.label?.name)}</a>${attrStr}${dateStr}`;
                        return `${type}: ${esc(r.artist?.name || r.label?.name || r.work?.title || r.url?.resource || 'n/a')}${attrStr}${dateStr}`;
                    });

                    list.insertAdjacentHTML('beforeend', `
                        <div class="work-card">
                            <h3>
                                <a href="https://musicbrainz.org/work/${esc(workId)}" target="_blank" rel="noopener">${esc(w.title) || 'untitled'}</a>
                                ${lyricsHtml}
                                ${workType ? `<span class="work-type">[${workType}]</span>` : ''}
                            </h3>
                            ${aliases     ? `<p class="alternate-names"><strong>alternate names</strong>${aliases}</p>`  : ''}
                            ${basedOn     ? `<p>${basedOn}</p>`                                                          : ''}
                            ${composers   ? `<p><strong>composer(s)</strong>${composers}</p>`                            : ''}
                            ${lyricists   ? `<p><strong>lyricist(s)</strong>${lyricists}</p>`                            : ''}
                            ${writers     ? `<p><strong>writer(s)</strong>${writers}</p>`                                : ''}
                            ${publishers  ? `<p><strong>publisher(s)</strong>${publishers}</p>`                          : ''}
                            ${composedIn  ? `<p><strong>composed in</strong>${composedIn}</p>`                           : ''}
                            <p><strong>iswc</strong>${esc(w.iswcs?.join(', ') || 'n/a')}</p>
                            ${w.disambiguation ? `<p><strong>disambiguation</strong>${esc(w.disambiguation)}</p>`        : ''}
                            ${w.language       ? `<p><strong>language</strong>${esc(w.language)}</p>`                   : ''}
                            ${recordings  ? `<p><strong>recordings</strong>${recordings}</p>`                            : ''}
                            ${otherRels.length ? `<p><strong>other</strong><br>${otherRels.join('<br>')}</p>`             : ''}
                            ${tags ? `<div style="margin-top:8px"><strong style="font-family:'Press Start 2P',monospace;font-size:6px;color:var(--dim);letter-spacing:0.08em;margin-right:6px;">tags</strong>${tags}</div>` : ''}
                        </div>
                    `);

                    await delay(500);
                } catch {
                    list.insertAdjacentHTML('beforeend', `
                        <div class="work-card">
                            <h3>${esc(rel.work?.title || 'unknown')}</h3>
                            <p class="error-msg">failed to load — <a href="https://musicbrainz.org/work/${esc(workId)}" target="_blank" rel="noopener">view on MusicBrainz</a></p>
                        </div>
                    `);
                    failed++;
                }
            }

            statusEl.textContent = `all ${displayed.size} works loaded!${failed ? ` (${failed} failed — try refreshing)` : ''}`;

        } catch (err) {
            statusEl.textContent = 'error loading works — check your connection and refresh.';
    console.error('artist_works.js fetch failed:', err);
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
