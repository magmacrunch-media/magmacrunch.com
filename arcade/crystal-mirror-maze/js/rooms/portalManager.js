// Portal creation and management
// All tunable values come from gameConfig.js

let roomPortals = [];
let portalData = [];
let lastPortalTriggerTime = 0;

function createRoomPortals(scene, currentRoom) {
    console.log("=== CREATING PORTALS FOR ROOM", currentRoom, "===");
    
    portalData = [];
    
    const layout = MAZE_LAYOUTS[currentRoom] || MAZE_LAYOUT;
    console.log("Layout dimensions:", layout.length, "x", layout[0].length);
    
    const envMap = getCubeRenderTarget().texture;
    let portalCount = 0;
    
    for (let row = 0; row < layout.length; row++) {
        for (let col = 0; col < layout[row].length; col++) {
            const cellValue = layout[row][col];
            
            if (cellValue >= PORTAL_CELL_MIN && cellValue <= PORTAL_CELL_MAX) {
                portalCount++;
                const x = col + CELL_CENTER_OFFSET;
                const z = row + CELL_CENTER_OFFSET;
                const destinationRoom = cellValue - PORTAL_CELL_BASE;
                
                console.log(`  Portal ${portalCount}: cell ${cellValue} at grid (${col}, ${row}) = world (${x}, ${z}) -> Room ${destinationRoom}`);
                
                const portalColor = PORTAL_COLORS[destinationRoom] || PORTAL_FALLBACK_COLOR;
                
                // Detect orientation by finding which axis has open neighbors.
                // Open north/south → player approaches along Z → rotation = Math.PI/2
                // Open east/west  → player approaches along X → rotation = 0
                const openNorth = row > 0 && layout[row - 1][col] !== 1;
                const openSouth = row < layout.length - 1 && layout[row + 1][col] !== 1;
                const openEast  = col < layout[0].length - 1 && layout[row][col + 1] !== 1;
                const openWest  = col > 0 && layout[row][col - 1] !== 1;

                let rotation = 0;
                let offsetX = 0;
                let offsetZ = 0;

                // PlaneGeometry faces +Z by default.
                // openNorth/South = player approaches along Z axis → plane already faces them → rotation = 0
                // openEast/West   = player approaches along X axis → rotate 90° to face them
                if (openNorth || openSouth) {
                    rotation = 0;
                    if (!openEast)  offsetX =  PORTAL_WALL_OFFSET;
                    if (!openWest)  offsetX = -PORTAL_WALL_OFFSET;
                } else if (openEast || openWest) {
                    rotation = Math.PI / 2;
                    if (!openNorth) offsetZ = -PORTAL_WALL_OFFSET;
                    if (!openSouth) offsetZ =  PORTAL_WALL_OFFSET;
                }

                console.log(`  Rotation: ${rotation}, Open: N=${openNorth} S=${openSouth} E=${openEast} W=${openWest}, Offset: (${offsetX}, ${offsetZ})`);
                
                portalData.push({ x, z, destination: destinationRoom, rotation, cellValue });
                createPortalVisuals(scene, x + offsetX, z + offsetZ, rotation, portalColor, envMap);
            }
        }
    }
    
    console.log(`Total portals created: ${portalCount}`);
}

