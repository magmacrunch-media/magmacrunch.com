/* ── render.js — the effect chain, off the main thread ── */

(function() {
    'use strict';

    /* ## Why the worker is built from a Blob rather than a file
     *
     * `scripts/check-cache-busters.mjs` scans `.html` and nothing else, so a
     * `?v=` stamp can only be attached to a reference written in a page. A
     * `js/worker.js` on disk would therefore be fetched unstamped, and so would
     * every `importScripts` inside it, which is the exact failure that file
     * exists to prevent: a deploy where the page has a fresh `chain.js` and the
     * worker is still running the cached old one, producing an image that
     * disagrees with the code, with nothing anywhere saying so.
     *
     * So there is no worker file. The bootstrap below is a string in THIS file,
     * which the page loads with a stamp like everything else, and the scripts
     * it imports are the page's own `<script src>` URLs, read out of the DOM at
     * runtime. The worker therefore imports exactly the files the page loaded,
     * with exactly the stamps the page used, and cannot drift from it by
     * construction. Nothing new has to be kept in step by hand.
     *
     * ## What runs where
     *
     * The worker holds its own copy of `chain.js` and the effects. It owns no
     * state between messages: every render carries the whole chain as plain
     * data and is rebuilt there. That is a few dozen small objects per render
     * against a megapixel of image, and it removes the entire class of bug
     * where the two sides disagree about what the chain is.
     */

    var BOOTSTRAP = [
        'self.window = self;',
        'self.onmessage = function (e) {',
        '  var m = e.data;',
        '  if (m.type === "init") {',
        '    try { importScripts.apply(null, m.scripts); }',
        '    catch (err) { self.postMessage({ type: "failed", why: String(err) }); return; }',
        '    self.postMessage({ type: "ready" });',
        '    return;',
        '  }',
        '  if (m.type !== "render") return;',
        '  Chain.clearEffects();',
        '  for (var i = 0; i < m.chain.length; i++) {',
        '    var made = Chain.addEffect(m.chain[i].type);',
        '    if (!made) continue;',
        '    made.params = m.chain[i].params;',
        '    made.enabled = m.chain[i].enabled;',
        '  }',
        '  var src = new ImageData(new Uint8ClampedArray(m.src), m.w, m.h);',
        '  var res = Chain.process(src, m.w, m.h);',
        '  var out = new Uint8ClampedArray(res.data);',
        '  self.postMessage({',
        '    type: "done", id: m.id, w: m.w, h: m.h,',
        '    pixels: out.buffer, failures: Chain.getLastFailures()',
        '  }, [out.buffer]);',
        '};'
    ].join('\n');

    /* The core files, picked out of the page's own script tags.
     *
     * Exported and written against a plain list so tests/test-page.js can feed
     * it the real `<script src>` values parsed from index.html and check that
     * it selects every effect file on disk. An effect added to the page but
     * missed here would simply not be applied in the worker, and the image
     * would be quietly wrong rather than broken.
     */
    function coreScripts(srcs) {
        var out = [];
        for (var i = 0; i < srcs.length; i++) {
            var src = srcs[i];
            if (/(^|\/)chain\.js(\?|$)/.test(src) || /(^|\/)effects\/[^/]+\.js(\?|$)/.test(src)) {
                out.push(src);
            }
        }
        return out;
    }

    function pageScriptUrls() {
        var tags = document.querySelectorAll('script[src]');
        var srcs = [];
        for (var i = 0; i < tags.length; i++) srcs.push(tags[i].getAttribute('src'));
        var picked = coreScripts(srcs);
        // Absolute, because importScripts resolves against the worker's own
        // URL, which for a Blob worker is not this directory.
        var abs = [];
        for (var j = 0; j < picked.length; j++) abs.push(new URL(picked[j], document.baseURI).href);
        return abs;
    }

    // ── State ──

    var worker = null;
    var blobUrl = null;
    var busy = false;
    var pending = false;
    var nextId = 0;
    var watchdog = 0;

    /* Generous, because it is not a performance budget. A legitimate render of
       a megapixel with twenty feedback iterations is a few hundred milliseconds;
       this only fires when the worker has stopped answering at all, which would
       otherwise leave `busy` set forever and the picture frozen with no error
       anywhere. */
    var WATCHDOG_MS = 20000;

    function disable(why) {
        if (window.Chain && Chain.setAsyncRenderer) Chain.setAsyncRenderer(null);
        if (watchdog) { clearTimeout(watchdog); watchdog = 0; }
        if (worker) { worker.terminate(); worker = null; }
        if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
        busy = false;
        pending = false;
        if (why) console.warn('crunchscope: rendering on the main thread (' + why + ')');
        // Recover the picture on this thread, so a worker that dies mid-render
        // does not leave the last frame on screen.
        if (window.Chain && Chain.renderImmediate) Chain.renderImmediate();
    }

    function send() {
        if (!worker) return;

        // Before the source copy, not after. Canvas.getSourceImageData
        // allocates a full copy of the image, and a burst of edits used to
        // allocate and discard one per edit: four megabytes a go at 1024.
        if (busy) { pending = true; return; }

        var source = Canvas.getSourceImageData();
        if (!source) return;

        var w = Canvas.getWidth();
        var h = Canvas.getHeight();

        var spec = [];
        var effects = Chain.getEffects();
        for (var i = 0; i < effects.length; i++) {
            var params = {};
            for (var k in effects[i].params) params[k] = effects[i].params[k];
            spec.push({ type: effects[i].type, params: params, enabled: effects[i].enabled });
        }

        busy = true;
        nextId++;
        watchdog = setTimeout(function() {
            disable('the worker stopped answering');
        }, WATCHDOG_MS);

        // Canvas.getSourceImageData already hands back a fresh copy, so its
        // buffer is ours to give away and the transfer costs nothing.
        var buf = source.data.buffer;
        worker.postMessage({
            type: 'render', id: nextId, w: w, h: h, chain: spec, src: buf
        }, [buf]);
    }

    /* Coalesced on a microtask, not on requestAnimationFrame.

       rAF was the right debounce while rendering happened on this thread:
       there is no point producing more frames than the screen will show. Now
       that the work is in a worker it is the wrong one twice over. `busy` and
       `pending` already coalesce requests to exactly the rate the worker can
       sustain, which adapts to the image size instead of guessing; and rAF is
       throttled hard whenever the tab is not being composited. Measured at one
       tick per second in a background pane, which turned a 50ms render into
       789ms of latency for no benefit whatsoever.

       A microtask still collapses a synchronous burst, a size change and a new
       source and a chain edit in the same turn, into a single request. */
    var queued = false;

    function schedule() {
        if (queued) return;
        queued = true;
        Promise.resolve().then(function() {
            queued = false;
            send();
        });
    }

    function onMessage(e) {
        var m = e.data;

        if (m.type === 'failed') { disable('the worker could not load the effects'); return; }

        if (m.type === 'ready') {
            Chain.setAsyncRenderer(schedule);
            schedule();
            return;
        }

        if (m.type !== 'done') return;

        if (watchdog) { clearTimeout(watchdog); watchdog = 0; }
        busy = false;

        // Anything but the newest render is stale. Only one request is ever in
        // flight, so this is belt and braces rather than the main defence.
        if (m.id === nextId) {
            Canvas.display(new ImageData(new Uint8ClampedArray(m.pixels), m.w, m.h));
            UI.updateStat(m.failures);
        }

        if (pending) { pending = false; send(); }
    }

    function start() {
        if (typeof Worker === 'undefined' || typeof Blob === 'undefined') return;
        if (!window.Chain || !Chain.setAsyncRenderer) return;

        var scripts = pageScriptUrls();
        // Nothing to import means the page moved and this matcher did not.
        // Staying on the main thread is right; silently rendering with an empty
        // registry would not be.
        if (!scripts.length) { console.warn('crunchscope: no core scripts found, staying on the main thread'); return; }

        try {
            blobUrl = URL.createObjectURL(new Blob([BOOTSTRAP], { type: 'text/javascript' }));
            worker = new Worker(blobUrl);
        } catch (err) {
            disable('this browser refused a blob worker');
            return;
        }

        worker.onmessage = onMessage;
        worker.onerror = function() { disable('the worker errored'); };
        worker.postMessage({ type: 'init', scripts: scripts });
    }

    window.Render = {
        coreScripts: coreScripts,
        workerSource: BOOTSTRAP,
        isActive: function() { return !!worker; },
        disable: disable
    };

    start();
})();
