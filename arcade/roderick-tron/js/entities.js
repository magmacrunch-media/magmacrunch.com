// entities.js — Roderick Tron | MagmaCrunch Media © 2026
// Gargoyles, projectiles, particles
//
// Coordinates: gargoyles and notes are stored in WORLD space and converted to
// screen space at draw and collision time. They used to be stored in screen
// space and hand-scrolled by `x -= speed`, which worked only as long as the
// camera moved at exactly that rate — respawning, which now jumps the camera
// forward, would have torn them off their rooftops.

function Entities() {
    this.reset();
}

Entities.prototype.reset = function () {
    this.gargoyles = [];
    this.notes = [];
    this.particles = [];
    this.popups = [];
    this.shootCooldown = 0;
    this.cameraX = 0;
    this.killsThisFrame = [];
};

// ── Spawn note projectile ──────────────────────────────
Entities.prototype.spawnNote = function (screenX, screenY, scrollSpeed) {
    if (this.shootCooldown > 0) return false;
    this.notes.push({
        x: screenX + this.cameraX,
        y: screenY,
        // Notes travel at NOTE_SPEED relative to the *screen*, so they keep the
        // same reach whatever the world is doing underneath them.
        vx: CONFIG.NOTE_SPEED + scrollSpeed,
    });
    this.shootCooldown = CONFIG.FIRE_RATE;
    return true;
};

// ── Spawn a gargoyle for a rooftop (world coordinates) ─
Entities.prototype.spawnGargoyle = function (roof) {
    if (roof.gargoyle === 'flyer') {
        const baseY = Math.max(
            CONFIG.FLYER_MIN_Y,
            roof.y - 46 - Math.random() * 34
        );
        this.gargoyles.push({
            kind: 'flyer',
            x: roof.x + roof.width * 0.5,
            y: baseY,
            baseY: baseY,
            phase: Math.random() * Math.PI * 2,
            state: 'active',
            timer: 0,
            flash: 0,
            hp: CONFIG.FLYER_HP,
        });
        return;
    }

    const x = roof.x + roof.width * 0.5 + (Math.random() - 0.5) * roof.width * 0.4;
    const baseY = roof.y - CONFIG.GARGOYLE_H;
    this.gargoyles.push({
        kind: 'percher',
        x: x,
        y: baseY,
        baseY: baseY,
        state: 'idle',       // idle -> alert -> lunge -> recover -> idle
        timer: 0,
        flash: 0,
        hp: CONFIG.GARGOYLE_HP,
    });
};

// ── Update all entities ────────────────────────────────
Entities.prototype.update = function (world, player, dt) {
    this.cameraX = world.cameraX;
    this.killsThisFrame.length = 0;

    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    // Spawn gargoyles for rooftops that have come within reach.
    const rooftops = world.rooftops;
    for (let i = 0; i < rooftops.length; i++) {
        const r = rooftops[i];
        if (r.gargoyle && !r.gargoyleSpawned) {
            const screenX = r.x - this.cameraX;
            if (screenX < CONFIG.CANVAS_W + 220) {
                this.spawnGargoyle(r);
                r.gargoyleSpawned = true;
            }
        }
    }

    this.updateNotes(dt);
    this.updateGargoyles(player, dt);
    this.updateParticles(dt);
    this.updatePopups(dt);
};

Entities.prototype.updateNotes = function (dt) {
    for (let i = this.notes.length - 1; i >= 0; i--) {
        const n = this.notes[i];
        n.x += n.vx * dt;
        if (n.x - this.cameraX > CONFIG.CANVAS_W + 20) {
            this.notes.splice(i, 1);
            continue;
        }

        for (let j = this.gargoyles.length - 1; j >= 0; j--) {
            const g = this.gargoyles[j];
            if (g.state === 'dead') continue;
            if (!this.rectsOverlap(n.x, n.y, CONFIG.NOTE_W, CONFIG.NOTE_H,
                                   g.x, g.y, CONFIG.GARGOYLE_W, CONFIG.GARGOYLE_H)) continue;

            g.hp--;
            g.flash = 5;
            this.notes.splice(i, 1);
            const cx = g.x + CONFIG.GARGOYLE_W / 2;
            const cy = g.y + CONFIG.GARGOYLE_H / 2;
            if (g.hp <= 0) {
                g.state = 'dead';
                this.spawnDeathParticles(cx, cy);
                this.killsThisFrame.push({ kind: g.kind, x: cx, y: cy });
                this.gargoyles.splice(j, 1);
            } else {
                this.spawnHitParticles(cx, cy);
                // A wounded percher is startled awake even if you were out of range.
                if (g.kind === 'percher' && g.state === 'idle') {
                    g.state = 'alert';
                    g.timer = 0;
                }
            }
            break;
        }
    }
};

