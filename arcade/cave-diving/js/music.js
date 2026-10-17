// music.js - cave diving (not even once) | MagmaCrunch Media (c) 2026
// The adaptive score: the song's opening, then loops of it chosen by danger,
// then the song's real ending.
//
// Two halves. MusicLogic is pure arithmetic over CONFIG.MUSIC - the beat grid,
// the danger estimate, the tier hysteresis, where the finale enters - and the
// simulation test drives it with no audio at all. Music is the Web Audio
// engine that plays what MusicLogic decides.
//
// WHY WEB AUDIO. An <audio> element cannot loop a section, let alone crossfade
// two of them on a bar line. One decoded buffer of the whole song, played by
// AudioBufferSourceNodes started at exact context times, can do both, and adds
// no asset: every loop is a range of the file the game already loads.
//
// VOICES. A voice is one loop playing on repeat through its own gain. Each
// repeat is a "pass", its own source node, overlapping the next by SEAM_FADE
// with an equal-power crossfade. Every change of music - a tier change, a
// rotation to the tier's other loop, the finale - starts a new voice on a bar
// line of the old one and crossfades the two over one bar. A voice's passes are
// whole bars long and start on a beat, so its bar lines are simply
// anchorTime + k * bar in context time.

/* global CONFIG, clamp01 */

