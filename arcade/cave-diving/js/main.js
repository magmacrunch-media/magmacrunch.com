// main.js — cave diving (not even once) | MagmaCrunch Media (c) 2026
// The loop, the state machine, the song clock, and the scoreboard.
//
// adenosine is used here as a canvas harness only. AdRPG.createGameLoop runs a
// FIXED step and this is a variable-timestep physics game - the dt-in-60fps-
// frames model roderick-tron uses - so the loop is a plain rAF, the same
// bypass makemecookies documents for AdAudio.

/* global CONFIG, Timeline, clamp01, World, Player, Entities, Input, Light, Renderer, Sfx, diverPose, sprite */

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

    const STATE = { TITLE: 0, PLAYING: 1, PAUSED: 2, OVER: 3 };
    const GAME_ID = 'cave-diving';
    const MAX_DEPTH_M = 148;

    let state = STATE.TITLE;
    let lastTime = 0;
    let titleFrame = 0;
    let elapsed = 0;             // ms into the dive
    let diveMs = CONFIG.DIVE_MS_FALLBACK;
    let world, entities, player;
    let flashAmount = 0;
    let flashColor = '#ffffff';
    let siltNow = false;
    let heartAt = 0;
    let surfaced = false;
    let score = 0;
    let highScores = [];

    // ── The song ──────────────────────────────────────────────────────
    // A plain <audio> element, not AdAudio: AdAudio hardcodes loop = true and
    // exposes neither `ended` nor a playhead, and a run that IS one play of a
    // track needs all three.
    const MUTE_KEY = 'caveDivingMuted';
    let music = null;
    let musicMuted = false;
    try { musicMuted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { musicMuted = false; }

    function initMusic() {
        try {
            music = new Audio(CONFIG.MUSIC.URL);
            music.loop = false;
            music.preload = 'auto';
            music.volume = musicMuted ? 0 : CONFIG.MUSIC.VOLUME;
            // Ogg carries no duration header, so the browser estimates one from
            // bitrate while the file streams and corrects it once buffered.
            // Reading it only at loadedmetadata puts every segment boundary in
            // the wrong place.
            const sync = () => {
                if (Number.isFinite(music.duration) && music.duration > 1) {
                    diveMs = music.duration * 1000;
                }
            };
            music.addEventListener('loadedmetadata', sync);
            music.addEventListener('durationchange', sync);
            music.addEventListener('ended', () => { if (state === STATE.PLAYING) endDive(true); });
            music.addEventListener('error', () => { music = null; });
        } catch (e) {
            music = null;
        }
    }

    function setMuted(v) {
        musicMuted = v;
        try { localStorage.setItem(MUTE_KEY, v ? '1' : '0'); } catch (e) { /* private mode */ }
        if (music) music.volume = v ? 0 : CONFIG.MUSIC.VOLUME;
        Sfx.setMuted(v);
        if (musicDisplay) musicDisplay.textContent = v ? 'M: OFF' : 'M: ON';
    }

    // ── Lifecycle ─────────────────────────────────────────────────────

    function startDive() {
        world = new World(Date.now() & 0xffff);
        entities = new Entities(world.entityRng);
        player = new Player();
        player.x = CONFIG.CANVAS_W / 2;
        player.y = CONFIG.CANVAS_H * CONFIG.RAIL_POS;
        player.fx = 0; player.fy = 1;

        elapsed = 0;
        flashAmount = 0;
        surfaced = false;
        score = 0;
        state = STATE.PLAYING;
        lastTime = 0;
        Input.clearPressed();

        document.body.classList.add('game-active');
        titleScreen.classList.add('hidden');
        gameOverOverlay.classList.add('hidden');
        hud.classList.remove('hidden');

        if (music) {
            try { music.currentTime = 0; const p = music.play(); if (p) p.catch(() => {}); }
            catch (e) { /* autoplay refused; the dive still runs on the frame clock */ }
        }
    }

    function endDive(reachedSurface) {
        if (state === STATE.OVER) return;
        state = STATE.OVER;
        surfaced = !!reachedSurface;
        if (music) { try { music.pause(); } catch (e) { /* nothing to stop */ } }
        if (surfaced) Sfx.surface();

        const air = Math.round(player.air);
        const airPts = surfaced ? air * CONFIG.AIR_POINTS : 0;
        const pearlPts = player.pearls * CONFIG.PEARL_POINTS;
        const noHit = surfaced && player.hits === 0 ? CONFIG.NOHIT_BONUS : 0;
        const surf = surfaced ? CONFIG.SURFACE_BONUS : 0;
        score = airPts + pearlPts + noHit + surf;

        overTitle.textContent = surfaced ? 'YOU SURFACED' : 'OUT OF AIR';
        overTitle.style.color = surfaced ? CONFIG.COLORS.accent : CONFIG.COLORS.danger;
        finalScore.textContent = score.toLocaleString();
        const rows = [];
        rows.push('air ' + air + ' x ' + CONFIG.AIR_POINTS + ' = ' + airPts);
        rows.push('pearls ' + player.pearls + ' x ' + CONFIG.PEARL_POINTS + ' = ' + pearlPts);
        if (surf) rows.push('surfaced +' + surf);
        if (noHit) rows.push('untouched +' + noHit);
        if (!surfaced) rows.push('depth ' + Math.round(fraction() * MAX_DEPTH_M) + 'm of ' + MAX_DEPTH_M + 'm');
        finalBreakdown.textContent = rows.join('   ');

        document.body.classList.remove('game-active');
        hud.classList.add('hidden');
        gameOverOverlay.classList.remove('hidden');
        submitAndRefresh();
    }

    function fraction() { return clamp01(elapsed / diveMs); }

    function togglePause() {
        if (state === STATE.PLAYING) {
            state = STATE.PAUSED;
            pauseOverlay.classList.remove('hidden');
            if (music) { try { music.pause(); } catch (e) { /* ignore */ } }
        } else if (state === STATE.PAUSED) {
            state = STATE.PLAYING;
            lastTime = 0;
            pauseOverlay.classList.add('hidden');
            if (music) { try { const p = music.play(); if (p) p.catch(() => {}); } catch (e) { /* ignore */ } }
        }
    }

    // ── Update ────────────────────────────────────────────────────────

    function update(dt, dtMs) {
        elapsed += dtMs;
        // The frame clock leads; the song only corrects it. That way the dive
        // is identical whether or not the audio arrived, and a stalled buffer
        // cannot freeze the level.
        if (music && !music.paused && Number.isFinite(music.currentTime) && music.currentTime > 0.2) {
            elapsed += (music.currentTime * 1000 - elapsed) * 0.05;
        }

        const f = fraction();
        const seg = Timeline.segmentAt(f);

        world.update(dt, dtMs, f, Sfx);

        const stroke = Input.stroking();
        player.update(dt, Input.axisX(), Input.axisY(), stroke, world, Sfx);
        world.confine(player);

        const r = entities.update(dt, world, player, seg, f, Sfx);
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

        if (flashAmount > 0) flashAmount -= 0.03 * dt;
        Input.clearPressed();

        if (player.dead) { endDive(false); return; }
        if (f >= 1) { endDive(true); }
    }

    // ── Draw ──────────────────────────────────────────────────────────

    function drawDiver(above) {
        const pose = diverPose(player.fx, player.fy);
        const frame = player.kick > 0 ? 1 : 0;
        const ox = Math.round(player.x - pose.w / 2);
        const oy = Math.round(player.y - pose.h / 2);
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
        const seg = Timeline.segmentAt(f);
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

        // Ambient darkness is high from the first metre - it is a cave, and a
        // lit cave that gradually dims is a worse read than a dark one that
        // stays dark. What actually shrinks with depth is the LAMP RADIUS.
        // The first pass scaled ambient by seg.dark directly and gave the
        // entry an alpha of 0.26, which is daylight.
        const dark = CONFIG.DARK_ALPHA * (0.66 + 0.34 * clamp01(seg.dark));
        Light.draw(ctx, lampPos ? {
            x: lampPos.x, y: lampPos.y,
            dirX: player.fx, dirY: player.fy,
            radius,
        } : null, entities.lights(world), dark);

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
        const g = ctx.createLinearGradient(0, 0, 0, CONFIG.CANVAS_H);
        g.addColorStop(0, '#0a2430');
        g.addColorStop(1, CONFIG.COLORS.waterDeep);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
        Renderer.caustics(ctx, titleFrame, 1);

        ctx.fillStyle = CONFIG.COLORS.rock;
        for (let i = 0; i < 6; i++) {
            const w = 30 + i * 9;
            ctx.fillRect(0, CONFIG.CANVAS_H - 34 - i * 5, w, 6);
            ctx.fillRect(CONFIG.CANVAS_W - w, CONFIG.CANVAS_H - 30 - i * 6, w, 6);
        }

        const bob = Math.sin(titleFrame * 0.04) * 4;
        const pose = diverPose(1, 0.25);
        sprite(ctx, pose.rows[Math.floor(titleFrame / 22) % 2],
            Math.round(CONFIG.CANVAS_W / 2 - 8),
            Math.round(CONFIG.CANVAS_H / 2 - 6 + bob),
            pose.flipX, pose.flipY);
        Renderer.glow(ctx, CONFIG.CANVAS_W / 2 + 8, CONFIG.CANVAS_H / 2 - 2 + bob, 54, '255,243,196', 0.16);
        Renderer.vignette(ctx, 0.55);
    }

    function drawHud() {
        const f = fraction();
        const seg = Timeline.segmentAt(f);
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
        if (state === STATE.PLAYING || state === STATE.PAUSED) { draw(); drawHud(); }
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
