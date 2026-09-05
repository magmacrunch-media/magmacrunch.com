/**
 * test-scoring.js — Cribbage scoring rules, as the browser gets them.
 *
 * These cases were written against a local scorer, added when
 * AdCards.CribbageHandEval built runs out of pegging values (so J-Q-K was
 * three tens, not a run), paid every sub-run of a sequence (2-3-4-5 scored 10
 * rather than 4), and returned early on thirty-one (dropping a run the same
 * card completed). adenosine-cards 0.9.0 fixes all three, so the game scores
 * through the package again and these run against it instead.
 *
 * They load arcade/shared/adenosine-cards.js — the bundle the page actually
 * loads — rather than the npm entry point, so a stale sync cannot pass here
 * and fail in a browser.
 *
 * Run: node test-scoring.js
 */

const { readFileSync } = require('node:fs');
const { join } = require('node:path');

// The bundle is an IIFE assigning `var AdCards`. Evaluated as a function body,
// that binding is local, so returning it hands back the same object the page
// would see on window.
const BUNDLE = join(__dirname, '..', '..', 'shared', 'adenosine-cards.js');
const AdCards = new Function(`${readFileSync(BUNDLE, 'utf8')}\nreturn AdCards;`)();

const Eval = AdCards.CribbageHandEval;
const SCORE = AdCards.CRIBBAGE_SCORE;

let passed = 0;
let failed = 0;

function check(name, actual, expected) {
    if (actual === expected) {
        passed++;
    } else {
        failed++;
        console.error(`FAIL  ${name}\n        expected ${expected}, got ${actual}`);
    }
}

// 'Kh' -> king of hearts. Suits are h/d/c/s.
const SUITS = { h: 'hearts', d: 'diamonds', c: 'clubs', s: 'spades' };
function card(text) {
    return { rank: text.slice(0, -1), suit: SUITS[text.slice(-1)] };
}
function hand(...texts) {
    return texts.map(card);
}

// countFifteens returns how many subsets make fifteen; every other count*
// returns points. Scored here so the expectations below stay in points.
const fifteens = (cards) => Eval.countFifteens(cards) * SCORE.FIFTEEN;

// ── Card values ──────────────────────────────────────────────────────────────
check('ace counts one', Eval.value('A'), 1);
check('king counts ten', Eval.value('K'), 10);
check('queen counts ten', Eval.value('Q'), 10);
check('jack counts ten', Eval.value('J'), 10);
check('king orders thirteenth', Eval.order('K'), 13);
check('jack orders eleventh', Eval.order('J'), 11);

// ── Fifteens ─────────────────────────────────────────────────────────────────
check('ten and five', fifteens(hand('10h', '5s')), 2);
check('king and five', fifteens(hand('Kh', '5s')), 2);
check('king and two is not fifteen', fifteens(hand('Kh', '2s')), 0);
check('A-2-3-4-5', fifteens(hand('Ah', '2s', '3d', '4c', '5h')), 2);
check('four court cards and a five, four ways',
    fifteens(hand('Jh', 'Qs', 'Kd', '10c', '5h')), 8);

// ── Pairs ────────────────────────────────────────────────────────────────────
check('a pair', Eval.countPairs(hand('7h', '7s')), 2);
check('pair royal', Eval.countPairs(hand('7h', '7s', '7d')), 6);
check('double pair royal', Eval.countPairs(hand('7h', '7s', '7d', '7c')), 12);
check('jack and queen are not a pair', Eval.countPairs(hand('Jh', 'Qs')), 0);

// ── Runs ─────────────────────────────────────────────────────────────────────
check('run of three', Eval.countRuns(hand('3h', '4s', '5d')), 3);
check('court run J-Q-K', Eval.countRuns(hand('Jh', 'Qs', 'Kd')), 3);
check('run across ten and jack', Eval.countRuns(hand('9h', '10s', 'Jd')), 3);
check('only the longest run scores', Eval.countRuns(hand('2h', '3s', '4d', '5c')), 4);
check('run of five', Eval.countRuns(hand('2h', '3s', '4d', '5c', '6h')), 5);
check('double run of three', Eval.countRuns(hand('3h', '3s', '4d', '5c')), 6);
check('triple run', Eval.countRuns(hand('3h', '3s', '3d', '4c', '5h')), 9);
check('double double run', Eval.countRuns(hand('3h', '3s', '4d', '4c', '5h')), 12);
check('no run without three in a row', Eval.countRuns(hand('2h', '3s', '5d', '6c')), 0);
check('court cards are not one rank', Eval.countRuns(hand('10h', 'Js', 'Qd', 'Kc')), 4);

