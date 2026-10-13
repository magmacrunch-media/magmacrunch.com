// Tests for site/package.mjs: the website build is web/ minus the teaching.
//
// The decision lives in docs/two-builds.md. What is asserted here is the part
// that can go wrong silently: a transform whose anchor stopped matching, which
// would ship the app's half to the website and look like a successful build.
// The build has its own guards and re-reads its output; this runs it from
// scratch and checks the result independently, so a guard that stopped
// guarding is caught too.
//
// Plain Node, hand-rolled harness, exits non-zero on any failure, in the style
// of the other suites here. Nothing to install.

const { execFileSync } = require('node:child_process');
const { existsSync, readFileSync, rmSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { join, resolve } = require('node:path');

const ROOT = resolve(__dirname, '..', '..');
const OUT = join(ROOT, 'site', 'www');
const SRC = join(ROOT, 'web');

// SKIPPED WHERE THE BUILD SCRIPT IS NOT. web/tests/ is copied wholesale into
// the website's arcade/george-boole/ and the website RUNS what it finds there,
// so this suite -- which tests tooling rather than the game -- would fail over
// there against a site/package.mjs that is not part of the browser version.
//
// site/package.mjs drops this file from the build it makes, which covers the
// derived sync. It does NOT cover a plain `make sync-george-boole` from web/,
// which is what the website still does while the two-builds split is parked,
// and that is how this reached the arcade copy and went red. Guarding the file
// itself covers both.
if (!existsSync(join(ROOT, 'site', 'package.mjs'))) {
    console.log('The website build: skipped (no site/package.mjs in this copy)');
    return;
}

let passed = 0;
let failed = 0;

function assert(cond, what) {
    if (cond) {
        passed += 1;
    } else {
        failed += 1;
        console.log('  FAIL: ' + what);
    }
}

function assertEqual(got, want, what) {
    const a = JSON.stringify(got);
    const b = JSON.stringify(want);
    assert(a === b, what + ': got ' + a + ', expected ' + b);
}

console.log('The website build:');

// FROM SCRATCH, deliberately. The build deletes its output first, and a test
// that ran against a directory left by an earlier run would pass on a build
// that no longer works.
rmSync(OUT, { recursive: true, force: true });
assert(!existsSync(OUT), 'starts with no site/www/');

let out = '';
try {
    out = execFileSync(process.execPath, [join(ROOT, 'site', 'package.mjs')], {
        cwd: ROOT,
        encoding: 'utf8',
    });
} catch (e) {
    console.log('  FAIL: the build exited non-zero');
    console.log((e.stdout || '') + (e.stderr || ''));
    process.exit(1);
}

assert(/site\/www\/ built from web\//.test(out), 'it says what it built');
assert(/transforms\s+\d+/.test(out), 'and prints its transform count');

// ── the four files are gone, and nothing points at them ───────────────────

const DROPPED = ['js/tutorial.js', 'js/codex.js', 'css/tutorial.css', 'css/codex.css'];
for (const f of DROPPED) {
    assert(!existsSync(join(OUT, f)), f + ' is not in the website build');
    assert(existsSync(join(SRC, f)), f + ' is still in web/, which stays complete');
}

const html = readFileSync(join(OUT, 'index.html'), 'utf8');
for (const f of DROPPED) {
    assert(!html.includes(f), 'index.html does not reference ' + f);
}

// ── the static entry points go with them ──────────────────────────────────
//
// Both codex links are wired from inside codex.js, so leaving them would not
// throw. It would put two links on a shipped page that do nothing at all,
// which is worse than an error because nothing reports it.

// Four, not three. The plan listed three and this caught the fourth on its
// first run: there is a LEARN button on the menu AND one in the mode picker.
for (const id of ['menuLearn', 'modeLearn', 'stripCodexLink', 'sidePanelCodex']) {
    assert(!html.includes('id="' + id + '"'), '#' + id + ' is gone from the website build');
}

// And the removal took the element, not just the id. A half-removed button
// would leave its label behind in the menu.
assert(!/menu-learn/.test(html), 'the LEARN button is gone, not just its id');
assert(!/>LEARN</.test(html), 'and its label with it');

// ── what must survive ─────────────────────────────────────────────────────
//
// The website keeps the game and every word of the written explanation. If a
// transform ever reaches too far, this is what notices.

assert(/id="loreContinue"/.test(html), 'PLAY is still there');
assert(/id="howToPlayLink"/.test(html), 'and the full rules link');
assert(/id="stripCreditsLink"/.test(html), 'and the credits link beside it');
assert(/class="menu-primary is-solo"/.test(html), 'the menu is single-column without LEARN');

for (const f of ['js/game.js', 'js/main.js', 'js/rules-pages.js', 'js/math-overlay.js']) {
    assert(existsSync(join(OUT, f)), f + ' ships to the website');
    assert(html.includes(f), 'and index.html still loads it');
}

assert(existsSync(join(OUT, 'sw.js')), 'the service worker ships');
assert(existsSync(join(OUT, 'index.html')), 'and the page itself');

// THE GATE REFERENCE STAYS AND IS NOT LEFT LOOKING CLICKABLE.
//
// codex.js wires more than the two links: it also binds every
// `.gate-tag[data-gate]` and `.gate-ref[data-gate]`, which are static markup
// that the website keeps. The risk is a dead affordance -- an element still
// styled as a door with nothing behind it.
//
// It cannot happen, for two independent reasons, and this asserts both because
// either one alone would be enough and neither is obvious. codex.js is what
// adds the `codex-opener` class, and the hover styling for an opener lives in
// codex.css, which this build drops. The plain `.gate-ref:hover` in
// side-panels.css is NOT a codex affordance: it predates the codex by three
// weeks (2026-08-25) and only lightens a border.
assert(/class="gate-tag" data-gate="xor"/.test(html), 'the gate chips stay on the website');
assert(!html.includes('codex-opener'), 'and nothing is left marked as a codex opener');
assert(!existsSync(join(OUT, 'css', 'codex.css')), 'the opener styling went with codex.css');

// ── the stamps are this build's, not web/'s ───────────────────────────────
//
// The point of recomputing here is that a stamp can no longer reach the
// website stale: AGENTS.md records the old failure, where the website's
// pre-commit fixed its copy and the next sync reverted the repair.

const stale = [];
const seen = [];
html.replace(/((?:href|src)=")((?:css|js)\/[^"?]+)\?v=([0-9a-f]{8})/g, (all, pre, file, stamp) => {
    seen.push(file);
    const body = readFileSync(join(OUT, file), 'utf8').replace(/\r\n/g, '\n');
    if (createHash('sha256').update(body).digest('hex').slice(0, 8) !== stamp) stale.push(file);
    return all;
});
assertEqual(stale, [], 'every local stamp matches the file it stamps');
assert(seen.length > 0, 'and there were stamps to check');

// ── the build refuses rather than shipping a half-applied transform ───────
//
// Every anchor in site/package.mjs is a string against hand-written HTML, so
// the realistic failure is one of them silently matching nothing. This proves
// the build dies on that instead of carrying on: feed it a page with the
// LEARN button already absent and it should refuse, because a transform that
// found nothing has not done its job.

const { writeFileSync, mkdirSync, cpSync } = require('node:fs');
const TMP = join(ROOT, 'site', '.test-fixture');
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
cpSync(SRC, join(TMP, 'web'), { recursive: true });
const fixture = join(TMP, 'web', 'index.html');
writeFileSync(
    fixture,
    readFileSync(fixture, 'utf8').replace(/ id="menuLearn"/, ' id="somethingElse"')
);
// The script finds the repo root from its OWN location, so the fixture has to
// reproduce the layout: <root>/site/package.mjs beside <root>/web/.
mkdirSync(join(TMP, 'site'), { recursive: true });
cpSync(join(ROOT, 'site', 'package.mjs'), join(TMP, 'site', 'package.mjs'));

let refused = false;
let why = '';
try {
    // Capture stderr rather than letting it through, which execFileSync does
    // by default: this build is MEANT to fail, and its error message on the
    // console makes a passing run look like a failing one.
    execFileSync(process.execPath, [join(TMP, 'site', 'package.mjs')], {
        cwd: TMP,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    });
} catch (e) {
    refused = true;
    why = (e.stdout || '') + (e.stderr || '');
}
assert(refused, 'a page whose LEARN button cannot be found fails the build');
assert(/menuLearn/.test(why), 'and the error names what it could not find');
rmSync(TMP, { recursive: true, force: true });

console.log('  ' + passed + ' passed' + (failed ? ', ' + failed + ' failed' : ''));
if (failed) process.exit(1);
