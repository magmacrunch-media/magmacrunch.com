// main.js

let currentGame = null;
let currentDifficulty = '6';

function getScoreboardDefault() {
    return localStorage.getItem('lastPlayedDifficulty') || 'overall';
}


// Track if we opened instructions from difficulty modal
let returnToLoreScreen = false;
// Set when LEARN is picked off the mode list, so leaving it goes back there.
let returnToPicker = false;

/**
 * Settings that survive a reload. Wrapped because localStorage throws in
 * private mode rather than returning null, and a display toggle is not worth
 * taking the page down for.
 */
function readSetting(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : raw === 'on';
    } catch (e) {
        return fallback;
    }
}

function writeSetting(key, on) {
    try {
        localStorage.setItem(key, on ? 'on' : 'off');
    } catch (e) {
        // Storage full or disabled. The setting still applies to this session.
    }
}

// Binary display mode - enabled by default
let binaryDisplayMode = true;

// iOS has no Ogg Vorbis decoder, and every browser on iOS is WebKit, so Chrome
// and Firefox there fail identically - the audio was simply silent on every
// iPhone and iPad. Each clip now ships as .ogg and .mp3; pick whichever this
// browser can actually decode. Ogg stays preferred where it works, since the
// mp3 is a transcode of it.
const AUDIO_EXT = document.createElement('audio')
    .canPlayType('audio/ogg; codecs="vorbis"') ? '.ogg' : '.mp3';
const audioSrc = (path) => path.replace(/\.ogg$/, AUDIO_EXT);

// How many glyphs trail behind each falling head.
const RAIN_TRAIL = 14;

/**
 * Binary rain behind the title screen.
 *
 * Returns { start, stop }. Nothing runs until start() is called, and stop()
 * is real -- the first version of this left a requestAnimationFrame loop
 * running behind the board for the whole session, which on a phone is a
 * background render loop nobody asked for.
 *
 * Three things here are deliberate, because the first attempt got each of
 * them wrong and the result was invisible rather than obviously broken:
 *
 *  - The canvas is cleared each frame, not veiled with a translucent fill.
 *    The veil is the classic trail technique and it only works when the
 *    canvas IS the background; composited over the title screen's gradient
 *    it converges towards opaque and flattens the glow underneath, so the
 *    effect fights itself at every opacity.
 *  - Column width is measured from the font, once, rather than assumed equal
 *    to the font size in three separate places.
 *  - The glyphs stay put and the trail moves across them. Re-rolling every
 *    character every frame reads as television static.
 */
