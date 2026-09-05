/**
 * test-simulation.js — Roderick Tron headless simulation tests.
 *
 * The game's modules are plain scripts that assign globals, with no DOM
 * dependency outside their draw() methods, so the real files are loaded into a
 * vm context and run — nothing here is a reimplementation that could drift from
 * what ships.
 *
 * What this is guarding, in order of how much it hurt:
 *
 *  1. Frame-rate independence. dt used to be applied to gravity but not to the
 *     position step, and not at all to the camera, so a 120Hz display ran the
 *     fall twice as fast and scored twice as quickly. Every quantity is now
 *     scaled by dt, and `dt invariance` below asserts that three different step
 *     sizes covering the same wall-clock time agree.
 *
 *  2. Fair gaps. The generator widens gaps as the scroll speed rises, so `every
 *     gap is clearable` flies each consecutive roof pair with the real
 *     Player.update across the whole input space — every jump timing, every
 *     hold length — and asserts both that something lands it and that the
 *     window for it is wide enough to hit deliberately.
 *
 *  3. The gargoyle telegraph. `alert` used to set its own timer to the value it
 *     was about to be tested against, so the warning lasted a single frame.
 *
 *  4. Respawn. Falling into a gap put the player back at the height of the
 *     nearest roof without moving the camera, i.e. back over the same gap, and
 *     the next life went with it.
 *
 * Run: node test-simulation.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS_DIR = path.join(__dirname, '..', 'js');

// ── Harness ───────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;

function ok(cond, name, detail) {
    if (cond) { passed++; console.log('  PASS  ' + name); }
    else { failed++; console.log('  FAIL  ' + name + (detail ? '\n          ' + detail : '')); }
}

function near(a, b, tol, name) {
    ok(Math.abs(a - b) <= tol, name, `got ${a}, expected ${b} +/- ${tol}`);
}

/** Deterministic PRNG so a failure is reproducible and a pass is not luck. */
function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** A recording no-op 2D context — enough for the draw() methods to run. */
function stubCtx() {
    const calls = [];
    const noop = (name) => (...args) => { calls.push([name, args]); };
    return {
        calls,
        fillStyle: '', globalAlpha: 1, font: '', textAlign: 'left',
        fillRect: noop('fillRect'),
        clearRect: noop('clearRect'),
        fillText: noop('fillText'),
        beginPath: noop('beginPath'),
        arc: noop('arc'),
        fill: noop('fill'),
        save: noop('save'),
        restore: noop('restore'),
        translate: noop('translate'),
        createLinearGradient: () => ({ addColorStop() {} }),
        createRadialGradient: () => ({ addColorStop() {} }),
    };
}

/**
 * A fresh game world. Each call gets its own vm context, so state cannot leak
 * between tests and Math.random can be reseeded per scenario.
 */
function makeGame(seed) {
    const input = {
        held: {}, pressed: {},
        isDown(c) { return !!this.held[c]; },
        wasPressed(c) { const v = !!this.pressed[c]; this.pressed[c] = false; return v; },
        clearJustPressed() { this.pressed = {}; },
        jump() { return this.wasPressed('Space'); },
        jumpHeld() { return this.isDown('Space'); },
        shoot() { return this.wasPressed('KeyZ'); },
        // test helpers
        tap(c) { this.pressed[c] = true; this.held[c] = true; },
        release(c) { this.held[c] = false; },
    };

    const sandbox = { Math: Object.create(Math), console, Input: input };
    sandbox.Math.random = mulberry32(seed);
    const ctx = vm.createContext(sandbox);

    for (const file of ['config.js', 'player.js', 'world.js', 'entities.js', 'renderer.js']) {
        vm.runInContext(fs.readFileSync(path.join(JS_DIR, file), 'utf8'), ctx, { filename: file });
    }

    const CONFIG = vm.runInContext('CONFIG', ctx);
    const Difficulty = vm.runInContext('Difficulty', ctx);
    const player = vm.runInContext('new Player()', ctx);
    const world = vm.runInContext('new World()', ctx);
    const entities = vm.runInContext('new Entities()', ctx);

    player.respawn(world.respawnSurface(CONFIG.PLAYER_X, CONFIG.PLAYER_W));

    /** One tick of the real update order from main.js. */
    function step(dt) {
        const difficulty = Difficulty.at(world.metres());
        const speed = Difficulty.scrollSpeed(difficulty);
        world.update(speed, dt, difficulty);
        player.update(world.rooftops, world.cameraX, dt);
        entities.update(world, player, dt);
        return { difficulty, speed };
    }

    /** A fresh Player in this same context — far cheaper than a new sandbox. */
    const newPlayer = () => vm.runInContext('new Player()', ctx);

    return { CONFIG, Difficulty, player, world, entities, input, step, ctx, newPlayer };
}

