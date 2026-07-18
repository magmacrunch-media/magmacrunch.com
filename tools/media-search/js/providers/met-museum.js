/**
 * met-museum.js — Metropolitan Museum of Art public domain collection
 * No API key required.
 */
(function() {
    'use strict';

    const API = 'https://collectionapi.metmuseum.org/public/collection/v1';

    window.Providers = window.Providers || {};

    window.Providers.met_museum = {
        name: 'met_museum',
        label: 'Met Museum',
        color: '#ffe03a',
        needsKey: false,

        async search(query, page, perPage) {
            // Step 1: search for object IDs
            const searchRes = await fetch(`${API}/search?q=${encodeURIComponent(query)}&hasImages=true`);
            if (!searchRes.ok) throw new Error(`Met Museum ${searchRes.status}`);
            const searchData = await searchRes.json();
            const ids = searchData.objectIDs || [];

            if (ids.length === 0) return { results: [], total: 0, page: 1, hasMore: false };

            const total = ids.length;
            const start = ((page || 1) - 1) * (perPage || 24);
            const slice = ids.slice(start, start + (perPage || 24));

            // Step 2: fetch object details (limit to avoid hammering API)
            const results = [];
            const fetches = slice.slice(0, 20).map(async id => {
                try {
                    const res = await fetch(`${API}/objects/${id}`);
                    if (!res.ok) return;
                    const obj = await res.json();
                    if (!obj.primaryImageSmall) return;
                    results.push({
                        id: obj.objectID,
                        title: obj.title || 'Untitled',
                        thumbnail: obj.primaryImageSmall || '',
                        fullUrl: obj.primaryImage || '',
                        source: 'met_museum',
                        license: 'PD',
                        licenseUrl: 'https://www.metmuseum.org/about-the-met/policies-and-documents/open-access',
                        type: 'image',
                        dimensions: obj.dimensions ? { w: null, h: null } : null,
                        author: obj.artistDisplayName || '',
                        sourceUrl: obj.objectURL || ''
                    });
                } catch {}
            });

            await Promise.all(fetches);

            return {
                results,
                total,
                page: page || 1,
                hasMore: start + slice.length < total
            };
        }
    };
})();
