// input.js — cave diving (not even once) | MagmaCrunch Media (c) 2026
// Keyboard and touch, merged behind accessors that do not know which is live.
//
// Two gotchas both other action games document and this one inherits:
//
//   - window blur clears the key state. A tabbed-away window never sees the
//     keyup, so without this you come back mid-stroke and drifting.
//   - Input.init() must register BEFORE the UI keydown handler, and
//     clearPressed() must run on restart - otherwise the Space that starts the
//     dive also strokes on frame 1.

const Input = {
    keys: {},
    pressed: {},

    // Touch state. Steering and stroking are tracked by pointerId so they are
    // genuinely independent contacts - jovian's rule. A thumb steering must not
    // be cancelled by the other thumb stroking.
    steerId: null,
    steerFrom: null,
    touchAxis: null,
    strokeId: null,
    touchStroke: false,

    STEER_RADIUS: 42,

    init() {
        window.addEventListener('keydown', (e) => {
            const k = e.key.toLowerCase();
            if (!this.keys[k]) this.pressed[k] = true;
            this.keys[k] = true;
            if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].indexOf(k) >= 0) {
                e.preventDefault();
            }
        });
        window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
        window.addEventListener('blur', () => { this.keys = {}; this.pressed = {}; this.resetTouch(); });
    },

    resetTouch() {
        this.steerId = null;
        this.steerFrom = null;
        this.touchAxis = null;
        this.strokeId = null;
        this.touchStroke = false;
    },

    /**
     * Left two-thirds steers, right third strokes. Steering is relative to
     * where the drag started rather than absolute on the canvas, so the thumb
     * never has to reach a particular place, and it returns the same -1..1
     * space the keys do.
     */
    initTouch(canvas) {
        const local = (e) => {
            const r = canvas.getBoundingClientRect();
            return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width };
        };

        canvas.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse') return;
            e.preventDefault();
            const p = local(e);
            if (p.x > p.w * 0.66) {
                if (this.strokeId === null) { this.strokeId = e.pointerId; this.touchStroke = true; }
            } else if (this.steerId === null) {
                this.steerId = e.pointerId;
                this.steerFrom = { x: p.x, y: p.y };
                this.touchAxis = { x: 0, y: 0 };
            }
        }, { passive: false });

        canvas.addEventListener('pointermove', (e) => {
            if (e.pointerId !== this.steerId || !this.steerFrom) return;
            e.preventDefault();
            const p = local(e);
            const dx = p.x - this.steerFrom.x;
            const dy = p.y - this.steerFrom.y;
            const d = Math.hypot(dx, dy) || 1;
            const m = Math.min(1, d / this.STEER_RADIUS);
            this.touchAxis = { x: (dx / d) * m, y: (dy / d) * m };
        }, { passive: false });

        const lift = (e) => {
            if (e.pointerId === this.steerId) {
                // Null, not zero: the diver coasts on release instead of
                // snapping its facing to centre.
                this.steerId = null; this.steerFrom = null; this.touchAxis = null;
            }
            if (e.pointerId === this.strokeId) { this.strokeId = null; }
        };
        canvas.addEventListener('pointerup', lift);
        canvas.addEventListener('pointercancel', lift);
    },

    down(k) { return !!this.keys[k]; },
    wasPressed(k) { return !!this.pressed[k]; },
    clearPressed() { this.pressed = {}; this.touchStroke = false; },

    axisX() {
        let v = 0;
        if (this.down('arrowleft') || this.down('a')) v -= 1;
        if (this.down('arrowright') || this.down('d')) v += 1;
        if (v === 0 && this.touchAxis) v = this.touchAxis.x;
        return v;
    },

    axisY() {
        let v = 0;
        if (this.down('arrowup') || this.down('w')) v -= 1;
        if (this.down('arrowdown') || this.down('s')) v += 1;
        if (v === 0 && this.touchAxis) v = this.touchAxis.y;
        return v;
    },

    /** Edge-triggered: one stroke per press, never key-repeat. */
    stroking() {
        return this.wasPressed(' ') || this.wasPressed('z') || this.touchStroke;
    },

    start() {
        return this.wasPressed(' ') || this.wasPressed('enter') || this.touchStroke;
    },
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Input };
}
