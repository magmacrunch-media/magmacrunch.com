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
    // A free swim: the diver sets the pace and the dive is a DISTANCE, in
    // along-passage pixels. This is the length the old song-clocked dive
    // covered at its scroll speeds (161.284s through the seven segments), so
    // the cave is the same size; how long it takes is now up to you, and air
    // is the clock that matters.
    DIVE_ALONG: 16850,
    // A junction chamber straddles every segment boundary: both axes free, so
    // the change of scroll axis happens in a place rather than as a snap. A
    // distance, so lingering in one does not close it around you.
    JUNCTION_ALONG: 260,

    // Two formats, or the game is silent on every iPhone and iPad. iOS has no
    // Ogg Vorbis decoder and every browser there is WebKit, so Chrome and
    // Firefox fail exactly as Safari does - and they fail without an error,
    // into the same do-nothing path a missing file takes. makemecookies,
    // SORRY, george-boole and moonlight-drift all shipped ogg-only and it went
    // unreported for as long as they existed. See AGENTS.md.
    //
    // Ogg is offered first because it is the original encode; the mp3 is a
    // second-generation transcode of it, so anything that can decode Vorbis
    // should get the better copy.
    //
    // The mp3 is -q:a 4, not the -q:a 2 the note suggests as a starting point.
    // This source is only ~132kbps Vorbis, and V2 inflated 2.67MB to 3.71MB -
    // 39% more to carry over mobile data for a second-generation copy. V4 is
    // 2.88MB, the same shape of trade george-boole settled on, with duration
    // and both mean (-14.9dB) and max (-0.7dB) volume unchanged.
    MUSIC: {
        SOURCES: [
            { url: '../../music/jukebox/songs/' + encodeURIComponent(
                'Juanito Thompson - Spooked - 03 cave diving (not even once).ogg'),
              type: 'audio/ogg; codecs="vorbis"' },
            { url: '../../music/jukebox/songs/' + encodeURIComponent(
                'Juanito Thompson - Spooked - 03 cave diving (not even once).mp3'),
              type: 'audio/mpeg' },
        ],
        // "cave diving (not even once)" - Juanito Thompson, Spooked (2025),
        // track 3. Measured: 161.284s at 48kHz. The engine reads the decoded
        // buffer's own length; this is for the tests.
        SONG_SEC: 161.284,
        VOLUME: 0.42,
        FADE_IN: 1.2,

        // ── Adaptive score ────────────────────────────────────────────
        // The song is no longer played straight through. Its opening plays
        // as written up to the first CALM loop, the body of the dive is cut
        // from loops of the song chosen by how much danger the diver is in,
        // and the song's real ending is the finale. See music.js.
        //
        // The track has a faint but steady pulse. Fitted over 4..148s of the
        // decoded ogg: 141.54 BPM, first beat at 0.178s, the phase holding to
        // within about 40ms end to end. Every loop starts on a beat and lasts
        // a whole number of bars, so a loop, a change of loop and the finale
        // all keep the pulse.
        GRID: { BEAT: 0.42390, FIRST: 0.1780, BAR_BEATS: 4 },

        // Loops by tier, as [first beat, length in bars]. Picked by brightness
        // (energy above 3kHz is where this track's intensity lives; its RMS is
        // flat at about -15dB from 6s to 148s) and by how closely the music
        // after each loop's end matches the music at its start, 0.98 to 0.99
        // on a 40-band spectral comparison. The mp3 decodes to the same
        // sample positions as the ogg, so one set of points serves both.
        //
        //   calm    26.46s / 116.75s, 6 bars       darkest, sparsest
        //   unease  42.57s / 85.38s, 14 / 13 bars  the long middle
        //   danger  129.47s / 106.15s, 6 bars      the brightest stretches
        LOOPS: {
            calm:   [[62, 6], [275, 6]],
            unease: [[100, 14], [201, 13]],
            danger: [[305, 6], [250, 6]],
        },

        // Seam crossfade when a loop repeats itself, and the fade when the
        // music changes loop (a tier change, a rotation, the finale), which is
        // one bar and always starts on a bar line.
        SEAM_FADE: 0.06,
        // The finale enters here, the top of the track's final climb (144.0s,
        // 0.81 on the RMS envelope), and plays the record's climb-out and fade
        // to its end, about 17.4s. It starts when the diver is estimated to be
        // that far from the surface.
        FINALE_FROM: 144.0,
        // Passes of one loop before a tier rotates to its other loop.
        ROTATE_AFTER: 2,

        // Danger is 0..1 and the tier follows it with hysteresis, so a value
        // hovering on a threshold cannot flick the music back and forth.
        // A tier also holds for at least HOLD_BARS before it may change again.
        TIER_UP:   { unease: 0.34, danger: 0.68 },
        TIER_DOWN: { unease: 0.22, danger: 0.52 },
        HOLD_BARS: 2,
        // Danger rises fast and falls slowly: seconds to close most of the gap.
        DANGER_RISE: 0.4,
        DANGER_FALL: 5.0,
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
    // Continuous control between strokes. Held on its own it is the CRUISE:
    // with drag integrated exactly (player.js) the steady rate of travel is
    // STEER_ACCEL / -ln(DRAG). 0.30 cruised at 2.85px/frame, fine while the
    // camera set the pace and far too fast once the diver does: holding the
    // stick outran the lamp. 0.18 cruises at 1.71, the old average scroll,
    // and strokes are the bursts on top of it.
    STEER_ACCEL: 0.18,
    get CRUISE_SPEED() { return this.STEER_ACCEL / -Math.log(this.DRAG); },

    PLAYER_SPRITE_W: 16,
    PLAYER_SPRITE_H: 12,
    // Hit box is smaller than the sprite and centered - the margin favours the
    // player, the way jovian's contact boxes do. Fins and tank do not kill.
    PLAYER_W: 12,
    PLAYER_H: 8,
    get PLAYER_HALF() { return this.PLAYER_W / 2; },

    // The push line, as a fraction of the screen from its back edge: swim past
    // it and the camera comes with you. Behind center, so most of the screen
    // and the lamp cone show the way you are going.
    RAIL_POS: 0.38,

    // ── Air ───────────────────────────────────────────────────────────
    // Air is the only life. A hit costs breath and stuns; it does not kill.
    // A single draining resource makes every mistake compound.
    //
    // In a free swim air is also the PACE. Lingering costs drain, and a stroke
    // costs breath, so neither waiting nor rushing is free. 0.07 a stroke was
    // set when the camera fixed the pace, and once the diver sets it that made
    // a stroke about a third the price of cruising the same distance: the test
    // pilot mashed through in 86s and surfaced on 89 air. Measured with the
    // simulation's pilots over eight seeds, as tuned here:
    //
    //   cruise (strokes only to dodge)   143s   surfaces on 56 air   8/8
    //   mash   (strokes at every chance)  83s   surfaces on 32 air   8/8
    //
    // So careful is the better score and rushing still gets you out, and the
    // pilot reacts in 8 frames: a person rushing through the dark hits more.
    AIR_MAX: 100,
    AIR_DRAIN: 0.013,        // per frame at rest
    STROKE_AIR: 0.25,        // per stroke - speed is bought with breath
    HIT_AIR: 6,
    HIT_STUN: 16,            // frames of reduced control after a hit
    // Pockets are placed by distance, so they no longer arrive faster than a
    // diver can use them: twelve at 22 left a fast diver throwing most of each
    // one away and never short of air.
    POCKET_REFILL: 16,
    POCKETS_MAIN_LINE: 8,    // pockets reachable without leaving the main line
    AIR_PANIC: 25,           // below this the vignette pulses and the pulse ticks

    // ── The headlamp ──────────────────────────────────────────────────
    // The lamp radius IS the sight line, so it is bound by the fairness
    // budget below and may not be dimmed past it.
    LAMP_RADIUS_EARLY: 124,
    LAMP_RADIUS_LATE: 84,
    // Half-angle of the bright cone. 0.40 rad is a ~46-degree beam, which is
    // a headlamp. The first pass used 0.85 and the two cones together spread
    // 166 degrees, which is not a beam at all - it read as a round blob
    // centered on the diver and gave away no facing whatsoever.
    LAMP_CONE: 0.40,
    LAMP_HALO: 26,           // always-lit radius around the diver
    // Darkness is not opacity 1. Hazards stay faintly readable outside the
    // cone; a true blackout makes the sight-line budget a lie.
    DARK_ALPHA: 0.93,
    SILHOUETTE_ALPHA: 0.30,
    SILT_LAMP_MULT: 0.55,    // lamp radius while inside a silt cloud

    // ── Pace ──────────────────────────────────────────────────────────
    // Nothing scrolls at these any more. They are each segment's NOMINAL pace,
    // which spaces the hazards (entities.js) the way the old scroll did.
    SCROLL_MIN: 1.4,
    SCROLL_MAX: 2.2,

    // ── Fairness budget ───────────────────────────────────────────────
    // A hazard must be inside the lamp for long enough to be seen and acted
    // on before it reaches the diver. In a free swim nothing scrolls, so the
    // speed that matters is the diver's own, and the promise is made at the
    // CRUISE, the pace you hold without spending breath:
    //
    //   (LAMP_RADIUS_LATE - PLAYER_HALF) / CRUISE_SPEED >= TELEGRAPH + REACTION
    //   (84              - 6          ) / 1.71         = 45.6 >= 32     ok
    //
    // Strokes go faster than the lamp can keep up with, deliberately: rushing
    // through the dark is how you get hurt, and that is a choice the diver
    // makes rather than one the cave makes for them. The collapse's creep is
    // under the cruise, so even the one forced stretch keeps the promise.
    // The test asserts all of this rather than trusting it.
    TELEGRAPH_MIN_FRAMES: 14,
    REACTION_FRAMES: 18,
    get SIGHT_FRAMES() {
        return (this.LAMP_RADIUS_LATE - this.PLAYER_HALF) / this.CRUISE_SPEED;
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
    // entities.js: this is what keeps the centerline a usable line.
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
// `at` is now a fraction of the dive's DISTANCE. The fractions are not even
// sevenths because they were first placed in time, on musical events of the
// track, when the song was the dive's clock; the score follows danger now, so
// they no longer need to, and they are kept as the cave's proportions. They
// were read off an RMS envelope of the track (100ms windows):
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
    // The one stretch you cannot take at your own pace. `creep` is a floor
    // under the camera's speed, below SCROLL_MIN: the cave behind is coming
    // down, and a diver who stops is pushed on by it.
    { at: 0.5500, kind: 'squeeze', dark: 0.74, narrow: 0.64, label: 'NO WAY BACK', collapse: true, creep: 1.2 },
    { at: 0.7254, kind: 'shaft',   dark: 1.00, narrow: 0.88, label: 'THE DEEP' },
    { at: 0.7936, kind: 'squeeze', dark: 0.78, narrow: 0.68, label: 'THE WAY OUT' },
    { at: 0.8928, kind: 'ascent',  dark: 0.44, narrow: 0.30, label: 'SURFACING' },
];

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
    module.exports = { CONFIG, SEGMENTS, Timeline, clamp01, lerp, smoothstep };
}
