/* ── lab.js — the bench: dice, mutate, undo, and the clipboard ── */

(function() {
    'use strict';

    var seedInput = document.getElementById('chainSeed');
    var diceBtn = document.getElementById('diceBtn');
    var mutateBtn = document.getElementById('mutateBtn');
    var undoBtn = document.getElementById('undoBtn');
    var copyBtn = document.getElementById('copyBtn');
    var pasteBtn = document.getElementById('pasteBtn');

    if (!seedInput || !diceBtn) return;

    /* Undo covers the three operations that replace the WHOLE chain: dice,
     * mutate and paste. It deliberately does not cover dragging a slider.
     *
     * That is a scope decision rather than a missing feature. A slider drag
     * emits an event per pixel of travel, so recording each one would fill the
     * history with a hundred indistinguishable states and bury the roll you
     * actually wanted to get back to. What people want undone here is the
     * throw of the dice, and that is exactly what this holds.
     */
    var history = [];
    var HISTORY_MAX = 25;

    function pushHistory() {
        history.push(Preset.capture());
        if (history.length > HISTORY_MAX) history.shift();
        refreshUndo();
    }

    function refreshUndo() {
        undoBtn.disabled = history.length === 0;
    }

    function currentSeed() {
        var v = parseInt(seedInput.value, 10);
        return isNaN(v) ? 0 : Math.max(0, v);
    }

    /* Report the search, rather than only its result.
     *
     * The rejected count is the visible part of the measurement in
     * js/preset.js: chains that did not change the probe enough, or that
     * flattened it, thrown away before you ever saw them. Saying so is the
     * difference between a dice button that feels arbitrary and one that
     * shows it did some work. */
    function report(verb, res) {
        var msg = verb + ' ' + res.chain.length + ' EFFECT' + (res.chain.length !== 1 ? 'S' : '');
        if (res.rejected) msg += ' · ' + res.rejected + ' REJECTED';
        if (res.belowBar) msg += ' · BELOW BAR';
        Toast.show(msg);
    }

    function applyChain(chain) {
        Chain.clearEffects();
        for (var i = 0; i < chain.length; i++) {
            var made = Chain.addEffect(chain[i].type);
            if (!made) continue;
            made.params = chain[i].params;
            made.enabled = chain[i].enabled;
        }
        UI.renderChain();
        UI.bindEvents();
        Chain.render();
    }

    diceBtn.addEventListener('click', function() {
        pushHistory();
        seedInput.value = Math.floor(Math.random() * 1000000);
        var res = Preset.fromSeed(currentSeed());
        applyChain(res.chain);
        report('DICE', res);
    });

    // Typing a seed and committing it replays that exact chain, which is the
    // entire point of the number being visible.
    seedInput.addEventListener('change', function() {
        pushHistory();
        seedInput.value = currentSeed();
        var res = Preset.fromSeed(currentSeed());
        applyChain(res.chain);
        report('SEED', res);
    });

    mutateBtn.addEventListener('click', function() {
        var chain = Preset.capture().chain;
        if (!chain.length) {
            Toast.show('NOTHING TO MUTATE');
            return;
        }
        pushHistory();
        // A fresh mutation each press, so holding the button explores rather
        // than returning the same variation over and over.
        var res = Preset.mutate(chain, Math.floor(Math.random() * 1000000));
        applyChain(res.chain);
        report('MUTATE', res);
    });

    undoBtn.addEventListener('click', function() {
        var prev = history.pop();
        refreshUndo();
        if (!prev) return;
        Preset.apply(prev);
        Toast.show('UNDO');
    });

    copyBtn.addEventListener('click', function() {
        var text = Preset.serialize();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function() {
                Toast.show('PRESET COPIED');
            }, function() {
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    });

    /* Older engines, and any context where the async clipboard is refused.
     * The textarea is off screen rather than hidden, because a `display: none`
     * element cannot be selected and the copy silently does nothing. */
    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        var okCopy = false;
        try { okCopy = document.execCommand('copy'); } catch (err) { okCopy = false; }
        document.body.removeChild(ta);
        Toast.show(okCopy ? 'PRESET COPIED' : 'COULD NOT COPY');
    }

    function loadText(text) {
        if (!text) return;
        var res = Preset.parse(text);
        if (!res.ok) {
            Toast.show('BAD PRESET: ' + res.error.toUpperCase());
            return;
        }
        pushHistory();
        Preset.apply(res.preset);
        if (res.dropped.length) {
            Toast.show('LOADED · ' + res.dropped.length + ' UNKNOWN DROPPED');
        } else {
            Toast.show('PRESET LOADED');
        }
    }

    pasteBtn.addEventListener('click', function() {
        // Reading the clipboard needs a permission that is often refused and,
        // in a packaged app, is a question at review time with no good answer.
        // Asking for the text outright always works and needs nothing.
        if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().then(loadText, function() {
                loadText(window.prompt('Paste a preset:') || '');
            });
        } else {
            loadText(window.prompt('Paste a preset:') || '');
        }
    });

    refreshUndo();
})();
