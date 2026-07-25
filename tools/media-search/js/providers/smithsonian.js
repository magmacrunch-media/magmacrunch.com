/**
 * smithsonian.js — Smithsonian Open Access API
 * No API key required.
 */
(function() {
    'use strict';

    const API = 'https://api.si.edu/openaccess/api/v1.0/search';

    window.Providers = window.Providers || {};

    window.Providers.smithsonian = {
        name: 'smithsonian',
        label: 'Smithsonian',
        color: '#f4845f',
        needsKey: false,

        async search(query, page, perPage) {
            const params = new URLSearchParams({
                q: query,
                rows: perPage || 24,
                start: ((page || 1) - 1) * (perPage || 24),
                api_key: 'DEMO_KEY' // Free demo key, rate limited but works
            });

            const res = await fetch(`${API}?${params}`);
            if (!res.ok) throw new Error(`Smithsonian ${res.status}`);
            const data = await res.json();

            const rows = data.response?.rows || [];

            return {
                results: rows.map(r => {
                    const content = r.content || {};
                    const desc = content.descriptiveNonRepeating || {};
                    const freetext = content.freetext || {};
                    const index = content.indexedStructured || {};

                    const img = desc.online_media?.media?.[0]?.content || desc.primaryMedia?.[0] || '';
                    const thumb = desc.online_media?.media?.[0]?.thumbnail || img;

                    return {
                        id: r.id || desc.record_ID || '',
                        title: desc.title?.content || desc.title || 'Untitled',
                        thumbnail: thumb || '',
                        fullUrl: img || '',
                        source: 'smithsonian',
                        license: 'PD',
                        licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
                        type: 'image',
                        dimensions: null,
                        author: index.name?.join(', ') || '',
                        sourceUrl: desc.record_link || r.content?.descriptiveNonRepeating?.record_link || ''
                    };
                }).filter(r => r.thumbnail),
                total: data.response?.rowCount || 0,
                page: page || 1,
                hasMore: rows.length === (perPage || 24)
            };
        }
    };
})();
