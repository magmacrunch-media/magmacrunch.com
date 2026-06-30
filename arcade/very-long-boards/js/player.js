// ═══════════════════════════════════════════════
// Very Long Boards — Player (3D)
// ═══════════════════════════════════════════════

window.player = {
    x: 0, speed: 0, lean: 0, targetLean: 0,
    distance: 0, score: 0, alive: true,
    trickActive: false, trickTimer: 0,
    invincible: false, invincibleTimer: 0,
    kicking: false, kickFrames: 0,
    stability: 100, wobbling: false, wobblePhase: 0,
    bailing: false, bailTimer: 0
};

window.playerMesh = null;

window.createPlayer = function(scene) {
    const root = new BABYLON.TransformNode('playerRoot', scene);

    const deckMat = new BABYLON.StandardMaterial('deckMat', scene);
    deckMat.diffuseColor = new BABYLON.Color3(0.55, 0.27, 0.07);
    deckMat.specularColor = BABYLON.Color3.Black();

    const gripMat = new BABYLON.StandardMaterial('gripMat', scene);
    gripMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    gripMat.specularColor = BABYLON.Color3.Black();

    const wheelMat = new BABYLON.StandardMaterial('wheelMat', scene);
    wheelMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    wheelMat.specularColor = BABYLON.Color3.Black();

    const deck = BABYLON.MeshBuilder.CreateBox('deck', { width: 0.5, height: 0.05, depth: 1.4 }, scene);
    deck.material = deckMat;
    deck.parent = root;
    deck.position.y = 0.15;

    const grip = BABYLON.MeshBuilder.CreateBox('grip', { width: 0.48, height: 0.02, depth: 1.2 }, scene);
    grip.material = gripMat;
    grip.parent = root;
    grip.position.y = 0.185;

    const wheelPositions = [[-0.22, 0.05, 0.45], [0.22, 0.05, 0.45], [-0.22, 0.05, -0.45], [0.22, 0.05, -0.45]];
    for (const [wx, wy, wz] of wheelPositions) {
        const w = BABYLON.MeshBuilder.CreateCylinder('wh', { height: 0.12, diameter: 0.12, tessellation: 6 }, scene);
        w.material = wheelMat;
        w.rotation.z = Math.PI / 2;
        w.parent = root;
        w.position = new BABYLON.Vector3(wx, wy, wz);
    }

    const skinMat = new BABYLON.StandardMaterial('skinMat', scene);
    skinMat.diffuseColor = new BABYLON.Color3(0.94, 0.84, 0.66);
    skinMat.specularColor = BABYLON.Color3.Black();

    const bodyMat = new BABYLON.StandardMaterial('bodyMat', scene);
    bodyMat.diffuseColor = new BABYLON.Color3(0.29, 0.56, 0.85);
    bodyMat.specularColor = BABYLON.Color3.Black();

    const pantsMat = new BABYLON.StandardMaterial('pantsMat', scene);
    pantsMat.diffuseColor = new BABYLON.Color3(0.17, 0.24, 0.31);
    pantsMat.specularColor = BABYLON.Color3.Black();

    const hairMat = new BABYLON.StandardMaterial('hairMat', scene);
    hairMat.diffuseColor = new BABYLON.Color3(0.36, 0.25, 0.15);
    hairMat.specularColor = BABYLON.Color3.Black();

    const body = BABYLON.MeshBuilder.CreateBox('body', { width: 0.35, height: 0.4, depth: 0.2 }, scene);
    body.material = bodyMat;
    body.parent = root;
    body.position.y = 0.6;

    const legL = BABYLON.MeshBuilder.CreateBox('legL', { width: 0.12, height: 0.25, depth: 0.12 }, scene);
    legL.material = pantsMat;
    legL.parent = root;
    legL.position = new BABYLON.Vector3(-0.1, 0.28, 0);

    const legR = BABYLON.MeshBuilder.CreateBox('legR', { width: 0.12, height: 0.25, depth: 0.12 }, scene);
    legR.material = pantsMat;
    legR.parent = root;
    legR.position = new BABYLON.Vector3(0.1, 0.28, 0);

    const head = BABYLON.MeshBuilder.CreateBox('head', { size: 0.22 }, scene);
    head.material = skinMat;
    head.parent = root;
    head.position.y = 0.95;

    const hair = BABYLON.MeshBuilder.CreateBox('hair', { width: 0.24, height: 0.08, depth: 0.24 }, scene);
    hair.material = hairMat;
    hair.parent = root;
    hair.position.y = 1.1;

    const armL = BABYLON.MeshBuilder.CreateBox('armL', { width: 0.08, height: 0.3, depth: 0.08 }, scene);
    armL.material = skinMat;
    armL.parent = root;
    armL.position = new BABYLON.Vector3(-0.24, 0.65, 0);
    armL.rotation.z = 0.3;

    const armR = BABYLON.MeshBuilder.CreateBox('armR', { width: 0.08, height: 0.3, depth: 0.08 }, scene);
    armR.material = skinMat;
    armR.parent = root;
    armR.position = new BABYLON.Vector3(0.24, 0.65, 0);
    armR.rotation.z = -0.3;

    root._armL = armL;
    root._armR = armR;
    root._body = body;
    root._head = head;

    for (const m of root.getChildMeshes()) {
        m.isPickable = false;
    }

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
    player.trickActive = false;
    player.trickTimer = 0;
    player.invincible = false;
    player.invincibleTimer = 0;
    player.kicking = true;
    player.kickFrames = CONFIG.KICK_DURATION;
    player.stability = CONFIG.STABILITY_MAX;
    player.wobbling = false;
    player.wobblePhase = 0;
    player.bailing = false;
    player.bailTimer = 0;
};

