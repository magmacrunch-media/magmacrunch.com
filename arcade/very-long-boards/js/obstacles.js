// ═══════════════════════════════════════════════
// Very Long Boards — Obstacles (3D)
// Realistic road hazards
// ═══════════════════════════════════════════════

window.obstacles = [];
let obsMaxZ = 0;
let obsMaterials = {};

window.createObstacles = function(scene) {
    obsMaterials = {
        rock: (() => { const m = new BABYLON.StandardMaterial('rockMat', scene); m.diffuseColor = new BABYLON.Color3(0.5, 0.48, 0.44); m.specularColor = BABYLON.Color3.Black(); return m; })(),
        branch: (() => { const m = new BABYLON.StandardMaterial('branchMat', scene); m.diffuseColor = new BABYLON.Color3(0.35, 0.22, 0.1); m.specularColor = BABYLON.Color3.Black(); return m; })(),
        puddle: (() => { const m = new BABYLON.StandardMaterial('puddleMat', scene); m.diffuseColor = new BABYLON.Color3(0.3, 0.45, 0.55); m.specularColor = BABYLON.Color3.Black(); m.alpha = 0.7; return m; })(),
        pinecone: (() => { const m = new BABYLON.StandardMaterial('pineconeMat', scene); m.diffuseColor = new BABYLON.Color3(0.45, 0.3, 0.15); m.specularColor = BABYLON.Color3.Black(); return m; })(),
        stick: (() => { const m = new BABYLON.StandardMaterial('stickMat', scene); m.diffuseColor = new BABYLON.Color3(0.4, 0.28, 0.12); m.specularColor = BABYLON.Color3.Black(); return m; })()
    };
};

const OBS_TYPES = [
    { type: 'rock', w: 0.5, h: 0.3, prob: 0.25 },
    { type: 'branch', w: 1.0, h: 0.15, prob: 0.25 },
    { type: 'puddle', w: 1.2, h: 0.05, prob: 0.2 },
    { type: 'pinecone', w: 0.2, h: 0.15, prob: 0.2 },
    { type: 'stick', w: 0.6, h: 0.1, prob: 0.1 }
];

function pickObsType() {
    const r = Math.random();
    let acc = 0;
    for (const t of OBS_TYPES) {
        acc += t.prob;
        if (r < acc) return t;
    }
    return OBS_TYPES[0];
}

function spawnObstacle(z, scene) {
    const t = pickObsType();
    const worldX = (Math.random() - 0.5) * 5;

    const obs = {
        worldX, z, w: t.w, h: t.h,
        type: t.type, active: true, nearMissed: false, mesh: null
    };

    let mesh;
    switch (t.type) {
        case 'rock':
            mesh = BABYLON.MeshBuilder.CreateSphere('rock', { diameter: 0.35, segments: 4 }, scene);
            mesh.scaling.y = 0.6;
            break;
        case 'branch':
            mesh = BABYLON.MeshBuilder.CreateCylinder('branch', { height: 1.0, diameter: 0.06, tessellation: 5 }, scene);
            mesh.rotation.z = Math.PI / 2;
            mesh.rotation.y = Math.random() * Math.PI;
            break;
        case 'puddle':
            mesh = BABYLON.MeshBuilder.CreateDisc('puddle', { radius: 0.6, tessellation: 8 }, scene);
            mesh.rotation.x = Math.PI / 2;
            break;
        case 'pinecone':
            mesh = BABYLON.MeshBuilder.CreateSphere('pinecone', { diameter: 0.12, segments: 4 }, scene);
            mesh.scaling.y = 1.4;
            break;
        case 'stick':
            mesh = BABYLON.MeshBuilder.CreateCylinder('stick', { height: 0.5, diameter: 0.04, tessellation: 4 }, scene);
            mesh.rotation.z = Math.PI / 2;
            mesh.rotation.y = Math.random() * Math.PI;
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
    obsMaxZ = 0;
    let z = 30;
    for (let i = 0; i < 8; i++) {
        spawnObstacle(z, scene);
        z += 15 + Math.random() * 25;
    }
};

window.updateObstacles = function(scene, terrain) {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        if (obstacles[i].z < player.distance - 30) {
            if (obstacles[i].mesh) obstacles[i].mesh.dispose();
            obstacles.splice(i, 1);
        }
    }
    if (obsMaxZ < player.distance + 150) {
        spawnObstacle(obsMaxZ + 15 + Math.random() * 25, scene);
    }
};

window.updateObstaclePositions = function(terrain, scrollOffset) {
    for (const obs of obstacles) {
        if (!obs.mesh) continue;
        const relZ = obs.z - scrollOffset;
        const curve = terrain.curveAt(obs.z);
        const cx = curve * relZ;
        obs.mesh.position.x = obs.worldX + cx;

        let yOff = 0.1;
        if (obs.type === 'rock') yOff = 0.12;
        else if (obs.type === 'branch' || obs.type === 'stick') yOff = 0.03;
        else if (obs.type === 'puddle') yOff = 0.01;
        else if (obs.type === 'pinecone') yOff = 0.06;

        obs.mesh.position.y = terrain.hillAt(obs.z) + yOff;
        obs.mesh.position.z = relZ;
        obs.mesh.setEnabled(obs.active);
    }
};

window.checkObstacleCollisions = function(terrain) {
    if (player.invincible || player.bailing) return false;

    for (const obs of obstacles) {
        if (!obs.active) continue;
        const dz = obs.z - player.distance;
        if (dz < -1.5 || dz > 2) continue;

        const curve = terrain.curveAt(obs.z);
        const cx = curve * dz;
        const ox = obs.worldX + cx;

        if (Math.abs(player.x - ox) < 0.5 && Math.abs(dz) < 0.8) {
            obs.active = false;
            return true;
        }

        if (!obs.nearMissed && Math.abs(player.x - ox) < 0.8 && Math.abs(dz) < 1.2) {
            obs.nearMissed = true;
            player.score += CONFIG.NEAR_MISS_POINTS;
            playNearMissSound();
        }
    }
    return false;
};
