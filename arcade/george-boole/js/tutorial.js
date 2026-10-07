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

    // The rules chapter's own wording, so a gate reads the same in the primer
    // as in the panel it is a second door to. Shown beside the gate's name
    // whenever a lesson switches gate: the glyph changing is not an
    // announcement, and a player who does not notice is answering a question
    // about a rule they think they already met.
    const GATE_MEANING = {
        XOR: 'on when they differ',
        OR: 'on if either is on',
        AND: 'on only if both are on',
        NOT: 'one lamp in, flipped',
    };

    // Lamp weights, most significant first, for a 4-bit tile.
    const WEIGHTS = [8, 4, 2, 1];

    function maxFor(bits) {
        return Math.pow(2, bits) - 1;
    }

    /** The lit lamps, added up. `lamps` is [8,4,2,1] order, 1 for on. */
    function lampSum(lamps) {
        return lamps.reduce((sum, on, i) => sum + (on ? WEIGHTS[i] : 0), 0);
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
            id: 'lamps',
            kind: 'lamps',
            title: 'four lamps',
            lead: 'A tile is four lamps. Tap one to light it, and the lit ones add up.',
            bits: 4,
            // The first version opened on "make 6" and taught nothing: the
            // arithmetic that answers it, 4 + 2, appeared only in the success
            // message, AFTER it had been solved. That is the fault the rules
            // panel's own comment levels at the codex -- the explanation
            // behind the thing it explains -- rebuilt here by accident.
            //
            // So the first step asks for nothing. Tap a lamp, watch the number
            // move, and the mechanic is met before any question is. It cannot
            // be failed, which is the point: a player who does not yet know
            // what a bit is has nothing to be wrong about yet.
            //
            // Then the targets ramp by how much arithmetic they need rather
            // than by size: 1 is a single tap and no sum at all, 3 is two
            // neighbours, 6 is a sum with a gap in it, 15 is all four. 11 was
            // in here and is gone -- 8 + 2 + 1 is three terms and a gap, which
            // is harder than 15 and was sitting before it.
            //
            // A note has to say something the sum does not. They used to read
            // "2 + 1" and "4 + 2", which was useful when the readout showed
            // only `0011 = 3` and became a stutter the moment it started
            // showing the working: "4 + 2 = 6 , 4 + 2".
            tasks: [
                { explore: true },
                { want: 1, note: 'one tap, no adding' },
                { want: 3 },
                { want: 6, note: 'the 8 and the 1 stay dark' },
                { want: 15, note: 'the most four lamps can hold' },
            ],
            done: 'That is binary. Nothing else about it is harder than this.',
        },
        {
            id: 'onebit',
            kind: 'onebit',
            title: 'one lamp at a time',
            lead: 'A gate is a rule about one lamp against one lamp: two in, one out.',
            // One task per gate, each demanding a different row of that gate's
            // table, so all four rules get used rather than read.
            //
            // NONE of them may be satisfied by the two lamps' starting state,
            // which is both off. OR asked for a dark output at first and that
            // is exactly what an untouched rig already shows, so the lesson
            // opened on a tick it had not been given -- no instruction to
            // follow, and a screen that reads as broken. The test asserts the
            // invariant now.
            //
            // `inputs` pins the pair as well as the answer, which OR needs for
            // a second reason: asked only for a lit output it would accept the
            // same 0,1 that XOR just took, and the one fact worth knowing
            // about OR is the row where the two of them disagree.
            //
            // Opens on a step that asks for nothing, for the same reason the
            // lamps lesson does: poke the two inputs, watch the output follow,
            // and the rule has been met before anybody is examined on it.
            tasks: [
                { explore: true, gate: 'XOR' },
                { gate: 'XOR', want: 1, ask: 'tap the inputs so the output lights' },
                { gate: 'AND', want: 1, ask: 'tap the inputs so the output lights' },
                { gate: 'OR', want: 1, inputs: [1, 1], ask: 'turn BOTH inputs on, where XOR went dark' },
                { gate: 'NOT', want: 0, ask: 'tap the input so the output goes dark' },
            ],
            done: 'Four rules, and that is all of them.',
        },
        {
            id: 'number',
            kind: 'number',
            title: 'a whole number',
            lead: 'The same rule, applied to all four columns at once. Nothing carries.',
            bits: 4,
            // 5 and 3 through the three binary gates give 6, 7 and 1, all
            // different, so each answer is unique -- asserted in the tests.
            // The fourth is the overflow in miniature, met here as arithmetic
            // before the board makes it worth 45 points.
            //
            // And it opens on a step that asks for nothing, like the two
            // before it: tap any gate, watch all four columns answer at once.
            // Guessing which gate makes 6 is a fair question only once you
            // have seen a gate do anything at all to a whole number.
            tasks: [
                { explore: true, a: 5, b: 3 },
                { a: 5, b: 3, want: 6, answer: 'XOR' },
                { a: 5, b: 3, want: 7, answer: 'OR' },
                { a: 5, b: 3, want: 1, answer: 'AND' },
                { a: 15, b: null, want: 0, answer: 'NOT' },
            ],
            done: 'The last one made 0000. No tile can hold 0, so that tile clears.',
        },
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
        const terms = WEIGHTS.filter((w, i) => lamps[i]);
        return {
            terms: terms,
            expr: terms.length ? terms.join(' + ') : 'nothing lit',
            sum: terms.reduce((a, b) => a + b, 0),
        };
    }

    /**
     * Is this lamp arrangement the answer to this lamps task?
     *
     * The explore step is answered by any lamp at all, so it cannot be got
     * wrong -- see the note on LESSONS[0].tasks.
     */
    function lampsSolved(task, lamps) {
        if (task.explore) return lamps.some((on) => on === 1);
        return lampSum(lamps) === task.want;
    }

    /**
     * Is this pair of inputs the answer to this onebit task?
     *
     * `inputs`, when a task carries it, pins the exact pair as well as the
     * answer: some rows of a table matter more than the value they produce,
     * and OR's 1,1 is the one that separates it from XOR.
     */
    function oneBitSolved(task, a, b) {
        // The explore step is answered by touching an input at all.
        if (task.explore) return a === 1 || b === 1;
        const second = task.gate === 'NOT' ? 0 : b;
        if (oneBit(task.gate, a, second) !== task.want) return false;
        if (!task.inputs) return true;
        return a === task.inputs[0] && (task.gate === 'NOT' || b === task.inputs[1]);
    }

    /** Has this gate answered the whole-number task? Explore takes any gate. */
    function numberSolved(task, gate, bits) {
        if (!gate) return false;
        if (task.explore) return true;
        return applyGate(gate, task.a, task.b, bits) === task.want;
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

    root.BooleTutorial = {
        LESSONS, GATE_CODE, GATE_SYMBOL, GATE_ORDER, WEIGHTS,
        maxFor, lampSum, lampsOf, bitsOf, oneBit, applyGate, gatesProducing,
        lessonById, lampsSolved, oneBitSolved, numberSolved, sumLine, columnWork,
        GATE_MEANING,
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
        return LESSONS.every((l) => isDone(l.id));
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
        if (text) node.textContent = text;
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

        // For anybody who would rather read it. The chapter is still there and
        // is still the reference; this screen is a second door to the same
        // material, which is the pattern the how-to-play screen already runs.
        const read = button('tutorial-read', 'read it instead →');
        read.addEventListener('click', () => {
            close();
            if (root.BooleRules && root.BooleRules.showSection) {
                const modal = document.getElementById('instructionsModal');
                if (modal) modal.classList.add('active');
                root.BooleRules.showSection('start with counting');
            }
        });
        footEl.appendChild(read);
        panel.appendChild(footEl);

        screen.appendChild(panel);
        document.body.appendChild(screen);
    }

    function renderDots() {
        dotsEl.innerHTML = '';
        LESSONS.forEach((lesson, i) => {
            const dot = el('span', 'tutorial-dot');
            if (i === index) dot.classList.add('is-current');
            if (isDone(lesson.id)) dot.classList.add('is-done');
            dot.dataset.lesson = lesson.id;
            dotsEl.appendChild(dot);
        });
    }

    /** The task line, and whether `next` is offered yet. */
    function setTask(text, solved) {
        solvedNow = !!solved;
        taskEl.textContent = text;
        taskEl.classList.toggle('is-solved', solvedNow);
        nextBtn.disabled = !solvedNow;
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

    // ── lesson 1: four lamps ────────────────────────────────────────────────

    function renderLamps() {
        const current = lesson();
        const task = current.tasks[step];
        const lamps = [0, 0, 0, 0];
        let touched = false;

        const rig = el('div', 'tut-lamps');
        const row = el('div', 'tut-lamp-row');
        const readout = el('div', 'tut-readout');

        // The sum, written out, above the binary rather than instead of it.
        const sumRow = el('div', 'tut-readout-sumrow');
        const exprEl = el('span', 'tut-readout-expr');
        const eqEl = el('span', 'tut-readout-eq', '=');
        const sumEl = el('span', 'tut-readout-sum', '0');
        sumRow.appendChild(exprEl);
        sumRow.appendChild(eqEl);
        sumRow.appendChild(sumEl);
        const bitsEl = el('div', 'tut-readout-bits', '0000');
        readout.appendChild(sumRow);
        readout.appendChild(bitsEl);

        function refresh() {
            const line = sumLine(lamps);
            exprEl.textContent = line.expr;
            exprEl.classList.toggle('is-empty', line.terms.length === 0);
            sumEl.textContent = String(line.sum);
            bitsEl.textContent = lamps.join('');

            const solved = lampsSolved(task, lamps);
            readout.classList.toggle('is-solved', solved);

            if (task.explore) {
                // No target, so nothing to get wrong. The step is cleared by
                // having touched a lamp at all.
                if (touched) {
                    setTask('✓ that is a tile. Light a few more if you like, then carry on.', true);
                } else {
                    setTask('tap a lamp to light it', false);
                }
                return;
            }

            if (solved) {
                sfx('merge');
                buzz('solved');
                setTask('✓ ' + line.expr + ' = ' + task.want
                    + (task.note ? ' · ' + task.note : ''), true);
            } else {
                setTask('tap the lamps to make ' + task.want, false);
            }
        }

        WEIGHTS.forEach((weight, i) => {
            const lamp = button('tut-lamp');
            lamp.dataset.weight = String(weight);
            lamp.dataset.on = '0';
            lamp.setAttribute('aria-label', 'lamp worth ' + weight);
            lamp.appendChild(el('span', 'tut-lamp-weight', String(weight)));
            // A bulb rather than a digit as the main thing: four numbered
            // boxes do not read as something to press, and "lamps" is the
            // word every screen after this one uses. The bit stays, small,
            // underneath, because it is what the binary row is made of.
            lamp.appendChild(el('span', 'tut-lamp-bulb'));
            lamp.appendChild(el('span', 'tut-lamp-bit', '0'));
            lamp.addEventListener('click', () => {
                lamps[i] = lamps[i] ? 0 : 1;
                touched = true;
                lamp.dataset.on = lamps[i] ? '1' : '0';
                lamp.querySelector('.tut-lamp-bit').textContent = String(lamps[i]);
                sfx('move');
                refresh();
            });
            row.appendChild(lamp);
        });

        rig.appendChild(row);
        rig.appendChild(readout);
        bodyEl.appendChild(rig);
        refresh();
    }

    // ── lesson 2: one lamp against one lamp ─────────────────────────────────

    function renderOneBit() {
        const current = lesson();
        const task = current.tasks[step];
        const unary = task.gate === 'NOT';
        const inputs = [0, 0];
        let touched = false;

        const rig = el('div', 'tut-onebit');
        rig.dataset.gate = task.gate.toLowerCase();

        // Which gate this is, said out loud. The lesson changes gate between
        // tasks and the only signal used to be the glyph quietly becoming a
        // different glyph, so a player could answer a question about AND still
        // thinking they were looking at XOR.
        const head = el('div', 'tut-gate-head');
        head.appendChild(el('span', 'tut-gate-head-glyph', GATE_SYMBOL[task.gate]));
        head.appendChild(el('span', 'tut-gate-head-name', task.gate));
        head.appendChild(el('span', 'tut-gate-head-meaning', GATE_MEANING[task.gate]));
        rig.appendChild(head);

        const line = el('div', 'tut-onebit-line');
        const out = el('span', 'tut-onebit-out', '0');

        // The gate's own table, with the row the player is standing on lit as
        // they move. The static version of this is four cards of text in the
        // rules; the point of it here is that it is theirs. Built before the
        // lamps so one refresh() can update both.
        const table = el('div', 'tut-truth');
        const rows = unary ? [[0], [1]] : [[0, 0], [0, 1], [1, 0], [1, 1]];
        rows.forEach((pair) => {
            const r = el('div', 'tut-truth-row');
            r.dataset.key = pair.join('');
            r.textContent = unary
                ? GATE_SYMBOL.NOT + ' ' + pair[0] + ' = ' + oneBit('NOT', pair[0], 0)
                : pair[0] + ' ' + GATE_SYMBOL[task.gate] + ' ' + pair[1] + ' = ' + oneBit(task.gate, pair[0], pair[1]);
            table.appendChild(r);
        });

        function refresh() {
            const value = oneBit(task.gate, inputs[0], unary ? 0 : inputs[1]);
            out.textContent = String(value);
            out.dataset.on = value ? '1' : '0';

            const key = unary ? String(inputs[0]) : inputs.join('');
            table.querySelectorAll('.tut-truth-row').forEach((r) => {
                r.classList.toggle('is-here', r.dataset.key === key);
            });

            const shown = unary
                ? GATE_SYMBOL.NOT + ' ' + inputs[0] + ' = ' + value
                : inputs[0] + ' ' + GATE_SYMBOL[task.gate] + ' ' + inputs[1] + ' = ' + value;

            if (task.explore) {
                rig.classList.toggle('is-solved', touched);
                if (touched) {
                    setTask('✓ ' + shown + ' · that row is lit below. Try the others, then carry on.', true);
                } else {
                    setTask('tap an input and watch the output follow', false);
                }
                return;
            }

            const solved = oneBitSolved(task, inputs[0], inputs[1]);
            rig.classList.toggle('is-solved', solved);
            if (solved) {
                sfx('merge');
                buzz('solved');
                setTask('✓ ' + shown, true);
            } else {
                setTask(task.ask, false);
            }
        }

        function inputLamp(i) {
            const lamp = button('tut-bit');
            lamp.dataset.on = '0';
            lamp.textContent = '0';
            lamp.setAttribute('aria-label', 'input ' + (i + 1));
            lamp.addEventListener('click', () => {
                inputs[i] = inputs[i] ? 0 : 1;
                touched = true;
                lamp.dataset.on = inputs[i] ? '1' : '0';
                lamp.textContent = String(inputs[i]);
                sfx('move');
                refresh();
            });
            return lamp;
        }

        if (unary) {
            line.appendChild(el('span', 'tut-onebit-glyph', GATE_SYMBOL.NOT));
            line.appendChild(inputLamp(0));
        } else {
            line.appendChild(inputLamp(0));
            line.appendChild(el('span', 'tut-onebit-glyph', GATE_SYMBOL[task.gate]));
            line.appendChild(inputLamp(1));
        }
        line.appendChild(el('span', 'tut-onebit-eq', '='));
        line.appendChild(out);
        rig.appendChild(line);
        // The table is the teaching, so say what it is. Unlabelled it reads as
        // four more numbers rather than as the complete rule, and the lit row
        // reads as decoration rather than as where the player is standing.
        rig.appendChild(el('p', 'tut-truth-cap',
            unary ? 'the whole rule, both rows. Yours is lit:'
                  : 'the whole rule, all four rows. Yours is lit:'));
        rig.appendChild(table);

        bodyEl.appendChild(rig);
        refresh();
    }

    // ── lesson 3: a whole number ────────────────────────────────────────────

    function renderNumber() {
        const current = lesson();
        const task = current.tasks[step];
        const bits = current.bits;
        const unary = task.b === null || task.b === undefined;
        let picked = null;
        const operandText = unary ? String(task.a) : task.a + ' and ' + task.b;

        const rig = el('div', 'tut-number');

        /** One operand as its lamp columns, with the weights above. */
        function bitRow(value, label, role) {
            const r = el('div', 'tut-bitrow tut-bitrow-' + role);
            r.appendChild(el('span', 'tut-bitrow-label', label));
            const cells = el('span', 'tut-bitrow-cells');
            for (const ch of bitsOf(value, bits)) {
                const cell = el('span', 'tut-bitcell', ch);
                cell.dataset.on = ch;
                cells.appendChild(cell);
            }
            r.appendChild(cells);
            r.appendChild(el('span', 'tut-bitrow-dec', value === null ? '' : String(value)));
            return r;
        }

        const work = el('div', 'tut-work');
        const weights = el('div', 'tut-bitrow tut-bitrow-weights');
        weights.appendChild(el('span', 'tut-bitrow-label', ''));
        const wcells = el('span', 'tut-bitrow-cells');
        WEIGHTS.forEach((w) => wcells.appendChild(el('span', 'tut-bitcell is-weight', String(w))));
        weights.appendChild(wcells);
        weights.appendChild(el('span', 'tut-bitrow-dec', ''));
        work.appendChild(weights);
        work.appendChild(bitRow(task.a, '', 'a'));
        if (!unary) work.appendChild(bitRow(task.b, '', 'b'));

        const opRow = el('div', 'tut-bitrow tut-bitrow-op');
        const opLabel = el('span', 'tut-bitrow-label', '?');
        opRow.appendChild(opLabel);
        opRow.appendChild(el('span', 'tut-bitrow-cells', '────'));
        opRow.appendChild(el('span', 'tut-bitrow-dec', ''));
        work.appendChild(opRow);

        const resultRow = bitRow(0, '', 'result');
        resultRow.classList.add('is-pending');
        work.appendChild(resultRow);
        rig.appendChild(work);

        // The point of the whole lesson, written out: a gate does not know
        // what 5 is. It runs the SAME one-bit rule the lesson before taught,
        // once per column, and nothing carries between them. Without this the
        // table above is four columns of bits changing for reasons the player
        // has to infer.
        const colsCap = el('p', 'tut-cols-cap', 'the same rule, once per column:');
        const cols = el('div', 'tut-cols');
        rig.appendChild(colsCap);
        rig.appendChild(cols);

        function showColumns(gate) {
            cols.innerHTML = '';
            columnWork(gate, task.a, unary ? null : task.b, bits).forEach((c) => {
                const item = el('div', 'tut-col');
                item.dataset.on = String(c.result);
                item.appendChild(el('span', 'tut-col-weight', String(c.weight)));
                item.appendChild(el('span', 'tut-col-sum', c.b === null
                    ? GATE_SYMBOL[gate] + ' ' + c.a + ' = ' + c.result
                    : c.a + ' ' + GATE_SYMBOL[gate] + ' ' + c.b + ' = ' + c.result));
                cols.appendChild(item);
            });
        }

        function showResult(gate) {
            const value = applyGate(gate, task.a, unary ? null : task.b, bits);
            opLabel.textContent = GATE_SYMBOL[gate];
            resultRow.classList.remove('is-pending');
            const cells = resultRow.querySelector('.tut-bitrow-cells');
            cells.innerHTML = '';
            for (const ch of bitsOf(value, bits)) {
                const cell = el('span', 'tut-bitcell', ch);
                cell.dataset.on = ch;
                cells.appendChild(cell);
            }
            resultRow.querySelector('.tut-bitrow-dec').textContent = String(value);
            return value;
        }

        const picker = el('div', 'tut-gates');
        if (unary) picker.dataset.only = 'not';
        GATE_ORDER.forEach((name) => {
            // NOT takes one operand, so it is not an answer to a two-tile
            // question and the other three are not answers to a one-tile one.
            // Offering a gate that cannot apply teaches the wrong thing.
            if (unary !== (name === 'NOT')) return;
            const btn = button('tut-gate');
            btn.dataset.gate = name.toLowerCase();
            btn.appendChild(el('span', 'tut-gate-glyph', GATE_SYMBOL[name]));
            btn.appendChild(el('span', 'tut-gate-name', name));
            btn.addEventListener('click', () => {
                picked = name;
                picker.querySelectorAll('.tut-gate').forEach((b) => {
                    b.classList.toggle('is-picked', b.dataset.gate === name.toLowerCase());
                });
                const value = showResult(name);
                showColumns(name);

                if (task.explore) {
                    sfx('move');
                    rig.classList.add('is-solved');
                    setTask('✓ ' + name + ' turns ' + operandText + ' into ' + value
                        + ' · four columns, no carrying. Try the others, then carry on.', true);
                    return;
                }

                if (value === task.want) {
                    sfx('merge');
                    buzz('solved');
                    rig.classList.add('is-solved');
                    setTask('✓ ' + name + ' makes ' + task.want, true);
                } else {
                    rig.classList.remove('is-solved');
                    setTask(name + ' makes ' + value + ', not ' + task.want + '. Try another.', false);
                }
            });
            picker.appendChild(btn);
        });
        rig.appendChild(picker);

        bodyEl.appendChild(rig);
        setTask(task.explore
            ? 'tap a gate and watch all four columns'
            : 'tap the gate that turns ' + operandText + ' into ' + task.want, false);
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
                    setTimeout(show, 800);
                }
                return;
            }
            sfx('merge');
            buzz('solved');
            at++;
            if (at < current.steps.length) {
                setTimeout(show, 900);
            } else {
                setTimeout(() => {
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
        card.appendChild(el('p', 'tut-finish-line', 'Four lamps, four rules, one board.'));
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
            }
        });
        nextBtn.parentNode.replaceChild(fresh, nextBtn);
        nextBtn = fresh;
    }

    // ── dispatch ────────────────────────────────────────────────────────────

    function renderLesson() {
        const current = lesson();
        bodyEl.innerHTML = '';
        leadEl.textContent = current.lead;
        renderDots();
        nextBtn.textContent = 'next →';

        if (current.kind === 'lamps') renderLamps();
        else if (current.kind === 'onebit') renderOneBit();
        else if (current.kind === 'number') renderNumber();
        else if (current.kind === 'board') renderBoardLesson();

        const panel = screen.querySelector('.tutorial-content');
        if (panel) panel.scrollTop = 0;
    }

    /** Open at the first unfinished lesson, or at the start if all are done. */
    function open(lessonId) {
        if (!screen) build();
        if (lessonId && lessonById(lessonId)) {
            index = LESSONS.findIndex((l) => l.id === lessonId);
        } else {
            const first = LESSONS.findIndex((l) => !isDone(l.id));
            index = first === -1 ? 0 : first;
        }
        step = 0;
        screen.classList.add('active');
        renderLesson();
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
        teardownBoard();
        emit('primer-closed', { done: progress.lessons.length, total: LESSONS.length });
    }

    function isOpen() {
        return !!(screen && screen.classList.contains('active'));
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen()) close();
    });

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