/** The roof the player is standing over right now, if any. */
function roofUnder(world, CONFIG) {
    for (const r of world.rooftops) {
        const sx = r.x - world.cameraX;
        if (sx <= CONFIG.PLAYER_X && sx + r.width >= CONFIG.PLAYER_X + CONFIG.PLAYER_W) return r;
    }
    return null;
}

// ── dt invariance ─────────────────────────────────────────────────────────────
// The same wall-clock time at three different step sizes must produce the same
// run. This is the test the old build could not have passed.

console.log('\ndt invariance:');
{
    const runFor = (dt, steps) => {
        const g = makeGame(1234);
        for (let i = 0; i < steps; i++) g.step(dt);
        return { camera: g.world.cameraX, metres: g.world.metres(), y: g.player.y };
    };

    const at60  = runFor(1.0, 600);    // 10 seconds
    const at120 = runFor(0.5, 1200);   // the same 10 seconds, half-steps
    const at30  = runFor(2.0, 300);    // the same 10 seconds, double-steps

    // Not bit-identical, and cannot be: scroll speed is a function of distance
    // and distance is the integral of scroll speed, so a coarser step samples
    // that feedback loop at slightly different points. The tolerance below is
    // 0.05% — the bug this replaced was a factor of two.
    const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
    ok(rel(at120.camera, at60.camera) < 0.0005,
       '120Hz camera matches 60Hz', `${at120.camera} vs ${at60.camera}`);
    ok(rel(at30.camera, at60.camera) < 0.0005,
       '30Hz camera matches 60Hz', `${at30.camera} vs ${at60.camera}`);
    ok(rel(at120.metres, at60.metres) < 0.0005,
       '120Hz distance matches 60Hz', `${at120.metres} vs ${at60.metres}`);

    // Free-fall from a standing start, with no ground to interrupt it.
    const fall = (dt, steps) => {
        const g = makeGame(77);
        g.world.rooftops.length = 0;                 // nothing to land on
        g.player.y = 0; g.player.vy = 0; g.player.grounded = false;
        for (let i = 0; i < steps; i++) g.player.update([], 0, dt);
        return g.player.y;
    };
    // Semi-implicit Euler is only first-order accurate, so the coarse step is
    // allowed a small lead — what matters is that it is not the factor of two
    // the un-scaled position step used to produce.
    near(fall(0.5, 120), fall(1.0, 60), 4, '120Hz fall distance matches 60Hz');
    near(fall(2.0, 30),  fall(1.0, 60), 8, '30Hz fall distance matches 60Hz');
}

// ── Difficulty curve ──────────────────────────────────────────────────────────

