// entities.js - cave diving (not even once) | MagmaCrunch Media (c) 2026
// Everything in the passage: rock lumps, falling rock, silt, pearls, air.
//
// Entities are stored in their tunnel's local frame - `k` the tunnel, `s`
// along the cave, `c` across it - and converted to the map with
// world.toWorld() for drawing and contact.
//
// THEY ARE PLACED ONCE. The whole cave is populated when the dive starts, from
// the world's entity stream, so a diver who turns back finds the same rock,
// the pearls they took still gone and the pockets they used still empty.
//
// Rock lumps are handed to their tunnel (world.tunnels[k].rocks) and are
// TERRAIN from then on: world.cellAt() makes them solid and world.draw()
// draws them, so what you see is exactly what you hit. This file only places
// them.

/* global CONFIG, SEGMENTS, Timeline, Renderer, sprite, SPR_PEARL, SPR_DEBRIS */

// Beyond this along-distance from the diver, nothing is updated or drawn.
const ACTIVE_RANGE = 640;

function Entities(world) {
    this.rng = world.entityRng;
    this.reset();
    this.populate(world);
}

Entities.prototype.reset = function () {
    this.rocks = [];
    this.debris = [];
    this.silt = [];
    this.pearls = [];
    this.pockets = [];
    this.particles = [];
};

/** A burst of particles at map point (x, y). */
Entities.prototype.explode = function (x, y, color) {
    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
        const a = (Math.PI * 2 * i) / CONFIG.PARTICLE_COUNT;
        this.particles.push({
            x, y,
            vx: Math.cos(a) * CONFIG.PARTICLE_SPEED,
            vy: Math.sin(a) * CONFIG.PARTICLE_SPEED,
            life: CONFIG.PARTICLE_LIFE, max: CONFIG.PARTICLE_LIFE, color,
        });
    }
};

/**
 * Populate the cave.
 *
 * Air pockets are NOT random. They are spread evenly down the cave so the air
 * budget is deterministic and the test can assert it - a pocket that might or
 * might not appear is a pocket the budget cannot be written against.
 * Everything else is seeded random, spaced by each segment's nominal pace so
 * the density matches what the scrolling version was tuned at. Corner rooms
 * and exit alcoves are kept clear: they are places to arrive and to leave.
 */
Entities.prototype.populate = function (world) {
    const J = CONFIG.JUNCTION_ALONG;
    const clearOfExit = (s) => world.exits.every((e) => Math.abs(s - e.s) > CONFIG.ALCOVE_HALF + 70);

    for (let k = 0; k < SEGMENTS.length; k++) {
        const seg = SEGMENTS[k];
        const t = world.tunnels[k];
        let s = t.S + J + (k === 0 ? 120 : 0);
        while (true) {
            s += CONFIG.OBSTACLE_MIN_GAP_FRAMES * Math.max(0.6, Timeline.scrollSpeed(seg)) *
                (0.85 + this.rng() * 0.5);
            if (s > t.E - J) break;
            if (!clearOfExit(s)) continue;
            this.placeAround(world, k, seg, s);
        }
    }

    const N = CONFIG.POCKETS_MAIN_LINE;
    for (let i = 0; i < N; i++) {
        let s = ((i + 0.6) / N) * CONFIG.DIVE_ALONG;
        // Out of a room or an alcove, forward, so the count stays exact.
        for (let tries = 0; tries < 20; tries++) {
            const k = Timeline.indexAt(Math.min(s / CONFIG.DIVE_ALONG, 0.9999));
            const t = world.tunnels[k];
            if (s - t.S > J && t.E - s > J && clearOfExit(s)) break;
            s += 60;
        }
        const k = Timeline.indexAt(Math.min(s / CONFIG.DIVE_ALONG, 0.9999));
        this.pockets.push({ k, s, c: world.boundsAt(k, s).center, taken: false, t: this.rng() * 6 });
    }
};

