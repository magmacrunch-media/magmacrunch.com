// ═══════════════════════════════════-════════════
// Very Long Boards — Main Game Loop
// ═══════════════════════════════════════════════

let gameState = 'title';
let currentCharacter = 'office-carl';
let selectedCharIndex = 0;
const charKeys = Object.keys(CHARACTERS);
let road = null;
let frame = 0;
let trailTimer = 0;
let bestScore = parseInt(localStorage.getItem('vlb-best') || '0');

let countdownStart = 0;
let lastCountNum = 0;

const titleScreen = document.getElementById('titleScreen');
const charSelect = document.getElementById('charSelect');
const hud = document.getElementById('hud');
const gameOver = document.getElementById('gameOver');
const pauseScreen = document.getElementById('pauseScreen');

function init() {
    road = new Road();
    initAudio();
    renderCharacterPreview('csOffice', 'office-carl');
    renderCharacterPreview('csParty', 'party-carl');
    renderCharacterPreview('csDark', 'dark-carl');
    requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
    frame++;
    const inp = consumeInput();

    switch (gameState) {
        case 'title':
            if (road) {
                road.update(0.3);
                renderGame(road, 0, frame, 0.3);
            }
            if (inp.enter) {
                gameState = 'select';
                titleScreen.style.display = 'none';
                charSelect.style.display = 'flex';
                playSelectSound();
            }
            break;

        case 'select':
            if (inp.left) {
                selectedCharIndex = (selectedCharIndex - 1 + charKeys.length) % charKeys.length;
                currentCharacter = charKeys[selectedCharIndex];
                updateCharSelection();
                playSelectSound();
            } else if (inp.right) {
                selectedCharIndex = (selectedCharIndex + 1) % charKeys.length;
                currentCharacter = charKeys[selectedCharIndex];
                updateCharSelection();
                playSelectSound();
            } else if (inp.enter) {
                startCountdown();
            }
            break;

        case 'countdown':
            road.update(0.2);
            const elapsed = (Date.now() - countdownStart) / 1000;
            const remaining = CONFIG.COUNTDOWN_SECS - elapsed;
            if (remaining <= 0) {
                gameState = 'playing';
                hud.style.display = 'block';
            } else {
                const countNum = Math.ceil(remaining);
                if (countNum !== lastCountNum && countNum > 0) {
                    playSelectSound();
                    lastCountNum = countNum;
                }
                renderCountdown(countNum);
            }
            break;

        case 'playing':
            if (inp.escape) {
                gameState = 'paused';
                pauseScreen.style.display = 'flex';
                break;
            }

            road.update(player.speed);
            const result = updatePlayer(inp, road);
            updateObstacles();
            updateParticles();

            // Check for bail (stability ran out)
            if (result === 'bail') {
                spawnCrashParticles(player.x, getPlayerScreenY());
                playCrashSound();
                endGame('BAIL!');
                break;
            }

            // Trail particles
            trailTimer++;
            if (trailTimer % 3 === 0 && player.speed > 1) {
                const sy = getPlayerScreenY();
                spawnTrailParticle(player.x, sy + 40, CHARACTERS[currentCharacter].trail);
            }

            // Obstacle collisions
            if (checkCollision(obstacles, road)) {
                spawnCrashParticles(player.x, getPlayerScreenY());
                playCrashSound();
                endGame('SPLAT!');
                break;
            }

            // Trick
            if (inp.trick) {
                if (performTrick()) {
                    spawnTrickParticles(player.x, getPlayerScreenY());
                    playTrickSound();
                }
            }

            renderGame(road, player.lean, frame, player.speed);
            updateHUD();
            break;

        case 'paused':
            updateParticles();
            road.update(0);
            renderGame(road, player.lean, frame, player.speed);
            if (inp.escape) {
                gameState = 'playing';
                pauseScreen.style.display = 'none';
            }
            break;

        case 'gameover':
            updateParticles();
            road.update(0);
            renderGame(road, player.lean, frame, player.speed);
            if (inp.enter) {
                startCountdown();
            }
            break;
    }

    requestAnimationFrame(gameLoop);
}

function startCountdown() {
    resetPlayer();
    initObstacles();
    road = new Road();
    road.playerX = 0;
    countdownStart = Date.now();
    lastCountNum = CONFIG.COUNTDOWN_SECS + 1;
    gameState = 'countdown';
    charSelect.style.display = 'none';
    gameOver.style.display = 'none';
    pauseScreen.style.display = 'none';
    hud.style.display = 'none';
    playStartSound();
}

function endGame(cause) {
    player.alive = false;
    gameState = 'gameover';
    hud.style.display = 'none';
    gameOver.style.display = 'flex';
    if (player.score > bestScore) {
        bestScore = player.score;
        localStorage.setItem('vlb-best', String(bestScore));
    }
    document.getElementById('goScore').textContent = player.score;
    document.getElementById('goDist').textContent = Math.floor(player.distance);
    document.getElementById('goBest').textContent = bestScore;
    // Show cause of death
    const causeEl = document.getElementById('goCause');
    if (causeEl) causeEl.textContent = cause || 'SPLAT!';
    playGameOverSound();
}

function updateCharSelection() {
    document.querySelectorAll('.cs-card').forEach((card, i) => {
        card.classList.toggle('selected', i === selectedCharIndex);
    });
}

document.addEventListener('DOMContentLoaded', init);
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyD' && gameState === 'playing') {
        road.debugMode = !road.debugMode;
    }
});
document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameState === 'playing') {
        gameState = 'paused';
        pauseScreen.style.display = 'flex';
    }
});
window.__pageCleanup = function() {};