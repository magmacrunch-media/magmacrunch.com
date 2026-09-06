// ═══════════════════════════════════════════════
// Very Long Boards — Player (3D)
// Simple downhill skateboarding
// ═══════════════════════════════════════════════

window.player = {
    x: 0, speed: 0, lean: 0, targetLean: 0,
    distance: 0, score: 0, alive: true,

    // Points are banked as a float and floored only for display. Awarding
    // Math.floor(...) of a per-frame amount instead throws the remainder away
    // sixty-plus times a second, which made the score depend on the refresh
    // rate: the same ride paid ~180/s at 60 Hz and ~144/s at 144 Hz, and below
    // about 0.34 speed on a fast monitor the per-frame award floored to zero
    // and a slow start scored literally nothing.
    scoreRaw: 0,

    /** What the last trick actually paid, so the banner can report it. */
    lastTrickScore: 0,
    invincible: false, invincibleTimer: 0,
    stability: 100, wobbling: false, wobblePhase: 0,
    bailing: false, bailTimer: 0,
    groundY: 0, kicked: false,
    tricking: false, trickTimer: 0, trickCooldown: 0,

    // Derived each frame by updatePlayer and read by the audio mix and the HUD.
    // Kept here rather than recomputed by whoever needs them.
    //
    // speedFactor is how fast you are going against CONFIG.REFERENCE_SPEED - the
    // fastest pairing in the game - and NOT against your own ceiling. Everything
    // that asks "how fast is this rider going" must use it; see the note on the
    // stability drain below for what happens otherwise.
    maxSpeed: 1, speedFactor: 0, braking: false
};

window.playerMesh = null;
window.currentBoard = 'standard';

window.createPlayer = function(scene) {
    const root = new BABYLON.TransformNode('playerRoot', scene);

    const charNode = new BABYLON.TransformNode('charNode', scene);
    charNode.parent = root;
    charNode.rotation.y = Math.PI / 2;

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
    body.parent = charNode;
    body.position.y = 0.75;

    const legL = BABYLON.MeshBuilder.CreateBox('legL', { width: 0.16, height: 0.32, depth: 0.16 }, scene);
    legL.material = pantsMat;
    legL.parent = charNode;
    legL.position = new BABYLON.Vector3(-0.14, 0.35, 0);

    const legR = BABYLON.MeshBuilder.CreateBox('legR', { width: 0.16, height: 0.32, depth: 0.16 }, scene);
    legR.material = pantsMat;
    legR.parent = charNode;
    legR.position = new BABYLON.Vector3(0.14, 0.35, 0);

    const head = BABYLON.MeshBuilder.CreateBox('head', { size: 0.28 }, scene);
    head.material = skinMat;
    head.parent = charNode;
    head.position.y = 1.2;

    const hair = BABYLON.MeshBuilder.CreateBox('hair', { width: 0.3, height: 0.09, depth: 0.3 }, scene);
    hair.material = hairMat;
    hair.parent = charNode;
    hair.position.y = 1.38;

    const armL = BABYLON.MeshBuilder.CreateBox('armL', { width: 0.1, height: 0.38, depth: 0.1 }, scene);
    armL.material = skinMat;
    armL.parent = charNode;
    armL.position = new BABYLON.Vector3(-0.34, 0.82, 0);
    armL.rotation.z = 0.2;

    const armR = BABYLON.MeshBuilder.CreateBox('armR', { width: 0.1, height: 0.38, depth: 0.1 }, scene);
    armR.material = skinMat;
    armR.parent = charNode;
    armR.position = new BABYLON.Vector3(0.34, 0.82, 0);
    armR.rotation.z = -0.2;

    root._armL = armL;
    root._armR = armR;
    root._shirtMat = shirtMat;
    root._pantsMat = pantsMat;
    root._skinMat = skinMat;
    root._hairMat = hairMat;
    root._deckMat = deckMat;
    root._gripMat = gripMat;

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
    player.scoreRaw = 0;
    player.alive = true;
    player.invincible = false;
    player.invincibleTimer = 0;
    player.stability = CONFIG.STABILITY_MAX;
    player.wobbling = false;
    player.wobblePhase = 0;
    player.bailing = false;
    player.bailTimer = 0;
    player.groundY = 0;
    player.speedFactor = 0;
    player.kicked = false;
    player.tricking = false;
    player.trickTimer = 0;
    player.trickCooldown = 0;
    player.braking = false;
    player.lastTrickScore = 0;
};

