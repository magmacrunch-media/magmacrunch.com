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

    // Generate initial rooftops
    let x = 0;
    let y = CONFIG.ROOF_Y_BASE;
    for (let i = 0; i < 12; i++) {
        const w = CONFIG.ROOF_MIN_W + Math.random() * (CONFIG.ROOF_MAX_W - CONFIG.ROOF_MIN_W);
        this.rooftops.push({
            x: x,
            y: y,
            width: w,
            hasGargoyle: Math.random() < CONFIG.GARGOYLE_CHANCE && i > 1,
        });
        x += w + CONFIG.ROOF_GAP_MIN + Math.random() * (CONFIG.ROOF_GAP_MAX - CONFIG.ROOF_GAP_MIN);
        y = CONFIG.ROOF_Y_BASE + (Math.random() - 0.5) * CONFIG.ROOF_HEIGHT_VAR;
        y = Math.max(140, Math.min(220, y));
    }
};

World.prototype.update = function (speed) {
    this.cameraX += speed;
    this.bgOffset1 += speed * 0.15;
    this.bgOffset2 += speed * 0.4;

    // Remove rooftops that scrolled off left
    while (this.rooftops.length > 0 && this.rooftops[0].x + this.rooftops[0].width < this.cameraX - 50) {
        this.rooftops.shift();
    }

    // Add new rooftops ahead
    const lastRoof = this.rooftops[this.rooftops.length - 1];
    if (lastRoof && lastRoof.x + lastRoof.width < this.cameraX + CONFIG.CANVAS_W + 200) {
        const newX = lastRoof.x + lastRoof.width + CONFIG.ROOF_GAP_MIN + Math.random() * (CONFIG.ROOF_GAP_MAX - CONFIG.ROOF_GAP_MIN);
        const newY = CONFIG.ROOF_Y_BASE + (Math.random() - 0.5) * CONFIG.ROOF_HEIGHT_VAR;
        const clampedY = Math.max(140, Math.min(220, newY));
        const w = CONFIG.ROOF_MIN_W + Math.random() * (CONFIG.ROOF_MAX_W - CONFIG.ROOF_MIN_W);
        this.rooftops.push({
            x: newX,
            y: clampedY,
            width: w,
            hasGargoyle: Math.random() < CONFIG.GARGOYLE_CHANCE,
        });
    }
};

World.prototype.getNearestRoof = function (playerX, cameraX) {
    let best = null;
    let bestDist = Infinity;
    for (let i = 0; i < this.rooftops.length; i++) {
        const r = this.rooftops[i];
        const screenX = r.x - cameraX + r.width / 2;
        const dist = Math.abs(screenX - playerX);
        if (dist < bestDist) {
            bestDist = dist;
            best = r;
        }
    }
    return best;
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

    // Far parallax — distant spires and windmills
    this.drawFarBackground(ctx);

    // Mid parallax — simplified canal houses
    this.drawMidBackground(ctx);

    // Foreground rooftops
    this.drawRooftops(ctx);
};

