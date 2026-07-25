let currentRoom = 1;
let isTransitioning = false;
let roomScene;

function initRoomSystem(scene) {
    roomScene = scene;
}

function loadRoom(roomNumber, fadeTransition, spawnOverride) {
    if (fadeTransition === undefined) fadeTransition = true;
    if (spawnOverride === undefined) spawnOverride = null;
    if (isTransitioning) return;
    isTransitioning = true;
    
    if (fadeTransition) {
        showTransition(() => {
            performRoomSwitch(roomNumber, spawnOverride);
            hideTransition();
        });
    } else {
        performRoomSwitch(roomNumber, spawnOverride);
    }
}

function performRoomSwitch(roomNumber, spawnOverride) {
    const previousRoom = currentRoom;

    unloadCurrentRoom();

    currentRoom = roomNumber;
    const roomConfig = ROOMS[roomNumber];

    if (MAZE_LAYOUTS[roomNumber]) {
        window.MAZE_LAYOUT = MAZE_LAYOUTS[roomNumber];
    } else {
        console.error('No layout found for room ' + roomNumber + '!');
    }

    if (typeof updateRoomLighting !== 'undefined') {
        updateRoomLighting(roomNumber);
    }

    createMaze(roomScene);

    if (typeof createLightsFromMaze !== 'undefined') {
        createLightsFromMaze(roomScene, roomNumber);
    }

    createInscriptions(roomScene);
    createVoidEffects(roomScene);
    createRoomPortals(roomScene, currentRoom);

    if (roomConfig.hasNPC && typeof createNPC !== 'undefined') {
        createNPC(roomScene, roomConfig.npcPosition.x, roomConfig.npcPosition.z, roomConfig.npcId);
    }

    let spawnX, spawnZ, spawnFacing;

    if (spawnOverride) {
        spawnX = spawnOverride.x;
        spawnZ = spawnOverride.z;
        spawnFacing = spawnOverride.facing;
    } else {
        spawnX = roomConfig.startX;
        spawnZ = roomConfig.startZ;
        spawnFacing = 0;
    }

    resetPlayerToRoomStart(spawnX, spawnZ, spawnFacing);

    updateRoomNameDisplay(roomNumber);

    if (typeof refreshEnvironmentMap !== 'undefined') {
        setTimeout(refreshEnvironmentMap, 0);
    }

    isTransitioning = false;
}

function unloadCurrentRoom() {
    if (typeof clearPortals !== 'undefined') {
        clearPortals();
    }

    if (typeof clearLightCones !== 'undefined') {
        clearLightCones();
    }

    if (typeof clearInscriptions !== 'undefined') {
        clearInscriptions();
    }

    while (mazeWalls.length > 0) {
        mazeWalls.pop();
    }

    const dialogueBox = document.getElementById('npcDialogue');
    if (dialogueBox) {
        dialogueBox.style.display = 'none';
    }

    const objectsToRemove = [];
    roomScene.traverse((object) => {
        if (object.isMesh || object.isLight || object.isPoints || object.isGroup) {
            if (object !== getCamera() && !object.isCubeCamera) {
                objectsToRemove.push(object);
            }
        }
    });

    objectsToRemove.forEach(obj => {
        if (obj.parent) {
            obj.parent.remove(obj);
        }
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(mat => mat.dispose());
            } else {
                obj.material.dispose();
            }
        }
    });

    npcMesh = null;
    npcLight = null;
    dreamParticles = [];
}

function showTransition(callback) {
    let overlay = document.getElementById('room-transition');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'room-transition';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: black;
            opacity: 0;
            z-index: 9999;
            pointer-events: none;
            transition: opacity 0.5s ease-in-out;
        `;
        document.body.appendChild(overlay);
    }
    
    setTimeout(() => {
        overlay.style.opacity = '1';
    }, 10);
    
    setTimeout(() => {
        if (callback) callback();
    }, 500);
}

function hideTransition() {
    const overlay = document.getElementById('room-transition');
    if (overlay) {
        setTimeout(() => {
            overlay.style.opacity = '0';
        }, 100);
        
        setTimeout(() => {
            isTransitioning = false;
        }, 600);
    }
}

function resetPlayerToRoomStart(startX, startZ, facing) {
    if (facing === undefined) facing = 0;
    if (typeof resetPlayer !== 'undefined') {
        playerPosition = { x: startX, z: startZ };
        cameraRotation = facing;
        camera.position.set(startX, PLAYER_HEIGHT, startZ);
        camera.rotation.y = facing;
    }
}

function getCurrentRoom() {
    return currentRoom;
}

function isInTransition() {
    return isTransitioning;
}