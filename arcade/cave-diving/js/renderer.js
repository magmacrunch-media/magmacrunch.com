// renderer.js — cave diving (not even once) | MagmaCrunch Media (c) 2026
// Canvas presentation and screen effects.
//
// fit / glow / vignette / flash are roderick-tron's, near enough verbatim -
// the reasoning in its comments applies here unchanged and is repeated so this
// file stands on its own.

/* global CONFIG */

const Renderer = {
    /**
     * Size the canvas so one game pixel covers a whole number of screen pixels
     * wherever there is room for it.
     *
     * The canvas is 480x270 stretched to fill the viewport, so at a non-integer
     * scale some game pixels land two screen pixels wide and their neighbours
     * one - a visible shimmer as the cave scrolls past. Snapping to an integer
     * scale fixes it, but only above 2x: rounding 1.6x down to 1x would shrink
     * the game to a stamp in the middle of the screen, a worse trade than an
     * uneven pixel.
     */
    fit(canvas) {
        const fit = Math.min(
            window.innerWidth / CONFIG.CANVAS_W,
            window.innerHeight / CONFIG.CANVAS_H
        );
        const scale = fit >= 2 ? Math.floor(fit) : fit;
        canvas.style.width = Math.round(CONFIG.CANVAS_W * scale) + 'px';
        canvas.style.height = Math.round(CONFIG.CANVAS_H * scale) + 'px';
    },

    bindResize(canvas) {
        this.fit(canvas);
        window.addEventListener('resize', () => this.fit(canvas));
    },

    /**
     * Soft radial glow. Filling an arc() at a flat low alpha does not read as
     * light - it reads as a grey disc with a hard rim. Three stops is the
     * cheapest thing that actually looks lit.
     */
    glow(ctx, x, y, radius, rgb, alpha) {
        if (radius <= 0) return;
        const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
        g.addColorStop(0, 'rgba(' + rgb + ',' + alpha + ')');
        g.addColorStop(0.5, 'rgba(' + rgb + ',' + (alpha * 0.4).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(' + rgb + ',0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    },

    /** Corner darkening. Tightens as air runs out - see main.js. */
    vignette(ctx, strength) {
        const s = strength === undefined ? 0.45 : strength;
        const g = ctx.createRadialGradient(
            CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2, CONFIG.CANVAS_H * (0.42 - s * 0.28),
            CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2, CONFIG.CANVAS_W * 0.72
        );
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,' + Math.min(0.92, s).toFixed(3) + ')');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
    },

    /**
     * Screen shake. Alternating sign per frame reads as a rattle; a random
     * walk reads as drift, which is wrong for rock coming loose overhead.
     */
    shakeOffset(frames, seed) {
        if (frames <= 0) return { x: 0, y: 0 };
        const mag = Math.min(frames, 14) * 0.7;
        const s = seed % 2 === 0 ? 1 : -1;
        return { x: Math.round(s * mag), y: Math.round(-s * mag * 0.6) };
    },

    flash(ctx, amount, color) {
        if (amount <= 0) return;
        ctx.globalAlpha = Math.min(0.55, amount);
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
        ctx.globalAlpha = 1;
    },

    /**
     * Moving light bands on the rock. Only drawn in the first segment, where
     * there is still daylight above - the moment they stop is the moment the
     * cave stops being a swim and starts being a dive.
     */
    caustics(ctx, t, strength) {
        if (strength <= 0) return;
        ctx.globalAlpha = 0.05 * strength;
        ctx.fillStyle = '#7fe6ff';
        for (let i = 0; i < 7; i++) {
            const x = ((i * 71 + t * 0.35) % (CONFIG.CANVAS_W + 80)) - 40;
            const w = 14 + (i % 3) * 8;
            ctx.fillRect(Math.round(x), 0, w, CONFIG.CANVAS_H);
        }
        ctx.globalAlpha = 1;
    },
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Renderer };
}
