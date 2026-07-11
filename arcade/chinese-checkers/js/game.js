/**
 * game.js — Game state machine and turn flow
 * Supports 2-6 players with AI and multiplayer modes
 */

var Game = (function() {

    // ── State ────────────────────────────────────────────────────────────────
    var state = CC.STATE.WAITING;
    var currentPlayer = 0;
    var selectedPiece = null;
    var legalMoves = [];
    var moveHistory = [];
    var onStateChange = null;
    var onGameEnd = null;
    var vsAI = true;
    var playerCount = 2;
    var humanPlayer = 0;

    // ── Initialization ───────────────────────────────────────────────────────
    function init() {
        Board.init();
        state = CC.STATE.WAITING;
        currentPlayer = 0;
        selectedPiece = null;
        legalMoves = [];
        moveHistory = [];
    }

    function startGame(numPlayers, againstAI, humanIdx) {
        init();
        playerCount = numPlayers || 2;
        vsAI = againstAI !== false;
        humanPlayer = humanIdx || 0;

        Board.reset(playerCount);
        state = CC.STATE.SELECTING;
        currentPlayer = Board.getActivePlayers()[0];

        notifyStateChange();
        return { player: currentPlayer };
    }

    // ── Piece Selection ──────────────────────────────────────────────────────
    function selectPiece(q, r, s) {
        if (state !== CC.STATE.SELECTING) return false;
        if (currentPlayer !== humanPlayer && vsAI) return false;

        var piece = Board.getPiece(q, r, s);
        if (piece === CC.EMPTY || piece === null || piece !== currentPlayer) return false;

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
        if (winner !== null) {
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
        currentPlayer = Board.getNextPlayer(currentPlayer);
        selectedPiece = null;
        legalMoves = [];

        if (vsAI && currentPlayer !== humanPlayer) {
            state = CC.STATE.AI_TURN;
        } else {
            state = CC.STATE.SELECTING;
        }

        notifyStateChange();
    }

    // ── AI Move ──────────────────────────────────────────────────────────────
    function executeAIMove() {
        if (currentPlayer === humanPlayer) return false;
        if (!vsAI) return false;

        var move = AI.chooseMove(Board.getState(), currentPlayer, playerCount);
        if (move === null) return false;

        Board.applyMove(move);
        moveHistory.push({
            player: currentPlayer,
            move: move
        });

        // Check for win
        var winner = Board.getWinner();
        if (winner !== null) {
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
    function getPlayerCount() { return playerCount; }
    function getHumanPlayer() { return humanPlayer; }

    function getGoalCounts() {
        var counts = {};
        var active = Board.getActivePlayers();
        for (var i = 0; i < active.length; i++) {
            counts[active[i]] = Board.countPiecesInGoal(active[i]);
        }
        return counts;
    }

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
                goalCounts: getGoalCounts(),
                playerCount: playerCount,
                humanPlayer: humanPlayer
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
        getPlayerCount: getPlayerCount,
        getHumanPlayer: getHumanPlayer,
        getGoalCounts: getGoalCounts,
        setOnStateChange: setOnStateChange,
        setOnGameEnd: setOnGameEnd
    };

})();
