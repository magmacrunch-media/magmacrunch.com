/* ── sort.js — pixel sorting by brightness, hue, red, green, blue ── */

(function() {
    'use strict';

    function getBrightness(r, g, b) {
        return r * 0.299 + g * 0.587 + b * 0.114;
    }

    function getHue(r, g, b) {
        var max = Math.max(r, g, b);
        var min = Math.min(r, g, b);
        var d = max - min;
        if (d === 0) return 0;
        var h;
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h = Math.round(h * 60);
        if (h < 0) h += 360;
        return h;
    }

    function getSortValue(r, g, b, sortBy) {
        switch (sortBy) {
            case 0: return getBrightness(r, g, b);
            case 1: return getHue(r, g, b);
            case 2: return r;
            case 3: return g;
            case 4: return b;
            default: return getBrightness(r, g, b);
        }
    }

    // PIXEL SORT
    Chain.register('pixel-sort', {
        name: 'PIXEL SORT',
        defaults: { threshold: 80, axis: 0, sortBy: 0, direction: 0 },
        fn: function(src, dst, p, w, h) {
            for (var i = 0; i < src.length; i++) dst[i] = src[i];

            var thr = p.threshold;
            var dir = p.direction;
            var sortBy = p.sortBy;

            if (p.axis === 0) {
                // Horizontal sort — process each row
                for (var y = 0; y < h; y++) {
                    var rowStart = y * w;
                    // Find runs above threshold, sort each
                    var runStart = 0;
                    for (var x = 0; x <= w; x++) {
                        var bright = x < w
                            ? getBrightness(src[(rowStart + x) * 4], src[(rowStart + x) * 4 + 1], src[(rowStart + x) * 4 + 2])
                            : 0;
                        if (bright < thr || x === w) {
                            var runLen = x - runStart;
                            if (runLen > 1) {
                                // Build sort indices for this run
                                var indices = new Uint16Array(runLen);
                                for (var j = 0; j < runLen; j++) indices[j] = j;
                                // Sort indices by the chosen sort value
                                var base = rowStart + runStart;
                                indices.sort(function(a, b) {
                                    var pa = (base + a) * 4;
                                    var pb = (base + b) * 4;
                                    var va = getSortValue(src[pa], src[pa+1], src[pa+2], sortBy);
                                    var vb = getSortValue(src[pb], src[pb+1], src[pb+2], sortBy);
                                    return dir === 0 ? va - vb : vb - va;
                                });
                                // Write sorted pixels to dst
                                for (var j = 0; j < runLen; j++) {
                                    var si = (base + indices[j]) * 4;
                                    var di = (base + j) * 4;
                                    dst[di]   = src[si];
                                    dst[di+1] = src[si+1];
                                    dst[di+2] = src[si+2];
                                    dst[di+3] = src[si+3];
                                }
                            }
                            runStart = x + 1;
                        }
                    }
                }
            } else {
                // Vertical sort — process each column
                for (var x = 0; x < w; x++) {
                    var runStart = 0;
                    for (var y = 0; y <= h; y++) {
                        var bright = y < h
                            ? getBrightness(src[(y * w + x) * 4], src[(y * w + x) * 4 + 1], src[(y * w + x) * 4 + 2])
                            : 0;
                        if (bright < thr || y === h) {
                            var runLen = y - runStart;
                            if (runLen > 1) {
                                var indices = new Uint16Array(runLen);
                                for (var j = 0; j < runLen; j++) indices[j] = j;
                                indices.sort(function(a, b) {
                                    var pa = ((runStart + a) * w + x) * 4;
                                    var pb = ((runStart + b) * w + x) * 4;
                                    var va = getSortValue(src[pa], src[pa+1], src[pa+2], sortBy);
                                    var vb = getSortValue(src[pb], src[pb+1], src[pb+2], sortBy);
                                    return dir === 0 ? va - vb : vb - va;
                                });
                                for (var j = 0; j < runLen; j++) {
                                    var si = ((runStart + indices[j]) * w + x) * 4;
                                    var di = ((runStart + j) * w + x) * 4;
                                    dst[di]   = src[si];
                                    dst[di+1] = src[si+1];
                                    dst[di+2] = src[si+2];
                                    dst[di+3] = src[si+3];
                                }
                            }
                            runStart = y + 1;
                        }
                    }
                }
            }
        }
    });

})();
