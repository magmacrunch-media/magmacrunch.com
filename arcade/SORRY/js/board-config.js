/**
 * board-config.js
 * Pure data definitions for the SORRY! board.
 * No DOM references — safe to import in any environment.
 */

const COLORS = {
  RED:    'red',
  BLUE:   'blue',
  YELLOW: 'yellow',
  GREEN:  'green',
};

const PLAYERS = [COLORS.RED, COLORS.BLUE, COLORS.YELLOW, COLORS.GREEN];

const SLOT_NAMES = { red: 'Player 1', blue: 'Player 2', yellow: 'Player 3', green: 'Player 4' };

// ─── PERIMETER TRACK ──────────────────────────────────────────────────────────
// 60 squares in clockwise order including corners.
// Index 0 = top-left corner (1,1), proceeds clockwise.

function buildTrack() {
  const track = [];
  for (let x = 1; x <= 16; x++) track.push({ x, y: 1  });  // top:    16 sq
  for (let y = 2; y <= 16; y++) track.push({ x: 16, y });   // right:  15 sq
  for (let x = 15; x >= 1; x--) track.push({ x, y: 16 });  // bottom: 15 sq
  for (let y = 15; y >= 2; y--) track.push({ x: 1, y  });   // left:   14 sq
  // Total: 60 ✓
  return track;
}

const TRACK        = buildTrack();
const TRACK_LENGTH = TRACK.length; // 60

// Quick reverse lookup: "x,y" → track index
const XY_TO_TRACK = {};
TRACK.forEach((sq, i) => { XY_TO_TRACK[`${sq.x},${sq.y}`] = i; });

