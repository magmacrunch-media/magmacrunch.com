/**
 * board-config.js — Aggravation board geometry, position encoding, and move logic
 * Pure data + logic, no DOM dependencies.
 *
 * Board: 21×21 grid. Track is a rectangular ring of 60 positions.
 * 6 players, each with 4 marbles, a yard, and a 6-cell home run to the center.
 */

var AC = (function() {
    'use strict';

    var TRACK_SIZE = 60;
    var HOME_SIZE  = 6;
    var BOARD_SIZE = 21;
    var NUM_PAWNS  = 4;

    var COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

    // Entry = track position where marble leaves yard. Home entry = same position
    // (marble enters home run after completing a full lap).
    var COLOR_CONFIG = {
        red:    { entry: 0,  safe: [0, 5]  },
        blue:   { entry: 10, safe: [10, 15] },
        green:  { entry: 20, safe: [20, 25] },
        yellow: { entry: 30, safe: [30, 35] },
        purple: { entry: 40, safe: [40, 45] },
        orange: { entry: 50, safe: [50, 55] },
    };

    var SAFE_SQUARES = [];
    COLORS.forEach(function(c) {
        COLOR_CONFIG[c].safe.forEach(function(s) {
            if (SAFE_SQUARES.indexOf(s) === -1) SAFE_SQUARES.push(s);
        });
    });

    // ── Position encoding ──────────────────────────────────────────────────────

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

    // ── Track path (60 positions, clockwise rectangular ring) ─────────────────
    //
    // On a 21×21 grid (indices 0–20), the track is a ring in the outer area:
    //   Bottom row (row 18): cols 3→18 = 16 cells  (pos 0–15)
    //   Right col  (col 18): rows 17→3  = 15 cells  (pos 16–30)
    //   Top row    (row 3):  cols 17→3  = 15 cells  (pos 31–45)
    //   Left col   (col 3):  rows 4→17  = 14 cells  (pos 46–59)
    //
    // Player entries (evenly spaced, 10 apart):
    //   Red=0, Blue=10, Green=20, Yellow=30, Purple=40, Orange=50

    var TRACK_COORDS = [
        // Bottom row, going right (positions 0–15)
        [3,18],[4,18],[5,18],[6,18],[7,18],[8,18],[9,18],[10,18],
        [11,18],[12,18],[13,18],[14,18],[15,18],[16,18],[17,18],[18,18],
        // Right column, going up (positions 16–30)
        [18,17],[18,16],[18,15],[18,14],[18,13],[18,12],[18,11],[18,10],
        [18,9],[18,8],[18,7],[18,6],[18,5],[18,4],[18,3],
        // Top row, going left (positions 31–45)
        [17,3],[16,3],[15,3],[14,3],[13,3],[12,3],[11,3],[10,3],
        [9,3],[8,3],[7,3],[6,3],[5,3],[4,3],[3,3],
        // Left column, going down (positions 46–59)
        [3,4],[3,5],[3,6],[3,7],[3,8],[3,9],[3,10],[3,11],
        [3,12],[3,13],[3,14],[3,15],[3,16],[3,17],
    ];

    // ── Home-run corridors (6 cells each, from entry toward center area) ─────
    // Each corridor leads from near the entry point toward the center (10,10).
    // Position 0 = first cell into the corridor, position 5 = last cell (finish).

    var HOME_COORDS = {
        // Red (entry at pos 0 = (3,18)): diagonal toward center
        red:    [[4,17],[5,16],[6,15],[7,14],[8,13],[9,12]],
        // Blue (entry at pos 10 = (13,18)): straight up
        blue:   [[13,17],[13,16],[13,15],[13,14],[13,13],[13,12]],
        // Green (entry at pos 20 = (18,13)): straight left
        green:  [[17,11],[16,11],[15,11],[14,11],[13,11],[12,11]],
        // Yellow (entry at pos 30 = (17,3)): diagonal toward center
        yellow: [[16,4],[15,5],[14,6],[13,7],[12,8],[11,9]],
        // Purple (entry at pos 40 = (7,3)): straight down
        purple: [[7,4],[7,5],[7,6],[7,7],[7,8],[7,9]],
        // Orange (entry at pos 50 = (3,8)): straight right
        orange: [[4,10],[5,10],[6,10],[7,10],[8,10],[9,10]],
    };

    // ── Yard positions (2×2 blocks near each entry, outside the track) ────────

    var YARD_POSITIONS = {
        red:    [[1,19],[2,19],[1,20],[2,20]],
        blue:   [[12,19],[13,19],[12,20],[13,20]],
        green:  [[19,12],[20,12],[19,13],[20,13]],
        yellow: [[16,0],[17,0],[16,1],[17,1]],
        purple: [[6,0],[7,0],[6,1],[7,1]],
        orange: [[0,7],[1,7],[0,8],[1,8]],
    };

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

        // Check if this move passes through or lands on the entry position.
        // A marble enters the home run when it crosses the entry after completing a lap.
        // Distance from curTrack to entry, going clockwise:
        var distToEntry = (cfg.entry - curTrack + TRACK_SIZE) % TRACK_SIZE;
        var crossesEntry = distToEntry > 0 && distToEntry <= steps;

        if (crossesEntry) {
            var homeSteps = steps - distToEntry;
            if (homeSteps > HOME_SIZE) return null; // overshoot
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
            for (var i = 0; i < NUM_PAWNS; i++) {
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

    function getLegalMoves(color, diceValue, pawnPositions) {
        var moves = [];
        var pawns = pawnPositions[color];
        var cfg = COLOR_CONFIG[color];

        for (var pi = 0; pi < NUM_PAWNS; pi++) {
            var pos = pawns[pi];

            if (pos === null) {
                // In yard — need 1 or 6 to enter
                if (diceValue === 1 || diceValue === 6) {
                    if (!isBlockade(pawnPositions, cfg.entry)) {
                        var cap = checkCapture(color, cfg.entry, pawnPositions);
                        moves.push({
                            pawnIndex: pi, steps: 0, newPos: { track: cfg.entry },
                            capture: cap, enterFromYard: true,
                        });
                    }
                }
                continue;
            }

            if (pos === 'finished') continue;

            var result = advancePosition(color, pos, diceValue);
            if (result) {
                if (posIsTrack(result.newPos) && isBlockade(pawnPositions, result.newPos.track)) continue;
                var capture = result.enteredHome ? null :
                    posIsTrack(result.newPos) ? checkCapture(color, result.newPos.track, pawnPositions) : null;
                moves.push({
                    pawnIndex: pi, steps: diceValue, newPos: result.newPos,
                    capture: capture, enteredHome: result.enteredHome,
                });
            }
        }

        return moves;
    }

    // ── Pixel coordinates ──────────────────────────────────────────────────────

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
        NUM_PAWNS: NUM_PAWNS,
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
        TRACK_COORDS: TRACK_COORDS,
    };
})();
