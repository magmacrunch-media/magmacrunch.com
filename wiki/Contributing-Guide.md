# Contributing Guide

No build tools required. Just edit files and open `index.html` in a browser.

---

## Adding a New Arcade Game

1. Create a folder under `arcade/` (e.g. `arcade/my-game/`)
2. Add `index.html` with this structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>my game — magmacrunch media</title>
    <link rel="icon" type="image/svg+xml" href="../favicon.svg">
    <link rel="stylesheet" href="../shared/arcade-base.css">
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <canvas id="game" width="64" height="64"></canvas>
    <script src="js/game.js"></script>
</body>
</html>
```

3. Create `css/style.css` for game-specific styles
4. Create `js/game.js` for game logic
5. Use `image-rendering: pixelated` on canvas, draw at low res (64x64), scale with CSS
6. Add a link to `arcade/index.html` under the appropriate collection

### Integrating Chat

```html
<link rel="stylesheet" href="../shared/chat-widget.css">
<script src="../shared/adenosine-chat.js"></script>
<script>const { ChatWidget } = AdChat; ChatWidget.connect();</script>
```

### Integrating High Scores

```html
<script src="../shared/adenosine-score-client.js"></script>
<script>const scoreClient = new AdScore.ScoreClient().auto();</script>
```

Then in your game code:
```js
const scores = await scoreClient.load('my-game');
await scoreClient.save('my-game', 'JAM', 12400, { level: 5 });
```

---

## Adding an Archive Page

### Artist Page

1. Create folder: `archive/by-artist/my-artist/`
2. Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>My Artist — magmacrunch media</title>
    <link rel="stylesheet" href="../../style.css">
    <link rel="stylesheet" href="../../assets/archive.css">
</head>
<body>
<nav id="auto-nav" data-depth="../../"></nav>
<main>
    <div class="page-header">
        <h1 class="page-title">My Artist</h1>
    </div>
</main>
<script src="../../nav.js"></script>
<script>
window.ARTIST_CONFIG = {
    id:        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    name:      'My Artist',
    abbr:      'MA',
    accent:    'cyan',
    backColor: 'c-cyan',
    siblings:  ['about', 'events', 'recordings', 'works'],
    depth:     '../../',
};
</script>
<script src="../../templates/artist_recordings.js"></script>
</body>
</html>
```

3. Add sub-pages (recordings.html, works.html, etc.) using the appropriate template

### Place Page

Same pattern, but use `window.PLACE_CONFIG` and place templates.

### Contributor Page

Use `window.__CONTRIBUTOR_CONFIG` (note: UPPERCASE property names — `MB_ID`, `NAME`, `ARCHIVE_LINKS`) and load `entity-map.js` before `contributor.js`.

---

## Adding a Visual Gallery Page

1. Create HTML in `visual/`
2. Use the theming pattern from AGENTS.md:
   - `:root` for nav overrides (accent, glow, brand)
   - `body.theme-name` for page-specific colors

---

## Code Style

- Add comments where they help explain *why*, not *what* — but keep them optional
- Use existing CSS variables from `style.css`
- Follow existing naming conventions
- Prefer `var` for broad browser compatibility
- Use IIFE pattern for game scripts: `const Lib = (function() { ... return { api }; })();`
- Shared code lives in `arcade/shared/` — games should use it when it fits
- Don't import directly from other games' folders (e.g. `../chess/js/...`) 

---

## Commits

- Commit as `magmacrunchmedia <magmacrunchmedia@gmail.com>`
- **No AI attribution** — no `Co-Authored-By: Claude …`, no "Generated with …"
  trailer, in commit messages, PR bodies or page content. If your tooling adds one
  by default, remove it before committing
- Subject lines are sentence-case and imperative, with no `feat:`/`chore:` prefix
- Every repository here carries an `AGENTS.md` stating the same rules; read the one
  in the repo you are changing
