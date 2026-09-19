/**
 * test-effects.js -- pixel//process headless effect tests.
 *
 * Every effect is a pure `fn(src, dst, params, w, h)` over typed arrays, with no
 * DOM and no closure over page state. That separation was already true before
 * this file existed, which is the only reason the shipped code can be tested at
 * all. The real `js/chain.js` and the real effect files are loaded into a vm
 * context and run. Nothing here reimplements an effect, so nothing here can
 * drift from what ships.
 *
 * ## Why goldens, and why they came first
 *
 * These hashes were captured from untouched source before any refactor, so they
 * are a baseline rather than a description of whatever the code happens to do
 * now. The planned work (a Worker, Float32 buffers, resolution-independent
 * parameters) rewrites how every effect is fed its pixels while promising not to
 * change the pixels themselves. That promise is uncheckable by reading.
 *
 * `js/chain.js` already says the seeded PRNG must not be "improved", because a
 * saved seed has to keep producing the same image. Nothing enforced it. This
 * does.
 *
 * ## Exact hash, then tolerance
 *
 * Several effects call Math.sin, Math.cos or Math.exp, which ECMA-262 leaves
 * implementation-approximated: two engines may differ in the last bit, and the
 * uint8 output can then flip on a rounding boundary. So a golden is checked as
 * an exact sha256 first, and on a miss falls back to a 4x4 block-mean signature
 * per channel at a tolerance well under one level. A real change to an effect
 * moves those means by far more than the tolerance; a last-bit difference cannot
 * move them at all. The run prints how many goldens passed on tolerance rather
 * than exactly, because that number silently rising is the one way this could
 * decay into a check that passes by finding nothing.
 *
 * Verified 2026-09-19 across two platforms AND two node majors, since either
 * could carry a different V8: Windows (node 24.19.0) and Linux under WSL (node
 * 20.20.2) agree on all 13 goldens exactly, so the tolerance path is currently
 * unused. CI runs ubuntu-latest, which is the case that matters.
 *
 * ## What is deliberately NOT covered
 *
 * `js/generators.js` calls Math.random() for white and perlin noise, so a
 * generator cannot be hashed and a preset naming one cannot reproduce its
 * image. Seeding them is Phase 1 work; the two deterministic generators are
 * checked here and the rest wait for the seed.
 *
 * Run: node test-effects.js
 *      node test-effects.js --print    emit a fresh golden table
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const JS_DIR = path.join(__dirname, '..', 'js');
const HTML = path.join(__dirname, '..', 'index.html');

const PRINT = process.argv.includes('--print');

// -- Harness -----------------------------------------------------------------

let passed = 0, failed = 0, tolerated = 0;

function ok(cond, name, detail) {
    if (cond) { passed++; console.log('  PASS  ' + name); }
    else { failed++; console.log('  FAIL  ' + name + (detail ? '\n          ' + detail : '')); }
}

function eq(actual, expected, name) {
    ok(actual === expected, name, `got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
}

// -- Loading the shipped code ------------------------------------------------

/**
 * The effect files are plain scripts that call `Chain.register` on a global, and
 * `chain.js` publishes itself as `window.Chain`. Both work in a vm context whose
 * globalThis is also its `window`.
 *
 * `chain.js` does reach for `Canvas`, `document` and `requestAnimationFrame`,
 * but only inside `render`, `renderImmediate` and `updateStat`, none of which
 * runs here. `ui.js` touches `document` once at load, so the stub below is
 * enough to read its parameter table.
 */
function loadShipped() {
    class ImageDataShim {
        constructor(a, b, c) {
            if (typeof a === 'number') {
                this.width = a; this.height = b;
                this.data = new Uint8ClampedArray(a * b * 4);
            } else {
                this.data = a; this.width = b; this.height = c;
            }
        }
    }

    // A console of its own, forwarding to node's, so a test can silence the
    // shipped code's logging without reaching into the real global.
    const ctx = vm.createContext({
        console: { log: (...a) => console.log(...a), error: (...a) => console.error(...a) },
        ImageData: ImageDataShim,
        document: { getElementById: () => ({ innerHTML: '', appendChild() {}, querySelectorAll: () => [] }) },
    });
    vm.runInContext('var window = globalThis;', ctx);

    const files = [
        'chain.js',
        'effects/channels.js',
        'effects/sort.js',
        'effects/displace.js',
        'effects/corrupt.js',
        'effects/fft.js',
        'effects/feedback.js',
        'generators.js',
        'ui.js',
    ];
    for (const f of files) {
        const src = fs.readFileSync(path.join(JS_DIR, f), 'utf8');
        vm.runInContext(src, ctx, { filename: f });
    }
    return ctx;
}

const ctx = loadShipped();
const Chain = ctx.Chain;
const Generators = ctx.Generators;
const UI = ctx.UI;

// -- The test image ----------------------------------------------------------

