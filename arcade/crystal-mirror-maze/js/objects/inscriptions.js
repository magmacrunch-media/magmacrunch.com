const INSCRIPTION_GLOW_COLOR = 0xc45fff;
const INSCRIPTION_GLOW_INTENSITY = 3.0;
const INSCRIPTION_GLOW_DISTANCE = 8;
const INSCRIPTION_REVEAL_DISTANCE = 3.5;

let inscriptionMeshes = [];
let inscriptionData = [];
let inscriptionScene;

function createInscriptions(scene) {
    inscriptionScene = scene;
    inscriptionMeshes = [];
    inscriptionData = [];
    const envMap = getCubeRenderTarget().texture;
    const room = getCurrentRoom();
    const roomInscriptions = ROOM_INSCRIPTIONS[room] || [];

    roomInscriptions.forEach(insc => {
        if (hasFragment(insc.fragmentId)) return;

        const fragment = LORE_FRAGMENTS.find(f => f.id === insc.fragmentId);
        if (!fragment) return;

        const light = new THREE.PointLight(
            INSCRIPTION_GLOW_COLOR,
            INSCRIPTION_GLOW_INTENSITY,
            INSCRIPTION_GLOW_DISTANCE,
            2.0
        );
        light.position.set(insc.x, 1.8, insc.z);
        light.layers.set(0);
        scene.add(light);

        const glowSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 8, 8),
            new THREE.MeshBasicMaterial({
                color: INSCRIPTION_GLOW_COLOR,
                transparent: true,
                opacity: 0.6
            })
        );
        glowSphere.position.set(insc.x, 1.8, insc.z);
        glowSphere.layers.set(2);
        scene.add(glowSphere);

        inscriptionMeshes.push({ light, glowSphere, x: insc.x, z: insc.z, fragmentId: insc.fragmentId, revealed: false });
        inscriptionData.push(insc);
    });
}

function updateInscriptions() {
    const playerPos = getPlayerPosition();

    inscriptionMeshes.forEach(insc => {
        if (hasFragment(insc.fragmentId)) {
            insc.glowSphere.material.opacity = 0.1;
            insc.light.intensity = 0.3;
            return;
        }

        const dx = playerPos.x - insc.x;
        const dz = playerPos.z - insc.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < INSCRIPTION_REVEAL_DISTANCE && !insc.revealed) {
            insc.revealed = true;
            discoverFragment(insc.fragmentId);
        }

        if (dist < 5) {
            const pulse = 0.6 + Math.sin(Date.now() * 0.003) * 0.3;
            insc.glowSphere.material.opacity = pulse;
            insc.light.intensity = INSCRIPTION_GLOW_INTENSITY * (0.6 + Math.sin(Date.now() * 0.002) * 0.4);
        } else {
            insc.glowSphere.material.opacity = 0.25;
            insc.light.intensity = INSCRIPTION_GLOW_INTENSITY * 0.4;
        }
    });
}

function clearInscriptions() {
    if (!inscriptionScene) return;
    inscriptionMeshes.forEach(insc => {
        if (insc.light.parent) inscriptionScene.remove(insc.light);
        if (insc.glowSphere.parent) inscriptionScene.remove(insc.glowSphere);
    });
    inscriptionMeshes = [];
    inscriptionData = [];
}