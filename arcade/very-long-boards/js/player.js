// ═══════════════════════════════════════════════
// Very Long Boards — Player (3D)
// Simple downhill skateboarding
// ═══════════════════════════════════════════════

window.player = {
    x: 0, speed: 0, lean: 0, targetLean: 0,
    distance: 0, score: 0, alive: true,
    invincible: false, invincibleTimer: 0,
    stability: 100, wobbling: false, wobblePhase: 0,
    bailing: false, bailTimer: 0,
    groundY: 0
};

window.playerMesh = null;

window.createPlayer = function(scene) {
    const root = new BABYLON.TransformNode('playerRoot', scene);

    const deckMat = new BABYLON.StandardMaterial('deckMat', scene);
    deckMat.diffuseColor = new BABYLON.Color3(0.5, 0.25, 0.06);
    deckMat.specularColor = BABYLON.Color3.Black();

    const gripMat = new BABYLON.StandardMaterial('gripMat', scene);
    gripMat.diffuseColor = new BABYLON.Color3(0.22, 0.22, 0.22);
    gripMat.specularColor = BABYLON.Color3.Black();

    const wheelMat = new BABYLON.StandardMaterial('wheelMat', scene);
    wheelMat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.15);
    wheelMat.specularColor = BABYLON.Color3.Black();

    const deck = BABYLON.MeshBuilder.CreateBox('deck', { width: 0.7, height: 0.06, depth: 1.8 }, scene);
    deck.material = deckMat;
    deck.parent = root;
    deck.position.y = 0.15;

    const grip = BABYLON.MeshBuilder.CreateBox('grip', { width: 0.66, height: 0.02, depth: 1.6 }, scene);
    grip.material = gripMat;
    grip.parent = root;
    grip.position.y = 0.19;

    const wheelPos = [[-0.28, 0.05, 0.55], [0.28, 0.05, 0.55], [-0.28, 0.05, -0.55], [0.28, 0.05, -0.55]];
    for (const [wx, wy, wz] of wheelPos) {
        const w = BABYLON.MeshBuilder.CreateCylinder('wh', { height: 0.1, diameter: 0.12, tessellation: 6 }, scene);
        w.material = wheelMat;
        w.rotation.z = Math.PI / 2;
        w.parent = root;
        w.position = new BABYLON.Vector3(wx, wy, wz);
    }

    const skinMat = new BABYLON.StandardMaterial('skinMat', scene);
    skinMat.diffuseColor = new BABYLON.Color3(0.92, 0.82, 0.64);
    skinMat.specularColor = BABYLON.Color3.Black();

    const shirtMat = new BABYLON.StandardMaterial('shirtMat', scene);
    shirtMat.diffuseColor = new BABYLON.Color3(0.6, 0.2, 0.2);
    shirtMat.specularColor = BABYLON.Color3.Black();

    const pantsMat = new BABYLON.StandardMaterial('pantsMat', scene);
    pantsMat.diffuseColor = new BABYLON.Color3(0.2, 0.22, 0.28);
    pantsMat.specularColor = BABYLON.Color3.Black();

    const hairMat = new BABYLON.StandardMaterial('hairMat', scene);
    hairMat.diffuseColor = new BABYLON.Color3(0.35, 0.22, 0.12);
    hairMat.specularColor = BABYLON.Color3.Black();

    const body = BABYLON.MeshBuilder.CreateBox('body', { width: 0.5, height: 0.55, depth: 0.28 }, scene);
    body.material = shirtMat;
    body.parent = root;
    body.position.y = 0.75;

    const legL = BABYLON.MeshBuilder.CreateBox('legL', { width: 0.16, height: 0.32, depth: 0.16 }, scene);
    legL.material = pantsMat;
    legL.parent = root;
    legL.position = new BABYLON.Vector3(-0.14, 0.35, 0);

    const legR = BABYLON.MeshBuilder.CreateBox('legR', { width: 0.16, height: 0.32, depth: 0.16 }, scene);
    legR.material = pantsMat;
    legR.parent = root;
    legR.position = new BABYLON.Vector3(0.14, 0.35, 0);

    const head = BABYLON.MeshBuilder.CreateBox('head', { size: 0.28 }, scene);
    head.material = skinMat;
    head.parent = root;
    head.position.y = 1.2;

    const hair = BABYLON.MeshBuilder.CreateBox('hair', { width: 0.3, height: 0.09, depth: 0.3 }, scene);
    hair.material = hairMat;
    hair.parent = root;
    hair.position.y = 1.38;

    const armL = BABYLON.MeshBuilder.CreateBox('armL', { width: 0.1, height: 0.38, depth: 0.1 }, scene);
    armL.material = skinMat;
    armL.parent = root;
    armL.position = new BABYLON.Vector3(-0.34, 0.82, 0);
    armL.rotation.z = 0.2;

    const armR = BABYLON.MeshBuilder.CreateBox('armR', { width: 0.1, height: 0.38, depth: 0.1 }, scene);
    armR.material = skinMat;
    armR.parent = root;
    armR.position = new BABYLON.Vector3(0.34, 0.82, 0);
    armR.rotation.z = -0.2;

    root._armL = armL;
    root._armR = armR;

    for (const m of root.getChildMeshes()) m.isPickable = false;

    playerMesh = root;
    return root;
};