/**
 * Deterministic and portable: ramps and a radial term built with sqrt, which
 * IEEE 754 requires to be correctly rounded, plus hard-edged blocks and a 1px
 * checker patch. No sin, cos or exp, so the SOURCE cannot vary between engines
 * even where an effect's own math might.
 *
 * The content is chosen so no effect degenerates into the identity: a flat field
 * would make threshold, sort and the FFT all look like they worked.
 */
function makeSource(w, h) {
    const px = new Uint8ClampedArray(w * h * 4);
    const diag = Math.sqrt(w * w + h * h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const dx = x - w / 2, dy = y - h / 2;
            const r = (Math.sqrt(dx * dx + dy * dy) * 2) / diag;
            px[i] = Math.round((255 * x) / Math.max(1, w - 1));
            px[i + 1] = Math.round((255 * y) / Math.max(1, h - 1));
            px[i + 2] = Math.round(255 * (1 - Math.min(1, r)));
            px[i + 3] = 255;
        }
    }
    // Three saturated blocks: a hard edge for sort and threshold to find.
    const blocks = [
        [0.10, 0.12, 0.22, 0.20, 255, 40, 12],
        [0.58, 0.20, 0.24, 0.18, 10, 220, 90],
        [0.30, 0.62, 0.30, 0.22, 24, 30, 240],
    ];
    for (const [fx, fy, fw, fh, r, g, b] of blocks) {
        const x0 = Math.round(fx * w), y0 = Math.round(fy * h);
        const x1 = Math.min(w, x0 + Math.round(fw * w));
        const y1 = Math.min(h, y0 + Math.round(fh * h));
        for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
                const i = (y * w + x) * 4;
                px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
            }
        }
    }
    // A 1px checker patch, so there is real high-frequency content for the FFT.
    const cx0 = Math.round(0.66 * w), cy0 = Math.round(0.60 * h);
    for (let y = cy0; y < Math.min(h, cy0 + Math.round(0.28 * h)); y++) {
        for (let x = cx0; x < Math.min(w, cx0 + Math.round(0.28 * w)); x++) {
            const i = (y * w + x) * 4;
            const on = ((x + y) & 1) === 0;
            const v = on ? 245 : 15;
            px[i] = v; px[i + 1] = v; px[i + 2] = v; px[i + 3] = 255;
        }
    }
    return px;
}

// -- Golden comparison -------------------------------------------------------

function sha(buf) {
    return crypto.createHash('sha256').update(Buffer.from(buf.buffer, buf.byteOffset, buf.length)).digest('hex').slice(0, 16);
}

/** 4x4 block means per channel: 48 numbers, portable across float rounding. */
function signature(px, w, h) {
    const sig = [];
    for (let c = 0; c < 3; c++) {
        for (let by = 0; by < 4; by++) {
            for (let bx = 0; bx < 4; bx++) {
                const x0 = Math.floor((bx * w) / 4), x1 = Math.floor(((bx + 1) * w) / 4);
                const y0 = Math.floor((by * h) / 4), y1 = Math.floor(((by + 1) * h) / 4);
                let sum = 0, n = 0;
                for (let y = y0; y < y1; y++) {
                    for (let x = x0; x < x1; x++) { sum += px[(y * w + x) * 4 + c]; n++; }
                }
                sig.push(n ? Math.round((sum / n) * 100) / 100 : 0);
            }
        }
    }
    return sig;
}

const SIG_TOL = 0.25;

function checkGolden(name, px, w, h, golden) {
    const h16 = sha(px);
    const sig = signature(px, w, h);
    if (golden && h16 === golden.sha) {
        passed++;
        console.log('  PASS  ' + name + ' golden');
        return;
    }
    if (golden && golden.sig) {
        let worst = 0;
        for (let i = 0; i < sig.length; i++) worst = Math.max(worst, Math.abs(sig[i] - golden.sig[i]));
        if (worst <= SIG_TOL) {
            passed++; tolerated++;
            console.log(`  PASS  ${name} golden (tolerance, max block delta ${worst.toFixed(3)})`);
            return;
        }
        failed++;
        console.log(`  FAIL  ${name} golden\n          sha ${h16}, expected ${golden.sha}\n          max block-mean delta ${worst.toFixed(3)}, tolerance ${SIG_TOL}`);
        return;
    }
    failed++;
    console.log(`  FAIL  ${name} golden\n          no golden recorded; sha is ${h16}`);
}

// -- The cases ---------------------------------------------------------------

/**
 * Explicit parameters, never the registered defaults. A defaults change would
 * otherwise silently change what is being hashed, and the defaults are checked
 * separately below.
 */
