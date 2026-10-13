/**
 * test-tutorial.js: the primer's lesson data, against the real engine.
 *
 * Run: node test-tutorial.js
 *
 * The point of this suite is not the widgets, it is the *claims*. Every prompt
 * in js/tutorial.js names a number, and every one of those numbers came from a
 * probe of BooleBoard rather than from reading moveLeft. That probe is also
 * what caught the height bonus -- a first-time value pays double on top of the
 * gate, so 5 XOR 3 scores 18 on a fresh board and not 6, and four prompts
 * would have been wrong the moment anybody read them.
 *
 * So the board lesson's `expect` is run through a real BooleBoard here. If the
 * gate arithmetic, the merge rule or the overflow bonus ever changes, this
 * fails, instead of the tutorial quietly teaching the wrong game.
 *
 * The same DOM shim as test-game.js, for the same reason: BooleBoard's
 * constructor touches the document, and tutorial.js's own logic half does not.
 */

// ── Minimal DOM shim ─────────────────────────────────────────────────────────

function createMockEl() {
    return {
        style: {},
        classList: { add(){}, remove(){}, contains(){ return false; }, toggle(){} },
        textContent: '',
        innerHTML: '',
        appendChild(){},
        remove(){},
        querySelector(){ return createMockEl(); },
        querySelectorAll(){ return []; },
        addEventListener(){},
        removeEventListener(){},
        getAttribute(){ return ''; },
        setAttribute(){},
        removeAttribute(){},
        dataset: {},
        offsetWidth: 600,
        offsetHeight: 600,
        children: [],
        parentNode: { insertBefore(){}, removeChild(){}, replaceChild(){} },
    };
}

global.document = {
    getElementById(){ return createMockEl(); },
    querySelector(){ return createMockEl(); },
    querySelectorAll(){ return []; },
    createElement(){ return createMockEl(); },
    createTextNode(text){ const node = createMockEl(); node.textContent = text; return node; },
    addEventListener(){},
    removeEventListener(){},
    dispatchEvent(){ return true; },
    documentElement: { style: { setProperty(){}, getPropertyValue(){ return ''; } } },
    body: { appendChild(){}, classList: { add(){}, remove(){}, contains(){ return false; } },
            setAttribute(){} },
};

global.window = {
    location: { search: '', hostname: 'localhost' },
    addEventListener(){},
    innerWidth: 1200,
    innerHeight: 800,
    matchMedia(){ return { matches: false, addEventListener(){} }; },
};

global.localStorage = {
    store: {},
    getItem(k){ return Object.prototype.hasOwnProperty.call(this.store, k) ? this.store[k] : null; },
    setItem(k, v){ this.store[k] = String(v); },
    removeItem(k){ delete this.store[k]; },
};

global.setTimeout = function(){ return 1; };
global.clearTimeout = function(){};
global.currentGame = null;

global.AdPuzzle = { createInput() { return {}; } };
global.AdAudio = { playSfx(){}, playMusic(){ return Promise.resolve(); }, init(){ return Promise.resolve(); } };
global.scoreClient = { save(){ return Promise.resolve(); }, load(){ return Promise.resolve([]); } };

// ── Load game.js then tutorial.js ────────────────────────────────────────────

const fs = require('fs');
const vm = require('vm');

vm.runInThisContext(fs.readFileSync(__dirname + '/../js/arrow-label.js', 'utf8'), { filename: 'arrow-label.js' });
vm.runInThisContext(fs.readFileSync(__dirname + '/../js/game.js', 'utf8'), { filename: 'game.js' });
vm.runInThisContext(fs.readFileSync(__dirname + '/../js/tutorial.js', 'utf8'), { filename: 'tutorial.js' });

const T = global.window.BooleTutorial || global.BooleTutorial;

// ── Harness ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) { passed++; return; }
    failed++;
    console.error(`  FAIL: ${message}`);
}

