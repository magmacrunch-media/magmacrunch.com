/**
 * accounts.js — MAGMA//OPS Accounts tab
 * Reference list of all MagmaCrunch accounts and infrastructure
 */

(function() {
    'use strict';

    var CATEGORIES = [
        {
            label: 'STREAMING & MUSIC',
            accounts: [
                { platform: 'Bandcamp', handle: 'magmacrunch.bandcamp.com', url: 'https://magmacrunch.bandcamp.com/' },
                { platform: 'Spotify', handle: 'playlist', url: 'https://open.spotify.com/playlist/7IUU00YYlHLDBTC7tvXNEY' },
                { platform: 'SoundCloud', handle: '@magmacrunch', url: 'https://soundcloud.com/magmacrunch' },
                { platform: 'LANDR', handle: 'magmacrunch', url: 'https://network.landr.com/users/magmacrunch' },
                { platform: 'Qobuz', handle: 'magmacrunch-media', url: 'https://www.qobuz.com/us-en/label/magmacrunch-media/download-streaming-albums/6939549' }
            ]
        },
        {
            label: 'VIDEO',
            accounts: [
                { platform: 'YouTube', handle: '@magmacrunch', url: 'https://www.youtube.com/@magmacrunch' },
                { platform: 'Dailymotion', handle: 'magmacrunch', url: 'https://www.dailymotion.com/magmacrunch' },
                { platform: 'Archive.org', handle: 'magmacrunch', url: 'https://archive.org/search?query=magmacrunch' }
            ]
        },
        {
            label: 'CATALOG & DATA',
            accounts: [
                { platform: 'Discogs', handle: 'label/3354279', url: 'https://www.discogs.com/label/3354279-magmacrunch-media' },
                { platform: 'MusicBrainz', handle: 'label/39446d03', url: 'https://musicbrainz.org/label/39446d03-fe9c-47d0-81a9-2b42d34fb400' }
            ]
        },
        {
            label: 'SOCIAL MEDIA',
            accounts: [
                { platform: 'Linktree', handle: 'linktr.ee/magmacrunch', url: 'https://linktr.ee/magmacrunch' },
                { platform: 'Instagram', handle: '@magmacrunch', url: 'https://www.instagram.com/magmacrunch/' },
                { platform: 'TikTok', handle: '@magmacrunch', url: 'https://www.tiktok.com/@magmacrunch' },
                { platform: 'Facebook', handle: 'magmacrunch', url: 'https://www.facebook.com/magmacrunch/' },
                { platform: 'Threads', handle: '@magmacrunch', url: 'https://www.threads.com/@magmacrunch' },
                { platform: 'Bluesky', handle: 'magmacrunch.bsky.social', url: 'https://bsky.app/profile/magmacrunch.bsky.social' },
                { platform: 'Tumblr', handle: 'magmacrunch', url: 'https://www.tumblr.com/magmacrunch' },
                { platform: 'Pixelfed', handle: 'magmacrunch', url: 'https://pixelfed.social/magmacrunch' },
                { platform: 'Substack', handle: '@magmacrunchmedia', url: 'https://substack.com/@magmacrunchmedia' }
            ]
        },
        {
            label: 'PUBLISHING & RIGHTS',
            accounts: [
                { platform: 'ASCAP', handle: 'music publishing', url: 'https://www.ascap.com/' }
            ]
        },
        {
            label: 'CODE & EMAIL',
            accounts: [
                { platform: 'GitHub', handle: 'magmacrunchmedia', url: 'https://github.com/magmacrunch-media' },
                { platform: 'OpenCode', handle: 'opencode.ai', url: 'https://opencode.ai/' },
                { platform: 'Email (Press)', handle: 'press@magmacrunch.com', url: 'mailto:press@magmacrunch.com' },
                { platform: 'Email (General)', handle: 'via website', url: 'https://magmacrunch.com/home/about.html' }
            ]
        },
        {
            label: 'INFRASTRUCTURE',
            accounts: [
                { platform: 'DuckDNS', handle: 'magmacrunch.duckdns.org', url: 'https://www.duckdns.org/', notes: 'Dynamic DNS for Pi' },
                { platform: 'Cloudflare', handle: 'magmacrunch.com', url: 'https://dash.cloudflare.com/', notes: 'DNS, CDN, email routing' },
                { platform: 'GitHub Pages', handle: 'magmacrunch-media.github.io', url: 'https://magmacrunch-media.github.io/magmacrunch.com/', notes: 'Website hosting' },
                { platform: 'Tailscale', handle: 'magmacrunchmedia@gmail.com', url: 'https://login.tailscale.com/', notes: 'Admin access VPN' },
                { platform: 'Raspberry Pi', handle: '192.168.1.16 / 100.74.172.4', url: null, notes: 'Game servers, MAGMA//OPS' },
                { platform: 'MAGMA//OPS', handle: 'port 8780', url: null, notes: 'Admin dashboard' },
                { platform: 'Formsubmit.co', handle: 'guestbook forms', url: 'https://formsubmit.co/', notes: 'Email form delivery' }
            ]
        }
    ];

    var content = document.getElementById('ac-content');
    var searchInput = document.getElementById('ac-search-input');
    var searchQuery = '';

    function render() {
        content.innerHTML = '';
        var hasResults = false;

        CATEGORIES.forEach(function(cat) {
            var filtered = cat.accounts.filter(function(a) {
                if (!searchQuery) return true;
                var q = searchQuery.toLowerCase();
                return a.platform.toLowerCase().indexOf(q) !== -1 ||
                       a.handle.toLowerCase().indexOf(q) !== -1 ||
                       (a.notes && a.notes.toLowerCase().indexOf(q) !== -1);
            });

            if (filtered.length === 0) return;
            hasResults = true;

            var label = document.createElement('div');
            label.className = 'accounts-category-label';
            label.textContent = cat.label;
            content.appendChild(label);

            var grid = document.createElement('div');
            grid.className = 'accounts-grid';

            filtered.forEach(function(account) {
                var card = document.createElement('div');
                card.className = 'account-card';

                var handleHtml = account.url
                    ? '<a href="' + esc(account.url) + '" target="_blank" rel="noopener">' + esc(account.handle) + '</a>'
                    : esc(account.handle);

                var notesHtml = account.notes
                    ? '<span class="account-handle">' + esc(account.notes) + '</span>'
                    : '';

                card.innerHTML =
                    '<div class="account-info">' +
                        '<span class="account-platform">' + esc(account.platform) + '</span>' +
                        '<span class="account-handle">' + handleHtml + '</span>' +
                        notesHtml +
                    '</div>' +
                    '<div class="account-actions">' +
                        '<button class="btn btn-slate btn-xs" data-copy="' + esc(account.url || account.handle) + '" title="Copy URL">COPY</button>' +
                    '</div>';

                grid.appendChild(card);
            });

            content.appendChild(grid);
        });

        if (!hasResults) {
            content.innerHTML = '<div class="accounts-empty">NO ACCOUNTS FOUND</div>';
        }

        // Bind copy buttons
        content.querySelectorAll('[data-copy]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var text = this.dataset.copy;
                navigator.clipboard.writeText(text).then(function() {
                    window.OPS.toast('Copied to clipboard');
                }, function() {
                    window.OPS.toast('Copy failed', true);
                });
            });
        });
    }

    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ── Search ────────────────────────────────────────────────────────────

    searchInput.addEventListener('input', function() {
        searchQuery = this.value;
        render();
    });

    // ── Init ──────────────────────────────────────────────────────────────

    render();

})();
