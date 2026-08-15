/**
 * sw.js — MAGMA//OPS service worker
 * Minimal offline caching for PWA install
 */

var CACHE = 'ops-v5';
var SHELL = [
    '/',
    '/style.css',
    '/shared.js',
    '/arcade.js',
    '/mc1.js',
    '/jukebox.js',
    '/theme.js',
    '/accounts.js',
    '/api.js',
    '/tv.js',
    '/favicons.js',
    '/github.js',
    '/bots.js',
    '/plays.js'
];

self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open(CACHE).then(function(cache) {
            return cache.addAll(SHELL);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', function(e) {
    e.waitUntil(
        caches.keys().then(function(names) {
            return Promise.all(
                names.filter(function(name) { return name !== CACHE; })
                     .map(function(name) { return caches.delete(name); })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', function(e) {
    // Network-first for API calls, cache-first for static assets
    if (e.request.url.includes('/api/') || e.request.headers.get('upgrade') === 'websocket') {
        return;
    }

    e.respondWith(
        caches.match(e.request).then(function(cached) {
            var fetched = fetch(e.request).then(function(response) {
                if (response && response.status === 200) {
                    var clone = response.clone();
                    caches.open(CACHE).then(function(cache) {
                        cache.put(e.request, clone);
                    });
                }
                return response;
            }).catch(function() {
                return cached;
            });
            return cached || fetched;
        })
    );
});
