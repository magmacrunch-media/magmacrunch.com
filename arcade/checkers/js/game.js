/**
 * game.js — Game state machine and turn flow
 */

var Game = (function() {

    // ── State ────────────────────────────────────────────────────────────────
    var state = CK.STATE.WAITING;
    var currentPlayer = CK.PLAYER;
    var selectedPiece = null;
    var legalMoves = [];
    var moveHistory = [];
    var onStateChange = null;
    var onGameEnd = null;

    // ── Initialization ───────────────────────────────────────────────────────
    function init() {
        Board.init();
        state = CK.STATE.WAITING;
        currentPlayer = CK.PLAYER;
        selectedPiece = null;
        legalMoves = [];
        moveHistory = [];
    }

    function startGame() {
        init();
        state = CK.STATE.SELECTING;
        currentPlayer = CK.PLAYER;
        notifyStateChange();
        return { player: currentPlayer };
    }

    // ── Piece Selection ──────────────────────────────────────────────────────
    function selectPiece(row, col) {
        if (state !== CK.STATE.SELECTING) return false;
        if (currentPlayer !== CK.PLAYER) return false;

        var piece = Board.getPiece(row, col);
        if (piece === CK.EMPTY || !Board.isPlayerPiece(piece)) return false;

        // Check if this piece has legal moves
        var moves = Board.getMovesFromPosition(row, col);
        if (moves.length === 0) return false;

        // Check if jumps are mandatory
        var allMoves = Board.getLegalMoves(CK.PLAYER);
        var hasJumps = false;
        for (var i = 0; i < allMoves.length; i++) {
            if (allMoves[i].type === CK.MOVE_TYPE.JUMP || allMoves[i].type === CK.MOVE_TYPE.MULTI_JUMP) {
                hasJumps = true;
                break;
            }
        }

        // If jumps are mandatory, only allow selecting pieces that can jump
        if (hasJumps) {
            var pieceHasJump = false;
            for (var i = 0; i < moves.length; i++) {
                if (moves[i].type === CK.MOVE_TYPE.JUMP || moves[i].type === CK.MOVE_TYPE.MULTI_JUMP) {
                    pieceHasJump = true;
                    break;
                }
            }
            if (!pieceHasJump) return false;
        }

        selectedPiece = { row: row, col: col };
        legalMoves = moves;
        state = CK.STATE.MOVING;
        notifyStateChange();
        return true;
    }

    function deselectPiece() {
        selectedPiece = null;
        legalMoves = [];
        state = CK.STATE.SELECTING;
        notifyStateChange();
    }

    // ── Move Execution ───────────────────────────────────────────────────────
    function executeMove(toRow, toCol) {
        if (state !== CK.STATE.MOVING) return false;
        if (selectedPiece === null) return false;

        // Find the matching move
        var move = null;
        for (var i = 0; i < legalMoves.length; i++) {
            if (legalMoves[i].to.row === toRow && legalMoves[i].to.col === toCol) {
                move = legalMoves[i];
                break;
            }
        }

        if (move === null) return false;

        // Apply the move
        var result = Board.applyMove(move);
        moveHistory.push({
            player: currentPlayer,
            move: move,
            promoted: result.promoted
        });

        // Check for win
        var winner = Board.getWinner();
        if (winner) {
            state = CK.STATE.GAME_OVER;
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
        currentPlayer = currentPlayer === CK.PLAYER ? CK.AI : CK.PLAYER;
        selectedPiece = null;
        legalMoves = [];

        // Check if current player has moves
        if (!Board.hasMoves(currentPlayer)) {
            // Other player wins
            var winner = currentPlayer === CK.PLAYER ? CK.AI : CK.PLAYER;
            state = CK.STATE.GAME_OVER;
            if (onGameEnd) onGameEnd(winner);
            notifyStateChange();
            return;
        }

        if (currentPlayer === CK.PLAYER) {
            state = CK.STATE.SELECTING;
        } else {
            state = CK.STATE.AI_TURN;
        }

        notifyStateChange();
    }

    // ── AI Move ──────────────────────────────────────────────────────────────
    function executeAIMove() {
        if (currentPlayer !== CK.AI) return false;

        var move = AI.chooseMove(Board.getState());
        if (move === null) return false;

        var result = Board.applyMove(move);
        moveHistory.push({
            player: CK.AI,
            move: move,
            promoted: result.promoted
        });

        // Check for win
        var winner = Board.getWinner();
        if (winner) {
            state = CK.STATE.GAME_OVER;
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
    function getPlayerPieceCount() { return Board.getPlayerPieceCount(CK.PLAYER); }
    function getAIPieceCount() { return Board.getPlayerPieceCount(CK.AI); }

    // ── Multiplayer Support ──────────────────────────────────────────────────
    function _internalSetTurn(who) {
        selectedPiece = null;
        legalMoves = [];
        if (who === 'player') {
            currentPlayer = CK.PLAYER;
            state = CK.STATE.SELECTING;
        } else {
            currentPlayer = CK.AI;
            state = CK.STATE.AI_TURN;
        }
        notifyStateChange();
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
                playerPieces: getPlayerPieceCount(),
                aiPieces: getAIPieceCount()
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
        getPlayerPieceCount: getPlayerPieceCount,
        getAIPieceCount: getAIPieceCount,
        setOnStateChange: setOnStateChange,
        setOnGameEnd: setOnGameEnd,
        _internalSetTurn: _internalSetTurn,
    };

})();
