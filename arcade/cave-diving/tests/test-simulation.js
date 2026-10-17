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
//   2b. pace              rushing is faster and costs air: a real choice
//   2c. the ways out      deeper pays more and risks more; turning back early
//                         is safe; the cave persists; the collapse seals it;
//                         nothing teleports; rock is where it is drawn
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
        '({ CONFIG, SEGMENTS, Timeline, clamp01, lerp, smoothstep,' +
        '   World, Player, Entities, mulberry32, SLICE, MusicLogic, lumpDepth })', ctx);
}

const G = loadGame();
const { CONFIG, SEGMENTS, Timeline, World, Player, Entities, MusicLogic, lumpDepth } = G;

// A dive that has not surfaced by then is stuck, not slow.
const MAX_FRAMES = 60 * 600;

/** What banking at exit i is worth, by main.js's formula. */
function bankScore(player, i) {
    const noHit = player.hits === 0 && player.pearls > 0 ? CONFIG.NOHIT_BONUS : 0;
    return (player.pearls * CONFIG.PEARL_POINTS + noHit) * CONFIG.EXITS[i].mult;
}

/**
 * Dive once.
 *
 * `reaction` is how many frames the pilot waits before re-reading the cave -
 * the knob the skill sweep turns. `greed` is how far it will detour for a
 * pearl, in cross-axis pixels. `bankAt` is the exit the pilot means to leave
 * by (default the far end); any other surface it reaches it dives on from.
 * `turnAt`, an along position, makes it turn round there and swim back out
 * by the entrance: the safe play.
 */
function dive(seed, opts) {
    // The baseline pilot CRUISES: the careful diver the game is tuned for.
    const o = Object.assign({ dt: 1, reaction: 8, greed: 70, collect: true, lead: 30, cruise: true,
        bankAt: CONFIG.EXITS.length - 1, turnAt: null }, opts || {});
    const world = new World(seed);
    const entities = new Entities(world);
    const player = new Player();
    world.placeAtExit(0, player);
    player.fx = 0; player.fy = 1;

    // Property 4, measured on the lumps the generator actually placed, along
    // their whole rounded profile, against the passage they stand in - with
    // EVERY lump at that point counted, both walls, because lumps are long
    // enough to overlap and two facing ones close the gap between them.
    let minClearance = Infinity;
    for (const r of entities.rocks) {
        for (let i = 1; i < 12; i++) {
            const at = r.s + (r.len * i) / 12;
            const b = world.boundsAt(r.k, at);
            let lo = b.wallLo, hi = b.hi;
            for (const o of world.tunnels[r.k].rocks) {
                const dep = lumpDepth(o, at);
                if (o.fromLo) lo = Math.max(lo, b.wallLo + dep); else hi = Math.min(hi, b.hi - dep);
            }
            if (hi - lo < minClearance) minClearance = hi - lo;
        }
    }

    const dtMs = 16.667 * o.dt;
    let sinceThink = 0;
    let aim = { x: 0, y: 1, need: 0, cross: 0 };
    let strokeIn = 0;
    let frames = 0;
    let pocketsTaken = 0, airGained = 0, airWasted = 0;
    let banked = -1;
    let deepest = 0;
    o.dir = 1;

    while (!player.dead && banked < 0 && frames < MAX_FRAMES) {
        const f = world.progress();
        const seg = world.segment();
        world.update(o.dt);
        if (o.turnAt !== null && o.dir > 0 && world.diverAlong >= o.turnAt) {
            o.dir = -1;
            o.bankAt = 0;
        }

        sinceThink -= o.dt;
        if (sinceThink <= 0) {
            sinceThink = o.reaction;
            aim = think(world, player, entities, o);
        }

        // Stroke to close a gap, not on a metronome. Air is spent per stroke,
        // so a pilot that mashes at the cooldown burns breath it never needed
        // and the budget it proves is the wrong one.
        // A cruising pilot only strokes to change lane - dodging, or reaching
        // a pocket - and holds its pace by steering, which costs nothing.
        const stroke = strokeIn <= 0 && (o.cruise ? aim.cross > 18 : aim.need > 14);
        if (stroke) strokeIn = CONFIG.STROKE_COOLDOWN;
        else strokeIn -= o.dt;

        const ox = player.x, oy = player.y;
        player.update(o.dt, aim.x, aim.y, stroke, world, null);
        const contact = world.move(player, ox, oy);
        world.track(player, o.dt, null);
        world.camera(player, o.dt);
        const airBefore = player.air;
        entities.update(o.dt, world, player, null, contact);
        if (o.onFrame) o.onFrame({ world, player, entities, seg, f, dtMs });
        if (player.air > airBefore) {
            pocketsTaken++;
            airGained += player.air - airBefore;
            // A pocket taken at high air is mostly thrown away, and that waste
            // is the term the budget is easiest to get wrong on.
            airWasted += CONFIG.POCKET_REFILL - (player.air - airBefore);
        }
        deepest = Math.max(deepest, world.diverAlong);

        const ex = world.exitAt(player);
        if (ex === o.bankAt) banked = ex;
        else if (ex >= 0) world.placeAtExit(ex, player);   // not this one: dive on

        frames++;
    }

    return {
        surfaced: banked >= 0,
        exit: banked,
        air: player.air,
        pearls: player.pearls,
        hits: player.hits,
        strokes: player.strokes,
        frames,
        deepest,
        minClearance,
        pocketsTaken,
        pocketsSpawned: entities.pockets.length,
        airGained,
        airWasted,
        score: banked >= 0 ? bankScore(player, banked) : 0,
    };
}

