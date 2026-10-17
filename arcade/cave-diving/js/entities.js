// entities.js - cave diving (not even once) | MagmaCrunch Media (c) 2026
// Everything in the passage: protrusions, falling rock, silt, pearls, air.
//
// Entities are stored in cave space - `s` along the passage, `c` across it,
// `k` the segment whose cross axis `c` is measured in - and converted to
// screen only at draw and contact time.
//
// THEY ARE PLACED ONCE. The whole cave is populated when the dive starts,
// from the world's entity stream, so a diver who turns back finds the same
// rock, the pearls they took still gone and the pockets they used still
// empty. Only what is in the current segment and near the diver is updated.

/* global CONFIG, SEGMENTS, Timeline, Renderer, sprite, SPR_PEARL, SPR_DEBRIS */

// Beyond this along-distance from the diver, nothing is updated or tested.
const ACTIVE_RANGE = 560;

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

Entities.prototype.explode = function (s, c, k, color) {
    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
        const a = (Math.PI * 2 * i) / CONFIG.PARTICLE_COUNT;
        this.particles.push({
            s, c, k,
            vs: Math.cos(a) * CONFIG.PARTICLE_SPEED,
            vc: Math.sin(a) * CONFIG.PARTICLE_SPEED,
            life: CONFIG.PARTICLE_LIFE, max: CONFIG.PARTICLE_LIFE, color,
        });
    }
};

/** Bounds in segment k at along s, whichever segment the camera is in. */
function boundsIn(world, k, s) {
    const sl = world.segs[k].slices;
    const i = Math.max(0, Math.min(sl.length - 1, Math.round((s - sl[0].s) / 16)));
    const lo = sl[i].wallLo, hi = sl[i].hi;
    return { lo, hi, center: (lo + hi) / 2 };
}

/**
 * Populate the cave.
 *
 * Air pockets are NOT random. They are spread evenly down the cave so the air
 * budget is deterministic and the test can assert it - a pocket that might or
 * might not appear is a pocket the budget cannot be written against.
 * Everything else is seeded random, spaced by each segment's nominal pace so
 * the density matches what the scrolling version was tuned at. Chambers and
 * exit alcoves are kept clear: they are places to arrive and to leave.
 */
Entities.prototype.populate = function (world) {
    const J = CONFIG.JUNCTION_ALONG;
    const clearOfExit = (s) => world.exits.every((e) => Math.abs(s - e.s) > CONFIG.ALCOVE_HALF + 70);

    for (let k = 0; k < SEGMENTS.length; k++) {
        const seg = SEGMENTS[k];
        const g = world.segs[k];
        let s = g.S + J + (k === 0 ? 120 : 0);
        while (true) {
            s += CONFIG.OBSTACLE_MIN_GAP_FRAMES * Math.max(0.6, Timeline.scrollSpeed(seg)) *
                (0.85 + this.rng() * 0.5);
            if (s > g.E - J) break;
            if (!clearOfExit(s)) continue;
            this.placeAround(world, k, seg, s);
        }
    }

    const N = CONFIG.POCKETS_MAIN_LINE;
    for (let i = 0; i < N; i++) {
        let s = ((i + 0.6) / N) * CONFIG.DIVE_ALONG;
        // Out of a chamber or an alcove, forward, so the count stays exact.
        for (let tries = 0; tries < 20; tries++) {
            const k = Timeline.indexAt(Math.min(s / CONFIG.DIVE_ALONG, 0.9999));
            const g = world.segs[k];
            if (s - g.S > J && g.E - s > J && clearOfExit(s)) break;
            s += 60;
        }
        const k = Timeline.indexAt(Math.min(s / CONFIG.DIVE_ALONG, 0.9999));
        const b = boundsIn(world, k, s);
        this.pockets.push({ s, c: b.center, k, taken: false, t: this.rng() * 6 });
    }
};

