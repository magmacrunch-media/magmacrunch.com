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
            alert('Failed to read file.');
        };
        reader.onload = function(ev) {
            var img = new Image();
            img.onerror = function() {
                alert('Failed to load image.');
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

    setupDropdown(generatorDropdown, function(value) {
        var w = Canvas.getWidth();
        var h = Canvas.getHeight();
        var pixels;

        switch (value) {
            case 'white-noise':
            case 'perlin-noise':
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
    });

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
        // Display is already current from last render — just export
        Canvas.exportPNG(filename);
    });

    // ── Dropdown Setup Helper ──
    function setupDropdown(dropdown, callback) {
        var selected = dropdown.querySelector('.dropdown-selected');
        var options = dropdown.querySelector('.dropdown-options');
        var optionEls = dropdown.querySelectorAll('.dropdown-option');

        selected.addEventListener('click', function(e) {
            e.stopPropagation();
            document.querySelectorAll('.custom-dropdown.open').forEach(function(d) {
                if (d !== dropdown) d.classList.remove('open');
            });

            // Position dropdown below trigger button
            var rect = selected.getBoundingClientRect();
            options.style.top = rect.bottom + 'px';
            options.style.left = rect.left + 'px';
            options.style.width = rect.width + 'px';

            dropdown.classList.toggle('open');
        });

        for (var i = 0; i < optionEls.length; i++) {
            optionEls[i].addEventListener('click', function(e) {
                e.stopPropagation();
                var value = this.dataset.value;
                selected.querySelector('span:first-child').textContent = this.textContent;
                dropdown.classList.remove('open');
                if (callback) callback(value);
            });
        }
    }

    // Close dropdowns on outside click
    document.addEventListener('click', function() {
        document.querySelectorAll('.custom-dropdown.open').forEach(function(d) {
            d.classList.remove('open');
        });
    });

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

    // ── Init ──
    // Generate color bars as default source so effects are visible on load
    var initW = Canvas.getWidth();
    var initH = Canvas.getHeight();
    var initPixels = Generators['color-bars'](initW, initH);
    Canvas.loadSourcePixels(initPixels, initW, initH);
    Chain.render();

})();
