/* ── app.js — main entry point, state, event wiring ── */
(function () {
    let elements = [];
    let selectedElement = null;
    let textInputActive = false;

    const canvas = document.getElementById('mainCanvas');
    const textInput = document.getElementById('textInput');

    // ── INIT ──
    CanvasRenderer.init(canvas);

    Tools.init({
        onElementCreated: handleElementCreated,
        onElementMoved: handleElementMoved,
        onTextEdit: handleTextEdit,
    });

    ColorManager.init(handleColorSample);

    // save initial state
    History.push(elements);

    // ── TOOL BUTTONS ──
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            Tools.setTool(btn.dataset.tool);
        });
    });

    // ── CANVAS MOUSE EVENTS ──
    canvas.addEventListener('mousedown', (e) => {
        if (textInputActive) return;
        Tools.onMouseDown(e, elements);
    });

    canvas.addEventListener('mousemove', (e) => {
        Tools.onMouseMove(e, elements);
    });

    canvas.addEventListener('mouseup', (e) => {
        Tools.onMouseUp(e, elements);
    });

    canvas.addEventListener('mouseleave', (e) => {
        if (Tools.getTool() !== 'select') {
            Tools.onMouseUp(e, elements);
        }
    });

    // ── DOUBLE CLICK TO EDIT TEXT ──
    canvas.addEventListener('dblclick', (e) => {
        const pos = Tools.getCanvasCoords(e);
        const hit = Tools.hitTest(pos.x, pos.y, elements);
        if (hit && hit.type === 'text') {
            openTextInput(hit.x, hit.y, hit);
        }
    });

    // ── TEXT INPUT OVERLAY ──
    function handleTextEdit(x, y) {
        openTextInput(x, y, null);
    }

    function openTextInput(x, y, existingElement) {
        textInputActive = true;
        textInput.hidden = false;

        // position the textarea over the canvas at the click point
        const canvasRect = canvas.getBoundingClientRect();
        const wrapRect = canvas.parentElement.getBoundingClientRect();
        const scaleX = canvasRect.width / canvas.width;
        const scaleY = canvasRect.height / canvas.height;

        textInput.style.left = (canvasRect.left - wrapRect.left + x * scaleX) + 'px';
        textInput.style.top = (canvasRect.top - wrapRect.top + y * scaleY) + 'px';

        const fontSize = parseInt(document.getElementById('fontSize').value) || 48;
        const font = document.getElementById('fontSelect').value || 'Press Start 2P';
        textInput.style.fontFamily = `"${font}", monospace`;
        textInput.style.fontSize = (fontSize * scaleY) + 'px';
        textInput.style.color = document.getElementById('fillColor').value;
        textInput.value = existingElement ? existingElement.text : '';

        textInput.focus();

        // store context for when we commit
        textInput.dataset.canvasX = x;
        textInput.dataset.canvasY = y;
        textInput.dataset.existingId = existingElement ? existingElement.id : '';
    }

    textInput.addEventListener('blur', commitText);
    textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            textInput.hidden = true;
            textInputActive = false;
            textInput.value = '';
        }
        // Enter commits (Shift+Enter for newline)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            commitText();
        }
    });

    function commitText() {
        if (!textInputActive) return;
        const text = textInput.value.trim();
        const x = parseFloat(textInput.dataset.canvasX);
        const y = parseFloat(textInput.dataset.canvasY);
        const existingId = textInput.dataset.existingId;

        textInput.hidden = true;
        textInputActive = false;

        if (!text) {
            textInput.value = '';
            return;
        }

        if (existingId) {
            // update existing text element
            const el = elements.find(e => e.id === parseInt(existingId));
            if (el) {
                el.text = text;
                el.font = document.getElementById('fontSelect').value;
                el.fontSize = parseInt(document.getElementById('fontSize').value) || 48;
            }
        } else {
            // create new text element
            const el = Tools.createTextElement(
                x, y, text,
                document.getElementById('fontSelect').value,
                parseInt(document.getElementById('fontSize').value) || 48
            );
            elements.push(el);
        }

        History.push(elements);
        CanvasRenderer.render(elements);
        textInput.value = '';
    }

    // ── ELEMENT CALLBACKS ──
    function handleElementCreated(el) {
        elements.push(el);
        History.push(elements);
        CanvasRenderer.render(elements);
    }

    function handleElementMoved(action, element) {
        if (action === 'select') {
            selectedElement = element;
            updatePropsFromElement(element);
        } else if (action === 'deselect') {
            selectedElement = null;
        } else if (action === 'move') {
            History.push(elements);
        }
    }

    function updatePropsFromElement(el) {
        if (!el) return;
        if (el.fill && el.fill !== 'none') {
            document.getElementById('fillColor').value = el.fill;
            document.getElementById('fillHex').textContent = el.fill;
            document.getElementById('noFillBtn').classList.remove('active');
        }
        if (el.stroke && el.stroke !== 'none') {
            document.getElementById('strokeColor').value = el.stroke;
            document.getElementById('strokeHex').textContent = el.stroke;
            document.getElementById('noStrokeBtn').classList.remove('active');
        }
        if (el.strokeWidth) {
            document.getElementById('strokeWidth').value = el.strokeWidth;
            document.getElementById('strokeWidthVal').textContent = el.strokeWidth;
        }
        if (el.type === 'text') {
            if (el.font) document.getElementById('fontSelect').value = el.font;
            if (el.fontSize) {
                document.getElementById('fontSize').value = el.fontSize;
                document.getElementById('fontSizeVal').textContent = el.fontSize;
            }
        }
    }

    // ── COLOR CONTROLS ──
    function handleColorSample(color) {
        // apply sampled color to the active color input
        // if eyedropper was triggered from reference image click,
        // apply to fill by default
        document.getElementById('fillColor').value = color;
        document.getElementById('fillHex').textContent = color;
        document.getElementById('noFillBtn').classList.remove('active');

        // update selected element if any
        if (selectedElement) {
            selectedElement.fill = color;
            History.push(elements);
            CanvasRenderer.render(elements);
        }
    }

    document.getElementById('fillColor').addEventListener('input', (e) => {
        document.getElementById('fillHex').textContent = e.target.value;
        document.getElementById('noFillBtn').classList.remove('active');
        if (selectedElement) {
            selectedElement.fill = e.target.value;
            History.push(elements);
            CanvasRenderer.render(elements);
        }
    });

    document.getElementById('strokeColor').addEventListener('input', (e) => {
        document.getElementById('strokeHex').textContent = e.target.value;
        document.getElementById('noStrokeBtn').classList.remove('active');
        if (selectedElement) {
            selectedElement.stroke = e.target.value;
            History.push(elements);
            CanvasRenderer.render(elements);
        }
    });

    document.getElementById('noFillBtn').addEventListener('click', () => {
        const btn = document.getElementById('noFillBtn');
        btn.classList.toggle('active');
        if (selectedElement) {
            selectedElement.fill = btn.classList.contains('active') ? 'none' : document.getElementById('fillColor').value;
            History.push(elements);
            CanvasRenderer.render(elements);
        }
    });

    document.getElementById('noStrokeBtn').addEventListener('click', () => {
        const btn = document.getElementById('noStrokeBtn');
        btn.classList.toggle('active');
        if (selectedElement) {
            selectedElement.stroke = btn.classList.contains('active') ? 'none' : document.getElementById('strokeColor').value;
            History.push(elements);
            CanvasRenderer.render(elements);
        }
    });

    document.getElementById('strokeWidth').addEventListener('input', (e) => {
        document.getElementById('strokeWidthVal').textContent = e.target.value;
        if (selectedElement) {
            selectedElement.strokeWidth = parseInt(e.target.value);
            History.push(elements);
            CanvasRenderer.render(elements);
        }
    });

    // ── FONT CONTROLS ──
    document.getElementById('fontSize').addEventListener('input', (e) => {
        document.getElementById('fontSizeVal').textContent = e.target.value;
        if (selectedElement && selectedElement.type === 'text') {
            selectedElement.fontSize = parseInt(e.target.value);
            History.push(elements);
            CanvasRenderer.render(elements);
        }
    });

    document.getElementById('fontSelect').addEventListener('change', (e) => {
        if (selectedElement && selectedElement.type === 'text') {
            selectedElement.font = e.target.value;
            History.push(elements);
            CanvasRenderer.render(elements);
        }
    });

    // ── CANVAS SIZE ──
    document.getElementById('canvasSize').addEventListener('change', (e) => {
        const size = parseInt(e.target.value);
        CanvasRenderer.setCanvasSize(size);
        CanvasRenderer.render(elements);
    });

    // ── BG COLOR ──
    document.getElementById('bgColor').addEventListener('input', (e) => {
        document.getElementById('bgHex').textContent = e.target.value;
        CanvasRenderer.setBgColor(e.target.value);
        CanvasRenderer.render(elements);
    });

    // ── ACTION BUTTONS ──
    document.getElementById('undoBtn').addEventListener('click', () => {
        const state = History.undo();
        if (state) {
            elements = state;
            selectedElement = null;
            CanvasRenderer.setSelectedId(null);
            CanvasRenderer.render(elements);
        }
    });

    document.getElementById('redoBtn').addEventListener('click', () => {
        const state = History.redo();
        if (state) {
            elements = state;
            selectedElement = null;
            CanvasRenderer.setSelectedId(null);
            CanvasRenderer.render(elements);
        }
    });

    document.getElementById('deleteBtn').addEventListener('click', () => {
        if (selectedElement) {
            elements = elements.filter(e => e.id !== selectedElement.id);
            selectedElement = null;
            CanvasRenderer.setSelectedId(null);
            History.push(elements);
            CanvasRenderer.render(elements);
        }
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
        if (elements.length === 0) return;
        if (!confirm('Clear all elements?')) return;
        elements = [];
        selectedElement = null;
        CanvasRenderer.setSelectedId(null);
        History.push(elements);
        CanvasRenderer.render(elements);
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
        CanvasRenderer.exportPNG(elements);
    });

    // ── KEYBOARD SHORTCUTS ──
    document.addEventListener('keydown', (e) => {
        // skip if typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

        // Ctrl+Z / Ctrl+Shift+Z
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                const state = History.undo();
                if (state) {
                    elements = state;
                    selectedElement = null;
                    CanvasRenderer.setSelectedId(null);
                    CanvasRenderer.render(elements);
                }
                return;
            }
            if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
                e.preventDefault();
                const state = History.redo();
                if (state) {
                    elements = state;
                    selectedElement = null;
                    CanvasRenderer.setSelectedId(null);
                    CanvasRenderer.render(elements);
                }
                return;
            }
        }

        // Delete / Backspace
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedElement) {
                elements = elements.filter(el => el.id !== selectedElement.id);
                selectedElement = null;
                CanvasRenderer.setSelectedId(null);
                History.push(elements);
                CanvasRenderer.render(elements);
            }
            return;
        }

        // Tool shortcuts
        const shortcuts = { v: 'select', r: 'rect', c: 'circle', l: 'line', t: 'text' };
        if (shortcuts[e.key]) {
            const tool = shortcuts[e.key];
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
            Tools.setTool(tool);
        }
    });

    // ── SHOW/HIDE TEXT PROPS ──
    function updateTextPropsVisibility() {
        const isTextTool = Tools.getTool() === 'text';
        const isTextElement = selectedElement && selectedElement.type === 'text';
        document.getElementById('textProps').hidden = !(isTextTool || isTextElement);
        document.getElementById('fontSizeGroup').hidden = !(isTextTool || isTextElement);
    }

    // observe tool changes
    const origSetTool = Tools.setTool;
    Tools.setTool = function (tool) {
        origSetTool(tool);
        updateTextPropsVisibility();
    };

})();
