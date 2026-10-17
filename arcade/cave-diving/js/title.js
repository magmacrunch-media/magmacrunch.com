// title.js - cave diving (not even once) | MagmaCrunch Media (c) 2026
// The title card: the moment before the dive, drawn rather than explained.
//
// Daylight at the waterline, a shaft going down into black, the diver hanging
// just under the surface with the lamp pointed at where they are going. Silt
// drifts through the beam. Every so often, far down and off to one side, two
// points of light open and close. Nothing on this screen says what they are.
//
// It reuses the game's own lighting (Light.beam, Light.draw) so the title is
// lit exactly the way a dive is, and keeps all of its state here so main.js
// only has to call draw().

/* global CONFIG, Light, Renderer, sprite, diverPose */

const Title = (function () {
    const W = CONFIG.CANVAS_W, H = CONFIG.CANVAS_H;
    const SURFACE = 30;            // the waterline, seen from below
    const DIVER_X = W / 2, DIVER_Y = 92;
    // Where the eyes are: below the diver, well outside the cone, in the dark
    // beside the shaft wall. Every EYES_EVERY frames, open for EYES_OPEN.
    const EYES_X = 176, EYES_Y = 168;
    const EYES_EVERY = 660, EYES_OPEN = 70, EYES_FIRST = 240;

    /** A fixed little PRNG, so the shaft is the same rock every visit. */
    function rng(seed) {
        let a = seed;
        return function () {
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // The shaft walls, one row per 4px. Wide at the surface, closing in below.
    const ROW = 4;
    const walls = [];
    (function () {
        const r = rng(1117);
        let jl = 0, jr = 0;
        for (let y = 0; y < H + ROW; y += ROW) {
            jl = jl * 0.7 + (r() - 0.5) * 9;
            jr = jr * 0.7 + (r() - 0.5) * 9;
            const close = Math.min(1, Math.max(0, (y - SURFACE) / (H - SURFACE)));
            const half = 190 - 118 * Math.pow(close, 0.8);
            walls.push({ y, lo: W / 2 - half + jl, hi: W / 2 + half + jr });
        }
    })();

    // Silt, drifting. Only the motes the lamp reaches will show: they are
    // drawn under the darkness mask like everything else in the water.
    const motes = [];
    (function () {
        const r = rng(4242);
        for (let i = 0; i < 90; i++) {
            motes.push({ x: 90 + r() * 300, y: SURFACE + 10 + r() * (H - SURFACE), s: 0.05 + r() * 0.12,
                ph: r() * Math.PI * 2, big: r() < 0.18 });
        }
    })();

    const bubbles = [];

    function water(ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#2c7a86');
        g.addColorStop(SURFACE / H, '#164652');
        g.addColorStop(0.42, '#0b2430');
        g.addColorStop(0.8, '#030b10');
        g.addColorStop(1, '#010507');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }

    /** The underside of the surface: a bright band whose edge moves. */
    function surface(ctx, t) {
        for (let x = 0; x < W; x += 2) {
            const wave = Math.sin(x * 0.045 + t * 0.03) * 2 + Math.sin(x * 0.11 - t * 0.05) * 1.2;
            const y = Math.round(SURFACE + wave);
            ctx.fillStyle = 'rgba(190,240,240,0.55)';
            ctx.fillRect(x, y, 2, 1);
            ctx.fillStyle = 'rgba(140,215,220,0.18)';
            ctx.fillRect(x, 0, 2, y);
        }
    }

    /** Daylight coming down in slanted bands that sway with the surface. */
    function rays(ctx, t) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 6; i++) {
            const x0 = 70 + i * 66 + Math.sin(t * 0.008 + i * 1.7) * 14;
            const w0 = 10 + (i % 3) * 7;
            const len = 120 + (i % 2) * 50;
            const g = ctx.createLinearGradient(0, SURFACE, 0, SURFACE + len);
            g.addColorStop(0, 'rgba(150,230,235,0.10)');
            g.addColorStop(1, 'rgba(150,230,235,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(x0, SURFACE);
            ctx.lineTo(x0 + w0, SURFACE);
            ctx.lineTo(x0 + w0 + 34, SURFACE + len);
            ctx.lineTo(x0 + 18, SURFACE + len);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    function rock(ctx) {
        const C = CONFIG.COLORS;
        for (const w of walls) {
            const lo = Math.round(w.lo), hi = Math.round(w.hi);
            ctx.fillStyle = C.rock;
            ctx.fillRect(0, w.y, lo, ROW);
            ctx.fillRect(hi, w.y, W - hi, ROW);
            ctx.fillStyle = C.rockLit;
            ctx.fillRect(lo - 3, w.y, 3, ROW);
            ctx.fillRect(hi, w.y, 3, ROW);
            ctx.fillStyle = C.rockDeep;
            ctx.fillRect(0, w.y, Math.max(0, lo - 16), ROW);
            ctx.fillRect(hi + 16, w.y, Math.max(0, W - hi - 16), ROW);
        }
    }

    function silt(ctx, t) {
        for (const m of motes) {
            m.y -= m.s * 0.25;
            m.x += Math.sin(t * 0.01 + m.ph) * 0.08;
            if (m.y < SURFACE + 6) m.y = H + 4;
            ctx.fillStyle = m.big ? 'rgba(220,235,220,0.75)' : 'rgba(200,225,215,0.5)';
            ctx.fillRect(Math.round(m.x), Math.round(m.y), m.big ? 2 : 1, m.big ? 2 : 1);
        }
    }

    function breathe(ctx, t, bob) {
        // A breath every two seconds or so, as a short burst of bubbles.
        if (t % 130 === 0 || t % 130 === 6 || t % 130 === 13) {
            bubbles.push({ x: DIVER_X + 3 + (Math.random() - 0.5) * 3, y: DIVER_Y - 8 + bob,
                v: 0.45 + Math.random() * 0.35, r: Math.random() < 0.4 ? 2 : 1 });
        }
        ctx.fillStyle = 'rgba(210,245,250,0.8)';
        for (let i = bubbles.length - 1; i >= 0; i--) {
            const b = bubbles[i];
            b.y -= b.v;
            b.x += Math.sin(b.y * 0.2) * 0.25;
            if (b.y < SURFACE) { bubbles.splice(i, 1); continue; }
            ctx.fillRect(Math.round(b.x), Math.round(b.y), b.r, b.r);
        }
    }

    /** 0..1: how open the eyes are this frame. */
    function eyes(t) {
        if (t < EYES_FIRST) return 0;
        const p = (t - EYES_FIRST) % EYES_EVERY;
        if (p > EYES_OPEN) return 0;
        // Open slowly, hold, then shut quickly - and blink once in the middle.
        if (p > 30 && p < 34) return 0;
        if (p < 18) return p / 18;
        if (p > EYES_OPEN - 6) return (EYES_OPEN - p) / 6;
        return 1;
    }

    return {
        /** Draw frame t of the title scene. */
        draw(ctx, t) {
            water(ctx);
            rays(ctx, t);
            rock(ctx);
            silt(ctx, t);

            const bob = Math.round(Math.sin(t * 0.03) * 2);
            const pose = diverPose(0.06, 1);
            const ox = Math.round(DIVER_X - pose.w / 2);
            const oy = Math.round(DIVER_Y - pose.h / 2 + bob);
            sprite(ctx, pose.rows[Math.floor(t / 40) % 2], ox, oy, pose.flipX, pose.flipY);
            const lamp = { x: ox + pose.lampX, y: oy + pose.lampY, dirX: 0.06, dirY: 1, radius: 118 };
            Light.beam(ctx, lamp);

            // The surface is a light of its own, so the dark closes in below
            // it rather than over it.
            const sky = [];
            for (let x = 20; x < W; x += 60) sky.push({ x, y: SURFACE - 6, r: 70, a: 0.85 });
            Light.draw(ctx, lamp, sky, 0.94);

            surface(ctx, t);
            breathe(ctx, t, bob);
            // Drawn again over the mask so the diver reads against the black,
            // the same trick the game uses for the visor.
            sprite(ctx, pose.rows[Math.floor(t / 40) % 2], ox, oy, pose.flipX, pose.flipY, null, 'VL');

            const e = eyes(t);
            if (e > 0) {
                ctx.fillStyle = 'rgba(214,236,170,' + (0.7 * e).toFixed(3) + ')';
                ctx.fillRect(EYES_X, EYES_Y, 2, 1);
                ctx.fillRect(EYES_X + 7, EYES_Y, 2, 1);
            }

            Renderer.vignette(ctx, 0.6);
        },
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Title };
}
