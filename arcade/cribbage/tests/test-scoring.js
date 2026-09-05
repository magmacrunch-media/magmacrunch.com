/**
 * test-scoring.js — Cribbage scoring rules.
 *
 * These exist because the game used to score through
 * AdCards.CribbageHandEval, which builds runs out of pegging values (so J-Q-K
 * was three tens, not a run) and pays every sub-run of a sequence instead of
 * the longest (so 2-3-4-5 paid 10 rather than 4). The cases below are the ones
 * that told those two apart, plus the ordinary ones around them.
 *
 * Run: node test-scoring.js
 */

const CribbageScore = require('../js/scoring.js');

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

// 'KH' -> king of hearts. Suits are h/d/c/s.
const SUITS = { h: 'hearts', d: 'diamonds', c: 'clubs', s: 'spades' };
function card(text) {
    return { rank: text.slice(0, -1), suit: SUITS[text.slice(-1)] };
}
function hand(...texts) {
    return texts.map(card);
}

// ── Card values ──────────────────────────────────────────────────────────────
check('ace counts one', CribbageScore.value('A'), 1);
check('king counts ten', CribbageScore.value('K'), 10);
check('queen counts ten', CribbageScore.value('Q'), 10);
check('jack counts ten', CribbageScore.value('J'), 10);
check('king orders thirteenth', CribbageScore.order('K'), 13);
check('jack orders eleventh', CribbageScore.order('J'), 11);

// ── Fifteens ─────────────────────────────────────────────────────────────────
check('ten and five', CribbageScore.countFifteens(hand('10h', '5s')), 2);
check('king and five', CribbageScore.countFifteens(hand('Kh', '5s')), 2);
check('king and two is not fifteen', CribbageScore.countFifteens(hand('Kh', '2s')), 0);
check('A-2-3-4-5', CribbageScore.countFifteens(hand('Ah', '2s', '3d', '4c', '5h')), 2);
check('four court cards and a five, four ways',
    CribbageScore.countFifteens(hand('Jh', 'Qs', 'Kd', '10c', '5h')), 8);

// ── Pairs ────────────────────────────────────────────────────────────────────
check('a pair', CribbageScore.countPairs(hand('7h', '7s')), 2);
check('pair royal', CribbageScore.countPairs(hand('7h', '7s', '7d')), 6);
check('double pair royal', CribbageScore.countPairs(hand('7h', '7s', '7d', '7c')), 12);
check('jack and queen are not a pair', CribbageScore.countPairs(hand('Jh', 'Qs')), 0);

// ── Runs ─────────────────────────────────────────────────────────────────────
check('run of three', CribbageScore.countRuns(hand('3h', '4s', '5d')), 3);
check('court run J-Q-K', CribbageScore.countRuns(hand('Jh', 'Qs', 'Kd')), 3);
check('run across ten and jack', CribbageScore.countRuns(hand('9h', '10s', 'Jd')), 3);
check('only the longest run scores', CribbageScore.countRuns(hand('2h', '3s', '4d', '5c')), 4);
check('run of five', CribbageScore.countRuns(hand('2h', '3s', '4d', '5c', '6h')), 5);
check('double run of three', CribbageScore.countRuns(hand('3h', '3s', '4d', '5c')), 6);
check('triple run', CribbageScore.countRuns(hand('3h', '3s', '3d', '4c', '5h')), 9);
check('double double run', CribbageScore.countRuns(hand('3h', '3s', '4d', '4c', '5h')), 12);
check('no run without three in a row', CribbageScore.countRuns(hand('2h', '3s', '5d', '6c')), 0);
check('court cards are not one rank', CribbageScore.countRuns(hand('10h', 'Js', 'Qd', 'Kc')), 4);

// ── Flush ────────────────────────────────────────────────────────────────────
check('four-card hand flush',
    CribbageScore.countFlush(hand('2h', '5h', '9h', 'Kh'), card('3s'), false), 4);
check('five-card flush with the starter',
    CribbageScore.countFlush(hand('2h', '5h', '9h', 'Kh'), card('3h'), false), 5);
check('a four-card flush does not score in the crib',
    CribbageScore.countFlush(hand('2h', '5h', '9h', 'Kh'), card('3s'), true), 0);
check('a five-card flush does score in the crib',
    CribbageScore.countFlush(hand('2h', '5h', '9h', 'Kh'), card('3h'), true), 5);
check('mixed suits are no flush',
    CribbageScore.countFlush(hand('2h', '5h', '9h', 'Ks'), card('3h'), false), 0);

// ── Nobs ─────────────────────────────────────────────────────────────────────
check('jack matching the starter suit', CribbageScore.countNobs(hand('Jh', '3s'), card('9h')), 1);
check('jack of another suit', CribbageScore.countNobs(hand('Jh', '3s'), card('9s')), 0);

// ── Whole hands ──────────────────────────────────────────────────────────────
// The perfect hand: J of the starter's suit, three fives, five turned.
check('twenty-nine', CribbageScore.scoreHand(hand('5h', '5s', '5d', 'Jc'), card('5c')).total, 29);
// Four fives and a court card: eight fifteens, double pair royal.
check('twenty-eight', CribbageScore.scoreHand(hand('5h', '5s', '5d', '5c'), card('Kc')).total, 28);
check('a hand with nothing', CribbageScore.scoreHand(hand('2h', '4s', '6d', '8c'), card('Ks')).total, 0);
// 6-7-8 is a run of three and 7-8 makes fifteen.
check('two fifteens and a run of three',
    CribbageScore.scoreHand(hand('6h', '7s', '8d', 'Kc'), card('2s')).total, 7);
// The run the old scorer could not see at all.
check('J-Q-K run counts', CribbageScore.scoreHand(hand('Jh', 'Qs', 'Kd', '2c'), card('7s')).total, 3);

// ── Pegging ──────────────────────────────────────────────────────────────────
check('pegging a fifteen', CribbageScore.scorePegging(card('5h'), hand('Kd')).points, 2);
check('king and five make fifteen', CribbageScore.scorePegging(card('Kh'), hand('5d')).points, 2);
// The regression the ordinal table caused: a king worth 13 made 15 with a two.
check('king and two are twelve', CribbageScore.scorePegging(card('Kh'), hand('2d')).points, 0);
check('king and queen and ace are not thirty-one',
    CribbageScore.scorePegging(card('Ah'), hand('Kd', 'Qs')).points, 0);
check('pegging a pair', CribbageScore.scorePegging(card('7h'), hand('7d')).points, 2);
check('pegging a pair royal', CribbageScore.scorePegging(card('7h'), hand('7d', '7s')).points, 6);
check('a pair broken by another card', CribbageScore.scorePegging(card('7h'), hand('7d', '3s')).points, 0);
check('pegging a run of three', CribbageScore.scorePegging(card('5h'), hand('3d', '4s')).points, 3);
check('a run laid out of order', CribbageScore.scorePegging(card('4h'), hand('5d', '3s')).points, 3);
check('a run of four', CribbageScore.scorePegging(card('6h'), hand('3d', '5s', '4c')).points, 4);
check('thirty-one', CribbageScore.scorePegging(card('Ah'), hand('Kd', 'Ks', 'Kc')).points, 2);
// Thirty-one and a run at once: the old scorer returned early and paid only 2.
check('thirty-one completing a run',
    CribbageScore.scorePegging(card('8h'), hand('Kd', '6c', '7s')).points, 5);
check('nothing at all', CribbageScore.scorePegging(card('9h'), hand('2d')).points, 0);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
