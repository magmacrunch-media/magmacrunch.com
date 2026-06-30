// ═══════════════════════════════════════════════
// Very Long Boards — Babylon.js Scene Setup
// ═══════════════════════════════════════════════

window.createScene = function(canvas) {
    const engine = new BABYLON.Engine(canvas, true);
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.58, 0.78, 0.92, 1);

    const camera = new BABYLON.FreeCamera('cam', new BABYLON.Vector3(0, 12, -8), scene);
    camera.fov = 1.05;
    camera.minZ = 0.5;
    camera.maxZ = 600;

    const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-0.3, -0.8, 0.4), scene);
    sun.intensity = 0.95;
    sun.diffuse = new BABYLON.Color3(1.0, 0.95, 0.88);

    const ambient = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0, 1, 0), scene);
    ambient.intensity = 0.5;
    ambient.diffuse = new BABYLON.Color3(0.85, 0.9, 1.0);
    ambient.groundColor = new BABYLON.Color3(0.35, 0.42, 0.28);

    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.005;
    scene.fogColor = new BABYLON.Color3(0.6, 0.78, 0.9);

    const skyTex = new BABYLON.DynamicTexture('skyTex', { width: 1, height: 64 }, scene);
    const skyCtx = skyTex.getContext();
    const grad = skyCtx.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, '#7aadcc');
    grad.addColorStop(0.35, '#a8cce8');
    grad.addColorStop(0.65, '#c8dff0');
    grad.addColorStop(1, '#dde8f0');
    skyCtx.fillStyle = grad;
    skyCtx.fillRect(0, 0, 1, 64);
    skyTex.update();

    const sky = BABYLON.MeshBuilder.CreatePlane('sky', { width: 800, height: 250 }, scene);
    const skyMat = new BABYLON.StandardMaterial('skyMat', scene);
    skyMat.diffuseTexture = skyTex;
    skyMat.emissiveTexture = skyTex;
    skyMat.disableLighting = true;
    skyMat.backFaceCulling = false;
    sky.material = skyMat;
    sky.position = new BABYLON.Vector3(0, 80, 350);
    sky.isPickable = false;

    const whiteTex = new BABYLON.DynamicTexture('particleTex', { width: 4, height: 4 }, scene);
    const ptCtx = whiteTex.getContext();
    ptCtx.fillStyle = '#ffffff';
    ptCtx.fillRect(0, 0, 4, 4);
    whiteTex.update();

    let camX = 0, camY = 12, camZ = -8;

    function updateCamera(playerMesh, slope, roadCurve) {
        const pPos = playerMesh.position;
        const slopeFactor = Math.max(0, Math.min(1, -slope / 2));

        const camHeight = 5 + slopeFactor * 3;
        const camDist = 7 + slopeFactor * 2;

        const targetX = pPos.x * 0.4;
        const targetY = pPos.y + camHeight;
        const targetZ = pPos.z - camDist;

        camX += (targetX - camX) * 0.06;
        camY += (targetY - camY) * 0.06;
        camZ += (targetZ - camZ) * 0.06;

        camera.position.x = camX;
        camera.position.y = camY;
        camera.position.z = camZ;

        const lookAhead = 12;
        const lookCurve = roadCurve * 30;
        camera.setTarget(new BABYLON.Vector3(
            pPos.x + lookCurve,
            pPos.y + 1,
            pPos.z + lookAhead
        ));
    }

    function updateSky(playerMesh) {
        sky.position.x = playerMesh.position.x * 0.3;
        sky.position.z = playerMesh.position.z + 350;
    }

    return { engine, scene, camera, sun, ambient, whiteTex, updateCamera, updateSky };
};