function assertEqual(actual, expected, message) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a === e) { passed++; return; }
    failed++;
    console.error(`  FAIL: ${message}: got ${a}, expected ${e}`);
}

console.log('=== George Boole primer tests ===\n');

// ── It loaded at all ─────────────────────────────────────────────────────────

console.log('Exports:');
assert(!!T, 'BooleTutorial is exported');

// ONE LESSON, which is the deck being gone rather than the deck being short.
// The primer was fourteen steps across six lessons, and the structure itself
// was the problem: fourteen transitions nobody asked for, nothing
// accumulating across them, and a row of dots for progress, which is a
// reading metaphor. It is a bench now, one screen that grows, and the only
// thing still shaped like a lesson is the scripted board at the end, because
// that one really is a sequence of moves.
assert(Array.isArray(T.LESSONS), 'LESSONS is an array');
assertEqual(T.LESSONS.map(l => l.id), ['board'], 'one lesson left, and it is the board');
console.log(`  ${passed} passed\n`);

// ── The arithmetic the bench is made of ──────────────────────────────────────

console.log('Arithmetic:');
assertEqual(T.lampSum([0, 0, 0, 0]), 0, 'no switches is 0');
assertEqual(T.lampSum([1, 1, 1, 1]), 15, 'every switch is 15');
assertEqual(T.lampSum([0, 1, 1, 0]), 6, '0110 is 6');
assertEqual(T.lampSum([1, 0, 1, 1]), 11, '1011 is 11');
assertEqual(T.lampsOf(6, 4), [0, 1, 1, 0], '6 is 0110');
assertEqual(T.bitsOf(5, 4), '0101', '5 renders as 0101');
assertEqual(T.sumLine([0, 1, 1, 0]).expr, '4 + 2', '0110 shows its working');
assertEqual(T.sumLine([0, 1, 1, 0]).sum, 6, 'and sums to 6');

assertEqual([T.oneBit('XOR',0,0), T.oneBit('XOR',0,1), T.oneBit('XOR',1,0), T.oneBit('XOR',1,1)],
    [0,1,1,0], 'XOR table');
assertEqual([T.oneBit('OR',0,0), T.oneBit('OR',0,1), T.oneBit('OR',1,0), T.oneBit('OR',1,1)],
    [0,1,1,1], 'OR table');
assertEqual([T.oneBit('AND',0,0), T.oneBit('AND',0,1), T.oneBit('AND',1,0), T.oneBit('AND',1,1)],
    [0,0,0,1], 'AND table');
assertEqual([T.oneBit('NOT',0,0), T.oneBit('NOT',1,0)], [1,0], 'NOT table');

assertEqual(T.applyGate('XOR', 5, 3, 4), 6, '5 XOR 3 = 6');
assertEqual(T.applyGate('OR', 5, 3, 4), 7, '5 OR 3 = 7');
assertEqual(T.applyGate('AND', 5, 3, 4), 1, '5 AND 3 = 1');
assertEqual(T.applyGate('NOT', 5, null, 4), 10, 'NOT 5 = 10');
assertEqual(T.applyGate('NOT', 15, null, 4), 0, 'NOT 15 = 0, which is the overflow');

// The column working the wide bench draws, and the sentence it is there to
// make: a gate does not know what 5 is, it runs the same one-bit rule once
// per column and nothing carries between them.
const cols = T.columnWork('XOR', 5, 3, 4);
assertEqual(cols.length, 4, 'four columns');
assertEqual(cols.map((c) => c.weight), [8, 4, 2, 1], 'weighted high to low');
assertEqual(cols.map((c) => c.result).join(''), '0110', 'and they spell the answer');
cols.forEach((c) => {
    assertEqual(c.result, T.oneBit('XOR', c.a, c.b),
        `column ${c.weight} is the one-bit rule and nothing more`);
});
console.log(`  ${passed} passed\n`);