const MusicLogic = {
    beat() { return CONFIG.MUSIC.GRID.BEAT; },
    bar() { return CONFIG.MUSIC.GRID.BEAT * CONFIG.MUSIC.GRID.BAR_BEATS; },

    /** Song position, in seconds, of beat n. */
    beatAt(n) { return CONFIG.MUSIC.GRID.FIRST + n * CONFIG.MUSIC.GRID.BEAT; },

    /** The beat nearest a song position, as a song position. */
    nearestBeat(pos) {
        const g = CONFIG.MUSIC.GRID;
        return this.beatAt(Math.round((pos - g.FIRST) / g.BEAT));
    },

    /** A tier's loops as { start, len, end } in seconds of song. */
    loops(tier) {
        return CONFIG.MUSIC.LOOPS[tier].map(([n, bars]) => {
            const start = this.beatAt(n);
            const len = bars * this.bar();
            return { tier, start, len, end: start + len };
        });
    },

    /** The first bar line at or after time t, for a voice anchored at anchorTime. */
    nextBar(anchorTime, t) {
        const b = this.bar();
        return anchorTime + Math.ceil((t - anchorTime) / b - 1e-9) * b;
    },

    /**
     * How much trouble the diver is in, 0..1, from what the game knows.
     *
     *   s.air     0..AIR_MAX      s.dark, s.narrow  the segment's, 0..1
     *   s.stun    frames left     s.shake           frames of collapse left
 *   s.chase   px between the diver and the rubble behind them, if any
     *   s.debris  rock is coming  s.silt            inside a silt cloud
     *
     * The terms are combined with max rather than summed, because each is a
     * reason on its own: low air is danger however wide the passage is. The
     * cave itself (darkness and narrowness, plus whatever is in it) is the one
     * additive term, and alone it reaches UNEASE in the deep, never DANGER.
     */
    dangerFrom(s) {
        const panic = CONFIG.AIR_PANIC;
        // 0 at twice the panic line, past the DANGER threshold at the line itself.
        const air = clamp01((panic * 2 - s.air) / (panic * 1.4));
        const hit = s.stun > 0 ? 0.85 : 0;
        // The collapse: the moment it falls, and then the rubble chasing up
        // the tunnel. `chase` is how far behind the diver it is, px; inside
        // 60 it is DANGER, gone by 160. The shake alone was under a second,
        // and could fade to UNEASE before the next bar line committed it.
        const chase = s.chase === undefined ? 0 : clamp01((160 - s.chase) / 100);
        const collapse = Math.max(s.shake > 0 ? 1 : 0, chase);
        const cave = 0.30 * s.dark + 0.25 * s.narrow +
            (s.debris ? 0.25 : 0) + (s.silt ? 0.2 : 0);
        return clamp01(Math.max(air, hit, collapse, cave));
    },

    /** Move the smoothed danger toward the target: fast up, slow down. */
    smooth(current, target, dtSec) {
        const M = CONFIG.MUSIC;
        const tau = target > current ? M.DANGER_RISE : M.DANGER_FALL;
        return current + (target - current) * (1 - Math.exp(-dtSec / tau));
    },

    /** The tier for this danger, given the current tier. Hysteresis both ways. */
    tierFor(current, danger) {
        const up = CONFIG.MUSIC.TIER_UP, down = CONFIG.MUSIC.TIER_DOWN;
        if (current === 'danger') {
            if (danger >= down.danger) return 'danger';
            return danger >= down.unease ? 'unease' : 'calm';
        }
        if (current === 'unease') {
            if (danger >= up.danger) return 'danger';
            return danger >= down.unease ? 'unease' : 'calm';
        }
        if (danger >= up.danger) return 'danger';
        return danger >= up.unease ? 'unease' : 'calm';
    },

    /**
     * One step of the conductor: whether the tier changes, and when.
     *
     * `c` holds { tier, pending, busyUntil, holdUntil } and is updated in
     * place. `nextBar(t)` is the playing voice's first bar line at or after t.
     * Returns { tier, at } when a change should be scheduled now, else null.
     *
     * A change is decided when danger crosses a threshold but only COMMITTED
     * on the bar line it lands on, and until then it follows the danger. That
     * is what lets the collapse reach DANGER: danger passes the UNEASE line on
     * its way up, and a change committed there would hold the crossfade for a
     * bar while the spike decayed underneath it. The hold keeps the music from
     * wandering, but it must not delay fear, so a move up to DANGER ignores it.
     */
    conduct(c, danger, now, lead, nextBar) {
        const want = this.tierFor(c.tier, danger);
        if (!c.pending) {
            if (want === c.tier || now < c.busyUntil) return null;
            if (want !== 'danger' && now < c.holdUntil) return null;
            // At least a beat to settle. A threshold crossed just before a
            // bar line otherwise commits at once: in the browser, a spike to
            // 0.9 committed to UNEASE at 0.42 and reached DANGER a bar late.
            c.pending = { tier: want, at: nextBar(now + lead + this.beat()) };
        }
        if (want === c.tier) { c.pending = null; return null; }   // passed before the bar
        c.pending.tier = want;
        if (now < c.pending.at - lead) return null;
        const go = c.pending;
        c.pending = null;
        c.tier = go.tier;
        c.busyUntil = go.at + this.bar();
        c.holdUntil = go.at + (1 + CONFIG.MUSIC.HOLD_BARS) * this.bar();
        return go;
    },

    /**
     * Where the finale enters the song: the beat nearest FINALE_FROM, the top
     * of the record's final climb, so what follows is its climb-out and fade.
     * On a beat so the pulse carries over from whatever loop was playing.
     */
    finaleFrom() { return this.nearestBeat(CONFIG.MUSIC.FINALE_FROM); },

    /** How long the finale lasts, from its entry to the end of the song. */
    finaleSec(songDur) { return songDur - this.finaleFrom(); },
};

function Music() {
    this.ac = null;
    this.buf = null;
    this.out = null;
    this.voices = [];
    this.active = null;
    this.danger = 0;
    this.tier = 'calm';
    this.rotation = { calm: 0, unease: 0, danger: 0 };
    this.busyUntil = 0;
    this.holdUntil = 0;
    this.pending = null;      // a tier change waiting for its bar line
    this.finaleAt = null;     // { t, pos } once the finale is scheduled
    this.onEnded = null;
    this.muted = false;
    this.volume = CONFIG.MUSIC.VOLUME;
}