const CASES = [
    ['channel-shift', { rx: 5, ry: -2, gx: -3, gy: 4, bx: 7, by: 1 }],
    ['channel-swap', { mode: 2 }],
    ['invert', { amount: 65 }],
    ['posterize', { levels: 5 }],
    ['threshold', { level: 120, colorOut: 1 }],
    ['pixel-sort', { threshold: 90, axis: 0, sortBy: 1, direction: 1 }],
    ['row-displace', { amount: 11, axis: 0, pattern: 2, frequency: 5, seed: 7 }],
    ['wave-distort', { amplitude: 9, frequency: 6, axis: 1, phase: 13 }],
    ['block-corrupt', { intensity: 55, blockSize: 12, count: 9, seed: 3 }],
    ['dead-pixels', { density: 40, color: 0, seed: 11 }],
    ['fft-filter', { filterType: 2, cutoff: 18, width: 9, gain: 1.2 }],
    ['feedback', { iterations: 4, decay: 0.6, offsetX: 3, offsetY: -2, scale: 0.97, rotation: 2 }],
];

const W = 64, H = 64;
const ODD_W = 48, ODD_H = 40;

/**
 * One case above the FFT's internal cap.
 *
 * `effects/fft.js` rounds the transform up to a power of two and then clamps it
 * to 256, so at 64x64 the clamp is dead code and a golden there cannot see it
 * move. 320x288 rounds to 512 and is clamped, which is the only arrangement that
 * exercises it. Found by mutation testing: lowering the cap to 128 left the
 * whole suite green.
 *
 * Only fft-filter is pinned here. block-corrupt, dead-pixels and row-displace
 * place their seeded features in pixel coordinates, so a second size would pin
 * behaviour that the planned move to normalized coordinates is meant to change;
 * that change should update a golden deliberately, not trip over one.
 */
const BIG_W = 320, BIG_H = 288;
const BIG_CASE = ['fft-filter', { filterType: 1, cutoff: 24, width: 12, gain: 1 }];

