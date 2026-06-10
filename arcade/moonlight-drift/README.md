# Moonlight Drift (Jetman Game - Magmacrunch Edition)

## Quick Context for Claude AI

This is a browser-based remake of the classic "Jetman" game (originally by Simon Dorsey, 2007), which itself was inspired by "Helicopter" (David McCandless, 2002) and "SFCave" (Yohei Iwasaki, 1995). It's a side-scrolling obstacle avoidance game where you control a character flying through procedurally generated caves.

**Core Gameplay**: Hold spacebar/click to thrust upward, release to fall. Navigate through gaps in obstacles without hitting walls or obstacles.

**Last Updated**: February 12, 2026

---

## 🎮 Game Features

- **24 Unique Playable Characters**: Each with custom artwork, animations, and unique gameplay characteristics (different hitbox sizes, physics properties, and handling)
- **Pixel-Perfect Collision Detection**: Style-specific tapered collision that matches the visual obstacle shapes exactly (updated Feb 2026)
- **Dynamic Color Themes**: Obstacles change color palettes every 10 obstacles with procedurally generated harmonious color schemes
- **Three Visual Obstacle Styles**: Candy striped, faceted crystal, and rough crystal obstacles with unique tapered shapes
- **Persistent High Scores**: Saved to JSONBin API with player initials (top scores displayed on leaderboard)
- **Tiered Achievement System**: Color-coded rank displays (gold/silver/bronze/cyan/green) with dynamic game over borders and celebratory messages
- **Looping Background Music**: "Moonlight Drift" by C.P. Rutledge using Web Audio API for gapless playback
- **Parallax Star Field**: 15 layers of animated stars for depth
- **Milestone Markers**: Gold markers appear every 10 obstacles with complementary colors
- **SNES-Style UI**: Retro pixel aesthetic with Press Start 2P font, chunky borders, and stepped animations
- **Scrollable Credits Modal**: SNES-style scrollbar with fixed close button
- **Pixel Loading Animation**: Circular rotating pixel loader with stepped animation
- **Responsive Fullscreen Scaling**: Game scales to fill browser fullscreen while maintaining 16:9 aspect ratio with black letterboxing
- **Character Selector**: Scrollable modal interface to choose your player character
- **Custom Favicon**: Moon crescent logo in multiple sizes for browser tabs and mobile home screens

---

## 🏗️ Technical Architecture

### File Structure

```
moonlight-drift/
├── index.html                 # Main HTML file with game container
├── favicon.ico                # Browser favicon (multi-size)
├── favicon-16x16.png          # 16x16 favicon
├── favicon-32x32.png          # 32x32 favicon
├── apple-touch-icon.png       # 180x180 iOS home screen icon
├── audio/
│   └── moonlightdrift-gameloop.ogg
├── css/
│   ├── base.css              # Core styles + black letterboxing for fullscreen (updated Feb 8, 2026)
│   ├── loading.css           # SNES-style pixel loading spinner (updated Feb 2026)
│   ├── stars.css             # Parallax star layers with fullscreen clipping (updated Feb 8, 2026)
│   ├── game-container.css    # Responsive 16:9 layout with fullscreen scaling (updated Feb 8, 2026)
│   ├── overlays.css          # Game overlays (title, ready, game over + achievement borders)
│   ├── animations.css        # Keyframe animations
│   ├── scoreboard.css        # High score display
│   ├── mobile.css            # Mobile responsive styles
│   ├── character-selector.css # Character grid layout with SNES scrollbar
│   ├── credits.css           # Scrollable credits modal (updated Feb 2026)
│   ├── buttons-retro.css     # SNES-style button styling
│   ├── fonts-retro.css       # Press Start 2P pixel font
│   └── modals-retro.css      # SNES-style modal windows
└── js/
    ├── config.js             # API keys and game constants
    ├── main.js               # Game loop orchestration with responsive canvas (updated Feb 8, 2026)
    ├── player.js             # Player physics and state
    ├── obstacles.js          # Tapered collision detection (updated Feb 2026)
    ├── stars.js              # Star field parallax system
    ├── scoring.js            # Score tracking, persistence, and achievement system
    ├── renderer.js           # Canvas rendering logic
    ├── input.js              # Keyboard/mouse/touch input
    ├── character-balance.js  # Character-specific physics properties (NEW Feb 2026)
    └── characters/
        ├── index.js          # Character system core
        ├── cat-synth.js      # Individual character files
        ├── gangsta-beaver.js
        ├── vinny-bobarino.js
        ├── strawberto.js
        ├── elektra.js
        ├── mountain-gnome.js
        ├── fire-toad.js
        ├── carl.js
        ├── beava.js
        ├── ... (24 total)
        └── tardigrade.js
```

