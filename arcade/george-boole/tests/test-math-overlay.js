// Run: node web/tests/test-math-overlay.js
const assert = require('node:assert/strict');
const h = require('./dom-harness.cjs')(__dirname + '/..');
const game = h.board();
h.load('js/math-overlay.js');
h.emit('DOMContentLoaded');
const card = () => h.document.querySelector('.math-card');
const operation = {kind:'gate', gate:'XOR', a:5, b:3, result:6, points:6, row:0, col:0};
const show = () => h.emit('boole:operations', {bits:4, operations:[operation]});
show(); assert.ok(card()); assert.equal(card().getAttribute('role'), 'dialog');
assert.equal(h.inputs[0].isActive(), false, 'board pauses while reading');
h.advance(60000); assert.ok(card(), 'math never expires');
assert.equal(h.document.querySelectorAll('.point-label').length, 0, 'score labels still expire');
card().querySelector('.math-dismiss').dispatchEvent({type:'click'});
assert.equal(card(), null); assert.equal(h.inputs[0].isActive(), true);
show(); let prevented = false;
h.emit('keydown', undefined); // unrelated event is harmless
h.document.dispatchEvent({type:'keydown', key:'Escape', preventDefault(){prevented=true;}, stopImmediatePropagation(){}});
assert.ok(prevented); assert.equal(card(), null);
show(); show(); assert.equal(h.document.querySelectorAll('.math-card').length, 1);
for (const event of ['boole:game-over','boole:board-reset','boole:board-closed','boole:mode-picker-open']) {
    show(); h.emit(event); assert.equal(card(), null, event + ' clears math');
}
show(); h.window.dispatchEvent({type:'resize'}); assert.equal(card(), null);
show(); const menu = h.document.createElement('div'); menu.className = 'lore-screen active'; h.document.body.appendChild(menu);
h.flushMutations(); assert.equal(card(), null, 'opening menu clears stale card'); menu.remove();
show(); h.document.getElementById('mathToggle').dispatchEvent({type:'click'});
assert.equal(card(), null); show(); assert.equal(card(), null, 'off setting suppresses math');
assert.equal(h.storage.get('gb_show_math'), 'off');
h.document.getElementById('mathToggle').dispatchEvent({type:'click'}); show(); assert.ok(card());
game.init(); assert.equal(card(), null, 'real reset emits cleanup');
show(); game.destroy(); assert.equal(card(), null, 'real destroy emits cleanup');
console.log('Math card: passed (persistence, input lock, dismissal, settings, lifecycle, labels)');

// The scripted tutorial used to replace the board after 900 ms (1100 ms on
// its last step), independently of the math card's lifetime.
//
// SKIPPED WHERE THE PRIMER IS NOT SHIPPED. site/package.mjs drops
// js/tutorial.js from the website build, and the website runs the suites it is
// sent, so this half would fail there against a file that build deliberately
// does not have. The half above tests the math card itself, which the website
// DOES ship, and that is the coverage worth keeping over there -- so the suite
// narrows rather than being dropped. Same shape as the arrow-label check
// below, and the build fails if any shipped suite stops passing from the copy.
if (!require('node:fs').existsSync(__dirname + '/../js/tutorial.js')) {
    console.log('Tutorial math: skipped (no js/tutorial.js in this build)');
    return;
}

const tutorialHarness = require('./dom-harness.cjs')(__dirname + '/..');
tutorialHarness.board();
tutorialHarness.load('js/math-overlay.js');
// Also run when the independent larger-arrows change has been merged.
if (require('node:fs').existsSync(__dirname + '/../js/arrow-label.js')) {
    tutorialHarness.load('js/arrow-label.js');
}
tutorialHarness.load('js/tutorial.js');
const tutorial = tutorialHarness.window.BooleTutorial;
tutorial.open('board');
const steps = tutorial.lessonById('board').steps;
for (let i = 0; i < steps.length; i++) {
    const board = tutorial.board;
    board.move(steps[i].hint);
    if (i === 0) { tutorialHarness.advance(1000); continue; }
    const result = JSON.stringify(board.board);
    tutorialHarness.advance(60000);
    assert.equal(tutorial.board, board, 'tutorial waits even on the final step');
    assert.equal(JSON.stringify(board.board), result, 'step is not replaced while reading');
    tutorialHarness.document.querySelector('.math-dismiss').dispatchEvent({type:'click'});
    tutorialHarness.advance(1);
    if (i < steps.length - 1) assert.equal(JSON.stringify(board.board), JSON.stringify(steps[i+1].board));
    else assert.equal(tutorial.board, null, 'final dismissal finishes the lesson');
}
tutorial.open('board');
tutorial.board.move(steps[0].hint); tutorialHarness.advance(1000);
tutorial.board.move(steps[1].hint); tutorialHarness.advance(1000);
tutorial.close(); tutorialHarness.advance(1000);
assert.equal(tutorial.board, null, 'leaving while waiting cannot resurrect the lesson');
assert.equal(tutorialHarness.document.querySelector('.math-card'), null);
console.log('Tutorial math: passed (all steps wait for dismissal, final completion, safe exit)');
