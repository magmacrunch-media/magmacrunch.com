// ═══════════════════════════════════════════════
// Very Long Boards — Terrain
// Road + ground as synchronized ribbons
// ═══════════════════════════════════════════════

window.createTerrain = function(scene) {
    const ROAD_W = 8;
    const GROUND_W = 200;
    const SEGS = 300;
    const BACK = 50;
    const SEG_LEN = 3;

    function curveAt(z) {
        return Math.sin(z * 0.003) * 0.12 +
               Math.sin(z * 0.0012) * 0.18 +
               Math.sin(z * 0.008) * 0.04;
    }

    // The constant descent comes from CONFIG.GRADE, which is also what the
    // terminal speeds in config.js are derived from - so the road and the
    // physics cannot disagree about how steep this hill is.
    function hillAt(z) {
        return -z * CONFIG.GRADE +
               Math.sin(z * 0.004) * 4 +
               Math.sin(z * 0.01) * 1.5;
    }

    function buildRoadPaths(scrollOffset) {
        const left = [], right = [];
        for (let i = 0; i < SEGS; i++) {
            const localZ = (i - BACK) * SEG_LEN;
            const worldZ = localZ + scrollOffset;
            const cx = curveAt(worldZ) * localZ;
            const cy = hillAt(worldZ);
            left.push(new BABYLON.Vector3(cx - ROAD_W / 2, cy, localZ));
            right.push(new BABYLON.Vector3(cx + ROAD_W / 2, cy, localZ));
        }
        return [left, right];
    }

    function buildGroundPaths(scrollOffset) {
        const left = [], right = [];
        for (let i = 0; i < SEGS; i++) {
            const localZ = (i - BACK) * SEG_LEN;
            const worldZ = localZ + scrollOffset;
            const cx = curveAt(worldZ) * localZ;
            const cy = hillAt(worldZ) - 0.3;
            left.push(new BABYLON.Vector3(cx - GROUND_W / 2, cy, localZ));
            right.push(new BABYLON.Vector3(cx + GROUND_W / 2, cy, localZ));
        }
        return [left, right];
    }

    const roadMat = new BABYLON.StandardMaterial('roadMat', scene);
    roadMat.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.42);
    roadMat.specularColor = BABYLON.Color3.Black();

    const groundMat = new BABYLON.StandardMaterial('groundMat', scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.22, 0.48, 0.16);
    groundMat.specularColor = BABYLON.Color3.Black();

    let scrollOffset = 0;

    const ground = BABYLON.MeshBuilder.CreateRibbon('ground', {
        pathArray: buildGroundPaths(0),
        updatable: true,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, scene);
    ground.material = groundMat;

    const road = BABYLON.MeshBuilder.CreateRibbon('road', {
        pathArray: buildRoadPaths(0),
        updatable: true,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, scene);
    road.material = roadMat;

    const mountains = [];
    for (let i = 0; i < 20; i++) {
        const h = 50 + Math.random() * 100;
        const d = 30 + Math.random() * 50;
        const m = BABYLON.MeshBuilder.CreateCylinder('mnt' + i, {
            diameterTop: 0, diameterBottom: d, height: h,
            tessellation: 5 + Math.floor(Math.random() * 3)
        }, scene);
        const mat = new BABYLON.StandardMaterial('mntMat' + i, scene);
        const g = 0.2 + Math.random() * 0.2;
        mat.diffuseColor = new BABYLON.Color3(g * 0.5, g * 0.9, g * 0.4);
        mat.specularColor = BABYLON.Color3.Black();
        mat.freeze();
        m.material = mat;
        m._baseX = (Math.random() > 0.5 ? 1 : -1) * (40 + Math.random() * 150);
        m._baseZ = Math.random() * 500;
        m._h = h;
        mountains.push(m);
    }

    function update(playerZ) {
        scrollOffset = playerZ;

        BABYLON.MeshBuilder.CreateRibbon('ground', {
            pathArray: buildGroundPaths(scrollOffset),
            instance: ground
        });
        BABYLON.MeshBuilder.CreateRibbon('road', {
            pathArray: buildRoadPaths(scrollOffset),
            instance: road
        });

        for (const m of mountains) {
            m.position.x = m._baseX + curveAt(m._baseZ) * (m._baseZ - scrollOffset);
            m.position.y = hillAt(m._baseZ) + m._h / 2;
            m.position.z = m._baseZ - scrollOffset;
        }
    }

    return {
        update, curveAt, hillAt, ROAD_W,
        getScrollOffset: () => scrollOffset
    };
};
