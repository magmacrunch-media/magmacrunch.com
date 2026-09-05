// pixels.js — cave diving (not even once) | MagmaCrunch Media (c) 2026
// Sprite data and the tiny blitter that draws it.
//
// Sprites are authored as string rows, one character per pixel, so they can be
// edited by eye in a text editor - the makemecookies format. Runs of the same
// character collapse into one fillRect, which keeps a frame in the low hundreds
// of draw calls rather than the low thousands.
//
// ORIENTATION WITHOUT ROTATION. ctx.rotate destroys the pixel grid and a
// smooth-rotating sprite on a chunky grid reads as a bug, so the diver is
// authored twice - once along the horizontal axis, once along the vertical -
// and mirrored for the other two facings. Four sprites cover all four
// directions and every one of them stays crisp.

const PAL = {
    K: '#0b1a22',   // outline
    W: '#1e4a55',   // wetsuit
    w: '#12333b',   // wetsuit shadow
    T: '#6e8794',   // tank
    t: '#465a66',   // tank shadow
    V: '#9ff0ff',   // visor
    L: '#fff3c4',   // headlamp
    F: '#2a6470',   // fin
    S: '#3fe0d0',   // suit accent
    R: '#241f2e',   // rock
    r: '#3b3348',   // rock, lit face
    P: '#ffd98a',   // pearl
    p: '#c9a44e',   // pearl shadow
};

/**
 * Blit a string-row sprite at integer pixel coordinates.
 * `flipX` / `flipY` mirror it without touching the transform stack, so the
 * grid stays exact. `over` recolours single characters for one call.
 *
 * `only` restricts the blit to the characters it contains. That exists for the
 * darkness: the visor and the lamp are drawn a second time ABOVE the mask, so
 * they stay lit when the rest of the diver is in shadow. They are the light
 * source and the only thing telling you which way you point.
 */
function sprite(ctx, rows, ox, oy, flipX, flipY, over, only) {
    const h = rows.length;
    const w = rows[0].length;
    for (let r = 0; r < h; r++) {
        const row = rows[flipY ? h - 1 - r : r];
        let c = 0;
        while (c < w) {
            const ch = row[c];
            if (ch === '.' || ch === ' ') { c++; continue; }
            let n = 1;
            while (c + n < w && row[c + n] === ch) n++;
            if (only && only.indexOf(ch) < 0) { c += n; continue; }
            const col = (over && over[ch]) || PAL[ch];
            if (col) {
                ctx.fillStyle = col;
                const x = flipX ? ox + (w - c - n) : ox + c;
                ctx.fillRect(x, oy + r, n, 1);
            }
            c += n;
        }
    }
}

// ── The diver, along the horizontal axis ──────────────────────────────
// 16 x 12, facing right. Tank on the back, visor and lamp forward, fins
// trailing. Two frames: a glide and a kick.
const DIVER_SIDE = [
    [
        '......KKKK......',
        '.....KTTTTK.....',
        '....KTttTTKKKK..',
        '...KKWWWWWKVVVK.',
        '..KWWWWWWWKVVLLK',
        '.KWWWWWWWWWKVVK.',
        '.KwwWWWWWWWKKKK.',
        'KFwwwWWWWWSK....',
        'KFFKwwwWWSK.....',
        '.KFFKKwwKK......',
        '..KFFFKK........',
        '...KKK..........',
    ],
    [
        '......KKKK......',
        '.....KTTTTK.....',
        '....KTttTTKKKK..',
        '...KKWWWWWKVVVK.',
        '..KWWWWWWWKVVLLK',
        '.KWWWWWWWWWKVVK.',
        'KFwwWWWWWWWKKKK.',
        'KFFwwwWWWWSK....',
        '.KFFKwwWWSK.....',
        '..KKKKwwKK......',
        '......KK........',
        '................',
    ],
];

// ── The diver, along the vertical axis ────────────────────────────────
// 12 x 16, facing down. Flip vertically for the ascent.
const DIVER_DOWN = [
    [
        '...KKKK.....',
        '..KFFFFKK...',
        '..KFFFFFK...',
        '..KKwwwwK...',
        '.KKwwWWWWK..',
        '.KwwWWWWWK..',
        '.KwWWWWWTTK.',
        '.KwWWWWWTTK.',
        '.KwWWWWWttK.',
        '.KwWWWWWTTK.',
        '.KwWWWWWWK..',
        '.KKWWWWWWK..',
        '..KWWWWWSK..',
        '..KVVVWWKK..',
        '..KVVLLK....',
        '...KLLK.....',
    ],
    [
        '..KKKKKK....',
        '.KFFFFFFK...',
        '..KFFFFK....',
        '..KKwwwwK...',
        '.KKwwWWWWK..',
        '.KwwWWWWWK..',
        '.KwWWWWWTTK.',
        '.KwWWWWWTTK.',
        '.KwWWWWWttK.',
        '.KwWWWWWTTK.',
        '.KwWWWWWWK..',
        '.KKWWWWWWK..',
        '..KWWWWWSK..',
        '..KVVVWWKK..',
        '..KVVLLK....',
        '...KLLK.....',
    ],
];

// Where the lamp sits inside each sprite, in sprite pixels. light.js reads
// this rather than guessing - a guessed offset detaches the cone from the
// lamp the moment facing changes, which is exactly the bug it looks like.
const LAMP_AT = {
    side: { x: 14.5, y: 4.5, w: 16, h: 12 },
    down: { x: 5.5, y: 15.5, w: 12, h: 16 },
};

/**
 * Resolve facing into which sprite to draw, how to mirror it, and where the
 * lamp ends up after mirroring. dirX / dirY are the facing unit vector.
 */
function diverPose(dirX, dirY) {
    const vertical = Math.abs(dirY) > Math.abs(dirX);
    const key = vertical ? 'down' : 'side';
    const a = LAMP_AT[key];
    const flipX = !vertical && dirX < 0;
    const flipY = vertical && dirY < 0;
    return {
        key,
        rows: vertical ? DIVER_DOWN : DIVER_SIDE,
        flipX,
        flipY,
        w: a.w,
        h: a.h,
        lampX: flipX ? a.w - a.x : a.x,
        lampY: flipY ? a.h - a.y : a.y,
    };
}

const SPR_PEARL = [
    '.pPPp.',
    'pPPPPp',
    'PPPPPP',
    'PPPPPP',
    'pPPPPp',
    '.pPPp.',
];

const SPR_DEBRIS = [
    '..RRRR..',
    '.RrrrRR.',
    'RrrrrrRR',
    'RrrrrrRR',
    'RRrrrrRR',
    '.RRrrRR.',
    '..RRRR..',
];

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PAL, sprite, DIVER_SIDE, DIVER_DOWN, LAMP_AT, diverPose,
        SPR_PEARL, SPR_DEBRIS,
    };
}
