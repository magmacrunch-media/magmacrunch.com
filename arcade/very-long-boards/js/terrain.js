// ═══════════════════════════════════════════════
// Very Long Boards — Terrain Generation
// Downhill mountain slope with curves, bumps, drops
// ═══════════════════════════════════════════════

window.createTerrain = function(scene) {
    const ROAD_W = 14;
    const GRASS_W = 40;
    const SEGS = 300;
    const SEG_LEN = 3;

    function curveAt(z) {
        return Math.sin(z * 0.004) * 0.15 +
               Math.sin(z * 0.0015) * 0.2 +
               Math.sin(z * 0.009) * 0.06;
    }

    function hillAt(z) {
        const steepBase = -z * 0.18;
        const bigWaves = Math.sin(z * 0.003) * 8 + Math.sin(z * 0.007) * 4;
        const moguls = Math.sin(z * 0.04) * 1.2 + Math.sin(z * 0.07) * 0.6;
        const drops = Math.sin(z * 0.015) > 0.85 ? -8 : 0;
        return steepBase + bigWaves + moguls + drops;
    }

    function buildRoadPaths(scrollOffset) {
        const paths = [[], []];
        for (let i = 0; i < SEGS; i++) {
            const z = i * SEG_LEN;
            const worldZ = z + scrollOffset;
            const cx = curveAt(worldZ) * z;
            const cy = hillAt(worldZ);
            const bumpX = Math.sin(worldZ * 0.1) * 0.3;
            paths[0].push(new BABYLON.Vector3(cx - ROAD_W / 2 + bumpX, cy, z));
            paths[1].push(new BABYLON.Vector3(cx + ROAD_W / 2 + bumpX, cy, z));
        }
        return paths;
    }

    function buildGrassPaths(scrollOffset, side) {
        const paths = [[], []];
        for (let i = 0; i < SEGS; i++) {
            const z = i * SEG_LEN;
            const worldZ = z + scrollOffset;
            const cx = curveAt(worldZ) * z;
            const cy = hillAt(worldZ);
            const grassDrop = -1.5;
            if (side < 0) {
                paths[0].push(new BABYLON.Vector3(cx - ROAD_W / 2 - GRASS_W, cy + grassDrop, z));
                paths[1].push(new BABYLON.Vector3(cx - ROAD_W / 2, cy, z));
            } else {
                paths[0].push(new BABYLON.Vector3(cx + ROAD_W / 2, cy, z));
                paths[1].push(new BABYLON.Vector3(cx + ROAD_W / 2 + GRASS_W, cy + grassDrop, z));
            }
        }
        return paths;
    }

    const roadMat = new BABYLON.StandardMaterial('roadMat', scene);
    roadMat.diffuseColor = new BABYLON.Color3(0.35, 0.35, 0.38);
    roadMat.specularColor = BABYLON.Color3.Black();

    const grassMat = new BABYLON.StandardMaterial('grassMat', scene);
    grassMat.diffuseColor = new BABYLON.Color3(0.22, 0.5, 0.2);
    grassMat.specularColor = BABYLON.Color3.Black();

    let scrollOffset = 0;

    const road = BABYLON.MeshBuilder.CreateRibbon('road', {
        pathArray: buildRoadPaths(0),
        updatable: true,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, scene);
    road.material = roadMat;
    road.convertToFlatShadedMesh();

    const grassL = BABYLON.MeshBuilder.CreateRibbon('grassL', {
        pathArray: buildGrassPaths(0, -1),
        updatable: true,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, scene);
    grassL.material = grassMat;
    grassL.convertToFlatShadedMesh();

    const grassR = BABYLON.MeshBuilder.CreateRibbon('grassR', {
        pathArray: buildGrassPaths(0, 1),
        updatable: true,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, scene);
    grassR.material = grassMat;
    grassR.convertToFlatShadedMesh();

    const mountains = [];
    for (let i = 0; i < 30; i++) {
        const h = 40 + Math.random() * 80;
        const d = 25 + Math.random() * 40;
        const m = BABYLON.MeshBuilder.CreateCylinder('mnt' + i, {
            diameterTop: 0,
            diameterBottom: d,
            height: h,
            tessellation: 5 + Math.floor(Math.random() * 3)
        }, scene);
        const mat = new BABYLON.StandardMaterial('mntMat' + i, scene);
        const g = 0.2 + Math.random() * 0.25;
        mat.diffuseColor = new BABYLON.Color3(g * 0.6, g, g * 0.5);
        mat.specularColor = BABYLON.Color3.Black();
        mat.freeze();
        m.material = mat;
        m.convertToFlatShadedMesh();
        m._baseX = (Math.random() > 0.5 ? 1 : -1) * (30 + Math.random() * 120);
        m._baseZ = Math.random() * 600;
        m._h = h;
        mountains.push(m);
    }

    function update(playerZ) {
        scrollOffset = playerZ;

        BABYLON.MeshBuilder.CreateRibbon('road', {
            pathArray: buildRoadPaths(scrollOffset),
            instance: road
        });
        BABYLON.MeshBuilder.CreateRibbon('grassL', {
            pathArray: buildGrassPaths(scrollOffset, -1),
            instance: grassL
        });
        BABYLON.MeshBuilder.CreateRibbon('grassR', {
            pathArray: buildGrassPaths(scrollOffset, 1),
            instance: grassR
        });

        for (const m of mountains) {
            m.position.x = m._baseX + curveAt(m._baseZ) * (m._baseZ - scrollOffset);
            m.position.y = hillAt(m._baseZ) + m._h / 2;
            m.position.z = m._baseZ - scrollOffset;
        }
    }

    return {
        update,
        curveAt,
        hillAt,
        ROAD_W,
        getScrollOffset: () => scrollOffset
    };
};
