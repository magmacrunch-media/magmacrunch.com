// ═══════════════════════════════════════════════
// Very Long Boards — Main Game Loop (Babylon.js)
// ═══════════════════════════════════════════════

let gameState = 'title';
let currentCharacter = 'office-carl';
let selectedCharIndex = 0;
const charKeys = Object.keys(CHARACTERS);
let frame = 0;
let bestScore = parseInt(localStorage.getItem('vlb-best') || '0');
let countdownStart = 0;
let lastCountNum = 0;

let sceneObj = null;
let terrain = null;
let titleDist = 0;

const titleScreen = document.getElementById('titleScreen');
const charSelect = document.getElementById('charSelect');
const hud = document.getElementById('hud');
const gameOver = document.getElementById('gameOver');
const pauseScreen = document.getElementById('pauseScreen');
const countdownOverlay = document.getElementById('countdownOverlay');

function init() {
    const canvas = document.getElementById('renderCanvas');
    sceneObj = window.createScene(canvas);
    const { scene, whiteTex } = sceneObj;

    terrain = window.createTerrain(scene);
    window.createObstacles(scene);
    window.createScenery(scene);
    window.createPlayer(scene);
    window.createParticles(scene, whiteTex);

    initAudio();
    renderCharacterPreview('csOffice', 'office-carl');
    renderCharacterPreview('csParty', 'party-carl');
    renderCharacterPreview('csDark', 'dark-carl');

    scene.registerBeforeRender(gameLogic);
    sceneObj.engine.runRenderLoop(() => scene.render());
}

function showOverlay(el) { if (el) el.classList.add('active'); }
function hideOverlay(el) { if (el) el.classList.remove('active'); }

function gameLogic() {
    frame++;
    const dt = sceneObj.engine.getDeltaTime() / 1000;
    const inp = consumeInput();

    switch (gameState) {
        case 'title':
            titleDist += 0.15;
            terrain.update(titleDist);
            playerMesh.position.y = terrain.hillAt(titleDist);
            window.updateObstaclePositions(terrain, terrain.getScrollOffset());
            window.updateSceneryPositions(terrain, terrain.getScrollOffset());
            const tSlope = terrain.hillAt(titleDist + 5) - terrain.hillAt(titleDist);
            const tCurve = terrain.curveAt(titleDist);
            sceneObj.updateCamera(playerMesh, tSlope, tCurve);
            sceneObj.updateSky(playerMesh);
            if (inp.enter) {
                gameState = 'select';
                hideOverlay(titleScreen);
                showOverlay(charSelect);
                playSelectSound();
            }
            break;

        case 'select':
            titleDist += 0.15;
            terrain.update(titleDist);
            playerMesh.position.y = terrain.hillAt(titleDist);
            window.updateObstaclePositions(terrain, terrain.getScrollOffset());
            window.updateSceneryPositions(terrain, terrain.getScrollOffset());
            const sSlope = terrain.hillAt(titleDist + 5) - terrain.hillAt(titleDist);
            const sCurve = terrain.curveAt(titleDist);
            sceneObj.updateCamera(playerMesh, sSlope, sCurve);
            sceneObj.updateSky(playerMesh);
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

        case 'countdown': {
            player.groundY = terrain ? terrain.hillAt(player.distance) : 0;
            terrain.update(player.speed);
            window.updateObstaclePositions(terrain, terrain.getScrollOffset());
            window.updateSceneryPositions(terrain, terrain.getScrollOffset());
            window.updatePlayerMesh(terrain, frame);
            const curve = terrain.curveAt(player.distance);
            const slope = terrain.hillAt(player.distance + 5) - terrain.hillAt(player.distance);
            sceneObj.updateCamera(playerMesh, slope, curve);
            sceneObj.updateSky(playerMesh);
            const elapsed = (Date.now() - countdownStart) / 1000;
            const remaining = CONFIG.COUNTDOWN_SECS - elapsed;
            if (remaining <= 0) {
                gameState = 'playing';
                hideOverlay(countdownOverlay);
                hud.style.display = 'block';
            } else {
                const countNum = Math.ceil(remaining);
                if (countNum !== lastCountNum && countNum > 0) { playSelectSound(); lastCountNum = countNum; }
                renderCountdown(countNum);
            }
            break;
        }

        case 'playing':
            if (inp.escape) {
                gameState = 'paused';
                showOverlay(pauseScreen);
                break;
            }

            terrain.update(player.distance);
            const result = window.updatePlayer(inp, terrain, dt);
            window.updateObstacles(sceneObj.scene, terrain);
            window.updateScenery(sceneObj.scene);
            window.updateObstaclePositions(terrain, terrain.getScrollOffset());
            window.updateSceneryPositions(terrain, terrain.getScrollOffset());
            window.updatePlayerMesh(terrain, frame);
            window.updateTrailParticles(CHARACTERS[currentCharacter].trail, player.speed);

            if (result === 'bail') {
                window.spawnCrashParticles();
                playCrashSound();
                endGame('BAIL!');
                break;
            }
            if (result === 'trick') {
                window.spawnTrickParticles();
                playTrickSound();
                showTrickText();
            }
            if (window.checkObstacleCollisions(terrain)) {
                window.spawnCrashParticles();
                playCrashSound();
                endGame('WIPED OUT!');
                break;
            }

            const curve2 = terrain.curveAt(player.distance);
            const slope2 = terrain.hillAt(player.distance + 5) - terrain.hillAt(player.distance);
            sceneObj.updateCamera(playerMesh, slope2, curve2);
            sceneObj.updateSky(playerMesh);
            updateHUD();
            updateTrickText();
            break;

        case 'paused':
            terrain.update(player.distance);
            window.updatePlayerMesh(terrain, frame);
            if (inp.escape) {
                gameState = 'playing';
                hideOverlay(pauseScreen);
            }
            break;

        case 'gameover':
            terrain.update(player.distance);
            window.updatePlayerMesh(terrain, frame);
            if (inp.enter) startCountdown();
            break;
    }
}

