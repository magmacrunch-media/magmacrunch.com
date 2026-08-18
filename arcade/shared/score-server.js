/**
 * score-server.js — where arcade games send their high scores.
 *
 * ScoreClient.auto() infers its host from the page, which is wrong here:
 * magmacrunch.com is a GitHub Pages CNAME, so no port on that hostname reaches
 * the Pi running the MAGMA//OPS score backend. Public pages have to name the Pi.
 *
 * The scheme matters too. An https: page cannot open a ws:// socket at all —
 * the browser blocks it as mixed content before connecting — and the backend's
 * port 8781 carries no TLS of its own. nginx on the Pi terminates TLS on 443
 * and proxies /scores through to it.
 *
 * Usage:
 *   <script src="../shared/adenosine-score-client.js"></script>
 *   <script src="../shared/score-server.js"></script>
 *   <script>const scoreClient = new AdScore.ScoreClient().auto(MC_SCORE_OPTS);</script>
 */
var MC_SCORE_OPTS = (function() {
    var h = (window.location && window.location.hostname) || '';

    // Everything that isn't the public site — localhost, LAN, Tailscale (the
    // 100.64/10 CGNAT range), *.local — serves the page from the same box as
    // the backend, so the default host and port 8781 already resolve to it.
    var direct = h === '' || h === 'localhost' || h === '127.0.0.1'
        || /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(h)
        // Tailscale's CGNAT block is 100.64.0.0/10 — i.e. 100.64 - 100.127 only.
        // A bare /^100\./ would also swallow public addresses like 100.1.2.3.
        || /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h)
        || /\.local$/.test(h);
    if (direct) return {};

    // Public site: through nginx, which holds the cert for this hostname.
    // port: null omits the port so the connection lands on 443.
    return { hostname: 'magmacrunch.duckdns.org', port: null, path: '/scores' };
})();
