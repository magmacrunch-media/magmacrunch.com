/**
 * openverse.js — Openverse (WordPress) CC-licensed media search
 * No API key required.
 */
(function() {
    'use strict';

    const API = 'https://api.openverse.org/v1';

    window.Providers = window.Providers || {};

    window.Providers.openverse = {
        name: 'openverse',
        label: 'Openverse',
        color: '#c45fff',
        needsKey: false,

        async search(query, page, perPage, filters) {
            const type = filters.type === 'video' ? 'video' : 'images';
            const params = new URLSearchParams({
                q: query,
                page: page || 1,
                page_size: perPage || 24,
                format: 'json'
            });

            if (filters.orientation === 'horizontal') params.set('aspect_ratio', 'landscape');
            else if (filters.orientation === 'vertical') params.set('aspect_ratio', 'portrait');
            else if (filters.orientation === 'square') params.set('aspect_ratio', 'square');

            const res = await fetch(`${API}/${type}/?${params}`);
            if (!res.ok) throw new Error(`Openverse ${res.status}`);
            const data = await res.json();

            return {
                results: (data.results || []).map(r => ({
                    id: r.id,
                    title: r.title || 'Untitled',
                    thumbnail: r.thumbnail || r.url || '',
                    fullUrl: r.url || r.original || '',
                    source: 'openverse',
                    license: r.license || r.license_version || '',
                    licenseUrl: r.license_url || '',
                    type: r.media_type === 'audio' ? 'audio' : r.media_type === 'video' ? 'video' : 'image',
                    dimensions: r.dimensions || null,
                    author: r.creator || '',
                    sourceUrl: r.foreign_landing_url || r.detail_url || ''
                })),
                total: data.result_count || 0,
                page: page || 1,
                hasMore: (data.results || []).length === (perPage || 24)
            };
        }
    };
})();
