/* ── channels.js — channel shift, swap, invert, posterize, threshold ── */

(function() {
    'use strict';

    // CHANNEL SHIFT
    Chain.register('channel-shift', {
        name: 'CHANNEL SHIFT',
        defaults: { rx: 3, ry: 0, gx: 0, gy: 0, bx: -3, by: 0 },
        // All six are pixel offsets, so all six scale with the image.
        spatial: { lengths: ['rx', 'ry', 'gx', 'gy', 'bx', 'by'] },
        fn: function(src, dst, p, w, h) {
            /* Rounded, because these six become array indices.
             *
             * They used to be used as they arrived, which was harmless while
             * the only source of them was a slider with a step of 1. Then
             * Chain.scaleParams started multiplying them by the ratio of the
             * render size to the reference, and at any size that is not a whole
             * multiple of 256 that ratio is fractional: at 220 a shift of 4
             * arrives as 3.4375.
             *
             * A fractional index into a typed array is not an error and does
             * not throw. `src[3.4]` is `undefined`, and assigning undefined to
             * a Uint8ClampedArray stores 0, so every pixel came out black. The
             * whole image, silently, with no warning anywhere.
             *
             * Found by looking at a montage of generated chains and asking why
             * two of six were solid colours. The test suite was green: every
             * resolution case it had used 512 or 1024, which are 2x and 4x the
             * reference, so the scaled offsets stayed whole and the bug could
             * not fire. There is a non-integer factor in there now.
             */
            var rx = Math.round(p.rx), ry = Math.round(p.ry);
            var gx = Math.round(p.gx), gy = Math.round(p.gy);
            var bx = Math.round(p.bx), by = Math.round(p.by);

            for (var y = 0; y < h; y++) {
                for (var x = 0; x < w; x++) {
                    var i = (y * w + x) * 4;

                    // Red channel with offset
                    var sxr = ((x - rx + w) % w);
                    var syr = ((y - ry + h) % h);
                    var ri = (syr * w + sxr) * 4;

                    // Green channel with offset
                    var sxg = ((x - gx + w) % w);
                    var syg = ((y - gy + h) % h);
                    var gi = (syg * w + sxg) * 4;

                    // Blue channel with offset
                    var sxb = ((x - bx + w) % w);
                    var syb = ((y - by + h) % h);
                    var bi = (syb * w + sxb) * 4;

                    dst[i]     = src[ri];     // R
                    dst[i + 1] = src[gi + 1]; // G
                    dst[i + 2] = src[bi + 2]; // B
                    dst[i + 3] = 255;
                }
            }
        }
    });

    // CHANNEL SWAP
    Chain.register('channel-swap', {
        name: 'CHANNEL SWAP',
        defaults: { mode: 0 }, // 0=rgb→rbg, 1=rgb→grb, 2=rgb→brg, 3=rgb→bgr
        fn: function(src, dst, p, w, h) {
            var modes = [
                [0, 2, 1], // rbg
                [1, 0, 2], // grb
                [2, 0, 1], // brg
                [2, 1, 0], // bgr
            ];
            var m = modes[p.mode] || modes[0];
            for (var i = 0; i < src.length; i += 4) {
                dst[i]     = src[i + m[0]];
                dst[i + 1] = src[i + m[1]];
                dst[i + 2] = src[i + m[2]];
                dst[i + 3] = 255;
            }
        }
    });

    // INVERT
    Chain.register('invert', {
        name: 'INVERT',
        defaults: { amount: 100 },
        fn: function(src, dst, p, w, h) {
            var t = p.amount / 100;
            for (var i = 0; i < src.length; i += 4) {
                dst[i]     = src[i]     + (255 - 2 * src[i])     * t;
                dst[i + 1] = src[i + 1] + (255 - 2 * src[i + 1]) * t;
                dst[i + 2] = src[i + 2] + (255 - 2 * src[i + 2]) * t;
                dst[i + 3] = 255;
            }
        }
    });

    // POSTERIZE
    Chain.register('posterize', {
        name: 'POSTERIZE',
        defaults: { levels: 4 },
        fn: function(src, dst, p, w, h) {
            var levels = Math.max(2, Math.min(16, p.levels));
            var step = 255 / (levels - 1);
            for (var i = 0; i < src.length; i += 4) {
                dst[i]     = Math.round(Math.round(src[i]     / step) * step);
                dst[i + 1] = Math.round(Math.round(src[i + 1] / step) * step);
                dst[i + 2] = Math.round(Math.round(src[i + 2] / step) * step);
                dst[i + 3] = 255;
            }
        }
    });

    // THRESHOLD
    Chain.register('threshold', {
        name: 'THRESHOLD',
        defaults: { level: 128, colorOut: 0 }, // 0=black/white, 1=original color
        fn: function(src, dst, p, w, h) {
            var lvl = p.level;
            for (var i = 0; i < src.length; i += 4) {
                var bright = (src[i] * 0.299 + src[i+1] * 0.587 + src[i+2] * 0.114);
                if (bright >= lvl) {
                    if (p.colorOut) {
                        dst[i] = src[i];
                        dst[i+1] = src[i+1];
                        dst[i+2] = src[i+2];
                    } else {
                        dst[i] = 255;
                        dst[i+1] = 255;
                        dst[i+2] = 255;
                    }
                } else {
                    if (p.colorOut) {
                        dst[i] = src[i] * 0.3;
                        dst[i+1] = src[i+1] * 0.3;
                        dst[i+2] = src[i+2] * 0.3;
                    } else {
                        dst[i] = 0;
                        dst[i+1] = 0;
                        dst[i+2] = 0;
                    }
                }
                dst[i+3] = 255;
            }
        }
    });

})();
