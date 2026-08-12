/**
 * main.js — Threes UI wiring
 * DOM initialization, modals, scoring, input
 */

(function() {
    document.addEventListener('DOMContentLoaded', function() {

        // ── Framework instances ───────────────────────────────────────────────
        var ui = AdPuzzle.createUI();
        var scoring = AdPuzzle.createScoring('threes');
        var renderer = null;
        var input = null;
        var game = null;
        var timerInterval = null;

        // ── DOM elements ─────────────────────────────────────────────────────
        var $ = ui.$;
        var boardEl = $('#gameBoard');
        var scoreEl = $('#score');
        var timerEl = $('#timer');
        var bestScoreEl = $('#bestScore');
        var highTileEl = $('#highTile');

        // ── Modals ───────────────────────────────────────────────────────────
        ui.registerModal('titleScreen', $('#titleScreen'));
        ui.registerModal('gameOverModal', $('#gameOverModal'));
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
                bestScoreEl.textContent = ui.formatScore(top[0].score);
            } else {
                bestScoreEl.textContent = '---';
            }
        }
        updateBestDisplay();

        // ── High tile display ────────────────────────────────────────────────
        function getHighTile() {
            if (!game || !game.grid) return 0;
            return AdPuzzle.PuzzleGrid.getMaxValue(game.grid);
        }

        function updateHighTile() {
            var val = getHighTile();
            highTileEl.textContent = val > 0 ? val : '---';
        }

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

        // ── Game creation ────────────────────────────────────────────────────
        function createGame() {
            if (input) input.destroy();
            stopTimer();

            game = ThreesGame.create();

            renderer = AdPuzzle.createRenderer(boardEl, {
                tileClass: 'tile',
                emptyClass: 'tile-empty'
            });

            game.setOnRender(function() {
                renderer.renderGrid(game.grid, function(row, col, value) {
                    var tile = document.createElement('div');
                    tile.className = 'tile';
                    tile.dataset.row = row;
                    tile.dataset.col = col;

                    if (value === 0) {
                        tile.classList.add('tile-empty');
                    } else {
                        tile.textContent = value;
                        tile.dataset.value = value;
                    }

                    return tile;
                });

                scoreEl.textContent = ui.formatScore(game.score);
                updateHighTile();
            });

            game.setOnStateChange(function(state) {
                scoreEl.textContent = ui.formatScore(state.score);
            });

            game.setOnGameOver(function() {
                stopTimer();
                body.classList.remove('game-active');

                var finalScore = game.score;
                var isNew = scoring.isNewHighScore(finalScore, 'normal');

                $('#finalScore').textContent = ui.formatScore(finalScore);
                $('#finalHighTile').textContent = getHighTile();
                $('#finalTime').textContent = ui.formatTime(game.getElapsedTime());

                if (isNew) {
                    var rank = scoring.addScore(finalScore, 'normal', {
                        time: game.getElapsedTime(),
                        highestTile: getHighTile()
                    });
                    $('#gameOverRank').textContent = 'new #' + rank + ' high score!';
                    updateBestDisplay();
                    ui.showModal('gameOverModal');

                    setTimeout(function() {
                        ui.hideModal('gameOverModal');
                        showInitialsPrompt(finalScore);
                    }, 1500);
                } else {
                    scoring.addScore(finalScore, 'normal', {
                        time: game.getElapsedTime(),
                        highestTile: getHighTile()
                    });
                    $('#gameOverRank').textContent = '';
                    updateBestDisplay();
                    ui.showModal('gameOverModal');
                }
            });

            input = AdPuzzle.createInput({
                onMove: function(dir) { game.handleMove(dir); },
                isActive: function() { return game.isActive(); }
            }, boardEl);

            game.init();
            startTimer();
            scoreEl.textContent = '0';
            timerEl.textContent = '0:00';
            updateHighTile();
        }

        // ── Initials prompt ──────────────────────────────────────────────────
        function showInitialsPrompt(finalScore) {
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
            html += '<div class="score-header"><span class="rank-col">#</span><span class="name-col">NAME</span><span class="score-col">SCORE</span><span class="tile-col">BEST</span></div>';

            if (topScores.length === 0) {
                html += '<div class="no-scores">no scores yet</div>';
            } else {
                for (var i = 0; i < topScores.length; i++) {
                    var s = topScores[i];
                    var name = s.initials || '---';
                    var tile = s.highestTile || '---';
                    html += '<div class="score-row">';
                    html += '<span class="rank-col">' + (i + 1) + '</span>';
                    html += '<span class="name-col">' + name + '</span>';
                    html += '<span class="score-col">' + ui.formatScore(s.score) + '</span>';
                    html += '<span class="tile-col">' + tile + '</span>';
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
