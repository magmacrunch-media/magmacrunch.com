/* ── app.js — main entry point, state, event wiring ── */
(function () {
    let elements = [];
    let selectedElement = null;

    const canvas = document.getElementById('mainCanvas');

    // ── RETRO DROPDOWN HELPER ──
    // Implementation is shared with media-search and pixel-process:
    // ware/shell/dropdown.js. getValue's default stays null here, which the
    // `|| 'Press Start 2P'` fallback at the font call site relies on.
    const getDropdownValue = (id) => RetroDropdown.getValue(id);
    const setDropdownValue = (id, value) => RetroDropdown.setValue(id, value);
    const setupRetroDropdown = (id, onSelect) => RetroDropdown.setup(id, onSelect);

    // ── SELECTED ELEMENT SYNC ──
    // After undo/redo, selectedElement may point to a detached object.
    // Re-sync by finding the element with matching id in the live array.
    function syncSelectedElement() {
        if (!selectedElement) return;
        const found = elements.find(el => el.id === selectedElement.id);
        if (found) {
            selectedElement = found;
        } else {
            selectedElement = null;
            CanvasRenderer.setSelectedId(null);
        }
    }

    // ── TEXT MODAL ──
    const textModal = document.getElementById('textModal');
    const modalTextInput = document.getElementById('modalTextInput');
    const modalFontSize = document.getElementById('modalFontSize');
    const modalFontSizeVal = document.getElementById('modalFontSizeVal');
    let modalTarget = null; // { x, y } or { editId } for editing existing

    function openTextModal(x, y, existingElement) {
        modalTarget = existingElement
            ? { editId: existingElement.id }
            : { x, y };

        modalTextInput.value = existingElement ? existingElement.text : '';
        setDropdownValue('modalFontSelectDropdown', existingElement
            ? existingElement.font
            : (getDropdownValue('fontSelectDropdown') || 'Press Start 2P'));
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
                el.font = getDropdownValue('modalFontSelectDropdown');
                el.fontSize = parseInt(modalFontSize.value) || 48;
            }
        } else if (modalTarget) {
            const el = Tools.createTextElement(
                modalTarget.x, modalTarget.y, text,
                getDropdownValue('modalFontSelectDropdown'),
                parseInt(modalFontSize.value) || 48
            );
            elements.push(el);
            selectedElement = el;
            CanvasRenderer.setSelectedId(el.id);
            updatePropsFromElement(el);
        }

        History.push(elements);
        CanvasRenderer.render(elements);
        closeTextModal();
        if (modalTarget && modalTarget.editId === undefined) {
            setActiveTool('select');
        }
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
        onToolChange: (tool) => setActiveTool(tool),
    });

    function handleColorPreview(color) {
        // update the fill picker/hex UI as a preview — don't apply to element
        document.getElementById('fillColor').value = color;
        document.getElementById('fillHex').value = color;
    }

    ColorManager.init(handleColorSample, handleColorPreview);

    // save initial state
    History.push(elements);

    // ── LIVE STATS ──
    let nudgeTimer = null; // debounce for arrow key history
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
        const shapeTools = ['rect', 'circle', 'line', 'triangle', 'pentagon', 'hexagon', 'diamond', 'star', 'arrow', 'roundrect', 'sine', 'squarewave', 'sawtooth', 'trianglewave', 'step', 'pulse', 'clipart'];
        const shapesBtnLabel = document.getElementById('shapesBtnLabel');
        if (shapeTools.includes(tool) && shapesBtnLabel) {
            const labels = { squarewave: 'SQUARE', trianglewave: 'TRI WAVE', roundrect: 'R. RECT', sawtooth: 'SAWTOOTH', clipart: 'CLIP ART' };
            shapesBtnLabel.textContent = labels[tool] || tool.toUpperCase();
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
            let top = rect.top;
            let left = rect.right + 6;
            shapesPopup.style.top = top + 'px';
            shapesPopup.style.left = left + 'px';
            // reposition after layout so popup dimensions are known
            requestAnimationFrame(() => {
                const popH = shapesPopup.scrollHeight;
                const popW = shapesPopup.offsetWidth;
                if (top + popH > window.innerHeight - 10) {
                    top = Math.max(10, window.innerHeight - popH - 10);
                }
                if (left + popW > window.innerWidth - 10) {
                    left = rect.left - popW - 6;
                    if (left < 10) left = 10;
                }
                shapesPopup.style.top = top + 'px';
                shapesPopup.style.left = left + 'px';
            });
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

    // ── CLIP ART GRID ──
    (function populateClipartGrid() {
        const grid = document.getElementById('clipartGrid');
        if (!grid || !window.ClipartLibrary) return;
        const ids = ClipartLibrary.getIconIds();
        for (const id of ids) {
            const btn = document.createElement('button');
            btn.className = 'shape-btn';
            btn.dataset.tool = 'clipart';
            btn.dataset.clipartId = id;
            btn.title = ClipartLibrary.getIconLabel(id);
            btn.innerHTML = '<span class="tool-icon">&#9733;</span><span class="tool-name">' + ClipartLibrary.getIconLabel(id) + '</span>';
            btn.addEventListener('click', () => {
                Tools.setClipartId(id);
                setActiveTool('clipart');
                shapesPopup.classList.remove('open');
            });
            grid.appendChild(btn);
        }
    })();

    // ── IMAGE UPLOAD ──
    const imageBtn = document.getElementById('imageBtn');
    const imageFileInput = document.getElementById('imageFileInput');

    imageBtn.addEventListener('click', () => imageFileInput.click());

    imageFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onerror = () => Toast.show('COULD NOT READ FILE');
        reader.onload = (ev) => {
            const src = ev.target.result;
            const img = new Image();
            img.onerror = () => Toast.show('COULD NOT LOAD IMAGE');
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

                // The bytes go to the renderer's store; the element carries
                // only the ref. Elements get deep-cloned on every undo push
                // and every ctrl+C, so a data URL here is copied wholesale
                // each time — see the note in canvas.js.
                const el = {
                    id: Tools.nextId(),
                    type: 'image',
                    x: (size - w) / 2,
                    y: (size - h) / 2,
                    w: w,
                    h: h,
                    src: CanvasRenderer.registerImage(src),
                    aspectRatio: w / h,
                    origW: w,
                    origH: h,
                    rotation: 0,
                    opacity: 100,
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

    // ── DOUBLE CLICK TO EDIT TEXT (select mode only) ──
    canvas.addEventListener('dblclick', (e) => {
        if (Tools.getTool() !== 'select') return;
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
        selectedElement = el;
        CanvasRenderer.setSelectedId(el.id);
        History.push(elements);
        CanvasRenderer.render(elements);
        updateStats();
        updatePropsFromElement(el);
        setActiveTool('select');
    }

    function handleElementMoved(action, element) {
        if (action === 'select') {
            selectedElement = element;
            updatePropsFromElement(element);
            updatePropsVisibility();
        } else if (action === 'deselect') {
            selectedElement = null;
            document.getElementById('noFillBtn').classList.remove('active');
            document.getElementById('noStrokeBtn').classList.remove('active');
            updatePropsVisibility();
        } else if (action === 'move') {
            History.push(elements);
            updateStats();
            if (selectedElement && selectedElement.type === 'image') {
                if (!selectedElement.origW) {
                    selectedElement.origW = selectedElement.w;
                    selectedElement.origH = selectedElement.h;
                }
                const scale = Math.round((selectedElement.w / selectedElement.origW) * 100);
                document.getElementById('imageScale').value = Math.min(500, Math.max(10, scale));
                document.getElementById('imageScaleVal').textContent = scale + '%';
                document.getElementById('imageDims').textContent = Math.round(selectedElement.w) + ' × ' + Math.round(selectedElement.h);
            }
        }
    }

    function updatePropsFromElement(el) {
        if (!el) return;
        // backfill origW/origH for images created before this property existed
        if (el.type === 'image' && !el.origW) {
            el.origW = el.w;
            el.origH = el.h;
        }
        if (el.fill && el.fill !== 'none') {
            document.getElementById('fillColor').value = el.fill;
            document.getElementById('fillHex').value = el.fill;
            document.getElementById('noFillBtn').classList.remove('active');
        } else if (el.fill === 'none') {
            document.getElementById('noFillBtn').classList.add('active');
        }
        if (el.stroke && el.stroke !== 'none') {
            document.getElementById('strokeColor').value = el.stroke;
            document.getElementById('strokeHex').value = el.stroke;
            document.getElementById('noStrokeBtn').classList.remove('active');
        } else if (el.stroke === 'none') {
            document.getElementById('noStrokeBtn').classList.add('active');
        }
        if (el.strokeWidth) {
            document.getElementById('strokeWidth').value = el.strokeWidth;
            document.getElementById('strokeWidthVal').textContent = el.strokeWidth;
        }
        if (el.type === 'text') {
            if (el.font) setDropdownValue('fontSelectDropdown', el.font);
            if (el.fontSize) {
                document.getElementById('fontSize').value = el.fontSize;
                document.getElementById('fontSizeVal').textContent = el.fontSize;
            }
        }
        // rotation
        const rot = Math.round(el.rotation || 0);
        document.getElementById('rotation').value = ((rot % 360) + 360) % 360;
        document.getElementById('rotationVal').textContent = ((rot % 360) + 360) % 360 + '°';

        // wavelength
        const wl = el.wavelength || 5;
        document.getElementById('wavelength').value = wl;
        document.getElementById('wavelengthVal').textContent = wl;

        // wave mode
        const mode = el.waveMode || 'filled';
        document.getElementById('waveFilledBtn').classList.toggle('active', mode === 'filled');
        document.getElementById('waveOpenBtn').classList.toggle('active', mode === 'open');

        // step count
        const steps = el.steps || 5;
        document.getElementById('stepCount').value = steps;
        document.getElementById('stepCountVal').textContent = steps;

        // duty cycle
        const duty = (el.duty || 0.2) * 100;
        document.getElementById('dutyCycle').value = duty;
        document.getElementById('dutyCycleVal').textContent = Math.round(duty) + '%';

        // opacity
        const op = el.opacity != null ? el.opacity : 100;
        document.getElementById('opacity').value = op;
        document.getElementById('opacityVal').textContent = op + '%';

        // image scale
        if (el.type === 'image' && el.origW) {
            const scale = Math.round((el.w / el.origW) * 100);
            document.getElementById('imageScale').value = Math.min(500, Math.max(10, scale));
            document.getElementById('imageScaleVal').textContent = scale + '%';
            document.getElementById('imageDims').textContent = Math.round(el.w) + ' × ' + Math.round(el.h);
        }
    }

    // ── COLOR CONTROLS ──
    function isValidHex(hex) {
        return /^#[0-9a-f]{6}$/i.test(hex);
    }

    function syncColorPair(pickerId, hexId, prop) {
        const picker = document.getElementById(pickerId);
        const hexInput = document.getElementById(hexId);

        // color picker → hex input
        picker.addEventListener('input', (e) => {
            syncSelectedElement();
            hexInput.value = e.target.value;
            if (prop === 'bg') {
                CanvasRenderer.setBgColor(e.target.value);
                CanvasRenderer.render(elements);
            } else if (prop === 'fill') {
                document.getElementById('noFillBtn').classList.remove('active');
            } else if (prop === 'stroke') {
                document.getElementById('noStrokeBtn').classList.remove('active');
            }
            if (selectedElement && prop !== 'bg') {
                selectedElement[prop] = e.target.value;
                CanvasRenderer.render(elements);
            }
        });
        picker.addEventListener('change', () => {
            if (selectedElement && prop !== 'bg') History.push(elements);
        });

        // hex input → color picker
        hexInput.addEventListener('input', () => {
            syncSelectedElement();
            let val = hexInput.value;
            // auto-prefix # if missing
            if (/^[0-9a-f]{6}$/i.test(val)) val = '#' + val;
            if (!isValidHex(val)) return;
            picker.value = val;
            if (prop === 'bg') {
                CanvasRenderer.setBgColor(val);
                CanvasRenderer.render(elements);
            } else if (prop === 'fill') {
                document.getElementById('noFillBtn').classList.remove('active');
            } else if (prop === 'stroke') {
                document.getElementById('noStrokeBtn').classList.remove('active');
            }
            if (selectedElement && prop !== 'bg') {
                selectedElement[prop] = val;
                CanvasRenderer.render(elements);
            }
        });
        hexInput.addEventListener('change', () => {
            // normalize on blur
            let val = hexInput.value;
            if (/^[0-9a-f]{6}$/i.test(val)) val = '#' + val;
            if (isValidHex(val)) {
                hexInput.value = val;
                picker.value = val;
            }
            if (selectedElement && prop !== 'bg') History.push(elements);
        });
    }

    syncColorPair('fillColor', 'fillHex', 'fill');
    syncColorPair('strokeColor', 'strokeHex', 'stroke');
    syncColorPair('bgColor', 'bgHex', 'bg');

    function handleColorSample(color) {
        document.getElementById('fillColor').value = color;
        document.getElementById('fillHex').value = color;
        document.getElementById('noFillBtn').classList.remove('active');

        if (selectedElement) {
            selectedElement.fill = color;
            History.push(elements);
            CanvasRenderer.render(elements);
        }
    }

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
            CanvasRenderer.render(elements);
        }
    });
    document.getElementById('strokeWidth').addEventListener('change', () => {
        if (selectedElement) History.push(elements);
    });

    function applyRotation(deg) {
        deg = ((deg % 360) + 360) % 360;
        document.getElementById('rotation').value = deg;
        document.getElementById('rotationVal').textContent = deg + '°';
        if (selectedElement) {
            selectedElement.rotation = deg;
            CanvasRenderer.render(elements);
        }
    }

    document.getElementById('rotation').addEventListener('input', (e) => {
        applyRotation(parseInt(e.target.value));
    });
    document.getElementById('rotation').addEventListener('change', () => {
        if (selectedElement) History.push(elements);
    });

    document.getElementById('rotMinus').addEventListener('click', () => {
        if (!selectedElement) return;
        applyRotation((selectedElement.rotation || 0) - 5);
        History.push(elements);
    });

    document.getElementById('rotPlus').addEventListener('click', () => {
        if (!selectedElement) return;
        applyRotation((selectedElement.rotation || 0) + 5);
        History.push(elements);
    });

    // ── WAVELENGTH CONTROL ──
    document.getElementById('wavelength').addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        document.getElementById('wavelengthVal').textContent = val;
        if (selectedElement) {
            selectedElement.wavelength = val;
            CanvasRenderer.render(elements);
        }
    });
    document.getElementById('wavelength').addEventListener('change', () => {
        if (selectedElement) History.push(elements);
    });

    // ── WAVE MODE CONTROL ──
    function setWaveMode(mode) {
        if (!selectedElement) return;
        selectedElement.waveMode = mode;
        document.getElementById('waveFilledBtn').classList.toggle('active', mode === 'filled');
        document.getElementById('waveOpenBtn').classList.toggle('active', mode === 'open');
        CanvasRenderer.render(elements);
        History.push(elements);
    }
    document.getElementById('waveFilledBtn').addEventListener('click', () => setWaveMode('filled'));
    document.getElementById('waveOpenBtn').addEventListener('click', () => setWaveMode('open'));

    // ── STEP COUNT CONTROL ──
    document.getElementById('stepCount').addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        document.getElementById('stepCountVal').textContent = val;
        if (selectedElement) {
            selectedElement.steps = val;
            CanvasRenderer.render(elements);
        }
    });
    document.getElementById('stepCount').addEventListener('change', () => {
        if (selectedElement) History.push(elements);
    });

    // ── DUTY CYCLE CONTROL ──
    document.getElementById('dutyCycle').addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        document.getElementById('dutyCycleVal').textContent = val + '%';
        if (selectedElement) {
            selectedElement.duty = val / 100;
            CanvasRenderer.render(elements);
        }
    });
    document.getElementById('dutyCycle').addEventListener('change', () => {
        if (selectedElement) History.push(elements);
    });

    // ── OPACITY CONTROL ──
    document.getElementById('opacity').addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        document.getElementById('opacityVal').textContent = val + '%';
        if (selectedElement) {
            selectedElement.opacity = val;
            CanvasRenderer.render(elements);
        }
    });
    document.getElementById('opacity').addEventListener('change', () => {
        if (selectedElement) History.push(elements);
    });

    // ── IMAGE SCALE CONTROL ──
    document.getElementById('imageScale').addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        document.getElementById('imageScaleVal').textContent = val + '%';
        if (selectedElement && selectedElement.type === 'image') {
            if (!selectedElement.origW) {
                selectedElement.origW = selectedElement.w;
                selectedElement.origH = selectedElement.h;
            }
            const scale = val / 100;
            selectedElement.w = selectedElement.origW * scale;
            selectedElement.h = selectedElement.origH * scale;
            document.getElementById('imageDims').textContent = Math.round(selectedElement.w) + ' × ' + Math.round(selectedElement.h);
            CanvasRenderer.render(elements);
        }
    });
    document.getElementById('imageScale').addEventListener('change', () => {
        if (selectedElement && selectedElement.type === 'image') History.push(elements);
    });

    // ── Z-ORDER CONTROL ──
    document.getElementById('bringForwardBtn').addEventListener('click', () => {
        if (!selectedElement) return;
        const idx = elements.indexOf(selectedElement);
        if (idx < elements.length - 1) {
            elements.splice(idx, 1);
            elements.splice(idx + 1, 0, selectedElement);
            History.push(elements);
            CanvasRenderer.render(elements);
        }
    });
    document.getElementById('sendBackBtn').addEventListener('click', () => {
        if (!selectedElement) return;
        const idx = elements.indexOf(selectedElement);
        if (idx > 0) {
            elements.splice(idx, 1);
            elements.splice(idx - 1, 0, selectedElement);
            History.push(elements);
            CanvasRenderer.render(elements);
        }
    });

    // ── FONT CONTROLS ──
    document.getElementById('fontSize').addEventListener('input', (e) => {
        document.getElementById('fontSizeVal').textContent = e.target.value;
        if (selectedElement && selectedElement.type === 'text') {
            selectedElement.fontSize = parseInt(e.target.value);
            CanvasRenderer.render(elements);
        }
    });
    document.getElementById('fontSize').addEventListener('change', () => {
        if (selectedElement && selectedElement.type === 'text') History.push(elements);
    });

    // ── EDIT TEXT BUTTON ──
    document.getElementById('editTextBtn').addEventListener('click', () => {
        if (selectedElement && selectedElement.type === 'text') {
            openTextModal(selectedElement.x, selectedElement.y, selectedElement);
        }
    });

    // ── RETRO DROPDOWNS ──
    setupRetroDropdown('fontSelectDropdown', (val) => {
        if (selectedElement && selectedElement.type === 'text') {
            selectedElement.font = val;
            History.push(elements);
            CanvasRenderer.render(elements);
        }
    });

    setupRetroDropdown('canvasSizeDropdown', (val) => {
        const size = parseInt(val);
        CanvasRenderer.setCanvasSize(size);
        CanvasRenderer.render(elements);
        updateStats();
    });

    setupRetroDropdown('modalFontSelectDropdown', null);

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
    let clipboard = null;
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
            // Copy
            if (e.key === 'c' && selectedElement) {
                e.preventDefault();
                clipboard = JSON.parse(JSON.stringify(selectedElement));
                return;
            }
            // Paste
            if (e.key === 'v' && clipboard) {
                e.preventDefault();
                const clone = JSON.parse(JSON.stringify(clipboard));
                clone.id = Tools.nextId();
                clone.x = (clone.x || 0) + 20;
                clone.y = (clone.y || 0) + 20;
                elements.push(clone);
                selectedElement = clone;
                CanvasRenderer.setSelectedId(clone.id);
                History.push(elements);
                CanvasRenderer.render(elements);
                updatePropsFromElement(clone);
                updateStats();
                return;
            }
        }

        // Delete / Backspace
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedElement) {
                e.preventDefault();
                elements = elements.filter(el => el.id !== selectedElement.id);
                selectedElement = null;
                CanvasRenderer.setSelectedId(null);
                History.push(elements);
                CanvasRenderer.render(elements);
                updateStats();
            }
            return;
        }

        // Arrow key nudging
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedElement) {
            e.preventDefault();
            const step = e.shiftKey ? 10 : 1;
            switch (e.key) {
                case 'ArrowUp':    selectedElement.y -= step; break;
                case 'ArrowDown':  selectedElement.y += step; break;
                case 'ArrowLeft':  selectedElement.x -= step; break;
                case 'ArrowRight': selectedElement.x += step; break;
            }
            CanvasRenderer.render(elements);
            // debounce history push so rapid nudges become one undo step
            clearTimeout(nudgeTimer);
            nudgeTimer = setTimeout(() => { History.push(elements); }, 300);
            return;
        }

        // Tool shortcuts (only when Ctrl/Meta not held)
        if (!e.ctrlKey && !e.metaKey) {
            const shortcuts = { v: 'select', r: 'rect', c: 'circle', l: 'line', t: 'text' };
            if (shortcuts[e.key]) {
                setActiveTool(shortcuts[e.key]);
            }
            if (e.key === 'i') {
                imageFileInput.click();
            }
        }
    });

    // ── SHOW/HIDE TEXT PROPS ──
    const WAVE_TYPES = ['sine', 'squarewave', 'sawtooth', 'trianglewave', 'step', 'pulse'];

    function updatePropsVisibility() {
        const tool = Tools.getTool();
        const isTextTool = tool === 'text';
        const isTextElement = selectedElement && selectedElement.type === 'text';
        const isImageElement = selectedElement && selectedElement.type === 'image';
        const isWaveTool = WAVE_TYPES.includes(tool);
        const isWaveElement = selectedElement && WAVE_TYPES.includes(selectedElement.type);
        const isStepTool = tool === 'step' || (selectedElement && selectedElement.type === 'step');
        const isPulseTool = tool === 'pulse' || (selectedElement && selectedElement.type === 'pulse');
        const showWave = isWaveTool || isWaveElement;
        document.getElementById('textProps').hidden = !(isTextTool || isTextElement);
        document.getElementById('fontSizeGroup').hidden = !(isTextTool || isTextElement);
        document.getElementById('editTextBtn').hidden = !isTextElement;
        document.getElementById('rotationGroup').hidden = !selectedElement;
        document.getElementById('waveProps').hidden = !showWave;
        document.getElementById('waveModeGroup').hidden = !isWaveElement;
        document.getElementById('stepCountGroup').hidden = !isStepTool;
        document.getElementById('dutyGroup').hidden = !isPulseTool;
        document.getElementById('opacityGroup').hidden = !selectedElement;
        document.getElementById('zorderGroup').hidden = !selectedElement;
        document.getElementById('imageScaleGroup').hidden = !isImageElement;
    }

    // observe tool changes
    const origSetTool = Tools.setTool;
    Tools.setTool = function (tool) {
        origSetTool(tool);
        updatePropsVisibility();
    };

})();
