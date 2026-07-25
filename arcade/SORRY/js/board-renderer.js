/**
 * board-renderer.js
 * Handles all DOM creation and updates for the SORRY! board.
 *
 * render(boardEl)               → builds static board DOM (call once)
 * update(boardEl, state)        → repaints pawns + highlights on state change
 * highlightMoves(boardEl, moves, color) → shows legal destination cells
 * clearHighlights(boardEl)      → removes all move highlights
 */

// ─── RENDER BOARD (one-time setup) ───────────────────────────────────────────

function renderBoard(boardEl) {
  boardEl.innerHTML = '';
  _renderCells(boardEl);
  _renderBigZones(boardEl);
  _renderCenterLogo(boardEl);
}

// ─── RENDER CELLS ─────────────────────────────────────────────────────────────

function _renderCells(boardEl) {
  ALL_CELLS.forEach(c => {
    const el = document.createElement('div');
    el.className = `cell ${c.type}`;
    el.dataset.x = c.x;
    el.dataset.y = c.y;
    if (c.color) el.classList.add(`bg-${c.color}`);
    el.style.gridColumn = c.x;
    el.style.gridRow    = c.y;
    if (c.icon) el.textContent = c.icon;
    boardEl.appendChild(el);
  });
}

// ─── RENDER BIG ZONES ────────────────────────────────────────────────────────

function _renderBigZones(boardEl) {
  BIG_ZONES.forEach(z => {
    const el = document.createElement('div');
    el.className = `big-zone zone-${z.color}`;
    el.dataset.zoneType  = z.type;
    el.dataset.zoneColor = z.color;
    el.style.gridColumn  = z.col;
    el.style.gridRow     = z.row;

    let inner = `<div class="zone-inner">${z.type.toUpperCase()}`;
    if (z.arrow) {
      inner += `<div class="start-arrow" style="${z.arrowStyle}">${z.arrow}</div>`;
    }
    if (z.type === 'start') {
      inner += `<div class="pawn-tray" data-color="${z.color}"></div>`;
    }
    inner += `</div>`;

    el.innerHTML = inner;
    boardEl.appendChild(el);
  });
}

// ─── RENDER CENTER LOGO ───────────────────────────────────────────────────────

function _renderCenterLogo(boardEl) {
  const logo = document.createElement('div');
  logo.className = 'center-logo';
  logo.innerHTML = `
    <div class="center-diamond">
      <div class="logo-text">SORRY!</div>
    </div>
  `;
  boardEl.appendChild(logo);
}

// ─── UPDATE (called on every state change) ────────────────────────────────────

function update(boardEl, state) {
  clearHighlights(boardEl);  // Remove move highlights & listeners before wiping DOM
  _clearPawns(boardEl);
  _placePawns(boardEl, state);
  _highlightCurrentTurn(boardEl, state);
}

function _clearPawns(boardEl) {
  boardEl.querySelectorAll('.pawn').forEach(p => p.remove());
  boardEl.querySelectorAll('.pawn-tray, .home-tray').forEach(t => { t.innerHTML = ''; });
}

function _placePawns(boardEl, state) {
  Object.entries(state.pawns).forEach(([color, pawns]) => {
    pawns.forEach(pawn => {
      const pawnEl = _makePawnEl(pawn);
      const pos    = pawn.boardPosition;

      if (pos === null) {
        // In Start zone
        const tray = boardEl.querySelector(`.pawn-tray[data-color="${color}"]`);
        if (tray) tray.appendChild(pawnEl);

      } else if (pos === 'home') {
        // In Home zone — place into the inner tray, not directly on big-zone
        const homeZone = boardEl.querySelector(
          `.big-zone[data-zone-type="home"][data-zone-color="${color}"]`
        );
        if (homeZone) {
          let homeTray = homeZone.querySelector('.home-tray');
          if (!homeTray) {
            homeTray = document.createElement('div');
            homeTray.className = 'home-tray';
            homeZone.querySelector('.zone-inner').appendChild(homeTray);
          }
          homeTray.appendChild(pawnEl);
        }

      } else {
        // On a board cell — convert logical position → x,y
        const xy = positionToXY(pos, color);
        if (xy) {
          const cell = boardEl.querySelector(
            `.cell[data-x="${xy.x}"][data-y="${xy.y}"]`
          );
          if (cell) cell.appendChild(pawnEl);
        }
      }
    });
  });
}

