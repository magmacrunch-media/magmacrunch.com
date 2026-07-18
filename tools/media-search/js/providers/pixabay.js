/**
 * pixabay.js — Pixabay photos, illustrations, and video search
 * Requires API key (free at pixabay.com/api/docs).
 */
(function() {
    'use strict';

    const API = 'https://pixabay.com/api/';

    window.Providers = window.Providers || {};

    window.Providers.pixabay = {
        name: 'pixabay',
        label: 'Pixabay',
        color: '#00f5ff',
        needsKey: true,

        async search(query, page, perPage, filters, apiKey) {
            if (!apiKey) return { results: [], total: 0, page: 1, hasMore: false };

            const isVideo = filters.type === 'video';
            const endpoint = isVideo ? 'https://pixabay.com/api/videos/' : API;
            const params = new URLSearchParams({
                key: apiKey,
                q: query,
                page: page || 1,
                per_page: perPage || 24,
                safesearch: 'true'
            });

            if (filters.orientation && !isVideo) {
                if (filters.orientation === 'horizontal') params.set('orientation', 'horizontal');
                else if (filters.orientation === 'vertical') params.set('orientation', 'vertical');
                else if (filters.orientation === 'square') params.set('orientation', 'square');
            }

            const res = await fetch(`${endpoint}?${params}`);
            if (!res.ok) throw new Error(`Pixabay ${res.status}`);
            const data = await res.json();

            if (isVideo) {
                return {
                    results: (data.hits || []).map(v => {
                        const vid = v.videos?.medium || v.videos?.small || {};
                        return {
                            id: v.id,
                            title: v.tags || 'Video',
                            thumbnail: v.picture_id ? `https://i.vimeocdn.com/video/${v.picture_id}_640x360.jpg` : '',
                            fullUrl: vid.url || '',
                            source: 'pixabay',
                            license: 'free-commercial',
                            licenseUrl: 'https://pixabay.com/service/license-summary/',
                            type: 'video',
                            dimensions: vid.size ? { w: vid.size.split('x')[0], h: vid.size.split('x')[1] } : null,
                            author: v.user || '',
                            sourceUrl: v.pageURL || ''
                        };
                    }),
                    total: data.totalHits || 0,
                    page: page || 1,
                    hasMore: (data.hits || []).length === (perPage || 24)
                };
            }

            return {
                results: (data.hits || []).map(p => ({
                    id: p.id,
                    title: p.tags || 'Image',
                    thumbnail: p.webformatURL || '',
                    fullUrl: p.largeImageURL || p.fullHDURL || p.webformatURL || '',
                    source: 'pixabay',
                    license: 'free-commercial',
                    licenseUrl: 'https://pixabay.com/service/license-summary/',
                    type: 'image',
                    dimensions: p.imageWidth && p.imageHeight ? { w: p.imageWidth, h: p.imageHeight } : null,
                    author: p.user || '',
                    sourceUrl: p.pageURL || ''
                })),
                total: data.totalHits || 0,
                page: page || 1,
                hasMore: (data.hits || []).length === (perPage || 24)
            };
        }
    };
})();
