/* The audible half.
 *
 * Two oscillators: a carrier, and a modulator whose output is summed into the
 * carrier's frequency. That is Chowning FM, and its spectrum is the reason this
 * page exists. Sidebands land at fc + m*fm with amplitude J_m(beta), which is
 * the same array the grating panel reads for its diffraction orders.
 *
 * The one line that carries the physics is the modulator gain:
 *
 *     modGain.gain = beta * fm
 *
 * because the modulation index is defined as beta = peak frequency deviation
 * divided by modulator frequency. Setting the gain to the deviation in Hz is
 * what makes the slider labelled beta actually mean beta, rather than meaning
 * "some depth that looks about right". Get this wrong and the page still makes
 * a pleasant noise while quietly ceasing to demonstrate anything.
 *
 * Nothing here computes a Bessel function. The ear is the independent check on
 * bessel.js: at beta = 2.4048 the carrier pitch really does disappear out of
 * the middle of the sound, and no code on this page arranged for that.
 */

const ToneEngine = (() => {

    let ctx = null;
    let carrier = null;
    let mod = null;
    let modGain = null;
    let master = null;
    let playing = false;

    /* Quiet on purpose. The interesting part of this sound is the sidebands
     * blooming, which is easier to hear under the fatigue threshold than over
     * it, and a page that ambushes somebody at full scale gets closed. */
    const LEVEL = 0.11;
    const RAMP = 0.04;

    function build() {
        ctx = new (window.AudioContext || window.webkitAudioContext)();

        carrier = ctx.createOscillator();
        mod = ctx.createOscillator();
        modGain = ctx.createGain();
        master = ctx.createGain();

        carrier.type = 'sine';
        mod.type = 'sine';
        master.gain.value = 0;

        /* Into the frequency AudioParam, not into the signal path. This is the
         * whole difference between frequency modulation and ring modulation,
         * and it is one connect() call. */
        mod.connect(modGain);
        modGain.connect(carrier.frequency);
        carrier.connect(master);
        master.connect(ctx.destination);

        carrier.start();
        mod.start();
    }

    /* Called on every slider move, whether or not anything is sounding, so the
     * graph is always already correct when play is pressed. setTargetAtTime
     * rather than a bare assignment: beta is dragged continuously, and stepping
     * a frequency deviation of several hundred Hz per animation frame is
     * audible as zipper noise. */
    function update(state) {
        if (!ctx) return;
        const now = ctx.currentTime;
        const fm = state.fc * state.ratio;
        carrier.frequency.setTargetAtTime(state.fc, now, RAMP);
        mod.frequency.setTargetAtTime(fm, now, RAMP);
        modGain.gain.setTargetAtTime(state.beta * fm, now, RAMP);
    }

    async function start(state) {
        if (!ctx) build();
        /* Browsers hand back a suspended context until a gesture unlocks it,
         * and the gesture is the click that got us here. */
        if (ctx.state === 'suspended') await ctx.resume();
        update(state);
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(LEVEL, ctx.currentTime, 0.02);
        playing = true;
        return true;
    }

    function stop() {
        if (!ctx) return;
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
        playing = false;
    }

    function toggle(state) {
        return playing ? (stop(), Promise.resolve(false)) : start(state);
    }

    return { start, stop, toggle, update, isPlaying: () => playing };
})();
