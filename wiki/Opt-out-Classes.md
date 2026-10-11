Body class modifiers that disable site-wide features on specific pages.

## Available Classes

| Class | Disables | Loaded by |
|-------|----------|-----------|
| `no-jukebox` | Jukebox mini-player | nav.js |
| `no-search` | Search modal | nav.js |
| `no-counter` | Hit counter | nav.js |

## Usage

Add the class to `<body>`:

```html
<body class="no-jukebox no-search">
```

## How It Works

Each service loader in nav.js checks for its opt-out class before injecting:

```js
// Jukebox loader (nav.js line 258)
if (!nav || document.body.classList.contains('no-jukebox')) return;

// Search loader (nav.js line 295)
if (!nav || document.body.classList.contains('no-search')) return;

// Counter loader (nav.js line 326)
if (!nav || document.body.classList.contains('no-counter')) return;
```

## When to Use

| Scenario | Class |
|----------|-------|
| Arcade game pages | `no-jukebox` (games don't load nav.js, so auto-excluded) |
| Pages with own audio | `no-jukebox` |
| Minimal/clean pages | `no-jukebox no-search no-counter` |
| Admin tools | `no-jukebox no-search no-counter` |
| Full jukebox page | Auto-hidden via CSS (`body:has(main .jukebox) .mcj`) |

## Notes

- Arcade games don't load `nav.js` at all, so all three services are automatically excluded
- The jukebox also auto-hides on the full jukebox page (`music/jukebox/index.html`) via CSS
- These classes are checked at page load time — adding them dynamically after load has no effect 
