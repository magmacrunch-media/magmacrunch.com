// light.js — cave diving (not even once) | MagmaCrunch Media (c) 2026
// The headlamp mask: the one system the arcade did not already have.
//
// Technique is pay2play's scratch-off (arcade/pay2play/game.js) turned inside
// out. A full-frame black layer is built on an offscreen canvas, the lamp cone
// is PUNCHED out of it with destination-out, and the result is composited over
// the finished frame. What the lamp reaches shows; what it does not, does not.
//
// Two things about this are load-bearing and easy to get wrong.
//
// ONE CANVAS, ALLOCATED ONCE. Creating the offscreen canvas per frame is the
// obvious way to write this and it will quietly cost more than everything else
// in the render put together.
//
// DARKNESS IS NOT OPACITY 1. At DARK_ALPHA the unlit cave still shows through
// at a few percent, which is what keeps a hazard readable just outside the cone.
// A true blackout would make config.js's sight-line budget a lie: the budget
// says a hazard is visible for TELEGRAPH + REACTION frames before it can touch
// you, and that is only true if "visible" means visible.

/* global CONFIG */

const Light = {
    _c: null,
    _m: null,

    init() {
        this._c = document.createElement('canvas');
        this._c.width = CONFIG.CANVAS_W;
        this._c.height = CONFIG.CANVAS_H;
        this._m = this._c.getContext('2d');
        return this;
    },

    /**
     * Punch one soft-edged cone. Drawn as two overlapping wedges - a bright
     * inner one and a wider, weaker outer one - because a single clipped wedge
     * has a hard angular edge that reads as a cardboard cutout rather than as
     * a beam in silty water.
     */
    _cone(m, x, y, dirX, dirY, radius, half, peak) {
        const a = Math.atan2(dirY, dirX);
        m.save();
        m.beginPath();
        m.moveTo(x, y);
        m.arc(x, y, radius, a - half, a + half);
        m.closePath();
        m.clip();
        const g = m.createRadialGradient(x, y, 0, x, y, radius);
        g.addColorStop(0, 'rgba(0,0,0,' + peak + ')');
        g.addColorStop(0.55, 'rgba(0,0,0,' + (peak * 0.55).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        m.fillStyle = g;
        m.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        m.restore();
    },

    _halo(m, x, y, radius, peak) {
        const g = m.createRadialGradient(x, y, 0, x, y, radius);
        g.addColorStop(0, 'rgba(0,0,0,' + peak + ')');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        m.fillStyle = g;
        m.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    },

    /**
     * The warm beam itself, drawn ADDITIVELY over the scene before the mask.
     *
     * Punching a hole in the darkness is not the same as lighting something.
     * With only the mask, rock inside the cone was merely un-dimmed - and
     * against a palette this dark that still reads as black, so the lamp
     * appeared to do nothing at all. This is the half that makes wet rock look
     * lit; `draw` below is the half that makes everything else look unlit.
     */
    beam(ctx, lamp) {
        if (!lamp || lamp.radius <= 0) return;
        const a = Math.atan2(lamp.dirY, lamp.dirX);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.moveTo(lamp.x, lamp.y);
        ctx.arc(lamp.x, lamp.y, lamp.radius, a - CONFIG.LAMP_CONE * 1.25, a + CONFIG.LAMP_CONE * 1.25);
        ctx.closePath();
        ctx.clip();
        const g = ctx.createRadialGradient(lamp.x, lamp.y, 0, lamp.x, lamp.y, lamp.radius);
        // These are strong on purpose. The cave palette sits near black, so an
        // additive light at a polite alpha is indistinguishable from no light.
        g.addColorStop(0, 'rgba(255,243,196,0.62)');
        g.addColorStop(0.35, 'rgba(214,236,222,0.34)');
        g.addColorStop(0.7, 'rgba(150,200,206,0.13)');
        g.addColorStop(1, 'rgba(120,180,190,0)');
        ctx.fillStyle = g;
        ctx.fillRect(lamp.x - lamp.radius, lamp.y - lamp.radius, lamp.radius * 2, lamp.radius * 2);
        ctx.restore();
    },

    /**
     * Composite the darkness over the frame.
     *
     * `lamp` is {x, y, dirX, dirY, radius} in canvas pixels, with x/y already
     * resolved from the sprite's own lamp pixel by pixels.diverPose - not
     * guessed from the diver's centre, which detaches the cone from the lamp
     * as soon as facing changes.
     *
     * `extra` is any other light in the frame: an air pocket's shimmer, a
     * pearl, the glow of the surface in the last segment.
     */
    draw(ctx, lamp, extra, darkAlpha) {
        const m = this._m;
        m.globalCompositeOperation = 'source-over';
        m.clearRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
        m.fillStyle = '#000';
        m.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

        m.globalCompositeOperation = 'destination-out';
        if (lamp && lamp.radius > 0) {
            this._cone(m, lamp.x, lamp.y, lamp.dirX, lamp.dirY,
                lamp.radius * 1.22, CONFIG.LAMP_CONE * 1.8, 0.42);
            this._cone(m, lamp.x, lamp.y, lamp.dirX, lamp.dirY,
                lamp.radius, CONFIG.LAMP_CONE, 1);
            this._halo(m, lamp.x, lamp.y, CONFIG.LAMP_HALO, 0.9);
        }
        if (extra) {
            for (let i = 0; i < extra.length; i++) {
                const e = extra[i];
                this._halo(m, e.x, e.y, e.r, e.a === undefined ? 0.8 : e.a);
            }
        }
        m.globalCompositeOperation = 'source-over';

        ctx.globalAlpha = darkAlpha;
        ctx.drawImage(this._c, 0, 0);
        ctx.globalAlpha = 1;
    },
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Light };
}
