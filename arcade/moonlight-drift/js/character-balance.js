// Character Balance Configuration System
// This module adds unique gameplay characteristics to each character
// Characters with larger hitboxes get compensating advantages

const CHARACTER_BALANCE = {
    // Smaller, more agile characters
    'tardigrade': {
        hitboxArea: 650,  // 26 × 25 = smallest!
        // Trade-off: Extra agility
        thrust: -0.7,      // Stronger upward acceleration (default: -0.6)
        gravity: 0.35,     // Slightly reduced gravity (default: 0.4)
        maxVelocity: 11,   // Can move faster (default: 10)
        description: 'Tiny and nimble! Extra agility compensates for precise hitbox'
    },
    
    'prince-vince': {
        hitboxArea: 1026,  // 27 × 38 = narrow but tall
        // Trade-off: Precise control
        thrust: -0.65,     
        gravity: 0.38,     
        maxVelocity: 10.5,
        description: 'Slender profile with responsive controls'
    },
    
    'dspum-balloon': {
        hitboxArea: 1140,  // 30 × 38
        // Trade-off: Floaty physics (fitting for a balloon!)
        thrust: -0.5,      // Weaker thrust
        gravity: 0.3,      // Much lighter gravity
        maxVelocity: 9,    
        description: 'Balloon physics: floats more, harder to control precisely'
    },
    
    'grocery-harrison': {
        hitboxArea: 1050,  // 35 × 30
        // Trade-off: Stable handling
        thrust: -0.6,      
        gravity: 0.4,      
        maxVelocity: 10,   
        description: 'Compact and well-balanced, standard controls'
    },
    
    // Medium-sized characters (around default 40×35 = 1400)
    'backpack-man': {
        hitboxArea: 1224,  // 34 × 36
        thrust: -0.6,
        gravity: 0.4,
        maxVelocity: 10,
        description: 'Slightly smaller than average, standard handling'
    },
    
    'strawberto': {
        hitboxArea: 1368,  // 36 × 38
        // Trade-off: Refined, gentlemanly control
        thrust: -0.6,      // Standard thrust (dignified)
        gravity: 0.39,     // Slightly lighter (sophisticated poise)
        maxVelocity: 10,   // Steady, measured movement
        description: 'Sophisticated strawberry gentleman - refined and stable controls'
    },
    
    'vinny-bobarino': {
        hitboxArea: 1225,  // 35 × 35
        thrust: -0.6,
        gravity: 0.4,
        maxVelocity: 10,
        description: 'Well-balanced square hitbox'
    },
    
    'fire-toad': {
        hitboxArea: 1024,  // 32 × 32
        // Trade-off: Fiery and explosive movement
        thrust: -0.65,     // Strong burst thrust
        gravity: 0.38,     // Lighter gravity (flame-assisted)
        maxVelocity: 10.5, // Quick and nimble
        description: 'Compact toad with explosive, fiery movement'
    },
    
    'mountain-gnome': {
        hitboxArea: 1024,  // 32 × 32
        // Trade-off: Transcendent, meditative physics
        thrust: -0.55,     // Gentle, flowing thrust (like flowing thoughts)
        gravity: 0.32,     // Very light gravity (accessing universal energy)
        maxVelocity: 9.5,  // Smooth, unhurried movement
        description: 'Transcendent meditation master - floaty and serene controls, taps into reservoir of cosmic energy'
    },
    
    'ban-daniel': {
        hitboxArea: 1444,  // 38 × 38
        thrust: -0.6,
        gravity: 0.4,
        maxVelocity: 10,
        description: 'Close to standard size and handling'
    },
    
    'elektra': {
        hitboxArea: 1444,  // 38 × 38
        // Trade-off: Smooth, artistic control
        thrust: -0.58,     // Slightly gentler thrust (laid-back)
        gravity: 0.38,     // Lighter gravity (floaty poetry vibes)
        maxVelocity: 10.5, // Smooth gliding movement
        description: 'Cool poetry chick with smooth, artistic controls - beatnik style'
    },
    
    'carl': {
        hitboxArea: 1444,  // 38 × 38
        // Trade-off: Psychedelic energy and momentum
        thrust: -0.62,     // Strong psychedelic burst
        gravity: 0.37,     // Light and trippy
        maxVelocity: 11,   // Fast rainbow speeds
        description: 'Psychedelic pineapple with energetic, trippy physics - rides the rainbow'
    },
    
    'plantain-jane': {
        hitboxArea: 1444,  // 38 × 38
        thrust: -0.6,
        gravity: 0.4,
        maxVelocity: 10,
        description: 'Standard handling and size'
    },
    
    'dag-henderson': {
        hitboxArea: 1400,  // 40 × 35 - EXACT default
        thrust: -0.6,
        gravity: 0.4,
        maxVelocity: 10,
        description: 'Default physics - well-balanced for beginners'
    },
    
    'darius-hodgekins': {
        hitboxArea: 1400,  // 40 × 35
        thrust: -0.6,
        gravity: 0.4,
        maxVelocity: 10,
        description: 'Default physics - well-balanced for beginners'
    },
    
    'gangsta-beaver': {
        hitboxArea: 1400,  // 40 × 35
        thrust: -0.6,
        gravity: 0.4,
        maxVelocity: 10,
        description: 'Default physics - well-balanced for beginners'
    },
    
    'juanito-thompson': {
        hitboxArea: 1400,  // 40 × 35
        thrust: -0.6,
        gravity: 0.4,
        maxVelocity: 10,
        description: 'Default physics - well-balanced for beginners'
    },
    
    'roderick-tron': {
        hitboxArea: 1400,  // 40 × 35
        thrust: -0.6,
        gravity: 0.4,
        maxVelocity: 10,
        description: 'Default physics - well-balanced for beginners'
    },
    
    'tollbooth-lady': {
        hitboxArea: 1400,  // 40 × 35
        thrust: -0.6,
        gravity: 0.4,
        maxVelocity: 10,
        description: 'Default physics - well-balanced for beginners'
    },
    
    // FIXED: Cat Synth moved to medium category (it's actually 10% smaller than default)
    'cat-synth': {
        hitboxArea: 1260,  // 42 × 30 - wide but short, actually smaller than default!
        // Trade-off: Slightly more agile (was incorrectly listed as large)
        thrust: -0.6,
        gravity: 0.36,     // CHANGED: Reduced gravity (was 0.38)
        maxVelocity: 10.5, // CHANGED: Added speed boost (was 10)
        description: 'Wide profile but smaller overall - stable and responsive'
    },
    
    // Larger characters with compensating advantages
    'foresters-soul': {
        hitboxArea: 1600,  // 40 × 40
        // Trade-off: IMPROVED - More compensation for larger hitbox
        thrust: -0.62,     // CHANGED: Stronger thrust (was -0.6)
        gravity: 0.38,     // CHANGED: Reduced gravity (was 0.4)
        maxVelocity: 11,   // Can go faster
        description: 'Larger hitbox but enhanced speed and control'
    },
    
    'carl-spatski': {
        hitboxArea: 1764,  // 42 × 42
        // Trade-off: Better acceleration
        thrust: -0.65,     // Stronger thrust
        gravity: 0.4,
        maxVelocity: 10.5,
        description: 'Large hitbox compensated by powerful thrust'
    },
    
    'didgeridoo-man': {
        hitboxArea: 1575,  // 45 × 35 - widest character!
        // Trade-off: Momentum-based control
        thrust: -0.7,      // Strong thrust
        gravity: 0.35,     // Reduced gravity
        maxVelocity: 9.5,  // Slightly slower max speed
        description: 'Very wide but powerful thrust and floaty feel'
    },
    
    // FIXED: SVFP Van changed to neutral physics (was penalty physics)
    'svfp-van': {
        hitboxArea: 648,   // 36 × 18 - very flat! 2nd smallest character
        // Trade-off: Flat profile IS the advantage - no physics penalties needed
        thrust: -0.6,      // CHANGED: Standard thrust (was -0.55 penalty)
        gravity: 0.4,      // CHANGED: Standard gravity (was 0.42 penalty)
        maxVelocity: 10,   // Standard speed
        description: 'Ultra-flat profile perfect for hugging bottom gaps - specialty vehicle'
    }
};

