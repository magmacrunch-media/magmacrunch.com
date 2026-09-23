/* meter.js: the monitor under the display.
 *
 * The instrument measures as well as draws. Two modes, both reading the work
 * canvas after every render:
 *
 *   LEVELS    a histogram of the picture, luma filled with the three channels
 *             over it, plus how much is clipped at each end.
 *   SPECTRUM  the radial average of the image's Fourier magnitude, which is
 *             power against spatial frequency: flat means noise, a fall to
 *             the right means a soft picture, a spike means a repeating
 *             pattern at that frequency.
 *
 * ## Why its own file, and what it must not do
 *
 * It reads the picture and draws its own canvas, and nothing else in the app
 * reads it back. canvas.js calls Meter.update() at the end of every repaint;
 * that one line is the whole coupling, and this file no-ops when its markup
 * is absent, which is what lets the headless suite load it for the maths.
 *
 * ## The maths is separated from the drawing on purpose
 *
 * histogram(), lumaPlane() and spectrum() are pure and exported, so the
 * suite checks them against signals whose answer is known (a flat field, a
 * cosine at a chosen frequency) rather than against a picture of a curve.
 *
 * ## Cost
 *
 * Both modes work from at most ANALYSE x ANALYSE samples, point-sampled. A
 * histogram of a 12MP image would otherwise walk 48MB on every knob movement,
 * and a 2D FFT at full size is seconds. At 128 the transform is 16k points
 * and the whole update is a few milliseconds, which is what makes it
 * affordable to run on every render rather than on demand.
 */
