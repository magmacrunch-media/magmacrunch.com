/* ── app.js — entry point: state, event wiring, UI glue ── */

(function() {
    'use strict';

    // ── DOM refs ──
    var uploadBtn = document.getElementById('uploadBtn');
    var fileInput = document.getElementById('fileInput');
    var exportBtn = document.getElementById('exportBtn');
    var fileNameInput = document.getElementById('fileName');
    var canvasWrap = document.getElementById('canvasWrap');
    var dropOverlay = document.getElementById('dropOverlay');
    var sizeWInput = document.getElementById('sizeW');
    var sizeHInput = document.getElementById('sizeH');

    // Max working dimension
    var MAX_WORK_SIZE = 1024;

    // ── File Upload ──
    uploadBtn.addEventListener('click', function() {
        fileInput.click();
    });

    fileInput.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        loadImageFile(file);
        fileInput.value = '';
    });

    function loadImageFile(file) {
        var reader = new FileReader();
        reader.onerror = function() {
            Toast.show('COULD NOT READ FILE');
        };
        reader.onload = function(ev) {
            var img = new Image();
            img.onerror = function() {
                Toast.show('COULD NOT LOAD IMAGE');
            };
            img.onload = function() {
                // Auto-size: fit image into MAX_WORK_SIZE while preserving aspect ratio
                var iw = img.naturalWidth;
                var ih = img.naturalHeight;
                var scale = Math.min(MAX_WORK_SIZE / iw, MAX_WORK_SIZE / ih, 1);
                var w = Math.max(16, Math.round(iw * scale));
                var h = Math.max(16, Math.round(ih * scale));

                sizeWInput.value = w;
                sizeHInput.value = h;
                Canvas.setSize(w, h);
                Canvas.loadSourceImage(img);
                Chain.render();
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }

    // ── Drag & Drop ──
    var dragCounter = 0;

    canvasWrap.addEventListener('dragenter', function(e) {
        e.preventDefault();
        dragCounter++;
        dropOverlay.classList.add('active');
    });

    canvasWrap.addEventListener('dragleave', function(e) {
        e.preventDefault();
        dragCounter--;
        if (dragCounter <= 0) {
            dragCounter = 0;
            dropOverlay.classList.remove('active');
        }
    });

    canvasWrap.addEventListener('dragover', function(e) {
        e.preventDefault();
    });

    canvasWrap.addEventListener('drop', function(e) {
        e.preventDefault();
        dragCounter = 0;
        dropOverlay.classList.remove('active');

        var files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            loadImageFile(files[0]);
        }
    });

    // ── Clipboard Paste ──
    document.addEventListener('paste', function(e) {
        var items = e.clipboardData && e.clipboardData.items;
        if (!items) return;

        for (var i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                var blob = items[i].getAsFile();
                loadImageFile(blob);
                e.preventDefault();
                return;
            }
        }
    });

    // ── Size Inputs ──
    function applySize() {
        var w = Math.max(16, parseInt(sizeWInput.value) || 256);
        var h = Math.max(16, parseInt(sizeHInput.value) || 256);
        sizeWInput.value = w;
        sizeHInput.value = h;
        Canvas.setSize(w, h);
        if (Canvas.hasSource()) {
            Canvas.reloadSource();
        }
        Chain.render();
    }

    sizeWInput.addEventListener('change', applySize);
    sizeHInput.addEventListener('change', applySize);

    // ── Preset Dropdown ──
    var presetDropdown = document.getElementById('presetDropdown');
    setupDropdown(presetDropdown, function(value) {
        var parts = value.split('x');
        var w = parseInt(parts[0]);
        var h = parseInt(parts[1]);
        sizeWInput.value = w;
        sizeHInput.value = h;
        Canvas.setSize(w, h);
        if (Canvas.hasSource()) {
            Canvas.reloadSource();
        }
        Chain.render();
    });

    // ── Generator (Source) Dropdown ──
    var generatorDropdown = document.getElementById('generatorDropdown');
    var solidColorGroup = document.getElementById('solidColorGroup');
    var gradColorGroup = document.getElementById('gradColorGroup');
    var seedGroup = document.getElementById('seedGroup');
    var seedInput = document.getElementById('genSeed');
    var rerollBtn = document.getElementById('rerollBtn');

    setupDropdown(generatorDropdown, function(value) {
        // A new seed per pick, so choosing white noise twice still gives two
        // different images. The difference from before is that the seed is
        // now written down, so the second one can be got back.
        if (SEEDED_SOURCES.indexOf(value) !== -1) rollSeed();
        regenerate(value);
    });

    /* Which generators answer to the seed, and the current source.

       `lastGenerator` is what makes REROLL and the seed box work at all: both
       have to know which generator to run again, and the dropdown only tells
       you at the moment it is clicked. */
    var SEEDED_SOURCES = ['white-noise', 'perlin-noise'];
    var lastGenerator = null;

    function currentSeed() {
        var v = parseInt(seedInput.value, 10);
        return isNaN(v) ? 0 : v;
    }

    function rollSeed() {
        seedInput.value = Math.floor(Math.random() * 1000000);
    }

    function regenerate(value) {
        var w = Canvas.getWidth();
        var h = Canvas.getHeight();
        var pixels;

        lastGenerator = value;
        seedGroup.hidden = SEEDED_SOURCES.indexOf(value) === -1;

        switch (value) {
            case 'white-noise':
            case 'perlin-noise':
                pixels = Generators[value](w, h, currentSeed());
                break;
            case 'color-bars':
            case 'checkerboard':
                pixels = Generators[value](w, h);
                break;
            case 'h-gradient':
            case 'v-gradient':
            case 'radial-gradient':
                var cA = document.getElementById('gradColorA').value;
                var cB = document.getElementById('gradColorB').value;
                pixels = Generators[value](w, h, cA, cB);
                break;
            case 'solid-color':
                var c = document.getElementById('genColor').value;
                pixels = Generators['solid-color'](w, h, c);
                break;
        }

        if (pixels) {
            Canvas.loadSourcePixels(pixels, w, h);
            Chain.render();
        }
    }

    // REROLL draws the next seed; editing the box replays an exact one, which
    // is the whole point of writing the seed down.
    rerollBtn.addEventListener('click', function() {
        if (!lastGenerator) return;
        rollSeed();
        regenerate(lastGenerator);
    });

    seedInput.addEventListener('change', function() {
        var v = parseInt(seedInput.value, 10);
        seedInput.value = isNaN(v) ? 0 : Math.max(0, v);
        if (lastGenerator) regenerate(lastGenerator);
    });

    /* The source, as data rather than as scattered DOM state.

       js/preset.js needs to record what the picture was made from and put
       it back later, and until now that lived in `lastGenerator`, the seed
       box and two colour pickers, none of which it could reach. An uploaded
       image reports itself as `image` and carries no pixels: a preset is a
       few hundred bytes of description and is not the place to put a photo,
       so applying one keeps whatever image is already loaded. */
    function getSource() {
        if (!lastGenerator) return { type: 'image' };
        var desc = { type: lastGenerator };
        if (SEEDED_SOURCES.indexOf(lastGenerator) !== -1) {
            desc.seed = currentSeed();
        } else if (lastGenerator === 'solid-color') {
            desc.color = document.getElementById('genColor').value;
        } else if (['h-gradient', 'v-gradient', 'radial-gradient'].indexOf(lastGenerator) !== -1) {
            desc.colorA = document.getElementById('gradColorA').value;
            desc.colorB = document.getElementById('gradColorB').value;
        }
        return desc;
    }

    function setSource(desc) {
        if (!desc || !desc.type || desc.type === 'image') {
            // Nothing to rebuild. Keep the loaded image, but re-fit it if the
            // work size changed underneath us.
            if (Canvas.hasSource()) Canvas.reloadSource();
            return;
        }
        if (typeof desc.seed === 'number') seedInput.value = Math.max(0, Math.round(desc.seed));
        if (desc.color) setColorPair('genColor', 'genHex', desc.color);
        if (desc.colorA) setColorPair('gradColorA', 'gradHexA', desc.colorA);
        if (desc.colorB) setColorPair('gradColorB', 'gradHexB', desc.colorB);
        regenerate(desc.type);
    }

    function setColorPair(colorId, hexId, value) {
        if (!/^#[0-9a-f]{6}$/i.test(value)) return;
        document.getElementById(colorId).value = value;
        document.getElementById(hexId).value = value;
    }

    window.App = { getSource: getSource, setSource: setSource };

    // Show/hide source-specific controls
    var genOptions = generatorDropdown.querySelectorAll('.dropdown-option');
    for (var i = 0; i < genOptions.length; i++) {
        genOptions[i].addEventListener('click', function() {
            var val = this.dataset.value;
            solidColorGroup.hidden = val !== 'solid-color';
            gradColorGroup.hidden = ['h-gradient', 'v-gradient', 'radial-gradient'].indexOf(val) === -1;
        });
    }

    // ── Source Color Inputs ──
    var genColor = document.getElementById('genColor');
    var genHex = document.getElementById('genHex');
    syncColorInputs(genColor, genHex);

    var gradColorA = document.getElementById('gradColorA');
    var gradHexA = document.getElementById('gradHexA');
    syncColorInputs(gradColorA, gradHexA);

    var gradColorB = document.getElementById('gradColorB');
    var gradHexB = document.getElementById('gradHexB');
    syncColorInputs(gradColorB, gradHexB);

    // ── Add Effect Dropdown ──
    var addEffectDropdown = document.getElementById('addEffectDropdown');
    setupDropdown(addEffectDropdown, function(value) {
        Chain.addEffect(value);
        UI.renderChain();
        UI.bindEvents();
        Chain.render();
    });

    // ── Export ──
    exportBtn.addEventListener('click', function() {
        var filename = fileNameInput.value || 'pixel-process';
        /* Render synchronously first, rather than trusting the work canvas.

           It used to be true that the display was always current, because a
           render always finished before a click could happen. Since
           js/render.js moved rendering into a worker it is not: a render can
           still be in flight, and exporting then writes whatever frame landed
           last. One extra render costs a few hundred milliseconds at the very
           worst, and makes the file match the screen. */
        Chain.renderImmediate();
        Canvas.exportPNG(filename);
    });

    // ── Dropdown Setup Helper ──
    // Implementation is shared with album-art-maker and media-search:
    // ware/shell/dropdown.js. It reads the computed position of
    // .dropdown-options and places the list itself when it is fixed, which
    // is what this app's escape-the-panel positioning needs. markActive is
    // off because these are action menus, not value pickers.
    // The shared setup attaches its own outside-click close, so the global
    // close-all listener that used to live here is gone.
    function setupDropdown(dropdown, callback) {
        RetroDropdown.setup(dropdown, callback, { markActive: false });
    }

    // ── Color Input Sync Helper ──
    function syncColorInputs(colorInput, hexInput) {
        colorInput.addEventListener('input', function() {
            hexInput.value = colorInput.value;
        });
        hexInput.addEventListener('input', function() {
            if (/^#[0-9a-f]{6}$/i.test(hexInput.value)) {
                colorInput.value = hexInput.value;
            }
        });
        hexInput.addEventListener('blur', function() {
            hexInput.value = colorInput.value;
        });
    }

    // ── Window Resize (debounced) ──
    var resizeTimer = 0;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            Canvas.setSize(Canvas.getWidth(), Canvas.getHeight());
            Chain.renderImmediate();
        }, 100);
    });

    // ── Hold to compare ──
    /* Press and hold the picture to see the source, let go to see the
       result. A scroll that starts on the canvas fires pointercancel,
       which restores the result, so the comparison never sticks. */
    var displayCanvas = document.getElementById('displayCanvas');
    displayCanvas.addEventListener('pointerdown', function(e) {
        if (e.button > 0) return;
        Canvas.showOriginal(true);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function(type) {
        displayCanvas.addEventListener(type, function() { Canvas.showOriginal(false); });
    });

    // ── The graticule switch ──
    var gratToggle = document.getElementById('gratToggle');
    if (gratToggle) {
        var syncGrat = function() {
            var on = Canvas.getGraticule();
            gratToggle.setAttribute('aria-pressed', String(on));
            gratToggle.classList.toggle('on', on);
        };
        gratToggle.addEventListener('click', function() {
            Canvas.setGraticule(!Canvas.getGraticule());
            syncGrat();
        });
        syncGrat();
    }

    // ── Phone action bar ──
    /* Each button forwards a click to the real control, so an action has
       one handler and the bar cannot disagree with the panels. A disabled
       target is left alone, which is what a click on it would do anyway. */
    var mobileBar = document.querySelector('.mobile-bar');
    if (mobileBar) {
        mobileBar.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-forward]');
            if (!btn) return;
            var target = document.getElementById(btn.getAttribute('data-forward'));
            if (target && !target.disabled) target.click();
        });
    }

    // ── Init ──
    // Generate color bars as default source so effects are visible on load
    var initW = Canvas.getWidth();
    var initH = Canvas.getHeight();
    var initPixels = Generators['color-bars'](initW, initH);
    Canvas.loadSourcePixels(initPixels, initW, initH);
    Chain.render();

})();
