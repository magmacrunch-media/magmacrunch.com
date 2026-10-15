// core/gatefold.js — the document, and the .gatefold file.
//
// The web tool had no document: `let elements = []` and `let selectedElement`
// lived in app.js's IIFE alongside forty-five event listeners, the canvas
// size lived in canvas.js, and there was no way to write any of it down.
// Reloading the page lost everything, silently. This file is the gap a
// desktop build exists to close.
//
// The FILE FORMAT is shaped on deck-press/app/core/deckpress.js, and the
// shape is worth copying exactly:
//
//   - a FORMAT_VERSION, and a refusal to open a future major
//   - TOP_LEVEL as a declared CONSTANT rather than "whatever keys the object
//     has". deck-press learned this the hard way: gating on `key in doc`
//     looked equivalent and was not, because a loaded document rebuilt as a
//     bare literal is missing every field the FILE omitted, so setting one
//     afterwards silently did nothing. Gating on a constant makes that bug
//     unreachable rather than merely fixed once.
//   - MERGE OVER A FULL DEFAULT on load, never a literal built from the
//     file's keys. A file that omits a field must leave the default standing,
//     not leave a hole.
//   - the art map as a SIBLING of the document, never on the elements.
//
// Pure: no DOM, no fetch, no Tauri. It hands out and takes in plain data;
// ui/project-ui.js does the dialogs and the bytes.

