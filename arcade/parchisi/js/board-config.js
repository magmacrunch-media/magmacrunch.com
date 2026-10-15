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

    // homeEntry is the last track square before the colour's home run: five
    // before its exit. It used to equal the exit, and distance was measured
    // from the pawn's square, so a pawn that had just left the yard stood zero
    // squares from its home run and any roll took it in. server.py's
    // advance_position carried the same rule and changed with this one; the
    // two must agree or the server refuses the moves this file offers.
    var COLOR_CONFIG = {
        red:    { entry: 5,  safe: 1,  homeEntry: 0  },
        blue:   { entry: 22, safe: 18, homeEntry: 17 },
        green:  { entry: 39, safe: 35, homeEntry: 34 },
        yellow: { entry: 56, safe: 52, homeEntry: 51 },
    };

    var SAFE_SQUARES = [];
    COLORS.forEach(function(c) {
        SAFE_SQUARES.push(COLOR_CONFIG[c].entry);
        SAFE_SQUARES.push(COLOR_CONFIG[c].safe);
    });

    // ── The shared rules ───────────────────────────────────────────────────────
    //
    // Movement, the home run, captures and blockades come from adenosine-race
    // (../shared/adenosine-race.js), the same rules SORRY and Aggravation run
    // on. Pawns only move forward, so the 'progress' rule fits: a pawn's
    // progress is read off its square, and it turns in on the move that passes
    // homeEntry, 63 squares from its exit. Landing exactly on homeEntry leaves
    // it on the track (exactEntersHome: false), so home cell 0 is never used
    // and the first cell in is 1, as before.
    //
    // What stays here is what makes this Parchis: a 5 to leave the yard, two
    // dice used singly or summed, three doubles, and the move list below.

    var TRACK = AdRace.createTrack({
        length: TRACK_SIZE,
        homeLength: HOME_SIZE,
        homeRule: 'progress',
        exactEntersHome: false,
        colors: COLORS.reduce(function(acc, c) {
            acc[c] = { entry: COLOR_CONFIG[c].entry, homeEntry: COLOR_CONFIG[c].homeEntry };
            return acc;
        }, {}),
        safeSquares: SAFE_SQUARES,
    });

    // ── Position encoding ──────────────────────────────────────────────────────
    // null = yard, {track:n} = track, {home:n} = home run, 'finished' = scored

    function posIsNull(pos)     { return TRACK.isYard(pos); }
    function posIsTrack(pos)    { return TRACK.isTrack(pos); }
    function posIsHome(pos)     { return TRACK.isHome(pos); }
    function posIsFinished(pos) { return TRACK.isFinished(pos); }
    function posEquals(a, b)    { return TRACK.equals(a, b); }
    function posToString(pos)   { return TRACK.describe(pos); }

    // ── Track advancement ──────────────────────────────────────────────────────

    // Callers read { newPos, enteredHome, captured }, so the shape stays.
    function advancePosition(color, fromPos, steps) {
        var r = TRACK.advance(color, fromPos, steps);
        if (!r) return null;
        return { newPos: r.pos, enteredHome: r.enteredHome, captured: false };
    }

    // ── Pawn queries ───────────────────────────────────────────────────────────

    function getPawnsAtTrack(pawnPositions, trackPos) { return TRACK.pawnsAt(pawnPositions, trackPos); }
    function isSafeSquare(trackPos)                     { return TRACK.isSafe(trackPos); }
    function isBlockade(pawnPositions, trackPos)        { return TRACK.isBlockade(pawnPositions, trackPos); }
    function checkCapture(movingColor, trackPos, pawnPositions) {
        return TRACK.captureAt(movingColor, trackPos, pawnPositions);
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
