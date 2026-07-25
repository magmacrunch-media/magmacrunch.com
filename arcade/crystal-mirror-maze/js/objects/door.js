// Door management
// All colours, sizes and intensities come from gameConfig.js

let doorMesh;
let doorLight;
let doorFrame;
let doorGlowPlane;
let doorPosition = { x: 0, z: 0 };
let doorUnlocked = false;
let doorScene;
let isOutside = false;
let gameStartTime = null;
let gameEndTime = null;
let doorExists = false;

function createDoor(scene) {
    doorScene = scene;
    
    if (gameStartTime === null) {
        gameStartTime = Date.now();
    }
    
    let doorFound = false;
    for (let row = 0; row < MAZE_LAYOUT.length; row++) {
        for (let col = 0; col < MAZE_LAYOUT[row].length; col++) {
            if (MAZE_LAYOUT[row][col] === 3) {
                doorFound = true;
                doorPosition.x = col + CELL_CENTER_OFFSET;
                doorPosition.z = row + CELL_CENTER_OFFSET;
                
                let doorRotation = 0;
                const hasWallNorth = row > 0 && MAZE_LAYOUT[row - 1][col] === 1;
                const hasWallSouth = row < MAZE_LAYOUT.length - 1 && MAZE_LAYOUT[row + 1][col] === 1;
                const hasWallEast  = col < MAZE_LAYOUT[0].length - 1 && MAZE_LAYOUT[row][col + 1] === 1;
                const hasWallWest  = col > 0 && MAZE_LAYOUT[row][col - 1] === 1;
                
                // Detect orientation by finding which axis has open neighbors (the approach direction).
                // If cells are open to north/south, player approaches along Z → door faces Z → rotation = Math.PI/2
                // If cells are open to east/west, player approaches along X → door faces X → rotation = 0
                const openNorth = row > 0 && MAZE_LAYOUT[row - 1][col] !== 1;
                const openSouth = row < MAZE_LAYOUT.length - 1 && MAZE_LAYOUT[row + 1][col] !== 1;
                const openEast  = col < MAZE_LAYOUT[0].length - 1 && MAZE_LAYOUT[row][col + 1] !== 1;
                const openWest  = col > 0 && MAZE_LAYOUT[row][col - 1] !== 1;

                // PlaneGeometry faces +Z by default (toward increasing row = south).
                // openNorth/South = player approaches along Z axis → rotation = 0
                // openEast/West   = player approaches along X axis → rotation = Math.PI / 2
                if (openNorth || openSouth) {
                    doorRotation = 0;
                } else if (openEast || openWest) {
                    doorRotation = Math.PI / 2;
                }
                
                console.log("Door at (" + col + ", " + row + "), rotation: " + doorRotation);
                
                // Frame - slightly larger than door panel, same Y center
                const frameGeometry = new THREE.PlaneGeometry(1.05, 2.0);
                const frameMaterial = new THREE.MeshStandardMaterial({
                    color: DOOR_FRAME_COLOR,
                    metalness: 0.8, roughness: 0.2,
                    emissive: DOOR_FRAME_EMISSIVE, emissiveIntensity: 0.5,
                    side: THREE.DoubleSide
                });
                doorFrame = new THREE.Mesh(frameGeometry, frameMaterial);
                doorFrame.position.set(doorPosition.x, 1, doorPosition.z);
                doorFrame.rotation.y = doorRotation;
                doorFrame.layers.set(2);
                scene.add(doorFrame);
                
                // Door panel - offset 0.01 in front of frame to prevent z-fighting
                const zFightOffset = 0.01;
                const doorGeometry = new THREE.PlaneGeometry(1.0, 1.95);
                const lockedMaterial = new THREE.MeshStandardMaterial({
                    color: DOOR_LOCKED_COLOR,
                    metalness: 0.6, roughness: 0.4,
                    emissive: DOOR_LOCKED_EMISSIVE, emissiveIntensity: 0.4,
                    side: THREE.DoubleSide
                });
                doorMesh = new THREE.Mesh(doorGeometry, lockedMaterial);
                const panelX = doorPosition.x + (doorRotation !== 0 ? zFightOffset : 0);
                const panelZ = doorPosition.z + (doorRotation === 0 ? zFightOffset : 0);
                doorMesh.position.set(panelX, 1, panelZ);
                doorMesh.rotation.y = doorRotation;
                doorMesh.layers.set(2);
                scene.add(doorMesh);
                
                // Glow plane - offset slightly behind frame
                const glowGeometry = new THREE.PlaneGeometry(1.0, 2.0);
                const glowMaterial = new THREE.MeshBasicMaterial({
                    color: DOOR_GLOW_COLOR_LOCKED,
                    transparent: true, opacity: 0.3,
                    side: THREE.FrontSide
                });
                doorGlowPlane = new THREE.Mesh(glowGeometry, glowMaterial);
                doorGlowPlane.position.set(doorPosition.x, 1, doorPosition.z);
                doorGlowPlane.rotation.y = doorRotation;
                doorGlowPlane.rotation.y = doorRotation;
                doorGlowPlane.layers.set(2);
                scene.add(doorGlowPlane);
                
                // Point light
                doorLight = new THREE.PointLight(DOOR_LOCKED_LIGHT, DOOR_LIGHT_INTENSITY_LOCKED, DOOR_LIGHT_DISTANCE);
                doorLight.position.set(doorPosition.x, DOOR_LIGHT_Y, doorPosition.z);
                doorLight.layers.set(0);
                scene.add(doorLight);
                
                mazeWalls.push({ x: doorPosition.x, z: doorPosition.z });
                doorExists = true;
                break;
            }
        }
        if (doorFound) break;
    }
    
    if (!doorFound) {
        console.log("No exit door in this room");
        doorExists = false;
    }
}

