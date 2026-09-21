/**
 * test-page.js -- static guards on the shipped page.
 *
 * These are facts about index.html and style.css that no headless run of the
 * effects can see, and that break silently in the browser. Each one below has
 * already been wrong at least once.
 *
 * Parsed with indexOf rather than regex, deliberately: CLAUDE.md records that a
 * quoted bash heredoc mangles backslashes on this machine, and a test file full
 * of escaped regex is the sort of thing that gets rewritten through one.
 *
 * Run: node test-page.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
const titleJs = fs.readFileSync(path.join(ROOT, 'js', 'title.js'), 'utf8');
const toastCss = fs.readFileSync(path.join(ROOT, '..', 'shell', 'toast.css'), 'utf8');

let passed = 0, failed = 0;

function ok(cond, name, detail) {
    if (cond) { passed++; console.log('  PASS  ' + name); }
    else { failed++; console.log('  FAIL  ' + name + (detail ? '\n          ' + detail : '')); }
}

function eq(actual, expected, name) {
    ok(actual === expected, name, 'got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected));
}

/** The body of the first rule whose selector text matches, braces included. */
function ruleBody(source, selector) {
    const at = source.indexOf(selector);
    if (at === -1) return null;
    const open = source.indexOf('{', at);
    const close = source.indexOf('}', open);
    if (open === -1 || close === -1) return null;
    return source.slice(open + 1, close);
}

/** HTML with comments removed, so a comment mentioning markup is not parsed. */
function stripComments(source) {
    let out = '';
    let at = 0;
    for (;;) {
        const open = source.indexOf('<!--', at);
        if (open === -1) { out += source.slice(at); return out; }
        out += source.slice(at, open);
        const close = source.indexOf('-->', open);
        if (close === -1) return out;
        at = close + 3;
    }
}

function numberAfter(body, key) {
    if (!body) return NaN;
    const at = body.indexOf(key);
    if (at === -1) return NaN;
    return parseInt(body.slice(at + key.length), 10);
}

console.log('\n=== the app name lives in one place ===');

// The name is provisional. A rename is cheap only while nothing derives a
// literal from it, so the heading is the single source and title.js reads it.
/* Comments are stripped before this is parsed, and the result is sanity
   checked, because both halves were wrong on the first run of this file.

   index.html carries a comment reading "js/title.js reads the <h1> below", and
   a bare indexOf found that rather than the element. The "wordmark" came out as
   eight hundred characters of markup, which is trivially not present in
   title.js, so the rename guard below reported PASS while checking nothing at
   all. That is the shape the root CLAUDE.md keeps warning about, and the exit
   code was green; only reading the printed value showed it.

   Hence the two assertions after it. A wordmark that is long, or that contains
   markup, means the parse found the wrong thing, and saying so is what stops
   this passing by finding nothing a second time. */
const markup = stripComments(html);
const h1At = markup.indexOf('<h1');
const h1Open = markup.indexOf('>', h1At);
const h1Close = markup.indexOf('</h1>', h1Open);
ok(h1At !== -1 && h1Close !== -1, 'index.html has an h1 to read the wordmark from');

const wordmark = markup.slice(h1Open + 1, h1Close).trim();
ok(wordmark.length > 0, 'the h1 carries a wordmark', 'title.js removes the splash entirely if it does not');
ok(wordmark.length < 40, 'the wordmark is short, so the parse found an element',
    'got ' + wordmark.length + ' characters, which means indexOf matched prose');
ok(wordmark.indexOf('<') === -1, 'the wordmark is text, not markup',
    'got ' + JSON.stringify(wordmark.slice(0, 60)));

// The guard that matters. It fails the moment somebody hardcodes the name into
// the title screen, which is the one file most likely to want to.
ok(titleJs.indexOf(wordmark) === -1,
    'js/title.js does not hardcode the wordmark (' + JSON.stringify(wordmark) + ')',
    'it must read the heading, so a rename stays a markup change');

// Absence alone would also pass on a title.js that had stopped drawing a
// wordmark at all, so assert the mechanism as well as the absence.
ok(titleJs.indexOf('header h1') !== -1,
    'js/title.js reads the wordmark from the heading');

console.log('\n=== the title screen is wired up ===');

ok(html.indexOf('js/title.js?v=') !== -1, 'index.html loads js/title.js with a cache-buster');
ok(html.indexOf('id="titleScreen"') !== -1, 'the overlay element is present');
ok(html.indexOf('id="titleCanvas"') !== -1, 'the canvas title.js draws into is present');

// title.js is last on purpose: it reads the effect registry that the effect
// files fill in, and an empty registry would silently draw a clean wordmark.
const titleTagAt = html.indexOf('js/title.js?v=');
const lastEffectAt = html.lastIndexOf('js/effects/');
ok(lastEffectAt !== -1 && titleTagAt > lastEffectAt,
    'title.js loads after the effects it draws with',
    'an empty registry makes every apply() a no-op and the glitch just stops');

console.log('\n=== stacking and hiding ===');

