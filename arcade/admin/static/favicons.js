/**
 * favicons.js — MAGMA//OPS Favicon Editor tab
 * 16x16 pixel art editor with crop, preview, export, save/load, and deploy
 * v3.1 — Area averaging, crop box, preview before apply, exact colors toggle
 */

(function() {
    'use strict';

    // ── Constants ──────────────────────────────────────────────────────────

    var GRID_SIZE = 16;
    var CANVAS_SIZE = 480;
    var PIXEL_SIZE = CANVAS_SIZE / GRID_SIZE;

    // Site color palette
    var DEFAULT_COLORS = [
        '#080808', '#111118', '#ffffff', '#f0ead8',
        '#ff3d6e', '#ffe03a', '#00f5ff', '#39ff6e',
        '#ff7c1f', '#c45fff', '#4678ff', '#ff2d78',
        '#3b0000', '#6b0000', '#ff5500', '#ff7700',
        '#ffa000', '#8a7a8a', '#8899aa', '#1a7a5e'
    ];

    // ── State ──────────────────────────────────────────────────────────────

    var pixels = [];          // 16x16 array of hex colors (null = transparent)
    var currentColor = '#ff3d6e';
    var currentTool = 'draw'; // draw, erase, fill, eyedropper
    var showGrid = true;
    var isDrawing = false;
    var savedDesigns = {};
    var currentSavedName = null;

    // Crop state
    var cropImage = null;     // The uploaded source image
    var crop = { x: 0, y: 0, size: 0 }; // In source image coords
    var isCropping = false;
    var cropDragMode = null;  // 'move', 'nw', 'ne', 'sw', 'se', null
    var cropDragStart = { x: 0, y: 0, cx: 0, cy: 0, cs: 0 };

    // Snap to palette toggle
    var snapEnabled = true;

    // Preview pixel data (before applying to grid)
    var previewPixels = null;

    // ── DOM refs ───────────────────────────────────────────────────────────

    var canvas = document.getElementById('fav-canvas');
    var ctx = canvas.getContext('2d');
    var cropOverlay = document.getElementById('fav-crop-overlay');
    var cropCtx = cropOverlay.getContext('2d');
    var preview16 = document.getElementById('fav-preview-16');
    var preview32 = document.getElementById('fav-preview-32');
    var previewTab = document.getElementById('fav-preview-tab');
    var paletteEl = document.getElementById('fav-palette');
    var colorPicker = document.getElementById('fav-color-picker');
    var pixelInfo = document.getElementById('fav-pixel-info');
    var saveStatus = document.getElementById('fav-save-status');
    var savedList = document.getElementById('fav-saved-list');
    var snapToggle = document.getElementById('fav-snap-toggle');

    // Buttons
    var btnClear = document.getElementById('fav-btn-clear');
    var btnFill = document.getElementById('fav-btn-fill');
    var btnGridToggle = document.getElementById('fav-btn-grid-toggle');
    var btnSave = document.getElementById('fav-btn-save');
    var btnDeploy = document.getElementById('fav-btn-deploy');
    var btnAddColor = document.getElementById('fav-btn-add-color');
    var btnExportPng = document.getElementById('fav-btn-export-png');
    var btnExportIco = document.getElementById('fav-btn-export-ico');
    var btnExportApple = document.getElementById('fav-btn-export-apple');
    var toolDraw = document.getElementById('fav-tool-draw');
    var toolErase = document.getElementById('fav-tool-erase');
    var toolFillBucket = document.getElementById('fav-tool-fill-bucket');
    var toolEyedropper = document.getElementById('fav-tool-eyedropper');
    var btnUpload = document.getElementById('fav-btn-upload');
    var fileInput = document.getElementById('fav-file-input');
    var btnPixelate = document.getElementById('fav-btn-pixelate');
    var btnApply = document.getElementById('fav-btn-apply');
    var btnCancelCrop = document.getElementById('fav-btn-cancel-crop');

    // ── Init ───────────────────────────────────────────────────────────────

    function init() {
        clearPixels();
        renderPalette();
        bindEvents();
        render();
    }

    function clearPixels() {
        pixels = [];
        for (var y = 0; y < GRID_SIZE; y++) {
            pixels[y] = [];
            for (var x = 0; x < GRID_SIZE; x++) {
                pixels[y][x] = null;
            }
        }
    }

    // ── Color Utilities ────────────────────────────────────────────────────

    function hexToRgb(hex) {
        var c = hex.replace('#', '');
        return {
            r: parseInt(c.substring(0, 2), 16),
            g: parseInt(c.substring(2, 4), 16),
            b: parseInt(c.substring(4, 6), 16)
        };
    }

    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(function(v) {
            var h = Math.max(0, Math.min(255, Math.round(v))).toString(16);
            return h.length === 1 ? '0' + h : h;
        }).join('');
    }

    function colorDistance(c1, c2) {
        var dr = c1.r - c2.r;
        var dg = c1.g - c2.g;
        var db = c1.b - c2.b;
        return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    function snapToPalette(r, g, b) {
        if (r < 15 && g < 15 && b < 15) return null;

        var best = null;
        var bestDist = Infinity;
        var rgb = { r: r, g: g, b: b };

        for (var i = 0; i < DEFAULT_COLORS.length; i++) {
            var pc = hexToRgb(DEFAULT_COLORS[i]);
            var dist = colorDistance(rgb, pc);
            if (dist < bestDist) {
                bestDist = dist;
                best = DEFAULT_COLORS[i];
            }
        }
        return best;
    }

    // ── Upload + Crop ──────────────────────────────────────────────────────

    function handleImageUpload(e) {
        var file = e.target.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function(ev) {
            var img = new Image();
            img.onload = function() {
                cropImage = img;
                startCrop();
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        fileInput.value = '';
    }

    function startCrop() {
        if (!cropImage) return;

        // Initialize crop to center square
        var imgSize = Math.min(cropImage.width, cropImage.height);
        crop.size = imgSize;
        crop.x = Math.floor((cropImage.width - imgSize) / 2);
        crop.y = Math.floor((cropImage.height - imgSize) / 2);

        // Show crop overlay, hide canvas drawing
        cropOverlay.style.display = 'block';
        canvas.style.pointerEvents = 'none';

        // Show pixelate/apply/cancel buttons
        btnPixelate.style.display = '';
        btnCancelCrop.style.display = '';
        btnApply.style.display = 'none';

        drawCropOverlay();
        OPS.toast('Drag crop box, then click PIXELATE');
    }

    function drawCropOverlay() {
        cropCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        if (!cropImage) return;

        // Draw the source image scaled to canvas
        var imgAspect = cropImage.width / cropImage.height;
        var drawW, drawH, drawX, drawY;

        // Fit image into canvas maintaining aspect ratio
        if (imgAspect >= 1) {
            drawW = CANVAS_SIZE;
            drawH = CANVAS_SIZE / imgAspect;
            drawX = 0;
            drawY = (CANVAS_SIZE - drawH) / 2;
        } else {
            drawH = CANVAS_SIZE;
            drawW = CANVAS_SIZE * imgAspect;
            drawX = (CANVAS_SIZE - drawW) / 2;
            drawY = 0;
        }

        cropCtx.drawImage(cropImage, drawX, drawY, drawW, drawH);

        // Calculate crop box in canvas coordinates
        var scaleX = drawW / cropImage.width;
        var scaleY = drawH / cropImage.height;
        var cbx = drawX + crop.x * scaleX;
        var cby = drawY + crop.y * scaleY;
        var cbs = crop.size * Math.min(scaleX, scaleY);

        // Draw dim overlay outside crop region
        cropCtx.fillStyle = 'rgba(0,0,0,0.6)';
        // Top
        cropCtx.fillRect(0, 0, CANVAS_SIZE, cby);
        // Bottom
        cropCtx.fillRect(0, cby + cbs, CANVAS_SIZE, CANVAS_SIZE - cby - cbs);
        // Left
        cropCtx.fillRect(0, cby, cbx, cbs);
        // Right
        cropCtx.fillRect(cbx + cbs, cby, CANVAS_SIZE - cbx - cbs, cbs);

        // Draw crop border
        cropCtx.strokeStyle = '#ffe03a';
        cropCtx.lineWidth = 2;
        cropCtx.setLineDash([6, 3]);
        cropCtx.strokeRect(cbx, cby, cbs, cbs);
        cropCtx.setLineDash([]);

        // Draw corner handles
        var handleSize = 10;
        cropCtx.fillStyle = '#ffe03a';
        // NW
        cropCtx.fillRect(cbx - handleSize/2, cby - handleSize/2, handleSize, handleSize);
        // NE
        cropCtx.fillRect(cbx + cbs - handleSize/2, cby - handleSize/2, handleSize, handleSize);
        // SW
        cropCtx.fillRect(cbx - handleSize/2, cby + cbs - handleSize/2, handleSize, handleSize);
        // SE
        cropCtx.fillRect(cbx + cbs - handleSize/2, cby + cbs - handleSize/2, handleSize, handleSize);

        // Draw rule-of-thirds grid inside crop
        cropCtx.strokeStyle = 'rgba(255,224,58,0.3)';
        cropCtx.lineWidth = 1;
        for (var i = 1; i <= 2; i++) {
            var gx = cbx + (cbs * i / 3);
            var gy = cby + (cbs * i / 3);
            cropCtx.beginPath();
            cropCtx.moveTo(gx, cby);
            cropCtx.lineTo(gx, cby + cbs);
            cropCtx.stroke();
            cropCtx.beginPath();
            cropCtx.moveTo(cbx, gy);
            cropCtx.lineTo(cbx + cbs, gy);
            cropCtx.stroke();
        }

        // Draw size label
        cropCtx.font = '10px "Press Start 2P"';
        cropCtx.fillStyle = '#ffe03a';
        cropCtx.fillText(crop.size + '×' + crop.size, cbx + 4, cby - 8);
    }

    function getCropCanvasCoords() {
        if (!cropImage) return null;
        var imgAspect = cropImage.width / cropImage.height;
        var drawW, drawH, drawX, drawY;
        if (imgAspect >= 1) {
            drawW = CANVAS_SIZE;
            drawH = CANVAS_SIZE / imgAspect;
            drawX = 0;
            drawY = (CANVAS_SIZE - drawH) / 2;
        } else {
            drawH = CANVAS_SIZE;
            drawW = CANVAS_SIZE * imgAspect;
            drawX = (CANVAS_SIZE - drawW) / 2;
            drawY = 0;
        }
        var scaleX = drawW / cropImage.width;
        var scaleY = drawH / cropImage.height;
        return {
            x: drawX + crop.x * scaleX,
            y: drawY + crop.y * scaleY,
            size: crop.size * Math.min(scaleX, scaleY),
            drawX: drawX, drawY: drawY, drawW: drawW, drawH: drawH,
            scaleX: scaleX, scaleY: scaleY
        };
    }

    function getCropHitZone(mx, my) {
        var cc = getCropCanvasCoords();
        if (!cc) return null;
        var handleSize = 14;

        // Check corners first
        if (Math.abs(mx - cc.x) < handleSize && Math.abs(my - cc.y) < handleSize) return 'nw';
        if (Math.abs(mx - (cc.x + cc.size)) < handleSize && Math.abs(my - cc.y) < handleSize) return 'ne';
        if (Math.abs(mx - cc.x) < handleSize && Math.abs(my - (cc.y + cc.size)) < handleSize) return 'sw';
        if (Math.abs(mx - (cc.x + cc.size)) < handleSize && Math.abs(my - (cc.y + cc.size)) < handleSize) return 'se';

        // Check if inside crop
        if (mx >= cc.x && mx <= cc.x + cc.size && my >= cc.y && my <= cc.y + cc.size) return 'move';

        return null;
    }

    function handleCropMouseDown(e) {
        if (!cropImage || cropOverlay.style.display === 'none') return;
        var rect = cropOverlay.getBoundingClientRect();
        var mx = e.clientX - rect.left;
        var my = e.clientY - rect.top;

        var zone = getCropHitZone(mx, my);
        if (!zone) return;

        e.preventDefault();
        isCropping = true;
        cropDragMode = zone;
        cropDragStart = { x: mx, y: my, cx: crop.x, cy: crop.y, cs: crop.size };
    }

    function handleCropMouseMove(e) {
        if (!cropImage) return;
        var rect = cropOverlay.getBoundingClientRect();
        var mx = e.clientX - rect.left;
        var my = e.clientY - rect.top;

        // Update cursor
        if (!isCropping) {
            var zone = getCropHitZone(mx, my);
            if (zone === 'move') cropOverlay.style.cursor = 'move';
            else if (zone === 'nw' || zone === 'se') cropOverlay.style.cursor = 'nwse-resize';
            else if (zone === 'ne' || zone === 'sw') cropOverlay.style.cursor = 'nesw-resize';
            else cropOverlay.style.cursor = 'default';
            return;
        }

        e.preventDefault();

        // Convert mouse delta to source image coords
        var cc = getCropCanvasCoords();
        var dx = (mx - cropDragStart.x) / cc.scaleX;
        var dy = (my - cropDragStart.y) / cc.scaleY;
        var minCropSize = 16;

        if (cropDragMode === 'move') {
            crop.x = Math.max(0, Math.min(cropImage.width - crop.size, cropDragStart.cx + dx));
            crop.y = Math.max(0, Math.min(cropImage.height - crop.size, cropDragStart.cy + dy));
        } else {
            // Resize from corner — maintain square
            var delta = Math.max(Math.abs(dx), Math.abs(dy));
            var signX = (cropDragMode === 'ne' || cropDragMode === 'se') ? 1 : -1;
            var signY = (cropDragMode === 'sw' || cropDragMode === 'se') ? 1 : -1;
            var newSize = Math.max(minCropSize, cropDragStart.cs + delta * signX * Math.SQRT2);
            newSize = Math.min(newSize, cropImage.width, cropImage.height);

            // Adjust position for north/west corners
            if (signX < 0) {
                crop.x = cropDragStart.cx + (cropDragStart.cs - newSize);
            } else {
                crop.x = cropDragStart.cx;
            }
            if (signY < 0) {
                crop.y = cropDragStart.cy + (cropDragStart.cs - newSize);
            } else {
                crop.y = cropDragStart.cy;
            }
            crop.size = Math.round(newSize);

            // Clamp
            crop.x = Math.max(0, Math.min(cropImage.width - crop.size, crop.x));
            crop.y = Math.max(0, Math.min(cropImage.height - crop.size, crop.y));
        }

        drawCropOverlay();
    }

    function handleCropMouseUp() {
        isCropping = false;
        cropDragMode = null;
    }

    // ── Pixelate (area averaging) ──────────────────────────────────────────

    function pixelateFromCrop() {
        if (!cropImage) return;

        // Create temp canvas at full crop resolution
        var tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = GRID_SIZE;
        tmpCanvas.height = GRID_SIZE;
        var tmpCtx = tmpCanvas.getContext('2d');

        // Use area averaging: sample the average color from each cell
        var sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = crop.size;
        sourceCanvas.height = crop.size;
        var sourceCtx = sourceCanvas.getContext('2d');
        sourceCtx.drawImage(cropImage, crop.x, crop.y, crop.size, crop.size, 0, 0, crop.size, crop.size);

        var sourceData = sourceCtx.getImageData(0, 0, crop.size, crop.size);
        var srcPixels = sourceData.data;
        var cellSize = crop.size / GRID_SIZE;

        previewPixels = [];
        for (var gy = 0; gy < GRID_SIZE; gy++) {
            previewPixels[gy] = [];
            for (var gx = 0; gx < GRID_SIZE; gx++) {
                var rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;

                // Sample the entire source cell
                var startX = Math.floor(gx * cellSize);
                var endX = Math.floor((gx + 1) * cellSize);
                var startY = Math.floor(gy * cellSize);
                var endY = Math.floor((gy + 1) * cellSize);

                for (var sy = startY; sy < endY; sy++) {
                    for (var sx = startX; sx < endX; sx++) {
                        var idx = (sy * crop.size + sx) * 4;
                        rSum += srcPixels[idx];
                        gSum += srcPixels[idx + 1];
                        bSum += srcPixels[idx + 2];
                        aSum += srcPixels[idx + 3];
                        count++;
                    }
                }

                if (count === 0) { previewPixels[gy][gx] = null; continue; }

                var r = Math.round(rSum / count);
                var g = Math.round(gSum / count);
                var b = Math.round(bSum / count);
                var a = Math.round(aSum / count);

                if (a < 128) {
                    previewPixels[gy][gx] = null;
                } else if (snapEnabled) {
                    previewPixels[gy][gx] = snapToPalette(r, g, b);
                } else {
                    previewPixels[gy][gx] = rgbToHex(r, g, b);
                }
            }
        }

        // Show preview in preview panels (without changing grid)
        renderPreviewData(preview16, 16, previewPixels);
        renderPreviewData(preview32, 32, previewPixels);
        renderPreviewData(previewTab, 16, previewPixels);

        // Show apply/cancel, hide pixelate
        btnApply.style.display = '';
        btnCancelCrop.style.display = '';
        btnPixelate.style.display = 'none';

        OPS.toast('Preview ready — click APPLY to confirm');
    }

    function applyPixelate() {
        if (!previewPixels) return;
        pixels = previewPixels.map(function(row) { return row.slice(); });
        previewPixels = null;
        cancelCrop();
        render();
        OPS.toast('Applied!');
    }

    function cancelCrop() {
        cropImage = null;
        cropOverlay.style.display = 'none';
        canvas.style.pointerEvents = '';
        btnPixelate.style.display = 'none';
        btnApply.style.display = 'none';
        btnCancelCrop.style.display = 'none';
        previewPixels = null;
        cropCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }

    // ── Palette ────────────────────────────────────────────────────────────

    function renderPalette() {
        paletteEl.innerHTML = '';
        DEFAULT_COLORS.forEach(function(color) {
            var swatch = document.createElement('div');
            swatch.className = 'fav-color-swatch' + (color === currentColor ? ' active' : '');
            swatch.style.background = color;
            swatch.dataset.color = color;
            swatch.title = color;
            swatch.addEventListener('click', function() {
                selectColor(color);
            });
            paletteEl.appendChild(swatch);
        });
    }

    function selectColor(color) {
        currentColor = color;
        colorPicker.value = color;
        document.querySelectorAll('.fav-color-swatch').forEach(function(s) {
            s.classList.toggle('active', s.dataset.color === color);
        });
    }

    // ── Tools ──────────────────────────────────────────────────────────────

    function setTool(tool) {
        currentTool = tool;
        [toolDraw, toolErase, toolFillBucket, toolEyedropper].forEach(function(btn) {
            btn.classList.remove('active');
        });
        switch (tool) {
            case 'draw': toolDraw.classList.add('active'); break;
            case 'erase': toolErase.classList.add('active'); break;
            case 'fill': toolFillBucket.classList.add('active'); break;
            case 'eyedropper': toolEyedropper.classList.add('active'); break;
        }
    }

    // ── Drawing ────────────────────────────────────────────────────────────

    function getPixelFromEvent(e) {
        var rect = canvas.getBoundingClientRect();
        var clientX = e.touches ? e.touches[0].clientX : e.clientX;
        var clientY = e.touches ? e.touches[0].clientY : e.clientY;
        var x = Math.floor((clientX - rect.left) / (rect.width / GRID_SIZE));
        var y = Math.floor((clientY - rect.top) / (rect.height / GRID_SIZE));
        x = Math.max(0, Math.min(GRID_SIZE - 1, x));
        y = Math.max(0, Math.min(GRID_SIZE - 1, y));
        return { x: x, y: y };
    }

    function setPixel(x, y, color) {
        if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;
        pixels[y][x] = color;
        render();
    }

    function floodFill(startX, startY, fillColor) {
        var targetColor = pixels[startY][startX];
        if (targetColor === fillColor) return;

        var stack = [{x: startX, y: startY}];
        var visited = {};

        while (stack.length > 0) {
            var p = stack.pop();
            var key = p.x + ',' + p.y;

            if (visited[key]) continue;
            if (p.x < 0 || p.x >= GRID_SIZE || p.y < 0 || p.y >= GRID_SIZE) continue;
            if (pixels[p.y][p.x] !== targetColor) continue;

            visited[key] = true;
            pixels[p.y][p.x] = fillColor;

            stack.push({x: p.x + 1, y: p.y});
            stack.push({x: p.x - 1, y: p.y});
            stack.push({x: p.x, y: p.y + 1});
            stack.push({x: p.x, y: p.y - 1});
        }
    }

    function handleDraw(e) {
        if (cropImage && cropOverlay.style.display !== 'none') return;
        var pos = getPixelFromEvent(e);
        pixelInfo.textContent = 'X: ' + pos.x + ' Y: ' + pos.y;

        if (currentTool === 'eyedropper') {
            var pickedColor = pixels[pos.y][pos.x];
            if (pickedColor) {
                selectColor(pickedColor);
                setTool('draw');
            }
            return;
        }

        if (!isDrawing && currentTool !== 'fill') return;

        if (currentTool === 'draw') {
            setPixel(pos.x, pos.y, currentColor);
        } else if (currentTool === 'erase') {
            setPixel(pos.x, pos.y, null);
        } else if (currentTool === 'fill' && isDrawing) {
            floodFill(pos.x, pos.y, currentColor);
            render();
        }
    }

    // ── Rendering ──────────────────────────────────────────────────────────

    function render() {
        renderCanvas();
        renderPreviews();
    }

    function renderCanvas() {
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        for (var y = 0; y < GRID_SIZE; y++) {
            for (var x = 0; x < GRID_SIZE; x++) {
                if (pixels[y][x]) {
                    ctx.fillStyle = pixels[y][x];
                    ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
                }
            }
        }

        if (showGrid) {
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            for (var i = 0; i <= GRID_SIZE; i++) {
                ctx.beginPath();
                ctx.moveTo(i * PIXEL_SIZE + 0.5, 0);
                ctx.lineTo(i * PIXEL_SIZE + 0.5, CANVAS_SIZE);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, i * PIXEL_SIZE + 0.5);
                ctx.lineTo(CANVAS_SIZE, i * PIXEL_SIZE + 0.5);
                ctx.stroke();
            }
        }
    }

    function renderPreviewData(targetCanvas, size, data) {
        var pctx = targetCanvas.getContext('2d');
        pctx.clearRect(0, 0, size, size);
        var scale = size / GRID_SIZE;
        for (var y = 0; y < GRID_SIZE; y++) {
            for (var x = 0; x < GRID_SIZE; x++) {
                if (data[y] && data[y][x]) {
                    pctx.fillStyle = data[y][x];
                    pctx.fillRect(x * scale, y * scale, scale, scale);
                }
            }
        }
    }

    function renderPreview(targetCanvas, size) {
        renderPreviewData(targetCanvas, size, pixels);
    }

    function renderPreviews() {
        renderPreview(preview16, 16);
        renderPreview(preview32, 32);
        renderPreview(previewTab, 16);
    }

    // ── Export ─────────────────────────────────────────────────────────────

    function createImageBlob(size, callback) {
        var exportCanvas = document.createElement('canvas');
        exportCanvas.width = size;
        exportCanvas.height = size;
        renderPreview(exportCanvas, size);
        exportCanvas.toBlob(callback, 'image/png');
    }

    function downloadBlob(blob, filename) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    function exportPng() {
        createImageBlob(32, function(blob) {
            downloadBlob(blob, 'favicon-32.png');
            OPS.toast('PNG exported!');
        });
    }

    function exportIco() {
        createImageBlob(16, function(blob16) {
            createImageBlob(32, function(blob32) {
                var reader16 = new FileReader();
                reader16.onload = function() {
                    var data16 = new Uint8Array(reader16.result);
                    var reader32 = new FileReader();
                    reader32.onload = function() {
                        var data32 = new Uint8Array(reader32.result);
                        var ico = buildIco(data16, data32);
                        downloadBlob(new Blob([ico], {type: 'image/x-icon'}), 'favicon.ico');
                        OPS.toast('ICO exported!');
                    };
                    reader32.readAsArrayBuffer(blob32);
                };
                reader16.readAsArrayBuffer(blob16);
            });
        });
    }

    function buildIco(data16, data32) {
        var numImages = 2;
        var headerSize = 6;
        var entrySize = 16;
        var offset = headerSize + (entrySize * numImages);

        var totalSize = offset + data16.length + data32.length;
        var buffer = new ArrayBuffer(totalSize);
        var view = new DataView(buffer);

        view.setUint16(0, 0, true);
        view.setUint16(2, 1, true);
        view.setUint16(4, numImages, true);

        var entryOffset = headerSize;
        view.setUint8(entryOffset, 16);
        view.setUint8(entryOffset + 1, 16);
        view.setUint8(entryOffset + 2, 0);
        view.setUint8(entryOffset + 3, 0);
        view.setUint16(entryOffset + 4, 1, true);
        view.setUint16(entryOffset + 6, 32, true);
        view.setUint32(entryOffset + 8, data16.length, true);
        view.setUint32(entryOffset + 12, offset, true);

        entryOffset += entrySize;
        view.setUint8(entryOffset, 32);
        view.setUint8(entryOffset + 1, 32);
        view.setUint8(entryOffset + 2, 0);
        view.setUint8(entryOffset + 3, 0);
        view.setUint16(entryOffset + 4, 1, true);
        view.setUint16(entryOffset + 6, 32, true);
        view.setUint32(entryOffset + 8, data32.length, true);
        view.setUint32(entryOffset + 12, offset + data16.length, true);

        var uint8 = new Uint8Array(buffer);
        uint8.set(data16, offset);
        uint8.set(data32, offset + data16.length);

        return buffer;
    }

    function exportApple() {
        createImageBlob(180, function(blob) {
            downloadBlob(blob, 'apple-touch-icon.png');
            OPS.toast('Apple touch icon exported!');
        });
    }

    // ── Save / Load ────────────────────────────────────────────────────────

    function getCurrentPixelData() {
        return pixels.map(function(row) { return row.slice(); });
    }

    function loadPixelData(data) {
        pixels = data.map(function(row) { return row.slice(); });
        render();
    }

    function renderSavedList() {
        var names = Object.keys(savedDesigns);
        if (names.length === 0) {
            savedList.innerHTML = '<span class="fav-no-saved">No saved designs yet.</span>';
            return;
        }

        savedList.innerHTML = '';
        names.forEach(function(name) {
            var item = document.createElement('div');
            item.className = 'fav-saved-item' + (name === currentSavedName ? ' active' : '');

            var thumb = document.createElement('canvas');
            thumb.className = 'fav-saved-thumb';
            thumb.width = 16;
            thumb.height = 16;
            var tctx = thumb.getContext('2d');
            tctx.clearRect(0, 0, 16, 16);
            var data = savedDesigns[name];
            if (data) {
                for (var y = 0; y < GRID_SIZE; y++) {
                    for (var x = 0; x < GRID_SIZE; x++) {
                        if (data[y] && data[y][x]) {
                            tctx.fillStyle = data[y][x];
                            tctx.fillRect(x, y, 1, 1);
                        }
                    }
                }
            }

            var nameSpan = document.createElement('span');
            nameSpan.className = 'fav-saved-name';
            nameSpan.textContent = name;

            var deleteBtn = document.createElement('button');
            deleteBtn.className = 'fav-saved-delete';
            deleteBtn.textContent = '×';
            deleteBtn.title = 'Delete';
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (confirm('Delete "' + name + '"?')) {
                    delete savedDesigns[name];
                    OPS.send({ action: 'favicon_delete', token: OPS.authToken, name: name });
                    if (currentSavedName === name) currentSavedName = null;
                    renderSavedList();
                }
            });

            item.appendChild(thumb);
            item.appendChild(nameSpan);
            item.appendChild(deleteBtn);

            item.addEventListener('click', function() {
                currentSavedName = name;
                loadPixelData(savedDesigns[name]);
                renderSavedList();
            });

            savedList.appendChild(item);
        });
    }

    function saveDesign() {
        var name = prompt('Design name:', currentSavedName || '');
        if (!name) return;

        currentSavedName = name;
        savedDesigns[name] = getCurrentPixelData();

        OPS.send({
            action: 'favicon_save',
            token: OPS.authToken,
            name: name,
            pixels: savedDesigns[name]
        });

        saveStatus.textContent = 'SAVED';
        saveStatus.style.color = 'var(--green)';
        setTimeout(function() { saveStatus.textContent = ''; }, 2000);

        renderSavedList();
    }

    function loadAllDesigns() {
        OPS.send({ action: 'favicon_load_all', token: OPS.authToken });
    }

    // ── Deploy ─────────────────────────────────────────────────────────────

    function deployToSite() {
        OPS.confirm(
            'DEPLOY FAVICON',
            'This will generate favicon files and commit them to GitHub. The site will update in ~1 minute.',
            function() {
                OPS.send({
                    action: 'favicon_deploy',
                    token: OPS.authToken,
                    pixels: getCurrentPixelData()
                });
                saveStatus.textContent = 'DEPLOYING...';
                saveStatus.style.color = 'var(--yellow)';
            }
        );
    }

    // ── Event Binding ──────────────────────────────────────────────────────

    function bindEvents() {
        // Canvas drawing
        canvas.addEventListener('mousedown', function(e) {
            isDrawing = true;
            handleDraw(e);
        });
        canvas.addEventListener('mousemove', handleDraw);
        canvas.addEventListener('mouseup', function() { isDrawing = false; });
        canvas.addEventListener('mouseleave', function() { isDrawing = false; });

        // Touch support for drawing
        canvas.addEventListener('touchstart', function(e) {
            e.preventDefault();
            isDrawing = true;
            handleDraw(e);
        });
        canvas.addEventListener('touchmove', function(e) {
            e.preventDefault();
            handleDraw(e);
        });
        canvas.addEventListener('touchend', function() { isDrawing = false; });

        // Crop overlay events
        cropOverlay.addEventListener('mousedown', handleCropMouseDown);
        cropOverlay.addEventListener('mousemove', handleCropMouseMove);
        cropOverlay.addEventListener('mouseup', handleCropMouseUp);
        cropOverlay.addEventListener('mouseleave', handleCropMouseUp);

        // Tools
        toolDraw.addEventListener('click', function() { setTool('draw'); });
        toolErase.addEventListener('click', function() { setTool('erase'); });
        toolFillBucket.addEventListener('click', function() { setTool('fill'); });
        toolEyedropper.addEventListener('click', function() { setTool('eyedropper'); });

        // Color picker
        colorPicker.addEventListener('input', function() {
            selectColor(colorPicker.value);
        });

        btnAddColor.addEventListener('click', function() {
            var color = colorPicker.value;
            if (!DEFAULT_COLORS.includes(color)) {
                DEFAULT_COLORS.push(color);
                renderPalette();
            }
            selectColor(color);
        });

        // Snap toggle
        snapToggle.addEventListener('change', function() {
            snapEnabled = snapToggle.checked;
        });

        // Toolbar buttons
        btnClear.addEventListener('click', function() {
            clearPixels();
            render();
        });

        btnFill.addEventListener('click', function() {
            for (var y = 0; y < GRID_SIZE; y++) {
                for (var x = 0; x < GRID_SIZE; x++) {
                    pixels[y][x] = currentColor;
                }
            }
            render();
        });

        btnUpload.addEventListener('click', function() {
            fileInput.click();
        });
        fileInput.addEventListener('change', handleImageUpload);

        btnPixelate.addEventListener('click', pixelateFromCrop);
        btnApply.addEventListener('click', applyPixelate);
        btnCancelCrop.addEventListener('click', cancelCrop);

        btnGridToggle.addEventListener('click', function() {
            showGrid = !showGrid;
            btnGridToggle.textContent = 'GRID: ' + (showGrid ? 'ON' : 'OFF');
            render();
        });

        btnSave.addEventListener('click', saveDesign);
        btnDeploy.addEventListener('click', deployToSite);

        // Export
        btnExportPng.addEventListener('click', exportPng);
        btnExportIco.addEventListener('click', exportIco);
        btnExportApple.addEventListener('click', exportApple);
    }

    // ── WebSocket message handler ──────────────────────────────────────────

    var origOnMessage = window.OPS.onMessage;
    window.OPS.onMessage = function(msg) {
        if (origOnMessage) origOnMessage(msg);

        switch (msg.type) {
            case 'favicon_list':
                savedDesigns = msg.designs || {};
                renderSavedList();
                break;

            case 'favicon_saved':
                OPS.toast('Design saved: ' + msg.name);
                break;

            case 'favicon_deleted':
                OPS.toast('Design deleted');
                break;

            case 'favicon_deploy_result':
                if (msg.success) {
                    OPS.toast('Favicon deployed to site!');
                    saveStatus.textContent = 'DEPLOYED';
                    saveStatus.style.color = 'var(--green)';
                } else {
                    OPS.toast('Deploy failed: ' + (msg.error || 'Unknown error'), true);
                    saveStatus.textContent = 'DEPLOY FAILED';
                    saveStatus.style.color = 'var(--rose)';
                }
                setTimeout(function() { saveStatus.textContent = ''; }, 3000);
                break;
        }
    };

    var origOnConnect = window.OPS.onConnect;
    window.OPS.onConnect = function() {
        if (origOnConnect) origOnConnect();
        loadAllDesigns();
    };

    // ── Init ───────────────────────────────────────────────────────────────

    init();

})();
