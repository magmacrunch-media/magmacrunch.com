const obstacles = [];
let obsMaxZ = 0;

function spawnObstacle(z) {
    const t = CONFIG.OBS_TYPES[Math.floor(Math.random() * CONFIG.OBS_TYPES.length)];
    const worldX = (Math.random() - 0.5) * 0.8;

    obstacles.push({
        worldX,
        z,
        w: t.w, h: t.h,
        points: t.points || 0,
        type: t.type,
        color: t.color,
        active: true,
        nearMissed: false,
    });
    obsMaxZ = z;
}

function initObstacles() {
    obstacles.length = 0;
    obsMaxZ = 0;
    let z = CONFIG.OBS_FIRST;
    for (let i = 0; i < 6; i++) {
        spawnObstacle(z);
        z += CONFIG.OBS_MIN_GAP + Math.random() * (CONFIG.OBS_MAX_GAP - CONFIG.OBS_MIN_GAP);
    }
}

function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        if (obstacles[i].z < player.distance - 300) obstacles.splice(i, 1);
    }
    const dd = CONFIG.DRAW_DISTANCE * CONFIG.SEGMENT_LENGTH;
    if (obsMaxZ < player.distance + dd) {
        spawnObstacle(obsMaxZ + CONFIG.OBS_MIN_GAP + Math.random() * (CONFIG.OBS_MAX_GAP - CONFIG.OBS_MIN_GAP));
    }
}

function renderObstacles(ctx, road) {
    const dd = CONFIG.DRAW_DISTANCE * CONFIG.SEGMENT_LENGTH;

    const sorted = [...obstacles].filter(o => o.active).sort((a, b) => b.z - a.z);

    for (const obs of sorted) {
        const relZ = obs.z - player.distance;
        if (relZ < CONFIG.CAMERA_DEPTH || relZ > dd) continue;

        const seg = road.findSegment(obs.z);
        if (!seg) continue;
        const proj = road._project(relZ, obs.worldX * CONFIG.ROAD_WIDTH, seg.y);
        if (!proj) continue;
        const sx = proj.cx;
        const sy = proj.screenY;
        const sw = obs.w * proj.scale;
        const sh = obs.h * proj.scale;
        const alpha = Math.min(1, 0.35 + proj.scale * 80 * 0.65);

        ctx.globalAlpha = alpha;

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        if (obs.type !== 'puddle') {
            ctx.beginPath();
            ctx.ellipse(sx, sy + 2 * proj.scale * 80, sw * 0.6, sh * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = Math.max(1, 2 * proj.scale * 80);

        if (obs.type === 'cone') {
            ctx.fillStyle = '#ff6b35';
            ctx.beginPath();
            ctx.moveTo(sx, sy - sh);
            ctx.lineTo(sx - sw / 2, sy);
            ctx.lineTo(sx + sw / 2, sy);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.fillRect(sx - sw / 4, sy - sh * 0.6, sw / 2, sh * 0.12);
        } else if (obs.type === 'rock') {
            ctx.fillStyle = '#777';
            ctx.beginPath();
            ctx.ellipse(sx, sy - sh * 0.3, sw / 2, sh / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.beginPath();
            ctx.ellipse(sx - sw * 0.1, sy - sh * 0.4, sw * 0.25, sh * 0.2, -0.3, 0, Math.PI * 2);
            ctx.fill();
        } else if (obs.type === 'skater') {
            ctx.fillStyle = '#ff2e9c';
            ctx.fillRect(sx - sw / 4, sy - sh, sw / 2, sh * 0.6);
            ctx.strokeRect(sx - sw / 4, sy - sh, sw / 2, sh * 0.6);
            ctx.fillStyle = '#f0d5a8';
            ctx.beginPath();
            ctx.arc(sx, sy - sh * 0.8, sw * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (obs.type === 'sign') {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(sx - 2 * proj.scale * 80, sy - sh, 4 * proj.scale * 80, sh);
            ctx.fillStyle = '#ffe03a';
            ctx.fillRect(sx - sw / 2, sy - sh, sw, sh * 0.4);
            ctx.strokeRect(sx - sw / 2, sy - sh, sw, sh * 0.4);
            ctx.fillStyle = '#000';
            ctx.font = `${Math.max(6, 8 * proj.scale * 80)}px "Press Start 2P", monospace`;
            ctx.textAlign = 'center';
            ctx.fillText('!', sx, sy - sh * 0.7);
        } else if (obs.type === 'puddle') {
            ctx.fillStyle = 'rgba(74,144,217,0.5)';
            ctx.beginPath();
            ctx.ellipse(sx, sy, sw / 2, sh / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(100,180,255,0.4)';
            ctx.stroke();
            ctx.fillStyle = 'rgba(200,230,255,0.3)';
            ctx.beginPath();
            ctx.ellipse(sx - sw * 0.15, sy - sh * 0.1, sw * 0.2, sh * 0.15, -0.2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
    }
}