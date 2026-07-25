/**
 * audio.js — Sound effects for SORRY!
 *
 * Preloads move.ogg and card.ogg from the sounds/ folder.
 * All playback is fire-and-forget with graceful fallback:
 *   - Missing files are silently ignored (no console errors mid-game)
 *   - Browser autoplay blocks are caught and swallowed
 *   - Each sound rewinds before replay so rapid triggers never get cut off
 *
 * Usage:
 *   SoundFX.playCard()   → on card draw
 *   SoundFX.playMove()   → on pawn move confirmed
 */

var SoundFX = (function () {

  var _sounds = {};
  var _muted  = false;

  /**
   * Preload a sound file.
   * @param {string} key   — internal name ('card', 'move', …)
   * @param {string} src   — path relative to index.html
   * @param {number} volume — 0.0 – 1.0
   */
  function _load(key, src, volume) {
    try {
      var audio = new Audio(src);
      audio.volume   = (volume !== undefined) ? volume : 0.6;
      audio.preload  = 'auto';
      // Silently swallow load errors (file missing / codec unsupported)
      audio.addEventListener('error', function () {
        _sounds[key] = null;
      });
      _sounds[key] = audio;
    } catch (e) {
      _sounds[key] = null;
    }
  }

  function _play(key) {
    if (_muted) return;
    var snd = _sounds[key];
    if (!snd) return;
    try {
      snd.currentTime = 0;
      var p = snd.play();
      // play() returns a Promise in modern browsers — catch autoplay rejections
      if (p && typeof p.catch === 'function') {
        p.catch(function () { /* autoplay blocked — ignore */ });
      }
    } catch (e) { /* ignore */ }
  }

  // ── Preload sounds ───────────────────────────────────────────────────────────
  _load('card', 'sounds/card.ogg', 0.55);
  _load('move', 'sounds/move.ogg', 0.65);

  // ── Public API ───────────────────────────────────────────────────────────────
  return {
    /** Play the card-draw sound. */
    playCard: function () { _play('card'); },

    /** Play the pawn-move sound. */
    playMove: function () { _play('move'); },

    /** Silence / unsilence all effects. */
    setMuted: function (muted) { _muted = !!muted; },

    /** Toggle mute; returns new muted state. */
    toggleMute: function () { _muted = !_muted; return _muted; },

    isMuted: function () { return _muted; },
  };

})();
