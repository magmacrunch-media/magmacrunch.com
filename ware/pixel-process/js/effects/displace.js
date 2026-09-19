/* ── displace.js — row/column displacement and wave distortion ── */

(function() {
    'use strict';

    /* A fixed-size table of seeded values, and a lookup by where a row
       falls in the image rather than by its index.

       ROW DISPLACE used to call the generator once per row, which meant a
       seed described a different picture at every height: 64 rows consumed
       64 values and 256 rows consumed 256, so the same seed produced finer
       noise the larger you rendered. Sampling a fixed table by normalized
       position gives the same bands at any size, and at Chain.REFERENCE the
       table is consumed exactly one entry per row, which is what this did
       before. */
    function noiseTable(seed) {
        var rng = Chain.rng(seed);
        var table = new Float64Array(Chain.REFERENCE);
        for (var i = 0; i < table.length; i++) table[i] = rng();
        return table;
    }

    function band(table, i, n) {
        var k = Math.floor((i / n) * table.length);
        if (k < 0) k = 0;
        if (k >= table.length) k = table.length - 1;
        return table[k];
    }

    // ROW DISPLACE
    Chain.register('row-displace', {
        name: 'ROW DISPLACE',
        defaults: { amount: 8, axis: 0, pattern: 0, frequency: 4, seed: 0 },
        /* `amount` is a pixel offset. `frequency` is cycles per pixel --
           sin(y * freq * 0.1) -- so a taller image fits proportionally more
           cycles into the same picture unless it scales inversely. */
        spatial: { lengths: ['amount'], frequencies: ['frequency'] },
        // axis: 0=horizontal rows, 1=vertical columns
        // pattern: 0=sine, 1=sawtooth, 2=random
        fn: function(src, dst, p, w, h) {
            var amt = p.amount;
            var freq = p.frequency;

            // Only the random pattern needs the table; the other two are
            // closed-form in the row index.
            var table = (p.pattern === 2)
                ? noiseTable(p.seed * 98765 + 43210)
                : null;

            if (p.axis === 0) {
                // Displace rows horizontally
                for (var y = 0; y < h; y++) {
                    var offset;
                    if (p.pattern === 0) {
                        offset = Math.round(Math.sin(y * freq * 0.1) * amt);
                    } else if (p.pattern === 1) {
                        offset = Math.round(((y * freq * 0.1) % 2 - 1) * amt);
                    } else {
                        offset = Math.round((band(table, y, h) * 2 - 1) * amt);
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
                        offset = Math.round((band(table, x, w) * 2 - 1) * amt);
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
        /* `phase` is deliberately absent: it is an angle in radians, so it
           already means the same thing at any resolution. */
        spatial: { lengths: ['amplitude'], frequencies: ['frequency'] },
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
