// ═══════════════════════════════════════════════
// Very Long Boards — Main Game Loop (Babylon.js)
// ═══════════════════════════════════════════════

let gameState = 'title';
let currentCharacter = 'office-carl';
let selectedCharIndex = 0;
const charKeys = Object.keys(CHARACTERS);
let selectedBoardIndex = 0;
const boardKeys = Object.keys(BOARDS);
let frame = 0;
let bestScore = parseInt(localStorage.getItem('vlb-best') || '0');
let countdownStart = 0;
let lastCountNum = 0;

let sceneObj = null;
let terrain = null;
let titleDist = 0;

const titleScreen = document.getElementById('titleScreen');
const charSelect = document.getElementById('charSelect');
const boardSelect = document.getElementById('boardSelect');
const hud = document.getElementById('hud');
const gameOver = document.getElementById('gameOver');
const pauseScreen = document.getElementById('pauseScreen');
const countdownOverlay = document.getElementById('countdownOverlay');
const garageCanvas = document.getElementById('garageCanvas');

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
    window.initHUD();
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
            titleDist += 9 * dt;
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
                showGarage();
                showOverlay(charSelect);
                playSelectSound();
            }
            break;

        case 'select':
            titleDist += 9 * dt;
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
                updatePlayerColors(currentCharacter);
                playSelectSound();
            } else if (inp.right) {
                selectedCharIndex = (selectedCharIndex + 1) % charKeys.length;
                currentCharacter = charKeys[selectedCharIndex];
                updateCharSelection();
                updatePlayerColors(currentCharacter);
                playSelectSound();
            } else if (inp.enter) {
                gameState = 'boardSelect';
                hideOverlay(charSelect);
                showGarage();
                showOverlay(boardSelect);
                renderBoardCards();
                playSelectSound();
            }
            break;

        case 'boardSelect':
            if (inp.left) {
                selectedBoardIndex = (selectedBoardIndex - 1 + boardKeys.length) % boardKeys.length;
                currentBoard = boardKeys[selectedBoardIndex];
                updateBoardSelection();
                updatePlayerBoardColor(currentBoard);
                playSelectSound();
            } else if (inp.right) {
                selectedBoardIndex = (selectedBoardIndex + 1) % boardKeys.length;
                currentBoard = boardKeys[selectedBoardIndex];
                updateBoardSelection();
                updatePlayerBoardColor(currentBoard);
                playSelectSound();
            } else if (inp.enter) {
                hideGarage();
                hideOverlay(boardSelect);
                startCountdown();
            } else if (inp.escape) {
                hideGarage();
                hideOverlay(boardSelect);
                showOverlay(charSelect);
                gameState = 'select';
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
            if (inp.enter) {
                startCountdown();
            } else if (inp.tab) {
                hideOverlay(gameOver);
                showOverlay(charSelect);
                gameState = 'select';
                showGarage();
            }
            break;
    }
}

function startCountdown() {
    window.resetPlayer();
    player.speed = 0.1;
    titleDist = 0;
    window.initObstacles(sceneObj.scene);
    window.initScenery(sceneObj.scene);
    updatePlayerColors(currentCharacter);
    updatePlayerBoardColor(currentBoard);
    hideGarage();
    countdownStart = Date.now();
    lastCountNum = CONFIG.COUNTDOWN_SECS + 1;
    gameState = 'countdown';
    hideOverlay(charSelect);
    hideOverlay(boardSelect);
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

function showGarage() {
    garageCanvas.style.display = 'block';
    const ctx = garageCanvas.getContext('2d');
    drawGarage(ctx, garageCanvas.width, garageCanvas.height);
}

function hideGarage() {
    garageCanvas.style.display = 'none';
}

function renderBoardCards() {
    const container = document.getElementById('boardCards');
    if (!container) return;
    container.innerHTML = '';
    boardKeys.forEach((key, i) => {
        const board = BOARDS[key];
        const card = document.createElement('div');
        card.className = 'bs-card' + (i === selectedBoardIndex ? ' selected' : '');

        const preview = document.createElement('canvas');
        preview.className = 'bs-preview';
        preview.width = 100;
        preview.height = 40;
        const pctx = preview.getContext('2d');
        drawBoardPreview(pctx, key, 0, 0, 100, 40);

        const name = document.createElement('div');
        name.className = 'bs-name';
        name.textContent = board.name;

        const desc = document.createElement('div');
        desc.className = 'bs-desc';
        desc.textContent = board.desc;

        const stats = document.createElement('div');
        stats.className = 'bs-stats';
        const spd = Math.min(10, Math.round(board.speedMult * 10));
        const hand = Math.min(10, Math.round(board.handlingMult * 10));
        const stab = Math.min(10, Math.round(board.stabilityMult * 10));
        stats.textContent = `SPD ${'█'.repeat(spd)}${'░'.repeat(10-spd)} HAND ${'█'.repeat(hand)}${'░'.repeat(10-hand)} STAB ${'█'.repeat(stab)}${'░'.repeat(10-stab)}`;

        card.appendChild(preview);
        card.appendChild(name);
        card.appendChild(desc);
        card.appendChild(stats);
        container.appendChild(card);
    });
}

function updateBoardSelection() {
    document.querySelectorAll('.bs-card').forEach((card, i) => {
        card.classList.toggle('selected', i === selectedBoardIndex);
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
        sceneObj.scene.dispose();
        sceneObj.engine.dispose();
    }
};
