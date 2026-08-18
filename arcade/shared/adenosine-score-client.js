"use strict";
var AdScore = (() => {
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
    ScoreClient: () => ScoreClient
  });

  // src/score-client.ts
  var LS_PREFIX = "mc_scores_";
  var RECONNECT_DELAY = 3e3;
  var REQUEST_TIMEOUT = 5e3;
  var DEFAULT_PORT = 8781;
  var ScoreClient = class {
    ws = null;
    _url = "";
    _connected = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pending = /* @__PURE__ */ new Map();
    idCounter = 0;
    pendingSaves = [];
    listeners = [];
    pendingKey = LS_PREFIX + "_pending";
    constructor() {
      this.pendingSaves = this.lsLoadPending();
    }
    // ── localStorage helpers ──────────────────────────────────────
    lsLoadPending() {
      try {
        const raw = localStorage.getItem(this.pendingKey);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
    lsSavePending() {
      try {
        localStorage.setItem(this.pendingKey, JSON.stringify(this.pendingSaves));
      } catch {
      }
    }
    lsKey(game) {
      return LS_PREFIX + game;
    }
    lsLoad(game) {
      try {
        const raw = localStorage.getItem(this.lsKey(game));
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
    lsSave(game, scores) {
      try {
        localStorage.setItem(this.lsKey(game), JSON.stringify(scores));
      } catch {
      }
    }
    // ── WebSocket helpers ─────────────────────────────────────────
    send(msg) {
      return new Promise((resolve, reject) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          reject(new Error("not connected"));
          return;
        }
        const id = ++this.idCounter;
        const timer = setTimeout(() => {
          this.pending.delete(id);
          reject(new Error("timeout"));
        }, REQUEST_TIMEOUT);
        this.pending.set(id, { resolve, reject, timer });
        msg._id = id;
        this.ws.send(JSON.stringify(msg));
      });
    }
    handleMessage(evt) {
      let data;
      try {
        data = JSON.parse(evt.data);
      } catch {
        return;
      }
      const id = data._id;
      if (id && this.pending.has(id)) {
        const p = this.pending.get(id);
        clearTimeout(p.timer);
        this.pending.delete(id);
        p.resolve(data);
        return;
      }
      for (const fn of this.listeners) {
        try {
          fn(data);
        } catch {
        }
      }
    }
    connectWs(url) {
      this._url = url;
      if (this.ws) {
        try {
          this.ws.close();
        } catch {
        }
      }
      try {
        this.ws = new WebSocket(url);
      } catch {
        this._connected = false;
        this.scheduleReconnect();
        return;
      }
      this.ws.onopen = () => {
        this._connected = true;
        this.flushPendingSaves();
      };
      this.ws.onmessage = (evt) => this.handleMessage(evt);
      this.ws.onclose = () => {
        this._connected = false;
        this.scheduleReconnect();
      };
      this.ws.onerror = () => {
        this._connected = false;
      };
    }
    scheduleReconnect() {
      setTimeout(() => {
        if (!this._connected && this._url) {
          this.connectWs(this._url);
        }
      }, RECONNECT_DELAY);
    }
    async flushPendingSaves() {
      while (this.pendingSaves.length > 0) {
        const save = this.pendingSaves.shift();
        this.lsSavePending();
        try {
          await this.send({
            action: "score_save",
            game: save.game,
            name: save.name,
            score: save.score,
            extra: save.extra
          });
        } catch {
          this.pendingSaves.unshift(save);
          this.lsSavePending();
          break;
        }
      }
      if (this.pendingSaves.length === 0) {
        try {
          localStorage.removeItem(this.pendingKey);
        } catch {
        }
      }
    }
    // ── Public API ────────────────────────────────────────────────
    /**
     * Connect to a specific WebSocket URL.
     */
    connect(url) {
      this.connectWs(url);
      return this;
    }
    /**
     * Auto-detect the admin server from window.location.
     * Falls back to 'ws://localhost:8781'.
     *
     * The scheme follows the page protocol: an HTTPS page gets `wss:`, because
     * browsers block a `ws:` connection from a secure page as mixed content
     * before it reaches the network. Pass `secure` to override that, or `url`
     * to bypass the whole construction.
     */
    auto(opts) {
      if (opts?.url) {
        this.connect(opts.url);
        return this;
      }
      const loc = typeof window !== "undefined" ? window.location : void 0;
      const hostname = opts?.hostname ?? (loc?.hostname || "localhost");
      const port = opts?.port === void 0 ? DEFAULT_PORT : opts.port;
      const secure = opts?.secure ?? loc?.protocol === "https:";
      const scheme = secure ? "wss" : "ws";
      let path = opts?.path ?? "";
      if (path && !path.startsWith("/")) path = "/" + path;
      this.connect(`${scheme}://${hostname}${port == null ? "" : ":" + port}${path}`);
      return this;
    }
    /**
     * Check if currently connected to the backend.
     */
    get isConnected() {
      return this._connected;
    }
    /**
     * Register a listener for incoming WebSocket messages.
     * Returns an unsubscribe function.
     */
    onMessage(fn) {
      this.listeners.push(fn);
      return () => {
        this.listeners = this.listeners.filter((f) => f !== fn);
      };
    }
    /**
     * Load scores for a game. Tries backend first, falls back to localStorage.
     */
    async load(game) {
      if (this._connected) {
        try {
          const res = await this.send({ action: "score_load", game });
          const scores = res.scores || [];
          this.lsSave(game, scores);
          return scores;
        } catch {
        }
      }
      return this.lsLoad(game);
    }
    /**
     * Save a score for a game.
     *
     * The returned `rank` is the score's 1-based position among all locally
     * known scores for the game, so it stays meaningful even when the score
     * falls outside the top 100 that get persisted.
     */
    async save(game, name, score, extra) {
      const scores = this.lsLoad(game);
      const entry = { initials: name.toUpperCase().slice(0, 3), score };
      if (extra) Object.assign(entry, extra);
      scores.push(entry);
      scores.sort((a, b) => (b.score || 0) - (a.score || 0));
      const rank = scores.indexOf(entry) + 1;
      this.lsSave(game, scores.slice(0, 100));
      if (this._connected) {
        try {
          await this.send({ action: "score_save", game, name, score, extra });
          return { rank, synced: true };
        } catch {
        }
      }
      this.pendingSaves.push({ game, name, score, extra });
      this.lsSavePending();
      return { rank, synced: false };
    }
    /**
     * Load all game scores (admin dashboard use).
     */
    async loadAll() {
      if (this._connected) {
        try {
          const res = await this.send({ action: "scores_all" });
          return res.games || {};
        } catch {
          return {};
        }
      }
      return {};
    }
    /**
     * Reset scores for a game.
     */
    async reset(game) {
      this.lsSave(game, []);
      if (this._connected) {
        try {
          await this.send({ action: "score_reset", game });
        } catch {
        }
      }
    }
  };
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=index.global.js.map