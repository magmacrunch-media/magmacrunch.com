// iOS has no Ogg Vorbis decoder, and every browser on iOS is WebKit, so Chrome
// and Firefox there fail exactly as Safari does. An ogg-only page is not quieter
// on an iPhone, it is silent - and silent without an error. Every track in
// music/jukebox/songs/ exists as both .ogg and .mp3; pick the one this browser
// can decode. See AGENTS.md, "Audio needs two formats".
var AUDIO_EXT = document.createElement('audio')
    .canPlayType('audio/ogg; codecs="vorbis"') ? '.ogg' : '.mp3';
var audioSrc = function (path) { return path.replace(/\.ogg$/, AUDIO_EXT); };

/* ═══════════════════════════════════════════════
   magmacrunch media — retro jukebox mini-player
   assets/jukebox.js
   ═══════════════════════════════════════════════ */

(function () {
    'use strict';

    /* ── TRACK LIST ── */
    const TRACKS = [
        { title: "Reverse Osmosis Reversed", artist: "Juanito Thompson", file: "music/jukebox/songs/Juanito Thompson - That Definitely Did Destroy Me - 01 Reverse Osmosis Reversed.ogg", duration: "4:51" },
        { title: "Heavy Water", artist: "The Four B's", file: "music/jukebox/songs/The Four B's - Greatest Hits '12-'14 - 08 Heavy Water.ogg", duration: "5:03" },
        { title: "Somewhere", artist: "C.P. Rutledge", file: "music/jukebox/songs/C.P. Rutledge - Somewhere.ogg", duration: "4:15" },
        { title: "Birds", artist: "Texas Hold'Em Lava Dome", file: "music/jukebox/songs/Texas Hold'Em Lava Dome - Birds - 01 Birds.ogg", duration: "4:47" },
        { title: "A January Gathering", artist: "Bears Crossing", file: "music/jukebox/songs/Bears Crossing - A January Gathering.ogg", duration: "2:34" },
        { title: "Neopolitan Mood", artist: "James R. McCoy", file: "music/jukebox/songs/James R. McCoy - Neopolitan Mood.ogg", duration: "3:16" },
        { title: "makemecookies! x4.", artist: "Jimmi", file: "music/jukebox/songs/Jimmi - JIMMI - 07 makemecookies! x4.ogg", duration: "0:51" },
        { title: "Millstone Woods May 2018", artist: "Dag Henderson", file: "music/jukebox/songs/Dag Henderson - Millstone Woods May 2018.ogg", duration: "3:38" },
        { title: "The End", artist: "Jon McCoy", file: "music/jukebox/songs/Jon McCoy - The End.ogg", duration: "3:26" },
        { title: "Qikiqtarjuaq", artist: "Juanito Thompson", file: "music/jukebox/songs/Juanito Thompson - It's Twenty-Fourteen - 01 Qikiqtarjuaq.ogg", duration: "6:20" },
        { title: "Everything is falling all together, all at once, even the universe", artist: "The Four B's", file: "music/jukebox/songs/The Four B's - Greatest Hits '12-'14 - 05 Everything is falling all together, all at once, even the universe.ogg", duration: "4:28" }
    ];

    const STORAGE_KEY = 'mc-jukebox';
    const EXPANDED_KEY = 'mcj_expanded';

    /* ── STATE ── */
    let audio = null;
    let currentTrack = -1;
    let isPlaying = false;
    let volume = 0.7;
    let muted = false;
    let saveInterval = null;
    let pendingSeek = -1;

    /* ── DOM REFS ── */
    let widgetEl = null;
    let expandedPlayBtn = null;
    let expandedMuteBtn = null;
    let expandedTitle = null;
    let expandedArtist = null;
    let expandedTime = null;
    let progressWrap = null;
    let progressFill = null;
    let volSlider = null;
    let volLabel = null;
    let navReadout = null;

    /* ── HELPERS ── */
    function fmtTime(s) {
        if (!s || isNaN(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return m + ':' + String(sec).padStart(2, '0');
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                track: currentTrack,
                time: audio ? audio.currentTime : 0,
                playing: isPlaying,
                volume: volume,
                muted: muted
            }));
        } catch (e) { /* localStorage unavailable */ }
    }

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    /* ── PLAYBACK ── */
    function playTrack(index, seekTo) {
        if (index < 0 || index >= TRACKS.length) return;
        currentTrack = index;
        const track = TRACKS[index];

        if (!audio) {
            audio = new Audio();
            audio.preload = 'auto';
            audio.addEventListener('ended', onTrackEnd);
            audio.addEventListener('play', () => { isPlaying = true; updateUI(); saveState(); startSaveInterval(); });
            audio.addEventListener('pause', () => { isPlaying = false; updateUI(); saveState(); stopSaveInterval(); });
            audio.addEventListener('error', () => {
                if (audio.error && audio.error.code !== MediaError.MEDIA_ERR_ABORTED) {
                    isPlaying = false;
                    updateUI();
                    stopSaveInterval();
                }
            });
            audio.addEventListener('timeupdate', updateProgress);
        }

        pendingSeek = (typeof seekTo === 'number' && seekTo > 0) ? seekTo : -1;

        audio.src = audioSrc(new URL(track.file, location.origin).pathname);
        audio.volume = muted ? 0 : volume;

        if (pendingSeek >= 0) {
            audio.addEventListener('loadedmetadata', function onMeta() {
                audio.removeEventListener('loadedmetadata', onMeta);
                if (pendingSeek >= 0 && pendingSeek < audio.duration) {
                    audio.currentTime = pendingSeek;
                }
                pendingSeek = -1;
                audio.play().catch(() => {});
            }, { once: true });
        } else {
            audio.play().catch(() => {});
        }

        updateMediaSession();
        updateUI();
    }

    function togglePlay() {
        if (!audio || currentTrack < 0) {
            playTrack(0);
            return;
        }
        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch(() => {});
        }
    }

    function nextTrack() {
        if (currentTrack < 0) {
            playTrack(0);
        } else {
            playTrack((currentTrack + 1) % TRACKS.length);
        }
    }

    function prevTrack() {
        if (currentTrack < 0) {
            playTrack(TRACKS.length - 1);
        } else {
            playTrack((currentTrack - 1 + TRACKS.length) % TRACKS.length);
        }
    }

    /* ── PROGRESS BAR ── */
    function updateProgress() {
        if (!progressFill || !audio || !audio.duration) return;
        const pct = (audio.currentTime / audio.duration) * 100;
        progressFill.style.setProperty('--progress', pct + '%');
        if (expandedTime) {
            expandedTime.textContent = fmtTime(audio.currentTime) + ' / ' + fmtTime(audio.duration);
        }
    }

    function seekTo(e) {
        if (!audio || !audio.duration || !progressWrap) return;
        const rect = progressWrap.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        audio.currentTime = pct * audio.duration;
        updateProgress();
    }

    /* ── PERIODIC STATE SAVE ── */
    function startSaveInterval() {
        stopSaveInterval();
        saveInterval = setInterval(saveState, 1000);
    }

    function stopSaveInterval() {
        if (saveInterval) { clearInterval(saveInterval); saveInterval = null; }
    }

    function setVolume(v) {
        volume = Math.max(0, Math.min(1, v));
        muted = false;
        if (audio) audio.volume = volume;
        updateUI();
        saveState();
    }

    function toggleMute() {
        muted = !muted;
        if (audio) audio.volume = muted ? 0 : volume;
        updateUI();
        saveState();
    }

    /* ── EXPAND / COLLAPSE ── */
    function toggleExpand() {
        if (!widgetEl) return;
        const expanding = widgetEl.classList.contains('minimized');
        widgetEl.classList.toggle('minimized', !expanding);
        widgetEl.classList.toggle('expanded', expanding);
        const bar = widgetEl.querySelector('.mcj-bar');
        if (bar) bar.setAttribute('aria-expanded', expanding ? 'true' : 'false');
        try { localStorage.setItem(EXPANDED_KEY, expanding ? 'true' : 'false'); } catch (e) {}
    }

    /* ── UI UPDATE ── */
    function onTrackEnd() {
        nextTrack();
    }

    function updateMediaSession() {
        if (!('mediaSession' in navigator)) return;
        const track = currentTrack >= 0 ? TRACKS[currentTrack] : null;
        if (track) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: track.title,
                artist: track.artist,
                album: 'magmacrunch media',
                artwork: [
                    // 512, not the 180 this declared before the file existed at
                    // all: MediaSession artwork lands on a phone lock screen,
                    // where 180 is visibly soft. The mark has an alpha channel
                    // and JPEG has none, so it is flattened onto the site
                    // background (--black) rather than onto whatever the
                    // encoder defaults to.
                    { src: new URL('assets/logo.jpg', location.origin).pathname, sizes: '512x512', type: 'image/jpeg' }
                ]
            });
        }
    }

    /* ── NOW-PLAYING READOUT (in the nav) ──
       The centre of the nav is dead space: at 1440px the brand ends at x=159
       and the links begin at x=932. A line of text there says what the site is
       doing in the site's own masthead, which a pill in the bottom corner
       cannot - that corner is where support bubbles and cookie banners live,
       and people have learned to skip it.

       Only while something is playing. Silent, the bar is exactly as it was,
       so a first visit gets no extra furniture. It is a flex child rather than
       absolutely centred so it takes the gap that is actually there and
       truncates instead of colliding with the links on a narrow window.

       The SPA router swaps only main.innerHTML, so the nav survives a
       navigation and this needs no re-injection. Creation is still idempotent,
       because createWidget is re-entered by __initJukeboxPlayer. ── */
    function createNavReadout() {
        const nav = document.querySelector('nav');
        if (!nav) return null;
        const existing = nav.querySelector('.mcj-now');
        if (existing) return existing;

        const el = document.createElement('button');
        el.className = 'mcj-now';
        el.type = 'button';
        el.hidden = true;
        el.addEventListener('click', () => {
            if (widgetEl && widgetEl.classList.contains('minimized')) toggleExpand();
        });

        // Before the links, so flex order puts it in the gap rather than past
        // them. insertBefore with a null reference appends, which is the right
        // fallback for a nav built without a .nav-links list.
        nav.insertBefore(el, nav.querySelector('.nav-links'));
        return el;
    }

    function updateNavReadout(track) {
        if (!navReadout) return;
        const show = !!track && isPlaying;
        navReadout.hidden = !show;
        if (!show) {
            navReadout.textContent = '';
            navReadout.removeAttribute('title');
            navReadout.removeAttribute('aria-label');
            return;
        }
        // '//' rather than a dash: it is the separator the rest of the site
        // sets its headings in, and it survives a monospace pixel font.
        const line = '♪ ' + track.title + ' // ' + track.artist;
        if (navReadout.textContent !== line) {
            navReadout.textContent = line;
            navReadout.title = line;
            navReadout.setAttribute('aria-label', 'now playing: ' + track.title +
                ' by ' + track.artist + '. Open the jukebox mini-player.');
        }
    }

    function updateUI() {
        if (!widgetEl) return;
        const track = currentTrack >= 0 ? TRACKS[currentTrack] : null;

        updateNavReadout(track);

        // Playing state on root element (drives vinyl spin)
        widgetEl.classList.toggle('playing', isPlaying);

        // Expanded play button
        if (expandedPlayBtn) {
            expandedPlayBtn.textContent = isPlaying ? '\u275A\u275A' : '\u25B6';
            expandedPlayBtn.setAttribute('aria-label', isPlaying ? 'pause' : 'play');
        }

        // Expanded title / artist
        if (expandedTitle) {
            expandedTitle.textContent = track ? track.title : '—';
        }
        if (expandedArtist) {
            expandedArtist.textContent = track ? track.artist : '—';
        }

        // Mute button
        if (expandedMuteBtn) {
            expandedMuteBtn.textContent = muted ? '\u2716' : '\u266A';
            expandedMuteBtn.setAttribute('aria-label', muted ? 'unmute' : 'mute');
            expandedMuteBtn.classList.toggle('muted', muted);
        }

        // Volume slider
        if (volSlider) {
            volSlider.value = volume * 100;
            volSlider.style.setProperty('--vol-pct', (volume * 100) + '%');
            volSlider.classList.toggle('muted', muted);
        }
        if (volLabel) {
            volLabel.textContent = Math.round(volume * 100);
            volLabel.classList.toggle('muted', muted);
        }

        // Progress reset if no track
        if (!track && progressFill) {
            progressFill.style.setProperty('--progress', '0%');
        }
        if (!track && expandedTime) {
            expandedTime.textContent = '0:00 / 0:00';
        }
    }

    /* ── BUILD WIDGET ── */
    function createWidget() {
        if (widgetEl && widgetEl.isConnected) return;
        if (widgetEl && !widgetEl.isConnected) widgetEl = null;
        if (document.body.classList.contains('no-jukebox')) return;

        navReadout = createNavReadout();

        const jukeboxHref = new URL('music/jukebox/', location.origin).pathname;

        widgetEl = document.createElement('div');
        widgetEl.className = 'mcj minimized';
        widgetEl.innerHTML =
            /* ── FLOATING BUTTON ──
               The disc alone says nothing. It carried a label until 79ddd5c4
               stripped the collapsed bar to a bare 48px square, and at that
               size the vinyl reads as a grey circle to anyone who has not been
               told. Restored 2026-09-26. ── */
            '<div class="mcj-bar" role="button" tabindex="0" ' +
                    'aria-label="open the jukebox mini-player" aria-expanded="false">' +
                '<div class="mcj-mini-vinyl"></div>' +
                '<span class="mcj-bar-label">JUKEBOX</span>' +
            '</div>' +
            /* ── EXPANDED HEADER ── */
            '<div class="mcj-header">' +
                '<span>// JUKEBOX //</span>' +
                '<button class="mcj-minimize" aria-label="minimize">\u2014</button>' +
            '</div>' +
            /* ── EXPANDED WINDOW ── */
            '<div class="mcj-window">' +
                '<div class="mcj-expanded-inner">' +
                    '<div class="mcj-vinyl"></div>' +
                    '<div class="mcj-info">' +
                        '<div class="mcj-title">\u2014</div>' +
                        '<div class="mcj-artist">\u2014</div>' +
                        '<div class="mcj-time">0:00 / 0:00</div>' +
                    '</div>' +
                '</div>' +
                '<div class="mcj-progress-wrap">' +
                    '<div class="mcj-progress"><div class="mcj-progress-fill"></div></div>' +
                '</div>' +
                '<div class="mcj-controls">' +
                    '<button class="mcj-btn mcj-btn-skip" aria-label="previous track">\u25C0\u25C0</button>' +
                    '<button class="mcj-btn mcj-btn-play" aria-label="play">\u25B6</button>' +
                    '<button class="mcj-btn mcj-btn-skip" aria-label="next track">\u25B6\u25B6</button>' +
                    '<div class="mcj-vol-wrap">' +
                        '<button class="mcj-btn mcj-mute" aria-label="mute">\u266A</button>' +
                        '<input type="range" class="mcj-vol" min="0" max="100" value="70" aria-label="volume">' +
                        '<span class="mcj-vol-label">70</span>' +
                    '</div>' +
                '</div>' +
                '<div class="mcj-link"><a href="' + jukeboxHref + '">OPEN JUKEBOX \u2192</a></div>' +
            '</div>';

        document.body.appendChild(widgetEl);

        /* ── CACHE REFS ── */
        expandedPlayBtn = widgetEl.querySelector('.mcj-btn-play');
        expandedMuteBtn = widgetEl.querySelector('.mcj-mute');
        expandedTitle = widgetEl.querySelector('.mcj-title');
        expandedArtist = widgetEl.querySelector('.mcj-artist');
        expandedTime = widgetEl.querySelector('.mcj-time');
        progressWrap = widgetEl.querySelector('.mcj-progress');
        progressFill = widgetEl.querySelector('.mcj-progress-fill');
        volSlider = widgetEl.querySelector('.mcj-vol');
        volLabel = widgetEl.querySelector('.mcj-vol-label');

        /* ── EVENT LISTENERS ── */

        // Bar click → expand/collapse. It is a role="button", so it owes the
        // keyboard the activation a real <button> would have given for free.
        const barEl = widgetEl.querySelector('.mcj-bar');
        barEl.addEventListener('click', toggleExpand);
        barEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                toggleExpand();
            }
        });

        // Minimize button → collapse
        widgetEl.querySelector('.mcj-minimize').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleExpand();
        });

        // Expanded transport
        expandedPlayBtn.addEventListener('click', togglePlay);
        widgetEl.querySelector('.mcj-btn-skip[aria-label="previous track"]').addEventListener('click', prevTrack);
        widgetEl.querySelector('.mcj-btn-skip[aria-label="next track"]').addEventListener('click', nextTrack);
        expandedMuteBtn.addEventListener('click', toggleMute);

        // Volume
        volSlider.addEventListener('input', (e) => {
            setVolume(parseInt(e.target.value) / 100);
        });

        // Progress seek
        progressWrap.addEventListener('click', seekTo);

        // Media Session API
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => { if (!isPlaying) togglePlay(); });
            navigator.mediaSession.setActionHandler('pause', () => { if (isPlaying) togglePlay(); });
            navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
            navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
        }

        /* No __pageCleanup here, deliberately. This used to register one that
           paused the audio, and it was wrong twice over.

           It paused the thing the widget exists to keep playing. __pageCleanup
           is the SPA router's "this page is going away" hook, for resources
           scoped to a page: rAF loops, poll intervals, observers. The jukebox
           is the one thing on the site that is scoped to the SESSION, so it
           has no business in that hook. Every SPA navigation stopped the
           music, which is the entire feature.

           And it is a single global slot, not a list, so claiming it
           unconditionally clobbered whatever the page had put there. jukebox.js
           is injected by nav.js on requestIdleCallback, so it always ran last
           and always won. index.html says so in its own comment and carries a
           gone() guard to survive it, which is a workaround for this line.

           Real unloads are already covered by the beforeunload handler below,
           and the save interval keeps running because playback does. */

        /* ── RESTORE STATE ── */
        // Expand/collapse preference
        try {
            if (localStorage.getItem(EXPANDED_KEY) === 'true') {
                widgetEl.classList.remove('minimized');
                widgetEl.classList.add('expanded');
                const bar = widgetEl.querySelector('.mcj-bar');
                if (bar) bar.setAttribute('aria-expanded', 'true');
            }
        } catch (e) {}

        // Playback state
        const state = loadState();
        if (state) {
            volume = state.volume != null ? state.volume : 0.7;
            muted = state.muted || false;
            if (state.track >= 0 && state.track < TRACKS.length) {
                currentTrack = state.track;
                if (state.playing) {
                    playTrack(currentTrack, state.time || 0);
                }
            }
        }

        updateUI();
    }

    /* ── KEYBOARD SHORTCUTS (one-time) ──
       Only while the panel is open. These keys belong to the page before they
       belong to the jukebox: Space pages down and the arrows scroll. This
       handler is installed at script load rather than from createWidget, so
       until 2026-09-26 it swallowed all five on every page that loads nav.js,
       whether or not the widget had ever been opened - keyboard scrolling was
       dead site-wide to serve a player most visitors never touch. Expanded is
       the one unambiguous "I am using the player" signal, and it is also when
       the controls are on screen to explain what the keys did. Collapsed, the
       OS media keys and MediaSession still work.

       Modifier chords are the page's too: Ctrl/Alt/Cmd + arrow is a browser or
       OS shortcut, never a volume change. ── */
    if (!window.__mcJukeboxKeys) {
        window.__mcJukeboxKeys = true;
        window.addEventListener('keydown', (e) => {
            if (!widgetEl || !widgetEl.classList.contains('expanded')) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const el = document.activeElement;
            const tag = el && el.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            if (el && el.isContentEditable) return;
            if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); togglePlay(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); prevTrack(); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); nextTrack(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setVolume(volume + 0.05); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); setVolume(volume - 0.05); }
            else if (e.key === 'm' || e.key === 'M') { toggleMute(); }
        });
    }

    /* ── SAVE STATE BEFORE UNLOAD (one-time) ── */
    if (!window.__mcJukeboxUnload) {
        window.__mcJukeboxUnload = true;
        window.addEventListener('beforeunload', () => {
            stopSaveInterval();
            if (audio && isPlaying) {
                saveState();
            }
        });
    }

    /* ── INIT ── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createWidget);
    } else {
        createWidget();
    }

    /* ── EXPOSE FOR SPA ROUTER ── */
    window.__initJukeboxPlayer = createWidget;
})();
