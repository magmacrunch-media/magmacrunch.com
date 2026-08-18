/**
 * mp-server.js — where arcade games reach their multiplayer server.
 *
 * The same two problems score-server.js solves, for the game sockets.
 *
 * 1. An https: page cannot open a ws:// socket — the browser blocks it as mixed
 *    content before connecting. The game servers on 8765-8774 carry no TLS of
 *    their own, so public traffic has to go through nginx on the Pi, which
 *    terminates TLS on 443 and proxies a path per game.
 *
 * 2. Naming the Pi by a magmacrunch.com subdomain does not work either.
 *    cribbage.magmacrunch.com and scandinavian-stud.magmacrunch.com do resolve
 *    to the Pi, but its Let's Encrypt certificate is single-name
 *    (CN=magmacrunch.duckdns.org), so the handshake fails on a SAN mismatch:
 *      subjectAltName does not match host name cribbage.magmacrunch.com
 *    Public traffic must use magmacrunch.duckdns.org, the name on the cert.
 *
 * Returns a bare "host[:port][/path]" — never a scheme. MP.connect() prepends
 * wss: or ws: from the page protocol; a value starting with "ws" is used
 * verbatim, which is what silently defeated the scheme fix in earlier pages.
 *
 * Usage:
 *   <script src="../shared/adenosine-multiplayer.js"></script>
 *   <script src="../shared/mp-server.js"></script>
 *   <script>var MP_DEFAULT_SERVER = mpServerFor('cribbage', 8766);</script>
 *
 * @param {string} path  nginx location for this game, without the leading slash
 * @param {number} port  the game server's port, for same-network play
 */
function mpServerFor(path, port) {
    var h = (window.location && window.location.hostname) || '';

    // Served from the same box as the game servers: LAN, Tailscale (the
    // 100.64/10 CGNAT range), *.local. Talk to the port directly — no nginx,
    // no TLS, and the page host already resolves to the Pi.
    var sameNetwork = /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(h)
        // Tailscale's CGNAT block is 100.64.0.0/10 — i.e. 100.64 - 100.127 only.
        // A bare /^100\./ would also swallow public addresses like 100.1.2.3.
        || /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h)
        || /\.local$/.test(h);
    if (sameNetwork) return h + ':' + port;

    // Local dev: the page is served from this machine but the game servers are
    // not. Point at the Pi's LAN address, matching the long-standing fallback in
    // the multiplayer client itself.
    if (h === '' || h === 'localhost' || h === '127.0.0.1') {
        return '192.168.1.16:' + port;
    }

    // Public site: through nginx on 443, which holds the cert for this name.
    // No port — the path selects the game.
    return 'magmacrunch.duckdns.org/' + path;
}
