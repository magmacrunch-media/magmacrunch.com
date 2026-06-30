// ═══════════════════════════════════════════════
// Very Long Boards — Scenery
// New Hampshire forest — pine trees, few houses
// ═══════════════════════════════════════════════

window.sceneryItems = [];
let scnMaxZ = 0;
let trunkMat, pineMats, leafMat, roofMat, wallMat, winMat;

window.createScenery = function(scene) {
    trunkMat = new BABYLON.StandardMaterial('trunkMat', scene);
    trunkMat.diffuseColor = new BABYLON.Color3(0.35, 0.22, 0.12);
    trunkMat.specularColor = BABYLON.Color3.Black();
    trunkMat.freeze();

    pineMats = [
        (() => { const m = new BABYLON.StandardMaterial('pine0', scene); m.diffuseColor = new BABYLON.Color3(0.12, 0.3, 0.12); m.specularColor = BABYLON.Color3.Black(); m.freeze(); return m; })(),
        (() => { const m = new BABYLON.StandardMaterial('pine1', scene); m.diffuseColor = new BABYLON.Color3(0.15, 0.35, 0.13); m.specularColor = BABYLON.Color3.Black(); m.freeze(); return m; })(),
        (() => { const m = new BABYLON.StandardMaterial('pine2', scene); m.diffuseColor = new BABYLON.Color3(0.1, 0.28, 0.1); m.specularColor = BABYLON.Color3.Black(); m.freeze(); return m; })()
    ];

    leafMat = new BABYLON.StandardMaterial('leafMat', scene);
    leafMat.diffuseColor = new BABYLON.Color3(0.3, 0.5, 0.2);
    leafMat.specularColor = BABYLON.Color3.Black();
    leafMat.freeze();

    roofMat = new BABYLON.StandardMaterial('roofMat', scene);
    roofMat.diffuseColor = new BABYLON.Color3(0.45, 0.12, 0.1);
    roofMat.specularColor = BABYLON.Color3.Black();
    roofMat.freeze();

    wallMat = new BABYLON.StandardMaterial('wallMat', scene);
    wallMat.diffuseColor = new BABYLON.Color3(0.85, 0.82, 0.72);
    wallMat.specularColor = BABYLON.Color3.Black();
    wallMat.freeze();

    winMat = new BABYLON.StandardMaterial('winMat', scene);
    winMat.diffuseColor = new BABYLON.Color3(0.7, 0.8, 0.85);
    winMat.emissiveColor = new BABYLON.Color3(0.15, 0.12, 0.08);
    winMat.specularColor = BABYLON.Color3.Black();
    winMat.freeze();
};

function spawnPine(z, scene) {
    const offset = (Math.random() > 0.5 ? 1 : -1) * (5.5 + Math.random() * 4);
    const h = 3 + Math.random() * 4;
    const item = { z, offset, type: 'pine', mesh: null };

    const root = new BABYLON.TransformNode('pine', scene);

    const trunk = BABYLON.MeshBuilder.CreateCylinder('trunk', {
        height: h * 0.5,
        diameterTop: 0.08,
        diameterBottom: 0.15,
        tessellation: 5
    }, scene);
    trunk.material = trunkMat;
    trunk.parent = root;
    trunk.position.y = h * 0.25;

    const layers = 3 + Math.floor(Math.random() * 2);
    const pineMat = pineMats[Math.floor(Math.random() * pineMats.length)];
    for (let i = 0; i < layers; i++) {
        const t = i / layers;
        const layerH = h * 0.25;
        const layerD = (1 - t * 0.6) * h * 0.45;
        const foliage = BABYLON.MeshBuilder.CreateCylinder('foliage' + i, {
            diameterTop: 0,
            diameterBottom: layerD,
            height: layerH,
            tessellation: 6
        }, scene);
        foliage.material = pineMat;
        foliage.parent = root;
        foliage.position.y = h * 0.35 + i * layerH * 0.7;
    }

    for (const m of root.getChildMeshes()) m.isPickable = false;

    item.mesh = root;
    sceneryItems.push(item);
    scnMaxZ = z;
}

