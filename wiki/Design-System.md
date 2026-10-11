The magmacrunch visual identity: CRT retro aesthetic, pixel fonts, neon colors, scanline textures.

## Color Palette

### Base Palette (style.css)

| Variable | Hex | Usage |
|----------|-----|-------|
| `--black` | `#080808` | Background |
| `--deep` | `#111118` | Dark surfaces |
| `--white` | `#f0ead8` | Primary text (warm white) |
| `--dim` | `#8a7a8a` | Muted text |
| `--rose` | `#ff3d6e` | Primary accent |
| `--yellow` | `#ffe03a` | Highlights, warnings |
| `--cyan` | `#00f5ff` | Links, secondary accent |
| `--green` | `#39ff6e` | Success, search UI |
| `--orange` | `#ff7c1f` | Tertiary accent |
| `--purple` | `#c45fff` | Quaternary accent |
| `--slate` | `#8899aa` | Neutral blue-grey |
| `--blue` | `#4678ff` | Info |
| `--magenta` | `#ff2d78` | Hot pink |
| `--darkgreen` | `#1f7a3e` | Forest green |
| `--teal` | `#1a7a5e` | Teal |
| `--burntorange` | `#ff6b35` | Burnt orange |
| `--violet` | `#b24bff` | Violet |
| `--mintteal` | `#00e5b3` | Mint |
| `--softpink` | `#ff9eb5` | Soft pink |
| `--nearwhite` | `#f0f0f0` | Near-white |
| `--bubblegum` | `#FF8584` | Bubblegum |

### Magmacrunch Media Palette

Extended palette organized by theme:

**Mountain**
| Variable | Hex | Description |
|----------|-----|-------------|
| `--mc-mount` | `#1A0505` | Mountain base |
| `--mc-mount-dark` | `#110206` | Mountain dark |
| `--mc-mount-mid` | `#2D0A0A` | Mountain mid |
| `--mc-ash` | `#3D3028` | Ash |
| `--mc-smoke` | `#6A5A52` | Smoke |
| `--mc-haze` | `#9A8878` | Haze |

**Lava**
| Variable | Hex | Description |
|----------|-----|-------------|
| `--mc-lava-bright` | `#FFE03A` | Bright lava |
| `--mc-lava-amber` | `#FFAD1F` | Amber lava |
| `--mc-lava-orange` | `#FF6A00` | Orange lava |
| `--mc-lava-deep` | `#CC2200` | Deep lava |
| `--mc-ember` | `#FF3D00` | Ember |
| `--mc-crater` | `#FF3D6E` | Crater (rose) |

**Sky**
| Variable | Hex | Description |
|----------|-----|-------------|
| `--mc-sky-deep` | `#0A0518` | Deep sky |
| `--mc-sky-mid` | `#1A0A2E` | Mid sky |
| `--mc-gas-glow` | `#2A1A0A` | Gas glow |

**Cereal**
| Variable | Hex | Description |
|----------|-----|-------------|
| `--mc-cereal-rose` | `#FF3D6E` | Cereal rose |
| `--mc-cereal-cyan` | `#00F5FF` | Cereal cyan |
| `--mc-cereal-purple` | `#C45FFF` | Cereal purple |
| `--mc-cereal-green` | `#39FF14` | Cereal green |
| `--mc-cereal-white` | `#FFFFFF` | Pure white |

**UI Chrome**
| Variable | Hex | Description |
|----------|-----|-------------|
| `--mc-text-primary` | `#FFF0E8` | Primary text |
| `--mc-text-dim` | `#C8A898` | Dim text |
| `--mc-border` | `#3D2018` | Border color |
| `--mc-surface` | `#1A0D08` | Surface |

**Nav**
| Variable | Hex | Description |
|----------|-----|-------------|
| `--mc-nav-accent-a` | `#00F5FF` | Nav accent A (cyan) |
| `--mc-nav-accent-b` | `#C45FFF` | Nav accent B (purple) |
| `--mc-nav-active` | `#FF6A00` | Active state |
| `--mc-nav-text` | `#FFF0E8` | Nav text |

## Fonts

