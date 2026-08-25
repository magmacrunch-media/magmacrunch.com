# Monitoring and security — websocket logging, connection rate tracking, fail2ban, TRAFFIC tab, nginx logs.

## Monitoring & Security

### Websockets logging

All WebSocket servers (`chat-server.py`, `server_base.py`) have INFO-level logging enabled:

```bash
# Live stream all connection events
ssh jake@192.168.1.16 "journalctl -u 'arcade-*' -f"

# Last 50 lines for chat server
ssh jake@192.168.1.16 "journalctl -u arcade-chat -n 50"
```

Log format:
```
18:46:31 [Chat] Starting chat server on port 8768
18:47:15 Connect: ('213.209.159.154', 54321)
18:47:15 Rate limited: global from ('213.209.159.154', 54321)
18:47:16 Disconnect: ('213.209.159.154', 54321)
18:48:00 High connection rate: 213.209.159.154 (12 in 60s)
```

### Connection rate tracking

`chat-server.py` and `server_base.py` track connections per IP. If an IP makes >10 connections in 60 seconds, a warning is logged. This detects bots reconnecting rapidly.

### fail2ban jails

Four fail2ban jails auto-ban scanners and brute-force attackers:

| Jail | What it catches | Ban time |
|------|-----------------|----------|
| `nginx-scanner` | .env probes, wp-admin, phpmyadmin, .git scans | 24 hours |
| `nginx-botsearch` | CMS scanning (wp-login, roundcube) | 24 hours |
| `nginx-bad-request` | Malformed requests (400 errors) | 1 hour |
| `sshd` | SSH brute-force | default |

```bash
# Check fail2ban status
ssh jake@192.168.1.16 "sudo fail2ban-client status"
ssh jake@192.168.1.16 "sudo fail2ban-client status nginx-scanner"
```

Config files on Pi: `/etc/fail2ban/jail.local`, `/etc/fail2ban/filter.d/nginx-scanner.conf`

### Admin TRAFFIC tab

The MAGMA//OPS dashboard has a TRAFFIC tab showing nginx access log analysis:

- **Top IPs** — by request count
- **Status codes** — 426 (bot rejected), 301 (redirect), 101 (websocket)
- **User agents** — suspicious entries highlighted (spoofed MSIE 7.0, etc.)
- **Total requests** count

Open: `http://192.168.1.16:8780` → TRAFFIC tab → REFRESH

### nginx access logs

```bash
# Last 100 lines
ssh jake@192.168.1.16 "tail -100 /var/log/nginx/access.log"

# Top IPs
ssh jake@192.168.1.16 "awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10"

# .env scanners
ssh jake@192.168.1.16 "grep '\.env' /var/log/nginx/access.log | tail -10"
```
