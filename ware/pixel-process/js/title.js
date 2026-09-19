/* ── title.js — the title screen, drawn by the tool's own effects ── */

(function() {
    'use strict';

    var overlay = document.getElementById('titleScreen');
    var canvas = overlay && document.getElementById('titleCanvas');
    if (!overlay || !canvas) return;

    /* The wordmark is READ from the page heading. It is never written here.

       A rename is cheap in this app precisely because nothing derives a symbol
       or a literal from the name: the globals are Canvas, Chain, Generators,
       UI. A title screen is exactly the sort of file that would quietly become
       a second place to change, and the name is still provisional, so this
       takes the text from the h1 that already carries it and adds no new
       occurrence of it to the tree. tests/test-effects.js checks that. */
    var heading = document.querySelector('header h1');
    var WORDMARK = heading ? heading.textContent.trim() : '';
    if (!WORDMARK) {
        // Never show an empty title screen. If the heading has moved, the
        // right failure is no splash at all rather than a blank one.
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        return;
    }

    var W = 384, H = 72;
    var MAX_FONT_PX = 24;
    var BURST_MS = 2500;
    var BURST_AT = 0.55;
    var BURST_LEN = 0.14;

    var theme = getComputedStyle(document.documentElement);
    var BG = (theme.getPropertyValue('--bg') || '#0a0808').trim();
    var FG = (theme.getPropertyValue('--text') || '#f5e6c8').trim();

    canvas.width = W;
    canvas.height = H;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', WORDMARK);
    var ctx = canvas.getContext('2d');

    var registry = (window.Chain && Chain.getRegistry) ? Chain.getRegistry() : {};
    var frameImg = ctx.createImageData(W, H);
    var a = new Uint8ClampedArray(W * H * 4);
    var b = new Uint8ClampedArray(W * H * 4);
    var pristine = null;
    var rafId = 0;
    var started = 0;
    var dismissed = false;

    /* The wordmark, once, into an ImageData the animation re-reads every frame.

       Filled opaque and in the overlay's own background colour rather than
       left transparent: every effect writes alpha 255 and reads its source as
       opaque, so a transparent background would come through as a black slab
       the moment the first effect ran. */
    function drawWordmark() {
        var c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        var g = c.getContext('2d');

        g.fillStyle = BG;
        g.fillRect(0, 0, W, H);

        // Shrink to fit rather than assuming the current name fits. A longer
        // name is a rename away, and this is the one place that would clip.
        var size = MAX_FONT_PX;
        g.font = size + "px 'Press Start 2P', monospace";
        while (size > 8 && g.measureText(WORDMARK).width > W - 24) {
            size -= 1;
            g.font = size + "px 'Press Start 2P', monospace";
        }

        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = FG;
        g.fillText(WORDMARK, W / 2, H / 2);
        return g.getImageData(0, 0, W, H);
    }

    /* One effect, from the real registry, over the working buffer.

       This is the point of the screen: the title is processed by the same code
       the tool processes images with, so it demonstrates the product rather
       than illustrating it, and it cannot drift from what the effects do.

       A throwing effect is skipped, for the reason chain.js gives at length:
       an exception escaping here would leave the splash frozen on whatever it
       last drew, over a workspace nobody can reach. */
    function apply(type, params) {
        var def = registry[type];
        if (!def) return;
        try {
            def.fn(a, b, params, W, H);
        } catch (e) {
            return;
        }
        var swap = a;
        a = b;
        b = swap;
    }

    function render(elapsed) {
        if (!pristine) return;
        a.set(pristine.data);

        /* Mostly still, with one burst part way through each cycle. The calm
           either side is what makes the burst read as a glitch rather than as
           noise.

           The burst deliberately does not sit at the start of the cycle. It did
           at first, which put peak corruption at elapsed 0 and left the
           wordmark illegible on the opening frame. That is not a cosmetic
           detail: frame 0 is the ONLY frame drawn in a background tab, where
           rAF never fires, and under prefers-reduced-motion, where the loop
           never starts. Both would have shown a permanent smear. */
        var cycle = (elapsed % BURST_MS) / BURST_MS;
        var into = cycle - BURST_AT;
        var burst = (into >= 0 && into < BURST_LEN) ? (1 - into / BURST_LEN) : 0;
        burst = burst * burst;
        var seed = Math.floor(elapsed / BURST_MS) % 1000;

        var split = Math.round(1 + burst * 8);
        apply('channel-shift', { rx: split, ry: 0, gx: 0, gy: 0, bx: -split, by: 0 });

        if (burst > 0.02) {
            apply('row-displace', {
                amount: Math.round(burst * 14),
                axis: 0,
                pattern: 2,
                frequency: 6,
                seed: seed
            });
            apply('block-corrupt', {
                intensity: 70,
                blockSize: 10,
                count: Math.max(1, Math.round(burst * 7)),
                seed: seed
            });
        }

        frameImg.data.set(a);
        ctx.putImageData(frameImg, 0, 0);
    }

    function loop(now) {
        if (dismissed) return;
        if (!started) started = now;
        render(now - started);
        rafId = requestAnimationFrame(loop);
    }

    function dismiss() {
        if (dismissed) return;
        dismissed = true;
        if (rafId) cancelAnimationFrame(rafId);
        document.removeEventListener('keydown', dismiss);
        overlay.classList.add('is-leaving');
        // Matches the transition in style.css. Removing it rather than hiding
        // it keeps the workspace free of a full-screen element that would go
        // on swallowing drops and pastes.
        window.setTimeout(function() {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 320);
    }

    /* Never preventDefault here. Ctrl+V is how an image gets into this tool,
       and a splash that ate the first paste would look exactly like paste
       being broken. Dismissing on the modifier keydown means the paste lands
       in a workspace that is already clear. */
    overlay.addEventListener('click', dismiss);
    overlay.addEventListener('touchstart', dismiss, { passive: true });
    document.addEventListener('keydown', dismiss);

    /* A font that never settles must not leave the splash blank. document.fonts
       is asked, and a timeout answers for it if it does not. */
    function whenFontReady(cb) {
        if (!document.fonts || !document.fonts.load) { cb(); return; }
        var fired = false;
        function go() {
            if (fired) return;
            fired = true;
            cb();
        }
        try {
            document.fonts.load(MAX_FONT_PX + "px 'Press Start 2P'").then(go, go);
        } catch (e) {
            go();
            return;
        }
        window.setTimeout(go, 1200);
    }

    whenFontReady(function() {
        if (dismissed) return;
        pristine = drawWordmark();

        // One frame synchronously, before any rAF. A background tab never
        // fires rAF at all, and a splash that is blank until focus is worse
        // than one that does not animate.
        render(0);

        var reduce = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) return;

        rafId = requestAnimationFrame(loop);
    });
})();