function trackIndexToXY(idx) {
  return TRACK[((idx % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH];
}

function trackDistance(from, to) {
  return ((to - from) % TRACK_LENGTH + TRACK_LENGTH) % TRACK_LENGTH;
}

// ─── COLOR TRACK CONFIG ───────────────────────────────────────────────────────
// entry:     track index where pawns enter the board from Start
// safeEntry: track index of the last perimeter square before the safe zone
//            (a pawn here can enter the safe zone on its next forward move)
// safe:      [{x,y}] — the 5 safe zone squares, index 0 = closest to track

const COLOR_CONFIG = {
  red: {
    entry:     XY_TO_TRACK['5,1'],
    safeEntry: XY_TO_TRACK['3,1'],
    safe: [
      { x:3, y:2 }, { x:3, y:3 }, { x:3, y:4 }, { x:3, y:5 }, { x:3, y:6 },
    ],
  },
  blue: {
    entry:     XY_TO_TRACK['16,5'],
    safeEntry: XY_TO_TRACK['16,3'],
    safe: [
      { x:15, y:3 }, { x:14, y:3 }, { x:13, y:3 }, { x:12, y:3 }, { x:11, y:3 },
    ],
  },
  yellow: {
    entry:     XY_TO_TRACK['12,16'],
    safeEntry: XY_TO_TRACK['14,16'],
    safe: [
      { x:14, y:15 }, { x:14, y:14 }, { x:14, y:13 }, { x:14, y:12 }, { x:14, y:11 },
    ],
  },
  green: {
    entry:     XY_TO_TRACK['1,12'],
    safeEntry: XY_TO_TRACK['1,14'],
    safe: [
      { x:2, y:14 }, { x:3, y:14 }, { x:4, y:14 }, { x:5, y:14 }, { x:6, y:14 },
    ],
  },
};

// ─── SLIDE DEFINITIONS ───────────────────────────────────────────────────────
// Each slide: { color, start: trackIdx, end: trackIdx }
// A pawn landing on `start` (and NOT of matching color) slides to `end`,
// bumping any pawns on squares it passes through (including end).

const SLIDES = (function() {
  const slides = [];
  // Red slides (top edge): positions 1→4 and 9→13
  slides.push({ color: 'red',    start: XY_TO_TRACK['2,1'],  end: XY_TO_TRACK['5,1']  });
  slides.push({ color: 'red',    start: XY_TO_TRACK['10,1'], end: XY_TO_TRACK['14,1'] });
  // Blue slides (right edge): positions 17→20 and 25→29
  slides.push({ color: 'blue',   start: XY_TO_TRACK['16,2'], end: XY_TO_TRACK['16,5'] });
  slides.push({ color: 'blue',   start: XY_TO_TRACK['16,10'],end: XY_TO_TRACK['16,14']});
  // Yellow slides (bottom edge): positions 46→43 and 38→34 (reversed direction)
  slides.push({ color: 'yellow', start: XY_TO_TRACK['15,16'],end: XY_TO_TRACK['12,16']});
  slides.push({ color: 'yellow', start: XY_TO_TRACK['7,16'], end: XY_TO_TRACK['3,16'] });
  // Green slides (left edge): positions 46→43 etc.
  slides.push({ color: 'green',  start: XY_TO_TRACK['1,15'], end: XY_TO_TRACK['1,12'] });
  slides.push({ color: 'green',  start: XY_TO_TRACK['1,7'],  end: XY_TO_TRACK['1,3']  });
  return slides;
})();

/**
 * If `trackIdx` is a slide start square that `color` should ride,
 * returns { slideEnd, slideBumps } where slideBumps is an array of
 * { pawnId, color } for every opponent pawn swept by the slide.
 * Returns null if no slide applies.
 */
function checkSlide(trackIdx, color, allPawns) {
  const slide = SLIDES.find(s => s.start === trackIdx && s.color !== color);
  if (!slide) return null;

  // Collect all track indices the slide passes through (start+1 … end inclusive).
  // Guard against any degenerate slide definition that could loop forever.
  const swept = [];
  let i = slide.start;
  const maxSteps = TRACK_LENGTH; // absolute ceiling — no real slide exceeds a few squares
  while (i !== slide.end && swept.length < maxSteps) {
    i = (i + 1) % TRACK_LENGTH;
    swept.push(i);
  }

  // Find opponent pawns sitting on swept squares.
  // Own pawns are never bumped by your own slide (Bug 1 fix).
  const slideBumps = [];
  Object.entries(allPawns).forEach(([c, cpawns]) => {
    if (c === color) return;  // skip friendly pawns
    cpawns.forEach(p => {
      const pos = p.boardPosition;
      if (!pos || pos === 'home' || pos.track === undefined) return;
      if (swept.includes(pos.track)) {
        slideBumps.push({ pawnId: p.id, color: c });
      }
    });
  });

  return { slideEnd: { track: slide.end }, slideBumps };
}

/**
 * If a move involved a slide, returns the slide definition { color, start, end }.
 * A move involved a slide when:
 *   - the pawn's raw advance would land on a SLIDES start square for a different color
 *   - AND the move's final `to` position is the slide end (not the start)
 * Returns null if the move didn't involve a slide.
 *
 * Used by the animation layer to know which cells to illuminate.
 */
function getSlideForMove(move, pawnColor) {
  if (!move || !move.from || move.to === 'home') return null;
  // A slide fired if there's a slide starting somewhere between `from` and `to`
  // whose color is not pawnColor. The easiest heuristic: check every SLIDES entry
  // to see if its start is NOT the move's final destination but IS a step along the way.
  // Since the move's `to` is the slide END, we just find the slide whose end matches `to`.
  if (!move.to || move.to.track === undefined) return null;
  return SLIDES.find(s => s.end === move.to.track && s.color !== pawnColor) || null;
}

// ─── POSITION HELPERS ─────────────────────────────────────────────────────────
/**
 * Position encoding used throughout game-state and renderer:
 *   null           → pawn is in Start zone
 *   { track: n }   → pawn is on perimeter square at track index n
 *   { safe: n }    → pawn is on safe zone square n (0=first, 4=last before home)
 *   'home'         → pawn is in Home
 */

function positionToXY(position, color) {
  if (!position || position === 'home') return null;
  if (position.track !== undefined) return trackIndexToXY(position.track);
  if (position.safe  !== undefined) return COLOR_CONFIG[color].safe[position.safe];
  return null;
}

function positionsEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.track !== undefined && b.track !== undefined) return a.track === b.track;
  if (a.safe  !== undefined && b.safe  !== undefined) return a.safe  === b.safe;
  return false;
}

/**
 * Advance a pawn's position forward or backward by `steps`.
 * Returns { position, lapped } or null if the move is illegal.
 *
 * `lapped` is true if this move caused the pawn to pass its entry square
 * for the first time (used to unlock safe zone entry).
 *
 * @param {{ track:number }|{ safe:number }|null} pos
 * @param {string}  color
 * @param {number}  steps
 * @param {boolean} alreadyLapped  — whether this pawn has already completed a lap
 */