// How far ahead of now a change may be scheduled, and how early the next pass
// of a loop is queued. A pass is at least 10s, so the scheduler only has to
// run every second or so, which is what a background tab still allows.
const MUSIC_LEAD = 0.15;
const MUSIC_LOOKAHEAD = 3.0;

/** Fetch and decode the song. Resolves to true, or rejects with a reason. */
Music.prototype.load = function (ac, url) {
    this.ac = ac;
    this.out = ac.createGain();
    this.out.gain.value = this.muted ? 0 : this.volume;
    this.out.connect(ac.destination);
    return fetch(url)
        .then((r) => {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.arrayBuffer();
        })
        // Older Safari has only the callback form of decodeAudioData.
        .then((data) => new Promise((ok, fail) => {
            const p = ac.decodeAudioData(data, ok, fail);
            if (p && p.then) p.then(ok, fail);
        }))
        .then((buf) => { this.buf = buf; return true; });
};

Music.prototype.ready = function () { return !!this.buf; };
Music.prototype.duration = function () { return this.buf ? this.buf.duration : 0; };

Music.prototype.setMuted = function (v) {
    this.muted = v;
    if (!this.out) return;
    const t = this.ac.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setTargetAtTime(v ? 0 : this.volume, t, 0.05);
};

/** An equal-power curve, rising (sin) or falling (cos). */
function powerCurve(rising) {
    const n = 64, c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        const a = (i / (n - 1)) * Math.PI / 2;
        c[i] = rising ? Math.sin(a) : Math.cos(a);
    }
    return c;
}
const CURVE_IN = powerCurve(true);
const CURVE_OUT = powerCurve(false);

/** A new voice whose gain fades in over `fade` seconds from time t (0 = instant). */
Music.prototype.newVoice = function (t, fade, props) {
    const g = this.ac.createGain();
    // The curve itself starts at 0, and nothing in the voice sounds before t,
    // so no separate setValueAtTime(0, t) - an event at the curve's own start
    // time is an overlap some browsers refuse.
    if (fade > 0) {
        g.gain.value = 0;
        g.gain.setValueCurveAtTime(CURVE_IN, t, fade);
    }
    g.connect(this.out);
    const v = Object.assign({ gain: g, sources: [], passes: 0, passEnd: t, anchorTime: t }, props);
    this.voices.push(v);
    return v;
};

/**
 * Queue one pass of a voice: song [from, from + dur) starting at time t.
 * `tailFade` lets it run SEAM_FADE past its end, fading out under the next
 * pass's fade in. `headFade` fades the start in.
 */
Music.prototype.pass = function (v, t, from, dur, headFade, tailFade) {
    const ac = this.ac, X = CONFIG.MUSIC.SEAM_FADE;
    const src = ac.createBufferSource();
    src.buffer = this.buf;
    const g = ac.createGain();
    if (headFade) {
        g.gain.value = 0;
        g.gain.setValueCurveAtTime(CURVE_IN, t, X);
    }
    const playFor = Math.min(dur + (tailFade ? X : 0), this.buf.duration - from);
    if (tailFade) g.gain.setValueCurveAtTime(CURVE_OUT, t + dur, Math.min(X, playFor - dur));
    src.connect(g); g.connect(v.gain);
    src.start(t, from, playFor);
    v.sources.push(src);
    v.passEnd = t + dur;
    v.passes++;
    return src;
};

/** Fade a voice out over one bar from t, then let it go. */
Music.prototype.retire = function (v, t) {
    const b = MusicLogic.bar();
    try {
        v.gain.gain.setValueCurveAtTime(CURVE_OUT, t, b);
    } catch (e) {
        // Only reachable when a starved scheduler retires a voice still fading
        // in: an overlapping curve is refused, so fall back to a plain decay.
        v.gain.gain.cancelScheduledValues(t);
        v.gain.gain.setTargetAtTime(0, t, b / 4);
    }
    const stopAt = t + b + 0.1;
    for (const s of v.sources) {
        s.onended = null;
        try { s.stop(stopAt); } catch (e) { /* already stopped */ }
    }
    v.dead = true;
    setTimeout(() => {
        try { v.gain.disconnect(); } catch (e) { /* gone */ }
        this.voices = this.voices.filter((x) => x !== v);
    }, Math.max(0, (stopAt - this.ac.currentTime) * 1000 + 200));
};