const GOLDENS = {
  'channel-shift': {
    sha: 'e46992e38e98bdc3',
    sig: [134.49, 143.2, 122.11, 172.73, 104, 95.46, 115.08, 160.08, 85.83, 54.06, 92.46, 148.59, 88.38, 66.63, 120.61, 176.48, 79.17, 78.84, 78.81, 78.81, 67.57, 78.12, 174.16, 85.8, 143.75, 109.25, 130.11, 136.58, 208.44, 104.63, 159.34, 178.8, 36.3, 59.48, 107.9, 79.64, 80.91, 120.38, 181.25, 119.7, 94.01, 168.39, 225.74, 145.54, 57.89, 115.73, 157.02, 105.82],
  },
  'channel-swap': {
    sha: 'b09c08451319992a',
    sig: [34.63, 93.89, 102.09, 60.88, 87.39, 172.29, 156.76, 105.48, 108.27, 211.63, 191.93, 118.65, 61.98, 141.71, 127.42, 80.71, 96.72, 118, 139.38, 215.78, 71.82, 109.38, 98.13, 197.97, 30.31, 63.72, 126.53, 184.1, 30.31, 71.54, 134.31, 192.22, 28.24, 29.48, 51.32, 37.95, 88.55, 92.42, 148.75, 114.55, 160, 100.69, 122.78, 140.31, 224.69, 171.62, 185.5, 195.3],
  },
  'invert': {
    sha: '419d1737b95c2622',
    sig: [136.69, 130.25, 124.02, 101, 144.19, 132.85, 136.45, 106.36, 156.69, 146.78, 127.84, 110.38, 156.69, 144.38, 125.51, 107.97, 157.39, 156.97, 150.41, 154.41, 139.18, 137.98, 121.16, 131.36, 117.81, 135.69, 128.95, 123.58, 98.31, 114.31, 110.05, 107.03, 155.31, 137.55, 135.14, 147.51, 139.48, 114.08, 118.84, 134.12, 133.26, 102.38, 108.18, 130.03, 147.16, 123.29, 127.5, 141.45],
  },
  'posterize': {
    sha: 'ee10b128be388814',
    sig: [95.69, 119.88, 137.09, 214.05, 71.8, 110.92, 92.28, 196.14, 32, 54, 120.62, 183.23, 32, 64.5, 129.59, 191.19, 32, 32, 48.37, 37.95, 96, 96, 142.36, 112.86, 159.5, 81.91, 111.76, 135.64, 223, 164.8, 184.23, 199.19, 33.5, 89, 97.75, 60, 82, 173.2, 147.89, 100.98, 106, 217.09, 195.13, 114.49, 63, 147.45, 127.77, 81.56],
  },
  'threshold': {
    sha: 'feba91af39921a42',
    sig: [28.88, 35.44, 42.71, 64.97, 21.47, 46.47, 83.46, 187.51, 20.1, 55.71, 122.05, 181.52, 30.31, 66.36, 130.89, 190.16, 8.46, 8.86, 35.29, 18.64, 26.67, 42.24, 140.38, 111.46, 92.99, 89.98, 117.55, 137.73, 224.16, 165.22, 181.52, 193.23, 10.51, 28.2, 38.74, 21.2, 26.28, 78.97, 137.25, 101.02, 62.77, 140.62, 159.14, 116.07, 61.83, 90.52, 102.77, 78.65],
  },
  'pixel-sort': {
    sha: '1da21ff4361d84c3',
    sig: [96.72, 118.95, 169.78, 184.42, 105.34, 177.23, 101.91, 92.8, 101.32, 63, 76.12, 164.22, 40.04, 61.81, 134.31, 192.22, 28.24, 29.48, 31.57, 57.71, 88.55, 92.42, 106.07, 157.23, 160, 100.69, 122.78, 140.31, 224.69, 171.62, 185.5, 195.3, 34.63, 93.18, 97.53, 66.16, 87.54, 153.73, 177.23, 103.42, 150.51, 207.39, 160.1, 112.48, 71.6, 132.09, 127.42, 80.71],
  },
  /* Moved 2026-09-19 when the random pattern stopped consuming one PRNG
     value per row. The old value described a picture that changed shape
     with the image height; this one does not. Verified against the
     previous implementation that the two agree exactly at REFERENCE. */
  'row-displace': {
    sha: 'b34bc81555aa810b',
    sig: [120.27, 124.03, 152.34, 173.24, 107.17, 111.42, 99.31, 159.39, 58.54, 68.8, 125.47, 151.86, 57.43, 77.61, 141.74, 151.61, 28.37, 29.34, 48.65, 40.65, 89.03, 96.48, 150.64, 108.12, 154.55, 109.56, 119.07, 140.6, 217.24, 175.74, 188.95, 195.17, 42.8, 99.39, 96.3, 53.01, 99.97, 168.61, 146.69, 106.65, 118.18, 205.67, 189.17, 117.46, 72.25, 138.57, 123.02, 77.97],
  },
  'wave-distort': {
    sha: '3b2dea11197de3c0',
    sig: [128.67, 111.74, 156.36, 204.47, 38.24, 115.63, 83.77, 205.14, 30.31, 70.13, 117.9, 168.83, 31.94, 65.13, 140.32, 211.63, 69.58, 81.47, 88.32, 82.99, 97.93, 83.09, 156.34, 112.59, 163.9, 109.26, 108.23, 132.49, 170.07, 120.39, 155.46, 160.04, 28.96, 96.52, 110.49, 70.23, 102.47, 158.29, 146.66, 108.09, 100.81, 201.59, 197.67, 118.46, 60.02, 163.11, 123.39, 68.94],
  },
  'block-corrupt': {
    sha: '845cde5772077d28',
    sig: [96.72, 105.64, 126.8, 215.78, 71.82, 88.83, 113.32, 222.97, 30.31, 105.64, 115.32, 181.97, 30.31, 60.66, 116.41, 195.98, 28.24, 60.33, 62.86, 37.95, 88.55, 68.84, 132.08, 69, 160, 95.39, 126.12, 134.92, 224.69, 112.53, 187.96, 163.5, 34.63, 81.35, 105.49, 60.88, 87.39, 114.75, 142.92, 50.29, 108.27, 130.31, 177.3, 111.94, 61.98, 180.42, 127.25, 82.83],
  },
  'dead-pixels': {
    sha: '9f7f4cf44e03d5f2',
    sig: [101.63, 117.96, 139.75, 213.11, 75.25, 111.3, 98.5, 196.25, 33.05, 65.63, 129.27, 180.49, 34.6, 74.82, 135.44, 190.83, 34.27, 33.46, 53.38, 38.97, 90.88, 94.31, 147.84, 115.12, 159.84, 101.62, 122.53, 138.33, 222.46, 167.18, 185.09, 194.18, 38.66, 96.4, 101.81, 62.02, 91.22, 169.29, 155.54, 106.56, 108.81, 210.33, 187.22, 116.06, 64.67, 141.3, 127.21, 82.48],
  },
  'fft-filter': {
    sha: '1c70497c863e8f27',
    sig: [42.31, 42.27, 44.57, 83.44, 33.11, 48.39, 42.78, 93.11, 13.43, 28.98, 58.82, 87.88, 14.7, 36.06, 67.3, 97.16, 7.57, 11.55, 23.7, 17.74, 32.24, 40.5, 67.5, 53.64, 65.99, 47.11, 57.08, 65.57, 105.51, 89.6, 94.73, 98.78, 4.19, 30.33, 36.88, 24.69, 32.23, 75.16, 69.3, 48.66, 45.73, 76.68, 76.79, 53.68, 28.48, 48.81, 50.39, 35.72],
  },
  // fft-filter again at BIG_W x BIG_H, where the 256 cap actually engages.
  '__big__': {
    sha: '5ebd7abd0ab0d335',
    sig: [14.25, 15.45, 15.8, 185.76, 9.93, 15.12, 13.54, 178.03, 4.3, 9.44, 29.03, 163.59, 16.89, 48.47, 91.29, 181.58, 3.27, 3.93, 7.74, 30.44, 10.84, 12.56, 20.32, 88.82, 21.01, 15.15, 28.49, 123.25, 126.19, 120.77, 130.75, 184.55, 3, 11.48, 13.25, 46.85, 10.51, 23.54, 21.61, 79.37, 13.89, 27.08, 36.28, 96.32, 27.03, 55.27, 63.81, 73.8],
  },
  'feedback': {
    sha: '8fb9e00f76241226',
    sig: [84.77, 123.47, 167.07, 150.96, 116.87, 109.51, 103.99, 162.84, 42.12, 85.02, 148.57, 140.76, 35.46, 67.63, 142.48, 151.11, 88.59, 79.13, 81.01, 75.02, 70.56, 89.2, 148.32, 92.41, 144.66, 107.82, 129.41, 140.35, 205.94, 141.16, 180.55, 200.09, 48.52, 93.38, 84.65, 46.32, 76.97, 163.59, 128.49, 87.39, 125.09, 216.72, 175.01, 107.28, 84.58, 165.36, 126.09, 69.48],
  },
};