function updateDoor() {
    if (!doorExists || isOutside) return;
    
    const allCrystalsCollected = typeof hasCollectedAllCrystals !== 'undefined'
        ? hasCollectedAllCrystals()
        : (getCollectedCrystalsCount() === TOTAL_CRYSTALS);
    
    if (!doorUnlocked && allCrystalsCollected) unlockDoor();
    
    if (doorUnlocked) {
        doorLight.intensity = DOOR_LIGHT_INTENSITY_UNLOCKED + Math.sin(Date.now() * 0.003) * 0.5;
        doorGlowPlane.material.opacity = 0.5 + Math.sin(Date.now() * 0.003) * 0.2;
        
        const playerPos = getPlayerPosition();
        const dx = playerPos.x - doorPosition.x;
        const dz = playerPos.z - doorPosition.z;
        if (Math.sqrt(dx * dx + dz * dz) < DOOR_INTERACTION_DISTANCE) enterDoor();
    } else {
        doorLight.intensity = DOOR_LIGHT_INTENSITY_LOCKED + Math.sin(Date.now() * 0.005) * 0.3;
        doorGlowPlane.material.opacity = 0.3 + Math.sin(Date.now() * 0.005) * 0.1;
    }
}

function unlockDoor() {
    if (!doorExists) return;
    doorUnlocked = true;
    
    const doorWallIndex = mazeWalls.findIndex(w => w.x === doorPosition.x && w.z === doorPosition.z);
    if (doorWallIndex !== -1) mazeWalls.splice(doorWallIndex, 1);
    
    doorMesh.material = new THREE.MeshStandardMaterial({
        color: DOOR_UNLOCKED_COLOR,
        metalness: 0.7, roughness: 0.1,
        emissive: DOOR_UNLOCKED_EMISSIVE, emissiveIntensity: 1.2,
        transparent: true, opacity: 0.4
    });
    doorGlowPlane.material.color.setHex(DOOR_GLOW_COLOR_UNLOCKED);
    doorGlowPlane.material.opacity = 0.5;
    doorLight.color.setHex(DOOR_UNLOCKED_LIGHT);
    doorLight.intensity = DOOR_LIGHT_INTENSITY_UNLOCKED;
}

function enterDoor() {
    isOutside = true;
    gameEndTime = Date.now();
    
    const elapsedSeconds = Math.floor((gameEndTime - gameStartTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const timeString = minutes + ":" + seconds.toString().padStart(2, "0");
    
    const victoryDiv = document.getElementById("victory");
    const existingTime = victoryDiv.querySelector(".completion-time");
    if (existingTime) {
        existingTime.textContent = "Time: " + timeString;
    } else {
        const timeDisplay = document.createElement("p");
        timeDisplay.className = "completion-time";
        timeDisplay.textContent = "Time: " + timeString;
        timeDisplay.style.cssText = "font-size:24px; margin-top:20px; color:#ffdd88;";
        victoryDiv.insertBefore(timeDisplay, victoryDiv.querySelector("#playAgainBtn"));
    }
    
    transitionToOutside();
}

function resetDoor() {
    if (!doorExists) return;
    isOutside = false;
    doorUnlocked = false;
    gameStartTime = Date.now();
    gameEndTime = null;
    
    doorMesh.material = new THREE.MeshStandardMaterial({
        color: DOOR_LOCKED_COLOR,
        metalness: 0.6, roughness: 0.4,
        emissive: DOOR_LOCKED_EMISSIVE, emissiveIntensity: 0.4,
        transparent: false, opacity: 1.0
    });
    doorGlowPlane.material.color.setHex(DOOR_GLOW_COLOR_LOCKED);
    doorGlowPlane.material.opacity = 0.3;
    doorLight.color.setHex(DOOR_LOCKED_LIGHT);
    doorLight.intensity = DOOR_LIGHT_INTENSITY_LOCKED;
    
    if (!mazeWalls.some(w => w.x === doorPosition.x && w.z === doorPosition.z)) {
        mazeWalls.push({ x: doorPosition.x, z: doorPosition.z });
    }
}

function getIsOutside()     { return isOutside; }
function doorExistsInRoom() { return doorExists; }
function getGameTime() {
    if (gameStartTime === null) return 0;
    return (gameEndTime || Date.now()) - gameStartTime;
}