### Core Game Constants (config.js)

```javascript
const GAP = 180;                    // Gap height between obstacles
const OBSTACLE_WIDTH = 60;          // Width of obstacle pillars
const OBSTACLE_SPEED = 3;           // Horizontal scroll speed
const JSONBIN_API_KEY = '...';      // JSONBin API for high scores
const JSONBIN_BIN_ID = '...';       // Bin ID for score storage
```

### Game Loop (main.js)

The game follows a standard update/draw loop using `requestAnimationFrame`:

1. **Update Phase**: 
   - Apply gravity/thrust to player velocity
   - Update player position
   - Move obstacles left
   - Generate new obstacles every 120 frames
   - Check collisions (boundaries + obstacles)
   - Increment score when passing obstacles

2. **Draw Phase**:
   - Clear canvas
   - Render star field layers (parallax)
   - Draw obstacles with current theme colors
   - Draw player character with thrust animation
   - Draw milestone markers
   - Draw score overlay

3. **State Management**:
   - `gameRunning`: Currently playing (physics active)
   - `gameStarted`: Has started at least once (hides title)
   - `modalOpen`: Prevents rendering when modals shown

---

## 🎨 Character System

Characters are modular JavaScript files that register themselves to a global `window.characters` object.

### Character File Structure

Each character file exports a drawing function:

```javascript
function drawCharacterName(ctx, x, y, thrustActive, isGameRunning, animationTime) {
    // Drawing code using canvas context
    // animationTime used for smooth animations
}

// Register to global characters object
if (window.characters) {
    window.characters['character-id'] = {
        name: 'Display Name',
        draw: drawCharacterName
    };
}
```

### Character Drawing Guidelines

- **Position**: Draw relative to `(x, y)` coordinates
- **Size**: Approximately 40×35 pixels to match collision box
- **Thrust Effect**: Show visual feedback when `thrustActive && isGameRunning`
- **Animation**: Use `animationTime` (milliseconds) for smooth motion via `Math.sin()`, etc.
- **Canvas Operations**: Always `ctx.save()` and `ctx.restore()` if using transformations

### Example: Forester's Soul Character

This character demonstrates advanced techniques:
- **Ethereal effects**: Semi-transparent with pulsing alpha
- **Shimmer animation**: `Math.sin(animationTime / 100) * 0.5` for vibration
- **Particle systems**: Memory wisps orbiting the character
- **Environmental elements**: Snowflakes, footsteps, stars
- **Thrust visuals**: Cold wind waves and increased snow when thrusting

### Example: Carl the Pineapple

This character demonstrates continuous color animation:
- **Psychedelic color cycling**: Hue rotation based on `animationTime` for rainbow effects
- **Dynamic color palettes**: Body, leaves, and aura all shift through complementary colors
- **Clipped patterns**: Diamond grid pattern stays perfectly within character bounds using `ctx.clip()`
- **Radial gradients**: Glowing aura with pulsing size and alpha
- **Thrust visuals**: Rainbow particle orbits, energy waves, and trailing streaks

---

## ⚖️ Character Balance & Gameplay Differences

**New in February 2026**: Characters now play differently! Each character has unique physics properties that create distinct playstyles based on their hitbox size and design.

### Character Categories

#### 🟢 Agile Characters (Small Hitbox)
Characters with smaller hitboxes are harder to hit but require more precise control:
- **Tardigrade** (650px²) - Smallest hitbox! Extra agility with stronger thrust and reduced gravity
- **Prince Vince** (1,026px²) - Narrow profile with responsive controls
- **SVFP Van** (648px²) - Ultra-flat, specialized for low-flying through bottom gaps
- **Grocery Harrison** (1,050px²) - Compact with balanced handling

