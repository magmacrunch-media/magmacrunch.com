# Crystal Mirror Maze

**A 3D first-person maze game built with Three.js featuring mirror walls, multi-room portals, and crystal collection.**

Created by: Jake McCoy  
Publisher: magmacrunch media  
Last Updated: January 22, 2026

---

## 🎮 Quick Context for Claude AI

This is a browser-based 3D maze game where players navigate through mirrored corridors across multiple interconnected rooms, collecting crystals to unlock an exit door. The game features:

- **Multi-room portal system** - 3 interconnected rooms with teleportation mechanics
- **Perfect mirror walls** - Reflective surfaces using cube mapping and environment maps
- **Crystal collection** - 18 total crystals (6 per room) that must be collected globally
- **Dynamic lighting** - Color-coded themed lighting per room (magenta/cyan, blue/teal, green/orange)
- **Victory condition** - Collect all crystals across all rooms, then escape through the door in Room 3
- **The Void** - Infinite dark space outside the maze boundaries (post-victory exploration)

---

## 🏗️ Architecture Overview

### Core Technology Stack
- **Three.js (r128)** - 3D rendering engine
- **Vanilla JavaScript** - No frameworks, modular architecture
- **WebGL** - Hardware-accelerated graphics
- **Custom shaders** - Floor fade effects and reflections

### File Structure

```
Crystal Mirror Maze/
├── index.html                 # Main HTML structure, script loading order
├── css/                       # Styling (base, UI, mobile, title screen)
├── audio/                     # Game music (OGG format)
└── js/
    ├── core/
    │   ├── config.js          # Game constants, maze layouts, player settings
    │   ├── renderer.js        # Three.js scene, camera, lighting system
    │   └── main.js            # Initialization, game loop, event handlers
    ├── player/
    │   ├── input.js           # Keyboard/mouse/touch input handling
    │   └── player.js          # Player movement, collision, camera control
    ├── world/
    │   ├── maze.js            # Wall generation, collision detection
    │   ├── void.js            # Particle effects for "The Void"
    │   └── outside.js         # Post-victory outside scene
    ├── rooms/
    │   ├── roomConfig.js      # Room definitions, portal spawn points, colors
    │   ├── portalManager.js   # Portal creation, animation, transition logic
    │   └── roomSystem.js      # Room loading/unloading, scene management
    ├── objects/
    │   ├── crystalTracker.js  # Global crystal count across all rooms
    │   ├── crystals.js        # Crystal spawning, animation, collection
    │   └── door.js            # Exit door mechanics, unlock condition, timer
    └── entities/
        └── npc.js             # Non-player character (in Room 1)
```

---

## 🎯 Game Flow

### Initialization Sequence
1. **Title Screen** → Player clicks "START"
2. **Loading** → Assets load, scene initializes
3. **Opening Message** → "THE VOID IS INFINITE" warning
4. **Game Start** → Player spawns in Room 1 at (2.5, 20.5)

### Core Game Loop
```javascript
function gameLoop() {
    updatePlayer()           // Movement, collision, camera
    updateCrystals()        // Animation, collection detection
    updateDoor()            // Lock status, interaction
    updateVoidEffects()     // Particle systems
    updateRoomPortals()     // Portal animations
    checkRoomTransition()   // Portal collision detection
    updateNPC()             // NPC behavior (Room 1 only)
    render(camera)          // Three.js rendering
}
```

### Victory Sequence
1. Collect all 18 crystals across 3 rooms
2. Exit door in Room 3 unlocks (turns golden, semi-transparent)
3. Player walks through door → Timer stops
4. Transition to "The Void" (infinite outside space)
5. Victory screen displays with completion time

---

## 🚪 Multi-Room Portal System

### Room Configuration

**Room 1: "The Crystal Mirror Maze"**
- Start position: (2.5, 20.5)
- Crystals: 6
- NPC: Yes (at 2.5, -2)
- Portal: 72 → Room 2 (south wall)
- Layout: 18×36 grid, traditional maze

