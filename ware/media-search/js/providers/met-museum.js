/**
 * met-museum.js — Metropolitan Museum of Art public domain collection
 * No API key required.
 */
(function() {
    'use strict';

    const API = 'https://collectionapi.metmuseum.org/public/collection/v1';
    const CONCURRENCY = 6;

    window.Providers = window.Providers || {};

    async function fetchBatch(ids) {
        const results = [];
        for (let i = 0; i < ids.length; i += CONCURRENCY) {
            const batch = ids.slice(i, i + CONCURRENCY);
            const fetched = await Promise.all(batch.map(async id => {
                try {
                    const res = await fetch(`${API}/objects/${id}`);
                    if (!res.ok) return null;
                    const obj = await res.json();
                    if (!obj.primaryImageSmall) return null;
                    return {
                        id: obj.objectID,
                        title: obj.title || 'Untitled',
                        thumbnail: obj.primaryImageSmall || '',
                        fullUrl: obj.primaryImage || '',
                        source: 'met_museum',
                        license: 'PD',
                        licenseUrl: 'https://www.metmuseum.org/about-the-met/policies-and-documents/open-access',
                        type: 'image',
                        dimensions: null,
                        author: obj.artistDisplayName || '',
                        sourceUrl: obj.objectURL || ''
                    };
                } catch {
                    return null;
                }
            }));
            results.push(...fetched.filter(Boolean));
        }
        return results;
    }

    window.Providers.met_museum = {
        name: 'met_museum',
        label: 'Met Museum',
        color: '#f5c542',
        needsKey: false,

        async search(query, page, perPage) {
            const searchRes = await fetch(`${API}/search?q=${encodeURIComponent(query)}&hasImages=true`);
            if (!searchRes.ok) throw new Error(`Met Museum ${searchRes.status}`);
            const searchData = await searchRes.json();
            const ids = searchData.objectIDs || [];

            if (ids.length === 0) return { results: [], total: 0, page: 1, hasMore: false };

            const total = ids.length;
            const start = ((page || 1) - 1) * (perPage || 24);
            const slice = ids.slice(start, start + (perPage || 24));

            const results = await fetchBatch(slice);

            return {
                results,
                total,
                page: page || 1,
                hasMore: start + slice.length < total
            };
        }
    };
})();
