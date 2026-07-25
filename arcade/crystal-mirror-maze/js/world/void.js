// Void particle effects

const voidOpenings = [];
const voidParticleSystems = [];

function createVoidEffects(scene) {
    // Find all void particle locations marked with 4 in the maze layout
    const mazeWidth = MAZE_LAYOUT[0].length;
    const mazeHeight = MAZE_LAYOUT.length;
    
    for (let row = 0; row < mazeHeight; row++) {
        for (let col = 0; col < mazeWidth; col++) {
            if (MAZE_LAYOUT[row][col] === 4) {
                // Determine direction based on position
                let direction = 'center';
                
                // Check if on edge to determine swirl direction
                if (row === 0) direction = 'north';
                else if (row === mazeHeight - 1) direction = 'south';
                else if (col === 0) direction = 'west';
                else if (col === mazeWidth - 1) direction = 'east';
                
                voidOpenings.push({ 
                    x: col + CELL_CENTER_OFFSET, 
                    z: row + CELL_CENTER_OFFSET, 
                    direction: direction 
                });
            }
        }
    }
    
    // Create particle system for each void opening
    voidOpenings.forEach(opening => {
        createVoidParticles(scene, opening);
    });
}

function createVoidParticles(scene, opening) {
    const particleCount = 50;
    const particles = [];
    
    // Create particle geometry
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
        // Position particles in a swirling pattern
        const angle = (i / particleCount) * Math.PI * 2;
        const radius = Math.random() * 0.8;
        
        let x, y, z;
        
        // Base position
        x = opening.x;
        y = Math.random() * 2;
        z = opening.z;
        
        // Add swirl based on direction
        switch (opening.direction) {
            case 'north':
                x += Math.cos(angle) * radius;
                z -= Math.random() * 0.5;
                break;
            case 'south':
                x += Math.cos(angle) * radius;
                z += Math.random() * 0.5;
                break;
            case 'west':
                x -= Math.random() * 0.5;
                z += Math.cos(angle) * radius;
                break;
            case 'east':
                x += Math.random() * 0.5;
                z += Math.cos(angle) * radius;
                break;
            case 'center':
            default:
                x += Math.cos(angle) * radius;
                z += Math.sin(angle) * radius;
                break;
        }
        
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        
        // Slightly lighter, still dark but visible as faint dust
        colors[i * 3] = 0.08 + Math.random() * 0.08;     // R
        colors[i * 3 + 1] = 0.05 + Math.random() * 0.06; // G
        colors[i * 3 + 2] = 0.12 + Math.random() * 0.10; // B
        
        sizes[i] = Math.random() * 0.05 + 0.03; // Slightly larger
        
        particles.push({
            angle: angle,
            radius: radius,
            speed: 0.5 + Math.random() * 0.5,
            verticalSpeed: (Math.random() - 0.5) * 0.01
        });
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // Particle material - subtle dust, visible but NOT reflective
    const material = new THREE.PointsMaterial({
        size: 0.04,
        vertexColors: true,
        transparent: true,
        opacity: 0.35, // More visible
        blending: THREE.NormalBlending,
        depthWrite: false,
        sizeAttenuation: true
    });
    
    const particleSystem = new THREE.Points(geometry, material);
    // Put particles on layer 1 so they DON'T appear in cube camera reflections
    particleSystem.layers.set(1);
    scene.add(particleSystem);
    
    voidParticleSystems.push({
        system: particleSystem,
        particles: particles,
        opening: opening,
        time: 0
    });
}

function updateVoidEffects() {
    voidParticleSystems.forEach(system => {
        system.time += 0.01;
        
        const positions = system.system.geometry.attributes.position.array;
        
        for (let i = 0; i < system.particles.length; i++) {
            const particle = system.particles[i];
            
            // Update angle for swirling motion
            particle.angle += particle.speed * 0.02;
            
            // Calculate new position with swirl
            let x, y, z;
            const swirlRadius = particle.radius + Math.sin(system.time + particle.angle) * 0.2;
            
            switch (system.opening.direction) {
                case 'north':
                    x = system.opening.x + Math.cos(particle.angle) * swirlRadius;
                    y = positions[i * 3 + 1] + particle.verticalSpeed;
                    z = system.opening.z - Math.sin(particle.angle) * 0.3;
                    break;
                case 'south':
                    x = system.opening.x + Math.cos(particle.angle) * swirlRadius;
                    y = positions[i * 3 + 1] + particle.verticalSpeed;
                    z = system.opening.z + Math.sin(particle.angle) * 0.3;
                    break;
                case 'west':
                    x = system.opening.x - Math.sin(particle.angle) * 0.3;
                    y = positions[i * 3 + 1] + particle.verticalSpeed;
                    z = system.opening.z + Math.cos(particle.angle) * swirlRadius;
                    break;
                case 'east':
                    x = system.opening.x + Math.sin(particle.angle) * 0.3;
                    y = positions[i * 3 + 1] + particle.verticalSpeed;
                    z = system.opening.z + Math.cos(particle.angle) * swirlRadius;
                    break;
                case 'center':
                default:
                    x = system.opening.x + Math.cos(particle.angle) * swirlRadius;
                    y = positions[i * 3 + 1] + particle.verticalSpeed;
                    z = system.opening.z + Math.sin(particle.angle) * swirlRadius;
                    break;
            }
            
            // Reset if particle goes too high or low
            if (y > 2.5 || y < -0.5) {
                y = Math.random() * 2;
            }
            
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }
        
        system.system.geometry.attributes.position.needsUpdate = true;
    });
}