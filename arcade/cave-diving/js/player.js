// player.js — cave diving (not even once) | MagmaCrunch Media (c) 2026
// Buoyancy, drag, the stroke, and the air that pays for all of it.

/* global CONFIG */

function Player() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    // Facing is a unit vector, kept separate from velocity: you can drift one
    // way while still looking - and therefore still lighting - another.
    this.fx = 1;
    this.fy = 0;
    this.air = CONFIG.AIR_MAX;
    this.strokeCd = 0;
    this.stun = 0;
    this.kick = 0;          // animation phase, counts down from a stroke
    this.strokes = 0;
    this.hits = 0;
    this.pearls = 0;
    this.dead = false;
}

Player.prototype.reset = function (x, y) {
    Player.call(this);
    this.x = x;
    this.y = y;
};

/** Axis-aligned box used for every contact test. Smaller than the sprite. */
Player.prototype.box = function () {
    return {
        x: this.x - CONFIG.PLAYER_W / 2,
        y: this.y - CONFIG.PLAYER_H / 2,
        w: CONFIG.PLAYER_W,
        h: CONFIG.PLAYER_H,
    };
};

/**
 * One frame of swimming.
 *
 * `ax`/`ay` are the steer axes in -1..1 and `stroke` is edge-triggered.
 */
Player.prototype.update = function (dt, ax, ay, stroke, world, sfx) {
    if (this.stun > 0) this.stun -= dt;

    // Steady pushes (steering, buoyancy) are ACCELERATIONS integrated with the
    // drag below; a stroke is an impulse and goes straight into the velocity.
    let accX = 0, accY = 0;
    const mag = Math.hypot(ax, ay);
    if (mag > 0.08) {
        const nx = ax / mag, ny = ay / mag;
        // Facing eases toward the stick rather than snapping, so the lamp cone
        // sweeps instead of teleporting.
        const ease = Math.min(1, 0.22 * dt);
        this.fx += (nx - this.fx) * ease;
        this.fy += (ny - this.fy) * ease;
        const fl = Math.hypot(this.fx, this.fy) || 1;
        this.fx /= fl; this.fy /= fl;

        const steer = this.stun > 0 ? CONFIG.STEER_ACCEL * 0.3 : CONFIG.STEER_ACCEL;
        accX += nx * steer * Math.min(1, mag);
        accY += ny * steer * Math.min(1, mag);
    }

    if (this.strokeCd > 0) this.strokeCd -= dt;
    if (stroke && this.strokeCd <= 0 && this.stun <= 0 && this.air > 0) {
        this.vx += this.fx * CONFIG.STROKE_IMPULSE;
        this.vy += this.fy * CONFIG.STROKE_IMPULSE;
        this.air -= CONFIG.STROKE_AIR;
        this.strokeCd = CONFIG.STROKE_COOLDOWN;
        this.kick = 8;
        this.strokes++;
        if (sfx) { sfx.stroke(); if (this.strokes % 3 === 0) sfx.bubble(); }
    }
    if (this.kick > 0) this.kick -= dt;

    // Slightly negative buoyancy. Doing nothing sinks you.
    accY += CONFIG.SINK;

    // There is deliberately no "current" term here. The water is still and
    // the camera follows the diver (see world.js follow()), so a passive diver
    // simply sinks: forward in a shaft, backward in the ascent. An earlier
    // pass pushed the diver along the scroll axis as well, which double-
    // counted the scroll and - because World never defined the currentX/
    // currentY it read - poisoned the position with NaN on the first frame.

    const sp = Math.hypot(this.vx, this.vy);
    if (sp > CONFIG.MAX_SPEED) {
        this.vx = (this.vx / sp) * CONFIG.MAX_SPEED;
        this.vy = (this.vy / sp) * CONFIG.MAX_SPEED;
    }

    // Drag is exponential, so integrate it exactly: dv/dt = acc - k v. Over a
    // step the velocity decays by d toward acc / k, and the diver travels the
    // integral of that. Euler steps are first order in dt, which made a stroke
    // 23.4px of glide at 60Hz and 24.0px at 120Hz; with the camera following
    // the diver, that difference is the level. Now it is 24.7px at any rate.
    const k = -Math.log(CONFIG.DRAG);
    const d = Math.exp(-k * dt);
    const glide = (1 - d) / k;
    this.x += this.vx * glide + (accX / k) * (dt - glide);
    this.y += this.vy * glide + (accY / k) * (dt - glide);
    this.vx = this.vx * d + (accX / k) * (1 - d);
    this.vy = this.vy * d + (accY / k) * (1 - d);

    this.air -= CONFIG.AIR_DRAIN * dt;
    if (this.air <= 0) { this.air = 0; this.dead = true; }
};

// Walls block but never damage - a squeeze you can lose air to just by
// touching it is a squeeze nobody will enter. world.move() does the blocking
// now, against the same water test the terrain is drawn from; only a rock
// lump that it reports costs breath (entities.js).

Player.prototype.takeHit = function (sfx) {
    if (this.stun > 0) return false;        // one hit per contact, not per frame
    this.air -= CONFIG.HIT_AIR;
    this.stun = CONFIG.HIT_STUN;
    this.hits++;
    if (this.air <= 0) { this.air = 0; this.dead = true; }
    if (sfx) { sfx.hit(); sfx.gasp(); }
    return true;
};

Player.prototype.giveAir = function (amount, sfx) {
    this.air = Math.min(CONFIG.AIR_MAX, this.air + amount);
    if (sfx) sfx.pocket();
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Player };
}
