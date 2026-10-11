Gallery pages with unique color themes for each section.

---

## Pages

| Page | Path | Theme | Description |
|------|------|-------|-------------|
| Index | `visual/index.html` | Pop Art | Main visual landing page |
| Collage | `visual/collage.html` | Memphis | Editorial collage gallery |
| Photography | `visual/photography/` | City Pop | Photo gallery |
| Teevee | `visual/tv/` | Broadcast | TV/broadcast content |

## Shared Styles

`visual/visual.css` provides shared base styles for all visual pages (main layout, breadcrumb, page-header, footer, dropdown).

## Theme System

Each visual page uses a three-part theming pattern:

### 1. `visual.css` — Shared Base Styles

Consumes CSS custom properties defined by each page.

### 2. `:root` — Nav Overrides + Theme Palette

```css
:root {
    --nav-accent: #FF1F5B;
    --nav-glow: rgba(255,31,91,0.4);
    --nav-brand: #00C2FF;
    --nav-brand-glow: rgba(0,194,255,0.7);
    /* Theme palette */
    --bc-accent: #FF1F5B;
    --footer-border: #FF1F5B;
    --footer-accent: #FF1F5B;
    --dd-1: #FF1F5B;
    --dd-2: #00C2FF;
    --dd-3: #39FF6E;
    --dd-4: #FFE03A;
    --dd-5: #C45FFF;
    --dd-hover-color: #080808;
    --dd-hover-bg: #FF1F5B;
}
```

### 3. `body.theme-name` — Page Overrides

```css
body.pop-art {
    background: #1a0a2e;
    color: #f0ead8;
    --dim: #8a7fa8;
    --rose: #ff3d6e;
    --yellow: #ffe03a;
    /* etc. */
}
```

## Existing Themes

### Pop Art (`visual/index.html`)
- Bright, saturated colors
- Bold borders and shadows
- Comic-book inspired

### Memphis (`visual/collage.html`)
- Editorial magazine aesthetic
- Muted palette with accent colors
- Magazine spread feel

### City Pop (`visual/photography/`)
- Pastel gradients
- Japanese city pop aesthetic
- Soft, dreamy tones

### Broadcast (`visual/tv/`)
- Amber/phosphor CRT palette
- `body.broadcast` class
- Retro TV cabinet aesthetic
- `--tv-amber`, `--tv-cabinet`, `--tv-phosphor` CSS variables

## Adding a New Gallery Page

1. Create HTML in `visual/`
2. Link `visual/visual.css` for shared base styles
3. Set nav overrides in `:root`
4. Set page colors in `body.your-theme`
5. Add to `nav.js` under the visual section

```js
{ label: 'visual', href: 'visual/', items: [
    { href: 'visual/collage.html', label: 'collage' },
    { href: 'visual/your-page.html', label: 'your page' },
    // ...
]}
```

## Dropdown Menu Styling

Visual pages can style dropdown menus with colored left borders:

```css
body.theme .dropdown a { border-left: 3px solid transparent; }
body.theme .dropdown a:nth-child(1) { border-left-color: #color1; }
body.theme .dropdown a:nth-child(2) { border-left-color: #color2; }
body.theme .dropdown a:hover { background: #accent; }
```
