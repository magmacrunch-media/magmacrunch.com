# Archive Template Analysis

## 1. artist_recordings.js

### Main Logic Structure
**IIFE** at the top level (line 25), with a nested **async IIFE** for the data loading (line 238):

```javascript
(function () {           // Line 25 — outer IIFE
    // ... setup, helpers ...
    
    (async () => {       // Line 238 — inner async IIFE (data loading)
        await loadCache();
        // ... fetch and render ...
    })();                // Line 404
})();                    // Line 405
```

### Data Loading Begins
**Line 238**: `(async () => {`

### Shuffle Logic (exact)
```javascript
// Line 268
all.sort(() => Math.random() - 0.5);
```
This is a standard Fisher-Yates-like random sort. It mutates the array in-place.

### CSS Injection Pattern (exact)
```javascript
// Lines 116-146
const style = document.createElement('style');
style.textContent = `
    .breadcrumb a { color: var(--dim); text-decoration: none; transition: color 0.15s; }
    .breadcrumb a:hover { color: ${accentVar}; }
    .breadcrumb .sep { margin: 0 8px; color: ${accentVar}; opacity: 0.7; }
    .breadcrumb .current { color: ${accentVar}; }

    .page-header { width: 100%; max-width: 960px; margin-bottom: 32px; animation: fadeUp 0.5s ease both; }
    .artist-label { font-family: 'Press Start 2P', monospace; font-size: 10px; color: ${backColorVar}; letter-spacing: 0.2em; margin-bottom: 8px; opacity: 0.8; }
    .page-title { font-family: 'Press Start 2P', monospace; font-size: clamp(12px, 2.5vw, 20px); color: ${accentVar}; letter-spacing: 0.08em; line-height: 1.6; margin-bottom: 20px; text-shadow: 0 0 20px rgba(${accentRgb},0.45); }

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

    .tag { display: inline-block; background: #1a1a2e; border: 1px solid #2a2a4a; padding: 2px 7px; margin: 2px; font-family: 'Courier Prime', monospace; font-size: 11px; color: var(--dim); }
    .hidden-video { display: none; }
    .error-msg { color: var(--rose); opacity: 0.7; }
`;
document.head.appendChild(style);
```

### MusicBrainz Attribution Footer (exact HTML)
```javascript
// Lines 391-403
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
```

---

## 2. artist_releases.js

### Main Logic Structure
**IIFE** at the top level (line 25), with a nested **async IIFE** for the data loading (line 234):

```javascript
(function () {           // Line 25 — outer IIFE
    // ... setup, helpers ...
    
    (async () => {       // Line 234 — inner async IIFE (data loading)
        await loadCache();
        // ... fetch and render ...
    })();                // Line 360
})();                    // Line 361
```

### Data Loading Begins
**Line 234**: `(async () => {`

### Sort Logic (not shuffled)
```javascript
// Line 262
allReleases.sort((a, b) => (b.date || '0000').localeCompare(a.date || '0000'));
```
Releases are sorted **newest first**, not shuffled.

### CSS Injection Pattern (exact)
```javascript
// Lines 108-145
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
```

### Cover Art URL Pattern (exact)
```javascript
// Line 301
src="https://coverartarchive.org/release/${esc(rel.id)}/front-250"
```
Pattern: `https://coverartarchive.org/release/{release-id}/front-250`

### MusicBrainz Attribution Footer (exact HTML)
Same pattern as artist_recordings.js (lines 347-359):
```javascript
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
```

---

## 3. collective_recordings.js

### Main Logic Structure
**IIFE** at the top level (line 27), with a nested **async IIFE** for the data loading (line 233):

```javascript
(function () {           // Line 27 — outer IIFE
    // ... setup, helpers ...
    
    (async () => {       // Line 233 — inner async IIFE (data loading)
        await loadCache();
        // ... fetch and render ...
    })();                // Line 393
})();                    // Line 394
```

### How It Handles Multiple Artist IDs (exact fetch loop)
```javascript
// Lines 219-231
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

// Lines 246-254 (the parallel fetch + deduplication)
const perArtist = await Promise.all(C.ids.map(id => fetchAllForArtist(id, statusEl)));
const seen = new Set();
all = [];
for (const batch of perArtist) {
    for (const rec of batch) {
        if (!seen.has(rec.id)) { seen.add(rec.id); all.push(rec); }
    }
}
```

### How Deduplication Works (exact)
```javascript
// Lines 247-253
const seen = new Set();
all = [];
for (const batch of perArtist) {
    for (const rec of batch) {
        if (!seen.has(rec.id)) { seen.add(rec.id); all.push(rec); }
    }
}
```
Deduplication uses a `Set` of recording IDs. The first occurrence wins; duplicates from subsequent artists are dropped. Note: the batching order is `Promise.all(C.ids.map(...))`, so the first artist in `C.ids` takes priority.

### Shuffle Logic (exact)
```javascript
// Line 259
all.sort(() => Math.random() - 0.5);
```
Same Fisher-Yates-like random sort as artist_recordings.js.

### CSS Injection Pattern (exact)
Same pattern as artist_recordings.js but with these differences:
- Line 34: `const prefix = C.cssVarPrefix ? C.cssVarPrefix + '-' : '';`
- Line 99: `const accentVar = \`var(--${prefix}${accent})\`;`
- Line 100: `const mutedVar = C.mutedColorVar || 'var(--dim)';`
- Line 127: `.disambiguation { ... color: ${mutedVar}; ... }` (uses `mutedVar` instead of `var(--dim)`)
- Line 134: `.tag { ... color: ${mutedVar}; }` (uses `mutedVar`)
- Line 353: Tag strong uses `color:${mutedVar}` instead of `color:var(--dim)`

### MusicBrainz Attribution Footer (exact)
Same HTML as artist_recordings.js (lines 380-392), but **inside** the async IIFE (not in a separate IIFE):
```javascript
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
```

---

## 4. contributor.js

### Main Logic Structure
**IIFE** at the top level (line 4), with **promise chaining** (not async/await):

```javascript
(function() {            // Line 4 — IIFE
    // ... helpers, render function ...
    
    loadCache().then(function() {           // Line 754
        return loadTMDBCache();
    }).then(function() {
        return cachedFetch('artist-rels');
    }).then(function(data) {
        // ... nested .then() chains for each fetch ...
    });
})();                    // Line 794
```

### Data Loading Begins
**Line 754**: `loadCache().then(function() {`

### The Exact render() Function Signature
```javascript
// Line 425
function render(data, recordingData, workData, releaseData, labelData, placeData, eventData) {
```
It receives **7 parameters**:
1. `data` — the artist-rels response (artist data + relationships)
2. `recordingData` — recording-rels response
3. `workData` — work-rels response
4. `releaseData` — release-rels response
5. `labelData` — label-rels response
6. `placeData` — place-rels response
7. `eventData` — event-rels response

### Section-Building Logic (exact)
The render function groups credits into sections by filtering `rels` by `target-type` and `type`:

```javascript
// Lines 426-667 (simplified structure)
function render(data, recordingData, workData, releaseData, labelData, placeData, eventData) {
    var rels = data.relations || [];
    
    // Artist relationships → "bands" and "solo projects" sections
    rels.forEach(function(r) {
        if (r['target-type'] !== 'artist' || !r.artist) return;
        switch (r.type) {
            case 'founder':          // → bands section (founder role)
            case 'member of band':   // → bands section
            case 'instrumental supporting musician': // → bands section (supporting role)
            case 'is person':        // → solo projects section
        }
    });

    // Labels → "labels" section
    // Places → "places" section
    // Events → "events" section
    // Works → "compositions" and "lyrics" sections
    // Recordings → "recordings performed on", "recordings edited", "recordings produced", "field recordings", "music videos"
    // Releases → "releases produced", "mastered", "photography", "design", "art direction", "compiled"
    // TMDB → "acting", crew departments (directing, production, crew, sound, camera, editing, lighting, writing)
    // Static sections → from config.STATIC_SECTIONS
    
    contentEl.innerHTML = html + renderStaticSections();
}
```

### Exact Section Types Rendered
1. **Labels** (from labelData)
2. **Bands** (from artist-rels: founder, member of band, instrumental supporting musician)
3. **Solo projects** (from artist-rels: is person)
4. **Places** (from placeData)
5. **Events** (from eventData)
6. **Compositions** (from workData: composer rels)
7. **Lyrics** (from workData: lyricist rels)
8. **Recordings performed on** (from recordingData: instrument, recording, vocal rels)
9. **Recordings edited** (from recordingData: editor rels)
10. **Recordings produced** (from recordingData: producer rels)
11. **Field recordings** (from recordingData: field recordist rels)
12. **Music videos** (from recordingData: video director, cinematographer rels)
13. **Releases produced** (from releaseData: producer rels)
14. **Mastered** (from releaseData: mastering rels)
15. **Photography** (from releaseData: photography rels)
16. **Design** (from releaseData: design, artwork rels)
17. **Art direction** (from releaseData: art direction rels)
18. **Compiled** (from releaseData: compiler rels)
19. **TMDB sections** (from _tmdb.credits: crew by department + acting)
20. **Static sections** (from config.STATIC_SECTIONS)

### TMDB Integration Details

**TMDB_ID** is optional in `__CONTRIBUTOR_CONFIG`:
```javascript
var TMDB_ID = config.TMDB_ID;  // Line 9
```

**TMDB cache loading** (lines 339-345):
```javascript
function loadTMDBCache() {
    if (!TMDB_ID) return Promise.resolve();
    return fetch('../../../archive/_cache/tmdb/person/' + TMDB_ID + '.json')
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(j) { if (j && j.fetchedAt) _tmdb = j; })
        .catch(function() {});
}
```

**TMDB profile photo** (lines 347-357):
```javascript
function renderProfilePhoto() {
    if (!_tmdb || !_tmdb.profile_path) return;
    var header = document.querySelector('.contrib-header');
    if (!header) return;
    var img = document.createElement('img');
    img.className = 'contrib-profile-photo';
    img.src = 'https://image.tmdb.org/t/p/w185' + _tmdb.profile_path;
    img.alt = _tmdb.name + ' photo';
    img.loading = 'lazy';
    header.insertBefore(img, header.firstChild);
}
```

**TMDB film link** (lines 359-367):
```javascript
function tmdbFilmLink(credit) {
    var localPath = LOCAL_FILM_MAP[credit.id];
    if (localPath) {
        return '<a href="' + localPath + '">' + esc(credit.title) + '</a>';
    }
    var mediaType = credit.media_type || 'movie';
    var path = mediaType === 'tv' ? 'tv' : 'movie';
    return '<a href="https://www.themoviedb.org/' + path + '/' + credit.id + '" target="_blank" rel="noopener">' + esc(credit.title) + '</a>';
}
```

**TMDB sections rendering** (lines 369-416):
- Groups crew by `department` field
- Department order: `['Directing', 'Production', 'Crew', 'Sound', 'Camera', 'Editing', 'Lighting', 'Writing']`
- Renders each department as a credit section with job as role
- Renders cast (acting) with character name as role
- Uses `LOCAL_FILM_MAP` for specific film IDs (e.g., `1721141` → `../../by-artist/svfp/documentary.html`)

**TMDB attribution** (lines 679-689):
```javascript
if (_tmdb && !window.__mcPageAborted) {
    var footer = document.querySelector('footer');
    if (footer) {
        footer.insertAdjacentHTML('beforeend',
            '<div class="tmdb-attribution">' +
                '<img src="' + (config.depth || '../../../') + 'assets/logos/TMDB_blue_square.svg" alt="TMDB">' +
                '<p>This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.</p>' +
            '</div>'
        );
    }
}
```

### Fetch Chain (exact)
```javascript
loadCache().then(function() {
    return loadTMDBCache();
}).then(function() {
    return cachedFetch('artist-rels');           // 1. artist-rels
}).then(function(data) {
    // ISNI/IPI IDs
    return (useCache ? Promise.resolve() : delay(1100)).then(function() {
        return cachedFetch('recording-rels');    // 2. recording-rels
    }).then(function(recordingData) {
        return (useCache ? Promise.resolve() : delay(1100)).then(function() {
            return cachedFetch('work-rels');     // 3. work-rels
        }).then(function(workData) {
            return (useCache ? Promise.resolve() : delay(1100)).then(function() {
                return cachedFetch('release-rels'); // 4. release-rels
            }).then(function(releaseData) {
                return (useCache ? Promise.resolve() : delay(1100)).then(function() {
                    return cachedFetch('label-rels'); // 5. label-rels
                }).then(function(labelData) {
                    return (useCache ? Promise.resolve() : delay(1100)).then(function() {
                        return cachedFetch('place-rels'); // 6. place-rels
                    }).then(function(placeData) {
                        return (useCache ? Promise.resolve() : delay(1100)).then(function() {
                            return cachedFetch('event-rels'); // 7. event-rels
                        }).then(function(eventData) {
                            render(data, recordingData, workData, releaseData, labelData, placeData, eventData);
                        });
                    });
                });
            });
        });
    });
});
```

**Total**: 7 API calls, each with 1100ms delay between them (unless cached).

---

## 5. label.js

### How It Differs Structurally from contributor.js

**Same structure**: IIFE + promise chaining (not async/await).

**Key differences**:
1. Uses `window.__LABEL_CONFIG` instead of `window.__CONTRIBUTOR_CONFIG`
2. No TMDB integration at all
3. No profile photo
4. Different API endpoint: `label/{MB_ID}` instead of `artist/{MB_ID}`
5. Different fetch chain (6 calls vs 7)
6. Different render function signature
7. Different section types

### Main Logic Structure
```javascript
(function() {            // Line 4 — IIFE
    // ... helpers, render function ...
    
    loadCache().then(function() {           // Line 449
        return cachedFetch('artist-rels');
    }).then(function(artistData) {
        // ... nested .then() chains ...
    });
})();                    // Line 500
```

### The Exact render() Function Signature
```javascript
// Line 153
function render(artistData, labelData, eventData, recordingData, workData, releaseData) {
```
It receives **6 parameters** (no placeData, no event-rels separate from label):
1. `artistData` — artist-rels response (from label endpoint)
2. `labelData` — label-rels response
3. `eventData` — event-rels response
4. `recordingData` — recording-rels response
5. `workData` — work-rels response
6. `releaseData` — release-rels response

### Exact Section Types Rendered
1. **Personnel** (from artistData: label founder, founder, owner, executive position at, employed by, producer position at, engineer position at, creative position at)
2. **Signed artists** (from artistData: all other artist rels not in PERSONNEL_TYPES)
3. **Owns** (from labelData: label ownership, forward direction)
4. **Owned by** (from labelData: label ownership, backward direction + artist owner, backward direction)
5. **Distributed by** (from labelData: label distribution)
6. **Related labels** (from labelData: other label rels)
7. **Events presented** (from eventData: presented rels)
8. **Associated places** (from artistData: place rels)
9. **Releases** (from releaseData: all release rels)
10. **Manufactured** (from releaseData: manufactured rels)
11. **Works** (from workData: work rels)
12. **Static sections** (from config.STATIC_SECTIONS)

### Fetch Chain (exact)
```javascript
loadCache().then(function() {
    return cachedFetch('artist-rels');           // 1. artist-rels
}).then(function(artistData) {
    // ISNI/IPI IDs + label type + years active
    var useCache = _cache && _cache.responses;
    return (useCache ? Promise.resolve() : delay(1100)).then(function() {
        return cachedFetch('label-rels');        // 2. label-rels
    }).then(function(labelData) {
        return (useCache ? Promise.resolve() : delay(1100)).then(function() {
            return cachedFetch('event-rels');    // 3. event-rels
        }).then(function(eventData) {
            return (useCache ? Promise.resolve() : delay(1100)).then(function() {
                return cachedFetch('recording-rels'); // 4. recording-rels
            }).then(function(recordingData) {
                return (useCache ? Promise.resolve() : delay(1100)).then(function() {
                    return cachedFetch('work-rels'); // 5. work-rels
                }).then(function(workData) {
                    return (useCache ? Promise.resolve() : delay(1100)).then(function() {
                        return cachedFetch('release-rels'); // 6. release-rels
                    }).then(function(releaseData) {
                        render(artistData, labelData, eventData, recordingData, workData, releaseData);
                    });
                });
            });
        });
    });
});
```

**Total**: 6 API calls, each with 1100ms delay between them (unless cached).

### Additional label.js Features
- **Label type and years active** display (lines 458-472):
```javascript
var meta = [];
if (artistData.type) meta.push(artistData.type.toLowerCase());
var ls = artistData['life-span'];
if (ls && ls.begin) {
    var beginYear = ls.begin.split('-')[0];
    if (ls.ended && ls.end) {
        meta.push(beginYear + ' \u2014 ' + ls.end.split('-')[0]);
    } else {
        meta.push('est ' + beginYear);
    }
}
if (meta.length) {
    idsEl.insertAdjacentHTML('beforebegin',
        '<div class="contrib-meta">' + meta.join(' \u00b7 ') + '</div>');
}
```

- **Different fetchWithRetry** (simpler, no retry logic for network errors):
```javascript
function fetchMB(url) {
    if (window.__mcPageAborted) return Promise.reject(new Error('page navigated away'));
    return fetch(url).then(function(res) {
        if (!res.ok) throw new Error('API error: ' + res.status);
        return res.json();
    });
}
```

---

## Summary of Key Differences

| Feature | artist_recordings.js | artist_releases.js | collective_recordings.js | contributor.js | label.js |
|---------|---------------------|-------------------|-------------------------|---------------|----------|
| Config | `ARTIST_CONFIG` | `ARTIST_CONFIG` | `COLLECTIVE_CONFIG` | `__CONTRIBUTOR_CONFIG` | `__LABEL_CONFIG` |
| Structure | IIFE + async IIFE | IIFE + async IIFE | IIFE + async IIFE | IIFE + promise chain | IIFE + promise chain |
| Sort | Random shuffle | Newest first | Random shuffle | Date-based | Date-based |
| API calls | N/A (per-recording) | N/A (per-release) | N/A (per-recording) | 7 | 6 |
| TMDB | No | No | No | Yes | No |
| Cache path | `artists/{id}.json` | `artists/{id}.json` | `collectives/{slug}.json` | `contributors/{id}.json` | `labels/{id}.json` |
| Attribution | MB only | MB only | MB only | MB + TMDB | MB only |
