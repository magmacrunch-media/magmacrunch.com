/**
 * jukebox.js — MAGMA//OPS Jukebox tab
 * Song list editor with drag-drop, import/export, server persistence
 */

(function() {
    'use strict';

    // ── Song data ─────────────────────────────────────────────────────────
    //
    // Empty until the server answers `jukebox_load`, which it does on every
    // connect. This was a hardcoded DEFAULT_SONGS array until 2026-09-30, and
    // it had drifted a track behind the manifest, missing "cave diving (not
    // even once)" - so a disconnected tab showed 12 songs that looked exactly
    // like a loaded list, and SAVE wrote them over the 13 on the server.
    //
    // Empty is the honest pre-connect state, and `guardNonEmpty` below is what
    // makes it safe: a tool that has loaded nothing must not be able to save
    // nothing over something.

    let songs = [];
    let dragSrcIndex = null;

    // ── DOM refs ──────────────────────────────────────────────────────────

    const songList = document.getElementById('jb-song-list');
    const trackCount = document.getElementById('jb-track-count');
    const fileInput = document.getElementById('jb-file-input');
    const btnImport = document.getElementById('jb-btn-import');
    const btnExportJson = document.getElementById('jb-btn-export-json');
    const btnSave = document.getElementById('jb-btn-save');
    const btnDeploy = document.getElementById('jb-btn-deploy');
    const btnReset = document.getElementById('jb-btn-reset');
    const btnAdd = document.getElementById('jb-btn-add');

    // ── Render ────────────────────────────────────────────────────────────

    function render() {
        songList.innerHTML = '';
        songs.forEach((song, i) => {
            const card = document.createElement('div');
            card.className = 'song-card' + (song.hidden ? ' hidden' : '');
            card.draggable = true;
            card.dataset.index = i;

            card.innerHTML =
                '<div class="song-number">' + (i + 1) + '</div>' +
                '<div class="drag-handle" title="Drag to reorder">&#9776;</div>' +
                '<input type="text" class="song-field title" value="' + esc(song.title) + '" data-field="title" data-index="' + i + '">' +
                '<input type="text" class="song-field artist" value="' + esc(song.artist) + '" data-field="artist" data-index="' + i + '">' +
                '<input type="text" class="song-field duration" value="' + esc(song.duration) + '" data-field="duration" data-index="' + i + '" placeholder="M:SS">' +
                '<div class="song-actions">' +
                    '<button class="icon-btn visibility' + (song.hidden ? '' : ' visible') + '" data-index="' + i + '" title="' + (song.hidden ? 'Show' : 'Hide') + '">' + (song.hidden ? '&#128065;' : '&#128064;') + '</button>' +
                '</div>' +
                '<div class="song-actions">' +
                    '<button class="icon-btn delete" data-index="' + i + '" title="Delete">&#10006;</button>' +
                '</div>';

            songList.appendChild(card);
        });

        trackCount.textContent = songs.length + ' TRACK' + (songs.length !== 1 ? 'S' : '');
        attachEvents();
    }

    function esc(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ── Events ────────────────────────────────────────────────────────────

    function attachEvents() {
        document.querySelectorAll('#jb-song-list .song-field').forEach(el => {
            el.addEventListener('change', function() {
                songs[parseInt(this.dataset.index)][this.dataset.field] = this.value;
            });
        });

        document.querySelectorAll('#jb-song-list .icon-btn.visibility').forEach(btn => {
            btn.addEventListener('click', function() {
                songs[parseInt(this.dataset.index)].hidden = !songs[parseInt(this.dataset.index)].hidden;
                render();
            });
        });

        document.querySelectorAll('#jb-song-list .icon-btn.delete').forEach(btn => {
            btn.addEventListener('click', function() {
                const i = parseInt(this.dataset.index);
                window.OPS.confirm('Delete "' + songs[i].title + '" by ' + songs[i].artist + '?', '', function() {
                    songs.splice(i, 1);
                    render();
                });
            });
        });

        document.querySelectorAll('#jb-song-list .song-card').forEach(card => {
            card.addEventListener('dragstart', function(e) {
                dragSrcIndex = parseInt(this.dataset.index);
                this.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', dragSrcIndex);
            });

            card.addEventListener('dragend', function() {
                this.classList.remove('dragging');
                document.querySelectorAll('#jb-song-list .song-card').forEach(c => c.classList.remove('drag-over'));
            });

            card.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                this.classList.add('drag-over');
            });

            card.addEventListener('dragleave', function() {
                this.classList.remove('drag-over');
            });

            card.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('drag-over');
                const targetIndex = parseInt(this.dataset.index);
                if (dragSrcIndex !== null && dragSrcIndex !== targetIndex) {
                    const moved = songs.splice(dragSrcIndex, 1)[0];
                    songs.splice(targetIndex, 0, moved);
                    render();
                }
                dragSrcIndex = null;
            });
        });
    }

    // ── Import ────────────────────────────────────────────────────────────

    btnImport.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            try {
                const data = JSON.parse(ev.target.result);
                if (!Array.isArray(data)) throw new Error('Not an array');
                songs = data.map(s => ({
                    title: s.title || '',
                    artist: s.artist || '',
                    file: s.file || '',
                    duration: s.duration || '',
                    hidden: s.hidden || false
                }));
                render();
                window.OPS.toast('Imported ' + songs.length + ' songs');
            } catch (err) {
                window.OPS.toast('Import failed: ' + err.message, true);
            }
        };
        reader.readAsText(file);
        fileInput.value = '';
    });

    // ── Export JSON ───────────────────────────────────────────────────────

    function downloadJson() {
        const json = JSON.stringify(songs, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'songs.json';
        a.click();
        URL.revokeObjectURL(url);
        window.OPS.toast('Downloaded songs.json');
    }

    // ── The two "COPY ... JS" generators were removed on 2026-09-30 ───────
    //
    // They produced a `const TRACKS = [...]` to paste into assets/jukebox.js
    // and a `const JUKEBOX_SONGS = [...]` to paste into
    // music/jukebox/index.html. Neither array exists any more: both players
    // read songs.json directly. The buttons went with them, because a
    // generator whose output has nowhere to go is how the playlist came to
    // exist in four places and disagree in two of them.
    //
    // EXPORT JSON, SAVE LOCAL and SAVE & DEPLOY are the export paths now.

    // ── Server persistence ────────────────────────────────────────────────

    // An empty list reaching the server would overwrite the real one, and the
    // pre-connect state is empty by design (see above). Refuse rather than
    // ask: there is no legitimate reason to publish a playlist with no songs
    // in it, and if there ever is, deleting the manifest is the way to say so.
    function guardNonEmpty(what) {
        if (songs.length > 0) return true;
        window.OPS.toast('Nothing loaded, so there is nothing to ' + what, true);
        return false;
    }

    function saveToServer() {
        if (!guardNonEmpty('save')) return;
        window.OPS.send({ action: 'jukebox_save', songs: songs, token: window.OPS.authToken });
        window.OPS.toast('Saved to server');
    }

    function deployToGitHub() {
        if (!guardNonEmpty('deploy')) return;
        btnDeploy.disabled = true;
        btnDeploy.textContent = 'DEPLOYING...';
        window.OPS.send({
            action: 'github_deploy_jukebox',
            songs: songs,
            message: document.getElementById('gh-commit-msg') ? document.getElementById('gh-commit-msg').value || 'Update jukebox songs via MAGMA//OPS' : 'Update jukebox songs via MAGMA//OPS',
            token: window.OPS.authToken,
        });
        window.OPS.toast('Deploying to GitHub...');
    }

    function loadFromServer() {
        window.OPS.send({ action: 'jukebox_load', token: window.OPS.authToken });
    }

    // ── Listen for server responses ───────────────────────────────────────

    const origOnMessage = window.OPS.onMessage;
    window.OPS.onMessage = function(msg) {
        if (origOnMessage) origOnMessage(msg);

        if (msg.type === 'jukebox_songs' && msg.songs && msg.songs.length > 0) {
            songs = msg.songs;
            render();
            window.OPS.toast('Loaded ' + songs.length + ' songs from server');
        } else if (msg.type === 'jukebox_saved') {
            // handled by toast in saveToServer
        } else if (msg.type === 'github_jukebox_result') {
            btnDeploy.disabled = false;
            btnDeploy.textContent = 'SAVE & DEPLOY';
        }
    };

    // Also load on connect if we have a token
    const origOnConnect = window.OPS.onConnect;
    window.OPS.onConnect = function() {
        if (origOnConnect) origOnConnect();
        loadFromServer();
    };

    // ── Button bindings ───────────────────────────────────────────────────

    btnExportJson.addEventListener('click', downloadJson);
    btnSave.addEventListener('click', saveToServer);
    btnDeploy.addEventListener('click', deployToGitHub);

    btnAdd.addEventListener('click', function() {
        songs.push({ title: 'New Song', artist: 'Artist', file: 'filename.ogg', duration: '0:00', hidden: false });
        render();
        songList.scrollTop = songList.scrollHeight;
    });

    // Reload from the server rather than from a hardcoded list. "Defaults"
    // used to mean the embedded DEFAULT_SONGS array, so RESET discarded your
    // changes AND silently reverted the playlist to whatever was hardcoded
    // when the file was last edited, which by 2026-09-30 was a track behind.
    // The server's copy is the only thing that can honestly be reverted to.
    btnReset.addEventListener('click', function() {
        window.OPS.confirm('Reload the saved song list? This will discard your changes.', '', function() {
            loadFromServer();
        });
    });

    // ── Init ──────────────────────────────────────────────────────────────

    render();

})();