World.prototype.drawFarBackground = function (ctx) {
    const C = CONFIG.COLORS;
    const offset = this.bgOffset1;

    // Distant buildings / spires
    ctx.fillStyle = '#1a1428';
    for (let i = 0; i < 8; i++) {
        const bx = ((i * 90) - (offset % (90 * 8))) - 90;
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
    const windmillX = ((200) - (offset % 600));
    ctx.fillStyle = '#151020';
    ctx.fillRect(windmillX, CONFIG.CANVAS_H - 80, 8, 40);
    // Blades
    ctx.fillRect(windmillX - 15, CONFIG.CANVAS_H - 80, 38, 3);
    ctx.fillRect(windmillX + 3, CONFIG.CANVAS_H - 95, 3, 33);
};

World.prototype.drawMidBackground = function (ctx) {
    const C = CONFIG.COLORS;
    const offset = this.bgOffset2;

    // Canal houses (simplified, darker)
    for (let i = 0; i < 10; i++) {
        const bx = ((i * 70) - (offset % (70 * 10))) - 70;
        const bw = 40 + (i % 3) * 12;
        const bh = 50 + (i % 4) * 15;
        const by = CONFIG.CANVAS_H - bh - 10;

        // Building body
        ctx.fillStyle = '#2a1818';
        ctx.fillRect(bx, by, bw, bh);

        // Stepped gable
        ctx.fillStyle = '#3a2828';
        for (let s = 0; s < 4; s++) {
            const sw = bw - s * 8;
            if (sw > 0) {
                ctx.fillRect(bx + s * 4, by - s * 4, sw, 4);
            }
        }

        // Windows
        ctx.fillStyle = '#1a0a08';
        for (let wy = 0; wy < 3; wy++) {
            for (let wx = 0; wx < 2; wx++) {
                ctx.fillRect(bx + 6 + wx * 16, by + 8 + wy * 14, 6, 8);
            }
        }
    }
};

World.prototype.drawRooftops = function (ctx) {
    const C = CONFIG.COLORS;

    for (let i = 0; i < this.rooftops.length; i++) {
        const r = this.rooftops[i];
        const sx = r.x - this.cameraX;
        const sy = r.y;

        // Skip if off screen
        if (sx + r.width < -10 || sx > CONFIG.CANVAS_W + 10) continue;

        // Building body below rooftop
        ctx.fillStyle = C.brickRed;
        ctx.fillRect(sx, sy, r.width, CONFIG.CANVAS_H - sy);

        // Brick texture (simple 2px rows)
        ctx.fillStyle = C.brickDark;
        for (let by = sy; by < CONFIG.CANVAS_H; by += 6) {
            for (let bx = sx; bx < sx + r.width; bx += 10) {
                ctx.fillRect(bx, by, 1, 1);
                ctx.fillRect(bx + 5, by + 3, 1, 1);
            }
        }

        // Roof tiles on top
        ctx.fillStyle = C.roofTile;
        ctx.fillRect(sx, sy - 4, r.width, 6);
        ctx.fillStyle = C.roofTileDark;
        ctx.fillRect(sx, sy - 4, r.width, 2);

        // Stepped gable on building edges
        ctx.fillStyle = C.gableWhite;
        // Left gable
        for (let s = 0; s < 5; s++) {
            ctx.fillRect(sx - 2 - s * 2, sy - 8 - s * 6, 4, 6);
        }
        // Right gable
        for (let s = 0; s < 5; s++) {
            ctx.fillRect(sx + r.width - 2 + s * 2, sy - 8 - s * 6, 4, 6);
        }

        // Gas lamp (occasional)
        if (i % 4 === 0) {
            const lx = sx + r.width / 2;
            const ly = sy - 10;
            ctx.fillStyle = '#333';
            ctx.fillRect(lx - 1, ly, 2, 8);
            ctx.fillStyle = C.gasLamp;
            ctx.fillRect(lx - 2, ly - 3, 4, 4);
            // Glow
            ctx.fillStyle = C.gasLampGlow;
            ctx.beginPath();
            ctx.arc(lx, ly, 12, 0, Math.PI * 2);
            ctx.fill();
        }
    }
};

World.prototype.drawTitle = function (ctx, frame) {
    const C = CONFIG.COLORS;

    // Sky
    const grad = ctx.createLinearGradient(0, 0, 0, CONFIG.CANVAS_H);
    grad.addColorStop(0, C.sky);
    grad.addColorStop(0.7, C.skyHorizon);
    grad.addColorStop(1, C.canalBlue);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

    // Slow-scrolling rooftops
    const offset = frame * 0.3;
    for (let i = 0; i < 10; i++) {
        const bx = ((i * 70) - (offset % (70 * 10))) - 70;
        const bw = 40 + (i % 3) * 12;
        const bh = 50 + (i % 4) * 15;
        const by = CONFIG.CANVAS_H - bh - 30;

        ctx.fillStyle = '#2a1818';
        ctx.fillRect(bx, by, bw, bh);

        ctx.fillStyle = '#3a2828';
        for (let s = 0; s < 4; s++) {
            const sw = bw - s * 8;
            if (sw > 0) ctx.fillRect(bx + s * 4, by - s * 4, sw, 4);
        }
    }

    // Foreground rooftops (static for title)
    for (let i = 0; i < 6; i++) {
        const bx = i * 90 - 20;
        const bw = 60 + (i % 2) * 20;
        const by = CONFIG.CANVAS_H - 60;

        ctx.fillStyle = C.brickRed;
        ctx.fillRect(bx, by, bw, 60);
        ctx.fillStyle = C.roofTile;
        ctx.fillRect(bx, by - 4, bw, 6);
        ctx.fillStyle = C.gableWhite;
        for (let s = 0; s < 3; s++) {
            ctx.fillRect(bx - 2 - s * 2, by - 8 - s * 6, 4, 6);
        }
    }
};
