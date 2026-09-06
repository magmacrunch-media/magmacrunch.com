// ═══════════════════════════════════════════════
// Very Long Boards — Audio
//
// Every sound is synthesized with Web Audio. Nothing is loaded from disk, which
// keeps the whole game a folder of text.
//
// Two kinds of sound:
//
//   BEDS      loop forever and are ridden by volume and pitch — the wheels, the
//             wind, the truck rattle, the foot brake. They are wired up once and
//             never restarted; what changes is the gain and the playback rate.
//   ONE-SHOTS fire and finish — a kick, a trick, a near miss, a crash.
//
// The mix READS the game state once a frame rather than being told about it, so
// nothing else in the game has to remember the audio exists. One-shots are the
// exception, because a crash is an event and not a condition.
//
// Why the beds are raw white noise and the filters live in the graph: a looping
// buffer clicks at the seam whenever its last sample does not flow into its
// first. White noise has no such problem — the wrap is just one more random step
// between two random samples — and a BiquadFilterNode downstream of the loop is
// continuous, so it never sees a seam at all. (The Godot version of this game
// has to work much harder for the same result: it bakes its filters into the
// buffer, so it filters twice around it and keeps only the second lap.)
// ═══════════════════════════════════════════════

let audioCtx = null;
let masterGain = null;
let beds = null;
let noiseBuffer = null;

// Levels, as linear gain. Everything else is derived from these, so this object
// is the whole mix.
const MIX = {
    master: 0.9,
    wheels: 0.22,
    wind: 0.16,
    rattle: 0.30,
    scrub: 0.13,
    sfx: 1.0,
};

// Wheel and wind pitch at a standstill and at top speed. Rolling noise is
// broadly linear in speed; wind barely shifts, it mostly just gets louder.
const WHEEL_PITCH = [0.55, 1.7];
const WIND_PITCH = [0.85, 1.25];

// How fast a bed's gain chases its target, as a setTargetAtTime time constant.
// Small enough to feel immediate, large enough not to zipper.
const CHASE = 0.05;

function initAudio() {
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.log('Web Audio not available');
        return;
    }

    masterGain = audioCtx.createGain();
    masterGain.gain.value = MIX.master;
    masterGain.connect(audioCtx.destination);

    noiseBuffer = buildNoiseBuffer(3);
    beds = buildBeds();

    // A context starts suspended until a user gesture, and the gesture that
    // starts this game is the same keypress that leaves the title screen. Keep
    // listening until it actually reaches 'running' rather than unbinding after
    // the first attempt — resume() returns a promise and can be refused.
    const resume = () => {
        if (!audioCtx || audioCtx.state === 'running') return;
        audioCtx.resume().then(() => {
            if (audioCtx.state === 'running') {
                document.removeEventListener('keydown', resume);
                document.removeEventListener('pointerdown', resume);
                document.removeEventListener('touchstart', resume);
            }
        }).catch(() => {});
    };
    document.addEventListener('keydown', resume);
    document.addEventListener('pointerdown', resume);
    document.addEventListener('touchstart', resume);
}

/**
 * Deterministic white noise, a few seconds of it, shared by every bed.
 *
 * Seeded rather than Math.random so a given build always sounds the same — the
 * same reason the rest of the game generates its art from fixed seeds.
 */
function buildNoiseBuffer(seconds) {
    const n = Math.floor(audioCtx.sampleRate * seconds);
    const buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    let s = 0x9e3779b9;
    for (let i = 0; i < n; i++) {
        s ^= s << 13; s >>>= 0;
        s ^= s >>> 17;
        s ^= s << 5; s >>>= 0;
        d[i] = (s / 0xffffffff) * 2 - 1;
    }
    return buf;
}

/** One looping noise source through one filter into one gain. */
function makeBed(filterType, freq, q, gain) {
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    filter.Q.value = q;

    const g = audioCtx.createGain();
    g.gain.value = 0;

    src.connect(filter);
    filter.connect(g);
    g.connect(gain || masterGain);
    src.start();

    return { src, filter, gain: g };
}

function buildBeds() {
    // Urethane on tarmac: low and broad, so pitching it up with speed reads as
    // the wheels turning faster rather than as a filter sweep.
    const wheels = makeBed('lowpass', 700, 0.8);

    // Air past your ears.
    const wind = makeBed('highpass', 900, 0.6);

    // Truck rattle. Narrow and buzzy — this is hardware, not road surface — and
    // fed through a tremolo so it shimmies rather than hums. 11 Hz matches the
    // rate updatePlayerMesh shakes the board at, so the sound and the wobble you
    // can see are the same event.
    const rattleOut = audioCtx.createGain();
    rattleOut.gain.value = 1;
    rattleOut.connect(masterGain);

    const rattle = makeBed('bandpass', 180, 6, rattleOut);

    const trem = audioCtx.createOscillator();
    trem.type = 'sine';
    trem.frequency.value = 11;
    const tremDepth = audioCtx.createGain();
    tremDepth.gain.value = 0.55;
    trem.connect(tremDepth);
    tremDepth.connect(rattleOut.gain);
    trem.start();

    // A sole dragged on tarmac.
    const scrub = makeBed('bandpass', 2600, 1.2);

    return { wheels, wind, rattle, scrub };
}

/** Chase a bed's gain toward a target without zippering. */
function setBed(bed, target, pitch) {
    if (!bed) return;
    bed.gain.gain.setTargetAtTime(Math.max(0, target), audioCtx.currentTime, CHASE);
    if (pitch !== undefined) bed.src.playbackRate.value = Math.max(0.05, pitch);
}

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

/**
 * The whole ride mix, once a frame. Everything here is read off the game state;
 * nothing pushes into it.
 */