window.updatePlayer = function(input, terrain, dt) {
    const char = CHARACTERS[currentCharacter];
    const maxSpd = CONFIG.MAX_SPEED * char.speedMult * 0.3;
    const handling = CONFIG.TURN_SPEED * char.handlingMult * 0.15;
    const stabMult = char.stabilityMult;
    const dtScale = dt * 60;

    if (player.bailing) {
        player.bailTimer -= dtScale;
        player.speed *= (1 - 0.08 * dtScale);
        player.wobblePhase += 0.4 * dtScale;
        if (player.bailTimer <= 0) return 'bail';
        return null;
    }

    if (player.kicking) {
        player.speed += CONFIG.KICK_ACCEL * 0.03 * dtScale;
        player.kickFrames -= dtScale;
        if (player.kickFrames <= 0) player.kicking = false;
    } else {
        const slope = terrain ? terrain.hillAt(player.distance + 5) - terrain.hillAt(player.distance) : 0;
        if (input.brake) {
            player.speed -= CONFIG.BRAKE_FORCE * 0.03 * dtScale;
        } else {
            const slopeAccel = slope < -0.5 ? CONFIG.HILL_DOWN_BOOST * 0.03 : (slope > 0.5 ? -0.001 : 0);
            player.speed += (CONFIG.ACCELERATION * 0.03 + slopeAccel) * dtScale;
        }
    }

    const turning = input.left || input.right;
    if (turning) {
        player.stability += CONFIG.STABILITY_GAIN * stabMult * dtScale;
        if (player.stability > CONFIG.STABILITY_MAX) player.stability = CONFIG.STABILITY_MAX;
    } else if (player.speed > 0.3) {
        const speedFactor = Math.min(player.speed / maxSpd, 1);
        player.stability -= CONFIG.STABILITY_DECAY * (0.5 + speedFactor * 1.5) * dtScale;
        if (player.stability < 0) player.stability = 0;
    }

    player.wobbling = player.stability < CONFIG.STABILITY_WOBBLE_AT;
    player.wobblePhase += player.wobbling ? (0.15 + (1 - player.stability / CONFIG.STABILITY_WOBBLE_AT) * 0.3) * dtScale : 0;

    if (player.stability <= CONFIG.STABILITY_BAIL_AT && player.speed > 0.3) {
        player.bailing = true;
        player.bailTimer = 40;
        return null;
    }

    if (input.left) {
        player.targetLean = -1;
        player.x -= handling * dtScale;
    } else if (input.right) {
        player.targetLean = 1;
        player.x += handling * dtScale;
    } else {
        player.targetLean = 0;
    }
    player.lean += (player.targetLean - player.lean) * 0.2 * dtScale;

    if (terrain) {
        const curve = terrain.curveAt(player.distance);
        player.x += curve * player.speed * CONFIG.CURVE_PUSH * 8 * dtScale;
    }

    player.speed *= Math.pow(CONFIG.FRICTION, dtScale);
    player.speed = Math.max(0, Math.min(maxSpd, player.speed));
    player.x = Math.max(-3, Math.min(3, player.x));

    player.distance += player.speed * dtScale;
    player.score += Math.floor(player.speed * 10 * dtScale);

    if (player.trickActive) {
        player.trickTimer -= dtScale;
        if (player.trickTimer <= 0) player.trickActive = false;
    }
    if (player.invincible) {
        player.invincibleTimer -= dtScale;
        if (player.invincibleTimer <= 0) player.invincible = false;
    }

    return null;
};

window.updatePlayerMesh = function(terrain, frame) {
    if (!playerMesh) return;

    const char = CHARACTERS[currentCharacter];
    const cy = terrain ? terrain.hillAt(player.distance) : 0;

    let wobbleX = 0, wobbleZ = 0;
    if (player.wobbling && !player.bailing) {
        const str = 1 - (player.stability / CONFIG.STABILITY_WOBBLE_AT);
        wobbleX = Math.sin(player.wobblePhase * 7) * str * 0.5;
        wobbleZ = Math.cos(player.wobblePhase * 5) * str * 0.3;
    }

    playerMesh.position.x = player.x + wobbleX;
    playerMesh.position.y = cy + 0.1;
    playerMesh.position.z = 0;

    if (player.bailing) {
        const progress = 1 - (player.bailTimer / 40);
        playerMesh.rotation.z = progress * progress * 4;
        playerMesh.scaling.y = 1 - progress * 0.3;
    } else {
        playerMesh.rotation.z = player.lean * 0.15 + wobbleX * 0.1;
        playerMesh.rotation.y = player.lean * 0.1;
        playerMesh.scaling.y = 1;
    }

    if (playerMesh._armL) {
        const armSwing = Math.sin(frame * 0.1) * 0.5 * Math.min(1, player.speed * 3);
        playerMesh._armL.rotation.z = 0.3 + armSwing;
        playerMesh._armR.rotation.z = -0.3 - armSwing;
    }
};

window.performTrick = function() {
    if (!player.trickActive && player.speed > 0.3 && !player.bailing) {
        player.trickActive = true;
        player.trickTimer = 30;
        player.score += CONFIG.TRICK_POINTS * CHARACTERS[currentCharacter].trickMult;
        return true;
    }
    return false;
};

window.getPlayerScreenY = function() { return 0.8; };
