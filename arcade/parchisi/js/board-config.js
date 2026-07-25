/**
 * board-config.js — Parchís board geometry, position encoding, and move logic
 * Pure data + logic, no DOM dependencies.
 */

var PC = (function() {
    'use strict';

    var TRACK_SIZE = 68;
    var HOME_SIZE  = 8;
    var BOARD_SIZE = 15;

    var COLORS = ['red', 'blue', 'green', 'yellow'];

    var COLOR_CONFIG = {
        red:    { entry: 5,  safe: 1,  homeEntry: 5  },
        blue:   { entry: 22, safe: 18, homeEntry: 22 },
        green:  { entry: 39, safe: 35, homeEntry: 39 },
        yellow: { entry: 56, safe: 52, homeEntry: 56 },
    };

    var SAFE_SQUARES = [];
    COLORS.forEach(function(c) {
        SAFE_SQUARES.push(COLOR_CONFIG[c].entry);
        SAFE_SQUARES.push(COLOR_CONFIG[c].safe);
    });

    // ── Position encoding ──────────────────────────────────────────────────────
    // null = yard, {track:n} = track, {home:n} = home run, 'finished' = scored

    function posIsNull(pos)     { return pos === null; }
    function posIsTrack(pos)    { return pos !== null && typeof pos === 'object' && 'track' in pos; }
    function posIsHome(pos)     { return pos !== null && typeof pos === 'object' && 'home' in pos; }
    function posIsFinished(pos) { return pos === 'finished'; }

    function posEquals(a, b) {
        if (a === null && b === null) return true;
        if (a === null || b === null) return false;
        if (a === 'finished' && b === 'finished') return true;
        if (a === 'finished' || b === 'finished') return false;
        if ('track' in a && 'track' in b) return a.track === b.track;
        if ('home' in a && 'home' in b) return a.home === b.home;
        return false;
    }

    function posToString(pos) {
        if (pos === null) return 'yard';
        if (pos === 'finished') return 'finished';
        if ('track' in pos) return 'T' + pos.track;
        if ('home' in pos) return 'H' + pos.home;
        return '?';
    }

    // ── Track advancement ──────────────────────────────────────────────────────

    function advancePosition(color, fromPos, steps) {
        if (fromPos === null || fromPos === 'finished') return null;

        var cfg = COLOR_CONFIG[color];

        if ('home' in fromPos) {
            var newHome = fromPos.home + steps;
            if (newHome > HOME_SIZE) return null;
            if (newHome === HOME_SIZE) return { newPos: 'finished', enteredHome: false, captured: false };
            return { newPos: { home: newHome }, enteredHome: false, captured: false };
        }

        var curTrack = fromPos.track;

        var distToHomeEntry;
        if (curTrack <= cfg.homeEntry) {
            distToHomeEntry = cfg.homeEntry - curTrack;
        } else {
            distToHomeEntry = (TRACK_SIZE - curTrack) + cfg.homeEntry;
        }

        if (steps > distToHomeEntry) {
            var homeSteps = steps - distToHomeEntry;
            if (homeSteps > HOME_SIZE) return null;
            if (homeSteps === HOME_SIZE) return { newPos: 'finished', enteredHome: true, captured: false };
            return { newPos: { home: homeSteps }, enteredHome: true, captured: false };
        }

        var newTrack = (curTrack + steps) % TRACK_SIZE;
        return { newPos: { track: newTrack }, enteredHome: false, captured: false };
    }

    // ── Pawn queries ───────────────────────────────────────────────────────────

    function getPawnsAtTrack(pawnPositions, trackPos) {
        var result = [];
        COLORS.forEach(function(c) {
            if (!pawnPositions[c]) return;
            for (var i = 0; i < 4; i++) {
                var pos = pawnPositions[c][i];
                if (posIsTrack(pos) && pos.track === trackPos) {
                    result.push({ color: c, index: i });
                }
            }
        });
        return result;
    }

    function isSafeSquare(trackPos) {
        return SAFE_SQUARES.indexOf(trackPos) !== -1;
    }

    function checkCapture(movingColor, trackPos, pawnPositions) {
        if (isSafeSquare(trackPos)) return null;
        var pawnsHere = getPawnsAtTrack(pawnPositions, trackPos);
        var opponents = pawnsHere.filter(function(p) { return p.color !== movingColor; });
        if (opponents.length === 1) return opponents[0];
        return null;
    }

    function isBlockade(pawnPositions, trackPos) {
        var pawnsHere = getPawnsAtTrack(pawnPositions, trackPos);
        var colorCounts = {};
        pawnsHere.forEach(function(p) {
            colorCounts[p.color] = (colorCounts[p.color] || 0) + 1;
        });
        for (var c in colorCounts) {
            if (colorCounts[c] >= 2) return true;
        }
        return false;
    }

    // ── Legal moves ────────────────────────────────────────────────────────────

    function getLegalMoves(color, dice, pawnPositions, consecutiveDoubles) {
        var moves = [];
        var pawns = pawnPositions[color];
        var d1 = dice[0], d2 = dice[1];
        var sum = d1 + d2;
        var isDoubles = (d1 === d2);
        var cfg = COLOR_CONFIG[color];

        if (isDoubles && consecutiveDoubles >= 2) {
            for (var i = 0; i < 4; i++) {
                if (pawns[i] !== null && pawns[i] !== 'finished') {
                    moves.push({
                        pawnIndex: i, steps: 0, newPos: null,
                        capture: null, penalty: 'three_doubles', useDie: 2,
                    });
                }
            }
            return moves;
        }

        for (var pi = 0; pi < 4; pi++) {
            var pos = pawns[pi];

            if (pos === null) {
                if (d1 === 5) {
                    var cap = checkCapture(color, cfg.entry, pawnPositions);
                    moves.push({ pawnIndex: pi, steps: 0, newPos: { track: cfg.entry }, capture: cap, useDie: 0, enterFromYard: true });
                }
                if (d2 === 5) {
                    var cap2 = checkCapture(color, cfg.entry, pawnPositions);
                    moves.push({ pawnIndex: pi, steps: 0, newPos: { track: cfg.entry }, capture: cap2, useDie: 1, enterFromYard: true });
                }
                if (sum === 5 && d1 !== 5 && d2 !== 5) {
                    var cap3 = checkCapture(color, cfg.entry, pawnPositions);
                    moves.push({ pawnIndex: pi, steps: 0, newPos: { track: cfg.entry }, capture: cap3, useDie: 2, enterFromYard: true });
                }
                continue;
            }

            if (pos === 'finished') continue;

            var dieOptions = [];
            if (d1 !== d2) {
                dieOptions.push({ steps: d1, useDie: 0 });
                dieOptions.push({ steps: d2, useDie: 1 });
                dieOptions.push({ steps: sum, useDie: 2 });
            } else {
                dieOptions.push({ steps: d1, useDie: 0 });
            }

            dieOptions.forEach(function(opt) {
                var result = advancePosition(color, pos, opt.steps);
                if (result) {
                    if (posIsTrack(result.newPos) && isBlockade(pawnPositions, result.newPos.track)) return;
                    moves.push({
                        pawnIndex: pi,
                        steps: opt.steps,
                        newPos: result.newPos,
                        capture: result.enteredHome ? null : posIsTrack(result.newPos) ? checkCapture(color, result.newPos.track, pawnPositions) : null,
                        useDie: opt.useDie,
                        enteredHome: result.enteredHome,
                    });
                }
            });
        }

        return moves;
    }

    // ── Board coordinates (15×15 grid) ─────────────────────────────────────────
    // Track: 68 positions going clockwise around the cross-shaped board

    var TRACK_COORDS = [
        [6,14],[6,13],[6,12],[6,11],[6,10],
        [5,9],[4,9],[3,9],[2,9],[1,9],[0,9],
        [0,8],[0,7],
        [1,6],[2,6],[3,6],[4,6],[5,6],
        [6,5],[6,4],[6,3],[6,2],[6,1],[6,0],
        [7,0],[8,0],
        [8,1],[8,2],[8,3],[8,4],[8,5],[8,6],
        [8,7],[9,7],[10,7],[11,7],[12,7],[13,7],
        [14,7],[14,8],
        [13,8],[12,8],[11,8],[10,8],[9,8],[8,8],
        [8,9],[8,10],[8,11],[8,12],[8,13],[8,14],
        [7,14],[7,13],[7,12],[7,11],[7,10],
        [7,9],[7,8],[7,7],[7,6],[7,5],[7,4],[7,3],[7,2],[7,1],[7,0],
        [5,14],
    ];

    var HOME_COORDS = {
        red:    [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8],[7,7],[7,6]],
        blue:   [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7],[6,6],[7,7]],
        green:  [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7],[8,8],[7,7]],
        yellow: [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6],[6,8],[7,7]],
    };

    var YARD_POSITIONS = {
        red:    [[2,11],[3,11],[2,12],[3,12]],
        blue:   [[2,2],[3,2],[2,3],[3,3]],
        green:  [[11,2],[12,2],[11,3],[12,3]],
        yellow: [[11,11],[12,11],[11,12],[12,12]],
    };

    function getTrackCoords() { return TRACK_COORDS; }

    function getPixelPos(color, pos) {
        if (pos === null || pos === 'finished') return null;
        if ('home' in pos) return HOME_COORDS[color][pos.home];
        if ('track' in pos) return TRACK_COORDS[pos.track];
        return null;
    }

    return {
        TRACK_SIZE: TRACK_SIZE,
        HOME_SIZE: HOME_SIZE,
        BOARD_SIZE: BOARD_SIZE,
        COLORS: COLORS,
        COLOR_CONFIG: COLOR_CONFIG,
        SAFE_SQUARES: SAFE_SQUARES,

        posIsNull: posIsNull,
        posIsTrack: posIsTrack,
        posIsHome: posIsHome,
        posIsFinished: posIsFinished,
        posEquals: posEquals,
        posToString: posToString,

        advancePosition: advancePosition,
        getPawnsAtTrack: getPawnsAtTrack,
        isSafeSquare: isSafeSquare,
        checkCapture: checkCapture,
        isBlockade: isBlockade,
        getLegalMoves: getLegalMoves,

        getTrackCoords: getTrackCoords,
        getPixelPos: getPixelPos,
        HOME_COORDS: HOME_COORDS,
        YARD_POSITIONS: YARD_POSITIONS,
    };
})();
