Convenience script to launch all game servers locally.

---

## Location

`arcade/start-all.sh`

## Usage

```bash
# Start all servers
./start-all.sh

# Install 'arcade' bash alias
./start-all.sh --setup
```

## What It Does

1. Creates Python venv if missing (`arcade/venv/`)
2. Installs `websockets` package if missing
3. Starts all game servers in background
4. Starts chat server
5. Prints connection URLs
6. Waits for Ctrl+C to shutdown

## Game Servers

| Game | Port |
|------|------|
| SORRY! | 8765 |
| Cribbage | 8766 |
| Scandinavian Stud | 8767 |
| Chess | 8769 |
| Checkers | 8770 |
| Backgammon | 8771 |
| Chinese Checkers | 8772 |
| Parchisi | 8773 |
| Chat | 8768 |

## Adding a New Game

Edit the `GAMES` array in `start-all.sh`:

```bash
GAMES=(
    "SORRY:8765:SORRY"
    "cribbage:8766:Cribbage"
    # Add new games here:
    "my-game:8775:My Game"
)
```

Format: `"directory:port:name"`

## Bash Alias

Install the `arcade` alias for quick access:

```bash
./start-all.sh --setup
source ~/.bashrc
```

Then just run:
```bash
arcade
```

## Auto-Setup

The script automatically:
- Creates `arcade/venv/` if it doesn't exist
- Activates the virtual environment
- Installs `websockets` if missing

No manual setup required.

## Output

```
╔══════════════════════════════════════════════╗
║     MAGMACRUNCH ARCADE — Game Servers       ║
╚══════════════════════════════════════════════╝

Starting SORRY server on port 8765...
  → ws://hostname.local:8765
  → ws://192.168.1.x:8765

Starting Chess server on port 8769...
  → ws://hostname.local:8769
  → ws://192.168.1.x:8769

...

────────────────────────────────────────────────
All servers running!

Press Ctrl+C to stop all servers.
```

## Cleanup

Press Ctrl+C to stop all servers. The script traps SIGINT/SIGTERM and kills all background processes. 
