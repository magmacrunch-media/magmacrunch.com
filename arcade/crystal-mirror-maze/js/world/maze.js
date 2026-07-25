// Maze generation and collision detection
// Material colours and collision constants come from gameConfig.js

const mazeWalls = [];

function createMaze(scene) {
    const envMap = getCubeRenderTarget().texture;
    
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.ShaderMaterial({
        uniforms: {
            centerX:        { value: MAZE_LAYOUT[0].length / 2 },
            centerZ:        { value: MAZE_LAYOUT.length / 2 },
            fadeStart:      { value: 12.0 },
            fadeEnd:        { value: 25.0 },
            floorColor:     { value: new THREE.Color(FLOOR_COLOR) },
            mazeFloorColor: { value: new THREE.Color(MAZE_FLOOR_COLOR) },
            ambientLight:   { value: new THREE.Color(FLOOR_AMBIENT) },
            lightIntensity: { value: 0.08 },
            envMap:         { value: envMap },
            reflectivity:   { value: 0.25 }
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            varying vec3 vNormal;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * viewMatrix * worldPosition;
            }
        `,
        fragmentShader: `
            uniform float centerX;
            uniform float centerZ;
            uniform float fadeStart;
            uniform float fadeEnd;
            uniform vec3 floorColor;
            uniform vec3 mazeFloorColor;
            uniform vec3 ambientLight;
            uniform float lightIntensity;
            uniform samplerCube envMap;
            uniform float reflectivity;
            varying vec3 vWorldPosition;
            varying vec3 vNormal;
            void main() {
                float dist = distance(vec2(vWorldPosition.x, vWorldPosition.z), vec2(centerX, centerZ));
                float fadeFactor = 1.0 - smoothstep(fadeStart, fadeEnd, dist);
                float insideMaze = smoothstep(10.0, 8.0, dist);
                vec3 viewDir = normalize(cameraPosition - vWorldPosition);
                vec3 reflectDir = reflect(-viewDir, vNormal);
                vec4 envColor = textureCube(envMap, reflectDir);
                vec3 baseColor = mix(floorColor, mazeFloorColor, insideMaze);
                vec3 litColor = mix(baseColor, ambientLight, lightIntensity);
                vec3 reflectedColor = mix(litColor, envColor.rgb, reflectivity * insideMaze);
                vec3 finalColor = mix(vec3(0.0, 0.0, 0.0), reflectedColor, fadeFactor);
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `,
        side: THREE.FrontSide
    });
    
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(MAZE_LAYOUT[0].length / 2, 0, MAZE_LAYOUT.length / 2);
    floor.receiveShadow = true;
    floor.layers.set(1);
    scene.add(floor);
    
    const mirrorMaterial = new THREE.MeshStandardMaterial({
        color: WALL_COLOR,
        metalness: 1.0,
        roughness: 0.0,
        envMap: envMap,
        envMapIntensity: WALL_ENV_MAP_INTENSITY,
        emissive: WALL_EMISSIVE,
        emissiveIntensity: WALL_EMISSIVE_INTENSITY,
        opacity: 1.0,
        transparent: false
    });
    
    for (let row = 0; row < MAZE_LAYOUT.length; row++) {
        for (let col = 0; col < MAZE_LAYOUT[row].length; col++) {
            const cellValue = MAZE_LAYOUT[row][col];
            
            if (cellValue === 1 || (cellValue >= PORTAL_CELL_MIN && cellValue <= PORTAL_CELL_MAX)) {
                const wallGeometry = new THREE.BoxGeometry(1, 3, 1);
                const wall = new THREE.Mesh(wallGeometry, mirrorMaterial);
                wall.position.set(col + CELL_CENTER_OFFSET, WALL_Y, row + CELL_CENTER_OFFSET);
                wall.castShadow = true;
                wall.receiveShadow = true;
                wall.layers.set(0);
                
                if (cellValue === 1) {
                    scene.add(wall);
                    mazeWalls.push({ x: col + CELL_CENTER_OFFSET, z: row + CELL_CENTER_OFFSET, isPortal: false });
                } else {
                    mazeWalls.push({ x: col + CELL_CENTER_OFFSET, z: row + CELL_CENTER_OFFSET, isPortal: true });
                }
            }
        }
    }
}

function checkCollision(newX, newZ) {
    for (let wall of mazeWalls) {
        const dx = Math.abs(newX - wall.x);
        const dz = Math.abs(newZ - wall.z);
        const collisionDistance = wall.isPortal
            ? PORTAL_COLLISION_RADIUS
            : (COLLISION_RADIUS + WALL_COLLISION_PADDING);
        if (dx < collisionDistance && dz < collisionDistance) return true;
    }
    return false;
}

function getMazeWalls() { return mazeWalls; }