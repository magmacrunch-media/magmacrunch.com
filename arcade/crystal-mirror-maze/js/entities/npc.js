let npcMesh;
let npcLight;
let npcPosition = { x: 0, z: 0 };
let npcScene;
let isNearNPC = false;
let currentDialogueIndex = 0;
let currentNPCType = null;
let dreamParticles = [];

function createNPC(scene, x, z, npcType) {
    npcScene = scene;
    npcPosition.x = x;
    npcPosition.z = z;
    currentNPCType = npcType;
    currentDialogueIndex = 0;

    const envMap = getCubeRenderTarget().texture;
    const npcConfig = getNPCConfig(npcType);

    const legGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8);
    const legMaterial = new THREE.MeshStandardMaterial({ color: npcConfig.colors.legs, metalness: 0.3, roughness: 0.7 });
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(x - 0.1, 0.25, z);
    leftLeg.layers.set(2);
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(x + 0.1, 0.25, z);
    rightLeg.layers.set(2);

    const shoeGeometry = new THREE.BoxGeometry(0.15, 0.05, 0.25);
    const shoeMaterial = new THREE.MeshStandardMaterial({ color: npcConfig.colors.shoes, metalness: 0.6, roughness: 0.3 });
    const leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
    leftShoe.position.set(x - 0.1, 0.025, z + 0.05);
    leftShoe.layers.set(2);
    const rightShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
    rightShoe.position.set(x + 0.1, 0.025, z + 0.05);
    rightShoe.layers.set(2);

    const bodyGeometry = new THREE.BoxGeometry(0.5, 0.7, 0.25);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: npcConfig.colors.body, metalness: 0.4, roughness: 0.6,
        envMap: envMap, envMapIntensity: 0.8
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.set(x, 0.85, z);
    body.layers.set(2);

    const armGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8);
    const armMaterial = new THREE.MeshStandardMaterial({ color: npcConfig.colors.body, metalness: 0.4, roughness: 0.6 });
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(x - 0.28, 0.95, z);
    leftArm.layers.set(2);
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(x + 0.28, 0.95, z);
    rightArm.layers.set(2);

    const handGeometry = new THREE.SphereGeometry(0.07, 8, 8);
    const handMaterial = new THREE.MeshStandardMaterial({ color: npcConfig.colors.skin, metalness: 0.1, roughness: 0.9 });
    const leftHand = new THREE.Mesh(handGeometry, handMaterial);
    leftHand.position.set(x - 0.28, 0.7, z);
    leftHand.layers.set(2);
    const rightHand = new THREE.Mesh(handGeometry, handMaterial);
    rightHand.position.set(x + 0.28, 0.7, z);
    rightHand.layers.set(2);

    const headGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ color: npcConfig.colors.skin, metalness: 0.1, roughness: 0.9 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(x, 1.45, z);
    head.layers.set(2);

    const hairGeometry = new THREE.SphereGeometry(0.21, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const hairMaterial = new THREE.MeshStandardMaterial({ color: npcConfig.colors.hair, metalness: 0.3, roughness: 0.7 });
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.set(x, 1.53, z);
    hair.layers.set(2);

    const eyeGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: npcConfig.colors.eyes });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(x - 0.08, 1.45, z + 0.18);
    leftEye.layers.set(2);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(x + 0.08, 1.45, z + 0.18);
    rightEye.layers.set(2);

    const npcGroup = new THREE.Group();
    npcGroup.add(leftLeg); npcGroup.add(rightLeg);
    npcGroup.add(leftShoe); npcGroup.add(rightShoe);
    npcGroup.add(body);
    npcGroup.add(leftArm); npcGroup.add(rightArm);
    npcGroup.add(leftHand); npcGroup.add(rightHand);
    npcGroup.add(head); npcGroup.add(hair);
    npcGroup.add(leftEye); npcGroup.add(rightEye);

    if (npcConfig.hasMirror) {
        const mirrorGeometry = new THREE.PlaneGeometry(0.8, 1.6);
        const mirrorMaterial = new THREE.MeshStandardMaterial({
            color: npcConfig.colors.mirror, transparent: true, opacity: 0.25,
            metalness: 0.95, roughness: 0.05, envMap: envMap, envMapIntensity: 2.5,
            side: THREE.DoubleSide, emissive: npcConfig.colors.mirrorEmissive, emissiveIntensity: 0.3
        });
        const mirror = new THREE.Mesh(mirrorGeometry, mirrorMaterial);
        mirror.position.set(x + 0.85, 0.8, z);
        mirror.rotation.y = Math.PI / 2;
        mirror.layers.set(2);
        npcGroup.add(mirror);
    }

    if (npcConfig.hasShadow) {
        const shadowBodyGeometry = new THREE.BoxGeometry(0.5, 0.7, 0.25);
        const shadowBodyMaterial = new THREE.MeshStandardMaterial({
            color: npcConfig.colors.shadow, transparent: true, opacity: 0.35,
            metalness: 0.7, roughness: 0.4, emissive: npcConfig.colors.shadowEmissive, emissiveIntensity: 0.4
        });
        const shadowBody = new THREE.Mesh(shadowBodyGeometry, shadowBodyMaterial);
        shadowBody.position.set(x + 1.7, 0.85, z);
        shadowBody.layers.set(2);
        npcGroup.add(shadowBody);

        const shadowHeadGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const shadowHeadMaterial = new THREE.MeshStandardMaterial({
            color: npcConfig.colors.shadowHead, transparent: true, opacity: 0.4,
            metalness: 0.6, roughness: 0.3, emissive: npcConfig.colors.shadow, emissiveIntensity: 0.5
        });
        const shadowHead = new THREE.Mesh(shadowHeadGeometry, shadowHeadMaterial);
        shadowHead.position.set(x + 1.7, 1.45, z);
        shadowHead.layers.set(2);
        npcGroup.add(shadowHead);

        if (!npcMesh) npcMesh = new THREE.Group();
        npcMesh.userData = npcMesh.userData || {};
        npcMesh.userData.shadowParts = [shadowBody, shadowHead];
    }

    npcGroup.position.set(0, 0, 0);
    npcMesh = npcGroup;
    npcMesh.userData.time = 0;

    dreamParticles = [];
    for (let i = 0; i < 5; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.02, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: npcConfig.colors.particles, transparent: true, opacity: 0.25
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.position.set(
            x + 0.5 + (Math.random() - 0.5) * 0.8,
            0.5 + Math.random() * 1.0,
            z + (Math.random() - 0.5) * 0.3
        );
        particle.userData.offset = i * 0.8;
        particle.layers.set(2);
        dreamParticles.push(particle);
        scene.add(particle);
    }
    npcMesh.userData.dreamParticles = dreamParticles;

    scene.add(npcMesh);

    npcLight = new THREE.PointLight(npcConfig.colors.light, 2.0, 4, 2.5);
    npcLight.position.set(x, 1.1, z);
    npcLight.layers.set(0);
    scene.add(npcLight);

    createDialogueUI(npcType);
}

