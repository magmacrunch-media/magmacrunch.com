// ui/reference.js — the reference image and its eyedropper.
//
// Near-verbatim from the web tool's color.js. Two things are worth keeping in
// mind about it:
//
//   The reference canvas is created with { willReadFrequently: true }. Every
//   mousemove over it calls getImageData for a single pixel, and without that
//   hint the browser keeps the surface GPU-backed and every read is a stall.
//
//   The reference image is NOT part of the document. It is a thing you are
//   looking at while you work, not a thing you are making, so it is not in the
//   artstore, not in the .gatefold file, and not in undo. It is held as an
//   object URL and revoked when cleared.
//
// The colour it produces goes through core/palette.rgbToHex, which is the same
// function the hex field validates against — so a sampled colour and a typed
// one are the same kind of value.

(function () {
    'use strict';

    const App = (window.Gatefold = window.Gatefold || {});

    const $ = (id) => document.getElementById(id);

    let canvas = null;
    let ctx = null;
    let image = null;
    let blobUrl = null;
    let onSample = null;
    let onPreview = null;

    function has() { return image !== null; }

    function sampleAt(e) {
        if (!image) return null;
        const r = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - r.left) * (canvas.width / r.width));
        const y = Math.floor((e.clientY - r.top) * (canvas.height / r.height));
        if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return null;
        const px = ctx.getImageData(x, y, 1, 1).data;
        return App.palette.rgbToHex(px[0], px[1], px[2]);
    }

    function show(img) {
        image = img;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        $('refPreviewWrap').classList.add('visible');
        document.querySelector('.ref-hint').classList.add('visible');
        $('refUploadBtn').textContent = 'REPLACE IMAGE';
    }

    /* The reference image is capped by the same policy ui/import.js uses, and
       the PIXEL half matters more here than it does there.
       show() below sets the canvas to the image's own full dimensions, and that
       canvas is { willReadFrequently: true }, so the browser keeps the whole
       surface CPU-side: a sixty-megapixel photograph is a quarter of a gigabyte
       of it. Worse, past the browser's own canvas limit the assignment does not
       throw. The canvas comes back unusable, drawImage writes nothing, and the
       eyedropper silently samples an empty surface, which looks like a broken
       colour picker rather than an image nobody can hold.

       The BYTE half is cheap here by comparison, since this is an object URL
       and never reaches the artstore or the file. It is checked anyway so that
       one limit means one thing in both places. */
    function refuse(reason) {
        if (window.Toast) Toast.show(String(reason).toUpperCase());
        if (App.fs && App.fs.logLine) App.fs.logLine('WARN', 'reference image refused', String(reason));
    }

    function load(file) {
        if (!file) return;
        const tooBig = App.gatefold.imageRefusal({ bytes: file.size });
        if (tooBig) { refuse(tooBig); return; }

        const img = new Image();
        img.onerror = function () {
            if (window.Toast) Toast.show('COULD NOT LOAD REFERENCE IMAGE');
        };
        img.onload = function () {
            const refused = App.gatefold.imageRefusal({ pixels: img.width * img.height });
            if (refused) {
                /* Revoke before returning: the object URL is this module's to
                   release, and bailing out without it would hold the whole
                   file for the life of the window. */
                if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
                refuse(refused);
                return;
            }
            show(img);
        };
        // An object URL rather than a data URL: this image is never stored or
        // serialised, so there is no reason to hold megabytes of base64 for it.
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        blobUrl = URL.createObjectURL(file);
        img.src = blobUrl;
    }

    function clear() {
        image = null;
        if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        $('refPreviewWrap').classList.remove('visible');
        document.querySelector('.ref-hint').classList.remove('visible');
        $('refUploadBtn').textContent = 'UPLOAD IMAGE';
    }

    function init(callbacks) {
        canvas = $('refCanvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d', { willReadFrequently: true });

        const cb = callbacks || {};
        onSample = cb.onSample || null;
        onPreview = cb.onPreview || null;

        $('refUploadBtn').addEventListener('click', () => $('refFileInput').click());
        $('refFileInput').addEventListener('change', function (e) {
            load(e.target.files[0]);
            // Cleared so choosing the same file twice fires change again.
            e.target.value = '';
        });
        $('refClearBtn').addEventListener('click', clear);

        canvas.addEventListener('click', function (e) {
            const c = sampleAt(e);
            if (c && onSample) onSample(c);
        });
        canvas.addEventListener('mousemove', function (e) {
            const c = sampleAt(e);
            if (c && onPreview) onPreview(c);
        });
        /* Leaving the strip restores what was actually selected, so a hover
           preview cannot be mistaken for the current fill once the cursor has
           moved away. */
        canvas.addEventListener('mouseleave', function () {
            if (onPreview) onPreview(null);
        });
    }

    App.reference = { init: init, has: has, clear: clear };
}());
