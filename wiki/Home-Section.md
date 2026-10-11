Landing pages for the site: homepage, about page, and guestbook.

## Pages

| Page | Path | Description |
|------|------|-------------|
| Homepage | `index.html` | Animated pixel volcano, nav cards |
| About | `home/about.html` | ASCII masthead, cereal canvas, artist link strips, logo grid |
| Guestbook | `home/guestbook.html` | Sign the guestbook, hit counter display |
| Links | `home/links/all-links.html` | Redirect to about.html |

CSS is extracted to `home/about.css` and `home/guestbook.css`.

## Homepage (`index.html`)

The site root features an animated pixel art volcano scene on canvas. Uses `window.__pageCleanup` to stop the animation before SPA navigation.

## About Page (`home/about.html`)

An elaborate zine-style page with multiple visual elements.

### Theme

```css
:root {
    --nav-accent: var(--mc-crater);
    --nav-glow: rgba(255,61,110,0.3);
    --nav-brand: var(--mc-cereal-cyan);
    --nav-brand-glow: rgba(0,245,255,0.6);
}

body {
    background-color: var(--mc-sky-deep);
    color: var(--mc-text-primary);
}
```

### Elements

| Element | Description |
|---------|-------------|
| Dateline | Horizontal bar with category tags (music collective, no-budget videos, etc.) |
| ASCII Masthead | Large "magmacrunch media" ASCII art with neon glow |
| "Since" block | "est. 2023 / sometimes it's quite melodious; other times it's noise" |
| Body text | Justified Courier Prime with drop cap, pull quotes |
| Cereal canvas | Animated pixel art scene (floated right) |
| ASCII art blocks | Founder names, producer credits — floated for text wrapping |
| Artist link strips | Full-width banners with ASCII art names, background photos, hover tags |
| Email callout | Cyan-bordered CTA box |
| Logo grid | Pixelated service logos (Bandcamp, Spotify, YouTube, etc.) grouped by category |

### Fonts

The about page loads additional Google Fonts beyond the standard pair:

```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Lora:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
```

- **Playfair Display** — pull quotes, photo captions
- **Lora** — secondary serif for emphasis

### Artist Link Strips

Full-width (960px max) banners with:
- Background photo (darkened, desaturated)
- ASCII art artist name (centered)
- Hover tag with external link URL
- `fadeUp` animation on load

Current artists: Sex Van Floor Plan, THLD, Juanito Thompson, Woah, Dag Henderson, Jon McCoy, The Four B's

### Logo Grid

Pixelated 48x48 service logos organized in groups:
- **Streaming & Music** — Bandcamp, Spotify, Apple Music, YouTube, TikTok, Instagram, etc.
- Labels use `data-label` attribute for hover tooltips

## Guestbook (`home/guestbook.html`)

A retro green-themed guestbook with a Google Apps Script backend.

### Theme

```css
:root {
    --nav-accent: var(--green);
    --nav-glow: rgba(57,255,110,0.4);
    --nav-brand: #90ffaa;
    --nav-brand-glow: rgba(144,255,170,0.7);
}
```

### Architecture

```
Guestbook Form ──POST──▶ Google Apps Script ──Sheets──▶ Google Spreadsheet
     │
     └── loadEntries() ──GET──▶ Google Apps Script ──JSON──▶ entries list
```

### Backend

Uses a Google Apps Script web app (`SCRIPT_URL`) for storage:
- **POST** — submits `{name, message}` via FormData
- **GET** — returns JSON array of entries (newest first)

### Features

- ASCII art ink bottle header
- Form with name + message fields
- Submit button with status feedback (sending, success, error)
- Entries list with name, message, timestamp
- Auto-polls every 30 seconds (`setInterval(loadEntries, 30000)`)
- Hit counter display via `CounterClient.display('#hit-counter')`

### SPA Integration

Registers cleanup to stop polling:

```js
const gbPollId = setInterval(loadEntries, 30000);
window.__pageCleanup = function() { clearInterval(gbPollId); };
```

### Styling

- Green CRT aesthetic (dark green on black)
- Form inputs: black background, green border on focus
- Entries: dark green cards with green names, white messages, yellow timestamps
- Submit button: green → yellow on hover
- Jukebox widget overridden to match green theme 
