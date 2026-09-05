// config.js — Roderick Tron | MagmaCrunch Media © 2026
// All constants, palette, difficulty curve

const CONFIG = {
    CANVAS_W: 480,
    CANVAS_H: 270,

    // Physics.
    // Every per-frame value below is expressed in "units per 60fps frame" and is
    // multiplied by dt at the point of use, so the game runs identically on a
    // 60Hz and a 144Hz display.
    GRAVITY: 0.5,
    JUMP_FORCE: -9,
    MAX_FALL: 7,
    JUMP_CUT: 0.5,          // vy multiplier when the jump key is released early
    COYOTE_FRAMES: 6,       // grace period to still jump after walking off an edge
    JUMP_BUFFER_FRAMES: 8,  // a jump pressed this soon before landing still fires

    // Airtime of a full-height jump, in frames: 2 * |JUMP_FORCE| / GRAVITY.
    // The gap generator uses this to guarantee every gap stays clearable.
    get JUMP_AIRTIME() { return 2 * Math.abs(this.JUMP_FORCE) / this.GRAVITY; },

    // Auto-scroll. Speed ramps from MIN to MAX across DIFFICULTY_DISTANCE metres
    // and then holds — the old build accelerated forever and eventually outran
    // any possible reaction time.
    SCROLL_MIN: 2,
    SCROLL_MAX: 4.6,
    DIFFICULTY_DISTANCE: 2600,   // metres to reach full difficulty

    // Player
    PLAYER_X: 80,
    PLAYER_W: 16,
    PLAYER_H: 24,

    // Rooftops. The *_EARLY / *_LATE pairs are interpolated by difficulty.
    ROOF_W_EARLY_MIN: 130,
    ROOF_W_EARLY_MAX: 200,
    ROOF_W_LATE_MIN: 70,
    ROOF_W_LATE_MAX: 140,
    ROOF_GAP_MIN: 34,
    // Widest gap allowed, as a fraction of how far the player travels during one
    // full jump (JUMP_AIRTIME * scrollSpeed). Below 1.0 by a wide margin so a
    // late jump still clears; the cap is what keeps the game fair as it speeds up.
    GAP_SAFETY: 0.52,
    GAP_HARD_CAP: 96,
    ROOF_HEIGHT_VAR_EARLY: 30,
    ROOF_HEIGHT_VAR_LATE: 62,
    ROOF_Y_MIN: 132,
    ROOF_Y_MAX: 222,
    ROOF_Y_BASE: 180,       // baseline Y for rooftops

    // Gargoyles
    GARGOYLE_W: 14,
    GARGOYLE_H: 14,
    GARGOYLE_CHANCE_EARLY: 0.22,
    GARGOYLE_CHANCE_LATE: 0.62,
    GARGOYLE_ALERT_DIST: 120,
    GARGOYLE_ALERT_FRAMES: 26,   // telegraph before the lunge — readable warning
    GARGOYLE_LUNGE_FRAMES: 34,
    GARGOYLE_LUNGE_HEIGHT: 30,
    GARGOYLE_RECOVER_FRAMES: 40,
    GARGOYLE_HP: 2,

    // Flyers — the second gargoyle type. They ignore rooftops, cross the screen
    // faster than it scrolls and bob on a sine, so they threaten mid-jump rather
    // than on landing. Unlocked partway up the difficulty curve.
    FLYER_UNLOCK: 0.22,
    FLYER_CHANCE_LATE: 0.34,
    FLYER_HP: 1,
    FLYER_SPEED: 1.1,       // extra leftward speed on top of the world scroll
    FLYER_BOB_AMP: 14,
    FLYER_BOB_RATE: 0.06,
    FLYER_MIN_Y: 60,

    // Projectiles
    NOTE_SPEED: 6,
    NOTE_W: 6,
    NOTE_H: 8,
    FIRE_RATE: 11,

    // Scoring
    METRES_PER_PX: 0.1,     // world pixels -> the "m" shown in the HUD
    KILL_POINTS: 20,        // per kill, multiplied by the combo step
    FLYER_POINTS: 35,
    COMBO_MAX: 6,
    COMBO_WINDOW: 150,      // frames before a streak lapses

    // Music
    //
    // Points at the jukebox's copy rather than a second one under this game.
    // The two are byte-identical audio — same 224 Ogg pages, differing only in
    // the bitstream serial a remux assigns — so a local copy would be 937KB of
    // duplication. It does mean this game is not quite standalone, which is the
    // one place it departs from the self-contained-game convention.
    MUSIC: {
        URL: '../../music/jukebox/songs/'
             + encodeURIComponent('Jimmi - JIMMI - 04 Roderick Tron.ogg'),
        VOLUME: 0.38,
        DUCKED: 0.12,      // while the FIN panel is up
        FADE_IN: 1.5,
        DUCK_RAMP: 0.35,
    },

    // Particles
    PARTICLE_COUNT: 8,
    PARTICLE_LIFE: 20,
    PARTICLE_SPEED: 3,

    // Lives
    MAX_LIVES: 3,
    INVINCIBLE_FRAMES: 90,  // ~1.5s at 60fps

    // Palette — 1810s Dutch city
    COLORS: {
        sky:          '#1a1028',
        skyHorizon:   '#3a1830',
        canalBlue:    '#0d2a4a',
        brickRed:     '#6a2820',
        brickDark:    '#4a1810',
        roofTile:     '#8a4020',
        roofTileDark: '#6a3018',
        gableWhite:   '#e8dcc8',
        gableStone:   '#7a5a48',
        windowLit:    '#ffcf6a',
        gasLamp:      '#ffe03a',
        gasLampGlow:  'rgba(255,224,58,0.15)',
        robotCyan:    '#00f5ff',
        robotSteel:   '#8899aa',
        robotCoat:    '#1a1828',
        muttonChops:  '#cc6620',
        gargoyleStone:'#6a6a80',
        gargoyleDark: '#2a2a3a',
        gargoyleEye:  '#ff3d6e',
        flyerWing:    '#3a3a52',
        noteWhite:    '#f0ead8',
        particleStone:'#7a7a8a',
        particleDust: '#5a4a3a',
        hudText:      '#f0ead8',
        lifeHeart:    '#ff3d6e',
    }
};