/**
 * Pick somewhere to be.
 *
 * The pilot thinks in its current tunnel's frame - along and across - and
 * turns that into a direction on the map, the way a player reads a passage
 * and pushes the stick. Middle of the passage by default, the free lane
 * beside a lump when there is one, a detour for a pearl or a pocket, and up
 * into the alcove when the exit it means to bank at is close. `o.dir` is +1
 * swimming deeper and -1 swimming back out.
 *
 * It steers a DIRECTION, never a point on the screen: an earlier pilot aimed
 * at a fixed point past a push line and swam backwards out of every tunnel.
 */
function think(world, player, entities, o) {
    const dir = o.dir || 1;
    // At a corner, turn: within 60px of the end of this tunnel, aim for a
    // point a little way into the next one (or the previous one, heading
    // home), in that tunnel's frame. A player does this without thinking;
    // a pilot that only ever steered along its own tunnel sat in the corner
    // room until it drowned.
    {
        const k0 = world.cur;
        const t0 = world.tunnels[k0];
        const h0 = world.local(k0, player.x, player.y);
        const last = world.tunnels.length - 1;
        let kn = -1, sn = 0;
        if (dir > 0 && k0 < last && h0.s > t0.E - 60) { kn = k0 + 1; sn = world.tunnels[kn].S + 90; }
        if (dir < 0 && k0 > 0 && h0.s < t0.S + 60) { kn = k0 - 1; sn = world.tunnels[kn].E - 90; }
        if (kn >= 0) {
            const goal = world.toWorld(kn, sn, world.boundsAt(kn, sn).center);
            const ax = goal.x - player.x, ay = goal.y - player.y;
            const m = Math.hypot(ax, ay) || 1;
            return { x: ax / m, y: ay / m, need: Math.min(m, 40), cross: 0 };
        }
    }
    const k = world.cur;
    const t = world.tunnels[k];
    const here = world.local(k, player.x, player.y);
    let da = o.lead * dir;

    const b = world.boundsAt(k, here.s + 60 * dir);
    let lo = b.wallLo, hi = b.hi;

    // Every lump the diver is beside or about to reach narrows the lane from
    // its own wall. Lumps are long enough now to overlap, and a pilot that
    // steered round only the nearest one rammed the other fifteen times. The
    // generator keeps facing lumps CLEARANCE_MIN apart, so the lane cannot
    // close; if it somehow does, fall back to the nearest lump alone.
    let near = null, nearD = Infinity;
    const lane = { lo, hi };
    for (const r of t.rocks) {
        const d = dir > 0 ? r.s + r.len - here.s : here.s - r.s;
        if (d < -10 || d > 200) continue;
        const rb = world.boundsAt(k, r.s + r.len / 2);
        const reach = r.depth * 1.25;
        if (r.fromLo) lane.lo = Math.max(lane.lo, rb.wallLo + reach);
        else lane.hi = Math.min(lane.hi, rb.hi - reach);
        if (d < nearD) { nearD = d; near = r; }
    }
    if (lane.hi - lane.lo >= CONFIG.PLAYER_W) { lo = lane.lo; hi = lane.hi; }
    else if (near) {
        const rb = world.boundsAt(k, near.s + near.len / 2);
        if (near.fromLo) lo = Math.max(lo, rb.wallLo + near.depth * 1.25);
        else hi = Math.min(hi, rb.hi - near.depth * 1.25);
    }
    if (hi - lo < CONFIG.PLAYER_W) { lo = b.wallLo; hi = b.hi; }
    let crossTarget = (lo + hi) / 2;

    // Falling rock is not covered by the lane: step aside from anything loose
    // and close, on whichever side has more room.
    for (const d of entities.debris) {
        if (d.k !== k || d.warn > 0 || d.dead) continue;
        if (Math.abs(d.s - here.s) > 40 || Math.abs(d.c - here.c) > 34) continue;
        crossTarget = (d.c - lo) > (hi - d.c) ? lo + 14 : hi - 14;
    }

    if (o.collect) {
        // Pearls are the score, so they are chased whenever they are cheap.
        // A pocket wins only when the tank actually wants it.
        const wantAir = player.air < CONFIG.AIR_MAX - CONFIG.POCKET_REFILL;
        let best = null, bestD = Infinity;
        const consider = (q, isAir) => {
            if (q.taken || q.k !== k) return;
            const d = (q.s - here.s) * dir;
            if (d < 0 || d > 260) return;
            const off = Math.abs(q.c - here.c);
            if (isAir ? !wantAir : off >= o.greed) return;
            const score = d - (isAir ? 80 : 0);
            if (score < bestD) { bestD = score; best = q; }
        };
        for (const q of entities.pockets) consider(q, true);
        for (const q of entities.pearls) consider(q, false);
        // Never chase a prize into a wall: a detour is still clamped to the lane.
        if (best) crossTarget = Math.max(lo + 6, Math.min(hi - 6, best.c));
    }

    // The exit it means to leave by, when it is an alcove and close: line up
    // under it and swim up into it.
    const goal = world.exits[o.bankAt];
    if (goal && goal.alcove && goal.seg === k && Math.abs(goal.s - here.s) < 140) {
        crossTarget = world.boundsAt(k, goal.s).wallLo - CONFIG.ALCOVE_DEPTH * 0.8;
        da = goal.s - here.s;
    }

    const dc = crossTarget - here.c;
    const ax = t.d.x * da + t.n.x * dc;
    const ay = t.d.y * da + t.n.y * dc;
    const m = Math.hypot(ax, ay) || 1;
    return { x: ax / m, y: ay / m, need: m, cross: Math.abs(dc) };
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
    // Every segment is long enough to be a place rather than a flicker:
    // several screens of cave, and well past its own junction chamber.
    for (let i = 0; i < SEGMENTS.length; i++) {
        const px = (Timeline.endOf(i) - SEGMENTS[i].at) * CONFIG.DIVE_ALONG;
        assert.ok(px > 4 * CONFIG.JUNCTION_ALONG, 'segment ' + i + ' is only ' + px.toFixed(0) + 'px');
    }
});