/** Begin a loop voice at time t, fading in over one bar unless told otherwise. */
Music.prototype.startLoop = function (loop, t, fade) {
    const v = this.newVoice(t, fade, { loop, tier: loop.tier, anchorTime: t });
    this.pass(v, t, loop.start, loop.len, false, true);
    return v;
};

/** Crossfade from the active voice to a new loop on the active voice's next bar line. */
Music.prototype.changeTo = function (loop, now, at) {
    const old = this.active;
    const t = at !== undefined ? at : MusicLogic.nextBar(old.anchorTime, now + MUSIC_LEAD);
    this.retire(old, t);
    this.active = this.startLoop(loop, t, MusicLogic.bar());
    this.busyUntil = t + MusicLogic.bar();
    return t;
};

/** The next loop of a tier, rotating through its list. */
Music.prototype.loopFor = function (tier) {
    const list = MusicLogic.loops(tier);
    const i = this.rotation[tier] % list.length;
    this.rotation[tier] = i + 1;
    return list[i];
};

/**
 * Start the score at dive time `diveSec`. From the top, the song plays as
 * written into the first CALM loop, which continues it sample for sample, so
 * the opening is the record. Started late (the song decoded after the dive
 * began), it fades into whichever loop fits.
 */
Music.prototype.start = function (diveSec) {
    this.stop();
    const ac = this.ac, now = ac.currentTime + 0.05;
    this.danger = 0;
    this.tier = 'calm';
    this.rotation = { calm: 0, unease: 0, danger: 0 };
    this.finaleAt = null;
    this.finaleDone = false;
    // A drowned or surfaced dive faded the output to nothing; bring it back.
    const g = this.out.gain;
    g.cancelScheduledValues(ac.currentTime);
    g.setValueAtTime(this.muted ? 0 : this.volume, ac.currentTime);
    const calm = this.loopFor('calm');
    if (diveSec < calm.start - MusicLogic.bar()) {
        const v = this.newVoice(now, 0, { loop: calm, tier: 'calm', intro: true,
            introT0: now, introFrom: diveSec });
        // Bar lines of the intro are the calm loop's, counted back from its start.
        v.anchorTime = now + (calm.start - diveSec);
        this.pass(v, now, diveSec, calm.start - diveSec, diveSec > 0, false);
        // The loop's first pass continues the intro exactly: no fade either side.
        this.pass(v, v.anchorTime, calm.start, calm.len, false, true);
        this.active = v;
    } else {
        this.active = this.startLoop(calm, now, MusicLogic.bar());
    }
    this.holdUntil = now;
    this.busyUntil = now;
    this.pending = null;
};

/** Stop everything at once (a new dive, or the run ending). */
Music.prototype.stop = function () {
    if (!this.ac) return;
    for (const v of this.voices) {
        for (const s of v.sources) {
            s.onended = null;
            try { s.stop(); } catch (e) { /* not started */ }
        }
        try { v.gain.disconnect(); } catch (e) { /* gone */ }
    }
    this.voices = [];
    this.active = null;
};

Music.prototype.pause = function () { if (this.ac) this.ac.suspend(); };
Music.prototype.resume = function () { if (this.ac) this.ac.resume(); };

/**
 * Play the song's ending from the next bar. The game calls this when it
 * expects the diver to surface in about finaleSec(), so the record's fade and
 * the surface arrive together; the dive is a free swim, so that is an
 * estimate, and both ways of missing it are handled. Surface early and the
 * ending plays on over the results. Linger and it runs out under you, and
 * onEnded hands back to afterFinale(), which brings the loops back.
 */
