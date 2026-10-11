HTTPS termination and reverse proxy for the Raspberry Pi servers.

---

## Overview

nginx handles TLS termination and reverse proxies to the Python WebSocket servers.

## Setup Script

```bash
ssh <user>@<pi-ip> "sudo bash ~/arcade/scripts/setup-ssl.sh"
```

This installs:
- nginx
- Let's Encrypt certificates for `magmacrunch.duckdns.org`
- Auto-renewal via cron

## Nginx Configuration

File: `arcade/scripts/nginx-magmacrunch.conf`

```nginx
server {
    listen 443 ssl;
    server_name magmacrunch.duckdns.org;

    ssl_certificate /etc/letsencrypt/live/magmacrunch.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/magmacrunch.duckdns.org/privkey.pem;

    # Reverse proxy to chat server
    location / {
        proxy_pass http://127.0.0.1:8768;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## WebSocket Proxying

For WebSocket servers, nginx needs these headers:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

This allows WebSocket connections through the HTTPS port.

## Certificate Auto-Renewal

Let's Encrypt certificates expire after 90 days. The setup script installs a cron job:

```bash
0 0 1 * * certbot renew --quiet && systemctl reload nginx
```

## Ports

| Port | Service | TLS |
|------|---------|-----|
| 80 | HTTP (redirect to HTTPS) | No |
| 443 | nginx (reverse proxy) | Yes |
| 8765-8774 | Game servers | No (internal) |
| 8780 | Admin dashboard | No (internal) |
| 8782 | Private collection | No (internal) |
| 8783 | Hit counter | No (internal) |

External traffic goes through nginx on port 443. Internal servers bind to localhost only.

## Manual Certificate Setup

If the setup script doesn't work:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d magmacrunch.duckdns.org

# Test renewal
sudo certbot renew --dry-run
``` 