function advancePosition(pos, color, steps, alreadyLapped) {
  const cfg = COLOR_CONFIG[color];

  // ── In safe zone ──
  if (pos && pos.safe !== undefined) {
    const newSafe = pos.safe + steps;
    if (newSafe < 0)   return null; // can't back out of safe zone
    if (newSafe === 5) return { position: 'home', lapped: true };
    if (newSafe > 5)   return null; // overshoot
    return { position: { safe: newSafe }, lapped: true };
  }

  // ── On perimeter ──
  if (pos && pos.track !== undefined) {
    if (steps < 0) {
      // Backward — wraps freely, never enters safe zone
      const newTrack = ((pos.track + steps) % TRACK_LENGTH + TRACK_LENGTH) % TRACK_LENGTH;
      return { position: { track: newTrack }, lapped: alreadyLapped };
    }

    // Forward — check if this move causes the pawn to lap (pass through/reach entry)
    const entry = cfg.entry;
    const distToEntry = ((entry - pos.track + TRACK_LENGTH) % TRACK_LENGTH);
    // willLap: the pawn crosses or lands on its entry square for the first time.
    // distToEntry === 0 means the pawn IS at its entry square — it exited Start and
    // has come all the way around, so ANY forward move now counts as lapped.
    const willLap = !alreadyLapped && (distToEntry === 0 || steps >= distToEntry);
    const nowLapped = alreadyLapped || willLap;

    // Check if we reach the safe zone entry (only if lapped).
    // Guard: safeEntry must actually be AHEAD of the pawn in the forward direction
    // AND must be reachable before the pawn would lap past entry again.
    // Without this guard, a pawn sitting one step past safeEntry computes
    // distToSafe = 59 (wrapping the whole board) and spuriously enters the safe zone.
    if (nowLapped) {
      const distToSafe  = ((cfg.safeEntry - pos.track + TRACK_LENGTH) % TRACK_LENGTH);
      const distToEntry = ((cfg.entry     - pos.track + TRACK_LENGTH) % TRACK_LENGTH);
      // safeEntry is only genuinely ahead if it comes before entry in the forward direction.
      // (distToEntry === 0 means the pawn IS at entry — safe zone is still reachable ahead.)
      const safeReachable = (distToEntry === 0)
        ? distToSafe < TRACK_LENGTH   // at entry: safe zone is ~58 steps ahead, always reachable
        : distToSafe < distToEntry;   // safe zone must come before entry going forward
      if (safeReachable && steps >= distToSafe) {
        const safeSteps = steps - distToSafe;
        if (safeSteps > 5) return null; // overshoot HOME
        if (safeSteps === 5) return { position: 'home', lapped: true };
        return { position: { safe: safeSteps }, lapped: true };
      }
    }

    // Normal forward move on perimeter
    const newTrack = (pos.track + steps) % TRACK_LENGTH;
    return { position: { track: newTrack }, lapped: nowLapped };
  }

  return null;
}

// ─── LEGAL MOVE CALCULATOR ────────────────────────────────────────────────────
/**
 * Returns all legal moves for `color` given the full `allPawns` map and `cardValue`.
 *
 * Move shape:
 *   { pawnId, from, to, steps, lapped, bump, slideBumps }
 *   bump:       { pawnId, color } opponent to send to Start on landing, or null
 *   slideBumps: array of { pawnId, color } swept by a slide
 *
 * Card 7 split moves also carry:
 *   { isSplit: true, splitPartner: { pawnId, from, to, steps, lapped, bump, slideBumps } }
 *
 * Card 11 swap moves carry:
 *   { isSwap: true, swapWith: { pawnId, color }, swapTo: position }
 *   (swapTo is where the opponent pawn ends up — our old square)
 */
