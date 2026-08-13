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
    toggleSfxMute: () => toggleSfxMute
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
    musicSource.start(0);
    const target = musicMuted ? 0 : musicVolume;
    musicGain.gain.linearRampToValueAtTime(target, ctx2.currentTime + fadeIn);
    musicStarted = true;
  }
  function pauseMusic() {
    if (musicSource) {
      musicSource.onended = null;
      musicSource.stop();
      musicSource = null;
    }
    musicStarted = false;
  }
  function stopMusic() {
    pauseMusic();
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
      if (document.hidden && pause && musicStarted) {
        pauseMusic();
      } else if (!document.hidden && pause && musicBuffer) {
        playMusic(0);
      }
    };
    document.addEventListener("visibilitychange", visibilityHandler);
  }
  function destroyMusic() {
    stopMusic();
    musicBuffer = null;
    musicStarted = false;
    musicMuted = false;
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