/** One rock lump at s in tunnel k, and what may come with it. */
Entities.prototype.placeAround = function (world, k, seg, s) {
    const t = world.tunnels[k];
    const b = world.boundsAt(k, s);
    const span = b.hi - b.wallLo;
    // Two caps, not one. CLEARANCE_MIN is the hard floor - the diver plus room
    // to correct. PROTRUSION_MAX_SPAN is the softer one: a lump deeper than
    // half the passage puts the centerline INSIDE the rock, so the obvious
    // line through the cave becomes the wrong one. lumpDepth() reaches past
    // `depth` by its roughness, so the cap leaves room for that too.
    const fromLo = this.rng() < 0.5;
    const draw = this.rng();
    const lenDraw = this.rng();
    // Lumps are long enough now to share a stretch of passage, so the gap is
    // whatever the lumps on the OTHER wall leave, not the whole span. Checked
    // one lump at a time, two facing lumps could close the passage below
    // CLEARANCE_MIN between them, and the test that measured each alone
    // never saw it.
    const facing = (from, to) => t.rocks.reduce((m, o) => (o.fromLo !== fromLo &&
        o.s < to && o.s + o.len > from ? Math.max(m, o.depth * 1.25) : m), 0);
    const room = (d) => Math.max(0, span - facing(s - 10, s + d + 10));
    let maxDepth = Math.min(
        Math.max(0, room(60) - CONFIG.CLEARANCE_MIN),
        span * CONFIG.PROTRUSION_MAX_SPAN
    ) / 1.25;
    if (maxDepth < 8) return;
    let depth = Math.min(maxDepth, 14 + draw * maxDepth * 0.7);
    // A mound, not a spike: at least 2.4 times as long as it is deep. The
    // first rounded lumps were as narrow as the old rectangles and as deep,
    // and rounding a tall narrow box gives a stalagmite.
    const len = Math.max(22 + lenDraw * 26, depth * (2.4 + lenDraw * 0.8));
    // Its full length may reach a facing lump the 60px check did not.
    maxDepth = Math.min(maxDepth, Math.max(0, room(len) - CONFIG.CLEARANCE_MIN) / 1.25);
    if (maxDepth < 8) return;
    depth = Math.min(depth, maxDepth);
    const rock = { k, s, len, depth, fromLo, seed: this.rng() * 10 };
    this.rocks.push(rock);
    t.rocks.push(rock);

    // A pearl sits in the pocket the lump leaves, on the far side of the
    // passage - so reaching it always costs strokes, and strokes cost air.
    if (this.rng() < CONFIG.PEARL_CHANCE) {
        const pc = fromLo ? b.hi - 12 : b.wallLo + 12;
        this.pearls.push({ k, s: s + len + 18, c: pc, taken: false, t: this.rng() * 6 });
    }

    if (this.rng() < CONFIG.SILT_CHANCE) {
        this.silt.push({ k, s: s + 60 + this.rng() * 90, c: b.center, r: 34 + this.rng() * 26 });
    }

    // Falling rock, in the narrow segments. Explicitly telegraphed for
    // TELEGRAPH + REACTION frames before it moves, because unlike a lump it
    // is not covered by the lamp's sight line.
    if (seg.narrow > 0.5 && this.rng() < 0.3) {
        const ds = s + 40 + this.rng() * 60;
        if (ds < t.E - CONFIG.JUNCTION_ALONG) {
            this.debris.push({
                k, s: ds, c: world.boundsAt(k, ds).wallLo + 6, v: 0,
                warn: CONFIG.TELEGRAPH_MIN_FRAMES + CONFIG.REACTION_FRAMES,
                warned: false, dead: false,
            });
        }
    }
};

/** Near the diver along the cave, and not buried by the collapse. */
function live(world, e, reach) {
    if (world.collapseFired && e.s < world.sealAlong) return false;
    return Math.abs(e.s - world.diverAlong) < (reach || ACTIVE_RANGE);
}

/**
 * Per frame. `contact` is what world.move() reported: a rock lump the diver
 * ran into costs breath, once per HIT_STUN, the way the old solid rectangles
 * did.
 */
