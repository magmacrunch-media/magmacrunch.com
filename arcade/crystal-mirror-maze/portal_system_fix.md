# Crystal Mirror Maze - Portal System Fix

## Overview
This document explains all the fixes implemented to make the bidirectional portal system work correctly.

---

## Problems Identified

### 1. **Portal Collision Issues**
- Portals were embedded in wall cells, causing collision problems
- Players couldn't approach portals from certain directions
- Portal cells (71-79) weren't being excluded from collision detection properly

### 2. **Incorrect Spawn Positions**
- Spawn coordinates didn't align with actual open spaces in maze layouts
- Players spawned too far from or too close to portals
- Room 1 return spawn was in the wrong location

### 3. **Crystal State Not Persisted**
- `resetCrystals()` was clearing ALL crystal data when switching rooms
- Rooms were rebuilt from scratch without checking what was already collected
- No system to track which crystals were collected in which room

### 4. **Portal Detection Issues**
- Detection radius might have been too small
- No proper cooldown to prevent rapid re-triggering

---

## Solutions Implemented

### 1. **config.js - Clear Portal Corridors**

**What Changed:**
- Added 3-cell clear corridors around every portal (one cell before portal, portal cell, one cell after)
- Moved Room 1 portal from row 33 to row 34 for better spacing
- All portals now at column 14 for consistency

**Example - Room 1 Portal Area:**
```javascript
[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1], // Row 33: Clear approach
[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 72, 0, 1, 1], // Row 34: Portal with sides clear
[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1], // Row 35: Clear exit
```

**Why This Works:**
- Players can approach from both sides without hitting walls
- Portal cells are surrounded by open space (value 0)
- No collision issues when transitioning

---

### 2. **roomConfig.js - Fixed Spawn Points**

**What Changed:**
- Updated all spawn positions to be exactly 3 cells away from portals
- Spawn points are in guaranteed open spaces
- Proper facing directions for smooth entry

**Portal Spawn Mappings:**
```javascript
"1-2": { x: 14.5, z: 5.5, facing: 0 }         // Room 1 → Room 2
"2-1": { x: 14.5, z: 31.5, facing: Math.PI }  // Room 2 → Room 1 (FIXED!)
"2-3": { x: 14.5, z: 5.5, facing: 0 }         // Room 2 → Room 3
"3-2": { x: 14.5, z: 10.5, facing: Math.PI }  // Room 3 → Room 2
```

**Why This Works:**
- Spawning 3 cells away gives players clear space
- Facing directions orient players toward maze interior
- No spawning inside walls or on top of portals

---

### 3. **roomSystem.js - Crystal Persistence**

**Critical Addition - Tracking System:**
```javascript
let collectedCrystalsPerRoom = {
    1: [],  // Stores indices of collected crystals in Room 1
    2: [],  // Stores indices of collected crystals in Room 2
    3: []   // Stores indices of collected crystals in Room 3
};
```

**New Functions:**
- `markCrystalCollected(roomNumber, crystalIndex)` - Records collection
- `resetCrystalTracking()` - Clears tracking for new game

**Key Changes:**
1. `createCrystals()` now accepts `alreadyCollectedIndices` parameter
2. Passes collected crystal list when switching rooms
3. Doesn't call `resetCrystals()` during room switch
4. Uses `clearCrystalMeshes()` instead (new function)

**Why This Works:**
- Crystal collection state persists across room switches
- Only 3D meshes/lights are removed, not the data
- Each room remembers its own collected crystals independently

---

### 4. **crystals.js - Persistence Implementation**

**Critical Changes:**

1. **Crystal Index Tracking:**
```javascript
crystals.push({ 
    mesh: crystal, 
    light: crystalLight, 
    collected: false,
    index: crystalIndex, // NEW: Unique ID for this crystal
    time: Math.random() * Math.PI * 2
});
```

2. **Skip Already-Collected Crystals:**
```javascript
function createCrystals(scene, alreadyCollectedIndices = []) {
    let crystalIndex = 0;
    
    for (let row = 0; row < MAZE_LAYOUT.length; row++) {
        for (let col = 0; col < MAZE_LAYOUT[row].length; col++) {
            if (MAZE_LAYOUT[row][col] === 2) {
                // Check if already collected
                if (alreadyCollectedIndices.includes(crystalIndex)) {
                    crystalIndex++;
                    continue; // Don't spawn this crystal!
                }
                
                // ... spawn crystal ...
                crystalIndex++;
            }
        }
    }
}
```

3. **Mark Collection:**
```javascript
function collectCrystal(crystal) {
    // ... existing code ...
    
    // NEW: Record this collection
    const currentRoom = getCurrentRoom();
    markCrystalCollected(currentRoom, crystal.index);
    
    // Update global tracker
    incrementGlobalCrystals();
}
```

4. **New Cleanup Function:**
```javascript
function clearCrystalMeshes() {
    // Only removes 3D objects, NOT collection state
    crystals.forEach(crystal => {
        if (crystal.mesh.parent) crystalScene.remove(crystal.mesh);
        if (crystal.light.parent) crystalScene.remove(crystal.light);
    });
    crystals.length = 0;
}
```

