/**
 * test-chat-retired.js -- the retired chat widget stays retired.
 *
 * The floating chat widget was retired from the arcade on 2026-10-12
 * (docs/ops/chat-system.md). The vendored bundle it ran on,
 * arcade/shared/adenosine-chat.js, was built from @magmacrunch/adenosine-chat
 * 0.6.0, which carries the userinfo allowlist bypass:
 *
 *   ?server=<allowlisted-host>:443@evil.example.com
 *
 * hostOf() read the host by stripping the scheme and then splitting on '/' and
 * ':', which returns the text in front of the first colon. For a value
 * carrying userinfo that text is the credentials and not the host, so the
 * allowlist matched a name the socket was never going to open and the socket
 * went to evil.example.com. The page's own hostname is always permitted, so
 * naming it in front of the '@' was enough on its own and no deployment had to
 * be misconfigured. What that cost is the whole point of having an allowlist:
 * the widget replays the visitor's saved credentials as soon as its socket
 * opens, so a crafted link handed them to a host of the sender's choosing.
 * adenosine 0a9f39c fixes it by reading the hostname off the URL parser, the
 * parser the WebSocket constructor itself uses, released as 0.6.1.
 *
 * -- Why this test, rather than one that exercises the bundle --
 *
 * arcade/tests/test-multiplayer-host.js loads the served multiplayer bundle in
 * a vm and asserts the userinfo cases are refused, because that bundle is
 * still loaded by seven games and had to be fixed in place. Chat took the
 * other route: nothing loads it, so the fix is removal, and there is no bundle
 * left to hold to a contract. What needs holding instead is the removal.
 *
 * That is not a theoretical guard. Retirement was judged safe on the grounds
 * that no page in the repository loads the widget, which was true of the pages
 * that already existed and false of the ones scripts/scaffold-game.mjs makes:
 * it went on emitting chat-widget.css, adenosine-chat.js, chat-server.js and a
 * ChatWidget.connect(MC_CHAT_OPTS) call into every new game page. So the next
 * scaffold run would have published a live, connecting copy of a HIGH severity
 * flaw, and the check that was supposed to notice could not, because a page
 * that does not exist yet loads nothing. Equally, 'chat' left in
 * sync-adenosine.mjs's PACKAGES would copy 0.6.0 back out of node_modules on
 * the next `npm run build:adenosine`, undoing the deletion as a side effect of
 * syncing some unrelated package.
 *
 * Hence three assertions rather than one: the files are gone, nothing asks for
 * them, and neither generator can bring them back.
 *
 * -- If you are reading this because it failed --
 *
 * Reviving the widget needs @magmacrunch/adenosine-chat 0.6.1 or newer
 * installed, which was not published when this was written, so check npm
 * before assuming the floor is reachable. Match chat inside a game does not
 * need the widget at all and should not use it: it belongs to the game's own
 * server, which takes the room from the connection and so cannot leak across
 * matches, so copy cribbage's panel plus sendChat plus MP.onChatMessage.
 * Deleting this test is the wrong way to make it pass.
 *
 * Run: node test-chat-retired.js
 */

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

let passed = 0, failed = 0;

/** Returns the condition, so a failed precondition can short-circuit. */
function ok(cond, name, detail) {
    if (cond) { passed++; console.log('  PASS  ' + name); }
    else { failed++; console.log('  FAIL  ' + name + (detail ? '\n          ' + detail : '')); }
    return Boolean(cond);
}

/**
 * The generated files the retirement deleted, and the hand-written shim that
 * went with them. chat-server.js held MC_CHAT_OPTS, which nothing reads any
 * more: arcade/index.html used to load it so its status dot could probe 8768,
 * and now loads mp-server.js instead, which reports on the host a game really
 * dials. Recover it from history rather than rewriting it, if chat ever comes
 * back -- its allowlist was the security control, and a fresh shim is where
 * that gets left out.
 */
const RETIRED_FILES = [
    'arcade/shared/adenosine-chat.js',
    'arcade/shared/chat-worker.js',
    'arcade/shared/chat-widget.css',
    'arcade/shared/chat-server.js',
];

