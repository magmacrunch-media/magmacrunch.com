// entities.js — Roderick Tron | MagmaCrunch Media © 2026
// Enemies, projectiles, pickups, the companion, and the effects for all of it.
//
// Everything here is in WORLD pixels and converted at draw time. The runner
// this replaced kept entities in screen space and hand-scrolled them, which
// only held while the camera moved at one fixed rate.

function Entities(tilemap) {
    this.map = tilemap;
    this.reset();
}

Entities.prototype.reset = function () {
    const map = this.map;
    this.enemies = map.enemies.map(function (e) {
        return {
            kind: e.kind,
            x: e.x, y: e.y,
            homeY: e.y,
            w: CONFIG.GARGOYLE_W, h: CONFIG.GARGOYLE_H,
            dir: -1,
            phase: (e.x * 0.07) % (Math.PI * 2),
            hp: e.kind === 'statue' ? CONFIG.STATUE_HP
                : e.kind === 'flyer' ? CONFIG.FLYER_HP
                : CONFIG.GARGOYLE_HP,
            flash: 0,
            dead: false,
        };
    });
    // Pickups live on the map, so a retry restores them by clearing the flags
    // rather than by reparsing the level.
    map.notes.forEach(function (n) { n.taken = false; });
    map.letters.forEach(function (l) { l.taken = false; });

    this.shots = [];
    this.particles = [];
    this.popups = [];
    this.bird = null;
    this.events = [];
};

// ── Projectiles ───────────────────────────────────────────

Entities.prototype.fire = function (player) {
    this.shots.push({
        x: player.box.x + (player.facing > 0 ? player.box.w : -CONFIG.NOTE_W),
        y: player.box.y + 6,
        vx: player.facing * CONFIG.NOTE_SPEED,
        life: CONFIG.NOTE_LIFE,
    });
};

// ── Per-frame ─────────────────────────────────────────────

Entities.prototype.update = function (player, dt) {
    this.events.length = 0;
    this.updateShots(dt);
    this.updateEnemies(player, dt);
    this.updatePickups(player);
    this.updateBird(player, dt);
    this.updateParticles(dt);
    this.updatePopups(dt);
};

Entities.prototype.updateShots = function (dt) {
    for (let i = this.shots.length - 1; i >= 0; i--) {
        const s = this.shots[i];
        s.x += s.vx * dt;
        s.life -= dt;
        // A note that hits masonry stops there rather than sailing through it.
        if (s.life <= 0 || this.map.overlapsSolid(s.x, s.y, CONFIG.NOTE_W, CONFIG.NOTE_H)) {
            this.spawnParticles(s.x, s.y, 3, CONFIG.COLORS.robotCyan, 10);
            this.shots.splice(i, 1);
            continue;
        }
        for (let j = 0; j < this.enemies.length; j++) {
            const e = this.enemies[j];
            if (e.dead) continue;
            if (!overlap(s.x, s.y, CONFIG.NOTE_W, CONFIG.NOTE_H, e.x, e.y, e.w, e.h)) continue;
            this.damage(e, 1);
            this.shots.splice(i, 1);
            break;
        }
    }
};

Entities.prototype.damage = function (e, n) {
    e.hp -= n;
    e.flash = 6;
    const cx = e.x + e.w / 2;
    const cy = e.y + e.h / 2;
    if (e.hp > 0) {
        this.spawnParticles(cx, cy, 4, CONFIG.COLORS.robotCyan, 12);
        return false;
    }
    e.dead = true;
    this.spawnParticles(cx, cy, 9, CONFIG.COLORS.particleStone, 22);
    this.events.push({ type: 'kill', kind: e.kind, x: cx, y: cy });
    return true;
};