console.log('\ndifficulty curve:');
{
    const { CONFIG, Difficulty } = makeGame(1);
    ok(Difficulty.at(0) === 0, 'starts at zero');
    ok(Difficulty.at(-50) === 0, 'clamps below zero');
    ok(Difficulty.at(CONFIG.DIFFICULTY_DISTANCE * 10) === 1, 'clamps at one');
    ok(Difficulty.scrollSpeed(0) === CONFIG.SCROLL_MIN, 'opens at SCROLL_MIN');
    ok(Difficulty.scrollSpeed(1) === CONFIG.SCROLL_MAX, 'tops out at SCROLL_MAX');

    let monotonic = true;
    for (let d = 0; d < 1; d += 0.01) {
        if (Difficulty.scrollSpeed(d + 0.01) < Difficulty.scrollSpeed(d)) monotonic = false;
        if (Difficulty.gargoyleChance(d + 0.01) < Difficulty.gargoyleChance(d)) monotonic = false;
    }
    ok(monotonic, 'speed and gargoyle rate never go backwards');
    ok(Difficulty.flyerChance(CONFIG.FLYER_UNLOCK - 0.01) === 0, 'flyers stay locked until FLYER_UNLOCK');
    ok(Difficulty.flyerChance(1) > 0, 'flyers appear at full difficulty');

    // The whole point of the cap: a gap is never wider than one jump carries you.
    let capped = true;
    for (let d = 0; d <= 1; d += 0.02) {
        const reach = CONFIG.JUMP_AIRTIME * Difficulty.scrollSpeed(d);
        if (Difficulty.maxGap(d) >= reach) capped = false;
    }
    ok(capped, 'maxGap always stays under one jump of travel');
}

// ── Generated terrain ─────────────────────────────────────────────────────────

console.log('\nterrain generation:');
{
    const { CONFIG, Difficulty } = makeGame(99);
    let widest = 0, tallestRise = 0, roofs = 0, narrowest = Infinity;
    let badGap = null, badHeight = null;

    for (let seed = 0; seed < 6; seed++) {
        const w = makeGame(seed * 31 + 7).world;
        for (let d = 0; d <= 1.0001; d += 0.05) {
            for (let i = 0; i < 60; i++) {
                const prev = w.rooftops[w.rooftops.length - 1];
                w.appendRoof(d);
                const cur = w.rooftops[w.rooftops.length - 1];
                const gap = cur.x - (prev.x + prev.width);
                widest = Math.max(widest, gap);
                tallestRise = Math.max(tallestRise, prev.y - cur.y);
                narrowest = Math.min(narrowest, cur.width);
                roofs++;
                if (!badGap && gap > Difficulty.maxGap(d) + 0.001) {
                    badGap = `gap ${gap.toFixed(1)} exceeds the ${Difficulty.maxGap(d).toFixed(1)} cap at d=${d.toFixed(2)}`;
                }
                if (!badHeight && (cur.y < CONFIG.ROOF_Y_MIN || cur.y > CONFIG.ROOF_Y_MAX)) {
                    badHeight = `roof y ${cur.y} outside ${CONFIG.ROOF_Y_MIN}..${CONFIG.ROOF_Y_MAX}`;
                }
            }
        }
    }
    ok(!badGap && !badHeight,
       `${roofs} generated roofs all within the gap cap and height bounds`,
       badGap || badHeight);
    ok(narrowest >= CONFIG.PLAYER_W, `narrowest roof (${Math.round(narrowest)}px) is wider than the player`);
    console.log(`        widest gap ${widest.toFixed(1)}px, tallest rise ${tallestRise.toFixed(1)}px`);
}

// ── Every gap is clearable ────────────────────────────────────────────────────
// The fairness question is not "does one particular bot survive" — a bot that
// always holds jump sails clean over a 76px roof at full speed, which says
// nothing about the terrain. It is: for each consecutive pair of rooftops, is
// there an input that gets you across, and is the window for it wide enough to
// hit on purpose?
//
// So each pair is flown with the real Player.update, across every jump timing
// from "24px of roof left" to "the last possible frame" and every hold length
// from a tap to a full-height jump, and both of those are asserted.