// ── 3 · The sight line ────────────────────────────────────────────────

test('the lamp shows a hazard for longer than it takes to answer one', () => {
    const need = CONFIG.TELEGRAPH_MIN_FRAMES + CONFIG.REACTION_FRAMES;
    assert.ok(CONFIG.SIGHT_FRAMES >= need,
        'sight line is ' + CONFIG.SIGHT_FRAMES.toFixed(1) + ' frames, need ' + need);
    // The budget is quoted against the cruise and the dimmest lamp, so it must
    // hold for every segment, and for the collapse's creep, which is the one
    // pace the diver does not choose.
    for (const seg of SEGMENTS) {
        const speed = Math.max(CONFIG.CRUISE_SPEED, seg.creep || 0);
        const frames = (Timeline.lampRadius(seg) - CONFIG.PLAYER_HALF) / speed;
        assert.ok(frames >= need,
            seg.label + ': ' + frames.toFixed(1) + ' frames of warning, need ' + need);
        if (seg.creep) assert.ok(seg.creep < CONFIG.CRUISE_SPEED, seg.label + ' creeps faster than a cruise');
    }
    // CRUISE_SPEED is a closed form; hold it to the real physics. Steer only,
    // straight along, and measure distance covered once at terminal speed.
    const p = new Player();
    p.x = 0; p.y = 135; p.fx = 1; p.fy = 0;
    let x0 = 0;
    for (let i = 0; i < 600; i++) {
        if (i === 300) x0 = p.x;
        p.update(1, 1, 0, false, null, null);
        p.air = CONFIG.AIR_MAX;
    }
    const cruise = (p.x - x0) / 300;
    assert.ok(Math.abs(cruise - CONFIG.CRUISE_SPEED) < 0.02,
        'cruise measured ' + cruise.toFixed(3) + ', config says ' + CONFIG.CRUISE_SPEED.toFixed(3));
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
    // OUTCOME. Measured to THE CISTERN, which every one of these reaches with
    // air in hand at both rates. Deeper is a gamble on purpose: seed 3 reaches
    // LAST LIGHT on 1.4 air at 60Hz, and the 120Hz pilot, on a path a pixel
    // different, takes one more hit and does not. That is the tuning working,
    // and says nothing about the integration.
    for (const seed of [3, 77, 1234]) {
        assert.strictEqual(dive(seed, { dt: 1, bankAt: 2 }).surfaced, dive(seed, { dt: 0.5, bankAt: 2 }).surfaced,
            'seed ' + seed + ' surfaced differently at half step');
    }
});

