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
let menuNavCooldown = 0;

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
    renderCharCards();
    loadLeaderboard();

    scene.registerBeforeRender(gameLogic);
    sceneObj.engine.runRenderLoop(() => scene.render());
}

function showOverlay(el) { if (el) el.classList.add('active'); }
function hideOverlay(el) { if (el) el.classList.remove('active'); }

/**
 * The road rolling past behind the menus. Title and character select show the
 * same idle world; board select sits still because the garage covers it.
 */
function updateIdleWorld(dt) {
    titleDist += 9 * dt;
    terrain.update(titleDist);
    playerMesh.position.y = terrain.hillAt(titleDist);
    window.updateObstaclePositions(terrain, terrain.getScrollOffset());
    window.updateSceneryPositions(terrain, terrain.getScrollOffset());
    sceneObj.updateCamera(
        playerMesh,
        terrain.hillAt(titleDist + 5) - terrain.hillAt(titleDist),
        terrain.curveAt(titleDist),
    );
    sceneObj.updateSky(playerMesh);
}

function gameLogic() {
    frame++;
    const dt = Math.min(sceneObj.engine.getDeltaTime() / 1000, CONFIG.MAX_FRAME);
    const inp = consumeInput();
    if (menuNavCooldown > 0) menuNavCooldown -= dt;

    // The mix reads the game state rather than being told about it, so it runs
    // outside the switch and covers every state including the ones that do
    // nothing else.
    window.updateAudioMix(gameState);

    switch (gameState) {
        case 'title':
            updateIdleWorld(dt);
            if (inp.enter) {
                gameState = 'select';
                hideOverlay(titleScreen);
                showGarage();
                showOverlay(charSelect);
                playSelectSound();
            }
            break;

        case 'select':
            updateIdleWorld(dt);
            if (inp.left && menuNavCooldown <= 0) {
                selectedCharIndex = (selectedCharIndex - 1 + charKeys.length) % charKeys.length;
                currentCharacter = charKeys[selectedCharIndex];
                updateCharSelection();
                updatePlayerColors(currentCharacter);
                playSelectSound();
                menuNavCooldown = 0.15;
            } else if (inp.right && menuNavCooldown <= 0) {
                selectedCharIndex = (selectedCharIndex + 1) % charKeys.length;
                currentCharacter = charKeys[selectedCharIndex];
                updateCharSelection();
                updatePlayerColors(currentCharacter);
                playSelectSound();
                menuNavCooldown = 0.15;
            } else if (inp.enter) {
                gameState = 'boardSelect';
                hideOverlay(charSelect);
                showGarage();
                showOverlay(boardSelect);
                renderBoardCards();
                playSelectSound();
            } else if (inp.escape) {
                gameState = 'title';
                hideGarage();
                hideOverlay(charSelect);
                showOverlay(titleScreen);
                playBackSound();
            }
            break;

        case 'boardSelect':
            if (inp.left && menuNavCooldown <= 0) {
                selectedBoardIndex = (selectedBoardIndex - 1 + boardKeys.length) % boardKeys.length;
                currentBoard = boardKeys[selectedBoardIndex];
                updateBoardSelection();
                updatePlayerBoardColor(currentBoard);
                playSelectSound();
                menuNavCooldown = 0.15;
            } else if (inp.right && menuNavCooldown <= 0) {
                selectedBoardIndex = (selectedBoardIndex + 1) % boardKeys.length;
                currentBoard = boardKeys[selectedBoardIndex];
                updateBoardSelection();
                updatePlayerBoardColor(currentBoard);
                playSelectSound();
                menuNavCooldown = 0.15;
            } else if (inp.enter) {
                hideGarage();
                hideOverlay(boardSelect);
                startCountdown();
            } else if (inp.escape) {
                hideOverlay(boardSelect);
                showOverlay(charSelect);
                gameState = 'select';
                playBackSound();
            }
            break;

        case 'countdown': {
            player.groundY = terrain ? terrain.hillAt(player.distance) : 0;
            // player.distance, not player.speed. Every other state scrolls the
            // road by how far Carl has come; this one was passing his velocity,
            // which only looked right because both are ~0 on the start line.
            terrain.update(player.distance);
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
                window.silenceAudioBeds();
                playBackSound();
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
                playSelectSound();
            }
            break;

        case 'gameover':
            terrain.update(player.distance);
            window.updatePlayerMesh(terrain, frame);
            // While initials are being entered the keyboard belongs to the input
            // field, or Enter would restart the run instead of submitting them.
            if (isAwaitingInitials()) break;
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
    hideInitialsPrompt();
    submittedScore = null;
    setRankedNote('');
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
    window.silenceAudioBeds();
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

    if (madeLeaderboard(player.score)) {
        playHighScoreSound();
        recordRankedScore(player.score);
    } else {
        setRankedNote('');
        playGameOverSound();
    }
}

// ═══════════════════════════════════════════════
//  LEADERBOARD
//
//  scoreClient is created in index.html and owns both the MAGMA//OPS backend
//  and its localStorage fallback, so nothing here has to know which one answered
//  — a run with the Pi unreachable still ranks, just locally. bestScore stays as
//  it was: it is this browser's own record and is shown even when the board is
//  empty or unreachable.
// ═══════════════════════════════════════════════

const LEADERBOARD_SIZE = 10;

/**
 * Ranking inside the top few is worth stopping the game for. Ranking anywhere
 * else is not.
 *
 * The board holds ten and a run lasts five to fourteen seconds, so with a quiet
 * board almost every wipeout ranks somewhere - which meant almost every wipeout
 * put a text field between the player and pressing Enter again. Below this the
 * score is still recorded, under the initials already given, and the game just
 * says so.
 */
const PROMPT_ABOVE_RANK = 3;

/** Where the player's initials are remembered between runs and between visits. */
const INITIALS_KEY = 'vlb-initials';

let leaderboard = [];
let awaitingInitials = false;

/** The score last written, so a second Enter cannot record the same run twice. */
let submittedScore = null;

async function loadLeaderboard() {
    try {
        leaderboard = (await scoreClient.load('very-long-boards')) || [];
    } catch (e) {
        leaderboard = [];
    }
    renderLeaderboard();
}

function renderLeaderboard(highlightScore) {
    const list = document.getElementById('goBoard');
    if (!list) return;
    list.innerHTML = '';

    if (!leaderboard.length) {
        const empty = document.createElement('div');
        empty.className = 'lb-empty';
        empty.textContent = 'NO SCORES YET';
        list.appendChild(empty);
        return;
    }

    let highlighted = false;
    leaderboard.slice(0, LEADERBOARD_SIZE).forEach((entry, i) => {
        const row = document.createElement('div');
        row.className = 'lb-row';
        // Highlight one row only: with a repeated score the first match is the
        // one just inserted, since it sorted in ahead of the equal older entry.
        if (!highlighted && highlightScore !== undefined && entry.score === highlightScore) {
            row.classList.add('lb-new');
            highlighted = true;
        }
        row.innerHTML =
            '<span class="lb-rank">' + (i + 1) + '</span>' +
            '<span class="lb-initials"></span>' +
            '<span class="lb-score"></span>';
        row.querySelector('.lb-initials').textContent = entry.initials || '???';
        row.querySelector('.lb-score').textContent = entry.score;
        list.appendChild(row);
    });
}

/** A score ranks if the board has room or it beats the bottom of it. */
function madeLeaderboard(score) {
    if (score <= 0) return false;
    if (leaderboard.length < LEADERBOARD_SIZE) return true;
    return score > leaderboard[leaderboard.length - 1].score;
}

/** Where this score would land, 1-based. Ties go below the score they equal. */
function rankFor(score) {
    let rank = 1;
    for (const entry of leaderboard) if (entry.score >= score) rank++;
    return rank;
}

function rememberedInitials() {
    try {
        return (localStorage.getItem(INITIALS_KEY) || '').slice(0, 3);
    } catch (e) {
        return '';
    }
}

function isAwaitingInitials() { return awaitingInitials; }

/**
 * A run that ranked. Ask for initials the first time, and for a run good enough
 * to deserve the pause; otherwise record it under the initials already given and
 * leave Enter free to start the next run.
 */
function recordRankedScore(score) {
    const known = rememberedInitials();
    if (!known || rankFor(score) <= PROMPT_ABOVE_RANK) {
        showInitialsPrompt(score, known);
    } else {
        submitInitials(known, score);
    }
}

function showInitialsPrompt(score, prefill) {
    const prompt = document.getElementById('goInitials');
    const field = document.getElementById('goInitialsInput');
    if (!prompt || !field) {
        // No markup to type into: rank the score anyway rather than losing it.
        submitInitials(prefill || 'AAA', score);
        return;
    }
    awaitingInitials = true;
    prompt.classList.add('active');
    // Prefilled and selected, so Enter alone accepts and typing replaces.
    field.value = prefill || '';
    field.disabled = false;
    field.focus();
    field.select();
    field.onkeydown = (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') submitInitials(field.value, score);
    };
}

/** The line under the board that says what happened, when nothing was asked. */
function setRankedNote(text) {
    const el = document.getElementById('goRanked');
    if (el) el.textContent = text;
}

function hideInitialsPrompt() {
    const prompt = document.getElementById('goInitials');
    if (prompt) prompt.classList.remove('active');
    awaitingInitials = false;
}

function submitInitials(raw, score) {
    if (submittedScore === score) return;   // guard a double Enter
    submittedScore = score;
    awaitingInitials = false;

    const initials = (raw || '').trim().toUpperCase().slice(0, 3) || 'AAA';
    try {
        localStorage.setItem(INITIALS_KEY, initials);
    } catch (e) {
        // Private browsing. The score still ranks; it just asks again next time.
    }

    // Insert locally first so the board on screen is right whether or not the
    // backend is reachable; scoreClient owns the actual persistence.
    leaderboard.push({ initials, score });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, LEADERBOARD_SIZE);
    try {
        scoreClient.save('very-long-boards', initials, score);
    } catch (e) {
        // Already recorded on screen; a failed save is not worth interrupting.
    }

    hideInitialsPrompt();
    renderLeaderboard(score);

    const rank = leaderboard.findIndex((e) => e.score === score && e.initials === initials) + 1;
    setRankedNote(rank > 0 ? 'RANKED #' + rank + ' AS ' + initials : 'RANKED AS ' + initials);
}