**Room 2: "The Deeper Reflections"**
- Start position: (2.5, 2.5)
- Crystals: 6
- NPC: No
- Portals: 71 → Room 1 (west), 73 → Room 3 (east)
- Layout: 17×17 grid, symmetric pattern

**Room 3: "The Grid of Shadows"**
- Start position: (2.5, 16.5)
- Crystals: 6
- NPC: No
- Portal: 72 → Room 2 (west)
- Exit Door: South wall (cell value 3)
- Layout: 17×18 grid, grid-based design

### Portal Mechanics

**Portal Cell Values in Maze Layouts:**
- `71` = Portal to Room 1
- `72` = Portal to Room 2
- `73` = Portal to Room 3

**Portal Spawning:**
Portal destinations include spawn position and facing direction to ensure smooth transitions:

```javascript
PORTAL_SPAWNS = {
    "1-2": { x: 2.5, z: 14.0, facing: 0 },      // Room 1 → 2
    "2-1": { x: 14.5, z: 32.5, facing: π },     // Room 2 → 1
    "2-3": { x: 14.5, z: 14.0, facing: 0 },     // Room 2 → 3
    "3-2": { x: 2.5, z: 14.0, facing: π/2 }     // Room 3 → 2
}
```

**Transition Detection:**
- Player must be within 0.5 units of portal center
- Player must be on the "maze side" of the portal (prevents backwards entry)
- `isPlayerOnMazeSide()` checks player position relative to maze center
- Fade transition effect applied during room switch

---

## 🎨 Visual Systems

### Lighting Theme per Room

Each room has distinct color-coded lighting:

```javascript
ROOM_THEMES = {
    1: { primary: 0xff00ff, secondary: 0x00ddff, ambient: 0x1a0a2a },  // Magenta/Cyan
    2: { primary: 0x0088ff, secondary: 0x00ffaa, ambient: 0x0a1a2a },  // Blue/Teal
    3: { primary: 0x00ff66, secondary: 0xffaa00, ambient: 0x0a2a1a }   // Green/Orange
}
```

**Light Types:**
- **Primary (5)**: Hanging lamps with spotlights, volumetric cone effects
- **Secondary (6)**: Smaller lamps with softer spotlights
- **Ambient**: Very low (0.15 intensity) for dark unlit areas
- **Portal lights**: Color-coded by destination room
- **Crystal lights**: Cyan (0x00ffee) point lights
- **Door light**: Red when locked, golden when unlocked

### Mirror/Reflection System

**Environment Mapping:**
- Cube camera at maze center (64px resolution cubemap)
- Updates every 180 frames for performance
- Layer 0: Walls and lights (reflectable)
- Layer 1: Floor and skybox (non-reflectable)
- Layer 2: Physical objects like crystals, doors (non-reflectable)

**Wall Material:**
```javascript
mirrorMaterial = {
    metalness: 1.0,
    roughness: 0.0,
    envMap: cubeRenderTarget.texture,
    envMapIntensity: 2.0,
    emissive: 0x1a1a28,
    emissiveIntensity: 0.35
}
```

**Floor Shader:**
- Radial fade from maze center
- Distance-based transition to pure black (void)
- Subtle metallic reflectivity (0.25) inside maze
- Custom GLSL shader for smooth fade effects

### Performance Optimizations

1. **Light cone culling** - Volumetric cones only visible within activation distance
2. **Reduced cubemap resolution** - 64px instead of 256px
3. **Infrequent env map updates** - Every 180 frames
4. **Basic shadow mapping** - BasicShadowMap instead of PCFSoftShadowMap
5. **Selective crystal light updates** - Only half updated per frame

---

## 💎 Crystal Collection System

### Global Tracking
Crystals are tracked globally across all rooms:

```javascript
// crystalTracker.js
globalCrystalsCollected = 0
TOTAL_CRYSTALS = 18  // 6 per room × 3 rooms

incrementGlobalCrystals()      // Called when any crystal collected
hasCollectedAllCrystals()      // Returns true when all 18 collected
resetGlobalCrystalTracker()    // Resets for new game
```