console.log('\nevery gap is clearable:');
{
    const g = makeGame(1);
    const { CONFIG, Difficulty } = g;

    /** Fly roof A -> roof B at `speed`, over the whole input space. */
    function clearance(A, B, speed) {
        const timings = [];
        let widestHoldWindow = 0;

        for (let offset = 0; offset <= 24; offset += 2) {
            let works = false, run = 0, maxRun = 0;
            for (let hold = 1; hold <= 40; hold++) {
                const p = g.newPlayer();
                let cam = A.x + A.width - CONFIG.PLAYER_X - offset;
                p.x = CONFIG.PLAYER_X;
                p.y = A.y - CONFIG.PLAYER_H;
                p.vy = 0; p.grounded = true; p.coyote = CONFIG.COYOTE_FRAMES;
                g.input.held = {}; g.input.pressed = {};
                g.input.tap('Space');

                let landed = false;
                for (let t = 0; t < 220; t++) {
                    if (t === hold) g.input.release('Space');
                    cam += speed;
                    p.update([A, B], cam, 1.0);
                    if (p.grounded) {
                        const sb = B.x - cam;
                        if (p.x + CONFIG.PLAYER_W > sb && p.x < sb + B.width
                            && Math.abs(p.y + CONFIG.PLAYER_H - B.y) < 0.5) { landed = true; break; }
                        const sa = A.x - cam;
                        if (!(p.x + CONFIG.PLAYER_W > sa && p.x < sa + A.width)) break;
                    }
                    if (p.y > CONFIG.CANVAS_H + 20) break;
                }
                if (landed) { works = true; run++; if (run > maxRun) maxRun = run; }
                else run = 0;
            }
            if (works) timings.push(offset);
            if (maxRun > widestHoldWindow) widestHoldWindow = maxRun;
        }
        return { timings: timings.length, widestHoldWindow };
    }

    const TIMINGS = 13;              // offsets 0,2,...,24
    const MIN_HOLD_WINDOW = 4;       // contiguous hold lengths that land the jump
    let pairs = 0, unclearable = 0, tightestTiming = TIMINGS, tightestHold = Infinity, worst = null;

    for (let seed = 0; seed < 4; seed++) {
        const w = makeGame(seed * 97 + 5).world;
        for (let d = 0; d <= 1.0001; d += 0.05) {
            const speed = Difficulty.scrollSpeed(d);
            for (let i = 0; i < 40; i++) {
                const prev = w.rooftops[w.rooftops.length - 1];
                w.appendRoof(d);
                const cur = w.rooftops[w.rooftops.length - 1];
                const r = clearance(prev, cur, speed);
                pairs++;
                if (r.timings === 0) unclearable++;
                if (r.timings < tightestTiming) tightestTiming = r.timings;
                if (r.widestHoldWindow < tightestHold) {
                    tightestHold = r.widestHoldWindow;
                    worst = { d: +d.toFixed(2), speed: +speed.toFixed(2),
                              gap: +(cur.x - (prev.x + prev.width)).toFixed(1),
                              drop: cur.y - prev.y, landingWidth: cur.width };
                }
            }
        }
    }

    ok(unclearable === 0, `all ${pairs} roof pairs are clearable`, `${unclearable} were not`);
    ok(tightestTiming === TIMINGS,
       `every pair works from any of the ${TIMINGS} jump timings tried`,
       `one pair only worked from ${tightestTiming}`);
    ok(tightestHold >= MIN_HOLD_WINDOW,
       `tightest jump still has a ${tightestHold}-frame hold window (>= ${MIN_HOLD_WINDOW})`,
       `only ${tightestHold} frames`);
    console.log('        tightest: ' + JSON.stringify(worst));
}

// ── Gargoyle telegraph ────────────────────────────────────────────────────────

