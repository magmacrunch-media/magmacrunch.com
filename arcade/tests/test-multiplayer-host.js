/**
 * test-multiplayer-host.js -- which host the multiplayer socket really opens.
 *
 * This runs against arcade/shared/adenosine-multiplayer.js, the bundle the
 * games actually load, rather than against the adenosine source it is built
 * from. That is the point of it. The bundle is vendored, so the fix below
 * reaches visitors only once the committed file carries it, and a plain
 * `npm run build:adenosine` would happily copy an older build from
 * node_modules over the top. scripts/sync-adenosine.mjs holds that off with a
 * MIN_VERSION floor; this is the half that fails out loud if the floor is ever
 * dropped too early, or the bundle hand-reverted.
 *
 * The bug: MP._hostOf read the host by stripping the scheme and then splitting
 * on '/' and ':', which returns the text before the first colon. For a value
 * carrying userinfo that text is the credentials, not the host:
 *
 *   ?server=magmacrunch.duckdns.org:8769@evil.example.com
 *
 * split to 'magmacrunch.duckdns.org', matched the allowlist, and then opened
 * the socket to evil.example.com, because everything before the '@' is
 * credentials. Nothing had to be misconfigured: the page's own hostname is
 * always allowed, and on the public site mp-server.js names the Pi as the
 * default server, so both of those are allowlisted names an attacker can put
 * in front of the '@'.
 *
 * _hostOf feeds _scheme() as well, so the scheme was chosen for the
 * credentials rather than the host. A private-looking literal in front of the
 * '@' picked ws://, and -- worse for the public site -- an ordinary public
 * name picked wss://, so the socket to the attacker's host was a real TLS
 * connection rather than a mixed-content attempt the browser would refuse.
 *
 * Run: node test-multiplayer-host.js
 */


import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BUNDLE = path.join(__dirname, '..', 'shared', 'adenosine-multiplayer.js');
const SOURCE = fs.readFileSync(BUNDLE, 'utf8');

let passed = 0, failed = 0;

function ok(cond, name, detail) {
    if (cond) { passed++; console.log('  PASS  ' + name); }
    else { failed++; console.log('  FAIL  ' + name + (detail ? '\n          ' + detail : '')); }
}

function eq(actual, expected, name) {
    ok(actual === expected, name,
        'got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected));
}

/**
 * A fresh MP from the served bundle, as a page on `hostname` would see it.
 * Fresh each time because MP._config is module state and configure() merges.
 */
function loadMP(hostname, protocol) {
    const sandbox = {
        window: { location: { hostname: hostname, protocol: protocol, host: hostname, search: '' } },
        console: console,
        // A fresh vm context inherits none of Node's globals, and _hostOf is
        // built on URL. Without this every lookup returns '' and the suite
        // passes for the wrong reason: '' gets pushed onto the allowlist by
        // _allowlist(), so every host matches it and nothing is refused.
        URL: URL,
        URLSearchParams: URLSearchParams,
    };
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(SOURCE, sandbox);
    const MP = sandbox.AdMP && sandbox.AdMP.MP;
    if (!MP) throw new Error('the bundle did not expose AdMP.MP');
    return MP;
}

/** The public arcade: served from magmacrunch.com, dialling the Pi via nginx. */
function publicMP() {
    const MP = loadMP('magmacrunch.com', 'https:');
    // What mp-server.js hands a public page, so _allowlist() trusts the Pi.
    MP.configure({ defaultServer: 'magmacrunch.duckdns.org/cribbage' });
    return MP;
}

console.log('_hostOf reads the host the socket will really open');
{
    const MP = publicMP();
    eq(MP._hostOf('magmacrunch.duckdns.org:8769@evil.example.com'), 'evil.example.com',
        'userinfo: the host is what follows the @');
    eq(MP._hostOf('magmacrunch.com@evil.example.com'), 'evil.example.com',
        'userinfo without a port');
    eq(MP._hostOf('magmacrunch.duckdns.org/cribbage'), 'magmacrunch.duckdns.org',
        'host and path');
    eq(MP._hostOf('magmacrunch.duckdns.org:8769/cribbage'), 'magmacrunch.duckdns.org',
        'host, port and path');
    eq(MP._hostOf('wss://magmacrunch.duckdns.org/cribbage'), 'magmacrunch.duckdns.org',
        'an explicit scheme is kept');
    eq(MP._hostOf('ws://magmacrunch.com@evil.example.com'), 'evil.example.com',
        'userinfo behind an explicit scheme');
}

console.log('_isAllowed refuses a host hidden behind userinfo');
{
    const MP = publicMP();
    // Each of these splits to an allowlisted name under the old implementation.
    ok(MP._isAllowed('magmacrunch.duckdns.org:8769@evil.example.com') === false,
        'the configured default server as userinfo');
    ok(MP._isAllowed('magmacrunch.com@evil.example.com') === false,
        "the page's own hostname as userinfo");
    ok(MP._isAllowed('localhost:8769@evil.example.com') === false,
        'loopback as userinfo');
    // This one needed no allowlist entry at all: _PRIVATE matched the split.
    ok(MP._isAllowed('192.168.1.16:8769@evil.example.com') === false,
        'an RFC1918 literal as userinfo');
    ok(MP._isAllowed('10.0.0.5@evil.example.com') === false,
        'another RFC1918 literal as userinfo');
}

console.log('_isAllowed still permits what the arcade legitimately dials');
{
    const MP = publicMP();
    ok(MP._isAllowed('magmacrunch.duckdns.org/cribbage') === true,
        'the configured default server');
    ok(MP._isAllowed('magmacrunch.com') === true, "the page's own hostname");
    ok(MP._isAllowed('localhost:8766') === true, 'loopback with a port');
    ok(MP._isAllowed('192.168.1.16:8766') === true, 'the LAN address mp-server.js uses');
    ok(MP._isAllowed('evil.example.com') === false, 'an unrelated host is still refused');
}

console.log('_scheme follows the real host, not the credentials');
{
    const MP = publicMP();
    // The old _hostOf handed _scheme the userinfo, so a private-looking
    // literal in front of the '@' chose ws:// for a public host.
    eq(MP._scheme('192.168.1.16:8769@evil.example.com'), 'wss://',
        'an RFC1918 literal as userinfo does not force ws://');
    eq(MP._scheme('127.0.0.1@evil.example.com'), 'wss://',
        'loopback as userinfo does not force ws://');
    eq(MP._scheme('192.168.1.16:8766'), 'ws://', 'a real LAN host still gets ws://');
    eq(MP._scheme('localhost:8766'), 'ws://', 'real loopback still gets ws://');
    eq(MP._scheme('magmacrunch.duckdns.org/cribbage'), 'wss://',
        'a public host on an https page gets wss://');
}

console.log('a value that will not parse is refused rather than guessed at');
{
    const MP = publicMP();
    eq(MP._hostOf('not a host at all'), '', 'unparseable gives the empty string');
    ok(MP._isAllowed('not a host at all') === false, 'and the empty string is on no allowlist');
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