// -- Run ---------------------------------------------------------------------

function run(type, params, w, h, src) {
    const def = Chain.getRegistry()[type];
    const dst = new Uint8ClampedArray(w * h * 4);
    def.fn(src, dst, params, w, h);
    return dst;
}

console.log('\n=== registry ===');

const registry = Chain.getRegistry();
const types = Object.keys(registry).sort();

// Parse the real menu out of index.html. An effect present in one and absent
// from the other is invisible in the app: an unregistered menu entry does
// nothing, and an unlisted effect cannot be reached.
const html = fs.readFileSync(HTML, 'utf8');
const menuStart = html.indexOf('id="addEffectDropdown"');
const menuEnd = html.indexOf('</aside>', menuStart);
ok(menuStart !== -1 && menuEnd !== -1, 'found the add-effect menu in index.html',
    'the markup moved; this parse is what makes the count below mean anything');
const menu = [...html.slice(menuStart, menuEnd)
    .matchAll(/data-value="([a-z-]+)"/g)].map((m) => m[1]).sort();

eq(types.length, 12, '12 effects registered');
eq(menu.length, 12, '12 effects in the add-effect menu');
eq(types.join(','), menu.join(','), 'registry and menu agree');
eq(CASES.length, 12, '12 golden cases defined');
eq(CASES.map((c) => c[0]).sort().join(','), types.join(','), 'every registered effect has a case');

console.log('\n=== parameter tables ===');

// Every registered default must be editable, and every control must have a
// default to read. A mismatch either way ships a slider showing `undefined` or
// a parameter nobody can reach.
for (const type of types) {
    const defaults = Object.keys(registry[type].defaults || {}).sort();
    const controls = (UI.effectUI[type] || []).map((d) => d.key).sort();
    eq(controls.join(','), defaults.join(','), `${type}: controls match defaults`);

    let inRange = true, detail = '';
    for (const d of UI.effectUI[type] || []) {
        const v = registry[type].defaults[d.key];
        if (v < d.min || v > d.max) { inRange = false; detail = `${d.key}=${v} outside [${d.min},${d.max}]`; }
    }
    ok(inRange, `${type}: defaults inside control ranges`, detail);
}

console.log('\n=== seeded PRNG ===');

// chain.js says a saved seed must keep producing the same image. These three
// values are what enforces that. Note the generator advances its state BEFORE
// producing, so they are not the sequence a textbook mulberry32 emits for seed
// 42; they are what this one emits, which is the thing that has to stay fixed.
const rngA = Chain.rng(42);
const first = [rngA(), rngA(), rngA()].map((v) => v.toFixed(12));
eq(first.join(','), '0.601103751920,0.448290558998,0.852465793490', 'seeded PRNG at 42 gives its recorded sequence');

const rngB = Chain.rng(42);
eq([rngB(), rngB(), rngB()].map((v) => v.toFixed(12)).join(','), first.join(','), 'same seed, same sequence');
ok(Chain.rng(43)() !== Chain.rng(42)(), 'different seeds differ');

console.log('\n=== goldens (' + W + 'x' + H + ') ===');

const src = makeSource(W, H);
const srcCopy = Uint8ClampedArray.from(src);
const printed = {};

for (const [type, params] of CASES) {
    const out = run(type, params, W, H, src);

    if (PRINT) {
        printed[type] = { sha: sha(out), sig: signature(out, W, H) };
        continue;
    }
    checkGolden(type, out, W, H, GOLDENS[type]);
}

{
    const bigSrc = makeSource(BIG_W, BIG_H);
    const out = run(BIG_CASE[0], BIG_CASE[1], BIG_W, BIG_H, bigSrc);
    if (PRINT) {
        printed['__big__'] = { sha: sha(out), sig: signature(out, BIG_W, BIG_H) };
    } else {
        checkGolden(`${BIG_CASE[0]} at ${BIG_W}x${BIG_H} (above the FFT cap)`, out, BIG_W, BIG_H, GOLDENS.__big__);
    }
}

