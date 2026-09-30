var CACHE = "boole-v1";
var PRECACHE = [
  "./index.html",
  "./manifest.json",
  "./favicon.ico",
  "./favicon-32x32.png",
  "./favicon-16x16.png",
  "./apple-touch-icon.png",
  "./img/mc-logo.png",
  "./img/boole-pixel.png",
  "./css/base.css",
  "./css/themes.css",
  "./css/container.css",
  "./css/game.css",
  "./css/modal-title.css",
  "./css/modal-lore.css",
  "./css/modal-difficulty.css",
  "./css/modal-scoreboard.css",
  "./css/modal-settings.css",
  "./css/modal-misc.css",
  "./css/responsive.css",
  "./css/gates.css",
  "./css/side-panels.css",
  "./css/math-overlay.css",
  "./css/codex.css",
  "./js/config.js",
  "./js/scoring.js",
  "./js/game.js",
  "./js/math-overlay.js",
  "./js/codex.js",
  "./js/rules-pages.js",
  "./js/main.js"
];

self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(PRECACHE);
    })
  );
});

self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE; })
             .map(function(n) { return caches.delete(n); })
      );
    })
  );
});

self.addEventListener("fetch", function(e) {
  var url = new URL(e.request.url);

  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.open(CACHE).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          var fetched = fetch(e.request).then(function(resp) {
            if (resp.ok) cache.put(e.request, resp.clone());
            return resp;
          }).catch(function() {
            return cached;
          });
          return cached || fetched;
        });
      })
    );
    return;
  }

  if (url.pathname.indexOf("/audio/") !== -1) {
    e.respondWith(
      caches.open(CACHE).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          var fetched = fetch(e.request).then(function(resp) {
            if (resp.ok) cache.put(e.request, resp.clone());
            return resp;
          }).catch(function() {
            return cached;
          });
          return cached || fetched;
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request);
    })
  );
});
