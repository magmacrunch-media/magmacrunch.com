/* ── feedback.js — video feedback echo / recursive blend ── */

(function() {
    'use strict';

    // Persistent buffers for feedback iterations
    var bufferA = null;
    var bufferB = null;
    var bufSize = 0;

    function ensureBuffers(size) {
        if (bufSize !== size) {
            bufferA = new Float64Array(size);
            bufferB = new Float64Array(size);
            bufSize = size;
        }
    }

    // FEEDBACK ECHO
    Chain.register('feedback', {
        name: 'FEEDBACK ECHO',
        defaults: {
            iterations: 5,
            decay: 0.7,
            offsetX: 2,
            offsetY: 1,
            scale: 0.98,
            rotation: 1
        },
        fn: function(src, dst, p, w, h) {
            var total = w * h * 4;
            ensureBuffers(total);

            // Init bufferA from source (normalized to 0-1 float)
            for (var i = 0; i < total; i++) {
                bufferA[i] = src[i] / 255;
            }

            var decay = Math.max(0, Math.min(1, p.decay));
            var ox = p.offsetX;
            var oy = p.offsetY;
            var sc = p.scale;
            var rot = p.rotation * Math.PI / 180;
            var cosR = Math.cos(rot);
            var sinR = Math.sin(rot);
            var cx = w / 2;
            var cy = h / 2;

            for (var iter = 0; iter < p.iterations; iter++) {
                // Read from bufferA, write to bufferB
                for (var y = 0; y < h; y++) {
                    for (var x = 0; x < w; x++) {
                        // Map output pixel back to source with transform
                        var dx = x - cx;
                        var dy = y - cy;

                        // Rotate
                        var rx = dx * cosR - dy * sinR;
                        var ry = dx * sinR + dy * cosR;

                        // Scale
                        rx = rx / sc;
                        ry = ry / sc;

                        // Offset
                        rx += ox;
                        ry += oy;

                        // Back to pixel coords
                        var sx = Math.round(rx + cx);
                        var sy = Math.round(ry + cy);

                        // Wrap (toroidal)
                        sx = ((sx % w) + w) % w;
                        sy = ((sy % h) + h) % h;

                        var si = (sy * w + sx) * 4;
                        var di = (y * w + x) * 4;

                        // Blend: decayed feedback + original source re-injection
                        var mix = 1 - decay;
                        bufferB[di]   = bufferA[si]   * decay + src[di]   / 255 * mix;
                        bufferB[di+1] = bufferA[si+1] * decay + src[di+1] / 255 * mix;
                        bufferB[di+2] = bufferA[si+2] * decay + src[di+2] / 255 * mix;
                        bufferB[di+3] = 1;
                    }
                }

                // Swap
                var tmp = bufferA;
                bufferA = bufferB;
                bufferB = tmp;
            }

            // Write final bufferA to dst
            for (var i = 0; i < total; i += 4) {
                dst[i]   = Math.max(0, Math.min(255, Math.round(bufferA[i]   * 255)));
                dst[i+1] = Math.max(0, Math.min(255, Math.round(bufferA[i+1] * 255)));
                dst[i+2] = Math.max(0, Math.min(255, Math.round(bufferA[i+2] * 255)));
                dst[i+3] = 255;
            }
        }
    });

})();