function getNPCConfig(npcType) {
    const configs = {
        dag: {
            colors: {
                legs: 0x2c3e50, shoes: 0x34495e, body: 0x34495e, skin: 0xf4d5b5,
                hair: 0x5d4037, eyes: 0x2c3e50, light: 0x5dade2,
                mirror: 0x3498db, mirrorEmissive: 0x2980b9,
                shadow: 0x3498db, shadowEmissive: 0x2980b9, shadowHead: 0x5dade2,
                particles: 0x95a5a6
            },
            hasMirror: true, hasShadow: true
        },
        watcher: {
            colors: {
                legs: 0x1a1a2e, shoes: 0x16213e, body: 0x0f3460, skin: 0xc9a9a9,
                hair: 0x4a0000, eyes: 0xff4444, light: 0xff6666,
                mirror: false, mirrorEmissive: 0, shadow: 0, shadowEmissive: 0, shadowHead: 0,
                particles: 0xff4444
            },
            hasMirror: false, hasShadow: false
        },
        echo: {
            colors: {
                legs: 0x2d2d44, shoes: 0x222240, body: 0x444477, skin: 0xd4c4e8,
                hair: 0x9988bb, eyes: 0xc45fff, light: 0xc45fff,
                mirror: 0x9966ff, mirrorEmissive: 0x7744cc,
                shadow: 0x7744cc, shadowEmissive: 0x5522aa, shadowHead: 0x9966ff,
                particles: 0xc45fff
            },
            hasMirror: true, hasShadow: true
        }
    };
    return configs[npcType] || configs.dag;
}

