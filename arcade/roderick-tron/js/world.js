// world.js — Roderick Tron | MagmaCrunch Media © 2026
// Rooftop generation, parallax background

function World() {
    this.rooftops = [];
    this.cameraX = 0;
    this.bgOffset1 = 0;  // far parallax
    this.bgOffset2 = 0;  // mid parallax
    this.reset();
}

World.prototype.reset = function () {
    this.rooftops = [];
    this.cameraX = 0;
    this.bgOffset1 = 0;
    this.bgOffset2 = 0;

    // Opening run: a flat, gargoyle-free roof so the first jump is never a
    // surprise, then normal generation from there.
    this.rooftops.push(this.decorate({
        x: -40,
        y: CONFIG.ROOF_Y_BASE,
        width: 260,
        gargoyle: null,
    }));
    for (let i = 0; i < 8; i++) this.appendRoof(0);
};

/** Distance travelled, in the metres shown on the HUD. */
World.prototype.metres = function () {
    return this.cameraX * CONFIG.METRES_PER_PX;
};

// ── Generation ────────────────────────────────────────────

/**
 * Static per-roof scenery. Decided once, at generation time, and stored on the
 * roof — deriving it from the array index (as this used to) makes every lamp and
 * chimney hop to a different building each time a roof scrolls off the left.
 */
World.prototype.decorate = function (roof) {
    roof.lamp = Math.random() < 0.35;
    roof.lampX = 0.2 + Math.random() * 0.6;
    roof.chimneys = [];
    const n = Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
        roof.chimneys.push({
            at: 0.15 + Math.random() * 0.7,
            h: 7 + Math.floor(Math.random() * 7),
            pots: 1 + Math.floor(Math.random() * 2),
        });
    }
    // Which of the facade's windows have a candle in them tonight.
    // ~1 window in 3, rather than the coin flip a plain random bitmask gives.
    roof.litWindows = 0;
    for (let b = 0; b < 12; b++) {
        if (Math.random() < 0.34) roof.litWindows |= (1 << b);
    }
    return roof;
};

/** Append one roof after the current last one, at the given difficulty. */
World.prototype.appendRoof = function (difficulty) {
    const prev = this.rooftops[this.rooftops.length - 1];
    const gap = CONFIG.ROOF_GAP_MIN
        + Math.random() * (Difficulty.maxGap(difficulty) - CONFIG.ROOF_GAP_MIN);
    const width = Difficulty.roofWidth(difficulty, Math.random());

    // Height walks relative to the previous roof rather than jittering around a
    // fixed baseline, which gives runs of ascending and descending rooftops.
    const spread = Difficulty.heightVar(difficulty);
    let y = prev.y + (Math.random() * 2 - 1) * spread * 0.5;
    // Drift back toward the baseline so the skyline cannot wander into a corner.
    y += (CONFIG.ROOF_Y_BASE - prev.y) * 0.18;
    // A roof that sits too far above the previous one is unreachable: the climb
    // eats the horizontal reach the gap already spent.
    const maxRise = 40 - gap * 0.25;
    y = Math.max(prev.y - maxRise, y);
    y = Math.max(CONFIG.ROOF_Y_MIN, Math.min(CONFIG.ROOF_Y_MAX, y));

    let gargoyle = null;
    if (Math.random() < Difficulty.gargoyleChance(difficulty)) {
        gargoyle = Math.random() < Difficulty.flyerChance(difficulty) ? 'flyer' : 'percher';
    }

    this.rooftops.push(this.decorate({
        x: prev.x + prev.width + gap,
        y: Math.round(y),
        width: Math.round(width),
        gargoyle: gargoyle,
    }));
};

