// audio.js -- music and sound effects, over adenosine-audio.
//
// Wired the way american-spirits wires it, and for the same reason: THIS REPO
// SHIPS NO AUDIO FILES YET, AND THE GAME MUST PLAY PERFECTLY WITHOUT THEM.
// Every call below is a no-op when the file behind it is absent, so the game
// is silent today and audible the moment the files land in web/audio/. No
// code change, no flag.
//
// That is why this does NOT call AdAudio.init(). init() loads the whole
// manifest under one `await Promise.all(...)`, so ONE missing file rejects the
// lot and you get no audio at all plus an unhandled rejection. Loading each
// asset separately, each with its own catch, means a half-finished audio
// folder gives you exactly the sounds that exist.
//
// Nothing in here reads or writes the game's state. The rules in game.js call
// p2pAudio.sfx() at the moments listed in P2P_AUDIO and that is the whole of
// the coupling: delete this file and its script tag and the only change is
// that the calls have nothing to call, which is why every call site guards on
// `window.p2pAudio`.

const P2P_AUDIO = {
  dir: 'audio/',
  // Names the files that are actually present. Absent means no audio, at a
  // cost of one failed request rather than one per sound.
  manifest: 'index.json',
  muteKey: 'pay2play:muted',

  // The song the game is named after, and the source of most of its text.
  music: { name: 'theme', file: 'pay2play', volume: 0.35, fadeIn: 2.0 },

  // `pool` is how many copies may overlap. Three reels can be stopped inside
  // a few hundred milliseconds with 1, 2 and 3, so `stop` needs three.
  sfx: {
    lever:    { file: 'lever',    volume: 0.5,  pool: 1 },  // the pull, which is also the coin going in
    stop:     { file: 'stop',     volume: 0.4,  pool: 3 },  // a reel stopped where you put it
    slip:     { file: 'slip',     volume: 0.45, pool: 2 },  // the house dragging a reel past your press
    nomatch:  { file: 'nomatch',  volume: 0.3,  pool: 1 },  // nothing
    twomatch: { file: 'twomatch', volume: 0.5,  pool: 1 },  // a pair
    jackpot:  { file: 'jackpot',  volume: 0.6,  pool: 1 },  // three of a kind
    cashout:  { file: 'cashout',  volume: 0.5,  pool: 1 },  // walking away, under the prize card
  },
};

const p2pAudio = {

  // False when there is no Web Audio at all, or the vendored engine did not
  // load. Then nothing here touches AdAudio, whose getCtx() constructs an
  // AudioContext unguarded and would throw.
  available: false,

  loaded: [],
  missing: [],
  // Named by index.json but unknown to this build: a typo in the manifest.
  unknown: [],

  musicStarted: false,
  muted: false,

  // Called once at load, not awaited. Fetching needs no user gesture; only
  // playback does, which is why the music waits for the first lever pull.
  async init() {
    this.available = typeof window !== 'undefined'
      && (typeof window.AudioContext === 'function'
          || typeof window.webkitAudioContext === 'function')
      && typeof AdAudio === 'object';

    this.muted = this.readStoredMute();
    if (!this.available) return;

    const present = await this.readManifest();
    if (present.length === 0) return;

    if (this.muted) {
      AdAudio.setMusicMuted(true);
      AdAudio.setSfxMuted(true);
    }

    const ext = this.preferredExtension();
    const wanted = new Set(present);

    const music = P2P_AUDIO.music;
    if (wanted.has(music.name)) {
      await this.tryLoad(music.name, () => AdAudio.loadMusic(
        this.url(music.file, ext),
        { volume: music.volume, fadeIn: music.fadeIn },
      ));
    }

    await Promise.all(Object.keys(P2P_AUDIO.sfx)
      .filter(name => wanted.has(name))
      .map(name => {
        const cfg = P2P_AUDIO.sfx[name];
        return this.tryLoad(name, () => AdAudio.loadSfx(
          name, this.url(cfg.file, ext), { volume: cfg.volume, pool: cfg.pool },
        ));
      }));

    const known = new Set([music.name].concat(Object.keys(P2P_AUDIO.sfx)));
    for (const name of present) {
      if (!known.has(name)) this.unknown.push(name);
    }

    // Pause the music while the tab is hidden. A boolean, per adenosine's
    // source.
    AdAudio.handleVisibility(true);
  },

  // Anything that goes wrong here means no audio, which is the right outcome
  // for every way it can go wrong: no file, bad JSON, no network, or a
  // file:// page where fetch is refused.
  async readManifest() {
    try {
      const res = await fetch(P2P_AUDIO.dir + P2P_AUDIO.manifest, { cache: 'no-cache' });
      if (!res.ok) return [];
      const list = await res.json();
      return Array.isArray(list) ? list.filter(n => typeof n === 'string') : [];
    } catch (err) {
      return [];
    }
  },

  async tryLoad(name, load) {
    try {
      await load();
      this.loaded.push(name);
    } catch (err) {
      // Recorded rather than logged; report() prints it on demand.
      this.missing.push(name);
    }
  },

  // ogg where the browser takes it, mp3 otherwise, so ship both.
  preferredExtension() {
    try {
      const probe = document.createElement('audio');
      return probe.canPlayType('audio/ogg; codecs="vorbis"') ? '.ogg' : '.mp3';
    } catch (err) {
      return '.ogg';
    }
  },

  url(file, ext) {
    return P2P_AUDIO.dir + file + ext;
  },

  // For the console: p2pAudio.report()
  report() {
    if (!this.available) return 'audio unavailable: no Web Audio, or vendor/adenosine-audio.js did not load';
    if (this.loaded.length === 0 && this.missing.length === 0) {
      return `no audio: ${P2P_AUDIO.dir}${P2P_AUDIO.manifest} is absent or empty.`
           + ' On a file:// page that is expected, because the loaders fetch()'
           + ' and fetch is refused there. Serve the folder.';
    }
    return `loaded [${this.loaded.join(', ') || 'none'}]  `
         + `missing [${this.missing.join(', ') || 'none'}]`
         + (this.unknown.length ? `  unknown in manifest [${this.unknown.join(', ')}]` : '');
  },

  // One shot. Safe for a sound that never loaded, from anywhere.
  sfx(name) {
    if (!this.available || this.muted) return;
    try {
      AdAudio.playSfx(name);
    } catch (err) {
      // playSfx swallows its own miss; this guards the synchronous throw from
      // an AudioContext the browser has killed.
    }
  },

  // Browsers refuse to start audio without a user gesture, so this is called
  // from the lever pull, never at load.
  startMusic() {
    if (!this.available || this.musicStarted) return;
    this.musicStarted = true;
    try {
      AdAudio.playMusic();
    } catch (err) {
      this.musicStarted = false;
    }
  },

  // One toggle for both, as in the other games here.
  toggleMute() {
    if (!this.available) {
      this.muted = !this.muted;
      this.storeMute();
      return this.muted;
    }
    this.muted = AdAudio.toggleMusicMute();
    AdAudio.setSfxMuted(this.muted);
    this.storeMute();
    return this.muted;
  },

  // localStorage throws in a private window and on some browsers from a
  // file:// page, which is how this game is meant to be opened.
  readStoredMute() {
    try {
      return window.localStorage.getItem(P2P_AUDIO.muteKey) === '1';
    } catch (err) {
      return false;
    }
  },

  storeMute() {
    try {
      window.localStorage.setItem(P2P_AUDIO.muteKey, this.muted ? '1' : '0');
    } catch (err) {
      // A preference that cannot be remembered is not a failure.
    }
  },
};

window.p2pAudio = p2pAudio;
p2pAudio.init();