function updateCharSelection() {
    document.querySelectorAll('.cs-card').forEach((card, i) => {
        card.classList.toggle('selected', i === selectedCharIndex);
    });
}

/**
 * Build the character cards from CHARACTERS, the way renderBoardCards builds
 * the board cards from BOARDS. They used to be three hand-written blocks in
 * index.html carrying hand-written stat bars, which is how the markup came to
 * claim a CRV stat that exists nowhere in the config.
 */
function renderCharCards() {
    const container = document.getElementById('charCards');
    if (!container) return;
    const all = charKeys.map((k) => CHARACTERS[k]);
    container.innerHTML = '';

    charKeys.forEach((key, i) => {
        const ch = CHARACTERS[key];
        const card = document.createElement('div');
        card.className = 'cs-card' + (i === selectedCharIndex ? ' selected' : '');
        card.dataset.char = key;

        const preview = document.createElement('canvas');
        preview.className = 'cs-preview';
        preview.width = 64;
        preview.height = 80;
        const sprite = characterSprites[key];
        if (sprite) sprite.draw(preview.getContext('2d'), 16, 10, 0, 0);

        const name = document.createElement('div');
        name.className = 'cs-name';
        name.textContent = ch.name;

        const desc = document.createElement('div');
        desc.className = 'cs-desc';
        desc.textContent = ch.desc;

        card.appendChild(preview);
        card.appendChild(name);
        card.appendChild(desc);
        card.appendChild(window.renderStatBars(ch, all, window.CHAR_STATS));
        container.appendChild(card);
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
    const allBoards = boardKeys.map((k) => BOARDS[k]);
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

        card.appendChild(preview);
        card.appendChild(name);
        card.appendChild(desc);
        card.appendChild(window.renderStatBars(board, allBoards, window.BOARD_STATS));
        container.appendChild(card);
    });
}

