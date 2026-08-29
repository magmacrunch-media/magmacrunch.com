/* ── tools.js — shape tools, text tool, hit testing, drag/move/resize ── */
window.Tools = (function () {
    let activeTool = 'select';
    let isDragging = false;
    let dragPending = false;
    let didMove = false;
    let isDrawing = false;
    let isResizing = false;
    let isRotating = false;
    let dragStart = null;
    let drawStart = null;
    let resizeStart = null;
    let rotateStart = null;
    let tempElement = null;
    let idCounter = 0;
    let onElementCreated = null;
    let onElementMoved = null;
    let onTextEdit = null;
    let onToolChange = null;

    const HANDLE_SIZE = 8;
    const WAVE_TYPES = ['sine', 'squarewave', 'sawtooth', 'trianglewave', 'step', 'pulse'];
    let clipartId = null;

    function setClipartId(id) { clipartId = id; }
    function getClipartId() { return clipartId; }

    function init(callbacks) {
        onElementCreated = callbacks.onElementCreated;
        onElementMoved = callbacks.onElementMoved;
        onTextEdit = callbacks.onTextEdit;
        onToolChange = callbacks.onToolChange || null;
    }

    let currentToolClass = '';

    function setTool(tool) {
        if (currentToolClass) document.body.classList.remove(currentToolClass);
        activeTool = tool;
        currentToolClass = 'tool-' + tool;
        document.body.classList.add(currentToolClass);
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
                // check if clicking a resize handle on the already-selected element
                const currentSel = CanvasRenderer.getSelectedId
                    ? elements.find(e => e.id === CanvasRenderer.getSelectedId())
                    : null;
                if (currentSel && currentSel.id === hit.id) {
                    const handle = hitTestHandle(pos.x, pos.y, hit);
                    if (handle) {
                        if (handle.id === 'rotate') {
                            isRotating = true;
                            const bounds = CanvasRenderer.getElementBounds(hit);
                            rotateStart = {
                                x: pos.x, y: pos.y,
                                element: hit,
                                origRotation: hit.rotation || 0,
                                centerX: bounds.x + bounds.w / 2,
                                centerY: bounds.y + bounds.h / 2,
                            };
                            document.body.classList.add('dragging');
                            return;
                        }
                        isResizing = true;
                        const bounds = CanvasRenderer.getElementBounds(hit);
                        resizeStart = {
                            x: pos.x, y: pos.y,
                            element: hit,
                            origBounds: { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h },
                            handle: handle.id,
                            origFontSize: hit.fontSize || 48,
                        };
                        document.body.classList.add('dragging');
                        return;
                    }
                }

                isDragging = true;
                dragPending = true;
                didMove = false;
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
            // only intercept clicks on existing text elements (to edit them);
            // clicking on images/shapes or empty canvas places new text
            const hit = hitTest(pos.x, pos.y, elements);
            if (hit && hit.type === 'text') {
                if (onToolChange) onToolChange('select');
                isDragging = true;
                dragPending = true;
                didMove = false;
                dragStart = { x: pos.x, y: pos.y, element: hit, origX: hit.x, origY: hit.y };
                document.body.classList.add('dragging');
                CanvasRenderer.setSelectedId(hit.id);
                CanvasRenderer.render(elements);
                if (onElementMoved) onElementMoved('select', hit);
                return;
            }
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

        const isWaveType = WAVE_TYPES.includes(activeTool);
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
            rotation: 0,
            opacity: 100,
            wavelength: 5,
            waveMode: noFill ? 'open' : 'filled',
            steps: 5,
            duty: 0.2,
            clipartId: activeTool === 'clipart' ? clipartId : undefined,
        };
    }

    function onMouseMove(e, elements) {
        const pos = getCanvasCoords(e);

        if (isDragging && dragStart) {
            if (dragPending) {
                const dx = pos.x - dragStart.x;
                const dy = pos.y - dragStart.y;
                if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
                dragPending = false;
                didMove = true;
            }
            const dx = pos.x - dragStart.x;
            const dy = pos.y - dragStart.y;
            dragStart.element.x = dragStart.origX + dx;
            dragStart.element.y = dragStart.origY + dy;
            CanvasRenderer.render(elements);
            return;
        }

        if (isResizing && resizeStart) {
            didMove = true;
            const dx = pos.x - resizeStart.x;
            const dy = pos.y - resizeStart.y;
            const el = resizeStart.element;
            const ob = resizeStart.origBounds;
            const h = resizeStart.handle;

            if (el.type === 'line') {
                if (h === 'tl') {
                    el.x = ob.x + dx;
                    el.y = ob.y + dy;
                    el.w = (ob.x + ob.w) - el.x;
                    el.h = (ob.y + ob.h) - el.y;
                } else {
                    el.w = ob.w + dx;
                    el.h = ob.h + dy;
                }
            } else if (el.type === 'text') {
                // scale fontSize proportionally based on diagonal drag
                const origDiag = Math.sqrt(ob.w * ob.w + ob.h * ob.h);
                if (origDiag > 0) {
                    let newW, newH;
                    if (h === 'br') {
                        newW = ob.w + dx;
                        newH = ob.h + dy;
                    } else if (h === 'tl') {
                        newW = ob.w - dx;
                        newH = ob.h - dy;
                    } else if (h === 'tr') {
                        newW = ob.w + dx;
                        newH = ob.h - dy;
                    } else {
                        newW = ob.w - dx;
                        newH = ob.h + dy;
                    }
                    const newDiag = Math.sqrt(newW * newW + newH * newH);
                    const scale = newDiag / origDiag;
                    el.fontSize = Math.max(8, Math.round(resizeStart.origFontSize * scale));
                    // sync font size slider
                    document.getElementById('fontSize').value = el.fontSize;
                    document.getElementById('fontSizeVal').textContent = el.fontSize;
                }
            } else if (el.type === 'image' && el.aspectRatio) {
                // aspect-ratio-locked resize
                const ar = el.aspectRatio;
                let newW, newH;
                if (h === 'br') {
                    newW = Math.max(2, ob.w + dx);
                    newH = newW / ar;
                } else if (h === 'tl') {
                    newW = Math.max(2, ob.w - dx);
                    newH = newW / ar;
                    el.x = ob.x + ob.w - newW;
                    el.y = ob.y + ob.h - newH;
                } else if (h === 'tr') {
                    newW = Math.max(2, ob.w + dx);
                    newH = newW / ar;
                    el.y = ob.y + ob.h - newH;
                } else if (h === 'bl') {
                    newW = Math.max(2, ob.w - dx);
                    newH = newW / ar;
                    el.x = ob.x + ob.w - newW;
                }
                el.w = newW;
                el.h = newH;
            } else {
                switch (h) {
                    case 'br':
                        el.w = Math.max(2, ob.w + dx);
                        el.h = Math.max(2, ob.h + dy);
                        break;
                    case 'bl':
                        el.x = ob.x + dx;
                        el.w = Math.max(2, ob.w - dx);
                        el.h = Math.max(2, ob.h + dy);
                        break;
                    case 'tr':
                        el.y = ob.y + dy;
                        el.w = Math.max(2, ob.w + dx);
                        el.h = Math.max(2, ob.h - dy);
                        break;
                    case 'tl':
                        el.x = ob.x + dx;
                        el.y = ob.y + dy;
                        el.w = Math.max(2, ob.w - dx);
                        el.h = Math.max(2, ob.h - dy);
                        break;
                }
            }

            CanvasRenderer.render(elements);
            return;
        }

        if (isRotating && rotateStart) {
            didMove = true;
            const angle = Math.atan2(
                pos.y - rotateStart.centerY,
                pos.x - rotateStart.centerX
            ) * 180 / Math.PI + 90;
            rotateStart.element.rotation = rotateStart.origRotation + angle;
            CanvasRenderer.render(elements);
            return;
        }

        // hover cursor for handles (select tool, not dragging)
        if (activeTool === 'select' && !isDragging && !isResizing && !isRotating) {
            const canvas = CanvasRenderer.getCanvas();
            const selId = CanvasRenderer.getSelectedId();
            const selected = selId !== null ? elements.find(e => e.id === selId) : null;
            if (selected) {
                const handle = hitTestHandle(pos.x, pos.y, selected);
                if (handle) {
                    canvas.style.cursor = handle.cursor;
                    return;
                }
            }
            const hit = hitTest(pos.x, pos.y, elements);
            canvas.style.cursor = hit ? 'move' : 'default';
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
            if (didMove && onElementMoved) onElementMoved('move', null);
            didMove = false;
            return;
        }

        if (isResizing) {
            isResizing = false;
            resizeStart = null;
            document.body.classList.remove('dragging');
            if (didMove && onElementMoved) onElementMoved('move', null);
            didMove = false;
            return;
        }

        if (isRotating) {
            isRotating = false;
            rotateStart = null;
            document.body.classList.remove('dragging');
            if (didMove && onElementMoved) onElementMoved('move', null);
            didMove = false;
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
            const pad = 6;
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

    function getHandlePositions(el) {
        const bounds = CanvasRenderer.getElementBounds(el);
        const { x, y, w, h } = bounds;
        const pad = 6;
        return [
            { id: 'tl', x: x - pad,     y: y - pad,     cursor: 'nw-resize' },
            { id: 'tr', x: x + w + pad, y: y - pad,     cursor: 'ne-resize' },
            { id: 'bl', x: x - pad,     y: y + h + pad, cursor: 'sw-resize' },
            { id: 'br', x: x + w + pad, y: y + h + pad, cursor: 'se-resize' },
        ];
    }

    function getRotationHandlePos(el) {
        const bounds = CanvasRenderer.getElementBounds(el);
        const pad = 6;
        return {
            x: bounds.x + bounds.w / 2,
            y: bounds.y - pad - 24,
        };
    }

    function hitTestHandle(x, y, el) {
        if (!el) return null;

        // check rotation handle first
        const rot = getRotationHandlePos(el);
        const rotDist = Math.sqrt((x - rot.x) ** 2 + (y - rot.y) ** 2);
        if (rotDist <= 12) {
            return { id: 'rotate', x: rot.x, y: rot.y, cursor: 'grab' };
        }

        const handles = getHandlePositions(el);
        const hs = 12;
        for (const handle of handles) {
            if (
                x >= handle.x - hs &&
                x <= handle.x + hs &&
                y >= handle.y - hs &&
                y <= handle.y + hs
            ) {
                return handle;
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
            rotation: 0,
            opacity: 100,
        };
        return el;
    }

    function getActiveTool() { return activeTool; }

    return {
        init, setTool, getTool, getCanvasCoords,
        onMouseDown, onMouseMove, onMouseUp,
        hitTest, createTextElement, getActiveTool, nextId,
        setClipartId, getClipartId,
    };
})();
