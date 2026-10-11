The jukebox and theme management tools are now part of the **MAGMA//OPS PWA** at `arcade/admin/static/`. The old standalone `jukebox-manager.html` and `theme-manager.html` files have been replaced by integrated dashboard tabs.

## MAGMA//OPS Dashboard

The admin dashboard (`arcade/admin/server.py` on port 8780) includes all management tools as tabs:

| Tab | URL | Description |
|-----|-----|-------------|
| Jukebox | `http://localhost:8780/#jukebox` | Manage jukebox track list |
| Themes | `http://localhost:8780/#themes` | Browse and edit CSS themes |

## Jukebox Manager

A drag-and-drop interface for managing `music/jukebox/songs.json`.

### Features

- **Drag-and-drop reordering** — grab handle to reorder tracks
- **Inline editing** — click title, artist, or duration fields to edit
- **Visibility toggle** — hide/show tracks (eye icon)
- **Delete** — remove tracks with confirmation modal
- **Add song** — append new blank track
- **Import JSON** — load a `songs.json` file
- **Export options**:
  - Download `songs.json`
  - Copy `TRACKS JS` (for `jukebox.js` — includes full file paths)
  - Copy `JUKEBOX_SONGS JS` (for full jukebox page — relative paths)
- **Reset** — restore default track list

### UI

- Purple header with glitch animation
- Song cards in a grid: `# | drag handle | title | artist | duration | visibility | delete`
- Hidden tracks shown at 40% opacity
- Toast notifications for actions
- Confirmation modal for destructive actions

### Export Formats

**TRACKS JS** (for `assets/jukebox.js`):

```js
const TRACKS = [
    { title: "Song Title", artist: "Artist", file: "music/jukebox/songs/filename.ogg", duration: "4:51" },
];
```

**JUKEBOX_SONGS JS** (for `music/jukebox/index.html`):

```js
const JUKEBOX_SONGS = [
    { title: "Song Title", artist: "Artist", file: "filename.ogg", duration: "4:51" },
];
```

### Usage

1. Open MAGMA//OPS at `http://<pi-ip>:8780`
2. Navigate to the Jukebox or Themes tab
3. Make changes (reorder, edit, add, remove)
4. Changes are saved directly to the JSON files

## Theme Manager

A comprehensive catalog and editor for all CSS themes used across the site.

### Features

- **Theme grid** — all themes displayed as cards with color swatches
- **Search/filter** — search by name, filter by section
- **Live preview** — click a theme to see its colors
- **Edit panel** — slide-out panel for editing theme colors
- **Color editing** — color pickers + hex input for each variable
- **Nav preview** — shows nav accent, glow, brand colors
- **Export options**:
  - Copy all CSS
  - Export as JSON
  - Copy individual theme CSS

### Theme Card

Each card shows:
- Theme name
- Section badge (arcade, archive, visual, etc.)
- Color swatches (body colors)
- Nav preview (accent, glow, brand)

### Filter Bar

Filter by section: All, Arcade, Archive, Visual, Press, Music, Other

### Edit Panel

Slide-out panel with:
- Theme name and section metadata
- Color pickers for each CSS variable
- Hex input for precise values
- Live preview of changes

### Storage

Themes are stored as inline `<style>` blocks in individual page HTML files. The Theme Manager reads and writes these patterns.

## Desktop Shortcuts

On the Raspberry Pi, the dashboard has desktop shortcuts:

| Shortcut | URL | Description |
|----------|-----|-------------|
| MagmaCrunch Ops | `http://localhost:8780` | Main dashboard |
| Jukebox Manager | `http://localhost:8780/#jukebox` | Jukebox tab |
| Theme Manager | `http://localhost:8780/#themes` | Themes tab |

## Server Integration

All tools are served by the admin dashboard server (`arcade/admin/server.py` on port 8780). Access via:

1. **Dashboard** — `http://<pi-ip>:8780` with tab navigation
2. **Direct tab** — `http://<pi-ip>:8780/#jukebox` or `http://<pi-ip>:8780/#themes`

## Styling

Both tools share a consistent CRT aesthetic:
- Purple header with glitch text animation
- Dark background with scanline texture
- Neon-colored buttons (cyan, rose, green, yellow, purple)
- Press Start 2P font for headings, Courier Prime for content 
