// sfx.js — cave diving (not even once) | MagmaCrunch Media (c) 2026
// Procedural WebAudio. Same reasoning as jovian's: eight generated sounds cost
// nothing to ship and keep the game to a single audio asset, the song itself.
//
// Everything ramps from 0.0001 rather than 0 because an exponential ramp to or
// from a true zero is undefined and browsers answer it with a click.

const Sfx = (function () {
    let ac = null;
    let master = null;
    let muted = false;

    function ctx() {
        if (!ac) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ac = new AC();
            master = ac.createGain();
            master.gain.value = 0.5;
            master.connect(ac.destination);
        }
        if (ac.state === 'suspended') ac.resume();
        return ac;
    }

    function tone(freq, dur, type, vol, freqTo, delay) {
        if (muted) return;
        const a = ctx();
        if (!a) return;
        const t0 = a.currentTime + (delay || 0);
        const o = a.createOscillator();
        const g = a.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(freq, t0);
        if (freqTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), t0 + dur);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.02, dur * 0.3));
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(master);
        o.start(t0); o.stop(t0 + dur + 0.02);
    }

    function noise(dur, vol, cutoff, delay, cutoffTo) {
        if (muted) return;
        const a = ctx();
        if (!a) return;
        const t0 = a.currentTime + (delay || 0);
        const n = Math.floor(a.sampleRate * dur);
        const buf = a.createBuffer(1, n, a.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        const src = a.createBufferSource();
        src.buffer = buf;
        const f = a.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(cutoff, t0);
        if (cutoffTo) f.frequency.exponentialRampToValueAtTime(Math.max(40, cutoffTo), t0 + dur);
        const g = a.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(f); f.connect(g); g.connect(master);
        src.start(t0); src.stop(t0 + dur + 0.02);
    }

    return {
        setMuted(v) { muted = v; },
        // A kick and the water moving over you. Short, so a fast stroke rate
        // does not turn into mush.
        stroke() { noise(0.16, 0.10, 900, 0, 260); },
        // Exhaust bubbles. Randomised so a held rhythm does not sound looped.
        bubble() {
            const f = 380 + Math.random() * 420;
            tone(f, 0.09, 'sine', 0.05, f * 2.4);
        },
        pocket() {
            tone(520, 0.18, 'sine', 0.11, 880);
            tone(780, 0.22, 'sine', 0.07, 1180, 0.06);
        },
        pearl() { tone(1180, 0.12, 'triangle', 0.09, 1760); },
        // Losing breath. A downward gasp plus the noise of it leaving.
        gasp() {
            noise(0.34, 0.16, 1600, 0, 300);
            tone(300, 0.3, 'sawtooth', 0.07, 110);
        },
        hit() { noise(0.2, 0.2, 700, 0, 160); tone(150, 0.22, 'square', 0.06, 70); },
        // The warning before rock comes loose. Low, long, and clearly not music.
        rumble() { noise(0.9, 0.15, 190, 0, 70); tone(52, 0.9, 'sine', 0.10, 38); },
        // The way back shutting. The loudest thing in the game on purpose.
        collapse() {
            noise(1.5, 0.34, 420, 0, 55);
            tone(74, 1.3, 'sine', 0.20, 30);
            tone(110, 0.7, 'square', 0.08, 44, 0.08);
            noise(0.5, 0.16, 900, 0.5, 200);
        },
        // Heartbeat under AIR_PANIC. Two thumps, the second softer.
        heart() {
            tone(58, 0.13, 'sine', 0.19, 40);
            tone(52, 0.11, 'sine', 0.12, 36, 0.17);
        },
        surface() {
            noise(0.7, 0.2, 2600, 0, 700);
            tone(520, 0.5, 'sine', 0.10, 1040);
            tone(780, 0.6, 'sine', 0.08, 1560, 0.1);
        },
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Sfx };
}