function spawnDeciduous(z, scene) {
    const offset = (Math.random() > 0.5 ? 1 : -1) * (6 + Math.random() * 5);
    const h = 4 + Math.random() * 3;
    const item = { z, offset, type: 'tree', mesh: null };

    const root = new BABYLON.TransformNode('tree', scene);

    const trunk = BABYLON.MeshBuilder.CreateCylinder('trunk', {
        height: h * 0.55,
        diameter: 0.18,
        tessellation: 5
    }, scene);
    trunk.material = trunkMat;
    trunk.parent = root;
    trunk.position.y = h * 0.28;

    const foliage = BABYLON.MeshBuilder.CreateSphere('foliage', {
        diameter: h * 0.5,
        segments: 4
    }, scene);
    foliage.material = leafMat;
    foliage.parent = root;
    foliage.position.y = h * 0.7;

    for (const m of root.getChildMeshes()) m.isPickable = false;

    item.mesh = root;
    sceneryItems.push(item);
    scnMaxZ = z;
}

function spawnHouse(z, scene) {
    const offset = (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 6);
    const item = { z, offset, type: 'house', mesh: null };

    const root = new BABYLON.TransformNode('house', scene);

    const walls = BABYLON.MeshBuilder.CreateBox('walls', { width: 2.5, height: 1.4, depth: 2 }, scene);
    walls.material = wallMat;
    walls.parent = root;
    walls.position.y = 0.7;

    const roof = BABYLON.MeshBuilder.CreateCylinder('roof', {
        diameterTop: 0,
        diameterBottom: 3.5,
        height: 1.0,
        tessellation: 4
    }, scene);
    roof.material = roofMat;
    roof.parent = root;
    roof.position.y = 1.9;
    roof.rotation.y = Math.PI / 4;

    const win = BABYLON.MeshBuilder.CreateBox('win', { width: 0.35, height: 0.3, depth: 0.05 }, scene);
    win.material = winMat;
    win.parent = root;
    win.position = new BABYLON.Vector3(0, 0.85, 1.01);

    const door = BABYLON.MeshBuilder.CreateBox('door', { width: 0.4, height: 0.7, depth: 0.05 }, scene);
    const doorMat = new BABYLON.StandardMaterial('doorMat', scene);
    doorMat.diffuseColor = new BABYLON.Color3(0.4, 0.25, 0.12);
    doorMat.specularColor = BABYLON.Color3.Black();
    door.material = doorMat;
    door.parent = root;
    door.position = new BABYLON.Vector3(-0.6, 0.45, 1.01);

    for (const m of root.getChildMeshes()) m.isPickable = false;

    item.mesh = root;
    sceneryItems.push(item);
    scnMaxZ = z;
}

window.initScenery = function(scene) {
    for (const s of sceneryItems) { if (s.mesh) s.mesh.dispose(); }
    sceneryItems.length = 0;
    scnMaxZ = 0;
    for (let z = 8; z < 300; z += 3 + Math.random() * 6) {
        const r = Math.random();
        if (r < 0.7) spawnPine(z, scene);
        else if (r < 0.9) spawnDeciduous(z, scene);
        else spawnHouse(z, scene);
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
        const z = scnMaxZ + 3 + Math.random() * 6;
        const r = Math.random();
        if (r < 0.7) spawnPine(z, scene);
        else if (r < 0.9) spawnDeciduous(z, scene);
        else spawnHouse(z, scene);
    }
};

window.updateSceneryPositions = function(terrain, scrollOffset) {
    for (const item of sceneryItems) {
        if (!item.mesh) continue;
        const relZ = item.z - scrollOffset;
        const curve = terrain.curveAt(item.z);
        const cx = curve * relZ;
        item.mesh.position.x = item.offset + cx;
        item.mesh.position.y = terrain.hillAt(item.z);
        item.mesh.position.z = relZ;
    }
};