function startCountdown() {
    window.resetPlayer();
    player.speed = 0.1;
    titleDist = 0;
    window.initObstacles(sceneObj.scene);
    window.initScenery(sceneObj.scene);
    countdownStart = Date.now();
    lastCountNum = CONFIG.COUNTDOWN_SECS + 1;
    gameState = 'countdown';
    hideOverlay(charSelect);
    hideOverlay(gameOver);
    hideOverlay(pauseScreen);
    showOverlay(countdownOverlay);
    hud.style.display = 'none';
    playStartSound();
}

function endGame(cause) {
    player.alive = false;
    gameState = 'gameover';
    hud.style.display = 'none';
    showOverlay(gameOver);
    if (player.score > bestScore) {
        bestScore = player.score;
        localStorage.setItem('vlb-best', String(bestScore));
    }
    document.getElementById('goScore').textContent = player.score;
    document.getElementById('goDist').textContent = Math.floor(player.distance);
    document.getElementById('goBest').textContent = bestScore;
    const causeEl = document.getElementById('goCause');
    if (causeEl) causeEl.textContent = cause || 'SPLAT!';
    playGameOverSound();
}

function updateCharSelection() {
    document.querySelectorAll('.cs-card').forEach((card, i) => {
        card.classList.toggle('selected', i === selectedCharIndex);
    });
}

function renderCharacterPreview(canvasId, charKey) {
    const pc = document.getElementById(canvasId);
    if (!pc) return;
    const pctx = pc.getContext('2d');
    pctx.clearRect(0, 0, 64, 80);
    const ch = characterSprites[charKey];
    if (ch) ch.draw(pctx, 16, 10, 0, 0);
}

function renderCountdown(count) {
    const countEl = document.getElementById('countdownText');
    if (countEl) {
        countEl.textContent = count > 0 ? String(count) : 'GO!';
        countEl.style.color = count > 0 ? '#ffe03a' : '#39ff6e';
    }
}

let trickTextTimer = 0;
function showTrickText() {
    trickTextTimer = 40;
}
function updateTrickText() {
    const el = document.getElementById('hudTrick');
    if (!el) return;
    if (trickTextTimer > 0) {
        trickTextTimer--;
        el.textContent = 'TRICK! +' + Math.floor(CONFIG.TRICK_POINTS * CHARACTERS[currentCharacter].trickMult * (1 + player.speed));
        el.style.opacity = 1;
    } else {
        el.style.opacity = 0;
    }
}

document.addEventListener('DOMContentLoaded', init);
document.addEventListener('keydown', (e) => {
    if (e.code === 'Backquote' && gameState === 'playing') {
        terrain.debugMode = !terrain.debugMode;
    }
});
document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameState === 'playing') {
        gameState = 'paused';
        showOverlay(pauseScreen);
    }
});
window.__pageCleanup = function() {
    if (sceneObj) {
        sceneObj.engine.stopRenderLoop();
        window.disposeParticles();
    }
};
