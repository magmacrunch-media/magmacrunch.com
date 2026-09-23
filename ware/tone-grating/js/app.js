/* Wiring. One state object, one array of Bessel values per frame, two panels
 * and a table that reads them.
 *
 * The array is computed once in render() and handed to everything that draws.
 * That is not an optimisation, it is the page's only claim: if the tone panel
 * and the grating panel ever got their own copies, the agreement between them
 * would be an artefact of this file rather than a fact about the maths.
 */

const state = {
    beta: 2.404826,   /* the first zero of J_0, so the page opens on its punchline */
    fc: 440,          /* Hz */
    ratio: 0.25,      /* fm / fc */
    d: 2.0,           /* groove spacing, um */
    lam: 500          /* wavelength, nm */
};

const el = (id) => document.getElementById(id);

const ui = {
    beta: el('beta'), fc: el('fc'), ratio: el('ratio'), d: el('d'), lam: el('lam'),
    betaOut: el('betaOut'), fcOut: el('fcOut'), ratioOut: el('ratioOut'),
    dOut: el('dOut'), lamOut: el('lamOut'),
    fmOut: el('fmOut'), depthOut: el('depthOut'), maxOrderOut: el('maxOrderOut'),
    betaStat: el('betaStat'), stateStat: el('stateStat'),
    powerOut: el('powerOut'), foldOut: el('foldOut'), evanOut: el('evanOut'),
    rows: el('rows'), play: el('play'),
    wave: el('waveCanvas'), tone: el('toneCanvas'),
    groove: el('grooveCanvas'), order: el('orderCanvas')
};

/* Sign kept in its own column position so the decimal points line up. A
 * value that rounds to zero prints unsigned: J_0 at a null is a very small
 * negative number, and '-0.0000' reads as a rendering fault in exactly the
 * row somebody is looking at when they hit the null. */
const fmtJ = (v) => {
    const s = Math.abs(v).toFixed(4);
    return (v < 0 && s !== '0.0000' ? '-' : ' ') + s;
};

function render() {
    const orders = Bessel.orders(state.beta);
    const fm = state.fc * state.ratio;
    const lamUm = state.lam / 1000;

    /* Peak-to-valley depth of a reflection grating that would give this beta.
     * A sinusoidal surface z(x) = (h/2) sin(2*pi*x/d) imposes a round-trip path
     * difference of 2z, so the phase is (4*pi/lambda) z = (2*pi*h/lambda)
     * sin(2*pi*x/d), which makes beta = 2*pi*h/lambda exactly. Inverted here so
     * the slider reads out as a fabrication number rather than an abstraction. */
    const depth = (state.beta * state.lam) / (2 * Math.PI);

    /* Highest order that propagates at all, from |m lambda / d| <= 1. */
    const maxOrder = Math.floor(state.d / lamUm);

    Draw.drawWave(ui.wave, state);
    Draw.drawTone(ui.tone, state, orders);
    Draw.drawGroove(ui.groove, state);
    Draw.drawOrders(ui.order, state, orders);

    ui.betaOut.textContent = state.beta.toFixed(3);
    ui.fcOut.textContent = state.fc + ' Hz';
    ui.ratioOut.textContent = state.ratio.toFixed(2);
    ui.dOut.textContent = state.d.toFixed(2) + ' µm';
    ui.lamOut.textContent = state.lam + ' nm';
    ui.fmOut.textContent = Math.round(fm) + ' Hz';
    ui.depthOut.textContent = depth.toFixed(1) + ' nm';
    ui.maxOrderOut.textContent = '±' + maxOrder;
    ui.betaStat.textContent = 'β ' + state.beta.toFixed(3);

    const nul = Bessel.nearestNull(state.beta);
    ui.stateStat.textContent = nul ? 'CARRIER NULL' : 'ORDERS ±' + maxOrder;
    ui.stateStat.classList.toggle('lit', !!nul);

    /* Printed because it is the one number on screen that is known in advance.
     * If it stops reading 1.0000 the order list has been truncated too early
     * and both panels are lying by the same amount. */
    ui.powerOut.textContent = Bessel.power(orders).toFixed(4);

    let folded = 0, evan = 0;
    const rows = [];

    for (const o of orders) {
        /* m = 0 always stays. Everything else drops out once it has no weight
         * worth a row, but the carrier is the row the page is about: at a zero
         * of J_0 it has to be visible reading 0.0000, because a null that
         * shows up as an absent row looks like a rendering fault rather than
         * the result. */
        if (o.m !== 0 && Math.abs(o.J) < 5e-3) continue;

        const f = state.fc + o.m * fm;
        const sinT = (o.m * lamUm) / state.d;
        const isFolded = f < 0;
        const isEvan = Math.abs(sinT) > 1;
        if (isFolded) folded++;
        if (isEvan) evan++;

        const theta = isEvan ? '—' : (Math.asin(sinT) * 180 / Math.PI).toFixed(1) + '°';
        const freq = Math.abs(f).toFixed(0);

        rows.push(
            '<tr class="' + (o.m === 0 ? 'carrier' : '') + '">' +
            '<td class="m">' + (o.m > 0 ? '+' + o.m : o.m) + '</td>' +
            '<td class="j">' + fmtJ(o.J) + '</td>' +
            '<td class="sq">' + (o.J * o.J).toFixed(4) + '</td>' +
            '<td class="f' + (isFolded ? ' flag' : '') + '">' + freq + (isFolded ? '↵' : '') + '</td>' +
            '<td class="t' + (isEvan ? ' flag' : '') + '">' + theta + '</td>' +
            '</tr>'
        );
    }

    ui.rows.innerHTML = rows.join('');
    ui.foldOut.textContent = folded;
    ui.evanOut.textContent = evan;

    ToneEngine.update(state);
}

/* ── controls ─────────────────────────────────────────────────────────────
 * Every slider writes its own key and calls render(). No partial repaints: the
 * page is four canvases and one small table, and a full rebuild at 60 Hz costs
 * less than working out what depended on what. */
function bind(input, key, parse) {
    input.addEventListener('input', () => {
        state[key] = parse(input.value);
        render();
    });
}

bind(ui.beta, 'beta', parseFloat);
bind(ui.fc, 'fc', (v) => parseInt(v, 10));
bind(ui.ratio, 'ratio', parseFloat);
bind(ui.d, 'd', parseFloat);
bind(ui.lam, 'lam', (v) => parseInt(v, 10));

/* Presets are the zeros of J_0 plus the trivial case. Worth having as buttons
 * because hitting 2.4048 with a mouse is luck, and the point is to land exactly
 * on it and hear the middle of the sound go missing. */
document.querySelectorAll('[data-beta]').forEach(b => {
    b.addEventListener('click', () => {
        state.beta = parseFloat(b.dataset.beta);
        ui.beta.value = state.beta;
        render();
    });
});

ui.play.addEventListener('click', async () => {
    const on = await ToneEngine.toggle(state);
    ui.play.textContent = on ? 'STOP' : 'PLAY TONE';
    ui.play.classList.toggle('on', on);
});

/* Canvases are sized by CSS, so their backing stores only learn about a resize
 * from here. */
let pending = null;
window.addEventListener('resize', () => {
    if (pending) cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => { pending = null; render(); });
});

/* Courier Prime is self-hosted but still asynchronous, and the canvas numerals
 * are measured at draw time. Repaint once the face is in, or the first paint
 * keeps fallback metrics for the life of the page. */
if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);

ui.beta.value = state.beta;
ui.fc.value = state.fc;
ui.ratio.value = state.ratio;
ui.d.value = state.d;
ui.lam.value = state.lam;
render();
