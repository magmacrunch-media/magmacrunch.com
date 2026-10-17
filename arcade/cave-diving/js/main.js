// main.js - cave diving (not even once) | MagmaCrunch Media (c) 2026
// The loop, the state machine, the surfaces, and the scoreboard.
//
// adenosine is used here as a canvas harness only. AdRPG.createGameLoop runs a
// FIXED step and this is a variable-timestep physics game - the dt-in-60fps-
// frames model roderick-tron uses - so the loop is a plain rAF, the same
// bypass makemecookies documents for AdAudio.

/* global CONFIG, Timeline, clamp01, World, Player, Entities, Input, Light, Renderer, Sfx,
          Music, MusicLogic, Title, diverPose, sprite */

(function () {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    if (typeof AdRPG !== 'undefined' && AdRPG.initCanvas) AdRPG.initCanvas(canvas);
    ctx.imageSmoothingEnabled = false;

    const titleScreen     = document.getElementById('titleScreen');
    const hud             = document.getElementById('hud');
    const airFill         = document.getElementById('airFill');
    const depthDisplay    = document.getElementById('depthDisplay');
    const pearlDisplay    = document.getElementById('pearlDisplay');
    const zoneDisplay     = document.getElementById('zoneDisplay');
    const musicDisplay    = document.getElementById('musicDisplay');
    const pauseOverlay    = document.getElementById('pauseOverlay');
    const gameOverOverlay = document.getElementById('gameOverOverlay');
    const overTitle       = document.getElementById('overTitle');
    const finalScore      = document.getElementById('finalScore');
    const finalBreakdown  = document.getElementById('finalBreakdown');
    const scoresBody      = document.getElementById('scoresBody');
    const initialsPrompt  = document.getElementById('initialsPrompt');
    const initialsInput   = document.getElementById('initialsInput');
    const initialsSubmit  = document.getElementById('initialsSubmit');
    const btnStart        = document.getElementById('btnStart');
    const btnResume       = document.getElementById('btnResume');
    const btnRetry        = document.getElementById('btnRetry');
    const btnSound        = document.getElementById('btnSound');
    const surfaceOverlay  = document.getElementById('surfaceOverlay');
    const surfaceName     = document.getElementById('surfaceName');
    const surfaceHaul     = document.getElementById('surfaceHaul');
    const btnBank         = document.getElementById('btnBank');
    const btnDiveOn       = document.getElementById('btnDiveOn');

    // SURFACE: floating at one of the ways out. The tank does not drain there,
    // and the choice is to bank or to dive on.
    const STATE = { TITLE: 0, PLAYING: 1, PAUSED: 2, OVER: 3, SURFACE: 4 };
    const GAME_ID = 'cave-diving';
    const MAX_DEPTH_M = 148;

    let state = STATE.TITLE;
    let lastTime = 0;
    let titleFrame = 0;
    let elapsed = 0;             // ms into the dive, for animation only
    let exitIndex = -1;          // the surface the diver is at, or -1
    let world, entities, player;
    let flashAmount = 0;
    let flashColor = '#ffffff';
    let siltNow = false;
    let heartAt = 0;
    let surfaced = false;
    let score = 0;
    let highScores = [];

    // ── The song ──────────────────────────────────────────────────────
    // An adaptive score cut from the one song, in music.js: the opening as
    // written, loops chosen by danger, and the record's own ending as the
    // finale, which plays when the diver banks. Not AdAudio, which hardcodes
    // loop = true over a whole file, and no longer a plain <audio>, which
    // cannot loop a section.
    const MUTE_KEY = 'caveDivingMuted';
    let music = null;
    let musicMuted = false;
    try { musicMuted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { musicMuted = false; }

    /**
     * Choose a format this browser can actually decode.
     * canPlayType answers '', 'maybe' or 'probably'. Empty is a definite no;
     * anything else is worth attempting.
     */
    function pickMusicSource() {
        const probe = document.createElement('audio');
        return CONFIG.MUSIC.SOURCES.find((s) => probe.canPlayType(s.type) !== '') || null;
    }

    /**
     * Audio failing must not itself be silent. The dive runs on the frame clock
     * either way, but the player is told why there is no music rather than left
     * to wonder - which is exactly how ogg-only playback went unnoticed on iOS
     * across four games.
     */
    let audioProblem = null;
    function noteAudioProblem(why) {
        if (audioProblem) return;          // the first cause is the useful one
        audioProblem = why;
        console.warn('cave diving audio:', why);
        const el = document.getElementById('audioWarning');
        if (el) { el.textContent = why; el.hidden = false; }
    }

    function initMusic() {
        try {
            const chosen = pickMusicSource();
            if (!chosen) {
                noteAudioProblem('no supported audio format - the dive runs silent');
                return;
            }
            // Sfx's context, so one unlock serves both. Created here, before
            // any gesture, it starts suspended; startDive() resumes it.
            const ac = Sfx.context();
            if (!ac) {
                noteAudioProblem('audio is unavailable in this browser - the dive runs silent');
                return;
            }
            const m = new Music();
            m.muted = musicMuted;
            // The song ran out before the diver surfaced: loops again.
            m.onEnded = () => { if (state === STATE.PLAYING) m.afterFinale(); };
            m.load(ac, chosen.url).then(() => {
                music = m;
                // Decoded after the dive began: come in where the dive is.
                // The opening is timed from the start of the dive.
                if (state === STATE.PLAYING || state === STATE.PAUSED || state === STATE.SURFACE) {
                    m.start(elapsed / 1000);
                    if (state === STATE.PAUSED) m.pause();
                }
            }).catch(() => {
                noteAudioProblem('the music file could not be loaded - the dive runs silent');
            });
        } catch (e) {
            noteAudioProblem('audio is unavailable in this browser - the dive runs silent');
        }
    }

    function setMuted(v) {
        musicMuted = v;
        try { localStorage.setItem(MUTE_KEY, v ? '1' : '0'); } catch (e) { /* private mode */ }
        if (music) {
            music.setMuted(v);
            // M is a gesture too, so it can recover a context the browser
            // refused to start: the "press M twice" the warning offers.
            if (state === STATE.PLAYING && music.ac.state === 'suspended') music.resume();
        }
        Sfx.setMuted(v);
        if (musicDisplay) musicDisplay.textContent = v ? 'M: OFF' : 'M: ON';
        if (btnSound) {
            btnSound.textContent = v ? 'SOUND: OFF' : 'SOUND: ON';
            btnSound.setAttribute('aria-pressed', v ? 'true' : 'false');
        }
    }

    // ── Lifecycle ─────────────────────────────────────────────────────

    function startDive() {
        world = new World(Date.now() & 0xffff);
        entities = new Entities(world);
        player = new Player();
        // In the water just under the entrance, head down, the way the title
        // card leaves you.
        world.placeAtExit(0, player);
        player.fx = 0; player.fy = 1;

        elapsed = 0;
        exitIndex = -1;
        flashAmount = 0;
        surfaced = false;
        score = 0;
        state = STATE.PLAYING;
        lastTime = 0;
        Input.clearPressed();

        document.body.classList.add('game-active');
        titleScreen.classList.add('hidden');
        gameOverOverlay.classList.add('hidden');
        surfaceOverlay.classList.add('hidden');
        hud.classList.remove('hidden');

        // This runs inside the gesture that started the dive, which is what
        // lets the shared context resume on iOS.
        const ac = Sfx.context();
        if (ac && ac.state === 'suspended') {
            const p = ac.resume();
            if (p) p.catch(() => noteAudioProblem('the browser blocked playback - press M twice'));
        }
        if (music) music.start(0);
    }

    /** What banking at exit i is worth right now. */
    function bankValue(i) {
        const mult = CONFIG.EXITS[i].mult;
        const pearlPts = player.pearls * CONFIG.PEARL_POINTS;
        const noHit = player.hits === 0 && player.pearls > 0 ? CONFIG.NOHIT_BONUS : 0;
        return { mult, pearlPts, noHit, total: (pearlPts + noHit) * mult };
    }

    /** Arrive at a surface: the tank stops draining and the choice is offered. */
    function surfaceAt(i) {
        state = STATE.SURFACE;
        exitIndex = i;
        Sfx.surface();
        const ex = CONFIG.EXITS[i];
        const v = bankValue(i);
        surfaceName.textContent = ex.name;
        surfaceHaul.textContent = 'tank ' + Math.round(player.air) + '   pearls ' + player.pearls +
            '   x' + ex.mult;
        btnBank.textContent = 'BANK ' + v.total.toLocaleString();
        surfaceOverlay.classList.remove('hidden');
        Input.clearPressed();
    }

    /** Back into the water from the surface, with the tank as it was. */
    function diveOn() {
        if (state !== STATE.SURFACE) return;
        world.placeAtExit(exitIndex, player);
        exitIndex = -1;
        state = STATE.PLAYING;
        lastTime = 0;
        surfaceOverlay.classList.add('hidden');
        Input.clearPressed();
    }

    /**
     * End the run. Banked: what you carry, times the exit you leave by, with
     * the record's own ending playing over the results. Drowned: nothing.
     */
    function endDive(banked) {
        if (state === STATE.OVER) return;
        const at = exitIndex;
        state = STATE.OVER;
        surfaced = !!banked;
        surfaceOverlay.classList.add('hidden');
        if (music) {
            if (surfaced) music.finale(); else music.fadeOut(1.5);
        }

        const rows = [];
        if (surfaced) {
            const v = bankValue(at);
            score = v.total;
            overTitle.textContent = 'OUT AT ' + CONFIG.EXITS[at].name;
            rows.push('pearls ' + player.pearls + ' x ' + CONFIG.PEARL_POINTS + ' = ' + v.pearlPts);
            if (v.noHit) rows.push('untouched +' + v.noHit);
            rows.push('x' + v.mult + ' for the way out');
        } else {
            score = 0;
            overTitle.textContent = 'OUT OF AIR';
            rows.push(player.pearls + ' pearls, lost with you');
            rows.push('depth ' + Math.round(fraction() * MAX_DEPTH_M) + 'm of ' + MAX_DEPTH_M + 'm');
        }
        overTitle.style.color = surfaced ? CONFIG.COLORS.accent : CONFIG.COLORS.danger;
        finalScore.textContent = score.toLocaleString();
        finalBreakdown.textContent = rows.join('   ');

        document.body.classList.remove('game-active');
        hud.classList.add('hidden');
        gameOverOverlay.classList.remove('hidden');
        submitAndRefresh();
    }

    // Distance, not time: the dive is a free swim.
    function fraction() { return world ? world.progress() : 0; }

    function togglePause() {
        if (state === STATE.PLAYING) {
            state = STATE.PAUSED;
            pauseOverlay.classList.remove('hidden');
            if (music) music.pause();
        } else if (state === STATE.PAUSED) {
            state = STATE.PLAYING;
            lastTime = 0;
            pauseOverlay.classList.add('hidden');
            if (music) music.resume();
        }
    }

    // ── Update ────────────────────────────────────────────────────────

    function update(dt, dtMs) {
        elapsed += dtMs;

        world.update(dt);

        // The diver moves on the map; the world then settles what that move
        // ran into, which tunnel they are now in, and where the camera goes.
        const stroke = Input.stroking();
        const ox = player.x, oy = player.y;
        player.update(dt, Input.axisX(), Input.axisY(), stroke, world, Sfx);
        const contact = world.move(player, ox, oy);
        world.track(player, dt, Sfx);
        world.camera(player, dt);
        const seg = world.segment();

        const r = entities.update(dt, world, player, Sfx, contact);
        siltNow = r.silt;
        if (r.hit) { flashAmount = 0.5; flashColor = CONFIG.COLORS.danger; }

        if (player.air < CONFIG.AIR_PANIC) {
            heartAt -= dt;
            if (heartAt <= 0) {
                Sfx.heart();
                // Faster as it runs out - the tell that the meter is nearly done
                heartAt = 34 + (player.air / CONFIG.AIR_PANIC) * 40;
            }
        }

        if (music) {
            music.tick(MusicLogic.dangerFrom({
                air: player.air,
                dark: seg.dark,
                narrow: seg.narrow,
                stun: player.stun,
                shake: world.shake,
                chase: world.chaseGap(player),
                debris: entities.debrisComing(world),
                silt: siltNow,
            }), dtMs / 1000);
        }

        if (flashAmount > 0) flashAmount -= 0.03 * dt;
        Input.clearPressed();

        if (player.dead) { endDive(false); return; }
        const ex = world.exitAt(player);
        if (ex >= 0) surfaceAt(ex);
    }

    /** At a surface: nothing drains and nothing moves, but the music plays on. */
    function updateSurface(dt, dtMs) {
        elapsed += dtMs;
        if (music) music.tick(0, dtMs / 1000);
        if (Input.wasPressed(' ') || Input.wasPressed('arrowdown') || Input.wasPressed('s')) diveOn();
        else if (Input.wasPressed('enter') || Input.wasPressed('b')) endDive(true);
        Input.clearPressed();
    }

    // ── Draw ──────────────────────────────────────────────────────────

    function drawDiver(above) {
        const pose = diverPose(player.fx, player.fy);
        const frame = player.kick > 0 ? 1 : 0;
        // The diver is on the map; the screen is wherever the camera is.
        const sc = world.toScreen(player.x, player.y);
        const ox = Math.round(sc.x - pose.w / 2);
        const oy = Math.round(sc.y - pose.h / 2);
        // A hit flickers the diver rather than tinting it: at this size a tint
        // is unreadable against the rock.
        if (player.stun > 0 && Math.floor(player.stun / 3) % 2 === 0 && !above) return null;
        sprite(ctx, pose.rows[frame], ox, oy, pose.flipX, pose.flipY, null, above ? 'VL' : null);
        return {
            x: ox + pose.lampX,
            y: oy + pose.lampY,
            dirX: player.fx,
            dirY: player.fy,
        };
    }

    function draw() {
        const f = fraction();
        const seg = world.segment();
        const sh = Renderer.shakeOffset(world.shake, Math.floor(elapsed / 16));

        ctx.save();
        ctx.translate(sh.x, sh.y);

        world.draw(ctx, elapsed * 0.06);
        Renderer.caustics(ctx, elapsed * 0.06, Math.max(0, 1 - f * 7));
        entities.draw(ctx, world);

        const lampPos = drawDiver(false);

        // Lamp bloom goes UNDER the mask so the mask can shape it.
        let radius = Timeline.lampRadius(seg);
        if (siltNow) radius *= CONFIG.SILT_LAMP_MULT;
        if (lampPos) {
            Light.beam(ctx, { x: lampPos.x, y: lampPos.y, dirX: player.fx, dirY: player.fy, radius });
            Renderer.glow(ctx, lampPos.x, lampPos.y, CONFIG.LAMP_HALO * 1.6, '255,243,196', 0.16);
        }

        // Ambient darkness is high from the first meter - it is a cave, and a
        // lit cave that gradually dims is a worse read than a dark one that
        // stays dark. What actually shrinks with depth is the LAMP RADIUS.
        // The first pass scaled ambient by seg.dark directly and gave the
        // entry an alpha of 0.26, which is daylight.
        const dark = CONFIG.DARK_ALPHA * (0.66 + 0.34 * clamp01(seg.dark));
        Light.draw(ctx, lampPos ? {
            x: lampPos.x, y: lampPos.y,
            dirX: player.fx, dirY: player.fy,
            radius,
        } : null, entities.lights(world).concat(world.lights()), dark);

        // So does daylight: an exit is seen by its own light, not the lamp's.
        world.drawDaylight(ctx, elapsed * 0.06);

        // Visor and lamp survive the dark.
        drawDiver(true);
        if (lampPos) {
            ctx.fillStyle = CONFIG.COLORS.lamp;
            ctx.fillRect(Math.round(lampPos.x) - 1, Math.round(lampPos.y) - 1, 2, 2);
        }

        ctx.restore();

        const panic = player.air < CONFIG.AIR_PANIC
            ? 0.5 + 0.22 * Math.sin(elapsed * 0.012)
            : 0.4;
        Renderer.vignette(ctx, panic);
        Renderer.flash(ctx, flashAmount, flashColor);
    }

    function drawTitle() {
        titleFrame++;
        Title.draw(ctx, titleFrame);
    }

    function drawHud() {
        const f = fraction();
        const seg = world.segment();
        const pct = Math.max(0, player.air) / CONFIG.AIR_MAX;
        airFill.style.width = (pct * 100).toFixed(1) + '%';
        airFill.style.background = player.air < CONFIG.AIR_PANIC
            ? CONFIG.COLORS.danger : CONFIG.COLORS.air;
        depthDisplay.textContent = Math.round(f * MAX_DEPTH_M) + 'm';
        pearlDisplay.textContent = String(player.pearls);
        zoneDisplay.textContent = seg.label;
    }

    // ── Scores ────────────────────────────────────────────────────────

    async function loadScores() {
        if (typeof scoreClient === 'undefined') return;
        try { highScores = (await scoreClient.load(GAME_ID)) || []; }
        catch (e) { highScores = []; }
        renderScores();
    }

    function renderScores() {
        if (!scoresBody) return;
        if (!highScores.length) {
            scoresBody.innerHTML = '<tr><td colspan="3">no dives logged</td></tr>';
            return;
        }
        scoresBody.innerHTML = highScores.slice(0, 8).map((s, i) =>
            '<tr><td>' + (i + 1) + '</td><td>' + String(s.name || '---').slice(0, 3).toUpperCase() +
            '</td><td>' + Number(s.score || 0).toLocaleString() + '</td></tr>'
        ).join('');
    }

    async function submitAndRefresh() {
        initialsPrompt.classList.toggle('hidden', score <= 0);
        await loadScores();
    }

    async function saveScore() {
        const name = (initialsInput.value || 'AAA').toUpperCase().slice(0, 3);
        initialsPrompt.classList.add('hidden');
        if (typeof scoreClient === 'undefined') return;
        try {
            await scoreClient.save(GAME_ID, name, score, {
                pearls: player.pearls,
                air: Math.round(player.air),
                surfaced,
            });
        } catch (e) { /* offline: the client already kept a local copy */ }
        await loadScores();
    }

    // ── Loop ──────────────────────────────────────────────────────────

    function loop(ts) {
        requestAnimationFrame(loop);

        if (state === STATE.TITLE) { drawTitle(); lastTime = ts; return; }
        if (state === STATE.OVER) { lastTime = ts; return; }

        const rawMs = lastTime ? ts - lastTime : 16.667;
        lastTime = ts;
        const dtMs = Math.min(rawMs, 33.4);
        const dt = dtMs / 16.667;

        if (state === STATE.PLAYING) update(dt, dtMs);
        else if (state === STATE.SURFACE) updateSurface(dt, dtMs);
        if (state === STATE.PLAYING || state === STATE.PAUSED || state === STATE.SURFACE) { draw(); drawHud(); }
    }

    // ── Init ──────────────────────────────────────────────────────────

    function init() {
        // Input.init() registers before the UI handler below on purpose: the
        // Space that starts a dive must not also stroke on frame 1, which is
        // what clearPressed() in startDive() finishes.
        Input.init();
        Input.initTouch(canvas);
        Light.init();
        Renderer.bindResize(canvas);
        initMusic();
        setMuted(musicMuted);

        window.addEventListener('keydown', (e) => {
            const k = e.key.toLowerCase();
            if (k === 'm') setMuted(!musicMuted);
            if ((k === 'escape' || k === 'p') && (state === STATE.PLAYING || state === STATE.PAUSED)) {
                togglePause();
            }
            if ((k === ' ' || k === 'enter') && state === STATE.TITLE) startDive();
            if ((k === ' ' || k === 'enter') && state === STATE.OVER &&
                initialsPrompt.classList.contains('hidden')) startDive();
        });

        // A stale timestamp after a tab switch would otherwise arrive as one
        // enormous dt and teleport the diver into a wall.
        document.addEventListener('visibilitychange', () => { lastTime = 0; });

        if (btnStart) btnStart.addEventListener('pointerdown', (e) => { e.preventDefault(); startDive(); });
        if (btnResume) btnResume.addEventListener('pointerdown', (e) => { e.preventDefault(); togglePause(); });
        if (btnRetry) btnRetry.addEventListener('pointerdown', (e) => { e.preventDefault(); startDive(); });
        if (btnBank) btnBank.addEventListener('pointerdown', (e) => { e.preventDefault(); if (state === STATE.SURFACE) endDive(true); });
        if (btnDiveOn) btnDiveOn.addEventListener('pointerdown', (e) => { e.preventDefault(); diveOn(); });
        if (btnSound) {
            btnSound.addEventListener('pointerdown', (e) => {
                // stopPropagation so tapping the toggle does not also
                // start the dive through the title screen's own handler.
                e.preventDefault(); e.stopPropagation(); setMuted(!musicMuted);
            });
        }
        if (initialsSubmit) initialsSubmit.addEventListener('click', saveScore);
        if (initialsInput) {
            initialsInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.stopPropagation(); saveScore(); }
            });
        }

        loadScores();
        requestAnimationFrame(loop);
    }

    init();
})();
