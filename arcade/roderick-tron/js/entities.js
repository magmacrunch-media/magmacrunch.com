// entities.js — Roderick Tron | MagmaCrunch Media © 2026
// Gargoyles, projectiles, particles

function Entities() {
    this.gargoyles = [];
    this.notes = [];
    this.particles = [];
    this.shootCooldown = 0;
}

Entities.prototype.reset = function () {
    this.gargoyles = [];
    this.notes = [];
    this.particles = [];
    this.shootCooldown = 0;
};

// ── Spawn note projectile ──────────────────────────────
Entities.prototype.spawnNote = function (x, y) {
    if (this.shootCooldown > 0) return;
    this.notes.push({ x: x, y: y, active: true });
    this.shootCooldown = CONFIG.FIRE_RATE;
};

// ── Spawn gargoyle on a rooftop (screen coordinates) ──
Entities.prototype.spawnGargoyle = function (roof, cameraX) {
    this.gargoyles.push({
        x: (roof.x - cameraX) + roof.width * 0.5 + (Math.random() - 0.5) * roof.width * 0.3,
        y: roof.y - CONFIG.GARGOYLE_H,
        state: 'idle',    // idle, alert, active, dead
        animFrame: 0,
        animTimer: 0,
        hp: 2,
    });
};

// ── Update all entities ────────────────────────────────
Entities.prototype.update = function (speed, player, rooftops, cameraX) {
    // Cooldown
    if (this.shootCooldown > 0) this.shootCooldown--;

    // Update notes
    for (let i = this.notes.length - 1; i >= 0; i--) {
        const n = this.notes[i];
        n.x += CONFIG.NOTE_SPEED;
        if (n.x > CONFIG.CANVAS_W + 20) {
            this.notes.splice(i, 1);
            continue;
        }

        // Check note vs gargoyles
        for (let j = this.gargoyles.length - 1; j >= 0; j--) {
            const g = this.gargoyles[j];
            if (g.state === 'dead') continue;
            if (this.rectsOverlap(n.x, n.y, CONFIG.NOTE_W, CONFIG.NOTE_H,
                                  g.x, g.y, CONFIG.GARGOYLE_W, CONFIG.GARGOYLE_H)) {
                g.hp--;
                this.notes.splice(i, 1);
                if (g.hp <= 0) {
                    g.state = 'dead';
                    this.spawnDeathParticles(g.x + CONFIG.GARGOYLE_W / 2, g.y + CONFIG.GARGOYLE_H / 2);
                } else {
                    this.spawnHitParticles(g.x + CONFIG.GARGOYLE_W / 2, g.y + CONFIG.GARGOYLE_H / 2);
                }
                break;
            }
        }
    }

    // Update gargoyles — scroll with world, manage state
    for (let i = this.gargoyles.length - 1; i >= 0; i--) {
        const g = this.gargoyles[i];

        // Scroll with world
        g.x -= speed;

        // Remove if off screen
        if (g.x < -50 || g.state === 'dead' && g.animTimer <= 0) {
            this.gargoyles.splice(i, 1);
            continue;
        }

        // State logic
        if (g.state === 'dead') {
            g.animTimer--;
            continue;
        }

        const dist = Math.abs((g.x + CONFIG.GARGOYLE_W / 2) - (player.x + CONFIG.PLAYER_W / 2));

        if (g.state === 'idle' && dist < CONFIG.GARGOYLE_ALERT_DIST) {
            g.state = 'alert';
            g.animTimer = 30;
        } else if (g.state === 'alert') {
            g.animTimer++;
            if (g.animTimer > 30) {
                g.state = 'active';
                g.animTimer = 0;
            }
        } else if (g.state === 'active') {
            g.animTimer++;
            // Lunge upward briefly
            if (g.animTimer < 15) {
                g.y -= CONFIG.GARGOYLE_LUNGE_SPEED;
            } else if (g.animTimer < 30) {
                g.y += CONFIG.GARGOYLE_LUNGE_SPEED * 0.5;
            }
        }

        // Spawn gargoyles on new rooftops
        // (handled externally via world update)
    }

    // Check for new rooftops needing gargoyles
    for (let i = 0; i < rooftops.length; i++) {
        const r = rooftops[i];
        if (r.hasGargoyle && !r.gargoyleSpawned) {
            const screenX = r.x - cameraX;
            if (screenX > -50 && screenX < CONFIG.CANVAS_W + 300) {
                this.spawnGargoyle(r, cameraX);
                r.gargoyleSpawned = true;
            }
        }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life--;
        if (p.life <= 0) {
            this.particles.splice(i, 1);
        }
    }
};