// Helper function to get character physics
function getCharacterPhysics(characterId) {
    const balance = CHARACTER_BALANCE[characterId];
    if (balance) {
        return {
            thrust: balance.thrust,
            gravity: balance.gravity,
            maxVelocity: balance.maxVelocity,
            description: balance.description
        };
    }
    // Return defaults for any character not in the balance config
    return {
        thrust: -0.6,
        gravity: 0.4,
        maxVelocity: 10,
        description: 'Standard physics'
    };
}

// Helper function to apply character physics to player
function applyCharacterPhysics(playerObj, characterId) {
    const physics = getCharacterPhysics(characterId);
    playerObj.thrust = physics.thrust;
    playerObj.gravity = physics.gravity;
    playerObj.maxVelocity = physics.maxVelocity;
}

// FIXED: New rating system with separate survivability and control ratings
function getCharacterStats(characterId) {
    const char = window.characters[characterId];
    const balance = CHARACTER_BALANCE[characterId];
    
    if (!char || !char.hitbox) {
        return null;
    }
    
    const hitbox = char.hitbox;
    const area = hitbox.width * hitbox.height;
    const defaultArea = 1400; // 40 × 35
    const sizeRating = Math.round((defaultArea / area) * 5); // 5-star rating (more stars = smaller hitbox)
    
    const physics = getCharacterPhysics(characterId);
    
    // Calculate agility rating (higher thrust + lower gravity + higher maxVel = more agile)
    const thrustScore = (Math.abs(physics.thrust) - 0.5) * 10; // 0-2
    const gravityScore = (0.5 - physics.gravity) * 10; // 0-2
    const speedScore = (physics.maxVelocity - 9) * 0.5; // 0-2
    const agilityRating = Math.min(5, Math.max(1, Math.round(thrustScore + gravityScore + speedScore + 1)));
    
    // FIXED: Replaced confusing "difficulty" with clear "survivability" and "controlRating"
    // Survivability: How easy is it to avoid getting hit? (inverted from area size)
    // Smaller hitbox = higher survivability = more stars
    let survivabilityRating;
    if (area < 900) {
        survivabilityRating = 5;  // Very High - Tiny characters (Tardigrade, SVFP Van)
    } else if (area < 1200) {
        survivabilityRating = 4;  // High - Small characters (Prince Vince, Grocery Harrison)
    } else if (area < 1400) {
        survivabilityRating = 3;  // Medium - Medium characters (Backpack Man, Vinny, Cat Synth)
    } else if (area < 1600) {
        survivabilityRating = 2;  // Low - Large-ish characters (Ban Daniel, Plantain Jane)
    } else {
        survivabilityRating = 1;  // Very Low - Large characters (Forester's Soul, Carl Spatski)
    }
    
    // Control Rating: How easy is it to control? (inverted from agility)
    // Less agile = easier to control = more stars
    let controlRating;
    if (agilityRating <= 2) {
        controlRating = 5;        // Very Easy - Beginner friendly
    } else if (agilityRating <= 3) {
        controlRating = 4;        // Easy - Intermediate
    } else if (agilityRating <= 4) {
        controlRating = 3;        // Moderate - Advanced
    } else {
        controlRating = 2;        // Hard - Expert
    }
    
    // Overall recommendation based on both factors
    let recommendedFor;
    if (area < 900 && agilityRating > 3) {
        recommendedFor = 'Expert players seeking maximum challenge';
    } else if (area < 900) {
        recommendedFor = 'Skilled players who want survivability advantage';
    } else if (area > 1600) {
        recommendedFor = 'Beginners who want forgiving, powerful controls';
    } else if (area > 1400) {
        recommendedFor = 'Players who prefer powerful, responsive handling';
    } else {
        recommendedFor = 'All skill levels - well balanced';
    }
    
    return {
        name: char.name,
        hitboxSize: `${hitbox.width}×${hitbox.height}`,
        hitboxArea: area,
        sizeRating: Math.min(5, Math.max(1, sizeRating)), // 1-5 stars (smaller = more stars)
        agilityRating: agilityRating, // 1-5 stars (more agile = more stars)
        survivabilityRating: survivabilityRating, // NEW: 1-5 stars (smaller hitbox = more stars)
        controlRating: controlRating, // NEW: 1-5 stars (less agile = easier = more stars)
        thrust: physics.thrust,
        gravity: physics.gravity,
        maxVelocity: physics.maxVelocity,
        description: balance?.description || 'Standard handling',
        recommendedFor: recommendedFor       // Player recommendation
    };
}

// Make functions available globally
if (typeof window !== 'undefined') {
    window.CHARACTER_BALANCE = CHARACTER_BALANCE;
    window.getCharacterPhysics = getCharacterPhysics;
    window.applyCharacterPhysics = applyCharacterPhysics;
    window.getCharacterStats = getCharacterStats;
}
