// tutorial.js
//
// The primer, played rather than read.
//
// The rules panel already carries this material: `basics` is a chapter of
// eight pages that opens on four lamps and works one sum a column at a time.
// It is good writing and it is still there. What it cannot do is let anybody
// touch a lamp, and the comment above that chapter in index.html says why the
// gap matters in the first place -- "every gate in [the codex] is locked until
// you have fired it, so the explanation is behind the thing it explains."
// Prose was the only tool the panel had. This file is the other one.
//
// Four lessons, following the chapter's own beats, each one interaction
// instead of a page:
//
//   lamps     tap four lamps until they add up to a number you were asked for
//   onebit    one lamp against one lamp, output following the rule live
//   number    the same gate across four columns of a whole number
//   board     the real board, scripted, four swipes
//
// ## Why the last one is the real board and not a picture of it
//
// The first three teach what the symbols mean and need no game: they are
// standalone widgets with no BooleBoard, no scoring, no game-over and no path
// to the leaderboard. The fourth is a genuine `BooleBoard` on the real
// `#gameBoard`, with the real input, the real tiles and the real math overlay,
// because the thing it has to teach is a swipe. A diagram of a swipe teaches
// nothing a diagram of a gate has not already taught better.
//
// `TutorialBoard` is how that stays safe. `addRandomTile` is the single
// chokepoint for every random thing the game does, so overriding it is the
// whole of what a scripted board needs; `checkGameOver` and `handleGameOver`
// are stubbed so a lesson can never reach the initials prompt, which is the
// one path that writes to the scoreboard.
//
// ## The height bonus is suppressed, deliberately
//
// A first-time value pays `value * 2` on top of the gate (`kind: 'height'` in
// game.js), so 5 XOR 3 on a fresh board scores 18 and not 6. Every tutorial
// step would trigger it, every prompt that named a number would disagree with
// the overlay drawn over the tile, and the player's first lesson would be that
// the game's own explanation cannot be trusted. So each scripted step starts
// with `highestValueEver` already at the ceiling and the arithmetic comes out
// exactly as the prompt states it. Scoring in full is the rules panel's job.
// Do not "fix" this by removing it; fix it by rewriting the prompts first.
//
// ## Expectations are asserted, not assumed
//
// Every board step carries `expect`, and web/tests/test-tutorial.js runs each
// one through a real BooleBoard and fails if the engine disagrees. The scripts
// were written from a probe rather than from reading moveLeft, and that probe
// is what caught the height bonus. A change to the gate arithmetic now breaks
// the test instead of quietly turning four prompts into lies.
//
// Platform knowledge stays out of here, exactly as it does in game.js and
// codex.js: this announces `boole:primer-lesson` and `boole:primer` on the
// document, and the App Store build's achievement hangs off the second one
// from ios/shim/gamekit-achievements.js.