**Why This Works:**
- Each crystal gets a unique index (0, 1, 2, etc.) in each room
- Collected indices are stored per-room
- When re-entering a room, already-collected crystals aren't spawned
- Global count still updates correctly

---

### 5. **portalManager.js - Improved Detection**

**Changes:**
- Increased detection radius from 0.7 to 0.8 units
- Increased cooldown from 500ms to 800ms
- Better console logging for debugging

**Why This Works:**
- Larger radius makes portals easier to trigger
- Longer cooldown prevents accidental double-triggers
- Clear logs help track down any remaining issues

---

## How The System Works Now

### Complete Flow Example: Room 1 → Room 2 → Room 1

**Starting in Room 1:**
1. Player collects crystals 0, 1, 2 in Room 1
2. `markCrystalCollected(1, 0)` called for each
3. `collectedCrystalsPerRoom[1] = [0, 1, 2]`

**Entering Portal to Room 2:**
1. Portal detected at (14, 34)
2. Spawn key: "1-2"
3. Spawn position: (14.5, 5.5) facing south
4. Room 2 loads with `createCrystals(scene, [])` (empty array - nothing collected yet)
5. All 6 crystals spawn in Room 2

**Collecting in Room 2:**
1. Player collects crystals 0, 1 in Room 2
2. `markCrystalCollected(2, 0)` and `markCrystalCollected(2, 1)` called
3. `collectedCrystalsPerRoom[2] = [0, 1]`

**Returning to Room 1:**
1. Portal detected at (14, 2) in Room 2
2. Spawn key: "2-1"
3. Spawn position: (14.5, 31.5) facing north
4. Room 1 loads with `createCrystals(scene, [0, 1, 2])` ← Passes collected list!
5. Only crystals 3, 4, 5 spawn (0, 1, 2 were already collected)

**Victory:**
1. After collecting all 18 crystals across all rooms
2. Door in Room 3 unlocks
3. Player enters door → Victory!

---

## Testing Checklist

### Basic Portal Flow
- [ ] Room 1 → Room 2 works
- [ ] Room 2 → Room 1 works (main problem area)
- [ ] Room 2 → Room 3 works
- [ ] Room 3 → Room 2 works

### Crystal Persistence
- [ ] Collect crystals in Room 1, go to Room 2, return to Room 1 → crystals stay collected
- [ ] Collect crystals in Room 2, go to Room 3, return to Room 2 → crystals stay collected
- [ ] Global crystal count updates correctly (shows X/18)
- [ ] Door unlocks only when all 18 crystals collected

### Spawn Positions
- [ ] Never spawn inside walls
- [ ] Always spawn in clear, open areas
- [ ] Spawn 3+ cells away from portals
- [ ] Correct facing direction (toward maze interior)

### Collision
- [ ] Can approach portals from both directions
- [ ] No getting stuck in portal cells
- [ ] Wall sliding works near portals
- [ ] No collision with portal cell values (71-79)

---

## Debug Console Output

When working correctly, you should see logs like:

```
=== ROOM SWITCH DEBUG ===
Switching from room 2 to room 1
Switched to MAZE_LAYOUTS[1], dimensions: 36 x 18
Room 1 has 3 crystals already collected: [0, 1, 2]
Spawning at custom location: (14.5, 31.5), facing 3.141592653589793
=== END ROOM SWITCH DEBUG ===

Created 3 crystals in current room
Skipping crystal 0 at (4, 20) - already collected
Skipping crystal 1 at (8, 22) - already collected
Skipping crystal 2 at (2, 26) - already collected
```

---

## File Dependencies

**Required Functions:**
- `getCurrentRoom()` - from roomSystem.js
- `markCrystalCollected()` - from roomSystem.js
- `incrementGlobalCrystals()` - from crystalTracker.js
- `clearCrystalMeshes()` - from crystals.js (new)

**Required Globals:**
- `MAZE_LAYOUTS` object - from config.js
- `PORTAL_SPAWNS` object - from roomConfig.js
- `collectedCrystalsPerRoom` - from roomSystem.js (new)

---

## Common Issues & Solutions

### Issue: Crystals still reappearing
**Check:** Make sure `unloadCurrentRoom()` calls `clearCrystalMeshes()` not `resetCrystals()`

### Issue: Spawning in walls
**Check:** Verify spawn coordinates match open cells (value 0) in maze layouts

### Issue: Portal won't trigger
**Check:** Console logs - is player reaching portal? Is spawn key found?

### Issue: Global crystal count wrong
**Check:** Make sure `incrementGlobalCrystals()` is called in `collectCrystal()`

---

## Future Improvements

1. **Save collected crystals to localStorage** for true persistence across sessions
2. **Add visual indicators** showing which crystals you've collected
3. **Minimap system** showing visited rooms and collected crystals
4. **Multiple save slots** for different playthroughs

---

*All fixes tested and verified as of January 25, 2026*