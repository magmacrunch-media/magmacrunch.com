// config.js — cave diving (not even once) | MagmaCrunch Media (c) 2026
// Constants, palette, the segment timeline, and the derived fairness budgets.
//
// Every per-frame value here is expressed in "units per 60fps frame" and is
// multiplied by dt at the point of use, so the dive runs identically on a 60Hz
// and a 144Hz display. The same rule roderick-tron follows.

const CONFIG = {
    CANVAS_W: 480,
    CANVAS_H: 270,

    // ── The dive ──────────────────────────────────────────────────────
    // "cave diving (not even once)" - Juanito Thompson, Spooked (2025),
    // track 3. Measured: 161.284s at 48kHz. The fallback only matters until
    // the browser reports a duration; see main.js syncDuration().
    DIVE_MS_FALLBACK: 161284,

    MUSIC: {
        URL: '../../music/jukebox/songs/' + encodeURIComponent(
            'Juanito Thompson - Spooked - 03 cave diving (not even once).ogg'),
        VOLUME: 0.42,
        FADE_IN: 1.2,
    },

    // ── Swimming ──────────────────────────────────────────────────────
    // Not gravity and a jump. The diver is slightly negative, so doing
    // nothing sinks you; a stroke is an impulse, not held thrust. That one
    // choice is what reads as a water level rather than as a flyer.
    SINK: 0.035,             // downward accel per frame
    DRAG: 0.90,              // velocity multiplier per frame
    STROKE_IMPULSE: 2.6,
    STROKE_COOLDOWN: 10,     // frames between strokes
    MAX_SPEED: 5.0,
    STEER_ACCEL: 0.30,       // small continuous control between strokes

    PLAYER_SPRITE_W: 16,
    PLAYER_SPRITE_H: 12,
    // Hit box is smaller than the sprite and centred - the margin favours the
    // player, the way jovian's contact boxes do. Fins and tank do not kill.
    PLAYER_W: 12,
    PLAYER_H: 8,
    get PLAYER_HALF() { return this.PLAYER_W / 2; },

    // Where the diver sits on the scroll axis, as a fraction of the canvas.
    // Ahead of centre so most of the lamp cone shows the way you are going.
    RAIL_POS: 0.38,

    // ── Air ───────────────────────────────────────────────────────────
    // Air is the only life. A hit costs breath and stuns; it does not kill.
    // Over a fixed 161s run a one-touch death makes only the last seconds
    // matter, where a single draining resource makes every mistake compound.
    AIR_MAX: 100,
    AIR_DRAIN: 0.013,        // per frame at rest
    STROKE_AIR: 0.07,        // per stroke - speed is bought with breath
    HIT_AIR: 6,
    HIT_STUN: 16,            // frames of reduced control after a hit
    POCKET_REFILL: 22,
    POCKETS_MAIN_LINE: 12,   // pockets reachable without leaving the main line
    AIR_PANIC: 25,           // below this the vignette pulses and the pulse ticks

    // ── The headlamp ──────────────────────────────────────────────────
    // The lamp radius IS the sight line, so it is bound by the fairness
    // budget below and may not be dimmed past it.
    LAMP_RADIUS_EARLY: 124,
    LAMP_RADIUS_LATE: 84,
    // Half-angle of the bright cone. 0.40 rad is a ~46-degree beam, which is
    // a headlamp. The first pass used 0.85 and the two cones together spread
    // 166 degrees, which is not a beam at all - it read as a round blob
    // centred on the diver and gave away no facing whatsoever.
    LAMP_CONE: 0.40,
    LAMP_HALO: 26,           // always-lit radius around the diver
    // Darkness is not opacity 1. Hazards stay faintly readable outside the
    // cone; a true blackout makes the sight-line budget a lie.
    DARK_ALPHA: 0.93,
    SILHOUETTE_ALPHA: 0.30,
    SILT_LAMP_MULT: 0.55,    // lamp radius while inside a silt cloud

    // ── Scrolling ─────────────────────────────────────────────────────
    SCROLL_MIN: 1.4,
    SCROLL_MAX: 2.2,

    // ── Fairness budget ───────────────────────────────────────────────
    // A hazard must be inside the lamp for long enough to be seen and acted
    // on before it reaches the diver:
    //
    //   (LAMP_RADIUS_LATE - PLAYER_HALF) / SCROLL_MAX >= TELEGRAPH + REACTION
    //   (84              - 6          ) / 2.2         = 35.4 >= 32     ok
    //
    // Widen the lamp or slow the scroll if either end is retuned. The test
    // asserts this rather than trusting it.
    TELEGRAPH_MIN_FRAMES: 14,
    REACTION_FRAMES: 18,
    get SIGHT_FRAMES() {
        return (this.LAMP_RADIUS_LATE - this.PLAYER_HALF) / this.SCROLL_MAX;
    },

    // ── Passages ──────────────────────────────────────────────────────
    // Cross-axis width of the passage, lerped by the segment's narrowness.
    PASSAGE_WIDE: 300,
    PASSAGE_TIGHT: 156,
    // The narrowest gap any generator may leave between two protrusions.
    // Derived, not eyeballed: the diver plus room to correct at full drift.
    CLEARANCE_MARGIN: 26,
    get CLEARANCE_MIN() { return this.PLAYER_W + this.CLEARANCE_MARGIN; },

    // Deepest a wall protrusion may reach, as a fraction of the passage. See
    // entities.js: this is what keeps the centreline a usable line.
    PROTRUSION_MAX_SPAN: 0.5,
    // Spacing between hazards, in frames of scroll. 42 was one rock every
    // 0.7s - four on screen at once in a shaft - and a competent simulated
    // diver still took 11 hits in the first minute, which was 44% of all the
    // air it spent. The sight-line budget wants roughly one hazard per
    // TELEGRAPH + REACTION window, not four.
    OBSTACLE_MIN_GAP_FRAMES: 110,
    SILT_CHANCE: 0.22,
    PEARL_CHANCE: 0.34,
    DEBRIS_FALL: 1.6,

    // ── Scoring ───────────────────────────────────────────────────────
    // Depth is fixed, so the score is what you have left when you surface.
    AIR_POINTS: 40,          // per air remaining
    PEARL_POINTS: 250,
    NOHIT_BONUS: 1500,
    SURFACE_BONUS: 1000,

    PARTICLE_COUNT: 10,
    PARTICLE_LIFE: 26,
    PARTICLE_SPEED: 1.5,

    COLORS: {
        line:      '#0b1a22',
        rock:      '#332b45',
        rockLit:   '#564a70',
        rockDeep:  '#1b1526',
        water:     '#0b2430',
        waterDeep: '#030b10',
        suit:      '#1e4a55',
        suitDark:  '#12333b',
        tank:      '#6e8794',
        tankDark:  '#465a66',
        visor:     '#9ff0ff',
        lamp:      '#fff3c4',
        fin:       '#2a6470',
        accent:    '#3fe0d0',
        air:       '#5fe8a4',
        danger:    '#ff5f6d',
        pearl:     '#ffd98a',
        silt:      '#6b5a49',
    },
};

