const ATMOSPHERE_FADE_DURATION = 6000;
const ATMOSPHERE_COOLDOWN = 15000;

let atmosphereTimer = 0;
let atmosphereQueue = [];
let atmosphereActive = false;
let lastAtmosphereTime = 0;
let atmosphereEl = null;

function initAtmosphericText() {
    atmosphereTimer = 0;
    atmosphereActive = false;
    lastAtmosphereTime = 0;
    atmosphereQueue = [];
}

function setupAtmosphereUI() {
    atmosphereEl = document.createElement('div');
    atmosphereEl.id = 'atmosphereText';
    atmosphereEl.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: rgba(180, 140, 255, 0.8);
        font-family: 'Press Start 2P', monospace;
        font-size: 13px;
        line-height: 2;
        text-align: center;
        pointer-events: none;
        z-index: 500;
        opacity: 0;
        transition: opacity 2s ease;
        text-shadow: 0 0 20px rgba(153, 102, 255, 0.5), 0 0 40px rgba(153, 102, 255, 0.3);
        max-width: 500px;
        letter-spacing: 0.05em;
    `;
    document.body.appendChild(atmosphereEl);
}

function updateAtmosphericText() {
    const now = Date.now();
    if (now - lastAtmosphereTime < ATMOSPHERE_COOLDOWN) return;

    if (!atmosphereEl) setupAtmosphereUI();

    const room = getCurrentRoom();
    const roomAtmospheres = ROOM_ATMOSPHERES[room] || [];
    const undiscovered = roomAtmospheres.filter(a => !hasFragment(a.fragmentId));
    if (undiscovered.length === 0) return;

    if (Math.random() > 0.003) return;

    const chosen = undiscovered[Math.floor(Math.random() * undiscovered.length)];
    const fragment = LORE_FRAGMENTS.find(f => f.id === chosen.fragmentId);
    if (!fragment) return;

    lastAtmosphereTime = now;
    discoverFragment(chosen.fragmentId);
    showAtmosphericText(fragment.text);
}

function showAtmosphericText(text) {
    if (!atmosphereEl) setupAtmosphereUI();

    atmosphereEl.textContent = text;
    atmosphereEl.style.opacity = '1';

    setTimeout(() => {
        atmosphereEl.style.opacity = '0';
    }, ATMOSPHERE_FADE_DURATION - 2000);
}

function resetAtmosphericText() {
    atmosphereTimer = 0;
    atmosphereActive = false;
    lastAtmosphereTime = 0;
    if (atmosphereEl) {
        atmosphereEl.style.opacity = '0';
    }
}