console.log('\ngargoyle behaviour:');
{
    const g = makeGame(5);
    const { CONFIG, player, world, entities } = g;

    // Put one percher directly in the player's path.
    const roof = { x: world.cameraX + CONFIG.PLAYER_X + 40, y: 180, width: 100, gargoyle: 'percher' };
    entities.spawnGargoyle(roof);
    const gar = entities.gargoyles[0];
    const perch = gar.baseY;

    ok(gar.state === 'idle', 'starts idle');
    ok(entities.checkPlayerHit(player) === null || gar.state !== 'idle',
       'an idle percher is not a hazard');

    // Frames of warning in the *first* cycle — the bug was a telegraph one
    // frame long, and summing over repeat cycles would have hidden it.
    let alertFrames = 0, sawLunge = false, sawRecover = false, backOnPerch = false;
    let counting = true;
    for (let i = 0; i < 400; i++) {
        entities.updateGargoyles(player, 1.0);
        if (gar.state === 'alert' && counting) alertFrames++;
        if (gar.state === 'lunge') { sawLunge = true; counting = false; }
        if (gar.state === 'recover') {
            sawRecover = true;
            if (Math.abs(gar.y - perch) < 0.001) backOnPerch = true;
        }
    }

    ok(alertFrames >= CONFIG.GARGOYLE_ALERT_FRAMES,
       `telegraph lasts ${alertFrames} frames (>= ${CONFIG.GARGOYLE_ALERT_FRAMES})`,
       `only ${alertFrames} frames of warning`);
    ok(sawLunge, 'lunges after the telegraph');
    ok(sawRecover, 'recovers after the lunge');
    ok(backOnPerch, 'returns to its perch instead of hovering');

    // Height of the arc, sampled across a fresh lunge.
    const g2 = makeGame(6);
    g2.entities.spawnGargoyle({ x: g2.world.cameraX + 120, y: 180, width: 100, gargoyle: 'percher' });
    const gar2 = g2.entities.gargoyles[0];
    gar2.state = 'lunge'; gar2.timer = 0;
    let highest = gar2.baseY;
    for (let i = 0; i <= g2.CONFIG.GARGOYLE_LUNGE_FRAMES; i++) {
        g2.entities.updateGargoyles(g2.player, 1.0);
        highest = Math.min(highest, gar2.y);
    }
    near(gar2.baseY - highest, g2.CONFIG.GARGOYLE_LUNGE_HEIGHT, 1.5, 'lunge reaches its configured height');
}

// ── Flyers ────────────────────────────────────────────────────────────────────

console.log('\nflyers:');
{
    const g = makeGame(8);
    const { CONFIG, world, entities, player } = g;
    entities.spawnGargoyle({ x: world.cameraX + 400, y: 180, width: 100, gargoyle: 'flyer' });
    const f = entities.gargoyles[0];
    ok(f.kind === 'flyer', 'spawns as a flyer');
    ok(f.hp === CONFIG.FLYER_HP, 'takes one note to fell');
    ok(f.baseY <= 180 - 46, 'flies above the rooftops');

    const x0 = f.x, ys = [];
    for (let i = 0; i < 60; i++) { entities.updateGargoyles(player, 1.0); ys.push(f.y); }
    ok(f.x < x0, 'closes on the player faster than the world scrolls');
    ok(Math.max(...ys) - Math.min(...ys) > 4, 'bobs rather than tracking a straight line');
}

// ── Notes ─────────────────────────────────────────────────────────────────────

console.log('\nnotes:');
{
    const g = makeGame(12);
    const { CONFIG, entities, world } = g;

    // Screen-relative speed must not depend on how fast the world is moving.
    const screenSpeed = (scroll) => {
        const e = makeGame(12).entities;
        e.cameraX = 500;
        e.spawnNote(96, 100, scroll);
        const n = e.notes[0];
        const before = n.x - e.cameraX;
        e.cameraX += scroll;                 // the world advances one frame
        e.updateNotes(1.0);
        return (n.x - e.cameraX) - before;
    };
    near(screenSpeed(2), CONFIG.NOTE_SPEED, 0.001, 'reach is the same at scroll speed 2');
    near(screenSpeed(4.6), CONFIG.NOTE_SPEED, 0.001, 'reach is the same at scroll speed 4.6');

    // Cooldown
    const e = entities;
    e.cameraX = world.cameraX;
    ok(e.spawnNote(96, 100, 2) === true, 'first shot fires');
    ok(e.spawnNote(96, 100, 2) === false, 'second shot is on cooldown');
    for (let i = 0; i < CONFIG.FIRE_RATE; i++) {
        e.updateNotes(1.0);
        e.shootCooldown -= 1;
    }
    ok(e.spawnNote(96, 100, 2) === true, 'fires again once the cooldown lapses');

    // A note kills a percher in exactly GARGOYLE_HP hits, and the kill is reported.
    const k = makeGame(13);
    k.entities.cameraX = k.world.cameraX;
    k.entities.spawnGargoyle({ x: k.world.cameraX + 200, y: 180, width: 100, gargoyle: 'percher' });
    const target = k.entities.gargoyles[0];
    let hits = 0;
    while (k.entities.gargoyles.length && hits < 10) {
        k.entities.notes.push({ x: target.x, y: target.y, vx: 0 });
        k.entities.killsThisFrame.length = 0;
        k.entities.updateNotes(1.0);
        hits++;
    }
    ok(hits === k.CONFIG.GARGOYLE_HP, `a percher takes ${k.CONFIG.GARGOYLE_HP} notes`, `took ${hits}`);
    ok(k.entities.killsThisFrame.length === 1, 'the kill is reported to the scorer');
}

