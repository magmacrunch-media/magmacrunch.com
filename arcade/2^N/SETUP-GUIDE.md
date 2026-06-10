# 2^N Game - Setup Guide 🔥

A lava-themed version of 2048 where tiles heat up from dark gray to white hot!

## 🚀 Quick Setup (3 Steps)

### Step 1: Set Up JSONbin (Leaderboards)

1. **Go to:** https://jsonbin.io
2. **Sign up** for free (no credit card needed)
3. **Create a new bin:**
   - Click "Create" in the top menu
   - Select "Collection" 
   - Name it: `2048-lava-scores`
   - Click "Create" (leave it empty or as `[]`)
   
4. **Get your Bin ID:**
   - After creating, you'll see your bin
   - Look for the **Bin ID** at the top (looks like: `675abc123def456789012345`)
   - **Copy this!**

5. **Get your API Key:**
   - Click "API Keys" in the top menu
   - Click "Create Access Key"
   - Name it: `2048-game`
   - Select permission: **Read & Write**
   - Click "Create"
   - **Copy the API key** (looks like: `$2a$10$...` - it's long!)
   - ⚠️ **Save this immediately** - you can't see it again!

6. **Update config.js:**
   ```javascript
   const JSONBIN_API_KEY = 'paste-your-api-key-here';
   const JSONBIN_BIN_ID = 'paste-your-bin-id-here';
   ```

### Step 2: Organize Your Files

Create this folder structure:

```
your-game-folder/
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

### Step 3: Upload & Play!

Upload all files to your web host and you're done! 🎉

---

## 🎮 Game Features

### Display
- **Title:** "2^N" (powers of two)
- **Target Display:** Shows your goal (e.g., "TARGET: 2048")
- **Score:** Real-time score tracking

### Game Modes
- **8-BIT:** Target 256
- **10-BIT:** Target 1024
- **11-BIT (Classic):** Target 2048 ⭐
- **12-BIT:** Target 4096
- **ENDLESS:** No limit! ∞

### Lava Theme 🔥
Tiles heat up as numbers increase:
- 2 → Dark gray (cooling lava)
- 4 → Brown
- 8 → Dark red
- 16 → Red
- 32 → Red-orange
- 64 → Orange
- 128 → Orange-yellow
- 256 → Yellow-orange
- 512 → Yellow
- 1024 → Pale yellow
- **2048 → WHITE HOT!** ✨

---

## 🐛 Troubleshooting

### "High scores not saving!"
✅ Check config.js has correct API key and Bin ID  
✅ Check browser console (F12) for errors  
✅ Make sure JSONbin account is active  
✅ Verify API key has Read & Write permissions

### "Target display not showing!"
✅ Check index.html has the targetDisplay div  
✅ Make sure main.js is loaded after config.js  
✅ Clear browser cache (Ctrl+Shift+R)

### "Colors look wrong!"
✅ Upload all CSS files to css/ folder  
✅ Check file paths in index.html  
✅ Clear browser cache

### "Mobile doesn't work!"
✅ Make sure responsive.css is included  
✅ Test swipe gestures  
✅ Check viewport meta tag in HTML

---

## 🎨 Customization Ideas

**Easy:**
- Change subtitle in index.html (line 31)
- Adjust glow colors in base.css
- Modify tile colors in game.css

**Medium:**
- Add sound effects (lava bubbling, crackles)
- Custom favicon (volcano icon)
- Particle effects (floating embers)

**Advanced:**
- Animated lava background
- Temperature meter instead of score
- Volcano eruption on victory

---

## 📜 Files Explained

**HTML:**
- `index.html` - Main game page, includes target display

**CSS:**
- `base.css` - Lava background, CRT effect, loading screen
- `container.css` - Header, buttons, score box (orange-red)
- `game.css` - **Tile colors!** Dark gray → white progression
- `modals.css` - Popups (difficulty selector, game over, etc.)
- `responsive.css` - Mobile support

**JavaScript:**
- `config.js` - ⚠️ **EDIT THIS!** JSONbin credentials
- `game.js` - Core 2048 logic
- `main.js` - UI controls, target display
- `scoring.js` - Leaderboard system

---

## ✅ Checklist Before Deploying

- [ ] JSONbin account created
- [ ] API key and Bin ID copied
- [ ] config.js updated with credentials
- [ ] Files organized in correct folders
- [ ] All files uploaded to web host
- [ ] Game loads without errors
- [ ] Target display shows correctly
- [ ] High scores save properly
- [ ] Mobile controls work

---

## 📝 License

Based on 2048 by Gabriele Cirulli (MIT License)  
Lava theme by [Your Name]

---

**Ready to play?** 🌋 Heat up those tiles!