These characters reward skilled players with their smaller collision areas but demand precision.

#### 🟡 Balanced Characters (Standard Hitbox ~1,400px²)
Medium-sized characters with standard physics - perfect for beginners:
- **Dag Henderson**, **Gangsta Beaver**, **Juanito Thompson** (40×35)
- **Roderick Tron**, **Tollbooth Lady**, **Darius Hodgekins** (40×35)
- **Ban Daniel**, **Plantain Jane**, **Elektra**, **Carl** (38×38)
- **Vinny Bobarino**, **Backpack Man**, **Beava** (35-40×35)
- **Strawberto** (36×38) - Refined strawberry gentleman with dignified control
- **Fire Toad** (32×32) - Compact toad with explosive, fiery movement
- **Mountain Gnome** (32×32) - Transcendent meditation master with serene, floaty controls

These characters offer the most forgiving learning curve with predictable, consistent handling.

#### 🔴 Powerful Characters (Large Hitbox)
Larger characters are easier to hit but compensated with stronger physics:
- **Carl Spatski** (1,764px²) - Largest hitbox! Powerful thrust compensates
- **Forester's Soul** (1,600px²) - Higher max speed for better dodging
- **Didgeridoo Man** (1,575px²) - Very wide with powerful thrust and floaty physics
- **Cat Synth** (1,260px²) - Wide but short with stable flight

These characters let players make bigger movements to dodge obstacles despite larger collision areas.

#### 🟣 Specialist Characters (Unique Playstyle)
- **D'Spum Balloon** (1,140px²) - True balloon physics: floaty with weak thrust and low gravity
- **SVFP Van** (648px²) - Flat profile perfect for hugging the bottom

### Physics Properties

Each character has three customizable physics parameters:

1. **Thrust** (default: -0.6) - Upward acceleration strength when holding spacebar/click
2. **Gravity** (default: 0.4) - Downward acceleration when not thrusting
3. **Max Velocity** (default: 10) - Top speed limit (up or down)

Examples:
- **Tardigrade**: `thrust: -0.7, gravity: 0.35, maxVelocity: 11` (faster, more responsive)
- **Carl Spatski**: `thrust: -0.65, gravity: 0.4, maxVelocity: 10.5` (powerful thrust)
- **D'Spum Balloon**: `thrust: -0.5, gravity: 0.3, maxVelocity: 9` (floaty balloon feel)

### Balance Philosophy

The character balance system ensures all characters are viable by following a **trade-off principle**:
- Smaller hitbox = Harder to hit obstacles BUT requires more precise control
- Larger hitbox = Easier to hit obstacles BUT gets stronger/faster physics to compensate

This creates natural difficulty tiers while keeping the game fair and encouraging players to experiment with different characters!

---

## 🚧 Obstacle System

### Color Theme Generation

Obstacles use **procedurally generated color palettes** that change every 10 obstacles:

```javascript
function generateRandomTheme() {
    const baseHue = Math.floor(Math.random() * 360);
    const baseSaturation = 40 + Math.floor(Math.random() * 40);
    const baseLightness = 30 + Math.floor(Math.random() * 30);
    
    return {
        name: "Theme Name", // e.g., "Crimson Depths"
        primary: hslToHex(...),
        secondary: hslToHex(...),
        accent: hslToHex(...)
    };
}
```

### Obstacle Structure

```javascript
{
    x: number,              // Horizontal position
    topHeight: number,      // Height of top obstacle
    bottomY: number,        // Start Y of bottom obstacle
    passed: boolean,        // Has player passed this obstacle?
    theme: ThemeObject,     // Color theme snapshot
    styleIndex: number,     // Visual style (0=candy, 1=faceted, 2=rough)
    seed: number,           // Random seed for consistent variations
    milestone?: number      // Every 10th obstacle gets milestone marker
}
```

### Collision Detection (Updated Feb 2026)

The game uses **style-specific tapered collision detection** that matches the exact visual shape of each obstacle:

