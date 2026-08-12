/**
 * main.js — 15 Puzzle UI wiring
 * DOM initialization, difficulty selector, modals, scoring, input
 */

(function() {
    document.addEventListener('DOMContentLoaded', function() {

        // ── Framework instances ───────────────────────────────────────────────
        var ui = AdPuzzle.createUI();
        var renderer = null;
        var input = null;
        var game = null;
        var timerInterval = null;
        var selectedSize = 4;
        var scoring = null;

        // ── DOM elements ─────────────────────────────────────────────────────
        var $ = ui.$;
        var boardEl = $('#gameBoard');
        var moveCountEl = $('#moveCount');
        var timerEl = $('#timer');
        var bestScoreEl = $('#bestScore');
        var titleNumberEl = $('#titleNumber');

        // ── Size labels ──────────────────────────────────────────────────────
        var sizeLabels = {
            3: { tiles: 8, name: '8 PUZZLE' },
            4: { tiles: 15, name: '15 PUZZLE' },
            5: { tiles: 24, name: '24 PUZZLE' },
            6: { tiles: 35, name: '35 PUZZLE' }
        };

        // ── Modals ───────────────────────────────────────────────────────────
        ui.registerModal('titleScreen', $('#titleScreen'));
        ui.registerModal('difficultyModal', $('#difficultyModal'));
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

        // ── Scoring (per grid size) ──────────────────────────────────────────
        function getScoring() {
            return AdPuzzle.createScoring('fifteen-puzzle-' + selectedSize + 'x' + selectedSize, { ascending: true });
        }

        // ── Best score display ───────────────────────────────────────────────
        function updateBestDisplay() {
            scoring = getScoring();
            var top = scoring.getTopScores('normal', 1);
            if (top.length > 0) {
                bestScoreEl.textContent = top[0].score;
            } else {
                bestScoreEl.textContent = '---';
            }
        }

        // ── Dynamic text updates ─────────────────────────────────────────────
        function updateLabels() {
            var info = sizeLabels[selectedSize];
            var puzzleNum = selectedSize * selectedSize - 1;
            titleNumberEl.textContent = puzzleNum;
            $('#gameTitle').textContent = info.name;
            document.title = info.name;
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

            scoring = getScoring();
            game = FifteenPuzzle.create(selectedSize);

            // Set dynamic grid size
            boardEl.style.setProperty('--grid-size', selectedSize);
            boardEl.dataset.size = selectedSize;

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

                moveCountEl.textContent = game.moves;
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

            input = AdPuzzle.createInput({
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
        var difficultyModal = $('#difficultyModal');

        function showDifficultyModal() {
            ui.hideModal('titleScreen');
            titleScreen.classList.remove('active');
            ui.showModal('difficultyModal');
        }

        $('#startButton').addEventListener('click', showDifficultyModal);

        document.addEventListener('keydown', function onStart(e) {
            if (e.code === 'Space' && titleScreen.classList.contains('active')) {
                e.preventDefault();
                showDifficultyModal();
            }
        });

        // ── Difficulty dropdown ───────────────────────────────────────────────
        var dropdown = $('#difficultyDropdown');
        var dropdownSelected = $('#difficultyDropdownSelected');
        var dropdownOptions = $('#difficultyDropdownOptions');
        var selectedDifficulty = $('#selectedDifficulty');

        dropdownSelected.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });

        var options = dropdownOptions.querySelectorAll('.dropdown-option-diff');
        options.forEach(function(option) {
            option.addEventListener('click', function() {
                selectedSize = parseInt(option.dataset.size, 10);
                var info = sizeLabels[selectedSize];
                selectedDifficulty.textContent = selectedSize + '×' + selectedSize + ' MODE \u2022 ' + info.name;
                dropdown.classList.remove('open');

                // Highlight selected
                options.forEach(function(o) { o.classList.remove('highlighted'); });
                option.classList.add('highlighted');
            });
        });

        // Close dropdown on outside click
        document.addEventListener('click', function(e) {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('open');
            }
        });

        // ── Start game from difficulty modal ─────────────────────────────────
        $('#startGameBtn').addEventListener('click', function() {
            ui.hideModal('difficultyModal');
            body.classList.add('game-active');
            updateLabels();
            updateBestDisplay();
            createGame();
        });

        // ── Difficulty modal menu buttons ────────────────────────────────────
        $('#difficultyHowToPlay').addEventListener('click', function() {
            ui.showModal('instructionsModal');
        });

        $('#difficultyHighScores').addEventListener('click', function() {
            renderScoreboard();
            ui.showModal('scoreboardModal');
        });

        $('#difficultyCredits').addEventListener('click', function() {
            ui.showModal('creditsModal');
        });

        // ── Button handlers ──────────────────────────────────────────────────
        $('#newGame').addEventListener('click', function() {
            ui.hideAllModals();
            body.classList.add('game-active');
            updateLabels();
            updateBestDisplay();
            createGame();
        });

        $('#playAgain').addEventListener('click', function() {
            ui.hideAllModals();
            body.classList.add('game-active');
            updateLabels();
            updateBestDisplay();
            createGame();
        });

        // ── Scoreboard ───────────────────────────────────────────────────────
        $('#toggleScoreboard').addEventListener('click', function() {
            renderScoreboard();
            ui.showModal('scoreboardModal');
        });
        ui.setupModalClose('scoreboardModal', [$('#closeScoreboard')]);

        function renderScoreboard() {
            scoring = getScoring();
            var topScores = scoring.getTopScores('normal', 10);
            var info = sizeLabels[selectedSize];
            var html = '<div class="score-list">';
            html += '<div class="score-header"><span class="rank-col">#</span><span class="name-col">NAME</span><span class="score-col">MOVES</span><span class="time-col">TIME</span></div>';

            if (topScores.length === 0) {
                html += '<div class="no-scores">no scores yet for ' + info.name + '</div>';
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
