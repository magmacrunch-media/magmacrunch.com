// Three.js renderer and scene setup
// ROOM_THEMES is defined in gameConfig.js

let scene, renderer;
let cubeCamera, cubeRenderTarget;
let mainCamera;
let frameCount = 0;
let envMapInitialized = false;
let lightCones = [];

function initRenderer() {
    const canvas = document.getElementById('gameCanvas');
    
    const mazeCenterX = MAZE_LAYOUT[0].length / 2;
    const mazeCenterZ = MAZE_LAYOUT.length / 2;
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    mainCamera = new THREE.PerspectiveCamera(
        CAMERA_FOV,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    mainCamera.layers.enable(0);
    mainCamera.layers.enable(1);
    mainCamera.layers.enable(2);
    
    renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    
    cubeRenderTarget = new THREE.WebGLCubeRenderTarget(64, {
        format: THREE.RGBFormat,
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter
    });
    
    cubeCamera = new THREE.CubeCamera(0.1, 30, cubeRenderTarget);
    cubeCamera.position.set(mazeCenterX, CUBE_CAMERA_Y, mazeCenterZ);
    cubeCamera.layers.set(0);
    scene.add(cubeCamera);
    
    const currentRoom = typeof getCurrentRoom !== 'undefined' ? getCurrentRoom() : 1;
    const theme = ROOM_THEMES[currentRoom] || ROOM_THEMES[1];
    
    const ambientLight = new THREE.AmbientLight(theme.ambient, 0.15);
    ambientLight.isAmbientLight = true;
    scene.add(ambientLight);
    
    createLightsFromMaze(scene, currentRoom);
    
    window.addEventListener('resize', () => onWindowResize(mainCamera));
    
    return { scene, camera: mainCamera, renderer, canvas };
}

function createHangingLamp(scene, x, z, color, isPrimary) {
    const height = 5;
    
    const chainGeometry = new THREE.CylinderGeometry(0.02, 0.02, 5);
    const chainMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        metalness: 0.9,
        roughness: 0.1,
        emissive: 0x0a0a0a,
        emissiveIntensity: 0.1
    });
    const chain = new THREE.Mesh(chainGeometry, chainMaterial);
    chain.position.set(x, LAMP_CHAIN_Y, z);
    chain.layers.set(2);
    scene.add(chain);
    
    const shadeGeometry = new THREE.ConeGeometry(0.5, 1.0, 8);
    const shadeMaterial = new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        metalness: 0.8,
        roughness: 0.2,
        side: THREE.DoubleSide
    });
    const shade = new THREE.Mesh(shadeGeometry, shadeMaterial);
    shade.position.set(x, LAMP_HEIGHT, z);
    shade.rotation.x = Math.PI;
    shade.layers.set(2);
    scene.add(shade);
    
    const bulbGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const bulbMaterial = new THREE.MeshBasicMaterial({ color: color });
    const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
    bulb.position.set(x, LAMP_HEIGHT - LAMP_BULB_OFFSET, z);
    bulb.layers.set(2);
    scene.add(bulb);
    
    const intensity = isPrimary ? 4.0 : 2.5;
    const distance = isPrimary ? 8 : 6;
    const lampLight = new THREE.PointLight(color, intensity, distance, 2.5);
    lampLight.position.set(x, LAMP_HEIGHT - LAMP_BULB_OFFSET, z);
    lampLight.layers.set(0);
    scene.add(lampLight);
}

function createLightsFromMaze(scene, roomNumber = 1) {
    const mazeWidth  = MAZE_LAYOUT[0].length;
    const mazeHeight = MAZE_LAYOUT.length;
    const theme = ROOM_THEMES[roomNumber] || ROOM_THEMES[1];
    
    lightCones = [];
    
    for (let row = 0; row < mazeHeight; row++) {
        for (let col = 0; col < mazeWidth; col++) {
            const cellValue = MAZE_LAYOUT[row][col];
            const x = col + CELL_CENTER_OFFSET;
            const z = row + CELL_CENTER_OFFSET;
            
            if (cellValue === 5) {
                createHangingLamp(scene, x, z, theme.primary, true);
                
                const primarySpot = new THREE.SpotLight(theme.primary, 6.0, 15, Math.PI / 8, 0.6, 2.0);
                primarySpot.position.set(x, 5, z);
                primarySpot.target.position.set(x, 0, z);
                primarySpot.castShadow = true;
                primarySpot.shadow.mapSize.width  = 512;
                primarySpot.shadow.mapSize.height = 512;
                primarySpot.layers.set(0);
                scene.add(primarySpot);
                scene.add(primarySpot.target);
                
                const cones = createLightCone(scene, x, z, theme.primary, 0.8);
                lightCones.push({ cones, x, z, activationDistance: 10 });
            } else if (cellValue === 6) {
                createHangingLamp(scene, x, z, theme.secondary, false);
                
                const secondarySpot = new THREE.SpotLight(theme.secondary, 4.0, 12, Math.PI / 7, 0.7, 2.0);
                secondarySpot.position.set(x, 5, z);
                secondarySpot.target.position.set(x, 0, z);
                secondarySpot.layers.set(0);
                scene.add(secondarySpot);
                scene.add(secondarySpot.target);
                
                const cones = createLightCone(scene, x, z, theme.secondary, 0.6);
                lightCones.push({ cones, x, z, activationDistance: 8 });
            }
        }
    }
    
    console.log(`Created ${lightCones.length} light cone groups`);
}

