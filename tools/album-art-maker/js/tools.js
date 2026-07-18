/* ── tools.js — shape tools, text tool, hit testing, drag/move ── */
window.Tools = (function () {
    let activeTool = 'select';
    let isDragging = false;
    let isDrawing = false;
    let dragStart = null;
    let drawStart = null;
    let tempElement = null;
    let idCounter = 0;
    let onElementCreated = null;
    let onElementMoved = null;
    let onTextEdit = null;

    function init(callbacks) {
        onElementCreated = callbacks.onElementCreated;
        onElementMoved = callbacks.onElementMoved;
        onTextEdit = callbacks.onTextEdit;
    }

    function setTool(tool) {
        activeTool = tool;
        document.body.className = 'tool-' + tool;
    }

    function getTool() { return activeTool; }

    function nextId() { return ++idCounter; }

    function getCanvasCoords(e) {
        const canvas = CanvasRenderer.getCanvas();
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    function onMouseDown(e, elements) {
        const pos = getCanvasCoords(e);

        if (activeTool === 'select') {
            // hit test — check from top (last drawn) to bottom
            const hit = hitTest(pos.x, pos.y, elements);
            if (hit) {
                isDragging = true;
                dragStart = { x: pos.x, y: pos.y, element: hit, origX: hit.x, origY: hit.y };
                document.body.classList.add('dragging');
                CanvasRenderer.setSelectedId(hit.id);
                CanvasRenderer.render(elements);
                // notify app about selection
                if (onElementMoved) onElementMoved('select', hit);
            } else {
                isDragging = false;
                CanvasRenderer.setSelectedId(null);
                CanvasRenderer.render(elements);
                if (onElementMoved) onElementMoved('deselect', null);
            }
            return;
        }

        if (activeTool === 'text') {
            // place text at click position
            if (onTextEdit) onTextEdit(pos.x, pos.y);
            return;
        }

        // shape tools: start drawing
        isDrawing = true;
        drawStart = pos;

        const fill = document.getElementById('fillColor').value;
        const stroke = document.getElementById('strokeColor').value;
        const strokeWidth = parseInt(document.getElementById('strokeWidth').value);
        const noFill = document.getElementById('noFillBtn').classList.contains('active');
        const noStroke = document.getElementById('noStrokeBtn').classList.contains('active');

        tempElement = {
            id: nextId(),
            type: activeTool,
            x: pos.x,
            y: pos.y,
            w: 0,
            h: 0,
            fill: noFill ? 'none' : fill,
            stroke: noStroke ? 'none' : stroke,
            strokeWidth: strokeWidth,
        };
    }

    function onMouseMove(e, elements) {
        const pos = getCanvasCoords(e);

        if (isDragging && dragStart) {
            const dx = pos.x - dragStart.x;
            const dy = pos.y - dragStart.y;
            dragStart.element.x = dragStart.origX + dx;
            dragStart.element.y = dragStart.origY + dy;
            CanvasRenderer.render(elements);
            return;
        }

        if (isDrawing && tempElement) {
            tempElement.w = pos.x - drawStart.x;
            tempElement.h = pos.y - drawStart.y;

            // render with temp element
            CanvasRenderer.render([...elements, tempElement]);
            return;
        }
    }

    function onMouseUp(e, elements) {
        if (isDragging) {
            isDragging = false;
            dragStart = null;
            document.body.classList.remove('dragging');
            if (onElementMoved) onElementMoved('move', null);
            return;
        }

        if (isDrawing && tempElement) {
            isDrawing = false;

            // only add if it has some size
            const minSize = 3;
            if (Math.abs(tempElement.w) > minSize || Math.abs(tempElement.h) > minSize) {
                // normalize negative dimensions for rect/circle
                if (tempElement.type !== 'line') {
                    if (tempElement.w < 0) {
                        tempElement.x += tempElement.w;
                        tempElement.w = Math.abs(tempElement.w);
                    }
                    if (tempElement.h < 0) {
                        tempElement.y += tempElement.h;
                        tempElement.h = Math.abs(tempElement.h);
                    }
                }
                onElementCreated(tempElement);
            }

            tempElement = null;
            drawStart = null;
        }
    }

    function hitTest(x, y, elements) {
        for (let i = elements.length - 1; i >= 0; i--) {
            const el = elements[i];
            const bounds = CanvasRenderer.getElementBounds(el);

            // add some padding for easier selection
            const pad = 4;
            if (
                x >= bounds.x - pad &&
                x <= bounds.x + bounds.w + pad &&
                y >= bounds.y - pad &&
                y <= bounds.y + bounds.h + pad
            ) {
                return el;
            }
        }
        return null;
    }

    function createTextElement(x, y, text, font, fontSize) {
        const fill = document.getElementById('fillColor').value;
        const stroke = document.getElementById('strokeColor').value;
        const strokeWidth = parseInt(document.getElementById('strokeWidth').value);
        const noFill = document.getElementById('noFillBtn').classList.contains('active');
        const noStroke = document.getElementById('noStrokeBtn').classList.contains('active');

        const el = {
            id: nextId(),
            type: 'text',
            x: x,
            y: y,
            w: 0,
            h: 0,
            fill: noFill ? 'none' : fill,
            stroke: noStroke ? 'none' : stroke,
            strokeWidth: strokeWidth,
            text: text,
            font: font || 'Press Start 2P',
            fontSize: fontSize || 48,
        };
        return el;
    }

    function updateTextElement(el, text) {
        el.text = text;
    }

    function getActiveTool() { return activeTool; }

    return {
        init, setTool, getTool, getCanvasCoords,
        onMouseDown, onMouseMove, onMouseUp,
        hitTest, createTextElement, updateTextElement, getActiveTool, nextId
    };
})();
