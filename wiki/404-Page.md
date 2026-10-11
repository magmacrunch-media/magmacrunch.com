Themed error page for broken links and missing pages.

## File

`404.html` (site root)

## Design

A retro arcade-style error page with:

- **Giant "404" text** — Press Start 2P font, cyan neon glow with purple and rose drop shadows
- **Flicker animation** — CRT-style intermittent flicker (4s cycle)
- **"PAGE NOT FOUND"** — white text with rose glow
- **"PRESS START" button** — yellow border, blinks on and off, double-border hover effect

## Animations

| Animation | Duration | Effect |
|-----------|----------|--------|
| `flicker` | 4s infinite | CRT flicker at 92-97% of cycle |
| `fadeUp` | 0.6s | Slide up from below with fade |
| `blink` | 1.2s step-end | Button blinks on/off |

## CSS

```css
.err-code {
    color: var(--cyan);
    text-shadow:
        0 0 10px var(--cyan),
        0 0 30px var(--cyan),
        0 0 60px rgba(0, 245, 255, 0.4),
        4px 4px 0px var(--purple),
        8px 8px 0px var(--rose);
    animation: flicker 4s ease-in-out infinite, fadeUp 0.6s ease both;
}
```

## Behavior

- Links to `/` (site root) via the "PRESS START" button
- Loads `nav.js` for consistent navigation
- No special SPA handling — this is a standalone page 