### Crystal Behavior
- **Appearance**: Octahedron geometry with perfect mirror material
- **Animation**: Rotates on Y and X axes, floats up/down
- **Light**: Cyan point light (intensity 4, radius 7) with pulsing
- **Collection**: Auto-collect within 0.7 units
- **Material**: Emissive cyan (0x00ffee), metalness 1.0, roughness 0.0

### Maze Layout Cell Values
```
0 = Empty path
1 = Wall
2 = Crystal spawn point
3 = Exit door
4 = Particle swirl effect
5 = Primary colored light
6 = Secondary colored light
71-79 = Portal to room (N-70)
```

---

## 🚪 Door System

### Door States

**Locked (default):**
- Dark red color (0x884444)
- Emissive red glow (0x552222)
- Collision enabled
- Red point light above
- Pulsing glow plane (one-sided, faces into maze)

**Unlocked (all crystals collected):**
- Golden color (0xffdd88)
- Bright emissive glow (0xffaa44)
- Semi-transparent (opacity 0.4)
- Collision removed
- Warm golden point light
- Brighter pulsing effects

### Door Mechanics

**Unlock Condition:**
```javascript
if (hasCollectedAllCrystals()) {
    unlockDoor()
    // Remove collision
    // Change materials to golden
    // Increase light intensity
}
```

**Interaction:**
- Player must be within 0.5 units when unlocked
- Triggers `enterDoor()` → Stops timer, shows victory screen
- Transitions to "The Void" (outside scene)

**Timer System:**
- Starts when door first created (game start)
- Stops when player enters unlocked door
- Displays as MM:SS on victory screen
- Resets on "Play Again"

---

## 🎮 Player Controls

### Keyboard (Desktop)
- **W / Arrow Up** - Move forward
- **S / Arrow Down** - Move backward
- **A** - Strafe left
- **D** - Strafe right
- **Q / Arrow Left** - Turn left
- **E / Arrow Right** - Turn right
- **Mouse Drag** - Look around
- **?** - Help menu
- **🔊** - Mute toggle

### Mobile/Touch
- **Virtual Joystick** - Movement (left side)
- **Touch Drag** - Camera rotation (right side)
- On-screen buttons for help/mute

### Player Physics
```javascript
MOVE_SPEED = 0.1
TURN_SPEED = 0.06
COLLISION_RADIUS = 0.3
PLAYER_HEIGHT = 0.5
```

**Collision System:**
- Circular collision detection (radius 0.3)
- Wall sliding when hitting obstacles at angles
- Separate X/Z movement attempts for smooth sliding
- Smaller collision radius for portals (0.3 vs 0.5) to allow close approach

---

## 🔧 Critical Implementation Details

### Initialization Order

**CRITICAL**: Environment map must initialize BEFORE game loop starts to prevent dark wall glitch:

```javascript
function init() {
    initRenderer()
    initRoomSystem()
    createMaze()
    createCrystals()
    createDoor()
    createVoidEffects()
    createRoomPortals()
    initPlayer()
    
    initializeEnvironmentMap()  // ← MUST happen before gameLoop()
    
    gameInitialized = true
    gameLoop()
}
```

### Room Switching Process

```javascript
function performRoomSwitch(roomNumber, spawnOverride) {
    1. unloadCurrentRoom()           // Clear meshes, lights, particles
    2. Update currentRoom variable
    3. Switch MAZE_LAYOUT reference  // MAZE_LAYOUTS[roomNumber]
    4. Rebuild entire scene:
       - createMaze()
       - createCrystals()
       - createDoor()
       - createVoidEffects()
       - createRoomPortals()
       - createNPC() (if applicable)
    5. Reset player position/rotation
    6. Re-initialize environment map
    7. Set isTransitioning = false
}
```

### Memory Management

