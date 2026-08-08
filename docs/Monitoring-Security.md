# Monitoring & Security

This page documents the monitoring and security systems for the magmacrunch.com Raspberry Pi server.

---

## Overview

The Pi runs 13+ WebSocket services, all exposed to the internet. To detect and block malicious traffic, we have:

1. **fail2ban** — auto-bans IPs that scan paths or brute-force endpoints
2. **Admin TRAFFIC tab** — nginx access log analysis in MAGMA//OPS dashboard
3. **App-level logging** — connection/disconnection tracking with IP addresses
4. **Connection rate tracking** — detects rapid-reconnecting bots

---

## fail2ban

### Jails

| Jail | What it catches | Ban time |
|------|-----------------|----------|
| `nginx-scanner` | .env probes, wp-admin, phpmyadmin, .git scans | 24 hours |
| `nginx-botsearch` | CMS scanning (wp-login, roundcube) | 24 hours |
| `nginx-bad-request` | Malformed requests (400 errors) | 1 hour |
| `sshd` | SSH brute-force | default |

### Configuration

Config files on Pi:
- `/etc/fail2ban/jail.local` — jail definitions
- `/etc/fail2ban/filter.d/nginx-scanner.conf` — custom filter for .env scanning

### Commands

```bash
# Check overall status
sudo fail2ban-client status

# Check specific jail
sudo fail2ban-client status nginx-scanner

# Check banned IPs
sudo fail2ban-client status nginx-scanner | grep "Banned IP list"

# Manually unban an IP
sudo fail2ban-client set nginx-scanner unbanip 1.2.3.4

# Restart fail2ban (after config changes)
sudo fail2ban-client stop && sudo fail2ban-client start
```

### Custom filter: nginx-scanner

The custom filter (`/etc/fail2ban/filter.d/nginx-scanner.conf`) matches:
- Requests to `.env` files (`.env`, `.env.local`, `.env.production`)
- WordPress admin paths (`wp-admin`, `wp-login`)
- phpMyAdmin paths
- Git/config/backup paths

These return 301 (redirect) or 426 (health check rejection) and indicate automated scanning.

---

## Admin TRAFFIC tab

The MAGMA//OPS dashboard has a TRAFFIC tab showing nginx access log analysis.

### Access

1. Open `http://192.168.1.16:8780`
2. Click **TRAFFIC** tab
3. Select line count (500/1000/5000)
4. Click **REFRESH**

### What it shows

- **TOTAL REQUESTS** — total lines in nginx access log
- **TOP IPs** — by request count (top 15)
- **STATUS CODES** — breakdown of HTTP status codes
- **USER AGENTS** — by frequency (top 15)

### Interpreting results

**Suspicious patterns:**
- User agents with `MSIE 7.0` or `Chrome 14` — spoofed, old browsers
- `libredtail-http`, `python-requests`, `curl` — scanners
- No user agent (`-`) — automated tools
- High 426 count — bots hitting WebSocket ports with HTTP
- High 400 count — malformed requests

**Normal patterns:**
- `meta-externalagent` — Facebook crawler
- `Googlebot` — Google search crawler
- `Chrome/125+`, `Firefox/134+` — real browsers
- 101 status codes — successful WebSocket upgrades (real users)

---

## App-level logging

### What's logged

`chat-server.py` and `server_base.py` (all game servers) log:

```
18:46:31 [Chat] Starting chat server on port 8768
18:47:15 Connect: ('213.209.159.154', 54321)
18:47:15 Rate limited: global from ('213.209.159.154', 54321)
18:47:16 Disconnect: ('213.209.159.154', 54321)
18:48:00 High connection rate: 213.209.159.154 (12 in 60s)
```

### Log events

| Event | What it means |
|-------|---------------|
| `Connect: (ip, port)` | New WebSocket connection |
| `Disconnect: (ip, port)` | WebSocket disconnected |
| `Rate limited: KEY from (ip, port)` | Message rate exceeded (flood protection) |
| `High connection rate: ip (N in Xs)` | IP made N connections in X seconds (bot detection) |

### Rate limits

| Limit | Window | Applies to |
|-------|--------|------------|
| 20 msgs/sec | 1 sec | Global message flood |
| 2 name changes | 10 sec | set_name |
| 2 color changes | 10 sec | set_color |
| 5 chat messages | 10 sec | chat |
| 1 status request | 10 sec | status |
| 2 game actions | 3 sec | game_action |
| 10 connections | 60 sec | Connection rate (per IP) |

### Viewing logs

```bash
# Live stream all services
ssh jake@192.168.1.16 "journalctl -u 'arcade-*' -f"

# Chat server only
ssh jake@192.168.1.16 "journalctl -u arcade-chat -f"

# Last 50 lines
ssh jake@192.168.1.16 "journalctl -u arcade-chat -n 50"

# Error level only
ssh jake@192.168.1.16 "journalctl -u 'arcade-*' -p err -n 100"

# Today's logs
ssh jake@192.168.1.16 "journalctl -u 'arcade-*' --since today"
```

Also available in the admin dashboard: MAGMA//OPS → ARCADE tab → LIVE LOGS section.

---

## Connection rate tracking

Both `chat-server.py` and `server_base.py` track connections per IP using a sliding window:

```python
connection_history = {}  # ip -> [timestamps]

def check_connection_rate(ip, max_count=10, window=60):
    now = time.time()
    timestamps = connection_history.get(ip, [])
    timestamps = [t for t in timestamps if now - t < window]
    if len(timestamps) >= max_count:
        logger.warning("High connection rate: %s (%d in %ds)", ip, len(timestamps), window)
        return False
    timestamps.append(now)
    connection_history[ip] = timestamps
    return True
```

This detects:
- Bots reconnecting rapidly after disconnection
- Distributed scanning from a single IP
- Brute-force attempts on WebSocket endpoints

---

## nginx access logs

### Location

`/var/log/nginx/access.log` on the Pi

### Format

```
IP - - [date] "METHOD /path PROTO" STATUS SIZE "referer" "user-agent"
```

### Useful commands

```bash
# Last 100 lines
tail -100 /var/log/nginx/access.log

# Top IPs
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10

# Status code breakdown
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn

# .env scanners
grep '\.env' /var/log/nginx/access.log | tail -10

# Requests from specific IP
grep '213.209.159.154' /var/log/nginx/access.log | tail -20

# Today's 426 responses (bot rejected)
awk '$9 == 426' /var/log/nginx/access.log | tail -20
```

---

## What to do if you see suspicious activity

1. **Check TRAFFIC tab** — identify the IP and pattern
2. **Check fail2ban** — `sudo fail2ban-client status nginx-scanner` to see if it's already banned
3. **Manual ban** (if needed):
   ```bash
   sudo fail2ban-client set nginx-scanner banip 1.2.3.4
   ```
4. **Check logs** — `journalctl -u 'arcade-*' -f` to see if it's hitting WebSocket ports
5. **Report** — if it's a known good crawler (Googlebot, etc.), add to fail2ban ignore list
