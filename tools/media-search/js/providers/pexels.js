/**
 * pexels.js — Pexels photos and video search
 * Requires API key (free at pexels.com/api).
 */
(function() {
    'use strict';

    const API = 'https://api.pexels.com/v1';

    window.Providers = window.Providers || {};

    window.Providers.pexels = {
        name: 'pexels',
        label: 'Pexels',
        color: '#2ee8a5',
        needsKey: true,

        async search(query, page, perPage, filters, apiKey) {
            if (!apiKey) return { results: [], total: 0, page: 1, hasMore: false };

            const isVideo = filters.type === 'video';
            const endpoint = isVideo ? `${API}/videos/search` : `${API}/search`;
            const params = new URLSearchParams({
                query,
                page: page || 1,
                per_page: perPage || 24
            });

            if (!isVideo && filters.orientation) {
                params.set('orientation', filters.orientation);
            }

            const res = await fetch(`${endpoint}?${params}`, {
                headers: { 'Authorization': apiKey }
            });
            if (!res.ok) throw new Error(`Pexels ${res.status}`);
            const data = await res.json();

            if (isVideo) {
                return {
                    results: (data.videos || []).map(v => ({
                        id: v.id,
                        title: v.user?.name || 'Video',
                        thumbnail: v.video_pictures?.[0]?.image || '',
                        fullUrl: v.video_files?.[0]?.link || '',
                        source: 'pexels',
                        license: 'free-commercial',
                        licenseUrl: 'https://www.pexels.com/license/',
                        type: 'video',
                        dimensions: v.width && v.height ? { w: v.width, h: v.height } : null,
                        author: v.user?.name || '',
                        sourceUrl: v.url || ''
                    })),
                    total: data.total_results || 0,
                    page: page || 1,
                    hasMore: (data.videos || []).length === (perPage || 24)
                };
            }

            return {
                results: (data.photos || []).map(p => ({
                    id: p.id,
                    title: p.alt || 'Photo',
                    thumbnail: p.src?.medium || p.src?.small || '',
                    fullUrl: p.src?.original || '',
                    source: 'pexels',
                    license: 'free-commercial',
                    licenseUrl: 'https://www.pexels.com/license/',
                    type: 'image',
                    dimensions: p.width && p.height ? { w: p.width, h: p.height } : null,
                    author: p.photographer || '',
                    sourceUrl: p.url || ''
                })),
                total: data.total_results || 0,
                page: page || 1,
                hasMore: (data.photos || []).length === (perPage || 24)
            };
        }
    };
})();