**Room Cleanup:**
- Traverse scene, remove all meshes/lights/particles
- Dispose geometries and materials
- Clear `mazeWalls[]` array
- Clear `roomPortals[]` and `portalData[]` arrays
- Reset crystal arrays
- Hide NPC dialogue if showing

**Reset on "Play Again":**
```javascript
fullGameReset() {
    resetOutside()                    // Clean up void scene
    loadRoom(1, false)                // Rebuild Room 1
    resetPlayer()                     // Position (2.5, 20.5)
    resetGlobalCrystalTracker()       // Set to 0/18
    initializeEnvironmentMap()        // Rebuild reflections
    gameMusic.currentTime = 0         // Restart music
}
```

---

## 🎨 Special Features

### "The Void"
- Infinite dark space accessible after victory
- Player can walk around outside the maze
- Particle effects and ambient darkness
- Skybox visible
- Can return to maze and re-collect crystals (though door stays open)

### NPC System
- Located in Room 1 only at position (2.5, -2)
- Dialogue system (implementation in npc.js)
- Provides hints/story elements

### Particle Swirls
- Cell value 4 in maze layouts
- Visual decoration, no gameplay function
- Adds atmosphere near portal areas

---

## 🐛 Common Issues & Solutions

### Dark Wall Glitch
**Problem**: Walls appear black instead of reflective  
**Solution**: Ensure `initializeEnvironmentMap()` called before game loop starts

### Portal Not Working
**Problem**: Portal doesn't trigger transition  
**Solution**: Check player is on correct side using `isPlayerOnMazeSide()`

### Crystals Not Counting
**Problem**: Collected crystals don't update global count  
**Solution**: Verify `incrementGlobalCrystals()` is called in `collectCrystal()`

### Door Won't Unlock
**Problem**: Door stays locked despite collecting crystals  
**Solution**: Check `hasCollectedAllCrystals()` returns true (must have all 18)

### Performance Issues
**Problem**: Low framerate  
**Solution**: Light cones only render near player, env map updates reduced to 180 frames

---

## 🚧 KNOWN ISSUES (As of January 25, 2026)

### CRITICAL: Bidirectional Portal System Not Working Properly

**Current Status**: Portal transitions work in the forward direction (Room 1 → 2 → 3) but have significant issues going backwards.

**Specific Problems:**
1. **Incorrect spawn positions when returning**: Going back from Room 2 to Room 1 spawns player in wrong location
2. **Crystal state persistence issues**: Crystals reappear when moving Room 3 → Room 2, suggesting room state isn't being properly maintained
3. **Possible collision with portal cells**: Portal cells (71-79) may still be causing collision even though `checkCollision()` was updated to exclude them

**What We Tried:**
- Updated `player.js` to exclude portal cells (71-79) from collision detection
- Simplified Room 2 and Room 3 to basic rectangular layouts for easier debugging
- Aligned all portals at column 14 for consistent flow
- Added portal cooldown (500ms) to prevent rapid re-triggering
- Increased portal detection radius from 0.5 to 0.7 units
- Made glow planes DoubleSide for bidirectional visibility
- Added extensive console logging to `portalManager.js`

**Portal Configuration (Current):**
```javascript
Room 1: Portal 72 at (14, 33) → Room 2
Room 2: Portal 71 at (14, 1)  → Room 1
Room 2: Portal 73 at (14, 13) → Room 3
Room 3: Portal 72 at (14, 1)  → Room 2
```

**Spawn Positions (Current):**
```javascript
"1-2": { x: 14.5, z: 4.5, facing: 0 }         // Room 1 → 2
"2-1": { x: 14.5, z: 30.5, facing: Math.PI }  // Room 2 → 1
"2-3": { x: 14.5, z: 4.5, facing: 0 }         // Room 2 → 3
"3-2": { x: 14.5, z: 10.5, facing: Math.PI }  // Room 3 → 2
```

