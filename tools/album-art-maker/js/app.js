/* ── app.js — main entry point, state, event wiring ── */
(function () {
    let elements = [];
    let selectedElement = null;

    const canvas = document.getElementById('mainCanvas');

    // ── TEXT MODAL ──
    const textModal = document.getElementById('textModal');
    const modalTextInput = document.getElementById('modalTextInput');
    const modalFontSelect = document.getElementById('modalFontSelect');
    const modalFontSize = document.getElementById('modalFontSize');
    const modalFontSizeVal = document.getElementById('modalFontSizeVal');
    let modalTarget = null; // { x, y } or { editId } for editing existing

    function openTextModal(x, y, existingElement) {
        modalTarget = existingElement
            ? { editId: existingElement.id }
            : { x, y };

        modalTextInput.value = existingElement ? existingElement.text : '';
        modalFontSelect.value = existingElement
            ? existingElement.font
            : (document.getElementById('fontSelect').value || 'Press Start 2P');
        modalFontSize.value = existingElement
            ? existingElement.fontSize
            : (parseInt(document.getElementById('fontSize').value) || 48);
        modalFontSizeVal.textContent = modalFontSize.value;

        textModal.hidden = false;
        modalTextInput.focus();
    }

    function closeTextModal() {
        textModal.hidden = true;
        modalTextInput.value = '';
        modalTarget = null;
    }

    function commitTextModal() {
        const text = modalTextInput.value.trim();
        if (!text) { closeTextModal(); return; }

        if (modalTarget && modalTarget.editId !== undefined) {
            const el = elements.find(e => e.id === modalTarget.editId);
            if (el) {
                el.text = text;
                el.font = modalFontSelect.value;
                el.fontSize = parseInt(modalFontSize.value) || 48;
            }
        } else if (modalTarget) {
            const el = Tools.createTextElement(
                modalTarget.x, modalTarget.y, text,
                modalFontSelect.value,
                parseInt(modalFontSize.value) || 48
            );
            elements.push(el);
        }

        History.push(elements);
        CanvasRenderer.render(elements);
        closeTextModal();
    }

    document.getElementById('modalAdd').addEventListener('click', commitTextModal);
    document.getElementById('modalCancel').addEventListener('click', closeTextModal);
    modalTextInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            commitTextModal();
        }
        if (e.key === 'Escape') closeTextModal();
    });
    textModal.addEventListener('click', (e) => {
        if (e.target === textModal) closeTextModal();
    });
    modalFontSize.addEventListener('input', () => {
        modalFontSizeVal.textContent = modalFontSize.value;
    });

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

    // ── LIVE STATS ──
    const canvasSizeStat = document.getElementById('canvasSizeStat');
    const elementCountStat = document.getElementById('elementCountStat');

    function updateStats() {
        const size = CanvasRenderer.getCanvasSize();
        canvasSizeStat.textContent = size + '×' + size;
        elementCountStat.textContent = elements.length + ' ELEMENT' + (elements.length !== 1 ? 'S' : '');
    }
    updateStats();

    // ── TOOL BUTTONS ──
    function setActiveTool(tool) {
        document.querySelectorAll('.tool-btn, .shape-btn').forEach(b => b.classList.remove('active'));
        const btn = document.querySelector(`[data-tool="${tool}"]`);
        if (btn) btn.classList.add('active');
        Tools.setTool(tool);

        // update shapes button label
        const shapeTools = ['rect', 'circle', 'line'];
        const shapesBtnLabel = document.getElementById('shapesBtnLabel');
        if (shapeTools.includes(tool) && shapesBtnLabel) {
            shapesBtnLabel.textContent = tool.toUpperCase();
        }
    }

    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.tool) setActiveTool(btn.dataset.tool);
        });
    });

    // ── SHAPES POPUP ──
    const shapesBtn = document.getElementById('shapesBtn');
    const shapesPopup = document.getElementById('shapesPopup');

    shapesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = shapesPopup.classList.toggle('open');
        if (isOpen) {
            const rect = shapesBtn.getBoundingClientRect();
            shapesPopup.style.top = rect.top + 'px';
            shapesPopup.style.left = (rect.right + 6) + 'px';
        }
    });

    document.querySelectorAll('.shape-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setActiveTool(btn.dataset.tool);
            shapesPopup.classList.remove('open');
        });
    });

    document.addEventListener('click', (e) => {
        if (!shapesPopup.contains(e.target) && e.target !== shapesBtn) {
            shapesPopup.classList.remove('open');
        }
    });

    // ── IMAGE UPLOAD ──
    const imageBtn = document.getElementById('imageBtn');
    const imageFileInput = document.getElementById('imageFileInput');

    imageBtn.addEventListener('click', () => imageFileInput.click());

    imageFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const src = ev.target.result;
            const img = new Image();
            img.onload = () => {
                // scale to ~40% of canvas, maintaining aspect ratio
                const size = CanvasRenderer.getCanvasSize();
                const maxDim = size * 0.4;
                let w = img.naturalWidth;
                let h = img.naturalHeight;
                if (w > h) {
                    h = (h / w) * maxDim;
                    w = maxDim;
                } else {
                    w = (w / h) * maxDim;
                    h = maxDim;
                }

                const el = {
                    id: Tools.nextId(),
                    type: 'image',
                    x: (size - w) / 2,
                    y: (size - h) / 2,
                    w: w,
                    h: h,
                    src: src,
                    aspectRatio: w / h,
                    rotation: 0,
                };
                elements.push(el);
                History.push(elements);
                CanvasRenderer.render(elements);
                updateStats();
            };
            img.src = src;
        };
        reader.readAsDataURL(file);
        imageFileInput.value = '';
    });

    // ── CANVAS MOUSE EVENTS ──
    canvas.addEventListener('mousedown', (e) => {
        if (!textModal.hidden) return;
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
            openTextModal(hit.x, hit.y, hit);
        }
    });

    // ── TEXT TOOL CLICK ──
    function handleTextEdit(x, y) {
        openTextModal(x, y, null);
    }

    // ── ELEMENT CALLBACKS ──
    function handleElementCreated(el) {
        elements.push(el);
        History.push(elements);
        CanvasRenderer.render(elements);
        updateStats();
    }

    function handleElementMoved(action, element) {
        if (action === 'select') {
            selectedElement = element;
            updatePropsFromElement(element);
        } else if (action === 'deselect') {
            selectedElement = null;
        } else if (action === 'move') {
            History.push(elements);
            updateStats();
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
        updateStats();
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
            updateStats();
        }
    });

    document.getElementById('redoBtn').addEventListener('click', () => {
        const state = History.redo();
        if (state) {
            elements = state;
            selectedElement = null;
            CanvasRenderer.setSelectedId(null);
            CanvasRenderer.render(elements);
            updateStats();
        }
    });

    document.getElementById('deleteBtn').addEventListener('click', () => {
        if (selectedElement) {
            elements = elements.filter(e => e.id !== selectedElement.id);
            selectedElement = null;
            CanvasRenderer.setSelectedId(null);
            History.push(elements);
            CanvasRenderer.render(elements);
            updateStats();
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
        updateStats();
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
        const filename = document.getElementById('fileName').value.trim() || 'album-art';
        CanvasRenderer.exportPNG(elements, filename);
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
                    updateStats();
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
                    updateStats();
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
                updateStats();
            }
            return;
        }

        // Tool shortcuts
        const shortcuts = { v: 'select', r: 'rect', c: 'circle', l: 'line', t: 'text' };
        if (shortcuts[e.key]) {
            setActiveTool(shortcuts[e.key]);
        }
        if (e.key === 'i') {
            imageFileInput.click();
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