(function () {
    'use strict';

    const App = (window.Gatefold = window.Gatefold || {});

    /* 2.0 because of PRINT FORMATS, and the guard it buys runs in the OLD
       build rather than this one. A 1.x build handed a J-card would read
       `unit: 'mm'` it has never heard of, canvasSize() would return 101.6, and
       it would paint a 101-pixel canvas with every element — at coordinates
       around 1200 — entirely off it: a blank postage stamp and no error
       anywhere. majorOf() below exists for exactly that, and refusing with a
       sentence that names both versions is the whole of what it is for.

       The document SHAPE did not change, so MIGRATIONS is still empty and a
       1.0 file opens untouched. The cost, stated plainly: a plain square
       cover saved by this build no longer opens in 1.x either. */
    const FORMAT_VERSION = '2.0';
    const FILE_TYPE = 'gatefold';
    const EXT = 'gatefold';

    /* THE FIELD LIST. Adding a document field means adding it here and to
       emptyDoc(); nothing infers this from the object. */
    const TOP_LEVEL = ['name', 'size', 'bgColor', 'elements'];

    /* The four squares now live in core/formats.js alongside the print
       formats, so the picker reads one list. These stay as the default's
       source and because the suites pin them; core/formats.js asserts the two
       agree rather than trusting that they do. */
    const SQUARE_SIZES = [512, 1024, 2048, 4096];
    const DEFAULT_SIZE_PX = 1024;
    const DEFAULT_BG = '#ffffff';

    /* Warn rather than refuse. A 4096 cover with two print-resolution photos
       is genuinely tens of megabytes of base64, and that is the honest cost
       of a self-contained single file. The way out later is write_bytes —
       already on the Rust allowlist — into a zipped pack; the dedupe in
       artstore already means one payload however many elements point at it. */
    const LARGE_FILE_BYTES = 64 * 1024 * 1024;

    /* THE CEILING ON ONE IMPORTED IMAGE, in source bytes and in decoded pixels.
     *
     * LARGE_FILE_BYTES above warns about the PROJECT, at save time, which is
     * the last possible moment: by then the photograph has been read, decoded,
     * base64'd and put in the artstore, which never evicts. These refuse at the
     * first moment instead, which is the only one where nothing has been spent.
     *
     * TWO LIMITS BECAUSE THERE ARE TWO COSTS, and neither predicts the other.
     * A JPEG is compressed, so its file size says very little about what
     * decoding it will cost: a 6 MB photograph can be sixty megapixels, and a
     * decoded bitmap is four bytes a pixel whatever the file was. Bytes bound
     * what the .gatefold has to carry and what the artstore holds as base64;
     * pixels bound what the browser has to keep decoded, and in
     * ui/reference.js what a CPU-backed canvas has to allocate.
     *
     * 40 megapixels is a real camera's output rather than a round number, so
     * the limit refuses a decompression bomb and not a photograph. It is about
     * 160 MB decoded, which is the honest cost of a store that never evicts.
     *
     * REFUSE, DO NOT RESAMPLE, and that is deliberately the opposite of the
     * choice fromProjectData makes for a damaged file. A wrecked field has no
     * correct value to preserve, so repairing it loses nothing. A photograph
     * has one, this is a tool whose output goes to print, and quietly handing
     * back a softer copy of somebody's artwork is the same fault as quietly
     * changing an export's dimensions: it is their resampling to choose, and
     * they would find out from the printed card.
     */
    const MAX_IMAGE_BYTES = 32 * 1024 * 1024;
    const MAX_IMAGE_PIXELS = 40e6;

    /**
     * Why this image cannot be imported, or null when it can.
     *
     * A sentence for a person, like fromProjectData's errors and for the same
     * reason: "too big" without the two numbers leaves somebody guessing how
     * much to shrink it by. ui/ uppercases and shows it.
     *
     * Both fields are OPTIONAL because they are known at different moments.
     * The bytes are known before the file has been read and the pixels only
     * after it has been decoded, so the two checks cannot be one call, and a
     * missing field means "not known yet" rather than "zero".
     */
    function imageRefusal(what) {
        const w = what || {};
        const bytes = Number(w.bytes);
        if (isFinite(bytes) && bytes > MAX_IMAGE_BYTES) {
            const mb = (n) => Math.round(n / 1048576);
            return `That image is ${mb(bytes)} MB and the most this can import is ${mb(MAX_IMAGE_BYTES)} MB`;
        }
        const pixels = Number(w.pixels);
        if (isFinite(pixels) && pixels > MAX_IMAGE_PIXELS) {
            const mp = (n) => Math.round(n / 1e6);
            return `That image is ${mp(pixels)} megapixels and the most this can import is ${mp(MAX_IMAGE_PIXELS)}`;
        }
        return null;
    }

    /* THE CEILING ON A TRIM BOX, IN DOCUMENT UNITS.
     *
     * Not a format decision (core/formats.js owns those) but a renderer one,
     * and it belongs at the load boundary because a file is the only way to
     * reach it. The picker cannot offer a bad size; a hand-edited or truncated
     * file can say anything, and `trim: { w: 999999 }` asks ui/canvas.js for a
     * backing store of 1e12 pixels. A canvas past the browser's limit does not
     * throw: it comes back with width 0, every draw silently does nothing, and
     * the window shows an empty artboard with no error anywhere.
     *
     * 10000 against a hard limit of 16384 per side in both WebKit and
     * Chromium, so there is headroom rather than a value tuned to the edge.
     * The largest published format is well under it: square-4096's trim is
     * 4096 and the 7-inch gatefold's is 4345, the widest of the print set. This
     * refuses nothing the picker can produce and leaves room for a format
     * twice the size of any in the table. */
    const MAX_TRIM = 10000;

    /* HOW FAR OUTSIDE ITS OWN DOCUMENT AN ELEMENT MAY SIT, as a multiple of the
     * longer trim side.
     *
     * Relative rather than absolute, and that is the whole point: a fixed
     * 40000 is four times a 10000 ceiling but forty times a 1024 cover, so on
     * every document anyone actually makes it would clamp a runaway coordinate
     * to another number just as invisible. Against the document the bound means
     * the same thing at every size, which is the reasoning ui/canvas.js's
     * scale() already uses for hit tolerances.
     *
     * Loose rather than the trim box itself, because being outside it is
     * normal: artwork in the bleed is at negative coordinates by design, a
     * photo fitted with COVER overhangs on purpose, and dragging something off
     * the edge to come back to later is ordinary use. None of that is damage,
     * and 3x leaves room for all of it.
     *
     * What this catches is the finite absurdity. `x: 1e300` passes isFinite()
     * and is reachable by no drag, scroll or zoom, so the element is
     * permanently invisible while still holding a row in the layers panel, a
     * slot in the file, and a turn in every hit test. Pulling it to within a
     * few canvases of the artwork makes it something that can be found and
     * deleted, which neither refusing the file nor keeping the 1e300 does. */
    const COORD_REACH = 3;

    /**
     * THE SIZE IS STRUCTURED, AND THAT IS THE POINT.
     *
     * The web tool's canvas was one integer, because every cover it could make
     * was a square in pixels. CD wallets, digipak panels and cassette J-cards
     * are the direction this is going, and they are millimetres with a bleed
     * and a safe margin — so the size is stored in the shape deck-press's
     * print geometry already speaks, from the first version of the format:
     *
     *   today   { unit: 'px', trim: { w, h }, bleed: 0, safe: 0 }
     *   later   { unit: 'mm', trim: { w: 121, h: 121 }, bleed: 3, safe: 3, dpi: 300 }
     *
     * `unit` selects only whether a DPI conversion is involved. Element
     * coordinates are in document units with the ORIGIN AT THE TOP-LEFT OF
     * THE TRIM BOX, so bleed lives at negative coordinates and changing it
     * later never translates existing art. None of that needs a migration —
     * which is the whole reason it is here now rather than being a bare
     * integer and a v2.0 to write later.
     *
     * The print sizes arrived in exactly that shape, plus `panels` and
     * `panelAxis`; core/formats.js is the table of them.
     *
     * THE SIZE IS REPLACED, NEVER PATCHED. Object.assign can add a key and
     * cannot remove one, so patching a square over a J-card would leave
     * `panels` behind and the square would draw fold lines it does not have.
     * The load merge below has the same property for the same reason, and it
     * is why it starts from a full default rather than from the file.
     */
    function squareSize(px) {
        return { unit: 'px', trim: { w: px, h: px }, bleed: 0, safe: 0 };
    }

    function defaultSize() { return squareSize(DEFAULT_SIZE_PX); }

    /**
     * The one number the square code paths wanted.
     *
     * RETIRED — TAKE NO NEW CALLERS. It collapses a size to a single scalar,
     * which is only meaningful when the document is a square in pixels, and
     * on a millimetre size it hands back 101.6 as though that were a canvas
     * dimension. core/formats.js's metrics() is what replaced it: it answers
     * trim, surface, bleed and origin separately, because those are four
     * different questions that used to have one wrong answer.
     */
    function canvasSize(size) {
        return (size && size.trim && size.trim.w) || DEFAULT_SIZE_PX;
    }

    function isSquarePx(size) {
        return !!size && size.unit === 'px' && size.trim && size.trim.w === size.trim.h;
    }

    function emptyDoc() {
        return {
            name: 'untitled',
            size: defaultSize(),
            bgColor: DEFAULT_BG,
            elements: [],
        };
    }

    /* ── the live document ──────────────────────────────── */

    let doc = emptyDoc();

    function get() { return doc; }
    function set(next) { doc = next; return doc; }

    /** The undo snapshot. Deep, because restore must not alias the stack. */
    function clone() { return JSON.parse(JSON.stringify(doc)); }

    function reset() {
        doc = emptyDoc();
        App.element.resetIds();
        App.artstore.reset();
        return doc;
    }

    /* ── serialize ──────────────────────────────────────── */

    /** Every art ref the document actually points at, in first-use order. */
    function usedRefs() {
        const refs = [];
        for (const el of doc.elements) {
            if (el.src && refs.indexOf(el.src) === -1) refs.push(el.src);
        }
        return refs;
    }

    /**
     * What goes in the file.
     *
     * The art map is pruned to what the document references. The LIVE store
     * deliberately never evicts — undo can resurrect an element whose image
     * was deleted, and a store that dropped the bytes would restore an element
     * that cannot draw — but the undo stack is not written to disk, so what a
     * saved file needs is exactly the art the saved document points at.
     */
    function toProjectData() {
        const out = { type: FILE_TYPE, version: FORMAT_VERSION };
        for (const key of TOP_LEVEL) out[key] = doc[key];
        out.art = App.artstore.serialize(usedRefs());
        return out;
    }

    function stringify() {
        return JSON.stringify(toProjectData(), null, 2) + '\n';
    }

    /* ── migrations ─────────────────────────────────────── */

    /* Keyed by the version they migrate FROM, walked until no entry matches.
       Empty at 1.0, and that is fine — the chain is the mechanism, and it
       costs nothing to have it in place before the first migration exists. */
    const MIGRATIONS = {};

    function majorOf(v) { return parseInt(String(v).split('.')[0], 10) || 0; }

    /* ── repair ─────────────────────────────────────────────
     *
     * A FILE CAN SAY ANYTHING. The fontSize clamp below used to be the whole
     * of this, and it was the right instinct applied to one field: a text
     * element whose size ran away would be rasterised at that size on the
     * first frame after opening. Every other number in the file reaches the
     * renderer exactly as unchecked, and the failures are worse than a slow
     * frame because none of them says anything.
     *
     * Three that were reachable, and all three were confirmed against this
     * module rather than reasoned about:
     *
     *   `elements` NOT AN ARRAY. `{}` or a number threw TypeError out of
     *   fromProjectData, past parse(), which catches only JSON syntax, and
     *   past ui/project-ui.js, which is written to the documented contract
     *   that this function reports a message instead of throwing. The user
     *   picked a file and the window did nothing at all: no toast, no
     *   document, nothing but a line in the log. A string was worse, because
     *   it was ACCEPTED: `doc.elements` became 'hello', the layers panel
     *   listed five characters, and the next session.add() threw on a string
     *   with no push.
     *
     *   NaN OR TEXT GEOMETRY. `x: 'abc'` or `w: NaN` draws nothing, and
     *   ui/render.js skips a type it has no function for, so a wrecked
     *   element is invisible AND selectable: it sits in the layers panel and
     *   swallows clicks aimed at what is under it. element.js already warns
     *   about that exact shape, "drawn, counted, selectable, and completely
     *   invisible", about a different cause.
     *
     *   DUPLICATE IDS. The file is the one place a pair can come from, and a
     *   pair is the silent data loss MIGRATIONS' neighbour seedIds() exists to
     *   prevent one level up: selection is a find() by id, so Delete removes
     *   whichever of the two it reaches first.
     *
     * REPAIR, NEVER REFUSE, and that asymmetry is deliberate. A bad VERSION is
     * refused because the file is addressed to a build that is not this one
     * and guessing would wreck it. A bad FIELD is repaired because the rest of
     * the document is still the user's work, and a project that opens with one
     * ghost dropped beats a project that will not open at all. The one thing
     * never done is to leave it as it was: opening a wrecked file must repair
     * it rather than repeat it.
     *
     * The numeric sweep reads element.defaultsFor(), so a field added to that
     * table is covered here the day it lands rather than the day somebody
     * remembers this file: the same reason TOP_LEVEL is a declared constant
     * instead of whatever keys the object happens to have.
     */

    /* ---- what the repair had to do ----
     *
     * COUNTS, NOT A SENTENCE. core/ does not do wording, and ui/project-ui.js
     * is the half that knows whether there is a window to say it in.
     *
     * ONLY REAL DAMAGE IS COUNTED, and that is the whole difficulty of this
     * object. A report that noted every normalisation would fire on an
     * ordinary open: a file written by this build holds '#FFFFFF' where
     * normalizeHex answers '#ffffff', a trim that omits `h` takes `w` by
     * design, and "10" carries the same number 10 does. None of that is
     * damage. A notice that appears every time is one nobody reads, which
     * would leave the wrecked file exactly as silent as it was before the
     * repair existed.
     *
     * So a value counts only when it was PRESENT and UNUSABLE. The suite pins
     * both halves, and the zero half is the one that matters: every published
     * format and a real round-trip must report nothing at all.
     */
    function blankReport() {
        return {
            repaired: 0,     // elements kept, with a field put back
            dropped: 0,      // entries that were not a drawable element
            ids: 0,          // ids that had to be reassigned
            artwork: false,  // the elements field itself was unreadable
            size: false,
            bgColor: false,
            name: false,
            count: 0,
        };
    }

    function tally(r) {
        r.count = r.repaired + r.dropped + r.ids
            + (r.artwork ? 1 : 0) + (r.size ? 1 : 0)
            + (r.bgColor ? 1 : 0) + (r.name ? 1 : 0);
        return r;
    }

    /* Absent is not damage: a file that omits a field is relying on the
       default, which is the documented way to write one. */
    function present(v) { return v !== undefined && v !== null; }

    /**
     * The number a file meant, or null.
     *
     * NOT `Number(v)`, and that is the whole point of it being a function.
     * Number() answers 0 for null, '', false and [], so a bare `Number(v)`
     * turns `strokeWidth: null` into a ZERO-WIDTH STROKE rather than the
     * default 4, and `opacity: ''` into an element that is drawn, counted,
     * selectable and completely invisible. Both of those read as a value
     * somebody chose, and neither is one, so the damage is indistinguishable
     * from a decision. This was written with Number() first and it did exactly
     * that: the suite caught it, which is the only reason it is not still here.
     *
     * A number is a number. A numeric string is the same number, and that
     * coercion is deliberate: "10" carries what 10 does, and a file written by
     * hand should not be punished for it. Nothing else is a number at all.
     */
    function finite(v) {
        if (typeof v === 'number') return isFinite(v) ? v : null;
        if (typeof v === 'string' && v.trim() !== '') {
            const n = Number(v);
            return isFinite(n) ? n : null;
        }
        return null;
    }

    /** A positive, finite dimension inside the ceiling, or null. */
    function dimension(v) {
        const n = finite(v);
        return n !== null && n > 0 && n <= MAX_TRIM ? n : null;
    }

    /**
     * The size, field by field against a full default.
     *
     * core/formats.js's metrics() already normalises `unit`, `dpi`, `panelAxis`
     * and a non-array `panels`, so none of that is repeated here. What it does
     * not do is reject a trim that is negative, NaN, text or enormous: `(s.trim
     * && s.trim.w) || DEFAULT` turns 0 into 1024 and leaves -500 and 'big'
     * standing, which become a canvas of 1 and a canvas of NaN.
     */
    function repairSize(raw, report) {
        const next = defaultSize();
        const note = () => { if (report) report.size = true; };

        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            if (present(raw)) note();
            return next;
        }

        Object.assign(next, raw);

        /* metrics() already reads an unrecognised unit as 'px', so this changes
           no geometry. It is here because isSquarePx() tests `unit === 'px'`
           directly: left alone, a document whose file said 'furlong' would be
           drawn as a square and reported as not one, and the picker would show
           CUSTOM for a size that is in its own list. */
        if (present(raw.unit) && raw.unit !== 'mm' && raw.unit !== 'px') note();
        next.unit = raw.unit === 'mm' ? 'mm' : 'px';

        const trim = raw.trim && typeof raw.trim === 'object' ? raw.trim : {};
        if (present(raw.trim) && raw.trim !== trim) note();
        /* h falls back to w, not to the default, so a file naming one side of
           a square keeps the square it meant rather than becoming 4096x1024. */
        const w = dimension(trim.w);
        const h = dimension(trim.h);
        if (present(trim.w) && w === null) note();
        if (present(trim.h) && h === null) note();
        next.trim = { w: w || DEFAULT_SIZE_PX, h: h || w || DEFAULT_SIZE_PX };

        /* Bleed and safe are offsets rather than extents, so zero is a legal
           value and the floor is different from the trim's: anything that is
           not a finite number at or above zero becomes zero rather than a
           default, because a document with no bleed is the ordinary case: every
           square cover is one.

           ZERO RATHER THAN A CLAMP when it is out of range, and that is the
           opposite of what the trim does. Half the shorter side is the
           structural limit, past which the trim has no interior and the origin
           sits outside the surface, but clamping TO it would open a 1024 cover
           with a 512 bleed, which is a 2048 canvas with the artwork occupying a
           quarter of it and a vast border. That looks broken, and it is a
           number nobody wrote. A real bleed is a few per cent of the card:
           3mm on 121mm. So a value past a QUARTER of the shorter side is not a
           bleed that was measured wrong, it is not a bleed, and the honest
           repair is the one that shows the user their artwork. */
        const quarter = Math.min(next.trim.w, next.trim.h) / 4;
        const offset = (v) => {
            const n = finite(v);
            if (n !== null && n >= 0 && n <= quarter) return n;
            if (present(v)) note();
            return 0;
        };
        next.bleed = offset(next.bleed);
        next.safe = offset(next.safe);

        if (next.unit === 'mm') {
            const dpi = finite(next.dpi);
            /* Through the same ceiling as the trim, because on a millimetre
               document the dots are the product of the two: a 121mm card at a
               file-supplied 90000 dpi is the 1e12-pixel canvas again by a
               different route. */
            const max = MAX_TRIM / (Math.max(next.trim.w, next.trim.h) / App.formats.MM_PER_IN);
            if (present(next.dpi) && (dpi === null || dpi <= 0 || dpi > max)) note();
            next.dpi = dpi !== null && dpi > 0
                ? Math.min(dpi, max)
                : App.formats.DEFAULT_DPI;
        }

        return next;
    }

    /**
     * One element, or null to drop it.
     *
     * The type is checked against element.TYPES, which is exactly the set
     * ui/render.js has a draw function for, so an element this rejects is one
     * that could never have been drawn. That is NOT the same as element.js's
     * deliberate tolerance of an unknown type in `stylable()`: that decides how
     * to style something already in the document, and this decides whether the
     * file is describing an element at all.
     */
    function repairElement(raw, cap, reach, report) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
        if (App.element.TYPES.indexOf(raw.type) === -1) return null;

        const defaults = App.element.defaultsFor(raw.type);
        /* A COPY, not Object.assign(defaults, ...). Assigning into `defaults`
           returns the same object it mutated, so every fallback below would be
           the file's own bad value: the repair would read its answers off the
           thing it is repairing and change nothing at all. Unknown keys are
           KEPT, as element.create() keeps them: a file ahead of this build is
           not a file to quietly strip. */
        const el = Object.assign({}, defaults, raw, { type: raw.type });
        /* The id is decided by reseatIds() against the whole list, so carry
           what the FILE said rather than the default 0. Absent and 0 are
           different answers there: an element that never had an id is simply
           being given one, and an element whose id is 0 wrote something
           unusable. Merged over the default they would be indistinguishable,
           and every element in an id-less file would report a repair. */
        el.id = present(raw.id) ? raw.id : undefined;

        /* A COERCION IS NOT DAMAGE and must not be counted: "10" carries the
           same number 10 does, and reporting it would make an ordinary file
           announce a repair. Only a value that could not be used at all, or
           one a bound actually moved, is something the user lost. */
        let touched = false;

        /* Read off defaultsFor() rather than a list written out here, so a
           numeric field added to that table is covered the day it lands. */
        for (const key of Object.keys(defaults)) {
            if (typeof defaults[key] !== 'number') continue;
            /* NOT the id. reseatIds() owns it and needs to tell an absent one
               from a zero, and this sweep would put the default 0 back over
               the undefined that carries that difference. */
            if (key === 'id') continue;
            const n = finite(el[key]);
            if (n !== null) { el[key] = n; continue; }
            /* null and undefined are ABSENT rather than damaged, which is the
               same reading the TOP_LEVEL merge above already gives them. The
               default stands and there is nothing to report. */
            if (present(el[key])) touched = true;
            el[key] = defaults[key];
        }

        /* Geometry only. The bound is about where the element SITS, so it must
           not be let near `steps`, `duty`, `wavelength` or `opacity`. Those
           are already whatever their own code clamps them to, and a limit in
           document units means nothing to any of them. */
        for (const key of ['x', 'y', 'w', 'h']) {
            const bounded = Math.max(-reach, Math.min(reach, el[key]));
            if (bounded !== el[key]) touched = true;
            el[key] = bounded;
        }

        /* fill and stroke have the silent-no-op problem bgColor has, one level
           down: a bad fill leaves the element painted in whatever colour the
           element BEFORE it used, so a wrecked file draws in plausible colours
           that are not its own. 'none' survives because it is a real value in the
           model, which is why this goes through normalizeHex rather than
           isValidHex. */
        for (const key of ['fill', 'stroke']) {
            const hex = App.palette.normalizeHex(el[key]);
            if (hex === null) touched = true;
            el[key] = hex === null ? defaults[key] : hex;
        }

        if (el.type === 'text') {
            const capped = App.geometry.clampFontSize(el.fontSize, cap);
            if (capped !== el.fontSize) touched = true;
            el.fontSize = capped;
        }

        /* Read before normalize() rather than after, because it folds in place
           and the comparison would then be against its own answer. */
        if (el.type !== 'line' && (el.w < 0 || el.h < 0)) touched = true;
        if (touched && report) report.repaired++;

        /* The same fold ui/tools.js applies to a drag. A file can hold the
           inside-out element the web tool used to store, and every hit test
           and bounds calculation downstream assumes x,y is the top-left. */
        return App.element.normalize(el);
    }

    /**
     * Unique, positive ids, assigned here rather than left to seedIds().
     *
     * seedIds() takes the MAXIMUM, which keeps the next NEW element clear of
     * everything in the file. It cannot help with a collision already inside
     * it, and the two together are what make the id reliable.
     */
    function reseatIds(list, report) {
        let max = 0;
        for (const el of list) {
            const n = finite(el.id);
            if (n !== null && n > max) max = Math.floor(n);
        }
        const seen = Object.create(null);
        for (const el of list) {
            const n = finite(el.id);
            const id = n !== null && n > 0 ? Math.floor(n) : 0;
            const next = (!id || seen[id]) ? ++max : id;
            /* Against `id` rather than `el.id`, so a file holding "7" is read
               as 7 and reported as nothing, while a genuine collision counts.
               An element with no id at all is not damaged, merely unnamed. */
            if (next !== id && present(el.id) && report) report.ids++;
            el.id = next;
            seen[el.id] = true;
        }
        return list;
    }

    /**
     * `size` is the document these elements belong to, already repaired. Both
     * bounds are read off it, the font cap and how far an element may sit from
     * the artwork, because neither means anything as an absolute number.
     */
    function repairElements(raw, size, report) {
        const out = [];
        if (!Array.isArray(raw)) {
            /* Its own flag rather than a drop count, because the count is
               unknowable: `elements: 'hello'` is every element in the file
               gone, and reporting "1 DROPPED" would understate the most
               serious thing this object can say. */
            if (present(raw) && report) report.artwork = true;
            return out;
        }
        const m = App.formats.metrics(size);
        const cap = App.formats.fontCap(size);
        const reach = Math.max(m.trim.w, m.trim.h) * COORD_REACH;
        for (const el of raw) {
            const fixed = repairElement(el, cap, reach, report);
            if (fixed) out.push(fixed);
            else if (report) report.dropped++;
        }
        return reseatIds(out, report);
    }

    /* ── deserialize ────────────────────────────────────── */

    /**
     * Adopt a parsed .gatefold file.
     *
     * Returns { doc, repairs } or { error }. An error is a message for a
     * person: it names both versions when a file is too new, because "cannot
     * open" without saying what would open it is not actionable.
     *
     * `repairs` is the count of what the file lost on the way in, and it is
     * zero for every document this build writes. ui/project-ui.js says it out
     * loud, because a repair nobody is told about is still a silent failure:
     * the document on screen is no longer the document on disk, and the next
     * save makes that permanent.
     *
     * THE ORDER MATTERS AND EACH STEP IS LOAD-BEARING:
     *   1  refuse anything that is not one of ours
     *   2  walk the migration chain
     *   3  refuse a future MAJOR (a future minor is readable by design)
     *   4  merge over a full default — never build from the file's keys
     *   5  adopt the art, which RE-SEEDS the ref counter
     *   6  re-seed the ELEMENT id counter
     *
     * Steps 5 and 6 are the same bug at two levels. artstore.adopt re-seeds
     * because a file holding img1..img9 loaded into a store whose counter is 0
     * would have the next import allocate img1, and register() would hand back
     * the LOADED art — the element silently shows the wrong picture. Element
     * ids have it too and the web tool could never hit it because it could not
     * load: idCounter started at 0 every session, so a file holding ids 1..12
     * gives the next new element id 1, selection is
     * `elements.find(e => e.id === selectedId)`, and Delete removes the wrong
     * one of the pair. Both are asserted directly.
     */
    function fromProjectData(data) {
        if (!data || data.type !== FILE_TYPE) {
            return { error: 'Not a GATE//FOLD project file' };
        }

        let d = data;
        let v = String(d.version || '1.0');
        while (MIGRATIONS[v]) {
            d = MIGRATIONS[v](d);
            v = String(d.version);
        }

        if (majorOf(v) > majorOf(FORMAT_VERSION)) {
            return {
                error: 'This project was saved by a newer GATE//FOLD'
                    + ` (file ${v}, this build reads ${majorOf(FORMAT_VERSION)}.x)`,
            };
        }

        const next = emptyDoc();
        for (const key of TOP_LEVEL) {
            if (d[key] !== undefined && d[key] !== null) next[key] = d[key];
        }
        /* size gets the same treatment one level down: a file that names a
           trim box but omits bleed must keep the default bleed, not undefined.
           repairSize() merges over the full default itself, for the reason the
           header gives: a size is REPLACED, never patched, so a square loaded
           over a J-card must not keep `panels`. */
        const report = blankReport();
        next.size = repairSize(d.size, report);

        /* The fontSize clamp that used to be here, generalised. The cap is
           still formats.fontCap rather than canvasSize, because on a J-card the
           latter is 101.6, and every piece of text in the file would be clamped to
           a hundredth of the card and the repair would be worse than the
           damage. Everything else it now also checks is in the repair section
           above, with the three confirmed failures it closes. */
        next.elements = repairElements(next.elements, next.size, report);

        /* Assigning a non-colour to ctx.fillStyle is a SILENT NO-OP: the
           canvas keeps whatever was set last rather than throwing, so a bad
           bgColor paints the background in the previous element's fill. Through
           palette.normalizeHex because that is already the one place in the app
           that decides what a colour is, and 'none' is explicitly not one of
           them here: the background is the bottom of the stack and something
           has to be under the artwork. */
        const bg = App.palette.normalizeHex(next.bgColor);
        if (bg === null || bg === App.palette.NONE) {
            report.bgColor = true;
            next.bgColor = DEFAULT_BG;
        } else {
            next.bgColor = bg;
        }
        /* The name reaches document.title and the save dialog's suggested
           filename, where an object would arrive as '[object Object]'. */
        if (typeof next.name !== 'string' || !next.name) {
            report.name = true;
            next.name = 'untitled';
        }

        App.artstore.adopt(d.art);
        App.element.seedIds(next.elements);

        doc = next;
        return { doc: doc, repairs: tally(report) };
    }

    function parse(text) {
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            return { error: 'That file is not readable JSON' };
        }
        return fromProjectData(data);
    }

    App.gatefold = {
        FORMAT_VERSION: FORMAT_VERSION,
        FILE_TYPE: FILE_TYPE,
        EXT: EXT,
        TOP_LEVEL: TOP_LEVEL,
        SQUARE_SIZES: SQUARE_SIZES,
        DEFAULT_SIZE_PX: DEFAULT_SIZE_PX,
        LARGE_FILE_BYTES: LARGE_FILE_BYTES,
        MAX_IMAGE_BYTES: MAX_IMAGE_BYTES,
        MAX_IMAGE_PIXELS: MAX_IMAGE_PIXELS,
        imageRefusal: imageRefusal,
        MAX_TRIM: MAX_TRIM,
        COORD_REACH: COORD_REACH,
        squareSize: squareSize,
        defaultSize: defaultSize,
        canvasSize: canvasSize,
        isSquarePx: isSquarePx,
        emptyDoc: emptyDoc,
        get: get,
        set: set,
        clone: clone,
        reset: reset,
        usedRefs: usedRefs,
        toProjectData: toProjectData,
        stringify: stringify,
        repairSize: repairSize,
        repairElements: repairElements,
        fromProjectData: fromProjectData,
        parse: parse,
    };
}());
