// ═══════════════════════════════════════════════
// Very Long Boards — Audio (procedural sounds)
// ═══════════════════════════════════════════════

let audioCtx = null;

function initAudio() {
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const resume = () => {
            if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
            document.removeEventListener('keydown', resume);
            document.removeEventListener('touchstart', resume);
        };
        document.addEventListener('keydown', resume);
        document.addEventListener('touchstart', resume);
    } catch (e) {
        console.log('Web Audio not available');
    }
}

function playTone(freq, duration, type, volume) {
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = type || 'square';
    osc.frequency.value = freq;
    gain.gain.value = volume || 0.1;
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playCrashSound() {
    playTone(150, 0.15, 'sawtooth', 0.15);
    setTimeout(() => playTone(80, 0.2, 'square', 0.1), 50);
}

function playTrickSound() {
    playTone(880, 0.1, 'sine', 0.08);
    setTimeout(() => playTone(1100, 0.08, 'sine', 0.06), 80);
    setTimeout(() => playTone(1320, 0.12, 'sine', 0.04), 160);
}

function playNearMissSound() {
    playTone(440, 0.08, 'sine', 0.06);
}

function playGameOverSound() {
    playTone(440, 0.15, 'square', 0.12);
    setTimeout(() => playTone(350, 0.15, 'square', 0.1), 150);
    setTimeout(() => playTone(260, 0.3, 'square', 0.08), 300);
}

function playSelectSound() {
    playTone(660, 0.08, 'square', 0.06);
}

function playStartSound() {
    playTone(440, 0.1, 'sine', 0.08);
    setTimeout(() => playTone(660, 0.1, 'sine', 0.06), 100);
    setTimeout(() => playTone(880, 0.15, 'sine', 0.04), 200);
}