/**
 * What a page loading the widget looks like.
 *
 * Plain substrings, because the widget is reached four ways -- a <script src>,
 * a <link rel=stylesheet>, the AdChat global and the MC_CHAT_OPTS the shim
 * sets -- and a page needs to fail this on any one of them.
 */
const REVIVAL_MARKERS = [
    'adenosine-chat.js',
    'chat-widget.css',
    'chat-worker.js',
    'chat-server.js',
    'MC_CHAT_OPTS',
    'ChatWidget',
];

/**
 * A commented-out load, as distinct from prose that happens to name a file.
 *
 * Comments are stripped before the markers above are applied, and the first
 * run of this test is why. arcade/index.html carries a paragraph explaining
 * that it USED to load chat-server.js and dial MC_CHAT_OPTS, and that the
 * status dot now probes multiplayer instead -- which is exactly the history
 * worth keeping, and which named two markers and failed the sweep. Rewording
 * prose to get past a regex is the wrong repair, and an HTML comment cannot
 * load anything, so the markers now see only live markup.
 *
 * That would leave a commented-out <script> tag unexamined, though, and such a
 * tag is one edit from being live. So comments are searched too, for a tag
 * rather than a mention.
 */
const COMMENTED_LOAD =
    /<(?:script|link)\b[^>]*(?:adenosine-chat|chat-widget\.css|chat-worker|chat-server)/i;

/** Every file under `dir` matching `pred`, skipping what is not ours. */
function walk(dir, pred, out = []) {
    let entries;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return out;
    }
    for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, pred, out);
        else if (pred(entry.name)) out.push(full);
    }
    return out;
}

/** Report every marker `text` carries, as "<label>: <marker>" lines. */
function markersIn(text, label) {
    return REVIVAL_MARKERS.filter((m) => text.includes(m)).map((m) => `${label}: ${m}`);
}

/** `html` with every comment removed, and those comments, separately. */
function splitComments(html) {
    const comments = html.match(/<!--[\s\S]*?-->/g) ?? [];
    return { live: html.replace(/<!--[\s\S]*?-->/g, ''), comments };
}

// -- 1. The files are gone ---------------------------------------------------

console.log('the retired assets are not in the tree');
for (const rel of RETIRED_FILES) {
    ok(!existsSync(path.join(ROOT, rel)), rel + ' does not exist',
        'it is back. If that is deliberate it needs adenosine-chat 0.6.1 or newer; see the header.');
}

// -- 2. Nothing asks for them -----------------------------------------------

// Every page the site serves, not only arcade/: ware/ and the top-level pages
// share nav.js and could load the widget just as easily.
console.log('\nno page in the repository loads the widget');
{
    const pages = walk(ROOT, (name) => /\.html?$/i.test(name));

    // A sweep that found no pages would report a clean result over nothing at
    // all, which is the failure this repository keeps meeting. So the corpus
    // is asserted before anything is concluded from it. 361 pages when this
    // was written; the floor is loose enough to survive ordinary pruning and
    // tight enough that a broken walk cannot pass.
    ok(pages.length > 100, `found ${pages.length} pages to scan`,
        'too few pages found: the walk is broken, and a pass here would mean nothing');

    const live = [];
    const commented = [];
    for (const page of pages) {
        const rel = path.relative(ROOT, page);
        const { live: markup, comments } = splitComments(readFileSync(page, 'utf8'));
        live.push(...markersIn(markup, rel));
        if (comments.some((c) => COMMENTED_LOAD.test(c))) {
            commented.push(`${rel}: a commented-out chat tag`);
        }
    }
    ok(live.length === 0, 'no page loads a chat asset or names a chat global',
        live.join('\n          '));
    ok(commented.length === 0, 'no page carries a commented-out chat tag',
        commented.join('\n          '));
}

// -- 3. Neither generator can bring them back -------------------------------