function createBinaryRain(canvas) {
    if (!canvas || !canvas.getContext) return { start() {}, stop() {} };

    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    let cols = [];
    let cellW = 18;
    let cellH = 24;
    let rows = 0;
    let cssW = 0;
    let cssH = 0;
    let raf = 0;
    let running = false;

    const glyph = () => (Math.random() < 0.5 ? '0' : '1');

    function newColumn(scatter) {
        const chars = [];
        for (let i = 0; i < RAIN_TRAIL; i++) chars.push(glyph());
        return {
            // On the first fill, heads are scattered across the whole height
            // so the field is already running when the title screen appears.
            // A recycled column re-enters from above the top edge.
            head: scatter
                ? Math.random() * (rows + RAIN_TRAIL) - RAIN_TRAIL
                : -RAIN_TRAIL - Math.random() * rows * 0.5,
            speed: 0.4 + Math.random() * 0.8,
            chars,
        };
    }

    function measure() {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;

        cssW = rect.width;
        cssH = rect.height;

        // Without this the buffer is in CSS pixels and the browser upscales
        // it, which on a 3x iPhone is visibly soft.
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const size = parseFloat(
            getComputedStyle(canvas).getPropertyValue('--rain-size')
        ) || 18;
        ctx.font = size + 'px "Press Start 2P", monospace';
        ctx.textBaseline = 'top';

        cellW = Math.max(1, Math.ceil(ctx.measureText('0').width)) + 2;
        cellH = Math.max(1, Math.round(size * 1.35));
        rows = Math.ceil(cssH / cellH);

        const count = Math.ceil(cssW / cellW);
        cols = [];
        for (let i = 0; i < count; i++) cols.push(newColumn(true));
        return true;
    }

    function draw() {
        ctx.clearRect(0, 0, cssW, cssH);

        for (let i = 0; i < cols.length; i++) {
            const col = cols[i];
            const before = Math.floor(col.head);
            col.head += col.speed;
            const row = Math.floor(col.head);

            for (let n = before; n < row; n++) {
                col.chars.pop();
                col.chars.unshift(glyph());
            }

            const x = i * cellW;
            for (let t = 0; t < RAIN_TRAIL; t++) {
                const y = (row - t) * cellH;
                if (y < -cellH || y > cssH) continue;
                ctx.fillStyle = t === 0
                    ? 'rgba(224, 255, 255, 0.95)'
                    : 'rgba(0, 255, 255, ' + ((1 - t / RAIN_TRAIL) * 0.55).toFixed(3) + ')';
                ctx.fillText(col.chars[t], x, y);
            }

            // Recycle the moment the tail clears the bottom. The first version
            // waited on a 0.5%-per-frame coin flip, so columns died off and
            // the field thinned out the longer you looked at it.
            if ((row - RAIN_TRAIL) * cellH > cssH) {
                cols[i] = newColumn(false);
            }
        }

        raf = requestAnimationFrame(draw);
    }

    function stop() {
        running = false;
        if (raf) {
            cancelAnimationFrame(raf);
            raf = 0;
        }
        if (cssW && cssH) ctx.clearRect(0, 0, cssW, cssH);
    }

    function start() {
        if (running) return;
        // Someone who has asked their device for less motion gets none of
        // this. It carries no information, so there is nothing to replace it
        // with -- the stylesheet stills the other six animations.
        if (reduce && reduce.matches) return;
        if (!measure()) return;
        running = true;
        raf = requestAnimationFrame(draw);
    }

    window.addEventListener('resize', () => {
        if (running) measure();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (raf) {
                cancelAnimationFrame(raf);
                raf = 0;
            }
        } else if (running && !raf) {
            raf = requestAnimationFrame(draw);
        }
    });

    if (reduce && reduce.addEventListener) {
        reduce.addEventListener('change', () => {
            if (reduce.matches) stop();
        });
    }

    return { start, stop };
}

