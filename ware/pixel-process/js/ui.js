/* ── ui.js — effect modules, knobs, chips, drag reorder ── */

(function() {
    'use strict';

    var chainList = document.getElementById('chainList');

    /* Which card is open on a phone.

       Below 768px there is room for one effect's controls at a time, so the
       chain becomes a row of chips and only the selected card is shown.
       This is the only state the phone layout adds. On a wide screen every
       card is visible and the selection is simply unused, which is why it
       lives here rather than in a separate mobile file that could drift. */
    var selectedId = null;
    var highestSeen = -1;

    function resolveSelection(effects) {
        var maxId = -1, present = false;
        for (var i = 0; i < effects.length; i++) {
            if (effects[i].id > maxId) maxId = effects[i].id;
            if (effects[i].id === selectedId) present = true;
        }
        // A newly added effect is selected, because it is the one you are
        // about to tune. Ids only ever increase, so a higher one is new.
        if (maxId > highestSeen) { selectedId = maxId; present = true; }
        if (maxId > highestSeen) highestSeen = maxId;
        if (!present) selectedId = effects.length ? effects[effects.length - 1].id : null;
    }

    /* ── Knobs ──

       Every numeric parameter is a knob, because the tool is meant to feel
       like an instrument, and on an instrument you turn things. Drag up to
       turn clockwise and down to turn back, the convention in synthesizer
       software, because a circular drag on a small dial is hard to hit with a
       mouse and harder with a finger. Shift divides the sensitivity by four for
       fine adjustment. Double-click returns a knob to the value the effect was
       designed around.

       The knob is only the face. Behind each one is the same
       <input type="range"> the sliders were, visually hidden and still in the
       tab order, and it remains the single source of truth: turning the knob
       sets its value and fires `input`, so bindEvents, presets and the render
       path are untouched, and the keyboard and screen readers get a real
       slider, with the arrow keys, Page Up and Page Down, Home and End, for
       nothing. A control rebuilt from divs would have had to reimplement all
       of that, and would have got some of it wrong. */
    var SVG_NS = 'http://www.w3.org/2000/svg';
    var SWEEP = 270;    // degrees of travel, from -135 to +135
    var DRAG_PX = 180;  // pixels of vertical drag for the full range
    var FINE = 4;       // Shift divides the sensitivity by this

    function polar(r, deg) {
        var a = deg * Math.PI / 180;
        return [50 + r * Math.sin(a), 50 - r * Math.cos(a)];
    }

    function arcPath(r) {
        var s = polar(r, -SWEEP / 2), e = polar(r, SWEEP / 2);
        return 'M ' + s[0].toFixed(2) + ' ' + s[1].toFixed(2) +
            ' A ' + r + ' ' + r + ' 0 1 1 ' + e[0].toFixed(2) + ' ' + e[1].toFixed(2);
    }

    function svgEl(name, attrs) {
        var el = document.createElementNS(SVG_NS, name);
        for (var k in attrs) el.setAttribute(k, attrs[k]);
        return el;
    }

    /* The dial: a graduated scale, a track, the lit arc of the current value,
       a cap and a pointer. The scale is what makes it read as an instrument
       rather than a volume control: eleven ticks, the ends and the centre
       drawn long, the way a meter face is marked. */
    function buildDial() {
        var svg = svgEl('svg', { viewBox: '0 0 100 100', 'class': 'knob-dial', 'aria-hidden': 'true' });
        for (var i = 0; i <= 10; i++) {
            var deg = -SWEEP / 2 + i * SWEEP / 10;
            var major = i === 0 || i === 5 || i === 10;
            var a = polar(major ? 40 : 43, deg), b = polar(49, deg);
            svg.appendChild(svgEl('line', {
                x1: a[0].toFixed(2), y1: a[1].toFixed(2), x2: b[0].toFixed(2), y2: b[1].toFixed(2),
                'class': 'knob-tick' + (major ? ' major' : '')
            }));
        }
        var d = arcPath(34);
        svg.appendChild(svgEl('path', { d: d, 'class': 'knob-track', pathLength: 100 }));
        svg.appendChild(svgEl('path', { d: d, 'class': 'knob-value', pathLength: 100 }));
        svg.appendChild(svgEl('circle', { cx: 50, cy: 50, r: 25, 'class': 'knob-cap' }));
        svg.appendChild(svgEl('line', { x1: 50, y1: 50, x2: 50, y2: 30, 'class': 'knob-pointer' }));
        return svg;
    }

    function turnOf(input) {
        var min = parseFloat(input.min), max = parseFloat(input.max);
        var v = parseFloat(input.value);
        if (!(max > min)) return 0;
        return Math.max(0, Math.min(1, (v - min) / (max - min)));
    }

    function paintKnob(knob) {
        var input = knob.querySelector('.knob-input');
        var t = turnOf(input);
        knob.querySelector('.knob-value').setAttribute('stroke-dasharray', (t * 100).toFixed(2) + ' 100');
        knob.querySelector('.knob-pointer').setAttribute('transform',
            'rotate(' + (-SWEEP / 2 + t * SWEEP).toFixed(2) + ' 50 50)');
    }

    function attachDrag(knob, input) {
        var startY = 0, startV = 0, fine = false, active = false;

        function setValue(v) {
            var min = parseFloat(input.min), max = parseFloat(input.max);
            var step = parseFloat(input.step) || 1;
            v = min + Math.round((v - min) / step) * step;
            v = Math.max(min, Math.min(max, v));
            v = Math.round(v * 1e6) / 1e6;
            if (String(v) === input.value) return;
            input.value = v;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }

        knob.addEventListener('pointerdown', function(e) {
            if (e.button > 0) return;
            active = true;
            fine = e.shiftKey;
            startY = e.clientY;
            startV = parseFloat(input.value);
            knob.setPointerCapture(e.pointerId);
            knob.classList.add('turning');
            input.focus({ preventScroll: true });
            e.preventDefault();
        });

        knob.addEventListener('pointermove', function(e) {
            if (!active) return;
            // Re-anchor when Shift changes mid-turn, or the change of
            // sensitivity would make the value jump.
            if (e.shiftKey !== fine) {
                fine = e.shiftKey;
                startY = e.clientY;
                startV = parseFloat(input.value);
            }
            var range = parseFloat(input.max) - parseFloat(input.min);
            setValue(startV + (startY - e.clientY) / (DRAG_PX * (fine ? FINE : 1)) * range);
        });

        function end() {
            active = false;
            knob.classList.remove('turning');
        }
        knob.addEventListener('pointerup', end);
        knob.addEventListener('pointercancel', end);
        knob.addEventListener('lostpointercapture', end);

        knob.addEventListener('dblclick', function() {
            setValue(parseFloat(input.dataset.default));
        });
    }

    // Effect UI definitions: maps effect type to its parameter controls
    var effectUI = {
        'channel-shift': [
            { key: 'rx', label: 'RX', min: -32, max: 32, step: 1 },
            { key: 'ry', label: 'RY', min: -32, max: 32, step: 1 },
            { key: 'gx', label: 'GX', min: -32, max: 32, step: 1 },
            { key: 'gy', label: 'GY', min: -32, max: 32, step: 1 },
            { key: 'bx', label: 'BX', min: -32, max: 32, step: 1 },
            { key: 'by', label: 'BY', min: -32, max: 32, step: 1 }
        ],
        'channel-swap': [
            { key: 'mode', label: 'MODE', min: 0, max: 3, step: 1, labels: ['RBG', 'GRB', 'BRG', 'BGR'] }
        ],
        'invert': [
            { key: 'amount', label: 'AMT', min: 0, max: 100, step: 1, suffix: '%' }
        ],
        'posterize': [
            { key: 'levels', label: 'LVL', min: 2, max: 16, step: 1 }
        ],
        'threshold': [
            { key: 'level', label: 'LVL', min: 0, max: 255, step: 1 },
            { key: 'colorOut', label: 'MODE', min: 0, max: 1, step: 1, labels: ['B/W', 'COLOR'] }
        ],
        'pixel-sort': [
            { key: 'threshold', label: 'THR', min: 0, max: 255, step: 1 },
            { key: 'axis', label: 'AXIS', min: 0, max: 1, step: 1, labels: ['H', 'V'] },
            { key: 'sortBy', label: 'BY', min: 0, max: 4, step: 1, labels: ['BRI', 'HUE', 'R', 'G', 'B'] },
            { key: 'direction', label: 'DIR', min: 0, max: 1, step: 1, labels: ['ASC', 'DESC'] }
        ],
        'row-displace': [
            { key: 'amount', label: 'AMT', min: -32, max: 32, step: 1 },
            { key: 'axis', label: 'AXIS', min: 0, max: 1, step: 1, labels: ['H', 'V'] },
            { key: 'pattern', label: 'PAT', min: 0, max: 2, step: 1, labels: ['SIN', 'SAW', 'RND'] },
            { key: 'frequency', label: 'FREQ', min: 1, max: 32, step: 1 },
            { key: 'seed', label: 'SEED', min: 0, max: 999, step: 1 }
        ],
        'wave-distort': [
            { key: 'amplitude', label: 'AMP', min: 0, max: 32, step: 1 },
            { key: 'frequency', label: 'FREQ', min: 1, max: 32, step: 1 },
            { key: 'axis', label: 'AXIS', min: 0, max: 1, step: 1, labels: ['H', 'V'] },
            { key: 'phase', label: 'PHASE', min: 0, max: 62, step: 1 }
        ],
        'block-corrupt': [
            { key: 'intensity', label: 'AMT', min: 1, max: 100, step: 1 },
            { key: 'blockSize', label: 'SIZE', min: 2, max: 64, step: 1 },
            { key: 'count', label: 'NUM', min: 1, max: 50, step: 1 },
            { key: 'seed', label: 'SEED', min: 0, max: 999, step: 1 }
        ],
        'dead-pixels': [
            { key: 'density', label: 'DENS', min: 1, max: 200, step: 1 },
            { key: 'color', label: 'CLR', min: 0, max: 2, step: 1, labels: ['RND', 'BLK', 'WHT'] },
            { key: 'seed', label: 'SEED', min: 0, max: 999, step: 1 }
        ],
        /* CUT and WIDTH are per cent of Nyquist, not bins. The transform
           covers the whole image now, so a frequency is a fraction of what the
           image can carry and means the same thing at every size. */
        'fft-filter': [
            { key: 'filterType', label: 'TYPE', min: 0, max: 3, step: 1, labels: ['LP', 'HP', 'BP', 'NOTCH'] },
            { key: 'cutoff', label: 'CUT', min: 1, max: 100, step: 1, suffix: '%' },
            { key: 'width', label: 'WIDTH', min: 1, max: 100, step: 1, suffix: '%' },
            { key: 'gain', label: 'GAIN', min: 0, max: 3, step: 0.1 },
            { key: 'channels', label: 'CHAN', min: 0, max: 1, step: 1, labels: ['LUMA', 'RGB'] }
        ],
        /* SPECTRUM is a measurement, so its two controls are about
           reading it rather than about the picture: GAIN brightens and
           FLOOR clips the low end away to pull faint structure out of the
           haze around DC. */
        'fft-spectrum': [
            { key: 'gain', label: 'GAIN', min: 0.2, max: 4, step: 0.1 },
            { key: 'floor', label: 'FLOOR', min: 0, max: 90, step: 1, suffix: '%' }
        ],
        'fft-scramble': [
            { key: 'amount', label: 'AMT', min: 0, max: 100, step: 1, suffix: '%' },
            { key: 'seed', label: 'SEED', min: 0, max: 999, step: 1 },
            { key: 'channels', label: 'CHAN', min: 0, max: 1, step: 1, labels: ['LUMA', 'RGB'] }
        ],
        'fft-wedge': [
            { key: 'angle', label: 'ANGLE', min: 0, max: 179, step: 1, suffix: '\u00b0' },
            { key: 'spread', label: 'SPREAD', min: 1, max: 89, step: 1, suffix: '\u00b0' },
            { key: 'mode', label: 'MODE', min: 0, max: 1, step: 1, labels: ['KEEP', 'CUT'] },
            { key: 'channels', label: 'CHAN', min: 0, max: 1, step: 1, labels: ['LUMA', 'RGB'] }
        ],
        'feedback': [
            { key: 'iterations', label: 'ITER', min: 1, max: 20, step: 1 },
            { key: 'decay', label: 'DECAY', min: 0, max: 1, step: 0.05 },
            { key: 'offsetX', label: 'OX', min: -20, max: 20, step: 1 },
            { key: 'offsetY', label: 'OY', min: -20, max: 20, step: 1 },
            { key: 'scale', label: 'SCALE', min: 0.8, max: 1.2, step: 0.01 },
            { key: 'rotation', label: 'ROT', min: -10, max: 10, step: 0.5, suffix: '°' }
        ]
    };

    function createEffectCard(effect) {
        var card = document.createElement('div');
        card.className = 'effect-card' + (effect.id === selectedId ? ' selected' : '') +
            (effect.enabled ? '' : ' disabled');
        card.dataset.id = effect.id;

        // Header
        var header = document.createElement('div');
        header.className = 'effect-header';

        var name = document.createElement('span');
        name.className = 'effect-name';
        name.textContent = effect.name;

        var actions = document.createElement('div');
        actions.className = 'effect-actions';

        /* Move buttons beside the switch, not only a drag.
           A drag is a gesture nobody can reach by keyboard, and it is the
           hardest thing in this panel to do accurately with a thumb. These
           two are the plain way to say the same thing, and they are what a
           screen reader reads. Their disabled state at the ends of the chain
           is the only indication of where a module sits, so it matters. */
        var up = document.createElement('button');
        up.className = 'effect-move';
        up.dataset.action = 'up';
        up.textContent = '▲';
        up.title = 'Move earlier in the chain';
        up.setAttribute('aria-label', 'Move ' + effect.name + ' earlier in the chain');

        var down = document.createElement('button');
        down.className = 'effect-move';
        down.dataset.action = 'down';
        down.textContent = '▼';
        down.title = 'Move later in the chain';
        down.setAttribute('aria-label', 'Move ' + effect.name + ' later in the chain');

        var toggle = document.createElement('button');
        toggle.className = 'effect-toggle' + (effect.enabled ? ' on' : '');
        toggle.textContent = effect.enabled ? 'ON' : 'OFF';
        toggle.dataset.action = 'toggle';

        var remove = document.createElement('button');
        remove.className = 'effect-remove';
        remove.textContent = '×';
        remove.dataset.action = 'remove';

        actions.appendChild(up);
        actions.appendChild(down);
        actions.appendChild(toggle);
        actions.appendChild(remove);
        header.appendChild(name);
        header.appendChild(actions);

        // Body with parameter sliders
        var body = document.createElement('div');
        body.className = 'effect-body';

        var uiDefs = effectUI[effect.type] || [];
        for (var i = 0; i < uiDefs.length; i++) {
            var def = uiDefs[i];
            var row = document.createElement('div');
            row.className = 'effect-row';

            var label = document.createElement('label');
            label.textContent = def.label;

            if (def.labels) {
                var values = [];
                for (var v = def.min; v <= def.max; v += def.step) values.push(v);

                if (values.length > 2) {
                    /* More than two choices becomes a selector switch rather
                       than a row of chips. Four modes across a 211px panel is
                       six-pixel type nobody can read, and on a phone the row
                       is the first thing to be squeezed; the list also has to
                       escape the card, which is why it is opened on the body
                       rather than inside it. Two choices stay as chips: that
                       is a switch, and a switch should show both positions. */
                    var picked = values.indexOf(effect.params[def.key]);
                    var options = [];
                    for (var s = 0; s < values.length; s++) options.push([values[s], def.labels[s]]);

                    var trigger = document.createElement('button');
                    trigger.type = 'button';
                    trigger.className = 'selector';
                    trigger.dataset.key = def.key;
                    trigger.dataset.options = JSON.stringify(options);
                    trigger.setAttribute('aria-haspopup', 'listbox');
                    trigger.setAttribute('aria-expanded', 'false');
                    trigger.setAttribute('aria-label', effect.name + ' ' + def.label);

                    var value = document.createElement('span');
                    value.className = 'selector-value';
                    value.textContent = picked === -1 ? def.labels[0] : def.labels[picked];
                    var caret = document.createElement('span');
                    caret.className = 'selector-caret';
                    caret.setAttribute('aria-hidden', 'true');
                    caret.textContent = '▾';
                    trigger.appendChild(value);
                    trigger.appendChild(caret);

                    row.appendChild(label);
                    row.appendChild(trigger);
                } else {
                    // Button group instead of slider
                    var btns = document.createElement('div');
                    btns.className = 'effect-btns';

                    for (var j = 0; j < values.length; j++) {
                        var btn = document.createElement('button');
                        btn.className = 'effect-btn' + (effect.params[def.key] === values[j] ? ' active' : '');
                        btn.textContent = def.labels[j];
                        btn.dataset.key = def.key;
                        btn.dataset.value = values[j];
                        btns.appendChild(btn);
                    }
                    row.appendChild(label);
                    row.appendChild(btns);
                }
            } else {
                row.className = 'effect-row knob-cell';

                var input = document.createElement('input');
                input.type = 'range';
                input.className = 'knob-input';
                input.min = def.min;
                input.max = def.max;
                input.step = def.step;
                input.value = effect.params[def.key];
                input.dataset.key = def.key;
                input.dataset.suffix = def.suffix || '';
                var registered = Chain.getRegistry()[effect.type];
                input.dataset.default = registered && registered.defaults
                    ? registered.defaults[def.key] : input.value;
                input.setAttribute('aria-label', effect.name + ' ' + def.label);
                input.setAttribute('aria-valuetext', effect.params[def.key] + (def.suffix || ''));

                var knob = document.createElement('div');
                knob.className = 'knob';
                knob.appendChild(buildDial());
                knob.appendChild(input);
                attachDrag(knob, input);
                paintKnob(knob);

                var val = document.createElement('span');
                val.className = 'range-val';
                val.textContent = effect.params[def.key] + (def.suffix || '');

                row.appendChild(knob);
                row.appendChild(val);
                row.appendChild(label);
            }

            body.appendChild(row);
        }

        card.appendChild(header);
        card.appendChild(body);

        // The header is the drag handle, by pointer rather than by HTML5 drag
        // and drop: see startDrag.
        header.addEventListener('pointerdown', onHeaderPointerDown);

        return card;
    }

    function renderChain() {
        // Any open selector belongs to a card that is about to be discarded.
        closeSelector(false);
        chainList.innerHTML = '';
        var effects = Chain.getEffects();
        resolveSelection(effects);
        for (var i = 0; i < effects.length; i++) {
            chainList.appendChild(createEffectCard(effects[i]));
        }
        renderChips(effects);
    }

    function select(id) {
        selectedId = id;
        renderChain();
        bindEvents();
    }

    function rerender() {
        renderChain();
        bindEvents();
        Chain.render();
    }

    function chipButton(label, cls, enabled, onClick) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = cls;
        b.textContent = label;
        b.disabled = !enabled;
        b.onclick = onClick;
        return b;
    }

    /* The chip row. Tap selects, double tap bypasses, and the two arrows
       move the selected effect, because touch has no drag and drop and
       the order of a signal chain is not cosmetic: the same four effects
       in a different order are a different picture. */
    function renderChips(effects) {
        var row = document.getElementById('chainChips');
        if (!row) return;
        row.innerHTML = '';

        var at = -1;
        for (var i = 0; i < effects.length; i++) {
            (function(e) {
                var cls = 'chain-chip' + (e.id === selectedId ? ' selected' : '') + (e.enabled ? '' : ' off');
                var chip = chipButton(e.name, cls, true, function() { select(e.id); });
                chip.ondblclick = function() { Chain.toggleEffect(e.id); rerender(); };
                row.appendChild(chip);
            })(effects[i]);
            if (effects[i].id === selectedId) at = i;
        }

        if (effects.length > 1 && at !== -1) {
            row.appendChild(chipButton('\u25C0', 'chain-move', at > 0, function() {
                Chain.moveEffect(at, at - 1); rerender();
            }));
            row.appendChild(chipButton('\u25B6', 'chain-move', at < effects.length - 1, function() {
                Chain.moveEffect(at, at + 1); rerender();
            }));
        }
    }

    /* ── Dragging a module to a new place in the chain ──
     *
     * By pointer events, not by HTML5 drag and drop. `draggable` never fires
     * from a finger in WKWebView, so on the iOS build and on an iPad in the
     * three-panel layout the chain simply could not be reordered at all, and
     * the order of a signal chain is not cosmetic: the same four effects in a
     * different order are a different picture. Pointer events are one code
     * path for mouse, pen and touch.
     *
     * The card is moved in the DOM as the pointer passes each neighbour's
     * midpoint, and the chain is told the resulting order once, on release
     * (Chain.setOrder). Shuffling the model on every move would re-render the
     * panel under the pointer several times a second.
     *
     * A drag only begins after the pointer has travelled a few pixels, so a
     * tap on the header still selects the card rather than nudging it, and
     * `touch-action: none` on the header is what stops the panel scrolling
     * away underneath a drag that has begun.
     */
    var drag = null;

    function onHeaderPointerDown(e) {
        // The buttons live in the header; a press on one is not a drag.
        if (e.button !== 0 || (e.target.closest && e.target.closest('button'))) return;
        var header = e.target.closest('.effect-header');
        var card = header && header.closest('.effect-card');
        if (!card || chainList.querySelectorAll('.effect-card').length < 2) return;

        drag = { card: card, header: header, startY: e.clientY, moved: false, pointerId: e.pointerId };
        header.addEventListener('pointermove', onHeaderPointerMove);
        header.addEventListener('pointerup', onHeaderPointerUp);
        header.addEventListener('pointercancel', onHeaderPointerUp);
        // Listeners first, and the capture is allowed to fail: it throws for a
        // pointer the browser does not consider active, and a drag that works
        // only while the pointer stays exactly over the header is worse than
        // one without capture.
        try { header.setPointerCapture(e.pointerId); } catch (err) { /* no capture, still draggable */ }
    }

    function onHeaderPointerMove(e) {
        if (!drag) return;
        if (!drag.moved) {
            if (Math.abs(e.clientY - drag.startY) < 6) return;
            drag.moved = true;
            drag.card.classList.add('dragging');
        }
        e.preventDefault();

        /* Where the card belongs, decided once from one snapshot of the
           layout: the first card whose middle is below the pointer, and the
           end of the list if there is none.
           Swapping with a neighbour and then looking again does not work,
           however carefully it is bounded. Each swap moves every other card,
           so the next look finds the pointer on the far side of a midpoint
           and swaps back: dragging upwards oscillated and settled exactly
           where it started, while dragging down happened to work, which is
           the sort of asymmetry that reads as "sometimes it does not drag". */
        var cards = chainList.querySelectorAll('.effect-card');
        var before = null;
        for (var i = 0; i < cards.length; i++) {
            if (cards[i] === drag.card) continue;
            var box = cards[i].getBoundingClientRect();
            if (e.clientY < box.top + box.height / 2) { before = cards[i]; break; }
        }

        if (before !== drag.card.nextSibling && before !== drag.card) {
            chainList.insertBefore(drag.card, before);
        }
    }

    function onHeaderPointerUp(e) {
        if (!drag) return;
        var moved = drag.moved;
        var card = drag.card;
        var header = drag.header;
        header.removeEventListener('pointermove', onHeaderPointerMove);
        header.removeEventListener('pointerup', onHeaderPointerUp);
        header.removeEventListener('pointercancel', onHeaderPointerUp);
        if (header.hasPointerCapture && header.hasPointerCapture(e.pointerId)) {
            header.releasePointerCapture(e.pointerId);
        }
        card.classList.remove('dragging');
        drag = null;
        if (!moved) return;

        var cards = chainList.querySelectorAll('.effect-card');
        var ids = [];
        for (var i = 0; i < cards.length; i++) ids.push(parseInt(cards[i].dataset.id, 10));
        Chain.setOrder(ids);
        rerender();
    }

    function getCardIndex(card) {
        var cards = chainList.querySelectorAll('.effect-card');
        for (var i = 0; i < cards.length; i++) {
            if (cards[i] === card) return i;
        }
        return -1;
    }

    // ── Event Binding ──

    function bindEvents() {
        // Toggle / Remove buttons
        var cards = chainList.querySelectorAll('.effect-card');
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            var id = parseInt(card.dataset.id);

            card.querySelector('[data-action="toggle"]').onclick = (function(id) {
                return function() {
                    Chain.toggleEffect(id);
                    renderChain();
                    bindEvents();
                    Chain.render();
                };
            })(id);

            // Move buttons. The index is read at click time rather than
            // captured here, because every other control re-renders the panel
            // and a captured index would be stale the moment anything moved.
            var moveButtons = card.querySelectorAll('[data-action="up"], [data-action="down"]');
            for (var m = 0; m < moveButtons.length; m++) {
                var at = i;
                var isUp = moveButtons[m].dataset.action === 'up';
                moveButtons[m].disabled = isUp ? at === 0 : at === cards.length - 1;
                moveButtons[m].onclick = (function(id, up) {
                    return function() {
                        var effects = Chain.getEffects();
                        var from = -1;
                        for (var k = 0; k < effects.length; k++) if (effects[k].id === id) from = k;
                        if (from === -1) return;
                        Chain.moveEffect(from, from + (up ? -1 : 1));
                        rerender();
                    };
                })(id, isUp);
            }

            card.querySelector('[data-action="remove"]').onclick = (function(id) {
                return function() {
                    Chain.removeEffect(id);
                    renderChain();
                    bindEvents();
                    Chain.render();
                };
            })(id);

            // Knobs. The hidden range input behind each one is still the
            // control: a turn of the knob sets it and fires `input`, and so
            // does the keyboard, so this is the one place a value lands.
            var ranges = card.querySelectorAll('.knob-input');
            for (var j = 0; j < ranges.length; j++) {
                ranges[j].oninput = (function(id, range) {
                    return function() {
                        var effect = Chain.getEffect(id);
                        if (!effect) return;
                        var key = range.dataset.key;
                        var val = parseFloat(range.value);
                        effect.params[key] = val;
                        var text = val + (range.dataset.suffix || '');
                        var cell = range.closest('.effect-row');
                        var valSpan = cell && cell.querySelector('.range-val');
                        if (valSpan) valSpan.textContent = text;
                        range.setAttribute('aria-valuetext', text);
                        var knob = range.closest('.knob');
                        if (knob) paintKnob(knob);
                        Chain.render();
                    };
                })(id, ranges[j]);
            }

            // Selector switches
            var selectors = card.querySelectorAll('.selector');
            for (var s = 0; s < selectors.length; s++) {
                selectors[s].onclick = (function(id, trigger) {
                    return function() { openSelector(trigger, id); };
                })(id, selectors[s]);
            }

            // Button groups
            var btns = card.querySelectorAll('.effect-btn');
            for (var j = 0; j < btns.length; j++) {
                btns[j].onclick = (function(id, btn) {
                    return function() {
                        var effect = Chain.getEffect(id);
                        if (!effect) return;
                        var key = btn.dataset.key;
                        var val = parseFloat(btn.dataset.value);
                        effect.params[key] = val;
                        // Update active state
                        var siblings = btn.parentElement.querySelectorAll('.effect-btn');
                        for (var k = 0; k < siblings.length; k++) siblings[k].classList.remove('active');
                        btn.classList.add('active');
                        Chain.render();
                    };
                })(id, btns[j]);
            }
        }
    }

    /* ── The selector switch ──
     *
     * One list is open at a time and it lives on the BODY, not in the card.
     * The chain panel scrolls and clips, and the card itself is inside it, so
     * a list opened in place is cut off exactly when it is longest. It is
     * positioned against the trigger and flipped above it when there is no
     * room below, which is the usual case for the last module in a chain.
     *
     * It is built from real buttons so the keyboard works: arrows move, Enter
     * or Space chooses, Escape closes and puts focus back on the trigger.
     * That is the same reason the knobs are drawn over real range inputs.
     */
    var openPop = null;

    function closeSelector(focusTrigger) {
        if (!openPop) return;
        var trigger = openPop.trigger;
        openPop.el.remove();
        document.removeEventListener('pointerdown', onPopPointer, true);
        document.removeEventListener('keydown', onPopKey, true);
        window.removeEventListener('resize', onPopDismiss, true);
        window.removeEventListener('scroll', onPopDismiss, true);
        openPop = null;
        trigger.setAttribute('aria-expanded', 'false');
        if (focusTrigger) trigger.focus();
    }

    /* Follow the trigger rather than dismiss.
     *
     * Dismissing on any scroll sounds tidy and is not: the chain panel scrolls
     * when an option takes focus, so the list closed the instant it opened on
     * a phone. It is repositioned instead, and only closes once the switch
     * itself has left the viewport, where there is nothing left to attach to. */
    function onPopDismiss() {
        if (!openPop) return;
        var rect = openPop.trigger.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) closeSelector(false);
        else placePop(openPop.el, openPop.trigger);
    }

    function onPopPointer(e) {
        if (!openPop) return;
        if (openPop.el.contains(e.target) || openPop.trigger.contains(e.target)) return;
        closeSelector(false);
    }

    function onPopKey(e) {
        if (!openPop) return;
        var items = openPop.items;
        var at = items.indexOf(document.activeElement);
        if (e.key === 'Escape') {
            e.preventDefault();
            closeSelector(true);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            var next = e.key === 'ArrowDown' ? at + 1 : at - 1;
            if (next < 0) next = items.length - 1;
            if (next >= items.length) next = 0;
            items[next].focus();
        } else if (e.key === 'Home' || e.key === 'End') {
            e.preventDefault();
            items[e.key === 'Home' ? 0 : items.length - 1].focus();
        } else if (e.key === 'Tab') {
            closeSelector(false);
        }
    }

    function placePop(el, trigger) {
        var rect = trigger.getBoundingClientRect();
        var gap = 4;
        el.style.minWidth = Math.round(rect.width) + 'px';
        var size = el.getBoundingClientRect();
        var top = rect.bottom + gap;
        if (top + size.height > window.innerHeight - 8) {
            var above = rect.top - gap - size.height;
            top = above >= 8 ? above : Math.max(8, window.innerHeight - 8 - size.height);
        }
        var left = Math.min(rect.left, window.innerWidth - 8 - size.width);
        el.style.top = Math.round(top) + 'px';
        el.style.left = Math.round(Math.max(8, left)) + 'px';
    }

    function openSelector(trigger, id) {
        if (openPop && openPop.trigger === trigger) { closeSelector(true); return; }
        closeSelector(false);

        var effect = Chain.getEffect(id);
        if (!effect) return;
        var key = trigger.dataset.key;
        var options = JSON.parse(trigger.dataset.options);
        var el = document.createElement('div');
        el.className = 'selector-pop';
        el.setAttribute('role', 'listbox');
        var items = [];

        for (var i = 0; i < options.length; i++) {
            var option = document.createElement('button');
            option.type = 'button';
            option.setAttribute('role', 'option');
            var chosen = effect.params[key] === options[i][0];
            option.setAttribute('aria-selected', chosen ? 'true' : 'false');
            option.className = 'selector-option' + (chosen ? ' active' : '');
            option.textContent = options[i][1];
            option.onclick = (function(value, labelText) {
                return function() {
                    var live = Chain.getEffect(id);
                    if (live) live.params[key] = value;
                    trigger.querySelector('.selector-value').textContent = labelText;
                    closeSelector(true);
                    Chain.render();
                };
            })(options[i][0], options[i][1]);
            items.push(option);
            el.appendChild(option);
        }

        document.body.appendChild(el);
        openPop = { el: el, trigger: trigger, items: items };
        placePop(el, trigger);
        trigger.setAttribute('aria-expanded', 'true');

        var current = items.filter(function(b) { return b.classList.contains('active'); })[0];
        (current || items[0]).focus({ preventScroll: true });

        document.addEventListener('pointerdown', onPopPointer, true);
        document.addEventListener('keydown', onPopKey, true);
        // Dismiss rather than follow: the trigger can scroll out from under an
        // open list, and a list left hanging over the workspace is worse than
        // one that closes.
        window.addEventListener('resize', onPopDismiss, true);
        window.addEventListener('scroll', onPopDismiss, true);
    }

    /* The header chip. This lived in chain.js until the core was made loadable
       without a DOM; it is the only thing that was in the way. Chain answers
       how many effects are enabled and which were skipped, and drawing that is
       this file's job, like every other element of the chain panel. */
    /* `failures` is optional and defaults to this thread's Chain.

       It has to be passable because when js/render.js is driving a worker, the
       effects run over there and it is that copy of Chain which knows what was
       skipped. This thread's copy never ran and would report an empty list,
       quietly turning a visible "1 FAILED" back into silence. */
    function updateStat(failures) {
        var stat = document.getElementById('chainStat');
        if (!stat) return;

        var enabled = Chain.countEnabled();
        stat.textContent = enabled + ' EFFECT' + (enabled !== 1 ? 'S' : '');

        // Say so in the chrome when an effect is being skipped, otherwise the
        // count claims work the render did not actually do.
        if (!failures) failures = Chain.getLastFailures();
        if (failures.length) {
            stat.textContent += ' · ' + failures.length + ' FAILED';
            stat.title = 'Skipped: ' + failures.join(', ');
        } else {
            stat.title = '';
        }
    }

    window.UI = {
        renderChain: renderChain,
        select: select,
        getSelected: function() { return selectedId; },
        bindEvents: bindEvents,
        updateStat: updateStat,
        effectUI: effectUI
    };
})();
