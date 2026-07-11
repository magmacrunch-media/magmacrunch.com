/**
 * game.js — Game state machine and turn flow
 */

var Game = (function() {

    // ── State ────────────────────────────────────────────────────────────────
    var state = CC.STATE.WAITING;
    var currentPlayer = CC.PLAYER1;
    var selectedPiece = null;
    var legalMoves = [];
    var moveHistory = [];
    var onStateChange = null;
    var onGameEnd = null;
    var vsAI = true;

    // ── Initialization ───────────────────────────────────────────────────────
    function init() {
        Board.init();
        Board.reset();
        state = CC.STATE.WAITING;
        currentPlayer = CC.PLAYER1;
        selectedPiece = null;
        legalMoves = [];
        moveHistory = [];
    }

    function startGame(againstAI) {
        init();
        vsAI = againstAI !== false;
        state = CC.STATE.SELECTING;
        currentPlayer = CC.PLAYER1;
        notifyStateChange();
        return { player: currentPlayer };
    }

    // ── Piece Selection ──────────────────────────────────────────────────────
    function selectPiece(q, r, s) {
        if (state !== CC.STATE.SELECTING) return false;
        if (currentPlayer !== CC.PLAYER1 && vsAI) return false;

        var piece = Board.getPiece(q, r, s);
        if (piece === CC.EMPTY || piece !== currentPlayer) return false;

        var moves = Board.getMovesForPiece(q, r, s);
        if (moves.length === 0) return false;

        selectedPiece = [q, r, s];
        legalMoves = moves;
        state = CC.STATE.MOVING;
        notifyStateChange();
        return true;
    }

    function deselectPiece() {
        selectedPiece = null;
        legalMoves = [];
        state = CC.STATE.SELECTING;
        notifyStateChange();
    }

    // ── Move Execution ───────────────────────────────────────────────────────
    function executeMove(toQ, toR, toS) {
        if (state !== CC.STATE.MOVING) return false;
        if (selectedPiece === null) return false;

        // Find matching move
        var move = null;
        for (var i = 0; i < legalMoves.length; i++) {
            if (legalMoves[i].to[0] === toQ && legalMoves[i].to[1] === toR && legalMoves[i].to[2] === toS) {
                move = legalMoves[i];
                break;
            }
        }

        if (move === null) return false;

        // Apply the move
        Board.applyMove(move);
        moveHistory.push({
            player: currentPlayer,
            move: move
        });

        // Check for win
        var winner = Board.getWinner();
        if (winner) {
            state = CC.STATE.GAME_OVER;
            if (onGameEnd) onGameEnd(winner);
            notifyStateChange();
            return true;
        }

        // Switch turns
        switchTurn();
        return true;
    }

    // ── Turn Management ──────────────────────────────────────────────────────
    function switchTurn() {
        currentPlayer = Board.getOpponent(currentPlayer);
        selectedPiece = null;
        legalMoves = [];

        if (vsAI && currentPlayer === CC.PLAYER2) {
            state = CC.STATE.AI_TURN;
        } else {
            state = CC.STATE.SELECTING;
        }

        notifyStateChange();
    }

    // ── AI Move ──────────────────────────────────────────────────────────────
    function executeAIMove() {
        if (currentPlayer !== CC.PLAYER2) return false;
        if (!vsAI) return false;

        var move = AI.chooseMove(Board.getState());
        if (move === null) return false;

        Board.applyMove(move);
        moveHistory.push({
            player: CC.PLAYER2,
            move: move
        });

        // Check for win
        var winner = Board.getWinner();
        if (winner) {
            state = CC.STATE.GAME_OVER;
            if (onGameEnd) onGameEnd(winner);
            notifyStateChange();
            return true;
        }

        switchTurn();
        return true;
    }

    // ── Getters ──────────────────────────────────────────────────────────────
    function getState() { return state; }
    function getCurrentPlayer() { return currentPlayer; }
    function getSelectedPiece() { return selectedPiece; }
    function getLegalMoves() { return legalMoves; }
    function getMoveHistory() { return moveHistory; }
    function isVsAI() { return vsAI; }

    function getPlayer1GoalCount() { return Board.countPiecesInGoal(CC.PLAYER1); }
    function getPlayer2GoalCount() { return Board.countPiecesInGoal(CC.PLAYER2); }

    // ── State Change Notification ────────────────────────────────────────────
    function setOnStateChange(cb) { onStateChange = cb; }
    function setOnGameEnd(cb) { onGameEnd = cb; }

    function notifyStateChange() {
        if (onStateChange) {
            onStateChange({
                state: state,
                currentPlayer: currentPlayer,
                selectedPiece: selectedPiece,
                legalMoves: legalMoves,
                player1GoalCount: getPlayer1GoalCount(),
                player2GoalCount: getPlayer2GoalCount()
            });
        }
    }

    return {
        init: init,
        startGame: startGame,
        selectPiece: selectPiece,
        deselectPiece: deselectPiece,
        executeMove: executeMove,
        executeAIMove: executeAIMove,
        getState: getState,
        getCurrentPlayer: getCurrentPlayer,
        getSelectedPiece: getSelectedPiece,
        getLegalMoves: getLegalMoves,
        getMoveHistory: getMoveHistory,
        isVsAI: isVsAI,
        getPlayer1GoalCount: getPlayer1GoalCount,
        getPlayer2GoalCount: getPlayer2GoalCount,
        setOnStateChange: setOnStateChange,
        setOnGameEnd: setOnGameEnd
    };

})();
