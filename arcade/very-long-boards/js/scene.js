// ═══════════════════════════════════════════════
// Very Long Boards — Babylon.js Scene Setup
// ═══════════════════════════════════════════════

window.createScene = function(canvas) {
    const engine = new BABYLON.Engine(canvas, true);
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.55, 0.75, 0.92, 1);

    const camera = new BABYLON.FreeCamera('cam', new BABYLON.Vector3(0, 15, -10), scene);
    camera.fov = 1.1;
    camera.minZ = 0.5;
    camera.maxZ = 800;

    const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-0.2, -0.9, 0.3), scene);
    sun.intensity = 1.0;
    sun.diffuse = new BABYLON.Color3(1.0, 0.95, 0.85);

    const ambient = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0, 1, 0), scene);
    ambient.intensity = 0.45;
    ambient.diffuse = new BABYLON.Color3(0.85, 0.9, 1.0);
    ambient.groundColor = new BABYLON.Color3(0.3, 0.4, 0.25);

    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.004;
    scene.fogColor = new BABYLON.Color3(0.55, 0.75, 0.92);

    const skyTex = new BABYLON.DynamicTexture('skyTex', { width: 1, height: 64 }, scene);
    const skyCtx = skyTex.getContext();
    const grad = skyCtx.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, '#7eb8e0');
    grad.addColorStop(0.4, '#a8d4f0');
    grad.addColorStop(0.7, '#d4e8f5');
    grad.addColorStop(1, '#e8eff5');
    skyCtx.fillStyle = grad;
    skyCtx.fillRect(0, 0, 1, 64);
    skyTex.update();

    const sky = BABYLON.MeshBuilder.CreatePlane('sky', { width: 1000, height: 300 }, scene);
    const skyMat = new BABYLON.StandardMaterial('skyMat', scene);
    skyMat.diffuseTexture = skyTex;
    skyMat.emissiveTexture = skyTex;
    skyMat.disableLighting = true;
    skyMat.backFaceCulling = false;
    sky.material = skyMat;
    sky.position = new BABYLON.Vector3(0, 80, 400);
    sky.isPickable = false;

    const whiteTex = new BABYLON.DynamicTexture('particleTex', { width: 4, height: 4 }, scene);
    const ptCtx = whiteTex.getContext();
    ptCtx.fillStyle = '#ffffff';
    ptCtx.fillRect(0, 0, 4, 4);
    whiteTex.update();

    let camX = 0, camY = 15, camZ = -10;

    function updateCamera(playerMesh, slope, roadCurve) {
        const pPos = playerMesh.position;
        const slopeAngle = Math.atan2(-slope, 1);
        const slopeFactor = Math.max(0, Math.min(1, -slope / 3));

        const heightBehind = 10 + slopeFactor * 8;
        const distBehind = 6 + slopeFactor * 3;

        const targetX = pPos.x * 0.6;
        const targetY = pPos.y + heightBehind;
        const targetZ = pPos.z - distBehind;

        camX += (targetX - camX) * 0.08;
        camY += (targetY - camY) * 0.08;
        camZ += (targetZ - camZ) * 0.08;

        camera.position.x = camX;
        camera.position.y = camY;
        camera.position.z = camZ;

        const lookAhead = 25;
        const lookCurve = roadCurve * 50;
        const lookY = pPos.y - lookAhead * Math.sin(slopeAngle) * 0.5 - 3;

        camera.setTarget(new BABYLON.Vector3(
            pPos.x + lookCurve,
            lookY,
            pPos.z + lookAhead
        ));
    }

    function updateSky(playerMesh) {
        sky.position.x = playerMesh.position.x * 0.3;
        sky.position.z = playerMesh.position.z + 400;
    }

    return { engine, scene, camera, sun, ambient, whiteTex, updateCamera, updateSky };
};