/**
 * Physics only: fixed aim, fixed stroke rhythm, no steering feedback, and no
 * walls. Whether a wall contact lands on one step or the next depends on the
 * step, by design, so a diver driven into rock drifts apart at two rates for
 * reasons that are not the integration. This is about Player's integration
 * and nothing else; the full dive below covers the rest.
 */
function fixedRun(seed, dt, seconds60) {
    const player = new Player();
    player.x = 0; player.y = 0;
    player.fx = 0; player.fy = 1;
    // The rhythm is on TIME, one stroke every 12 frames. Counting it down per
    // step strokes every 11 frames at dt 1 and every 10.5 at dt 0.5, which is
    // the test's rhythm and not the physics.
    let t = 0, lastBeat = -1;
    for (let i = 0; i < seconds60 / dt; i++) {
        const beat = Math.floor(t / 12);
        const stroke = beat !== lastBeat;
        lastBeat = beat;
        t += dt;
        player.update(dt, 0.3 + (seed % 3) * 0.1, 1, stroke, null, null);
    }
    return { x: player.x, y: player.y, air: player.air };
}

// ── 2 · The air budget ────────────────────────────────────────────────

test('the ways out are a ladder: deeper pays more, and costs more', () => {
    const seeds = [1, 2, 3, 5, 8, 13, 21, 4242];
    // The ledger is in the message on purpose. "Drowned" on its own says the
    // budget is wrong but not which term is wrong, and the terms are tuned
    // independently.
    const ledger = (r) => [
        'at ' + (r.frames / 60).toFixed(0) + 's',
        'drain -' + (r.frames * CONFIG.AIR_DRAIN).toFixed(0),
        'strokes ' + r.strokes + ' (-' + (r.strokes * CONFIG.STROKE_AIR).toFixed(0) + ')',
        'hits ' + r.hits + ' (-' + (r.hits * CONFIG.HIT_AIR) + ')',
        'pockets ' + r.pocketsTaken + '/' + r.pocketsSpawned +
            ' (+' + r.airGained.toFixed(0) + ', ' + r.airWasted.toFixed(0) + ' wasted)',
    ].join('  ');

    const last = CONFIG.EXITS.length - 1;
    const means = [];
    for (let i = 1; i <= last; i++) {
        const rs = seeds.map((seed) => dive(seed, { bankAt: i }));
        means.push(rs.reduce((a, r) => a + r.score, 0) / rs.length);
        if (i < last) {
            // A skilled diver gets out of every exit short of the far side.
            for (const r of rs) {
                assert.ok(r.surfaced, CONFIG.EXITS[i].name + ': a skilled diver drowned: ' + ledger(r));
            }
        } else {
            const out = rs.filter((r) => r.surfaced);
            assert.ok(out.length >= 6, 'the far side drowns a skilled diver ' + (8 - out.length) + '/8 times');
            // And it must not be free: the deepest exit is reached on little.
            const air = out.reduce((a, r) => a + r.air, 0) / out.length;
            assert.ok(air < 45, 'the far side is reached on ' + air.toFixed(0) + ' air: it costs nothing');
        }
    }
    for (let i = 1; i < means.length; i++) {
        assert.ok(means[i] > means[i - 1],
            CONFIG.EXITS[i + 1].name + ' pays ' + means[i].toFixed(0) + ', no more than ' +
            CONFIG.EXITS[i].name + ' at ' + means[i - 1].toFixed(0));
    }
});

