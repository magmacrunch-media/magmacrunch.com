// Global crystal tracking across all rooms

let globalCrystalsCollected = 0;
let totalCrystalsInGame = TOTAL_CRYSTALS; // Use config value

function initGlobalCrystalTracker() {
    globalCrystalsCollected = 0;
    updateGlobalCrystalDisplay();
}

function incrementGlobalCrystals() {
    globalCrystalsCollected++;
    updateGlobalCrystalDisplay();
}

function getGlobalCrystalsCollected() {
    return globalCrystalsCollected;
}

function getTotalCrystalsInGame() {
    return totalCrystalsInGame;
}

function hasCollectedAllCrystals() {
    return globalCrystalsCollected >= totalCrystalsInGame;
}

function updateGlobalCrystalDisplay() {
    const crystalCountEl = document.getElementById('crystalCount');
    const totalCrystalsEl = document.getElementById('totalCrystals');
    
    if (crystalCountEl) {
        crystalCountEl.textContent = globalCrystalsCollected;
    }
    if (totalCrystalsEl) {
        // Always show global total, not per-room total
        totalCrystalsEl.textContent = totalCrystalsInGame;
    }
}

function resetGlobalCrystalTracker() {
    globalCrystalsCollected = 0;
    updateGlobalCrystalDisplay();
}