const LORE_FRAGMENTS = [
    { id: "void_echo_1", text: "The mirrors remember what you have forgotten.", type: "inscription" },
    { id: "void_echo_2", text: "She walked into the infinite corridor and never turned back.", type: "inscription" },
    { id: "void_echo_3", text: "Each room is a thought you haven't finished thinking.", type: "inscription" },
    { id: "void_echo_4", text: "The void is not empty. It is full of everything you have lost.", type: "inscription" },
    { id: "void_echo_5", text: "There is no exit. There is only deeper.", type: "inscription" },
    { id: "void_echo_6", text: "The face in the mirror is not yours. It is the mirror's.", type: "inscription" },
    { id: "void_echo_7", text: "You came here looking for something. You will leave as something else.", type: "inscription" },
    { id: "atmosphere_1", text: "a whisper: you have been here before", type: "atmosphere" },
    { id: "atmosphere_2", text: "the walls are breathing", type: "atmosphere" },
    { id: "atmosphere_3", text: "someone is watching from the other side", type: "atmosphere" },
    { id: "atmosphere_4", text: "time moves differently in the mirror", type: "atmosphere" },
    { id: "atmosphere_5", text: "the path remembers every step you never took", type: "atmosphere" },
    { id: "atmosphere_6", text: "you are the maze observing itself", type: "atmosphere" },
    { id: "atmosphere_7", text: "what if the exit was behind you all along", type: "atmosphere" },
    { id: "atmosphere_8", text: "the light here is not light. it is memory.", type: "atmosphere" },
    { id: "npc_dag_1", text: "You found me. Or I found you. The mirrors don't distinguish.", type: "npc" },
    { id: "npc_dag_2", text: "I've been walking these corridors for what feels like centuries. The crystals are gone. Only reflections remain.", type: "npc" },
    { id: "npc_dag_3", text: "She built this place. Or it built itself around her. I was never sure which.", type: "npc" },
    { id: "npc_watcher_1", text: "I am the one who watches the watcher. Do you understand? No. Not yet.", type: "npc" },
    { id: "npc_watcher_2", text: "The mirrors show what was, what could be, and what must never be. Choose carefully what you look at.", type: "npc" },
    { id: "npc_echo_1", text: "I am not real. I am the echo of someone who left through a door that no longer exists.", type: "npc" },
    { id: "npc_echo_2", text: "The deeper you go, the harder it is to remember which direction is up.", type: "npc" },
    { id: "ending_1", text: "You have found all the fragments. The mirror shows you the truth: you were never lost. You were the maze all along.", type: "ending" }
];

const FRAGMENT_DISCOVERY_RADIUS = 2.5;
const ATMOSPHERE_TRIGGER_RADIUS = 6.0;

let discoveredFragments = [];
let onFragmentDiscovered = null;
let endingDiscovered = false;

function initLoreSystem() {
    discoveredFragments = [];
    endingDiscovered = false;
    updateFragmentDisplay();
}

function hasFragment(fragmentId) {
    return discoveredFragments.includes(fragmentId);
}

function discoverFragment(fragmentId) {
    if (hasFragment(fragmentId)) return false;
    discoveredFragments.push(fragmentId);
    updateFragmentDisplay();
    const fragment = LORE_FRAGMENTS.find(f => f.id === fragmentId);
    if (fragment) {
        showFragmentNotification(fragment.text, fragment.type);
    }
    const totalDiscoverable = LORE_FRAGMENTS.filter(f => f.type !== "ending").length;
    const discovered = discoveredFragments.filter(id => {
        const f = LORE_FRAGMENTS.find(lf => lf.id === id);
        return f && f.type !== "ending";
    }).length;
    if (discovered >= Math.floor(totalDiscoverable * 0.7) && !endingDiscovered) {
        endingDiscovered = true;
        triggerHiddenEnding();
    }
    if (onFragmentDiscovered) onFragmentDiscovered(fragmentId);
    return true;
}

function getDiscoveredFragmentCount() {
    return discoveredFragments.filter(id => {
        const f = LORE_FRAGMENTS.find(lf => lf.id === id);
        return f && f.type !== "ending";
    }).length;
}

function getTotalDiscoverableFragments() {
    return LORE_FRAGMENTS.filter(f => f.type !== "ending").length;
}

function updateFragmentDisplay() {
    const countEl = document.getElementById('fragmentCount');
    if (countEl) countEl.textContent = getDiscoveredFragmentCount();
}

function getFragmentsInCurrentRoom() {
    const room = getCurrentRoom();
    const inscriptions = ROOM_INSCRIPTIONS[room] || [];
    const atmospheres = ROOM_ATMOSPHERES[room] || [];
    return inscriptions.concat(atmospheres);
}

function getDiscoveredFragmentsInCurrentRoom() {
    const roomFrags = getFragmentsInCurrentRoom();
    return roomFrags.filter(f => hasFragment(f.fragmentId));
}

function showFragmentNotification(text, type) {
    let container = document.getElementById('fragmentNotification');
    if (!container) {
        container = document.createElement('div');
        container.id = 'fragmentNotification';
        container.style.cssText = `
            position: fixed;
            bottom: 40px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(20, 10, 30, 0.92);
            border: 1px solid rgba(153, 102, 255, 0.6);
            border-radius: 8px;
            padding: 16px 28px;
            max-width: 500px;
            color: #ddccff;
            font-family: 'Press Start 2P', monospace;
            font-size: 11px;
            line-height: 1.6;
            text-align: center;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.6s ease;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }
    container.textContent = text;
    container.style.opacity = '1';
    setTimeout(() => {
        container.style.opacity = '0';
    }, 4000);
}

function triggerHiddenEnding() {
    const endingFragment = LORE_FRAGMENTS.find(f => f.type === "ending");
    if (endingFragment) {
        showFragmentNotification(endingFragment.text, "ending");
        setTimeout(() => {
            const victoryDiv = document.getElementById('victory');
            if (victoryDiv) {
                const titleEl = victoryDiv.querySelector('h2');
                if (titleEl) titleEl.textContent = 'THE MIRROR REMEMBERS';
                victoryDiv.style.display = 'block';
            }
        }, 6000);
    }
}

function resetLoreSystem() {
    discoveredFragments = [];
    endingDiscovered = false;
    updateFragmentDisplay();
}