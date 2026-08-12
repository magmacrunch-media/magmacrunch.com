/**
 * main.js — Klotski UI wiring
 * DOM initialization, custom tile renderer, modals, scoring
 */

(function() {
    document.addEventListener('DOMContentLoaded', function() {

        // ── Framework instances ───────────────────────────────────────────────
        var ui = AdPuzzle.createUI();
        var scoring = AdPuzzle.createScoring('klotski', { ascending: true });
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

        // ── Tile name translations ───────────────────────────────────────────
        var tileNames = {
            1: { chinese: '曹操', english: 'CAO CAO' },
            2: { chinese: '关羽', english: 'GUAN YU' },
            3: { chinese: '张飞', english: 'ZHANG FEI' },
            4: { chinese: '赵云', english: 'ZHAO YUN' },
            5: { chinese: '马超', english: 'MA CHAO' },
            6: { chinese: '黄忠', english: 'HUANG ZHONG' },
            7: { chinese: '卒', english: 'S' },
            8: { chinese: '卒', english: 'S' }
        };

        // ── Text mode persistence ────────────────────────────────────────────
        var savedTextMode = localStorage.getItem('klotski_textMode') || 'both';

        function setTextMode(mode) {
            savedTextMode = mode;
            if (game) game.textMode = mode;
            localStorage.setItem('klotski_textMode', mode);
            if (game) renderBoard();
        }

        // ── Custom tile renderer ─────────────────────────────────────────────
        function renderBoard() {
            boardEl.innerHTML = '';
            var tiles = game.getTiles();
            var mode = game.textMode;

            for (var i = 0; i < tiles.length; i++) {
                var t = tiles[i];
                var el = document.createElement('div');
                el.className = 'tile tile-' + t.type;
                el.dataset.id = t.id;
                el.dataset.type = t.type;

                // CSS grid placement
                el.style.gridColumn = (t.col + 1) + ' / span ' + t.w;
                el.style.gridRow = (t.row + 1) + ' / span ' + t.h;

                // Tile content based on text mode
                var names = tileNames[t.id];
                if (t.type === '2x2') {
                    if (mode === 'chinese') {
                        el.innerHTML = '<span class="tile-char">' + names.chinese + '</span>';
                    } else if (mode === 'english') {
                        el.innerHTML = '<span class="tile-char">' + names.english + '</span>';
                    } else {
                        el.innerHTML = '<span class="tile-char">' + names.chinese + '</span><span class="tile-sub">' + names.english + '</span>';
                    }
                } else if (t.type === '2x1') {
                    if (mode === 'chinese') {
                        el.innerHTML = '<span class="tile-char-small">' + names.chinese + '</span>';
                    } else if (mode === 'english') {
                        el.innerHTML = '<span class="tile-char-small">' + names.english + '</span>';
                    } else {
                        el.innerHTML = '<span class="tile-char-small">' + names.chinese + '</span><span class="tile-sub-small">' + names.english + '</span>';
                    }
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

            input = AdPuzzle.createInput({
                onMove: function(dir) { game.handleMove(dir); },
                isActive: function() { return game.isActive(); }
            }, boardEl);

            game.init();
            game.textMode = savedTextMode;
            startTimer();
            moveCountEl.textContent = '0';
            timerEl.textContent = '0:00';
        }

        // ── Language dropdown ────────────────────────────────────────────────
        var langDropdown = $('#langDropdown');
        var langDropdownSelected = $('#langDropdownSelected');
        var langDropdownOptions = $('#langDropdownOptions');
        var selectedLang = $('#selectedLang');
        var langOptions = langDropdownOptions.querySelectorAll('.dropdown-option-lang');

        // Set initial state
        selectedLang.textContent = savedTextMode.toUpperCase();
        langOptions.forEach(function(opt) {
            if (opt.dataset.lang === savedTextMode) {
                opt.classList.add('highlighted');
            } else {
                opt.classList.remove('highlighted');
            }
        });

        langDropdownSelected.addEventListener('click', function(e) {
            e.stopPropagation();
            langDropdown.classList.toggle('open');
        });

        langOptions.forEach(function(option) {
            option.addEventListener('click', function() {
                var lang = option.dataset.lang;
                setTextMode(lang);
                selectedLang.textContent = lang.toUpperCase();
                langDropdown.classList.remove('open');

                langOptions.forEach(function(o) { o.classList.remove('highlighted'); });
                option.classList.add('highlighted');
            });
        });

        document.addEventListener('click', function(e) {
            if (!langDropdown.contains(e.target)) {
                langDropdown.classList.remove('open');
            }
        });

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