/**
 * The scaffolder runs against a throwaway root rather than this one.
 *
 * It resolves its root from its own path and writes only inside
 * <root>/arcade/<name>/, importing nothing but node builtins, so a copy of the
 * single file in a temp directory generates a complete game there and touches
 * nothing in the repository. Asserting on the real output is worth the copy:
 * grepping the template source would pass on a scaffolder whose chat block had
 * merely moved into a variable, and the generated page is the artifact that
 * would actually ship.
 */
console.log('\nthe scaffolder emits no chat widget');
{
    const tmp = mkdtempSync(path.join(tmpdir(), 'chat-retired-'));
    try {
        const name = 'probe-game';
        mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
        cpSync(path.join(ROOT, 'scripts', 'scaffold-game.mjs'),
            path.join(tmp, 'scripts', 'scaffold-game.mjs'));
        writeFileSync(path.join(tmp, 'scripts', 'new-game.json'), JSON.stringify({
            name, title: 'PROBE GAME', category: 'puzzles',
            description: 'Throwaway game, generated by test-chat-retired.js',
        }));

        const res = spawnSync(process.execPath, [path.join(tmp, 'scripts', 'scaffold-game.mjs')], {
            encoding: 'utf8', shell: false,
        });
        if (ok(res.status === 0, 'the scaffolder ran',
            `exit ${res.status}: ${(res.stderr || '').trim()}`)) {
            const generated = walk(path.join(tmp, 'arcade', name), () => true);
            // Same reasoning as the page corpus above: no files means no
            // findings, and no findings must not read as a pass.
            if (ok(generated.length > 0, `it generated ${generated.length} file(s)`,
                'nothing was generated, so the scan below would prove nothing')) {
                // Comments included here, unlike the page sweep above: the
                // template is entirely ours, so it has no history to preserve
                // and a chat comment in it would only be waiting to be
                // uncommented into every future game.
                const offenders = generated.flatMap(
                    (f) => markersIn(readFileSync(f, 'utf8'), path.relative(tmp, f)));
                ok(offenders.length === 0, 'no generated file references a chat asset or global',
                    offenders.join('\n          '));
            }
        }
    } finally {
        rmSync(tmp, { recursive: true, force: true });
    }
}

/**
 * The sync script is read rather than run, because running it rewrites
 * arcade/shared/ and the ?v= stamp on every page that loads one of those
 * bundles. Reading means a regex, and a regex that stops matching is a check
 * that passes by finding nothing, so each declaration is asserted to have been
 * FOUND, and to have parsed, before it is asserted to be clean.
 */
console.log('\nsync-adenosine.mjs does not re-vendor the bundle');
{
    const source = readFileSync(path.join(ROOT, 'scripts', 'sync-adenosine.mjs'), 'utf8');

    // Only the declarations, never the prose above them: the comments there
    // explain the removal and so name `chat` repeatedly on purpose.
    const arrays = {
        PACKAGES: /^const PACKAGES = \[([^\]]*)\]/m,
        LOCAL_SHARED: /^const LOCAL_SHARED = \[([^\]]*)\]/m,
    };
    for (const [label, re] of Object.entries(arrays)) {
        const m = source.match(re);
        if (!ok(Boolean(m), `${label} was found`,
            'the declaration has been reshaped, so this check can no longer speak to it and must be rewritten')) {
            continue;
        }
        const names = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
        if (!ok(names.length > 0, `${label} parsed (${names.length} entries)`,
            'matched the declaration but read no entries out of it')) {
            continue;
        }
        ok(!names.includes('chat') && !names.includes('chat-server.js'),
            `${label} does not list chat`, `entries: ${names.join(', ')}`);
    }

    // These two are keyed by package short name, so a `chat:` key is the tell.
    for (const label of ['EXTRA_ASSETS', 'PACKAGE_CSS']) {
        const m = source.match(new RegExp('^const ' + label + ' = ([\\s\\S]*?);$', 'm'));
        if (!ok(Boolean(m), `${label} was found`,
            'the declaration has been reshaped, so this check can no longer speak to it and must be rewritten')) {
            continue;
        }
        ok(!/(^|[\s{,])chat\s*:/.test(m[1]), `${label} has no chat entry`, m[1].trim());
    }
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