**Three Collision Functions:**
1. **Candy Striped** - Tapers from 60px → 22px near gaps
2. **Faceted Crystal** - Tapers from 60px → 24px with angular wobble
3. **Rough Crystal** - Tapers from 60px → 20px with roughness variation

**How It Works:**
- Each obstacle stores its `styleIndex` when created
- Collision calculates the actual width at the player's Y position
- Includes wobble/roughness offsets that match the visual rendering
- Flame area (bottom 15px of player hitbox) excluded from top collisions (allows landing on obstacles)

**Example:**
```javascript
// Player near obstacle gap (progress = 0.9)
const actualWidth = Math.max(22, 60 * (1 - 0.9 * 0.65));
// actualWidth = 24.9 pixels (not 60!)
// Collision only triggers if player intersects this narrow width
```

This creates **pixel-perfect collision** that feels fair and matches what players see visually.

### Milestone Markers

Every 10th obstacle displays:
- Gold dashed vertical line
- Large centered number in the gap
- Golden star icon above the number

---

## 🎯 Player Physics

```javascript
const player = {
    x: 80,              // Fixed horizontal position
    y: 300,             // Vertical position (changes)
    width: 40,          // Collision box width
    height: 35,         // Collision box height
    velocity: 0,        // Current vertical velocity
    thrust: -0.6,       // Upward acceleration when thrusting
    gravity: 0.4,       // Downward acceleration
    maxVelocity: 10     // Terminal velocity (up or down)
};
```

**Physics Loop**:
```javascript
if (thrustActive) {
    player.velocity += player.thrust;  // Apply upward force
} else {
    player.velocity += player.gravity;  // Apply gravity
}
player.velocity = clamp(player.velocity, -maxVelocity, maxVelocity);
player.y += player.velocity;
```

---

## 💾 Score Persistence & Achievement System

High scores are saved to **JSONBin.io** API:

```javascript
// Score structure
{
    scores: [
        { initials: "ABC", score: 123 },
        { initials: "XYZ", score: 98 },
        // ... top 10 scores
    ]
}
```

### High Score Flow

**For High Scores (Top 10):**
1. Player dies → Achievement prompt appears immediately
2. System calculates rank by counting how many scores beat yours
3. Displays tiered achievement message:
   - 🥇 **Rank #1**: "★ ALL TIME HIGH SCORE! ★" (Gold)
   - 🥈 **Rank #2**: "★ 2ND PLACE! ★" (Silver)
   - 🥉 **Rank #3**: "★ 3RD PLACE! ★" (Bronze)
   - 💠 **Ranks #4-5**: "HIGH SCORE! rank #X" (Cyan)
   - 💚 **Ranks #6-10**: "HIGH SCORE! rank #X" (Green)
4. Player enters 3-character initials
5. Submit to JSONBin API (PUT request)
6. Game over screen appears with colored border and achievement banner
7. Press space to restart

**For Non-High Scores:**
1. Player dies → Game over screen appears immediately (red border)
2. Press space to restart

### Rank Calculation

Rank is calculated by counting existing scores that beat (are greater than) the current score:

```javascript
let rank = 1;
for (let i = 0; i < sessionScores.length; i++) {
    if (sessionScores[i].score > currentScore) {
        rank++;
    }
}
```

This handles ties correctly: a score of 10 when another score of 10 exists will both be rank #2 (if one score beats them).

### Visual Achievement Indicators

- **Game Over Border Color**: Changes based on achievement level (gold/silver/bronze/cyan/green vs default red)
- **Achievement Banner**: Appears between "GAME OVER!" and score display for high scores
- **Glowing Effects**: Text shadows and box shadows match achievement tier
- **Pulse Animation**: Only for #1 all-time high score

---

## 🎵 Audio System

Uses **Web Audio API** for gapless music looping:

```javascript
sourceNode.buffer = audioBuffer;
sourceNode.loop = true;  // Perfect gapless loop
sourceNode.start(0);
```

- Audio file: `audio/moonlightdrift-gameloop.ogg`
- Starts on first game interaction (browser autoplay policies)
- Mute button toggles gain node volume (0 or 0.3)

---

## 📱 Input Handling

Supports multiple input methods:
- **Keyboard**: Spacebar
- **Mouse**: Click on canvas