window.updatePlayer = function(input, terrain, dt) {
    const char = CHARACTERS[currentCharacter];
    const board = BOARDS[currentBoard] || BOARDS['standard'];
    const speedMult = char.speedMult * board.speedMult;
    const handling = CONFIG.TURN_SPEED * char.handlingMult * board.handlingMult * 0.15;
    const stabMult = char.stabilityMult * board.stabilityMult;
    const dtScale = dt * 60;

    // SPD buys a lower drag coefficient, so a fast rider genuinely settles at a
    // higher speed instead of carrying a ceiling he never touches. The ceiling
    // is a safety rail; nothing in normal play reaches it.
    const drag = CONFIG.DRAG / speedMult;
    const maxSpd = CONFIG.SPEED_RAIL * speedMult;
    player.maxSpeed = maxSpd;

    if (player.bailing) {
        player.bailTimer -= dtScale;
        player.speed *= (1 - 0.05 * dtScale);
        player.wobblePhase += 0.3 * dtScale;
        if (player.bailTimer <= 0) return 'bail';
        return null;
    }

    if (!player.kicked) {
        if (input.trick) {
            player.kicked = true;
            player.speed = CONFIG.KICK_SPEED;
            playKickSound();
        }
        player.groundY = terrain ? terrain.hillAt(0) : 0;
        return null;
    }

    const slope = terrain ? (terrain.hillAt(player.distance + 3) - terrain.hillAt(player.distance)) / 3 : 0;
    const slopeAccel = -slope * CONFIG.SLOPE_ACCEL;
    player.speed += slopeAccel * dtScale;
    player.speed *= Math.pow(1 - drag, dtScale);

    player.braking = Boolean(input.brake);
    if (input.brake) {
        player.speed *= Math.pow(1 - CONFIG.BRAKE_DRAG, dtScale);
    }

    if (player.tricking) {
        player.trickTimer -= dtScale;
        if (player.trickTimer <= 0) {
            player.tricking = false;
        }
    }
    if (player.trickCooldown > 0) player.trickCooldown -= dtScale;

    if (input.trick && !player.tricking && player.trickCooldown <= 0 && player.speed > 0.2) {
        player.tricking = true;
        player.trickTimer = 18;
        player.trickCooldown = 30;
        const trickScore = CONFIG.TRICK_POINTS * char.trickMult * (1 + player.speed);
        player.scoreRaw += trickScore;
        player.score = Math.floor(player.scoreRaw);
        player.lastTrickScore = Math.floor(trickScore);
        return 'trick';
    }

    if (input.left) {
        player.targetLean = -1;
    } else if (input.right) {
        player.targetLean = 1;
    } else {
        player.targetLean = 0;
    }
    player.lean += (player.targetLean - player.lean) * 0.12 * dtScale;
    player.x += player.lean * handling * 0.1 * Math.min(1, player.speed * 1.5) * dtScale;

    player.speed = Math.max(0.02, Math.min(maxSpd, player.speed));
    player.x = Math.max(-3.5, Math.min(3.5, player.x));

    // Measured against the fastest pairing in the game, not against this rider's
    // own ceiling.
    //
    // This used to be speed/maxSpd, and maxSpd was scaled by the rider's SPD. A
    // faster rider therefore reached any given speed at a LOWER fraction of his
    // own ceiling, so raising SPD quietly bought stability: Party Carl on a
    // Cruiser - the pairing the cards bill as the wildest in the game, SPD 5 and
    // STAB 1 - held a line 21% LONGER than Office Carl on a Standard. Measured
    // at matched speed: 8.36 stability/second against 10.13.
    player.speedFactor = Math.min(player.speed / CONFIG.REFERENCE_SPEED, 1);

    const turning = input.left || input.right;
    if (turning) {
        player.stability += CONFIG.STABILITY_GAIN * stabMult * dtScale;
        if (player.stability > CONFIG.STABILITY_MAX) player.stability = CONFIG.STABILITY_MAX;
    } else if (player.speed > 0.3) {
        // stabMult divides the drain as well as multiplying the refill. It only
        // ever helped you recover before, so a board sold as "steady & stable"
        // was no steadier while you were actually holding a line - which is the
        // whole thing STAB is supposed to describe.
        player.stability -= CONFIG.STABILITY_DECAY * (0.2 + player.speedFactor) / stabMult * dtScale;
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
    player.scoreRaw += player.speed * 3 * dtScale;
    player.score = Math.floor(player.scoreRaw);

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
        const curve = terrain ? terrain.curveAt(player.distance) : 0;
        const curveAngle = -Math.atan(curve);
        playerMesh.rotation.z = player.lean * 0.18 + wobbleX * 0.08;
        playerMesh.rotation.y = player.lean * 0.12 + curveAngle;
        playerMesh.rotation.x = 0;
        playerMesh.scaling.y = player.tricking ? 0.85 : 1;
    }

    if (playerMesh._armL) {
        if (!player.kicked) {
            playerMesh._armL.rotation.z = 0.6;
            playerMesh._armR.rotation.z = -0.6;
        } else {
            const armSwing = Math.sin(frame * 0.1) * 0.3 * Math.min(1, player.speed * 2);
            playerMesh._armL.rotation.z = 0.2 + armSwing;
            playerMesh._armR.rotation.z = -0.2 - armSwing;
        }
    }
};

window.updatePlayerColors = function(charKey) {
    if (!playerMesh) return;
    const colors = CHARACTERS[charKey] && CHARACTERS[charKey].colors;
    if (!colors) return;
    playerMesh._shirtMat.diffuseColor = new BABYLON.Color3(colors.shirt[0], colors.shirt[1], colors.shirt[2]);
    playerMesh._hairMat.diffuseColor = new BABYLON.Color3(colors.hair[0], colors.hair[1], colors.hair[2]);
    playerMesh._skinMat.diffuseColor = new BABYLON.Color3(colors.skin[0], colors.skin[1], colors.skin[2]);
    playerMesh._pantsMat.diffuseColor = new BABYLON.Color3(colors.pants[0], colors.pants[1], colors.pants[2]);
};

window.updatePlayerBoardColor = function(boardKey) {
    if (!playerMesh) return;
    const board = BOARDS[boardKey] && BOARDS[boardKey];
    if (!board) return;
    playerMesh._deckMat.diffuseColor = new BABYLON.Color3(board.deckColor[0], board.deckColor[1], board.deckColor[2]);
    playerMesh._gripMat.diffuseColor = new BABYLON.Color3(board.gripColor[0], board.gripColor[1], board.gripColor[2]);
};