(function () {
    'use strict';

    var ANALYSE = 128;            // samples per side, and the FFT size
    var KEY = 'signalchain:meter'; // "<mode>" or "off"
    var BINS = 64;                 // spectrum curve points

    /* ---- the maths ---- */

    /**
     * Counts per level for each channel and for luma, plus what is pinned at
     * the ends. Clipping is counted on the channels rather than on luma: a
     * blown red with a mid green is clipped, and its luma is not.
     */
    function histogram(pixels) {
        var r = new Uint32Array(256), g = new Uint32Array(256);
        var b = new Uint32Array(256), lum = new Uint32Array(256);
        var low = 0, high = 0, sum = 0, n = pixels.length / 4;

        for (var i = 0; i < pixels.length; i += 4) {
            var pr = pixels[i], pg = pixels[i + 1], pb = pixels[i + 2];
            r[pr]++; g[pg]++; b[pb]++;
            /* Rec. 601 luma, the same weighting the effects use, ROUNDED
               rather than truncated. The three coefficients sum to one only
               in decimal: in binary a flat grey 128 comes to
               127.99999999999999, and truncating put every flat field one
               level below where it belongs. */
            var y = Math.min(255, Math.round(0.299 * pr + 0.587 * pg + 0.114 * pb));
            lum[y]++;
            sum += y;
            if (pr === 0 || pg === 0 || pb === 0) low++;
            if (pr === 255 || pg === 255 || pb === 255) high++;
        }

        return {
            r: r, g: g, b: b, lum: lum, count: n,
            clipLow: n ? low / n : 0,
            clipHigh: n ? high / n : 0,
            mean: n ? sum / n : 0
        };
    }

    /** Mirror an index back inside 0..n-1, the way fft.js pads. */
    function reflect(i, n) {
        if (n <= 1) return 0;
        var period = 2 * n - 2;
        var m = ((i % period) + period) % period;
        return m < n ? m : period - m;
    }

    /**
     * Luma on an n x n grid, point-sampled from a w x h RGBA buffer at ONE
     * pitch for both axes, mirroring outside the picture.
     *
     * The pitch is what makes this correct on an image that is not square.
     * Squashing 640x480 into a square samples the two axes at different
     * rates, so a pattern of 20 cycles across the width and one of 20 cycles
     * down the height come out at the same frequency although they are not
     * the same frequency at all. Sampling both axes every `pitch` pixels and
     * mirroring the leftover region keeps the transform isotropic, which is
     * the only thing that makes a radial average mean anything. Mirroring
     * rather than zero-filling is fft.js's choice, for its reason: a hard
     * edge at the border is itself a signal, and a loud one.
     */
    function lumaPlane(pixels, w, h, n, pitch) {
        var out = new Float32Array(n * n);
        for (var y = 0; y < n; y++) {
            var sy = reflect(Math.round(y * pitch), h);
            for (var x = 0; x < n; x++) {
                var sx = reflect(Math.round(x * pitch), w);
                var i = (sy * w + sx) * 4;
                out[y * n + x] = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
            }
        }
        return out;
    }

    /**
     * Radially averaged magnitude against spatial frequency.
     *
     * The mean is removed first, so DC does not sit as a single enormous spike
     * at zero and flatten everything else; that is the same reason SPECTRUM
     * the effect normalises excluding DC. Frequency is a fraction of Nyquist,
     * so the curve means the same thing at any working size, and bins are
     * averaged over the ring at that radius, which is what makes it one curve
     * rather than a picture.
     *
     * Returns { curve, peak }: magnitudes in dB relative to the largest, and
     * the frequency of the largest as a fraction of Nyquist.
     */
    function spectrum(plane, n, fft) {
        var re = new Float32Array(n * n), im = new Float32Array(n * n);
        var i, mean = 0;
        for (i = 0; i < plane.length; i++) mean += plane[i];
        mean /= plane.length || 1;
        for (i = 0; i < plane.length; i++) re[i] = plane[i] - mean;

        fft.forward(re, im, n, n);

        var sums = new Float64Array(BINS), counts = new Uint32Array(BINS);
        // Magnitude-weighted radius, per bin, for the peak reading below.
        var radSums = new Float64Array(BINS);
        var half = n >> 1;
        for (var y = 0; y < n; y++) {
            var dy = y <= half ? y : y - n;
            for (var x = 0; x < n; x++) {
                var dx = x <= half ? x : x - n;
                // Radius as a fraction of Nyquist, which is half the size.
                var rad = Math.sqrt(dx * dx + dy * dy) / half;
                if (rad > 1) continue;      // the corners reach past Nyquist
                var bin = Math.min(BINS - 1, (rad * BINS) | 0);
                var k = y * n + x;
                var mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
                sums[bin] += mag;
                radSums[bin] += mag * rad;
                counts[bin]++;
            }
        }

        var curve = new Float32Array(BINS), peakBin = 0, peakVal = 0;
        for (i = 0; i < BINS; i++) {
            var v = counts[i] ? sums[i] / counts[i] : 0;
            curve[i] = v;
            if (v > peakVal) { peakVal = v; peakBin = i; }
        }

        /* Where inside its bin the peak really sits: the magnitude-weighted
           mean radius of what that bin holds, which for a single tone is
           exactly the tone's frequency.
           Reporting the bin centre instead is a real error and not a rounding
           one, because it is biased the same way every time: a 32 pixel
           pattern falls at the left edge of its bin and reads as 31.
           Interpolating between neighbouring bins does not fix it either,
           which the suite showed before this replaced it -- a pure tone puts
           everything in one bin and leaves its neighbours equal, so there is
           no shape to fit and the correction comes out as zero. */
        var peak = sums[peakBin] > 0
            ? radSums[peakBin] / sums[peakBin]
            : (peakBin + 0.5) / BINS;
        // dB relative to the peak, floored, so a flat spectrum reads flat and
        // a silent image does not produce -Infinity.
        for (i = 0; i < BINS; i++) {
            curve[i] = peakVal > 0
                ? Math.max(-60, 20 * Math.log10(Math.max(1e-6, curve[i]) / peakVal))
                : -60;
        }
        return { curve: curve, peak: peak };
    }

    window.Meter = {
        histogram: histogram,
        lumaPlane: lumaPlane,
        spectrum: spectrum,
        BINS: BINS
    };

    /* ---- the panel ---- */

    var root = document.getElementById('meter');
    var screen = document.getElementById('meterScreen');
    // A page without the monitor, or the headless suite, whose stub element
    // answers every id and is not a canvas. Everything above this line is the
    // maths, which is what the suite loads this file for.
    if (!root || !screen || typeof screen.getContext !== 'function') return;

    var readout = document.getElementById('meterReadout');
    var power = document.getElementById('meterPower');
    var ctx = screen.getContext('2d');
    var sample = document.createElement('canvas');
    var sampleCtx = sample.getContext('2d');

    var mode = 'levels';
    var on = true;

    /* A phone is short, and the monitor costs the picture the height it takes,
       so it starts switched off there and on anywhere else. A stored answer,
       once someone has chosen, wins over both. */
    try {
        var saved = localStorage.getItem(KEY);
        if (saved === 'off') on = false;
        else if (saved === 'levels' || saved === 'spectrum') mode = saved;
        else if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) on = false;
    } catch (e) { /* private mode: the defaults above stand */ }

    function remember() {
        try { localStorage.setItem(KEY, on ? mode : 'off'); } catch (e) { /* as above */ }
    }

    /**
     * Match the backing store to the laid-out size, at device resolution, so
     * a one-pixel grid line is one pixel.
     *
     * Returns false when the panel has no width yet. The first render happens
     * while the page is still laying out, and drawing then produced a canvas
     * one pixel wide stretched across the panel, which stayed that way until
     * something else caused a repaint. The observer below is the other half:
     * it calls back when the width arrives.
     */
    function fit() {
        var ratio = window.devicePixelRatio || 1;
        var w = Math.round(screen.clientWidth * ratio);
        var h = Math.round(screen.clientHeight * ratio);
        if (w < 2 || h < 2) return false;
        if (screen.width !== w || screen.height !== h) {
            screen.width = w;
            screen.height = h;
        }
        return true;
    }

    function graticule() {
        var w = screen.width, h = screen.height;
        ctx.strokeStyle = 'rgba(255, 140, 66, 0.16)';
        ctx.lineWidth = 1;
        for (var i = 1; i < 4; i++) {
            var x = Math.round(w * i / 4) + 0.5;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (var j = 1; j < 3; j++) {
            var y = Math.round(h * j / 3) + 0.5;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
    }

    /** One channel's curve, as a path across the full width. */
    function plotCounts(counts, max, colour, fill) {
        var w = screen.width, h = screen.height;
        ctx.beginPath();
        ctx.moveTo(0, h);
        var scale = max > 0 ? 1 / Math.log(1 + max) : 0;
        for (var i = 0; i < 256; i++) {
            /* Log, not linear and not square root. A picture with few levels
               in it -- colour bars, a posterised chain -- puts nearly every
               pixel in a handful of bins, and against that peak the rest of
               the picture is a flat line at the axis on either of the other
               two scales. Log shows a bin holding one pixel in a thousand. */
            var v = scale * Math.log(1 + counts[i]);
            ctx.lineTo(i / 255 * w, h - v * (h - 2) - 1);
        }
        ctx.lineTo(w, h);
        if (fill) {
            ctx.fillStyle = colour;
            ctx.fill();
        } else {
            ctx.strokeStyle = colour;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    function drawLevels(hist) {
        var max = 0, i;
        for (i = 0; i < 256; i++) if (hist.lum[i] > max) max = hist.lum[i];
        for (i = 0; i < 256; i++) {
            if (hist.r[i] > max) max = hist.r[i];
            if (hist.g[i] > max) max = hist.g[i];
            if (hist.b[i] > max) max = hist.b[i];
        }
        plotCounts(hist.lum, max, 'rgba(255, 140, 66, 0.28)', true);
        plotCounts(hist.r, max, 'rgba(255, 70, 70, 0.85)', false);
        plotCounts(hist.g, max, 'rgba(70, 230, 120, 0.85)', false);
        plotCounts(hist.b, max, 'rgba(90, 130, 255, 0.85)', false);

        readout.textContent = 'MEAN ' + Math.round(hist.mean)
            + '  CLIP ' + (hist.clipLow * 100).toFixed(1) + '/' + (hist.clipHigh * 100).toFixed(1) + '%';
    }

    function drawSpectrum(spec, pitchPx) {
        var w = screen.width, h = screen.height, i;
        ctx.beginPath();
        for (i = 0; i < spec.curve.length; i++) {
            // -60 dB at the floor, 0 dB at the top.
            var v = (spec.curve[i] + 60) / 60;
            var x = i / (spec.curve.length - 1) * w;
            var y = h - v * (h - 2) - 1;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(255, 170, 90, 0.95)';
        ctx.lineWidth = Math.max(1, (window.devicePixelRatio || 1));
        ctx.stroke();

        /* In pixels, not as a fraction of anything. The curve's axis is the
           analysis band, but a fraction of Nyquist means nothing to the eye
           and, worse, would have to be a fraction of WHICH side on a picture
           that is not square. The period of the strongest component is one
           number that is true whichever way the image is turned: "the loudest
           repeating detail is every 32 pixels". */
        var period = spec.peak > 0 ? 2 * pitchPx / spec.peak : Infinity;
        readout.textContent = period > 4 * ANALYSE * pitchPx
            ? 'PEAK --'
            : 'PEAK ' + (period < 10 ? period.toFixed(1) : Math.round(period)) + ' PX';
    }

    /**
     * Read the picture and draw the monitor. `source` is the work canvas,
     * which is the same pixels export writes, so the monitor measures what
     * would be saved rather than what is on screen.
     */
    function update(source) {
        if (!on || !source || !source.width || !source.height) return;

        /* One pitch for both axes: the longer side gets ANALYSE samples and
           the shorter gets proportionally fewer, so a 640x480 picture is
           sampled 128 x 96 rather than squashed into a square. Point-sampled,
           never smoothed, because a smoothed downscale invents levels that
           are not in the picture, which is a lie in a measurement. */
        var n = ANALYSE;
        var pitch = Math.max(source.width, source.height) / n;
        var nx = Math.max(1, Math.min(n, Math.round(source.width / pitch)));
        var ny = Math.max(1, Math.min(n, Math.round(source.height / pitch)));

        if (sample.width !== n || sample.height !== n) {
            sample.width = n;
            sample.height = n;
        }
        sampleCtx.imageSmoothingEnabled = false;
        sampleCtx.clearRect(0, 0, n, n);
        sampleCtx.drawImage(source, 0, 0, source.width, source.height, 0, 0, nx, ny);
        var pixels = sampleCtx.getImageData(0, 0, nx, ny).data;

        if (!fit()) return;
        ctx.clearRect(0, 0, screen.width, screen.height);
        graticule();

        if (mode === 'spectrum' && window.Chain && Chain.fft) {
            // Already at one pitch, so the plane only has to be mirrored out
            // to the square the transform needs: pitch 1 in sample units.
            var plane = lumaPlane(pixels, nx, ny, n, 1);
            drawSpectrum(spectrum(plane, n, Chain.fft), source.width / nx);
        } else {
            drawLevels(histogram(pixels));
        }
    }

    function paintState() {
        root.classList.toggle('off', !on);
        power.setAttribute('aria-pressed', on ? 'true' : 'false');
        var buttons = root.querySelectorAll('.meter-mode');
        for (var i = 0; i < buttons.length; i++) {
            var active = buttons[i].dataset.mode === mode;
            buttons[i].classList.toggle('active', active);
            buttons[i].setAttribute('aria-pressed', active ? 'true' : 'false');
        }
        if (!on) readout.textContent = 'OFF';
    }

    root.addEventListener('click', function (e) {
        var button = e.target.closest('.meter-mode');
        if (button) {
            mode = button.dataset.mode;
            on = true;
        } else if (e.target.closest('#meterPower')) {
            on = !on;
        } else {
            return;
        }
        remember();
        paintState();
        if (on && window.Canvas) Canvas.refreshMeter();
        else if (!on) ctx.clearRect(0, 0, screen.width, screen.height);
    });

    /* Redraw whenever the panel's own size changes: the first layout, a window
       resize, the phone breakpoint, a panel opening beside it. A window resize
       listener alone misses the first of those, which is the one that matters,
       because it is the case where the monitor has never been drawn at a real
       width at all. */
    function redraw() {
        if (on && window.Canvas) Canvas.refreshMeter();
    }

    if (window.ResizeObserver) new ResizeObserver(redraw).observe(screen);
    else window.addEventListener('resize', redraw);

    Meter.update = update;
    Meter.isOn = function () { return on; };
    Meter.getMode = function () { return mode; };
    paintState();
})();
