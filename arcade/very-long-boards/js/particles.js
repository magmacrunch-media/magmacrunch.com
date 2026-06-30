// ═══════════════════════════════════════════════
// Very Long Boards — Particles (Babylon.js)
// ═══════════════════════════════════════════════

let trailSystem = null;
let shadowTrail = null;
let crashSystem = null;
let trickSystem = null;

window.createParticles = function(scene, particleTex) {
    trailSystem = new BABYLON.ParticleSystem('trail', 500, scene);
    trailSystem.particleTexture = particleTex;
    trailSystem.emitter = BABYLON.Vector3.Zero();
    trailSystem.minLifeTime = 0.2;
    trailSystem.maxLifeTime = 0.6;
    trailSystem.minSize = 0.05;
    trailSystem.maxSize = 0.15;
    trailSystem.emitRate = 80;
    trailSystem.direction1 = new BABYLON.Vector3(-0.3, 0.1, -1);
    trailSystem.direction2 = new BABYLON.Vector3(0.3, 0.4, -0.5);
    trailSystem.minEmitPower = 0.5;
    trailSystem.maxEmitPower = 1.5;
    trailSystem.gravity = new BABYLON.Vector3(0, -1, 0);
    trailSystem.color1 = new BABYLON.Color4(0.78, 0.72, 0.6, 1);
    trailSystem.color2 = new BABYLON.Color4(0.6, 0.55, 0.45, 0.8);
    trailSystem.colorDead = new BABYLON.Color4(0.4, 0.35, 0.25, 0);
    trailSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    trailSystem.start();

    shadowTrail = new BABYLON.ParticleSystem('shadow', 300, scene);
    shadowTrail.particleTexture = particleTex;
    shadowTrail.emitter = BABYLON.Vector3.Zero();
    shadowTrail.minLifeTime = 0.3;
    shadowTrail.maxLifeTime = 0.8;
    shadowTrail.minSize = 0.08;
    shadowTrail.maxSize = 0.2;
    shadowTrail.emitRate = 40;
    shadowTrail.direction1 = new BABYLON.Vector3(-0.2, 0, -0.8);
    shadowTrail.direction2 = new BABYLON.Vector3(0.2, 0.2, -0.3);
    shadowTrail.minEmitPower = 0.3;
    shadowTrail.maxEmitPower = 1;
    shadowTrail.gravity = new BABYLON.Vector3(0, -0.5, 0);
    shadowTrail.color1 = new BABYLON.Color4(0.49, 0.23, 0.93, 0.8);
    shadowTrail.color2 = new BABYLON.Color4(0.35, 0.15, 0.7, 0.6);
    shadowTrail.colorDead = new BABYLON.Color4(0.2, 0.1, 0.4, 0);
    shadowTrail.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    shadowTrail.start();

    crashSystem = new BABYLON.ParticleSystem('crash', 200, scene);
    crashSystem.particleTexture = particleTex;
    crashSystem.emitter = BABYLON.Vector3.Zero();
    crashSystem.minLifeTime = 0.3;
    crashSystem.maxLifeTime = 1;
    crashSystem.minSize = 0.08;
    crashSystem.maxSize = 0.25;
    crashSystem.emitRate = 0;
    crashSystem.direction1 = new BABYLON.Vector3(-2, 1, -2);
    crashSystem.direction2 = new BABYLON.Vector3(2, 3, 2);
    crashSystem.minEmitPower = 2;
    crashSystem.maxEmitPower = 5;
    crashSystem.gravity = new BABYLON.Vector3(0, -5, 0);
    crashSystem.color1 = new BABYLON.Color4(1, 0.18, 0.61, 1);
    crashSystem.color2 = new BABYLON.Color4(1, 0.42, 0.21, 1);
    crashSystem.colorDead = new BABYLON.Color4(1, 0.88, 0.23, 0);
    crashSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    crashSystem.targetStopDuration = 0;
    crashSystem.start();

    trickSystem = new BABYLON.ParticleSystem('trick', 200, scene);
    trickSystem.particleTexture = particleTex;
    trickSystem.emitter = BABYLON.Vector3.Zero();
    trickSystem.minLifeTime = 0.2;
    trickSystem.maxLifeTime = 0.6;
    trickSystem.minSize = 0.06;
    trickSystem.maxSize = 0.18;
    trickSystem.emitRate = 0;
    trickSystem.direction1 = new BABYLON.Vector3(-1.5, 0.5, -1.5);
    trickSystem.direction2 = new BABYLON.Vector3(1.5, 2.5, 1.5);
    trickSystem.minEmitPower = 1;
    trickSystem.maxEmitPower = 3;
    trickSystem.gravity = new BABYLON.Vector3(0, -3, 0);
    trickSystem.color1 = new BABYLON.Color4(1, 0.88, 0.23, 1);
    trickSystem.color2 = new BABYLON.Color4(1, 1, 0.6, 1);
    trickSystem.colorDead = new BABYLON.Color4(0.8, 0.6, 0, 0);
    trickSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    trickSystem.targetStopDuration = 0;
    trickSystem.start();
};

window.updateTrailParticles = function(charTrailType, speed) {
    if (!trailSystem) return;
    const active = speed > 0.05 && player.alive && !player.bailing;
    trailSystem.emitRate = active ? 60 + speed * 200 : 0;
    shadowTrail.emitRate = active && charTrailType === 'shadow' ? 30 + speed * 100 : 0;

    if (playerMesh) {
        trailSystem.emitter = playerMesh.position.clone();
        shadowTrail.emitter = playerMesh.position.clone();
    }
};

window.spawnCrashParticles = function() {
    if (!crashSystem || !playerMesh) return;
    crashSystem.emitter = playerMesh.position.clone();
    crashSystem.manualEmitCount = 40;
};

window.spawnTrickParticles = function() {
    if (!trickSystem || !playerMesh) return;
    trickSystem.emitter = playerMesh.position.add(new BABYLON.Vector3(0, 0.5, 0));
    trickSystem.manualEmitCount = 25;
};

window.disposeParticles = function() {
    [trailSystem, shadowTrail, crashSystem, trickSystem].forEach(s => { if (s) s.dispose(); });
    trailSystem = shadowTrail = crashSystem = trickSystem = null;
};