function getLegalMoves(color, allPawns, cardValue) {
  const cfg   = COLOR_CONFIG[color];
  const pawns = allPawns[color];
  const moves = [];

  // ── Build occupancy maps ──────────────────────────────────────────────────
  const friendlyTrack   = new Set();
  const friendlySafe    = new Set();
  // Bug 5 fix: store an array of opponents per cell (not just the last one seen).
  const opponentsByTrack = {};   // trackIdx → [{ pawnId, color }, …]

  Object.entries(allPawns).forEach(([c, cpawns]) => {
    cpawns.forEach(p => {
      const pos = p.boardPosition;
      if (!pos || pos === 'home') return;
      if (pos.track !== undefined) {
        if (c === color) {
          friendlyTrack.add(pos.track);
        } else {
          if (!opponentsByTrack[pos.track]) opponentsByTrack[pos.track] = [];
          opponentsByTrack[pos.track].push({ pawnId: p.id, color: c });
        }
      }
      if (pos.safe !== undefined && c === color) friendlySafe.add(pos.safe);
    });
  });

  // Convenience: return the first (and normally only) opponent at a track cell,
  // or null. Used by bump logic which only ever bumps one pawn per landing square.
  function oppAt(trackIdx) {
    const arr = opponentsByTrack[trackIdx];
    return (arr && arr.length > 0) ? arr[0] : null;
  }

  // ── Helper: is a destination legal for THIS color? ────────────────────────
  // Returns null if blocked by friendly, or { bump } (bump may be null).
  // `excludeTrack` optionally ignores a friendly pawn that has already moved.
  function checkDest(to, excludeTrack) {
    if (to === 'home') return { bump: null };
    if (to.safe !== undefined) {
      if (friendlySafe.has(to.safe)) return null;
      return { bump: null };
    }
    if (to.track !== undefined) {
      if (to.track !== excludeTrack && friendlyTrack.has(to.track)) return null;
      const opp = oppAt(to.track);
      return { bump: opp };
    }
    return null;
  }

  // ── Helper: build a single pawn move (handles slide, returns null if illegal) ──
  function buildMove(pawn, steps, extraExcludeTrack) {
    const pos = pawn.boardPosition;
    if (pos === null || pos === 'home') return null;

    const result = advancePosition(pos, color, steps, pawn.lapped);
    if (result === null) return null;

    const dest = checkDest(result.position, extraExcludeTrack);
    if (dest === null) return null;

    let finalPos   = result.position;
    let slideBumps = [];
    let highlightAt = null;
    if (finalPos.track !== undefined) {
      const slide = checkSlide(finalPos.track, color, allPawns);
      if (slide) {
        highlightAt = finalPos;        // show the slide START as the highlight
        finalPos   = slide.slideEnd;   // pawn actually ends up at the slide end
        slideBumps = slide.slideBumps;
        const slideDest = checkDest(finalPos, extraExcludeTrack);
        if (slideDest === null) return null;
      }
    }

    return {
      pawnId:      pawn.id,
      from:        pos,
      to:          finalPos,
      highlightAt, // null for non-slide moves; slide start position otherwise
      steps,
      lapped:      result.lapped,
      bump:        dest.bump,
      slideBumps,
    };
  }

  // ── Sorry card ────────────────────────────────────────────────────────────
  if (cardValue === 'sorry') {
    const hasPawnInStart = pawns.some(p => p.boardPosition === null);
    if (hasPawnInStart) {
      Object.entries(opponentsByTrack).forEach(([trackIdxStr, opps]) => {
        const trackIdx = parseInt(trackIdxStr);
        if (friendlyTrack.has(trackIdx)) return;
        opps.forEach(opp => {
          pawns.forEach(pawn => {
            if (pawn.boardPosition !== null) return;

            // Check if landing square triggers a slide for our color
            let finalPos   = { track: trackIdx };
            let slideBumps = [];
            let highlightAt = null;
            let bump       = opp;  // the opponent pawn we're Sorry-ing

            const slide = checkSlide(trackIdx, color, allPawns);
            if (slide) {
              // The opponent pawn at trackIdx gets bumped back to Start (already in `bump`).
              // Filter it out of slideBumps so it isn't bumped a second time (Bug 3 fix).
              highlightAt = finalPos;   // show the slide start as the highlight
              finalPos   = slide.slideEnd;
              slideBumps = slide.slideBumps.filter(sb => sb.pawnId !== opp.pawnId);
              // If a friendly pawn sits at the slide end, the move is blocked
              const slideDestOk = checkDest(finalPos);
              if (slideDestOk === null) return;
              // The slide end might have a different opponent to bump
              if (slideDestOk.bump) bump = slideDestOk.bump;
            }

            moves.push({
              pawnId: pawn.id, from: null, to: finalPos, highlightAt,
              steps: 0, lapped: false, bump, slideBumps, isSorry: true,
            });
          });
        });
      });
    }
    return moves;
  }

  // ── Card 11 — move 11 OR swap with any opponent pawn on the perimeter ─────
  if (cardValue === '11') {
    // Normal 11-step moves
    pawns.forEach(pawn => {
      const m = buildMove(pawn, 11);
      if (m) moves.push(m);
    });

    // Swap option: any on-board pawn of ours (not in Start/Home) can swap with
    // any opponent pawn on the perimeter (not safe, not home, not start).
    pawns.forEach(pawn => {
      const myPos = pawn.boardPosition;
      if (!myPos || myPos === 'home' || myPos.safe !== undefined) return;

      Object.entries(opponentsByTrack).forEach(([trackIdxStr, opps]) => {
        const trackIdx = parseInt(trackIdxStr);
        // After swap: we go to opponent's square, opponent comes to our square.
        // Our destination must not be blocked by another friendly pawn.
        if (friendlyTrack.has(trackIdx)) return;

        opps.forEach(opp => {
          // Check if landing on the swapped square triggers a slide for our color.
          // (Bug 2 fix: swaps must respect slide rules just like normal moves.)
          let finalPos   = { track: trackIdx };
          let slideBumps = [];
          let highlightAt = null;
          const slide = checkSlide(trackIdx, color, allPawns);
          if (slide) {
            // Opponent pawn at trackIdx is displaced by the swap, not bumped —
            // but any additional pawns swept by the slide do get bumped.
            highlightAt = finalPos;   // show the slide start as the highlight
            finalPos   = slide.slideEnd;
            slideBumps = slide.slideBumps.filter(sb => sb.pawnId !== opp.pawnId);
            // Slide end must not be blocked by a friendly pawn
            if (checkDest(finalPos) === null) return;
          }

          // Opponent's destination (our old square) — allowed even if another
          // opponent is there (they just share; game doesn't block that).
          moves.push({
            pawnId:   pawn.id,
            from:     myPos,
            to:       finalPos,
            highlightAt,
            steps:    0,
            lapped:   pawn.lapped,
            bump:     null,
            slideBumps,
            isSwap:   true,
            swapWith: opp,
            swapTo:   myPos,
          });
        });
      });
    });

    return moves;
  }

  // ── Card 7 — individual step moves 1-7; split UI handled by caller ──────────
  if (cardValue === '7') {
    // Return valid moves for card 7. Rules:
    //   - A full 7-step move on a single pawn is always valid if the destination exists.
    //   - A split move (1–6 steps) is only valid if a second pawn can legally take the
    //     remaining steps — otherwise the 7 cannot be completed and the move is illegal.
    // If NO moves are returned, getLegalMoves signals "no moves" → auto-skip fires.
    const onBoard = pawns.filter(p => p.boardPosition !== null && p.boardPosition !== 'home');

    onBoard.forEach(pawn => {
      // Full 7 — always include if destination is legal
      const full = buildMove(pawn, 7);
      if (full) moves.push(full);

      // Splits (1–6): only include if the remainder can be completed by another pawn
      for (let s = 1; s <= 6; s++) {
        const m = buildMove(pawn, s);
        if (!m) continue;
        const remaining = 7 - s;
        // Simulate pawn at new position and check if any other on-board pawn
        // can cover the remaining steps
        const simPawns = JSON.parse(JSON.stringify(allPawns));
        const simPawn  = simPawns[color].find(p => p.id === pawn.id);
        if (simPawn) { simPawn.boardPosition = m.to; simPawn.lapped = m.lapped; }
        const secondMoves = getSplitMoves(color, simPawns, pawn.id, m.to, remaining);
        if (secondMoves.length > 0) moves.push(m);
      }
    });
    return moves;
  }

  // ── Standard cards ────────────────────────────────────────────────────────
  const canExit = (cardValue === '1' || cardValue === '2');

  pawns.forEach(pawn => {
    const pos = pawn.boardPosition;

    if (pos === null) {
      if (canExit) {
        const dest = checkDest({ track: cfg.entry });
        if (dest !== null) {
          moves.push({ pawnId: pawn.id, from: null, to: { track: cfg.entry },
                       steps: 0, lapped: false, bump: dest.bump, slideBumps: [] });
        }
      }
      return;
    }

    if (pos === 'home') return;

    let stepOptions;
    switch (cardValue) {
      case '1':  stepOptions = [1];       break;
      case '2':  stepOptions = [2];       break;
      case '3':  stepOptions = [3];       break;
      case '4':  stepOptions = [-4];      break;
      case '5':  stepOptions = [5];       break;
      case '8':  stepOptions = [8];       break;
      case '10': stepOptions = [10, -1];  break;
      case '12': stepOptions = [12];      break;
      default:   return;
    }

    stepOptions.forEach(steps => {
      const m = buildMove(pawn, steps);
      if (m) moves.push(m);
    });
  });

  return moves;
}