World.prototype.update = function (speed, dt, difficulty) {
    this.cameraX += speed * dt;
    this.bgOffset1 += speed * 0.15 * dt;
    this.bgOffset2 += speed * 0.4 * dt;

    // Retire rooftops that scrolled off the left. Keep at least two so the
    // generator always has a predecessor to measure from.
    while (this.rooftops.length > 2
           && this.rooftops[0].x + this.rooftops[0].width < this.cameraX - 60) {
        this.rooftops.shift();
    }

    // Extend ahead of the camera.
    while (this.rooftops[this.rooftops.length - 1].x
           < this.cameraX + CONFIG.CANVAS_W + 260) {
        this.appendRoof(difficulty);
    }
};

/**
 * Find somewhere to put the player back after a fall.
 *
 * Returns the surface Y to stand on, scrolling the camera forward if — as is
 * usually the case, since you die by falling into a gap — nothing solid is
 * currently under PLAYER_X. The old version picked the roof whose *centre* was
 * nearest and dropped the player at that height without moving the camera, so a
 * respawn over a gap fell straight through and burned the next life too.
 */
World.prototype.respawnSurface = function (playerX, playerW) {
    const covers = (r) => {
        const sx = r.x - this.cameraX;
        return sx <= playerX && sx + r.width >= playerX + playerW;
    };

    for (let i = 0; i < this.rooftops.length; i++) {
        if (covers(this.rooftops[i])) return this.rooftops[i].y;
    }

    // Nothing underfoot: jump the camera to the start of the next roof wide
    // enough to stand on, leaving a small run-up before its far edge.
    for (let i = 0; i < this.rooftops.length; i++) {
        const r = this.rooftops[i];
        if (r.x - this.cameraX + r.width < playerX + playerW) continue;   // behind us
        if (r.width < playerW + 24) continue;                             // too narrow
        this.cameraX = r.x - playerX + 6;
        return r.y;
    }

    // Generation guarantees a roof ahead, so this is unreachable in practice.
    return CONFIG.ROOF_Y_BASE;
};

World.prototype.screenX = function (worldX) {
    return worldX - this.cameraX;
};

// ── Drawing ───────────────────────────────────────────────

World.prototype.draw = function (ctx) {
    const C = CONFIG.COLORS;

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CONFIG.CANVAS_H);
    grad.addColorStop(0, C.sky);
    grad.addColorStop(0.7, C.skyHorizon);
    grad.addColorStop(1, C.canalBlue);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

    this.drawMoon(ctx);
    this.drawFarBackground(ctx);
    this.drawMidBackground(ctx);
    this.drawRooftops(ctx);
};