window.updateAudioMix = function(gameState) {
    if (!audioCtx || audioCtx.state !== 'running' || !beds) return;

    // Riding means the board is actually moving. The game-over screen keeps the
    // world on screen with player.speed frozen at whatever you crashed at, so
    // reading speed there would leave the wheels howling under the game-over
    // jingle for as long as the screen was up.
    const riding = (gameState === 'playing' || gameState === 'countdown')
        && player.kicked && !player.bailing;

    // player.speedFactor, not speed/maxSpeed: maxSpeed is a safety rail about
    // twice the fastest speed anyone actually rides at, so calibrating the mix
    // against it left the wind - which rides on v squared - at about 6% of its
    // level and inaudible, and the wheels using only the bottom third of their
    // pitch range.
    const v = riding ? clamp01(player.speedFactor) : 0;

    // Rolling noise is broadly linear in speed, but its loudness is not: the
    // square root has the wheels audible the moment Carl is moving rather than
    // leaving the first stretch of every run silent.
    setBed(beds.wheels, Math.sqrt(v) * MIX.wheels, lerp(WHEEL_PITCH[0], WHEEL_PITCH[1], v));

    // Wind on speed squared. It is the only bed that stays quiet at a crawl and
    // dominates flat out, which is what makes speed legible without the HUD.
    setBed(beds.wind, v * v * MIX.wind, lerp(WIND_PITCH[0], WIND_PITCH[1], v));

    // Rattle rises as stability falls, and only once past the wobble threshold —
    // so it arrives as a warning rather than as a background hum. Squared, so it
    // arrives late and then fast.
    let wob = 0;
    if (riding && player.stability < CONFIG.STABILITY_WOBBLE_AT) {
        wob = clamp01(1 - player.stability / CONFIG.STABILITY_WOBBLE_AT);
    }
    setBed(beds.rattle, wob * wob * MIX.rattle, lerp(0.85, 1.4, wob));

    // The foot brake, plus a hard lean — both are the wheels letting go.
    const carve = Math.abs(player.lean) * v;
    const scrub = riding ? Math.max(player.braking ? 0.3 + 0.7 * v : 0, carve * 0.5) : 0;
    setBed(beds.scrub, scrub * MIX.scrub);
};

/** Cut every bed at once — leaving a screen, or losing focus. */
window.silenceAudioBeds = function() {
    if (!audioCtx || !beds) return;
    for (const key of Object.keys(beds)) setBed(beds[key], 0);
};

// ═══════════════════════════════════════════════
//  ONE-SHOTS
// ═══════════════════════════════════════════════

/**
 * A pitched blip.
 *
 * The gain is ramped up over 4 ms rather than set outright: an oscillator that
 * starts at full level clicks, and an exponential ramp cannot start from zero,
 * so it starts from silence-adjacent and ends there too.
 */
function playTone(freq, duration, type, volume, delay) {
    if (!audioCtx || audioCtx.state !== 'running') return;

    const t0 = audioCtx.currentTime + (delay || 0);
    const vol = volume || 0.1;

    const osc = audioCtx.createOscillator();
    osc.type = type || 'square';
    osc.frequency.value = freq;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol * MIX.sfx, t0 + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
}

/** A burst of filtered noise. Impacts, scuffs, grit. */
function playNoise(duration, filterType, freq, q, volume, delay) {
    if (!audioCtx || audioCtx.state !== 'running' || !noiseBuffer) return;

    const t0 = audioCtx.currentTime + (delay || 0);

    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer;
    // Start somewhere arbitrary so repeated hits are not identical.
    const offset = Math.random() * (noiseBuffer.duration - duration - 0.05);

    const filter = audioCtx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    filter.Q.value = q || 1;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume * MIX.sfx, t0 + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start(t0, Math.max(0, offset), duration + 0.02);
}

/** A foot shoving off the road: a scuff over a thump through the deck. */
function playKickSound() {
    playNoise(0.20, 'bandpass', 1800, 0.9, 0.16);
    playTone(96, 0.16, 'sine', 0.12);
}

/** Board and rider parting company. */
function playCrashSound() {
    playTone(74, 0.45, 'sine', 0.16);
    playNoise(0.35, 'lowpass', 900, 1, 0.20);
    playNoise(0.22, 'bandpass', 2600, 0.8, 0.14, 0.03);
    playNoise(0.20, 'bandpass', 3400, 0.8, 0.10, 0.16);
    playNoise(0.35, 'highpass', 2000, 0.7, 0.06, 0.28);
}

function playTrickSound() {
    playTone(880, 0.10, 'sine', 0.09);
    playTone(1100, 0.09, 'sine', 0.07, 0.07);
    playTone(1320, 0.13, 'sine', 0.05, 0.14);
}

function playNearMissSound() {
    playTone(440, 0.09, 'sine', 0.07);
}

function playGameOverSound() {
    playTone(440, 0.16, 'square', 0.12);
    playTone(350, 0.16, 'square', 0.10, 0.15);
    playTone(260, 0.32, 'square', 0.09, 0.30);
}

function playSelectSound() {
    playTone(660, 0.07, 'square', 0.07);
}

function playBackSound() {
    playTone(440, 0.09, 'square', 0.07);
}

function playStartSound() {
    playTone(440, 0.10, 'sine', 0.09);
    playTone(660, 0.10, 'sine', 0.07, 0.10);
    playTone(880, 0.16, 'sine', 0.05, 0.20);
}

/** Crossing onto the leaderboard. */
function playHighScoreSound() {
    playTone(523.25, 0.12, 'sine', 0.09);
    playTone(659.26, 0.12, 'sine', 0.08, 0.11);
    playTone(783.99, 0.12, 'sine', 0.07, 0.22);
    playTone(1046.5, 0.30, 'sine', 0.07, 0.33);
}