if (PRINT) {
    console.log('\nconst GOLDENS = {');
    for (const [type] of [...CASES, ['__big__']]) {
        const g = printed[type];
        console.log(`  '${type}': {`);
        console.log(`    sha: '${g.sha}',`);
        console.log(`    sig: [${g.sig.join(', ')}],`);
        console.log('  },');
    }
    console.log('};');
    process.exit(0);
}

console.log('\n=== invariants ===');

ok(Buffer.from(src.buffer).equals(Buffer.from(srcCopy.buffer)), 'no effect mutated its source');

for (const [type, params] of CASES) {
    const a = run(type, params, W, H, src);
    const b = run(type, params, W, H, src);
    eq(sha(a), sha(b), `${type}: deterministic across runs`);

    let opaque = true, finite = true;
    for (let i = 0; i < a.length; i += 4) {
        if (a[i + 3] !== 255) opaque = false;
        if (!Number.isFinite(a[i]) || !Number.isFinite(a[i + 1]) || !Number.isFinite(a[i + 2])) finite = false;
    }
    ok(opaque, `${type}: output fully opaque`);
    ok(finite, `${type}: output has no NaN`);
}

console.log('\n=== odd, non-power-of-two size (' + ODD_W + 'x' + ODD_H + ') ===');

// The FFT rounds down to a power of two and copies the remainder through, so a
// size that is neither square nor a power of two is the case its edge-fill path
// exists for. Everything else simply must not crash or write a hole.
const oddSrc = makeSource(ODD_W, ODD_H);
for (const [type, params] of CASES) {
    let out = null, err = null;
    try { out = run(type, params, ODD_W, ODD_H, oddSrc); } catch (e) { err = e; }
    if (err) { ok(false, `${type}: runs at ${ODD_W}x${ODD_H}`, String(err && err.message)); continue; }

    let opaque = true, finite = true;
    for (let i = 0; i < out.length; i += 4) {
        if (out[i + 3] !== 255) opaque = false;
        if (!Number.isFinite(out[i])) finite = false;
    }
    ok(opaque && finite, `${type}: runs at ${ODD_W}x${ODD_H}, opaque and finite`);
}

console.log('\n=== chain processing ===');

function imageData(px, w, h) {
    return new ctx.ImageData(Uint8ClampedArray.from(px), w, h);
}

Chain.clearEffects();
Chain.addEffect('invert');
eq(Chain.getEffects().length, 1, 'addEffect appends');

// All-disabled must return the source untouched, which is what makes the toggle
// a bypass rather than a slow no-op.
Chain.getEffects()[0].enabled = false;
let res = Chain.process(imageData(src, W, H), W, H);
eq(sha(res.data), sha(src), 'a disabled effect is a true bypass');

// A throwing effect is skipped and the chain carries on with the pixels it had.
// chain.js documents this as a fix for a real bug: the exception used to escape
// the render, so the image froze on the previous frame with nothing said about
// why. Two inverts with a thrower between them must equal two inverts.
Chain.clearEffects();
Chain.addEffect('invert');
Chain.addEffect('posterize');
Chain.addEffect('invert');
const mid = Chain.getEffects()[1];
mid.fn = function () { throw new Error('deliberate'); };

// chain.js console.errors the skipped effect, which is correct there and pure
// noise here: an expected stack trace in passing output reads as a failure.
const realError = ctx.console.error;
let logged = 0;
ctx.console.error = () => { logged++; };
const withThrow = Chain.process(imageData(src, W, H), W, H);
ctx.console.error = realError;
eq(logged, 1, 'the skipped effect is logged, not swallowed');

// Read the failures straight away. Every `process` resets the list, so the
// comparison chain below would clear it before it could be asserted.
const failures = Chain.getLastFailures ? Chain.getLastFailures() : null;

// The getter hands out a copy. A caller splicing what it got would otherwise be
// editing the core's state through a getter, and the chrome would then disagree
// with the render. Checked here, while the live list is still non-empty: after
// the next `process` it is empty anyway and this would prove nothing.
if (failures) {
    const scratch = Chain.getLastFailures();
    scratch.length = 0;
    eq(Chain.getLastFailures().length, 1, 'getLastFailures returns a copy, not the live array');
}

Chain.clearEffects();
Chain.addEffect('invert');
Chain.addEffect('invert');
const withoutMid = Chain.process(imageData(src, W, H), W, H);

eq(sha(withThrow.data), sha(withoutMid.data), 'a throwing effect is skipped, not fatal');
eq(sha(withThrow.data), sha(src), 'and invert twice is the identity');

ok(failures !== null, 'Chain.getLastFailures exists', 'the core must report failures without touching the DOM');
if (failures) {
    eq(failures.length, 1, 'exactly one failure reported');
    eq(failures[0], 'POSTERIZE', 'the failure is named');
}