/** One protrusion at s in segment k, and what may come with it. */
Entities.prototype.placeAround = function (world, k, seg, s) {
    const g = world.segs[k];
    const b = boundsIn(world, k, s);
    const span = b.hi - b.lo;
    // Two caps, not one. CLEARANCE_MIN is the hard floor - the diver plus room
    // to correct. PROTRUSION_MAX_SPAN is the softer one: a protrusion deeper
    // than half the passage puts the centerline INSIDE the rock, so the
    // obvious line through the cave becomes the wrong one.
    const maxDepth = Math.min(
        Math.max(0, span - CONFIG.CLEARANCE_MIN),
        span * CONFIG.PROTRUSION_MAX_SPAN
    );
    if (maxDepth < 8) return;

    const fromLo = this.rng() < 0.5;
    const depth = Math.min(maxDepth, 14 + this.rng() * maxDepth * 0.7);
    const len = 14 + this.rng() * 16;
    this.rocks.push({ s, len, k, c: fromLo ? b.lo : b.hi - depth, depth, fromLo });

    // A pearl sits in the pocket the protrusion leaves, on the far side of the
    // passage - so reaching it always costs strokes, and strokes cost air.
    if (this.rng() < CONFIG.PEARL_CHANCE) {
        const pc = fromLo ? b.hi - 12 : b.lo + 12;
        this.pearls.push({ s: s + len + 18, c: pc, k, taken: false, t: this.rng() * 6 });
    }

    if (this.rng() < CONFIG.SILT_CHANCE) {
        this.silt.push({ s: s + 60 + this.rng() * 90, c: b.center, k, r: 34 + this.rng() * 26 });
    }

    // Falling rock, in the narrow segments. Explicitly telegraphed for
    // TELEGRAPH + REACTION frames before it moves, because unlike a static
    // protrusion it is not covered by the lamp's sight line.
    if (seg.narrow > 0.5 && this.rng() < 0.3) {
        const ds = s + 40 + this.rng() * 60;
        if (ds < g.E - CONFIG.JUNCTION_ALONG) {
            this.debris.push({
                s: ds, c: b.lo + 6, c0: b.lo + 6, k, v: 0,
                warn: CONFIG.TELEGRAPH_MIN_FRAMES + CONFIG.REACTION_FRAMES,
                warned: false, dead: false,
            });
        }
    }
};

/** True when entity-like `e` is in the camera's segment and near the diver. */
function live(world, e, reach) {
    return e.k === world.segIndex && Math.abs(e.s - world.diverAlong) < (reach || ACTIVE_RANGE);
}

