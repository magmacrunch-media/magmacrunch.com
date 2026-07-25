/**
 * game-state.js — Parchís state machine with pub/sub
 * All mutations go through applyAction() for local and remote moves.
 */

var GameState = (function() {
    'use strict';

    // ── Action types ───────────────────────────────────────────────────────────
    var ActionTypes = {
        START_GAME:      'START_GAME',
        ROLL_DICE:       'ROLL_DICE',
        MOVE_PAWN:       'MOVE_PAWN',
        CAPTURE_PAWN:    'CAPTURE_PAWN',
        PENALTY_PAWN:    'PENALTY_PAWN',
        ADVANCE_TURN:    'ADVANCE_TURN',
        END_GAME:        'END_GAME',
        PLAYER_JOIN:     'PLAYER_JOIN',
        PLAYER_LEAVE:    'PLAYER_LEAVE',
        SYNC_STATE:      'SYNC_STATE',
    };

    // ── State ──────────────────────────────────────────────────────────────────
    var state = null;
    var listeners = [];

    function createInitialState() {
        return {
            phase: 'lobby',       // 'lobby', 'playing', 'finished'
            currentTurn: null,    // color of current player
            dice: [0, 0],         // current dice values
            diceRolled: false,    // has current player rolled?
            consecutiveDoubles: 0,// for 3-doubles penalty rule
            turnNumber: 0,
            winner: null,
            pawns: {              // position of each pawn
                red:    [null, null, null, null],
                blue:   [null, null, null, null],
                green:  [null, null, null, null],
                yellow: [null, null, null, null],
            },
            scores: { red: 0, blue: 0, green: 0, yellow: 0 },
            colorMap: {},         // slot color → chosen hex color
            playerNames: {},      // slot color → player name
            lastAction: null,
            turnOrder: [],        // ordered list of slot colors in the game
        };
    }

    function getState() {
        return state;
    }

    function setState(newState) {
        state = newState;
        _notify();
    }

    // ── Apply action ───────────────────────────────────────────────────────────
    function applyAction(action) {
        if (!state) state = createInitialState();

        switch (action.type) {
            case ActionTypes.START_GAME:
                state.phase = 'playing';
                state.turnOrder = action.turnOrder || PC.COLORS.slice(0, 2);
                state.currentTurn = state.turnOrder[0];
                state.colorMap = action.colorMap || {};
                state.playerNames = action.playerNames || {};
                state.dice = [0, 0];
                state.diceRolled = false;
                state.consecutiveDoubles = 0;
                state.turnNumber = 1;
                state.winner = null;
                state.lastAction = action;
                break;

            case ActionTypes.ROLL_DICE:
                state.dice = action.dice;
                state.diceRolled = true;
                var isDoubles = action.dice[0] === action.dice[1];
                if (isDoubles) {
                    state.consecutiveDoubles++;
                } else {
                    state.consecutiveDoubles = 0;
                }
                state.lastAction = action;
                break;

            case ActionTypes.MOVE_PAWN:
                var color = action.color;
                var pawnIdx = action.pawnIndex;
                var newPos = action.newPos;

                // Handle capture
                if (action.capture) {
                    var capColor = action.capture.color;
                    var capIdx = action.capture.index;
                    state.pawns[capColor][capIdx] = null;
                }

                // Move the pawn
                state.pawns[color][pawnIdx] = newPos;

                // Check for score
                if (newPos === 'finished') {
                    state.scores[color]++;
                    // Check win condition (all 4 pawns finished)
                    if (state.scores[color] >= 4) {
                        state.winner = color;
                        state.phase = 'finished';
                    }
                }

                state.lastAction = action;
                break;

            case ActionTypes.PENALTY_PAWN:
                // 3-doubles penalty: send a pawn back to start
                var penColor = action.color;
                var penIdx = action.pawnIndex;
                state.pawns[penColor][penIdx] = null;
                state.consecutiveDoubles = 0;
                state.lastAction = action;
                break;

            case ActionTypes.ADVANCE_TURN:
                var currentIdx = state.turnOrder.indexOf(state.currentTurn);
                var nextIdx = (currentIdx + 1) % state.turnOrder.length;
                state.currentTurn = state.turnOrder[nextIdx];
                state.dice = [0, 0];
                state.diceRolled = false;
                state.consecutiveDoubles = 0;
                state.turnNumber++;
                state.lastAction = action;
                break;

            case ActionTypes.END_GAME:
                state.phase = 'finished';
                state.winner = action.winner;
                state.lastAction = action;
                break;

            case ActionTypes.PLAYER_JOIN:
                if (state.turnOrder.indexOf(action.color) === -1) {
                    state.turnOrder.push(action.color);
                }
                state.colorMap[action.color] = action.hexColor;
                state.playerNames[action.color] = action.playerName;
                state.lastAction = action;
                break;

            case ActionTypes.PLAYER_LEAVE:
                var leaveIdx = state.turnOrder.indexOf(action.color);
                if (leaveIdx !== -1) {
                    state.turnOrder.splice(leaveIdx, 1);
                }
                delete state.colorMap[action.color];
                delete state.playerNames[action.color];
                // If it was their turn, advance
                if (state.currentTurn === action.color) {
                    if (state.turnOrder.length > 0) {
                        state.currentTurn = state.turnOrder[leaveIdx % state.turnOrder.length];
                    } else {
                        state.currentTurn = null;
                    }
                }
                state.lastAction = action;
                break;

            case ActionTypes.SYNC_STATE:
                state = action.state;
                state.lastAction = action;
                break;
        }

        _notify();
        return state;
    }

    // ── Pub/sub ────────────────────────────────────────────────────────────────
    function onStateChange(fn) {
        listeners.push(fn);
        return function() {
            var idx = listeners.indexOf(fn);
            if (idx !== -1) listeners.splice(idx, 1);
        };
    }

    function _notify() {
        for (var i = 0; i < listeners.length; i++) {
            try {
                listeners[i](state);
            } catch (e) {
                console.error('[GameState] listener error:', e);
            }
        }
    }

    // ── Reset ──────────────────────────────────────────────────────────────────
    function reset() {
        state = createInitialState();
        _notify();
    }

    return {
        ActionTypes: ActionTypes,
        createInitialState: createInitialState,
        getState: getState,
        setState: setState,
        applyAction: applyAction,
        onStateChange: onStateChange,
        reset: reset,
    };
})();
