// ═══════════════════════════════════════════════
// Very Long Boards — Particle Effects
// ═══════════════════════════════════════════════

const particles = [];

function spawnTrailParticle(x, y, type) {
    const char = CHARACTERS[currentCharacter];
    
    switch (type) {
        case 'dust':
            particles.push({
                x: x + (Math.random() - 0.5) * 10,
                y: y + 5,
                vx: (Math.random() - 0.5) * 1,
                vy: -Math.random() * 0.5,
                life: 20 + Math.random() * 15,
                maxLife: 35,
                size: 2 + Math.random() * 2,
                color: '#c8b898',
                type: 'dust',
            });
            break;
        case 'sparkle':
            particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + Math.random() * 10,
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 1.5,
                life: 15 + Math.random() * 10,
                maxLife: 25,
                size: 1 + Math.random() * 3,
                color: ['#ff00ff', '#00ffff', '#ffff00', '#ff6b35'][Math.floor(Math.random() * 4)],
                type: 'sparkle',
            });
            break;
        case 'shadow':
            particles.push({
                x: x + (Math.random() - 0.5) * 8,
                y: y + 5 + Math.random() * 10,
                vx: (Math.random() - 0.5) * 0.5,
                vy: -Math.random() * 0.3,
                life: 25 + Math.random() * 15,
                maxLife: 40,
                size: 3 + Math.random() * 4,
                color: '#7c3aed',
                type: 'shadow',
            });
            break;
    }
}

function spawnTrickParticles(x, y) {
    for (let i = 0; i < 15; i++) {
        const angle = (Math.PI * 2 * i) / 15;
        particles.push({
            x: x + 16,
            y: y + 20,
            vx: Math.cos(angle) * (2 + Math.random() * 2),
            vy: Math.sin(angle) * (2 + Math.random() * 2) - 1,
            life: 20 + Math.random() * 15,
            maxLife: 35,
            size: 2 + Math.random() * 3,
            color: '#ffe03a',
            type: 'trick',
        });
    }
}

function spawnCrashParticles(x, y) {
    for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        particles.push({
            x,
            y: y + 20,
            vx: Math.cos(angle) * (1 + Math.random() * 4),
            vy: Math.sin(angle) * (1 + Math.random() * 4) - 2,
            life: 25 + Math.random() * 20,
            maxLife: 45,
            size: 2 + Math.random() * 4,
            color: ['#ff2e9c', '#ff6b35', '#ffe03a', '#ff0000'][Math.floor(Math.random() * 4)],
            type: 'crash',
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function renderParticles(ctx) {
    for (const p of particles) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
}
