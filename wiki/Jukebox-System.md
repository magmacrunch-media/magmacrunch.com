A retro vinyl-themed mini-player that lives in the bottom-left corner of every page. Persists playback state across SPA navigations and full page loads.

## Architecture

```
Every page (nav.js) ──load──▶ assets/jukebox.js ──Audio API──▶ .ogg files
                                     │
                                     ├── localStorage (mc-jukebox)
                                     │     track, time, playing, volume, muted
                                     │
                                     └── localStorage (mcj_expanded)
                                           expand/collapse preference
```

## Files

| File | Purpose |
|------|---------|
| `assets/jukebox.js` | Widget logic (428 lines) — IIFE, self-contained |
| `assets/jukebox.css` | Widget styles — fixed positioning, vinyl spin animation |
| `music/jukebox/app.js` | Full jukebox page logic — fetches songs.json |
| `music/jukebox/styles.css` | Full jukebox page styles |
| `music/jukebox/songs.json` | Track metadata (title, artist, file, duration, hidden) |
| `music/jukebox/songs/*.ogg` | Audio files (OGG format) |

## How It Works

1. `nav.js` injects `jukebox.css` and `jukebox.js` on every page with a `<nav>` element
2. `jukebox.js` builds the widget DOM and appends it to `<body>`
3. On load, restores playback state from localStorage (track, position, volume)
4. Registers a `window.__pageCleanup` callback so the SPA router can pause audio before navigation
5. After SPA navigation, the router calls `window.__initJukeboxPlayer()` to re-inject the widget if missing

## Widget States

**Minimized** (default): 48×48px floating button with animated vinyl disc

**Expanded**: 300px wide panel with:
- Spinning vinyl animation (CSS `mcj-spin` keyframes)
- Track title (yellow) and artist name (cyan)
- Progress bar with seek-on-click
- Transport controls (prev, play/pause, next)
- Volume slider + mute button
- "OPEN JUKEBOX →" link to full jukebox page

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Toggle play/pause |
| `←` / `→` | Previous / next track |
| `↑` / `↓` | Volume up / down (5% increments) |
| `M` | Toggle mute |

Shortcuts are disabled when focus is in an `<input>`, `<textarea>`, or `<select>`.

## songs.json Schema

```json
[
  {
    "title": "Song Title",
    "artist": "Artist Name",
    "file": "Artist - Album - 01 Song Title.ogg",
    "duration": "4:51",
    "hidden": false
  }
]
```

The `hidden` field excludes tracks from the full jukebox page. `songs.json` is the single source of truth — MAGMA//OPS reads/writes it.

### Full Jukebox Page

The full jukebox page (`music/jukebox/app.js`) fetches `songs.json` at runtime:
```js
fetch('songs.json')
  .then(r => r.json())
  .then(data => {
    JUKEBOX_SONGS = data.filter(s => !s.hidden);
    // render song list...
  });
```

The mini-player widget (`assets/jukebox.js`) has its own hardcoded `TRACKS` array (not fetched).

## SPA Integration

The jukebox widget persists across SPA navigations via:
- `window.__pageCleanup` — called by router before navigation; saves state and pauses audio
- `window.__initJukeboxPlayer` — called by router after navigation; re-injects widget if DOM was swapped
- `window.__jukeboxReady` — promise resolved when script loads; router awaits it

## Media Session API

Registers with the browser's Media Session for OS-level controls (lock screen, notification shade):
- Sets `MediaMetadata` with track title, artist, album ("magmacrunch media"), and logo artwork
- Handles `play`, `pause`, `previoustrack`, `nexttrack` action handlers

## Opt-Out

Add `no-jukebox` to `<body>` to disable the jukebox on any page:

```html
<body class="no-jukebox">
```

Arcade games don't load `nav.js` at all, so they're automatically excluded.

## Auto-Hide

The widget automatically hides on the full jukebox page (`music/jukebox/index.html`) via CSS:

```css
body:has(main .jukebox) .mcj {
    display: none !important;
}
```

## CSS Custom Properties

The widget uses the page's nav accent colors for its border and glow:

```css
--nav-accent    /* border, header background, button hover */
--nav-glow      /* box-shadow glow effect */
--nav-brand     /* (not used directly, inherits from page) */
```

On mobile (< 600px), the widget gets larger touch targets and a max-height of 60vh. 
