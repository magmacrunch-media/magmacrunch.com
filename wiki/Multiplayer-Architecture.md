All multiplayer games run as WebSocket servers on a Raspberry Pi.

---

## Overview

```
Game (browser) ──postMessage──▶ SharedWorker ──WebSocket──▶ chat-server.py (port 8768)
     │                              │
     └── sendToServer() ────────────┘
```

## Chat System

The chat widget (`shared/adenosine-chat.js`, exposed as `AdChat`) provides a floating real-time chat on all arcade pages. It uses a SharedWorker (`shared/chat-worker.js`) to hold a single WebSocket connection across page navigations — preventing duplicate users when navigating between games.

### Key Features
- **SharedWorker** holds one WebSocket. Pages connect via `postMessage`.
- **Session tokens** stored in `sessionStorage` (one per tab)
- **Server** delays user creation until `set_name` arrives (no anonymous flicker)
- **Room sub-chats** — games can have their own chat rooms
- **30-second reconnect window** — preserves name/color on brief disconnects

### Adding Chat to a Game

```html
<link rel="stylesheet" href="../shared/chat-widget.css">
<script src="../shared/adenosine-chat.js"></script>
<script>const { ChatWidget } = AdChat; ChatWidget.connect();</script>
```

### Public API

```js
ChatWidget.connect()
ChatWidget.disconnect()
ChatWidget.joinRoom(code)
ChatWidget.leaveRoom(code)
ChatWidget.setName(name)
ChatWidget.setColor(color)
ChatWidget.getMyName()
ChatWidget.getMyColor()
```

## Game Servers

Each multiplayer game has its own WebSocket server. They all run on the Raspberry Pi.

| Service | Port | Game |
|---------|------|------|
| arcade-sorry | 8765 | SORRY! |
| arcade-cribbage | 8766 | Cribbage |
| arcade-stud | 8767 | Söko (Scandinavian Stud) |
| arcade-chat | 8768 | Global chat |
| arcade-chess | 8769 | Chess |
| arcade-checkers | 8770 | Checkers |
| arcade-backgammon | 8771 | Backgammon |
| arcade-chinese-checkers | 8772 | Chinese Checkers |
| arcade-parchisi | 8773 | Parchis |
| arcade-aggravation | 8774 | Aggravation |

## Shared Multiplayer Framework

Games can use the shared framework in `arcade/shared/multiplayer/`:

- `server_base.py` — Python base class for game servers
- `card_constants.py` — card constants for Python servers
- `lobby.css` — Lobby UI styles
- `adenosine-multiplayer.js` — WebSocket client (IIFE build, loaded via `<script>`)

## Server Status

The arcade index page checks server status by pinging the chat server:

```js
fetch('https://magmacrunch.duckdns.org', { mode: 'no-cors' })
    .then(() => { /* online */ })
    .catch(() => { /* offline */ });
```

Status is checked every 30 seconds and displayed as a green/red dot. 
