// Crystal management
// All tunable values come from gameConfig.js

const crystals = [];
let crystalScene;

function createCrystals(scene, alreadyCollectedIndices = []) {
    crystalScene = scene;
    const envMap = getCubeRenderTarget().texture;
    
    let crystalIndex = 0;
    
    for (let row = 0; row < MAZE_LAYOUT.length; row++) {
        for (let col = 0; col < MAZE_LAYOUT[row].length; col++) {
            if (MAZE_LAYOUT[row][col] === 2) {
                if (alreadyCollectedIndices.includes(crystalIndex)) {
                    console.log("Skipping crystal " + crystalIndex + " at (" + col + ", " + row + ") - already collected");
                    crystalIndex++;
                    continue;
                }
                
                const crystalGeometry = new THREE.OctahedronGeometry(CRYSTAL_SIZE, 1);
                const crystalMaterial = new THREE.MeshStandardMaterial({
                    color: CRYSTAL_COLOR,
                    emissive: CRYSTAL_COLOR,
                    emissiveIntensity: 2.5,
                    metalness: 1.0,
                    roughness: 0.0,
                    envMap: envMap,
                    envMapIntensity: 1.5
                });
                const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
                crystal.position.set(col + CELL_CENTER_OFFSET, CRYSTAL_HOVER_HEIGHT, row + CELL_CENTER_OFFSET);
                
                const crystalLight = new THREE.PointLight(CRYSTAL_COLOR, CRYSTAL_LIGHT_INTENSITY, CRYSTAL_LIGHT_DISTANCE);
                crystalLight.position.copy(crystal.position);
                scene.add(crystalLight);
                scene.add(crystal);
                
                crystals.push({
                    mesh: crystal,
                    light: crystalLight,
                    collected: false,
                    index: crystalIndex,
                    time: Math.random() * Math.PI * 2
                });
                
                crystalIndex++;
            }
        }
    }
    
    console.log("Created " + crystals.length + " crystals in current room");
}

function updateCrystals() {
    const playerPos = getPlayerPosition();
    
    crystals.forEach((crystal, arrayIndex) => {
        if (!crystal.collected) {
            crystal.mesh.rotation.y += CRYSTAL_ROTATE_Y;
            crystal.mesh.rotation.x += CRYSTAL_ROTATE_X;
            
            crystal.time += 0.002;
            crystal.mesh.position.y = CRYSTAL_HOVER_HEIGHT + Math.sin(crystal.time) * CRYSTAL_HOVER_AMPLITUDE;
            
            if (arrayIndex % 2 === 0) {
                crystal.light.position.copy(crystal.mesh.position);
            }
            
            crystal.light.intensity = CRYSTAL_LIGHT_INTENSITY + Math.sin(crystal.time * 1.5) * 1;
            
            const dx = playerPos.x - crystal.mesh.position.x;
            const dz = playerPos.z - crystal.mesh.position.z;
            if (Math.sqrt(dx * dx + dz * dz) < CRYSTAL_COLLECTION_DISTANCE) {
                collectCrystal(crystal);
            }
        }
    });
}

function collectCrystal(crystal) {
    crystal.collected = true;
    crystalScene.remove(crystal.mesh);
    crystalScene.remove(crystal.light);
    
    const currentRoom = getCurrentRoom();
    if (typeof markCrystalCollected !== 'undefined') {
        markCrystalCollected(currentRoom, crystal.index);
    }
    if (typeof incrementGlobalCrystals !== 'undefined') {
        incrementGlobalCrystals();
    }
    
    console.log("Collected crystal " + crystal.index + " in room " + currentRoom);
}

function clearCrystalMeshes() {
    crystals.forEach(crystal => {
        if (crystal.mesh.parent)  crystalScene.remove(crystal.mesh);
        if (crystal.light.parent) crystalScene.remove(crystal.light);
    });
    crystals.length = 0;
}

function resetCrystals() {
    clearCrystalMeshes();
    if (typeof resetCrystalTracking !== 'undefined') {
        resetCrystalTracking();
    }
}

function showVictory() {
    // Intentionally empty - victory is handled by door.js
}
