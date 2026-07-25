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

        audio.src = new URL(track.file, location.origin).pathname;
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
                    { src: new URL('assets/logo.jpg', location.origin).pathname, sizes: '180x180', type: 'image/jpeg' }
                ]
            });
        }
    }

    function updateUI() {
        if (!widgetEl) return;
        const track = currentTrack >= 0 ? TRACKS[currentTrack] : null;

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

        const jukeboxHref = new URL('music/jukebox/index.html', location.origin).pathname;

        widgetEl = document.createElement('div');
        widgetEl.className = 'mcj minimized';
        widgetEl.innerHTML =
            /* ── FLOATING BUTTON ── */
            '<div class="mcj-bar">' +
                '<div class="mcj-mini-vinyl"></div>' +
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

        // Bar click → expand/collapse
        widgetEl.querySelector('.mcj-bar').addEventListener('click', toggleExpand);

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

        // SPA cleanup — save state and pause audio before page navigation
        window.__pageCleanup = function() {
            stopSaveInterval();
            if (audio && isPlaying) {
                saveState();
                audio.pause();
            }
        };

        /* ── RESTORE STATE ── */
        // Expand/collapse preference
        try {
            if (localStorage.getItem(EXPANDED_KEY) === 'true') {
                widgetEl.classList.remove('minimized');
                widgetEl.classList.add('expanded');
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

    /* ── KEYBOARD SHORTCUTS (one-time) ── */
    if (!window.__mcJukeboxKeys) {
        window.__mcJukeboxKeys = true;
        window.addEventListener('keydown', (e) => {
            const tag = document.activeElement && document.activeElement.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
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
