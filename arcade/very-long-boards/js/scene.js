// ═══════════════════════════════════════════════
// Very Long Boards — Babylon.js Scene Setup
// ═══════════════════════════════════════════════

window.createScene = function(canvas) {
    const engine = new BABYLON.Engine(canvas, true);
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.68, 0.85, 0.95, 1);

    const camera = new BABYLON.FreeCamera('cam', new BABYLON.Vector3(0, 8, -12), scene);
    camera.fov = 1.0;
    camera.minZ = 0.5;
    camera.maxZ = 800;

    const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-0.3, -0.8, 0.5), scene);
    sun.intensity = 1.1;
    sun.diffuse = new BABYLON.Color3(1.0, 0.95, 0.85);

    const ambient = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0, 1, 0), scene);
    ambient.intensity = 0.5;
    ambient.diffuse = new BABYLON.Color3(0.9, 0.9, 1.0);
    ambient.groundColor = new BABYLON.Color3(0.4, 0.5, 0.3);

    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.003;
    scene.fogColor = new BABYLON.Color3(0.68, 0.85, 0.95);

    const skyTex = new BABYLON.DynamicTexture('skyTex', { width: 1, height: 64 }, scene);
    const skyCtx = skyTex.getContext();
    const grad = skyCtx.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, '#a8d4f0');
    grad.addColorStop(0.5, '#c8e4f8');
    grad.addColorStop(1, '#f8f4e8');
    skyCtx.fillStyle = grad;
    skyCtx.fillRect(0, 0, 1, 64);
    skyTex.update();

    const sky = BABYLON.MeshBuilder.CreatePlane('sky', { width: 800, height: 200 }, scene);
    const skyMat = new BABYLON.StandardMaterial('skyMat', scene);
    skyMat.diffuseTexture = skyTex;
    skyMat.emissiveTexture = skyTex;
    skyMat.disableLighting = true;
    skyMat.backFaceCulling = false;
    sky.material = skyMat;
    sky.position = new BABYLON.Vector3(0, 70, 300);
    sky.isPickable = false;

    const whiteTex = new BABYLON.DynamicTexture('particleTex', { width: 4, height: 4 }, scene);
    const ptCtx = whiteTex.getContext();
    ptCtx.fillStyle = '#ffffff';
    ptCtx.fillRect(0, 0, 4, 4);
    whiteTex.update();

    function updateCamera(playerMesh, slope, roadCurve) {
        const pPos = playerMesh.position;
        const slopeFactor = Math.max(0, Math.min(1, -slope / 5));
        const camHeight = 7 + slopeFactor * 4;
        const camDist = 12 + slopeFactor * 4;

        camera.position.x += (pPos.x - camera.position.x) * 0.1;
        camera.position.y += (pPos.y + camHeight - camera.position.y) * 0.1;
        camera.position.z += (pPos.z - camDist - camera.position.z) * 0.1;

        const lookAhead = 15;
        const lookCurve = roadCurve * 30;
        camera.setTarget(new BABYLON.Vector3(
            pPos.x + lookCurve,
            pPos.y - 1,
            pPos.z + lookAhead
        ));
    }

    function updateSky(playerMesh) {
        sky.position.x = playerMesh.position.x;
        sky.position.z = playerMesh.position.z + 300;
    }

    return { engine, scene, camera, sun, ambient, whiteTex, updateCamera, updateSky };
};
