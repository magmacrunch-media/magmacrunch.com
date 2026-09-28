/* Loader for the volcano animation.
 *
 * Picks the desktop lava lamp or the 64x64 pixel fallback for the page's
 * #volcano canvas, and re-picks when the window crosses the breakpoint. The
 * choice used to be made once at load, so a window opened narrow and then
 * widened kept the mobile animation for ever.
 *
 * Each animation exposes window.__volcanoStop, which cancels its loop AND
 * removes its visibilitychange listener. A listener left behind restarts a
 * cancelled loop on the next tab switch, and two animations then draw into one
 * canvas.
 *
 * Nothing here trusts window.__pageCleanup, which is the SPA router's "this
 * page is going away" hook. It is a single global slot rather than a list, so
 * whoever writes it last wins and a page-owned cleanup can be clobbered by
 * anything nav.js injects afterwards. Instead gone() asks whether the canvas is
 * still in the document, on every resize; the animations carry the same
 * isConnected guard inside their own loops.
 *
 * Re-running this file is safe, which matters because the SPA router executes
 * the incoming page's body scripts on every navigation: a second loader would
 * otherwise race the first for the same canvas.
 */
(function () {
    if (window.__volcanoLoader) window.__volcanoLoader.teardown();

    var BREAKPOINT = 640;   // matches the CSS media queries on the host pages
    var SRC = {
        lamp:  '/animations/volcano-lamp.js',
        pixel: '/animations/volcano-pixel.js'
    };
    var current = null, tag = null, timer = null;

    function wanted() {
        return window.innerWidth > BREAKPOINT ? 'lamp' : 'pixel';
    }

    function gone() {
        var c = document.getElementById('volcano');
        return !c || !c.isConnected;
    }

    function load(mode) {
        if (mode === current) return;
        if (typeof window.__volcanoStop === 'function') window.__volcanoStop();
        window.__volcanoStop = null;
        if (tag && tag.parentNode) tag.parentNode.removeChild(tag);
        current = mode;
        tag = document.createElement('script');
        tag.src = SRC[mode];
        document.body.appendChild(tag);
    }

    function teardown() {
        clearTimeout(timer);
        window.removeEventListener('resize', onResize);
        if (typeof window.__volcanoStop === 'function') window.__volcanoStop();
        window.__volcanoStop = null;
        if (tag && tag.parentNode) tag.parentNode.removeChild(tag);
        tag = null;
        current = null;
        if (window.__volcanoLoader && window.__volcanoLoader.teardown === teardown) {
            window.__volcanoLoader = null;
        }
    }

    function onResize() {
        if (gone()) { teardown(); return; }
        clearTimeout(timer);
        timer = setTimeout(function () {
            if (gone()) teardown(); else load(wanted());
        }, 180);
    }

    if (gone()) return;   // nothing to draw into on this page

    window.__volcanoLoader = { teardown: teardown };
    load(wanted());
    window.addEventListener('resize', onResize);

    // Chained rather than assigned, so registering this does not itself become
    // the clobber described above.
    var prevCleanup = window.__pageCleanup;
    window.__pageCleanup = function () {
        teardown();
        if (typeof prevCleanup === 'function') prevCleanup();
    };
})();
