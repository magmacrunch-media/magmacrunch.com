/* ── preset.js — chains as records, and chains from seeds ── */

(function() {
    'use strict';

    /* Two things live here, and they answer two different needs.
     *
     * A PRESET is a record: an exact, versioned, validated description of a
     * source and a chain, which reproduces a picture rather than merely
     * describing one. It is what you keep.
     *
     * A SEED is a handle: one integer from which a whole chain is generated.
     * It is what you explore with. Rolling a new seed is a new look; typing an
     * old one back gets that look again.
     *
     * The interesting part is what sits between the two. A chain drawn purely
     * at random is mostly mud: effects that cancel, parameters at the ends of
     * their ranges, thresholds that flatten the image to two colours. Taste
     * narrows the ranges, but taste cannot be checked. So every generated chain
     * is RENDERED against a standard probe image and measured, and one that
     * does not visibly change the picture, or that flattens it, is rejected and
     * the search moves on. The dice propose; a measurement disposes.
     *
     * That measurement is the reason a random button here is worth having, and
     * it is checkable: tests/test-effects.js runs hundreds of seeds and asserts
     * every accepted chain clears the bar, and reports the rejection rate.
     */

    var VERSION = 1;

    /* Candidates are judged against YOUR image, downscaled, and not against a
     * fixed internal one. That was the other way round, and the evidence
     * changed it.
     *
     * The first version used a fixed probe so that a seed would name the same
     * chain for everyone, and the comment here claimed the cost of judging on
     * a representative image rather than yours was small, on the grounds that
     * flattening is a property of the chain rather than the picture. Six rolls
     * rendered over a greyscale perlin source settled that: two of the six came
     * out flat blue and solid black, having cleared the bar comfortably on a
     * colourful probe. A third of rolls being duds is not a small cost.
     *
     * So the bar is measured where it matters. What is given up is that a seed
     * now names a chain only for a given source, since the search rejects
     * different candidates on different pictures. That is the right thing to
     * give up: the portable artefact is the preset, which records the chain
     * itself and reproduces exactly anywhere, and a seed is for exploring your
     * own image rather than for sharing.
     *
     * The built-in probe below stays as the fallback for when no source is
     * loaded, and is what the tests measure against so they remain
     * deterministic.
     */
    var PROBE = 96;
    var probeCache = null;

    function probeImage() {
        if (probeCache) return probeCache;
        var w = PROBE, h = PROBE;
        var px = new Uint8ClampedArray(w * h * 4);
        var diag = Math.sqrt(w * w + h * h);
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var i = (y * w + x) * 4;
                var dx = x - w / 2, dy = y - h / 2;
                var r = (Math.sqrt(dx * dx + dy * dy) * 2) / diag;
                px[i] = Math.round(255 * x / (w - 1));
                px[i + 1] = Math.round(255 * y / (h - 1));
                px[i + 2] = Math.round(255 * (1 - Math.min(1, r)));
                px[i + 3] = 255;
            }
        }
        // Hard edges and a fine checker, so an effect that only acts on flat
        // areas and one that only acts on detail both register.
        var blocks = [[0.08, 0.10, 0.24, 0.22, 250, 40, 20], [0.60, 0.18, 0.26, 0.20, 20, 220, 90]];
        for (var b = 0; b < blocks.length; b++) {
            var q = blocks[b];
            for (var by = Math.round(q[1] * h); by < Math.min(h, Math.round((q[1] + q[3]) * h)); by++) {
                for (var bx = Math.round(q[0] * w); bx < Math.min(w, Math.round((q[0] + q[2]) * w)); bx++) {
                    var bi = (by * w + bx) * 4;
                    px[bi] = q[4]; px[bi + 1] = q[5]; px[bi + 2] = q[6]; px[bi + 3] = 255;
                }
            }
        }
        for (var cy = Math.round(0.62 * h); cy < Math.min(h, Math.round(0.90 * h)); cy++) {
            for (var cx = Math.round(0.20 * w); cx < Math.min(w, Math.round(0.50 * w)); cx++) {
                var ci = (cy * w + cx) * 4;
                var v = ((cx + cy) & 1) === 0 ? 240 : 20;
                px[ci] = v; px[ci + 1] = v; px[ci + 2] = v; px[ci + 3] = 255;
            }
        }
        probeCache = px;
        return px;
    }

    // ── Taste ──

    /* Narrower than the sliders allow, and only where the full range is a
     * worse place to land at random than a subset of it. Everything not listed
     * samples its declared slider range, so a new effect needs no entry here
     * and gets sane behaviour by default. An enum is always sampled uniformly
     * over its options; taste does not apply to a choice of axis.
     *
     * This is the one file in the tool where a judgement about what looks good
     * is written down, which is why it is a single table rather than scattered
     * across the effects.
     */
    var TASTE = {
        'channel-shift': { rx: [-14, 14], ry: [-10, 10], gx: [-10, 10], gy: [-8, 8], bx: [-14, 14], by: [-10, 10] },
        'invert': { amount: [30, 100] },
        'posterize': { levels: [2, 8] },
        'threshold': { level: [60, 190] },
        'pixel-sort': { threshold: [40, 170] },
        'row-displace': { amount: [-16, 16], frequency: [2, 14] },
        'wave-distort': { amplitude: [2, 18], frequency: [2, 16] },
        'block-corrupt': { intensity: [10, 70], blockSize: [4, 32], count: [2, 18] },
        'dead-pixels': { density: [5, 60] },
        'fft-filter': { cutoff: [8, 60], width: [4, 30], gain: [0.6, 1.6] },
        'feedback': {
            iterations: [3, 10], decay: [0.45, 0.85],
            offsetX: [-6, 6], offsetY: [-6, 6], scale: [0.94, 1.04], rotation: [-4, 4]
        }
    };

    // Two of these in one chain is rarely better than one and always slower.
    var HEAVY = ['feedback', 'fft-filter'];

    /* The bar, set from the measured distribution rather than guessed.
     *
     * `changed` is the mean absolute difference from the probe across the
     * colour channels: did this do anything at all. `spread` is the standard
     * deviation of the output's luminance: is there still a picture here, or
     * has it gone flat.
     *
     * Over a thousand unfiltered chains, `changed` has a 1st percentile of 7.7,
     * so almost everything changes the image and that test only ever catches
     * the rare chain that cancels itself out. `spread` is the one doing the
     * work: its 25th percentile is 3.9, which is to say a QUARTER of random
     * chains flatten the probe to near-uniform mud. That is the mud this whole
     * mechanism exists to keep off the screen.
     *
     * The spread bar is written as a fraction of the probe's own spread, which
     * is 56.0, rather than as an absolute number, so it keeps meaning the same
     * thing if the probe is ever changed. A quarter of the source's spread
     * rejects 35.7% of raw chains.
     *
     * Twenty-four attempts against a 35.7% rejection rate means the giving-up
     * branch has a probability of about 2e-11, so it is there for correctness
     * rather than because it will be reached.
     */
    var ACCEPT = { changed: 6, spreadFraction: 0.25 };
    var MAX_ATTEMPTS = 24;

    /* The bar is a fraction of THIS probe's own spread, so it says "keep a
     * quarter of the contrast that was there" rather than naming an absolute
     * number that means different things on different pictures. A low contrast
     * source gets a proportionally gentler bar, which is what it should get. */
    function spreadBar(probe) {
        return measure([], probe.px, probe.w, probe.h).spread * ACCEPT.spreadFraction;
    }

    /* The current source, small enough to evaluate two dozen candidates
     * against without anybody noticing. 96 on the long edge costs about a
     * millisecond a candidate and is ample for telling a picture from mud. */
    var scratch = null;

    function sourceProbe() {
        var full = (window.Canvas && Canvas.hasSource && Canvas.hasSource())
            ? Canvas.getSourceImageData() : null;
        if (!full) return { px: probeImage(), w: PROBE, h: PROBE };

        var scale = PROBE / Math.max(full.width, full.height);
        var w = Math.max(8, Math.round(full.width * scale));
        var h = Math.max(8, Math.round(full.height * scale));

        if (!scratch) scratch = document.createElement('canvas');
        var big = document.createElement('canvas');
        big.width = full.width;
        big.height = full.height;
        big.getContext('2d').putImageData(full, 0, 0);

        scratch.width = w;
        scratch.height = h;
        var g = scratch.getContext('2d', { willReadFrequently: true });
        g.drawImage(big, 0, 0, w, h);
        return { px: g.getImageData(0, 0, w, h).data, w: w, h: h };
    }

    function quantize(v, step, lo, hi) {
        if (!step) step = 1;
        var q = lo + Math.round((v - lo) / step) * step;
        if (q < lo) q = lo;
        if (q > hi) q = hi;
        // Repeated addition of a fractional step leaves dust like
        // 0.7000000000000001, which then shows up in a preset and in a slider.
        return Math.round(q * 1e6) / 1e6;
    }

    function randomParams(type, rng) {
        var defs = (window.UI && UI.effectUI[type]) || [];
        var over = TASTE[type] || {};
        var out = {};
        for (var i = 0; i < defs.length; i++) {
            var d = defs[i];
            if (d.labels) {
                var steps = Math.round((d.max - d.min) / d.step);
                out[d.key] = d.min + Math.floor(rng() * (steps + 1)) * d.step;
                continue;
            }
            var range = over[d.key];
            var lo = range ? range[0] : d.min;
            var hi = range ? range[1] : d.max;
            out[d.key] = quantize(lo + rng() * (hi - lo), d.step, lo, hi);
        }
        return out;
    }

    /* Types are taken in sorted order, never registry order, so a seed does not
     * change meaning if the page ever loads the effect files in a different
     * sequence. Adding a NEW effect does change what every seed produces, since
     * it enlarges the pool; that is unavoidable and it is why a preset records
     * the chain itself rather than only the seed. */
    function effectTypes() {
        var types = [];
        var registry = Chain.getRegistry();
        for (var k in registry) types.push(k);
        return types.sort();
    }

    function buildChain(rng) {
        var pool = effectTypes();
        for (var i = pool.length - 1; i > 0; i--) {
            var j = Math.floor(rng() * (i + 1));
            var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
        }

        var want = 2 + Math.floor(rng() * 3);
        var chain = [];
        var heavy = 0;
        for (var k = 0; k < pool.length && chain.length < want; k++) {
            if (HEAVY.indexOf(pool[k]) !== -1) {
                if (heavy) continue;
                heavy++;
            }
            chain.push({ type: pool[k], params: randomParams(pool[k], rng), enabled: true });
        }
        return chain;
    }

    /* Run a chain over raw pixels without touching the live chain or the pool
     * that Chain.process owns. Deliberately its own little loop: evaluating a
     * candidate must not disturb what the user is looking at. */
    function runOver(chain, src, w, h) {
        var registry = Chain.getRegistry();
        var a = new Uint8ClampedArray(src);
        var b = new Uint8ClampedArray(src.length);
        for (var i = 0; i < chain.length; i++) {
            var def = registry[chain[i].type];
            if (!def) continue;
            try {
                def.fn(a, b, Chain.scaleParams(chain[i].type, chain[i].params, w, h), w, h);
            } catch (err) {
                continue;
            }
            var swap = a; a = b; b = swap;
        }
        return a;
    }

    function measure(chain, src, w, h) {
        var out = runOver(chain, src, w, h);
        var diff = 0, n = 0, sum = 0, sumSq = 0;
        for (var i = 0; i < out.length; i += 4) {
            diff += Math.abs(out[i] - src[i]) + Math.abs(out[i + 1] - src[i + 1]) + Math.abs(out[i + 2] - src[i + 2]);
            var lum = out[i] * 0.299 + out[i + 1] * 0.587 + out[i + 2] * 0.114;
            sum += lum;
            sumSq += lum * lum;
            n++;
        }
        var mean = sum / n;
        return {
            changed: diff / (n * 3),
            spread: Math.sqrt(Math.max(0, sumSq / n - mean * mean))
        };
    }

    /* A seed to a chain, with the rejected candidates counted.
     *
     * The user's seed is the starting point of a short search rather than a
     * direct index, so a seed that happens to land on a dud still returns
     * something worth looking at. The search is deterministic, so the same seed
     * still gives the same answer.
     */
    /* Seed and attempt MIXED, never added.
     *
     * The first version advanced the search with `seed + attempt`, which walked
     * straight into the next seed's starting point: any seed whose first
     * candidate was rejected produced exactly the chain of seed + 1. With a
     * third of candidates rejected, that made a third of adjacent seed pairs
     * identical. A test asking whether 12345 and 12346 differ caught it; they
     * did not.
     *
     * Mixing instead means a rejection moves the search somewhere unrelated,
     * so neighbouring seeds stay independent while the whole thing stays
     * deterministic.
     */
    function searchSeed(seed, attempt) {
        var x = (seed ^ 0x9E3779B9) | 0;
        x = (x + Math.imul(attempt + 1, 0x85EBCA6B)) | 0;
        x = x ^ (x >>> 15);
        return Math.imul(x, 0x2545F491) | 0;
    }

    function fromSeed(seed, probe) {
        if (!probe) probe = sourceProbe();
        var bar = spreadBar(probe);
        var s = (seed >>> 0);
        var chain = null, m = null;
        for (var attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            var rng = Chain.rng(searchSeed(s, attempt));
            chain = buildChain(rng);
            m = measure(chain, probe.px, probe.w, probe.h);
            if (m.changed >= ACCEPT.changed && m.spread >= bar) {
                return { seed: seed, chain: chain, rejected: attempt, measured: m, belowBar: false };
            }
        }
        // Hand back the last candidate rather than nothing. A chain below the
        // bar is still better than an empty workspace, and `belowBar` says so
        // instead of pretending.
        return { seed: seed, chain: chain, rejected: MAX_ATTEMPTS, measured: m, belowBar: true };
    }

    /* A VARIATION on a chain, rather than a fresh one.

     * This is the other half of the dice, and the more useful half once you
     * have something you half like. Every numeric parameter drifts by up to an
     * eighth of its range, so the result is recognisably the same look; an enum
     * flips outright now and then, because there is no such thing as drifting
     * halfway between a horizontal and a vertical sort. About a third of the
     * time one structural change lands as well, an effect dropped, added or
     * reordered, which is what stops a line of mutations converging on a single
     * image and going nowhere.
     *
     * The same measured bar applies. A mutation that flattens the picture is
     * rejected exactly like a fresh roll that does, so drifting downhill into
     * mud is not a thing that can happen by accident.
     */
    function addableTypes(chain) {
        var present = {}, heavy = 0;
        for (var i = 0; i < chain.length; i++) {
            present[chain[i].type] = true;
            if (HEAVY.indexOf(chain[i].type) !== -1) heavy++;
        }
        var out = [];
        var all = effectTypes();
        for (var j = 0; j < all.length; j++) {
            if (present[all[j]]) continue;
            if (heavy && HEAVY.indexOf(all[j]) !== -1) continue;
            out.push(all[j]);
        }
        return out;
    }

    function mutateOnce(chain, rng) {
        var out = [];
        for (var i = 0; i < chain.length; i++) {
            var step = chain[i];
            var defs = (window.UI && UI.effectUI[step.type]) || [];
            var params = {};
            for (var k = 0; k < defs.length; k++) {
                var def = defs[k];
                var v = step.params[def.key];
                if (typeof v !== 'number') v = Chain.getRegistry()[step.type].defaults[def.key];
                if (def.labels) {
                    if (rng() < 0.15) {
                        var steps = Math.round((def.max - def.min) / def.step);
                        v = def.min + Math.floor(rng() * (steps + 1)) * def.step;
                    }
                } else {
                    v = v + (rng() * 2 - 1) * (def.max - def.min) * 0.125;
                }
                params[def.key] = quantize(v, def.step, def.min, def.max);
            }
            out.push({ type: step.type, params: params, enabled: step.enabled });
        }

        var roll = rng();
        if (roll < 0.12 && out.length > 2) {
            out.splice(Math.floor(rng() * out.length), 1);
        } else if (roll < 0.24 && out.length < 4) {
            var options = addableTypes(out);
            if (options.length) {
                var pick = options[Math.floor(rng() * options.length)];
                out.splice(Math.floor(rng() * (out.length + 1)), 0,
                    { type: pick, params: randomParams(pick, rng), enabled: true });
            }
        } else if (roll < 0.34 && out.length > 1) {
            var a = Math.floor(rng() * out.length);
            var b = Math.floor(rng() * out.length);
            var t = out[a]; out[a] = out[b]; out[b] = t;
        }
        return out;
    }

    function mutate(chain, seed, probe) {
        if (!chain || !chain.length) return fromSeed(seed, probe);
        if (!probe) probe = sourceProbe();
        var bar = spreadBar(probe);
        var result = null, m = null;
        for (var attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            var rng = Chain.rng(searchSeed(seed, attempt));
            result = mutateOnce(chain, rng);
            m = measure(result, probe.px, probe.w, probe.h);
            if (m.changed >= ACCEPT.changed && m.spread >= bar) {
                return { chain: result, rejected: attempt, measured: m, belowBar: false };
            }
        }
        return { chain: result, rejected: MAX_ATTEMPTS, measured: m, belowBar: true };
    }

    // ── Records ──

    function captureChain() {
        var out = [];
        var effects = Chain.getEffects();
        for (var i = 0; i < effects.length; i++) {
            var params = {};
            for (var k in effects[i].params) params[k] = effects[i].params[k];
            out.push({ type: effects[i].type, params: params, enabled: effects[i].enabled });
        }
        return out;
    }

    function capture() {
        return {
            v: VERSION,
            size: [Canvas.getWidth(), Canvas.getHeight()],
            source: window.App ? App.getSource() : { type: 'image' },
            chain: captureChain()
        };
    }

    function serialize(preset) {
        return JSON.stringify(preset || capture(), null, 2);
    }

    /* Validating rather than trusting, because this is the one input to the
     * tool that arrives as text from somewhere else. An unknown effect type is
     * dropped with a note rather than silently skipped, and every parameter is
     * clamped to the range its own slider declares, so a hand-edited preset
     * cannot push an effect somewhere the UI could never have put it.
     */
    function parse(text) {
        var raw;
        try {
            raw = JSON.parse(text);
        } catch (err) {
            return { ok: false, error: 'not valid JSON' };
        }
        if (!raw || typeof raw !== 'object') return { ok: false, error: 'not a preset' };
        if (raw.v !== VERSION) return { ok: false, error: 'preset version ' + raw.v + ', expected ' + VERSION };
        if (!raw.chain || typeof raw.chain.length !== 'number') return { ok: false, error: 'no chain' };

        var registry = Chain.getRegistry();
        var chain = [];
        var dropped = [];
        for (var i = 0; i < raw.chain.length; i++) {
            var step = raw.chain[i];
            if (!step || !registry[step.type]) { dropped.push(step && step.type); continue; }
            var defs = (window.UI && UI.effectUI[step.type]) || [];
            var params = {};
            for (var d = 0; d < defs.length; d++) {
                var def = defs[d];
                var v = step.params ? step.params[def.key] : undefined;
                if (typeof v !== 'number' || !isFinite(v)) v = registry[step.type].defaults[def.key];
                params[def.key] = quantize(v, def.step, def.min, def.max);
            }
            chain.push({ type: step.type, params: params, enabled: step.enabled !== false });
        }

        var size = null;
        if (raw.size && raw.size.length === 2 &&
            typeof raw.size[0] === 'number' && typeof raw.size[1] === 'number') {
            size = [
                Math.max(16, Math.min(2048, Math.round(raw.size[0]))),
                Math.max(16, Math.min(2048, Math.round(raw.size[1])))
            ];
        }

        return {
            ok: true,
            dropped: dropped,
            preset: { v: VERSION, size: size, source: raw.source || { type: 'image' }, chain: chain }
        };
    }

    /* Put a preset into the workspace. The chain is rebuilt from the
     * description rather than mutated into place, so a preset cannot half
     * apply: either the whole chain is there or the old one still is.
     */
    function apply(preset) {
        if (!preset) return false;

        if (preset.size) {
            Canvas.setSize(preset.size[0], preset.size[1]);
        }
        if (preset.source && window.App) {
            App.setSource(preset.source);
        } else if (preset.size && Canvas.hasSource()) {
            Canvas.reloadSource();
        }

        Chain.clearEffects();
        for (var i = 0; i < preset.chain.length; i++) {
            var made = Chain.addEffect(preset.chain[i].type);
            if (!made) continue;
            made.params = preset.chain[i].params;
            made.enabled = preset.chain[i].enabled;
        }

        if (window.UI) { UI.renderChain(); UI.bindEvents(); }
        Chain.render();
        return true;
    }

    window.Preset = {
        VERSION: VERSION,
        ACCEPT: ACCEPT,
        MAX_ATTEMPTS: MAX_ATTEMPTS,
        PROBE: PROBE,
        TASTE: TASTE,
        HEAVY: HEAVY,
        probeImage: probeImage,
        sourceProbe: sourceProbe,
        spreadBar: spreadBar,
        randomParams: randomParams,
        buildChain: buildChain,
        searchSeed: searchSeed,
        measure: measure,
        fromSeed: fromSeed,
        mutate: mutate,
        capture: capture,
        serialize: serialize,
        parse: parse,
        apply: apply
    };
})();
