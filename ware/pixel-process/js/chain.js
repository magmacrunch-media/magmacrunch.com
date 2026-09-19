/* ── chain.js — effect chain: array of effects, processing, reorder, toggle ── */

(function() {
    'use strict';

    var effects = [];
    var _nextId = 0;
    var _rafId = 0;
    var lastFailures = [];   // effect names that threw on the most recent render

    // Effect registry: maps type string to { name, fn, defaults }
    var registry = {};

    function register(type, def) {
        registry[type] = def;
    }

    function addEffect(type) {
        var def = registry[type];
        if (!def) return null;

        var params = {};
        for (var k in def.defaults) {
            params[k] = def.defaults[k];
        }

        var effect = {
            id: _nextId++,
            type: type,
            name: def.name,
            fn: def.fn,
            params: params,
            enabled: true
        };

        effects.push(effect);
        return effect;
    }

    function removeEffect(id) {
        for (var i = 0; i < effects.length; i++) {
            if (effects[i].id === id) {
                effects.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    function toggleEffect(id) {
        for (var i = 0; i < effects.length; i++) {
            if (effects[i].id === id) {
                effects[i].enabled = !effects[i].enabled;
                return effects[i].enabled;
            }
        }
        return null;
    }

    function moveEffect(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= effects.length) return;
        if (toIndex < 0 || toIndex >= effects.length) return;
        var item = effects.splice(fromIndex, 1)[0];
        effects.splice(toIndex, 0, item);
    }

    function getEffect(id) {
        for (var i = 0; i < effects.length; i++) {
            if (effects[i].id === id) return effects[i];
        }
        return null;
    }

    function getEffects() {
        return effects;
    }

    function clearEffects() {
        effects = [];
    }

    /* ── Resolution independence ──────────────────────────────────────────

       Every spatial parameter in this tool is written in pixels: a channel
       shift of 3, a block 16 across, a feedback offset of 2. Handed to a
       larger image unchanged, all of them shrink relative to the picture, so
       the same chain looks weaker the bigger you render it. Changing WORK SIZE
       from 256 to 1024 today quarters the apparent strength of most of a
       chain, and it is the same fault that would make "preview small, export
       large" wrong rather than merely approximate.

       So parameters are declared against a reference resolution and scaled to
       the real one here, in one place, rather than inside twelve effect
       functions. An effect says which of its parameters are lengths (scaling
       with the image) and which are frequencies (scaling inversely, being
       cycles per pixel). Anything unlisted is a count, a ratio, an angle or a
       level, and is passed through untouched.

       REFERENCE is 256 because that is the size this tool opens at and the
       size its defaults were plainly tuned at, so the factor is exactly 1 in
       the default workspace. This changes nothing about how the app looks
       where most of the tuning happens, and only begins acting once you leave
       that size. Choosing 1024 instead would have quietly weakened every
       existing chain by four.

       The long edge, rather than width and height separately: scaling x by w
       and y by h would skew a diagonal shift on a non-square image, turning a
       change of resolution into a different picture instead of the same one
       larger. */
    var REFERENCE = 256;

    function scaleFactor(w, h) {
        return Math.max(w, h) / REFERENCE;
    }

    /* A copy of `params` with its spatial entries scaled for a w by h render.

       Always a copy. The live object belongs to an effect card and the UI
       reads it back to draw the sliders, so scaling in place would drag every
       slider a little further along on each re-render. */
    function scaleParams(type, params, w, h) {
        var out = {};
        for (var k in params) out[k] = params[k];

        var def = registry[type];
        var spec = def && def.spatial;
        if (!spec) return out;

        var f = scaleFactor(w, h);
        if (f === 1) return out;

        var i, key;
        if (spec.lengths) {
            for (i = 0; i < spec.lengths.length; i++) {
                key = spec.lengths[i];
                if (typeof out[key] === 'number') out[key] = out[key] * f;
            }
        }
        if (spec.frequencies) {
            for (i = 0; i < spec.frequencies.length; i++) {
                key = spec.frequencies[i];
                if (typeof out[key] === 'number') out[key] = out[key] / f;
            }
        }
        return out;
    }

    // Process source through all enabled effects in order
    // sourceImageData is NOT copied — caller must provide a fresh copy
    /* A throwing effect used to take the whole render with it: the exception
       escaped renderImmediate, Canvas.display never ran so the image froze on
       the previous frame, and updateStat never ran so the counter kept
       reporting the old chain. The result was an app that looked wedged with
       nothing said about why, and every later render threw again at the same
       effect.

       An effect that fails is now skipped and flagged instead. The chain
       carries on with the pixels it already had, which is what the user can
       still work with, and the failure is surfaced rather than swallowed. */
    function process(sourceImageData, w, h) {
        if (!sourceImageData) return null;

        var current = sourceImageData;
        var failed = [];

        for (var i = 0; i < effects.length; i++) {
            var e = effects[i];
            if (!e.enabled) continue;

            var out = new ImageData(w, h);
            try {
                e.fn(current.data, out.data, scaleParams(e.type, e.params, w, h), w, h);
                current = out;
            } catch (err) {
                // Keep `current` as it was: `out` is half-written and would
                // put torn pixels through the rest of the chain.
                failed.push(e.name || e.id || 'effect ' + (i + 1));
                console.error('pixel-process: effect failed, skipping', e, err);
            }
        }

        lastFailures = failed;
        return current;
    }

    // Full render: get source, process, display
    function renderImmediate() {
        if (_rafId) { cancelAnimationFrame(_rafId); _rafId = 0; }

        var source = Canvas.getSourceImageData();
        if (!source) return;

        var w = Canvas.getWidth();
        var h = Canvas.getHeight();
        var result = process(source, w, h);
        if (result) {
            Canvas.display(result);
        }

        UI.updateStat();
    }

    // Debounced render via requestAnimationFrame
    function render() {
        if (_rafId) return;
        _rafId = requestAnimationFrame(function() {
            _rafId = 0;
            renderImmediate();
        });
    }

    /* The names of the effects skipped by the most recent `process`, and the
       reason this file no longer draws the chrome itself.

       `updateStat` used to read `document` from here, which made this whole
       module unloadable anywhere without a DOM: not in a Worker, where the
       full-resolution export has to run, and not under `node`, where
       tests/test-effects.js pins every effect's output. Neither was worth
       giving up to save one function call, so the counter moved to ui.js and
       the core answers the question instead of rendering the answer.

       Returns a copy: a caller that sorted or spliced the real array in place
       would be editing this module's state through a getter. */
    function getLastFailures() {
        return lastFailures.slice();
    }

    function countEnabled() {
        var n = 0;
        for (var i = 0; i < effects.length; i++) {
            if (effects[i].enabled) n++;
        }
        return n;
    }

    function getRegistry() {
        return registry;
    }

    /* Seeded PRNG (mulberry32), shared by the effects that take a `seed`
       parameter — corrupt and displace each carried an identical copy.
       It lives on Chain because every effect file already depends on Chain
       and this file loads ahead of all of them.

       Do not "improve" the arithmetic: a saved seed has to keep producing
       the same image, so any change here silently rewrites every result a
       user has bookmarked. */
    function rng(seed) {
        var s = seed | 0;
        return function() {
            s = s + 0x6D2B79F5 | 0;
            var t = Math.imul(s ^ s >>> 15, 1 | s);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    window.Chain = {
        register: register,
        rng: rng,
        addEffect: addEffect,
        removeEffect: removeEffect,
        toggleEffect: toggleEffect,
        moveEffect: moveEffect,
        getEffect: getEffect,
        getEffects: getEffects,
        clearEffects: clearEffects,
        countEnabled: countEnabled,
        REFERENCE: REFERENCE,
        scaleParams: scaleParams,
        getLastFailures: getLastFailures,
        process: process,
        render: render,
        renderImmediate: renderImmediate,
        getRegistry: getRegistry
    };
})();