/**
 * For card 7 split phase 2: given that pawnA has already moved to `movedTo`,
 * and `remaining` steps are left, return all valid moves for other pawns.
 *
 * `movedPawnId`  — the pawn that already moved (exclude from candidates)
 * `movedTo`      — where that pawn now sits (treat as friendly-occupied)
 * `remaining`    — steps left (= 7 - steps already used)
 */
function getSplitMoves(color, allPawns, movedPawnId, movedTo, remaining) {
  const pawns = allPawns[color];

  // Rebuild occupancy, but swap in the new position for the moved pawn
  const friendlyTrack  = new Set();
  const friendlySafe   = new Set();
  // Bug 5 fix: store arrays per cell, not a single value.
  const opponentsByTrack = {};

  Object.entries(allPawns).forEach(([c, cpawns]) => {
    cpawns.forEach(p => {
      // Use movedTo instead of the original position for the moved pawn
      const pos = (p.id === movedPawnId) ? movedTo : p.boardPosition;
      if (!pos || pos === 'home') return;
      if (pos.track !== undefined) {
        if (c === color) {
          friendlyTrack.add(pos.track);
        } else {
          if (!opponentsByTrack[pos.track]) opponentsByTrack[pos.track] = [];
          opponentsByTrack[pos.track].push({ pawnId: p.id, color: c });
        }
      }
      if (pos.safe !== undefined && c === color) friendlySafe.add(pos.safe);
    });
  });

  function oppAt(trackIdx) {
    const arr = opponentsByTrack[trackIdx];
    return (arr && arr.length > 0) ? arr[0] : null;
  }

  function checkDest(to) {
    if (to === 'home') return { bump: null };
    if (to.safe !== undefined) {
      if (friendlySafe.has(to.safe)) return null;
      return { bump: null };
    }
    if (to.track !== undefined) {
      if (friendlyTrack.has(to.track)) return null;
      return { bump: oppAt(to.track) };
    }
    return null;
  }

  const moves = [];
  // Simulate the first pawn's new position once, reused for all slide checks below.
  const simPawns = JSON.parse(JSON.stringify(allPawns));
  const movedPawnObj = simPawns[color].find(p => p.id === movedPawnId);
  if (movedPawnObj) { movedPawnObj.boardPosition = movedTo; }

  pawns.forEach(pawn => {
    if (pawn.id === movedPawnId) return;           // can't move the same pawn twice
    const pos = pawn.boardPosition;
    if (!pos || pos === 'home') return;

    const result = advancePosition(pos, color, remaining, pawn.lapped);
    if (!result) return;
    const dest = checkDest(result.position);
    if (!dest) return;

    let finalPos   = result.position;
    let slideBumps = [];
    let highlightAt = null;
    if (finalPos.track !== undefined) {
      const slide = checkSlide(finalPos.track, color, simPawns);
      if (slide) {
        highlightAt = finalPos;
        finalPos   = slide.slideEnd;
        slideBumps = slide.slideBumps;
        if (!checkDest(finalPos)) return;
      }
    }

    moves.push({
      pawnId: pawn.id, from: pos, to: finalPos, highlightAt,
      steps: remaining, lapped: result.lapped,
      bump: dest.bump, slideBumps,
    });
  });

  return moves;
}