test('depth sorts divers by skill, and the shallow exits are safe for anyone', () => {
    // A diver reacting in half a second still gets out of the exits before the
    // collapse, and does not get out of the ones after it. That is the gamble:
    // the collapse is where you find out whether you were good enough.
    const seeds = [1, 2, 3, 5, 8, 13, 21, 4242];
    const out = (opts) => seeds.filter((seed) => dive(seed, opts).surfaced).length;
    assert.ok(out({ bankAt: 1, reaction: 30 }) >= 7, 'FIRST LIGHT is not safe for a slow diver');
    assert.ok(out({ bankAt: 2, reaction: 30 }) >= 7, 'THE CISTERN is not safe for a slow diver');
    assert.ok(out({ reaction: 30 }) <= 2, 'the far side does not punish a slow diver');
});

test('turning back early always gets you out, and pays nothing extra', () => {
    for (const seed of [1, 2, 3, 5, 8, 13]) {
        const r = dive(seed, { turnAt: 0.15 * CONFIG.DIVE_ALONG });
        assert.ok(r.surfaced && r.exit === 0, 'seed ' + seed + ' did not make it back to the entrance');
        const noHit = r.hits === 0 && r.pearls > 0 ? CONFIG.NOHIT_BONUS : 0;
        assert.strictEqual(r.score, r.pearls * CONFIG.PEARL_POINTS + noHit, 'the entrance multiplied something');
    }
});

/** Put the diver at along s, cross c in tunnel k, with the camera on them. */
function putAt(world, player, s, c, k) {
    const kk = k === undefined ? Timeline.indexAt(Math.min(Math.max(s, 0) / CONFIG.DIVE_ALONG, 0.9999)) : k;
    const p = world.toWorld(kk, s, c === undefined ? world.boundsAt(kk, s).center : c);
    player.x = p.x; player.y = p.y; player.vx = 0; player.vy = 0;
    world.cur = kk;
    world.diverAlong = s;
    world.camera(player, 1, true);
}

/** Swim straight at map point (x, y) in steps of `step`, as the game moves. */
function swimTo(world, player, x, y, step) {
    for (let i = 0; i < 2000; i++) {
        const dx = x - player.x, dy = y - player.y;
        const d = Math.hypot(dx, dy);
        if (d < step) return true;
        player.fx = dx / d; player.fy = dy / d;
        const ox = player.x, oy = player.y;
        player.x += (dx / d) * step; player.y += (dy / d) * step;
        world.move(player, ox, oy);
        world.track(player, 1, null);
        world.camera(player, 1);
        if (player.x === ox && player.y === oy) return false;   // blocked
    }
    return false;
}

test('the cave is the same rock on the way back', () => {
    const a = new World(77), b = new World(77);
    for (let k = 0; k < SEGMENTS.length; k++) {
        assert.deepStrictEqual(a.tunnels[k].slices, b.tunnels[k].slices, 'tunnel ' + k + ' differs between two builds');
    }
    // Round the first corner and back: down the shaft, along the tunnel, and
    // back again, crossing the boundary both ways without being moved.
    const w = new World(77), p = new Player();
    const t1 = w.tunnels[1];
    putAt(w, p, t1.S - 120, undefined, 0);
    const corner = w.toWorld(1, t1.S, w.boundsAt(1, t1.S).center);
    const along = w.toWorld(1, t1.S + 160, w.boundsAt(1, t1.S + 160).center);
    assert.ok(swimTo(w, p, corner.x, corner.y, 3), 'could not reach the first corner');
    assert.ok(swimTo(w, p, along.x, along.y, 3), 'could not swim into the tunnel');
    assert.strictEqual(w.cur, 1, 'did not cross into the tunnel');
    const back = w.toWorld(0, t1.S - 160, w.boundsAt(0, t1.S - 160).center);
    assert.ok(swimTo(w, p, corner.x, corner.y, 3) && swimTo(w, p, back.x, back.y, 3), 'could not swim back');
    assert.strictEqual(w.cur, 0, 'did not cross back into the shaft');
});

