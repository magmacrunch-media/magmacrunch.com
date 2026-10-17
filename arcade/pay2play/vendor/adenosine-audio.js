"use strict";
var AdAudio = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    AdaptiveMusic: () => AdaptiveMusic,
    createAdaptiveLogic: () => createAdaptiveLogic,
    destroy: () => destroy,
    handleVisibility: () => onVisibilityChange,
    init: () => init,
    isMusicMuted: () => isMusicMuted,
    isMusicPlaying: () => isMusicPlaying,
    isSfxMuted: () => isSfxMuted,
    loadMusic: () => loadMusic,
    loadSfx: () => loadSfx,
    pauseMusic: () => pauseMusic,
    playMusic: () => playMusic2,
    playSfx: () => playSfx,
    setMusicMuted: () => setMusicMuted,
    setMusicVolume: () => setMusicVolume,
    setSfxGlobalVolume: () => setSfxGlobalVolume,
    setSfxMuted: () => setSfxMuted,
    setSfxVolume: () => setSfxVolume,
    stopMusic: () => stopMusic,
    toggleMusicMute: () => toggleMusicMute,
    toggleSfxMute: () => toggleSfxMute,
    validateAdaptiveConfig: () => validateAdaptiveConfig
  });

  // src/audio-context.ts
  var ctx = null;
  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctx;
  }
  async function resumeCtx() {
    const c = getCtx();
    if (c.state === "suspended") {
      await c.resume();
    }
  }
  function closeCtx() {
    if (ctx && ctx.state !== "closed") {
      ctx.close();
    }
    ctx = null;
  }

  // src/music.ts
  var musicBuffer = null;
  var musicSource = null;
  var musicGain = null;
  var musicStarted = false;
  var musicMuted = false;
  var musicVolume = 0.3;
  var visibilityHandler = null;
  var musicStartedAt = 0;
  var musicOffset = 0;
  var pausedByVisibility = false;
  async function loadMusic(url, opts) {
    musicVolume = opts?.volume ?? 0.3;
    const res = await fetch(url);
    const arrayBuf = await res.arrayBuffer();
    musicBuffer = await getCtx().decodeAudioData(arrayBuf);
  }
  async function playMusic(fadeIn = 2) {
    if (!musicBuffer || musicStarted) return;
    await resumeCtx();
    const ctx2 = getCtx();
    musicGain = ctx2.createGain();
    musicGain.connect(ctx2.destination);
    musicGain.gain.setValueAtTime(0, ctx2.currentTime);
    musicSource = ctx2.createBufferSource();
    musicSource.buffer = musicBuffer;
    musicSource.loop = true;
    musicSource.connect(musicGain);
    musicOffset = musicBuffer.duration > 0 ? musicOffset % musicBuffer.duration : 0;
    musicSource.start(0, musicOffset);
    musicStartedAt = ctx2.currentTime;
    const target = musicMuted ? 0 : musicVolume;
    musicGain.gain.linearRampToValueAtTime(target, ctx2.currentTime + fadeIn);
    musicStarted = true;
  }
  function pauseMusic() {
    if (musicSource) {
      musicOffset += getCtx().currentTime - musicStartedAt;
      musicSource.onended = null;
      musicSource.stop();
      musicSource = null;
    }
    musicStarted = false;
  }
  function stopMusic() {
    pauseMusic();
    musicOffset = 0;
    pausedByVisibility = false;
    if (musicGain) {
      musicGain.disconnect();
      musicGain = null;
    }
  }
  function setMusicVolume(volume, rampTime = 0.5) {
    musicVolume = volume;
    if (musicGain && !musicMuted) {
      const ctx2 = getCtx();
      musicGain.gain.cancelScheduledValues(ctx2.currentTime);
      musicGain.gain.setValueAtTime(musicGain.gain.value, ctx2.currentTime);
      musicGain.gain.linearRampToValueAtTime(volume, ctx2.currentTime + rampTime);
    }
  }
  function setMusicMuted(muted, rampTime = 0.5) {
    musicMuted = muted;
    if (musicGain) {
      const ctx2 = getCtx();
      musicGain.gain.cancelScheduledValues(ctx2.currentTime);
      if (rampTime <= 0) {
        musicGain.gain.setValueAtTime(muted ? 0 : musicVolume, ctx2.currentTime);
      } else {
        musicGain.gain.setValueAtTime(musicGain.gain.value, ctx2.currentTime);
        musicGain.gain.linearRampToValueAtTime(muted ? 0 : musicVolume, ctx2.currentTime + rampTime);
      }
    }
  }
  function isMusicMuted() {
    return musicMuted;
  }
  function toggleMusicMute() {
    setMusicMuted(!musicMuted);
    return musicMuted;
  }
  function isMusicPlaying() {
    return musicStarted;
  }
  function onVisibilityChange(pause) {
    if (visibilityHandler) {
      document.removeEventListener("visibilitychange", visibilityHandler);
    }
    visibilityHandler = () => {
      if (!pause) return;
      if (document.hidden) {
        if (musicStarted) {
          pausedByVisibility = true;
          pauseMusic();
        }
      } else if (pausedByVisibility) {
        pausedByVisibility = false;
        void playMusic(0);
      }
    };
    document.addEventListener("visibilitychange", visibilityHandler);
  }
  function destroyMusic() {
    stopMusic();
    musicBuffer = null;
    musicStarted = false;
    musicMuted = false;
    musicOffset = 0;
    musicStartedAt = 0;
    pausedByVisibility = false;
    if (visibilityHandler) {
      document.removeEventListener("visibilitychange", visibilityHandler);
      visibilityHandler = null;
    }
  }

  // src/sfx.ts
  var sfxMap = /* @__PURE__ */ new Map();
  var sfxMuted = false;
  var sfxGlobalVolume = 1;
  async function loadSfx(name, url, opts) {
    const res = await fetch(url);
    const arrayBuf = await res.arrayBuffer();
    const buffer = await getCtx().decodeAudioData(arrayBuf);
    sfxMap.set(name, {
      buffer,
      volume: opts?.volume ?? 0.5,
      pool: [],
      poolSize: opts?.pool ?? 1
    });
  }
  async function playSfx(name, opts) {
    if (sfxMuted) return;
    const entry = sfxMap.get(name);
    if (!entry) return;
    await resumeCtx();
    const ctx2 = getCtx();
    const gain = ctx2.createGain();
    const vol = (opts?.volume ?? entry.volume) * sfxGlobalVolume;
    gain.gain.setValueAtTime(vol, ctx2.currentTime);
    gain.connect(ctx2.destination);
    const source = ctx2.createBufferSource();
    source.buffer = entry.buffer;
    source.connect(gain);
    source.start(0);
    source.onended = () => {
      gain.disconnect();
      const idx = entry.pool.indexOf(source);
      if (idx !== -1) entry.pool.splice(idx, 1);
    };
    if (entry.pool.length < entry.poolSize) {
      entry.pool.push(source);
    }
  }
  function setSfxVolume(name, volume) {
    const entry = sfxMap.get(name);
    if (entry) entry.volume = volume;
  }
  function setSfxGlobalVolume(volume) {
    sfxGlobalVolume = volume;
  }
  function setSfxMuted(muted) {
    sfxMuted = muted;
  }
  function isSfxMuted() {
    return sfxMuted;
  }
  function toggleSfxMute() {
    sfxMuted = !sfxMuted;
    return sfxMuted;
  }
  function destroySfx() {
    sfxMap.clear();
    sfxMuted = false;
    sfxGlobalVolume = 1;
  }

  // src/adaptive-logic.ts
  function validateAdaptiveConfig(cfg) {
    function fail(msg) {
      throw new Error("adaptive music config: " + msg);
    }
    const g = cfg.grid;
    if (!g || !(g.beat > 0)) fail("grid.beat must be a positive number of seconds");
    if (!Number.isFinite(g.first)) fail("grid.first must be a number of seconds");
    if (g.barBeats !== void 0 && !(Number.isInteger(g.barBeats) && g.barBeats > 0)) {
      fail("grid.barBeats must be a positive integer");
    }
    if (!Array.isArray(cfg.tiers) || cfg.tiers.length < 2) fail("tiers needs at least two names");
    if (new Set(cfg.tiers).size !== cfg.tiers.length) fail("tier names must be unique");
    const n = cfg.tiers.length - 1;
    if (!Array.isArray(cfg.up) || cfg.up.length !== n) fail(`up needs ${n} threshold(s), one per tier above the first`);
    if (!Array.isArray(cfg.down) || cfg.down.length !== n) fail(`down needs ${n} threshold(s), one per tier above the first`);
    for (let i = 0; i < n; i++) {
      if (cfg.down[i] > cfg.up[i]) fail(`down[${i}] is above up[${i}], so ${cfg.tiers[i + 1]} could never hold`);
      if (i > 0 && cfg.up[i] < cfg.up[i - 1]) fail("up must not decrease");
      if (i > 0 && cfg.down[i] < cfg.down[i - 1]) fail("down must not decrease");
    }
    for (const t of cfg.tiers) {
      const list = cfg.loops?.[t];
      if (!Array.isArray(list) || list.length === 0) fail(`tier "${t}" has no loops`);
      for (const l of list) {
        if (!Array.isArray(l) || l.length !== 2 || !Number.isInteger(l[0]) || !Number.isInteger(l[1]) || l[1] < 1) {
          fail(`tier "${t}" loop ${JSON.stringify(l)} is not [first beat, bars] in whole numbers`);
        }
      }
    }
  }
  function createAdaptiveLogic(config) {
    validateAdaptiveConfig(config);
    const { grid, tiers } = config;
    const barBeats = grid.barBeats ?? 4;
    const holdBars = config.holdBars ?? 2;
    const rise = config.rise ?? 0.4;
    const fall = config.fall ?? 5;
    const lowest = tiers[0];
    const top = tiers[tiers.length - 1];
    const index = (tier) => {
      const i = tiers.indexOf(tier);
      if (i < 0) throw new Error(`adaptive music: unknown tier "${tier}"`);
      return i;
    };
    const logic = {
      config,
      beat: () => grid.beat,
      bar: () => grid.beat * barBeats,
      beatAt: (n) => grid.first + n * grid.beat,
      nearestBeat: (pos) => logic.beatAt(Math.round((pos - grid.first) / grid.beat)),
      loops(tier) {
        index(tier);
        return config.loops[tier].map(([n, bars]) => {
          const start = logic.beatAt(n);
          const len = bars * logic.bar();
          return { tier, start, len, end: start + len };
        });
      },
      nextBar(anchorTime, t) {
        const b = logic.bar();
        return anchorTime + Math.ceil((t - anchorTime) / b - 1e-9) * b;
      },
      smooth(current, target, dtSec) {
        const tau = target > current ? rise : fall;
        return current + (target - current) * (1 - Math.exp(-dtSec / tau));
      },
      tierFor(current, level) {
        const c = index(current);
        for (let j = tiers.length - 1; j >= 1; j--) {
          const line = j > c ? config.up[j - 1] : config.down[j - 1];
          if (level >= line) return tiers[j];
        }
        return lowest;
      },
      conductor(tier = lowest) {
        index(tier);
        return { tier, pending: null, busyUntil: 0, holdUntil: 0 };
      },
      /*
       * A change is DECIDED when the level crosses a threshold but only
       * COMMITTED on the bar line it lands on, and until then its destination
       * follows the level. That is what lets a sudden spike reach the top tier:
       * the level passes the middle tier's line on its way up, and a change
       * committed there would hold the crossfade for a bar while the spike
       * decayed underneath it. The bar is at least a beat away, because a line
       * crossed just before a bar line otherwise commits at once, before the
       * level has finished rising.
       */
      conduct(c, level, now, lead, nextBar) {
        const want = logic.tierFor(c.tier, level);
        if (!c.pending) {
          if (want === c.tier || now < c.busyUntil) return null;
          if (want !== top && now < c.holdUntil) return null;
          c.pending = { tier: want, at: nextBar(now + lead + logic.beat()) };
        }
        if (want === c.tier) {
          c.pending = null;
          return null;
        }
        c.pending.tier = want;
        if (now < c.pending.at - lead) return null;
        const go = c.pending;
        c.pending = null;
        c.tier = go.tier;
        c.busyUntil = go.at + logic.bar();
        c.holdUntil = go.at + (1 + holdBars) * logic.bar();
        return go;
      },
      finaleEntry(songDur, remaining) {
        const pos = logic.nearestBeat(songDur - remaining);
        return Math.max(0, Math.min(pos, songDur - logic.bar()));
      }
    };
    return logic;
  }

  // src/adaptive.ts
  var CURVE_N = 64;
  function powerCurve(rising) {
    const c = new Float32Array(CURVE_N);
    for (let i = 0; i < CURVE_N; i++) {
      const a = i / (CURVE_N - 1) * Math.PI / 2;
      c[i] = rising ? Math.sin(a) : Math.cos(a);
    }
    return c;
  }
  var CURVE_IN = powerCurve(true);
  var CURVE_OUT = powerCurve(false);
  function decode(ac, data) {
    return new Promise((ok, fail) => {
      const p = ac.decodeAudioData(data, ok, fail);
      if (p && typeof p.then === "function") p.then(ok, fail);
    });
  }
  var AdaptiveMusic = class {
    /** The pure logic this engine plays, for a game that wants the grid or the loops. */
    logic;
    /** Called once when the finale's last sample has played. */
    onEnded = null;
    ac;
    dest;
    lead;
    lookahead;
    seamFade;
    rotateAfter;
    buf = null;
    out = null;
    voices = [];
    active = null;
    c;
    rotation = {};
    smoothed = 0;
    muted = false;
    vol;
    constructor(config, opts = {}) {
      this.logic = createAdaptiveLogic(config);
      this.ac = opts.context ?? null;
      this.dest = opts.destination;
      this.vol = opts.volume ?? 0.3;
      this.lead = opts.lead ?? 0.15;
      this.lookahead = opts.lookahead ?? 3;
      this.seamFade = config.seamFade ?? 0.06;
      this.rotateAfter = config.rotateAfter ?? 2;
      this.c = this.logic.conductor();
    }
    /** The context the score plays through, created on first use if none was given. */
    get context() {
      if (!this.ac) this.ac = getCtx();
      return this.ac;
    }
    /** Fetch and decode the song. Rejects with the HTTP status or the decoder's reason. */
    async load(url) {
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
      this.setBuffer(await decode(this.context, await res.arrayBuffer()));
    }
    /** Use an already decoded song, e.g. one shared with another part of the game. */
    setBuffer(buffer) {
      this.stop();
      this.buf = buffer;
      if (!this.out) {
        const ac = this.context;
        this.out = ac.createGain();
        this.out.gain.value = this.muted ? 0 : this.vol;
        this.out.connect(this.dest ?? ac.destination);
      }
    }
    ready() {
      return !!this.buf;
    }
    duration() {
      return this.buf ? this.buf.duration : 0;
    }
    /** Whether a voice is scheduled: true from start() until stop(), finale included. */
    isPlaying() {
      return !!this.active;
    }
    /** The tier the score is in, or has committed to on its next bar line. */
    get tier() {
      return this.c.tier;
    }
    /** The smoothed level the conductor is following. */
    get level() {
      return this.smoothed;
    }
    setMuted(muted, rampTime = 0.05) {
      this.muted = muted;
      this.applyGain(rampTime);
    }
    isMuted() {
      return this.muted;
    }
    setVolume(volume, rampTime = 0.05) {
      this.vol = volume;
      this.applyGain(rampTime);
    }
    applyGain(rampTime) {
      if (!this.out || !this.ac) return;
      const t = this.ac.currentTime, target = this.muted ? 0 : this.vol;
      this.out.gain.cancelScheduledValues(t);
      if (rampTime <= 0) this.out.gain.setValueAtTime(target, t);
      else this.out.gain.setTargetAtTime(target, t, rampTime);
    }
    /**
     * Start the score at song position `position` (default 0), in the lowest
     * tier. From early enough, the song plays as written into the first loop,
     * which continues it sample for sample, so the opening is the record.
     * Started later than a bar before that loop, it fades into the loop instead.
     */
    start(position = 0) {
      if (!this.buf) throw new Error("adaptive music: start() before the song is loaded");
      this.stop();
      const ac = this.context, now = ac.currentTime + 0.05, bar = this.logic.bar();
      const lowest = this.logic.config.tiers[0];
      this.smoothed = 0;
      this.rotation = {};
      this.c = this.logic.conductor(lowest);
      const first = this.loopFor(lowest);
      if (position < first.start - bar) {
        const anchor = now + (first.start - position);
        const v = this.newVoice(now, 0, {
          tier: lowest,
          loop: first,
          anchorTime: anchor,
          intro: { t0: now, from: position }
        });
        this.pass(v, now, position, first.start - position, position > 0, false);
        this.pass(v, anchor, first.start, first.len, false, true);
        this.active = v;
      } else {
        this.active = this.startLoop(first, now, bar);
      }
      this.c.holdUntil = now;
      this.c.busyUntil = now;
    }
    /** Stop everything at once. The next start() begins afresh. */
    stop() {
      for (const v of this.voices) {
        for (const s of v.sources) {
          s.onended = null;
          try {
            s.stop();
          } catch (e) {
          }
        }
        try {
          v.gain.disconnect();
        } catch (e) {
        }
      }
      this.voices = [];
      this.active = null;
    }
    /**
     * Suspend the context, and with it everything scheduled on it. Context time
     * stops too, so every bar line stays where it was. Note this pauses anything
     * else sharing the context, sound effects included, which is usually what a
     * paused game wants.
     */
    pause() {
      return this.ac ? this.ac.suspend() : Promise.resolve();
    }
    resume() {
      return this.ac ? this.ac.resume() : Promise.resolve();
    }
    /** Stop, and let go of the song and the master gain. */
    destroy() {
      this.stop();
      if (this.out) {
        try {
          this.out.disconnect();
        } catch (e) {
        }
      }
      this.out = null;
      this.buf = null;
      this.onEnded = null;
    }
    /**
     * Play the song's own ending so its last sound lands `remaining` seconds
     * from now. Entered on the playing voice's next bar line and crossfaded over
     * a bar; the entry is snapped to a beat, so the true end is within half a
     * beat of the target. Does nothing before start() or once a finale is set.
     */
    finale(remaining) {
      const old = this.active;
      if (!old || old.finale || !this.buf) return;
      const now = this.context.currentTime, bar = this.logic.bar();
      const t = this.logic.nextBar(old.anchorTime, now + this.lead);
      const pos = this.logic.finaleEntry(this.buf.duration, remaining - (t - now));
      this.retire(old, t);
      const v = this.newVoice(t, bar, { tier: "finale", anchorTime: t, finale: { t, pos } });
      const src = this.pass(v, t, pos, this.buf.duration - pos, false, false);
      src.onended = () => {
        if (this.onEnded) this.onEnded();
      };
      this.active = v;
    }
    /**
     * The song position the music is at, while it is playing the song straight
     * (the opening, and the finale once it has entered), or null while it is
     * looping. A game whose clock is meant to follow the record nudges toward
     * this: during the finale, `duration() - impliedPosition()` is the time left.
     */
    impliedPosition() {
      const v = this.active;
      if (!v || !this.ac) return null;
      const now = this.ac.currentTime;
      if (v.intro && now < v.anchorTime) return v.intro.from + Math.max(0, now - v.intro.t0);
      if (v.finale && now >= v.finale.t) return v.finale.pos + (now - v.finale.t);
      return null;
    }
    /**
     * Per frame, or per timer tick: follow the level, and keep passes queued.
     * `target` is the game's raw 0..1 level; it is smoothed here, fast up and
     * slow down, over `dtSec` of game time.
     */
    tick(target, dtSec) {
      const ac = this.ac, v = this.active;
      if (!v || !ac || ac.state !== "running") return;
      const now = ac.currentTime;
      this.smoothed = this.logic.smooth(this.smoothed, Math.max(0, Math.min(1, target)), dtSec);
      if (v.finale || !v.loop) return;
      if (v.passEnd < now + this.lead) {
        this.retire(v, now);
        this.active = this.startLoop(v.loop, now + this.lead, this.seamFade);
        return;
      }
      const go = this.logic.conduct(
        this.c,
        this.smoothed,
        now,
        this.lead,
        (t) => this.logic.nextBar(v.anchorTime, t)
      );
      if (go) {
        const at = go.at > now + 0.02 ? go.at : this.logic.nextBar(v.anchorTime, now + this.lead);
        this.changeTo(this.loopFor(go.tier), at);
        return;
      }
      if (v.passEnd - now < this.lookahead) {
        const others = this.logic.loops(v.tier).length > 1;
        if (others && v.passes >= this.rotateAfter + (v.intro ? 1 : 0) && now >= this.c.busyUntil && !this.c.pending) {
          this.changeTo(this.loopFor(v.tier), v.passEnd);
        } else {
          this.pass(v, v.passEnd, v.loop.start, v.loop.len, true, true);
        }
      }
    }
    // ── voices ──────────────────────────────────────────────────────────────
    /** A new voice whose gain fades in over `fade` seconds from t (0 = at once). */
    newVoice(t, fade, props) {
      const g = this.context.createGain();
      if (fade > 0) {
        g.gain.value = 0;
        g.gain.setValueCurveAtTime(CURVE_IN, t, fade);
      }
      g.connect(this.out);
      const v = { gain: g, sources: [], passes: 0, passEnd: t, ...props };
      this.voices.push(v);
      return v;
    }
    /**
     * Queue one pass of a voice: song [from, from + dur) starting at time t.
     * `tailFade` lets it run seamFade past its end, fading out under the next
     * pass's head; `headFade` fades its start in.
     */
    pass(v, t, from, dur, headFade, tailFade) {
      const ac = this.context, buf = this.buf, X = this.seamFade;
      const src = ac.createBufferSource();
      src.buffer = buf;
      const g = ac.createGain();
      if (headFade) {
        g.gain.value = 0;
        g.gain.setValueCurveAtTime(CURVE_IN, t, X);
      }
      const playFor = Math.min(dur + (tailFade ? X : 0), buf.duration - from);
      if (tailFade && playFor > dur) g.gain.setValueCurveAtTime(CURVE_OUT, t + dur, playFor - dur);
      src.connect(g);
      g.connect(v.gain);
      src.start(t, from, playFor);
      v.sources.push(src);
      v.passEnd = t + dur;
      v.passes++;
      return src;
    }
    /** Fade a voice out over one bar from t, then let it go. */
    retire(v, t) {
      const b = this.logic.bar();
      try {
        v.gain.gain.setValueCurveAtTime(CURVE_OUT, t, b);
      } catch (e) {
        v.gain.gain.cancelScheduledValues(t);
        v.gain.gain.setTargetAtTime(0, t, b / 4);
      }
      const stopAt = t + b + 0.1;
      for (const s of v.sources) {
        s.onended = null;
        try {
          s.stop(stopAt);
        } catch (e) {
        }
      }
      v.dead = true;
      const ms = Math.max(0, (stopAt - this.context.currentTime) * 1e3 + 200);
      setTimeout(() => {
        try {
          v.gain.disconnect();
        } catch (e) {
        }
        this.voices = this.voices.filter((x) => x !== v);
      }, ms);
    }
    /** Begin a loop voice at t, fading in over `fade` seconds. */
    startLoop(loop, t, fade) {
      const v = this.newVoice(t, fade, { tier: loop.tier, loop, anchorTime: t });
      this.pass(v, t, loop.start, loop.len, false, true);
      return v;
    }
    /** Crossfade from the active voice to a new loop over one bar from t, a bar line. */
    changeTo(loop, t) {
      this.retire(this.active, t);
      this.active = this.startLoop(loop, t, this.logic.bar());
      this.c.busyUntil = t + this.logic.bar();
    }
    /** The next loop of a tier, rotating through its list. */
    loopFor(tier) {
      const list = this.logic.loops(tier);
      const i = (this.rotation[tier] ?? 0) % list.length;
      this.rotation[tier] = i + 1;
      return list[i];
    }
  };

  // src/index.ts
  var musicFadeIn = 2;
  async function init(manifest) {
    if (manifest.music) {
      await loadMusic(manifest.music.url, {
        volume: manifest.music.volume,
        fadeIn: manifest.music.fadeIn
      });
      musicFadeIn = manifest.music.fadeIn ?? 2;
    }
    if (manifest.sfx) {
      const entries = Object.entries(manifest.sfx);
      await Promise.all(
        entries.map(([name, cfg]) => loadSfx(name, cfg.url, { volume: cfg.volume, pool: cfg.pool }))
      );
    }
    if (manifest.autoVisibility !== false) {
      onVisibilityChange(true);
    }
  }
  async function playMusic2(fadeIn) {
    await playMusic(fadeIn ?? musicFadeIn);
  }
  function destroy() {
    destroyMusic();
    destroySfx();
    closeCtx();
  }
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=index.global.js.map