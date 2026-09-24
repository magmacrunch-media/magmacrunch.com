/* ── canvas.js — working canvas + display canvas, resolution management ── */

(function() {
    'use strict';

    var displayCanvas = document.getElementById('displayCanvas');
    var displayCtx = displayCanvas.getContext('2d');

    // Offscreen working canvas — all effects process at this resolution
    var workCanvas = document.createElement('canvas');
    var workCtx = workCanvas.getContext('2d', { willReadFrequently: true });

    var width = 256;
    var height = 256;
    var originalImageData = null; // pristine source, never mutated
    var lastImageElement = null; // keep reference for resolution switching
    var lastPixels = null;       // keep reference for generator output
    var lastPixelsW = 0;
    var lastPixelsH = 0;

    function setSize(w, h) {
        width = w;
        height = h;
        workCanvas.width = w;
        workCanvas.height = h;

        // Size display canvas to fit container while preserving aspect ratio
        var wrap = document.getElementById('canvasWrap');
        var wrapW = wrap.clientWidth - 32;
        var wrapH = wrap.clientHeight - 32;
        var scale = Math.min(wrapW / w, wrapH / h, 4); // cap at 4x scale
        scale = Math.max(scale, 0.5);

        displayCanvas.width = Math.round(w * scale);
        displayCanvas.height = Math.round(h * scale);

        displayCtx.imageSmoothingEnabled = false;

        document.getElementById('resStat').textContent = w + '×' + h;
    }

    // Backward-compatible: set square resolution
    function setResolution(res) {
        setSize(res, res);
    }

    function getWidth() { return width; }
    function getHeight() { return height; }

    function getWorkCanvas() { return workCanvas; }
    function getWorkCtx() { return workCtx; }
    function getDisplayCanvas() { return displayCanvas; }
    function getDisplayCtx() { return displayCtx; }

    // Get a copy of the original ImageData (for effect chain input)
    function getSourceImageData() {
        if (!originalImageData) return null;
        return new ImageData(
            new Uint8ClampedArray(originalImageData.data),
            width, height
        );
    }

    // Set the original source from an ImageData
    function setSourceImageData(imgData) {
        originalImageData = imgData;
    }

    // Set source from an HTMLImageElement (resize to working resolution)
    function loadSourceImage(img) {
        lastImageElement = img;
        lastPixels = null;
        workCtx.clearRect(0, 0, width, height);
        workCtx.drawImage(img, 0, 0, width, height);
        originalImageData = workCtx.getImageData(0, 0, width, height);
    }

    // Set source from raw pixel data (Uint8ClampedArray or array)
    function loadSourcePixels(pixels, w, h) {
        lastImageElement = null;
        lastPixels = new Uint8ClampedArray(pixels);
        lastPixelsW = w;
        lastPixelsH = h;
        var tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        var tempCtx = tempCanvas.getContext('2d');
        var imgData = new ImageData(new Uint8ClampedArray(pixels), w, h);
        tempCtx.putImageData(imgData, 0, 0);

        workCtx.clearRect(0, 0, width, height);
        workCtx.drawImage(tempCanvas, 0, 0, width, height);
        originalImageData = workCtx.getImageData(0, 0, width, height);
    }

    // Re-draw last source at current resolution (for resolution switching)
    function reloadSource() {
        if (lastImageElement) {
            workCtx.clearRect(0, 0, width, height);
            workCtx.drawImage(lastImageElement, 0, 0, width, height);
            originalImageData = workCtx.getImageData(0, 0, width, height);
        } else if (lastPixels) {
            var tempCanvas = document.createElement('canvas');
            tempCanvas.width = lastPixelsW;
            tempCanvas.height = lastPixelsH;
            var tempCtx = tempCanvas.getContext('2d');
            var imgData = new ImageData(new Uint8ClampedArray(lastPixels), lastPixelsW, lastPixelsH);
            tempCtx.putImageData(imgData, 0, 0);

            workCtx.clearRect(0, 0, width, height);
            workCtx.drawImage(tempCanvas, 0, 0, width, height);
            originalImageData = workCtx.getImageData(0, 0, width, height);
        }
    }

    /* Hold to compare.

       After four effects it is easy to lose track of what the picture
       was, and a signal chain needs a before and after more than most
       tools do. While held, the display shows the untouched source.

       A render that lands during the hold still updates the work canvas,
       which is what export reads, but does not reach the screen: the
       comparison wins until release, and release then shows the newest
       result rather than a stale one. */
    var showingOriginal = false;

    /* The graticule: the grid an oscilloscope draws over its screen so a
       signal can be read against it. Ten divisions each way, dotted, with the
       centre axes solid and ticked at a fifth of a division, the way a scope
       face is marked.

       It is drawn on the DISPLAY canvas, after the picture, and never on the
       work canvas, which is what export reads. So it scales with the view, it
       survives hold-to-compare, and it can never end up in a saved file.
       tests/test-page.js cannot see pixels, so that promise was checked in the
       browser against an export with the grid switched on.

       The setting is remembered per browser, under a key that does not name
       the tool: the name is provisional, and the site's other tools share
       this origin's storage. */
    var GRATICULE_KEY = 'signalchain:graticule';
    var graticuleOn = true;
    try { graticuleOn = window.localStorage.getItem(GRATICULE_KEY) !== '0'; } catch (e) {}

    /* The graticule, in SQUARE divisions.
     *
     * It used to be ten divisions each way, which on anything but a square
     * picture drew stretched rectangles: at 800x300 a division was 80 across
     * and 30 down, so a feature that measured two divisions horizontally and
     * two vertically was not the same size at all. A scope's divisions are
     * square, and that is the whole use of them -- you read distances off the
     * screen by counting cells, and cells that are not square cannot be
     * counted against each other.
     *
     * So one division is a fixed number of pixels, ten across the SHORTER
     * side, and the longer side gets however many fit. The grid is drawn
     * outward from the centre, as a scope's is: the centre lines are the axes
     * and everything is measured from them, which also puts the partial cells
     * at the edges where they belong rather than leaving the axes off centre.
     */
    var DIVISIONS = 10;   // across the shorter side
    var SUBDIVS = 5;      // ticks per division on the centre axes

    function drawGraticule() {
        if (!graticuleOn) return;
        var W = displayCanvas.width, H = displayCanvas.height;
        var g = displayCtx;
        var div = Math.min(W, H) / DIVISIONS;
        if (div < 4) return;   // too small to read; a grey wash would be worse

        var cx = Math.round(W / 2) + 0.5, cy = Math.round(H / 2) + 0.5;
        var k, at;
        g.save();

        g.strokeStyle = 'rgba(255, 140, 66, 0.16)';
        g.lineWidth = 1;
        g.setLineDash([2, 3]);
        g.beginPath();
        for (k = 1; k * div <= W / 2; k++) {
            at = Math.round(cx + k * div) + 0.5;
            if (at < W) { g.moveTo(at, 0); g.lineTo(at, H); }
            at = Math.round(cx - k * div) + 0.5;
            if (at > 0) { g.moveTo(at, 0); g.lineTo(at, H); }
        }
        for (k = 1; k * div <= H / 2; k++) {
            at = Math.round(cy + k * div) + 0.5;
            if (at < H) { g.moveTo(0, at); g.lineTo(W, at); }
            at = Math.round(cy - k * div) + 0.5;
            if (at > 0) { g.moveTo(0, at); g.lineTo(W, at); }
        }
        g.stroke();

        g.setLineDash([]);
        g.strokeStyle = 'rgba(255, 140, 66, 0.3)';
        g.beginPath();
        g.moveTo(cx, 0); g.lineTo(cx, H);
        g.moveTo(0, cy); g.lineTo(W, cy);

        // Ticks along the axes, at a fifth of a division, longer on the
        // division itself. Same spacing both ways, for the same reason.
        var step = div / SUBDIVS;
        for (k = 1; k * step <= W / 2; k++) {
            var lenX = k % SUBDIVS === 0 ? 5 : 3;
            g.moveTo(Math.round(cx + k * step) + 0.5, cy - lenX);
            g.lineTo(Math.round(cx + k * step) + 0.5, cy + lenX);
            g.moveTo(Math.round(cx - k * step) + 0.5, cy - lenX);
            g.lineTo(Math.round(cx - k * step) + 0.5, cy + lenX);
        }
        for (k = 1; k * step <= H / 2; k++) {
            var lenY = k % SUBDIVS === 0 ? 5 : 3;
            g.moveTo(cx - lenY, Math.round(cy + k * step) + 0.5);
            g.lineTo(cx + lenY, Math.round(cy + k * step) + 0.5);
            g.moveTo(cx - lenY, Math.round(cy - k * step) + 0.5);
            g.lineTo(cx + lenY, Math.round(cy - k * step) + 0.5);
        }
        g.stroke();
        g.restore();
    }

    /* Everything that reaches the screen goes through here: the result or,
       while held, the source, and then the graticule on top. */
    function repaint() {
        displayCtx.imageSmoothingEnabled = false;
        displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
        if (showingOriginal && originalImageData) {
            var tmp = document.createElement('canvas');
            tmp.width = width;
            tmp.height = height;
            tmp.getContext('2d').putImageData(originalImageData, 0, 0);
            displayCtx.drawImage(tmp, 0, 0, displayCanvas.width, displayCanvas.height);
        } else {
            displayCtx.drawImage(workCanvas, 0, 0, displayCanvas.width, displayCanvas.height);
        }
        drawGraticule();
        refreshMeter();
    }

    /* The monitor under the display reads the work canvas, which is what
       export writes, so it measures the picture rather than the scaled view
       on screen. One call, here, is the whole of what canvas.js knows about
       js/meter.js; the monitor is absent from a page that does not have it
       and from the headless suite, and this stays a no-op there. */
    function refreshMeter() {
        // The source goes with it, so the monitor can draw what the chain did
        // rather than only where it ended up. It is the pristine copy, never
        // mutated, and meter.js holds its analysis until the object changes.
        if (window.Meter && Meter.update) Meter.update(workCanvas, originalImageData);
    }

    function showOriginal(on) {
        on = !!on;
        if (on === showingOriginal) return;
        showingOriginal = on;
        repaint();
    }

    function setGraticule(on) {
        graticuleOn = !!on;
        try { window.localStorage.setItem(GRATICULE_KEY, graticuleOn ? '1' : '0'); } catch (e) {}
        repaint();
    }

    function getGraticule() {
        return graticuleOn;
    }

    // Push processed ImageData to display canvas
    function display(imgData) {
        // Put processed data onto work canvas, which is what export reads
        workCtx.putImageData(imgData, 0, 0);
        if (showingOriginal) return;
        repaint();
    }

    /* Saving the file is a seam, because it is the one thing a browser and the
       iOS app do differently. A browser downloads through an <a download>; in
       WKWebView that does nothing at all, so the app installs its own exporter
       (ios/shim/export.js) that writes the file and opens the share sheet.
       Rendering the export canvas stays here either way, so both platforms
       save exactly the same pixels. */
    function downloadExporter(pngCanvas, name) {
        var link = document.createElement('a');
        link.download = name;
        link.href = pngCanvas.toDataURL('image/png');
        link.click();
    }

    var exporter = downloadExporter;

    function setExporter(fn) {
        exporter = typeof fn === 'function' ? fn : downloadExporter;
    }

    // Export as PNG at native working resolution
    function exportPNG(filename) {
        var exportCanvas = document.createElement('canvas');
        exportCanvas.width = width;
        exportCanvas.height = height;
        var exportCtx = exportCanvas.getContext('2d');
        exportCtx.imageSmoothingEnabled = false;
        exportCtx.drawImage(workCanvas, 0, 0);

        return exporter(exportCanvas, (filename || 'crunchscope') + '.png');
    }

    // Check if we have a source loaded
    function hasSource() {
        return originalImageData !== null;
    }

    // Create a blank black source
    function createBlankSource() {
        var pixels = new Uint8ClampedArray(width * height * 4);
        for (var i = 3; i < pixels.length; i += 4) {
            pixels[i] = 255;
        }
        originalImageData = new ImageData(pixels, width, height);
    }

    window.Canvas = {
        setSize: setSize,
        setResolution: setResolution,
        getWidth: getWidth,
        getHeight: getHeight,
        getWorkCanvas: getWorkCanvas,
        getWorkCtx: getWorkCtx,
        getDisplayCanvas: getDisplayCanvas,
        getDisplayCtx: getDisplayCtx,
        getSourceImageData: getSourceImageData,
        setSourceImageData: setSourceImageData,
        loadSourceImage: loadSourceImage,
        loadSourcePixels: loadSourcePixels,
        reloadSource: reloadSource,
        display: display,
        showOriginal: showOriginal,
        setGraticule: setGraticule,
        refreshMeter: refreshMeter,
        getGraticule: getGraticule,
        exportPNG: exportPNG,
        setExporter: setExporter,
        hasSource: hasSource,
        createBlankSource: createBlankSource
    };

    // Init
    setSize(256, 256);
    createBlankSource();
})();
