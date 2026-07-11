/**
 * main.js — Klotski UI wiring
 * DOM initialization, custom tile renderer, modals, scoring
 */

(function() {
    document.addEventListener('DOMContentLoaded', function() {

        // ── Framework instances ───────────────────────────────────────────────
        var ui = PuzzleUI.create();
        var scoring = PuzzleScoring.create('klotski', { ascending: true });
        var input = null;
        var game = null;
        var timerInterval = null;

        // ── DOM elements ─────────────────────────────────────────────────────
        var $ = ui.$;
        var boardEl = $('#gameBoard');
        var moveCountEl = $('#moveCount');
        var timerEl = $('#timer');
        var bestScoreEl = $('#bestScore');

        // ── Modals ───────────────────────────────────────────────────────────
        ui.registerModal('titleScreen', $('#titleScreen'));
        ui.registerModal('victoryModal', $('#victoryModal'));
        ui.registerModal('initialsPrompt', $('#initialsPrompt'));
        ui.registerModal('scoreboardModal', $('#scoreboardModal'));
        ui.registerModal('instructionsModal', $('#instructionsModal'));
        ui.registerModal('creditsModal', $('#creditsModal'));

        // ── Loading screen ───────────────────────────────────────────────────
        setTimeout(function() {
            var loading = $('#loadingScreen');
            if (loading) loading.style.display = 'none';
        }, 600);

        // ── Best score display ───────────────────────────────────────────────
        function updateBestDisplay() {
            var top = scoring.getTopScores('normal', 1);
            if (top.length > 0) {
                bestScoreEl.textContent = top[0].score;
            } else {
                bestScoreEl.textContent = '---';
            }
        }
        updateBestDisplay();

        // ── Timer ────────────────────────────────────────────────────────────
        function startTimer() {
            stopTimer();
            timerInterval = setInterval(function() {
                if (game && game.isActive()) {
                    timerEl.textContent = ui.formatTime(game.getElapsedTime());
                }
            }, 1000);
        }

        function stopTimer() {
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        }

        // ── Custom tile renderer ─────────────────────────────────────────────
        function renderBoard() {
            boardEl.innerHTML = '';
            var tiles = game.getTiles();

            for (var i = 0; i < tiles.length; i++) {
                var t = tiles[i];
                var el = document.createElement('div');
                el.className = 'tile tile-' + t.type;
                el.dataset.id = t.id;
                el.dataset.type = t.type;

                // CSS grid placement
                el.style.gridColumn = (t.col + 1) + ' / span ' + t.w;
                el.style.gridRow = (t.row + 1) + ' / span ' + t.h;

                // Tile content
                if (t.type === '2x2') {
                    el.innerHTML = '<span class="tile-char">' + t.name + '</span>';
                } else if (t.type === '2x1') {
                    el.innerHTML = '<span class="tile-char-small">' + t.name + '</span>';
                }

                boardEl.appendChild(el);
            }

            moveCountEl.textContent = game.moves;
        }

        // ── Game creation ────────────────────────────────────────────────────
        function createGame() {
            if (input) input.destroy();
            stopTimer();

            game = KlotskiGame.create();

            game.setOnRender(function() {
                renderBoard();
            });

            game.setOnStateChange(function(state) {
                moveCountEl.textContent = state.moves;
            });

            game.setOnWin(function() {
                stopTimer();
                body.classList.remove('game-active');

                var moves = game.moves;
                var elapsed = game.getElapsedTime();
                var isNew = scoring.isNewHighScore(moves, 'normal');

                $('#victoryMoves').textContent = moves;
                $('#victoryTime').textContent = ui.formatTime(elapsed);

                if (isNew) {
                    var rank = scoring.addScore(moves, 'normal', { time: elapsed });
                    $('#victoryRank').textContent = 'new #' + rank + ' high score!';
                    updateBestDisplay();
                    ui.showModal('victoryModal');

                    setTimeout(function() {
                        ui.hideModal('victoryModal');
                        showInitialsPrompt(moves, elapsed);
                    }, 1500);
                } else {
                    scoring.addScore(moves, 'normal', { time: elapsed });
                    $('#victoryRank').textContent = '';
                    updateBestDisplay();
                    ui.showModal('victoryModal');
                }
            });

            input = PuzzleInput.create({
                onMove: function(dir) { game.handleMove(dir); },
                isActive: function() { return game.isActive(); }
            }, boardEl);

            game.init();
            startTimer();
            moveCountEl.textContent = '0';
            timerEl.textContent = '0:00';
        }

        // ── Initials prompt ──────────────────────────────────────────────────
        function showInitialsPrompt(moves, elapsed) {
            ui.showModal('initialsPrompt');
            var inputEl = $('#initialsInput');
            inputEl.value = '';
            inputEl.focus();

            var submitBtn = $('#submitInitials');
            function onSubmit() {
                var initials = inputEl.value.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 3);
                if (initials.length === 0) initials = 'AAA';
                ui.hideModal('initialsPrompt');
                submitBtn.removeEventListener('click', onSubmit);
                inputEl.removeEventListener('keydown', onKey);
            }

            function onKey(e) {
                if (e.key === 'Enter') onSubmit();
            }

            submitBtn.addEventListener('click', onSubmit);
            inputEl.addEventListener('keydown', onKey);
        }

        // ── Title screen ─────────────────────────────────────────────────────
        var body = document.body;
        var titleScreen = $('#titleScreen');

        function startGame() {
            ui.hideModal('titleScreen');
            titleScreen.classList.remove('active');
            body.classList.add('game-active');
            createGame();
        }

        $('#startButton').addEventListener('click', startGame);

        document.addEventListener('keydown', function onStart(e) {
            if (e.code === 'Space' && titleScreen.classList.contains('active')) {
                e.preventDefault();
                startGame();
            }
        });

        // ── Button handlers ──────────────────────────────────────────────────
        $('#newGame').addEventListener('click', function() {
            ui.hideAllModals();
            body.classList.add('game-active');
            createGame();
        });

        $('#playAgain').addEventListener('click', function() {
            ui.hideAllModals();
            body.classList.add('game-active');
            createGame();
        });

        // ── Scoreboard ───────────────────────────────────────────────────────
        $('#toggleScoreboard').addEventListener('click', function() {
            renderScoreboard();
            ui.showModal('scoreboardModal');
        });
        ui.setupModalClose('scoreboardModal', [$('#closeScoreboard')]);

        function renderScoreboard() {
            var topScores = scoring.getTopScores('normal', 10);
            var html = '<div class="score-list">';
            html += '<div class="score-header"><span class="rank-col">#</span><span class="name-col">NAME</span><span class="score-col">MOVES</span><span class="time-col">TIME</span></div>';

            if (topScores.length === 0) {
                html += '<div class="no-scores">no scores yet</div>';
            } else {
                for (var i = 0; i < topScores.length; i++) {
                    var s = topScores[i];
                    var name = s.initials || '---';
                    var time = s.time ? ui.formatTime(s.time) : '---';
                    html += '<div class="score-row">';
                    html += '<span class="rank-col">' + (i + 1) + '</span>';
                    html += '<span class="name-col">' + name + '</span>';
                    html += '<span class="score-col">' + s.score + '</span>';
                    html += '<span class="time-col">' + time + '</span>';
                    html += '</div>';
                }
            }

            html += '</div>';
            $('#scoreColumns').innerHTML = html;
        }

        // ── Instructions ─────────────────────────────────────────────────────
        $('#toggleInstructions').addEventListener('click', function() {
            ui.showModal('instructionsModal');
        });
        ui.setupModalClose('instructionsModal', [$('#closeInstructions')]);

        // ── Credits ──────────────────────────────────────────────────────────
        $('#toggleCredits').addEventListener('click', function() {
            ui.showModal('creditsModal');
        });
        ui.setupModalClose('creditsModal', [$('#closeCredits')]);

    });
})();
