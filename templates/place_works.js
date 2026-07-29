/* ═══════════════════════════════════════════════
   magmacrunch media — place works page template
   templates/place_works.js

   Requires window.PLACE_CONFIG (defined in stub) = {
     id:        string   — MusicBrainz place ID
     name:      string   — full place name
     abbr:      string   — short label
     accent:    string   — CSS var name without --  (e.g. 'yellow')
     backColor: string   — nav-card class for ← back (e.g. 'c-magenta')
     siblings:  string[] — sibling page names
     depth:     string   — path prefix to site root
     ticker:    string[] — extra ticker phrases
   }
   ═══════════════════════════════════════════════ */

(function () {
    const C = window.PLACE_CONFIG;
    const __navIdAtStart = window.__mcNavId;
    if (!C) { console.error('place_works.js: window.PLACE_CONFIG is not defined'); return; }

    const d      = C.depth  || '../../../';
    const accent = C.accent || 'yellow';

    const ENTITY_MAP = window.__ENTITY_MAP || {};
    function archiveLink(id, name, type) {
        if (!id || !name) return esc(name || '');
        const path = ENTITY_MAP[id];
        if (path) return '<a href="' + path + '">' + esc(name) + '</a>';
        return '<a href="https://musicbrainz.org/' + (type || 'artist') + '/' + esc(id) + '" target="_blank" rel="noopener">' + esc(name) + '</a>';
    }

    const COLOR_MAP = {
        about:      'c-about',
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
        'mh-gold':     '212,160,96',
        'fm-amber':    '232,160,64',
        'ih-cta':      '168,104,72',
        'mg-heading':  '232,192,96',
        'gs-green':    '96,120,80',
        'cg-cta':      '192,120,56',
        'tc-bright':   '232,200,112',
        'tm-warm':     '212,184,112',
    };
    const accentRgb = ACCENT_RGB[accent] || '255,224,58';
    const accentVar = `var(--${accent})`;

    // ── 1. INJECT PAGE STYLES ──
    const style = document.createElement('style');
    style.textContent = `
        .work-card { border:1px solid #1e1e2e; background:var(--deep); padding:18px 20px; margin-bottom:12px; transition:border-color 0.15s; }
        .work-card:hover { border-color:${accentVar}; }
        .work-card h3 { font-family:'Press Start 2P',monospace; font-size:12px; color:var(--white); letter-spacing:0.05em; margin-bottom:12px; line-height:1.7; }
        .work-card h3 a { color:${accentVar}; text-decoration:none; }
        .work-card h3 a:hover { color:${accentVar}; }
        .work-type { font-family:'Courier Prime',monospace; font-size:11px; color:${accentVar}; font-style:italic; margin-left:6px; }
        .work-card p { font-family:'Courier Prime',monospace; font-size:12px; color:var(--white); opacity:0.8; margin-bottom:5px; line-height:1.5; }
        .work-card p strong { font-family:'Press Start 2P',monospace; font-size:8px; color:var(--dim); letter-spacing:0.08em; margin-right:6px; }
        .work-card a { color:${accentVar}; text-decoration:none; }
        .work-card a:hover { color:var(--white); }

        .badge { display:inline-block; color:#000; padding:2px 8px; margin:2px; font-family:'Press Start 2P',monospace; font-size:8px; letter-spacing:0.06em; }
        .badge-composed  { background:${accentVar}; }
        .badge-lyrics    { background:var(--orange); }
        .badge-recorded  { background:${accentVar}; }
        .badge-premiered { background:var(--yellow); }
        .badge-other     { background:#4a4a6a; color:var(--white); }

        .rec-label { display:inline-block; padding:1px 5px; margin-left:4px; font-family:'Press Start 2P',monospace; font-size:8px; letter-spacing:0.05em; }
        .rec-label.live    { background:var(--rose);   color:#000; }
        .rec-label.partial { background:var(--orange); color:#000; }
        .rec-label.video   { background:${accentVar};   color:#000; }

        .tag { display:inline-block; background:#1a1a2e; border:1px solid #2a2a4a; padding:2px 7px; margin:2px; font-family:'Courier Prime',monospace; font-size:11px; color:var(--dim); }
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
            ...(C.siblings || []).filter(s => s !== 'works').map(s =>
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

    async function fetchWithRetry(url, tries = 4) {
        if (window.__mcNavId !== __navIdAtStart) throw new Error('page navigated away');
        for (let i = 0; i < tries; i++) {
            try {
                const res = await fetch(url);
                if (res.status === 503 || res.status === 429) { await delay(1000 * Math.pow(2, i)); continue; }
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return await res.json();
            } catch (e) {
                if (i === tries - 1) throw e;
                await delay(1000 * Math.pow(2, i));
            }
        }
    }

    const formatDate = (begin, end, ended) => {
        if (!begin && !end) return '';
        if (begin && end && begin === end) return ` (${begin})`;
        if (begin && !end) return ` (${begin}${ended ? '' : '–present'})`;
        if (begin && end) return (begin.includes('-') && end.includes('-'))
            ? ` (${begin} to ${end})` : ` (${begin}–${end})`;
        return '';
    };

    const cleanAttr   = a => a.includes(':') ? a : a.replace(/\s*\([^)]+\)/, '');
    const formatAttrs = a => a?.length ? ` (${a.join(', ')})` : '';

    (async () => {
        await loadCache();
        const statusEl = document.getElementById('status-bar');
        const countBar = document.getElementById('count-bar');
        const list     = document.getElementById('works-list');

        try {
            statusEl.textContent = 'fetching place data…';
            const placeData = await cached(`place/${placeId}?inc=work-rels&fmt=json`, _cache?.subpages?.works?.placeData);
            const workRels  = placeData.relations?.filter(r => r['target-type'] === 'work') || [];

            workRels.sort(() => Math.random() - 0.5);

            if (workRels.length === 0) { statusEl.textContent = 'no works found.'; return; }

            countBar.textContent = `found ${workRels.length} work${workRels.length !== 1 ? 's' : ''} (shuffled):`;

            const displayed = new Set();

            for (const rel of workRels) {
                const workId = rel.work?.id;
                if (!workId || displayed.has(workId)) continue;
                displayed.add(workId);
                statusEl.textContent = `loading details… ${displayed.size} of ${workRels.length}`;

                try {
                    const w = await cached(`work/${workId}?inc=artist-rels+label-rels+url-rels+place-rels+tags+work-rels+aliases+recording-rels&fmt=json`, _cache?.subpages?.works?.details?.[workId]);
                    const workType = w.type && w.type.toLowerCase() !== 'song' ? w.type.toLowerCase() : '';

                    // badges for this place
                    const placeRels = w.relations?.filter(r => r['target-type'] === 'place' && r.place?.id === placeId) || [];
                    const badges = placeRels.map(r => {
                        let label = r.type;
                        const credited = r['target-credit'];
                        if (credited && credited !== r.place?.name) label += ` as "${credited}"`;
                        if (r.attributes?.length) label += ` (${r.attributes.join(', ')})`;
                        label += formatDate(r.begin, r.end, r.ended);
                        let cls = 'badge-other';
                        if (r.type.includes('composed'))  cls = 'badge-composed';
                        else if (r.type.includes('lyrics'))    cls = 'badge-lyrics';
                        else if (r.type.includes('recorded'))  cls = 'badge-recorded';
                        else if (r.type.includes('premiered')) cls = 'badge-premiered';
                        return `<span class="badge ${cls}">${esc(label)}</span>`;
                    }).join('');

                    const basedOn = (w.relations?.filter(r => r['target-type'] === 'work' && ['based on', 'arrangement of', 'adaptation', 'parody of'].includes(r.type)) || [])
                        .map(r => {
                            const typeMap = {
                                'based on':       ['based on',        'basis for'],
                                'arrangement of': ['arrangement of',  'arranged into'],
                                'adaptation':     ['adaptation of',   'adapted into'],
                                'parody of':      ['parody of',       'parodied by'],
                            };
                            const type = typeMap[r.type]
                                ? (r.direction === 'backward' ? typeMap[r.type][0] : typeMap[r.type][1])
                                : r.type;
                            return `${esc(type)}: <a href="https://musicbrainz.org/work/${esc(r.work?.id)}" target="_blank" rel="noopener">${esc(r.work?.title)}</a>`;
                        }).join('<br>');

                    const artistLink = (r) =>
                        archiveLink(r.artist?.id, r.artist?.name, 'artist') + formatAttrs(r.attributes) + formatDate(r.begin, r.end, r.ended);

                    const composers  = (w.relations?.filter(r => r['target-type'] === 'artist' && r.type === 'composer')  || []).map(artistLink).join(', ');
                    const lyricists  = (w.relations?.filter(r => r['target-type'] === 'artist' && r.type === 'lyricist')  || []).map(artistLink).join(', ');
                    const writers    = (w.relations?.filter(r => r['target-type'] === 'artist' && r.type === 'writer')    || []).map(artistLink).join(', ');
                    const publishers = (w.relations?.filter(r => r['target-type'] === 'label'  && r.type === 'publishing') || [])
                        .map(r => `<a href="https://musicbrainz.org/label/${esc(r.label?.id)}" target="_blank" rel="noopener">${esc(r.label?.name)}</a>`).join(', ');

                    const otherPlaces = (w.relations?.filter(r => r['target-type'] === 'place' && r.place?.id !== placeId) || [])
                        .map(r => archiveLink(r.place?.id, r['target-credit'] || r.place?.name, 'place') + ` (${esc(r.type)}${formatAttrs(r.attributes)})${formatDate(r.begin, r.end, r.ended)}`)
                        .join(', ');

                    // recordings — fetch each to get video flag and disambiguation
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
                        const recId = r.recording?.id;
                        let title = `<a href="https://musicbrainz.org/recording/${esc(recId)}" target="_blank" rel="noopener">${esc(r.recording?.title)}</a>`;
                        if (disambiguation) title += ` <span style="color:var(--dim);font-style:italic;">(${esc(disambiguation)})</span>`;
                        const isLive    = r.attributes?.some(a => a.toLowerCase() === 'live');
                        const isPartial = r.attributes?.some(a => a.toLowerCase() === 'partial');
                        let ds = '';
                        if (r.begin && r.end) ds = r.begin === r.end ? ` (${r.begin})` : (r.begin.includes('-') && r.end.includes('-')) ? ` (${r.begin} to ${r.end})` : ` (${r.begin}–${r.end})`;
                        else if (r.begin) ds = ` (${r.begin})`;
                        let labels = '';
                        if (isLive)    labels += '<span class="rec-label live">live</span>';
                        if (isPartial) labels += '<span class="rec-label partial">partial</span>';
                        if (isVideo)   labels += '<span class="rec-label video">video</span>';
                        return `${title}${ds}${labels}`;
                    }).join(', ');

                    // other relationships (catch-all)
                    const otherRels = (w.relations?.filter(r => {
                        if (r['target-type'] === 'artist' && ['composer', 'lyricist', 'writer'].includes(r.type)) return false;
                        if (r['target-type'] === 'label'  && r.type === 'publishing') return false;
                        if (r['target-type'] === 'place')  return false;
                        if (r['target-type'] === 'work'   && ['based on', 'arrangement of', 'adaptation', 'parody of'].includes(r.type)) return false;
                        if (r['target-type'] === 'recording' && r.type === 'performance') return false;
                        return true;
                    }) || []).map(r => {
                        const ds = formatDate(r.begin, r.end, r.ended);
                        const as = formatAttrs(r.attributes);
                        let type = r.type;
                        if (type === 'parts' && r['target-type'] === 'work') type = r.direction === 'backward' ? 'part of' : 'has parts';
                        if (r['target-type'] === 'url')     return `${esc(type)}: <a href="${esc(r.url?.resource)}" target="_blank" rel="noopener">${esc(r.url?.resource)}</a>${as}${ds}`;
                        if (r['target-type'] === 'work')    return `${esc(type)}: <a href="https://musicbrainz.org/work/${esc(r.work?.id)}" target="_blank" rel="noopener">${esc(r.work?.title)}</a>${as}${ds}`;
                        if (r['target-type'] === 'artist')  return `${esc(type)}: ${archiveLink(r.artist?.id, r.artist?.name, 'artist')}${as}${ds}`;
                        if (r['target-type'] === 'label')   return `${esc(type)}: <a href="https://musicbrainz.org/label/${esc(r.label?.id)}" target="_blank" rel="noopener">${esc(r.label?.name)}</a>${as}${ds}`;
                        return `${esc(type)}: ${esc(r.artist?.name || r.label?.name || r.work?.title || r.url?.resource || 'n/a')}${as}${ds}`;
                    });

                    const tags = (w.tags || []).map(t => `<span class="tag">${esc(t.name)}</span>`).join('');

                    list.insertAdjacentHTML('beforeend', `
                        <div class="work-card">
                            <h3>
                                <a href="https://musicbrainz.org/work/${esc(workId)}" target="_blank" rel="noopener">${esc(w.title || 'untitled')}</a>
                                ${workType ? `<span class="work-type">[${esc(workType)}]</span>` : ''}
                            </h3>
                            ${badges      ? `<p>${badges}</p>` : ''}
                            ${basedOn     ? `<p>${basedOn}</p>` : ''}
                            ${composers   ? `<p><strong>composer(s)</strong>${composers}</p>` : ''}
                            ${lyricists   ? `<p><strong>lyricist(s)</strong>${lyricists}</p>` : ''}
                            ${writers     ? `<p><strong>writer(s)</strong>${writers}</p>` : ''}
                            ${publishers  ? `<p><strong>publisher(s)</strong>${publishers}</p>` : ''}
                            ${otherPlaces ? `<p><strong>other places</strong>${otherPlaces}</p>` : ''}
                            <p><strong>iswc</strong>${esc(w.iswcs?.join(', ') || 'n/a')}</p>
                            ${w.disambiguation ? `<p><strong>disambiguation</strong>${esc(w.disambiguation)}</p>` : ''}
                            ${w.language       ? `<p><strong>language</strong>${esc(w.language)}</p>` : ''}
                            ${recordings       ? `<p><strong>recordings</strong>${recordings}</p>` : ''}
                            ${otherRels.length ? `<p><strong>other</strong><br>${otherRels.join('<br>')}</p>` : ''}
                            ${tags ? `<div style="margin-top:8px"><strong style="font-family:'Press Start 2P',monospace;font-size:6px;color:var(--dim);letter-spacing:0.08em;margin-right:6px;">tags</strong>${tags}</div>` : ''}
                        </div>
                    `);

                    await delay(500);

                } catch (e) {
                    list.insertAdjacentHTML('beforeend', `
                        <div class="work-card">
                            <h3>${esc(rel.work?.title || 'unknown')}</h3>
                            <p style="color:var(--rose);opacity:0.7;">failed to load — <a href="https://musicbrainz.org/work/${esc(workId)}" target="_blank" rel="noopener">view on MusicBrainz</a></p>
                        </div>
                    `);
                }
            }

            statusEl.textContent = `all ${displayed.size} works loaded!`;

        } catch (err) {
            document.getElementById('status-bar').textContent = 'error loading works — check your connection and refresh.';
    console.error('place_works.js fetch failed:', err);
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
