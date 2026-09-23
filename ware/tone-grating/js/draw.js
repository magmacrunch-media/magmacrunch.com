/* The two panels.
 *
 * Both spectra draw bars of height |J_m(beta)| from the same array. Only the
 * rule that decides WHERE each bar goes differs:
 *
 *     time    f_m   = fc + m * fm            (Hz)
 *     space   sin0_m = m * lambda / d        (dimensionless)
 *
 * That is the whole argument the page makes, so the bar heights are deliberately
 * not rescaled per panel. Drawing amplitude on the left and intensity on the
 * right would be more conventional and would destroy the only thing worth
 * looking at, which is that the two sets of heights are identical. The squares
 * are in the table instead, where they can be read without breaking the
 * comparison.
 *
 * Each panel also has a boundary its conjugate axis runs into, and they are not
 * the same boundary, which is the honest half of the analogy:
 *
 *     time    a sideband below 0 Hz folds back onto |f|
 *     space   an order past |sin0| = 1 does not propagate at all
 */

const Draw = (() => {

    /* Read once. getComputedStyle is not cheap and these never change after
     * load; the panels repaint on every frame of a slider drag. */
    let C = null;
    function colors() {
        if (C) return C;
        const s = getComputedStyle(document.documentElement);
        const g = (n) => s.getPropertyValue(n).trim();
        C = {
            text: g('--text'), dim: g('--dim'), border: g('--border'),
            accent: g('--accent'), tone: g('--tone'), space: g('--space'),
            grid: g('--grid'), ghost: g('--ghost')
        };
        return C;
    }

    const NUM = '11px "Courier Prime", monospace';
    const TINY = '9px "Courier Prime", monospace';

    /* Backing store at device resolution, coordinates in CSS pixels. Without
     * this every hairline and every numeral is soft on exactly the displays
     * people read small numerals on. */
    function fit(canvas) {
        const dpr = window.devicePixelRatio || 1;
        const r = canvas.getBoundingClientRect();
        const w = Math.max(1, Math.round(r.width));
        const h = Math.max(1, Math.round(r.height));
        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
            canvas.width = w * dpr;
            canvas.height = h * dpr;
        }
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        return { ctx, w, h };
    }

    /* ── the source strips ────────────────────────────────────────────────
     * Above each spectrum sits the thing being transformed. They are drawn
     * from the same expression, beta * sin(2*pi*u), because in both domains
     * that expression is literally the phase applied to the wave: as a
     * function of time on the left, of position across the aperture on the
     * right. The panels look different only because the left one also shows
     * the carrier that phase is riding on. */

    function drawWave(canvas, st) {
        const { ctx, w, h } = fit(canvas);
        const c = colors();
        const mid = h / 2;
        const amp = h * 0.36;
        const fm = st.fc * st.ratio;

        /* Two modulator periods, so the envelope repeats visibly. */
        const span = 2 / Math.max(fm, 1);

        ctx.strokeStyle = c.grid;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();

        /* The phase function on its own, behind. This is the curve the other
         * panel draws as a groove. */
        ctx.strokeStyle = c.ghost;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let px = 0; px <= w; px++) {
            const t = (px / w) * span;
            const y = mid - Math.sqrt(st.beta / Bessel.BETA_MAX) * amp * Math.sin(2 * Math.PI * fm * t);
            px ? ctx.lineTo(px, y) : ctx.moveTo(px, y);
        }
        ctx.stroke();

        /* s(t) = sin(2*pi*fc*t + beta*sin(2*pi*fm*t)) */
        ctx.strokeStyle = c.tone;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const steps = w * 3;
        for (let i = 0; i <= steps; i++) {
            const px = (i / steps) * w;
            const t = (i / steps) * span;
            const ph = 2 * Math.PI * st.fc * t + st.beta * Math.sin(2 * Math.PI * fm * t);
            const y = mid - amp * Math.sin(ph);
            i ? ctx.lineTo(px, y) : ctx.moveTo(px, y);
        }
        ctx.stroke();
    }

    function drawGroove(canvas, st) {
        const { ctx, w, h } = fit(canvas);
        const c = colors();
        const base = h * 0.72;
        const amp = h * 0.24;
        const periods = 3;

        /* z(x) = (depth/2) sin(2*pi*x/d), so peak-to-valley is depth. Drawn
         * filled because it is a surface, not a signal: the substrate is under
         * it and the light is above. */
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let px = 0; px <= w; px++) {
            const u = (px / w) * periods;
            const y = base - Math.sqrt(st.beta / Bessel.BETA_MAX) * amp * Math.sin(2 * Math.PI * u);
            ctx.lineTo(px, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = c.ghost;
        ctx.fill();

        ctx.beginPath();
        for (let px = 0; px <= w; px++) {
            const u = (px / w) * periods;
            const y = base - Math.sqrt(st.beta / Bessel.BETA_MAX) * amp * Math.sin(2 * Math.PI * u);
            px ? ctx.lineTo(px, y) : ctx.moveTo(px, y);
        }
        ctx.strokeStyle = c.space;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        /* One groove period marked off, because d is the control that sets
         * where the orders land and it is otherwise invisible in this strip. */
        const pd = w / periods;
        ctx.strokeStyle = c.dim;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(pd, 6); ctx.lineTo(pd, h - 4);
        ctx.moveTo(pd * 2, 6); ctx.lineTo(pd * 2, h - 4);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = c.dim;
        ctx.font = TINY;
        ctx.textAlign = 'center';
        ctx.fillText('d', pd * 1.5, 14);
    }

    /* ── the shared bar routine ──────────────────────────────────────────── */

    function bars(ctx, w, h, items, tint) {
        const c = colors();
        const base = h - 22;
        const top = 14;
        const usable = base - top;

        ctx.strokeStyle = c.border;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, base); ctx.lineTo(w, base); ctx.stroke();

        for (const it of items) {
            if (it.x < 0 || it.x > w) continue;
            const mag = Math.min(1, Math.abs(it.J));
            const bh = mag * usable;
            const isCarrier = it.m === 0;
            const col = isCarrier ? c.accent : tint;

            if (it.ghost) {
                /* Folded: drawn hollow so a bar that is not where the maths put
                 * it cannot be mistaken for one that is. */
                ctx.strokeStyle = col;
                ctx.globalAlpha = 0.55;
                ctx.setLineDash([2, 2]);
                ctx.strokeRect(it.x - 1.5, base - bh, 3, bh);
                ctx.setLineDash([]);
                ctx.globalAlpha = 1;
            } else {
                ctx.fillStyle = col;
                ctx.fillRect(it.x - 1.5, base - bh, 3, bh);
            }

            /* A negative J_m is a half-turn of phase. No detector on either
             * side of the page can see it, which is the phase-blindness the two
             * domains share, so it is marked rather than drawn. */
            if (it.J < 0 && bh > 6) {
                ctx.fillStyle = col;
                ctx.globalAlpha = 0.9;
                ctx.fillRect(it.x - 4, base - bh - 3, 8, 1.5);
                ctx.globalAlpha = 1;
            }

            if (bh > usable * 0.14) {
                ctx.fillStyle = isCarrier ? c.accent : c.dim;
                ctx.font = TINY;
                ctx.textAlign = 'center';
                ctx.fillText(it.m > 0 ? '+' + it.m : String(it.m), it.x, base - bh - 6);
            }
        }
    }

    function axis(ctx, w, h, ticks, label) {
        const c = colors();
        const base = h - 22;
        ctx.font = TINY;
        ctx.textAlign = 'center';
        for (const t of ticks) {
            if (t.x < 0 || t.x > w) continue;
            ctx.strokeStyle = c.border;
            ctx.beginPath(); ctx.moveTo(t.x, base); ctx.lineTo(t.x, base + 4); ctx.stroke();
            ctx.fillStyle = c.dim;
            ctx.fillText(t.label, t.x, base + 15);
        }
        ctx.textAlign = 'right';
        ctx.fillStyle = c.dim;
        ctx.font = TINY;
        ctx.fillText(label, w - 4, 11);
    }

    /* ── time domain: sidebands at fc + m*fm ─────────────────────────────── */

    function drawTone(canvas, st, orders) {
        const { ctx, w, h } = fit(canvas);
        const c = colors();
        const pad = 26;
        const fm = st.fc * st.ratio;
        const limit = (orders.length - 1) / 2;
        const fmax = st.fc + limit * fm;
        const X = (f) => pad + (f / fmax) * (w - pad - 10);

        const items = orders.map(o => {
            const f = st.fc + o.m * fm;
            return { m: o.m, J: o.J, x: X(Math.abs(f)), ghost: f < -1e-9 };
        });

        bars(ctx, w, h, items, c.tone);

        const ticks = [];
        for (let k = 0; k <= 4; k++) {
            const f = (fmax * k) / 4;
            ticks.push({ x: X(f), label: Math.round(f) + '' });
        }
        axis(ctx, w, h, ticks, 'Hz');
    }

    /* ── space domain: orders at sin0 = m*lambda/d ───────────────────────── */

    function drawOrders(canvas, st, orders) {
        const { ctx, w, h } = fit(canvas);
        const c = colors();
        const pad = 26;
        const X = (s) => pad + ((s + 1) / 2) * (w - pad * 2);
        const lam = st.lam / 1000; /* nm to um, to match d */

        const items = [];
        for (const o of orders) {
            const s = (o.m * lam) / st.d;
            if (Math.abs(s) > 1) continue; /* evanescent: it is not out there */
            items.push({ m: o.m, J: o.J, x: X(s), ghost: false });
        }

        bars(ctx, w, h, items, c.space);

        const ticks = [-90, -60, -30, 0, 30, 60, 90].map(deg => ({
            x: X(Math.sin(deg * Math.PI / 180)),
            label: deg + ''
        }));
        axis(ctx, w, h, ticks, 'deg');

        /* The axis is linear in sin0, not in the degrees printed under it. That
         * is why the tick spacing crowds at the edges, and it is not a drawing
         * bug: sin0 is the variable conjugate to position, so it is the one the
         * transform is actually over. */
        ctx.fillStyle = c.dim;
        ctx.font = TINY;
        ctx.textAlign = 'left';
        ctx.fillText('linear in sin(theta)', 4, 11);
    }

    return { drawWave, drawGroove, drawTone, drawOrders };
})();
