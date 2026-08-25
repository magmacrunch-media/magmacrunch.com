/* ── corrupt.js — block corruption and dead pixels ── */

(function() {
    'use strict';

    // BLOCK CORRUPT
    Chain.register('block-corrupt', {
        name: 'BLOCK CORRUPT',
        defaults: { intensity: 30, blockSize: 16, count: 8, seed: 0 },
        fn: function(src, dst, p, w, h) {
            // Copy source
            for (var i = 0; i < src.length; i++) dst[i] = src[i];

            var rng = mulberry32(p.seed * 12345 + 67890);
            var blocks = p.count;
            var bs = Math.max(2, Math.min(p.blockSize, w, h));

            for (var b = 0; b < blocks; b++) {
                // Random source block
                var sx = Math.floor(rng() * (w - bs));
                var sy = Math.floor(rng() * (h - bs));
                // Random dest block (offset from source)
                var dx = sx + Math.floor((rng() - 0.5) * p.intensity);
                var dy = sy + Math.floor((rng() - 0.5) * p.intensity);

                for (var y = 0; y < bs; y++) {
                    for (var x = 0; x < bs; x++) {
                        var srcX = sx + x;
                        var srcY = sy + y;
                        var dstX = ((dx + x) % w + w) % w;
                        var dstY = ((dy + y) % h + h) % h;

                        if (srcX >= 0 && srcX < w && srcY >= 0 && srcY < h &&
                            dstX >= 0 && dstX < w && dstY >= 0 && dstY < h) {
                            var si = (srcY * w + srcX) * 4;
                            var di = (dstY * w + dstX) * 4;
                            dst[di]   = src[si];
                            dst[di+1] = src[si+1];
                            dst[di+2] = src[si+2];
                            dst[di+3] = src[si+3];
                        }
                    }
                }
            }
        }
    });

    // DEAD PIXELS
    Chain.register('dead-pixels', {
        name: 'DEAD PIXELS',
        defaults: { density: 20, color: 0, seed: 0 },
        // color: 0=random, 1=black, 2=white
        fn: function(src, dst, p, w, h) {
            for (var i = 0; i < src.length; i++) dst[i] = src[i];

            var rng = mulberry32(p.seed * 54321 + 13579);
            var total = w * h;
            var deadCount = Math.floor(total * p.density / 1000);

            for (var d = 0; d < deadCount; d++) {
                var idx = Math.floor(rng() * total);
                var pi = idx * 4;

                if (p.color === 0) {
                    dst[pi]   = Math.floor(rng() * 256);
                    dst[pi+1] = Math.floor(rng() * 256);
                    dst[pi+2] = Math.floor(rng() * 256);
                } else if (p.color === 1) {
                    dst[pi] = 0; dst[pi+1] = 0; dst[pi+2] = 0;
                } else {
                    dst[pi] = 255; dst[pi+1] = 255; dst[pi+2] = 255;
                }
                dst[pi+3] = 255;
            }
        }
    });

    // Seeded PRNG (mulberry32)
    function mulberry32(seed) {
        var s = seed | 0;
        return function() {
            s = s + 0x6D2B79F5 | 0;
            var t = Math.imul(s ^ s >>> 15, 1 | s);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

})();
