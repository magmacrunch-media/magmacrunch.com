# 2^N - Powers of Two 🔥

**Version 1.1** - February 2026

A **Texas Toast Magma Crunch**-themed sliding puzzle game where tiles charge up from deep blue through blazing magenta and searing yellow to brilliant white as you combine powers of two — straight from the volcano to your bowl!

## 🎮 About The Game

**2^N** is a variant of the classic 2048 game with a volcanic twist. Watch your tiles transform from dark, cooling lava to brilliant white-hot plasma as the numbers increase. Choose from 16 different difficulty levels - from easy 2-bit mode (target: 4) all the way to insane 16-bit mode (target: 65536)!

## ✨ Recent Updates (v1.1)

- ✅ Fixed duplicate high score entry bug
- ✅ Fixed win condition detection for all difficulty modes
- ✅ Consistent lava theme across all modals and menus
- ✅ Improved event listener management
- ✅ Better submission handling with duplicate prevention
- ✅ Cleaned up console output for better performance

### The Magma Crunch Color Progression 🫐🌋
- **2** → Dim navy (deep in the bowl)
- **4** → Medium blue (warming up)
- **8** → Bright blue (**#14B8FF** — electric berry)
- **16** → Deep magenta-purple (things are heating up)
- **32** → True magenta (berry glow)
- **64** → Full hot magenta (**#F23C8F** — the crunch!)
- **128** → Amber gold (volcano rising)
- **256** → Bright yellow (**#FFD54A** — scorching)
- **512** → Blazing yellow (white-hot cereal)
- **1024** → White with yellow tinge (almost there...)
- **2048** → **Pure white** (victory! 🎉)
- **4096+** → Plasma state — all three brand colors cycling!

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Set Up JSONbin (Leaderboards)

Your game needs a cloud database for high scores:

1. **Go to:** https://jsonbin.io
2. **Sign up** for free (no credit card)
3. **Create a new bin:**
   - Click "Create" → "Collection"
   - Name: `2n-scores`
   - Leave empty or as `[]`

4. **Get your Bin ID:**
   - After creating, copy the **Bin ID** (e.g., `675abc123...`)

5. **Get your API Key:**
   - Click "API Keys" → "Create Access Key"
   - Name: `2n-game`
   - Permission: **Read & Write**
   - **Save this immediately** - you can't see it again!

6. **Update config.js:**
   ```javascript
   const JSONBIN_API_KEY = 'paste-your-api-key-here';
   const JSONBIN_BIN_ID = 'paste-your-bin-id-here';
   ```

### Step 2: Organize Files

```
2n-game/
├── index.html
├── css/
│   ├── base.css
│   ├── container.css
│   ├── game.css
│   ├── modals.css
│   └── responsive.css
└── js/
    ├── config.js  ⚠️ EDIT THIS FIRST!
    ├── game.js
    ├── main.js
    └── scoring.js
```

### Step 3: Upload & Play! 🎉

Upload all files to your web host and you're done!

---

## 🎯 Game Features

### 16 Difficulty Modes

Choose from a dropdown menu with options ranging from joke mode to insane difficulty - now including 2-BIT (target: 4) and 3-BIT (target: 8) modes for absolute beginners or a quick laugh!

| Mode | Target | Difficulty | Est. Time |
|------|--------|------------|-----------|
| 2-BIT | 4 | Joke Mode | 30 sec |
| 3-BIT | 8 | Tutorial | 1 min |
| 4-BIT | 16 | Tutorial | 1-2 min |
| 5-BIT | 32 | Very Easy | 2-3 min |
| 6-BIT | 64 | Easy | 3-5 min |
| 7-BIT | 128 | Easy-Medium | 4-6 min |
| 8-BIT | 256 | Medium | 5-8 min |
| 9-BIT | 512 | Medium | 6-10 min |
| 10-BIT | 1024 | Medium-Hard | 8-12 min |
| **11-BIT** | **2048** | **Classic** | **10-15 min** ⭐ |
| 12-BIT | 4096 | Hard | 12-18 min |
| 13-BIT | 8192 | Very Hard | 15-25 min |
| 14-BIT | 16384 | Expert | 20-30 min |
| 15-BIT | 32768 | Master | 25-40 min |
| 16-BIT | 65536 | Insane | 30-50 min |
| ∞ ENDLESS | No limit | Ultimate | Until death |

### Dynamic Display
- **Title shows N:** Playing 8-bit? Title shows "2^8"
- **Target display:** Always shows your goal (e.g., "TARGET: 256")
- **Real-time score:** Track your progress
- **Lava theme:** Dark volcanic aesthetic throughout
- **Quick access menu:** "How to Play," "High Scores," and "Credits" buttons available directly in the difficulty selector - no need to start a game to access these features!

### Controls
- **Arrow keys:** ↑ ↓ ← → to move tiles
- **Swipe:** Touch/trackpad gestures on mobile
- **Space:** Start from title screen
- **Dropdown menus:** Click to open, scroll to view all options (works on mobile with touch scrolling)

### Leaderboards
- **Separate boards** for each difficulty (all 16 modes!)
- **Top 10** scores per mode
- **Dropdown selector** to switch between modes (2-BIT through ENDLESS)
- **Cloud sync** via JSONbin

---

## 🎨 Theme & Design

### Retro Lava Aesthetic
- **Dark volcanic background** with animated red-orange glow
- **CRT scanline effect** for that retro feel
- **Pixel-perfect fonts** (Press Start 2P)
- **Glowing borders** on buttons and modals
- **Smooth animations** with CSS transitions

### Color Palette
- Background: Deep blacks and dark reds (#0a0000, #1a0a0a)
- Primary: Orange-red (#ff4500, #ff8c00)
- Accent: Orange-yellow (#ffa500)
- Text: White, orange, yellow gradients
- Glow: Pulsing red-orange effects

---

## 📁 File Structure Explained

### HTML
- **index.html** - Main game page with title screen, difficulty selector, game board, and modals

### CSS (in `/css/`)
- **base.css** - Lava background, CRT effect, loading screen
- **container.css** - Header, buttons, score display (all lava-themed)
- **game.css** - ⭐ **Tile colors!** Dark → Red → Orange → Yellow → White
- **modals.css** - Popups (title screen, difficulty, game over, high scores)
- **responsive.css** - Mobile support and touch controls

### JavaScript (in `/js/`)
- **config.js** - ⚠️ **EDIT THIS!** Your JSONbin credentials
- **game.js** - Core 2048 logic (merging, movement, game over)
- **main.js** - UI controls (dropdowns, modals, target display)
- **scoring.js** - Leaderboard system (save/load from cloud)

---

## 📋 Version History

### v1.1 (February 2026) - Bug Fix Release ✅
**All critical bugs resolved!**

**Fixed Issues:**
- **Duplicate High Score Entries:** Resolved event listener accumulation that caused multiple score submissions
- **Win Conditions Not Triggering:** Fixed detection for all 16 difficulty modes (especially low-bit modes)
- **Purple Theme Persisting:** Converted all modals to consistent lava theme (orange/red/yellow)
- **Initials Showing "AAA":** Fixed input capture to properly record user initials

**Improvements:**
- Event listeners now properly managed to prevent duplicates
- Removed debug console logging for better performance
- Enhanced submission protection with 1-second cooldown
- Cleaner, more efficient code throughout

### v1.0 (February 2026) - Initial Release
- 16 difficulty modes (2-BIT through ENDLESS)
- Lava-themed color progression
- JSONbin cloud leaderboards
- Mobile responsive design
- Touch controls and swipe gestures

---

## 🐛 Troubleshooting

### "High scores not saving!"
- ✅ Check `config.js` has correct API key and Bin ID
- ✅ Open browser console (F12) for errors
- ✅ Verify JSONbin account is active
- ✅ API key needs **Read & Write** permissions

### "Target display not showing!"
- ✅ Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- ✅ Check `index.html` has `<div id="targetDisplay">`
- ✅ Verify `main.js` is loading after `config.js`

### "Title shows 2^N instead of 2^11"
- ✅ Select a difficulty mode first
- ✅ Click "START GAME" button
- ✅ Title updates when game starts

### "Dropdown not working"
- ✅ Make sure `modals.css` is loaded
- ✅ Check browser console for JavaScript errors
- ✅ Try clicking directly on the dropdown (not outside it)

### "Colors look wrong"
- ✅ Upload all CSS files to `/css/` folder
- ✅ Check file paths in `index.html`
- ✅ Clear browser cache completely

### "Mobile doesn't work"
- ✅ Include `responsive.css`
- ✅ Test swipe gestures (not just taps)
- ✅ Check viewport meta tag in HTML

---

## 🎯 How to Play

### Goal
Combine tiles with the same number to create larger powers of two. Reach your target to win!

### Rules
1. Use **arrow keys** or **swipe** to move all tiles in a direction
2. When two tiles with the **same number** touch, they **merge into one**
3. The merged tile shows the **sum** (2 + 2 = 4, 4 + 4 = 8, etc.)
4. After each move, a new **2** or **4** appears randomly
5. Game ends when the board fills up with no valid moves
6. Reach your **target** before running out of moves to win!

### Strategy Tips
- **Keep your highest tile in a corner** (usually bottom-right)
- **Build in one direction** - don't scatter large tiles
- **Plan 2-3 moves ahead** before committing
- **Don't panic!** Slow and steady wins
- **Try easier modes first** to learn the mechanics

---

## ✨ Customization Ideas

### Easy Changes
- Edit title/subtitle in `index.html`
- Adjust glow intensity in `base.css`
- Change tile colors in `game.css`
- Modify credits in the Credits modal

### Medium Changes
- Add sound effects (lava bubbling, rumbling)
- Create custom favicon (volcano icon)
- Add particle effects (floating embers)
- Create more difficulty levels (add to dropdown)

### Advanced
- Animated lava background
- Temperature meter instead of score
- Volcano eruption animation on victory
- Multiplayer mode with separate boards

---

## 🆕 Adding More Difficulties

Want to add 17-BIT mode or custom targets? Easy! The game now supports 16 difficulty levels (2-BIT through 16-BIT plus ENDLESS).

To add more:

1. **In index.html**, add to the dropdown:
```html
<div class="dropdown-option-diff" data-difficulty="20" data-target="1048576">
    <span class="option-label-diff">20-BIT MODE</span>
    <span class="option-target-diff">2^20 = 1048576</span>
</div>
```

2. **In index.html**, add to high scores dropdown:
```html
<div class="dropdown-option" data-difficulty="20">
    <span class="option-label">20-BIT MODE</span>
    <span class="option-target">Target: 1048576</span>
</div>
```

That's it! The dropdown handles the rest automatically.

---

## 🏆 Leaderboard System

### How It Works
- **Cloud storage** via JSONbin.io
- **10 high scores** per difficulty mode
- **Automatic sorting** by score (highest first)
- **Initials entry** for top scores
- **Persistent** across devices and browsers

### Score Display
Shows: Rank | Initials | Score
- 🥇 #1 ABC 12,345 pts
- 🥈 #2 XYZ 10,234 pts
- 🥉 #3 DEF 8,901 pts

---

## 📜 Credits & License

### Game Concept
- Original 2048 by **Gabriele Cirulli** (MIT License)
- Lava theme and 2^N variant by **[Your Name]**

### Resources
- **Font:** Press Start 2P by CodeMan38
- **Storage:** JSONbin.io cloud database
- **Inspiration:** Retro gaming aesthetics & volcanic heat progression

### License
This is a derivative work based on 2048, which is licensed under the MIT License. Feel free to modify and share!

---

## ✅ Pre-Launch Checklist

Before deploying your game:

- [ ] JSONbin account created
- [ ] API key and Bin ID copied
- [ ] `config.js` updated with credentials
- [ ] Files organized in correct folders
- [ ] All files uploaded to web host
- [ ] Game loads without errors
- [ ] Title shows correct N value (e.g., 2^11)
- [ ] Target display works
- [ ] Dropdown opens and closes properly
- [ ] High scores save and load
- [ ] Mobile controls work (test on phone)
- [ ] All difficulty modes work
- [ ] Credits updated with your name

---

## 🎮 Ready to Play!

Upload your files, configure JSONbin, and watch those tiles heat up from gray to white! 

**New in this version:**
- 🎯 16 difficulty modes (including joke-mode 2-BIT!)
- 📱 Improved mobile dropdown scrolling
- 🎮 Quick access menu buttons in difficulty selector
- 🔥 Smooth modal transitions
- 📊 Complete high scores tracking for all modes

**From cooling lava to blazing plasma - can you reach 2^N?** 🌋🔥

---

**Questions? Issues? Suggestions?**  
Check the troubleshooting section above or inspect browser console (F12) for errors.

**Have fun, and may your tiles always merge!** ✨
