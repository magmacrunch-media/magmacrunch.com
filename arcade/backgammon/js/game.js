/**
 * game.js — Game state machine and turn flow
 */

var Game = (function() {

    // ── State ────────────────────────────────────────────────────────────────
    var state = BG.STATE.WAITING;
    var currentPlayer = null;
    var dice = [0, 0];
    var movesRemaining = [];
    var selectedMoveIndex = -1;
    var moveHistory = [];
    var onStateChange = null;
    var onGameEnd = null;

    // ── Initialization ───────────────────────────────────────────────────────
    function init() {
        Board.init();
        Dice.reset();
        state = BG.STATE.WAITING;
        currentPlayer = null;
        dice = [0, 0];
        movesRemaining = [];
        selectedMoveIndex = -1;
        moveHistory = [];
    }

    function startGame() {
        init();
        // Determine who goes first with a roll-off
        var playerRoll = Dice.roll();
        var aiRoll = [Dice.getRandomDie(), Dice.getRandomDie()];

        while (playerRoll[0] + playerRoll[1] === aiRoll[0] + aiRoll[1]) {
            playerRoll = Dice.roll();
            aiRoll = [Dice.getRandomDie(), Dice.getRandomDie()];
        }

        if (playerRoll[0] + playerRoll[1] > aiRoll[0] + aiRoll[1]) {
            currentPlayer = BG.PLAYER;
        } else {
            currentPlayer = BG.AI;
        }

        dice = currentPlayer === BG.PLAYER ? playerRoll : aiRoll;
        state = BG.STATE.MOVING;
        movesRemaining = Board.getLegalMoves(currentPlayer, dice[0], dice[1]);

        // If no legal moves, switch turn
        if (movesRemaining.length === 0) {
            switchTurn();
        }

        notifyStateChange();
        return { player: currentPlayer, dice: dice.slice() };
    }

    // ── Turn Management ──────────────────────────────────────────────────────
    function switchTurn() {
        currentPlayer = currentPlayer === BG.PLAYER ? BG.AI : BG.PLAYER;
        dice = Dice.roll();
        movesRemaining = Board.getLegalMoves(currentPlayer, dice[0], dice[1]);

        // If no legal moves, switch again
        if (movesRemaining.length === 0) {
            notifyStateChange();
            setTimeout(function() {
                switchTurn();
            }, 1000);
            return;
        }

        state = BG.STATE.MOVING;
        notifyStateChange();
    }

    // ── Move Execution ───────────────────────────────────────────────────────
    function executeMove(moveIndex) {
        if (state !== BG.STATE.MOVING) return false;
        if (moveIndex < 0 || moveIndex >= movesRemaining.length) return false;

        var moveCombo = movesRemaining[moveIndex];
        Board.applyMoves(moveCombo);
        moveHistory.push({
            player: currentPlayer,
            moves: moveCombo,
            dice: dice.slice()
        });

        // Check for win
        var winner = Board.getWinner();
        if (winner) {
            state = BG.STATE.GAME_OVER;
            if (onGameEnd) onGameEnd(winner);
            notifyStateChange();
            return true;
        }

        switchTurn();
        return true;
    }

    function executeAIMove() {
        if (currentPlayer !== BG.AI) return false;
        if (movesRemaining.length === 0) return false;

        var bestIndex = AI.chooseMove(Board.getState(), dice, movesRemaining);
        return executeMove(bestIndex);
    }

    // ── Doubling ─────────────────────────────────────────────────────────────
    function requestDouble() {
        if (state !== BG.STATE.MOVING) return false;
        if (!Dice.canDouble(currentPlayer)) return false;

        state = BG.STATE.DOUBLING;
        notifyStateChange();
        return true;
    }

    function acceptDouble() {
        Dice.double(currentPlayer);
        state = BG.STATE.MOVING;
        notifyStateChange();
        return true;
    }

    function rejectDouble() {
        // Player forfeits
        var winner = currentPlayer === BG.PLAYER ? BG.AI : BG.PLAYER;
        state = BG.STATE.GAME_OVER;
        if (onGameEnd) onGameEnd(winner);
        notifyStateChange();
        return true;
    }

    // ── Getters ──────────────────────────────────────────────────────────────
    function getState() { return state; }
    function getCurrentPlayer() { return currentPlayer; }
    function getDice() { return dice.slice(); }
    function getMovesRemaining() { return movesRemaining; }
    function getMoveHistory() { return moveHistory; }
    function getScore() { return Dice.getDoublingValue(); }

    // ── State Change Notification ────────────────────────────────────────────
    function setOnStateChange(cb) { onStateChange = cb; }
    function setOnGameEnd(cb) { onGameEnd = cb; }

    function notifyStateChange() {
        if (onStateChange) {
            onStateChange({
                state: state,
                currentPlayer: currentPlayer,
                dice: dice,
                movesRemaining: movesRemaining,
                score: Dice.getDoublingValue(),
                doublingOwner: Dice.getDoublingOwner()
            });
        }
    }

    return {
        init: init,
        startGame: startGame,
        switchTurn: switchTurn,
        executeMove: executeMove,
        executeAIMove: executeAIMove,
        requestDouble: requestDouble,
        acceptDouble: acceptDouble,
        rejectDouble: rejectDouble,
        getState: getState,
        getCurrentPlayer: getCurrentPlayer,
        getDice: getDice,
        getMovesRemaining: getMovesRemaining,
        getMoveHistory: getMoveHistory,
        getScore: getScore,
        setOnStateChange: setOnStateChange,
        setOnGameEnd: setOnGameEnd
    };

})();