// ── The bench ────────────────────────────────────────────────────────────────
//
// Ten things to find, and the apparatus derived from which of them have
// been. The checks are pure functions over a LOG of observations, which is
// what makes them testable at all: a bench state is where the switches are,
// and a discovery is something about where they have BEEN.
//
// COUNTING COMES FIRST and the gates come second, which is the reverse of
// how this started. `six` and `max` used to be sixth and seventh, behind
// NOT, AND, OR and XOR, so the player met four logic rules before meeting
// the thing the rules operate on -- and "four switches are a number" is what
// the entire board rests on. The order is asserted here because it is a
// decision about teaching rather than an implementation detail.

console.log('The bench:');
const IDS = ['both', 'count', 'six', 'max', 'not', 'and', 'or', 'xor', 'cross', 'over'];
assertEqual(T.DISCOVERIES.map((d) => d.id), IDS, 'ten discoveries, in order');
assert(IDS.indexOf('max') < IDS.indexOf('not'),
    'every counting discovery comes before every gate');
T.DISCOVERIES.forEach((d) => {
    assert(typeof d.text === 'string' && d.text.length, `${d.id} says what to do`);
    assert(typeof d.check === 'function', `${d.id} can be checked`);
    assertEqual(T.discoveryById(d.id), d, `${d.id} is findable by id`);
    // THE WIDTH IS A FIELD, NOT A SENTENCE. It used to be carried in the
    // prose as a direction -- "go back to one switch, and see what NOT
    // does..." -- which goes stale the moment the player is already there,
    // and the bench OPENS at one switch. So the task read as an instruction
    // already carried out, while the only control on screen offered the
    // opposite. As a field the apparatus can show it only when it is not
    // already true.
    assert(d.bits === 1 || d.bits === 4, `${d.id} declares the width it is about`);
});

// And the prose must not go back to giving directions, which is the thing
// that broke rather than the particular wording.
T.DISCOVERIES.forEach((d) => {
    assert(!/\b(go back to|widen|narrow)\b/.test(d.text),
        `${d.id} says what to learn, not where to stand`);
});
assertEqual(T.discoveryById('nope'), null, 'and an unknown id is null');

/**
 * ONE NEW THING AT A TIME, which was the deck's rule and is still the
 * bench's, enforced on the unlock chain rather than on a list of lessons.
 *
 * The deck got this wrong once: a rung arrived carrying a second switch AND
 * a gate, and it was reported as much harder than the two before it. The
 * same mistake here would be a discovery that bolts on two things at once,
 * so the apparatus is asserted step by step as the chain is walked.
 */
const SHAPE = [
    { after: [],        socket: false, rows: 1, gates: [],                              wide: false, step: false },
    { after: ['both'],  socket: false, rows: 1, gates: [],                              wide: true,  step: true },
    { after: ['count'], socket: false, rows: 1, gates: [],                              wide: true,  step: false },
    { after: ['six'],   socket: false, rows: 1, gates: [],                              wide: true,  step: false },
    { after: ['max'],   socket: true,  rows: 1, gates: ['NOT'],                         wide: true,  step: false },
    { after: ['not'],   socket: true,  rows: 2, gates: ['NOT', 'AND'],                  wide: true,  step: false },
    { after: ['and'],   socket: true,  rows: 2, gates: ['NOT', 'AND', 'OR'],            wide: true,  step: false },
    { after: ['or'],    socket: true,  rows: 2, gates: ['NOT', 'AND', 'OR', 'XOR'],     wide: true,  step: false },
    { after: ['xor'],   socket: true,  rows: 2, gates: ['NOT', 'AND', 'OR', 'XOR'],     wide: true,  step: false },
];
let held = [];
SHAPE.forEach((want) => {
    held = held.concat(want.after);
    const gear = T.apparatus(held);
    const where = held.length ? `after ${held[held.length - 1]}` : 'at the start';
    assertEqual(gear.socket, want.socket, `${where}: socket is ${want.socket}`);
    assertEqual(gear.rows, want.rows, `${where}: ${want.rows} row(s)`);
    assertEqual(gear.gates, want.gates, `${where}: gates are ${want.gates.join('/') || 'none'}`);
    assertEqual(gear.canWiden, want.wide, `${where}: widening is ${want.wide}`);
    assertEqual(gear.stepper, want.step, `${where}: the +1 button is ${want.step}`);
});

