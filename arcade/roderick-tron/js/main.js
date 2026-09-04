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
    const comboDisplay   = document.getElementById('comboDisplay');
    const gameOverOverlay = document.getElementById('gameOverOverlay');
    const finalScore     = document.getElementById('finalScore');
    const finalDistance  = document.getElementById('finalDistance');
    const highScoresList = document.getElementById('highScoresList');
    const initialsPrompt = document.getElementById('initialsPrompt');
    const initialsInput  = document.getElementById('initialsInput');
    const initialsSubmit = document.getElementById('initialsSubmit');

    // Game state
    const STATE = { TITLE: 0, PLAYING: 1, GAME_OVER: 2 };
    const MILESTONE = 500;   // metres between distance markers

    let state = STATE.TITLE;
    let titleFrame = 0;
    let scrollSpeed = CONFIG.SCROLL_MIN;
    let difficulty = 0;
    let distance = 0;        // metres run
    let bonusScore = 0;      // points from gargoyles, before distance is added
    let score = 0;
    let combo = 0;
    let comboTimer = 0;
    let bestCombo = 0;
    let kills = 0;
    let nextMilestone = MILESTONE;
    let flashAmount = 0;
    let flashColor = '#ffffff';
    let highScores = [];
    let newHighScoreIndex = -1;
    let lastTime = 0;

    let player, world, entities;

    // ── Init ───────────────────────────────────────────────
    function init() {
        // Input.init() must register its keydown listener BEFORE bindUI() does.
        // Listeners on the same target fire in registration order, and the Space
        // that starts a run reaches both: Input records it as "just pressed",
        // and bindUI's handler calls restartGame(), which clears that record. In
        // the other order the clear happens first and the press survives into
        // the run's first frame, so Roderick jumps the instant he sets off.
        Input.init();
        bindUI();
        Renderer.bindResize(canvas);
        player = new Player();
        world = new World();
        entities = new Entities();
        loadHighScores();
        renderHighScores();
        // A tab that was in the background hands back one enormous timestamp
        // gap. dt is capped anyway, but dropping the stale mark keeps even that
        // one frame honest.
        document.addEventListener('visibilitychange', () => { lastTime = 0; });
        requestAnimationFrame(gameLoop);
    }

    // ── Game Loop ──────────────────────────────────────────
    function gameLoop(timestamp) {
        requestAnimationFrame(gameLoop);

        if (state === STATE.TITLE) {
            titleFrame++;
            world.drawTitle(ctx, titleFrame);
            Renderer.vignette(ctx);
            lastTime = timestamp;
            return;
        }

        // dt is in 60fps frames: 1.0 at 60Hz, 0.5 at 120Hz. Every per-frame
        // quantity in the game is scaled by it, so the simulation runs at the
        // same rate on any display.
        const dt = lastTime ? Math.min((timestamp - lastTime) / 16.667, 2.0) : 1.0;
        lastTime = timestamp;

        if (state === STATE.PLAYING) update(dt);
        draw();
    }

    // ── Update ─────────────────────────────────────────────
    function update(dt) {
        difficulty = Difficulty.at(distance);
        scrollSpeed = Difficulty.scrollSpeed(difficulty);

        world.update(scrollSpeed, dt, difficulty);
        distance = world.metres();
        player.update(world.rooftops, world.cameraX, dt);
        entities.update(world, player, dt);

        if (Input.shoot() && player.alive) {
            entities.spawnNote(
                player.x + CONFIG.PLAYER_W,
                player.y + CONFIG.PLAYER_H / 2 - CONFIG.NOTE_H / 2,
                scrollSpeed
            );
        }

        scoreKills();
        updateCombo(dt);
        checkHazards();

        if (flashAmount > 0) flashAmount -= 0.06 * dt;

        if (distance >= nextMilestone) {
            nextMilestone += MILESTONE;
            flashAmount = 0.22;
            flashColor = CONFIG.COLORS.robotCyan;
        }

        score = Math.floor(distance) + bonusScore;
        scoreDisplay.textContent = score + 'm';
        speedDisplay.textContent = difficulty > 0.66 ? '♩ ♪ ♫ ♬'
                                 : difficulty > 0.33 ? '♩ ♪ ♫'
                                 : '♩ ♪';
    }

    /** Award anything killed this frame and advance the streak. */
    function scoreKills() {
        for (let i = 0; i < entities.killsThisFrame.length; i++) {
            const k = entities.killsThisFrame[i];
            kills++;
            combo = Math.min(combo + 1, CONFIG.COMBO_MAX);
            comboTimer = CONFIG.COMBO_WINDOW;
            if (combo > bestCombo) bestCombo = combo;

            const base = k.kind === 'flyer' ? CONFIG.FLYER_POINTS : CONFIG.KILL_POINTS;
            const points = base * combo;
            bonusScore += points;

            entities.addPopup(
                k.x, k.y - 4,
                combo > 1 ? '+' + points + ' x' + combo : '+' + points,
                combo > 1 ? CONFIG.COLORS.gasLamp : CONFIG.COLORS.noteWhite
            );
        }
    }

    /** A streak lapses if you go too long without a kill. */
    function updateCombo(dt) {
        if (comboTimer > 0) {
            comboTimer -= dt;
            if (comboTimer <= 0) combo = 0;
        }
        if (combo > 1) {
            comboDisplay.textContent = 'x' + combo;
            comboDisplay.style.opacity = Math.min(1, comboTimer / 40);
        } else {
            comboDisplay.style.opacity = 0;
        }
    }

    /** Gargoyle contact and falling off the bottom of the screen. */
    function checkHazards() {
        if (!player.alive) return;

        if (player.invincible <= 0) {
            const hit = entities.checkPlayerHit(player);
            if (hit) {
                takeHit(player.x + CONFIG.PLAYER_W / 2, player.y + CONFIG.PLAYER_H / 2);
                if (player.lives <= 0) return gameOver();
            }
        }

        if (player.y > CONFIG.CANVAS_H + 20) {
            takeHit(player.x + CONFIG.PLAYER_W / 2, CONFIG.CANVAS_H - 10);
            if (player.lives <= 0) return gameOver();
            // Put him back on something solid, scrolling the camera forward if
            // the gap he fell into is still underneath.
            player.respawn(world.respawnSurface(CONFIG.PLAYER_X, CONFIG.PLAYER_W));
        }
    }

    function takeHit(x, y) {
        player.loseLife();
        entities.spawnPlayerHitParticles(x, y);
        combo = 0;
        comboTimer = 0;
        flashAmount = 0.3;
        flashColor = CONFIG.COLORS.lifeHeart;
        updateLivesDisplay();
    }

    // ── Draw ───────────────────────────────────────────────
    function draw() {
        ctx.clearRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

        const shake = Renderer.shakeOffset(player.shakeFrames);
        ctx.save();
        ctx.translate(shake.x, shake.y);

        world.draw(ctx);
        entities.draw(ctx);
        player.draw(ctx);

        ctx.restore();

        Renderer.vignette(ctx);
        Renderer.flash(ctx, flashAmount, flashColor);
    }

    // ── Game Over ──────────────────────────────────────────
    function gameOver() {
        state = STATE.GAME_OVER;
        player.alive = false;
        hud.classList.remove('active');

        finalScore.textContent = score + 'm';
        finalDistance.textContent =
            Math.floor(distance) + 'm RUN · ' + kills + ' FELLED'
            + (bestCombo > 1 ? ' · BEST x' + bestCombo : '');

        newHighScoreIndex = -1;
        for (let i = 0; i < highScores.length; i++) {
            if (score > highScores[i].score) {
                newHighScoreIndex = i;
                break;
            }
        }
        if (newHighScoreIndex < 0 && highScores.length < 5 && score > 0) {
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
        scrollSpeed = CONFIG.SCROLL_MIN;
        difficulty = 0;
        distance = 0;
        bonusScore = 0;
        score = 0;
        combo = 0;
        comboTimer = 0;
        bestCombo = 0;
        kills = 0;
        nextMilestone = MILESTONE;
        flashAmount = 0;
        newHighScoreIndex = -1;
        lastTime = 0;

        player.reset();
        world.reset();
        entities.reset();
        // The Space that started the run is still queued as "just pressed" —
        // without this, Roderick jumps on his own first frame every time.
        Input.clearJustPressed();

        // Stand him on the opening roof rather than dropping him in from y=100.
        player.respawn(world.respawnSurface(CONFIG.PLAYER_X, CONFIG.PLAYER_W));

        gameOverOverlay.classList.remove('active');
        titleScreen.classList.add('hidden');
        hud.classList.add('active');
        comboDisplay.style.opacity = 0;
        updateLivesDisplay();
    }

    // ── High Scores ────────────────────────────────────────
    function loadHighScores() {
        try {
            const data = localStorage.getItem('roderickTronScores');
            const parsed = data ? JSON.parse(data) : [];
            highScores = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            highScores = [];
        }
    }

    function saveHighScores() {
        try {
            localStorage.setItem('roderickTronScores', JSON.stringify(highScores));
        } catch (e) { /* private browsing — scores are best-effort */ }
    }

    function renderHighScores() {
        const scores = [...highScores];
        if (newHighScoreIndex >= 0) {
            scores.splice(newHighScoreIndex, 0, { initials: '???', score: score });
        }
        if (!scores.length) {
            highScoresList.innerHTML = '<div class="score-row empty">NO RUNS YET</div>';
            return;
        }
        let html = '';
        scores.slice(0, 5).forEach((s, i) => {
            const isNew = i === newHighScoreIndex;
            html += '<div class="score-row' + (isNew ? ' fresh' : '') + '">'
                  + '<span class="rank">' + (i + 1) + '.</span>'
                  + '<span class="initials">' + escapeHtml(s.initials) + '</span>'
                  + '<span class="pts">' + s.score + 'm</span>'
                  + '</div>';
        });
        highScoresList.innerHTML = html;
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
        })[c]);
    }

    function submitInitials() {
        if (newHighScoreIndex < 0) return;
        const initials = initialsInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'AAA';
        highScores.splice(newHighScoreIndex, 0, { initials: initials.slice(0, 3), score: score });
        if (highScores.length > 5) highScores.length = 5;
        saveHighScores();
        newHighScoreIndex = -1;
        initialsPrompt.style.display = 'none';
        initialsInput.blur();
        renderHighScores();
    }

    // ── Lives Display ──────────────────────────────────────
    function updateLivesDisplay() {
        let html = '';
        for (let i = 0; i < CONFIG.MAX_LIVES; i++) {
            html += '<div class="hud-life' + (i >= player.lives ? ' lost' : '') + '"></div>';
        }
        livesDisplay.innerHTML = html;
    }

    // ── Input bindings ─────────────────────────────────────
    function bindUI() {
        document.addEventListener('keydown', (e) => {
            if (e.code !== 'Space') return;
            // Typing initials — let the field have the key.
            if (document.activeElement === initialsInput) return;
            e.preventDefault();
            if (state === STATE.TITLE) {
                restartGame();
            } else if (state === STATE.GAME_OVER && newHighScoreIndex < 0) {
                restartGame();
            }
        });

        initialsSubmit.addEventListener('click', submitInitials);

        initialsInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitInitials();
            }
            e.stopPropagation();
        });
    }

    // ── Start ──────────────────────────────────────────────
    init();
})();
