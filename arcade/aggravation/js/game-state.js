/**
 * game-state.js — Aggravation state machine with pub/sub
 * All mutations go through applyAction() for consistent state updates.
 */

var GameState = (function() {
    'use strict';

    var ActionTypes = {
        START_GAME:   'START_GAME',
        ROLL_DICE:    'ROLL_DICE',
        MOVE_PAWN:    'MOVE_PAWN',
        ADVANCE_TURN: 'ADVANCE_TURN',
        END_GAME:     'END_GAME',
        PLAYER_LEAVE: 'PLAYER_LEAVE',
    };

    var state = null;
    var listeners = [];

    function createInitialState() {
        return {
            phase: 'setup',       // 'setup', 'playing', 'finished'
            currentTurn: null,
            dice: 0,
            diceRolled: false,
            turnNumber: 0,
            winner: null,
            pawns: {
                red:    [null, null, null, null],
                blue:   [null, null, null, null],
                green:  [null, null, null, null],
                yellow: [null, null, null, null],
                purple: [null, null, null, null],
                orange: [null, null, null, null],
            },
            scores: { red: 0, blue: 0, green: 0, yellow: 0, purple: 0, orange: 0 },
            colorMap: {},
            playerNames: {},
            playerTypes: {},      // 'human' or 'ai'
            turnOrder: [],
            lastAction: null,
            consecutiveSixes: 0,
        };
    }

    function getState() { return state; }

    function setState(newState) {
        state = newState;
        _notify();
    }

    function applyAction(action) {
        if (!state) state = createInitialState();

        switch (action.type) {
            case ActionTypes.START_GAME:
                state.phase = 'playing';
                state.turnOrder = action.turnOrder;
                state.currentTurn = state.turnOrder[0];
                state.colorMap = action.colorMap || {};
                state.playerNames = action.playerNames || {};
                state.playerTypes = action.playerTypes || {};
                state.dice = 0;
                state.diceRolled = false;
                state.consecutiveSixes = 0;
                state.turnNumber = 1;
                state.winner = null;
                state.lastAction = action;
                break;

            case ActionTypes.ROLL_DICE:
                state.dice = action.dice;
                state.diceRolled = true;
                if (action.dice === 6) {
                    state.consecutiveSixes++;
                } else {
                    state.consecutiveSixes = 0;
                }
                state.lastAction = action;
                break;

            case ActionTypes.MOVE_PAWN:
                var color = action.color;
                var pawnIdx = action.pawnIndex;
                var newPos = action.newPos;

                if (action.capture) {
                    var capColor = action.capture.color;
                    var capIdx = action.capture.index;
                    state.pawns[capColor][capIdx] = null;
                }

                state.pawns[color][pawnIdx] = newPos;

                if (newPos === 'finished') {
                    state.scores[color]++;
                    if (state.scores[color] >= AC.NUM_PAWNS) {
                        state.winner = color;
                        state.phase = 'finished';
                    }
                }

                state.lastAction = action;
                break;

            case ActionTypes.ADVANCE_TURN:
                var currentIdx = state.turnOrder.indexOf(state.currentTurn);
                var nextIdx = (currentIdx + 1) % state.turnOrder.length;
                state.currentTurn = state.turnOrder[nextIdx];
                state.dice = 0;
                state.diceRolled = false;
                state.consecutiveSixes = 0;
                state.turnNumber++;
                state.lastAction = action;
                break;

            case ActionTypes.END_GAME:
                state.phase = 'finished';
                state.winner = action.winner;
                state.lastAction = action;
                break;

            case ActionTypes.PLAYER_LEAVE:
                var leaveColor = action.color;
                // Remove from turn order
                var leaveIdx = state.turnOrder.indexOf(leaveColor);
                if (leaveIdx !== -1) {
                    state.turnOrder.splice(leaveIdx, 1);
                }
                // Send their pawns back to yard
                if (state.pawns[leaveColor]) {
                    for (var li = 0; li < state.pawns[leaveColor].length; li++) {
                        state.pawns[leaveColor][li] = null;
                    }
                }
                // If it was their turn, advance
                if (state.currentTurn === leaveColor && state.turnOrder.length > 0) {
                    state.currentTurn = state.turnOrder[0];
                }
                state.lastAction = action;
                break;
        }

        _notify();
        return state;
    }

    function onStateChange(fn) {
        listeners.push(fn);
        return function() {
            var idx = listeners.indexOf(fn);
            if (idx !== -1) listeners.splice(idx, 1);
        };
    }

    function _notify() {
        for (var i = 0; i < listeners.length; i++) {
            try { listeners[i](state); } catch (e) { console.error('[GameState]', e); }
        }
    }

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
