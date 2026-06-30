// ═══════════════════════════════════════════════
// Very Long Boards — Obstacles (3D)
// ═══════════════════════════════════════════════

window.obstacles = [];
let obsMaxZ = 0;
let obsMeshes = [];
let obsMaterials = {};

window.createObstacles = function(scene) {
    obsMaterials = {
        cone: (() => { const m = new BABYLON.StandardMaterial('coneMat', scene); m.diffuseColor = new BABYLON.Color3(1, 0.42, 0.21); m.specularColor = BABYLON.Color3.Black(); return m; })(),
        rock: (() => { const m = new BABYLON.StandardMaterial('rockMat', scene); m.diffuseColor = new BABYLON.Color3(0.47, 0.47, 0.47); m.specularColor = BABYLON.Color3.Black(); return m; })(),
        skater: (() => { const m = new BABYLON.StandardMaterial('skaterMat', scene); m.diffuseColor = new BABYLON.Color3(1, 0.18, 0.61); m.specularColor = BABYLON.Color3.Black(); return m; })(),
        sign: (() => { const m = new BABYLON.StandardMaterial('signMat', scene); m.diffuseColor = new BABYLON.Color3(1, 0.88, 0.23); m.specularColor = BABYLON.Color3.Black(); return m; })(),
        puddle: (() => { const m = new BABYLON.StandardMaterial('puddleMat', scene); m.diffuseColor = new BABYLON.Color3(0.29, 0.56, 0.85); m.specularColor = BABYLON.Color3.Black(); m.alpha = 0.6; return m; })()
    };
};

function spawnObstacle(z, scene) {
    const types = CONFIG.OBS_TYPES;
    const t = types[Math.floor(Math.random() * types.length)];
    const worldX = (Math.random() - 0.5) * 4;

    const obs = {
        worldX, z, w: t.w, h: t.h, points: t.points || 0,
        type: t.type, active: true, nearMissed: false, mesh: null
    };

    let mesh;
    switch (t.type) {
        case 'cone':
            mesh = BABYLON.MeshBuilder.CreateCylinder('cone', { diameterTop: 0, diameterBottom: 0.4, height: 0.7, tessellation: 6 }, scene);
            break;
        case 'rock':
            mesh = BABYLON.MeshBuilder.CreateSphere('rock', { diameter: 0.5, segments: 4 }, scene);
            break;
        case 'sign':
            mesh = BABYLON.MeshBuilder.CreateBox('sign', { width: 0.3, height: 0.8, depth: 0.05 }, scene);
            break;
        case 'puddle':
            mesh = BABYLON.MeshBuilder.CreateDisc('puddle', { radius: 0.6, tessellation: 6 }, scene);
            mesh.rotation.x = Math.PI / 2;
            break;
        case 'skater':
            mesh = BABYLON.MeshBuilder.CreateBox('skater', { width: 0.3, height: 0.7, depth: 0.2 }, scene);
            break;
    }

    if (mesh) {
        mesh.material = obsMaterials[t.type];
        mesh.isPickable = false;
        obs.mesh = mesh;
    }

    obstacles.push(obs);
    obsMaxZ = z;
}

window.initObstacles = function(scene) {
    for (const o of obstacles) { if (o.mesh) o.mesh.dispose(); }
    obstacles.length = 0;
    obsMeshes = [];
    obsMaxZ = 0;
    let z = CONFIG.OBS_FIRST * 0.1;
    for (let i = 0; i < 6; i++) {
        spawnObstacle(z, scene);
        z += CONFIG.OBS_MIN_GAP * 0.1 + Math.random() * (CONFIG.OBS_MAX_GAP - CONFIG.OBS_MIN_GAP) * 0.1;
    }
};

window.updateObstacles = function(scene, terrain) {
    const dt = 1;
    for (let i = obstacles.length - 1; i >= 0; i--) {
        if (obstacles[i].z < player.distance - 50) {
            if (obstacles[i].mesh) obstacles[i].mesh.dispose();
            obstacles.splice(i, 1);
        }
    }
    if (obsMaxZ < player.distance + 200) {
        spawnObstacle(obsMaxZ + CONFIG.OBS_MIN_GAP * 0.1 + Math.random() * (CONFIG.OBS_MAX_GAP - CONFIG.OBS_MIN_GAP) * 0.1, scene);
    }
};

window.updateObstaclePositions = function(terrain, scrollOffset) {
    for (const obs of obstacles) {
        if (!obs.mesh) continue;
        const relZ = obs.z - scrollOffset;
        const curve = terrain.curveAt(obs.z);
        const cx = curve * (obs.z - scrollOffset);
        obs.mesh.position.x = obs.worldX + cx;
        obs.mesh.position.y = terrain.hillAt(obs.z) + 0.35;
        obs.mesh.position.z = relZ;
        obs.mesh.setEnabled(obs.active);
    }
};

window.checkObstacleCollisions = function(terrain) {
    if (player.invincible || player.bailing) return false;
    const char = CHARACTERS[currentCharacter];
    const hitW = (char.hitbox.w / 40) * 0.5;
    const hitH = (char.hitbox.h / 60) * 0.5;

    for (const obs of obstacles) {
        if (!obs.active) continue;
        const dz = obs.z - player.distance;
        if (dz < -2 || dz > 3) continue;

        const curve = terrain.curveAt(obs.z);
        const cx = curve * dz;
        const ox = obs.worldX + cx;

        if (Math.abs(player.x - ox) < hitW + 0.3 && Math.abs(dz) < hitH + 0.5) {
            obs.active = false;
            return true;
        }

        if (!obs.nearMissed && Math.abs(player.x - ox) < hitW + 0.6 && Math.abs(dz) < hitH + 0.8) {
            obs.nearMissed = true;
            player.score += CONFIG.NEAR_MISS_POINTS;
            playNearMissSound();
        }
    }
    return false;
};