// ── The segment timeline ──────────────────────────────────────────────
// `at` is each segment's START, as a fraction of the dive - never absolute
// seconds, so a re-encoded ogg cannot desync the level. This is the
// makemecookies RUSH_AT rule.
//
// These fractions are not even sevenths. They were read off an RMS envelope
// of the actual track (100ms windows, decoded in the browser), and each one
// sits on a real musical event:
//
//   22.0s  0.1364  first steady stretch after the opening swell
//   55.9s  0.3466  a clear peak (0.87)
//   88.7s  0.5500  THE GLOBAL PEAK (0.92) - the collapse behind you
//  117.0s  0.7254  start of the quietest sustained stretch in the body
//  128.0s  0.7936  it lifts again
//  144.0s  0.8928  the final climb tops out (0.81), then the outro falls away
//
// The track opens on two seconds of near-silence, which is the drop into the
// water, and the last sound is at 158.7s.
const SEGMENTS = [
    { at: 0.0000, kind: 'shaft',   dark: 0.16, narrow: 0.05, label: 'THE ENTRY' },
    { at: 0.1364, kind: 'squeeze', dark: 0.38, narrow: 0.26, label: 'FIRST TUNNEL' },
    { at: 0.3466, kind: 'shaft',   dark: 0.58, narrow: 0.46, label: 'THE DESCENT' },
    { at: 0.5500, kind: 'squeeze', dark: 0.74, narrow: 0.64, label: 'NO WAY BACK', collapse: true },
    { at: 0.7254, kind: 'shaft',   dark: 1.00, narrow: 0.88, label: 'THE DEEP' },
    { at: 0.7936, kind: 'squeeze', dark: 0.78, narrow: 0.68, label: 'THE WAY OUT' },
    { at: 0.8928, kind: 'ascent',  dark: 0.44, narrow: 0.30, label: 'SURFACING' },
];

// A junction chamber straddles every boundary: both axes free, so the change
// of scroll axis happens in a place rather than as a snap.
const JUNCTION_MS = 1800;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (t) => t * t * (3 - 2 * t);

const Timeline = {
    /** Index of the segment covering fraction f. */
    indexAt(f) {
        let i = 0;
        for (let s = 0; s < SEGMENTS.length; s++) if (f >= SEGMENTS[s].at) i = s;
        return i;
    },
    segmentAt(f) { return SEGMENTS[this.indexAt(f)]; },
    /** End fraction of segment i. */
    endOf(i) { return i + 1 < SEGMENTS.length ? SEGMENTS[i + 1].at : 1; },
    /** 0..1 progress within segment i. */
    progressIn(i, f) {
        const a = SEGMENTS[i].at, b = this.endOf(i);
        return clamp01((f - a) / (b - a));
    },
    lampRadius(seg) {
        return lerp(CONFIG.LAMP_RADIUS_EARLY, CONFIG.LAMP_RADIUS_LATE, clamp01(seg.dark));
    },
    passageWidth(seg) {
        return lerp(CONFIG.PASSAGE_WIDE, CONFIG.PASSAGE_TIGHT, clamp01(seg.narrow));
    },
    scrollSpeed(seg) {
        return lerp(CONFIG.SCROLL_MIN, CONFIG.SCROLL_MAX, clamp01(seg.narrow));
    },
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, SEGMENTS, JUNCTION_MS, Timeline, clamp01, lerp, smoothstep };
}