Entities.prototype.updateGargoyles = function (player, dt) {
    const playerCentre = player.x + CONFIG.PLAYER_W / 2;

    for (let i = this.gargoyles.length - 1; i >= 0; i--) {
        const g = this.gargoyles[i];
        const screenX = g.x - this.cameraX;

        if (screenX < -60) {
            this.gargoyles.splice(i, 1);
            continue;
        }
        if (g.flash > 0) g.flash -= dt;

        if (g.kind === 'flyer') {
            // Drifts leftward faster than the world scrolls, bobbing as it comes.
            g.x -= CONFIG.FLYER_SPEED * dt;
            g.phase += CONFIG.FLYER_BOB_RATE * dt;
            g.y = g.baseY + Math.sin(g.phase) * CONFIG.FLYER_BOB_AMP;
            g.timer += dt;
            continue;
        }

        // ── Percher state machine ─────────────────────────
        const dist = Math.abs((screenX + CONFIG.GARGOYLE_W / 2) - playerCentre);
        g.timer += dt;

        if (g.state === 'idle') {
            // Only wakes for a player still approaching — one already past it
            // would be lunged at from behind, which is unreadable.
            if (dist < CONFIG.GARGOYLE_ALERT_DIST && screenX + CONFIG.GARGOYLE_W > player.x) {
                g.state = 'alert';
                g.timer = 0;   // the telegraph starts here; it used to start at
                               // its own expiry, so the warning lasted one frame
            }
        } else if (g.state === 'alert') {
            if (g.timer >= CONFIG.GARGOYLE_ALERT_FRAMES) {
                g.state = 'lunge';
                g.timer = 0;
            }
        } else if (g.state === 'lunge') {
            // A single arc up and back down to the perch, rather than the old
            // one-way rise that left gargoyles hovering in the sky forever.
            const t = Math.min(1, g.timer / CONFIG.GARGOYLE_LUNGE_FRAMES);
            g.y = g.baseY - Math.sin(t * Math.PI) * CONFIG.GARGOYLE_LUNGE_HEIGHT;
            if (g.timer >= CONFIG.GARGOYLE_LUNGE_FRAMES) {
                g.y = g.baseY;
                g.state = 'recover';
                g.timer = 0;
            }
        } else if (g.state === 'recover') {
            if (g.timer >= CONFIG.GARGOYLE_RECOVER_FRAMES) {
                g.state = 'idle';
                g.timer = 0;
            }
        }
    }
};

Entities.prototype.updateParticles = function (dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.15 * dt;
        p.life -= dt;
        if (p.life <= 0) this.particles.splice(i, 1);
    }
};

Entities.prototype.updatePopups = function (dt) {
    for (let i = this.popups.length - 1; i >= 0; i--) {
        const p = this.popups[i];
        p.y -= 0.35 * dt;
        p.life -= dt;
        if (p.life <= 0) this.popups.splice(i, 1);
    }
};

Entities.prototype.addPopup = function (worldX, y, text, color) {
    this.popups.push({ x: worldX, y: y, text: text, color: color, life: 42, max: 42 });
};

// ── Check if a gargoyle hits the player ────────────────
Entities.prototype.checkPlayerHit = function (player) {
    for (let i = 0; i < this.gargoyles.length; i++) {
        const g = this.gargoyles[i];
        if (g.state === 'dead') continue;
        // Idle perchers are scenery — you can run straight over a sleeping one.
        if (g.kind === 'percher' && g.state === 'idle') continue;
        const screenX = g.x - this.cameraX;
        if (this.rectsOverlap(player.x + 2, player.y + 2,
                              CONFIG.PLAYER_W - 4, CONFIG.PLAYER_H - 4,
                              screenX + 1, g.y + 1,
                              CONFIG.GARGOYLE_W - 2, CONFIG.GARGOYLE_H - 2)) {
            return g;
        }
    }
    return null;
};

// ── Particle spawns ────────────────────────────────────
Entities.prototype.spawnDeathParticles = function (x, y) {
    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
        this.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * CONFIG.PARTICLE_SPEED * 2,
            vy: (Math.random() - 1) * CONFIG.PARTICLE_SPEED,
            life: CONFIG.PARTICLE_LIFE,
            color: Math.random() > 0.5 ? CONFIG.COLORS.particleStone : CONFIG.COLORS.gargoyleDark,
        });
    }
};

Entities.prototype.spawnHitParticles = function (x, y) {
    for (let i = 0; i < 4; i++) {
        this.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 1) * 2,
            life: 12,
            color: CONFIG.COLORS.robotCyan,
        });
    }
};

/** Player took a hit — sparks in screen space, converted to world on the way in. */
Entities.prototype.spawnPlayerHitParticles = function (screenX, screenY) {
    for (let i = 0; i < 8; i++) {
        this.particles.push({
            x: screenX + this.cameraX,
            y: screenY,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 16,
            color: CONFIG.COLORS.robotCyan,
        });
    }
};

// ── Collision helper ───────────────────────────────────
Entities.prototype.rectsOverlap = function (x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
};

// ── Draw all entities ──────────────────────────────────
Entities.prototype.draw = function (ctx) {
    for (let i = 0; i < this.gargoyles.length; i++) {
        this.drawGargoyle(ctx, this.gargoyles[i]);
    }
    for (let i = 0; i < this.notes.length; i++) {
        this.drawNote(ctx, this.notes[i]);
    }
    for (let i = 0; i < this.particles.length; i++) {
        this.drawParticle(ctx, this.particles[i]);
    }
    for (let i = 0; i < this.popups.length; i++) {
        this.drawPopup(ctx, this.popups[i]);
    }
};

