// =============================================================================
// CHARACTER SYSTEM
// =============================================================================

// Initialize the character registry
window.characters = {};

let currentCharacter = 'cat-synth'; // default character

// Character management functions
function getCurrentCharacter() {
    return currentCharacter;
}

function drawCurrentCharacter(ctx, x, y, thrustActive, isGameRunning, animationTime = 0) {
    const character = window.characters[currentCharacter];
    if (character && character.draw) {
        ctx.save();
        character.draw(ctx, x, y, thrustActive, isGameRunning, animationTime);
        ctx.restore();
    }
}

function getCharacterData() {
    return window.characters;
}

function setCurrentCharacter(characterId) {
    if (window.characters[characterId]) {
        currentCharacter = characterId;
        // Save to localStorage so it persists
        localStorage.setItem('selectedCharacter', characterId);
        
        // Apply character-specific physics immediately if player exists
        if (typeof player !== 'undefined' && window.applyCharacterPhysics) {
            window.applyCharacterPhysics(player, characterId);
            console.log('Applied physics for new character:', characterId);
        }
    }
}

function loadSavedCharacter() {
    const saved = localStorage.getItem('selectedCharacter');
    if (saved && window.characters[saved]) {
        currentCharacter = saved;
    }
}

function getAllCharacters() {
    return Object.keys(window.characters).map(id => ({
        id: id,
        name: window.characters[id].name
    }));
}

// Load saved character on initialization
loadSavedCharacter();