(function (root) {
    'use strict';

    const STORAGE_KEY = 'gb_tutorial';

    // The codes game.js uses on the board. Negative is a gate; see isGate().
    const GATE_CODE = { XOR: -1, OR: -2, AND: -3, NOT: -4 };
    const GATE_SYMBOL = { XOR: '⊕', OR: '∨', AND: '∧', NOT: '¬' };
    const GATE_ORDER = ['XOR', 'OR', 'AND', 'NOT'];

    /**
     * Lamp weights, most significant first, for a row of `width` lamps.
     *
     * Variable because the first lesson now starts at ONE lamp and grows. Four
     * weighted lamps is not the beginning of binary, it is the fourth thing
     * about it: the beginning is that a lamp is on or off, and that is a bit.
     * Opening on 8 4 2 1 asks somebody to accept place value, doubling and the
     * digits 0/1 in one breath.
     */
    function weightsFor(width) {
        const out = [];
        for (let k = width - 1; k >= 0; k--) out.push(Math.pow(2, k));
        return out;
    }

    // The full row, kept for the callers that only ever mean four.
    const WEIGHTS = weightsFor(4);

    function maxFor(bits) {
        return Math.pow(2, bits) - 1;
    }

    /** The lit lamps, added up. `lamps` is most-significant-first, 1 for on. */
    function lampSum(lamps) {
        const w = weightsFor(lamps.length);
        return lamps.reduce((sum, on, i) => sum + (on ? w[i] : 0), 0);
    }

    /** A value as its lamps, [8,4,2,1] order. */
    function lampsOf(value, width) {
        const out = [];
        for (let k = width - 1; k >= 0; k--) out.push((value >> k) & 1 ? 1 : 0);
        return out;
    }

    function bitsOf(value, width) {
        return (value >>> 0).toString(2).padStart(width, '0').slice(-width);
    }

    /**
     * One gate on one bit. The four rules the truth tables state, as code.
     */
    function oneBit(gate, a, b) {
        switch (gate) {
            case 'XOR': return a ^ b;
            case 'OR': return a | b;
            case 'AND': return a & b;
            case 'NOT': return a ? 0 : 1;
            default: return 0;
        }
    }

    /**
     * One gate on a whole number, mirroring game.js applyGate's arithmetic.
     *
     * Returns the result only. The overflow *bonus* is the board's business:
     * here NOT(max) is simply 0, which is the value the tile would have held
     * and cannot, which is the whole reason it clears.
     */
    function applyGate(gate, a, b, bits) {
        const max = maxFor(bits);
        switch (gate) {
            case 'XOR': return (a ^ b) & max;
            case 'OR': return (a | b) & max;
            case 'AND': return (a & b) & max;
            case 'NOT': return (~a) & max;
            default: return a;
        }
    }

    /** Which gates turn these operands into `want`. Used to check a lesson. */
    function gatesProducing(a, b, want, bits) {
        return GATE_ORDER.filter((name) => {
            if (name === 'NOT') return b === null && applyGate('NOT', a, null, bits) === want;
            if (b === null) return false;
            return applyGate(name, a, b, bits) === want;
        });
    }

    // ── the lessons ─────────────────────────────────────────────────────────
    //
    // Declarative so the tests can read them. Nothing here touches the page.

    const LESSONS = [
        {
            id: 'board',
            kind: 'board',
            title: 'the real board',
            lead: 'Everything above, on the board you are about to play.',
            bits: 4,
            // Verified against a real BooleBoard; see `expect` and the test.
            steps: [
                {
                    board: [[1, 0, 0, 1], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
                    hint: 'left',
                    prompt: 'Two 1s. Same number, so they need no gate: swipe left and they join.',
                    expect: { score: 1, top: [1, 0, 0, 0] },
                },
                {
                    board: [[5, -1, 3, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
                    hint: 'left',
                    prompt: '5 and 3 are different, so they need the gate between them. ⊕ is XOR: 0101 and 0011 differ in two columns, so 0110.',
                    expect: { score: 6, top: [6, 0, 0, 0] },
                },
                {
                    board: [[5, -4, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
                    hint: 'left',
                    prompt: '¬ is NOT, and it needs only one tile. It flips all four lamps: 0101 becomes 1010.',
                    expect: { score: 10, top: [10, 0, 0, 0] },
                },
                {
                    board: [[15, -4, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
                    hint: 'left',
                    prompt: '15 is every lamp lit. NOT makes it 0000, and no tile can hold 0, so it clears and pays triple.',
                    expect: { score: 45, top: [0, 0, 0, 0] },
                },
            ],
            done: 'That last one is the overflow, and it is the best move in the game.',
        },
    ];

    function lessonById(id) {
        return LESSONS.find((l) => l.id === id) || null;
    }

    /**
     * The lit lamps as the sum they make, for showing the working.
     *
     * `4 + 2 = 6` is the idea; `0110 = 6` is the notation for it, and a player
     * who does not know binary cannot read the second to learn the first. Both
     * are shown, the arithmetic first.
     */
    function sumLine(lamps) {
        const terms = weightsFor(lamps.length).filter((w, i) => lamps[i]);
        return {
            terms: terms,
            expr: terms.length ? terms.join(' + ') : 'nothing lit',
            sum: terms.reduce((a, b) => a + b, 0),
        };
    }

    /**
     * One gate on a whole number, written out as the one-bit sums it is.
     *
     * This is the sentence the whole lesson exists to make: a gate does not
     * know what 5 is, it runs the SAME rule the lesson before taught, once per
     * column, and nothing carries between them. Returned left to right, which
     * is the order the columns are drawn in.
     */
    function columnWork(gate, a, b, bits) {
        const unary = b === null || b === undefined;
        const out = [];
        for (let k = bits - 1; k >= 0; k--) {
            const ab = (a >> k) & 1;
            const bb = unary ? 0 : (b >> k) & 1;
            out.push({
                weight: Math.pow(2, k),
                a: ab,
                b: unary ? null : bb,
                result: oneBit(gate, ab, bb),
            });
        }
        return out;
    }

    // ── the bench ───────────────────────────────────────────────────────────
    //
    // ONE SCREEN, AND IT GROWS. There is no deck here, and the deck is the
    // thing that was replaced.
    //
    // The primer was fourteen steps, which is fourteen transitions nobody
    // asked for, and nothing accumulated across them: the rule learned on the
    // second screen was gone from sight by the fourth. Progress was a row of
    // dots, which is a reading metaphor rather than a playing one, and every
    // fix made to it was a better deck. Reported, correctly, as maybe not
    // needing to be a series of slides at all.
    //
    // So: one bench. It starts as a single switch and nothing else, and every
    // discovery bolts something on -- a socket, a gate, a second row, four
    // switches instead of one. The apparatus IS the progress bar, it is on
    // screen the whole time, and a player who wants to go back and poke AND
    // after meeting XOR simply does, because nothing was ever taken away.
    //
    // What it grows into is the game's own move: a four-bit number, a gate,
    // another four-bit number. That is a tile, a gate tile and a tile, which
    // is what the board is made of, so the last state of the bench and the
    // first move of the game are the same picture.

    /**
     * What there is to find, in the order the bench offers it.
     *
     * Declarative so the tests can read it, and `unlocks` is what each one
     * bolts on. The chain is the ladder the deck used to be, with one new
     * thing per rung for the same reason it always had: a second switch and
     * a gate arriving together is two ideas at once.
     */
    const DISCOVERIES = [
        {
            id: 'both',
            bits: 1,
            text: 'turn the switch on, and off again',
            unlocks: 'three more switches, and a +1 button',
            check: (log) => atBits(log, 1).filter((o) => !o.gate)
                .some((o) => o.a === 1) && atBits(log, 1).filter((o) => !o.gate)
                .some((o) => o.a === 0),
        },
        {
            id: 'count',
            bits: 4,
            text: 'hold +1 and count all the way up to 15',
            unlocks: null,
            // EVERY number, not just the last one, because the thing being
            // taught is in the carries and not in the destination. 7 to 8 is
            // where three switches go off and a fourth comes on at once, and
            // a player who sets 15 by hand never sees it happen.
            //
            // Which is also why the odometer exists at all: sixteen states is
            // a lot of individual taps and no fun whatever, and one held
            // button is the difference between a chore and watching a meter
            // roll over.
            check: (log) => {
                const seen = atBits(log, 4).filter((o) => !o.gate).map((o) => o.a);
                for (let n = 0; n <= maxFor(4); n += 1) {
                    if (seen.indexOf(n) === -1) return false;
                }
                return true;
            },
        },
        {
            id: 'six',
            bits: 4,
            // BY HAND, which is what `via` is in the log for. The odometer
            // has already been through 6 by the time this is asked, so a
            // check that only looked at the number would come up solved the
            // moment it was offered -- the same fault as a task that reads
            // done before the player has touched anything, which this bench
            // has had once already.
            //
            // The button is withdrawn here too. Counting is a thing to watch
            // and place value is a thing to do, and leaving the easy way up
            // on the screen turns the second into the first.
            text: 'now set the switches to 6 yourself',
            unlocks: null,
            check: (log) => atBits(log, 4).some((o) => !o.gate && !o.via && o.a === 6),
        },
        {
            id: 'max',
            bits: 4,
            text: 'and to 15, which is the most four switches hold',
            unlocks: 'a socket, and NOT to put in it',
            check: (log) => atBits(log, 4).some((o) => !o.gate && !o.via && o.a === 15),
        },
        {
            id: 'not',
            bits: 1,
            text: 'see what NOT does to a 0, and to a 1',
            unlocks: 'a second row of switches, and AND',
            check: (log) => [0, 1].every((v) => withGate(log, 'NOT', 1).some((o) => o.a === v)),
        },
        {
            id: 'and',
            bits: 1,
            text: 'light the lamp through AND',
            unlocks: 'OR',
            check: (log) => withGate(log, 'AND', 1).some((o) => o.out === 1),
        },
        {
            id: 'or',
            bits: 1,
            text: 'light it through OR every way there is, and there are three',
            unlocks: 'XOR',
            check: (log) => lit(log, 'OR', 1).length >= 3,
        },
        {
            id: 'xor',
            bits: 1,
            text: 'light it through XOR both ways',
            unlocks: null,
            check: (log) => lit(log, 'XOR', 1).length >= 2,
        },
        {
            id: 'cross',
            bits: 4,
            text: 'run a gate across two whole numbers at once',
            unlocks: null,
            check: (log) => atBits(log, 4).some(
                (o) => o.operands === 2 && o.gate && o.gate !== 'NOT' && o.a > 0 && o.b > 0
            ),
        },
        {
            id: 'over',
            bits: 4,
            text: 'NOT the biggest number there is, and watch it fall to nothing',
            unlocks: null,
            check: (log) => atBits(log, 4).some((o) => o.gate === 'NOT' && o.a === 15 && o.out === 0),
        },
    ];

    /** Observations at a given width. */
    function atBits(log, bits) {
        return log.filter((o) => o.bits === bits);
    }

    /** Observations through a named gate at a given width. */
    function withGate(log, gate, bits) {
        return atBits(log, bits).filter((o) => o.gate === gate);
    }

    /** The distinct input pairs that lit the lamp through this gate. */
    function lit(log, gate, bits) {
        const keys = [];
        withGate(log, gate, bits).forEach((o) => {
            if (o.out !== 1) return;
            const k = o.a + ',' + o.b;
            if (keys.indexOf(k) === -1) keys.push(k);
        });
        return keys;
    }

    function discoveryById(id) {
        return DISCOVERIES.find((d) => d.id === id) || null;
    }

    /**
     * What is bolted to the bench, given what has been found.
     *
     * Derived rather than stored, so there is one source of truth and a
     * half-finished unlock cannot exist. Note the gates arrive one at a time
     * and in the order the rungs used to: NOT alone first, because it is the
     * only one that works on a single row, then the pair that need two.
     */
    function apparatus(found) {
        const has = (id) => found.indexOf(id) !== -1;
        const gates = [];
        if (has('max')) gates.push('NOT');
        if (has('not')) gates.push('AND');
        if (has('and')) gates.push('OR');
        if (has('or')) gates.push('XOR');
        return {
            // THE SOCKET IS LAST NOW, not first. It used to arrive the moment
            // the player had turned one switch both ways, which put four
            // logic rules in front of them before they had seen four switches
            // make a number -- and the number is what the gates are FOR.
            socket: has('max'),
            rows: has('not') ? 2 : 1,
            gates: gates,
            // And the width is first. The bench grows to four as soon as one
            // switch has been understood, because that is the next thing to
            // understand and not a prize for finishing the gates.
            //
            // It stays a control the player holds rather than a state the
            // bench moves them into: NOT, AND, OR and XOR are all taught at
            // one switch, where a gate has a whole truth table small enough
            // to stand inside, and the way back there has to be theirs.
            canWiden: has('both'),
            // The odometer, which is withdrawn once it has been watched.
            stepper: has('both') && !has('count'),
        };
    }

    /**
     * Does finding these hand the player new apparatus?
     *
     * If it does, the bench clears. `max` is "make 15", and what it grants
     * is the socket with NOT in it, so the bench was computing NOT 1111 and
     * handing over `over` -- the tenth discovery -- before the fifth, with
     * the player having touched nothing. A newly socketed gate must not
     * report on a number set for a different purpose.
     */
    function grantsApparatus(ids) {
        return ids.some((id) => {
            const d = discoveryById(id);
            return !!(d && d.unlocks);
        });
    }

    /** Which discoveries this log has earned that the list does not have yet. */
    function newlyFound(log, found) {
        return DISCOVERIES
            .filter((d) => found.indexOf(d.id) === -1)
            .filter((d) => d.check(log))
            .map((d) => d.id);
    }

    /** The next few still to find, which is all the list ever shows. */
    function stillToFind(found, limit) {
        return DISCOVERIES
            .filter((d) => found.indexOf(d.id) === -1)
            .slice(0, limit || 3);
    }

    /**
     * One observation, as the log records it. Deduped by everything in it.
     *
     * `via` is how the bench got there -- 'step' for the odometer, unset for
     * the switches -- and it is part of the KEY as well as the record, so a 6
     * counted up to and a 6 set by hand are two observations rather than one.
     * Without that the task after the odometer reads solved before it is
     * offered, since counting to 15 passes through every number on the way.
     */
    function observe(log, o) {
        const key = [o.bits, o.rows, o.gate || '-', o.a, o.b, o.via || '-'].join('/');
        if (log.some((x) => x.key === key)) return false;
        log.push({
            key: key,
            bits: o.bits,
            operands: o.rows,
            gate: o.gate,
            a: o.a,
            b: o.b,
            out: o.out,
            via: o.via || null,
        });
        return true;
    }

    root.BooleTutorial = {
        LESSONS, GATE_CODE, GATE_SYMBOL, GATE_ORDER, WEIGHTS,
        maxFor, lampSum, lampsOf, bitsOf, oneBit, applyGate, gatesProducing,
        lessonById, sumLine, columnWork,
        DISCOVERIES, discoveryById, apparatus, newlyFound, stillToFind, observe,
        grantsApparatus,
    };

    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;

    // ── saved progress ──────────────────────────────────────────────────────
    //
    // Which lessons are finished, so the screen can be re-entered at the first
    // unfinished one and the achievement fires once. Wrapped because
    // localStorage throws rather than returning null in private mode, and a
    // tutorial is not worth taking the page down for -- the same guard
    // main.js's readSetting uses.

    let progress = { lessons: [] };
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.lessons)) progress = parsed;
        }
    } catch (e) {
        // No stored progress, or unreadable. Start fresh.
    }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
        } catch (e) {
            // Storage full or disabled. Progress still holds for this session.
        }
    }

    function isDone(id) {
        return progress.lessons.indexOf(id) !== -1;
    }

    function allDone() {
        return DISCOVERIES.every((d) => isDone(d.id)) && LESSONS.every((l) => isDone(l.id));
    }

    function emit(name, detail) {
        if (typeof CustomEvent !== 'function') return;
        document.dispatchEvent(new CustomEvent('boole:' + name, { detail: detail || {} }));
    }

    /**
     * Bank a finished lesson.
     *
     * `boole:primer` fires the first time all four are done and never again,
     * because the achievement behind it shows a banner and a banner for
     * something finished last week reads as a bug -- the same reasoning
     * gamekit-achievements.js applies to its own reported set.
     */
    function complete(id) {
        if (isDone(id)) return;
        progress.lessons.push(id);
        save();
        emit('primer-lesson', { id: id, done: progress.lessons.length, total: LESSONS.length });
        if (allDone()) emit('primer', { lessons: LESSONS.length });
    }

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text) setArrowLabel(node, text);
        return node;
    }

    function button(className, text) {
        const node = el('button', className, text);
        node.type = 'button';
        return node;
    }

    function sfx(name) {
        if (typeof AdAudio !== 'undefined' && AdAudio && AdAudio.playSfx) {
            try { AdAudio.playSfx(name); } catch (e) { /* audio is optional */ }
        }
    }

    function buzz(kind) {
        // The App Store build's haptics shim listens for this. A browser has
        // no listener and nothing happens, which is the same contract every
        // boole: event in this game keeps.
        emit('primer-feedback', { kind: kind });
    }

    // ── the screen ──────────────────────────────────────────────────────────

    let screen = null;
    let bodyEl = null;
    let dotsEl = null;
    let leadEl = null;
    let taskEl = null;
    let footEl = null;
    let nextBtn = null;
    let index = 0;          // which lesson
    let step = 0;           // which task within it
    let solvedNow = false;  // current task answered

    function build() {
        screen = el('div', 'tutorial-screen');
        screen.id = 'tutorialScreen';
        screen.setAttribute('role', 'dialog');
        screen.setAttribute('aria-label', 'binary primer');

        const panel = el('div', 'tutorial-content');

        const bar = el('div', 'tutorial-topbar');
        const back = button('tutorial-back', '← back');
        back.id = 'tutorialBack';
        back.addEventListener('click', close);
        bar.appendChild(back);
        bar.appendChild(el('h3', 'tutorial-title', 'learn binary'));
        // The running total. It is in the top bar rather than at the end
        // because a score you only see once it is over is a receipt, not a
        // reason to keep going.
        scoreEl = el('div', 'tutorial-score');
        scoreEl.appendChild(el('span', 'tutorial-score-label', 'POINTS'));
        scoreEl.appendChild(el('span', 'tutorial-score-value', '0'));
        bar.appendChild(scoreEl);
        panel.appendChild(bar);

        dotsEl = el('div', 'tutorial-dots');
        dotsEl.setAttribute('aria-hidden', 'true');
        panel.appendChild(dotsEl);

        leadEl = el('p', 'tutorial-lead');
        panel.appendChild(leadEl);

        bodyEl = el('div', 'tutorial-body');
        panel.appendChild(bodyEl);

        taskEl = el('p', 'tutorial-task');
        taskEl.setAttribute('aria-live', 'polite');
        panel.appendChild(taskEl);

        footEl = el('div', 'tutorial-foot');
        nextBtn = button('tutorial-next', 'next →');
        nextBtn.addEventListener('click', advance);
        footEl.appendChild(nextBtn);

        // "read it instead" was here, and it is gone because it did not work.
        // Its handler called close() and then opened #instructionsModal, but
        // close() emits boole:primer-closed, and main.js answers that by
        // putting back whichever screen the primer was opened from -- so the
        // rules panel was opened and then immediately covered by the screen
        // that had just been left. The way to the written rules is still on
        // the how-to-play screen, one tap behind "back", under its own name.
        panel.appendChild(footEl);

        screen.appendChild(panel);
        document.body.appendChild(screen);
    }

    function renderDots() {
        // The board lesson's steps. These used to be one dot per lesson,
        // which with one lesson left would be a single dot that never moved;
        // the bench carries its own count and wants no dots at all.
        dotsEl.innerHTML = '';
        const steps = (lesson().steps || []).length;
        for (let i = 0; i < steps; i++) {
            const dot = el('span', 'tutorial-dot');
            if (i < step) dot.classList.add('is-done');
            if (i === step) dot.classList.add('is-current');
            dotsEl.appendChild(dot);
        }
    }

    /** The task line, and whether `next` is offered yet. */
    function setTask(text, solved) {
        solvedNow = !!solved;
        taskEl.textContent = text;
        taskEl.classList.toggle('is-solved', solvedNow);
        nextBtn.disabled = !solvedNow;
    }

    /**
     * Timers belonging to the step on screen.
     *
     * A quiet step runs on delays -- the pulse that starts, the hint that
     * arrives, the advance after a match -- and every one of them has to die
     * when the step is replaced, or a hint fires over the next screen and a
     * stale advance skips a step nobody saw.
     */
    let stepTimers = [];

    // ── scoring ─────────────────────────────────────────────────────────────
    //
    // The primer pays, and it pays by the game's own rule rather than by an
    // invented one: a gate is worth the decimal value of its result. So the
    // lamps lesson pays the number you built, the whole-number lesson pays
    // what the gate produced, and the board lesson pays whatever the real
    // BooleBoard scored, because by then it IS the real BooleBoard.
    //
    // Learning a gate is the exception at a flat GATE_BONUS: a one-bit result
    // is 0 or 1, and paying a player one point for understanding XOR is worse
    // than paying them nothing. It is the codex's idea -- a gate discovered is
    // worth something on its own -- rather than a number pulled from the air.

    const GATE_BONUS = 10;

    let runScore = 0;
    let scoreEl = null;

    function setScore(n) {
        runScore = n;
        if (scoreEl) scoreEl.querySelector('.tutorial-score-value').textContent = String(runScore);
    }

    /**
     * Pay for something, and show it being paid.
     *
     * The label is the real board's: "+6" floating off the thing that earned
     * it. Silent when `points` is 0, because a chip reading "+0" is a reward
     * that tells you that you got nothing.
     */
    function award(points, node) {
        if (!points) return;
        setScore(runScore + points);
        if (scoreEl) {
            scoreEl.classList.add('is-paid');
            later(() => scoreEl.classList.remove('is-paid'), 600);
        }
        if (!node || typeof node.getBoundingClientRect !== 'function') return;
        const chip = el('div', 'tut-pop', '+' + points);
        const r = node.getBoundingClientRect();
        chip.style.left = (r.left + r.width / 2) + 'px';
        chip.style.top = r.top + 'px';
        document.body.appendChild(chip);
        // Removed on a timer rather than on animationend: a reduced-motion
        // browser may run no animation at all and never fire the event, which
        // would leave the chip on screen for ever.
        setTimeout(() => chip.remove(), 1000);
    }

    function later(fn, ms) {
        const id = setTimeout(fn, ms);
        stepTimers.push(id);
        return id;
    }

    function clearStepTimers() {
        stepTimers.forEach(clearTimeout);
        stepTimers = [];
    }

    /**
     * Hide the prose furniture for a step that teaches without it.
     *
     * The lamps lesson spent 38 words saying that a lamp is on or off, next to
     * a lamp that says it by lighting up. A quiet step shows the apparatus, a
     * target to aim at and nothing else: no lead, no instruction, no success
     * sentence, no NEXT, because it advances itself when the thing it wanted
     * has happened.
     */
    function setQuiet(on) {
        screen.classList.toggle('is-quiet', !!on);
        // Whatever rig was up, it is not up now. renderLesson() calls this on
        // the way into every step, so a hidden task line, or a NEXT button
        // left over from a finished one, cannot survive into the next.
        screen.classList.remove('is-rig');
        screen.classList.remove('is-done');
    }

    /**
     * A finished step waits. It does not advance itself.
     *
     * Every rig here used to call later(advance, ~1200) the moment its goal
     * was met, and on the short steps that reads as the app deciding for
     * you: the first rung is one switch, its goal is to see both states, and
     * since it arrives showing one of them a SINGLE TAP finished the step
     * and took the screen away. Reported exactly that way, and it is not a
     * tuning problem -- there is no delay that makes an unasked-for
     * transition feel chosen.
     *
     * So the button comes back, and only once there is something to press it
     * about. That also buys the thing a timer cannot: a player who wants to
     * keep flipping the switches after the rule is complete may, which is
     * most of what separates a toy from a slide.
     */
    function offerNext() {
        screen.classList.add('is-done');
    }

    function lesson() {
        return LESSONS[index];
    }

    /** Move on: next task within the lesson, or next lesson, or finish. */
    function advance() {
        const current = lesson();
        const tasks = current.tasks || current.steps || [];
        if (step < tasks.length - 1) {
            step++;
            renderLesson();
            return;
        }
        complete(current.id);
        if (index < LESSONS.length - 1) {
            index++;
            step = 0;
            renderLesson();
            return;
        }
        renderFinish();
    }

    // ── the bench, drawn ────────────────────────────────────────────────────

    let bench = null;

    function benchState() {
        return {
            log: [],
            bits: 1,
            gate: null,
            a: [0, 0, 0, 0],
            b: [0, 0, 0, 0],
        };
    }

    // A row is four cells wide in memory however many are on screen, and the
    // visible ones are the RIGHTMOST. That is the whole of why: the single
    // switch at width one is the ones column, so widening grows the row to
    // its LEFT and the switch the player already set keeps the value it had.
    //
    // Indexing from the left instead, which is how this was first written,
    // makes the one switch worth 1 while narrow and worth 8 the instant the
    // bench widens. A player who turns a switch on, widens, and watches
    // their 1 silently become an 8 has been taught something false by the
    // apparatus, on the screen whose entire job is place value.
    const ROW_CELLS = 4;

    /** Which cells are on screen at this width, left to right. */
    function cellsAt(bits) {
        const out = [];
        for (let i = ROW_CELLS - bits; i < ROW_CELLS; i++) out.push(i);
        return out;
    }

    /** The value of a row at the current width. */
    function rowValue(row, bits) {
        const w = weightsFor(ROW_CELLS);
        return cellsAt(bits).reduce((n, i) => n + (row[i] ? w[i] : 0), 0);
    }

    /** The ones column, which is the only cell a one-bit bench has. */
    function lowBit(row) {
        return row[ROW_CELLS - 1];
    }

    function benchOut(st, gear) {
        const a = rowValue(st.a, st.bits);
        const b = rowValue(st.b, st.bits);
        if (!st.gate) return a;
        if (st.gate === 'NOT') return applyGate('NOT', a, null, st.bits);
        if (gear.rows < 2) return applyGate('NOT', a, null, st.bits);
        return applyGate(st.gate, a, b, st.bits);
    }

    /**
     * The bench. Redrawn whole on any change, which is affordable because it
     * is a few dozen nodes, and is the only thing that keeps nine interacting
     * unlocks from needing nine separate patch paths.
     */
    function renderBench() {
        const st = bench;
        const gear = apparatus(progress.lessons);
        fitWidth(gear);
        if (!gear.stepper) stopStepping();
        if (gear.socket && !st.gate) st.gate = gear.gates[0];
        if (st.gate && gear.gates.indexOf(st.gate) === -1) st.gate = gear.gates[0] || null;

        setQuiet(false);
        screen.classList.add('is-rig');
        leadEl.textContent = '';

        bodyEl.innerHTML = '';
        const rig = el('div', 'tut-bench');

        const found = DISCOVERIES.filter((d) => progress.lessons.indexOf(d.id) !== -1).length;
        const head = el('div', 'tut-bench-head');
        head.appendChild(el('span', 'tut-bench-title', 'the bench'));
        head.appendChild(el('span', 'tut-bench-count', found + ' of ' + DISCOVERIES.length));

        /**
         * START OVER, which there was no way to do.
         *
         * What has been found is saved, so a bench that has been finished
         * once comes up finished for ever: every gate unlocked, nothing left
         * to find, and no way back to the version a new player sees. That
         * made the thing hardest to judge the one thing impossible to
         * re-run, including for whoever is deciding whether it works.
         *
         * Two taps, because one would throw away every discovery on a
         * mis-hit, and it asks IN the button rather than in a dialog: the
         * label becomes the question. Three seconds to answer, then it goes
         * back to being an unremarkable button rather than an armed one.
         */
        if (found > 0) {
            const over = button('tut-reset', 'start over');
            let armed = false;
            over.addEventListener('click', () => {
                if (!armed) {
                    armed = true;
                    over.textContent = 'sure?';
                    over.classList.add('is-armed');
                    later(() => {
                        armed = false;
                        over.textContent = 'start over';
                        over.classList.remove('is-armed');
                    }, 3000);
                    return;
                }
                root.BooleTutorial.reset();
                bench = benchState();
                setScore(0);
                sfx('move');
                renderBench();
            });
            head.appendChild(over);
        }

        rig.appendChild(head);

        // ABOVE THE RIG, not under it. The bench is tall once it has grown
        // -- two rows of four switches, a socket, an answer and the column
        // working -- so a list at the bottom sat below the fold on a phone
        // in exactly the state where the player has most to do. The thing
        // that says what to do next has to be readable without scrolling
        // past the thing it is about.
        //
        // It also reads in the right order now: here is what you are
        // looking for, and here is the apparatus to look with.
        //
        // Only the next few of it. All nine at once is a syllabus; three is
        // a direction.
        const todo = stillToFind(progress.lessons, 3);
        const find = el('div', 'tut-find');
        find.appendChild(el('p', 'tut-find-head',
            todo.length ? 'George Boole says' : 'George Boole is satisfied'));
        if (todo.length) {
            const list = el('ul', 'tut-find-list');
            todo.forEach((d, i) => {
                const li = el('li', 'tut-find-item', d.text);
                if (i === 0) li.classList.add('is-next');
                // WHERE TO STAND, and only when you are not already there.
                // This used to be in the prose -- "go back to one switch,
                // and see what NOT does..." -- which is a direction rather
                // than a thing to learn, and it goes stale the moment the
                // player is already at one switch, which is exactly where
                // the bench opens. So the task read as an instruction that
                // had already been carried out, while the only control on
                // screen offered the opposite of it.
                if (d.bits && d.bits !== st.bits) {
                    li.appendChild(el('span', 'tut-find-at',
                        d.bits === 1 ? 'at 1 switch' : 'at 4 switches'));
                }
                list.appendChild(li);
            });
            find.appendChild(list);
        } else {
            // Its OWN class, not .tutorial-next. The bench sets `is-rig`,
            // which hides .tutorial-next because a rig has no next, and the
            // button was therefore in the DOM and invisible: nine
            // discoveries made and no way out of the screen but back.
            // Caught by looking at it rather than by querying for it, which
            // reported the element present and said nothing about display.
            const go = button('tut-goboard', 'play the board →');
            go.addEventListener('click', startBoard);
            find.appendChild(go);
        }
        // The LIST goes above; the way out does not. Once there is nothing
        // left to find this box stops being guidance and becomes a single
        // button, and a button is a thing to reach rather than a thing to
        // read: at the top it sat above the whole bench, which is both an
        // odd place for the primary action and an easy way to leave by
        // accident while reaching for a switch. Read high, tap low, which
        // is the same split the how-to-play menu uses.
        if (todo.length) rig.appendChild(find);


        /** One row of switches, with its value when the row is wide. */
        function switchRow(which) {
            const row = el('div', 'tut-brow');
            row.dataset.which = which;
            const bits = st.bits;
            const weights = weightsFor(ROW_CELLS);
            const cells = el('div', 'tut-brow-cells');
            cellsAt(bits).forEach((i) => {
                const sw = button('tut-bsw');
                sw.dataset.on = st[which][i] ? '1' : '0';
                sw.setAttribute('aria-pressed', st[which][i] ? 'true' : 'false');
                sw.setAttribute('aria-label',
                    bits === 1 ? 'switch' : 'switch worth ' + weights[i]);
                if (bits > 1) sw.appendChild(el('span', 'tut-bsw-weight', String(weights[i])));
                sw.appendChild(el('span', 'tut-bsw-bulb'));
                sw.appendChild(el('span', 'tut-bsw-bit', st[which][i] ? '1' : '0'));
                sw.addEventListener('click', () => {
                    st[which][i] = st[which][i] ? 0 : 1;
                    sfx('move');
                    settle();
                });
                cells.appendChild(sw);
            });
            row.appendChild(cells);

            const v = rowValue(st[which], bits);
            const tag = el('div', 'tut-brow-value');
            // One switch has nothing to add up and three names worth having.
            // Four switches have a number, which is the point of being four.
            tag.textContent = bits === 1
                ? (v ? 'on  1  true' : 'off  0  false')
                : bitsOf(v, bits) + '  =  ' + v;
            row.appendChild(tag);
            return row;
        }

        const body = el('div', 'tut-bench-rig');
        body.appendChild(switchRow('a'));

        // The socket. Tapping it swaps the gate, which is the one control on
        // the bench that is a CHOICE rather than an input, so it is drawn
        // differently: a thing held in a holder, not a thing switched.
        if (gear.socket) {
            const sock = button('tut-socket');
            sock.dataset.gate = st.gate.toLowerCase();
            sock.appendChild(el('span', 'tut-socket-glyph', GATE_SYMBOL[st.gate]));
            sock.appendChild(el('span', 'tut-socket-name', st.gate));
            if (gear.gates.length > 1) {
                sock.appendChild(el('span', 'tut-socket-swap', 'tap to swap'));
            }
            sock.addEventListener('click', () => {
                const i = gear.gates.indexOf(st.gate);
                st.gate = gear.gates[(i + 1) % gear.gates.length];
                sfx('spawn');
                settle();
            });
            body.appendChild(sock);
        }

        // NOT takes one row, so the second is dimmed rather than removed
        // while it is socketed: hiding it would make the bench appear to
        // shrink every time the player tried the one unary gate.
        if (gear.rows > 1) {
            const rowB = switchRow('b');
            if (st.gate === 'NOT') rowB.dataset.unused = '1';
            body.appendChild(rowB);
        }

        /**
         * THE ODOMETER.
         *
         * Sixteen states is sixteen taps, which is a chore, and a chore is
         * the surest way to teach somebody that binary is tedious. Held, it
         * is a meter rolling over, and the rolling is the entire lesson: 7
         * to 8 turns three switches off and a fourth on in one tick, which
         * is a carry, and nothing about setting 8 by hand shows it.
         *
         * It counts how many of the sixteen have been seen, because the
         * player can start anywhere and wraps round at 15. Without that the
         * task has no visible edge and the only way to know you are done is
         * that it suddenly says so.
         */
        if (gear.stepper) {
            const seen = {};
            st.log.forEach((o) => {
                if (o.bits === ROW_CELLS && !o.gate) seen[o.a] = true;
            });
            const n = Object.keys(seen).length;
            const total = maxFor(ROW_CELLS) + 1;

            const meter = el('div', 'tut-step-wrap');
            const step = button('tut-step', '+1');
            step.setAttribute('aria-label', 'add one');
            // pointerdown, not click: a hold has to start on the way down.
            // Mouse, touch and pen all arrive here as one event, so there is
            // no separate touch path to keep in step with this one.
            step.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                startStepping();
            });
            meter.appendChild(step);
            meter.appendChild(el('span', 'tut-step-seen',
                n + ' of ' + total + ' seen'));
            body.appendChild(meter);
        }

        const out = rowValue(st.a, st.bits);
        const value = benchOut(st, gear);
        // No gate, no answer to show. Before the socket exists the bench is
        // one row and the row already states its own value, so an output box
        // under it reads "off 0 false, which is off 0 false": a tautology in
        // the one place the player is being taught to read one.
        if (st.gate) {
            const outBox = el('div', 'tut-bout');
            outBox.dataset.on = value ? '1' : '0';
            outBox.appendChild(el('span', 'tut-bout-label', 'gives'));
            outBox.appendChild(el('span', 'tut-bout-value', st.bits === 1
                ? (value ? 'on  1  true' : 'off  0  false')
                : bitsOf(value, st.bits) + '  =  ' + value));
            body.appendChild(outBox);
        }
        rig.appendChild(body);

        // What the bench is doing, written out. At one bit that is the gate's
        // whole table with the rows the player has stood on filled in; at
        // four it is the same rule run down the columns, which is the thing
        // the board does and the reason the bench ends up shaped like one.
        if (st.gate && st.bits === 1) {
            const unary = st.gate === 'NOT' || gear.rows < 2;
            const table = el('div', 'tut-truth');
            table.dataset.gate = st.gate.toLowerCase();
            table.dataset.width = unary ? '1' : '2';
            const rows = unary ? [[0], [1]] : [[0, 0], [0, 1], [1, 0], [1, 1]];
            const here = unary
                ? String(lowBit(st.a))
                : String(lowBit(st.a)) + String(lowBit(st.b));
            rows.forEach((pair) => {
                const r = el('div', 'tut-truth-row');
                const key = pair.join('');
                const v = unary
                    ? oneBit('NOT', pair[0], 0)
                    : oneBit(st.gate, pair[0], pair[1]);
                r.textContent = unary
                    ? GATE_SYMBOL.NOT + ' ' + pair[0] + ' = ' + v
                    : pair[0] + ' ' + GATE_SYMBOL[st.gate] + ' ' + pair[1] + ' = ' + v;
                const met = st.log.some(
                    (o) => o.bits === 1 && o.gate === st.gate
                        && (unary ? String(o.a) === key : (String(o.a) + String(o.b)) === key)
                );
                r.classList.toggle('is-seen', met);
                r.classList.toggle('is-here', key === here);
                table.appendChild(r);
            });
            rig.appendChild(table);
        } else if (st.gate && st.bits === 4) {
            const unary = st.gate === 'NOT' || gear.rows < 2;
            const work = el('div', 'tut-columns');
            columnWork(st.gate, rowValue(st.a, 4), unary ? null : rowValue(st.b, 4), 4)
                .forEach((col) => {
                    const c = el('div', 'tut-col');
                    c.appendChild(el('span', 'tut-col-weight', String(col.weight)));
                    c.appendChild(el('span', 'tut-col-a', String(col.a)));
                    if (!unary) c.appendChild(el('span', 'tut-col-b', String(col.b)));
                    const res = el('span', 'tut-col-out', String(col.result));
                    res.dataset.on = col.result ? '1' : '0';
                    c.appendChild(res);
                    work.appendChild(c);
                });
            rig.appendChild(work);
            rig.appendChild(el('p', 'tut-columns-note',
                'one rule, four columns, nothing carried between them'));
        }

        if (gear.canWiden && !gear.stepper) {
            /**
             * BOTH WIDTHS, ALWAYS, with the current one marked.
             *
             * It was one button whose label flipped: "widen to four" at one
             * switch, "back to one" at four. A verb like that says what it
             * will DO and never where you ARE, which is the wrong half. At
             * one switch, with a task asking for one switch, the only
             * control on the bench read "widen to four" -- so the obvious
             * move was the wrong one, and the bench looked broken rather
             * than already correct.
             *
             * A pair of options cannot lie about the current state, because
             * the current state is which one is lit.
             */
            const want = todo.length ? todo[0].bits : 0;
            const pick = el('div', 'tut-width');
            pick.setAttribute('role', 'group');
            pick.setAttribute('aria-label', 'how many switches');
            [1, ROW_CELLS].forEach((n) => {
                const opt = button('tut-width-opt',
                    n === 1 ? '1 switch' : '4 switches');
                opt.dataset.on = st.bits === n ? '1' : '0';
                opt.setAttribute('aria-pressed', st.bits === n ? 'true' : 'false');
                // The one the next task wants, when it is not the one you
                // are on. The task names it too; this is the same sentence
                // said where the hand is going.
                if (n === want && st.bits !== n) opt.classList.add('is-wanted');
                opt.addEventListener('click', () => {
                    if (st.bits === n) return;
                    setBits(n);
                });
                pick.appendChild(opt);
            });
            rig.appendChild(pick);
        }

        if (!todo.length) rig.appendChild(find);

        bodyEl.appendChild(rig);
        void out;
    }

    /**
     * Record where the bench is standing, bank anything that earns, redraw.
     *
     * One path for every control, which is what makes nine unlocks tractable:
     * a switch, the socket and the width all do the same three things, and
     * none of them knows what it might have just completed.
     */
    /**
     * Add one to the top row, and let it carry.
     *
     * Wrapping at 15 rather than stopping there, because the roll from 1111
     * back to 0000 is the carry running off the end of the row, which is
     * worth seeing and is also how the board's overflow bonus happens.
     */
    /**
     * The width the apparatus allows, and the one the stage needs.
     *
     * Counting is four switches, so the counting stage simply IS four
     * switches and the width control is not offered during it: one switch
     * cannot roll over, and a player asked to count to 15 on a bench showing
     * a single lamp has been given a task and withheld the apparatus for it.
     *
     * Returns whether it moved, because a bench that has just grown is
     * standing somewhere new and that is an observation. It used to happen
     * inside renderBench, where it could not be -- a redraw must not write to
     * the log -- so the bench came up at 0000 and reported nothing seen with
     * 0000 in front of it.
     */
    function fitWidth(gear) {
        const was = bench.bits;
        if (!gear.canWiden) bench.bits = 1;
        else if (gear.stepper) bench.bits = ROW_CELLS;
        return bench.bits !== was;
    }

    /**
     * Stand the bench at a width.
     *
     * Narrowing clears what is no longer on screen. A cell left set behind
     * the narrow view would come back the next time the bench widened, and a
     * switch that turns itself on while nobody is looking is the worst thing
     * a teaching rig can do.
     */
    function setBits(n) {
        const st = bench;
        st.bits = n;
        if (n === 1) {
            cellsAt(ROW_CELLS).slice(0, ROW_CELLS - 1).forEach((i) => {
                st.a[i] = 0;
                st.b[i] = 0;
            });
        }
        sfx('spawn');
        settle();
    }

    function stepRow() {
        const st = bench;
        const next = (rowValue(st.a, ROW_CELLS) + 1) % (maxFor(ROW_CELLS) + 1);
        cellsAt(ROW_CELLS).forEach((i, k) => {
            st.a[i] = (next >> (ROW_CELLS - 1 - k)) & 1;
        });
        sfx('move');
        settle('step');
    }

    /**
     * Hold to keep counting.
     *
     * THE REPEAT CANNOT LIVE ON THE BUTTON. Every step calls settle, settle
     * calls renderBench, and renderBench rebuilds the whole rig -- so the
     * element the finger is on is destroyed by its own first tick, and a
     * timer owned by it dies with it or, worse, keeps a detached node alive.
     * Holding it up here means the loop never touches the DOM at all and
     * simply does not care how many times the bench is redrawn under it.
     *
     * Released on pointerup ANYWHERE, including outside the button and
     * outside the window, because a pointerup the button never hears is a
     * row that counts for ever.
     */
    let stepDelay = null;
    let stepRepeat = null;

    function startStepping() {
        stopStepping();
        stepRow();
        stepDelay = setTimeout(() => {
            stepRepeat = setInterval(stepRow, 150);
        }, 400);
    }

    function stopStepping() {
        if (stepDelay) clearTimeout(stepDelay);
        if (stepRepeat) clearInterval(stepRepeat);
        stepDelay = null;
        stepRepeat = null;
    }

    function settle(via) {
        const st = bench;
        const gear = apparatus(progress.lessons);
        const fresh = observe(st.log, {
            bits: st.bits,
            rows: gear.rows,
            gate: st.gate,
            a: rowValue(st.a, st.bits),
            b: rowValue(st.b, st.bits),
            out: benchOut(st, gear),
            via: via || null,
        });

        const earned = newlyFound(st.log, progress.lessons);
        earned.forEach((id) => {
            const d = discoveryById(id);
            complete(id);
            sfx('merge');
            buzz('solved');
            announce(d);
        });
        if (earned.length) setScore(runScore + GATE_BONUS * earned.length);

        /**
         * NEW APPARATUS ARRIVES ON A CLEARED BENCH.
         *
         * `max` is "make 15", so earning it leaves the row holding 1111 --
         * and what it grants is the socket, with NOT in it. The bench then
         * computed NOT 1111 = 0000 and handed over `over`, the TENTH
         * discovery, "NOT the biggest number there is, and watch it fall to
         * nothing", before the player had reached the fifth and without them
         * touching anything. The climax of the bench, for free, as a side
         * effect of the task just completed.
         *
         * The general fault is that a newly socketed gate was reporting on a
         * number the player set for a different purpose, so clearing is the
         * general fix rather than a special case for 15. Only when something
         * is actually granted, which is what `unlocks` means: finding `six`
         * grants nothing and disturbs nothing.
         *
         * Serendipity survives. Setting 1111 under NOT still earns `over`
         * whenever the player does it; it just has to be them doing it.
         */
        if (grantsApparatus(earned)) {
            st.a = [0, 0, 0, 0];
            st.b = [0, 0, 0, 0];
        }

        // A discovery can grow the bench, and the grown bench is somewhere it
        // has not been. Recorded here rather than left for the player's next
        // tap, so the meter above the switches agrees with the switches.
        const grown = apparatus(progress.lessons);
        if (fitWidth(grown) || earned.length) {
            observe(st.log, {
                bits: st.bits,
                rows: grown.rows,
                gate: st.gate,
                a: rowValue(st.a, st.bits),
                b: rowValue(st.b, st.bits),
                out: benchOut(st, grown),
            });
        }

        void fresh;
        renderBench();
    }

    /** What a discovery just bolted on, said out loud and briefly. */
    function announce(d) {
        if (!d) return;
        // One at a time. Two discoveries can land within a second of each
        // other early on, and the banners are fixed to the same spot, so
        // they stacked and the second half-covered the first: the reward
        // for the faster find was having it obscured by the next one.
        const standing = screen.querySelector('.tut-unlock');
        if (standing) standing.remove();
        const banner = el('div', 'tut-unlock');
        banner.appendChild(el('span', 'tut-unlock-found', 'found: ' + d.text));
        if (d.unlocks) {
            banner.appendChild(el('span', 'tut-unlock-gained', 'the bench gains ' + d.unlocks));
        }
        screen.appendChild(banner);
        later(() => banner.remove(), 3400);
    }

    // ── lesson 4: the real board ────────────────────────────────────────────
    //
    // Handed over to a real BooleBoard on the real #gameBoard, so the swipe
    // the player learns is the swipe the game wants. See the header.

    let boardLesson = null;

    /**
     * A BooleBoard that plays a script.
     *
     * Four overrides and nothing else. `addRandomTile` is the whole of the
     * game's randomness, so a no-op here is a board that only ever holds what
     * the script put on it; the two game-over methods are stubbed so a lesson
     * cannot reach handleGameOver, which is the only path that writes a score.
     */
    function makeTutorialBoard(onMove) {
        if (typeof BooleBoard !== 'function') return null;

        class TutorialBoard extends BooleBoard {
            addRandomTile() { /* the script owns the board */ }
            checkGameOver() { return false; }
            handleGameOver() { /* unreachable, and kept that way on purpose */ }

            move(dir) {
                const moved = super.move(dir);
                if (onMove) onMove(dir, moved, this);
                return moved;
            }

            /** Put a step's board down, with the height bonus suppressed. */
            loadStep(cells) {
                this._arrivals.clear();
                this.board = cells.map((r) => r.slice());
                this.previousBoard = Array(this.size).fill().map(() => Array(this.size).fill(0));
                this.score = 0;
                this.moves = 0;
                // See the header: a first-time value pays double on top, which
                // would make every prompt in this lesson disagree with the
                // overlay drawn over the tile.
                this.highestValueEver = this.maxValue;
                this.personalBestBoard = Array(this.size).fill().map(() => Array(this.size).fill(false));
                this.render();
            }
        }

        return new TutorialBoard('4', maxFor(4));
    }

    function renderBoardLesson() {
        const current = lesson();

        // The board lives in the game area, so this screen gets out of the
        // way rather than drawing a second one. Note the screen must be
        // inactive for input to reach the board at all: game.js's
        // OVERLAY_SELECTOR lists .tutorial-screen.active precisely so the
        // arrow keys cannot play a board nobody can see.
        screen.classList.remove('active');

        // And nothing ELSE may be covering it either, for the same reason and
        // with a worse failure: the strip prompts for a move, every key and
        // swipe is refused by the isActive guard, and the lesson is simply
        // dead with nothing on screen saying why. The how-to-play screen is
        // the one that does this, because it is where the primer is opened
        // from -- main.js hides it on the way in, so this is the belt to that
        // pair of braces, and it is what makes BooleTutorial.open('board')
        // safe to call from anywhere.
        ['loreScreen', 'titleScreen'].forEach((id) => {
            const node = document.getElementById(id);
            if (node) node.classList.remove('active');
        });
        document.body.classList.add('game-active');
        document.body.classList.add('tutorial-active');
        document.body.setAttribute('data-theme', 'snes');

        const strip = stripEl();
        strip.classList.add('active');

        let at = 0;

        function show() {
            const s = current.steps[at];
            stripText(s.prompt, 'swipe ' + s.hint, at + 1, current.steps.length);
            boardLesson.loadStep(s.board);
        }

        // Let the player finish reading before replacing this step's board.
        // Recheck after the event: leaving the lesson also dismisses its card.
        function afterMath(action, delay) {
            const board = boardLesson;
            const stillHere = () => boardLesson === board && strip.classList.contains('active');
            setTimeout(() => {
                if (!stillHere()) return;
                if (document.querySelector('.math-card')) {
                    const dismissed = () => {
                        document.removeEventListener('boole:math-dismissed', dismissed);
                        setTimeout(() => { if (stillHere()) action(); }, 0);
                    };
                    document.addEventListener('boole:math-dismissed', dismissed);
                } else {
                    action();
                }
            }, delay);
        }

        /**
         * Judge the move by what it did, not by which way it went.
         *
         * The first version required the step's own direction and was wrong: a
         * single row compacts the same way left and right, so every step is
         * solvable both ways and a player who swiped right was told they had
         * missed. The test caught it. Direction is the player's choice and the
         * score is the fact, so `hint` is a suggestion in the strip text and
         * the step passes when the board reaches the result it promised.
         */
        function onMove(dir, moved, board) {
            const s = current.steps[at];
            if (board.score !== s.expect.score) {
                if (!moved) {
                    // Nothing shifted at all, which on these boards means the
                    // other axis. Say so rather than leaving the board looking
                    // dead under a prompt that is still asking for something.
                    stripNudge('nothing moved that way: try ' + s.hint);
                } else {
                    stripNudge('that slid them apart; putting it back');
                    afterMath(show, 800);
                }
                return;
            }
            // The board scored this itself, with the game's real rules. No
            // separate tariff here: by this lesson it IS the game.
            award(board.score, document.getElementById('gameBoard'));
            sfx('merge');
            buzz('solved');
            at++;
            if (at < current.steps.length) {
                afterMath(show, 900);
            } else {
                afterMath(() => {
                    teardownBoard();
                    screen.classList.add('active');
                    complete(current.id);
                    renderFinish();
                }, 1100);
            }
        }

        boardLesson = makeTutorialBoard(onMove);
        if (!boardLesson) {
            // No engine: skip rather than strand the player on a dead screen.
            teardownBoard();
            screen.classList.add('active');
            complete(current.id);
            renderFinish();
            return;
        }

        // main.js owns this binding, and the lifecycle it drives -- destroy()
        // on the next game, the "new game" path -- has to find this board in
        // it or the scripted board outlives the lesson.
        root.BooleTutorial.board = boardLesson;
        if (typeof currentGame !== 'undefined') {
            try { if (currentGame && currentGame !== boardLesson) currentGame.destroy(); } catch (e) {}
            currentGame = boardLesson;
        }

        show();
    }

    let strip = null;

    function stripEl() {
        if (strip) return strip;
        strip = el('div', 'tutorial-strip');
        strip.id = 'tutorialStrip';
        strip.setAttribute('aria-live', 'polite');
        strip.appendChild(el('p', 'tutorial-strip-text'));
        const foot = el('div', 'tutorial-strip-foot');
        foot.appendChild(el('span', 'tutorial-strip-do'));
        foot.appendChild(el('span', 'tutorial-strip-count'));
        // In the foot rather than floated over the panel. Absolutely
        // positioned at the top right it sat on top of the prompt and ate the
        // end of every sentence longer than one line, which on a phone is all
        // of them.
        //
        // Leaves the primer outright rather than returning to this lesson's
        // own screen. Re-rendering would call renderBoardLesson() again, which
        // hides the screen to hand the board over -- a loop, and the first
        // version of this had it.
        const quit = button('tutorial-strip-quit', 'leave');
        quit.addEventListener('click', close);
        foot.appendChild(quit);
        strip.appendChild(foot);
        document.body.appendChild(strip);
        return strip;
    }

    function stripText(prompt, todo, n, total) {
        const s = stripEl();
        s.querySelector('.tutorial-strip-text').textContent = prompt;
        s.querySelector('.tutorial-strip-do').textContent = todo;
        s.querySelector('.tutorial-strip-count').textContent = n + ' / ' + total;
        s.classList.remove('is-nudge');
    }

    function stripNudge(text) {
        const s = stripEl();
        s.querySelector('.tutorial-strip-do').textContent = text;
        s.classList.add('is-nudge');
    }

    // ── finish ──────────────────────────────────────────────────────────────

    function renderFinish() {
        bodyEl.innerHTML = '';
        leadEl.textContent = 'That is the whole of it.';
        renderDots();

        const card = el('div', 'tut-finish');
        // The total, large, before anything else. It is the whole argument
        // that this was a mode and not a manual.
        const tally = el('div', 'tut-finish-score');
        tally.appendChild(el('span', 'tut-finish-score-value', String(runScore)));
        tally.appendChild(el('span', 'tut-finish-score-label', 'POINTS'));
        card.appendChild(tally);
        card.appendChild(el('p', 'tut-finish-line', 'Scored before you started.'));
        card.appendChild(el('p', 'tut-finish-line', 'The overflow is the move worth chasing: NOT the biggest tile, and it pays three times the maximum.'));
        bodyEl.appendChild(card);

        setTask('primer complete', true);

        // The button is replaced rather than relabelled: its handler is
        // `advance`, which from the last lesson would walk off the end.
        const fresh = button('tutorial-next', 'pick a mode →');
        fresh.addEventListener('click', () => {
            close();
            const picker = document.getElementById('difficultyModal');
            if (picker) {
                picker.dataset.from = 'lore';
                picker.classList.add('active');
                // The reel in there measures itself when the screen it lives
                // on becomes visible; a display:none modal reports zeroes.
                document.dispatchEvent(new CustomEvent('boole:mode-picker-open'));
            }
        });
        nextBtn.parentNode.replaceChild(fresh, nextBtn);
        nextBtn = fresh;
    }

    // ── dispatch ────────────────────────────────────────────────────────────

    function renderLesson() {
        const current = lesson();
        clearStepTimers();
        setQuiet(false);
        bodyEl.innerHTML = '';
        leadEl.textContent = current.lead;
        renderDots();
        setArrowLabel(nextBtn, 'next →');
        renderBoardLesson();

        const panel = screen.querySelector('.tutorial-content');
        if (panel) panel.scrollTop = 0;
    }

    /** Hand off from the bench to the one lesson that is still a lesson. */
    function startBoard() {
        index = LESSONS.findIndex((l) => l.id === 'board');
        step = 0;
        screen.classList.add('active');
        renderLesson();
    }

    /**
     * Open the bench.
     *
     * There is no "first unfinished lesson" to open at any more, because
     * there are no lessons to be unfinished: what has been found persists
     * and the apparatus is derived from it, so the bench simply comes up
     * however far along it was. `open('board')` is the one exception and
     * exists for the hand-off at the end and for the tests.
     */
    function open(which) {
        if (!screen) build();
        setScore(0);
        if (which === 'board') {
            startBoard();
            return;
        }
        // A fresh log each time. What was FOUND is saved; where the switches
        // happened to be is not worth restoring, and a table showing rows
        // ticked from a session the player does not remember is worse than
        // an empty one.
        bench = benchState();
        screen.classList.add('active');
        // settle, not renderBench, so the opening state goes into the log the
        // same way every other state does. A returning player at the counting
        // stage was shown 0000 on the switches beside "0 of 16 seen", which is
        // the meter disagreeing with the apparatus in front of it -- the same
        // fault the widen already had, arriving by a different door, because a
        // DRAW cannot write to the log and only a draw was happening here.
        //
        // Nothing can be earned by it: every check needs either two states or
        // a number the bench does not open on.
        settle();
    }

    /**
     * Put the scripted board away.
     *
     * A self-hosted problem if it is skipped: the lesson's board stays in
     * `currentGame`, so the next thing to call `currentGame.destroy()` tears
     * down a board nobody is playing, and `game-active` leaves the real board
     * showing behind the how-to-play screen. Called from close() and from the
     * end of the lesson, and safe to call when no lesson ran.
     */
    function teardownBoard() {
        if (strip) strip.classList.remove('active');
        document.body.classList.remove('tutorial-active');
        if (!boardLesson) return;
        try { boardLesson.destroy(); } catch (e) { /* already gone */ }
        if (typeof currentGame !== 'undefined' && currentGame === boardLesson) {
            currentGame = null;
            document.body.classList.remove('game-active');
        }
        boardLesson = null;
        root.BooleTutorial.board = null;
    }

    function close() {
        // The screen is deliberately inactive during lesson 4, so closing has
        // to work from there too: the strip's "leave" is the only way out of a
        // lesson in progress and it comes through here.
        const wasOpen = isOpen() || (strip && strip.classList.contains('active'));
        if (!wasOpen) return;
        screen.classList.remove('active');
        stopStepping();
        teardownBoard();
        emit('primer-closed', { done: progress.lessons.length, total: LESSONS.length });
    }

    function isOpen() {
        return !!(screen && screen.classList.contains('active'));
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen()) close();
    });

    // ON THE DOCUMENT, not on the button, for the reason startStepping
    // explains: the button is destroyed and rebuilt by its own first tick.
    // `pointercancel` matters as much as `pointerup` here -- a touch that
    // turns into a scroll is cancelled rather than released, and that is the
    // common way to let go of a button on a phone.
    ['pointerup', 'pointercancel'].forEach((name) => {
        document.addEventListener(name, stopStepping);
    });
    // A pointer released outside the window reports neither, so this is the
    // backstop that keeps a held row from counting on unattended.
    window.addEventListener('blur', stopStepping);

    // The bench's own log, for the tests and for looking at what a session
    // actually recorded. The checks are pure functions over this, so being
    // able to read it is the difference between debugging a discovery and
    // guessing at one.
    root.BooleTutorial.bench = () => bench;
    root.BooleTutorial.open = open;
    root.BooleTutorial.close = close;
    root.BooleTutorial.isOpen = isOpen;
    root.BooleTutorial.progress = () => ({ lessons: progress.lessons.slice() });
    root.BooleTutorial.complete = allDone;
    // Exists so a device can be put back to a known state while testing, the
    // same reason gamekit-achievements.js has a reset.
    root.BooleTutorial.reset = () => {
        progress = { lessons: [] };
        save();
    };
})(typeof window !== 'undefined' ? window : globalThis);