Entities.prototype.drawGargoyle = function (ctx, g) {
    const x = Math.round(g.x - this.cameraX);
    const y = Math.round(g.y);
    const C = CONFIG.COLORS;
    const awake = g.kind === 'flyer' || g.state !== 'idle';

    if (g.kind === 'flyer') {
        // Wings beat continuously — the silhouette is what reads at this size,
        // so they taper away from the body in steps rather than being one long
        // bar, which drew as a plank through the middle of the sprite.
        const beat = Math.sin(g.phase * 4);
        const lift = Math.round(beat * 3);
        ctx.fillStyle = C.flyerWing;
        for (let s = 0; s < 3; s++) {
            const h = 5 - s;
            const dy = y + 3 - Math.round(lift * (s + 1) * 0.6);
            ctx.fillRect(x - 1 - s * 3, dy, 3, h);       // joins the body at x+2
            ctx.fillRect(x + 12 + s * 3, dy, 3, h);
        }
    } else if (awake) {
        const twitch = g.state === 'alert'
            ? Math.round(Math.sin(g.timer * 0.7) * 1)
            : Math.round(Math.sin(g.timer * 0.4) * 3);
        ctx.fillStyle = C.gargoyleDark;
        ctx.fillRect(x - 2 - twitch, y + 2, 4, 6);
        ctx.fillRect(x + 12 + twitch, y + 2, 4, 6);
    }

    // Body + head
    ctx.fillStyle = g.flash > 0 ? '#ffffff' : C.gargoyleStone;
    ctx.fillRect(x + 2, y + 4, 10, 8);
    ctx.fillRect(x + 4, y + 1, 6, 5);
    if (g.flash <= 0) {
        // Shading, so a dormant one reads as carved stone rather than a pebble.
        ctx.fillStyle = '#4a4a5c';
        ctx.fillRect(x + 2, y + 10, 10, 2);
        ctx.fillRect(x + 3, y + 4, 1, 6);
    }

    // Horns
    ctx.fillStyle = C.gargoyleDark;
    ctx.fillRect(x + 3, y, 2, 2);
    ctx.fillRect(x + 9, y, 2, 2);

    // Eyes. The alert state pulses them: this is the whole telegraph, so it has
    // to be the loudest thing on the sprite.
    if (awake) {
        // Kept to a 4px halo around each eye. A 6px pair overlapped into one
        // block that covered the whole head, so an alert gargoyle read as a
        // featureless pink blob rather than a stone creature with lit eyes.
        const pulse = g.state === 'alert' && Math.floor(g.timer / 4) % 2 === 0;
        ctx.fillStyle = 'rgba(255, 61, 110, ' + (pulse ? 0.4 : 0.2) + ')';
        ctx.fillRect(x + 4, y + 1, 4, 4);
        ctx.fillRect(x + 8, y + 1, 4, 4);
        ctx.fillStyle = pulse ? '#ff8fae' : C.gargoyleEye;
        ctx.fillRect(x + 5, y + 2, 2, 2);
        ctx.fillRect(x + 9, y + 2, 2, 2);
    } else {
        ctx.fillStyle = C.gargoyleDark;
        ctx.fillRect(x + 5, y + 2, 2, 2);
        ctx.fillRect(x + 9, y + 2, 2, 2);
    }

    // Claws
    ctx.fillStyle = C.gargoyleDark;
    ctx.fillRect(x + 1, y + 10, 2, 2);
    ctx.fillRect(x + 11, y + 10, 2, 2);
};

Entities.prototype.drawNote = function (ctx, n) {
    const x = Math.round(n.x - this.cameraX);
    const y = Math.round(n.y);
    const C = CONFIG.COLORS;

    // A soft glow, not the flat rectangle that used to sit behind the glyph as
    // a visible blue box.
    Renderer.glow(ctx, x + 3, y + 4, 9, '0,245,255', 0.30);

    // Eighth note: filled head, stem up the right, flag off the top.
    ctx.fillStyle = C.noteWhite;
    ctx.fillRect(x, y + 4, 4, 4);       // head
    ctx.fillRect(x + 1, y + 3, 3, 1);
    ctx.fillRect(x, y + 8, 3, 1);
    ctx.fillRect(x + 4, y, 1, 5);       // stem
    ctx.fillRect(x + 5, y, 2, 1);       // flag
    ctx.fillRect(x + 5, y + 1, 1, 2);
};

Entities.prototype.drawParticle = function (ctx, p) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / CONFIG.PARTICLE_LIFE));
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x - this.cameraX), Math.round(p.y), 2, 2);
    ctx.globalAlpha = 1;
};

Entities.prototype.drawPopup = function (ctx, p) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
    ctx.fillStyle = p.color;
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(p.text, Math.round(p.x - this.cameraX), Math.round(p.y));
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
};
