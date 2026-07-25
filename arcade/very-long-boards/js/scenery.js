// ═══════════════════════════════════════════════
// Very Long Boards — Scenery (trees only)
// ═══════════════════════════════════════════════

window.sceneryItems = [];
let scnMaxZ = 0;
let trunkMat, pineMat;

window.createScenery = function(scene) {
    trunkMat = new BABYLON.StandardMaterial('trunkMat', scene);
    trunkMat.diffuseColor = new BABYLON.Color3(0.35, 0.22, 0.12);
    trunkMat.specularColor = BABYLON.Color3.Black();
    trunkMat.freeze();

    pineMat = new BABYLON.StandardMaterial('pineMat', scene);
    pineMat.diffuseColor = new BABYLON.Color3(0.14, 0.32, 0.12);
    pineMat.specularColor = BABYLON.Color3.Black();
    pineMat.freeze();
};

function spawnTree(z, scene) {
    const side = Math.random() > 0.5 ? 1 : -1;
    const offset = side * (7 + Math.random() * 10);
    const h = 4 + Math.random() * 5;
    const item = { z, offset, mesh: null };

    const root = new BABYLON.TransformNode('tree', scene);

    const trunk = BABYLON.MeshBuilder.CreateCylinder('trunk', {
        height: h * 0.45, diameterTop: 0.08, diameterBottom: 0.18, tessellation: 5
    }, scene);
    trunk.material = trunkMat;
    trunk.parent = root;
    trunk.position.y = h * 0.22;

    const layers = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < layers; i++) {
        const t = i / layers;
        const layerH = h * 0.22;
        const layerD = (1 - t * 0.5) * h * 0.4;
        const foliage = BABYLON.MeshBuilder.CreateCylinder('f' + i, {
            diameterTop: 0, diameterBottom: layerD, height: layerH, tessellation: 6
        }, scene);
        foliage.material = pineMat;
        foliage.parent = root;
        foliage.position.y = h * 0.35 + i * layerH * 0.65;
    }

    for (const m of root.getChildMeshes()) m.isPickable = false;

    item.mesh = root;
    sceneryItems.push(item);
    scnMaxZ = z;
}

window.initScenery = function(scene) {
    for (const s of sceneryItems) { if (s.mesh) s.mesh.dispose(); }
    sceneryItems.length = 0;
    scnMaxZ = 0;
    for (let z = -50; z < 300; z += 5 + Math.random() * 8) {
        spawnTree(z, scene);
    }
};

window.updateScenery = function(scene) {
    for (let i = sceneryItems.length - 1; i >= 0; i--) {
        if (sceneryItems[i].z < player.distance - 40) {
            if (sceneryItems[i].mesh) sceneryItems[i].mesh.dispose();
            sceneryItems.splice(i, 1);
        }
    }
    while (scnMaxZ < player.distance + 200) {
        const z = scnMaxZ + 5 + Math.random() * 8;
        spawnTree(z, scene);
    }
};

window.updateSceneryPositions = function(terrain, scrollOffset) {
    for (const item of sceneryItems) {
        if (!item.mesh) continue;
        const relZ = item.z - scrollOffset;
        const cx = terrain.curveAt(item.z) * relZ;
        item.mesh.position.x = item.offset + cx;
        item.mesh.position.y = terrain.hillAt(item.z) - 0.3;
        item.mesh.position.z = relZ;
    }
};
