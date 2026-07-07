// chip-animation.js — Shared poker chip rendering
// Canvas-based edge-on chip stacks
// Used by: solitaire_THLD, scandinavian-stud, future poker games

const DENOMS = [
    { value: 500, face: '#7744cc', edge: '#3d1a77', mid: '#ffffff', dark: '#1a0044', label: '500', name: 'Purple' },
    { value: 100, face: '#444444', edge: '#111111', mid: '#aaaaaa', dark: '#000000', label: '100', name: 'Black' },
    { value:  25, face: '#22aa44', edge: '#0d5520', mid: '#ffffff', dark: '#062b10', label: '25',  name: 'Green' },
    { value:   5, face: '#dd2233', edge: '#770f18', mid: '#ffffff', dark: '#3b0009', label: '5',   name: 'Red'   },
    { value:   1, face: '#ddddbb', edge: '#888866', mid: '#cc2200', dark: '#444433', label: '1',   name: 'White' },
];

const CW        = 64;
const FACE_RY   = 10;
const EDGE_H    = 9;
const CHIP_H    = FACE_RY * 2 + EDGE_H;
const OVERLAP   = FACE_RY * 2 + 2;
const MAX_STACK = 12;

let currentChips = 500;

// ── Draw a single chip sprite onto a canvas context ─────────
function drawChip(ctx, denom, cx, topY) {
    const { face, edge, mid, dark } = denom;
    const rx = CW / 2 - 4;
    const faceY = topY + FACE_RY;

    // 1. Bottom shadow
    ctx.beginPath();
    ctx.ellipse(cx, faceY + EDGE_H + 3, rx - 1, FACE_RY - 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fill();

    // 2. Edge / side band
    ctx.fillStyle = edge;
    ctx.fillRect(cx - rx, faceY, rx * 2, EDGE_H);

    // Bottom of edge — dark ellipse
    ctx.beginPath();
    ctx.ellipse(cx, faceY + EDGE_H, rx, FACE_RY, 0, 0, Math.PI * 2);
    ctx.fillStyle = dark;
    ctx.fill();

    // 3. Edge stripes
    ctx.fillStyle = mid;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(cx - rx + 4, faceY + 2, rx * 2 - 8, 2);
    ctx.fillRect(cx - rx + 4, faceY + EDGE_H - 4, rx * 2 - 8, 2);
    ctx.globalAlpha = 1.0;

    // 4. Face ellipse (top)
    ctx.beginPath();
    ctx.ellipse(cx, faceY, rx, FACE_RY, 0, 0, Math.PI * 2);
    ctx.fillStyle = face;
    ctx.fill();

    // 5. Face detail rings
    ctx.beginPath();
    ctx.ellipse(cx, faceY, rx - 6, FACE_RY - 2, 0, 0, Math.PI * 2);
    ctx.strokeStyle = mid;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    ctx.beginPath();
    ctx.ellipse(cx, faceY, rx - 12, FACE_RY - 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = mid;
    ctx.globalAlpha = 0.18;
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // 6. Highlight
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.25, faceY - FACE_RY * 0.3, rx * 0.38, FACE_RY * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fill();

    // 7. Outline
    ctx.beginPath();
    ctx.ellipse(cx, faceY, rx, FACE_RY, 0, 0, Math.PI * 2);
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1;
    ctx.stroke();
}

// ── Render a full stack to a canvas element ────────────────
function renderStack(canvas, denom, count) {
    const drawn = Math.min(count, MAX_STACK);
    const totalH = CHIP_H + (drawn - 1) * OVERLAP + 6;
    canvas.width  = CW;
    canvas.height = totalH;
    canvas.style.width  = CW + 'px';
    canvas.style.height = totalH + 'px';

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CW, totalH);

    const cx = CW / 2;
    for (let i = 0; i < drawn; i++) {
        const topY = totalH - CHIP_H - 3 - i * OVERLAP;
        drawChip(ctx, denom, cx, topY);
    }
}

// ── Break amount into denomination stacks ───────────────────
function breakIntoStacks(amount) {
    const stacks = [];
    let rem = amount;
    for (const d of DENOMS) {
        const n = Math.floor(rem / d.value);
        if (n > 0) {
            stacks.push({ denom: d, count: n });
            rem -= n * d.value;
        }
    }
    return stacks;
}

// ── Render chips to the display element ────────────────────
function renderChips(chips, animClass) {
    const display = document.getElementById(_displayId);
    if (!display) return;
    display.innerHTML = '';

    if (chips <= 0) {
        display.innerHTML = '<div class="bust-msg">B U S T</div>';
        return;
    }

    const stacks = breakIntoStacks(chips);

    stacks.forEach(function(stack) {
        const wrap = document.createElement('div');
        wrap.className = 'chip-stack-wrap';

        const badge = document.createElement('div');
        badge.className = 'stack-count';
        badge.textContent = '\u00d7' + stack.count;
        wrap.appendChild(badge);

        const canvas = document.createElement('canvas');
        canvas.className = 'stack-canvas';
        renderStack(canvas, stack.denom, stack.count);
        wrap.appendChild(canvas);

        display.appendChild(wrap);
    });
}

// ── Public API ─────────────────────────────────────────────
let _displayId = 'chipDisplay';
let _legendId = 'chipLegend';

const ChipAnim = {
    init: function(displayId, legendId) {
        _displayId = displayId || 'chipDisplay';
        _legendId = legendId || 'chipLegend';
    },

    setChips: function(amount) {
        currentChips = Math.max(0, amount);
        renderChips(currentChips);
        renderLegend();
    },

    addChips: function(delta) {
        currentChips = Math.max(0, currentChips + delta);
        renderChips(currentChips);
    },

    getChips: function() {
        return currentChips;
    }
};

// ── Legend ────────────────────────────────────────────────
function renderLegend() {
    const legend = document.getElementById(_legendId);
    if (!legend) return;
    legend.innerHTML = '';

    DENOMS.forEach(function(d) {
        const item = document.createElement('div');
        item.className = 'legend-item';

        const canvas = document.createElement('canvas');
        const scale = 0.55;
        const w = Math.round(CW * scale);
        const faceRY = Math.round(FACE_RY * scale);
        const edgeH = Math.round(EDGE_H * scale);
        const h = faceRY * 2 + edgeH + 4;

        canvas.width = w;
        canvas.height = h;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.scale(scale, scale);
        drawChip(ctx, d, CW / 2, faceRY + 1);
        ctx.restore();

        ctx.font = '5px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = d.mid;
        ctx.globalAlpha = 0.85;
        ctx.fillText(d.label, w / 2, faceRY + 1);
        ctx.globalAlpha = 1;

        const label = document.createElement('span');
        label.textContent = '=' + d.value;

        item.appendChild(canvas);
        item.appendChild(label);
        legend.appendChild(item);
    });
}