World.prototype.drawMoon = function (ctx) {
    // Parked in the far distance — drifts only barely.
    const mx = 380 - (this.bgOffset1 * 0.04) % 600;
    const my = 44;
    Renderer.glow(ctx, mx, my, 30, '240,234,216', 0.10);
    ctx.fillStyle = '#d8d0bc';
    ctx.beginPath();
    ctx.arc(mx, my, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = CONFIG.COLORS.sky;
    ctx.beginPath();
    ctx.arc(mx - 6, my - 4, 11, 0, Math.PI * 2);
    ctx.fill();
};

World.prototype.drawFarBackground = function (ctx) {
    const offset = this.bgOffset1;

    // Distant buildings / spires
    ctx.fillStyle = '#1a1428';
    for (let i = 0; i < 8; i++) {
        const bx = Math.round(((i * 90) - (offset % (90 * 8))) - 90);
        const bw = 30 + (i % 3) * 15;
        const bh = 40 + (i % 4) * 20;
        ctx.fillRect(bx, CONFIG.CANVAS_H - bh - 20, bw, bh);

        // Church spire
        if (i % 3 === 0) {
            ctx.fillRect(bx + bw / 2 - 3, CONFIG.CANVAS_H - bh - 40, 6, 20);
            ctx.fillRect(bx + bw / 2 - 1, CONFIG.CANVAS_H - bh - 48, 2, 8);
        }
    }

    // Windmill silhouette (distant)
    const windmillX = Math.round(200 - (offset % 600));
    ctx.fillStyle = '#151020';
    ctx.fillRect(windmillX, CONFIG.CANVAS_H - 80, 8, 40);
    ctx.fillRect(windmillX - 15, CONFIG.CANVAS_H - 80, 38, 3);
    ctx.fillRect(windmillX + 3, CONFIG.CANVAS_H - 95, 3, 33);
};

World.prototype.drawMidBackground = function (ctx) {
    const offset = this.bgOffset2;

    // Canal houses. The stepped gable (trapgevel) lives on this layer, where it
    // is a silhouette against the sky and cannot be mistaken for something the
    // player might land on.
    for (let i = 0; i < 10; i++) {
        const bx = Math.round(((i * 70) - (offset % (70 * 10))) - 70);
        const bw = 40 + (i % 3) * 12;
        const bh = 50 + (i % 4) * 15;
        const by = CONFIG.CANVAS_H - bh - 10;

        ctx.fillStyle = '#2a1818';
        ctx.fillRect(bx, by, bw, bh);

        // Stepped gable: a solid staircase up to a peak, not a row of floating
        // blocks. Each tread carries a stone coping, as the real ones do.
        const steps = 4, tread = Math.max(3, Math.floor(bw / 8)), rise = 4;
        for (let s = 0; s < steps; s++) {
            const w = bw - s * tread * 2;
            if (w <= 0) break;
            const sx = bx + s * tread;
            const sy = by - (s + 1) * rise;
            ctx.fillStyle = '#3a2828';
            ctx.fillRect(sx, sy, w, rise + 1);
            ctx.fillStyle = '#4a3636';
            ctx.fillRect(sx, sy, w, 1);
        }

        // Windows — a couple lit, the rest shuttered.
        for (let wy = 0; wy < 3; wy++) {
            for (let wx = 0; wx < 2; wx++) {
                const lit = ((i * 7 + wy * 3 + wx) % 5) === 0;
                ctx.fillStyle = lit ? 'rgba(255, 207, 106, 0.35)' : '#1a0a08';
                ctx.fillRect(bx + 6 + wx * 16, by + 8 + wy * 14, 6, 8);
            }
        }
    }
};

World.prototype.drawRooftops = function (ctx) {
    const C = CONFIG.COLORS;

    for (let i = 0; i < this.rooftops.length; i++) {
        const r = this.rooftops[i];
        const sx = Math.round(r.x - this.cameraX);
        const sy = r.y;

        if (sx + r.width < -16 || sx > CONFIG.CANVAS_W + 16) continue;

        // Building body below the roof surface
        ctx.fillStyle = C.brickRed;
        ctx.fillRect(sx, sy, r.width, CONFIG.CANVAS_H - sy);

        // Brick texture
        ctx.fillStyle = C.brickDark;
        for (let by = sy + 6; by < CONFIG.CANVAS_H; by += 6) {
            for (let bx = sx; bx < sx + r.width; bx += 10) {
                ctx.fillRect(bx, by, 1, 1);
                ctx.fillRect(bx + 5, by + 3, 1, 1);
            }
        }

        // Facade windows, lit from a per-roof bitmask so they hold still.
        const cols = Math.floor((r.width - 10) / 22);
        for (let wy = 0; wy < 3; wy++) {
            const wyTop = sy + 14 + wy * 20;
            if (wyTop + 10 > CONFIG.CANVAS_H) break;
            for (let wx = 0; wx < cols; wx++) {
                const bit = (wy * 6 + wx) % 12;
                const lit = (r.litWindows >> bit) & 1;
                ctx.fillStyle = lit ? C.windowLit : '#2a0e0a';
                ctx.fillRect(sx + 8 + wx * 22, wyTop, 7, 9);
                if (lit) {
                    ctx.fillStyle = 'rgba(255, 207, 106, 0.10)';
                    ctx.fillRect(sx + 5 + wx * 22, wyTop - 3, 13, 15);
                }
            }
        }

        // Roof surface — the line the player actually stands on.
        ctx.fillStyle = C.roofTile;
        ctx.fillRect(sx, sy - 3, r.width, 5);
        ctx.fillStyle = C.roofTileDark;
        ctx.fillRect(sx, sy - 3, r.width, 2);

        // Low coping at each end. Kept to 3px: this is the top of the gable seen
        // edge-on, and anything taller reads as an obstacle the player must clear
        // and visually closes up the gaps.
        ctx.fillStyle = C.gableWhite;
        ctx.fillRect(sx, sy - 6, 5, 4);
        ctx.fillRect(sx + r.width - 5, sy - 6, 5, 4);
        ctx.fillStyle = C.gableStone;
        ctx.fillRect(sx, sy - 2, 5, 4);
        ctx.fillRect(sx + r.width - 5, sy - 2, 5, 4);

        // Chimneys
        for (let c = 0; c < r.chimneys.length; c++) {
            const ch = r.chimneys[c];
            const cx = Math.round(sx + r.width * ch.at);
            ctx.fillStyle = C.brickDark;
            ctx.fillRect(cx, sy - 3 - ch.h, 5, ch.h);
            ctx.fillStyle = '#3a1410';
            ctx.fillRect(cx, sy - 3 - ch.h, 1, ch.h);      // lit edge
            ctx.fillStyle = C.gableStone;
            ctx.fillRect(cx, sy - 4 - ch.h, 5, 2);
            ctx.fillStyle = '#1a1018';
            for (let p = 0; p < ch.pots; p++) {
                ctx.fillRect(cx + 1 + p * 2, sy - 6 - ch.h, 1, 2);
            }
        }

        // Gas lamp
        if (r.lamp) {
            const lx = Math.round(sx + r.width * r.lampX);
            const ly = sy - 12;
            ctx.fillStyle = '#2a2a33';
            ctx.fillRect(lx - 1, ly, 2, 10);
            ctx.fillStyle = C.gasLamp;
            ctx.fillRect(lx - 2, ly - 4, 4, 5);
            ctx.fillStyle = '#fff8d0';
            ctx.fillRect(lx - 1, ly - 3, 2, 2);
            Renderer.glow(ctx, lx, ly - 2, 16, '255,224,58', 0.22);
        }
    }
};

World.prototype.drawTitle = function (ctx, frame) {
    const C = CONFIG.COLORS;

    const grad = ctx.createLinearGradient(0, 0, 0, CONFIG.CANVAS_H);
    grad.addColorStop(0, C.sky);
    grad.addColorStop(0.7, C.skyHorizon);
    grad.addColorStop(1, C.canalBlue);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

    const offset = frame * 0.3;
    for (let i = 0; i < 10; i++) {
        const bx = Math.round(((i * 70) - (offset % (70 * 10))) - 70);
        const bw = 40 + (i % 3) * 12;
        const bh = 50 + (i % 4) * 15;
        const by = CONFIG.CANVAS_H - bh - 30;

        ctx.fillStyle = '#2a1818';
        ctx.fillRect(bx, by, bw, bh);

        const steps = 4, tread = Math.max(3, Math.floor(bw / 8)), rise = 4;
        for (let s = 0; s < steps; s++) {
            const w = bw - s * tread * 2;
            if (w <= 0) break;
            ctx.fillStyle = '#3a2828';
            ctx.fillRect(bx + s * tread, by - (s + 1) * rise, w, rise + 1);
        }
    }

    for (let i = 0; i < 6; i++) {
        const bx = i * 90 - 20;
        const bw = 60 + (i % 2) * 20;
        const by = CONFIG.CANVAS_H - 60;

        ctx.fillStyle = C.brickRed;
        ctx.fillRect(bx, by, bw, 60);
        ctx.fillStyle = C.roofTile;
        ctx.fillRect(bx, by - 3, bw, 5);
        ctx.fillStyle = C.gableWhite;
        ctx.fillRect(bx, by - 6, 5, 4);
        ctx.fillRect(bx + bw - 5, by - 6, 5, 4);
    }
};