// ── Flush ────────────────────────────────────────────────────────────────────
check('four-card hand flush',
    Eval.countFlush(hand('2h', '5h', '9h', 'Kh'), card('3s'), false), 4);
check('five-card flush with the starter',
    Eval.countFlush(hand('2h', '5h', '9h', 'Kh'), card('3h'), false), 5);
check('a four-card flush does not score in the crib',
    Eval.countFlush(hand('2h', '5h', '9h', 'Kh'), card('3s'), true), 0);
check('a five-card flush does score in the crib',
    Eval.countFlush(hand('2h', '5h', '9h', 'Kh'), card('3h'), true), 5);
check('mixed suits are no flush',
    Eval.countFlush(hand('2h', '5h', '9h', 'Ks'), card('3h'), false), 0);

// ── Nobs ─────────────────────────────────────────────────────────────────────
check('jack matching the starter suit', Eval.countNobs(hand('Jh', '3s'), card('9h')), 1);
check('jack of another suit', Eval.countNobs(hand('Jh', '3s'), card('9s')), 0);

// ── Whole hands ──────────────────────────────────────────────────────────────
// The perfect hand: J of the starter's suit, three fives, five turned.
check('twenty-nine', Eval.scoreHand(hand('5h', '5s', '5d', 'Jc'), card('5c')).total, 29);
// Four fives and a court card: eight fifteens, double pair royal.
check('twenty-eight', Eval.scoreHand(hand('5h', '5s', '5d', '5c'), card('Kc')).total, 28);
check('a hand with nothing', Eval.scoreHand(hand('2h', '4s', '6d', '8c'), card('Ks')).total, 0);
// 7+8 and 2+6+7 are both fifteen, and 6-7-8 is a run.
check('two fifteens and a run of three',
    Eval.scoreHand(hand('6h', '7s', '8d', 'Kc'), card('2s')).total, 7);
// The run the old scorer could not see at all.
check('J-Q-K run counts', Eval.scoreHand(hand('Jh', 'Qs', 'Kd', '2c'), card('7s')).total, 3);

// ── Pegging ──────────────────────────────────────────────────────────────────
check('pegging a fifteen', Eval.scorePeggingPlay(card('5h'), hand('Kd')).points, 2);
check('king and five make fifteen', Eval.scorePeggingPlay(card('Kh'), hand('5d')).points, 2);
// The regression the ordinal table caused: a king worth 13 made 15 with a two.
check('king and two are twelve', Eval.scorePeggingPlay(card('Kh'), hand('2d')).points, 0);
check('king and queen and ace are not thirty-one',
    Eval.scorePeggingPlay(card('Ah'), hand('Kd', 'Qs')).points, 0);
check('pegging a pair', Eval.scorePeggingPlay(card('7h'), hand('7d')).points, 2);
check('pegging a pair royal', Eval.scorePeggingPlay(card('7h'), hand('7d', '7s')).points, 6);
check('a pair broken by another card', Eval.scorePeggingPlay(card('7h'), hand('7d', '3s')).points, 0);
check('pegging a run of three', Eval.scorePeggingPlay(card('5h'), hand('3d', '4s')).points, 3);
check('a run laid out of order', Eval.scorePeggingPlay(card('4h'), hand('5d', '3s')).points, 3);
check('a run of four', Eval.scorePeggingPlay(card('6h'), hand('3d', '5s', '4c')).points, 4);
check('thirty-one', Eval.scorePeggingPlay(card('Ah'), hand('Kd', 'Ks', 'Kc')).points, 2);
// Thirty-one and a run at once: the old scorer returned early and paid only 2.
check('thirty-one completing a run',
    Eval.scorePeggingPlay(card('8h'), hand('Kd', '6c', '7s')).points, 5);
check('nothing at all', Eval.scorePeggingPlay(card('9h'), hand('2d')).points, 0);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