Entities.prototype.update = function (dt, world, player, sfx, contact) {
    let hitSomething = false;
    let siltNow = false;

    if (contact && contact.rock && player.takeHit(sfx)) {
        hitSomething = true;
        this.explode(player.x, player.y, CONFIG.COLORS.rockLit);
    }

    for (const d of this.debris) {
        if (d.dead || !live(world, d)) continue;
        const p = world.local(d.k, player.x, player.y);
        if (d.warn > 0) {
            const sc = world.localToScreen(d.k, d.s, d.c);
            if (!d.warned && sc.x > 0 && sc.x < CONFIG.CANVAS_W && sc.y > 0 && sc.y < CONFIG.CANVAS_H) {
                d.warned = true;
                if (sfx) sfx.rumble();
            }
            if (d.warned) d.warn -= dt;
            continue;
        }
        d.v += CONFIG.DEBRIS_FALL * 0.06 * dt;
        d.c += d.v * dt;
        if (d.c > world.boundsAt(d.k, d.s).hi) { d.dead = true; continue; }
        if (Math.abs(p.s - d.s) < 10 && Math.abs(p.c - d.c) < 10) {
            if (player.takeHit(sfx)) {
                hitSomething = true;
                const w = world.toWorld(d.k, d.s, d.c);
                this.explode(w.x, w.y, CONFIG.COLORS.rockLit);
                d.dead = true;
            }
        }
    }

    for (const s of this.silt) {
        if (!live(world, s)) continue;
        const p = world.local(s.k, player.x, player.y);
        if (Math.hypot(p.s - s.s, p.c - s.c) < s.r) siltNow = true;
    }

    for (const q of this.pearls) {
        if (q.taken || !live(world, q)) continue;
        q.t += dt * 0.09;
        const p = world.local(q.k, player.x, player.y);
        if (Math.abs(p.s - q.s) < 11 && Math.abs(p.c - q.c) < 11) {
            q.taken = true;
            player.pearls++;
            const w = world.toWorld(q.k, q.s, q.c);
            this.explode(w.x, w.y, CONFIG.COLORS.pearl);
            if (sfx) sfx.pearl();
        }
    }

    for (const q of this.pockets) {
        if (q.taken || !live(world, q)) continue;
        q.t += dt * 0.07;
        const p = world.local(q.k, player.x, player.y);
        if (Math.abs(p.s - q.s) < 15 && Math.abs(p.c - q.c) < 15) {
            q.taken = true;
            player.giveAir(CONFIG.POCKET_REFILL, sfx);
            const w = world.toWorld(q.k, q.s, q.c);
            this.explode(w.x, w.y, CONFIG.COLORS.air);
        }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        if (p.life <= 0) this.particles.splice(i, 1);
    }

    return { hit: hitSomething, silt: siltNow };
};

/** Falling rock warned of and still to land: the music's reason to worry. */
Entities.prototype.debrisComing = function (world) {
    return this.debris.some((d) => d.warned && !d.dead && live(world, d));
};

/** Lights the mask should punch besides the headlamp. */
Entities.prototype.lights = function (world) {
    const out = [];
    for (const p of this.pockets) {
        if (p.taken || !live(world, p, 420)) continue;
        const sc = world.localToScreen(p.k, p.s, p.c);
        out.push({ x: sc.x, y: sc.y, r: 30, a: 0.55 });
    }
    for (const p of this.pearls) {
        if (p.taken || !live(world, p, 420)) continue;
        const sc = world.localToScreen(p.k, p.s, p.c);
        out.push({ x: sc.x, y: sc.y, r: 18, a: 0.45 });
    }
    return out;
};

Entities.prototype.draw = function (ctx, world) {
    const C = CONFIG.COLORS;
    const near = (e) => live(world, e, 460);

    for (const d of this.debris) {
        if (d.dead || !near(d)) continue;
        const sc = world.localToScreen(d.k, d.s, d.c);
        if (d.warn > 0) {
            // Dust before rock. The warning is visual as well as audible so it
            // survives a muted tab.
            ctx.globalAlpha = 0.35 + 0.25 * Math.sin(d.warn * 0.5);
            ctx.fillStyle = C.silt;
            ctx.fillRect(Math.round(sc.x) - 7, Math.round(sc.y) - 2, 14, 3);
            ctx.globalAlpha = 1;
            continue;
        }
        sprite(ctx, SPR_DEBRIS, Math.round(sc.x) - 4, Math.round(sc.y) - 3);
    }

    for (const s of this.silt) {
        if (!near(s)) continue;
        const sc = world.localToScreen(s.k, s.s, s.c);
        ctx.globalAlpha = 0.34;
        Renderer.glow(ctx, sc.x, sc.y, s.r, '107,90,73', 0.9);
        ctx.globalAlpha = 1;
    }

    for (const p of this.pockets) {
        if (p.taken || !near(p)) continue;
        const sc = world.localToScreen(p.k, p.s, p.c);
        Renderer.glow(ctx, sc.x, sc.y, 22, '95,232,164', 0.45);
        ctx.fillStyle = C.air;
        for (let b = 0; b < 5; b++) {
            const a = p.t + b * 1.25;
            const rx = Math.round(sc.x + Math.cos(a) * 7);
            const ry = Math.round(sc.y + Math.sin(a * 1.3) * 7);
            const sz = 2 + (b % 2);
            ctx.fillRect(rx, ry, sz, sz);
        }
    }

    for (const p of this.pearls) {
        if (p.taken || !near(p)) continue;
        const sc = world.localToScreen(p.k, p.s, p.c);
        Renderer.glow(ctx, sc.x, sc.y, 13, '255,217,138', 0.4);
        sprite(ctx, SPR_PEARL, Math.round(sc.x) - 3, Math.round(sc.y) - 3 + Math.round(Math.sin(p.t) * 1.5));
    }

    for (const p of this.particles) {
        const sc = world.toScreen(p.x, p.y);
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(sc.x), Math.round(sc.y), 2, 2);
        ctx.globalAlpha = 1;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Entities };
}
