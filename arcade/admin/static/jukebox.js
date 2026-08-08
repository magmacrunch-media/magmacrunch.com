/**
 * jukebox.js — MAGMA//OPS Jukebox tab
 * Song list editor with drag-drop, import/export, server persistence
 */

(function() {
    'use strict';

    // ── Default song data ─────────────────────────────────────────────────

    const DEFAULT_SONGS = [
        { title: "Reverse Osmosis Reversed", artist: "Juanito Thompson", file: "Juanito Thompson - That Definitely Did Destroy Me - 01 Reverse Osmosis Reversed.ogg", duration: "4:51", hidden: false },
        { title: "Heavy Water", artist: "The Four B's", file: "The Four B's - Greatest Hits '12-'14 - 08 Heavy Water.ogg", duration: "5:03", hidden: false },
        { title: "Somewhere", artist: "C.P. Rutledge", file: "C.P. Rutledge - Somewhere.ogg", duration: "4:15", hidden: false },
        { title: "Birds", artist: "Texas Hold'Em Lava Dome", file: "Texas Hold'Em Lava Dome - Birds - 01 Birds.ogg", duration: "4:47", hidden: false },
        { title: "A January Gathering", artist: "Bears Crossing", file: "Bears Crossing - A January Gathering.ogg", duration: "2:34", hidden: false },
        { title: "Neopolitan Mood", artist: "James R. McCoy", file: "James R. McCoy - Neopolitan Mood.ogg", duration: "3:16", hidden: false },
        { title: "makemecookies! x4.", artist: "Jimmi", file: "Jimmi - JIMMI - 07 makemecookies! x4.ogg", duration: "0:51", hidden: false },
        { title: "Millstone Woods May 2018", artist: "Dag Henderson", file: "Dag Henderson - Millstone Woods May 2018.ogg", duration: "3:38", hidden: false },
        { title: "The End", artist: "Jon McCoy", file: "Jon McCoy - The End.ogg", duration: "3:26", hidden: false },
        { title: "Qikiqtarjuaq", artist: "Juanito Thompson", file: "Juanito Thompson - It's Twenty-Fourteen - 01 Qikiqtarjuaq.ogg", duration: "6:20", hidden: false },
        { title: "Everything is falling all together, all at once, even the universe", artist: "The Four B's", file: "The Four B's - Greatest Hits '12-'14 - 05 Everything is falling all together, all at once, even the universe.ogg", duration: "4:28", hidden: false }
    ];

    let songs = JSON.parse(JSON.stringify(DEFAULT_SONGS));
    let dragSrcIndex = null;

    // ── DOM refs ──────────────────────────────────────────────────────────

    const songList = document.getElementById('jb-song-list');
    const trackCount = document.getElementById('jb-track-count');
    const fileInput = document.getElementById('jb-file-input');
    const btnImport = document.getElementById('jb-btn-import');
    const btnExportJson = document.getElementById('jb-btn-export-json');
    const btnCopyTracks = document.getElementById('jb-btn-copy-tracks');
    const btnCopyJukebox = document.getElementById('jb-btn-copy-jukebox');
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

    // ── Generate TRACKS JS ────────────────────────────────────────────────

    function generateTracksJs() {
        const lines = songs.map(function(s) {
            const path = 'music/jukebox/songs/' + s.file;
            return '        { title: ' + JSON.stringify(s.title) +
                   ', artist: ' + JSON.stringify(s.artist) +
                   ', file: ' + JSON.stringify(path) +
                   ', duration: ' + JSON.stringify(s.duration) + ' }';
        });
        return 'const TRACKS = [\n' + lines.join(',\n') + '\n    ];';
    }

    // ── Generate JUKEBOX_SONGS JS ────────────────────────────────────────

    function generateJukeboxSongsJs() {
        const lines = songs.map(function(s) {
            return '    { title: ' + JSON.stringify(s.title) +
                   ', artist: ' + JSON.stringify(s.artist) +
                   ', file: ' + JSON.stringify(s.file) +
                   ', duration: ' + JSON.stringify(s.duration) + ' }';
        });
        return 'const JUKEBOX_SONGS = [\n' + lines.join(',\n') + '\n];';
    }

    // ── Copy to clipboard ─────────────────────────────────────────────────

    function copyToClipboard(text, label) {
        navigator.clipboard.writeText(text).then(function() {
            window.OPS.toast('Copied ' + label + ' to clipboard');
        }, function() {
            window.OPS.toast('Copy failed', true);
        });
    }

    // ── Server persistence ────────────────────────────────────────────────

    function saveToServer() {
        window.OPS.send({ action: 'jukebox_save', songs: songs, token: window.OPS.authToken });
        window.OPS.toast('Saved to server');
    }

    function deployToGitHub() {
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
    btnCopyTracks.addEventListener('click', () => copyToClipboard(generateTracksJs(), 'TRACKS JS'));
    btnCopyJukebox.addEventListener('click', () => copyToClipboard(generateJukeboxSongsJs(), 'JUKEBOX_SONGS JS'));
    btnSave.addEventListener('click', saveToServer);
    btnDeploy.addEventListener('click', deployToGitHub);

    btnAdd.addEventListener('click', function() {
        songs.push({ title: 'New Song', artist: 'Artist', file: 'filename.ogg', duration: '0:00', hidden: false });
        render();
        songList.scrollTop = songList.scrollHeight;
    });

    btnReset.addEventListener('click', function() {
        window.OPS.confirm('Reset all songs to defaults? This will discard your changes.', '', function() {
            songs = JSON.parse(JSON.stringify(DEFAULT_SONGS));
            render();
            window.OPS.toast('Reset to defaults');
        });
    });

    // ── Init ──────────────────────────────────────────────────────────────

    render();

})();