// ── Difficulty curve ──────────────────────────────────────
// One function of distance drives speed, gap width, roof size, height variance
// and both spawn rates, so "how hard is it right now" has a single answer.
const Difficulty = {
    // 0 at the start, 1 once DIFFICULTY_DISTANCE metres are behind you.
    at(metres) {
        return Math.max(0, Math.min(1, metres / CONFIG.DIFFICULTY_DISTANCE));
    },

    lerp(a, b, t) { return a + (b - a) * t; },

    scrollSpeed(d) { return this.lerp(CONFIG.SCROLL_MIN, CONFIG.SCROLL_MAX, d); },

    // Never wider than the player can actually jump at the current speed.
    maxGap(d) {
        const reach = CONFIG.JUMP_AIRTIME * this.scrollSpeed(d) * CONFIG.GAP_SAFETY;
        return Math.min(CONFIG.GAP_HARD_CAP, Math.max(CONFIG.ROOF_GAP_MIN + 6, reach));
    },

    roofWidth(d, rand) {
        const min = this.lerp(CONFIG.ROOF_W_EARLY_MIN, CONFIG.ROOF_W_LATE_MIN, d);
        const max = this.lerp(CONFIG.ROOF_W_EARLY_MAX, CONFIG.ROOF_W_LATE_MAX, d);
        return min + rand * (max - min);
    },

    heightVar(d) {
        return this.lerp(CONFIG.ROOF_HEIGHT_VAR_EARLY, CONFIG.ROOF_HEIGHT_VAR_LATE, d);
    },

    gargoyleChance(d) {
        return this.lerp(CONFIG.GARGOYLE_CHANCE_EARLY, CONFIG.GARGOYLE_CHANCE_LATE, d);
    },

    flyerChance(d) {
        if (d < CONFIG.FLYER_UNLOCK) return 0;
        const t = (d - CONFIG.FLYER_UNLOCK) / (1 - CONFIG.FLYER_UNLOCK);
        return t * CONFIG.FLYER_CHANCE_LATE;
    },
};
