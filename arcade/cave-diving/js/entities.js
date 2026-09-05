// entities.js — cave diving (not even once) | MagmaCrunch Media (c) 2026
// Everything in the passage: protrusions, falling rock, silt, pearls, air.
//
// Entities are stored in cave space - `s` along the passage, `c` across it -
// and converted to screen only at draw and contact time. That keeps them
// correct across a change of scroll axis for the same reason the diver is
// stored in screen space: neither is expressed in terms of the other.

/* global CONFIG, Renderer, sprite, SPR_PEARL, SPR_DEBRIS */

function Entities(rng) {
    this.rng = rng;
    this.reset();
}

Entities.prototype.reset = function () {
    this.rocks = [];
    this.debris = [];
    this.silt = [];
    this.pearls = [];
    this.pockets = [];
    this.particles = [];
    this.nextRockAt = 260;
    this.pocketsSpawned = 0;
    this.pearlsSeen = 0;
};

Entities.prototype.explode = function (s, c, color) {
    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
        const a = (Math.PI * 2 * i) / CONFIG.PARTICLE_COUNT;
        this.particles.push({
            s, c,
            vs: Math.cos(a) * CONFIG.PARTICLE_SPEED,
            vc: Math.sin(a) * CONFIG.PARTICLE_SPEED,
            life: CONFIG.PARTICLE_LIFE, max: CONFIG.PARTICLE_LIFE, color,
        });
    }
};

/**
 * Spawn everything due ahead of the camera.
 *
 * Air pockets are NOT random. They are placed at fixed fractions of the dive
 * so the air budget is deterministic and the test can assert it - a pocket
 * that might or might not appear is a pocket the budget cannot be written
 * against. Everything else is seeded random.
 */
Entities.prototype.spawnAhead = function (world, seg, f) {
    const ahead = world.camAlong + world.alongExtent + 120;

    const duePockets = Math.floor(f * CONFIG.POCKETS_MAIN_LINE) + 1;
    if (this.pocketsSpawned < duePockets && world.junction <= 0) {
        const b = world.boundsAt(ahead);
        this.pockets.push({ s: ahead, c: b.center, taken: false, t: this.rng() * 6 });
        this.pocketsSpawned++;
    }

    if (world.camAlong < this.nextRockAt || world.junction > 0) return;

    const gap = CONFIG.OBSTACLE_MIN_GAP_FRAMES * Math.max(0.6, world.speed);
    this.nextRockAt = world.camAlong + gap * (0.85 + this.rng() * 0.5);

    const b = world.boundsAt(ahead);
    const span = b.hi - b.lo;
    // Two caps, not one. CLEARANCE_MIN is the hard floor - the diver plus room
    // to correct. HALF_SPAN is the softer one: a protrusion deeper than half
    // the passage puts the centreline INSIDE the rock, so the obvious line
    // through the cave becomes the wrong one and the passage stops reading as
    // navigable at all. Without it the simulated baseline diver ground along
    // the rock the whole way down and drowned 14 seconds in.
    const maxDepth = Math.min(
        Math.max(0, span - CONFIG.CLEARANCE_MIN),
        span * CONFIG.PROTRUSION_MAX_SPAN
    );
    if (maxDepth < 8) return;

    const fromLo = this.rng() < 0.5;
    const depth = Math.min(maxDepth, 14 + this.rng() * maxDepth * 0.7);
    const len = 14 + this.rng() * 16;
    this.rocks.push({
        s: ahead, len,
        c: fromLo ? b.lo : b.hi - depth,
        depth, fromLo,
    });

    // A pearl sits in the pocket the protrusion leaves, on the far side of the
    // passage - so reaching it always costs strokes, and strokes cost air.
    if (this.rng() < CONFIG.PEARL_CHANCE) {
        const pc = fromLo ? b.hi - 12 : b.lo + 12;
        this.pearls.push({ s: ahead + len + 18, c: pc, taken: false, t: this.rng() * 6 });
        this.pearlsSeen++;
    }

    if (this.rng() < CONFIG.SILT_CHANCE) {
        this.silt.push({ s: ahead + 60 + this.rng() * 90, c: b.center, r: 34 + this.rng() * 26 });
    }

    // Falling rock, from the fourth segment on. Explicitly telegraphed for
    // TELEGRAPH + REACTION frames before it moves, because unlike a static
    // protrusion it is not covered by the lamp's sight line.
    if (seg.narrow > 0.5 && this.rng() < 0.3) {
        this.debris.push({
            s: ahead + 40 + this.rng() * 60,
            c: b.lo + 6,
            v: 0,
            warn: CONFIG.TELEGRAPH_MIN_FRAMES + CONFIG.REACTION_FRAMES,
            warned: false,
            dead: false,
        });
    }
};