**Next Steps to Debug:**
1. Check browser console logs when going through portals backwards
2. Verify spawn positions match actual open spaces in maze layouts
3. Investigate crystal system - crystals should be tracked globally and persist across room switches
4. Consider whether `resetCrystals()` in `unloadCurrentRoom()` is clearing collected crystal state
5. Test if collision is still occurring with portal cells by logging player position when stuck
6. May need to verify that `MAZE_LAYOUT` global reference is being updated correctly in `performRoomSwitch()`

**Files Modified During Debugging:**
- `player.js` - Added `checkCollision()` function to exclude portal cells
- `portalManager.js` - Improved detection, logging, cooldown system
- `roomConfig.js` - Updated spawn positions multiple times
- `config.js` - Simplified Room 2 and Room 3 layouts

**Recommendation**: 
Before continuing work on portals, add comprehensive debugging output:
- Log player position every frame when near portals
- Log exact cell values at player position
- Verify crystal collection state is preserved in global tracker
- Test spawn positions manually by setting player position in console

---

## 📝 Development Notes

### Adding New Rooms

1. **Define layout in `config.js`:**
```javascript
MAZE_LAYOUTS[4] = [ /* 2D array */ ]
```

2. **Add room config in `roomConfig.js`:**
```javascript
ROOMS[4] = {
    name: "New Room Name",
    startX: 2.5,
    startZ: 2.5,
    totalCrystals: 6,
    hasNPC: false,
    npcPosition: null
}
```

3. **Add portal spawns:**
```javascript
PORTAL_SPAWNS["3-4"] = { x: 2.5, z: 14.0, facing: 0 }
PORTAL_SPAWNS["4-3"] = { x: 14.5, z: 2.5, facing: Math.PI }
```

4. **Add portal color:**
```javascript
PORTAL_COLORS[4] = 0xffaa00  // Orange
```

5. **Add room theme in `renderer.js`:**
```javascript
ROOM_THEMES[4] = {
    primary: 0xff00aa,
    secondary: 0x00aaff,
    ambient: 0x2a0a1a
}
```

### Modifying Maze Layouts

Layouts are 2D arrays where each cell is a number:
- Keep outer border as walls (1) for proper containment
- Place exactly 6 crystals (2) per room (for now)
- Only Room 3 should have exit door (3)
- Portal values (71-79) create collision but visual portal is separate
- Lights (5, 6) should be placed in open areas for best effect

---

## 🎯 Future Enhancement Ideas

- [ ] More rooms (4, 5, 6...)
- [ ] Different maze generation algorithms
- [ ] More sophisticated puzzle mechanics beyond collecting cystals
- [ ] Enemy entities
- [ ] Power-ups (speed boost, vision enhancement)
- [ ] Leaderboard system
- [ ] Procedurally generated mazes
- [ ] Sound effects for collection, portal entry
- [ ] Minimap toggle
- [ ] Difficulty levels (different maze layouts)
- [ ] Mobile optimization (reduced graphics quality toggle)
- [ ] Implementation of slopes or stairs, multiple levels/stories

---

## 📚 Key Code References

**Most Important Files for Understanding the Game:**
1. `config.js` - All game constants and maze layouts
2. `main.js` - Initialization and game loop
3. `roomSystem.js` - Room switching logic
4. `portalManager.js` - Portal mechanics
5. `door.js` - Victory condition

**Three.js Specific:**
- Cube camera for reflections: `renderer.js` lines 46-56
- Custom floor shader: `maze.js` lines 11-65
- Layer system: 0=reflectable, 1=floor/sky, 2=physical objects

---

## 🎮 Quick Start for Development

1. Load index.html in a web browser (requires local server for audio)
2. Modify maze layouts in `config.js`
3. Test portal connections in `roomConfig.js`
4. Adjust lighting themes in `renderer.js`
5. Check console logs for room transition debugging

**Key Debug Info:**
- `console.log("=== ROOM SWITCH DEBUG ===")` in `roomSystem.js`
- Portal creation logs in `portalManager.js`
- Crystal collection updates global count
- Timer starts on door creation, ends on door entry

---

*This README serves as both documentation and a quick-start guide for Claude AI to understand the Crystal Mirror Maze codebase in new conversations.*