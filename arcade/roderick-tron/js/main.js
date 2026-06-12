// main.js — Roderick Tron | MagmaCrunch Media © 2026
// Game loop, state machine, init

(function () {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // UI elements
    const titleScreen    = document.getElementById('titleScreen');
    const hud            = document.getElementById('hud');
    const scoreDisplay   = document.getElementById('scoreDisplay');
    const livesDisplay   = document.getElementById('livesDisplay');
    const speedDisplay   = document.getElementById('speedDisplay');
    const gameOverOverlay = document.getElementById('gameOverOverlay');
    const finalScore     = document.getElementById('finalScore');
    const highScoresList = document.getElementById('highScoresList');
    const initialsPrompt = document.getElementById('initialsPrompt');
    const initialsInput  = document.getElementById('initialsInput');
    const initialsSubmit = document.getElementById('initialsSubmit');

    // Game state
    const STATE = { TITLE: 0, PLAYING: 1, GAME_OVER: 2 };
    let state = STATE.TITLE;
    let score = 0;
    let scrollSpeed = CONFIG.SCROLL_SPEED;
    let frameCount = 0;
    let highScores = [];
    let newHighScoreIndex = -1;

    // Modules (assigned after creation)
    let player, world, entities;

    // ── Init ───────────────────────────────────────────────
    function init() {
        Input.init();
        player = new Player();
        world = new World();
        entities = new Entities();
        loadHighScores();
        requestAnimationFrame(gameLoop);
    }

    // ── Game Loop ──────────────────────────────────────────
    function gameLoop() {
        requestAnimationFrame(gameLoop);

        if (state === STATE.TITLE) {
            drawTitle();
            return;
        }

        if (state === STATE.PLAYING) {
            update();
        }

        draw();
    }

    // ── Update ─────────────────────────────────────────────
    function update() {
        frameCount++;
        scrollSpeed = CONFIG.SCROLL_SPEED + frameCount * CONFIG.SCROLL_ACCEL;
        score = Math.floor(frameCount * scrollSpeed * 0.1);

        // Update modules
        world.update(scrollSpeed);
        player.update(world.rooftops);
        entities.update(scrollSpeed, player, world.rooftops, world.cameraX);

        // Shooting
        if (Input.shoot() && player.alive) {
            entities.spawnNote(player.x + CONFIG.PLAYER_W, player.y + CONFIG.PLAYER_H / 2 - CONFIG.NOTE_H / 2);
        }

        // Check gargoyle hits on player
        if (player.invincible <= 0 && player.alive) {
            const hit = entities.checkPlayerHit(player);
            if (hit) {
                player.loseLife();
                spawnHitParticles(player.x, player.y + CONFIG.PLAYER_H / 2);
                updateLivesDisplay();
                if (player.lives <= 0) {
                    gameOver();
                }
            }
        }

        // Check if player fell off screen
        if (player.y > CONFIG.CANVAS_H + 20 && player.alive) {
            player.loseLife();
            updateLivesDisplay();
            if (player.lives <= 0) {
                gameOver();
            } else {
                player.respawn(world.getNearestRoof(CONFIG.PLAYER_X));
            }
        }

        // Update HUD
        scoreDisplay.textContent = score + 'm';
        speedDisplay.textContent = scrollSpeed > 3 ? '♩ ♪ ♫ ♬' : scrollSpeed > 2.5 ? '♩ ♪ ♫' : '♩ ♪';
    }

    // ── Draw ───────────────────────────────────────────────
    function draw() {
        ctx.clearRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

        // Screen shake
        let shakeX = 0, shakeY = 0;
        if (player.shakeFrames > 0) {
            shakeX = (Math.random() - 0.5) * player.shakeFrames * 0.8;
            shakeY = (Math.random() - 0.5) * player.shakeFrames * 0.8;
            player.shakeFrames--;
        }

        ctx.save();
        ctx.translate(shakeX, shakeY);

        world.draw(ctx);
        entities.draw(ctx);
        player.draw(ctx);

        ctx.restore();
    }

    // ── Title Screen ───────────────────────────────────────
    function drawTitle() {
        // Animated background
        ctx.fillStyle = CONFIG.COLORS.sky;
        ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

        // Draw some parallax rooftops on title screen
        world.drawTitle(ctx, frameCount);
        frameCount++;
    }

    // ── Game Over ──────────────────────────────────────────
    function gameOver() {
        state = STATE.GAME_OVER;
        player.alive = false;
        hud.classList.remove('active');

        finalScore.textContent = score + 'm';

        // Check if new high score
        newHighScoreIndex = -1;
        for (let i = 0; i < highScores.length; i++) {
            if (score > highScores[i].score) {
                newHighScoreIndex = i;
                break;
            }
        }
        if (highScores.length < 5 && score > 0) {
            newHighScoreIndex = highScores.length;
        }

        renderHighScores();

        if (newHighScoreIndex >= 0) {
            initialsPrompt.style.display = 'block';
            initialsInput.value = '';
            setTimeout(() => initialsInput.focus(), 100);
        } else {
            initialsPrompt.style.display = 'none';
        }

        gameOverOverlay.classList.add('active');
    }

    // ── Restart ────────────────────────────────────────────
    function restartGame() {
        state = STATE.PLAYING;
        score = 0;
        scrollSpeed = CONFIG.SCROLL_SPEED;
        frameCount = 0;
        newHighScoreIndex = -1;

        player.reset();
        world.reset();
        entities.reset();

        gameOverOverlay.classList.remove('active');
        titleScreen.classList.add('hidden');
        hud.classList.add('active');
        updateLivesDisplay();
    }

    // ── High Scores ────────────────────────────────────────
    function loadHighScores() {
        try {
            const data = localStorage.getItem('roderickTronScores');
            highScores = data ? JSON.parse(data) : [];
        } catch (e) {
            highScores = [];
        }
    }

    function saveHighScores() {
        try {
            localStorage.setItem('roderickTronScores', JSON.stringify(highScores));
        } catch (e) {}
    }

    function renderHighScores() {
        let html = '';
        const scores = [...highScores];
        if (newHighScoreIndex >= 0) {
            scores.splice(newHighScoreIndex, 0, { initials: '???', score: score });
        }
        scores.slice(0, 5).forEach((s, i) => {
            const isNew = i === newHighScoreIndex;
            html += `<div class="score-row" style="${isNew ? 'color:var(--cyan)' : ''}">
                <span class="rank">${i + 1}.</span>
                <span class="initials">${s.initials}</span>
                <span class="pts">${s.score}m</span>
            </div>`;
        });
        highScoresList.innerHTML = html;
    }

    function submitInitials() {
        const initials = initialsInput.value.toUpperCase().trim() || 'AAA';
        highScores.splice(newHighScoreIndex, 0, { initials: initials.slice(0, 3), score: score });
        if (highScores.length > 5) highScores.length = 5;
        saveHighScores();
        initialsPrompt.style.display = 'none';
        renderHighScores();
    }

    // ── Lives Display ──────────────────────────────────────
    function updateLivesDisplay() {
        let html = '';
        for (let i = 0; i < CONFIG.MAX_LIVES; i++) {
            html += `<div class="hud-life${i >= player.lives ? ' lost' : ''}"></div>`;
        }
        livesDisplay.innerHTML = html;
    }

    // ── Particles (simple) ────────────────────────────────
    // Simple particle spawn for hits — delegated to entities module
    function spawnHitParticles(x, y) {
        for (let i = 0; i < 6; i++) {
            entities.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 15,
                color: CONFIG.COLORS.robotCyan,
            });
        }
    }

    // ── Input bindings ─────────────────────────────────────
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            if (state === STATE.TITLE) {
                restartGame();
            } else if (state === STATE.GAME_OVER && newHighScoreIndex < 0) {
                restartGame();
            }
        }
    });

    initialsSubmit.addEventListener('click', () => {
        submitInitials();
    });

    initialsInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitInitials();
        }
        e.stopPropagation();
    });

    // Prevent Space from triggering restart while typing initials
    initialsInput.addEventListener('focus', () => {
        document.removeEventListener('keydown', spaceHandler);
    });
    initialsInput.addEventListener('blur', () => {
        document.addEventListener('keydown', spaceHandler);
    });

    function spaceHandler(e) {
        if (e.code === 'Space') e.preventDefault();
    }

    // ── Start ──────────────────────────────────────────────
    init();
})();