Entities.prototype.update = function (dt, world, player, seg, f, sfx) {
    // Everything in the passage was placed in the OLD cross axis. Keeping it
    // would scatter rocks and pearls across a junction chamber at coordinates
    // that no longer mean anything.
    if (world.axisChanged) {
        this.rocks.length = 0;
        this.debris.length = 0;
        this.silt.length = 0;
        this.pearls.length = 0;
        // An un-taken pocket thrown away here is air the dive never gets back,
        // and pocketsSpawned is what decides whether another one is due - so
        // clearing without crediting them silently deleted half the dive's air
        // across six axis changes and drowned the diver four seconds from home.
        for (const p of this.pockets) if (!p.taken) this.pocketsSpawned--;
        this.pockets.length = 0;
        this.nextRockAt = world.camAlong + 200;
    }
    this.spawnAhead(world, seg, f);

    const behind = world.camAlong - 120;
    const pAlong = world.alongAtScreen(world.axis === 'y' ? player.y : player.x);
    const pCross = world.axis === 'y' ? player.x : player.y;

    let hitSomething = false;
    let siltNow = false;

    for (let i = this.rocks.length - 1; i >= 0; i--) {
        const r = this.rocks[i];
        if (r.s + r.len < behind) { this.rocks.splice(i, 1); continue; }
        // r.c is the low cross edge whichever wall the rock grew from.
        const half = CONFIG.PLAYER_H / 2;
        if (pAlong > r.s - 6 && pAlong < r.s + r.len + 6 &&
            pCross > r.c - half && pCross < r.c + r.depth + half) {
            if (player.takeHit(sfx)) {
                hitSomething = true;
                this.explode(pAlong, pCross, CONFIG.COLORS.rockLit);
            }
            // Rock is SOLID. Without this the diver swims straight through a
            // protrusion and is billed HIT_AIR again every HIT_STUN frames for
            // as long as it stays inside - which is how a baseline diver lost
            // 64 air to one tunnel and drowned less than a minute in.
            const out = r.fromLo ? r.c + r.depth + half : r.c - half;
            player.pushCross(out, world.axis === 'y' ? 'x' : 'y');
        }
    }

    for (let i = this.debris.length - 1; i >= 0; i--) {
        const d = this.debris[i];
        if (d.s < behind || d.dead) { this.debris.splice(i, 1); continue; }
        if (d.warn > 0) {
            if (!d.warned && world.screenOf(d.s) < world.alongExtent) {
                d.warned = true;
                if (sfx) sfx.rumble();
            }
            d.warn -= dt;
            continue;
        }
        d.v += CONFIG.DEBRIS_FALL * 0.06 * dt;
        d.c += d.v * dt;
        if (d.c > world.crossExtent) { d.dead = true; continue; }
        if (Math.abs(pAlong - d.s) < 10 && Math.abs(pCross - d.c) < 10) {
            if (player.takeHit(sfx)) {
                hitSomething = true;
                this.explode(d.s, d.c, CONFIG.COLORS.rockLit);
                d.dead = true;
            }
        }
    }

    for (let i = this.silt.length - 1; i >= 0; i--) {
        const s = this.silt[i];
        if (s.s + s.r < behind) { this.silt.splice(i, 1); continue; }
        if (Math.hypot(pAlong - s.s, pCross - s.c) < s.r) siltNow = true;
    }

    for (let i = this.pearls.length - 1; i >= 0; i--) {
        const p = this.pearls[i];
        if (p.s < behind) { this.pearls.splice(i, 1); continue; }
        p.t += dt * 0.09;
        if (!p.taken && Math.abs(pAlong - p.s) < 11 && Math.abs(pCross - p.c) < 11) {
            p.taken = true;
            player.pearls++;
            this.explode(p.s, p.c, CONFIG.COLORS.pearl);
            if (sfx) sfx.pearl();
        }
    }

    for (let i = this.pockets.length - 1; i >= 0; i--) {
        const p = this.pockets[i];
        if (p.s < behind) { this.pockets.splice(i, 1); continue; }
        p.t += dt * 0.07;
        if (!p.taken && Math.abs(pAlong - p.s) < 15 && Math.abs(pCross - p.c) < 15) {
            p.taken = true;
            player.giveAir(CONFIG.POCKET_REFILL, sfx);
            this.explode(p.s, p.c, CONFIG.COLORS.air);
        }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.s += p.vs * dt; p.c += p.vc * dt; p.life -= dt;
        if (p.life <= 0) this.particles.splice(i, 1);
    }

    return { hit: hitSomething, silt: siltNow };
};