function _makePawnEl(pawn) {
  const el = document.createElement('div');
  el.className = `pawn pawn-${pawn.color}`;
  el.dataset.pawnId    = pawn.id;
  el.dataset.pawnColor = pawn.color;
  el.title = `${SLOT_NAMES[pawn.color] || pawn.color} pawn`;
  return el;
}

// ─── TURN HIGHLIGHT ───────────────────────────────────────────────────────────

function _highlightCurrentTurn(boardEl, state) {
  boardEl.querySelectorAll('.active-turn').forEach(el => {
    el.classList.remove('active-turn');
    delete el.dataset.activeColor;
  });

  if (state.phase !== 'playing') return;

  const color = state.currentTurn;
  boardEl.querySelectorAll(`.big-zone[data-zone-color="${color}"]`).forEach(zone => {
    zone.classList.add('active-turn');
    zone.dataset.activeColor = color;
  });
}

// ─── MOVE HIGHLIGHTS ──────────────────────────────────────────────────────────

/**
 * Highlight legal destination cells and make movable pawns selectable.
 *
 * @param {HTMLElement} boardEl
 * @param {Array}       moves      from getLegalMoves()
 * @param {string}      color      active player's color
 * @param {Function}    onMove     callback(move) when a destination is clicked
 */
function highlightMoves(boardEl, moves, color, onMove) {
  clearHighlights(boardEl);

  if (!moves || moves.length === 0) return;

  // Group moves by pawnId so we can highlight pawns that have options
  const movesByPawn = {};
  moves.forEach(m => {
    if (!movesByPawn[m.pawnId]) movesByPawn[m.pawnId] = [];
    movesByPawn[m.pawnId].push(m);
  });

  const movablePawnIds = Object.keys(movesByPawn);

  // Mark all movable pawns and let the player click one to select it.
  // This is consistent whether one or multiple pawns can move.
  movablePawnIds.forEach(pawnId => {
    const pawnEl = boardEl.querySelector(`.pawn[data-pawn-id="${pawnId}"]`);
    if (pawnEl) pawnEl.classList.add('pawn-movable');
  });

  // Delegated click handler on the board — fires when any movable pawn is clicked.
  function handlePawnClick(e) {
    const pawnEl = e.target.closest('.pawn-movable');
    if (!pawnEl) return;
    e.stopPropagation();
    const pawnId = pawnEl.dataset.pawnId;
    if (movesByPawn[pawnId]) {
      _selectPawn(boardEl, pawnId, movesByPawn[pawnId], color, onMove);
    }
  }

  boardEl._pawnClickHandler = handlePawnClick;
  boardEl.addEventListener('click', handlePawnClick);
}

function _selectPawn(boardEl, pawnId, pawnMoves, color, onMove) {
  // Clear any existing destination highlights (keep pawn-movable highlights).
  boardEl.querySelectorAll('.dest-highlight').forEach(el => {
    el.classList.remove('dest-highlight');
    delete el.dataset.destColor;
    if (el._moveHandler) {
      el.removeEventListener('click', el._moveHandler);
      delete el._moveHandler;
    }
  });
  boardEl.querySelectorAll('.pawn-selected').forEach(el => el.classList.remove('pawn-selected'));

  // Mark selected pawn
  const selectedPawnEl = boardEl.querySelector(`.pawn[data-pawn-id="${pawnId}"]`);
  if (selectedPawnEl) selectedPawnEl.classList.add('pawn-selected');

  // Highlight each destination cell and wire up its click handler.
  // We do NOT use { once: true } — we manage removal explicitly in clearHighlights
  // so that re-selecting a different pawn always cleans up correctly.
  pawnMoves.forEach(move => {
    // Use highlightAt if set (e.g. slide start square) so the highlight shows
    // where the pawn actually lands before the slide fires — the slide end is
    // a surprise bonus, not shown upfront.
    const highlightPos = move.highlightAt || move.to;
    const destEl = _getDestinationElement(boardEl, highlightPos, color);
    if (!destEl) {
      console.warn('[renderer] _getDestinationElement returned null for', move.to, color);
      return;
    }

    destEl.classList.add('dest-highlight');
    destEl.dataset.destColor = color;

    const handler = (e) => {
      e.stopPropagation();
      clearHighlights(boardEl);
      onMove(move);
    };
    destEl._moveHandler = handler;
    destEl.addEventListener('click', handler);
  });
}