/** The gate glyphs drifting up behind the title. Pure CSS once placed. */
function createFloatingGates(container) {
    if (!container || container.childElementCount) return;
    const gates = [
        { symbol: '⊕', gate: 'xor' },
        { symbol: '∨', gate: 'or' },
        { symbol: '∧', gate: 'and' },
        { symbol: '¬', gate: 'not' },
    ];
    for (let i = 0; i < 14; i++) {
        const g = gates[i % gates.length];
        const el = document.createElement('span');
        el.className = 'floating-gate';
        el.setAttribute('data-gate', g.gate);
        el.textContent = g.symbol;
        el.style.left = (6 + Math.random() * 88) + '%';
        const seconds = 12 + Math.random() * 18;
        el.style.animationDuration = seconds + 's';
        // NEGATIVE, so each glyph starts part-way through its own cycle and the
        // screen is populated the moment the title appears. A positive delay of
        // up to 20s against a 12-30s float meant most of them were still
        // waiting to begin when somebody looked, which is why there were two on
        // screen rather than a drift.
        el.style.animationDelay = -(Math.random() * seconds) + 's';
        el.style.fontSize = (14 + Math.random() * 12) + 'px';
        container.appendChild(el);
    }
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Sound effects only. The music is deliberately not in this manifest:
        // AdAudio.init() awaits every track it is given before it returns, and
        // game-loop is 3:50 of audio that decodeAudioData turns into roughly
        // 84MB of PCM. With it here the loading screen waited for that whole
        // decode, and the sound effects did not even start loading until it
        // was done -- on a desktop about 250ms of a 274ms launch, and several
        // times that on a phone. Nothing on the title screen needs the music.
        //
        // Its own try, too: audio used to share the try below with everything
        // that wires up the title screen, so one clip failing to decode threw
        // past all of it and left the loading screen up for good. A game with
        // no sound is still a game.
        try {
            await AdAudio.init({
                sfx: {
                    spawn:    { url: audioSrc('audio/sfx/spawn.ogg'),     volume: 0.3, pool: 3 },
                    merge:    { url: audioSrc('audio/sfx/merge.ogg'),     volume: 0.3, pool: 3 },
                    victory:  { url: audioSrc('audio/sfx/victory.ogg'),   volume: 0.3, pool: 3 },
                    gameOver: { url: audioSrc('audio/sfx/gameover.ogg'),  volume: 0.3, pool: 3 },
                    move:     { url: audioSrc('audio/sfx/move.ogg'),      volume: 0.3, pool: 3 },
                    highScore:{ url: audioSrc('audio/sfx/highscore.ogg'), volume: 0.3, pool: 3 },
                },
            });
        } catch (error) {
            console.error('Sound effects failed to load:', error);
        }
        AdAudio.handleVisibility({ pauseMusic: true });

        // The music decodes in the background from here, while the title
        // screen is already up. Started, not awaited; startGame() plays it once
        // this settles, so tapping start before the decode finishes still gets
        // music, just a moment later. Resolves false rather than rejecting, so
        // a track that will not decode means silence and nothing else.
        const musicReady = AdAudio.loadMusic(audioSrc('audio/game-loop.ogg'), { volume: 0.3 })
            .then(() => true)
            .catch((error) => {
                console.error('Music failed to load:', error);
                return false;
            });
        
        // Start loading scores
        await loadScores();

        // Hide loading screen
        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);

        // ---- Title screen background ----
        const rain = createBinaryRain(document.getElementById('binaryRain'));
        createFloatingGates(document.getElementById('floatingGates'));

        // Wait for Press Start 2P before measuring: the column width comes
        // from the font's own advance, and the fallback's is different, so
        // starting early would lay out the field twice. Not awaited -- the
        // title screen is interactive without it.
        const fontsReady = document.fonts && document.fonts.ready
            ? document.fonts.ready
            : Promise.resolve();
        fontsReady.then(() => rain.start());

        // Title screen navigation
        const titleScreen = document.getElementById('titleScreen');
        const loreScreen = document.getElementById('loreScreen');
        const difficultyModal = document.getElementById('difficultyModal');
        
        // Function to show the lore/rules screen
        const startGame = () => {
            titleScreen.classList.remove('active');
            loreScreen.classList.add('active');

            // The title screen is gone for the rest of the session, so the
            // canvas loop has nothing left to draw. Leaving it running is a
            // render loop behind the board, which matters on a phone.
            rain.stop();

            // Start music with fade-in, as soon as the background decode above
            // has finished -- which it usually has by the time anyone taps.
            musicReady.then((loaded) => {
                if (loaded) AdAudio.playMusic(2.0);
            });
        };
        
        // Back to the title. The rain is stopped when the title screen is
        // left, so coming back starts it again: start() measures the canvas,
        // which needs the screen it is on to be visible first.
        const loreTitle = document.getElementById('loreTitle');
        if (loreTitle) {
            loreTitle.addEventListener('click', () => {
                loreScreen.classList.remove('active');
                titleScreen.classList.add('active');
                rain.start();
            });
        }

        // Function to advance from lore screen to difficulty selector
        const showDifficulty = () => {
            loreScreen.classList.remove('active');
            difficultyModal.dataset.from = 'lore';
            difficultyModal.classList.add('active');
        };

        // ---- The how-to-play screen as a menu, over a live game ----
        //
        // It always was the menu -- your bests, settings, the full rules, the
        // codex and the credits all hang off it -- but a game in progress put
        // it out of reach, because its continue button went straight to mode
        // selection and picking a mode destroys the running game. So the one
        // screen holding everything, including the only "back to title" in the
        // game, was reachable before your first game and after you lost, and at
        // no other time. The strip under the board grew a third link to work
        // around that; the comment there says so.
        //
        // It carries a `from` now, the way difficultyModal already did for
        // exactly this reason, and the continue button offers the board back
        // instead. Note the mode picker is then not reachable from here, which
        // is the point: "new game" on the board is where you go to throw a game
        // away, and it asks in its own words.
        const loreContinueBtn = document.getElementById('loreContinue');
        const loreLabel = loreContinueBtn && loreContinueBtn.querySelector('span');
        const LORE_ONWARD = 'SELECT MODE \u2192';

        const showLore = (from) => {
            if (from) {
                loreScreen.dataset.from = from;
            } else {
                delete loreScreen.dataset.from;
            }
            if (loreLabel) {
                loreLabel.textContent = from === 'game' ? '\u2190 BACK TO GAME' : LORE_ONWARD;
            }
            loreScreen.classList.add('active');
        };

        // The continue button and the spacebar, which have to agree. Leaving
        // the card clears `from`, so the next visit gets the mode picker back.
        const leaveLore = () => {
            if (loreScreen.dataset.from !== 'game') {
                showDifficulty();
                return;
            }
            loreScreen.classList.remove('active');
            delete loreScreen.dataset.from;
            if (loreLabel) loreLabel.textContent = LORE_ONWARD;
        };

        // The door from the board. It sits in the controls row rather than on
        // the rules strip: that row is this game's own navigation, and the
        // strip is reference material.
        const toggleMenu = document.getElementById('toggleMenu');
        if (toggleMenu) {
            toggleMenu.addEventListener('click', () => showLore('game'));
        }
        
        // Click handler for start button (title → lore)
        document.getElementById('startButton').addEventListener('click', startGame);
        
        // Click handler for continue button (lore → difficulty)
        if (loreContinueBtn) loreContinueBtn.addEventListener('click', leaveLore);
        
        // Spacebar handler: title screen OR lore screen
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                if (titleScreen.classList.contains('active')) {
                    e.preventDefault();
                    startGame();
                } else if (loreScreen.classList.contains('active')) {
                    e.preventDefault();
                    leaveLore();
                }
            }
        });
        
        // Quick action button handlers
        const quickHighScores = document.getElementById('quickHighScores');
        const quickSettings = document.getElementById('quickSettings');
        
        // High Scores button - opens scoreboard from difficulty modal
        if (quickHighScores) {
            quickHighScores.addEventListener('click', () => {
                loreScreen.classList.remove('active');
                returnToLoreScreen = true;
                const scoreDefault = getScoreboardDefault();
                updateCustomDropdownValue(scoreDefault);
                updateScoreboard(scoreDefault);
                document.getElementById('scoreboardModal').classList.add('active');
                document.getElementById('scoreboardModal').classList.add('menu-mode');
            });
        }
        
        // Settings button - opens settings from difficulty modal
        if (quickSettings) {
            quickSettings.addEventListener('click', () => {
                loreScreen.classList.remove('active');
                returnToLoreScreen = true;
                document.getElementById('settingsModal').classList.add('active');
                document.getElementById('settingsModal').classList.add('menu-mode');
            });
        }

        // The only place the rules panel opens, so the back button's label and
        // the scroll reset are set once rather than in each of the four buttons
        // that reach it. That label names a destination, and which destination
        // depends on where the panel was opened from: the how-to-play screen, or
        // the board mid-game.
        const openInstructions = (section) => {
            const modal = document.getElementById('instructionsModal');
            const back = document.getElementById('instructionsBack');
            if (back) {
                back.textContent = returnToLoreScreen
                    ? '← how to play'
                    : '← back to game';
            }
            modal.classList.add('active');
            const content = modal.querySelector('.instructions-content');
            if (content) {
                content.scrollTop = 0;
            }
            // The pager measures on first open, so the page it is asked for has
            // to be asked for after the panel is on screen and has a height.
            if (section && window.BooleRules) {
                requestAnimationFrame(() => {
                    if (window.BooleRules.showSection(section)) return;
                    // The heading was reworded and this call was not. Page one
                    // beats the page the last reader happened to leave open, and
                    // the warning is so it cannot stay silent: asking by heading
                    // was the whole point, because page numbers drift.
                    console.warn('rules: no section matching "%s"', section);
                    window.BooleRules.show(1);
                });
            }
        };

        // "full rules" on the how-to-play screen. The instructions modal stacks
        // below the lore screen (z-index 2100 against 3000), so the lore screen
        // has to step aside and be put back when the modal closes.
        // Two doors into the one rules panel: "full rules" opens at how the
        // board works, and "new to binary?" opens at the primer. Asked for by
        // heading rather than page number, because the numbers shift every time
        // a section is added and a stale number would land a first-time player
        // on whatever happened to be there.
        const openRules = (section) => {
            loreScreen.classList.remove('active');
            returnToLoreScreen = true;
            openInstructions(section);
        };

        const loreFullRules = document.getElementById('loreFullRules');
        if (loreFullRules) {
            loreFullRules.addEventListener('click', () => openRules('goal'));
        }

        // The primer, played rather than read. This button used to open the
        // rules panel at its `basics` chapter, which is eight pages of prose
        // that explains binary well and lets nobody touch a lamp; js/tutorial.js
        // is the same four beats as four interactions. The chapter is still the
        // reference and is still one tap away -- from "full rules" below, and
        // from "read it instead" inside the primer itself, so neither audience
        // is sent through the other's door.
        //
        // openRules() is still the fallback. A build without tutorial.js, or
        // one where it threw on load, keeps the behaviour this button had
        // rather than becoming a button that does nothing.
        // LEARN, on the menu. It was a small text link reading "new to binary?"
        // under three worked examples; it is one of the two primary buttons
        // now, beside PLAY and the same size as it.
        const menuLearn = document.getElementById('menuLearn');
        if (menuLearn) {
            menuLearn.addEventListener('click', () => {
                if (window.BooleTutorial && window.BooleTutorial.open) {
                    loreScreen.classList.remove('active');
                    returnToLoreScreen = true;
                    window.BooleTutorial.open();
                    return;
                }
                openRules('start with counting');
            });
        }

        // Leaving the primer goes back where the codex goes back to. Without
        // this, closing it left an empty board behind it -- the same bug
        // js/codex.js records against boole:codex-closed, and the same fix.
        document.addEventListener('boole:primer-closed', () => {
            // Back where it was opened from. Leaving LEARN lands on the mode
            // list it was picked off, not on the how-to-play screen, which is
            // somewhere the player may never have been.
            if (returnToPicker) {
                returnToPicker = false;
                difficultyModal.dataset.from = 'lore';
                difficultyModal.classList.add('active');
                return;
            }
            if (returnToLoreScreen) {
                returnToLoreScreen = false;
                loreScreen.classList.add('active');
            }
        });

        // Setup difficulty selection
        const difficultyButtons = document.querySelectorAll('.difficulty-btn');
        
        difficultyButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const difficulty = btn.dataset.difficulty;
                const target = parseInt(btn.dataset.target);
                const theme = btn.dataset.theme || 'snes';

                // LEARN is a mode on this list and not a game: it starts no
                // board, so it returns before any of the below.
                //
                // It must not touch lastPlayedDifficulty either. That key is
                // what getScoreboardDefault() opens the scoreboard on, and
                // 'tutorial' is not a column there -- the board would come up
                // on a mode that has no scores and never will.
                if (difficulty === 'tutorial') {
                    difficultyModal.classList.remove('active');
                    if (window.BooleTutorial && window.BooleTutorial.open) {
                        returnToLoreScreen = false;
                        returnToPicker = true;
                        window.BooleTutorial.open();
                    } else {
                        // No tutorial.js in this build: fall back to the rules
                        // rather than to a button that does nothing.
                        openInstructions('start with counting');
                    }
                    return;
                }

                currentDifficulty = difficulty;
                localStorage.setItem('lastPlayedDifficulty', difficulty);
                
                // Clean up old game instance to prevent memory leaks
                if (currentGame) {
                    currentGame.destroy();
                }
                
                // Apply theme to body
                document.body.setAttribute('data-theme', theme);
                
                // Add game-active class to enable animations
                document.body.classList.add('game-active');
                
                // Mark gauntlet mode for side panel highlighting
                if (difficulty === 'endless') {
                    document.body.classList.add('game-active-gauntlet');
                } else {
                    document.body.classList.remove('game-active-gauntlet');
                }
                
                // Hide difficulty modal
                difficultyModal.classList.remove('active');
                
                // Start game with selected difficulty
                currentGame = new BooleBoard(difficulty, target);
            });
        });

        // Back button: wherever the mode picker was opened from.
        //
        // It always went to the rules screen, which is right when that is
        // where you came from and quietly destructive when it is not: "new
        // game" during a game opens this picker, and backing out of it left
        // the rules screen with a live board behind it and no way to reach
        // that board again. The only way on was to start a different game, so
        // second thoughts cost you the one you were playing.
        const difficultyBack = document.getElementById('difficultyBack');
        if (difficultyBack) {
            difficultyBack.addEventListener('click', () => {
                const from = difficultyModal.dataset.from || 'lore';
                difficultyModal.classList.remove('active');
                delete difficultyModal.dataset.from;

                if (from === 'game') return;                 // back to the board
                if (from === 'gameover') {
                    document.getElementById('gameOver').classList.add('active');
                    return;
                }
                loreScreen.classList.add('active');
            });
        }
        
        // How to play, from the rules strip under the board on a phone.
        // returnToLoreScreen is left alone: closing this should put the player
        // back on the board they were playing, which is what the back button
        // will say.
        const howToPlayLink = document.getElementById('howToPlayLink');
        if (howToPlayLink) {
            // At GOAL, not at page one: page one is the primer now, and
            // somebody mid-game reaching for the rules has met a bit already.
            howToPlayLink.addEventListener('click', () => openInstructions('goal'));
        }

        let scoreboardOpen = false;

        // Scoreboard modal controls
        document.getElementById('toggleScoreboard').addEventListener('click', () => {
            if (scoreboardOpen) return;
            scoreboardOpen = true;
            
            setTimeout(() => {
                // Show overall if no game played yet, otherwise last-played mode
                const scoreDefault = getScoreboardDefault();
                updateCustomDropdownValue(scoreDefault);
                updateScoreboard(scoreDefault);
                document.getElementById('scoreboardModal').classList.add('active');
            }, 10);
        });

        document.getElementById('closeScoreboard').addEventListener('click', () => {
            document.getElementById('scoreboardModal').classList.remove('active');
            document.getElementById('scoreboardModal').classList.remove('menu-mode');
            
            // If we came from lore screen, go back to it
            if (returnToLoreScreen) {
                loreScreen.classList.add('active');
                returnToLoreScreen = false;
            }
            
            setTimeout(() => {
                scoreboardOpen = false;
            }, 300);
        });

        // Close modal when clicking outside the content
        document.getElementById('scoreboardModal').addEventListener('click', (e) => {
            if (e.target.id === 'scoreboardModal') {
                document.getElementById('scoreboardModal').classList.remove('active');
                document.getElementById('scoreboardModal').classList.remove('menu-mode');
                
                // If we came from lore screen, go back to it
                if (returnToLoreScreen) {
                    loreScreen.classList.add('active');
                    returnToLoreScreen = false;
                }
                
                setTimeout(() => {
                    scoreboardOpen = false;
                }, 300);
            }
        });

        // Custom dropdown functionality
        const customDropdown = document.getElementById('customDropdown');
        const dropdownSelected = document.getElementById('dropdownSelected');
        const dropdownOptions = document.getElementById('dropdownOptions');
        
        // Toggle dropdown open/closed
        if (dropdownSelected) {
            dropdownSelected.addEventListener('click', (e) => {
                e.stopPropagation();
                customDropdown.classList.toggle('open');
            });
        }
        
        // Handle option selection
        if (dropdownOptions) {
            dropdownOptions.addEventListener('click', (e) => {
                if (e.target.classList.contains('dropdown-option')) {
                    const value = e.target.dataset.value;
                    const text = e.target.textContent;
                    
                    // Update selected display
                    document.querySelector('.selected-text').textContent = text;
                    
                    // Update active state
                    document.querySelectorAll('.dropdown-option').forEach(opt => {
                        opt.classList.remove('active');
                    });
                    e.target.classList.add('active');
                    
                    // Close dropdown
                    customDropdown.classList.remove('open');
                    
                    // Update scoreboard
                    updateScoreboard(value);
                }
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (customDropdown && !customDropdown.contains(e.target)) {
                customDropdown.classList.remove('open');
            }
        });
        
        // Helper function to update dropdown value
        function updateCustomDropdownValue(difficulty) {
            const options = document.querySelectorAll('.dropdown-option');
            options.forEach(opt => {
                if (opt.dataset.value === difficulty) {
                    document.querySelector('.selected-text').textContent = opt.textContent;
                    opt.classList.add('active');
                } else {
                    opt.classList.remove('active');
                }
            });
        }

        // Instructions modal controls
        // Opened from the how-to-play screen, closing goes back to it.
        const returnFromInstructions = () => {
            if (returnToLoreScreen) {
                loreScreen.classList.add('active');
                returnToLoreScreen = false;
            }
        };

        const closeInstructionsModal = () => {
            document.getElementById('instructionsModal').classList.remove('active');
            returnFromInstructions();
        };

        document.getElementById('closeInstructions').addEventListener('click', closeInstructionsModal);

        // The same action as "close", pinned to the top of the panel so leaving
        // does not mean paging to the end of the rules first. Unlike "close" it
        // says where it goes, and openInstructions above sets the word.
        const instructionsBack = document.getElementById('instructionsBack');
        if (instructionsBack) {
            instructionsBack.addEventListener('click', closeInstructionsModal);
        }

        document.getElementById('instructionsModal').addEventListener('click', (e) => {
            if (e.target.id === 'instructionsModal') {
                document.getElementById('instructionsModal').classList.remove('active');
                returnFromInstructions();
            }
        });

        // Escape closes whatever is on top. The codex handles its own (it
        // also swallows the arrow keys while it is open), so it is absent
        // here; the initials prompt and the game-over screen are deliberately
        // absent too, since neither is something to dismiss.
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            const close = (id, fn) => {
                const el = document.getElementById(id);
                if (!el || !el.classList.contains('active')) return false;
                fn();
                return true;
            };
            close('creditsModal', closeCreditsModal)
                || close('instructionsModal', closeInstructionsModal)
                || close('settingsModal', () => document.getElementById('closeSettings').click())
                || close('scoreboardModal', () => document.getElementById('closeScoreboard').click())
                || close('difficultyModal', () => {
                    const back = document.getElementById('difficultyBack');
                    if (back) back.click();
                });
        });

        // The menu, from a finished game. Through showLore with no `from`,
        // because there is no board to go back to: the card's button should
        // offer mode selection here, and the same button offers the board back
        // when "menu" opened it mid-game.
        const gameOverMenu = document.getElementById('gameOverMenu');
        if (gameOverMenu) {
            gameOverMenu.addEventListener('click', () => {
                document.getElementById('gameOver').classList.remove('active');
                document.getElementById('difficultyModal').classList.remove('active');
                showLore();
            });
        }

        // Settings modal controls
        document.getElementById('toggleSettings').addEventListener('click', () => {
            document.getElementById('settingsModal').classList.add('active');
        });

        document.getElementById('closeSettings').addEventListener('click', () => {
            document.getElementById('settingsModal').classList.remove('active');
            document.getElementById('settingsModal').classList.remove('menu-mode');
            
            // If we came from lore screen, go back to it
            if (returnToLoreScreen) {
                loreScreen.classList.add('active');
                returnToLoreScreen = false;
            }
        });

        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') {
                document.getElementById('settingsModal').classList.remove('active');
                document.getElementById('settingsModal').classList.remove('menu-mode');
                
                // If we came from lore screen, go back to it
                if (returnToLoreScreen) {
                    loreScreen.classList.add('active');
                    returnToLoreScreen = false;
                }
            }
        });

        // Settings links to other modals
        // The codex, not the rules: "full rules" is already one tap away on
        // the board behind this modal, and the codex was reachable only by
        // tapping a gate symbol in the rules strip, which nothing announces.
        const loreCredits = document.getElementById('loreCredits');
        if (loreCredits) {
            loreCredits.addEventListener('click', () => {
                loreScreen.classList.remove('active');
                returnToLoreScreen = true;
                document.getElementById('creditsModal').classList.add('active');
            });
        }

        // In-game credits, from the strip on a phone and the side panel on a
        // desktop. Both open the modal directly and leave returnToLoreScreen
        // alone: closing it should put the player back on the board they were
        // playing, not on a card whose continue button starts a new game.
        ['stripCreditsLink', 'sidePanelCredits'].forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('click', () => {
                document.getElementById('creditsModal').classList.add('active');
            });
        });

        // The same link on the desktop side panel, and the same reasoning.
        const sidePanelHowToPlay = document.getElementById('sidePanelHowToPlay');
        if (sidePanelHowToPlay) {
            sidePanelHowToPlay.addEventListener('click', () => openInstructions('goal'));
        }

        // Music toggle
        document.getElementById('musicToggle').addEventListener('click', function() {
            const muted = AdAudio.toggleMusicMute();
            this.classList.toggle('active', !muted);
            this.querySelector('.toggle-status').textContent = muted ? 'OFF' : 'ON';
            
            if (!muted) {
                AdAudio.setMusicMuted(false, 0);
            } else {
                AdAudio.setMusicMuted(true, 1);
            }
        });

        // SFX toggle
        document.getElementById('sfxToggle').addEventListener('click', function() {
            const muted = AdAudio.toggleSfxMute();
            this.classList.toggle('active', !muted);
            this.querySelector('.toggle-status').textContent = muted ? 'OFF' : 'ON';
            
            // Play a test sound when enabling
            if (!muted) {
                AdAudio.playSfx('spawn');
            }
        });

        // Both of these are remembered, as "show the math" already was. Three
        // switches in one group, two of which forgot on reload, is the kind of
        // thing a player reads as the setting not working.
        const setToggle = (button, on) => {
            button.classList.toggle('active', on);
            button.querySelector('.toggle-status').textContent = on ? 'ON' : 'OFF';
        };

        // Binary display toggle
        const binaryToggle = document.getElementById('binaryToggle');
        if (binaryToggle) {
            binaryDisplayMode = readSetting('gb_binary', true);
            setToggle(binaryToggle, binaryDisplayMode);

            binaryToggle.addEventListener('click', function() {
                binaryDisplayMode = !binaryDisplayMode;
                setToggle(this, binaryDisplayMode);
                writeSetting('gb_binary', binaryDisplayMode);
                
                // Re-render the game board if game is active
                if (currentGame) {
                    currentGame.render();
                }
            });
        }

        // Performance mode toggle
        const performanceToggle = document.getElementById('performanceToggle');
        if (performanceToggle) {
            const performanceOn = readSetting('gb_performance', false);
            document.body.classList.toggle('performance-mode', performanceOn);
            setToggle(performanceToggle, performanceOn);

            performanceToggle.addEventListener('click', function() {
                const on = document.body.classList.toggle('performance-mode');
                setToggle(this, on);
                writeSetting('gb_performance', on);
            });
        }

        // Credits modal controls. Opened from the rules screen, which sits
        // above this modal in the stack and so is hidden while it is up;
        // every way out puts it back.
        const closeCreditsModal = () => {
            document.getElementById('creditsModal').classList.remove('active');
            returnFromInstructions();
        };

        document.getElementById('closeCredits').addEventListener('click', closeCreditsModal);

        document.getElementById('creditsModal').addEventListener('click', (e) => {
            if (e.target.id === 'creditsModal') closeCreditsModal();
        });
    } catch (error) {
        console.error('Error initializing game:', error);
        document.getElementById('loadingScreen').classList.add('hidden');
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    AdAudio.destroy();
});
