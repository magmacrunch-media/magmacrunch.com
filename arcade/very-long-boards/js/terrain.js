// ═══════════════════════════════════════════════
// Very Long Boards — Terrain Generation
// ═══════════════════════════════════════════════

window.createTerrain = function(scene) {
    const ROAD_W = 6;
    const GRASS_W = 30;
    const SEGS = 300;
    const SEG_LEN = 3;

    function curveAt(z) {
        return Math.sin(z * 0.003) * 0.08 +
               Math.sin(z * 0.001) * 0.12 +
               Math.sin(z * 0.007) * 0.04;
    }

    function hillAt(z) {
        return Math.sin(z * 0.005) * 6 +
               Math.sin(z * 0.012) * 2.5 +
               Math.sin(z * 0.002) * 10 -
               z * 0.02;
    }

    function buildRoadPaths(scrollOffset) {
        const paths = [[], []];
        for (let i = 0; i < SEGS; i++) {
            const z = i * SEG_LEN;
            const worldZ = z + scrollOffset;
            const cx = curveAt(worldZ) * z;
            const cy = hillAt(worldZ);
            paths[0].push(new BABYLON.Vector3(cx - ROAD_W / 2, cy, z));
            paths[1].push(new BABYLON.Vector3(cx + ROAD_W / 2, cy, z));
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
            if (side < 0) {
                paths[0].push(new BABYLON.Vector3(cx - ROAD_W / 2 - GRASS_W, cy - 0.1, z));
                paths[1].push(new BABYLON.Vector3(cx - ROAD_W / 2, cy, z));
            } else {
                paths[0].push(new BABYLON.Vector3(cx + ROAD_W / 2, cy, z));
                paths[1].push(new BABYLON.Vector3(cx + ROAD_W / 2 + GRASS_W, cy - 0.1, z));
            }
        }
        return paths;
    }

    const roadMat = new BABYLON.StandardMaterial('roadMat', scene);
    roadMat.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.42);
    roadMat.specularColor = BABYLON.Color3.Black();

    const grassMat = new BABYLON.StandardMaterial('grassMat', scene);
    grassMat.diffuseColor = new BABYLON.Color3(0.18, 0.42, 0.16);
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
    for (let i = 0; i < 20; i++) {
        const h = 30 + Math.random() * 50;
        const d = 20 + Math.random() * 30;
        const m = BABYLON.MeshBuilder.CreateCylinder('mnt' + i, {
            diameterTop: 0,
            diameterBottom: d,
            height: h,
            tessellation: 5 + Math.floor(Math.random() * 3)
        }, scene);
        const mat = new BABYLON.StandardMaterial('mntMat' + i, scene);
        const g = 0.25 + Math.random() * 0.2;
        mat.diffuseColor = new BABYLON.Color3(g * 0.7, g, g * 0.6);
        mat.specularColor = BABYLON.Color3.Black();
        mat.freeze();
        m.material = mat;
        m.convertToFlatShadedMesh();
        m.position.y = h / 2 - 10;
        m._baseX = (Math.random() - 0.5) * 300;
        m._baseZ = Math.random() * 500;
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
            m.position.x = m._baseX;
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