Entities.prototype.updateEnemies = function (player, dt) {
    const p = player.box;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (e.flash > 0) e.flash -= dt;
        if (e.dead) { this.enemies.splice(i, 1); continue; }

        if (e.kind === 'gargoyle') {
            // Walks, and turns at a wall or a ledge. Checking for footing one
            // step ahead is what keeps them on their own rooftop instead of
            // marching off it within seconds of the level starting.
            const step = e.dir * CONFIG.GARGOYLE_SPEED * dt;
            const ahead = e.x + step + (e.dir > 0 ? e.w : -1);
            if (this.map.overlapsSolid(e.x + step, e.y, e.w, e.h)
                || !this.map.hasFooting(ahead, e.y, 1, e.h)) {
                e.dir *= -1;
            } else {
                e.x += step;
            }
        } else if (e.kind === 'flyer') {
            e.phase += CONFIG.FLYER_BOB_RATE * dt;
            e.y = e.homeY + Math.sin(e.phase) * CONFIG.FLYER_BOB_AMP;
            const step = e.dir * CONFIG.FLYER_SPEED * dt;
            if (this.map.overlapsSolid(e.x + step, e.y, e.w, e.h)) e.dir *= -1;
            else e.x += step;
        }
        // A statue does nothing. That is the point of it.

        if (!player.alive || player.exiting) continue;

        if (!overlap(p.x, p.y, p.w, p.h, e.x, e.y, e.w, e.h)) continue;

        // ── Contact ───────────────────────────────────────
        // A roll goes straight through anything soft.
        if (player.rolling && e.kind !== 'statue') {
            this.damage(e, 99);
            continue;
        }

        // Coming down on it counts as a stomp. Requiring downward motion and
        // feet above its middle is what stops a walk into the side of one from
        // reading as a stomp.
        const falling = player.vy > 0;
        const above = p.y + p.h - player.vy <= e.y + e.h * 0.6;
        if (falling && above) {
            if (e.kind === 'statue') {
                // Too heavy to flatten: you bounce, it does not care.
                player.stompBounce();
                this.spawnParticles(e.x + e.w / 2, e.y, 4, CONFIG.COLORS.particleStone, 10);
                Sfx.play('land');           // it shrugs the stomp off
                continue;
            }
            this.damage(e, 99);
            player.stompBounce();
            Sfx.play('stomp');
            continue;
        }

        this.events.push({ type: 'hurt', x: e.x + e.w / 2 });
    }
};

Entities.prototype.updatePickups = function (player) {
    if (!player.alive) return;
    const p = player.box;

    for (let i = 0; i < this.map.notes.length; i++) {
        const n = this.map.notes[i];
        if (n.taken || !overlap(p.x, p.y, p.w, p.h, n.x, n.y, n.w, n.h)) continue;
        n.taken = true;
        this.spawnParticles(n.x + 4, n.y + 4, 3, CONFIG.COLORS.noteWhite, 12);
        this.events.push({ type: 'note', x: n.x, y: n.y });
    }

    for (let i = 0; i < this.map.letters.length; i++) {
        const l = this.map.letters[i];
        if (l.taken || !overlap(p.x, p.y, p.w, p.h, l.x, l.y, l.w, l.h)) continue;
        l.taken = true;
        this.spawnParticles(l.x + 6, l.y + 6, 6, CONFIG.COLORS.letterGold, 20);
        this.events.push({ type: 'letter', ch: l.ch, x: l.x, y: l.y });
    }
};

/**
 * The clockwork bird.
 *
 * It trails rather than tracks, so it reads as following him rather than being
 * welded on, and it is drawn behind so it never hides the thing you are aiming.
 */
Entities.prototype.updateBird = function (player, dt) {
    if (!player.hasBird) { this.bird = null; return; }
    const tx = player.box.x - player.facing * 13;
    const ty = player.box.y - 9;
    if (!this.bird) { this.bird = { x: tx, y: ty, phase: 0 }; return; }
    const k = Math.min(1, CONFIG.BIRD_FOLLOW_LAG * dt);
    this.bird.x += (tx - this.bird.x) * k;
    this.bird.y += (ty - this.bird.y) * k;
    this.bird.phase += CONFIG.BIRD_BOB_RATE * dt;
};

Entities.prototype.updateParticles = function (dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.16 * dt;
        p.life -= dt;
        if (p.life <= 0) this.particles.splice(i, 1);
    }
};

Entities.prototype.updatePopups = function (dt) {
    for (let i = this.popups.length - 1; i >= 0; i--) {
        const p = this.popups[i];
        p.y -= 0.32 * dt;
        p.life -= dt;
        if (p.life <= 0) this.popups.splice(i, 1);
    }
};

Entities.prototype.spawnParticles = function (x, y, n, color, life) {
    for (let i = 0; i < n; i++) {
        this.particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 3.2,
            vy: (Math.random() - 1) * 2.4,
            life: life, max: life, color: color,
        });
    }
};

Entities.prototype.addPopup = function (x, y, text, color) {
    this.popups.push({ x: x, y: y, text: text, color: color, life: 44, max: 44 });
};

// ── Drawing ───────────────────────────────────────────────

Entities.prototype.draw = function (ctx, camX, camY, frame) {
    for (let i = 0; i < this.enemies.length; i++) this.drawEnemy(ctx, this.enemies[i], camX, camY);
    for (let i = 0; i < this.shots.length; i++) this.drawShot(ctx, this.shots[i], camX, camY);
    for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), 2, 2);
        ctx.globalAlpha = 1;
    }
    for (let i = 0; i < this.popups.length; i++) {
        const p = this.popups[i];
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
        ctx.fillStyle = p.color;
        ctx.font = '6px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(p.text, Math.round(p.x - camX), Math.round(p.y - camY));
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
    }
    void frame;
};