function updateRoomLighting(roomNumber) {
    const theme = ROOM_THEMES[roomNumber] || ROOM_THEMES[1];
    
    let hasAmbientLight = false;
    scene.traverse((object) => {
        if (object.isAmbientLight) {
            object.color.setHex(theme.ambient);
            hasAmbientLight = true;
        }
    });

    if (!hasAmbientLight) {
        const ambientLight = new THREE.AmbientLight(theme.ambient, 0.15);
        ambientLight.isAmbientLight = true;
        scene.add(ambientLight);
    }
    
    console.log('Updated lighting theme for Room ' + roomNumber + ':', theme);
}

function createLightCone(scene, x, z, color, intensity) {
    const cones = [];
    
    const outerConeGeometry = new THREE.CylinderGeometry(0.1, 1.5, 5, 8, 1, true);
    const outerConeMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.06,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const outerCone = new THREE.Mesh(outerConeGeometry, outerConeMaterial);
    outerCone.position.set(x, 2.5, z);
    outerCone.visible = false;
    outerCone.layers.set(2);
    scene.add(outerCone);
    cones.push(outerCone);
    
    const midConeGeometry = new THREE.CylinderGeometry(0.1, 1.2, 5, 8, 1, true);
    const midConeMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.10,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const midCone = new THREE.Mesh(midConeGeometry, midConeMaterial);
    midCone.position.set(x, 2.5, z);
    midCone.visible = false;
    midCone.layers.set(2);
    scene.add(midCone);
    cones.push(midCone);
    
    const innerConeGeometry = new THREE.CylinderGeometry(0.1, 0.75, 5, 8, 1, true);
    const innerConeMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const innerCone = new THREE.Mesh(innerConeGeometry, innerConeMaterial);
    innerCone.position.set(x, 2.5, z);
    innerCone.visible = false;
    innerCone.layers.set(2);
    scene.add(innerCone);
    cones.push(innerCone);
    
    return cones;
}

function updateLightCones() {
    if (typeof getPlayerPosition === 'undefined') return;
    
    const playerPos = getPlayerPosition();
    
    lightCones.forEach(lightCone => {
        const dx = playerPos.x - lightCone.x;
        const dz = playerPos.z - lightCone.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        const shouldBeVisible = distance < lightCone.activationDistance;
        lightCone.cones.forEach(cone => { cone.visible = shouldBeVisible; });
    });
}

function initializeEnvironmentMap() {
    const originalBackground = scene.background;
    scene.background = new THREE.Color(0x15152a);
    // Walls aren't in the scene yet during init, so no feedback loop risk here
    for (let i = 0; i < 5; i++) {
        cubeCamera.update(renderer, scene);
    }
    scene.background = originalBackground;
    envMapInitialized = true;
}

// Call this after a room finishes loading (walls rebuilt, but before next render frame)
// Using setTimeout(fn, 0) from the caller defers to after the current call stack clears,
// so the cube camera update happens before any render but after scene is fully populated.
function refreshEnvironmentMap() {
    const originalBackground = scene.background;
    scene.background = new THREE.Color(0x15152a);
    cubeCamera.update(renderer, scene);
    scene.background = originalBackground;
}

function render(camera) {
    frameCount++;
    updateLightCones();
    renderer.render(scene, camera);
}

function onWindowResize(camera) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function getScene()            { return scene; }
function getCubeRenderTarget() { return cubeRenderTarget; }
function getCamera()           { return mainCamera; }

function clearLightCones() {
    lightCones = [];
    console.log("Light cones array cleared");
}