// THE ODOMETER IS WITHDRAWN, and the row above is where that is asserted.
// It is the one piece of apparatus that goes away again, which is on
// purpose: `six` and `max` ask the player to place the bits themselves, and
// a button that walks to any number on the player's behalf turns that into
// the task it was meant to follow.
assert(T.apparatus(['both']).stepper && !T.apparatus(['both', 'count']).stepper,
    'the +1 button arrives with the width and leaves when counting is done');

/**
 * Walking the chain, each step introduces at most one new IDEA.
 *
 * Ideas, and not parts, which is the whole of why this is written out
 * rather than counted. Some pieces of apparatus arrive together because
 * neither means anything without the other, and calling those two things is
 * pedantry that would argue for a worse bench:
 *
 *  - a socket and the first gate to put in it. An empty socket teaches
 *    nothing, and NOT with nowhere to sit is not on the bench at all.
 *  - a second row and the first gate that reads two. A row with no binary
 *    gate can do nothing, and AND with one row has nothing to compare.
 *    "Combining two inputs" is ONE idea wearing two parts.
 *  - the width and the odometer. Three more switches with no way to drive
 *    them is a bigger bench and not a new thought; the thought is that four
 *    switches are a NUMBER, and watching one count is how that is shown.
 *
 * A gate arriving on its own is different and does count: OR and XOR are
 * each a new rule on apparatus the player already has.
 *
 * The first version of this counted parts, failed on the first two links,
 * and would have had me reordering a chain that is correct. That is the
 * second time in this file an invariant has been slightly wrong and
 * reported the code as wrong instead of itself, which is worth the words:
 * an assertion is a claim about the design and deserves the same scrutiny.
 */
let before = T.apparatus([]);
IDS.forEach((id, i) => {
    const after = T.apparatus(IDS.slice(0, i + 1));
    const gotSocket = after.socket && !before.socket;
    const gotRow = after.rows > before.rows;
    const gotGate = after.gates.length > before.gates.length;
    const gotWidth = after.canWiden && !before.canWiden;
    // A gate that arrives alongside the socket or the second row is part of
    // that idea rather than another one.
    const added = (gotSocket ? 1 : 0)
        + (gotRow ? 1 : 0)
        + (gotGate && !gotSocket && !gotRow ? 1 : 0)
        + (gotWidth ? 1 : 0);
    assert(added <= 1, `${id} introduces one idea, not ${added}`);
    assert(after.rows >= before.rows, `${id} never takes a row away`);
    assert(after.gates.length >= before.gates.length, `${id} never takes a gate away`);
    assert(!(gotRow && after.rows - before.rows > 1), `${id} adds at most one row`);
    before = after;
});

// The list shows the next few and never all ten. All of it at once is a
// syllabus; three is a direction.
assertEqual(T.stillToFind([], 3).map((d) => d.id), ['both', 'count', 'six'],
    'the list opens on the first three');
assertEqual(T.stillToFind(['both', 'count'], 3).map((d) => d.id), ['six', 'max', 'not'],
    'and moves along as they are found');
assertEqual(T.stillToFind(IDS, 3), [], 'and empties');