function buildPerimeterCells() {
  const cells = [];
  const add = (x, y, type, color = null, icon = null) =>
    cells.push({ x, y, type, color, icon });

  // TOP EDGE (y=1)
  add(1,  1, 'corner');
  add(2,  1, 'slide',     'red', '▶');
  add(3,  1, 'slide',     'red', '━');
  add(4,  1, 'slide',     'red', '━');
  add(5,  1, 'slide-end', 'red', '●');
  for (let i = 6; i <= 9; i++) add(i, 1, 'plain');
  add(10, 1, 'slide',     'red', '▶');
  add(11, 1, 'slide',     'red', '━');
  add(12, 1, 'slide',     'red', '━');
  add(13, 1, 'slide',     'red', '━');
  add(14, 1, 'slide-end', 'red', '●');
  add(15, 1, 'plain');
  add(16, 1, 'corner');

  // RIGHT EDGE (x=16)
  add(16, 2,  'slide',     'blue', '▼');
  add(16, 3,  'slide',     'blue', '┃');
  add(16, 4,  'slide',     'blue', '┃');
  add(16, 5,  'slide-end', 'blue', '●');
  for (let i = 6; i <= 9; i++) add(16, i, 'plain');
  add(16, 10, 'slide',     'blue', '▼');
  add(16, 11, 'slide',     'blue', '┃');
  add(16, 12, 'slide',     'blue', '┃');
  add(16, 13, 'slide',     'blue', '┃');
  add(16, 14, 'slide-end', 'blue', '●');
  add(16, 15, 'plain');
  add(16, 16, 'corner');

  // BOTTOM EDGE (y=16, right to left)
  add(15, 16, 'slide',     'yellow', '◀');
  add(14, 16, 'slide',     'yellow', '━');
  add(13, 16, 'slide',     'yellow', '━');
  add(12, 16, 'slide-end', 'yellow', '●');
  for (let i = 11; i >= 8; i--) add(i, 16, 'plain');
  add(7,  16, 'slide',     'yellow', '◀');
  add(6,  16, 'slide',     'yellow', '━');
  add(5,  16, 'slide',     'yellow', '━');
  add(4,  16, 'slide',     'yellow', '━');
  add(3,  16, 'slide-end', 'yellow', '●');
  add(2,  16, 'plain');
  add(1,  16, 'corner');

  // LEFT EDGE (x=1, bottom to top)
  add(1, 15, 'slide',     'green', '▲');
  add(1, 14, 'slide',     'green', '┃');
  add(1, 13, 'slide',     'green', '┃');
  add(1, 12, 'slide-end', 'green', '●');
  for (let i = 11; i >= 8; i--) add(1, i, 'plain');
  add(1, 7,  'slide',     'green', '▲');
  add(1, 6,  'slide',     'green', '┃');
  add(1, 5,  'slide',     'green', '┃');
  add(1, 4,  'slide',     'green', '┃');
  add(1, 3,  'slide-end', 'green', '●');
  add(1, 2,  'plain');

  return cells;
}

