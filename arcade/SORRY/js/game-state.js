/**
 * game-state.js
 * Manages all mutable game state: whose turn it is, pawn positions, scores, etc.
 *
 * Designed to be multiplayer-ready:
 *   - State is a plain serializable object → easy to sync over WebSocket/WebRTC.
 *   - All mutations go through applyAction() → single entry point for remote events.
 *   - Subscribe to state changes via onStateChange().
 *
 * MULTIPLAYER INTEGRATION POINTS (marked with 🌐):
 *   - When you receive a remote action, call: GameState.applyAction(action)
 *   - When local player acts, call applyAction() then broadcast the action object.
 *   - Replace INITIAL_STATE with server-provided state on game join.
 */

// ─── INITIAL STATE ────────────────────────────────────────────────────────────

function createInitialState() {
  const pawns = {};
  PLAYERS.forEach(color => {
    // Each player has 4 pawns, all starting in the START zone (position: null = not on board)
    pawns[color] = [
      { id: `${color}-0`, color, boardPosition: null, inHome: false, lapped: false },
      { id: `${color}-1`, color, boardPosition: null, inHome: false, lapped: false },
      { id: `${color}-2`, color, boardPosition: null, inHome: false, lapped: false },
      { id: `${color}-3`, color, boardPosition: null, inHome: false, lapped: false },
    ];
  });

  return {
    phase: 'lobby',        // 'lobby' | 'playing' | 'finished'
    currentTurn: PLAYERS[0],
    currentCard: null,     // card object drawn this turn, cleared after move
    turnNumber: 0,
    winner: null,
    pawns,
    lastAction: null,
    players: {},
  };
}

// ─── STATE & LISTENERS ───────────────────────────────────────────────────────

let _state = createInitialState();
const _listeners = new Set();

function getState() {
  // Return a shallow clone so callers can't accidentally mutate
  return { ..._state, pawns: JSON.parse(JSON.stringify(_state.pawns)) };
}

/** Subscribe to any state change. Returns an unsubscribe function. */
function onStateChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function _notify() {
  const snapshot = getState();
  _listeners.forEach(fn => fn(snapshot));
}

// ─── ACTION TYPES ─────────────────────────────────────────────────────────────

const ActionTypes = {
  START_GAME:       'START_GAME',
  SET_CARD:         'SET_CARD',
  MOVE_PAWN:        'MOVE_PAWN',
  SEND_HOME:        'SEND_HOME',
  ADVANCE_TURN:     'ADVANCE_TURN',
  SYNC_TURN_COLOR:  'SYNC_TURN_COLOR',  // Directly set currentTurn color from server
  END_GAME:         'END_GAME',
  PLAYER_JOIN:      'PLAYER_JOIN',
  PLAYER_LEAVE:     'PLAYER_LEAVE',
  SYNC_STATE:       'SYNC_STATE',
};

// ─── APPLY ACTION (single mutation entry point) ───────────────────────────────

/**
 * 🌐 MULTIPLAYER INTEGRATION:
 * Both local moves AND remote moves come through here.
 * To handle a remote event: GameState.applyAction(remoteAction)
 */
function applyAction(action) {
  const prev = _state;

  switch (action.type) {
    case ActionTypes.START_GAME: {
      _state = { ..._state, phase: 'playing' };
      break;
    }

    case ActionTypes.SET_CARD: {
      _state = { ..._state, currentCard: action.payload.card };
      break;
    }

    case ActionTypes.MOVE_PAWN: {
      const { pawnId, color, newPosition, lapped } = action.payload;
      const updatedPawns = JSON.parse(JSON.stringify(_state.pawns));
      const pawn = updatedPawns[color].find(p => p.id === pawnId);
      if (pawn) {
        pawn.boardPosition = newPosition;
        pawn.inHome = (newPosition === 'home');
        // lapped is a one-way flag: once true, never goes back
        if (lapped) pawn.lapped = true;
      }
      // Only clear currentCard locally — server drives turn advancement
      _state = { ..._state, pawns: updatedPawns, lastAction: action };
      break;
    }

    case ActionTypes.SEND_HOME: {
      const { pawnId, color } = action.payload;
      const updatedPawns = JSON.parse(JSON.stringify(_state.pawns));
      const pawn = updatedPawns[color].find(p => p.id === pawnId);
      if (pawn) { pawn.boardPosition = null; pawn.inHome = false; }
      _state = { ..._state, pawns: updatedPawns, lastAction: action };
      break;
    }

    case ActionTypes.SYNC_TURN_COLOR: {
      _state = { ..._state, currentTurn: action.payload.color };
      break;
    }

    case ActionTypes.ADVANCE_TURN: {
      const idx = PLAYERS.indexOf(_state.currentTurn);
      const next = PLAYERS[(idx + 1) % PLAYERS.length];
      _state = { ..._state, currentTurn: next, turnNumber: _state.turnNumber + 1, lastAction: action };
      break;
    }

    case ActionTypes.END_GAME: {
      _state = { ..._state, phase: 'finished', winner: action.payload.winner, lastAction: action };
      break;
    }

    // 🌐 Multiplayer: register a player (called when they join the lobby)
    case ActionTypes.PLAYER_JOIN: {
      const { playerId, name, color } = action.payload;
      const players = { ..._state.players, [color]: { id: playerId, name, connected: true } };
      _state = { ..._state, players };
      break;
    }

    // 🌐 Multiplayer: mark player disconnected (don't remove, allow rejoin)
    case ActionTypes.PLAYER_LEAVE: {
      const { color } = action.payload;
      const players = { ..._state.players };
      if (players[color]) players[color] = { ...players[color], connected: false };
      _state = { ..._state, players };
      break;
    }

    // 🌐 Multiplayer: full state sync from server (e.g., on reconnect)
    case ActionTypes.SYNC_STATE: {
      _state = action.payload.state;
      break;
    }

    default:
      console.warn('[GameState] Unknown action type:', action.type);
      return;
  }

  _notify();
}

// ─── CONVENIENCE HELPERS ──────────────────────────────────────────────────────

function startGame() {
  applyAction({ type: ActionTypes.START_GAME });
}

function advanceTurn() {
  applyAction({ type: ActionTypes.ADVANCE_TURN });
}

function movePawn(color, pawnId, newPosition, lapped) {
  applyAction({ type: ActionTypes.MOVE_PAWN, payload: { color, pawnId, newPosition, lapped: !!lapped } });
}

function checkWin(color) {
  const state = getState();
  const allHome = state.pawns[color].every(p => p.inHome);
  if (allHome) applyAction({ type: ActionTypes.END_GAME, payload: { winner: color } });
  return allHome;
}

/** Reset everything back to initial state (new game). */
function resetGame() {
  _state = createInitialState();
  _notify();
}
