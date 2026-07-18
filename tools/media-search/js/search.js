/**
 * search.js — Unified search orchestrator
 * Fans out queries to enabled providers, normalizes and merges results.
 */
(function() {
    'use strict';

    window.Search = (function() {
        let apiKeys = {};
        let enabledProviders = ['openverse', 'pexels', 'pixabay', 'met_museum', 'smithsonian', 'archive'];

        function setApiKeys(keys) {
            apiKeys = keys || {};
        }

        function setEnabledProviders(list) {
            enabledProviders = list;
        }

        function getEnabledProviders() {
            return enabledProviders;
        }

        async function searchProvider(providerId, query, page, perPage, filters) {
            const provider = window.Providers[providerId];
            if (!provider) return null;

            const key = apiKeys[providerId] || '';
            return provider.search(query, page, perPage, filters, key);
        }

        async function search(query, page, perPage, filters) {
            const promises = enabledProviders.map(id =>
                searchProvider(id, query, page, perPage, filters).catch(err => {
                    console.warn(`[Search] ${id} failed:`, err);
                    return null;
                })
            );

            const results = await Promise.all(promises);
            const merged = [];
            let total = 0;
            let hasMore = false;

            results.forEach(r => {
                if (!r) return;
                merged.push(...r.results);
                total += r.total || 0;
                if (r.hasMore) hasMore = true;
            });

            return { results: merged, total, hasMore, page };
        }

        return {
            setApiKeys,
            setEnabledProviders,
            getEnabledProviders,
            search
        };
    })();
})();