function createDialogueUI(npcType) {
    let existing = document.getElementById('npcDialogue');
    if (existing) existing.remove();

    const dialogueBox = document.createElement('div');
    dialogueBox.id = 'npcDialogue';
    dialogueBox.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(20, 10, 30, 0.95);
        border: 2px solid #9966ff;
        border-radius: 10px;
        padding: 20px 30px;
        max-width: 600px;
        display: none;
        color: #ddccff;
        font-size: 18px;
        text-align: center;
        z-index: 1000;
        box-shadow: 0 0 20px rgba(153, 102, 255, 0.5);
    `;

    const speakerName = document.createElement('div');
    speakerName.id = 'speakerName';
    speakerName.style.cssText = `
        font-size: 14px;
        color: #5dade2;
        font-weight: bold;
        margin-bottom: 10px;
        text-transform: uppercase;
        letter-spacing: 2px;
    `;
    const names = { dag: 'Dag Henderson', watcher: 'The Watcher', echo: 'The Echo' };
    speakerName.textContent = names[npcType] || '???';

    const dialogueText = document.createElement('p');
    dialogueText.id = 'dialogueText';
    dialogueText.style.margin = '0 0 10px 0';

    const dialogueHint = document.createElement('p');
    dialogueHint.id = 'dialogueHint';
    dialogueHint.style.cssText = 'font-size: 14px; color: #aa88ff; margin: 10px 0 0 0;';
    dialogueHint.textContent = 'Press SPACE to continue';

    dialogueBox.appendChild(speakerName);
    dialogueBox.appendChild(dialogueText);
    dialogueBox.appendChild(dialogueHint);
    document.body.appendChild(dialogueBox);
}

function updateNPC() {
    if (!npcMesh) return;

    npcMesh.userData.time += 0.01;
    npcLight.intensity = 2.0 + Math.sin(npcMesh.userData.time * 2) * 0.4;

    if (npcMesh.userData.dreamParticles) {
        npcMesh.userData.dreamParticles.forEach((particle, i) => {
            const drift = Math.sin(npcMesh.userData.time + particle.userData.offset) * 0.08;
            particle.position.y += drift * 0.02;
            particle.material.opacity = 0.15 + Math.abs(Math.sin(npcMesh.userData.time * 0.8 + i)) * 0.2;
        });
    }

    if (npcMesh.userData.shadowParts) {
        const shadowPulse = 0.3 + Math.sin(npcMesh.userData.time * 1.5) * 0.15;
        npcMesh.userData.shadowParts.forEach(part => {
            if (part.material) part.material.opacity = shadowPulse;
        });
    }

    const playerPos = getPlayerPosition();
    const dx = playerPos.x - npcPosition.x;
    const dz = playerPos.z - npcPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    const wasNearNPC = isNearNPC;
    isNearNPC = distance < 2.5;

    const dialogueBox = document.getElementById('npcDialogue');
    if (isNearNPC && !wasNearNPC) {
        currentDialogueIndex = 0;
        showDialogue();
    } else if (!isNearNPC && wasNearNPC) {
        if (dialogueBox) dialogueBox.style.display = 'none';
    }
}

function showDialogue() {
    const dialogueBox = document.getElementById('npcDialogue');
    const dialogueText = document.getElementById('dialogueText');
    const dialogueHint = document.getElementById('dialogueHint');

    if (!currentNPCType) return;
    const dialogues = NPC_DIALOGUE[currentNPCType];
    if (!dialogues || !dialogueBox || !dialogueText) return;

    if (currentDialogueIndex >= dialogues.length) {
        dialogueBox.style.display = 'none';
        return;
    }

    dialogueText.textContent = dialogues[currentDialogueIndex];
    dialogueBox.style.display = 'block';

    const fragmentId = 'npc_' + currentNPCType + '_' + (currentDialogueIndex + 1);
    if (typeof discoverFragment === 'function') {
        discoverFragment(fragmentId);
    }

    if (dialogueHint) {
        dialogueHint.textContent = currentDialogueIndex < dialogues.length - 1
            ? 'Press SPACE to continue'
            : 'Press SPACE to close';
    }
}

function advanceDialogue() {
    if (!isNearNPC) return;
    const dialogues = currentNPCType ? NPC_DIALOGUE[currentNPCType] : [];
    currentDialogueIndex++;
    if (currentDialogueIndex >= dialogues.length) {
        const dialogueBox = document.getElementById('npcDialogue');
        if (dialogueBox) dialogueBox.style.display = 'none';
        currentDialogueIndex = 0;
    } else {
        showDialogue();
    }
}

function handleNPCInteraction(key) {
    if (key === ' ' && isNearNPC) {
        advanceDialogue();
    }
}