/**
 * NEW APPARATUS ARRIVES ON A CLEARED BENCH.
 *
 * The bug this exists for: `max` is "make 15", so earning it leaves the row
 * holding 1111 -- and what it grants is the socket with NOT in it. The bench
 * then computed NOT 1111 = 0000 and handed over `over`, the TENTH discovery,
 * "NOT the biggest number there is, and watch it fall to nothing", before
 * the player had reached the fifth and without them touching anything.
 *
 * The general fault is a newly socketed gate reporting on a number set for a
 * different purpose, so the rule is general: anything that grants apparatus
 * clears the rows.
 */
assert(T.grantsApparatus(['max']), 'finding max grants the socket, so the bench clears');
assert(T.grantsApparatus(['both']), 'and both grants the width and the odometer');
assert(!T.grantsApparatus(['six']), 'six grants nothing, so it disturbs nothing');
assert(!T.grantsApparatus([]), 'and finding nothing grants nothing');
assert(!T.grantsApparatus(['cross', 'over']),
    'the last two grant nothing either, so the bench is left as the player set it');
assert(T.grantsApparatus(['six', 'max']), 'any one of several is enough');

// `over` is still reachable, by the player doing it rather than by the bench
// being left standing on it. The check is unchanged; only the state is.
assert(T.DISCOVERIES.filter((d) => d.unlocks).map((d) => d.id).join() === 'both,max,not,and,or',
    'exactly five discoveries hand over new apparatus');

/** Drive a log the way the bench does, so the checks are tested as used. */
function log(...obs) {
    const out = [];
    obs.forEach((o) => T.observe(out, {
        bits: o.bits, rows: o.rows || 1, gate: o.gate || null,
        a: o.a, b: o.b || 0, out: o.out, via: o.via || null,
    }));
    return out;
}

/** Counting from 0 to 15 on the odometer, as a log. */
function counted() {
    const obs = [];
    for (let n = 0; n <= 15; n += 1) obs.push({ bits: 4, a: n, out: n, via: 'step' });
    return log(...obs);
}

// observe() dedupes on everything that makes an observation distinct, so
// flipping a switch back and forth does not fill the log with repeats.
const dedupe = log({ bits: 1, a: 1, out: 1 }, { bits: 1, a: 1, out: 1 });
assertEqual(dedupe.length, 1, 'the same observation is recorded once');
assertEqual(log({ bits: 1, a: 0, out: 0 }, { bits: 1, a: 1, out: 1 }).length, 2,
    'and a different one is recorded');

const check = (id, l) => T.discoveryById(id).check(l);

assert(!check('both', log({ bits: 1, a: 1, out: 1 })), 'one state is not both');
assert(check('both', log({ bits: 1, a: 0, out: 0 }, { bits: 1, a: 1, out: 1 })),
    'off and on is both');

assert(!check('not', log({ bits: 1, gate: 'NOT', a: 0, out: 1 })), 'one row is not NOT learned');
assert(check('not', log({ bits: 1, gate: 'NOT', a: 0, out: 1 },
                        { bits: 1, gate: 'NOT', a: 1, out: 0 })), 'both rows is');

// The ways to light each gate, which is what the gate discoveries count and
// what separates them from one another.
assert(check('and', log({ bits: 1, rows: 2, gate: 'AND', a: 1, b: 1, out: 1 })),
    'AND wants its one way');
assert(!check('and', log({ bits: 1, rows: 2, gate: 'AND', a: 1, b: 0, out: 0 })),
    'and a dark row is not it');
assert(!check('or', log({ bits: 1, rows: 2, gate: 'OR', a: 0, b: 1, out: 1 },
                        { bits: 1, rows: 2, gate: 'OR', a: 1, b: 0, out: 1 })),
    'two of OR three ways is not all of them');
assert(check('or', log({ bits: 1, rows: 2, gate: 'OR', a: 0, b: 1, out: 1 },
                       { bits: 1, rows: 2, gate: 'OR', a: 1, b: 0, out: 1 },
                       { bits: 1, rows: 2, gate: 'OR', a: 1, b: 1, out: 1 })),
    'three is');
