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
    const musicDisplay   = document.getElementById('musicDisplay');
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

    // Music. Every one of these guards exists because the game must stay
    // playable when the audio does not arrive: the shared module may not be on
    // the page, a 937KB fetch may fail, and decodeAudioData may reject.
    const MUTE_KEY = 'roderickTronMuted';
    let musicReady = false;      // decoded and ready to start
    let musicPlaying = false;    // a run is under way and the loop is running
    let musicWanted = false;     // a run started before the decode finished
    let musicMuted = false;
    let musicGen = 0;            // cancels a pending fade-out, see stopMusic()

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
        loadMutePreference();
        initAudio();          // deliberately not awaited — see initAudio()
        // A tab that was in the background hands back one enormous timestamp
        // gap. dt is capped anyway, but dropping the stale mark keeps even that
        // one frame honest.
        document.addEventListener('visibilitychange', () => { lastTime = 0; });
        requestAnimationFrame(gameLoop);
    }

    // ── Music ──────────────────────────────────────────────

    /**
     * Load and decode the track.
     *
     * Not awaited by init(): it fetches and decodes 937KB, and the title screen
     * must be interactive immediately. Whoever presses SPACE first either finds
     * the music ready or sets musicWanted, and startMusic() runs when the decode
     * lands. A failure here leaves the game entirely playable in silence.
     */
    async function initAudio() {
        if (typeof AdAudio === 'undefined') return;
        try {
            await AdAudio.init({
                music: {
                    url: CONFIG.MUSIC.URL,
                    volume: CONFIG.MUSIC.VOLUME,
                    fadeIn: CONFIG.MUSIC.FADE_IN,
                },
            });
            // Fixed upstream in adenosine-audio 0.3.1: the pause path now
            // banks the playhead and the resume path only restores what it
            // paused, so this no longer restarts the track from the top or
            // starts music the player never asked for. stopMusic() clears the
            // paused flag, so a run that ends while the tab is hidden does not
            // come back playing.
            AdAudio.handleVisibility({ pauseMusic: true });

            // Applied before playMusic(), which reads the muted flag to pick its
            // fade target — so a muted run starts silent rather than fading up
            // and being cut off.
            AdAudio.setMusicMuted(musicMuted, 0);
            musicReady = true;
            if (musicWanted) startMusic();
        } catch (e) {
            musicReady = false;
        }
    }

    /**
     * Begin the loop, at the start of a run.
     *
     * Browsers will not let an AudioContext leave 'suspended' without a user
     * gesture, so this is only ever reached from the keypress that starts the
     * run — never from page load or a visibility change.
     */
    function startMusic() {
        musicWanted = true;
        if (!musicReady) return;

        // Cancel any fade-out still in flight from the previous run's end.
        musicGen++;
        AdAudio.setMusicVolume(CONFIG.MUSIC.VOLUME, 0.01);
        if (musicPlaying) return;

        musicPlaying = true;
        try {
            AdAudio.playMusic(CONFIG.MUSIC.FADE_IN);
        } catch (e) {
            musicPlaying = false;
        }
    }

    /**
     * End the loop when the run ends.
     *
     * The track is 50 seconds and loops, so leaving it running under the FIN
     * panel means it plays on indefinitely with no game behind it. It fades
     * rather than cutting, and the generation counter is what stops a fast
     * retry from being silenced by the previous run's pending stop.
     */
    function stopMusic() {
        musicWanted = false;
        if (!musicReady || !musicPlaying) return;
        musicPlaying = false;

        const gen = ++musicGen;
        const fade = CONFIG.MUSIC.FADE_OUT;
        AdAudio.setMusicVolume(0, fade);
        setTimeout(() => {
            if (gen !== musicGen) return;   // a new run began; leave it playing
            try {
                AdAudio.stopMusic();
                // Restore the level, or playMusic() would fade up to zero next run.
                AdAudio.setMusicVolume(CONFIG.MUSIC.VOLUME, 0.01);
            } catch (e) { /* nothing to stop */ }
        }, fade * 1000 + 80);
    }

    function loadMutePreference() {
        try {
            musicMuted = localStorage.getItem(MUTE_KEY) === '1';
        } catch (e) {
            musicMuted = false;   // private browsing
        }
        updateMusicDisplay();
    }

    function toggleMute() {
        musicMuted = !musicMuted;
        if (musicReady) AdAudio.setMusicMuted(musicMuted);
        try {
            localStorage.setItem(MUTE_KEY, musicMuted ? '1' : '0');
        } catch (e) { /* best effort */ }
        updateMusicDisplay();
    }

    function updateMusicDisplay() {
        if (!musicDisplay) return;
        musicDisplay.classList.toggle('muted', musicMuted);
        musicDisplay.title = musicMuted ? 'music off (M)' : 'music on (M)';
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
        stopMusic();

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
        startMusic();
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
            // Typing initials — let the field have every key.
            if (document.activeElement === initialsInput) return;

            // Mute lives here rather than in the game loop so it also works on
            // the title and FIN screens, where update() is not running.
            if (e.code === 'KeyM') {
                e.preventDefault();
                toggleMute();
                return;
            }

            if (e.code !== 'Space') return;
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
