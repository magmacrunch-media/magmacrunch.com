/**
 * game.js — Game state machine, settings management, time tracking
 */

var Game = (function() {

    // ── State ────────────────────────────────────────────────────────────────
    var state = CH.STATE.WAITING;
    var currentPlayer = CH.PLAYER;
    var selectedPiece = null;
    var legalMoves = [];
    var moveHistory = [];
    var settings = null;
    var timeRemaining = { player: 0, ai: 0 };
    var timerInterval = null;
    var onStateChange = null;
    var onGameEnd = null;
    var moveNotations = [];
    var pendingPromotion = null;

    // ── Settings ─────────────────────────────────────────────────────────────
    function loadSettings() {
        try {
            var saved = localStorage.getItem('chess_settings');
            if (saved) {
                settings = JSON.parse(saved);
            }
        } catch (e) {}
        if (!settings) {
            settings = JSON.parse(JSON.stringify(CH.DEFAULT_SETTINGS));
        }
        return settings;
    }

    function saveSettings(newSettings) {
        settings = newSettings;
        try {
            localStorage.setItem('chess_settings', JSON.stringify(settings));
        } catch (e) {}
    }

    function getSettings() {
        if (!settings) loadSettings();
        return settings;
    }

    function hasPlayedBefore() {
        try {
            return localStorage.getItem('chess_settings') !== null;
        } catch (e) {
            return false;
        }
    }

    // ── Initialization ───────────────────────────────────────────────────────
    function init() {
        Board.init();
        state = CH.STATE.WAITING;
        currentPlayer = CH.PLAYER;
        selectedPiece = null;
        legalMoves = [];
        moveHistory = [];
        moveNotations = [];
        pendingPromotion = null;
        stopTimer();
        timeRemaining = { player: 0, ai: 0 };
    }

    function startGame() {
        init();
        loadSettings();

        // Set up timers if time control is enabled
        var tc = CH.TIME_CONTROLS[settings.timeControl];
        if (tc && tc.seconds > 0) {
            timeRemaining.player = tc.seconds;
            timeRemaining.ai = tc.seconds;
        }

        state = CH.STATE.SELECTING;
        currentPlayer = CH.PLAYER;
        startTimer();
        notifyStateChange();
        return { player: currentPlayer, settings: settings };
    }

    // ── Piece Selection ──────────────────────────────────────────────────────
    function selectPiece(row, col) {
        if (state !== CH.STATE.SELECTING) return false;
        if (currentPlayer !== CH.PLAYER) return false;

        var piece = Board.getPiece(row, col);
        if (!piece || piece.owner !== CH.PLAYER) return false;

        var moves = Board.getLegalMoves(row, col);
        if (moves.length === 0) return false;

        selectedPiece = { row: row, col: col };
        legalMoves = moves;
        state = CH.STATE.MOVING;
        notifyStateChange();
        return true;
    }

    function deselectPiece() {
        selectedPiece = null;
        legalMoves = [];
        state = CH.STATE.SELECTING;
        notifyStateChange();
    }

    // ── Move Execution ───────────────────────────────────────────────────────
    function executeMove(toRow, toCol) {
        if (state !== CH.STATE.MOVING) return false;
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

        // Check if this is a promotion move
        if (move.promotion) {
            pendingPromotion = move;
            state = CH.STATE.PROMOTING;
            notifyStateChange();
            return true;
        }

        // Execute the move
        var result = Board.applyMove(move);
        var notation = formatMove(move, Board.getPiece(move.to.row, move.to.col) || result.captured, result);

        moveHistory.push({
            player: currentPlayer,
            move: move,
            result: result,
            notation: notation
        });
        moveNotations.push(notation);

        // Check for game over
        var gameResult = Board.getGameResult();
        if (gameResult) {
            state = CH.STATE.GAME_OVER;
            stopTimer();
            if (onGameEnd) onGameEnd(gameResult);
            notifyStateChange();
            return true;
        }

        // Switch turns
        switchTurn();
        return true;
    }

    function completePromotion(promotionType) {
        if (state !== CH.STATE.PROMOTING || pendingPromotion === null) return false;

        var move = pendingPromotion;
        move.promotionType = promotionType;
        pendingPromotion = null;

        var result = Board.applyMove(move);
        var notation = formatMove(move, null, result);

        moveHistory.push({
            player: currentPlayer,
            move: move,
            result: result,
            notation: notation
        });
        moveNotations.push(notation);

        // Check for game over
        var gameResult = Board.getGameResult();
        if (gameResult) {
            state = CH.STATE.GAME_OVER;
            stopTimer();
            if (onGameEnd) onGameEnd(gameResult);
            notifyStateChange();
            return true;
        }

        switchTurn();
        return true;
    }

    // ── Turn Management ──────────────────────────────────────────────────────
    function switchTurn() {
        currentPlayer = currentPlayer === CH.PLAYER ? CH.AI : CH.PLAYER;
        selectedPiece = null;
        legalMoves = [];

        if (currentPlayer === CH.PLAYER) {
            state = CH.STATE.SELECTING;
        } else {
            state = CH.STATE.AI_TURN;
        }

        notifyStateChange();
    }

    // ── AI Move ──────────────────────────────────────────────────────────────
    function executeAIMove() {
        if (currentPlayer !== CH.AI) return false;

        var move = AI.chooseMove(Board.getState(), Board.getCastlingRights(), Board.getEnPassantTarget(), settings.difficulty);
        if (move === null) return false;

        // Check for promotion
        if (move.promotion) {
            move.promotionType = CH.QUEEN; // AI always promotes to queen
        }

        var result = Board.applyMove(move);
        var notation = formatMove(move, null, result);

        moveHistory.push({
            player: CH.AI,
            move: move,
            result: result,
            notation: notation
        });
        moveNotations.push(notation);

        // Check for game over
        var gameResult = Board.getGameResult();
        if (gameResult) {
            state = CH.STATE.GAME_OVER;
            stopTimer();
            if (onGameEnd) onGameEnd(gameResult);
            notifyStateChange();
            return true;
        }

        switchTurn();
        return true;
    }

    // ── Notation Formatting ──────────────────────────────────────────────────
    function formatMove(move, piece, result) {
        // Castling
        if (move.isKingsideCastle) return 'O-O';
        if (move.isQueensideCastle) return 'O-O-O';

        var notation = '';
        var pieceObj = piece || Board.getPiece(move.from.row, move.from.col);

        // Piece symbol
        if (pieceObj) {
            notation += CH.NOTATION_SYMBOLS[pieceObj.type];
        }

        // Disambiguation
        if (pieceObj && pieceObj.type !== CH.PAWN && pieceObj.type !== CH.KING) {
            var samePieceMoves = [];
            for (var r = 0; r < CH.BOARD_SIZE; r++) {
                for (var c = 0; c < CH.BOARD_SIZE; c++) {
                    if (r === move.from.row && c === move.from.col) continue;
                    var p = Board.getPiece(r, c);
                    if (p && p.type === pieceObj.type && p.owner === pieceObj.owner) {
                        var moves = Board.getLegalMoves(r, c);
                        for (var m = 0; m < moves.length; m++) {
                            if (moves[m].to.row === move.to.row && moves[m].to.col === move.to.col) {
                                samePieceMoves.push({ row: r, col: c });
                            }
                        }
                    }
                }
            }
            if (samePieceMoves.length > 0) {
                var sameFile = samePieceMoves.some(function(m) { return m.col === move.from.col; });
                var sameRank = samePieceMoves.some(function(m) { return m.row === move.from.row; });
                if (!sameFile) {
                    notation += String.fromCharCode(97 + move.from.col);
                } else if (!sameRank) {
                    notation += (8 - move.from.row);
                } else {
                    notation += String.fromCharCode(97 + move.from.col) + (8 - move.from.row);
                }
            }
        }

        // Capture
        var captured = result ? result.captured : Board.getPiece(move.to.row, move.to.col);
        if (captured || (result && result.enPassant)) {
            if (pieceObj && pieceObj.type === CH.PAWN) {
                notation += String.fromCharCode(97 + move.from.col);
            }
            notation += 'x';
        }

        // Destination
        notation += String.fromCharCode(97 + move.to.col) + (8 - move.to.row);

        // Promotion
        if (move.promotionType) {
            notation += '=' + CH.NOTATION_SYMBOLS[move.promotionType];
        }

        // Check/Checkmate
        var opponent = currentPlayer === CH.PLAYER ? CH.AI : CH.PLAYER;
        if (Board.isInCheck(opponent)) {
            if (Board.hasCheckmate(opponent)) {
                notation += '#';
            } else {
                notation += '+';
            }
        }

        return notation;
    }

    // ── Timer ────────────────────────────────────────────────────────────────
    function startTimer() {
        stopTimer();
        var tc = CH.TIME_CONTROLS[settings.timeControl];
        if (tc && tc.seconds > 0) {
            timerInterval = setInterval(function() {
                if (currentPlayer === CH.PLAYER && timeRemaining.player > 0) {
                    timeRemaining.player--;
                    if (timeRemaining.player === 0) {
                        state = CH.STATE.GAME_OVER;
                        stopTimer();
                        if (onGameEnd) onGameEnd('timeout-ai');
                        notifyStateChange();
                    }
                    notifyStateChange();
                } else if (currentPlayer === CH.AI && timeRemaining.ai > 0) {
                    timeRemaining.ai--;
                    if (timeRemaining.ai === 0) {
                        state = CH.STATE.GAME_OVER;
                        stopTimer();
                        if (onGameEnd) onGameEnd('timeout-player');
                        notifyStateChange();
                    }
                    notifyStateChange();
                }
            }, 1000);
        }
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function formatTime(seconds) {
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    // ── Getters ──────────────────────────────────────────────────────────────
    function getState() { return state; }
    function getCurrentPlayer() { return currentPlayer; }
    function getSelectedPiece() { return selectedPiece; }
    function getLegalMovesList() { return legalMoves; }
    function getMoveHistory() { return moveHistory; }
    function getMoveNotations() { return moveNotations; }
    function getPendingPromotion() { return pendingPromotion; }
    function getTimeRemaining() { return timeRemaining; }
    function getFormattedTime(player) { return formatTime(timeRemaining[player]); }

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
                moveNotations: moveNotations,
                timeRemaining: timeRemaining,
                settings: settings,
                inCheck: Board.isInCheck(currentPlayer)
            });
        }
    }

    return {
        init: init,
        startGame: startGame,
        selectPiece: selectPiece,
        deselectPiece: deselectPiece,
        executeMove: executeMove,
        completePromotion: completePromotion,
        executeAIMove: executeAIMove,
        loadSettings: loadSettings,
        saveSettings: saveSettings,
        getSettings: getSettings,
        hasPlayedBefore: hasPlayedBefore,
        getState: getState,
        getCurrentPlayer: getCurrentPlayer,
        getSelectedPiece: getSelectedPiece,
        getLegalMovesList: getLegalMovesList,
        getMoveHistory: getMoveHistory,
        getMoveNotations: getMoveNotations,
        getPendingPromotion: getPendingPromotion,
        getTimeRemaining: getTimeRemaining,
        getFormattedTime: getFormattedTime,
        setOnStateChange: setOnStateChange,
        setOnGameEnd: setOnGameEnd
    };

})();
