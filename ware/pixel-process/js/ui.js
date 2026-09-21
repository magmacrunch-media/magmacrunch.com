/* ── ui.js — effect modules, knobs, chips, drag reorder ── */

(function() {
    'use strict';

    var chainList = document.getElementById('chainList');
    var dragSrcIndex = null;

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

        var toggle = document.createElement('button');
        toggle.className = 'effect-toggle' + (effect.enabled ? ' on' : '');
        toggle.textContent = effect.enabled ? 'ON' : 'OFF';
        toggle.dataset.action = 'toggle';

        var remove = document.createElement('button');
        remove.className = 'effect-remove';
        remove.textContent = '×';
        remove.dataset.action = 'remove';

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
                // Button group instead of slider
                var btns = document.createElement('div');
                btns.className = 'effect-btns';
                var values = [];
                for (var v = def.min; v <= def.max; v += def.step) values.push(v);

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

        // Drag and drop — only header is the drag handle
        header.draggable = true;
        header.addEventListener('dragstart', onDragStart);
        header.addEventListener('dragend', onDragEnd);
        card.addEventListener('dragover', onDragOver);
        card.addEventListener('drop', onDrop);

        return card;
    }

    function renderChain() {
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

    // ── Drag & Drop ──

    function onDragStart(e) {
        var header = e.target.closest('.effect-header');
        var card = header && header.closest('.effect-card');
        if (!card) return;
        dragSrcIndex = getCardIndex(card);
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.dataset.id);
    }

    function onDragEnd(e) {
        var header = e.target.closest('.effect-header');
        var card = header && header.closest('.effect-card');
        if (card) card.classList.remove('dragging');
        // Remove all drag-over highlights
        var cards = chainList.querySelectorAll('.effect-card');
        for (var i = 0; i < cards.length; i++) {
            cards[i].classList.remove('drag-over');
        }
        dragSrcIndex = null;
    }

    function onDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        var card = e.target.closest('.effect-card');
        if (card) {
            // Remove highlight from all, add to this one
            var cards = chainList.querySelectorAll('.effect-card');
            for (var i = 0; i < cards.length; i++) cards[i].classList.remove('drag-over');
            card.classList.add('drag-over');
        }
    }

    function onDrop(e) {
        e.preventDefault();
        var card = e.target.closest('.effect-card');
        if (!card || dragSrcIndex === null) return;
        var toIndex = getCardIndex(card);
        if (dragSrcIndex !== toIndex) {
            Chain.moveEffect(dragSrcIndex, toIndex);
            renderChain();
            bindEvents();
            Chain.render();
        }
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
