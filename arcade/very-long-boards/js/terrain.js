// ═══════════════════════════════════════════════
// Very Long Boards — Terrain Generation
// New Hampshire forest road — gentle downhill
// ═══════════════════════════════════════════════

window.createTerrain = function(scene) {
    const ROAD_W = 8;
    const SHOULDER_W = 3;
    const GRASS_W = 25;
    const SEGS = 300;
    const SEG_LEN = 3;

    function curveAt(z) {
        return Math.sin(z * 0.003) * 0.12 +
               Math.sin(z * 0.0012) * 0.18 +
               Math.sin(z * 0.008) * 0.04;
    }

    function hillAt(z) {
        return -z * 0.06 +
               Math.sin(z * 0.004) * 4 +
               Math.sin(z * 0.01) * 1.5;
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

    function buildShoulderPaths(scrollOffset, side) {
        const paths = [[], []];
        for (let i = 0; i < SEGS; i++) {
            const z = i * SEG_LEN;
            const worldZ = z + scrollOffset;
            const cx = curveAt(worldZ) * z;
            const cy = hillAt(worldZ);
            const dy = -0.15;
            if (side < 0) {
                paths[0].push(new BABYLON.Vector3(cx - ROAD_W / 2 - SHOULDER_W, cy + dy, z));
                paths[1].push(new BABYLON.Vector3(cx - ROAD_W / 2, cy, z));
            } else {
                paths[0].push(new BABYLON.Vector3(cx + ROAD_W / 2, cy, z));
                paths[1].push(new BABYLON.Vector3(cx + ROAD_W / 2 + SHOULDER_W, cy + dy, z));
            }
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
            const edgeY = -0.15;
            const farY = -1.0;
            if (side < 0) {
                paths[0].push(new BABYLON.Vector3(cx - ROAD_W / 2 - SHOULDER_W - GRASS_W, cy + farY, z));
                paths[1].push(new BABYLON.Vector3(cx - ROAD_W / 2 - SHOULDER_W, cy + edgeY, z));
            } else {
                paths[0].push(new BABYLON.Vector3(cx + ROAD_W / 2 + SHOULDER_W, cy + edgeY, z));
                paths[1].push(new BABYLON.Vector3(cx + ROAD_W / 2 + SHOULDER_W + GRASS_W, cy + farY, z));
            }
        }
        return paths;
    }

    const roadMat = new BABYLON.StandardMaterial('roadMat', scene);
    roadMat.diffuseColor = new BABYLON.Color3(0.22, 0.22, 0.24);
    roadMat.specularColor = BABYLON.Color3.Black();

    const shoulderMat = new BABYLON.StandardMaterial('shoulderMat', scene);
    shoulderMat.diffuseColor = new BABYLON.Color3(0.42, 0.35, 0.25);
    shoulderMat.specularColor = BABYLON.Color3.Black();

    const grassMat = new BABYLON.StandardMaterial('grassMat', scene);
    grassMat.diffuseColor = new BABYLON.Color3(0.18, 0.42, 0.12);
    grassMat.specularColor = BABYLON.Color3.Black();

    let scrollOffset = 0;

    const road = BABYLON.MeshBuilder.CreateRibbon('road', {
        pathArray: buildRoadPaths(0),
        updatable: true,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, scene);
    road.material = roadMat;
    road.convertToFlatShadedMesh();

    const shoulderL = BABYLON.MeshBuilder.CreateRibbon('shoulderL', {
        pathArray: buildShoulderPaths(0, -1),
        updatable: true,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, scene);
    shoulderL.material = shoulderMat;

    const shoulderR = BABYLON.MeshBuilder.CreateRibbon('shoulderR', {
        pathArray: buildShoulderPaths(0, 1),
        updatable: true,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, scene);
    shoulderR.material = shoulderMat;

    const grassL = BABYLON.MeshBuilder.CreateRibbon('grassL', {
        pathArray: buildGrassPaths(0, -1),
        updatable: true,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, scene);
    grassL.material = grassMat;

    const grassR = BABYLON.MeshBuilder.CreateRibbon('grassR', {
        pathArray: buildGrassPaths(0, 1),
        updatable: true,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, scene);
    grassR.material = grassMat;

    const mountains = [];
    for (let i = 0; i < 25; i++) {
        const h = 50 + Math.random() * 100;
        const d = 30 + Math.random() * 50;
        const m = BABYLON.MeshBuilder.CreateCylinder('mnt' + i, {
            diameterTop: 0,
            diameterBottom: d,
            height: h,
            tessellation: 5 + Math.floor(Math.random() * 3)
        }, scene);
        const mat = new BABYLON.StandardMaterial('mntMat' + i, scene);
        const g = 0.2 + Math.random() * 0.2;
        mat.diffuseColor = new BABYLON.Color3(g * 0.5, g * 0.9, g * 0.4);
        mat.specularColor = BABYLON.Color3.Black();
        mat.freeze();
        m.material = mat;
        m.convertToFlatShadedMesh();
        m._baseX = (Math.random() > 0.5 ? 1 : -1) * (40 + Math.random() * 150);
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
        BABYLON.MeshBuilder.CreateRibbon('shoulderL', {
            pathArray: buildShoulderPaths(scrollOffset, -1),
            instance: shoulderL
        });
        BABYLON.MeshBuilder.CreateRibbon('shoulderR', {
            pathArray: buildShoulderPaths(scrollOffset, 1),
            instance: shoulderR
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
