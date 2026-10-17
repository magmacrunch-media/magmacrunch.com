// test-simulation.js — cave diving (not even once)
//
// Loads the REAL game files into a vm context and dives them headlessly. The
// point is not that some model of the game behaves; it is that the shipped
// config.js, world.js, player.js and entities.js behave.
//
// Six properties, in rough order of how expensive they are to get wrong:
//
//   1. dt-invariance      the dive is the same at 60Hz and 120Hz
//   2. air budget         a baseline diver can actually reach the surface
//   3. sight line         hazards are visible for long enough to answer
//   4. clearance          no generated gap is narrower than the diver plus room
//   5. timeline           the segments tile the song with no gap or overlap
//   6. skill gradient     reacting faster actually scores better
//   7. the score          loops keep the beat, and the music follows danger
//                         without thrashing
//
// Six exists because makemecookies shipped a first pass with NO skill gradient
// at all - a simulated player reacting in 700ms scored the same as one at
// 140ms - and only a sweep like this one caught it.

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const JS = path.join(__dirname, '..', 'js');

/** One context holding the real game modules, with no DOM. */
function loadGame() {
    const ctx = vm.createContext({ Math, Date, console, Float32Array, module: undefined });
    for (const f of ['config.js', 'world.js', 'player.js', 'entities.js', 'music.js']) {
        const src = fs.readFileSync(path.join(JS, f), 'utf8')
            // The trailing CommonJS export block is for this harness's benefit
            // when a file is required directly; inside the shared context the
            // declarations are already visible, and `module` is undefined.
            .replace(/if \(typeof module[\s\S]*$/, '');
        vm.runInContext(src, ctx, { filename: f });
    }
    // A top-level `const` in a vm script lands in the global LEXICAL scope, not
    // on the context object, so ctx.CONFIG is undefined however well the file
    // ran. Reading the bindings back out through an expression evaluated in the
    // same scope is what actually reaches them.
    return vm.runInContext(
        '({ CONFIG, SEGMENTS, JUNCTION_MS, Timeline, clamp01, lerp, smoothstep,' +
        '   World, Player, Entities, mulberry32, SLICE, MusicLogic })', ctx);
}

const G = loadGame();
const { CONFIG, SEGMENTS, Timeline, World, Player, Entities, MusicLogic } = G;

const DIVE_MS = CONFIG.DIVE_MS_FALLBACK;

/**
 * Dive once.
 *
 * `reaction` is how many frames the pilot waits before re-reading the cave -
 * the knob the skill sweep turns. `greed` is how far it will detour for a
 * pearl, in cross-axis pixels.
 */
function dive(seed, opts) {
    const o = Object.assign({ dt: 1, reaction: 8, greed: 70, collect: true }, opts || {});
    const world = new World(seed);
    const player = new Player();
    player.x = CONFIG.CANVAS_W / 2;
    player.y = CONFIG.CANVAS_H * CONFIG.RAIL_POS;
    player.fx = 0; player.fy = 1;
    const entities = new Entities(world.entityRng);

    const dtMs = 16.667 * o.dt;
    let elapsed = 0;
    let sinceThink = 0;
    let aim = { x: 0, y: 1, need: 0 };
    let strokeIn = 0;
    let minClearance = Infinity;
    let frames = 0;
    let pocketsTaken = 0, airGained = 0, airWasted = 0;

    while (elapsed < DIVE_MS && !player.dead) {
        const f = elapsed / DIVE_MS;
        const seg = Timeline.segmentAt(f);
        world.update(o.dt, dtMs, f, null);

        sinceThink -= o.dt;
        if (sinceThink <= 0) {
            sinceThink = o.reaction;
            aim = think(world, player, entities, o);
        }

        // Stroke to close a gap, not on a metronome. Air is spent per stroke,
        // so a pilot that mashes at the cooldown burns breath it never needed
        // and the budget it proves is the wrong one.
        const stroke = strokeIn <= 0 && aim.need > 14;
        if (stroke) strokeIn = CONFIG.STROKE_COOLDOWN;
        else strokeIn -= o.dt;

        player.update(o.dt, aim.x, aim.y, stroke, world, null);
        world.confine(player);
        const airBefore = player.air;
        entities.update(o.dt, world, player, seg, f, null);
        if (o.onFrame) o.onFrame({ world, player, entities, seg, f, dtMs });
        if (player.air > airBefore) {
            pocketsTaken++;
            airGained += player.air - airBefore;
            // A pocket taken at high air is mostly thrown away, and that waste
            // is the term the budget is easiest to get wrong on.
            airWasted += CONFIG.POCKET_REFILL - (player.air - airBefore);
        }

        // Property 4, sampled every frame against the passage the generator
        // actually produced rather than against its own intent.
        for (const r of entities.rocks) {
            const b = world.boundsAt(r.s);
            const left = (b.hi - b.lo) - r.depth;
            if (left < minClearance) minClearance = left;
        }

        elapsed += dtMs;
        frames++;
    }

    return {
        surfaced: !player.dead,
        air: player.air,
        pearls: player.pearls,
        hits: player.hits,
        strokes: player.strokes,
        frames,
        minClearance,
        pocketsTaken,
        pocketsSpawned: entities.pocketsSpawned,
        airGained,
        airWasted,
        score: (!player.dead ? Math.round(player.air) * CONFIG.AIR_POINTS : 0) +
               player.pearls * CONFIG.PEARL_POINTS +
               (!player.dead && player.hits === 0 ? CONFIG.NOHIT_BONUS : 0) +
               (!player.dead ? CONFIG.SURFACE_BONUS : 0),
    };
}

/**
 * Pick somewhere to be.
 *
 * Middle of the passage by default, the free lane beside a protrusion when
 * there is one, and a detour when air is low or a pearl is cheap. Steering to
 * the geometric center and nothing else is what a bad player does, and it fails
 * this game on purpose - so the pilot has to be at least this good for the air
 * budget to mean anything.
 */
function think(world, player, entities, o) {
    const vertical = world.axis === 'y';
    const alongScreen = vertical ? player.y : player.x;
    const cross = vertical ? player.x : player.y;
    const here = world.alongAtScreen(alongScreen);
    const railTarget = (vertical ? CONFIG.CANVAS_H : CONFIG.CANVAS_W) * CONFIG.RAIL_POS;

    const b = world.boundsAt(here + 60);
    let lo = b.lo, hi = b.hi;

    // Only the NEAREST protrusion. Folding every rock in the lookahead window
    // into one lane collapses it whenever two rocks face each other from
    // opposite walls, and the fallback then aims at the geometric center -
    // which is to say, straight back into one of them.
    let near = null, nearD = Infinity;
    for (const r of entities.rocks) {
        const d = r.s + r.len - here;
        if (d < -10 || d > 200) continue;
        if (d < nearD) { nearD = d; near = r; }
    }
    if (near) {
        if (near.fromLo) lo = Math.max(lo, near.c + near.depth);
        else hi = Math.min(hi, near.c);
    }
    if (hi - lo < CONFIG.PLAYER_W) { lo = b.lo; hi = b.hi; }
    let crossTarget = (lo + hi) / 2;

    // Falling rock is not covered by the lane: step aside from anything loose
    // and close, on whichever side has more room.
    for (const d of entities.debris) {
        if (d.warn > 0 || d.dead) continue;
        if (Math.abs(d.s - here) > 40 || Math.abs(d.c - cross) > 34) continue;
        crossTarget = (d.c - lo) > (hi - d.c) ? lo + 14 : hi - 14;
    }

    if (o.collect) {
        // Air is always worth taking, so a pocket in range is always chased -
        // an earlier pilot only detoured below 55% and sailed past half of
        // them, which made the budget look far tighter than it is.
        const wantAir = player.air < CONFIG.AIR_MAX * 0.92;
        const pool = wantAir ? entities.pockets : entities.pearls;
        let best = null, bestD = Infinity;
        for (const p of pool) {
            if (p.taken) continue;
            const d = p.s - here;
            if (d < 0 || d > 260) continue;
            const off = Math.abs(p.c - cross);
            if ((wantAir || off < o.greed) && d < bestD) { bestD = d; best = p; }
        }
        // Never chase a prize into a wall: a detour is still clamped to the lane.
        if (best) crossTarget = Math.max(lo + 6, Math.min(hi - 6, best.c));
    }

    const dc = crossTarget - cross;
    const da = railTarget - alongScreen;
    const ax = vertical ? dc : da;
    const ay = vertical ? da : dc;
    const m = Math.hypot(ax, ay) || 1;
    return { x: ax / m, y: ay / m, need: m };
}

// ── 5 · The timeline tiles the song ───────────────────────────────────

test('segments tile the dive with no gap or overlap', () => {
    assert.strictEqual(SEGMENTS[0].at, 0, 'first segment must start at 0');
    for (let i = 1; i < SEGMENTS.length; i++) {
        assert.ok(SEGMENTS[i].at > SEGMENTS[i - 1].at,
            'segment ' + i + ' must start after ' + (i - 1));
        assert.strictEqual(Timeline.endOf(i - 1), SEGMENTS[i].at,
            'segment ' + (i - 1) + ' must end exactly where ' + i + ' starts');
    }
    assert.strictEqual(Timeline.endOf(SEGMENTS.length - 1), 1);
    // Every segment is long enough to be a place rather than a flicker.
    for (let i = 0; i < SEGMENTS.length; i++) {
        const secs = (Timeline.endOf(i) - SEGMENTS[i].at) * DIVE_MS / 1000;
        assert.ok(secs > 8, 'segment ' + i + ' is only ' + secs.toFixed(1) + 's');
    }
});

// ── 3 · The sight line ────────────────────────────────────────────────

test('the lamp shows a hazard for longer than it takes to answer one', () => {
    const need = CONFIG.TELEGRAPH_MIN_FRAMES + CONFIG.REACTION_FRAMES;
    assert.ok(CONFIG.SIGHT_FRAMES >= need,
        'sight line is ' + CONFIG.SIGHT_FRAMES.toFixed(1) + ' frames, need ' + need);
    // The budget is quoted against the fastest scroll and the dimmest lamp, so
    // it must hold for every segment, not just on average.
    for (const seg of SEGMENTS) {
        const frames = (Timeline.lampRadius(seg) - CONFIG.PLAYER_HALF) / Timeline.scrollSpeed(seg);
        assert.ok(frames >= need,
            seg.label + ': ' + frames.toFixed(1) + ' frames of warning, need ' + need);
    }
});

// ── 4 · Clearance ─────────────────────────────────────────────────────

test('no protrusion leaves a gap narrower than the diver plus room', () => {
    for (const seed of [1, 7, 99, 4242, 65535]) {
        const r = dive(seed);
        assert.ok(r.minClearance >= CONFIG.CLEARANCE_MIN - 0.5,
            'seed ' + seed + ' left ' + r.minClearance.toFixed(1) +
            'px, minimum is ' + CONFIG.CLEARANCE_MIN);
    }
});

// ── 1 · dt-invariance ─────────────────────────────────────────────────

test('the dive is the same at 60Hz and at 120Hz', () => {
    // Two claims, tested separately, because they need different tolerances.
    //
    // The integration itself must be timestep-independent: same seed, same
    // fixed input, same answer. Held to a tight bound over a short run.
    for (const seed of [3, 77, 1234]) {
        const a = fixedRun(seed, 1, 600);
        const b = fixedRun(seed, 0.5, 600);
        assert.ok(Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2,
            'seed ' + seed + ' drifted ' + Math.abs(a.x - b.x).toFixed(2) + ',' +
            Math.abs(a.y - b.y).toFixed(2) + 'px over 10s');
        assert.ok(Math.abs(a.air - b.air) < 1.5,
            'seed ' + seed + ' air differs by ' + Math.abs(a.air - b.air).toFixed(2));
    }

    // A full dive is a feedback loop - the pilot steers on what it sees, so
    // sampling twice as often puts it on a measurably different path and the
    // two runs cannot be compared pixel for pixel. What must not change is the
    // OUTCOME.
    for (const seed of [3, 77, 1234]) {
        assert.strictEqual(dive(seed, { dt: 1 }).surfaced, dive(seed, { dt: 0.5 }).surfaced,
            'seed ' + seed + ' surfaced differently at half step');
    }
});

/** Physics only: fixed aim, fixed stroke rhythm, no steering feedback. */
function fixedRun(seed, dt, seconds60) {
    const world = new World(seed);
    const player = new Player();
    player.x = CONFIG.CANVAS_W / 2;
    player.y = CONFIG.CANVAS_H * CONFIG.RAIL_POS;
    player.fx = 0; player.fy = 1;
    const entities = new Entities(world.entityRng);
    const dtMs = 16.667 * dt;
    let elapsed = 0, strokeIn = 0;
    for (let i = 0; i < seconds60 / dt; i++) {
        const f = elapsed / DIVE_MS;
        world.update(dt, dtMs, f, null);
        const stroke = strokeIn <= 0;
        if (stroke) strokeIn = CONFIG.STROKE_COOLDOWN; else strokeIn -= dt;
        player.update(dt, 0.3, 1, stroke, world, null);
        world.confine(player);
        entities.update(dt, world, player, Timeline.segmentAt(f), f, null);
        elapsed += dtMs;
    }
    return { x: player.x, y: player.y, air: player.air };
}

// ── 2 · The air budget ────────────────────────────────────────────────

test('a baseline diver reaches the surface with air to spare', () => {
    const results = [];
    for (const seed of [1, 2, 3, 5, 8, 13, 21, 4242]) {
        results.push(dive(seed, { reaction: 8 }));
    }
    // The ledger is in the message on purpose. "Drowned" on its own says the
    // budget is wrong but not which term is wrong, and the four terms are tuned
    // independently.
    const ledger = (r) => [
        'at ' + (r.frames / 60).toFixed(0) + 's',
        'drain -' + (r.frames * CONFIG.AIR_DRAIN).toFixed(0),
        'strokes ' + r.strokes + ' (-' + (r.strokes * CONFIG.STROKE_AIR).toFixed(0) + ')',
        'hits ' + r.hits + ' (-' + (r.hits * CONFIG.HIT_AIR) + ')',
        'pockets ' + r.pocketsTaken + '/' + r.pocketsSpawned +
            ' (+' + r.airGained.toFixed(0) + ', ' + r.airWasted.toFixed(0) + ' wasted)',
    ].join('  ');

    for (let i = 0; i < results.length; i++) {
        assert.ok(results[i].surfaced, 'baseline diver drowned: ' + ledger(results[i]));
        assert.ok(results[i].air > 2,
            'baseline diver surfaced on fumes: ' + ledger(results[i]));
    }
    // And the budget must not be so generous that air stops being a resource.
    const avg = results.reduce((s, r) => s + r.air, 0) / results.length;
    assert.ok(avg < CONFIG.AIR_MAX * 0.85,
        'air is never under pressure - average surface air ' + avg.toFixed(1));
});

// ── 6 · The skill gradient ────────────────────────────────────────────

test('reacting faster scores better', () => {
    const seeds = [1, 2, 3, 5, 8, 13];
    const mean = (reaction) => {
        let s = 0;
        for (const seed of seeds) s += dive(seed, { reaction }).score;
        return s / seeds.length;
    };
    const fast = mean(6);      // ~100ms
    const slow = mean(42);     // ~700ms
    assert.ok(fast > slow * 1.15,
        'no skill gradient: fast ' + fast.toFixed(0) + ' vs slow ' + slow.toFixed(0));
});

// ── 7 · The score ─────────────────────────────────────────────────────
//
// music.js plays loops of the song chosen by danger. The audio engine needs a
// browser; everything it decides with does not, and is tested here.

const SONG_SEC = CONFIG.DIVE_MS_FALLBACK / 1000;
const BEAT = CONFIG.MUSIC.GRID.BEAT;

test('every loop starts on the beat, lasts whole bars, and fits in the song', () => {
    for (const tier of ['calm', 'unease', 'danger']) {
        const loops = MusicLogic.loops(tier);
        assert.ok(loops.length >= 1, tier + ' has no loop');
        for (const L of loops) {
            const beats = (L.start - CONFIG.MUSIC.GRID.FIRST) / BEAT;
            assert.ok(Math.abs(beats - Math.round(beats)) < 1e-9, tier + ' loop is off the beat');
            const bars = L.len / MusicLogic.bar();
            assert.ok(Math.abs(bars - Math.round(bars)) < 1e-9, tier + ' loop is not whole bars');
            // The seam plays SEAM_FADE past the end, so that must exist too.
            assert.ok(L.end + CONFIG.MUSIC.SEAM_FADE < SONG_SEC, tier + ' loop runs off the song');
            // Long enough that the change-of-loop fade is not most of it.
            assert.ok(L.len >= 4 * MusicLogic.bar(), tier + ' loop is under four bars');
        }
    }
    // The opening plays as written into the first CALM loop, and has to have
    // room for that before it.
    assert.ok(MusicLogic.loops('calm')[0].start > MusicLogic.bar() * 2);
});

test('next bar lines and the beat grid are where they say', () => {
    const b = MusicLogic.bar();
    assert.strictEqual(MusicLogic.nextBar(10, 10), 10);
    assert.ok(Math.abs(MusicLogic.nextBar(10, 10.01) - (10 + b)) < 1e-9);
    // An intro's anchor is in the future; its bar lines count back from it.
    assert.ok(Math.abs(MusicLogic.nextBar(20, 3) - (20 - Math.floor(17 / b) * b)) < 1e-9);
    const p = MusicLogic.nearestBeat(77.7);
    assert.ok(Math.abs(p - 77.7) <= BEAT / 2 + 1e-9);
});

/** Danger for a calm diver in segment seg: full air, nothing happening. */
function quietDanger(seg, extra) {
    return MusicLogic.dangerFrom(Object.assign({
        air: CONFIG.AIR_MAX, dark: seg.dark, narrow: seg.narrow,
        stun: 0, shake: 0, debris: false, silt: false,
    }, extra || {}));
}

test('the cave alone never reaches DANGER; trouble does', () => {
    for (const seg of SEGMENTS) {
        const t = MusicLogic.tierFor('calm', quietDanger(seg));
        assert.notStrictEqual(t, 'danger', seg.label + ' is DANGER with nothing happening');
    }
    assert.strictEqual(MusicLogic.tierFor('calm', quietDanger(SEGMENTS[0])), 'calm',
        'the entry should be CALM');
    const deep = SEGMENTS.find((s) => s.label === 'THE DEEP');
    assert.strictEqual(MusicLogic.tierFor('calm', quietDanger(deep)), 'unease',
        'the deep should be UNEASE even when nothing is happening');
    const entry = SEGMENTS[0];
    assert.strictEqual(MusicLogic.tierFor('calm', quietDanger(entry, { air: CONFIG.AIR_PANIC })), 'danger',
        'reaching the panic line is DANGER anywhere');
    assert.strictEqual(MusicLogic.tierFor('calm', quietDanger(entry, { stun: 5 })), 'danger',
        'a hit is DANGER anywhere');
    assert.strictEqual(MusicLogic.tierFor('calm', quietDanger(entry, { shake: 10 })), 'danger',
        'the collapse is DANGER');
});

test('a danger hovering on a threshold does not flick the tier', () => {
    let tier = 'calm', changes = 0;
    for (let i = 0; i < 400; i++) {
        const d = CONFIG.MUSIC.TIER_UP.unease + (i % 2 ? 0.03 : -0.03);
        const next = MusicLogic.tierFor(tier, d);
        if (next !== tier) changes++;
        tier = next;
    }
    assert.ok(changes <= 1, 'flicked ' + changes + ' times');
});

test('a spike goes straight to DANGER, not by way of UNEASE', () => {
    // Seen in the browser before the settle window existed: the UNEASE line
    // is crossed first, and a change committed there blocks DANGER for a bar.
    const bar = MusicLogic.bar();
    for (const phase of [0, 0.05, 0.3, 0.9, 1.5]) {
        const c = { tier: 'calm', pending: null, busyUntil: 0, holdUntil: 0 };
        let danger = 0.1, first = null;
        for (let t = 10 + phase; t < 16 && !first; t += 1 / 60) {
            danger = MusicLogic.smooth(danger, 0.9, 1 / 60);
            const go = MusicLogic.conduct(c, danger, t, 0.15, (x) => Math.ceil(x / bar) * bar);
            if (go) first = go.tier;
        }
        assert.strictEqual(first, 'danger', 'phase ' + phase + ': first change was ' + first);
    }
});

test('the finale ends with the dive, on the beat', () => {
    const at = SEGMENTS.find((s) => s.kind === 'ascent').at;
    const remaining = SONG_SEC * (1 - at);
    const pos = MusicLogic.finaleEntry(SONG_SEC, remaining);
    const beats = (pos - CONFIG.MUSIC.GRID.FIRST) / BEAT;
    assert.ok(Math.abs(beats - Math.round(beats)) < 1e-9, 'finale enters off the beat');
    // The song ends within half a beat of the dive, which the clock bends to.
    assert.ok(Math.abs((SONG_SEC - pos) - remaining) <= BEAT / 2 + 1e-9);
});

test('over a real dive the music moves, and does not thrash', () => {
    const report = [];
    for (const seed of [1, 7, 99, 4242]) {
        let danger = 0, t = 0;
        let changes = 0, collapseTier = null, collapseAt = null;
        // The engine's own conductor, with bar lines on a plain grid from 0.
        const c = { tier: 'calm', pending: null, busyUntil: 0, holdUntil: 0 };
        const bar = MusicLogic.bar();
        const time = { calm: 0, unease: 0, danger: 0 };
        dive(seed, {
            onFrame({ world, player, entities, seg, dtMs }) {
                const sec = dtMs / 1000;
                t += sec;
                danger = MusicLogic.smooth(danger, MusicLogic.dangerFrom({
                    air: player.air, dark: seg.dark, narrow: seg.narrow,
                    stun: player.stun, shake: world.shake,
                    debris: entities.debris.some((d) => d.warned && !d.dead),
                    silt: false,
                }), sec);
                if (MusicLogic.conduct(c, danger, t, 0.15, (x) => Math.ceil(x / bar) * bar)) changes++;
                const tier = c.tier;
                time[tier] += sec;
                // What the music did in the few seconds after the way back shut.
                if (world.collapseFired && collapseAt === null) collapseAt = t;
                if (collapseAt !== null && t - collapseAt < 6 && collapseTier !== 'danger') collapseTier = tier;
            },
        });
        const total = time.calm + time.unease + time.danger;
        report.push({ seed, changes, collapseTier, calm: time.calm / total, unease: time.unease / total,
            danger: time.danger / total });
    }
    console.log(report.map((r) => 'seed ' + r.seed + ': ' + r.changes + ' changes, calm ' +
        (r.calm * 100).toFixed(0) + '% unease ' + (r.unease * 100).toFixed(0) + '% danger ' +
        (r.danger * 100).toFixed(0) + '%').join('\n'));
    for (const r of report) {
        assert.ok(r.changes >= 2, 'seed ' + r.seed + ': the music never moved');
        assert.ok(r.changes <= 40, 'seed ' + r.seed + ': ' + r.changes + ' tier changes');
        assert.ok(r.calm > 0.1, 'seed ' + r.seed + ': almost never calm');
        assert.ok(r.danger < 0.5, 'seed ' + r.seed + ': DANGER most of the dive');
        // The collapse is the loudest moment in the game; the music must answer it.
        assert.strictEqual(r.collapseTier, 'danger', 'seed ' + r.seed + ': the collapse never reached DANGER');
    }
});