function buildSafeCells() {
  const cells = [];
  const add = (x, y, color, icon) => cells.push({ x, y, type: 'safe', color, icon });

  add(3, 2, 'red', '▼'); add(3, 3, 'red', '┃'); add(3, 4, 'red', '┃');
  add(3, 5, 'red', '┃'); add(3, 6, 'red', '▼');

  add(15, 3, 'blue', '◀'); add(14, 3, 'blue', '━'); add(13, 3, 'blue', '━');
  add(12, 3, 'blue', '━'); add(11, 3, 'blue', '◀');

  add(14, 15, 'yellow', '▲'); add(14, 14, 'yellow', '┃'); add(14, 13, 'yellow', '┃');
  add(14, 12, 'yellow', '┃'); add(14, 11, 'yellow', '▲');

  add(2, 14, 'green', '▶'); add(3, 14, 'green', '━'); add(4, 14, 'green', '━');
  add(5, 14, 'green', '━'); add(6, 14, 'green', '▶');

  return cells;
}

const BIG_ZONES = [
  { type: 'start', color: 'red',    col: '4 / span 3',  row: '2 / span 3',  arrow: '▲', arrowStyle: 'top:-12px;left:calc(50% - 8px)' },
  { type: 'home',  color: 'red',    col: '2 / span 3',  row: '7 / span 3' },
  { type: 'start', color: 'blue',   col: '13 / span 3', row: '4 / span 3',  arrow: '▶', arrowStyle: 'right:-12px;top:calc(50% - 8px)' },
  { type: 'home',  color: 'blue',   col: '8 / span 3',  row: '2 / span 3' },
  { type: 'start', color: 'yellow', col: '11 / span 3', row: '13 / span 3', arrow: '▼', arrowStyle: 'bottom:-12px;left:calc(50% - 8px)' },
  { type: 'home',  color: 'yellow', col: '13 / span 3', row: '8 / span 3' },
  { type: 'start', color: 'green',  col: '2 / span 3',  row: '11 / span 3', arrow: '◀', arrowStyle: 'left:-12px;top:calc(50% - 8px)' },
  { type: 'home',  color: 'green',  col: '7 / span 3',  row: '13 / span 3' },
];

const PERIMETER_CELLS = buildPerimeterCells();
const SAFE_CELLS      = buildSafeCells();
const ALL_CELLS       = [...PERIMETER_CELLS, ...SAFE_CELLS];
