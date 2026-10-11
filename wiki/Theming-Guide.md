How to apply color themes to pages on magmacrunch.com.

---

## Color Palette

Defined in `style.css`:

```css
:root {
    --rose:   #ff3d6e;
    --yellow: #ffe03a;
    --cyan:   #00f5ff;
    --green:  #39ff6e;
    --orange: #ff7c1f;
    --purple: #c45fff;
    --white:  #f0ead8;
    --black:  #080808;
}
```

## Nav Color Overrides

To override nav colors, set CSS variables on `:root`:

```css
:root {
    --nav-accent: #FF1F5B;
    --nav-glow: rgba(255,31,91,0.4);
    --nav-brand: #00C2FF;
    --nav-brand-glow: rgba(0,194,255,0.7);
}
```

**Do NOT use `body.class` for nav overrides** — it doesn't reliably override the fallback values in style.css.

## Page-Specific Themes

Use `body.class` for non-nav overrides:

```css
body.my-theme {
    background: #1a0a2e;
    color: #f0ead8;
    --dim: #8a7fa8;
    --rose: #ff3d6e;
    --yellow: #ffe03a;
}
```

## Two-Part Pattern

Every themed page should follow this pattern:

```css
/* 1. Nav overrides on :root */
:root {
    --nav-accent: #FF1F5B;
    --nav-glow: rgba(255,31,91,0.4);
    --nav-brand: #00C2FF;
    --nav-brand-glow: rgba(0,194,255,0.7);
}

/* 2. Page overrides on body class */
body.my-theme {
    background: #1a0a2e;
    color: #f0ead8;
    --dim: #8a7fa8;
}
```

## Nav Card Colors

Available color classes for nav cards:

```css
.nav-card.c-rose      { color: var(--rose); }
.nav-card.c-yellow    { color: var(--yellow); }
.nav-card.c-cyan      { color: var(--cyan); }
.nav-card.c-green     { color: var(--green); }
.nav-card.c-orange    { color: var(--orange); }
.nav-card.c-purple    { color: var(--purple); }
.nav-card.c-slate     { color: var(--slate); }
.nav-card.c-blue      { color: var(--blue); }
.nav-card.c-magenta   { color: var(--magenta); }
.nav-card.c-darkgreen { color: var(--darkgreen); }
.nav-card.c-burntorange { color: var(--burntorange); }
.nav-card.c-violet    { color: var(--violet); }
.nav-card.c-mintteal  { color: var(--mintteal); }
.nav-card.c-softpink  { color: var(--softpink); }
.nav-card.c-nearwhite { color: var(--nearwhite); }
```

## Dropdown Menu Colors

Style dropdown items with colored left borders:

```css
body.theme .dropdown a {
    border-left: 3px solid transparent;
}
body.theme .dropdown a:nth-child(1) { border-left-color: #color1; }
body.theme .dropdown a:nth-child(2) { border-left-color: #color2; }
body.theme .dropdown a:nth-child(3) { border-left-color: #color3; }
body.theme .dropdown a:hover { background: #accent; }
```

## Arcade Theme

Arcade pages use a distinct purple/pink palette:

```css
body {
    --nav-accent: #ff2e9c;
    --nav-brand: #ff2e9c;
    --nav-glow: rgba(255,46,156,0.4);
    --nav-brand-glow: rgba(255,46,156,0.7);
    background: #0a0612;
}
```

## Disabling Features

Use body classes to disable shared features:

```html
<body class="no-jukebox no-search no-counter">
```

---

## Theme Color Audit

`scripts/generate-theme-audit.mjs` scans all CSS files and generates a visual preview of all colors used across the site.

### Usage

```bash
node scripts/generate-theme-audit.mjs
```

### What It Scans

- `style.css` — global palette
- `archive/by-artist/*/*.css` — artist theme colors
- `archive/by-place/*/*.css` — place theme colors
- `visual/*/` HTML files — inline `:root` styles
- `arcade/*/css/*.css` — game theme colors
- `templates/*.css` — template colors
- `assets/*.css` — shared asset colors

### Output

- `og/theme-audit.png` — visual preview showing all color swatches grouped by section
- `theme-audit.json` — structured data of all colors found

### Auto-Update

GitHub Action (`.github/workflows/theme-audit.yml`) runs when any CSS or HTML file changes, regenerating the preview.

### Stats

As of August 2026: 132 files scanned, 1,143 unique colors found across 46 sections. 
