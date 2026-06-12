// player.js — Roderick Tron | MagmaCrunch Media © 2026
// Roderick character: physics, sprite, lives

function Player() {
    this.x = CONFIG.PLAYER_X;
    this.y = 100;
    this.vy = 0;
    this.grounded = false;
    this.alive = true;
    this.lives = CONFIG.MAX_LIVES;
    this.invincible = 0;
    this.shakeFrames = 0;
    this.animFrame = 0;
    this.animTimer = 0;
    this.runFrame = 0;
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
    this.runFrame = 0;
};

Player.prototype.update = function (rooftops, cameraX) {
    // Jump
    if (Input.jump() && this.grounded && this.alive) {
        this.vy = CONFIG.JUMP_FORCE;
        this.grounded = false;
    }

    // Gravity
    this.vy += CONFIG.GRAVITY;
    if (this.vy > CONFIG.MAX_FALL) this.vy = CONFIG.MAX_FALL;
    this.y += this.vy;

    // Collision with rooftops
    this.grounded = false;
    if (this.alive) {
        for (let i = 0; i < rooftops.length; i++) {
            const r = rooftops[i];
            const screenX = r.x - cameraX;
            const playerBottom = this.y + CONFIG.PLAYER_H;
            const playerLeft = this.x;
            const playerRight = this.x + CONFIG.PLAYER_W;

            if (playerRight > screenX && playerLeft < screenX + r.width) {
                if (playerBottom >= r.y && playerBottom <= r.y + 12 && this.vy >= 0) {
                    this.y = r.y - CONFIG.PLAYER_H;
                    this.vy = 0;
                    this.grounded = true;
                }
            }
        }
    }

    // Invincibility countdown
    if (this.invincible > 0) this.invincible--;

    // Run animation
    if (this.grounded && this.alive) {
        this.animTimer++;
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

Player.prototype.respawn = function (roof) {
    if (roof) {
        this.y = roof.y - CONFIG.PLAYER_H;
    } else {
        this.y = CONFIG.ROOF_Y_BASE - CONFIG.PLAYER_H - 40;
    }
    this.vy = 0;
    this.grounded = true;
};

Player.prototype.draw = function (ctx) {
    if (!this.alive) return;

    // Invincibility flash
    if (this.invincible > 0 && Math.floor(this.invincible / 4) % 2 === 0) return;

    const x = Math.round(this.x);
    const y = Math.round(this.y);
    const C = CONFIG.COLORS;

    // Body — frock coat
    ctx.fillStyle = C.robotCoat;
    ctx.fillRect(x + 3, y + 8, 10, 12);

    // Coat tails (slight flare at bottom)
    ctx.fillRect(x + 2, y + 16, 3, 5);
    ctx.fillRect(x + 11, y + 16, 3, 5);

    // Head
    ctx.fillStyle = C.robotSteel;
    ctx.fillRect(x + 4, y + 1, 8, 7);

    // Ginger mutton chops
    ctx.fillStyle = C.muttonChops;
    ctx.fillRect(x + 3, y + 4, 2, 4);
    ctx.fillRect(x + 11, y + 4, 2, 4);

    // Glowing cyan eyes
    ctx.fillStyle = C.robotCyan;
    ctx.fillRect(x + 5, y + 3, 2, 2);
    ctx.fillRect(x + 9, y + 3, 2, 2);

    // Eye glow
    ctx.fillStyle = 'rgba(0, 245, 255, 0.3)';
    ctx.fillRect(x + 4, y + 2, 4, 4);
    ctx.fillRect(x + 8, y + 2, 4, 4);

    // Clockwork joints (elbows)
    ctx.fillStyle = C.robotSteel;
    ctx.fillRect(x + 1, y + 10, 2, 2);
    ctx.fillRect(x + 13, y + 10, 2, 2);

    // Legs
    ctx.fillStyle = C.robotCoat;
    if (this.grounded) {
        // Running animation — alternate legs
        if (this.runFrame === 0) {
            ctx.fillRect(x + 4, y + 20, 3, 4);
            ctx.fillRect(x + 9, y + 21, 3, 3);
        } else {
            ctx.fillRect(x + 4, y + 21, 3, 3);
            ctx.fillRect(x + 9, y + 20, 3, 4);
        }
    } else {
        // Jump pose — legs tucked
        ctx.fillRect(x + 4, y + 20, 3, 3);
        ctx.fillRect(x + 9, y + 20, 3, 3);
    }

    // Clockwork knee joints
    ctx.fillStyle = C.robotSteel;
    ctx.fillRect(x + 5, y + 20, 1, 1);
    ctx.fillRect(x + 10, y + 20, 1, 1);

    // Cravat (white neckwear)
    ctx.fillStyle = C.gableWhite;
    ctx.fillRect(x + 6, y + 7, 4, 2);
};