test('the collapse seals the way back, and only once it comes down', () => {
    const w = new World(5), p = new Player();
    const k = SEGMENTS.findIndex((seg) => seg.collapse);
    const S = w.tunnels[k].S;
    putAt(w, p, S - 20, undefined, k);
    w.cur = k - 1;
    assert.ok(!w.collapseFired, 'the roof came down before anyone entered');
    const into = w.toWorld(k, S + 100, w.boundsAt(k, S + 100).center);
    assert.ok(swimTo(w, p, into.x, into.y, 3), 'could not swim into NO WAY BACK');
    assert.strictEqual(w.cur, k);
    assert.ok(w.collapseFired, 'entering NO WAY BACK did not bring the roof down');
    // Back the way it came: the rockfall is in the way, behind the boundary.
    const out = w.toWorld(k, S - 200, w.boundsAt(k, S).center);
    swimTo(w, p, out.x, out.y, 3);
    assert.strictEqual(w.cur, k, 'swam back out through the collapse');
    const at = w.local(k, p.x, p.y).s;
    assert.ok(at >= w.sealAlong, 'reached ' + (at - w.sealAlong).toFixed(0) + 'px behind the rockfall');
});

test('nothing moves the diver in one frame further than a stroke can', () => {
    // The collapse used to shove the diver 127px forward the frame it fell,
    // and the old per-tunnel screens swapped the whole picture at every
    // boundary. Dive the cave and hold every frame's move on the map to what
    // swimming can do.
    for (const seed of [5, 21]) {
        let px = null, py = null, worst = 0;
        dive(seed, { onFrame({ player }) {
            if (px !== null) worst = Math.max(worst, Math.hypot(player.x - px, player.y - py));
            px = player.x; py = player.y;
        } });
        assert.ok(worst < CONFIG.MAX_SPEED + 3, 'seed ' + seed + ': the diver moved ' + worst.toFixed(0) + 'px in a frame');
    }
});

test('every way out can be reached, and diving on does not surface you again', () => {
    const w = new World(13), p = new Player();
    const last = w.exits.length - 1;
    for (let i = 0; i <= last; i++) {
        const e = w.exits[i];
        w.placeAtExit(i, p);
        assert.strictEqual(w.exitAt(p), -1, e.name + ': diving on puts you straight back out');
        if (e.alcove) putAt(w, p, e.s, w.boundsAt(e.seg, e.s).wallLo - CONFIG.ALCOVE_DEPTH * 0.8, e.seg);
        else if (i === 0) putAt(w, p, 2, undefined, 0);
        else putAt(w, p, CONFIG.DIVE_ALONG - 2, undefined, w.tunnels.length - 1);
        assert.strictEqual(w.exitAt(p), i, e.name + ' cannot be reached');
    }
    for (let i = 1; i <= last; i++) {
        assert.ok(CONFIG.EXITS[i].mult > CONFIG.EXITS[i - 1].mult, 'the multipliers do not climb');
        assert.ok(CONFIG.EXITS[i].at > CONFIG.EXITS[i - 1].at, 'the exits are out of order');
    }
});

test('rock lumps are rounded and solid exactly where they are drawn', () => {
    const w = new World(8), e = new Entities(w);
    let checked = 0;
    for (const r of e.rocks.slice(0, 20)) {
        // Thickest near the middle, nothing at the ends: not a rectangle.
        assert.ok(lumpDepth(r, r.s) < 0.01 && lumpDepth(r, r.s + r.len) < 0.01, 'a lump has square ends');
        // Near the tip against the middle; the roughness is +-24%, so a tip at
        // 12% of the length could read within 1.3x of the middle on a rough
        // lump while still being plainly rounded.
        const mid = lumpDepth(r, r.s + r.len / 2), tip = lumpDepth(r, r.s + r.len * 0.03);
        assert.ok(mid > tip * 1.4, 'a lump is as deep at its tip as its middle: ' + tip.toFixed(1) + ' vs ' + mid.toFixed(1));
        // And the water test agrees with the profile, just inside and outside it.
        const at = r.s + r.len / 2;
        const b = w.boundsAt(r.k, at);
        const face = r.fromLo ? b.wallLo + mid : b.hi - mid;
        const inside = w.toWorld(r.k, at, face + (r.fromLo ? -2 : 2));
        const outside = w.toWorld(r.k, at, face + (r.fromLo ? 2 : -2));
        const hit = {};
        assert.strictEqual(w.cellAt(inside.x, inside.y, hit), 0, 'no rock just inside a lump');
        assert.strictEqual(hit.rock, r, 'the wrong lump answered');
        assert.notStrictEqual(w.cellAt(outside.x, outside.y), 0, 'rock just outside a lump');
        checked++;
    }
    assert.ok(checked >= 10);
});