// A later render with no failure must clear the list, or the chrome keeps
// reporting a skip that is no longer happening.
Chain.clearEffects();
Chain.addEffect('invert');
Chain.process(imageData(src, W, H), W, H);
if (Chain.getLastFailures) eq(Chain.getLastFailures().length, 0, 'failures clear on a clean render');

console.log('\n=== resolution independence ===');

/**
 * Spatial parameters are written against Chain.REFERENCE and scaled to the real
 * render size by Chain.scaleParams, which Chain.process applies on the way into
 * every effect. Without it the same chain looks weaker the larger you render:
 * changing WORK SIZE from 256 to 1024 quartered the apparent strength of most of
 * a chain, and it is the same fault that would make "preview small, export
 * large" wrong rather than merely approximate.
 */
eq(Chain.REFERENCE, 256, 'REFERENCE is the size the workspace opens at');

{
    const base = { rx: 4, ry: -2, gx: 0, gy: 0, bx: -4, by: 2 };

    // The factor is exactly 1 at REFERENCE, which is what makes this change a
    // no-op everywhere the app is actually tuned.
    const same = Chain.scaleParams('channel-shift', base, 256, 256);
    eq(JSON.stringify(same), JSON.stringify(base), 'at REFERENCE nothing is scaled');

    const big = Chain.scaleParams('channel-shift', base, 512, 512);
    eq(big.rx, 8, 'a length doubles at twice the reference');
    eq(big.by, 4, 'and so does every other one');

    // The long edge decides, so a diagonal shift stays diagonal on a
    // non-square image instead of skewing.
    const wide = Chain.scaleParams('channel-shift', base, 1024, 768);
    eq(wide.rx, 16, 'the long edge sets the factor, not width and height apart');
    eq(wide.ry, -8, 'and it sets it for the vertical axis too');
}

{
    // A frequency is cycles per pixel, so it has to scale the other way or a
    // taller image fits proportionally more waves into the same picture.
    const base = { amplitude: 6, frequency: 8, axis: 0, phase: 12 };
    const big = Chain.scaleParams('wave-distort', base, 512, 512);
    eq(big.amplitude, 12, 'amplitude is a length and doubles');
    eq(big.frequency, 4, 'frequency is a rate and halves');
    eq(big.phase, 12, 'phase is an angle and is left alone');
    eq(big.axis, 0, 'an enum is left alone');
}

{
    // An effect with no spatial parameters must come back untouched, and
    // scaleParams must never hand back the caller's own object: the live params
    // belong to an effect card and the UI reads them back to draw the sliders.
    const base = { levels: 5 };
    const out = Chain.scaleParams('posterize', base, 2048, 2048);
    eq(JSON.stringify(out), JSON.stringify(base), 'an effect with no spatial params is unchanged');
    out.levels = 99;
    eq(base.levels, 5, 'scaleParams returns a copy, never the live params object');

    const shifted = Chain.scaleParams('channel-shift', { rx: 4 }, 512, 512);
    eq(shifted.rx, 8, 'and it still scales when it copies');
}

// Every declared spatial key must exist in that effect's defaults. A typo here
// is silent: the misspelled key is scaled, nothing reads it, and the parameter
// it was meant to name goes on being resolution dependent.
for (const type of types) {
    const spec = registry[type].spatial;
    if (!spec) continue;
    const defaults = registry[type].defaults || {};
    const declared = [].concat(spec.lengths || [], spec.frequencies || []);
    const unknown = declared.filter((k) => !(k in defaults));
    eq(unknown.join(','), '', type + ': every declared spatial key exists in defaults');
    ok(declared.length > 0, type + ': declares at least one spatial key',
        'an empty spatial block should be null instead, so it reads as a decision');
}

/**
 * The property itself, end to end through Chain.process rather than through
 * scaleParams alone.
 *
 * The source is black with a single white column, so after a horizontal shift
 * the displacement reads straight back off the image: the column lands at
 * (x0 + shift) % w. Comparing its NORMALIZED position at two sizes tests the
 * claim directly, which a block-mean comparison cannot. The first attempt used
 * band means over a gradient and reported no improvement at all, because
 * averaging a row of shifted gradient washes out the very shift being measured.
 */
function spikeColumn(w, h) {
    const px = new Uint8ClampedArray(w * h * 4);
    for (let i = 3; i < px.length; i += 4) px[i] = 255;
    const x0 = Math.floor(w / 4);
    for (let y = 0; y < h; y++) {
        const i = (y * w + x0) * 4;
        px[i] = px[i + 1] = px[i + 2] = 255;
    }
    return px;
}

function redSpikeAt(w, h, row) {
    const res = Chain.process(imageData(spikeColumn(w, h), w, h), w, h);
    for (let x = 0; x < w; x++) if (res.data[(row * w + x) * 4] > 200) return x / w;
    return NaN;
}

