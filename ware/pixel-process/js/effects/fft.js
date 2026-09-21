/* ── fft.js — a 2D Fourier transform over the whole image ── */

(function() {
    'use strict';

    /* What this used to be, and why it was rebuilt.
     *
     * The first version transformed a single square of the image: the largest
     * power of two that fitted, clamped to 256, anchored at the top left, with
     * the rest of the picture copied through untouched. On a 1024 by 768 image
     * that filtered one corner. It read luminance only and folded the result
     * back in as a ratio, which cannot be right for a high pass, where the
     * filtered signal is centred on zero and the ratio becomes a division by
     * noise.
     *
     * This covers the whole image. Both sides are padded out to their own next
     * power of two, so the transform is rectangular rather than square, and the
     * padding is a mirror rather than zeros: a hard edge at the boundary is a
     * step, and a step is a bright cross through the middle of the spectrum
     * that every filter then acts on.
     *
     * ## Frequencies are normalized, so this effect no longer has a scale
     *
     * `cutoff` and `width` are percentages of the Nyquist frequency rather than
     * counts of bins. A bin means a different thing on every image size, which
     * is exactly why this was the one effect left out of the resolution
     * independence work. A fraction of Nyquist means the same thing at any size
     * by construction, so `spatial` is null here because there is nothing to
     * scale rather than because scaling it was too hard.
     *
     * ## Luminance is applied as a difference, not a ratio
     *
     * In luma mode the filtered luminance is added to each colour channel as a
     * signed delta. That works for every filter type, keeps hue, and never
     * divides by a pixel that is legitimately near zero. RGB mode filters the
     * three channels independently and costs three transforms.
     */

    function nextPow2(n) {
        var p = 1;
        while (p < n) p <<= 1;
        return p;
    }

    /* Reflect an index back inside [0, n), with period 2n-2.
     *
     * The mirror that makes the padding continuous with the image: index n
     * comes back as n-2, so the sample just outside the edge is the one just
     * inside it and there is no step at the boundary. */
    function reflect(i, n) {
        if (n <= 1) return 0;
        var period = 2 * n - 2;
        i = ((i % period) + period) % period;
        return i < n ? i : period - i;
    }

    /* Twiddle factors for the largest transform in use, read at a stride for
     * the smaller ones.
     *
     * The old code advanced the twiddle by complex multiplication inside the
     * butterfly loop, two multiplies cheaper per step and accumulating rounding
     * the whole way along a line. Over a 2048 point transform that drift shows
     * up as a haze in the inverse. A table is exact at every index and costs
     * one array. */
    var twRe = null, twIm = null, twN = -1;

    function ensureTwiddle(n) {
        if (twN === n) return;
        var half = n >> 1;
        twRe = new Float64Array(half);
        twIm = new Float64Array(half);
        for (var k = 0; k < half; k++) {
            var a = 2 * Math.PI * k / n;
            twRe[k] = Math.cos(a);
            twIm[k] = Math.sin(a);
        }
        twN = n;
    }

    /* One in-place transform along a strided line, so rows and columns both run
     * without copying into scratch and back. `tstep` scales the twiddle index
     * from this line's length up to the table's. */
    function fft1d(re, im, n, off, stride, invert, tstep) {
        var i, j, bit, a, b, t;

        for (i = 1, j = 0; i < n; i++) {
            bit = n >> 1;
            for (; j & bit; bit >>= 1) j ^= bit;
            j ^= bit;
            if (i < j) {
                a = off + i * stride;
                b = off + j * stride;
                t = re[a]; re[a] = re[b]; re[b] = t;
                t = im[a]; im[a] = im[b]; im[b] = t;
            }
        }

        for (var len = 2; len <= n; len <<= 1) {
            var half = len >> 1;
            var step = (n / len) * tstep;
            for (i = 0; i < n; i += len) {
                for (j = 0; j < half; j++) {
                    var ti = j * step;
                    var wr = twRe[ti];
                    var wi = invert ? -twIm[ti] : twIm[ti];
                    a = off + (i + j) * stride;
                    b = off + (i + j + half) * stride;
                    var tRe = wr * re[b] - wi * im[b];
                    var tIm = wr * im[b] + wi * re[b];
                    re[b] = re[a] - tRe;
                    im[b] = im[a] - tIm;
                    re[a] = re[a] + tRe;
                    im[a] = im[a] + tIm;
                }
            }
        }

        if (invert) {
            for (i = 0; i < n; i++) {
                a = off + i * stride;
                re[a] /= n;
                im[a] /= n;
            }
        }
    }

    function fft2d(re, im, w2, h2, invert) {
        ensureTwiddle(Math.max(w2, h2));
        var big = twN;
        var y, x;
        if (!invert) {
            for (y = 0; y < h2; y++) fft1d(re, im, w2, y * w2, 1, false, big / w2);
            for (x = 0; x < w2; x++) fft1d(re, im, h2, x, w2, false, big / h2);
        } else {
            for (x = 0; x < w2; x++) fft1d(re, im, h2, x, w2, true, big / h2);
            for (y = 0; y < h2; y++) fft1d(re, im, w2, y * w2, 1, true, big / w2);
        }
    }

    // ── Working buffers, cached by padded size ──

    var reBuf = null, imBuf = null, cachedPoints = -1;

    function ensureBuffers(points) {
        if (cachedPoints === points) return;
        reBuf = new Float32Array(points);
        imBuf = new Float32Array(points);
        cachedPoints = points;
    }

    /* The frequency response at a normalized radius.
     *
     * `r` is distance from DC as a fraction of Nyquist, so 1.0 is the highest
     * frequency the image can carry along an axis and the corners of the
     * spectrum reach about 1.41. `cut` and `wid` arrive here as fractions,
     * which is what makes this filter mean the same thing at every resolution.
     */
    function response(r, type, cut, wid) {
        var w = Math.max(0.002, wid);
        if (type === 0) return r <= cut ? 1 : Math.exp(-(r - cut) / w);
        if (type === 1) return r >= cut ? 1 : Math.exp(-(cut - r) / w);
        var inner = Math.max(0, cut - w);
        var outer = cut + w;
        if (type === 2) {
            if (r >= inner && r <= outer) return 1;
            return r < inner ? Math.exp(-(inner - r) / w) : Math.exp(-(r - outer) / w);
        }
        return (r >= inner && r <= outer) ? 0 : 1;
    }

    /* Transform the plane in `reBuf`, multiply by the response, come back.
     *
     * The spectrum is left where the transform puts it, DC at index 0 and
     * frequencies wrapping at the midpoint, rather than being shifted to the
     * centre and shifted back afterwards. That saves two full passes over the
     * plane, and a wrapped index gives up its radius just as easily. */
    function filterPlane(w2, h2, type, cut, wid, gain) {
        fft2d(reBuf, imBuf, w2, h2, false);

        var halfW = w2 >> 1, halfH = h2 >> 1;
        for (var y = 0; y < h2; y++) {
            var dy = y <= halfH ? y : y - h2;
            var ny = dy / halfH;
            for (var x = 0; x < w2; x++) {
                var dx = x <= halfW ? x : x - w2;
                var nx = dx / halfW;
                var g = response(Math.sqrt(nx * nx + ny * ny), type, cut, wid) * gain;
                var i = y * w2 + x;
                reBuf[i] *= g;
                imBuf[i] *= g;
            }
        }

        fft2d(reBuf, imBuf, w2, h2, true);
    }

    function loadPlane(src, w, h, w2, h2, channel) {
        for (var y = 0; y < h2; y++) {
            var sy = reflect(y, h);
            for (var x = 0; x < w2; x++) {
                var si = (sy * w + reflect(x, w)) * 4;
                var i = y * w2 + x;
                reBuf[i] = channel < 0
                    ? src[si] * 0.299 + src[si + 1] * 0.587 + src[si + 2] * 0.114
                    : src[si + channel];
                imBuf[i] = 0;
            }
        }
    }

    function clamp255(v) {
        return v < 0 ? 0 : (v > 255 ? 255 : v);
    }

    Chain.register('fft-filter', {
        name: 'FFT FILTER',
        /* Nothing to scale. `cutoff` and `width` are fractions of Nyquist, so
           they already describe the same filter at any image size, which is
           what every other effect achieves by multiplying a pixel count. */
        spatial: null,
        defaults: {
            filterType: 0, // 0=lowpass, 1=highpass, 2=bandpass, 3=notch
            cutoff: 25,    // per cent of Nyquist
            width: 12,     // per cent of Nyquist
            gain: 1,
            channels: 0    // 0=luma, 1=rgb
        },
        fn: function(src, dst, p, w, h) {
            var w2 = nextPow2(w), h2 = nextPow2(h);
            ensureBuffers(w2 * h2);

            var type = p.filterType | 0;
            var cut = Math.max(0, p.cutoff) / 100;
            var wid = Math.max(0.2, p.width) / 100;
            var gain = p.gain;
            var x, y, i, di;

            if (p.channels) {
                for (var c = 0; c < 3; c++) {
                    loadPlane(src, w, h, w2, h2, c);
                    filterPlane(w2, h2, type, cut, wid, gain);
                    for (y = 0; y < h; y++) {
                        for (x = 0; x < w; x++) {
                            dst[(y * w + x) * 4 + c] = clamp255(Math.round(reBuf[y * w2 + x]));
                        }
                    }
                }
            } else {
                loadPlane(src, w, h, w2, h2, -1);
                filterPlane(w2, h2, type, cut, wid, gain);
                for (y = 0; y < h; y++) {
                    for (x = 0; x < w; x++) {
                        i = (y * w + x) * 4;
                        var was = src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114;
                        // A signed delta rather than a ratio: correct for a
                        // high pass, and it cannot divide by a dark pixel.
                        var delta = reBuf[y * w2 + x] - was;
                        dst[i] = clamp255(Math.round(src[i] + delta));
                        dst[i + 1] = clamp255(Math.round(src[i + 1] + delta));
                        dst[i + 2] = clamp255(Math.round(src[i + 2] + delta));
                    }
                }
            }

            for (di = 3; di < w * h * 4; di += 4) dst[di] = 255;
        }
    });

    /* Apply a frequency-domain operation and write the result back, taking the
     * luma and RGB paths the same way FFT FILTER does. Everything below
     * supplies a `modify(w2, h2)` that works on reBuf and imBuf between the
     * forward and inverse transforms. */
    function runTransform(src, dst, w, h, rgb, modify) {
        var w2 = nextPow2(w), h2 = nextPow2(h);
        ensureBuffers(w2 * h2);
        var x, y, i, c;

        if (rgb) {
            for (c = 0; c < 3; c++) {
                loadPlane(src, w, h, w2, h2, c);
                fft2d(reBuf, imBuf, w2, h2, false);
                modify(w2, h2);
                fft2d(reBuf, imBuf, w2, h2, true);
                for (y = 0; y < h; y++) {
                    for (x = 0; x < w; x++) {
                        dst[(y * w + x) * 4 + c] = clamp255(Math.round(reBuf[y * w2 + x]));
                    }
                }
            }
        } else {
            loadPlane(src, w, h, w2, h2, -1);
            fft2d(reBuf, imBuf, w2, h2, false);
            modify(w2, h2);
            fft2d(reBuf, imBuf, w2, h2, true);
            for (y = 0; y < h; y++) {
                for (x = 0; x < w; x++) {
                    i = (y * w + x) * 4;
                    var was = src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114;
                    var delta = reBuf[y * w2 + x] - was;
                    dst[i] = clamp255(Math.round(src[i] + delta));
                    dst[i + 1] = clamp255(Math.round(src[i + 1] + delta));
                    dst[i + 2] = clamp255(Math.round(src[i + 2] + delta));
                }
            }
        }
        for (i = 3; i < w * h * 4; i += 4) dst[i] = 255;
    }

    /* ── SPECTRUM ──
     *
     * Not a filter: it replaces the picture with its own frequency content, DC
     * in the middle, low frequencies near the centre and high ones out at the
     * edges. Magnitudes span several orders of magnitude, so it is drawn on a
     * log scale and normalized to its own maximum. On a linear scale it is one
     * bright dot at DC and nothing else.
     *
     * This is the one effect here that is a measurement rather than a
     * treatment, and it earns its place for the reason an oscilloscope does:
     * periodic structure is nearly invisible in a picture and unmissable here.
     * A scanned halftone shows its screen angle as four dots. A photograph of a
     * fence shows the fence.
     */
    Chain.register('fft-spectrum', {
        name: 'SPECTRUM',
        spatial: null,
        defaults: { gain: 1, floor: 0 },
        fn: function(src, dst, p, w, h) {
            var w2 = nextPow2(w), h2 = nextPow2(h);
            ensureBuffers(w2 * h2);
            loadPlane(src, w, h, w2, h2, -1);
            fft2d(reBuf, imBuf, w2, h2, false);

            var i, x, y;

            /* Normalized against the largest bin OTHER than DC.
             *
             * DC is the sum of every pixel, so for a 256 square image of
             * ordinary brightness it is around eight million while a strong
             * frequency component is a few thousand. Dividing by it crushes the
             * entire display: measured on colour bars, the drawn spectrum came
             * back with a mean of 1 out of 255, which is a black rectangle with
             * a couple of lit pixels in it. Correct, and useless.
             *
             * Excluding one bin from the maximum is the whole fix. DC then
             * clips to white, which is where it belongs and where everyone
             * expects it, and the structure worth looking at occupies the range.
             */
            var peak = 0;
            for (i = 0; i < w2 * h2; i++) {
                var mag = Math.log(1 + Math.sqrt(reBuf[i] * reBuf[i] + imBuf[i] * imBuf[i]));
                reBuf[i] = mag;
                if (i !== 0 && mag > peak) peak = mag;
            }
            if (peak <= 0) peak = 1;

            var halfW = w2 >> 1, halfH = h2 >> 1;
            var floor01 = Math.max(0, Math.min(0.95, p.floor / 100));
            var gain = p.gain;

            for (y = 0; y < h; y++) {
                // Stretch the whole spectrum across the image, and roll the
                // origin to the middle so DC is where a person expects it.
                var sy = (Math.floor(y * h2 / h) + halfH) % h2;
                for (x = 0; x < w; x++) {
                    var sx = (Math.floor(x * w2 / w) + halfW) % w2;
                    var v = reBuf[sy * w2 + sx] / peak;
                    v = (v - floor01) / (1 - floor01);
                    v = clamp255(Math.round(v * 255 * gain));
                    var di = (y * w + x) * 4;
                    dst[di] = v; dst[di + 1] = v; dst[di + 2] = v; dst[di + 3] = 255;
                }
            }
        }
    });

    /* ── PHASE SCRAMBLE ──
     *
     * Keeps every magnitude and randomizes the phases. The result has the exact
     * frequency content of the original and none of its structure: the texture,
     * the grain and the overall balance survive, the shapes do not. It is the
     * closest thing in this tool to dissolving a photograph back into the
     * material it was made of.
     *
     * Phases are randomized in CONJUGATE PAIRS. A real image has a spectrum in
     * which the bin at (-u,-v) is the complex conjugate of the one at (u,v),
     * and breaking that makes the inverse transform complex, whose real part is
     * a quietly contrast-reduced version of what was wanted. Pairing costs a
     * few lines and keeps the result exactly real. The self-conjugate bins,
     * where a bin is its own partner, can carry only a sign, so they get one.
     */
    Chain.register('fft-scramble', {
        name: 'PHASE SCRAMBLE',
        spatial: null,
        defaults: { amount: 100, seed: 0, channels: 0 },
        fn: function(src, dst, p, w, h) {
            var amount = Math.max(0, Math.min(100, p.amount)) / 100;
            var seed = p.seed | 0;

            runTransform(src, dst, w, h, p.channels, function(w2, h2) {
                var rng = Chain.rng(seed * 48271 + 40503);
                for (var y = 0; y < h2; y++) {
                    for (var x = 0; x < w2; x++) {
                        var i = y * w2 + x;

                        /* DC keeps its phase, which is to say it keeps its
                           sign. It is the mean brightness of the whole image,
                           and it is self-conjugate, so the branch below could
                           only ever give it a sign at random. Half the seeds
                           made it negative, which put every pixel below zero
                           and clamped the entire picture to black.
                           
                           Measured before the fix: seeds 0, 1, 2 and 5 came
                           back with the mean and the spread preserved exactly,
                           and seed 7 came back mean 0, spread 0. The golden for
                           this effect happened to use seed 5, so it passed over
                           an effect that was black for half its inputs. */
                        if (i === 0) continue;

                        var j = ((h2 - y) % h2) * w2 + ((w2 - x) % w2);
                        if (j < i) continue;

                        var re = reBuf[i], im = imBuf[i];
                        var mag = Math.sqrt(re * re + im * im);
                        var phase = Math.atan2(im, re) + (rng() * 2 - 1) * Math.PI * amount;

                        if (i === j) {
                            // Its own conjugate, so it can only stay real.
                            reBuf[i] = Math.cos(phase) >= 0 ? mag : -mag;
                            imBuf[i] = 0;
                        } else {
                            reBuf[i] = mag * Math.cos(phase);
                            imBuf[i] = mag * Math.sin(phase);
                            reBuf[j] = reBuf[i];
                            imBuf[j] = -imBuf[i];
                        }
                    }
                }
            });
        }
    });

    /* ── ANGULAR WEDGE ──
     *
     * A filter on orientation rather than on frequency: keep or remove
     * everything running in one direction. Fence posts, scan lines, the weave
     * in a fabric all occupy a wedge of the spectrum and can be taken out
     * without touching anything else in the picture.
     *
     * The wedge is folded modulo 180 degrees, because the spectrum of a real
     * image is symmetric through the origin and an orientation and its opposite
     * are the same orientation. Its edges are tapered rather than hard: a
     * rectangular window in the frequency domain rings in the image domain, and
     * the ringing is more conspicuous than the filter.
     */
    var TAPER = 0.16;

    Chain.register('fft-wedge', {
        name: 'ANGULAR WEDGE',
        spatial: null,
        defaults: { angle: 90, spread: 25, mode: 0, channels: 0 },
        fn: function(src, dst, p, w, h) {
            var centre = (p.angle * Math.PI) / 180;
            var spread = Math.max(0.01, (p.spread * Math.PI) / 180);
            var remove = p.mode ? 1 : 0;
            var HALF_PI = Math.PI / 2;

            runTransform(src, dst, w, h, p.channels, function(w2, h2) {
                var halfW = w2 >> 1, halfH = h2 >> 1;
                for (var y = 0; y < h2; y++) {
                    var dy = (y <= halfH ? y : y - h2) / halfH;
                    for (var x = 0; x < w2; x++) {
                        var i = y * w2 + x;
                        var dx = (x <= halfW ? x : x - w2) / halfW;
                        if (dx === 0 && dy === 0) continue; // DC always survives

                        // Fold the angle difference into -90..90 degrees.
                        var diff = Math.atan2(dy, dx) - centre;
                        diff = ((diff % Math.PI) + Math.PI + HALF_PI) % Math.PI - HALF_PI;
                        diff = Math.abs(diff);

                        var inside;
                        if (diff <= spread) inside = 1;
                        else if (diff >= spread + TAPER) inside = 0;
                        else inside = 0.5 + 0.5 * Math.cos(((diff - spread) / TAPER) * Math.PI);

                        var g = remove ? 1 - inside : inside;
                        reBuf[i] *= g;
                        imBuf[i] *= g;
                    }
                }
            });
        }
    });

    /* Exposed so the tests can check the transform itself rather than only the
     * pictures it produces. A forward followed by an inverse has to return the
     * input, and that is a far sharper statement than any golden. */
    Chain.fft = {
        nextPow2: nextPow2,
        reflect: reflect,
        forward: function(re, im, w2, h2) { fft2d(re, im, w2, h2, false); },
        inverse: function(re, im, w2, h2) { fft2d(re, im, w2, h2, true); },
        response: response
    };
})();
