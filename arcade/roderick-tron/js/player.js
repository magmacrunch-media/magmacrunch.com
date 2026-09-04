// player.js — Roderick Tron | MagmaCrunch Media © 2026
// Roderick character: physics, sprite, lives

function Player() {
    this.reset();
}

Player.prototype.reset = function () {
    this.x = CONFIG.PLAYER_X;
    this.y = 100;
    this.vy = 0;
    this.grounded = false;
    this.alive = true;
    this.lives = CONFIG.MAX_LIVES;
    this.invincible = 0;
    this.shakeFrames = 0;
    this.animTimer = 0;
    this.runFrame = 0;
    this.isJumping = false;
    this.coyote = 0;        // frames of ground-jump grace left after leaving a roof
    this.jumpBuffer = 0;    // frames a not-yet-usable jump press stays queued
};

Player.prototype.update = function (rooftops, cameraX, dt) {
    // ── Jump: coyote time + input buffering ───────────────
    // Both are pure forgiveness — a jump pressed a few frames early (mid-fall,
    // about to land) or a few frames late (just ran off the edge) still fires.
    if (Input.jump()) this.jumpBuffer = CONFIG.JUMP_BUFFER_FRAMES;
    if (this.jumpBuffer > 0) this.jumpBuffer -= dt;
    if (this.coyote > 0) this.coyote -= dt;

    if (this.jumpBuffer > 0 && this.coyote > 0 && this.alive) {
        this.vy = CONFIG.JUMP_FORCE;
        this.grounded = false;
        this.isJumping = true;
        this.jumpBuffer = 0;
        this.coyote = 0;
    }

    // Variable jump: releasing jump early cuts the climb short.
    if (this.isJumping && !Input.jumpHeld() && this.vy < 0) {
        this.vy *= CONFIG.JUMP_CUT;
        this.isJumping = false;
    }

    // ── Gravity + integration ─────────────────────────────
    // Both the acceleration and the position step scale with dt. Applying it to
    // only one of the two (as this used to) makes the fall rate depend on the
    // monitor's refresh rate.
    this.vy += CONFIG.GRAVITY * dt;
    if (this.vy > CONFIG.MAX_FALL) this.vy = CONFIG.MAX_FALL;

    const prevBottom = this.y + CONFIG.PLAYER_H;
    this.y += this.vy * dt;
    const playerBottom = this.y + CONFIG.PLAYER_H;

    // ── Rooftop collision (swept, so a fast fall cannot tunnel) ──
    const wasGrounded = this.grounded;
    this.grounded = false;
    if (this.alive && this.vy >= 0) {
        for (let i = 0; i < rooftops.length; i++) {
            const r = rooftops[i];
            const screenX = r.x - cameraX;
            if (this.x + CONFIG.PLAYER_W > screenX && this.x < screenX + r.width) {
                if (prevBottom <= r.y && playerBottom >= r.y) {
                    this.y = r.y - CONFIG.PLAYER_H;
                    this.vy = 0;
                    this.grounded = true;
                    this.isJumping = false;
                    break;
                }
            }
        }
    }

    if (this.grounded) {
        this.coyote = CONFIG.COYOTE_FRAMES;
    } else if (wasGrounded && this.vy >= 0) {
        // Walked off an edge rather than jumping — start the coyote window.
        this.coyote = Math.max(this.coyote, CONFIG.COYOTE_FRAMES);
    }

    // ── Timers ────────────────────────────────────────────
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shakeFrames > 0) this.shakeFrames -= dt;

    if (this.grounded && this.alive) {
        this.animTimer += dt;
        if (this.animTimer >= 6) {
            this.animTimer = 0;
            this.runFrame = (this.runFrame + 1) % 2;
        }
    }
};

Player.prototype.loseLife = function () {
    this.lives--;
    this.invincible = CONFIG.INVINCIBLE_FRAMES;
    this.shakeFrames = 10;
};

/** Drop back onto solid ground. `roofY` is the surface to stand on. */
Player.prototype.respawn = function (roofY) {
    this.y = roofY - CONFIG.PLAYER_H;
    this.vy = 0;
    this.grounded = true;
    this.isJumping = false;
    this.jumpBuffer = 0;
    this.coyote = CONFIG.COYOTE_FRAMES;
};

Player.prototype.draw = function (ctx) {
    if (!this.alive) return;

    // Invincibility flash
    if (this.invincible > 0 && Math.floor(this.invincible / 4) % 2 === 0) return;

    const x = Math.round(this.x);
    const y = Math.round(this.y);
    const C = CONFIG.COLORS;

    // Body — frock coat (wider)
    ctx.fillStyle = C.robotCoat;
    ctx.fillRect(x + 2, y + 7, 12, 13);

    // Coat tails (slight flare at bottom)
    ctx.fillRect(x + 1, y + 16, 3, 5);
    ctx.fillRect(x + 12, y + 16, 3, 5);

    // Head (wider — 10px)
    ctx.fillStyle = C.robotSteel;
    ctx.fillRect(x + 3, y + 0, 10, 7);

    // Ginger mutton chops
    ctx.fillStyle = C.muttonChops;
    ctx.fillRect(x + 2, y + 3, 2, 4);
    ctx.fillRect(x + 12, y + 3, 2, 4);

    // Glowing cyan eyes
    ctx.fillStyle = C.robotCyan;
    ctx.fillRect(x + 4, y + 2, 2, 2);
    ctx.fillRect(x + 10, y + 2, 2, 2);

    // Eye glow
    ctx.fillStyle = 'rgba(0, 245, 255, 0.3)';
    ctx.fillRect(x + 3, y + 1, 4, 4);
    ctx.fillRect(x + 9, y + 1, 4, 4);

    // Blue shoulder joints (mechanical accent)
    ctx.fillStyle = '#3d6db5';
    ctx.fillRect(x + 0, y + 9, 2, 2);
    ctx.fillRect(x + 14, y + 9, 2, 2);

    // Legs (wider — 4px)
    ctx.fillStyle = C.robotSteel;
    if (this.grounded) {
        // Running animation — alternate legs
        if (this.runFrame === 0) {
            ctx.fillRect(x + 3, y + 20, 4, 4);
            ctx.fillRect(x + 9, y + 21, 4, 3);
        } else {
            ctx.fillRect(x + 3, y + 21, 4, 3);
            ctx.fillRect(x + 9, y + 20, 4, 4);
        }
    } else {
        // Jump pose — legs tucked
        ctx.fillRect(x + 3, y + 20, 4, 3);
        ctx.fillRect(x + 9, y + 20, 4, 3);
    }

    // Boot accents
    ctx.fillStyle = C.robotCyan;
    ctx.fillRect(x + 4, y + 23, 1, 1);
    ctx.fillRect(x + 11, y + 23, 1, 1);

    // Cravat (white neckwear)
    ctx.fillStyle = C.gableWhite;
    ctx.fillRect(x + 6, y + 6, 4, 2);
};
