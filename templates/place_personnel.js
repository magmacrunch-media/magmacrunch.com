/* ═══════════════════════════════════════════════
   magmacrunch media — place personnel page template
   templates/place_personnel.js

   Requires window.PLACE_CONFIG (defined in stub) = {
     id:        string   — MusicBrainz place ID
     name:      string   — full place name
     abbr:      string   — short label
     accent:    string   — CSS var name without --  (e.g. 'blue')
     backColor: string   — nav-card class for ← back (e.g. 'c-magenta')
     siblings:  string[] — sibling page names
     depth:     string   — path prefix to site root
     ticker:    string[] — extra ticker phrases
   }
   ═══════════════════════════════════════════════ */

(function () {
    const C = window.PLACE_CONFIG;
    const __navIdAtStart = window.__mcNavId;
    if (!C) { console.error('place_personnel.js: window.PLACE_CONFIG is not defined'); return; }

    const d      = C.depth  || '../../../';
    const accent = C.accent || 'blue';

    const ENTITY_MAP = window.__ENTITY_MAP || {};
    function archiveLink(id, name, type) {
        if (!id || !name) return esc(name || '');
        const path = ENTITY_MAP[id];
        if (path) return '<a href="' + path + '">' + esc(name) + '</a>';
        return '<a href="https://musicbrainz.org/' + (type || 'artist') + '/' + esc(id) + '" target="_blank" rel="noopener">' + esc(name) + '</a>';
    }

    const COLOR_MAP = {
        about:      'c-about',
        links:      'c-links',
        photography: 'c-photography',
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
        'c-personnel': 'var(--ih-brand)',
    };
    const backColorVar = BACK_COLOR_VAR[C.backColor] || 'var(--cyan)';

    const accentVar = `var(--${accent})`;

    // ── 1. INJECT PAGE STYLES ──
    const style = document.createElement('style');
    style.textContent = `
        .artist-card { border:1px solid #1e1e2e; background:var(--deep); padding:18px 20px; margin-bottom:12px; transition:border-color 0.15s; }
        .artist-card:hover { border-color:${accentVar}; }
        .artist-card h3 { font-family:'Press Start 2P',monospace; font-size:12px; color:${accentVar}; letter-spacing:0.05em; margin-bottom:12px; line-height:1.7; }
        .artist-card h3 a { color:${accentVar}; text-decoration:none; }
        .artist-card h3 a:hover { color:${accentVar}; }
        .artist-type { font-family:'Courier Prime',monospace; font-size:11px; color:${backColorVar}; font-style:italic; margin-left:6px; }
        .artist-card p { font-family:'Courier Prime',monospace; font-size:12px; color:var(--white); opacity:0.8; margin-bottom:5px; line-height:1.5; }
        .artist-card p strong { font-family:'Press Start 2P',monospace; font-size:8px; color:var(--dim); letter-spacing:0.08em; margin-right:6px; }
        .artist-card a { color:${accentVar}; text-decoration:none; }
        .artist-card a:hover { color:var(--white); }

        .badge { display:inline-block; color:#000; padding:2px 8px; margin:2px; font-family:'Press Start 2P',monospace; font-size:8px; letter-spacing:0.06em; }
        .badge-founded  { background:var(--rose); }
        .badge-member   { background:var(--orange); }
        .badge-engineer { background:${accentVar}; }
        .badge-born     { background:var(--yellow); }
        .badge-other    { background:#4a4a6a; color:var(--white); }

        .tag { display:inline-block; background:#1a1a2e; border:1px solid #2a2a4a; padding:2px 7px; margin:2px; font-family:'Courier Prime',monospace; font-size:11px; color:var(--dim); }
    `;
    document.head.appendChild(style);

    // ── 2. POPULATE DYNAMIC STUB ELEMENTS ──

    const tickerPhrases = [C.name, 'personnel', ...(C.ticker || [])];
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
            `<a href="./" class="nav-card c-back">← back</a>`,
            ...(C.siblings || []).filter(s => s !== 'personnel').map(s =>
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
    const formatAttrs = a => a?.length ? ` (${a.map(cleanAttr).join(', ')})` : '';

    const groupMembers = rels => {
        const map = new Map();
        for (const r of rels) {
            const id = r.artist?.id, name = r.artist?.name;
            if (!id) continue;
            if (!map.has(id)) map.set(id, { name, id, attrs: new Set(), dates: [] });
            const e = map.get(id);
            r.attributes?.forEach(a => e.attrs.add(cleanAttr(a)));
            const dt = formatDate(r.begin, r.end, r.ended);
            if (dt && !e.dates.includes(dt)) e.dates.push(dt);
        }
        return Array.from(map.values()).map(e => {
            let s = archiveLink(e.id, e.name, 'artist');
            if (e.attrs.size) s += ` (${Array.from(e.attrs).map(esc).join(', ')})`;
            if (e.dates.length) s += e.dates.join(', ');
            return s;
        });
    };

    (async () => {
        await loadCache();
        const statusEl = document.getElementById('status-bar');
        const countBar = document.getElementById('count-bar');
        const list     = document.getElementById('artists-list');

        try {
            statusEl.textContent = 'fetching place data…';
            const placeData  = await cached(`place/${placeId}?inc=artist-rels&fmt=json`, _cache?.subpages?.personnel?.placeData);
            const artistRels = placeData.relations?.filter(r => r['target-type'] === 'artist') || [];

            artistRels.sort(() => Math.random() - 0.5);

            if (artistRels.length === 0) { statusEl.textContent = 'no personnel found.'; return; }

            countBar.textContent = `found ${artistRels.length} personnel (shuffled):`;

            const displayed = new Set();

            for (const rel of artistRels) {
                const artistId = rel.artist?.id;
                if (!artistId || displayed.has(artistId)) continue;
                displayed.add(artistId);
                statusEl.textContent = `loading details… ${displayed.size} of ${artistRels.length}`;

                try {
                    const a = await cached(`artist/${artistId}?inc=artist-rels+label-rels+url-rels+place-rels+tags+work-rels+aliases+recording-rels+release-groups&fmt=json`, _cache?.subpages?.personnel?.details?.[artistId]);

                    const artistType = a.type || '';
                    const lifeSpan   = a['life-span'];
                    const lifeStr    = lifeSpan ? formatDate(lifeSpan.begin, lifeSpan.end, lifeSpan.ended) : '';

                    // badges from this place's relationship to the artist
                    const placeRels = a.relations?.filter(r => r['target-type'] === 'place' && r.place?.id === placeId) || [];
                    const badges = placeRels.map(r => {
                        let label = r.type;
                        const credited = r['target-credit'];
                        if (credited && credited !== r.place?.name) label += ` at "${credited}"`;
                        if (r.attributes?.length) label += ` (${r.attributes.map(cleanAttr).join(', ')})`;
                        label += formatDate(r.begin, r.end, r.ended);
                        let cls = 'badge-other';
                        if (r.type.includes('founded'))  cls = 'badge-founded';
                        else if (r.type.includes('member'))   cls = 'badge-member';
                        else if (r.type.includes('engineer')) cls = 'badge-engineer';
                        else if (r.type.includes('born'))     cls = 'badge-born';
                        return `<span class="badge ${cls}">${esc(label)}</span>`;
                    }).join('');

                    const aliases = a.aliases?.map(al => esc(al.name)).filter(n => n !== esc(a.name)).join(', ') || '';

                    const memberRels = a.relations?.filter(r => r['target-type'] === 'artist' && r.type === 'member of band' && r.direction === 'backward') || [];
                    const members    = groupMembers(memberRels).join(', ');
                    const bandRels   = a.relations?.filter(r => r['target-type'] === 'artist' && r.type === 'member of band' && r.direction !== 'backward') || [];
                    const bands      = groupMembers(bandRels).join(', ');

                    // labels
                    const labelMap = new Map();
                    (a.relations?.filter(r => r['target-type'] === 'label') || []).forEach(r => {
                        const id = r.label?.id;
                        if (!id) return;
                        if (!labelMap.has(id)) labelMap.set(id, { name: r.label?.name, id, rels: [] });
                        labelMap.get(id).rels.push(`${esc(r.type)}${formatAttrs(r.attributes)}${formatDate(r.begin, r.end, r.ended)}`);
                    });
                    const labels = Array.from(labelMap.values())
                        .map(l => `<a href="https://musicbrainz.org/label/${esc(l.id)}" target="_blank" rel="noopener">${esc(l.name)}</a> (${l.rels.join(', ')})`)
                        .join('; ');

                    // other places (not this one)
                    const otherPlaces = (a.relations?.filter(r => r['target-type'] === 'place' && r.place?.id !== placeId) || [])
                        .map(r => archiveLink(r.place?.id, r['target-credit'] || r.place?.name, 'place') + ` (${esc(r.type)}${formatDate(r.begin, r.end, r.ended)})`)
                        .join(', ');

                    // other relationships (artist-to-artist, excluding member of band and label/place/url/work/recording)
                    const otherMap = new Map();
                    (a.relations?.filter(r => {
                        if (r['target-type'] === 'place')  return false;
                        if (r['target-type'] === 'label')  return false;
                        if (r['target-type'] === 'url')    return false;
                        if (['work', 'recording'].includes(r['target-type'])) return false;
                        if (r['target-type'] === 'artist' && r.type === 'member of band') return false;
                        return true;
                    }) || []).forEach(r => {
                        let type = r.type;
                        if (type === 'named after artist') type = 'associated artist names';
                        if (type === 'is person')          type = r.direction === 'backward' ? 'performed by' : 'performs as';
                        if (type === 'founder' && artistType.toLowerCase() === 'person' && r['target-type'] === 'artist') type = 'founder of';
                        if (!otherMap.has(type)) otherMap.set(type, []);
                        const name = r.artist?.name;
                        if (!name) return;
                        otherMap.get(type).push(archiveLink(r.artist?.id, name, 'artist') + formatAttrs(r.attributes) + formatDate(r.begin, r.end, r.ended));
                    });
                    const otherRels = Array.from(otherMap.entries())
                        .map(([type, items]) => `${esc(type)}: ${items.join(', ')}`);

                    const tags = (a.tags || []).map(t => `<span class="tag">${esc(t.name)}</span>`).join('');

                    list.insertAdjacentHTML('beforeend', `
                        <div class="artist-card">
                            <h3>
                                ${archiveLink(artistId, a.name || 'unknown', 'artist')}
                                ${artistType ? `<span class="artist-type">[${esc(artistType.toLowerCase())}]</span>` : ''}
                            </h3>
                            ${badges      ? `<p>${badges}</p>` : ''}
                            ${lifeStr     ? `<p><strong>active</strong>${lifeStr}</p>` : ''}
                            ${aliases     ? `<p><strong>aliases</strong>${aliases}</p>` : ''}
                            ${members     ? `<p><strong>members</strong>${members}</p>` : ''}
                            ${bands       ? `<p><strong>member of</strong>${bands}</p>` : ''}
                            ${labels      ? `<p><strong>labels</strong>${labels}</p>` : ''}
                            ${otherPlaces ? `<p><strong>other places</strong>${otherPlaces}</p>` : ''}
                            ${a.disambiguation ? `<p><strong>disambiguation</strong>${esc(a.disambiguation)}</p>` : ''}
                            ${otherRels.length ? `<p><strong>other</strong><br>${otherRels.join('<br>')}</p>` : ''}
                            ${tags ? `<div style="margin-top:8px"><strong style="font-family:'Press Start 2P',monospace;font-size:6px;color:var(--dim);letter-spacing:0.08em;margin-right:6px;">tags</strong>${tags}</div>` : ''}
                        </div>
                    `);

                    await delay(500);

                } catch (e) {
                    list.insertAdjacentHTML('beforeend', `
                        <div class="artist-card">
                            <h3>${esc(rel.artist?.name || 'unknown')}</h3>
                            <p style="color:var(--rose);opacity:0.7;">failed to load — <a href="https://musicbrainz.org/artist/${esc(artistId)}" target="_blank" rel="noopener">view on MusicBrainz</a></p>
                        </div>
                    `);
                }
            }

            statusEl.textContent = `all ${displayed.size} personnel loaded!`;

        } catch (err) {
            document.getElementById('status-bar').textContent = 'error loading personnel — check your connection and refresh.';
    console.error('place_personnel.js fetch failed:', err);
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
