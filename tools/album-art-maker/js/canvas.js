/* ── canvas.js — rendering engine, element drawing, export ── */
window.CanvasRenderer = (function () {
    let canvas, ctx;
    let canvasSize = 1024;
    let bgColor = '#ffffff';
    let selectedId = null;

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

    function drawElement(el) {
        ctx.save();

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
        }

        ctx.restore();
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
        // render at full resolution without selection
        const prevSelected = selectedId;
        selectedId = null;
        render(elements);
        selectedId = prevSelected;

        // re-render without selection
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = canvasSize;
        tmpCanvas.height = canvasSize;
        const tmpCtx = tmpCanvas.getContext('2d');

        // draw bg
        tmpCtx.fillStyle = bgColor;
        tmpCtx.fillRect(0, 0, canvasSize, canvasSize);

        // draw elements
        for (const el of elements) {
            drawElementTo(tmpCtx, el, canvasSize);
        }

        // download
        const link = document.createElement('a');
        link.download = `${filename || 'album-art'}.png`;
        link.href = tmpCanvas.toDataURL('image/png');
        link.click();

        // restore display
        render(elements);
    }

    function drawElementTo(targetCtx, el, size) {
        targetCtx.save();

        switch (el.type) {
            case 'rect':
                if (el.fill && el.fill !== 'none') {
                    targetCtx.fillStyle = el.fill;
                    targetCtx.fillRect(el.x, el.y, el.w, el.h);
                }
                if (el.stroke && el.stroke !== 'none' && el.strokeWidth > 0) {
                    targetCtx.strokeStyle = el.stroke;
                    targetCtx.lineWidth = el.strokeWidth;
                    targetCtx.strokeRect(el.x, el.y, el.w, el.h);
                }
                break;

            case 'circle': {
                const cx = el.x + el.w / 2;
                const cy = el.y + el.h / 2;
                targetCtx.beginPath();
                targetCtx.ellipse(cx, cy, Math.abs(el.w / 2), Math.abs(el.h / 2), 0, 0, Math.PI * 2);
                if (el.fill && el.fill !== 'none') {
                    targetCtx.fillStyle = el.fill;
                    targetCtx.fill();
                }
                if (el.stroke && el.stroke !== 'none' && el.strokeWidth > 0) {
                    targetCtx.strokeStyle = el.stroke;
                    targetCtx.lineWidth = el.strokeWidth;
                    targetCtx.stroke();
                }
                break;
            }

            case 'line':
                if (el.stroke && el.stroke !== 'none') {
                    targetCtx.strokeStyle = el.stroke;
                    targetCtx.lineWidth = el.strokeWidth || 4;
                    targetCtx.lineCap = 'round';
                    targetCtx.beginPath();
                    targetCtx.moveTo(el.x, el.y);
                    targetCtx.lineTo(el.x + el.w, el.y + el.h);
                    targetCtx.stroke();
                }
                break;

            case 'text': {
                if (!el.text) break;
                const fontSize = el.fontSize || 48;
                const font = el.font || 'Press Start 2P';
                targetCtx.font = `${fontSize}px "${font}"`;
                targetCtx.textBaseline = 'top';
                const lines = el.text.split('\n');
                const lineHeight = fontSize * 1.3;
                for (let i = 0; i < lines.length; i++) {
                    const ly = el.y + i * lineHeight;
                    if (el.fill && el.fill !== 'none') {
                        targetCtx.fillStyle = el.fill;
                        targetCtx.fillText(lines[i], el.x, ly);
                    }
                    if (el.stroke && el.stroke !== 'none' && el.strokeWidth > 0) {
                        targetCtx.strokeStyle = el.stroke;
                        targetCtx.lineWidth = el.strokeWidth;
                        targetCtx.lineJoin = 'round';
                        targetCtx.strokeText(lines[i], el.x, ly);
                    }
                }
                break;
            }
        }

        targetCtx.restore();
    }

    function getCanvas() { return canvas; }
    function getCtx() { return ctx; }

    return {
        init, setCanvasSize, getCanvasSize, setBgColor, getBgColor,
        setSelectedId, getSelectedId, render, getElementBounds, exportPNG,
        getCanvas, getCtx
    };
})();
