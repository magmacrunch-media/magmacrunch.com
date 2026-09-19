/* ── feedback.js — video feedback echo / recursive blend ── */

(function() {
    'use strict';

    /* Per channel, in Float32, with the source index map resolved once.

       This used to hold two Float64Array of w * h * 4: sixty-four bytes for
       every pixel of the image, live for as long as the tab is open. At twelve
       megapixels that is 768MB, which no WKWebView survives, and it was the
       single largest obstacle to exporting at full resolution.

       Four changes, none of which cost anything:

       The alpha channel was carried through the entire feedback loop, written
       as the constant 1 on every iteration, and then thrown away for a constant
       255. Dropping it removes a quarter of the memory and a quarter of the
       work.

       The three colour channels never interact. The spatial transform is
       identical for all of them and the blend is per channel, so they can run
       one at a time over a buffer a third the size, which is also far kinder to
       cache.

       The transform does not depend on the iteration, so it is resolved once
       into an index map and reused, rather than recomputing a rotate, a scale,
       an offset, two rounds and two modulos per pixel per iteration. At the
       default five iterations that is five times less address arithmetic, and
       at the maximum twenty it is twenty.

       Float32 rather than Float64 gives up accuracy the output cannot
       represent, since the result is quantized to eight bits per channel at the
       end. Measured against the Float64 version at 256 by 256: the worst
       difference anywhere is one level, it occurs only at a single iteration,
       and at five, twelve and twenty iterations the two agree byte for byte.
       The effect converges, so the narrower type washes out rather than
       accumulating. The suite's golden for this effect runs at four iterations
       and did not move at all.

       Of the bytes that do differ at one iteration, 8249 are the narrower type
       and 410 are `* (1/255)` replacing `/ 255` in the inner loop. That split
       was measured rather than assumed, and it came out the opposite way round
       from the guess.

       Net: sixty-four bytes per pixel down to twelve, so twelve megapixels goes
       from 768MB to 144MB, and 256 by 256 at twelve iterations went from 1393ms
       to 238ms for five runs. */
    var chanA = null, chanB = null, indexMap = null, cachedPixels = -1;

    function ensureBuffers(pixels) {
        if (cachedPixels === pixels) return;
        chanA = new Float32Array(pixels);
        chanB = new Float32Array(pixels);
        indexMap = new Int32Array(pixels);
        cachedPixels = pixels;
    }

    var INV255 = 1 / 255;

    // FEEDBACK ECHO
    Chain.register('feedback', {
        name: 'FEEDBACK ECHO',
        /* The `scale` parameter below is a ratio and `rotation` is an angle;
           `decay` and `iterations` are neither spatial nor measured in pixels.
           Only the two offsets are lengths. Note this key and that parameter
           share a name by accident of vocabulary, which is exactly why the key
           is called `spatial` rather than `scale`. */
        spatial: { lengths: ['offsetX', 'offsetY'] },
        defaults: {
            iterations: 5,
            decay: 0.7,
            offsetX: 2,
            offsetY: 1,
            scale: 0.98,
            rotation: 1
        },
        fn: function(src, dst, p, w, h) {
            var pixels = w * h;
            ensureBuffers(pixels);

            var decay = Math.max(0, Math.min(1, p.decay));
            var mix = 1 - decay;
            var ox = p.offsetX;
            var oy = p.offsetY;
            var sc = p.scale;
            var rot = p.rotation * Math.PI / 180;
            var cosR = Math.cos(rot);
            var sinR = Math.sin(rot);
            var cx = w / 2;
            var cy = h / 2;
            var iterations = p.iterations;
            var x, y, i, c, iter;

            // Where each pixel reads from. Rotate, scale, offset, then wrap
            // toroidally, exactly as before, but once rather than per iteration.
            for (y = 0; y < h; y++) {
                for (x = 0; x < w; x++) {
                    var dx = x - cx;
                    var dy = y - cy;

                    var rx = dx * cosR - dy * sinR;
                    var ry = dx * sinR + dy * cosR;

                    rx = rx / sc;
                    ry = ry / sc;

                    rx += ox;
                    ry += oy;

                    var sx = Math.round(rx + cx);
                    var sy = Math.round(ry + cy);

                    sx = ((sx % w) + w) % w;
                    sy = ((sy % h) + h) % h;

                    indexMap[y * w + x] = sy * w + sx;
                }
            }

            for (c = 0; c < 3; c++) {
                var a = chanA;
                var b = chanB;

                for (i = 0; i < pixels; i++) {
                    a[i] = src[i * 4 + c] * INV255;
                }

                for (iter = 0; iter < iterations; iter++) {
                    for (i = 0; i < pixels; i++) {
                        // Decayed feedback plus the original source re-injected.
                        b[i] = a[indexMap[i]] * decay + src[i * 4 + c] * INV255 * mix;
                    }
                    var swap = a;
                    a = b;
                    b = swap;
                }

                for (i = 0; i < pixels; i++) {
                    var v = Math.round(a[i] * 255);
                    dst[i * 4 + c] = v < 0 ? 0 : (v > 255 ? 255 : v);
                }
            }

            for (i = 3; i < pixels * 4; i += 4) {
                dst[i] = 255;
            }
        }
    });

})();