All inputs set `thrustActive` flag that's read by physics update.

---

## 🌟 Star Field System

15 parallax layers create depth illusion:
- Each layer contains ASCII art stars (`, *, o, +, |, -, etc.)
- Layers scroll at different speeds (faster = closer)
- Stars positioned using pre-generated `STAR_CONTENT` string from config.js
- Layers rendered as absolutely positioned `<div>` elements with CSS animations

---

## 🎨 Visual Design Notes

- **Font**: Press Start 2P (pixel font from Google Fonts) for UI, monospace for ASCII art
- **Color Scheme**: SNES-inspired with dark space theme (#0f0f1e background)
- **ASCII Art**: Large "JETMAN" title on loading and title screens
- **Responsive Canvas**: Maintains 16:9 aspect ratio (1280×720 base)
- **Loading Screen**: Fade-out transition after assets load

---

## 🎮 SNES Retro Styling System

The game features authentic SNES-era visual design with modern functionality:

### Typography
- **Primary Font**: Press Start 2P (authentic 8-bit pixel font from Google Fonts)
- **All text lowercase** for retro authenticity  
- **No bold/italic** (pixel fonts don't support variants)
- **Increased line-height** for readability (1.6-1.8)
- **Zero letter-spacing** (pixel fonts have built-in spacing)

### Button Design (Updated Feb 7, 2026)
All buttons use chunky SNES-style 3D borders created with `box-shadow`:
- **Main Controls** (change character, high scores, credits, mute): Blue-gray (#5a6988)
- **Close/Confirm**: Green (#2ecc71)  
- **Submit**: Gold/yellow (#ffc107)
- **Hover**: Cyan highlight (#00d4ff) with black text
- **Active**: 4px downward translation for pressed effect

Note: Credits button now matches other main control buttons (blue-gray) instead of purple, and is displayed in the main button row for better accessibility.

### Modal Windows  
- **Sharp corners** (no border-radius)
- **Layered box-shadow borders** (4-5 nested shadows)
- **SNES blue-gray palette**: #3a4466 (main), #2a3a5a (inner), #4a5a7a (borders)
- **Gold accents** (#ffd700) for headings and important text
- **No smooth transitions** - instant state changes for retro feel

### Character Selector Modal
- **Mute button** available during character selection (before gameplay starts)
- **Matches styling** of close button (same size, font, borders)
- **Side-by-side layout** for mute and close buttons
- **Mobile optimized**: Grid adjusts from 5 columns → 3 columns → 2 columns based on screen size

### Color Palette
```css
Background:  #3a4466  /* Main window */
Dark:        #2a3a5a  /* Inner elements */
Medium:      #4a5a7a  /* Borders */
Light:       #6a7a9a  /* Outer borders */
Accent:      #ffd700  /* Gold for emphasis */
Success:     #2ecc71  /* Green for selected/confirm */
Primary:     #5a6988  /* Blue-gray for controls */
Danger:      #ff0000  /* Red for game over */
```

### Game Container
- **Modern rounded corners** (10px border-radius) - intentionally NOT SNES style
- **Semi-transparent background** - contrasts with sharp modal windows  
- **Houses the gameplay canvas** - separates retro UI from modern container

---

## 🔧 Common Development Tasks

### Adding a New Character

1. Create `js/characters/character-name.js`
2. Implement `drawCharacterName(ctx, x, y, thrustActive, isGameRunning, animationTime)` 
3. Define hitbox in character registration: `hitbox: { width: 40, height: 35, offsetX: 0, offsetY: 0 }`
4. Register: `window.characters['character-id'] = { name: '...', draw: drawCharacterName, hitbox: {...} }`
5. Add script tag to `index.html` in characters section
6. **(Optional)** Add character physics to `character-balance.js` for unique gameplay
7. Character appears automatically in selector modal

### Adjusting Character Balance

In `js/character-balance.js`:
- Add entry for your character with custom physics values
- **thrust**: More negative = stronger upward force (default: -0.6)
- **gravity**: Higher = falls faster (default: 0.4)  
- **maxVelocity**: Higher = can move faster (default: 10)
- Test and iterate based on hitbox size for fair gameplay

### Adjusting Difficulty

In `config.js`:
- **GAP**: Smaller = harder (try 150 for expert mode)
- **OBSTACLE_SPEED**: Faster = harder (try 4-5)
- **Player gravity/thrust** in `player.js`: Adjust responsiveness

### Changing Music

Replace `audio/moonlightdrift-gameloop.ogg` with new file (must be loopable/seamless)

### Modifying Color Themes

Edit `generateRandomTheme()` in `obstacles.js`:
- Adjust hue ranges for different color families
- Modify saturation/lightness for mood
- Change `THEME_CHANGE_INTERVAL` for frequency

---

## 🐛 Known Quirks & Recent Fixes

- Modal rendering pauses game canvas to prevent visual conflicts
- Audio autoplay requires user interaction (browser security)
- Canvas scaling uses fixed aspect ratio (may letterbox on extreme screens)

**Recent Updates (Feb 12, 2026)**:
- ✅ **NEW: 5 Additional Characters Added** - Expanded roster from 19 to 24 playable characters
- ✅ **Strawberto** - Sophisticated strawberry gentleman with monocle and straw hat
- ✅ **Elektra** - Cool poetry chick orange with beatnik vibes and round sunglasses
- ✅ **Mountain Gnome** - Transcendental meditation master with cosmic energy effects
- ✅ **Fire Toad** - Fire-bellied toad with dramatic fire-breathing thrust effects
- ✅ **Carl** - Psychedelic pineapple with continuous rainbow color cycling
- ✅ **Beava** - Cartoon beaver with tranquilizer dart gun (Dodgeball reference)
- ✅ Updated character-balance.js with physics properties for all new characters

**Previous Updates (Feb 8, 2026)**:
- ✅ **NEW: Character Balance System** - Each character now has unique physics properties based on hitbox size
- ✅ Characters play differently with custom thrust, gravity, and max velocity values
- ✅ Smaller hitbox characters get more agile physics, larger characters get powerful thrust
- ✅ Added unique character playstyles across 4 categories (Agile, Balanced, Powerful, Specialist)
- ✅ **NEW: Responsive Fullscreen Scaling** - Game now scales properly in fullscreen mode (e.g., itch.io)
- ✅ Maintains 16:9 aspect ratio with black letterboxing on ultra-wide displays
- ✅ Background gradient and stars properly clipped to game area
- ✅ Removed fullscreen button (not needed for itch.io deployment)
- ✅ Disabled mobile compatibility features for desktop-focused experience

**Previous Updates (Feb 7, 2026)**:
- ✅ Moved credits button from scoreboard modal to main button row
- ✅ Updated credits button styling to match other main controls (blue instead of purple)

**Previous Fixes (Jan 31, 2026)**:
- Fixed duplicate high score submission when pressing Enter (was creating two entries)

---

## 📝 Credits

- **Game Design & Development**: Jake McCoy
- **Music**: "Moonlight Drift" by C.P. Rutledge
- **Technology & Resources**:
  - Press Start 2P font by CodeMan38 (Google Fonts)
  - HTML5 Canvas API
  - Web Audio API (gapless music looping)
  - JSONBin.io (high score persistence)
  - Pure vanilla JavaScript (no frameworks!)
- **Original Concept**: 
  - "Jetman" by Simon Dorsey (2007, Facebook)
  - "Helicopter" by David McCandless (2002, Flash)
  - "SFCave" by Yohei Iwasaki (1995)

---

## 🚀 Quick Start for Development

1. Serve files via local web server (file:// won't work due to CORS)
2. Open `index.html` in browser
3. Check console for audio loading status
4. Press spacebar to start game
5. Edit character files and refresh to see changes

**No build process required** - pure vanilla JavaScript and HTML5 Canvas!

---

## 💡 Architecture Philosophy

This codebase follows **modular JavaScript** patterns:
- Each module has single responsibility
- Global state minimized (mainly `player` and `obstacles` arrays)
- Characters self-register to avoid tight coupling
- Canvas rendering separated from game logic
- Input handling abstracted for multi-platform support

Perfect for teaching game development fundamentals or extending with new features!
