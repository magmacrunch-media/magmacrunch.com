/**
 * cache.js — localStorage cache for recent searches
 */
(function() {
    'use strict';

    const CACHE_KEY = 'media-search-cache';
    const CACHE_MAX = 20;
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

    function getCache() {
        try {
            return JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
        } catch {
            return {};
        }
    }

    /* getCache already tolerated unreadable storage; this end did not, and a
       throw here escapes Cache.set into the middle of a search. localStorage
       is ~5 MB and an entry holds whole result pages, so the quota is
       reachable well before CACHE_MAX entries — and Safari's private mode
       throws on the first write regardless.

       Dropping the oldest entries and retrying keeps the cache useful; giving
       up entirely just means no caching, which is survivable. Nothing here is
       worth failing a search over. */
    function setCache(cache) {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
            return true;
        } catch {
            const byAge = Object.keys(cache).sort((a, b) => cache[a].ts - cache[b].ts);
            for (const key of byAge) {
                delete cache[key];
                try {
                    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
                    return true;
                } catch { /* still too big — keep dropping */ }
            }
            try { localStorage.removeItem(CACHE_KEY); } catch { /* nothing more to try */ }
            return false;
        }
    }

    function makeKey(query, sources, filters) {
        return JSON.stringify({ query, sources, filters });
    }

    window.Cache = {
        get(query, sources, filters) {
            const cache = getCache();
            const key = makeKey(query, sources, filters);
            const entry = cache[key];
            if (!entry) return null;
            if (Date.now() - entry.ts > CACHE_TTL) {
                delete cache[key];
                setCache(cache);
                return null;
            }
            return entry.data;
        },

        set(query, sources, filters, data) {
            const cache = getCache();
            const key = makeKey(query, sources, filters);
            cache[key] = { data, ts: Date.now() };
            // Evict oldest if over limit
            const keys = Object.keys(cache);
            if (keys.length > CACHE_MAX) {
                const oldest = keys.sort((a, b) => cache[a].ts - cache[b].ts)[0];
                delete cache[oldest];
            }
            setCache(cache);
        },

        clear() {
            localStorage.removeItem(CACHE_KEY);
        }
    };
})();