// ── 2b · Pace is a choice ─────────────────────────────────────────────

test('rushing is faster, and costs air', () => {
    // The point of a free swim: neither pace is free. If rushing were also the
    // better air, every dive would be a sprint and the cave would never get to
    // be slow and frightening; if it were not faster, nobody would.
    const seeds = [1, 2, 3, 5, 8, 13];
    const mean = (opts, k) => seeds.reduce((s, seed) => s + dive(seed, opts)[k], 0) / seeds.length;
    // Measured to LAST LIGHT, the deepest exit a careful diver always reaches,
    // so the comparison is between two dives that both finish.
    const careful = { frames: mean({ bankAt: 3 }, 'frames'), air: mean({ bankAt: 3 }, 'air') };
    const rushed = { frames: mean({ bankAt: 3, cruise: false }, 'frames'),
        air: mean({ bankAt: 3, cruise: false }, 'air') };
    assert.ok(rushed.frames < careful.frames * 0.8,
        'rushing is barely faster: ' + (rushed.frames / 60).toFixed(0) + 's vs ' + (careful.frames / 60).toFixed(0) + 's');
    assert.ok(rushed.air < careful.air - 10,
        'rushing costs no air: ' + rushed.air.toFixed(0) + ' vs ' + careful.air.toFixed(0));
    // And a careful dive is a couple of minutes, not a sprint and not a slog.
    assert.ok(careful.frames / 60 > 80 && careful.frames / 60 < 240,
        'a careful dive takes ' + (careful.frames / 60).toFixed(0) + 's');
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

const SONG_SEC = CONFIG.MUSIC.SONG_SEC;
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

test('the finale enters on the beat and is long enough to surface to', () => {
    const pos = MusicLogic.finaleFrom();
    const beats = (pos - CONFIG.MUSIC.GRID.FIRST) / BEAT;
    assert.ok(Math.abs(beats - Math.round(beats)) < 1e-9, 'finale enters off the beat');
    assert.ok(Math.abs(pos - CONFIG.MUSIC.FINALE_FROM) <= BEAT / 2 + 1e-9);
    // Long enough to be an ending, and short enough that SURFACING, which is
    // where it may start, is longer than it at a cruise.
    const sec = MusicLogic.finaleSec(SONG_SEC);
    assert.ok(sec > 10 && sec < 25, 'finale is ' + sec.toFixed(1) + 's');
    const ascent = SEGMENTS.find((s) => s.kind === 'ascent');
    const cruiseSec = (1 - ascent.at) * CONFIG.DIVE_ALONG / CONFIG.CRUISE_SPEED / 60;
    assert.ok(cruiseSec > sec, 'SURFACING at a cruise is ' + cruiseSec.toFixed(1) + 's, shorter than the finale');
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
        // To LAST LIGHT, which a skilled diver always reaches with air in hand.
        // A dive that runs out on the way to the far side SHOULD sit in DANGER
        // for its last third, and does, and that is not thrashing.
        dive(seed, {
            bankAt: 3,
            onFrame({ world, player, entities, seg, dtMs }) {
                const sec = dtMs / 1000;
                t += sec;
                danger = MusicLogic.smooth(danger, MusicLogic.dangerFrom({
                    air: player.air, dark: seg.dark, narrow: seg.narrow,
                    stun: player.stun, shake: world.shake, chase: world.chaseGap(player),
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
        // One change is a real dive: calm, then DANGER as a tight tank runs
        // low. What must not happen is no change, or thrashing.
        assert.ok(r.changes >= 1, 'seed ' + r.seed + ': the music never moved');
        assert.ok(r.changes <= 40, 'seed ' + r.seed + ': ' + r.changes + ' tier changes');
        assert.ok(r.calm > 0.1, 'seed ' + r.seed + ': almost never calm');
        assert.ok(r.danger < 0.5, 'seed ' + r.seed + ': DANGER most of the dive');
        // The collapse is the loudest moment in the game; the music must answer it.
        assert.strictEqual(r.collapseTier, 'danger', 'seed ' + r.seed + ': the collapse never reached DANGER');
    }
});
