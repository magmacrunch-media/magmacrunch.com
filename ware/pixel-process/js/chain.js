/* ── chain.js — effect chain: array of effects, processing, reorder, toggle ── */

(function() {
    'use strict';

    var effects = [];
    var _nextId = 0;
    var _rafId = 0;

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

    // Process source through all enabled effects in order
    // sourceImageData is NOT copied — caller must provide a fresh copy
    function process(sourceImageData, w, h) {
        if (!sourceImageData) return null;

        var current = sourceImageData;

        for (var i = 0; i < effects.length; i++) {
            var e = effects[i];
            if (!e.enabled) continue;

            var out = new ImageData(w, h);
            e.fn(current.data, out.data, e.params, w, h);
            current = out;
        }

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

        updateStat();
    }

    // Debounced render via requestAnimationFrame
    function render() {
        if (_rafId) return;
        _rafId = requestAnimationFrame(function() {
            _rafId = 0;
            renderImmediate();
        });
    }

    function updateStat() {
        var enabledCount = 0;
        for (var i = 0; i < effects.length; i++) {
            if (effects[i].enabled) enabledCount++;
        }
        document.getElementById('chainStat').textContent =
            enabledCount + ' EFFECT' + (enabledCount !== 1 ? 'S' : '');
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
        process: process,
        render: render,
        renderImmediate: renderImmediate,
        getRegistry: getRegistry
    };
})();
