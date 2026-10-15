// core/formats.js — the print formats, as data, and the one place
// millimetres become pixels.
//
// core/gatefold.js's header promised this file before it existed: the size is
// { unit, trim, bleed, safe, dpi } precisely so a J-card is a VALUE in that
// field rather than a migration. This is the table of those values, and the
// four square pixel sizes join it so the picker reads ONE list — they were
// hand-typed into index.html and separately declared as a SQUARE_SIZES
// constant nobody read, which is two lists and no source of truth.
//
// A FORMAT IS DATA. Adding the CD wallet, the digipak or the vinyl jacket
// later is an entry in FORMATS and nothing else: no new branch, no new UI.
//
// Pure: no DOM, no ctx. It answers questions about numbers.

(function () {
    'use strict';

    const App = (window.Gatefold = window.Gatefold || {});

    const MM_PER_IN = 25.4;
    function inch(n) { return n * MM_PER_IN; }

    const DEFAULT_DPI = 300;
    const DEFAULT_SIZE_PX = 1024;
    const SQUARE_SIZES = [512, 1024, 2048, 4096];

    /* ── the cassette J-card, in millimetres ──────────────
       THE PANELS STACK, so the front reads right-way-up and every fold is
       horizontal. That is the orientation every printer template uses, and it
       is why panelAxis is 'y' and trim.w — the card width — is the one
       dimension that never changes.

         card width   4 in        101.6
         front        2 9/16 in    65.0875
         spine        1/2 in       12.7
         back flap    1 1/16 in    26.9875
         flap n       front - n/16 in — 2 1/2, 2 7/16, 2 3/8, 2 5/16, 2 1/4.
                      Each is 1/16 in NARROWER than the one before it, which
                      is why they nest when the card is folded rather than
                      fouling
         bleed        1/8 in        3.175
         safe margin  1/8 in        3.175   from every cut AND every fold

       THE FLAPS CHAIN FROM THE FRONT, NOT THE BACK, and this file had it the
       other way. Wikipedia's sentence — "the other flaps are 1/16 inches less
       than the one before" — reads either way in isolation, and reading "the
       one before" as the BACK flap made every additional panel about an inch
       where it should be about two and a half. A JP1 came out 5.125 in
       against a real card's 6.625, so anything past JP0 was a template that
       could not be cut or folded.

       National Audio Company's production templates settle it, and they are
       the reason these are numbers rather than a re-reading: their 4-panel
       card is 6.625 in — 2.5625 + 2.5 + 1.0625 + 0.5 — and their 5-panel is
       9.0625, adding 2.4375. Those are exactly JP0 plus front - n/16, so
       JP1 and JP2 now reproduce the two published templates to the sixteenth.
       duplication.com lists the same five additional panels as 2 1/2, 2 7/16,
       2 3/8, 2 5/16 and 2 1/4, and JP5 comes to exactly 16 in across the
       eight flaps Wikipedia describes. The old table made JP5 8.5 in and no
       template anywhere agreed with it.

       Sources: en.wikipedia.org/wiki/J-card for the 1/16 in nesting rule and
       that a card runs to eight panels; National Audio Company's 3-, 4- and
       5-panel J-card templates for the panel measurements; and
       duplication.com/printspecs, whose JP0..JP5 naming the ids below follow
       — JP0 is a plain J-card and JPn is a J-card plus n additional panels.

       THE U-CARD IS DELIBERATELY ABSENT. The sources describe it and none of
       them publish its dimensions, and a guessed print template is worse than
       a missing one: it produces a file that looks right and cuts wrong. It
       is one more entry here the day the numbers exist, which is the whole
       point of a format being data. */
    const JCARD = {
        width: inch(4),
        front: inch(2 + 9 / 16),
        spine: inch(1 / 2),
        back: inch(1 + 1 / 16),
        step: inch(1 / 16),
        bleed: inch(1 / 8),
        safe: inch(1 / 8),
    };

    /** The strip for a J-card with `extra` panels beyond the back flap. */
    function jcardPanels(extra) {
        const panels = [
            { name: 'FRONT', len: JCARD.front },
            { name: 'SPINE', len: JCARD.spine },
            { name: 'BACK', len: JCARD.back },
        ];
        /* front, not back — see the header. The first additional panel is a
           sixteenth under the FRONT flap, and each one after that a sixteenth
           under its predecessor. */
        for (let i = 1; i <= extra; i++) {
            panels.push({ name: 'FLAP ' + i, len: JCARD.front - i * JCARD.step });
        }
        return panels;
    }

    function totalLen(panels) {
        let t = 0;
        for (const p of panels) t += p.len;
        return t;
    }

    function jcardSize(extra) {
        const panels = jcardPanels(extra);
        return {
            unit: 'mm',
            trim: { w: JCARD.width, h: totalLen(panels) },
            bleed: JCARD.bleed,
            safe: JCARD.safe,
            dpi: DEFAULT_DPI,
            panelAxis: 'y',
            panels: panels,
        };
    }

    /* ── the CD jewel case, in millimetres ────────────────
       THE FIRST FORMATS WHOSE PANELS RUN ACROSS. A J-card stacks so its front
       reads right-way-up; a tray card is SPINE | BACK | SPINE left to right,
       and a booklet spread is two pages side by side. Both are panelAxis 'x',
       which core/panels.js, core/marks.js and ui/render.js have all
       implemented since print formats landed and nothing had yet used.

         booklet page   120.65 x 119.855   4.75 x 4.719 in
         4-page spread  241.3  x 119.855   exactly two pages, no allowance
         tray card      150.5  x 117.5     5.925 x 4.626 in
           spine          6.35             1/4 in, and there are two of them
           back tray    137.8              5.425 in
         bleed            3.175            1/8 in
         safe             3.175            1/8 in

       The tray card's three panels sum exactly, in both units: 6.35 + 137.8 +
       6.35 = 150.5, and 0.25 + 5.425 + 0.25 = 5.925. The two are not exact
       conversions of one another — the vendor rounded, and 150.5mm is
       5.92520in — but they disagree by five microns, which is six hundredths
       of a dot at 300dpi and cannot survive the rounding in dots() anyway.
       MILLIMETRES ARE PRIMARY here, as they are for every mm format in this
       file.

       Sources: Copycats Media's CD template specifications, which publish the
       tray card and booklet in both units and are self-consistent in each;
       duplication.com's rule that every paper item carries 1/8 in of bleed
       and 1/8 in of safety margin. The 5pt minimum type size those specs also
       carry is not represented — this file describes geometry, and a type
       floor is advice about content.

       DIGIPAKS AND WALLETS ARE ABSENT for the U-card's reason: the panel
       counts are published and the panel MEASUREMENTS are not. */
    const CD = {
        page: { w: 120.65, h: 119.855 },
        tray: { w: 150.5, h: 117.5 },
        spine: 6.35,
        back: 137.8,
        bleed: inch(1 / 8),
        safe: inch(1 / 8),
    };

    /** One booklet page: the 1-panel insert, and the cover of any booklet. */
    function cdPageSize() {
        return {
            unit: 'mm',
            trim: { w: CD.page.w, h: CD.page.h },
            bleed: CD.bleed, safe: CD.safe, dpi: DEFAULT_DPI,
        };
    }

    /**
     * The flat sheet of a 4-page booklet: two pages, one fold.
     *
     * ONE SPREAD IS ONE DOCUMENT. A 4-page booklet is a single sheet printed
     * both sides, so it is two of these — the outer carrying the back and
     * front covers, the inner carrying pages 2 and 3. Anything longer needs
     * imposition, which decides which page prints beside which across several
     * sheets, and that is a different program to this one: the artboard here
     * is one flat surface with one elements list.
     *
     * The panels are LEFT and RIGHT rather than named after page numbers,
     * because which pages these are depends on which side of the sheet is
     * being drawn and this file cannot know that.
     */
    function cdSpreadSize() {
        return {
            unit: 'mm',
            trim: { w: CD.page.w * 2, h: CD.page.h },
            bleed: CD.bleed, safe: CD.safe, dpi: DEFAULT_DPI,
            panelAxis: 'x',
            panels: [
                { name: 'LEFT', len: CD.page.w },
                { name: 'RIGHT', len: CD.page.w },
            ],
        };
    }

    /** The tray card: the back cover, with a spine at each end. */
    function cdTraySize() {
        return {
            unit: 'mm',
            trim: { w: CD.tray.w, h: CD.tray.h },
            bleed: CD.bleed, safe: CD.safe, dpi: DEFAULT_DPI,
            panelAxis: 'x',
            /* Two panels called SPINE, which is not a mistake: a tray card has
               one at each end and they are read from opposite sides of the
               case. */
            panels: [
                { name: 'SPINE', len: CD.spine },
                { name: 'BACK', len: CD.back },
                { name: 'SPINE', len: CD.spine },
            ],
        };
    }

    /* ── the record jackets ──────────────────────────
       ONE FACE, NO FOLDS — for three of the four. A jacket face is a plain
       rectangle with a bleed, which made the 12-inch the first format here
       with a safe margin and no panels at all: core/panels.js answers with
       its one PAGE box and draws the safe rectangle, and core/marks.js gives
       it crop marks and no fold ticks, both without a branch.

         12-inch jacket    12 3/8 in            314.325     square
         10-inch jacket    10 3/8 x 10 7/16     263.525 x 265.1125
         7-inch jacket      7 1/4 in            184.15      square
         7-inch gatefold   14 5/16 x 7 1/8      363.5375 x 180.975
           panel            7 1/16 in           179.3875    and there are two
           spine            3/16 in               4.7625
         bleed              1/8 in                3.175
         safe               1/4 in                6.35      TWICE every other
                                                            format in this file

       The safe margin is the one number that is not this file's usual 1/8 in,
       and it is not a slip: a record jacket is a glued paper wrap whose edges
       move more than a trimmed card's, and the vinyl specs published for it
       ask for a quarter inch. It is the same quarter inch on all four.

       A JACKET IS NOT RELIABLY SQUARE, and this file assumed it was for as
       long as the 12-inch was the only one. duplication.com publish their
       10-inch finished at 10-3/8 x 10-7/16 and their 12-inch blank at 12.25 x
       12.3125 — both a sixteenth of an inch TALLER than wide, because the
       glued wrap needs the clearance in one direction and not the other. The
       7-inch is square at their own spec and the 10-inch is not, which reads
       like drift and is not: it is what each is published as, and this file's
       rule is the published number in the unit it is published in.

       WHICH LEAVES THE 12-INCH DISAGREEING WITH ITS OWN VENDOR, DELIBERATELY.
       `jacket12` below is 12 3/8 square, the industry-standard finished
       jacket and the figure quoted nearly everywhere; duplication.com's own
       blank jacket is 12.25 x 12.3125. Both are real and they are different
       products. It has NOT been reconciled here, because an export somebody
       has already measured is exactly what core/marks.js's header refuses to
       change quietly — and because the 12 3/8 traces to a gatefold PANEL
       quote (13 x 12.375) rather than to a single-pocket jacket spec, which
       is a weaker pin than the three below and worth someone's attention
       before it is trusted further.

       THE GATEFOLD IS NO LONGER ABSENT, which this file called a shame in
       this program of all programs. What made it absent was the 12-inch
       gatefold's spine: it depends on how many records are inside, published
       flat sizes run 24.75 to 25 in, and that is a job specification rather
       than a format. NONE OF THAT IS TRUE OF THE 7-INCH. It holds one record,
       duplication.com publish a single 3/16 in spine for it, and their open
       size closes exactly on it — 7.0625 + 0.1875 + 7.0625 = 14.3125, to
       the sixteenth, in the unit they publish. So the 12-inch gatefold is
       still out for its original reason and the 7-inch is in, and the
       distinction is the spine being a published constant rather than a job's
       variable.

       Its panels are LEFT | SPINE | RIGHT for cdSpreadSize's reason: a
       gatefold is printed both sides, the outer carrying the back and front
       covers and the inner carrying the spread, so which cover a panel is
       depends on which side of the sheet is being drawn and this file cannot
       know that. THE SPINE IS TOO NARROW FOR ITS OWN NAME — 3/16 in is 56
       dots at 300dpi where the word wants about 85 — so ui/render.js
       measures it against the `room` panels.lines() reports and draws
       nothing, exactly as a CD tray card's quarter-inch spines already do.

       Sources: duplication.com's vinyl record packaging catalogue, which
       publishes each of these as a finished size in inches — the 7-inch
       jackets at 7.25 x 7.25, the 10-inch at 10-3/8 x 10-7/16 folded, and the
       7 Inch White Gatefold Jacket at 14-5/16 W x 7-1/8 H with a 3/16 spine
       — and the same site's rule, already this file's authority for the
       J-card, that every paper print item carries 1/8 in of bleed.

       WHAT IS STILL MISSING is the 12-inch gatefold, above; the 10-inch
       gatefold and fold-over jackets, whose templates every plant ships as a
       PDF and none publishes as a number; and the inner sleeve, which is
       printed on different stock and is not a jacket. */
    const LP = {
        /* Inches, because that is the unit the vendor publishes. A height
           given as null is a square. */
        jacket12: { w: 12.375, h: null },
        jacket10: { w: 10.375, h: 10.4375 },
        jacket7: { w: 7.25, h: null },
        gate7: { open: 14.3125, h: 7.125, spine: 3 / 16 },
        bleed: inch(1 / 8),
        safe: inch(1 / 4),
    };

    /** One jacket face, from an entry in LP. */
    function lpFace(j) {
        return {
            unit: 'mm',
            trim: { w: inch(j.w), h: inch(j.h === null ? j.w : j.h) },
            bleed: LP.bleed, safe: LP.safe, dpi: DEFAULT_DPI,
        };
    }

    function lpJacketSize() { return lpFace(LP.jacket12); }
    function lp10JacketSize() { return lpFace(LP.jacket10); }
    function lp7JacketSize() { return lpFace(LP.jacket7); }

    /**
     * The 7-inch gatefold, open flat: one sheet, two covers and the fold
     * between them.
     *
     * THE PANEL WIDTH IS DERIVED, NOT TYPED. The vendor publishes the open
     * width and the spine and not the panel, so writing 7.0625 here would be
     * this file storing the answer to its own subtraction — and a later
     * correction to either published number would leave the three disagreeing
     * with a strip that still summed. Deriving it means the panels sum to the
     * trim by construction, which is the one property a fold has to have.
     */
    function lp7GatefoldSize() {
        const g = LP.gate7;
        const panel = (g.open - g.spine) / 2;
        return {
            unit: 'mm',
            trim: { w: inch(g.open), h: inch(g.h) },
            bleed: LP.bleed, safe: LP.safe, dpi: DEFAULT_DPI,
            panelAxis: 'x',
            panels: [
                { name: 'LEFT', len: inch(panel) },
                { name: 'SPINE', len: inch(g.spine) },
                { name: 'RIGHT', len: inch(panel) },
            ],
        };
    }

    /* Kept identical to core/gatefold.js's, because the registry is now where
       the four squares come from and the two must not drift. */
    function squareSize(px) {
        return { unit: 'px', trim: { w: px, h: px }, bleed: 0, safe: 0 };
    }

    /* ── the registry ───────────────────────────────────── */

    /**
     * A REGISTRY ENTRY.
     *
     *   id     stable, and NEVER WRITTEN TO A FILE. The document stores the
     *          SIZE; the id is only what the picker highlights, so retiring a
     *          preset can never orphan a document that used it.
     *   group  the heading the picker files it under.
     *   label  what the picker shows. Short on purpose: the option list is
     *          7px Press Start 2P in a narrow column and does not wrap.
     *   note   what the label does not say. JP3, 4PP and TRAY are trade
     *          names, and a picker that assumes you know them is a picker for
     *          whoever wrote it. ui/sizes.js hangs this off each option as a
     *          title, which is the only room there is for a sentence.
     *   tier   'full' for anything that is not a square in pixels. LITE keeps
     *          exactly the four sizes live on magmacrunch.com today, and
     *          core/tier.js's `sizes` capability is the gate — this is its
     *          first reader, having been declared and unused since the port.
     *   size() A FUNCTION, not an object. The document takes ownership of
     *          what it is handed and mutates it; a shared literal would make
     *          two J-card documents the same object.
     */
    const FORMATS = [].concat(
        SQUARE_SIZES.map(function (px) {
            return {
                id: 'square-' + px,
                group: 'SQUARE',
                label: String(px),
                note: px + ' x ' + px + ' pixels — a square cover, for a screen',
                tier: 'lite',
                size: function () { return squareSize(px); },
            };
        }),
        /* JP0..JP5 are GENERATED. Six near-identical strips differing only in
           a 1/16 in step is six chances to mistype one in a way nothing would
           catch — the numbers are almost the same. Wikipedia notes a card
           runs to eight panels, which is JP5. */
        [0, 1, 2, 3, 4, 5].map(function (extra) {
            return {
                id: 'jcard-jp' + extra,
                group: 'CASSETTE',
                label: 'JP' + extra,
                note: extra === 0
                    ? 'Cassette J-card: front, spine and back flap. 4 x 4 1/8 in'
                    : 'Cassette J-card plus ' + extra + ' extra '
                        + (extra === 1 ? 'flap' : 'flaps') + ', folding inside the case',
                tier: 'full',
                size: function () { return jcardSize(extra); },
            };
        }),
        /* Same-group entries MUST stay contiguous: ui/sizes.js writes a
           heading whenever the group changes as it walks this list, so a
           split group would print its heading twice. */
        [
            {
                id: 'cd-front', label: 'FRONT', size: cdPageSize,
                note: 'One CD booklet page — the insert behind the front of the case',
            },
            {
                id: 'cd-spread', label: '4PP', size: cdSpreadSize,
                note: 'A 4-page CD booklet laid flat: two pages and the fold between them',
            },
            {
                id: 'cd-tray', label: 'TRAY', size: cdTraySize,
                note: 'CD tray card — the back cover, with a spine at each end',
            },
        ].map(function (e) {
            return {
                id: e.id, group: 'CD', label: e.label, note: e.note,
                tier: 'full', size: e.size,
            };
        }),
        /* Largest first, and the one that folds last, as the CD group puts
           TRAY after its two flat pages. */
        [
            {
                id: 'lp-12', label: '12IN', size: lpJacketSize,
                note: 'One face of a 12-inch record jacket, front or back. 12 3/8 in square',
            },
            {
                id: 'lp-10', label: '10IN', size: lp10JacketSize,
                note: 'One face of a 10-inch record jacket. 10 3/8 x 10 7/16 in, '
                    + 'a sixteenth taller than it is wide',
            },
            {
                id: 'lp-7', label: '7IN', size: lp7JacketSize,
                note: 'One face of a 7-inch single jacket. 7 1/4 in square',
            },
            {
                id: 'lp-7-gate', label: '7GATE', size: lp7GatefoldSize,
                note: 'A 7-inch gatefold laid flat: two covers and the 3/16 in '
                    + 'spine between them. 14 5/16 x 7 1/8 in',
            },
        ].map(function (e) {
            return {
                id: e.id, group: 'VINYL', label: e.label, note: e.note,
                tier: 'full', size: e.size,
            };
        })
    );

    function byId(id) {
        return FORMATS.find(function (f) { return f.id === id; }) || null;
    }

    function sizeOf(id) {
        const f = byId(id);
        return f ? f.size() : null;
    }

    /* Millimetre panel lengths are sums of sixteenths scaled by 25.4 and do
       not land on exact binary fractions, so sizes are compared with a
       tolerance rather than by equality. */
    const NEAR = 1e-6;
    function close(a, b) { return Math.abs((a || 0) - (b || 0)) < NEAR; }

    function sameSize(a, b) {
        if (!a || !b || a.unit !== b.unit) return false;
        if (!close(a.trim && a.trim.w, b.trim && b.trim.w)) return false;
        if (!close(a.trim && a.trim.h, b.trim && b.trim.h)) return false;
        if (!close(a.bleed, b.bleed) || !close(a.safe, b.safe)) return false;
        if ((a.dpi || 0) !== (b.dpi || 0)) return false;
        if ((a.panelAxis || null) !== (b.panelAxis || null)) return false;
        const pa = a.panels || [];
        const pb = b.panels || [];
        if (pa.length !== pb.length) return false;
        for (let i = 0; i < pa.length; i++) {
            if (!close(pa[i] && pa[i].len, pb[i] && pb[i].len)) return false;
        }
        return true;
    }

    /**
     * Which preset a size IS, or null for a size nobody offered.
     *
     * The picker's highlight, and nothing else. A null is a LEGITIMATE
     * document — a file from a build with a preset this one has retired is
     * still perfectly openable — so the picker says CUSTOM rather than
     * treating it as an error.
     */
    function matchId(size) {
        for (const f of FORMATS) {
            if (sameSize(f.size(), size)) return f.id;
        }
        return null;
    }

    /* ── the px/mm boundary ─────────────────────────────── */

    /**
     * THE ONE PLACE MILLIMETRES BECOME PIXELS.
     *
     * DOCUMENT UNITS ARE THE PIXELS THE DOCUMENT RASTERISES TO. For a px size
     * that is the number in the file; for a mm size it is dpi/25.4 of it.
     * That is what keeps a font size, a stroke width, a handle and an
     * import's 40% meaning the same thing on a J-card as on a 1024 cover.
     *
     * Coordinates in actual millimetres would silently rescale every one of
     * them by twelve: the default font size of 48 would be 48mm on a 101.6mm
     * card, geometry.clampFontSize's ceiling — the guard against a renderer
     * that dies rasterising a runaway glyph — would drop from 1024 to 105,
     * and the font slider's 8..200 would span "invisible" to "four times the
     * card".
     *
     * THE FILE STILL STORES MILLIMETRES, because that is the physical truth
     * and what a printer is told. The two are reconciled here and nowhere
     * else; nothing downstream of this function ever sees a millimetre, and
     * there is no ctx.scale() anywhere — one document unit is one surface
     * pixel for every document.
     *
     * dpi is therefore PART OF THE PRESET and not a control. Changing it
     * would rescale every coordinate in the document, which is a
     * document-wide transform and not a size change.
     */
    /**
     * A surface dimension, in whole dots.
     *
     * THE SETTLE BEFORE THE ROUND IS LOAD-BEARING. A card's panel lengths are
     * sixteenths of an inch stored as millimetres, so the strip comes back a
     * hair under or over its exact value depending on which panels were
     * summed — and at 300dpi several land on exact HALF dots, right where
     * Math.round changes its mind. Measured: JP0 and JP1 are exact halves at
     * 1312.5 and 2062.5, while JP2 arrives as 2793.7499999999995 for an exact
     * 2793.75 and JP4 as 4199.999999999999 for a whole 4200. A half that
     * arrived low would round the other way from one that arrived high, so
     * two cards from one table would disagree about which way a half goes.
     * Settling
     * to six decimals first throws away the drift and keeps the half, which
     * makes the surface a function of the dimensions rather than of the order
     * they were added in.
     */
    function dots(v) { return Math.round(Number(v.toFixed(6))); }

    function metrics(size) {
        const s = size || {};
        const unit = s.unit === 'mm' ? 'mm' : 'px';
        const dpi = unit === 'mm' ? (s.dpi || DEFAULT_DPI) : null;
        const k = unit === 'mm' ? dpi / MM_PER_IN : 1;

        const trimW = ((s.trim && s.trim.w) || DEFAULT_SIZE_PX) * k;
        const trimH = ((s.trim && (s.trim.h || s.trim.w)) || DEFAULT_SIZE_PX) * k;
        const bleed = (s.bleed || 0) * k;
        const safe = (s.safe || 0) * k;

        const axis = s.panelAxis === 'x' || s.panelAxis === 'y' ? s.panelAxis : null;
        const panels = [];
        if (axis && Array.isArray(s.panels)) {
            let at = 0;
            for (const p of s.panels) {
                const len = ((p && p.len) || 0) * k;
                panels.push({ name: (p && p.name) || '', at: at, len: len });
                at += len;
            }
        }

        return {
            unit: unit,
            dpi: dpi,
            k: k,
            trim: { w: trimW, h: trimH },
            bleed: bleed,
            safe: safe,
            /* THE SURFACE is the trim plus bleed on all four sides, and it is
               the ONLY thing rounded: canvas.width takes an integer and a
               J-card at 300dpi is 1312.5 dots tall. Panel offsets stay
               fractional, so six folds do not accumulate six roundings. */
            surface: { w: dots(trimW + bleed * 2), h: dots(trimH + bleed * 2) },
            /* Where the trim's top-left lands on the surface. Element
               coordinates have their origin HERE, which is what puts the
               bleed at negative x and y exactly as core/gatefold.js's header
               says — and why changing the bleed later never translates a
               single element. */
            origin: { x: bleed, y: bleed },
            panelAxis: axis,
            panels: panels,
        };
    }

    /**
     * The ceiling on a text element's font size: one letter fills the card.
     *
     * The TRIM, not the surface — a glyph sized to the bleed is meaningless.
     * Floored, because core/geometry.js's clampFontSize hands back the
     * ceiling unrounded when it bites and a fractional font size is nobody's.
     * For a 1024 square this is 1024, which is exactly what every existing
     * caller passed, so nothing about a square cover changes.
     */
    function fontCap(size) {
        const m = metrics(size);
        return Math.floor(Math.max(m.trim.w, m.trim.h));
    }

    App.formats = {
        MM_PER_IN: MM_PER_IN,
        DEFAULT_DPI: DEFAULT_DPI,
        DEFAULT_SIZE_PX: DEFAULT_SIZE_PX,
        SQUARE_SIZES: SQUARE_SIZES,
        JCARD: JCARD,
        CD: CD,
        LP: LP,
        FORMATS: FORMATS,
        inch: inch,
        squareSize: squareSize,
        jcardPanels: jcardPanels,
        jcardSize: jcardSize,
        cdPageSize: cdPageSize,
        cdSpreadSize: cdSpreadSize,
        cdTraySize: cdTraySize,
        lpFace: lpFace,
        lpJacketSize: lpJacketSize,
        lp10JacketSize: lp10JacketSize,
        lp7JacketSize: lp7JacketSize,
        lp7GatefoldSize: lp7GatefoldSize,
        byId: byId,
        sizeOf: sizeOf,
        sameSize: sameSize,
        matchId: matchId,
        metrics: metrics,
        fontCap: fontCap,
    };
}());
