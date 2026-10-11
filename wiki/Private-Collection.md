Password-protected game collection served by a standalone Python HTTP server.

## Architecture

```
Browser ──POST /login──▶ server.py ──session cookie──▶ static files
                               │
                               ├── DEFAULT_CONFIG (inline in server.py)
                               └── systemd/arcade-private.service
```

## Files

| File | Purpose |
|------|---------|
| `arcade/private/server.py` | HTTP server with session auth (363 lines, stdlib only) |
| `arcade/private/index.html` | Login page |
| `arcade/private/style.css` | Login page styles |
| `arcade/private/systemd/arcade-private.service` | Systemd service file |

## Config

Configuration is embedded in `server.py` as `DEFAULT_CONFIG`:

```python
DEFAULT_CONFIG = {
    "port": 8782,
    "password": "changeme",
    "password_secret": "<generated; see Password Modes below>",
    "bind": "0.0.0.0",
    "session_ttl_hours": 24,
    "routes": {}
}
```

Pass `--config config.json` to override at runtime. Routes and password are the main settings.

### Password Modes

**Auto mode**: the password rotates daily and is derived from `password_secret`
in `config.json`, which is gitignored and must be generated per install:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

The code is `lava-` and six characters. Read today's off the admin dashboard; it
cannot be worked out from the source, which is the point. The server refuses to
start in auto mode with no secret rather than falling back to anything.

Until 2026-10-04 this was `lava` + MMDD, which anybody reading the public
repository could compute for any day. Only the firewall stood in the way, since
8782 is not proxied by nginx.

**Manual mode**: Uses the `password` field from config

## Auth Flow

1. User visits `/` → server shows login page
2. User submits password → server validates with `hmac.compare_digest`
3. On success: generates session token, sets `private_session` cookie (HTTP-only, 24h TTL)
4. On failure: shows error, increments attempt counter
5. Subsequent requests: cookie validated, files served from mapped routes

## Security Features

- **Rate limiting**: 5 failed attempts → 5-minute lockout per IP
- **Session tokens**: `secrets.token_hex(16)` (32 hex chars)
- **HTTP-only cookies**: Not accessible via JavaScript
- **Constant-time comparison**: `hmac.compare_digest` prevents timing attacks
- **No-cache headers**: Prevents browser caching of protected content
- **Session cleanup**: Background thread expires old sessions every 10 minutes

## Route Resolution

Routes are resolved by prefix matching:

```
/sorry           → /home/jake/arcade/SORRY/index.html
/sorry/game.html → /home/jake/arcade/SORRY/game.html
```

If no route matches, the request returns 404. Unauthenticated requests redirect to `/`.

## Systemd Service

```ini
[Unit]
Description=MagmaCrunch Arcade - Private Auth Server
After=network.target

[Service]
Type=simple
User=jake
WorkingDirectory=/home/jake/arcade/private
ExecStart=/home/jake/arcade/venv/bin/python3 server.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Deployment

```bash
rsync -avz arcade/private/ jake@<pi>:~/arcade/private/
ssh jake@<pi> "sudo systemctl restart arcade-private"
```

## Dependencies

None — uses Python stdlib only (`http.server`, `secrets`, `hmac`, `json`).

## Adding a New Private Game

1. Add a route in `server.py` (or pass a `--config config.json` at runtime):
   ```python
   DEFAULT_CONFIG = {
       ...
       "routes": {
           "/sorry": "/home/jake/arcade/SORRY",
           "/new-game": "/home/jake/arcade/new-game"
       }
   }
   ```
2. Restart the service: `sudo systemctl restart arcade-private`
3. The game will be listed on the private arcade index page 