assert(check('xor', log({ bits: 1, rows: 2, gate: 'XOR', a: 0, b: 1, out: 1 },
                        { bits: 1, rows: 2, gate: 'XOR', a: 1, b: 0, out: 1 })),
    'XOR wants its two');

// The wide half, where the switches become a number.
//
// `count` wants EVERY value, not the last one, because the lesson is in the
// carries: 7 to 8 turns three switches off and a fourth on in a single tick,
// and a player who sets 15 by hand never sees that happen.
assert(check('count', counted()), 'all sixteen is counting');
assert(!check('count', log({ bits: 4, a: 15, out: 15, via: 'step' })),
    'and arriving at 15 alone is not');
const nearly = counted().filter((o) => o.a !== 8);
assert(!check('count', nearly), 'fifteen of sixteen is not either');

// AND THE TWO AFTER IT MUST NOT BE SOLVED BY IT. The odometer passes through
// 6 and 15 on its way, so a check that only asked for the number would read
// done the moment it was offered -- the fault this bench has had once
// already, where a task was complete before the player touched anything.
// `via` is what keeps a counted 6 and a placed 6 apart.
assert(!check('six', counted()), 'counting past 6 does not place 6');
assert(!check('max', counted()), 'nor past 15');
assert(check('six', log({ bits: 4, a: 6, out: 6 })), 'six is six, set by hand');
assert(!check('six', log({ bits: 1, a: 6, out: 6 })), 'but not at one switch a row');
assert(check('max', log({ bits: 4, a: 15, out: 15 })), 'fifteen is the most four hold');

// Which only works because the log keeps both: the dedupe key carries `via`,
// so a number counted to and the same number set by hand are two records and
// not one. Drop it from the key and the second is silently discarded,
// leaving `six` unearnable for a player who counted first.
const bothWays = log({ bits: 4, a: 6, out: 6, via: 'step' }, { bits: 4, a: 6, out: 6 });
assertEqual(bothWays.length, 2, 'counted to and placed are separate observations');
assert(check('six', bothWays), 'and the placed one still earns it');
assert(check('cross', log({ bits: 4, rows: 2, gate: 'XOR', a: 5, b: 3, out: 6 })),
    'a gate across two whole numbers');
assert(!check('cross', log({ bits: 4, rows: 2, gate: 'XOR', a: 5, b: 0, out: 5 })),
    'and not with nothing in the second row');
assert(!check('cross', log({ bits: 4, rows: 2, gate: 'NOT', a: 5, b: 3, out: 10 })),
    'and not through NOT, which only reads one of them');
assert(check('over', log({ bits: 4, gate: 'NOT', a: 15, out: 0 })),
    'NOT the biggest number is the overflow');
assert(!check('over', log({ bits: 4, gate: 'NOT', a: 14, out: 1 })),
    'and NOT anything else is not');

// newlyFound reports what a log has earned that the list does not have yet,
// and never re-reports something already banked.
const full = log({ bits: 1, a: 0, out: 0 }, { bits: 1, a: 1, out: 1 });
assertEqual(T.newlyFound(full, []), ['both'], 'a fresh log earns what it has');
assertEqual(T.newlyFound(full, ['both']), [], 'and does not earn it twice');
console.log(`  ${passed} passed\n`);

// ── The board lesson, against a real BooleBoard ─────────────────────────────
//
// This is the suite's reason for existing. Each scripted step is played on a
// real board and its claimed score and resulting top row are asserted.

console.log('Board lesson, on a real BooleBoard:');
const boardLesson = T.lessonById('board');
assert(Array.isArray(boardLesson.steps) && boardLesson.steps.length === 4, 'four scripted steps');