Entities.prototype.update = function (dt, world, player, sfx) {
    const pAlong = world.diverAlongOf(player);
    const pCross = world.axis === 'y' ? player.x : player.y;
    const crossAxis = world.axis === 'y' ? 'x' : 'y';

    let hitSomething = false;
    let siltNow = false;

    for (const r of this.rocks) {
        if (!live(world, r)) continue;
        // r.c is the low cross edge whichever wall the rock grew from.
        const half = CONFIG.PLAYER_H / 2;
        if (pAlong > r.s - 6 && pAlong < r.s + r.len + 6 &&
            pCross > r.c - half && pCross < r.c + r.depth + half) {
            if (player.takeHit(sfx)) {
                hitSomething = true;
                this.explode(pAlong, pCross, r.k, CONFIG.COLORS.rockLit);
            }
            // Rock is SOLID. Without this the diver swims straight through a
            // protrusion and is billed HIT_AIR again every HIT_STUN frames for
            // as long as it stays inside.
            const out = r.fromLo ? r.c + r.depth + half : r.c - half;
            player.pushCross(out, crossAxis);
        }
    }

    for (const d of this.debris) {
        if (d.dead || !live(world, d)) continue;
        if (d.warn > 0) {
            const a = world.screenOf(d.s);
            if (!d.warned && a > 0 && a < world.alongExtent) {
                d.warned = true;
                if (sfx) sfx.rumble();
            }
            if (d.warned) d.warn -= dt;
            continue;
        }
        d.v += CONFIG.DEBRIS_FALL * 0.06 * dt;
        d.c += d.v * dt;
        if (d.c > world.crossExtent) { d.dead = true; continue; }
        if (Math.abs(pAlong - d.s) < 10 && Math.abs(pCross - d.c) < 10) {
            if (player.takeHit(sfx)) {
                hitSomething = true;
                this.explode(d.s, d.c, d.k, CONFIG.COLORS.rockLit);
                d.dead = true;
            }
        }
    }

    for (const s of this.silt) {
        if (!live(world, s)) continue;
        if (Math.hypot(pAlong - s.s, pCross - s.c) < s.r) siltNow = true;
    }

    for (const p of this.pearls) {
        if (p.taken || !live(world, p)) continue;
        p.t += dt * 0.09;
        if (Math.abs(pAlong - p.s) < 11 && Math.abs(pCross - p.c) < 11) {
            p.taken = true;
            player.pearls++;
            this.explode(p.s, p.c, p.k, CONFIG.COLORS.pearl);
            if (sfx) sfx.pearl();
        }
    }

    for (const p of this.pockets) {
        if (p.taken || !live(world, p)) continue;
        p.t += dt * 0.07;
        if (Math.abs(pAlong - p.s) < 15 && Math.abs(pCross - p.c) < 15) {
            p.taken = true;
            player.giveAir(CONFIG.POCKET_REFILL, sfx);
            this.explode(p.s, p.c, p.k, CONFIG.COLORS.air);
        }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.s += p.vs * dt; p.c += p.vc * dt; p.life -= dt;
        if (p.life <= 0 || p.k !== world.segIndex) this.particles.splice(i, 1);
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
        if (p.taken || !live(world, p, 400)) continue;
        const sc = world.toScreen(p.s, p.c);
        out.push({ x: sc.x, y: sc.y, r: 30, a: 0.55 });
    }
    for (const p of this.pearls) {
        if (p.taken || !live(world, p, 400)) continue;
        const sc = world.toScreen(p.s, p.c);
        out.push({ x: sc.x, y: sc.y, r: 18, a: 0.45 });
    }
    return out;
};

Entities.prototype.draw = function (ctx, world) {
    const C = CONFIG.COLORS;
    const near = (e) => live(world, e, 420);

    for (const r of this.rocks) {
        if (!near(r)) continue;
        const a = world.screenOf(r.s);
        // In the ascent along runs up the screen, so the rock's extent does too.
        const a0 = Math.round(world.flip ? a - r.len : a);
        if (world.axis === 'y') {
            ctx.fillStyle = C.rock;
            ctx.fillRect(Math.round(r.c), a0, Math.round(r.depth), Math.round(r.len));
            ctx.fillStyle = C.rockLit;
            ctx.fillRect(Math.round(r.fromLo ? r.c + r.depth - 2 : r.c), a0, 2, Math.round(r.len));
        } else {
            ctx.fillStyle = C.rock;
            ctx.fillRect(a0, Math.round(r.c), Math.round(r.len), Math.round(r.depth));
            ctx.fillStyle = C.rockLit;
            ctx.fillRect(a0, Math.round(r.fromLo ? r.c + r.depth - 2 : r.c), Math.round(r.len), 2);
        }
    }

    for (const d of this.debris) {
        if (d.dead || !near(d)) continue;
        const sc = world.toScreen(d.s, d.c);
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
        const sc = world.toScreen(s.s, s.c);
        ctx.globalAlpha = 0.34;
        Renderer.glow(ctx, sc.x, sc.y, s.r, '107,90,73', 0.9);
        ctx.globalAlpha = 1;
    }

    for (const p of this.pockets) {
        if (p.taken || !near(p)) continue;
        const sc = world.toScreen(p.s, p.c);
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
        const sc = world.toScreen(p.s, p.c);
        Renderer.glow(ctx, sc.x, sc.y, 13, '255,217,138', 0.4);
        sprite(ctx, SPR_PEARL, Math.round(sc.x) - 3, Math.round(sc.y) - 3 + Math.round(Math.sin(p.t) * 1.5));
    }

    for (const p of this.particles) {
        const sc = world.toScreen(p.s, p.c);
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(sc.x), Math.round(sc.y), 2, 2);
        ctx.globalAlpha = 1;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Entities };
}