/**
 * Given a move's `to` position and the active player's color,
 * return the DOM element to highlight as the destination.
 *
 *   'home'         → the home big-zone for this color
 *   { track: n }   → the perimeter cell at that track index
 *   { safe: n }    → the safe-zone cell at that safe index
 */
function _getDestinationElement(boardEl, to, color) {
  if (!to) return null;

  if (to === 'home') {
    return boardEl.querySelector(
      `.big-zone[data-zone-type="home"][data-zone-color="${color}"]`
    );
  }

  const xy = positionToXY(to, color);
  if (!xy) return null;

  return boardEl.querySelector(`.cell[data-x="${xy.x}"][data-y="${xy.y}"]`);
}

// ─── SLIDE ANIMATION ──────────────────────────────────────────────────────────

/**
 * Play a slide animation for a move that triggered a slide:
 *   1. Flash each slide cell in sequence (start → end)
 *   2. Shake + eject any bumped pawns
 *   3. Flash the moving pawn with a whoosh as it "arrives"
 *   4. Call onDone() so the caller can proceed with sending the move
 *
 * @param {HTMLElement} boardEl
 * @param {object}      move        move object (with slideBumps, to, pawnId)
 * @param {string}      pawnColor   the moving pawn's color
 * @param {object}      slide       { color, start, end } from getSlideForMove()
 * @param {Function}    onDone      called after animation completes
 */
function playSlideAnimation(boardEl, move, pawnColor, slide, onDone) {
  // Collect track indices along the slide (start inclusive → end inclusive)
  const cellIndices = [slide.start];
  let i = slide.start;
  while (i !== slide.end && cellIndices.length < TRACK_LENGTH) {
    i = (i + 1) % TRACK_LENGTH;
    cellIndices.push(i);
  }

  // Resolve to DOM elements
  const cellEls = cellIndices.map(idx => {
    const xy = trackIndexToXY(idx);
    return xy ? boardEl.querySelector(`.cell[data-x="${xy.x}"][data-y="${xy.y}"]`) : null;
  }).filter(Boolean);

  const STEP_MS = 55;   // delay between each cell lighting up
  const HOLD_MS = 130;  // how long each cell stays lit
  const slideColorVar = `var(--color-${slide.color})`;

  // 1. Ripple flash along slide cells
  cellEls.forEach((el, idx) => {
    const delay = idx * STEP_MS;
    setTimeout(() => {
      el.style.setProperty('--slide-flash-color', slideColorVar);
      el.classList.add('slide-flash');
      setTimeout(() => {
        el.classList.remove('slide-flash');
        el.style.removeProperty('--slide-flash-color');
      }, HOLD_MS);
    }, delay);
  });

  // 2. Shake + eject bumped pawns (fires alongside the flash)
  move.slideBumps.forEach(sb => {
    const pawnEl = boardEl.querySelector(`.pawn[data-pawn-id="${sb.pawnId}"]`);
    if (pawnEl) {
      pawnEl.classList.add('slide-bump-eject');
      setTimeout(() => pawnEl.classList.remove('slide-bump-eject'), 600);
    }
  });

  // 3. Whoosh the moving pawn as the ripple reaches it
  const movingPawnEl = boardEl.querySelector(`.pawn[data-pawn-id="${move.pawnId}"]`);
  const whooshDelay = cellEls.length * STEP_MS;
  if (movingPawnEl) {
    setTimeout(() => {
      movingPawnEl.classList.add('slide-whoosh');
      setTimeout(() => movingPawnEl.classList.remove('slide-whoosh'), 400);
    }, whooshDelay);
  }

  // 4. Call onDone after the full sequence
  setTimeout(onDone, whooshDelay + 320);
}

function clearHighlights(boardEl) {
  // Remove delegated pawn-click listener
  if (boardEl._pawnClickHandler) {
    boardEl.removeEventListener('click', boardEl._pawnClickHandler);
    delete boardEl._pawnClickHandler;
  }
  boardEl.querySelectorAll('.pawn-movable, .pawn-selected').forEach(el => {
    el.classList.remove('pawn-movable', 'pawn-selected');
  });
  boardEl.querySelectorAll('.dest-highlight').forEach(el => {
    el.classList.remove('dest-highlight');
    delete el.dataset.destColor;
    el._moveHandler && el.removeEventListener('click', el._moveHandler);
    delete el._moveHandler;
  });
}
