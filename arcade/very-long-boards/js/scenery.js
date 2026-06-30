// ═══════════════════════════════════════════════
// Very Long Boards — Scenery (3D Trees & Houses)
// ═══════════════════════════════════════════════

window.sceneryItems = [];
let scnMaxZ = 0;
let trunkMat, foliageMats, roofMat;

window.createScenery = function(scene) {
    trunkMat = new BABYLON.StandardMaterial('trunkMat', scene);
    trunkMat.diffuseColor = new BABYLON.Color3(0.36, 0.25, 0.16);
    trunkMat.specularColor = BABYLON.Color3.Black();
    trunkMat.freeze();

    foliageMats = [
        new BABYLON.Color3(0.23, 0.55, 0.29),
        new BABYLON.Color3(0.32, 0.66, 0.37),
        new BABYLON.Color3(0.29, 0.62, 0.25)
    ].map((c, i) => {
        const m = new BABYLON.StandardMaterial('foliage' + i, scene);
        m.diffuseColor = c;
        m.specularColor = BABYLON.Color3.Black();
        m.freeze();
        return m;
    });

    roofMat = new BABYLON.StandardMaterial('roofMat', scene);
    roofMat.diffuseColor = new BABYLON.Color3(0.55, 0.1, 0.1);
    roofMat.specularColor = BABYLON.Color3.Black();
    roofMat.freeze();
};

function spawnTree(z, scene) {
    const offset = (Math.random() > 0.5 ? 1 : -1) * (4 + Math.random() * 5);
    const isPine = Math.random() < 0.45;
    const h = 1.5 + Math.random() * 2;
    const item = { z, offset, type: 'tree', isPine, h, mesh: null };

    const root = new BABYLON.TransformNode('tree', scene);

    const trunk = BABYLON.MeshBuilder.CreateCylinder('trunk', { height: h * 0.5, diameter: 0.15, tessellation: 5 }, scene);
    trunk.material = trunkMat;
    trunk.parent = root;
    trunk.position.y = h * 0.25;

    if (isPine) {
        const foliage = BABYLON.MeshBuilder.CreateCylinder('foliage', { diameterTop: 0, diameterBottom: h * 0.5, height: h * 0.7, tessellation: 5 }, scene);
        foliage.material = foliageMats[Math.floor(Math.random() * foliageMats.length)];
        foliage.parent = root;
        foliage.position.y = h * 0.6;
    } else {
        const foliage = BABYLON.MeshBuilder.CreateSphere('foliage', { diameter: h * 0.55, segments: 4 }, scene);
        foliage.material = foliageMats[Math.floor(Math.random() * foliageMats.length)];
        foliage.parent = root;
        foliage.position.y = h * 0.7;
    }

    for (const m of root.getChildMeshes()) {
        m.isPickable = false;
    }

    item.mesh = root;
    item._meshY = 0;
    sceneryItems.push(item);
    scnMaxZ = z;
}

function spawnHouse(z, scene) {
    const offset = (Math.random() > 0.5 ? 1 : -1) * (6 + Math.random() * 4);
    const item = { z, offset, type: 'house', mesh: null };

    const root = new BABYLON.TransformNode('house', scene);
    const houseColors = [[0.55, 0.45, 0.33], [0.63, 0.32, 0.18], [0.8, 0.52, 0.25]];
    const c = houseColors[Math.floor(Math.random() * houseColors.length)];
    const wallMat = new BABYLON.StandardMaterial('wall', scene);
    wallMat.diffuseColor = new BABYLON.Color3(c[0], c[1], c[2]);
    wallMat.specularColor = BABYLON.Color3.Black();

    const walls = BABYLON.MeshBuilder.CreateBox('walls', { width: 1.5, height: 1, depth: 1 }, scene);
    walls.material = wallMat;
    walls.parent = root;
    walls.position.y = 0.5;

    const roof = BABYLON.MeshBuilder.CreateCylinder('roof', { diameterTop: 0, diameterBottom: 2.2, height: 0.8, tessellation: 4 }, scene);
    roof.material = roofMat;
    roof.parent = root;
    roof.position.y = 1.4;
    roof.rotation.y = Math.PI / 4;

    const winMat = new BABYLON.StandardMaterial('win', scene);
    winMat.diffuseColor = new BABYLON.Color3(0.96, 0.9, 0.55);
    winMat.emissiveColor = new BABYLON.Color3(0.3, 0.25, 0.1);
    winMat.specularColor = BABYLON.Color3.Black();

    const win = BABYLON.MeshBuilder.CreateBox('win', { width: 0.2, height: 0.2, depth: 0.05 }, scene);
    win.material = winMat;
    win.parent = root;
    win.position = new BABYLON.Vector3(0, 0.6, 0.52);

    for (const m of root.getChildMeshes()) m.isPickable = false;

    item.mesh = root;
    sceneryItems.push(item);
    scnMaxZ = z;
}

window.initScenery = function(scene) {
    for (const s of sceneryItems) { if (s.mesh) s.mesh.dispose(); }
    sceneryItems.length = 0;
    scnMaxZ = 0;
    for (let z = 10; z < 300; z += 8 + Math.random() * 15) {
        Math.random() < 0.65 ? spawnTree(z, scene) : spawnHouse(z, scene);
    }
};

window.updateScenery = function(scene) {
    for (let i = sceneryItems.length - 1; i >= 0; i--) {
        if (sceneryItems[i].z < player.distance - 50) {
            if (sceneryItems[i].mesh) sceneryItems[i].mesh.dispose();
            sceneryItems.splice(i, 1);
        }
    }
    while (scnMaxZ < player.distance + 200) {
        const z = scnMaxZ + 8 + Math.random() * 15;
        Math.random() < 0.65 ? spawnTree(z, scene) : spawnHouse(z, scene);
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