Music.prototype.finale = function () {
    if (!this.active || this.finaleAt || this.finaleDone) return;
    const now = this.ac.currentTime;
    const t = MusicLogic.nextBar(this.active.anchorTime, now + MUSIC_LEAD);
    const pos = MusicLogic.finaleFrom();
    this.pending = null;
    this.retire(this.active, t);
    const v = this.newVoice(t, MusicLogic.bar(), { tier: 'finale', anchorTime: t, finale: true });
    const src = this.pass(v, t, pos, this.buf.duration - pos, false, false);
    src.onended = () => {
        this.finaleDone = true;
        if (this.onEnded) this.onEnded();
    };
    this.active = v;
    this.finaleAt = { t, pos };
};

Music.prototype.finaleSec = function () {
    return this.buf ? MusicLogic.finaleSec(this.buf.duration) : 0;
};

/** The song ended and the diver is still down there: fade the loops back in. */
Music.prototype.afterFinale = function () {
    if (!this.ac || !this.buf) return;
    const now = this.ac.currentTime + 0.05;
    this.active = this.startLoop(this.loopFor(this.tier), now, MusicLogic.bar() * 2);
    this.finaleAt = null;
    this.busyUntil = now + MusicLogic.bar() * 2;
    this.holdUntil = this.busyUntil;
};

/** Fade everything out over `sec` and stop. Drowning, or surfacing early. */
Music.prototype.fadeOut = function (sec) {
    if (!this.ac || !this.out) return;
    const t = this.ac.currentTime;
    const g = this.out.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0, t + sec);
    const voices = this.voices.slice();
    setTimeout(() => {
        for (const v of voices) {
            for (const s of v.sources) {
                s.onended = null;
                try { s.stop(); } catch (e) { /* not started */ }
            }
            try { v.gain.disconnect(); } catch (e) { /* gone */ }
        }
        this.voices = this.voices.filter((v) => voices.indexOf(v) < 0);
        if (voices.indexOf(this.active) >= 0) this.active = null;
    }, sec * 1000 + 100);
};

/** Per frame (or per timer tick): follow the danger, and keep passes queued. */
Music.prototype.tick = function (dangerTarget, dtSec) {
    if (!this.active || !this.ac || this.ac.state !== 'running') return;
    const now = this.ac.currentTime;
    this.danger = MusicLogic.smooth(this.danger, dangerTarget, dtSec);
    const v = this.active;
    if (v.finale) return;

    // A background tab can starve this past the end of a pass. Rather than
    // queue a pass in the past, come back in on the loop with a short fade.
    if (v.passEnd < now + MUSIC_LEAD) {
        this.retire(v, now);
        this.active = this.startLoop(v.loop, now + MUSIC_LEAD, CONFIG.MUSIC.SEAM_FADE);
        return;
    }

    const go = MusicLogic.conduct(this, this.danger, now, MUSIC_LEAD,
        (t) => MusicLogic.nextBar(v.anchorTime, t));
    if (go) {
        // A starved tick can arrive after the bar it was waiting for.
        const at = go.at > now + 0.02 ? go.at : MusicLogic.nextBar(v.anchorTime, now + MUSIC_LEAD);
        this.changeTo(this.loopFor(go.tier), now, at);
        return;
    }

    if (v.passEnd - now < MUSIC_LOOKAHEAD) {
        const others = MusicLogic.loops(v.tier).length > 1;
        if (others && v.passes >= CONFIG.MUSIC.ROTATE_AFTER + (v.intro ? 1 : 0) &&
            now >= this.busyUntil && !this.pending) {
            // Rotate on the pass boundary, which is a bar line.
            this.changeTo(this.loopFor(v.tier), now, v.passEnd);
        } else {
            // A repeat fades in under the previous pass's tail: the seam.
            this.pass(v, v.passEnd, v.loop.start, v.loop.len, true, true);
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MusicLogic, Music };
}
