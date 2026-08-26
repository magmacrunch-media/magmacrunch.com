// templates.js — SPRITE//FORGE character templates
//
// Pre-drawn characters to start from, in a form that stays reviewable in a
// diff: each frame is rows of single characters, and each character maps to
// [slotName, shadeStep] rather than to a literal colour.
//
// The indirection is what makes a template customisable. A slot carries one
// base colour and its shading is derived from it, so recolouring "shirt"
// recomputes that slot's whole ramp instead of asking the user to hand-match
// three hexes. Steps run -2 (deep shadow) to +2 (highlight); 0 is the base.
//
// Pure data and pure functions — this file loads before app.js and never
// touches the DOM. decode() takes the shading function as an argument rather
// than reaching for app.js's global, so neither file depends on the other's
// load order beyond the script tags.

window.CharacterTemplates = (function () {

    // ── RPG HERO ── top-down, front facing. The tile-RPG player: readable
    // silhouette at 1×, hard outline so it reads against any tile behind it.
    const RPG_HERO = {
        id: 'rpg-hero',
        label: 'RPG HERO',
        blurb: 'top-down · 16×16 · 1 frame',
        w: 16, h: 16,
        origin: [8, 15],
        slots: {
            line:  '#1a1526',
            skin:  '#f0c090',
            hair:  '#8b4a2b',
            tunic: '#3a6ea5',
            boots: '#5a3a22',
        },
        key: {
            '.': null,
            'K': ['line', 0],
            's': ['skin', 0],
            'd': ['skin', -1],
            'h': ['hair', 0],
            'H': ['hair', -1],
            't': ['tunic', 0],
            'T': ['tunic', -1],
            'u': ['tunic', 1],
            'b': ['boots', 0],
        },
        // Widths per row run 6·8·10·10·10·10·8·10·12·12·8·8·8·8·8: a rounded
        // crown, a jaw pinch, arms at the widest, then a waist pinch. Holding
        // one width down the whole body reads as a blob rather than a figure.
        frames: [[
            '................',
            '.....KKKKKK.....',
            '....KhhhhhhK....',
            '...KhhhhhhhhK...',
            '...KhssssssHK...',
            '...KhsKssKsHK...',
            '...KhssddssHK...',
            '....KddddddK....',
            '...KuuuuuuuuK...',
            '..KsKttttttKsK..',
            '..KsKttttttKsK..',
            '....KTTTTTTK....',
            '....KttKKttK....',
            '....KbbKKbbK....',
            '....KbbKKbbK....',
            '....KKKKKKKK....',
        ]],
    };

    // ── PLATFORMER KID ── side view, facing right. Ships idle plus two stride
    // frames so the animation preview does something the moment it loads.
    const KID_HEAD = [
        '................',
        '....KKKKK.......',
        '...KhhhhhhK.....',
        '..KhhhhhhhK.....',
        '..KhssssssK.....',
        '..KhssKssdK.....',
        '..KhsssssdK.....',
        '...KdddddK......',
        '...KuuuuuuK.....',
        '...KtttttsK.....',
        '...KtttttsK.....',
        '...KTTTTTTK.....',
        '...KTTKTTK......',
    ];

    const PLATFORMER_KID = {
        id: 'platformer-kid',
        label: 'PLATFORMER KID',
        blurb: 'side view · 16×16 · 3 frames',
        w: 16, h: 16,
        origin: [8, 15],
        slots: {
            line:  '#201a2e',
            skin:  '#ffd0a8',
            hair:  '#d4a017',
            shirt: '#e0483c',
            boots: '#3b3b52',
        },
        key: {
            '.': null,
            'K': ['line', 0],
            's': ['skin', 0],
            'd': ['skin', -1],
            'h': ['hair', 0],
            't': ['shirt', 0],
            'T': ['shirt', -1],
            'u': ['shirt', 1],
            'b': ['boots', 0],
        },
        // A three-beat cycle — stand, stride, pass — kept inside the body's own
        // width. A stride wider than the torso reads as a jumping jack.
        frames: [
            // stand
            KID_HEAD.concat([
                '...KbbKbbK......',
                '...KbbKbbK......',
                '...KKKKKKK......',
            ]),
            // stride, legs open
            KID_HEAD.concat([
                '...KbbKbbK......',
                '..KbbK.KbbK.....',
                '..KKKK.KKKK.....',
            ]),
            // pass, legs together
            KID_HEAD.concat([
                '...KbbbbbK......',
                '...KbbbbbK......',
                '...KKKKKKK......',
            ]),
        ],
    };

    const TEMPLATES = [RPG_HERO, PLATFORMER_KID];

    /** Returns a list of problems; empty means the template is well formed. */
    function validate(tpl, shade) {
        const errs = [];
        if (!tpl.frames || !tpl.frames.length) errs.push('no frames');
        (tpl.frames || []).forEach((rows, i) => {
            if (rows.length !== tpl.h) errs.push(`frame ${i}: ${rows.length} rows, expected ${tpl.h}`);
            rows.forEach((row, y) => {
                if (row.length !== tpl.w) errs.push(`frame ${i} row ${y}: ${row.length} chars, expected ${tpl.w}`);
                for (const ch of row) {
                    if (!(ch in tpl.key)) errs.push(`frame ${i} row ${y}: unknown key '${ch}'`);
                    const cell = tpl.key[ch];
                    if (cell && !(cell[0] in tpl.slots)) errs.push(`key '${ch}' names missing slot '${cell[0]}'`);
                }
            });
        });
        // Two slots resolving to the same hex would make recolouring one of them
        // silently move the other, so this is a correctness check, not a nicety.
        if (shade) {
            const seen = {};
            for (const [ch, cell] of Object.entries(tpl.key)) {
                if (!cell) continue;
                const [slot, step] = cell;
                if (!(slot in tpl.slots)) continue;
                const hex = shade(tpl.slots[slot], step);
                if (seen[hex] && seen[hex] !== `${slot}:${step}`)
                    errs.push(`'${ch}' (${slot} ${step}) collides with ${seen[hex]} at ${hex}`);
                seen[hex] = `${slot}:${step}`;
            }
        }
        return errs;
    }

    /**
     * Resolves a template to editor state.
     * @param shade (baseHex, step) => hex — app.js's shadeHex.
     * @returns { frames, palette, origin, w, h, slots, steps }
     */
    function decode(tpl, shade) {
        const resolved = {};   // key char -> hex | null
        const steps = {};      // slot -> [shade steps it actually uses]
        for (const [ch, cell] of Object.entries(tpl.key)) {
            if (!cell) { resolved[ch] = null; continue; }
            const [slot, step] = cell;
            resolved[ch] = shade(tpl.slots[slot], step).toLowerCase();
            (steps[slot] = steps[slot] || []).push(step);
        }
        for (const slot of Object.keys(steps))
            steps[slot] = [...new Set(steps[slot])].sort((a, b) => a - b);

        const frames = tpl.frames.map(rows =>
            rows.map(row => [...row].map(ch => resolved[ch] ?? null)));

        // Palette grouped by slot, dark to light, so editing reads top to bottom.
        const palette = [];
        for (const slot of Object.keys(tpl.slots))
            for (const step of (steps[slot] || []))
                palette.push(shade(tpl.slots[slot], step).toLowerCase());

        return {
            frames, palette, w: tpl.w, h: tpl.h,
            origin: { x: tpl.origin[0], y: tpl.origin[1] },
            slots: { ...tpl.slots },
            steps,
        };
    }

    function list() { return TEMPLATES; }
    function get(id) { return TEMPLATES.find(t => t.id === id) || null; }

    return { list, get, decode, validate };
})();
