/**
 * chat-server.js — where the arcade's chat widget connects.
 *
 * The same two problems score-server.js and mp-server.js solve, for the chat
 * socket. adenosine-chat defaults to the origin that served the page, which is
 * right for anyone else installing it and wrong for us: magmacrunch.com is a
 * GitHub Pages CNAME, so no port on that hostname reaches the Pi running the
 * chat backend.
 *
 * 1. An https: page cannot open a ws:// socket — the browser blocks it as mixed
 *    content before connecting. The chat backend on 8768 carries no TLS of its
 *    own, so public traffic goes through nginx on the Pi, which terminates TLS
 *    on 443 and proxies / → 127.0.0.1:8768.
 *
 * 2. Naming the Pi by a magmacrunch.com subdomain does not work either: its
 *    Let's Encrypt certificate is single-name (CN=magmacrunch.duckdns.org), so
 *    the handshake fails on a SAN mismatch. Public traffic must use the name on
 *    the cert.
 *
 * `allowlist` is a security control, not convenience. The widget replays saved
 * credentials as soon as its socket opens, so an unrestricted ?server= override
 * would let a crafted link hand a visitor's identity to any host. The package
 * accepts the page's own origin and loopback on its own; this adds the Pi.
 *
 * Usage:
 *   <script src="../shared/adenosine-chat.js"></script>
 *   <script src="../shared/chat-server.js"></script>
 *   <script>AdChat.ChatWidget.connect(MC_CHAT_OPTS);</script>
 */
var MC_CHAT_OPTS = (function() {
    var h = (window.location && window.location.hostname) || '';

    // Served from the same box as the chat backend: LAN, Tailscale (the
    // 100.64/10 CGNAT range), *.local. The page host already resolves to the
    // Pi, so talk to the port directly — no nginx, no TLS.
    var sameNetwork = /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(h)
        // Tailscale's CGNAT block is 100.64.0.0/10 — i.e. 100.64 - 100.127 only.
        // A bare /^100\./ would also swallow public addresses like 100.1.2.3.
        || /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h)
        || /\.local$/.test(h);
    if (sameNetwork) return { server: h + ':8768', allowlist: [h] };

    // Local dev: the page is served from this machine but the backend is not.
    if (h === '' || h === 'localhost' || h === '127.0.0.1') {
        return { server: '192.168.1.16:8768', allowlist: ['192.168.1.16'] };
    }

    // Public site: through nginx on 443, which holds the cert for this name.
    // No port — nginx proxies the root path through to 8768.
    return {
        server: 'magmacrunch.duckdns.org',
        allowlist: ['magmacrunch.duckdns.org']
    };
})();