function updateBoardSelection() {
    document.querySelectorAll('.bs-card').forEach((card, i) => {
        card.classList.toggle('selected', i === selectedBoardIndex);
    });
}

function renderCountdown(count) {
    const countEl = document.getElementById('countdownText');
    if (countEl) {
        countEl.textContent = count > 0 ? String(count) : 'GO!';
        countEl.style.color = count > 0 ? '#ffe03a' : '#39ff6e';
    }
}

let trickTextTimer = 0;

/**
 * The banner is written once, when the trick lands, and then only held up.
 * It used to recompute the figure every frame from the CURRENT speed, so the
 * number on screen drifted away from the number actually banked as Carl slowed
 * down through the landing — the award is made once, at the speed he had.
 */
function showTrickText() {
    const el = document.getElementById('hudTrick');
    if (el) el.textContent = 'TRICK! +' + player.lastTrickScore;
    trickTextTimer = 40;
}

function updateTrickText() {
    const el = document.getElementById('hudTrick');
    if (!el) return;
    if (trickTextTimer > 0) {
        trickTextTimer--;
        el.style.opacity = 1;
    } else {
        el.style.opacity = 0;
    }
}

document.addEventListener('DOMContentLoaded', init);
document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameState === 'playing') {
        gameState = 'paused';
        showOverlay(pauseScreen);
        window.silenceAudioBeds();
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
