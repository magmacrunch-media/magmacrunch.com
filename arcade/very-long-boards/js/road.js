// ═══════════════════════════════════════════════
// Very Long Boards — Road (Segmented Pseudo-3D)
//
// Based on jakesgordon/javascript-racer approach:
// - Segments with worldY (elevation) and curve
// - Standard perspective projection with camera depth from FOV
// - Hidden surface culling for hill crests
// - Camera Y tracks player Y with lerp
// - Declarative track authoring with easeInOut
// - Speed/slope coupling
// - Summer afternoon New Hampshire setting
// ═══════════════════════════════════════════════

function easeIn(a, b, t) { return a + (b - a) * t * t; }
function easeOut(a, b, t) { return a + (b - a) * (1 - (1 - t) * (1 - t)); }
function easeInOut(a, b, t) { return a + (b - a) * (-Math.cos(t * Math.PI) / 2 + 0.5); }
function increase(start, increment, max) { let result = start + increment; while (result >= max) result -= max; while (result < 0) result += max; return result; }
function percentRemaining(n, total) { return (n % total) / total; }
function interpolate(a, b, percent) { return a + (b - a) * percent; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

class Road {
    constructor() {
        this.W = CONFIG.WIDTH;
        this.H = CONFIG.HEIGHT;
        this.segments = [];
        this.trackLength = 0;
        this.playerZ = 0;
        this.playerX = 0;
        this.cameraY = CONFIG.CAMERA_HEIGHT;
        this.horizonOffset = 0;
        this.hillVal = SEG.STRAIGHT;
        this.slope = 0;
        this.curveTotal = 0;
        this.speed = 0;

        this.trees = [];
        this.treeMaxZ = 0;
        this.scenery = [];
        this.sceneryMaxZ = 0;

        this.lastY = 0;
        this.trackCursor = 0;
        this.runType = SEG.STRAIGHT;
        this.runCurve = 0;
        this.runHeight = 0;
        this.runLeft = 0;

        this._initTrack();
        this._initTrees();
        this._initScenery();

        this.debugMode = false;
    }

    _initTrack() {
        this.segments = [];
        this.lastY = 0;
        for (let n = 0; n < CONFIG.NUM_SEGMENTS; n++) {
            this.segments.push(this._createSegment(n));
        }
        this._generateTrack();
        this.trackLength = this.segments.length * CONFIG.SEGMENT_LENGTH;
    }

    _createSegment(index) {
        return {
            index,
            curve: 0,
            y: this.lastY,
            color: Math.floor(index / 3) % 2,
        };
    }

    _generateTrack() {
        this._addHill(60, -200);
        this._addCurve(50, 2, false);
        this._addHill(40, -350);
        this._addCurve(60, -3, true);
        this._addHill(50, -500);
        this._addCurve(40, 4, false);
        this._addHill(60, -700);
        this._addCurve(50, -2, true);
        this._addHill(40, -400);
        this._addCurve(60, 3, false);
        this._addHill(50, -900);
        for (let i = this.trackCursor; i < this.segments.length; i++) {
            this.segments[i].y = this.lastY;
            this.segments[i].curve = (Math.random() - 0.5) * 2;
        }
        this.trackCursor = this.segments.length;
    }

    _addStraight(num) {
        for (let n = 0; n < num; n++) {
            const seg = this.segments[this.segments.length - 1];
            seg.curve = 0;
            seg.y = this.lastY - 10;
            this.lastY = seg.y;
            this.segments.push(this._createSegment(this.segments.length));
        }
    }

    _addHill(num, height) {
        const startY = this.lastY;
        const endY = startY + height;
        for (let n = 0; n < num; n++) {
            const idx = this.trackCursor + n;
            if (idx >= 0 && idx < this.segments.length) {
                this.segments[idx].y = easeInOut(startY, endY, n / num);
            }
        }
        this.trackCursor += num;
        this.lastY = endY;
    }

    _addCurve(num, curve, isLeft) {
        const curveVal = isLeft ? -Math.abs(curve) : Math.abs(curve);
        for (let n = 0; n < num; n++) {
            const idx = this.trackCursor + n;
            if (idx >= 0 && idx < this.segments.length) {
                this.segments[idx].curve = curveVal;
            }
        }
        this.trackCursor += num;
    }

    findSegment(z) {
        return this.segments[Math.floor(z / CONFIG.SEGMENT_LENGTH) % this.segments.length];
    }

    update(speed) {
        this.speed = speed;
        this.playerZ = increase(this.playerZ, speed, this.trackLength);

        const playerSeg = this.findSegment(this.playerZ);
        const playerY = interpolate(playerSeg.y, this.segments[(playerSeg.index + 1) % this.segments.length].y, percentRemaining(this.playerZ, CONFIG.SEGMENT_LENGTH));

        this.cameraY += (playerY + CONFIG.CAMERA_HEIGHT - this.cameraY) * CONFIG.CAMERA_LERP;

        this.hillVal = SEG.STRAIGHT;
        const nextZ = increase(this.playerZ, CONFIG.SEGMENT_LENGTH, this.trackLength);
        const nextSeg = this.findSegment(nextZ);
        const slope = nextSeg.y - playerSeg.y;
        this.slope = slope;

        if (slope < -2) this.hillVal = SEG.HILL_DOWN;
        else if (playerSeg.curve < -0.3) this.hillVal = SEG.CURVE_L;
        else if (playerSeg.curve > 0.3) this.hillVal = SEG.CURVE_R;

        let slopeSum = 0;
        for (let i = 1; i <= CONFIG.HORIZON_LOOKAHEAD; i++) {
            const si = (playerSeg.index + i) % this.segments.length;
            const next = this.segments[si];
            const prev = this.segments[(si - 1 + this.segments.length) % this.segments.length];
            slopeSum += next.y - prev.y;
        }
        const avgSlope = slopeSum / CONFIG.HORIZON_LOOKAHEAD;
        this.horizonOffset = Math.max(-60, Math.min(60, -avgSlope * CONFIG.HORIZON_TILT_SCALE * 10));

        this._recycleSegs();
        this._recycleTrees();
        this._recycleScenery();
    }

    _recycleSegs() {
        while (this.segments.length > 0 &&
               this.segments[0].index * CONFIG.SEGMENT_LENGTH < this.playerZ - CONFIG.SEGMENT_LENGTH * 5) {
            const last = this.segments[this.segments.length - 1];
            if (this.runLeft <= 0) this._pickRun();
            const newSeg = {
                index: last.index + 1,
                curve: this.runCurve,
                y: last.y + this.runHeight,
                color: Math.floor((last.index + 1) / 3) % 2,
            };
            this.segments.push(newSeg);
            this.segments.shift();
            this.runLeft--;
        }
        this.trackLength = this.segments.length * CONFIG.SEGMENT_LENGTH;
    }

    _pickRun() {
        const r = Math.random();
        if (r < 0.25) {
            this.runType = SEG.CURVE_L;
            this.runCurve = -(1 + Math.random() * 3);
            this.runHeight = -(0.05 + Math.random() * 0.1) * CONFIG.SEGMENT_LENGTH;
            this.runLeft = 30 + (Math.random() * 50 | 0);
        } else if (r < 0.50) {
            this.runType = SEG.CURVE_R;
            this.runCurve = 1 + Math.random() * 3;
            this.runHeight = -(0.05 + Math.random() * 0.1) * CONFIG.SEGMENT_LENGTH;
            this.runLeft = 30 + (Math.random() * 50 | 0);
        } else if (r < 0.80) {
            this.runType = SEG.HILL_DOWN;
            this.runCurve = (Math.random() - 0.5) * 2;
            this.runHeight = -(0.15 + Math.random() * 0.3) * CONFIG.SEGMENT_LENGTH;
            this.runLeft = 40 + (Math.random() * 60 | 0);
        } else {
            this.runType = SEG.HILL_DOWN;
            this.runCurve = (Math.random() - 0.5) * 4;
            this.runHeight = -(0.3 + Math.random() * 0.5) * CONFIG.SEGMENT_LENGTH;
            this.runLeft = 30 + (Math.random() * 40 | 0);
        }
    }

    _initTrees() {
        this.trees = [];
        this.treeMaxZ = 0;
        const maxZ = CONFIG.NUM_SEGMENTS * CONFIG.SEGMENT_LENGTH;
        for (let tz = 60; tz < maxZ; tz += 200 + Math.random() * 400) {
            const isPine = Math.random() < 0.45;
            this.trees.push({
                z: tz,
                offset: (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 1.5),
                h: 0.6 + Math.random() * 0.8,
                pine: isPine,
                foliage: isPine ? null : this._randomFoliage(),
            });
            this.treeMaxZ = Math.max(this.treeMaxZ, tz);
        }
    }

    _randomFoliage() {
        const colors = ['#3a8c4a', '#52a85e', '#4a9e3f', '#6bb55a', '#3d8b37'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    _initScenery() {
        this.scenery = [];
        this.sceneryMaxZ = 0;
        const maxZ = CONFIG.NUM_SEGMENTS * CONFIG.SEGMENT_LENGTH;
        for (let sz = 400; sz < maxZ; sz += 600 + Math.random() * 1200) {
            const type = Math.random();
            if (type < 0.4) {
                this.scenery.push({
                    z: sz,
                    offset: (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random() * 2),
                    type: 'wall',
                    w: 60 + Math.random() * 100,
                });
            } else {
                this.scenery.push({
                    z: sz,
                    offset: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 3),
                    type: 'house',
                    houseColor: ['#8B7355', '#A0522D', '#CD853F', '#D2B48C'][Math.floor(Math.random() * 4)],
                    roofColor: ['#8B0000', '#654321', '#4a3728'][Math.floor(Math.random() * 3)],
                });
            }
            this.sceneryMaxZ = Math.max(this.sceneryMaxZ, sz);
        }
    }

    _recycleTrees() {
        while (this.trees.length > 0 && this.trees[0].z < this.playerZ - 500) {
            const newZ = this.treeMaxZ + 200 + Math.random() * 400;
            const isPine = Math.random() < 0.45;
            this.trees.push({
                z: newZ,
                offset: (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 1.5),
                h: 0.6 + Math.random() * 0.8,
                pine: isPine,
                foliage: isPine ? null : this._randomFoliage(),
            });
            this.treeMaxZ = newZ;
            this.trees.shift();
        }
    }

    _recycleScenery() {
        while (this.scenery.length > 0 && this.scenery[0].z < this.playerZ - 1000) {
            const newZ = this.sceneryMaxZ + 600 + Math.random() * 1200;
            const type = Math.random();
            if (type < 0.4) {
                this.scenery.push({
                    z: newZ,
                    offset: (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random() * 2),
                    type: 'wall',
                    w: 60 + Math.random() * 100,
                });
            } else {
                this.scenery.push({
                    z: newZ,
                    offset: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 3),
                    type: 'house',
                    houseColor: ['#8B7355', '#A0522D', '#CD853F', '#D2B48C'][Math.floor(Math.random() * 4)],
                    roofColor: ['#8B0000', '#654321', '#4a3728'][Math.floor(Math.random() * 3)],
                });
            }
            this.sceneryMaxZ = newZ;
            this.scenery.shift();
        }
    }

    _project(z, worldX, worldY) {
        const scale = CONFIG.CAMERA_DEPTH / z;
        let deltaY = worldY - this.cameraY;
        if (deltaY < 0) deltaY *= CONFIG.DOWNHILL_EXAGGERATION;
        const sx = this.W / 2 + scale * (worldX - this.playerX * CONFIG.ROAD_WIDTH) * this.W / 2;
        const sy = this.H / 2 - scale * deltaY * this.H / 2 + this.horizonOffset;
        const sw = scale * CONFIG.ROAD_WIDTH * this.W / 2;
        return {
            x: sx,
            y: sy,
            w: sw,
            cx: sx,
            screenY: sy,
            scale,
        };
    }

    render(ctx) {
        ctx.clearRect(0, 0, this.W, this.H);

        const baseSegIdx = Math.floor(this.playerZ / CONFIG.SEGMENT_LENGTH) % this.segments.length;
        const basePercent = percentRemaining(this.playerZ, CONFIG.SEGMENT_LENGTH);
        const baseSeg = this.segments[baseSegIdx];
        const playerY = interpolate(baseSeg.y, this.segments[(baseSegIdx + 1) % this.segments.length].y, basePercent);

        let maxClipY = this.H;
        let x = 0;
        let dx = -(baseSeg.curve * basePercent);
        let projected = [];

        for (let n = 0; n < CONFIG.DRAW_DISTANCE; n++) {
            const segIdx = (baseSegIdx + n) % this.segments.length;
            const seg = this.segments[segIdx];
            const looped = segIdx < baseSegIdx;
            const segZ = (seg.index * CONFIG.SEGMENT_LENGTH) - this.playerZ + (looped ? this.trackLength : 0);

            if (segZ <= CONFIG.CAMERA_DEPTH) continue;

            const proj = this._project(segZ, x - dx, seg.y);
            proj.seg = seg;
            proj.segZ = segZ;
            proj.clip = maxClipY;
            projected.push(proj);

            maxClipY = Math.min(maxClipY, proj.y);

            x += dx;
            dx += seg.curve;
        }

        const horizonY = projected.length > 0 ? projected[projected.length - 1].y : this.H * 0.35;
        this._drawSky(ctx, horizonY);
        this._drawMountains(ctx, horizonY);

        for (let n = projected.length - 1; n > 0; n--) {
            const p = projected[n];
            const q = projected[n - 1];

            if (p.y >= p.clip) continue;
            if (q.y <= p.y) continue;

            this._drawSegment(ctx, p, q);
        }

        if (projected.length > 0) {
            const nearY = Math.floor(projected[0].y);
            if (nearY < this.H) {
                const gIdx = projected[0].seg ? Math.floor(projected[0].seg.index / 3) % 2 : 0;
                ctx.fillStyle = gIdx ? '#1e5c23' : '#1a521f';
                ctx.fillRect(0, nearY, this.W, this.H - nearY);
                if (projected[0].w > 0) {
                    ctx.fillStyle = gIdx ? '#6b6b6b' : '#696969';
                    ctx.fillRect(projected[0].x - projected[0].w / 2, nearY, projected[0].w, this.H - nearY);
                }
            }
        }

        this._drawTrees(ctx);
        this._drawScenery(ctx);

        if (this.debugMode) {
            this._drawDebug(ctx);
        }
    }

    _drawQuad(ctx, color, x1, y1, w1, x2, y2, w2) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x1 - w1, y1);
        ctx.lineTo(x1 + w1, y1);
        ctx.lineTo(x2 + w2, y2);
        ctx.lineTo(x2 - w2, y2);
        ctx.closePath();
        ctx.fill();
    }

    _drawSegment(ctx, far, near) {
        const W = this.W;
        const curve = near.seg ? near.seg.curve : 0;
        const isSteep = this.slope < -0.3;

        const fy = far.y;
        const ny = near.y;
        if (ny <= fy) return;

        const nearScale = near.scale;
        const farScale = far.scale;
        const nearIdx = near.seg ? Math.floor(near.seg.index / 3) % 2 : 0;

        const grassColor = nearIdx ? '#1e5c23' : '#1a521f';
        ctx.fillStyle = grassColor;
        ctx.fillRect(0, Math.floor(fy), W, Math.ceil(ny - fy));

        const rumbleColor = nearIdx ? '#c84040' : '#9a9a9a';
        this._drawQuad(ctx, rumbleColor,
            near.x, ny, near.w * 1.15,
            far.x, fy, far.w * 1.15);

        const roadColor = nearIdx ? '#6b6b6b' : '#696969';
        this._drawQuad(ctx, isSteep ? '#585858' : roadColor,
            near.x, ny, near.w,
            far.x, fy, far.w);

        if (nearIdx === 0) {
            const lineW = Math.max(1, 3 * nearScale);
            ctx.fillStyle = '#fff';
            ctx.fillRect(near.x - lineW / 2, Math.floor(fy), lineW, Math.ceil(ny - fy));
        }

        const edgeW = Math.max(1, 2 * nearScale);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(near.x - near.w / 2, Math.floor(fy), edgeW, Math.ceil(ny - fy));
        ctx.fillRect(near.x + near.w / 2 - edgeW, Math.floor(fy), edgeW, Math.ceil(ny - fy));
    }

    _drawSky(ctx, horizonY) {
        const ho = this.horizonOffset;
        const hY = Math.max(0, Math.min(this.H * 0.7, horizonY + ho));
        const sky = ctx.createLinearGradient(0, 0, 0, hY);
        sky.addColorStop(0, CONFIG.SKY_TOP);
        sky.addColorStop(0.5, CONFIG.SKY_MID);
        sky.addColorStop(1, CONFIG.SKY_BOTTOM);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, this.W, hY + 5);

        if (hY > 30) {
            ctx.fillStyle = 'rgba(255,255,230,0.25)';
            ctx.beginPath();
            ctx.arc(this.W * 0.75, hY * 0.3, hY * 0.12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,200,0.15)';
            ctx.beginPath();
            ctx.arc(this.W * 0.75, hY * 0.3, hY * 0.2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = 'rgba(10,6,18,0.02)';
        for (let y = 0; y < this.H; y += 3) {
            ctx.fillRect(0, y, this.W, 1);
        }
    }

    _drawMountains(ctx, horizonY) {
        const hY = Math.max(0, horizonY);
        const p1 = (this.playerZ * 0.0003 + this.playerX * 0.3) % this.W;

        ctx.fillStyle = CONFIG.MOUNTAIN_FAR;
        ctx.beginPath();
        ctx.moveTo(0, hY);
        for (let x = 0; x <= this.W; x += 30) {
            const h = 20 + Math.sin((x + p1) * 0.02) * 30 + Math.sin((x + p1) * 0.007) * 15;
            ctx.lineTo(x, hY - h);
        }
        ctx.lineTo(this.W, hY);
        ctx.closePath();
        ctx.fill();

        const p2 = (this.playerZ * 0.001 + this.playerX * 0.5) % this.W;
        ctx.fillStyle = CONFIG.MOUNTAIN_NEAR;
        ctx.beginPath();
        ctx.moveTo(0, hY);
        for (let x = 0; x <= this.W; x += 20) {
            const h = 12 + Math.sin((x + p2) * 0.03) * 18 + Math.sin((x + p2) * 0.01) * 8;
            ctx.lineTo(x, hY - h);
        }
        ctx.lineTo(this.W, hY);
        ctx.closePath();
        ctx.fill();
    }

    _drawTrees(ctx) {
        const sorted = [...this.trees].sort((a, b) => b.z - a.z);
        for (const t of sorted) {
            const relZ = t.z - this.playerZ;
            if (relZ < CONFIG.CAMERA_DEPTH || relZ > CONFIG.DRAW_DISTANCE * CONFIG.SEGMENT_LENGTH) continue;

            const segIdx = Math.floor(t.z / CONFIG.SEGMENT_LENGTH) % this.segments.length;
            const seg = this.segments[segIdx];
            const worldX = t.offset * CONFIG.ROAD_WIDTH;
            const proj = this._project(relZ, worldX - this.playerX * CONFIG.ROAD_WIDTH * t.offset * 0.3, seg.y);

            if (proj.x < -100 || proj.x > this.W + 100) continue;
            const s = proj.scale * t.h;
            if (s < 0.01) continue;

            const alpha = Math.min(1, 0.3 + proj.scale * 80);
            ctx.globalAlpha = alpha;

            if (t.pine) {
                this._drawPine(ctx, proj.x, proj.y, s);
            } else {
                this._drawDecid(ctx, proj.x, proj.y, s, t.foliage);
            }
            ctx.globalAlpha = 1;
        }
    }

    _drawPine(ctx, x, y, s) {
        ctx.fillStyle = '#1e3310';
        ctx.fillRect(x - 2 * s, y - 22 * s, 4 * s, 22 * s);
        const layers = [
            { dy: -2, hw: 10, h: 12, c: '#1a4d2b' },
            { dy: -10, hw: 8, h: 14, c: '#2d6b3f' },
            { dy: -20, hw: 5, h: 12, c: '#17592a' },
        ];
        for (const l of layers) {
            ctx.fillStyle = l.c;
            ctx.beginPath();
            ctx.moveTo(x, y + (l.dy - l.h) * s);
            ctx.lineTo(x - l.hw * s, y + l.dy * s);
            ctx.lineTo(x + l.hw * s, y + l.dy * s);
            ctx.closePath();
            ctx.fill();
        }
    }

    _drawDecid(ctx, x, y, s, foliage) {
        ctx.fillStyle = '#3a2a18';
        ctx.fillRect(x - 2.5 * s, y - 18 * s, 5 * s, 18 * s);
        ctx.fillStyle = foliage || '#3a8c4a';
        ctx.beginPath();
        ctx.ellipse(x, y - 26 * s, 12 * s, 14 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this._lighten(foliage || '#3a8c4a', 30);
        ctx.beginPath();
        ctx.ellipse(x - 3 * s, y - 28 * s, 7 * s, 9 * s, -0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    _lighten(hex, amt) {
        if (hex.startsWith('rgb')) return hex;
        const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amt);
        const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amt);
        const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amt);
        return `rgb(${r},${g},${b})`;
    }

    _drawScenery(ctx) {
        const sorted = [...this.scenery].sort((a, b) => b.z - a.z);
        for (const sc of sorted) {
            const relZ = sc.z - this.playerZ;
            if (relZ < CONFIG.CAMERA_DEPTH || relZ > CONFIG.DRAW_DISTANCE * CONFIG.SEGMENT_LENGTH) continue;

            const segIdx = Math.floor(sc.z / CONFIG.SEGMENT_LENGTH) % this.segments.length;
            const seg = this.segments[segIdx];
            const worldX = sc.offset * CONFIG.ROAD_WIDTH;
            const proj = this._project(relZ, worldX, seg.y);
            const s = proj.scale;

            ctx.globalAlpha = Math.min(1, 0.3 + s * 80);

            if (sc.type === 'wall') {
                const wallH = 6 * s * 80;
                const wallW = Math.min(sc.w * s * 80, 30);
                ctx.fillStyle = '#8a7e6e';
                ctx.fillRect(proj.x - wallW / 2, proj.y - wallH, wallW, wallH);
                ctx.fillStyle = '#6b6253';
                for (let wy = 0; wy < wallH; wy += Math.max(2, 2 * s * 80)) {
                    ctx.fillRect(proj.x - wallW / 2, proj.y - wallH + wy, wallW, 1);
                }
            } else if (sc.type === 'house') {
                const bW = 24 * s * 80;
                const bH = 16 * s * 80;
                const rH = 10 * s * 80;
                ctx.fillStyle = sc.houseColor;
                ctx.fillRect(proj.x - bW / 2, proj.y - bH, bW, bH);
                ctx.fillStyle = '#f5e68c';
                ctx.fillRect(proj.x - bW / 2 + 3 * s * 80, proj.y - bH + 4 * s * 80, 4 * s * 80, 4 * s * 80);
                ctx.fillStyle = sc.roofColor;
                ctx.beginPath();
                ctx.moveTo(proj.x - bW / 2 - 2 * s * 80, proj.y - bH);
                ctx.lineTo(proj.x, proj.y - bH - rH);
                ctx.lineTo(proj.x + bW / 2 + 2 * s * 80, proj.y - bH);
                ctx.closePath();
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
    }

    _drawDebug(ctx) {
        const W = this.W;
        const H = this.H;
        const profW = 300;
        const profH = 80;
        const profX = W - profW - 10;
        const profY = H - profH - 10;

        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(profX, profY, profW, profH);

        ctx.strokeStyle = '#39ff6e';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(profX, profY + profH / 2);
        ctx.lineTo(profX + profW, profY + profH / 2);
        ctx.stroke();

        ctx.beginPath();
        const maxElev = 2000;
        let minY = 0, maxY = 0;
        for (let n = 0; n < Math.min(100, this.segments.length); n++) {
            const seg = this.segments[(Math.floor(this.playerZ / CONFIG.SEGMENT_LENGTH) + n) % this.segments.length];
            if (seg.y < minY) minY = seg.y;
            if (seg.y > maxY) maxY = seg.y;
        }

        for (let n = 0; n < Math.min(100, this.segments.length); n++) {
            const seg = this.segments[(Math.floor(this.playerZ / CONFIG.SEGMENT_LENGTH) + n) % this.segments.length];
            const x = profX + (n / 100) * profW;
            const y = profY + profH - ((seg.y - minY) / (maxY - minY || 1)) * (profH * 0.8) - profH * 0.1;
            if (n === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#ffe03a';
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('ELEVATION', profX + 4, profY + 10);
        ctx.fillText(`z:${Math.floor(this.playerZ)} y:${Math.floor(this.cameraY)}`, profX + 4, profY + 20);
    }

    drawSpeedLines(ctx, speed) {
        if (speed < 3) return;
        const intensity = (speed - 3) / (CONFIG.MAX_SPEED - 3);
        const n = Math.floor(intensity * 12);
        ctx.strokeStyle = `rgba(255,255,255,${0.04 + intensity * 0.08})`;
        ctx.lineWidth = 1;
        for (let i = 0; i < n; i++) {
            const x = this.W / 2 + (Math.random() - 0.5) * this.W * 0.8;
            const y = this.H * 0.3 + Math.random() * this.H * 0.6;
            const len = 10 + Math.random() * 20 * intensity;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + len);
            ctx.stroke();
        }
    }

    getHorizonY() { return this.H * 0.35; }

    getCurvePush() {
        const seg = this.findSegment(this.playerZ);
        return seg.curve * this.speed * CONFIG.CURVE_PUSH * 0.8;
    }

    getDrawDistance() { return CONFIG.DRAW_DISTANCE * CONFIG.SEGMENT_LENGTH; }

    getHillVal() { return this.hillVal; }
    getSlope() { return this.slope; }
}