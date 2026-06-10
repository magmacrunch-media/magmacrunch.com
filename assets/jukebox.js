/* ═══════════════════════════════════════════════
   magmacrunch media — persistent jukebox player
   assets/jukebox.js
   ═══════════════════════════════════════════════ */

(function () {
    'use strict';

    /* ── TRACK LIST ──
       Add new tracks here. Paths are relative to site root. */
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

    /* ── STATE ── */
    let audio = null;
    let currentTrack = -1;
    let isPlaying = false;
    let volume = 0.7;
    let muted = false;
    let saveInterval = null;
    let pendingSeek = -1;

    /* ── DOM REFS ── */
    let playBtn = null;
    let muteBtn = null;
    let trackText = null;
    let trackLink = null;
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

    /* ── SCROLL CALCULATION ── */
    function updateScroll() {
        if (!trackText || !trackLink) return;
        const textW = trackText.scrollWidth;
        const containerW = trackLink.clientWidth;
        if (textW > containerW) {
            const dist = containerW - textW;
            trackText.style.setProperty('--scroll-dist', dist + 'px');
            trackText.classList.add('scroll');
        } else {
            trackText.classList.remove('scroll');
        }
    }

    /* ── PLAYBACK ── */
    function playTrack(index, seekTo) {
        if (index < 0 || index >= TRACKS.length) return;
        currentTrack = index;
        const track = TRACKS[index];

        if (!audio) {
            audio = new Audio();
            audio.addEventListener('ended', onTrackEnd);
            audio.addEventListener('play', () => { isPlaying = true; updateUI(); saveState(); startSaveInterval(); });
            audio.addEventListener('pause', () => { isPlaying = false; updateUI(); saveState(); stopSaveInterval(); });
        }

        // If seeking to a specific position, wait for metadata before seeking
        pendingSeek = (typeof seekTo === 'number' && seekTo > 0) ? seekTo : -1;

        audio.src = track.file;
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

        isPlaying = true;
        updateUI();
        saveState();
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
        if (volSlider) volSlider.style.setProperty('--vol-pct', (volume * 100) + '%');
        updateUI();
        saveState();
    }

    function toggleMute() {
        muted = !muted;
        if (audio) audio.volume = muted ? 0 : volume;
        updateUI();
        saveState();
    }

    /* ── UI UPDATE ── */
    function onTrackEnd() {
        nextTrack();
    }

    function updateUI() {
        if (!playBtn) return;
        const track = currentTrack >= 0 ? TRACKS[currentTrack] : null;

        // Play/pause button
        playBtn.textContent = isPlaying ? '\u275A\u275A' : '\u25B6';
        playBtn.setAttribute('aria-label', isPlaying ? 'pause' : 'play');

        // Track text
        if (trackText && trackLink) {
            if (track) {
                trackText.textContent = track.title + ' \u2014 ' + track.artist;
                trackLink.title = track.title + ' \u2014 ' + track.artist + ' \u2014 click for jukebox';
            } else {
                trackText.textContent = 'select a song on the jukebox \u2192';
                trackLink.title = 'open jukebox';
            }
            // Recalculate scroll after text changes
            requestAnimationFrame(updateScroll);
        }

        // Mute button
        if (muteBtn) {
            muteBtn.textContent = muted ? '\u2716' : '\u266A';
            muteBtn.setAttribute('aria-label', muted ? 'unmute' : 'mute');
            muteBtn.classList.toggle('muted', muted);
        }

        // Volume slider
        if (volSlider) {
            volSlider.value = muted ? 0 : volume;
            volSlider.style.setProperty('--vol-pct', ((muted ? 0 : volume) * 100) + '%');
        }
        if (volLabel) {
            volLabel.textContent = Math.round((muted ? 0 : volume) * 100);
        }

        // Playing indicator on nav
        const nav = document.querySelector('nav');
        if (nav) nav.classList.toggle('nav-playing', isPlaying);
    }

    /* ── INJECT INTO NAV ── */
    function inject() {
        const nav = document.querySelector('nav');
        if (!nav || document.querySelector('.nav-player')) return;

        // Skip on the full jukebox page — it has its own player
        if (window.location.pathname.includes('music/jukebox/')) return;

        // Build player HTML
        const player = document.createElement('div');
        player.className = 'nav-player';
        player.innerHTML =
            '<button class="np-btn np-prev" aria-label="previous track">\u25C0\u25C0</button>' +
            '<button class="np-btn np-play" aria-label="play">\u25B6</button>' +
            '<button class="np-btn np-next" aria-label="next track">\u25B6\u25B6</button>' +
            '<a href="music/jukebox/index.html" class="np-track-link">' +
                '<span class="np-text">select a song on the jukebox \u2192</span>' +
            '</a>' +
            '<div class="np-vol-wrap">' +
                '<input type="range" class="np-vol" min="0" max="100" value="70" aria-label="volume">' +
                '<span class="np-vol-label">70</span>' +
            '</div>' +
            '<button class="np-btn np-mute" aria-label="mute">\u266A</button>';

        // Insert after .nav-brand (first child), before .nav-links
        const brand = nav.querySelector('.nav-brand');
        if (brand && brand.nextSibling) {
            nav.insertBefore(player, brand.nextSibling);
        } else {
            nav.prepend(player);
        }

        // Cache refs
        playBtn = player.querySelector('.np-play');
        muteBtn = player.querySelector('.np-mute');
        trackText = player.querySelector('.np-text');
        trackLink = player.querySelector('.np-track-link');
        volSlider = player.querySelector('.np-vol');
        volLabel = player.querySelector('.np-vol-label');

        // Event listeners
        playBtn.addEventListener('click', togglePlay);
        muteBtn.addEventListener('click', toggleMute);
        player.querySelector('.np-prev').addEventListener('click', prevTrack);
        player.querySelector('.np-next').addEventListener('click', nextTrack);

        // Volume slider
        volSlider.addEventListener('input', (e) => {
            setVolume(parseInt(e.target.value) / 100);
        });

        // Recalculate scroll on resize
        window.addEventListener('resize', () => requestAnimationFrame(updateScroll));

        // Load saved state
        const state = loadState();
        if (state) {
            volume = state.volume != null ? state.volume : 0.7;
            muted = state.muted || false;
            if (state.track >= 0 && state.track < TRACKS.length) {
                currentTrack = state.track;
                const track = TRACKS[currentTrack];
                trackText.textContent = track.title + ' \u2014 ' + track.artist;
                trackLink.title = track.title + ' \u2014 ' + track.artist + ' \u2014 click for jukebox';
                requestAnimationFrame(updateScroll);
                // Auto-play from saved position if was playing
                if (state.playing) {
                    playTrack(currentTrack, state.time || 0);
                }
            }
        }

        updateUI();
    }

    /* ── SAVE STATE BEFORE UNLOAD ── */
    window.addEventListener('beforeunload', () => {
        stopSaveInterval();
        if (audio && isPlaying) {
            saveState();
        }
    });

    /* ── INIT ── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inject);
    } else {
        inject();
    }

    /* ── EXPOSE FOR SPA ROUTER ── */
    window.__initJukeboxPlayer = inject;
})();