// ── Respawn ───────────────────────────────────────────────────────────────────

console.log('\nrespawn after a fall:');
{
    let recovered = 0, attempts = 0;
    for (const seed of [2, 17, 55, 91, 400, 777]) {
        const g = makeGame(seed);
        const { CONFIG, player, world, step } = g;

        // Run in, then walk off an edge on purpose and never jump again.
        for (let i = 0; i < 400; i++) step(1.0);

        for (let life = 0; life < 4; life++) {
            let guard = 0;
            while (player.y <= CONFIG.CANVAS_H + 20 && guard++ < 3000) step(1.0);
            if (guard >= 3000) break;           // never fell; nothing to check
            attempts++;
            player.respawn(world.respawnSurface(CONFIG.PLAYER_X, CONFIG.PLAYER_W));

            // The whole fix: he must now be over something solid.
            const under = roofUnder(world, CONFIG);
            if (under && Math.abs((player.y + CONFIG.PLAYER_H) - under.y) < 0.001) recovered++;

            // And must still be there a moment later rather than falling again.
            for (let i = 0; i < 5; i++) step(1.0);
            if (!player.grounded) recovered--;
        }
    }
    ok(attempts > 0, `${attempts} falls simulated`);
    ok(recovered === attempts, 'every respawn lands on solid roof and stays there',
       `${recovered}/${attempts}`);
}

// ── Long run: no leaks, no crashes in draw ────────────────────────────────────

console.log('\nlong run:');
{
    const g = makeGame(2468);
    const { CONFIG, player, world, entities, input, step } = g;
    const ctx = stubCtx();
    let maxRoofs = 0, maxGargoyles = 0, maxParticles = 0, maxNotes = 0, threw = null;

    try {
        for (let i = 0; i < 40000; i++) {
            if (player.grounded) {
                const r = roofUnder(world, CONFIG);
                const runway = r
                    ? (r.x - world.cameraX + r.width) - (CONFIG.PLAYER_X + CONFIG.PLAYER_W)
                    : 0;
                if (runway <= 2) input.tap('Space');
            }
            if (i % 12 === 0) {
                entities.spawnNote(player.x + CONFIG.PLAYER_W, player.y + 8,
                                   g.Difficulty.scrollSpeed(g.Difficulty.at(world.metres())));
            }
            step(1.0);
            if (player.y > CONFIG.CANVAS_H + 20) {
                player.respawn(world.respawnSurface(CONFIG.PLAYER_X, CONFIG.PLAYER_W));
            }
            maxRoofs = Math.max(maxRoofs, world.rooftops.length);
            maxGargoyles = Math.max(maxGargoyles, entities.gargoyles.length);
            maxParticles = Math.max(maxParticles, entities.particles.length);
            maxNotes = Math.max(maxNotes, entities.notes.length);

            if (i % 500 === 0) { world.draw(ctx); entities.draw(ctx); player.draw(ctx); }
        }
    } catch (e) { threw = e; }

    ok(!threw, 'ran 40000 frames without throwing', threw && threw.stack);
    ok(maxRoofs < 40, `rooftop pool stays bounded (peak ${maxRoofs})`);
    ok(maxGargoyles < 40, `gargoyle pool stays bounded (peak ${maxGargoyles})`);
    ok(maxParticles < 400, `particle pool stays bounded (peak ${maxParticles})`);
    ok(maxNotes < 40, `note pool stays bounded (peak ${maxNotes})`);
    ok(ctx.calls.length > 0, 'draw() actually painted something');
    console.log(`        reached ${Math.round(world.metres())}m`);
}

