/**
 * internet-archive.js — Internet Archive advanced search
 * No API key required.
 */
(function() {
    'use strict';

    const API = 'https://archive.org/advancedsearch.php';

    window.Providers = window.Providers || {};

    window.Providers.archive = {
        name: 'archive',
        label: 'Archive.org',
        color: '#e8637a',
        needsKey: false,

        async search(query, page, perPage, filters) {
            const mediatype = filters.type === 'video' ? 'movies' :
                              filters.type === 'audio' ? 'audio' :
                              filters.type === 'image' ? 'image' : null;

            const typeFilter = mediatype
                ? `mediatype:${mediatype}`
                : 'mediatype:(image OR movies OR audio)';

            const params = new URLSearchParams({
                q: `${query} ${typeFilter}`,
                fl: 'identifier,title,mediatype,item_size,description',
                rows: perPage || 24,
                page: page || 1,
                output: 'json',
                sort: 'downloads desc'
            });

            const res = await fetch(`${API}?${params}`);
            if (!res.ok) throw new Error(`Archive ${res.status}`);
            const data = await res.json();
            const docs = data.response?.docs || [];

            return {
                results: docs.map(doc => {
                    const id = doc.identifier;
                    const type = doc.mediatype === 'movies' ? 'video' :
                                 doc.mediatype === 'audio' ? 'audio' : 'image';
                    const thumbUrl = `https://archive.org/services/img/${id}`;
                    const detailsUrl = `https://archive.org/details/${id}`;
                    const downloadUrl = `https://archive.org/download/${id}`;

                    return {
                        id,
                        title: doc.title || id,
                        thumbnail: thumbUrl,
                        fullUrl: downloadUrl,
                        source: 'archive',
                        license: 'various',
                        licenseUrl: 'https://archive.org/about/terms.php',
                        type,
                        dimensions: null,
                        author: '',
                        sourceUrl: detailsUrl
                    };
                }),
                total: data.response?.numFound || 0,
                page: page || 1,
                hasMore: docs.length === (perPage || 24)
            };
        }
    };
})();
