Browser-based utilities at `tools/`. Excluded from SPA router — each tool loads as a full page.

---

## Pages

| Tool | Path | Description |
|------|------|-------------|
| Album Art Maker | `tools/album-art-maker/` | Create pixel art album covers |
| Media Search | `tools/media-search/` | Search across 6 media providers |
| Pixel Process | `tools/pixel-process/` | Apply 6 pixel art effects to images |
| Index | `tools/index.html` | Landing page with links to all tools |

## Album Art Maker

Create retro-style album art with pixel art aesthetics.

### Features
- Canvas-based pixel art editor
- Multiple grid sizes
- Color palette matching the MagmaCrunch aesthetic
- Export as PNG

## Media Search

Search across multiple media providers from one interface.

### Providers
- MusicBrainz
- TMDB (The Movie Database)
- And 4 more providers

### Architecture
- Client-side search — no backend required
- Results displayed in a unified format
- Links to external providers for full details

## Pixel Process

Apply pixel art effects to images.

### Effects (6 total)
- Pixelation
- Color quantization
- CRT scanline overlay
- Neon glow
- Dithering
- Chromatic aberration

### Architecture
- Canvas-based image processing
- Real-time preview
- Download processed images

## Adding a New Tool

1. Create folder: `tools/my-tool/`
2. Add `index.html`, CSS, JS
3. Add link to `tools/index.html`
4. Add to `nav.js` under the tools section:

```js
{ label: 'tools', href: 'tools/', items: [
    { href: 'tools/album-art-maker/', label: 'album art' },
    { href: 'tools/my-tool/', label: 'my tool' },
]}
```

Note: Tools are excluded from the SPA router (`/tools/` is in `EXCLUDE_PATHS`). Each tool loads as a full page. 