const titleRule = ruleBody(css, '.title-screen {');
ok(titleRule !== null, '.title-screen rule exists');
ok(titleRule !== null && titleRule.indexOf('position: fixed') !== -1,
    '.title-screen is fixed to the viewport');

// It must outrank the shell's toast, or a toast fired during the splash paints
// over the top of it.
const titleZ = numberAfter(titleRule, 'z-index:');
const toastZ = numberAfter(ruleBody(toastCss, '.toast'), 'z-index:');
ok(Number.isFinite(titleZ) && Number.isFinite(toastZ) && titleZ > toastZ,
    'the title screen outranks the shell toast (' + titleZ + ' > ' + toastZ + ')');

/* `.prop-group` sets `display: flex`, which beats the user-agent stylesheet's
   `[hidden] { display: none }` outright, so without an author rule the hidden
   attribute hides nothing. That was the live state until 2026-09-19: the COLOR
   picker and both gradient swatches showed under every source. Nothing in
   JavaScript could notice, because `el.hidden` reads back true either way. */
const hiddenRule = ruleBody(css, '.prop-group[hidden]');
ok(hiddenRule !== null && hiddenRule.indexOf('display: none') !== -1,
    'style.css neutralises display for a hidden .prop-group',
    'without it the SEED row and both colour pickers show under every source');

console.log('\n=== the phone layout ===');

// Measured before Phase 3, at 375 by 812: the canvas rendered at 2 by 2 pixels
// and the chain panel ran 145px off the edge. The notice that apologised for
// that is gone because the thing it apologised for is.
ok(markup.indexOf('mobile-notice') === -1, 'the "use a desktop" notice is gone');
ok(html.indexOf('id="chainChips"') !== -1, 'the chip row is present');
ok(html.indexOf('class="mobile-bar"') !== -1, 'the phone action bar is present');

{
    /* Every button in the bar forwards a click to a control by id. A mistyped
     * id is the silent failure this invites: the button renders, takes the
     * tap, finds nothing, and does nothing, with no error anywhere. So every
     * target is checked to exist, and the list is checked to be non-empty so
     * this cannot pass by finding no buttons at all. */
    const targets = [];
    let at = 0;
    for (;;) {
        const found = markup.indexOf('data-forward="', at);
        if (found === -1) break;
        const start = found + 'data-forward="'.length;
        const end = markup.indexOf('"', start);
        targets.push(markup.slice(start, end));
        at = end;
    }
    ok(targets.length >= 4, 'the bar forwards at least four actions (' + targets.join(', ') + ')');
    for (const id of targets) {
        ok(markup.indexOf('id="' + id + '"') !== -1, 'the bar forwards to #' + id + ', which exists',
            'a forward to a missing id renders a button that silently does nothing');
    }
}

{
    /* The layout query is about shape, not only width. The plan said 768 and
     * wider should keep three panels; measured at the same width, stacking
     * gave the picture 441 by 441 and three panels gave it 219 by 219. A
     * width-only query would send every portrait iPad to the smaller one. */
    const phoneQuery = '(max-width: 768px), (orientation: portrait) and (max-width: 1100px)';
    ok(css.indexOf('@media ' + phoneQuery) !== -1, 'the phone layout covers portrait tablets as well as phones');
    ok(css.indexOf('@media (max-width: 768px) {') === -1,
        'and no width-only phone query is left behind to disagree with it');

    // Touch sizing belongs to the finger, not the width, so a tablet in
    // landscape, laid out in three panels, still gets controls it can hit.
    const coarse = css.indexOf('@media (pointer: coarse)');
    ok(coarse !== -1, 'touch targets are keyed on pointer: coarse');
    const coarseBlock = coarse === -1 ? '' : css.slice(coarse, css.indexOf('\n}', coarse));
    ok(coarseBlock.indexOf('-webkit-slider-thumb') !== -1, 'and that is where the big slider thumb lives');
}

{
    /* The toast is lifted clear of the bar with a MARGIN, and this is the
     * guard on that choice, because both obvious alternatives are wrong and
     * one of them looks like it works.
     *
     * Overriding `bottom` does nothing: ware/shell/toast.js writes `bottom` as
     * an inline style, which beats any stylesheet rule, so the override
     * matches, loses, and the toast stays on top of DICE and UNDO. Adding
     * !important would win, and would pin every toast to one line, because
     * toast.js stacks them by giving each a larger `bottom`. */
    const toastRule = css.indexOf('.toast {', css.indexOf('@media (max-width: 768px), (orientation: portrait)'));
    const body = toastRule === -1 ? '' : css.slice(toastRule, css.indexOf('}', toastRule));
    ok(body.indexOf('margin-bottom') !== -1, 'the phone toast is lifted with margin-bottom');
    // "margin-bottom:" contains "bottom:", so count both: every bottom must be
    // part of a margin-bottom, and none may stand alone.
    const bottoms = body.split('bottom:').length - 1;
    const margins = body.split('margin-bottom:').length - 1;
    eq(bottoms, margins, 'and sets no plain bottom, which toast.js sets inline and would win');
    ok(body.indexOf('!important') === -1, 'and does not reach for !important, which would break stacking');
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
