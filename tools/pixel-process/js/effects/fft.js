/* ── fft.js — inline radix-2 FFT + frequency domain filtering ── */

(function() {
    'use strict';

    // ── Radix-2 FFT (real-valued input optimization) ──

    function fft1d(re, im, n, invert) {
        // Bit-reversal permutation
        for (var i = 1, j = 0; i < n; i++) {
            var bit = n >> 1;
            for (; j & bit; bit >>= 1) j ^= bit;
            j ^= bit;
            if (i < j) {
                var tr = re[i]; re[i] = re[j]; re[j] = tr;
                var ti = im[i]; im[i] = im[j]; im[j] = ti;
            }
        }

        // Cooley-Tukey butterfly
        for (var len = 2; len <= n; len <<= 1) {
            var half = len >> 1;
            var angle = (invert ? -2 : 2) * Math.PI / len;
            var wRe = Math.cos(angle);
            var wIm = Math.sin(angle);

            for (var i = 0; i < n; i += len) {
                var curRe = 1, curIm = 0;
                for (var j = 0; j < half; j++) {
                    var a = i + j;
                    var b = i + j + half;
                    var tRe = curRe * re[b] - curIm * im[b];
                    var tIm = curRe * im[b] + curIm * re[b];
                    re[b] = re[a] - tRe;
                    im[b] = im[a] - tIm;
                    re[a] = re[a] + tRe;
                    im[a] = im[a] + tIm;
                    var newCurRe = curRe * wRe - curIm * wIm;
                    curIm = curRe * wIm + curIm * wRe;
                    curRe = newCurRe;
                }
            }
        }

        if (invert) {
            for (var i = 0; i < n; i++) {
                re[i] /= n;
                im[i] /= n;
            }
        }
    }

    function fft2d(re, im, n, invert) {
        var rowRe = new Float64Array(n);
        var rowIm = new Float64Array(n);
        var colRe = new Float64Array(n);
        var colIm = new Float64Array(n);

        if (!invert) {
            // Forward: rows then columns
            for (var y = 0; y < n; y++) {
                for (var x = 0; x < n; x++) {
                    rowRe[x] = re[y * n + x];
                    rowIm[x] = im[y * n + x];
                }
                fft1d(rowRe, rowIm, n, false);
                for (var x = 0; x < n; x++) {
                    re[y * n + x] = rowRe[x];
                    im[y * n + x] = rowIm[x];
                }
            }
            for (var x = 0; x < n; x++) {
                for (var y = 0; y < n; y++) {
                    colRe[y] = re[y * n + x];
                    colIm[y] = im[y * n + x];
                }
                fft1d(colRe, colIm, n, false);
                for (var y = 0; y < n; y++) {
                    re[y * n + x] = colRe[y];
                    im[y * n + x] = colIm[y];
                }
            }
        } else {
            // Inverse: columns then rows
            for (var x = 0; x < n; x++) {
                for (var y = 0; y < n; y++) {
                    colRe[y] = re[y * n + x];
                    colIm[y] = im[y * n + x];
                }
                fft1d(colRe, colIm, n, true);
                for (var y = 0; y < n; y++) {
                    re[y * n + x] = colRe[y];
                    im[y * n + x] = colIm[y];
                }
            }
            for (var y = 0; y < n; y++) {
                for (var x = 0; x < n; x++) {
                    rowRe[x] = re[y * n + x];
                    rowIm[x] = im[y * n + x];
                }
                fft1d(rowRe, rowIm, n, true);
                for (var x = 0; x < n; x++) {
                    re[y * n + x] = rowRe[x];
                    im[y * n + x] = rowIm[x];
                }
            }
        }
    }

    // Swap quadrants so DC is centered
    function fftShift(re, im, n) {
        var half = n >> 1;
        for (var y = 0; y < half; y++) {
            for (var x = 0; x < half; x++) {
                // Swap (x,y) with (x+half, y+half)
                var i1 = y * n + x;
                var i2 = (y + half) * n + (x + half);
                var t = re[i1]; re[i1] = re[i2]; re[i2] = t;
                t = im[i1]; im[i1] = im[i2]; im[i2] = t;
                // Swap (x+half,y) with (x, y+half)
                i1 = y * n + (x + half);
                i2 = (y + half) * n + x;
                t = re[i1]; re[i1] = re[i2]; re[i2] = t;
                t = im[i1]; im[i1] = im[i2]; im[i2] = t;
            }
        }
    }

    // ── FFT FILTER ──
    Chain.register('fft-filter', {
        name: 'FFT FILTER',
        defaults: {
            filterType: 0, // 0=lowpass, 1=highpass, 2=bandpass, 3=notch
            cutoff: 40,
            width: 20,
            gain: 1
        },
        fn: function(src, dst, p, w, h) {
            // Must be power of 2 — use the smaller power of 2 that fits
            var n = 1;
            while (n < w && n < h) n <<= 1;
            if (n > 256) n = 256; // cap for performance

            // Extract luminance channel for processing
            var re = new Float64Array(n * n);
            var im = new Float64Array(n * n);

            // Load grayscale from source
            for (var y = 0; y < n; y++) {
                for (var x = 0; x < n; x++) {
                    var si = (y * w + x) * 4;
                    re[y * n + x] = (src[si] * 0.299 + src[si+1] * 0.587 + src[si+2] * 0.114) / 255;
                }
            }

            // Forward FFT
            fft2d(re, im, n, false);

            // Swap quadrants for centered frequency
            fftShift(re, im, n);

            // Apply filter
            var cx = n >> 1;
            var cy = n >> 1;
            var cutoff = p.cutoff;
            var width = Math.max(1, p.width);
            var gain = p.gain;

            for (var y = 0; y < n; y++) {
                for (var x = 0; x < n; x++) {
                    var dx = x - cx;
                    var dy = y - cy;
                    var dist = Math.sqrt(dx * dx + dy * dy);

                    var filterVal = 1;
                    if (p.filterType === 0) {
                        // Lowpass: keep inside cutoff
                        filterVal = dist <= cutoff ? 1 : Math.exp(-(dist - cutoff) / width);
                    } else if (p.filterType === 1) {
                        // Highpass: keep outside cutoff
                        filterVal = dist >= cutoff ? 1 : Math.exp(-(cutoff - dist) / width);
                    } else if (p.filterType === 2) {
                        // Bandpass: keep in ring
                        var inner = Math.max(0, cutoff - width);
                        var outer = cutoff + width;
                        if (dist >= inner && dist <= outer) filterVal = 1;
                        else if (dist < inner) filterVal = Math.exp(-(inner - dist) / width);
                        else filterVal = Math.exp(-(dist - outer) / width);
                    } else {
                        // Notch: remove ring
                        var inner = Math.max(0, cutoff - width);
                        var outer = cutoff + width;
                        if (dist >= inner && dist <= outer) filterVal = 0;
                        else filterVal = 1;
                    }

                    var idx = y * n + x;
                    re[idx] *= filterVal * gain;
                    im[idx] *= filterVal * gain;
                }
            }

            // Swap back and inverse FFT
            fftShift(re, im, n);
            fft2d(re, im, n, true);

            // Write back to all channels
            for (var y = 0; y < n; y++) {
                for (var x = 0; x < n; x++) {
                    var val = Math.max(0, Math.min(255, re[y * n + x] * 255));
                    var di = (y * w + x) * 4;
                    // Apply filtered luminance as tinted overlay
                    var ratio = val / Math.max(1, src[di] * 0.299 + src[di+1] * 0.587 + src[di+2] * 0.114);
                    ratio = Math.max(0, Math.min(3, ratio));
                    dst[di]   = Math.min(255, src[di] * ratio);
                    dst[di+1] = Math.min(255, src[di+1] * ratio);
                    dst[di+2] = Math.min(255, src[di+2] * ratio);
                    dst[di+3] = 255;
                }
            }

            // Fill edges beyond n×n with source
            for (var y = 0; y < h; y++) {
                for (var x = n; x < w; x++) {
                    var di = (y * w + x) * 4;
                    dst[di] = src[di]; dst[di+1] = src[di+1];
                    dst[di+2] = src[di+2]; dst[di+3] = 255;
                }
            }
            for (var y = n; y < h; y++) {
                for (var x = 0; x < w; x++) {
                    var di = (y * w + x) * 4;
                    dst[di] = src[di]; dst[di+1] = src[di+1];
                    dst[di+2] = src[di+2]; dst[di+3] = 255;
                }
            }
        }
    });

})();