window.resetPlayer = function() {
    player.x = 0;
    player.speed = 0;
    player.lean = 0;
    player.targetLean = 0;
    player.distance = 0;
    player.score = 0;
    player.alive = true;
    player.invincible = false;
    player.invincibleTimer = 0;
    player.stability = CONFIG.STABILITY_MAX;
    player.wobbling = false;
    player.wobblePhase = 0;
    player.bailing = false;
    player.bailTimer = 0;
    player.groundY = 0;
};

window.updatePlayer = function(input, terrain, dt) {
    const char = CHARACTERS[currentCharacter];
    const maxSpd = CONFIG.MAX_SPEED * char.speedMult * 0.25;
    const handling = CONFIG.TURN_SPEED * char.handlingMult * 0.15;
    const stabMult = char.stabilityMult;
    const dtScale = dt * 60;

    if (player.bailing) {
        player.bailTimer -= dtScale;
        player.speed *= (1 - 0.05 * dtScale);
        player.wobblePhase += 0.3 * dtScale;
        if (player.bailTimer <= 0) return 'bail';
        return null;
    }

    const slope = terrain ? (terrain.hillAt(player.distance + 3) - terrain.hillAt(player.distance)) / 3 : 0;
    const slopeAccel = -slope * 0.08;
    player.speed += slopeAccel * dtScale;
    player.speed *= Math.pow(0.997, dtScale);

    if (input.brake) {
        player.speed *= Math.pow(0.97, dtScale);
    }

    if (input.left) {
        player.targetLean = -1;
        player.x -= handling * dtScale * (0.3 + player.speed * 0.5);
    } else if (input.right) {
        player.targetLean = 1;
        player.x += handling * dtScale * (0.3 + player.speed * 0.5);
    } else {
        player.targetLean = 0;
    }
    player.lean += (player.targetLean - player.lean) * 0.12 * dtScale;

    if (terrain) {
        const curve = terrain.curveAt(player.distance);
        player.x += curve * player.speed * CONFIG.CURVE_PUSH * 6 * dtScale;
    }

    player.speed = Math.max(0.02, Math.min(maxSpd, player.speed));
    player.x = Math.max(-3.5, Math.min(3.5, player.x));

    const turning = input.left || input.right;
    if (turning) {
        player.stability += CONFIG.STABILITY_GAIN * stabMult * dtScale;
        if (player.stability > CONFIG.STABILITY_MAX) player.stability = CONFIG.STABILITY_MAX;
    } else if (player.speed > 0.3) {
        const speedFactor = Math.min(player.speed / maxSpd, 1);
        player.stability -= CONFIG.STABILITY_DECAY * (0.2 + speedFactor) * dtScale;
        if (player.stability < 0) player.stability = 0;
    }

    player.wobbling = player.stability < CONFIG.STABILITY_WOBBLE_AT;
    player.wobblePhase += player.wobbling ? (0.12 + (1 - player.stability / CONFIG.STABILITY_WOBBLE_AT) * 0.25) * dtScale : 0;

    if (player.stability <= CONFIG.STABILITY_BAIL_AT && player.speed > 0.5) {
        player.bailing = true;
        player.bailTimer = 40;
        return null;
    }

    player.groundY = terrain ? terrain.hillAt(player.distance) : 0;
    player.distance += player.speed * dtScale;
    player.score += Math.floor(player.speed * 3 * dtScale);

    if (player.invincible) {
        player.invincibleTimer -= dtScale;
        if (player.invincibleTimer <= 0) player.invincible = false;
    }

    return null;
};

window.updatePlayerMesh = function(terrain, frame) {
    if (!playerMesh) return;

    let wobbleX = 0;
    if (player.wobbling && !player.bailing) {
        const str = 1 - (player.stability / CONFIG.STABILITY_WOBBLE_AT);
        wobbleX = Math.sin(player.wobblePhase * 6) * str * 0.3;
    }

    playerMesh.position.x = player.x + wobbleX;
    playerMesh.position.y = player.groundY + 0.1;
    playerMesh.position.z = 0;

    if (player.bailing) {
        const progress = 1 - (player.bailTimer / 40);
        playerMesh.rotation.z = progress * progress * 3;
        playerMesh.rotation.x = progress * 1.0;
        playerMesh.scaling.y = 1 - progress * 0.2;
    } else {
        playerMesh.rotation.z = player.lean * 0.18 + wobbleX * 0.08;
        playerMesh.rotation.y = player.lean * 0.12;
        playerMesh.rotation.x = 0;
        playerMesh.scaling.y = 1;
    }

    if (playerMesh._armL) {
        const armSwing = Math.sin(frame * 0.1) * 0.3 * Math.min(1, player.speed * 2);
        playerMesh._armL.rotation.z = 0.2 + armSwing;
        playerMesh._armR.rotation.z = -0.2 - armSwing;
    }
};

window.performTrick = function() {
    return false;
};

window.getPlayerScreenY = function() { return 0.8; };
