/**
 * score-client.js — Persistent high scores via MAGMA//OPS backend
 *
 * Connects to the admin dashboard WebSocket on the Raspberry Pi.
 * Falls back to localStorage when the Pi is unreachable.
 * Auto-syncs queued saves when connection is restored.
 *
 * Usage:
 *   const client = ScoreClient.connect('ws://raspberrypi.local:8781');
 *   const scores = await client.load('tetris');
 *   await client.save('tetris', 'JAM', 12400, { level: 5 });
 *
 *   // Or auto-detect host:
 *   const client = ScoreClient.auto();
 */

const ScoreClient = (() => {
  const LS_PREFIX = 'mc_scores_';
  const RECONNECT_DELAY = 3000;
  const REQUEST_TIMEOUT = 5000;

  let _ws = null;
  let _url = '';
  let _connected = false;
  let _pending = new Map(); // id → { resolve, reject, timer }
  let _idCounter = 0;
  let _pendingSaves = []; // queued saves for offline
  let _listeners = [];

  function _lsKey(game) {
    return LS_PREFIX + game;
  }

  function _lsLoad(game) {
    try {
      const raw = localStorage.getItem(_lsKey(game));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function _lsSave(game, scores) {
    try {
      localStorage.setItem(_lsKey(game), JSON.stringify(scores));
    } catch {
      // storage full — silently drop oldest
    }
  }

  function _send(msg) {
    return new Promise((resolve, reject) => {
      if (!_ws || _ws.readyState !== WebSocket.OPEN) {
        reject(new Error('not connected'));
        return;
      }
      const id = ++_idCounter;
      const timer = setTimeout(() => {
        _pending.delete(id);
        reject(new Error('timeout'));
      }, REQUEST_TIMEOUT);
      _pending.set(id, { resolve, reject, timer });
      msg._id = id;
      _ws.send(JSON.stringify(msg));
    });
  }

  function _onMessage(evt) {
    let data;
    try {
      data = JSON.parse(evt.data);
    } catch {
      return;
    }

    // Handle score responses
    const id = data._id;
    if (id && _pending.has(id)) {
      const p = _pending.get(id);
      clearTimeout(p.timer);
      _pending.delete(id);
      p.resolve(data);
      return;
    }

    // Notify listeners
    for (const fn of _listeners) {
      try { fn(data); } catch {}
    }
  }

  function _connect(url) {
    _url = url;
    if (_ws) {
      try { _ws.close(); } catch {}
    }
    try {
      _ws = new WebSocket(url);
    } catch {
      _connected = false;
      _scheduleReconnect();
      return;
    }

    _ws.onopen = () => {
      _connected = true;
      _flushPendingSaves();
    };

    _ws.onmessage = _onMessage;

    _ws.onclose = () => {
      _connected = false;
      _scheduleReconnect();
    };

    _ws.onerror = () => {
      _connected = false;
    };
  }

  function _scheduleReconnect() {
    setTimeout(() => {
      if (!_connected && _url) {
        _connect(_url);
      }
    }, RECONNECT_DELAY);
  }

  async function _flushPendingSaves() {
    while (_pendingSaves.length > 0) {
      const save = _pendingSaves.shift();
      try {
        await _send({
          action: 'score_save',
          game: save.game,
          name: save.name,
          score: save.score,
          extra: save.extra,
        });
      } catch {
        _pendingSaves.unshift(save);
        break;
      }
    }
  }

  return {
    /**
     * Connect to a specific WebSocket URL.
     * @param {string} url - e.g. 'ws://raspberrypi.local:8781'
     */
    connect(url) {
      _connect(url);
      return this;
    },

    /**
     * Auto-detect the admin server from window.location or page hostname.
     * Falls back to 'ws://localhost:8781'.
     */
    auto() {
      const host = (window && window.location && window.location.hostname) || 'localhost';
      this.connect(`ws://${host}:8781`);
      return this;
    },

    /**
     * Check if currently connected to the backend.
     */
    get connected() {
      return _connected;
    },

    /**
     * Register a listener for incoming WebSocket messages.
     */
    onMessage(fn) {
      _listeners.push(fn);
      return () => {
        _listeners = _listeners.filter((f) => f !== fn);
      };
    },

    /**
     * Load scores for a game. Tries backend first, falls back to localStorage.
     * @param {string} game - Game ID (e.g. 'tetris', 'george-boole')
     * @returns {Promise<Array>} Array of score entries
     */
    async load(game) {
      if (_connected) {
        try {
          const res = await _send({ action: 'score_load', game });
          const scores = res.scores || [];
          // Cache locally
          _lsSave(game, scores);
          return scores;
        } catch {
          // fall through to localStorage
        }
      }
      return _lsLoad(game);
    },

    /**
     * Save a score for a game.
     * @param {string} game - Game ID
     * @param {string} name - Player initials (up to 3 chars)
     * @param {number} score - Score value
     * @param {object} [extra] - Optional extra fields (level, time, etc.)
     * @returns {Promise<{rank: number, synced: boolean}>}
     */
    async save(game, name, score, extra) {
      // Always update localStorage immediately
      const scores = _lsLoad(game);
      const entry = { initials: name.toUpperCase().slice(0, 3), score };
      if (extra) Object.assign(entry, extra);
      scores.push(entry);
      scores.sort((a, b) => (b.score || 0) - (a.score || 0));
      const top = scores.slice(0, 100);
      _lsSave(game, top);

      const rank = top.findIndex((s) => s === entry) + 1;

      if (_connected) {
        try {
          await _send({ action: 'score_save', game, name, score, extra });
          return { rank, synced: true };
        } catch {
          // queued below
        }
      }

      // Queue for later sync
      _pendingSaves.push({ game, name, score, extra });
      return { rank, synced: false };
    },

    /**
     * Load all game scores (admin dashboard use).
     * @returns {Promise<Object>} Map of game ID → { game, scores }
     */
    async loadAll() {
      if (_connected) {
        try {
          const res = await _send({ action: 'scores_all' });
          return res.games || {};
        } catch {
          return {};
        }
      }
      return {};
    },

    /**
     * Reset scores for a game (admin use).
     * @param {string} game - Game ID
     */
    async reset(game) {
      _lsSave(game, []);
      if (_connected) {
        try {
          await _send({ action: 'score_reset', game });
        } catch {}
      }
    },
  };
})();

// Export for module systems
if (typeof module !== 'undefined') module.exports = ScoreClient;
