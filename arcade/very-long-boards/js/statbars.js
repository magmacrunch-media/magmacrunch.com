// ═══════════════════════════════════════════════
// Very Long Boards — Select-screen stat bars
//
// The bars on the character and board screens, derived from config.js and from
// nothing else. A card cannot promise a rider something the physics does not
// deliver, because the same multiplier draws the bar and drives the ride.
//
// Bars are RELATIVE, centred on 1.0. Two mappings are wrong before this one:
//
//   round(mult * 10)   is what the board cards used to do, and it puts a 1.0
//                      multiplier at a full bar — STANDARD, CRUISER and CARVER
//                      all showed SPD at or over full. A bar that is always full
//                      ranks nothing.
//   min..max spread    ranks correctly but has no zero point, so the baseline
//                      option bottoms out: OFFICE CARL, whose whole billing is
//                      "the everyman", came out at one pip in SPD and TRICK
//                      purely for being the slowest of three.
//
// These are multipliers, so 1.0 already means "neutral" — the mid bar. Each stat
// is scaled by the largest deviation from 1.0 that stat actually shows, which
// keeps the extremes at the ends of the bar, puts anything unmodified in the
// middle, and re-scales on its own the day somebody adds a fifth board.
// ═══════════════════════════════════════════════

/** Which multipliers each screen shows, and what to call them. */
window.CHAR_STATS = [
    { key: 'speedMult', label: 'SPD' },
    { key: 'handlingMult', label: 'HAND' },
    { key: 'trickMult', label: 'TRICK' },
    { key: 'stabilityMult', label: 'STAB' },
];

/** Boards have no trickMult, so they show three. */
window.BOARD_STATS = [
    { key: 'speedMult', label: 'SPD' },
    { key: 'handlingMult', label: 'HAND' },
    { key: 'stabilityMult', label: 'STAB' },
];

const PIPS = 5;

const MID = Math.ceil(PIPS / 2);

/**
 * One value as 1..PIPS filled, with an unmodified 1.0 landing on the middle.
 *
 * When no option modifies a stat at all it does not distinguish them, so they
 * all get the middle rather than all getting nothing — an empty bar reads as a
 * weakness instead of as a non-difference.
 */
function pipsFor(all, key, value) {
    let maxDev = 0;
    for (const entry of all) {
        const v = entry[key];
        if (typeof v !== 'number') continue;
        maxDev = Math.max(maxDev, Math.abs(v - 1));
    }
    if (maxDev < 1e-9) return MID;
    const steps = Math.round(((value - 1) / maxDev) * (MID - 1));
    return Math.max(1, Math.min(PIPS, MID + steps));
}

/**
 * Build the stat block for one entry.
 *
 * @param entry  the CHARACTERS/BOARDS record being drawn
 * @param all    every record on that screen, so the bar can rank against them
 * @param stats  CHAR_STATS or BOARD_STATS
 */
window.renderStatBars = function(entry, all, stats) {
    const box = document.createElement('div');
    box.className = 'stat-bars';

    for (const stat of stats) {
        const value = entry[stat.key];
        if (typeof value !== 'number') continue;

        const row = document.createElement('div');
        row.className = 'stat-row';

        const label = document.createElement('span');
        label.className = 'stat-label';
        label.textContent = stat.label;

        const bar = document.createElement('span');
        bar.className = 'stat-bar';
        const filled = pipsFor(all, stat.key, value);
        bar.textContent = '█'.repeat(filled) + '░'.repeat(PIPS - filled);

        // The multiplier itself, for anyone who wants the number rather than the
        // shape. Screen-reader users get it too; the bar is decorative to them.
        bar.title = stat.label + ' x' + value.toFixed(2);

        row.appendChild(label);
        row.appendChild(bar);
        box.appendChild(row);
    }

    return box;
};