/** Lights the mask should punch besides the headlamp. */
Entities.prototype.lights = function (world) {
    const out = [];
    for (let i = 0; i < this.pockets.length; i++) {
        const p = this.pockets[i];
        if (p.taken) continue;
        const sc = world.toScreen(p.s, p.c);
        out.push({ x: sc.x, y: sc.y, r: 30, a: 0.55 });
    }
    for (let i = 0; i < this.pearls.length; i++) {
        const p = this.pearls[i];
        if (p.taken) continue;
        const sc = world.toScreen(p.s, p.c);
        out.push({ x: sc.x, y: sc.y, r: 18, a: 0.45 });
    }
    return out;
};

Entities.prototype.draw = function (ctx, world) {
    const C = CONFIG.COLORS;

    for (let i = 0; i < this.rocks.length; i++) {
        const r = this.rocks[i];
        const a = world.screenOf(r.s);
        if (a < -60 || a > world.alongExtent + 60) continue;
        if (world.axis === 'y') {
            ctx.fillStyle = C.rock;
            ctx.fillRect(Math.round(r.c), Math.round(a), Math.round(r.depth), Math.round(r.len));
            ctx.fillStyle = C.rockLit;
            ctx.fillRect(Math.round(r.fromLo ? r.c + r.depth - 2 : r.c), Math.round(a), 2, Math.round(r.len));
        } else {
            ctx.fillStyle = C.rock;
            ctx.fillRect(Math.round(a), Math.round(r.c), Math.round(r.len), Math.round(r.depth));
            ctx.fillStyle = C.rockLit;
            ctx.fillRect(Math.round(a), Math.round(r.fromLo ? r.c + r.depth - 2 : r.c), Math.round(r.len), 2);
        }
    }

    for (let i = 0; i < this.debris.length; i++) {
        const d = this.debris[i];
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

    for (let i = 0; i < this.silt.length; i++) {
        const s = this.silt[i];
        const sc = world.toScreen(s.s, s.c);
        ctx.globalAlpha = 0.34;
        Renderer.glow(ctx, sc.x, sc.y, s.r, '107,90,73', 0.9);
        ctx.globalAlpha = 1;
    }

    for (let i = 0; i < this.pockets.length; i++) {
        const p = this.pockets[i];
        if (p.taken) continue;
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

    for (let i = 0; i < this.pearls.length; i++) {
        const p = this.pearls[i];
        if (p.taken) continue;
        const sc = world.toScreen(p.s, p.c);
        Renderer.glow(ctx, sc.x, sc.y, 13, '255,217,138', 0.4);
        sprite(ctx, SPR_PEARL, Math.round(sc.x) - 3, Math.round(sc.y) - 3 + Math.round(Math.sin(p.t) * 1.5));
    }

    for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
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
