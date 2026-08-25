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

    // Push processed ImageData to display canvas
    function display(imgData) {
        // Put processed data onto work canvas
        workCtx.putImageData(imgData, 0, 0);
        // Scale up to display with nearest-neighbor
        displayCtx.imageSmoothingEnabled = false;
        displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
        displayCtx.drawImage(workCanvas, 0, 0, displayCanvas.width, displayCanvas.height);
    }

    // Export as PNG at native working resolution
    function exportPNG(filename) {
        var exportCanvas = document.createElement('canvas');
        exportCanvas.width = width;
        exportCanvas.height = height;
        var exportCtx = exportCanvas.getContext('2d');
        exportCtx.imageSmoothingEnabled = false;
        exportCtx.drawImage(workCanvas, 0, 0);

        var link = document.createElement('a');
        link.download = (filename || 'pixel-process') + '.png';
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
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
        exportPNG: exportPNG,
        hasSource: hasSource,
        createBlankSource: createBlankSource
    };

    // Init
    setSize(256, 256);
    createBlankSource();
})();