boardLesson.steps.forEach((s, i) => {
    const game = new BooleBoard('4', 15);
    game.board = s.board.map(r => r.slice());
    game.score = 0;
    game.moves = 0;
    // The suppression tutorial.js applies in loadStep. Without it every step
    // also pays the first-time height bonus and no prompt here is true.
    game.highestValueEver = game.maxValue;
    game.personalBestBoard = Array(4).fill().map(() => Array(4).fill(false));

    const moved = game.move(s.hint);

    assert(moved, `step ${i + 1}: swiping ${s.hint} moves something`);
    assertEqual(game.score, s.expect.score, `step ${i + 1}: scores ${s.expect.score}`);
    assertEqual(game.board[0], s.expect.top, `step ${i + 1}: top row ends ${JSON.stringify(s.expect.top)}`);
});

/**
 * The step must not be solvable by flailing.
 *
 * It deliberately does NOT require the hinted direction to be the only one
 * that works: a single row compacts the same way left and right, so every one
 * of these is solvable both ways, and the first version of the lesson told a
 * player who swiped right that they had got it wrong. What matters is that at
 * least one direction does not solve it, so the player's input is doing
 * something rather than anything.
 */
boardLesson.steps.forEach((s, i) => {
    const solving = ['left', 'right', 'up', 'down'].filter((dir) => {
        const game = new BooleBoard('4', 15);
        game.board = s.board.map(r => r.slice());
        game.score = 0;
        game.highestValueEver = game.maxValue;
        game.personalBestBoard = Array(4).fill().map(() => Array(4).fill(false));
        game.move(dir);
        return game.score === s.expect.score;
    });
    assert(solving.indexOf(s.hint) !== -1, `step ${i + 1}: the hinted ${s.hint} solves it`);
    assert(solving.length < 4, `step ${i + 1}: not every direction solves it (${solving.join(',')})`);
});
console.log(`  ${passed} passed\n`);

// ── The scripted board cannot reach the scoreboard ──────────────────────────
//
// The one real risk in reusing BooleBoard. handleGameOver is the only path
// that writes a score, so a lesson that can reach it can put a tutorial run on
// the leaderboard.

console.log('Scripted board is sealed off:');
try {
    const saved = [];
    global.scoreClient = { save(...args) { saved.push(args); return Promise.resolve(); },
                           load() { return Promise.resolve([]); } };

    // tutorial.js builds the subclass inside a closure, so reach it the way
    // the game does: open the board lesson and read what it put in place.
    T.reset();
    T.open('board');
    const board = T.board;
    assert(!!board, 'the board lesson created a board');

    if (board) {
        assert(board instanceof BooleBoard, 'it is a real BooleBoard');
        board._arrivals.set(0, 'merged');
        board.loadStep(boardLesson.steps[0].board);
        assertEqual(board._arrivals.size, 0, 'a fresh lesson clears the previous step origin labels');
        assertEqual(board.checkGameOver(), false, 'checkGameOver is stubbed false');

        // Fill it solid, which on a real board is game over, and confirm
        // nothing is submitted.
        board.board = Array(4).fill().map(() => Array(4).fill(1));
        board.handleGameOver();
        assertEqual(saved.length, 0, 'handleGameOver submits nothing');

        // The randomness chokepoint is closed, so the script owns the board.
        const before = JSON.stringify(board.board);
        board.addRandomTile();
        assertEqual(JSON.stringify(board.board), before, 'addRandomTile places nothing');
    }
} catch (e) {
    failed++;
    console.error(`  FAIL: scripted board threw ${e.message}`);
}
console.log(`  ${passed} passed\n`);

// ── Progress ─────────────────────────────────────────────────────────────────

console.log('Progress:');
try {
    T.reset();
    assertEqual(T.progress().lessons, [], 'reset clears progress');
    assertEqual(T.complete(), false, 'not complete when empty');
} catch (e) {
    failed++;
    console.error(`  FAIL: progress threw ${e.message}`);
}
console.log(`  ${passed} passed\n`);

// ── Result ───────────────────────────────────────────────────────────────────

console.log('─'.repeat(50));
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