| Font | Family | Usage |
|------|--------|-------|
| Press Start 2P | `'Press Start 2P', monospace` | Headings, nav, UI elements, buttons |
| Courier Prime | `'Courier Prime', monospace` | Body text, descriptions |
| Playfair Display | `'Playfair Display', serif` | About page only |
| Lora | `'Lora', serif` | About page only |

Fonts loaded via Google Fonts with `font-display: swap` (no FOIT). Injected by nav.js font loader.

## CRT Aesthetic

### Scanline Texture

Applied to `<body>` via `background-image`:

```css
background-image: repeating-linear-gradient(
    0deg, transparent, transparent 2px,
    rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 4px
);
```

### Arcade Scanlines

Arcade pages use a separate overlay via `arcade-base.css`:

```css
body::after {
    content: '';
    position: fixed;
    inset: 0;
    background: repeating-linear-gradient(
        0deg, transparent, transparent 3px,
        rgba(0,0,0,var(--mc-scanline-opacity, 0.08)) 3px,
        rgba(0,0,0,var(--mc-scanline-opacity, 0.08)) 4px
    );
    pointer-events: none;
    z-index: 9999;
}
```

### Animations

| Animation | Usage |
|-----------|-------|
| `fadeUp` | Page elements sliding up on load |
| `blink` | Cursor blink, pulsing elements |
| `ticker` | Scrolling news ticker |
| `mcj-spin` | Jukebox vinyl rotation |

## Nav Theming

Every page can override nav colors via CSS custom properties on `:root`:

```css
:root {
    --nav-accent: #FF1F5B;       /* Border, hover background */
    --nav-glow: rgba(255,31,91,0.4);  /* Border glow shadow */
    --nav-brand: #00C2FF;        /* Brand text color */
    --nav-brand-glow: rgba(0,194,255,0.7);  /* Brand text glow */
}
```

**Important**: Must use `:root`, NOT `body.class`. The `body.class` approach does not reliably override the fallback values in style.css.

See [Theming Guide](Theming-Guide) for complete details.

## Nav Card Colors

15 color classes for nav cards and sub-nav elements:

| Class | Color |
|-------|-------|
| `c-rose` | `#ff3d6e` |
| `c-yellow` | `#ffe03a` |
| `c-cyan` | `#00f5ff` |
| `c-green` | `#39ff6e` |
| `c-orange` | `#ff7c1f` |
| `c-purple` | `#c45fff` |
| `c-slate` | `#8899aa` |
| `c-blue` | `#4678ff` |
| `c-magenta` | `#ff2d78` |
| `c-darkgreen` | `#1f7a3e` |
| `c-burntorange` | `#ff6b35` |
| `c-violet` | `#b24bff` |
| `c-mintteal` | `#00e5b3` |
| `c-softpink` | `#ff9eb5` |
| `c-nearwhite` | `#f0f0f0` |

## Page Theme Pattern

Pages use a two-part theming pattern:

1. **`:root`** — nav overrides + theme palette CSS variables
2. **`body.theme-name`** — page-specific overrides (background, text, dim, etc.)

```css
/* Part 1: Nav overrides */
:root {
    --nav-accent: #FF1F5B;
    --nav-glow: rgba(255,31,91,0.4);
    --nav-brand: #00C2FF;
    --nav-brand-glow: rgba(0,194,255,0.7);
}

/* Part 2: Page overrides */
body.pop-art {
    background: #1a1a2e;
    color: #f0ead8;
}
```

See [Visual Gallery](Visual-Gallery) for existing themes.

## Responsive Breakpoints

| Breakpoint | Changes |
|------------|---------|
| ≤ 640px | Nav collapses to hamburger, dropdowns become inline |
| ≤ 600px | Jukebox gets larger touch targets, search modal adjusts padding |

## Shared Components

| Component | Classes | Usage |
|-----------|---------|-------|
| Nav cards | `.nav-card`, `.c-{color}` | Section navigation links |
| Section dividers | `.section-divider` | Decorative `✦` divider |
| Piece cards | `.piece-card` | Press section article links |
| Ticker | `.ticker-wrap`, `.ticker` | Scrolling announcement bar |
| Footer | `footer` | Site-wide footer | 