{
    Chain.clearEffects();
    const e = Chain.addEffect('channel-shift');
    e.params = { rx: 8, ry: 0, gx: 0, gy: 0, bx: 0, by: 0 };

    const at256 = redSpikeAt(256, 256, 128);
    const at512 = redSpikeAt(512, 512, 256);
    const at1024 = redSpikeAt(1024, 1024, 512);

    ok(Number.isFinite(at256) && Number.isFinite(at512), 'the spike is found at both sizes');
    ok(Math.abs(at256 - at512) < 0.002,
        'channel-shift lands in the same place at 256 and 512 (' + at256.toFixed(4) + ' vs ' + at512.toFixed(4) + ')');
    ok(Math.abs(at256 - at1024) < 0.002,
        'and at 1024 (' + at256.toFixed(4) + ' vs ' + at1024.toFixed(4) + ')');
}

{
    /* ROW DISPLACE with the random pattern is the case that needed more than a
       scaled parameter. It called the generator once per row, so a seed
       described finer noise the taller the image: 64 rows consumed 64 values,
       256 rows consumed 256. It now samples a fixed table by normalized
       position instead.

       Measured against the previous implementation: worst normalized offset
       error across 256, 512 and 1024 went from 0.055 to 0.0020, and 0.0020 is
       half a pixel at 256, which is rounding. The bound below sits between the
       two, so it discriminates rather than merely passing. */
    Chain.clearEffects();
    const e = Chain.addEffect('row-displace');
    e.params = { amount: 10, axis: 0, pattern: 2, frequency: 4, seed: 7 };

    let worst = 0;
    for (let s = 0; s < 16; s++) {
        const t = (s + 0.5) / 16;
        const a = redSpikeAt(256, 256, Math.floor(t * 256));
        const b = redSpikeAt(512, 512, Math.floor(t * 512));
        if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
        const wrapped = Math.abs(((a - b + 1.5) % 1) - 0.5);
        if (wrapped > worst) worst = wrapped;
    }
    ok(worst < 0.006,
        'a seeded random displacement describes the same bands at 256 and 512 (worst ' + worst.toFixed(4) + ')',
        'the per-row generator is back, or the table is no longer indexed by normalized position');
}

console.log('\n=== deterministic generators ===');

for (const name of ['color-bars', 'checkerboard']) {
    const a = Generators[name](W, H);
    const b = Generators[name](W, H);
    eq(sha(Uint8ClampedArray.from(a)), sha(Uint8ClampedArray.from(b)), `${name}: deterministic`);
}

/**
 * The seeded sources. These called Math.random() until 2026-09-19, which made
 * them the one part of the tool whose output could not be got back: a saved
 * chain over white noise would have restored the recipe and lost the picture.
 *
 * Three properties, and all three are needed. Same seed reproduces, or a preset
 * is a lie. Different seeds differ, or the seed is being ignored and everything
 * reproduces trivially. And no Math.random survives in the file, which is the
 * only one of the three that a partial conversion could otherwise pass: seeding
 * the grid of a value-noise generator while leaving one stray call would repeat
 * most of the image and still fail no comparison run twice in a row.
 */
for (const name of ['white-noise', 'perlin-noise']) {
    const a = sha(Uint8ClampedArray.from(Generators[name](W, H, 12345)));
    const b = sha(Uint8ClampedArray.from(Generators[name](W, H, 12345)));
    const c = sha(Uint8ClampedArray.from(Generators[name](W, H, 12346)));
    eq(a, b, `${name}: same seed reproduces`);
    ok(a !== c, `${name}: different seeds differ`, 'the seed is being ignored');
}

// Comments are stripped first. The header of generators.js explains that it no
// longer calls Math.random, and naming it there tripped this check on its first
// run, which is a false positive worth not living with.
const genSrc = fs.readFileSync(path.join(JS_DIR, 'generators.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
ok(!/Math\s*\.\s*random/.test(genSrc), 'no Math.random left in generators.js (comments aside)',
    'a stray call reproduces most of an image and still varies, so the checks above can miss it');

// The stylesheet rule that makes the SEED row's `hidden` attribute actually
// hide it is asserted in tests/test-page.js, with the rest of the static
// page guards. It is a fact about style.css, not about the generators.

// The two must not be handed the same picture for the same seed, which is what
// the differing mix constants in generators.js are for.
eq(sha(Uint8ClampedArray.from(Generators['white-noise'](W, H, 99))) ===
   sha(Uint8ClampedArray.from(Generators['perlin-noise'](W, H, 99))), false,
    'the two seeded sources are not correlated at the same seed');

// -- Summary -----------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (tolerated > 0) {
    console.log(`${tolerated} golden(s) matched on tolerance rather than exactly.`);
    console.log('That is float platform variance and is allowed. If the number grows,');
    console.log('check it is not an effect quietly changing behaviour underneath it.');
}
process.exit(failed > 0 ? 1 : 0);
