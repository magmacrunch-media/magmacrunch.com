# Complete Fix Guide

## Root Causes Identified:

1. **Portal rotation logic was inverted** - checking wrong walls
2. **Light cones on wrong layer** - Layer 1 causes WebGL feedback loop with cubemap
3. **Room number not passed to createRoomPortals()** - causes "undefined" in console

---

## Fix 1: Portal Rotation (portalManager.js)

**Problem:** The rotation logic was checking for east/west walls but should check north/south walls.

**In portalManager.js, lines ~35-46, change:**

```javascript
// OLD - WRONG
if (hasWallEast || hasWallWest) {
    rotation = Math.PI / 2;
} else {
    rotation = 0;
}

// NEW - CORRECT
if (hasWallNorth || hasWallSouth) {
    rotation = Math.PI / 2; // Rotate 90° to face east-west
} else {
    rotation = 0; // Faces north-south (default)
}
```

**Why:** If walls are on NORTH/SOUTH, the portal is in a horizontal wall and should face east-west (perpendicular).

---

## Fix 2: Light Cone Layer (renderer.js)

**Problem:** Light cones on layer 1 interfere with cubemap rendering, causing WebGL errors.

**In renderer.js, in the `createLightCone()` function, change ALL 3 instances:**

```javascript
// OLD - causes WebGL feedback loop
outerCone.layers.set(1);
midCone.layers.set(1);
innerCone.layers.set(1);

// NEW - fixes WebGL errors
outerCone.layers.set(2);
midCone.layers.set(2);
innerCone.layers.set(2);
```

**Lines to change:** ~245, ~260, ~275 (wherever `cone.layers.set(1)` appears)

**Why:** Layer 1 is seen by the camera but not the cubemap. Layer 2 is seen by both. The feedback loop happened because layer 1 objects were being rendered while the cubemap was updating.

---

## Fix 3: Pass Room Number (main.js)

**Problem:** `createRoomPortals(scene)` doesn't pass room number, so it shows "undefined".

**In main.js, line ~32, change:**

```javascript
// OLD
createRoomPortals(scene);

// NEW
createRoomPortals(scene, 1); // Room 1 on game start
```

**Why:** The function needs to know which room to create portals for.

---

## Fix 4: Wider Portal Doors (portalManager.js)

**In createPortalVisuals(), change the geometry sizes:**

```javascript
// Frame: 0.9 units wide (fills most of cell)
const frameGeometry = new THREE.BoxGeometry(0.9, 2.4, 0.15);

// Door: 0.8 units wide
const portalGeometry = new THREE.BoxGeometry(0.8, 2.2, 0.1);

// Glow: 0.85 units wide
const glowGeometry = new THREE.PlaneGeometry(0.85, 2.3);
```

**Why:** Makes portals fill almost the entire grid cell visually, harder to sneak around.

---

## Testing Checklist:

After making these changes:

1. **Check console on load:**
   ```
   Created 2 light cone groups
   === CREATING PORTALS FOR ROOM 1 ===  (should say 1, not undefined)
   Rotation: 1.57..., Walls: N=false S=true...  (should detect walls)
   ```

2. **Check for WebGL errors:**
   - Should see NO "GL_INVALID_OPERATION" errors
   - Should see NO "Feedback loop" errors

3. **Walk toward light (value 5 or 6 in maze):**
   - Volumetric light cones should appear when close
   - Should work in all 3 rooms

4. **Portal appearance:**
   - Should fill most of the grid cell
   - Should be rotated correctly (same as exit door in Room 3)

5. **Go Room 1 → 2 → 1:**
   - Check console for: `"Clearing X light cone groups"`
   - Check console for: `"Created X light cone groups"` 
   - Light cones should work when you return to Room 1

---

## Quick Reference: Which Files to Edit

1. **portalManager.js** - Fix rotation logic, wider doors
2. **renderer.js** - Change light cones to layer 2
3. **main.js** - Pass room number (1) to createRoomPortals

---

## If Issues Persist:

1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Check browser console for any other errors
4. Share console output when entering Room 2