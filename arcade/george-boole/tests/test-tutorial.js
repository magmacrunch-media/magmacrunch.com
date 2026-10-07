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
assert(Array.isArray(T.LESSONS), 'LESSONS is an array');
assertEqual(T.LESSONS.length, 4, 'four lessons');
assertEqual(T.LESSONS.map(l => l.id), ['lamps', 'onebit', 'number', 'board'], 'lesson order');
console.log(`  ${passed} passed\n`);

// ── Lamp arithmetic ──────────────────────────────────────────────────────────

console.log('Lamps:');
assertEqual(T.lampSum([0, 0, 0, 0]), 0, 'no lamps is 0');
assertEqual(T.lampSum([1, 1, 1, 1]), 15, 'every lamp is 15');
assertEqual(T.lampSum([0, 1, 1, 0]), 6, '0110 is 6');
assertEqual(T.lampSum([1, 0, 1, 1]), 11, '1011 is 11');
assertEqual(T.lampsOf(6, 4), [0, 1, 1, 0], '6 is 0110');
assertEqual(T.lampsOf(11, 4), [1, 0, 1, 1], '11 is 1011');
assertEqual(T.bitsOf(5, 4), '0101', '5 renders as 0101');

// The working, which is the thing a beginner actually reads.
assertEqual(T.sumLine([0,0,0,0]).expr, 'nothing lit', 'no lamps reads as nothing lit');
assertEqual(T.sumLine([0,0,0,0]).sum, 0, 'and sums to 0');
assertEqual(T.sumLine([0,1,1,0]).expr, '4 + 2', '0110 shows its working');
assertEqual(T.sumLine([0,1,1,0]).sum, 6, 'and sums to 6');
assertEqual(T.sumLine([1,1,1,1]).expr, '8 + 4 + 2 + 1', 'every lamp shows four terms');
assertEqual(T.sumLine([0,0,0,1]).expr, '1', 'one lamp is one term');

const lampTasks = T.lessonById('lamps').tasks;

/**
 * The first step must ask for nothing.
 *
 * This lesson opened on "make 6" and taught nothing: the arithmetic that
 * answers it appeared only in the success message, after it had been solved.
 * The explore step is the fix and it has to stay first, so it is asserted
 * rather than left to whoever edits the list next.
 */
assert(lampTasks[0].explore === true, 'the lamps lesson opens on a step with no target');
assert(!T.lampsSolved(lampTasks[0], [0,0,0,0]), 'which is not already cleared');
assert(T.lampsSolved(lampTasks[0], [0,0,0,1]), 'and is cleared by lighting any lamp');
assert(lampTasks.filter((t) => t.explore).length === 1, 'and there is exactly one of it');

// The targets ramp by how much arithmetic they need. The first real one must
// be a single lamp, so the first thing ever asked for needs no addition at all.
const targets = lampTasks.filter((t) => !t.explore).map((t) => t.want);
assertEqual(targets[0], 1, 'the first target is one lamp and no sum');
assert(targets.every((w, i) => i === 0 || w > targets[i - 1]),
    `targets ascend (${targets.join(' -> ')})`);
targets.forEach((want, i) => {
    const task = lampTasks.filter((t) => !t.explore)[i];
    assert(want >= 1 && want <= 15, `lamps target ${want} fits 4 bits`);
    assert(T.lampsSolved(task, T.lampsOf(want, 4)), `lamps target ${want} is solvable`);
    assert(!T.lampsSolved(task, [0,0,0,0]), `lamps target ${want} is not solved before a tap`);
    // A note must add something the sum does not. The readout shows the
    // working now, so a note of "4 + 2" on the task whose answer is 4 + 2
    // reads as a stutter, which is what they all used to be.
    if (task.note) {
        assert(task.note !== T.sumLine(T.lampsOf(want, 4)).expr,
            `lamps target ${want}: the note does not repeat the sum`);
    }
});
console.log(`  ${passed} passed\n`);

// ── One-bit rules ────────────────────────────────────────────────────────────

console.log('One bit:');
assertEqual([T.oneBit('XOR',0,0), T.oneBit('XOR',0,1), T.oneBit('XOR',1,0), T.oneBit('XOR',1,1)],
    [0,1,1,0], 'XOR table');
assertEqual([T.oneBit('OR',0,0), T.oneBit('OR',0,1), T.oneBit('OR',1,0), T.oneBit('OR',1,1)],
    [0,1,1,1], 'OR table');
assertEqual([T.oneBit('AND',0,0), T.oneBit('AND',0,1), T.oneBit('AND',1,0), T.oneBit('AND',1,1)],
    [0,0,0,1], 'AND table');
assertEqual([T.oneBit('NOT',0,0), T.oneBit('NOT',1,0)], [1,0], 'NOT table');

// Each task must be answerable, or the lesson is a dead end. Brute force the
// four input pairs rather than reasoning about which one works.
//
// And none of them may be answered by the rig's STARTING state, which is both
// lamps off. OR originally asked for a dark output, which is what an untouched
// rig already shows: the lesson opened on a tick nobody had earned, with
// nothing to do and no way to tell a finished task from a broken one. Found by
// playing it rather than by running this file, which is why the assertion is
// here now.
T.lessonById('onebit').tasks.forEach((task) => {
    let reachable = 0;
    for (let a = 0; a < 2; a++) {
        for (let b = 0; b < 2; b++) {
            if (T.oneBitSolved(task, a, b)) reachable++;
        }
    }
    assert(reachable > 0, `onebit ${task.gate} want=${task.want} is reachable`);
    assert(!T.oneBitSolved(task, 0, 0),
        `onebit ${task.gate} is not already solved before the player touches it`);
});
console.log(`  ${passed} passed\n`);

// ── Whole-number gates, and the answers being unique ────────────────────────

console.log('Whole number:');
assertEqual(T.applyGate('XOR', 5, 3, 4), 6, '5 XOR 3 = 6');
assertEqual(T.applyGate('OR', 5, 3, 4), 7, '5 OR 3 = 7');
assertEqual(T.applyGate('AND', 5, 3, 4), 1, '5 AND 3 = 1');
assertEqual(T.applyGate('NOT', 5, null, 4), 10, 'NOT 5 = 10');
assertEqual(T.applyGate('NOT', 15, null, 4), 0, 'NOT 15 = 0');
assertEqual(T.applyGate('NOT', 3, null, 2), 0, 'NOT 3 = 0 in 2-bit');

// The lesson asks "which gate makes n". If two gates make n, the wrong answer
// is marked wrong for a player who was right.
T.lessonById('number').tasks.forEach((task) => {
    const bits = T.lessonById('number').bits;
    const producing = T.gatesProducing(task.a, task.b, task.want, bits);
    assertEqual(producing, [task.answer],
        `${task.a}${task.b === null ? '' : ' and ' + task.b} -> ${task.want} is ${task.answer} alone`);
});
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
