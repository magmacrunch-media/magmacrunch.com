# Shared Multiplayer Framework

Reusable WebSocket infrastructure for multiplayer card/board games in the magmacrunch arcade.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Client (browser)                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐│
│  │ network.js  │  │ protocol.js │  │ lobby.css               ││
│  │ (MP object) │  │ (MSG types) │  │ (shared styles)         ││
│  └──────┬──────┘  └─────────────┘  └─────────────────────────┘│
│         │ WebSocket                                            │
└─────────┼──────────────────────────────────────────────────────┘
          │ JSON messages
┌─────────┼──────────────────────────────────────────────────────┐
│  Server (Python)                                               │
│  ┌──────┴──────┐  ┌─────────────┐  ┌─────────────────────────┐│
│  │server_base.py│  │ game logic  │  │ lobby/chat/rooms        ││
│  │ (GameServer) │  │ (per-game)  │  │ (built-in)              ││
│  └──────────────┘  └─────────────┘  └─────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `server_base.py` | Reusable Python WebSocket server with room management, lobby, chat, spectators |
| `network.js` | Game-agnostic client WebSocket layer (`MP` object) |
| `protocol.js` | Shared message type constants (`MSG` object) |
| `lobby.css` | Shared lobby/chat UI styles |

## Quick Start

### Server (Python)

```python
from server_base import GameServer

class MyGame:
    def __init__(self):
        self.reset()

    def reset(self):
        self.state = {}

    def handle_action(self, player, action):
        # Process game action
        # Return dict to broadcast, or None
        return {"type": "game_action", "action": action}

    def get_state(self):
        return self.state

server = GameServer(
    port=8765,
    game_factory=MyGame,
    min_players=2,
    max_players=2,
    game_name="My Game"
)
server.run()
```

### Client (JavaScript)

```html
<script src="../shared/multiplayer/protocol.js"></script>
<script src="../shared/multiplayer/network.js"></script>
<script>
  // Set callbacks before connecting
  MP.onWelcome = function(data) {
    console.log('Joined room:', data.room);
  };

  MP.onGameStarted = function(data) {
    console.log('Game started!', data.state);
  };

  MP.onGameAction = function(action) {
    console.log('Game action:', action);
  };

  MP.onChatMessage = function(from, text, color) {
    console.log(from + ': ' + text);
  };

  // Connect to server
  MP.connect('localhost:8765');

  // Join a room
  MP.join('Alice', '#ff2d55');

  // Send game action
  MP.sendAction({ type: 'play_card', card: { suit: 'hearts', rank: '5' } });

  // Send chat
  MP.sendChat('Hello everyone!');
</script>
```

## Protocol

### Client → Server

| Message | Fields | Description |
|---------|--------|-------------|
| `join` | `name`, `color`, `room?` | Join lobby (creates room if none specified) |
| `create_room` | `name`, `color`, `room` | Create a specific room code |
| `join_room` | `name`, `color`, `room` | Join existing room by code |
| `spectate` | `name`, `room?` | Join as spectator |
| `start_game` | — | Start game (host only) |
| `game_action` | `action` | Game-specific action |
| `chat` | `text` | Chat message |
| `quit` | — | Leave room |

### Server → Client

| Message | Fields | Description |
|---------|--------|-------------|
| `lobby_snapshot` | `rooms` | Initial lobby state |
| `welcome` | `playerName`, `room`, `isHost`, `chosenColor` | Confirms join |
| `spectator_welcome` | `playerName`, `room` | Confirms spectator |
| `rejected` | `reason` | Join rejected |
| `lobby_update` | `players`, `takenColors`, `canStart` | Lobby state change |
| `game_started` | `state` | Game begins |
| `game_state` | `state` | Full state sync |
| `game_action` | `action` | Broadcast game action |
| `chat` | `from`, `color`, `text` | Chat message |
| `system` | `text` | System message |
| `player_quit` | `playerName`, `color` | Player left |

## Adding a New Game

1. Create `game/server.py`:
   ```python
   import sys
   sys.path.insert(0, '../shared/multiplayer')
   from server_base import GameServer

   class MyGame:
       def reset(self): ...
       def handle_action(self, player, action): ...
       def get_state(self): ...

   server = GameServer(port=XXXX, game_factory=MyGame, ...)
   server.run()
   ```

2. Add to client HTML:
   ```html
   <script src="../shared/multiplayer/protocol.js"></script>
   <script src="../shared/multiplayer/network.js"></script>
   <link rel="stylesheet" href="../shared/multiplayer/lobby.css">
   ```

3. Use `MP` object for networking:
   ```javascript
   MP.connect(serverAddress);
   MP.onGameAction = function(action) { /* handle */ };
   MP.sendAction({ type: 'my_action', ... });
   ```

## Deployment

### Raspberry Pi (local network)

```bash
cd ~/arcade
pip install -r requirements.txt  # shared arcade venv

# Start game server
python game/server.py --port XXXX
```

Players join via `http://raspberrypi.local/arcade/game/`

### VPS (public internet)

1. Get a VPS ($5-6/mo DigitalOcean)
2. Install Nginx + SSL
3. Run game server on localhost
4. Nginx proxies WebSocket connections

See SORRY's `start.sh` for Raspberry Pi deployment patterns.
