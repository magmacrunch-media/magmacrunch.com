#!/bin/bash
# setup-ssl.sh — Install nginx + Let's Encrypt SSL for magmacrunch.duckdns.org
# Run on the Pi: sudo bash arcade/scripts/setup-ssl.sh

set -e

echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║  MAGMACRUNCH SSL SETUP — nginx + Let's Encrypt ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""

# 1. Install nginx
echo "→ Installing nginx..."
apt update -qq
apt install -y nginx

# 2. Install certbot
echo "→ Installing certbot..."
apt install -y certbot python3-certbot-nginx

# 3. Copy nginx config
echo "→ Configuring nginx..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cp "$SCRIPT_DIR/nginx-magmacrunch.conf" /etc/nginx/sites-available/magmacrunch
ln -sf /etc/nginx/sites-available/magmacrunch /etc/nginx/sites-enabled/

# Remove default site if it exists
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t

# 4. Start nginx
echo "→ Starting nginx..."
systemctl enable nginx
systemctl restart nginx

# 5. Get SSL certificate
echo "→ Requesting SSL certificate from Let's Encrypt..."
echo "   (This may take a minute...)"
certbot --nginx -d magmacrunch.duckdns.org --non-interactive --agree-tos --email magmacrunchmedia@gmail.com

# 6. Set up auto-renewal
echo "→ Setting up auto-renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer

# 7. Verify
echo ""
echo "→ Verifying..."
curl -s -o /dev/null -w "HTTPS status: %{http_code}\n" https://magmacrunch.duckdns.org || echo "  (may take a moment for DNS to propagate)"

echo ""
echo "  ✓ SSL setup complete!"
echo "  ✓ Certificate auto-renews via certbot timer"
echo "  ✓ nginx proxies HTTPS → localhost:8768 (chat server)"
echo ""
echo "  Port forwarding needed:"
echo "    Router → Pi: port 443 (HTTPS)"
echo "    (existing game server ports 8765-8774 remain as-is)"
echo ""