// ── Check if gargoyle hits player ──────────────────────
Entities.prototype.checkPlayerHit = function (player) {
    for (let i = 0; i < this.gargoyles.length; i++) {
        const g = this.gargoyles[i];
        if (g.state === 'dead') continue;
        if (this.rectsOverlap(player.x + 2, player.y + 2, CONFIG.PLAYER_W - 4, CONFIG.PLAYER_H - 4,
                              g.x, g.y, CONFIG.GARGOYLE_W, CONFIG.GARGOYLE_H)) {
            return true;
        }
    }
    return false;
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

// ── Collision helper ───────────────────────────────────
Entities.prototype.rectsOverlap = function (x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
};

// ── Draw all entities ──────────────────────────────────
Entities.prototype.draw = function (ctx) {
    // Draw gargoyles
    for (let i = 0; i < this.gargoyles.length; i++) {
        this.drawGargoyle(ctx, this.gargoyles[i]);
    }

    // Draw notes
    for (let i = 0; i < this.notes.length; i++) {
        this.drawNote(ctx, this.notes[i]);
    }

    // Draw particles
    for (let i = 0; i < this.particles.length; i++) {
        this.drawParticle(ctx, this.particles[i]);
    }
};

Entities.prototype.drawGargoyle = function (ctx, g) {
    if (g.state === 'dead') return;

    const x = Math.round(g.x);
    const y = Math.round(g.y);
    const C = CONFIG.COLORS;

    // Body
    ctx.fillStyle = C.gargoyleStone;
    ctx.fillRect(x + 2, y + 4, 10, 8);
    // Head
    ctx.fillRect(x + 4, y + 1, 6, 5);
    // Horns
    ctx.fillStyle = C.gargoyleDark;
    ctx.fillRect(x + 3, y, 2, 2);
    ctx.fillRect(x + 9, y, 2, 2);

    // Wings (animate based on state)
    if (g.state === 'alert' || g.state === 'active') {
        const wingOffset = g.state === 'active' ? Math.sin(g.animTimer * 0.3) * 3 : Math.sin(g.animTimer * 0.15) * 1;
        ctx.fillStyle = C.gargoyleDark;
        // Left wing
        ctx.fillRect(x - 2 - wingOffset, y + 2, 4, 6);
        // Right wing
        ctx.fillRect(x + 12 + wingOffset, y + 2, 4, 6);
    }

    // Eyes
    if (g.state === 'alert' || g.state === 'active') {
        ctx.fillStyle = C.gargoyleEye;
        ctx.fillRect(x + 5, y + 2, 2, 2);
        ctx.fillRect(x + 9, y + 2, 2, 2);
        // Eye glow
        ctx.fillStyle = 'rgba(255, 61, 110, 0.3)';
        ctx.fillRect(x + 4, y + 1, 4, 4);
        ctx.fillRect(x + 8, y + 1, 4, 4);
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
    const x = Math.round(n.x);
    const y = Math.round(n.y);
    const C = CONFIG.COLORS;

    // Musical note glyph (pixel art eighth note ♪)
    ctx.fillStyle = C.noteWhite;
    // Note head (filled oval)
    ctx.fillRect(x, y + 4, 4, 4);
    ctx.fillRect(x + 1, y + 3, 2, 1);
    ctx.fillRect(x + 1, y + 8, 2, 1);
    // Stem
    ctx.fillRect(x + 4, y, 1, 5);
    // Flag
    ctx.fillRect(x + 5, y, 2, 2);
    ctx.fillRect(x + 6, y + 1, 1, 2);

    // Glow
    ctx.fillStyle = 'rgba(0, 245, 255, 0.15)';
    ctx.fillRect(x - 1, y + 2, 8, 7);
};

Entities.prototype.drawParticle = function (ctx, p) {
    const alpha = p.life / CONFIG.PARTICLE_LIFE;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
    ctx.globalAlpha = 1;
};