// ── Jump forgiveness ──────────────────────────────────────────────────────────

console.log('\njump forgiveness:');
{
    // Coyote time: a jump pressed just after walking off an edge still fires.
    const g = makeGame(31);
    const { CONFIG, player, input } = g;
    player.grounded = true; player.coyote = CONFIG.COYOTE_FRAMES; player.vy = 0;
    player.update([], 0, 1.0);                    // no roofs -> he is now airborne
    ok(!player.grounded, 'left the ground');
    input.tap('Space');
    player.update([], 0, 1.0);
    ok(player.vy < 0, 'a jump within the coyote window still fires');

    // ...but not one pressed long after.
    const g2 = makeGame(32);
    g2.player.grounded = false; g2.player.coyote = 0; g2.player.vy = 1;
    g2.input.tap('Space');
    g2.player.update([], 0, 1.0);
    ok(g2.player.vy > 0, 'a jump in mid-air after the window does not');

    // Variable height: holding the key gets you higher than tapping it.
    const apex = (hold) => {
        const s = makeGame(33);
        const roof = [{ x: 0, y: 180, width: 400 }];
        s.player.x = CONFIG.PLAYER_X; s.player.y = 180 - CONFIG.PLAYER_H;
        s.player.grounded = true; s.player.coyote = CONFIG.COYOTE_FRAMES; s.player.vy = 0;
        s.input.tap('Space');
        let top = s.player.y;
        for (let i = 0; i < 60; i++) {
            if (!hold && i === 3) s.input.release('Space');
            s.player.update(roof, 0, 1.0);
            top = Math.min(top, s.player.y);
        }
        return (180 - CONFIG.PLAYER_H) - top;
    };
    const full = apex(true), tapped = apex(false);
    ok(full > tapped + 8, `holding jumps higher (${full.toFixed(1)}px vs ${tapped.toFixed(1)}px)`);
    ok(tapped > 0, 'a tap still leaves the ground');
}

// ── Music asset ───────────────────────────────────────────────────────────────
// CONFIG.MUSIC.URL is built in a JS string, and check-cache-busters.mjs
// deliberately steps over those — a `?v=` in JS is usually a YouTube id. So
// nothing else in the repo would notice this path breaking, and the only
// symptom would be a game that is silently silent.

console.log('\nmusic asset:');
{
    const { CONFIG } = makeGame(1);
    const url = CONFIG.MUSIC.URL;

    ok(/^\.\.\/\.\.\//.test(url), 'points outside the game folder, at the shared copy', url);

    // Resolve it the way the browser would, from arcade/roderick-tron/.
    const resolved = path.resolve(JS_DIR, '..', decodeURIComponent(url));
    ok(fs.existsSync(resolved), 'the track it names is actually there', resolved);

    if (fs.existsSync(resolved)) {
        const bytes = fs.statSync(resolved).size;
        ok(bytes > 100000, `track is ${Math.round(bytes / 1024)}KB, so it is the real file`);
        const head = fs.readFileSync(resolved).subarray(0, 4).toString('latin1');
        ok(head === 'OggS', 'and it is an Ogg stream', `header was "${head}"`);
    }

    ok(url.includes('%20'), 'spaces are percent-encoded for fetch()');
    ok(CONFIG.MUSIC.FADE_OUT > 0 && CONFIG.MUSIC.FADE_OUT < CONFIG.MUSIC.FADE_IN,
       'fades out faster than it fades in, so the run ending reads as an ending');
    ok(CONFIG.MUSIC.VOLUME > 0 && CONFIG.MUSIC.VOLUME <= 1, 'volume is a sane gain');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
