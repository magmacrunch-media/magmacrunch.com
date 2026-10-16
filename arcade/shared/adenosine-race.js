/*! @magmacrunch/adenosine-race v0.2.0
 * SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
 * Required Notice: Copyright 2026 magmacrunch media (https://magmacrunch.com)
 */
"use strict";
var AdRace = (() => {
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
  var __toCommonJS = (mod2) => __copyProps(__defProp({}, "__esModule", { value: true }), mod2);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    createTrack: () => createTrack
  });

  // src/track.ts
  var mod = (n, m) => (n % m + m) % m;
  function isInt(n) {
    return typeof n === "number" && Number.isInteger(n);
  }
  function validate(cfg) {
    if (!isInt(cfg.length) || cfg.length < 2) throw new RangeError("race: length must be an integer of at least 2");
    if (!isInt(cfg.homeLength) || cfg.homeLength < 1) throw new RangeError("race: homeLength must be an integer of at least 1");
    if (cfg.homeRule !== "progress" && cfg.homeRule !== "lap") {
      throw new RangeError(`race: homeRule must be 'progress' or 'lap', not ${String(cfg.homeRule)}`);
    }
    const names = Object.keys(cfg.colors ?? {});
    if (names.length === 0) throw new RangeError("race: at least one colour is required");
    const onLoop = (n) => isInt(n) && n >= 0 && n < cfg.length;
    for (const [c, cc] of Object.entries(cfg.colors)) {
      if (!onLoop(cc.entry) || !onLoop(cc.homeEntry)) {
        throw new RangeError(`race: ${c}'s entry and homeEntry must be squares 0 to ${cfg.length - 1}`);
      }
    }
    for (const s of cfg.safeSquares ?? []) {
      if (!onLoop(s)) throw new RangeError(`race: safe square ${String(s)} is not on the loop`);
    }
    for (const s of cfg.slides ?? []) {
      if (!onLoop(s.start) || !onLoop(s.end)) throw new RangeError(`race: a ${s.color} slide leaves the loop`);
    }
  }
  function createTrack(config) {
    validate(config);
    const L = config.length;
    const H = config.homeLength;
    const HOME = config.keys?.home ?? "home";
    const FINISHED = config.keys?.finished ?? "finished";
    if (HOME === "track") throw new RangeError("race: the home key cannot be 'track'");
    const colors = Object.keys(config.colors);
    const safe = new Set(config.safeSquares ?? []);
    const slides = config.slides ?? [];
    const exact = config.exactEntersHome ?? true;
    const asObj = (pos) => pos !== null && typeof pos === "object" ? pos : null;
    const trackOf = (pos) => {
      const o = asObj(pos);
      return o && typeof o.track === "number" ? o.track : null;
    };
    const homeOf = (pos) => {
      const o = asObj(pos);
      return o && typeof o[HOME] === "number" ? o[HOME] : null;
    };
    const onTrack = (n) => ({ track: n });
    const inHome = (n) => ({ [HOME]: n });
    const homeCell = (n, enteredHome) => {
      if (n < 0 || n > H) return null;
      return { pos: n === H ? FINISHED : inHome(n), enteredHome, lapped: true };
    };
    const colorConfig = (color) => {
      const cc = config.colors[color];
      if (!cc) throw new RangeError(`race: unknown colour ${color}`);
      return cc;
    };
    function advanceProgress(color, t, steps) {
      const cc = colorConfig(color);
      const progress = mod(t - cc.entry, L);
      const lapLength = mod(cc.homeEntry - cc.entry, L) || L;
      const total = progress + steps;
      if (exact ? total >= lapLength : total > lapLength) return homeCell(total - lapLength, true);
      return { pos: onTrack(mod(t + steps, L)), enteredHome: false, lapped: false };
    }
    function advanceLap(color, t, steps, alreadyLapped) {
      const cc = colorConfig(color);
      const distToEntry = mod(cc.entry - t, L);
      const willLap = !alreadyLapped && (distToEntry === 0 || steps >= distToEntry);
      const nowLapped = alreadyLapped || willLap;
      if (nowLapped) {
        const distToHome = mod(cc.homeEntry - t, L);
        const reachable = distToEntry === 0 ? distToHome < L : distToHome < distToEntry;
        if (reachable && steps >= distToHome) return homeCell(steps - distToHome, true);
      }
      return { pos: onTrack(mod(t + steps, L)), enteredHome: false, lapped: nowLapped };
    }
    const pawnsAt = (board, track) => {
      const out = [];
      for (const c of colors) {
        const pawns = board[c];
        if (!pawns) continue;
        pawns.forEach((p, index) => {
          if (trackOf(p) === track) out.push({ color: c, index });
        });
      }
      return out;
    };
    return {
      length: L,
      homeLength: H,
      colors,
      finished: FINISHED,
      onTrack,
      inHome,
      isYard: (pos) => pos === null,
      isTrack: (pos) => trackOf(pos) !== null,
      isHome: (pos) => homeOf(pos) !== null,
      isFinished: (pos) => pos === FINISHED,
      trackOf,
      homeOf,
      equals(a, b) {
        if (a === b) return true;
        const ta = trackOf(a);
        if (ta !== null) return ta === trackOf(b);
        const ha = homeOf(a);
        if (ha !== null) return ha === homeOf(b);
        return false;
      },
      describe(pos) {
        if (pos === null) return "yard";
        if (pos === FINISHED) return "finished";
        const t = trackOf(pos);
        if (t !== null) return "T" + t;
        const h = homeOf(pos);
        if (h !== null) return "H" + h;
        return "?";
      },
      distance: (from, to) => mod(to - from, L),
      advance(color, pos, steps, lapped = false) {
        colorConfig(color);
        const h = homeOf(pos);
        if (h !== null) return homeCell(h + steps, false);
        const t = trackOf(pos);
        if (t === null) return null;
        if (steps < 0) return { pos: onTrack(mod(t + steps, L)), enteredHome: false, lapped };
        return config.homeRule === "lap" ? advanceLap(color, t, steps, lapped) : advanceProgress(color, t, steps);
      },
      isSafe: (track) => safe.has(track),
      pawnsAt,
      isBlockade(board, track) {
        const counts = {};
        for (const p of pawnsAt(board, track)) {
          const n = (counts[p.color] ?? 0) + 1;
          if (n >= 2) return true;
          counts[p.color] = n;
        }
        return false;
      },
      captureAt(color, track, board) {
        if (safe.has(track)) return null;
        const opponents = pawnsAt(board, track).filter((p) => p.color !== color);
        const [only] = opponents;
        return opponents.length === 1 && only ? only : null;
      },
      slideAt(color, track, board) {
        const slide = slides.find((s) => s.start === track && s.color !== color);
        if (!slide) return null;
        const swept = [];
        let i = slide.start;
        while (i !== slide.end && swept.length < L) {
          i = (i + 1) % L;
          swept.push(i);
        }
        const bumps = [];
        for (const c of colors) {
          if (c === color || !board[c]) continue;
          board[c].forEach((p, index) => {
            const t = trackOf(p);
            if (t !== null && swept.includes(t)) bumps.push({ color: c, index });
          });
        }
        return { end: slide.end, swept, bumps };
      },
      nextTurn(order, current, skip) {
        if (order.length === 0) return current;
        const at = order.indexOf(current);
        for (let k = 1; k <= order.length; k++) {
          const i = mod(at + k, order.length);
          if (!(i in order)) continue;
          const who = order[i];
          if (!skip || !skip(who)) return who;
        }
        return current;
      }
    };
  }
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=index.global.js.map