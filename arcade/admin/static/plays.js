/**
 * plays.js — MAGMA//OPS Plays tab
 * Last.fm global play counts, leaderboard, artist cards with top tracks
 */

(function() {
    'use strict';

    // ── DOM refs ──────────────────────────────────────────────────────────

    var playsGrid = document.getElementById('plays-grid');
    var playsLeaderboard = document.getElementById('plays-leaderboard');
    var btnRefresh = document.getElementById('btn-refresh-plays');

    // ── Listen for server responses ────────────────────────────────────────

    var origOnMessage = window.OPS.onMessage;
    window.OPS.onMessage = function(msg) {
        if (origOnMessage) origOnMessage(msg);

        switch (msg.type) {
            case 'plays_load':
                if (msg.error) {
                    playsGrid.innerHTML = '<div class="log-welcome">' + window.OPS.escapeHtml(msg.error) + '</div>';
                    return;
                }
                renderPlays(msg.artists);
                break;
        }
    };

    // ── Auto-load on connect ──────────────────────────────────────────────

    var origOnConnect = window.OPS.onConnect;
    window.OPS.onConnect = function() {
        if (origOnConnect) origOnConnect();
        requestPlays();
    };

    // ── Actions ───────────────────────────────────────────────────────────

    function requestPlays() {
        playsGrid.innerHTML = '<div class="log-welcome">Loading play counts...</div>';
        playsLeaderboard.innerHTML = '';
        window.OPS.send({ action: 'plays_load', token: window.OPS.authToken });
    }

    if (btnRefresh) {
        btnRefresh.addEventListener('click', requestPlays);
    }

    // ── Render ────────────────────────────────────────────────────────────

    function renderPlays(artists) {
        if (!artists || artists.length === 0) {
            playsLeaderboard.innerHTML = '';
            playsGrid.innerHTML = '<div class="log-welcome">No play count data found. Run the fetch script first.</div>';
            return;
        }

        // aggregate stats
        var totalPlays = 0;
        var totalListeners = 0;
        artists.forEach(function(a) {
            totalPlays += (a.stats && a.stats.playcount) || 0;
            totalListeners += (a.stats && a.stats.listeners) || 0;
        });

        // leaderboard header
        playsLeaderboard.innerHTML =
            '<div class="plays-stats">' +
                '<div class="plays-stat">' +
                    '<span class="plays-stat-value">' + totalPlays.toLocaleString() + '</span>' +
                    '<span class="plays-stat-label">TOTAL PLAYS</span>' +
                '</div>' +
                '<div class="plays-stat">' +
                    '<span class="plays-stat-value">' + totalListeners.toLocaleString() + '</span>' +
                    '<span class="plays-stat-label">TOTAL LISTENERS</span>' +
                '</div>' +
                '<div class="plays-stat">' +
                    '<span class="plays-stat-value">' + artists.length + '</span>' +
                    '<span class="plays-stat-label">ARTISTS</span>' +
                '</div>' +
            '</div>';

        // artist cards
        var html = '';
        artists.forEach(function(artist, i) {
            var stats = artist.stats || {};
            var plays = stats.playcount || 0;
            var listeners = stats.listeners || 0;
            var tracks = artist.topTracks || [];
            var topTracksHtml = '';

            if (tracks.length > 0) {
                topTracksHtml = '<div class="plays-tracks">';
                var showCount = Math.min(tracks.length, 10);
                for (var t = 0; t < showCount; t++) {
                    var track = tracks[t];
                    topTracksHtml +=
                        '<div class="plays-track">' +
                            '<span class="plays-track-rank">' + (t + 1) + '</span>' +
                            '<span class="plays-track-name">' + window.OPS.escapeHtml(track.name) + '</span>' +
                            '<span class="plays-track-count">' + track.playcount.toLocaleString() + '</span>' +
                        '</div>';
                }
                topTracksHtml += '</div>';
            }

            html +=
                '<div class="score-card" data-artist="' + i + '">' +
                    '<div class="score-card-header">' +
                        '<span class="score-card-rank">#' + (i + 1) + '</span>' +
                        '<span class="score-card-name">' + window.OPS.escapeHtml(artist.name) + '</span>' +
                    '</div>' +
                    '<div class="plays-card-stats">' +
                        '<span>' + plays.toLocaleString() + ' plays</span>' +
                        '<span>' + listeners.toLocaleString() + ' listeners</span>' +
                    '</div>' +
                    '<div class="plays-card-tracks hidden" id="tracks-' + i + '">' +
                        '<div class="plays-tracks-header">TOP TRACKS</div>' +
                        topTracksHtml +
                    '</div>' +
                    '<div class="score-card-actions">' +
                        '<button class="btn btn-cyan btn-sm plays-toggle" data-target="tracks-' + i + '">TOP TRACKS</button>' +
                        (artist.mbid
                            ? '<a class="btn btn-green btn-sm" href="https://www.last.fm/music/' + encodeURIComponent(artist.name) + '" target="_blank" rel="noopener">LAST.FM</a>'
                            : '') +
                    '</div>' +
                '</div>';
        });

        playsGrid.innerHTML = html;

        // toggle top tracks
        var toggleBtns = playsGrid.querySelectorAll('.plays-toggle');
        toggleBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var target = document.getElementById(btn.dataset.target);
                if (target) {
                    target.classList.toggle('hidden');
                    btn.textContent = target.classList.contains('hidden') ? 'TOP TRACKS' : 'HIDE';
                }
            });
        });
    }

})();
