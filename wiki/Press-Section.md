A DIY publishing house for essays, poetry, fiction, and experimental writing. No gatekeepers, no advance, no permission needed.

## Pages

| Page | Path | Description |
|------|------|-------------|
| Press Index | `press/index.html` | Landing page with journal listings + submissions |
| Scientific | `press/scientific/` | Science & technology essays |
| Experimental | `press/experimental/` | Experimental writing |
| Lyrics | `press/lyrics/` | Lyrics & songwriting by artist |
| Submissions | `press/submissions.html` | Submission guidelines |

## Structure

```
press/
├── index.html              # Landing page — lists all journals
├── submissions.html        # Submission guidelines
├── scientific/
│   ├── index.html          # Journal index
│   ├── photon-quantum.html # "On the Quantum Nature of Photons" (MathJax)
│   └── cone/               # "Why is off-plane diffraction conical?" (LaTeX)
│       ├── index.html
│       ├── main.tex        # LaTeX source
│       ├── sample.bib      # Bibliography
│       ├── defines.tex     # Shared definitions
│       └── *.mps, *.png    # Figures
├── experimental/
│   ├── index.html          # Journal index
│   └── basement-creature.html  # "Basement Creature"
└── lyrics/
    ├── index.html          # Lists artists with lyrics
    ├── jon-mccoy/          # 4 songs
    ├── c-p-rutledge/       # 2 songs
    ├── sex-van-floor-plan/ # 1 song
    └── thld/               # 1 song
```

## Theming

All press pages use a consistent dark editorial theme:

```css
:root {
    --nav-accent: #c02828;
    --nav-glow: rgba(192,40,40,0.4);
    --nav-brand: #c02828;
    --nav-brand-glow: rgba(192,40,40,0.6);
}

body {
    background-color: #1a1a1a;
    color: #f0e4c8;
}
```

The `#c02828` deep red is the press section's signature color — used for titles, accent bars, borders, and hover states.

## Piece Cards

Journal indices use a consistent card layout:

```
┌───┬──────────────────────────────────────────┐
│   │  PIECE TITLE                            │
│ ▎ │  [TYPE BADGE]  author · date            │
│   │                                         │
└───┴──────────────────────────────────────────┘
```

- Left accent bar (4px, expands to 7px on hover)
- Type badge: `journal`, `essay`, `artist` — inverted color pill
- Arrow indicator appears on hover
- Cards stacked with no gap, shared border collapse

## Scientific Papers

### Photon Quantum

An HTML-based essay using MathJax for equation rendering. Loaded via CDN:

```html
<script>
MathJax = {
    tex: { inlineMath: [['$','$']], displayMath: [['$$','$$']] }
};
</script>
<script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
```

The SPA router has special handling for MathJax config — it merges macros without destroying the runtime (nav.js lines 529-539).

### Cone (LaTeX)

A traditional LaTeX paper compiled to HTML. Contains:
- `main.tex` — LaTeX source with figures
- `sample.bib` — BibTeX bibliography
- `defines.tex` — shared macro definitions
- `*.mps` / `*.png` — figure files (MetaPost output + PNG fallbacks)

## Lyrics

Lyrics are organized by artist, each in its own subdirectory:

```
lyrics/
├── jon-mccoy/          # 4 songs
├── c-p-rutledge/       # 2 songs
├── sex-van-floor-plan/ # 1 song
└── thld/               # 1 song (Texas Hold'Em Lava Dome)
```

Each artist directory contains individual song pages.

## Submissions

Contact: `press@magmacrunch.com`

Include your name (or pseudonym) and a short bio if you want.

## Nav Configuration

```js
{ label: 'press', href: 'press/', items: [
    { href: 'press/scientific/', label: 'scientific' },
    { href: 'press/experimental/', label: 'experimental' },
    { href: 'press/lyrics/', label: 'lyrics' }
]}
```

## Adding a New Journal

1. Create folder under `press/` (e.g. `press/poetry/`)
2. Create `index.html` following the piece card pattern from existing journals
3. Add pieces as individual HTML pages
4. Add nav dropdown item in `nav.js` under the `press` section
5. Update `press/index.html` to add a new piece card for the journal 
