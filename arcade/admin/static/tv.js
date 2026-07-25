/**
 * tv.js — MAGMA//OPS TV tab
 * Channel list editor for visual/tv.html
 * Drag-drop reorder, add/delete, server persistence, generates tv-channels.js
 */

(function() {
    'use strict';

    // ── Default channel data ───────────────────────────────────────────────

    const DEFAULT_CHANNELS = [
        { title: "Hologram of a Dream",                          artist: "magma//crunch", id: "mby4C5PZzlQ", year: "2025" },
        { title: "Sitting on a Dock in New Shoreham",            artist: "magma//crunch", id: "BirxEyAj0u0", year: "2025" },
        { title: "Very Long Boards",                             artist: "magma//crunch", id: "8xjZgv3us1Q", year: "2025" },
        { title: "I'm gonna need more of a commitment than that",artist: "magma//crunch", id: "KiFWHj1cmOY", year: "2025" },
        { title: "Leaves",                                       artist: "magma//crunch", id: "wv_6z79fQjQ", year: "2024" },
        { title: "Summer Day",                                   artist: "magma//crunch", id: "QgJfLXhV15Y", year: "2024" },
        { title: "Gravitational Voltage",                        artist: "magma//crunch", id: "gtclSfU8oDM", year: "2024" },
        { title: "Beach Ave.",                                   artist: "magma//crunch", id: "tkpoCxpsUAk", year: "2024" },
        { title: "Who is Richard Parker?",                       artist: "magma//crunch", id: "xGzuJO_5364", year: "2024" },
        { title: "Parade Float Electronics",                     artist: "magma//crunch", id: "gjo9FdBJGRk", year: "2024" },
        { title: "Figure the Shoreline",                         artist: "magma//crunch", id: "Gm9XVmj0iVM", year: "2024" },
        { title: "Point Judith",                                 artist: "magma//crunch", id: "cCUC-a6v74E", year: "2024" },
        { title: "Eternity spent in an arcade",                  artist: "magma//crunch", id: "lTmHfMZAimQ", year: "2024" },
        { title: "Try",                                          artist: "magma//crunch", id: "To6AJJ7-iCY", year: "2024" },
        { title: "Contemplate the Plate Tectonic",               artist: "magma//crunch", id: "YnzQh-h5zq0", year: "2024" },
        { title: "Area Does Not Exist",                          artist: "magma//crunch", id: "T6lCJBrjFQ0", year: "2024" },
        { title: "Daffodil & Sweet Pea",                         artist: "magma//crunch", id: "0QwOELVzeSo", year: "2024" },
        { title: "Driving",                                      artist: "magma//crunch", id: "vmUJ2O3xwJw", year: "2024" },
        { title: "Ancient Weeds",                                artist: "magma//crunch", id: "pX3G_dtyMPI", year: "2023" },
        { title: "Film School",                                  artist: "magma//crunch", id: "VN_5u6tBPts", year: "2023" },
        { title: "Little Piece No. 1",                           artist: "magma//crunch", id: "hlOYgcDvyaE", year: "2023" },
        { title: "Millstone Woods May 2018",                     artist: "magma//crunch", id: "3_jo3WEOPEI", year: "2023" },
        { title: "Bus full of time-traveling twenty-somethings", artist: "magma//crunch", id: "OebpP5m3jms", year: "2023" },
        { title: "Sex Van Floor Plan: The Documentary",          artist: "SVFP",          id: "VSGReUKVRjk", year: "2026" },
    ];

    let channels = JSON.parse(JSON.stringify(DEFAULT_CHANNELS));
    let dragSrcIndex = null;

    // ── DOM refs ──────────────────────────────────────────────────────────

    const channelList = document.getElementById('tv-channel-list');
    const channelCount = document.getElementById('tv-channel-count');
    const fileInput = document.getElementById('tv-file-input');
    const btnImport = document.getElementById('tv-btn-import');
    const btnExportJson = document.getElementById('tv-btn-export-json');
    const btnCopyJs = document.getElementById('tv-btn-copy-js');
    const btnSave = document.getElementById('tv-btn-save');
    const btnDeploy = document.getElementById('tv-btn-deploy');
    const btnReset = document.getElementById('tv-btn-reset');
    const btnAdd = document.getElementById('tv-btn-add');

    // ── Helpers ───────────────────────────────────────────────────────────

    function esc(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function extractVideoId(input) {
        input = input.trim();
        // Already a bare ID (11 chars, alphanumeric + _ -)
        if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
        // youtu.be/ID
        var m = input.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        if (m) return m[1];
        // youtube.com/watch?v=ID
        m = input.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
        if (m) return m[1];
        // youtube.com/embed/ID
        m = input.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
        if (m) return m[1];
        return null;
    }

    // ── Render ────────────────────────────────────────────────────────────

    function render() {
        channelList.innerHTML = '';
        channels.forEach(function(ch, i) {
            var card = document.createElement('div');
            card.className = 'song-card';
            card.draggable = true;
            card.dataset.index = i;

            var thumbUrl = 'https://img.youtube.com/vi/' + esc(ch.id) + '/mqdefault.jpg';

            card.innerHTML =
                '<div class="song-number">' + (i + 1) + '</div>' +
                '<div class="drag-handle" title="Drag to reorder">&#9776;</div>' +
                '<div class="tv-thumb"><img src="' + thumbUrl + '" alt="" loading="lazy" onerror="this.style.display=\'none\'"></div>' +
                '<input type="text" class="song-field title" value="' + esc(ch.title) + '" data-field="title" data-index="' + i + '">' +
                '<input type="text" class="song-field artist" value="' + esc(ch.artist) + '" data-field="artist" data-index="' + i + '">' +
                '<input type="text" class="song-field year" value="' + esc(ch.year) + '" data-field="year" data-index="' + i + '" placeholder="YYYY" style="max-width:70px">' +
                '<input type="text" class="song-field id" value="' + esc(ch.id) + '" data-field="id" data-index="' + i + '" placeholder="YouTube ID" style="max-width:120px">' +
                '<div class="song-actions">' +
                    '<button class="icon-btn delete" data-index="' + i + '" title="Delete">&#10006;</button>' +
                '</div>';

            channelList.appendChild(card);
        });

        channelCount.textContent = channels.length + ' CHANNEL' + (channels.length !== 1 ? 'S' : '');
        attachEvents();
    }

    // ── Events ────────────────────────────────────────────────────────────

    function attachEvents() {
        // Inline field edits
        document.querySelectorAll('#tv-channel-list .song-field').forEach(function(el) {
            el.addEventListener('change', function() {
                channels[parseInt(this.dataset.index)][this.dataset.field] = this.value;
                // Update thumbnail when ID changes
                if (this.dataset.field === 'id') {
                    var card = this.closest('.song-card');
                    var img = card.querySelector('.tv-thumb img');
                    if (img) img.src = 'https://img.youtube.com/vi/' + esc(this.value) + '/mqdefault.jpg';
                }
            });
        });

        // Delete buttons
        document.querySelectorAll('#tv-channel-list .icon-btn.delete').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var idx = parseInt(this.dataset.index);
                channels.splice(idx, 1);
                render();
            });
        });

        // Drag and drop
        document.querySelectorAll('#tv-channel-list .song-card').forEach(function(card) {
            card.addEventListener('dragstart', function(e) {
                dragSrcIndex = parseInt(this.dataset.index);
                this.style.opacity = '0.4';
                e.dataTransfer.effectAllowed = 'move';
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
                var targetIndex = parseInt(this.dataset.index);
                if (dragSrcIndex !== null && dragSrcIndex !== targetIndex) {
                    var moved = channels.splice(dragSrcIndex, 1)[0];
                    channels.splice(targetIndex, 0, moved);
                    render();
                }
            });

            card.addEventListener('dragend', function() {
                this.style.opacity = '1';
                document.querySelectorAll('.song-card').forEach(function(c) {
                    c.classList.remove('drag-over');
                });
                dragSrcIndex = null;
            });
        });
    }

    // ── Generate JS ───────────────────────────────────────────────────────

    function generateChannelsJs() {
        var lines = channels.map(function(ch) {
            return '    { title: ' + JSON.stringify(ch.title) +
                   ', artist: ' + JSON.stringify(ch.artist) +
                   ', id: ' + JSON.stringify(ch.id) +
                   ', year: ' + JSON.stringify(ch.year) + ' }';
        });
        return 'window.TV_CHANNELS = [\n' + lines.join(',\n') + '\n];\n';
    }

    // ── Import / Export ───────────────────────────────────────────────────

    function downloadJson() {
        var blob = new Blob([JSON.stringify(channels, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'tv-channels.json';
        a.click();
        URL.revokeObjectURL(a.href);
        window.OPS.toast('Exported JSON');
    }

    function importJson(file) {
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var data = JSON.parse(e.target.result);
                if (Array.isArray(data)) {
                    channels = data;
                    render();
                    window.OPS.toast('Imported ' + channels.length + ' channels');
                } else {
                    window.OPS.toast('Invalid format — expected array', true);
                }
            } catch (err) {
                window.OPS.toast('JSON parse error', true);
            }
        };
        reader.readAsText(file);
    }

    function copyToClipboard(text, label) {
        navigator.clipboard.writeText(text).then(function() {
            window.OPS.toast('Copied ' + label + ' to clipboard');
        }, function() {
            window.OPS.toast('Copy failed', true);
        });
    }

    // ── Server persistence ────────────────────────────────────────────────

    function saveToServer() {
        window.OPS.send({ action: 'tv_save', channels: channels, token: window.OPS.authToken });
        window.OPS.toast('Saving...');
    }

    function deployToGitHub() {
        btnDeploy.disabled = true;
        btnDeploy.textContent = 'DEPLOYING...';
        window.OPS.send({
            action: 'github_deploy_tv',
            channels: channels,
            message: document.getElementById('gh-commit-msg') ? document.getElementById('gh-commit-msg').value || 'Update TV channels via MAGMA//OPS' : 'Update TV channels via MAGMA//OPS',
            token: window.OPS.authToken,
        });
        window.OPS.toast('Deploying to GitHub...');
    }

    function loadFromServer() {
        window.OPS.send({ action: 'tv_load', token: window.OPS.authToken });
    }

    // ── Listen for server responses ───────────────────────────────────────

    var origOnMessage = window.OPS.onMessage;
    window.OPS.onMessage = function(msg) {
        if (origOnMessage) origOnMessage(msg);

        if (msg.type === 'tv_channels' && msg.channels) {
            channels = msg.channels.length > 0 ? msg.channels : JSON.parse(JSON.stringify(DEFAULT_CHANNELS));
            render();
            window.OPS.toast('Loaded ' + channels.length + ' channels from server');
        } else if (msg.type === 'tv_saved') {
            window.OPS.toast('Saved ' + channels.length + ' channels');
        } else if (msg.type === 'github_tv_result') {
            btnDeploy.disabled = false;
            btnDeploy.textContent = 'SAVE & DEPLOY';
        }
    };

    // Also load on connect
    var origOnConnect = window.OPS.onConnect;
    window.OPS.onConnect = function() {
        if (origOnConnect) origOnConnect();
        loadFromServer();
    };

    // ── Button bindings ───────────────────────────────────────────────────

    btnImport.addEventListener('click', function() { fileInput.click(); });
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) importJson(this.files[0]);
        this.value = '';
    });

    btnExportJson.addEventListener('click', downloadJson);
    btnCopyJs.addEventListener('click', function() { copyToClipboard(generateChannelsJs(), 'TV_CHANNELS JS'); });
    btnSave.addEventListener('click', saveToServer);
    btnDeploy.addEventListener('click', deployToGitHub);

    btnAdd.addEventListener('click', function() {
        var input = prompt('Paste a YouTube URL or video ID:');
        if (!input) return;

        var videoId = extractVideoId(input);
        if (!videoId) {
            window.OPS.toast('Could not extract video ID from input', true);
            return;
        }

        // Try to fetch title via oEmbed
        var oembedUrl = 'https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=' + videoId + '&format=json';
        var newCh = { title: 'Video ' + videoId, artist: 'magma//crunch', id: videoId, year: String(new Date().getFullYear()) };

        fetch(oembedUrl)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.title) newCh.title = data.title;
                channels.push(newCh);
                render();
                channelList.scrollTop = channelList.scrollHeight;
                window.OPS.toast('Added: ' + newCh.title);
            })
            .catch(function() {
                channels.push(newCh);
                render();
                channelList.scrollTop = channelList.scrollHeight;
                window.OPS.toast('Added: ' + videoId + ' (title fetch failed)');
            });
    });

    btnReset.addEventListener('click', function() {
        window.OPS.confirm('Reset all channels to defaults? This will discard your changes.', '', function() {
            channels = JSON.parse(JSON.stringify(DEFAULT_CHANNELS));
            render();
            window.OPS.toast('Reset to defaults');
        });
    });

    // ── Init ──────────────────────────────────────────────────────────────

    render();

})();