function createPortalVisuals(scene, x, z, rotation, portalColor, envMap) {
    // Invisible blocker
    const blockerGeometry = new THREE.BoxGeometry(PORTAL_BLOCKER.w, PORTAL_BLOCKER.h, PORTAL_BLOCKER.d);
    const blockerMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const blocker = new THREE.Mesh(blockerGeometry, blockerMaterial);
    blocker.position.set(x, PORTAL_BLOCKER.y, z);
    blocker.layers.set(2);
    scene.add(blocker);
    roomPortals.push(blocker);
    
    // Door frame
    const frameGeometry = new THREE.BoxGeometry(PORTAL_FRAME.w, PORTAL_FRAME.h, PORTAL_FRAME.d);
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: PORTAL_FRAME_COLOR,
        metalness: 0.8, roughness: 0.2,
        emissive: PORTAL_FRAME_EMISSIVE, emissiveIntensity: 0.5
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(x, PORTAL_FRAME.y, z);
    frame.rotation.y = rotation;
    frame.layers.set(2);
    scene.add(frame);
    roomPortals.push(frame);
    
    // Coloured door panel
    const portalGeometry = new THREE.BoxGeometry(PORTAL_DOOR.w, PORTAL_DOOR.h, PORTAL_DOOR.d);
    const portalMaterial = new THREE.MeshStandardMaterial({
        color: portalColor,
        metalness: 0.7, roughness: 0.1,
        emissive: portalColor, emissiveIntensity: 0.8,
        transparent: true, opacity: 0.5
    });
    const portal = new THREE.Mesh(portalGeometry, portalMaterial);
    portal.position.set(x, PORTAL_DOOR.y, z);
    portal.rotation.y = rotation;
    portal.layers.set(2);
    portal.userData.isPortal = true;
    portal.userData.pulsTime = Math.random() * Math.PI * 2;
    scene.add(portal);
    roomPortals.push(portal);
    
    // Glow plane (double-sided for bidirectional portals)
    const glowGeometry = new THREE.PlaneGeometry(PORTAL_GLOW.w, PORTAL_GLOW.h);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: portalColor, transparent: true, opacity: 0.4, side: THREE.DoubleSide
    });
    const glowPlane = new THREE.Mesh(glowGeometry, glowMaterial);
    glowPlane.position.set(x, PORTAL_GLOW.y, z);
    glowPlane.rotation.y = rotation;
    glowPlane.layers.set(2);
    glowPlane.userData.isPortalGlow = true;
    glowPlane.userData.pulsTime = Math.random() * Math.PI * 2;
    scene.add(glowPlane);
    roomPortals.push(glowPlane);
    
    // Point light
    const portalLight = new THREE.PointLight(portalColor, PORTAL_LIGHT_INTENSITY, PORTAL_LIGHT_DISTANCE);
    portalLight.position.set(x, PORTAL_LIGHT_Y, z);
    portalLight.layers.set(0);
    scene.add(portalLight);
    roomPortals.push(portalLight);
}

function updateRoomPortals() {
    roomPortals.forEach(obj => {
        if (obj.userData && obj.userData.isPortal) {
            obj.userData.pulsTime += 0.02;
            obj.material.emissiveIntensity = 0.8 + Math.sin(obj.userData.pulsTime) * 0.3;
        }
        if (obj.userData && obj.userData.isPortalGlow) {
            obj.userData.pulsTime += 0.015;
            obj.material.opacity = 0.4 + Math.sin(obj.userData.pulsTime) * 0.2;
        }
    });
}

function checkRoomTransition(currentRoom) {
    const playerPos = getPlayerPosition();
    const currentTime = Date.now();
    
    if (currentTime - lastPortalTriggerTime < PORTAL_COOLDOWN) {
        return { shouldTransition: false };
    }
    
    for (let i = 0; i < portalData.length; i++) {
        const portal = portalData[i];
        const dx = playerPos.x - portal.x;
        const dz = playerPos.z - portal.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < PORTAL_DETECTION_RADIUS) {
            const spawnKey = `${currentRoom}-${portal.destination}`;
            const spawnData = PORTAL_SPAWNS[spawnKey];
            
            console.log(`>>> PORTAL TRIGGERED: ${spawnKey}, distance: ${distance.toFixed(2)}`);
            console.log(`  Spawn data:`, spawnData);
            
            if (spawnData) {
                lastPortalTriggerTime = currentTime;
                return { shouldTransition: true, destinationRoom: portal.destination, spawnData };
            } else {
                console.warn(`!!! NO SPAWN DATA FOUND FOR ${spawnKey} !!!`);
            }
        }
    }
    
    return { shouldTransition: false };
}

function clearPortals() {
    roomPortals = [];
    portalData = [];
    lastPortalTriggerTime = 0;
}
