/* ── displace.js — row/column displacement and wave distortion ── */

(function() {
    'use strict';

    // ROW DISPLACE
    Chain.register('row-displace', {
        name: 'ROW DISPLACE',
        defaults: { amount: 8, axis: 0, pattern: 0, frequency: 4, seed: 0 },
        // axis: 0=horizontal rows, 1=vertical columns
        // pattern: 0=sine, 1=sawtooth, 2=random
        fn: function(src, dst, p, w, h) {
            var amt = p.amount;
            var freq = p.frequency;

            // Seeded PRNG for random pattern
            var rng = Chain.rng(p.seed * 98765 + 43210);

            if (p.axis === 0) {
                // Displace rows horizontally
                for (var y = 0; y < h; y++) {
                    var offset;
                    if (p.pattern === 0) {
                        offset = Math.round(Math.sin(y * freq * 0.1) * amt);
                    } else if (p.pattern === 1) {
                        offset = Math.round(((y * freq * 0.1) % 2 - 1) * amt);
                    } else {
                        offset = Math.round((rng() * 2 - 1) * amt);
                    }

                    for (var x = 0; x < w; x++) {
                        var sx = ((x - offset + w) % w);
                        var si = (y * w + sx) * 4;
                        var di = (y * w + x) * 4;
                        dst[di]   = src[si];
                        dst[di+1] = src[si+1];
                        dst[di+2] = src[si+2];
                        dst[di+3] = src[si+3];
                    }
                }
            } else {
                // Displace columns vertically
                for (var x = 0; x < w; x++) {
                    var offset;
                    if (p.pattern === 0) {
                        offset = Math.round(Math.sin(x * freq * 0.1) * amt);
                    } else if (p.pattern === 1) {
                        offset = Math.round(((x * freq * 0.1) % 2 - 1) * amt);
                    } else {
                        offset = Math.round((rng() * 2 - 1) * amt);
                    }

                    for (var y = 0; y < h; y++) {
                        var sy = ((y - offset + h) % h);
                        var si = (sy * w + x) * 4;
                        var di = (y * w + x) * 4;
                        dst[di]   = src[si];
                        dst[di+1] = src[si+1];
                        dst[di+2] = src[si+2];
                        dst[di+3] = src[si+3];
                    }
                }
            }
        }
    });

    // WAVE DISTORTION
    Chain.register('wave-distort', {
        name: 'WAVE DISTORTION',
        defaults: { amplitude: 6, frequency: 8, axis: 0, phase: 0 },
        fn: function(src, dst, p, w, h) {
            var amp = p.amplitude;
            var freq = p.frequency * 0.05;
            var ph = p.phase * 0.1;

            if (p.axis === 0) {
                // Wave rows horizontally
                for (var y = 0; y < h; y++) {
                    var offset = Math.round(Math.sin(y * freq + ph) * amp);
                    for (var x = 0; x < w; x++) {
                        var sx = ((x - offset + w) % w);
                        var si = (y * w + sx) * 4;
                        var di = (y * w + x) * 4;
                        dst[di]   = src[si];
                        dst[di+1] = src[si+1];
                        dst[di+2] = src[si+2];
                        dst[di+3] = src[si+3];
                    }
                }
            } else {
                // Wave columns vertically
                for (var x = 0; x < w; x++) {
                    var offset = Math.round(Math.sin(x * freq + ph) * amp);
                    for (var y = 0; y < h; y++) {
                        var sy = ((y - offset + h) % h);
                        var si = (sy * w + x) * 4;
                        var di = (y * w + x) * 4;
                        dst[di]   = src[si];
                        dst[di+1] = src[si+1];
                        dst[di+2] = src[si+2];
                        dst[di+3] = src[si+3];
                    }
                }
            }
        }
    });

})();