Entities.prototype.drawBird = function (ctx, camX, camY) {
    if (!this.bird) return;
    const x = Math.round(this.bird.x - camX);
    const y = Math.round(this.bird.y - camY + Math.sin(this.bird.phase) * CONFIG.BIRD_BOB_AMP);
    const C = CONFIG.COLORS;
    const flap = Math.sin(this.bird.phase * 3) > 0 ? 1 : -1;
    ctx.fillStyle = C.birdBrass;
    ctx.fillRect(x + 2, y + 2, 6, 4);
    ctx.fillRect(x + 7, y + 1, 3, 3);
    ctx.fillStyle = C.gargoyleDark;
    ctx.fillRect(x + 9, y + 2, 2, 1);
    ctx.fillStyle = C.birdBrass;
    ctx.fillRect(x + 1, y + 2 - flap * 2, 5, 2);
    ctx.fillStyle = C.robotCyan;
    ctx.fillRect(x + 8, y + 2, 1, 1);
};

Entities.prototype.drawEnemy = function (ctx, e, camX, camY) {
    const x = Math.round(e.x - camX);
    const y = Math.round(e.y - camY);
    const C = CONFIG.COLORS;
    const lit = e.flash > 0;

    if (e.kind === 'flyer') {
        const beat = Math.sin(e.phase * 4);
        const lift = Math.round(beat * 3);
        ctx.fillStyle = C.flyerWing;
        for (let s = 0; s < 3; s++) {
            const h = 5 - s;
            const dy = y + 3 - Math.round(lift * (s + 1) * 0.6);
            ctx.fillRect(x - 1 - s * 3, dy, 3, h);
            ctx.fillRect(x + 12 + s * 3, dy, 3, h);
        }
    }

    if (e.kind === 'statue') {
        ctx.fillStyle = lit ? '#ffffff' : C.statueStone;
        ctx.fillRect(x, y - 2, 14, 16);
        ctx.fillStyle = C.gargoyleDark;
        ctx.fillRect(x + 2, y + 1, 3, 3);
        ctx.fillRect(x + 9, y + 1, 3, 3);
        ctx.fillStyle = C.gargoyleEye;
        ctx.fillRect(x + 3, y + 2, 1, 1);
        ctx.fillRect(x + 10, y + 2, 1, 1);
        ctx.fillStyle = C.gableStone;
        ctx.fillRect(x, y + 12, 14, 2);
        return;
    }

    ctx.fillStyle = lit ? '#ffffff' : C.gargoyleStone;
    ctx.fillRect(x + 2, y + 4, 10, 8);
    ctx.fillRect(x + 4, y + 1, 6, 5);
    if (!lit) {
        ctx.fillStyle = '#4a4a5c';
        ctx.fillRect(x + 2, y + 10, 10, 2);
        ctx.fillRect(x + 3, y + 4, 1, 6);
    }
    ctx.fillStyle = C.gargoyleDark;
    ctx.fillRect(x + 3, y, 2, 2);
    ctx.fillRect(x + 9, y, 2, 2);
    ctx.fillRect(x + 1, y + 10, 2, 2);
    ctx.fillRect(x + 11, y + 10, 2, 2);

    ctx.fillStyle = 'rgba(255, 61, 110, 0.25)';
    ctx.fillRect(x + 4, y + 1, 4, 4);
    ctx.fillRect(x + 8, y + 1, 4, 4);
    ctx.fillStyle = C.gargoyleEye;
    ctx.fillRect(x + 5, y + 2, 2, 2);
    ctx.fillRect(x + 9, y + 2, 2, 2);
};

Entities.prototype.drawShot = function (ctx, s, camX, camY) {
    const x = Math.round(s.x - camX);
    const y = Math.round(s.y - camY);
    Renderer.glow(ctx, x + 3, y + 4, 9, '0,245,255', 0.30);
    ctx.fillStyle = CONFIG.COLORS.noteWhite;
    ctx.fillRect(x, y + 4, 4, 4);
    ctx.fillRect(x + 1, y + 3, 3, 1);
    ctx.fillRect(x, y + 8, 3, 1);
    ctx.fillRect(x + 4, y, 1, 5);
    ctx.fillRect(x + 5, y, 2, 1);
    ctx.fillRect(x + 5, y + 1, 1, 2);
};

/** AABB overlap, shared by every collision in this file. */
function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
