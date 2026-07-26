/* ── canvas.js — rendering engine, element drawing, export ── */
window.CanvasRenderer = (function () {
    let canvas, ctx;
    let canvasSize = 1024;
    let bgColor = '#ffffff';
    let selectedId = null;
    let currentElements = [];
    const imageCache = {}; // id → Image

    function init(canvasEl) {
        canvas = canvasEl;
        ctx = canvas.getContext('2d');
        render([]);
    }

    function setCanvasSize(size) {
        canvasSize = size;
        canvas.width = size;
        canvas.height = size;
    }

    function getCanvasSize() { return canvasSize; }

    function setBgColor(color) { bgColor = color; }
    function getBgColor() { return bgColor; }

    function setSelectedId(id) { selectedId = id; }
    function getSelectedId() { return selectedId; }

    function render(elements) {
        currentElements = elements;
        ctx.save();

        // background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        // draw all elements
        for (const el of elements) {
            drawElement(el);
        }

        // selection outline
        if (selectedId !== null) {
            const sel = elements.find(e => e.id === selectedId);
            if (sel) drawSelection(sel);
        }

        ctx.restore();
    }

    function applyRotation(targetCtx, el) {
        if (!el.rotation) return;
        const bounds = getElementBounds(el);
        const cx = bounds.x + bounds.w / 2;
        const cy = bounds.y + bounds.h / 2;
        targetCtx.translate(cx, cy);
        targetCtx.rotate(el.rotation * Math.PI / 180);
        targetCtx.translate(-cx, -cy);
    }

    function drawElement(el) {
        ctx.save();
        if (el.opacity != null && el.opacity < 100) {
            ctx.globalAlpha = el.opacity / 100;
        }
        applyRotation(ctx, el);

        switch (el.type) {
            case 'rect':
                drawRect(el);
                break;
            case 'circle':
                drawCircle(el);
                break;
            case 'line':
                drawLine(el);
                break;
            case 'text':
                drawText(el);
                break;
            case 'image':
                drawImageEl(ctx, el);
                break;
            case 'triangle':
                drawTriangle(el);
                break;
            case 'pentagon':
                drawPentagon(el);
                break;
            case 'hexagon':
                drawHexagon(el);
                break;
            case 'diamond':
                drawDiamond(el);
                break;
            case 'star':
                drawStar(el);
                break;
            case 'arrow':
                drawArrow(el);
                break;
            case 'roundrect':
                drawRoundRect(el);
                break;
            case 'sine':
                drawSine(el);
                break;
            case 'squarewave':
                drawSquareWave(el);
                break;
            case 'sawtooth':
                drawSawtooth(el);
                break;
            case 'trianglewave':
                drawTriangleWave(el);
                break;
            case 'step':
                drawStep(el);
                break;
            case 'pulse':
                drawPulse(el);
                break;
            case 'clipart':
                drawClipartEl(el);
                break;
        }

        ctx.restore();
    }

    function loadImage(el) {
        if (imageCache[el.id]) return imageCache[el.id];
        const img = new Image();
        img.onload = function () {
            // re-render the canvas now that the image is loaded
            render(currentElements);
        };
        img.src = el.src;
        imageCache[el.id] = img;
        return img;
    }

    function drawImageEl(targetCtx, el) {
        const img = loadImage(el);
        if (!img.complete) return;
        targetCtx.drawImage(img, el.x, el.y, el.w, el.h);
    }

    function drawRect(el) {
        if (el.fill && el.fill !== 'none') {
            ctx.fillStyle = el.fill;
            ctx.fillRect(el.x, el.y, el.w, el.h);
        }
        if (el.stroke && el.stroke !== 'none' && el.strokeWidth > 0) {
            ctx.strokeStyle = el.stroke;
            ctx.lineWidth = el.strokeWidth;
            ctx.strokeRect(el.x, el.y, el.w, el.h);
        }
    }

    function drawCircle(el) {
        const cx = el.x + el.w / 2;
        const cy = el.y + el.h / 2;
        const rx = Math.abs(el.w / 2);
        const ry = Math.abs(el.h / 2);

        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);

        if (el.fill && el.fill !== 'none') {
            ctx.fillStyle = el.fill;
            ctx.fill();
        }
        if (el.stroke && el.stroke !== 'none' && el.strokeWidth > 0) {
            ctx.strokeStyle = el.stroke;
            ctx.lineWidth = el.strokeWidth;
            ctx.stroke();
        }
    }

    function drawLine(el) {
        if (!el.stroke || el.stroke === 'none') return;
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = el.strokeWidth || 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.x + el.w, el.y + el.h);
        ctx.stroke();
    }

    function drawText(el) {
        if (!el.text) return;
        const fontSize = el.fontSize || 48;
        const font = el.font || 'Press Start 2P';
        ctx.font = `${fontSize}px "${font}"`;
        ctx.textBaseline = 'top';

        // handle multiline
        const lines = el.text.split('\n');
        const lineHeight = fontSize * 1.3;

        for (let i = 0; i < lines.length; i++) {
            const ly = el.y + i * lineHeight;

            if (el.fill && el.fill !== 'none') {
                ctx.fillStyle = el.fill;
                ctx.fillText(lines[i], el.x, ly);
            }
            if (el.stroke && el.stroke !== 'none' && el.strokeWidth > 0) {
                ctx.strokeStyle = el.stroke;
                ctx.lineWidth = el.strokeWidth;
                ctx.lineJoin = 'round';
                ctx.strokeText(lines[i], el.x, ly);
            }
        }
    }

    // ── BASIC SHAPES ──

    function drawTriangle(el) {
        const cx = el.x + el.w / 2;
        ctx.beginPath();
        ctx.moveTo(cx, el.y);
        ctx.lineTo(el.x, el.y + el.h);
        ctx.lineTo(el.x + el.w, el.y + el.h);
        ctx.closePath();
        fillOrStroke(el);
    }

    function drawPentagon(el) {
        drawPolygon(el, 5, -Math.PI / 2);
    }

    function drawHexagon(el) {
        drawPolygon(el, 6, -Math.PI / 2);
    }

    function drawPolygon(el, sides, startAngle) {
        const cx = el.x + el.w / 2;
        const cy = el.y + el.h / 2;
        const rx = el.w / 2;
        const ry = el.h / 2;
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const angle = startAngle + (i * 2 * Math.PI) / sides;
            const px = cx + rx * Math.cos(angle);
            const py = cy + ry * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        fillOrStroke(el);
    }

    function drawDiamond(el) {
        const cx = el.x + el.w / 2;
        const cy = el.y + el.h / 2;
        ctx.beginPath();
        ctx.moveTo(cx, el.y);
        ctx.lineTo(el.x + el.w, cy);
        ctx.lineTo(cx, el.y + el.h);
        ctx.lineTo(el.x, cy);
        ctx.closePath();
        fillOrStroke(el);
    }

    function drawStar(el) {
        const cx = el.x + el.w / 2;
        const cy = el.y + el.h / 2;
        const rx = el.w / 2;
        const ry = el.h / 2;
        const inner = 0.4;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const angle = -Math.PI / 2 + (i * Math.PI) / 5;
            const r = i % 2 === 0 ? 1 : inner;
            const px = cx + rx * r * Math.cos(angle);
            const py = cy + ry * r * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        fillOrStroke(el);
    }

    function drawArrow(el) {
        if (!el.stroke || el.stroke === 'none') return;
        const x1 = el.x, y1 = el.y + el.h / 2;
        const x2 = el.x + el.w, y2 = el.y + el.h / 2;
        const headLen = Math.min(el.w * 0.25, el.h * 0.4);
        const angle = Math.atan2(y2 - y1, x2 - x1);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = el.strokeWidth || 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }

    function drawRoundRect(el) {
        const r = Math.min(el.w, el.h) * 0.15;
        ctx.beginPath();
        ctx.moveTo(el.x + r, el.y);
        ctx.lineTo(el.x + el.w - r, el.y);
        ctx.arcTo(el.x + el.w, el.y, el.x + el.w, el.y + r, r);
        ctx.lineTo(el.x + el.w, el.y + el.h - r);
        ctx.arcTo(el.x + el.w, el.y + el.h, el.x + el.w - r, el.y + el.h, r);
        ctx.lineTo(el.x + r, el.y + el.h);
        ctx.arcTo(el.x, el.y + el.h, el.x, el.y + el.h - r, r);
        ctx.lineTo(el.x, el.y + r);
        ctx.arcTo(el.x, el.y, el.x + r, el.y, r);
        ctx.closePath();
        fillOrStroke(el);
    }

    // ── WAVE SHAPES ──

    function drawSine(el) {
        drawWave(el, (t) => Math.sin(t * Math.PI * 2));
    }

    function drawSquareWave(el) {
        drawWave(el, (t) => Math.sin(t * Math.PI * 2) >= 0 ? 1 : -1);
    }

    function drawSawtooth(el) {
        drawWave(el, (t) => 2 * (t - Math.floor(t + 0.5)));
    }

    function drawTriangleWave(el) {
        drawWave(el, (t) => 2 * Math.abs(2 * (t - Math.floor(t + 0.5))) - 1);
    }

    function drawStep(el) {
        const steps = el.steps || 5;
        drawWave(el, (t) => {
            const mod = t % 1;
            const v = Math.floor(mod * steps) / (steps - 1);
            return v * 2 - 1;
        });
    }

    function drawPulse(el) {
        const duty = el.duty || 0.2;
        drawWave(el, (t) => {
            const mod = t % 1;
            return mod < duty ? 1 : -1;
        });
    }

    function drawWave(el, fn) {
        const { x, y, w, h } = el;
        const midY = y + h / 2;
        const amp = h / 2;
        const freq = el.wavelength || Math.max(1, Math.round(w / 100));
        const isOpen = el.waveMode === 'open';

        ctx.beginPath();
        if (isOpen) {
            // open path: start at the left edge of the wave
            const firstY = midY - amp * fn(0);
            ctx.moveTo(x, firstY);
        } else {
            // filled shape: start at bottom-left
            ctx.moveTo(x, y + h);
        }
        const steps = Math.max(64, Math.round(w));
        for (let i = 0; i <= steps; i++) {
            const t = (i / steps) * freq;
            const sx = x + (i / steps) * w;
            const sy = midY - amp * fn(t);
            ctx.lineTo(sx, sy);
        }
        if (!isOpen) {
            ctx.lineTo(x + w, y + h);
            ctx.closePath();
        }
        fillOrStroke(el);
    }

    function drawClipartEl(el) {
        const color = el.stroke && el.stroke !== 'none' ? el.stroke : (el.fill || '#ffffff');
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = el.strokeWidth || 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ClipartLibrary.drawClipart(ctx, el.clipartId, el.x, el.y, el.w, el.h);
    }

    function fillOrStroke(el) {
        if (el.fill && el.fill !== 'none') {
            ctx.fillStyle = el.fill;
            ctx.fill();
        }
        if (el.stroke && el.stroke !== 'none' && el.strokeWidth > 0) {
            ctx.strokeStyle = el.stroke;
            ctx.lineWidth = el.strokeWidth;
            ctx.stroke();
        }
    }

    function drawSelection(el) {
        ctx.save();
        ctx.strokeStyle = '#a0a0b0';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);

        const bounds = getElementBounds(el);
        const pad = 6;
        ctx.strokeRect(
            bounds.x - pad,
            bounds.y - pad,
            bounds.w + pad * 2,
            bounds.h + pad * 2
        );

        // corner handles
        ctx.setLineDash([]);
        ctx.fillStyle = '#a0a0b0';
        const hs = 8;
        const corners = [
            [bounds.x - pad, bounds.y - pad],
            [bounds.x + bounds.w + pad, bounds.y - pad],
            [bounds.x - pad, bounds.y + bounds.h + pad],
            [bounds.x + bounds.w + pad, bounds.y + bounds.h + pad],
        ];
        for (const [cx, cy] of corners) {
            ctx.fillRect(cx - hs / 2, cy - hs / 2, hs, hs);
        }

        // rotation handle
        const rotX = bounds.x + bounds.w / 2;
        const rotLineY = bounds.y - pad;
        const rotCircleY = rotLineY - 24;
        ctx.setLineDash([]);
        ctx.strokeStyle = '#a0a0b0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rotX, rotLineY);
        ctx.lineTo(rotX, rotCircleY);
        ctx.stroke();
        ctx.fillStyle = '#a0a0b0';
        ctx.beginPath();
        ctx.arc(rotX, rotCircleY, 7, 0, Math.PI * 2);
        ctx.fill();

        // dimensions label
        ctx.setLineDash([]);
        ctx.font = '14px "Courier Prime"';
        ctx.fillStyle = '#a0a0b0';
        ctx.textAlign = 'center';
        let label;
        if (el.type === 'line') {
            const len = Math.round(Math.sqrt(bounds.w ** 2 + bounds.h ** 2));
            label = `${len} px`;
        } else {
            label = `${Math.round(bounds.w)} × ${Math.round(bounds.h)}`;
        }
        const labelY = bounds.y + bounds.h + pad + 16;
        ctx.fillText(label, bounds.x + bounds.w / 2, labelY);

        ctx.restore();
    }

    function getElementBounds(el) {
        switch (el.type) {
            case 'rect':
            case 'circle':
            case 'text': {
                let w = el.w;
                let h = el.h;
                // for text, compute bounds from content if w/h not set
                if (el.type === 'text' && el.text) {
                    const fontSize = el.fontSize || 48;
                    const font = el.font || 'Press Start 2P';
                    ctx.font = `${fontSize}px "${font}"`;
                    const lines = el.text.split('\n');
                    const lineHeight = fontSize * 1.3;
                    let maxW = 0;
                    for (const line of lines) {
                        const m = ctx.measureText(line);
                        if (m.width > maxW) maxW = m.width;
                    }
                    w = maxW || 10;
                    h = lines.length * lineHeight || lineHeight;
                }
                // handle negative dimensions (dragged up/left)
                const x = w < 0 ? el.x + w : el.x;
                const y = h < 0 ? el.y + h : el.y;
                return { x, y, w: Math.abs(w), h: Math.abs(h) };
            }
            case 'line': {
                const x = el.w < 0 ? el.x + el.w : el.x;
                const y = el.h < 0 ? el.y + el.h : el.y;
                return { x, y, w: Math.abs(el.w), h: Math.abs(el.h) };
            }
            default:
                return { x: el.x, y: el.y, w: el.w || 0, h: el.h || 0 };
        }
    }

    function exportPNG(elements, filename) {
        // check for unloaded images
        const hasUnloadedImages = elements.some(el => {
            if (el.type !== 'image') return false;
            const img = imageCache[el.id];
            return img && !img.complete;
        });
        if (hasUnloadedImages) {
            alert('Some images are still loading. Please wait a moment and try again.');
            return;
        }

        // render to offscreen canvas without selection
        const prevSelected = selectedId;
        selectedId = null;

        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = canvasSize;
        tmpCanvas.height = canvasSize;
        const tmpCtx = tmpCanvas.getContext('2d');

        // draw bg
        tmpCtx.fillStyle = bgColor;
        tmpCtx.fillRect(0, 0, canvasSize, canvasSize);

        // draw elements
        for (const el of elements) {
            drawElementTo(tmpCtx, el);
        }

        // download
        const link = document.createElement('a');
        link.download = `${filename || 'album-art'}.png`;
        link.href = tmpCanvas.toDataURL('image/png');
        link.click();

        // restore display
        selectedId = prevSelected;
        render(elements);
    }

    function drawElementTo(targetCtx, el) {
        // Swap the module-level ctx so drawElement (and everything it calls)
        // draws onto targetCtx instead of the live canvas.
        const savedCtx = ctx;
        ctx = targetCtx;
        try {
            drawElement(el);
        } finally {
            ctx = savedCtx;
        }
    }

    function getCanvas() { return canvas; }
    function getCtx() { return ctx; }

    return {
        init, setCanvasSize, getCanvasSize, setBgColor, getBgColor,
        setSelectedId, getSelectedId, render, getElementBounds, exportPNG,
        getCanvas, getCtx
    };
})();
