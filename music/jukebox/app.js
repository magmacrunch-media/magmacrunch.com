(function () {
  'use strict';

  /* ── STATE ── */
  var JUKEBOX_SONGS = [];
  var currentIdx = 0;
  var isPlaying = false;
  var playingIdx = -1;
  var songQueue = [];
  var currentPage = 1;
  var SONGS_PER_PAGE = 4;
  var totalPages = 0;
  var MC_STORAGE_KEY = 'mc-jukebox';
  var mcSaveInterval = null;

  /* ── DOM REFS ── */
  var player = document.getElementById('audioPlayer');
  var npTitle = document.getElementById('npTitle');
  var npArtist = document.getElementById('npArtist');
  var npElapsed = document.getElementById('npElapsed');
  var npDuration = document.getElementById('npDuration');
  var playBtn = document.getElementById('playBtn');
  var stopBtn = document.getElementById('stopBtn');
  var playingIndicator = document.getElementById('playingIndicator');
  var neonLights = document.getElementById('neonLights');
  var songListInner = document.getElementById('songListInner');
  var slPage = document.getElementById('slPage');
  var prevPageBtn = document.getElementById('prevPageBtn');
  var nextPageBtn = document.getElementById('nextPageBtn');
  var queueList = document.getElementById('queueList');

  /* ── FETCH SONG DATA ── */
  fetch('songs.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      JUKEBOX_SONGS = data.filter(function (s) { return !s.hidden; });
      totalPages = Math.ceil(JUKEBOX_SONGS.length / SONGS_PER_PAGE);
      init();
    })
    .catch(function () {
      JUKEBOX_SONGS = [];
      totalPages = 0;
      init();
    });

  function init() {
    restoreState();
    renderNowPlaying();
    renderSongList();
    renderQueue();
    bindEvents();
  }

  /* ── RESTORE STATE FROM MINI-PLAYER ── */
  function restoreState() {
    try {
      var saved = JSON.parse(localStorage.getItem(MC_STORAGE_KEY));
      if (!saved) return;
      if (saved.volume != null && player) player.volume = saved.volume;
      if (saved.track >= 0 && saved.track < JUKEBOX_SONGS.length) {
        currentIdx = saved.track;
        playingIdx = saved.track;
        renderNowPlaying();
        renderSongList();
        if (saved.muted) player.volume = 0;
        if (saved.playing) {
          if (saved.time > 0) {
            player.addEventListener('loadedmetadata', function onMeta() {
              player.removeEventListener('loadedmetadata', onMeta);
              if (saved.time > 0 && saved.time < player.duration) {
                player.currentTime = saved.time;
              }
              npElapsed.textContent = fmtTime(player.currentTime);
              var song = JUKEBOX_SONGS[saved.track];
              npDuration.textContent = song.duration || fmtTime(player.duration);
              player.play().catch(function () {});
              setPlayingState(true);
              syncToMiniPlayer();
              startMcSaveInterval();
              updateMediaSession();
            }, { once: true });
            player.src = new URL('songs/' + JUKEBOX_SONGS[saved.track].file, location.origin).pathname;
            player.load();
          } else {
            player.src = new URL('songs/' + JUKEBOX_SONGS[saved.track].file, location.origin).pathname;
            player.play().catch(function () {});
            setPlayingState(true);
            syncToMiniPlayer();
            startMcSaveInterval();
            updateMediaSession();
          }
        } else {
          player.src = new URL('songs/' + JUKEBOX_SONGS[saved.track].file, location.origin).pathname;
        }
      }
    } catch (e) {}
  }

  /* ── SYNC WITH MINI-PLAYER ── */
  function syncToMiniPlayer() {
    try {
      var prevMuted = false;
      try {
        var prev = JSON.parse(localStorage.getItem(MC_STORAGE_KEY));
        if (prev && typeof prev.muted === 'boolean') prevMuted = prev.muted;
      } catch (e) {}
      localStorage.setItem(MC_STORAGE_KEY, JSON.stringify({
        track: playingIdx,
        time: player ? player.currentTime : 0,
        playing: isPlaying,
        volume: player ? player.volume : 0.7,
        muted: prevMuted
      }));
    } catch (e) {}
  }

  function startMcSaveInterval() {
    stopMcSaveInterval();
    mcSaveInterval = setInterval(syncToMiniPlayer, 1000);
  }

  function stopMcSaveInterval() {
    if (mcSaveInterval) { clearInterval(mcSaveInterval); mcSaveInterval = null; }
  }

  window.addEventListener('beforeunload', function () {
    stopMcSaveInterval();
    syncToMiniPlayer();
  });

  /* ── HELPERS ── */
  function fmtTime(s) {
    if (!s || isNaN(s)) return '0:00';
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + String(sec).padStart(2, '0');
  }

  /* ── RENDER ── */
  function renderSongList() {
    var start = (currentPage - 1) * SONGS_PER_PAGE;
    var end = Math.min(start + SONGS_PER_PAGE, JUKEBOX_SONGS.length);
    slPage.textContent = currentPage + '/' + totalPages;
    songListInner.innerHTML = '';
    for (var i = start; i < end; i++) {
      var song = JUKEBOX_SONGS[i];
      var div = document.createElement('div');
      div.className = 'song-item' + (i === playingIdx ? ' playing' : '') + (i === currentIdx ? ' selected' : '');
      div.innerHTML =
        '<span class="song-num">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<div class="song-info">' +
          '<div class="song-title">' + song.title + '</div>' +
          '<div class="song-artist">' + song.artist + '</div>' +
        '</div>' +
        '<div class="song-btns">' +
          '<button class="song-btn play" data-action="play" data-idx="' + i + '">&#9654;</button>' +
          '<button class="song-btn queue" data-action="queue" data-idx="' + i + '">+</button>' +
        '</div>';
      songListInner.appendChild(div);
    }
  }

  function renderNowPlaying() {
    if (playingIdx >= 0) {
      var song = JUKEBOX_SONGS[playingIdx];
      npTitle.textContent = song.title;
      npArtist.textContent = song.artist;
      npDuration.textContent = song.duration || fmtTime(player.duration);
      npElapsed.textContent = fmtTime(player.currentTime);
    } else {
      npTitle.textContent = '\u2014 select a song \u2014';
      npArtist.textContent = '';
      npDuration.textContent = '0:00';
      npElapsed.textContent = '0:00';
    }
  }

  function renderQueue() {
    if (songQueue.length === 0) {
      queueList.innerHTML = '<div class="queue-empty">queue empty</div>';
    } else {
      queueList.innerHTML = songQueue.map(function (idx, i) {
        var song = JUKEBOX_SONGS[idx];
        return '<div class="queue-item">' +
          '<span>' + (i + 1) + '. ' + song.title + ' \u2014 ' + song.artist + '</span>' +
          '<span class="queue-remove" data-action="dequeue" data-idx="' + i + '">\u2715</span>' +
        '</div>';
      }).join('');
    }
  }

  /* ── PLAYER ACTIONS ── */
  function setPlayingState(playing) {
    isPlaying = playing;
    if (playing) {
      playBtn.textContent = 'PAUSE';
      playBtn.classList.add('playing');
      playingIndicator.classList.add('active');
      neonLights.classList.add('active');
    } else {
      playBtn.textContent = 'PLAY';
      playBtn.classList.remove('playing');
      playingIndicator.classList.remove('active');
      neonLights.classList.remove('active');
    }
  }

  function playSong(index) {
    currentIdx = index;
    playingIdx = index;
    var song = JUKEBOX_SONGS[index];
    renderNowPlaying();
    renderSongList();
    player.src = new URL('songs/' + song.file, location.origin).pathname;
    player.play().catch(function () {});
    setPlayingState(true);
    syncToMiniPlayer();
    startMcSaveInterval();
    updateMediaSession();
  }

  function togglePlay() {
    if (isPlaying) {
      player.pause();
      setPlayingState(false);
      stopMcSaveInterval();
    } else if (player.src) {
      player.play().catch(function () {});
      setPlayingState(true);
      startMcSaveInterval();
    } else if (JUKEBOX_SONGS.length > 0) {
      playSong(currentIdx);
    }
    syncToMiniPlayer();
  }

  function stopSong() {
    player.pause();
    player.currentTime = 0;
    player.src = '';
    playingIdx = -1;
    songQueue = [];
    setPlayingState(false);
    stopMcSaveInterval();
    syncToMiniPlayer();
    renderNowPlaying();
    renderSongList();
  }

  function nextSong() {
    if (songQueue.length > 0) {
      var nextIdx = songQueue.shift();
      renderQueue();
      playSong(nextIdx);
    } else if (playingIdx >= 0 && playingIdx < JUKEBOX_SONGS.length - 1) {
      playSong(playingIdx + 1);
    } else if (JUKEBOX_SONGS.length > 0) {
      playSong(0);
    }
  }

  function prevSong() {
    if (playingIdx > 0) {
      playSong(playingIdx - 1);
    } else if (JUKEBOX_SONGS.length > 0) {
      playSong(JUKEBOX_SONGS.length - 1);
    }
  }

  function updateMediaSession() {
    if (!('mediaSession' in navigator)) return;
    var song = playingIdx >= 0 ? JUKEBOX_SONGS[playingIdx] : null;
    if (song) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        album: 'magmacrunch media',
        artwork: [
          { src: '../../assets/logo.jpg', sizes: '180x180', type: 'image/jpeg' }
        ]
      });
    }
  }

  /* ── EVENT BINDING ── */
  function bindEvents() {
    player.addEventListener('timeupdate', function () {
      npElapsed.textContent = fmtTime(player.currentTime);
    });

    player.addEventListener('loadedmetadata', function () {
      var song = JUKEBOX_SONGS[playingIdx];
      npDuration.textContent = song && song.duration || fmtTime(player.duration);
    });

    player.addEventListener('ended', function () {
      if (songQueue.length > 0 || (playingIdx >= 0 && playingIdx < JUKEBOX_SONGS.length - 1)) {
        nextSong();
      } else {
        setPlayingState(false);
        stopMcSaveInterval();
        syncToMiniPlayer();
      }
    });

    player.addEventListener('error', function () {
      if (player.error && player.error.code !== MediaError.MEDIA_ERR_ABORTED) {
        npTitle.textContent = '\u2014 playback error \u2014';
        setPlayingState(false);
        stopMcSaveInterval();
      }
    });

    player.addEventListener('play', function () {
      setPlayingState(true);
      startMcSaveInterval();
      syncToMiniPlayer();
    });

    playBtn.addEventListener('click', togglePlay);
    stopBtn.addEventListener('click', stopSong);

    prevPageBtn.addEventListener('click', function () {
      if (currentPage > 1) { currentPage--; renderSongList(); }
    });

    nextPageBtn.addEventListener('click', function () {
      if (currentPage < totalPages) { currentPage++; renderSongList(); }
    });

    /* delegated clicks for song list buttons */
    songListInner.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var idx = parseInt(btn.dataset.idx, 10);
      if (btn.dataset.action === 'play') playSong(idx);
      else if (btn.dataset.action === 'queue') { songQueue.push(idx); renderQueue(); }
    });

    /* delegated clicks for queue remove */
    queueList.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action="dequeue"]');
      if (!btn) return;
      var idx = parseInt(btn.dataset.idx, 10);
      songQueue.splice(idx, 1);
      renderQueue();
    });

    /* media session */
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', function () { if (!isPlaying) togglePlay(); });
      navigator.mediaSession.setActionHandler('pause', function () { if (isPlaying) togglePlay(); });
      navigator.mediaSession.setActionHandler('previoustrack', prevSong);
      navigator.mediaSession.setActionHandler('nexttrack', nextSong);
    }

    /* keyboard shortcuts */
    window.addEventListener('keydown', function (e) {
      var tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prevSong(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); nextSong(); }
      else if (e.key === 'Escape') { stopSong(); }
    });
  }

  /* ── CLEANUP ── */
  window.__pageCleanup = function () {
    stopMcSaveInterval();
    syncToMiniPlayer();
    if (player) { player.pause(); player.src = ''; }
    playingIdx = -1;
    isPlaying = false;
    songQueue = [];
  };
})();
