#!/bin/bash
set -e

cd ~/audira-api

echo "=== Step 1: Patch nodemailer + dependencies ==="
docker run --rm -u $(id -u):$(id -g) -v "$PWD":/app -w /app node:20-alpine npm audit fix --force 2>&1 | tail -5

echo ""
echo "=== Step 2: Verify package-lock updated ==="
grep -A2 '"nodemailer"' package-lock.json | head -3

echo ""
echo "=== Step 3: Rebuild Docker image with patched deps ==="
docker compose build --no-cache 2>&1 | tail -20

echo ""
echo "=== Step 4: Stop current containers ==="
docker compose down

echo ""
echo "=== Step 5: Setup Nginx + self-signed cert ==="
echo "Sigma1993" | sudo -S apt-get update -qq && echo "Sigma1993" | sudo -S apt-get install -y nginx-full openssl > /dev/null 2>&1
echo "✓ Nginx installed"

echo "Sigma1993" | sudo -S mkdir -p /etc/nginx/ssl
echo "Sigma1993" | sudo -S openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/audira-api.key \
  -out /etc/nginx/ssl/audira-api.crt \
  -subj "/C=ID/ST=Jakarta/L=Jakarta/O=Audira/CN=audira.local" 2>/dev/null
echo "✓ Self-signed cert generated"

echo ""
echo "=== Step 6: Configure Nginx reverse proxy ==="
echo "Sigma1993" | sudo -S tee /etc/nginx/sites-available/audira-api > /dev/null << 'EOFNGINX'
upstream api_backend {
    server 127.0.0.1:5000;
}

# HTTPS + HTTP/2
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name audira.local *.audira.local;

    ssl_certificate /etc/nginx/ssl/audira-api.crt;
    ssl_certificate_key /etc/nginx/ssl/audira-api.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port 443;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /health {
        proxy_pass http://api_backend/health;
    }
}

# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name audira.local *.audira.local;
    return 301 https://$server_name$request_uri;
}
EOFNGINX
echo "✓ Nginx config written"

echo "Sigma1993" | sudo -S ln -sf /etc/nginx/sites-available/audira-api /etc/nginx/sites-enabled/audira-api
echo "Sigma1993" | sudo -S rm -f /etc/nginx/sites-enabled/default
echo "Sigma1993" | sudo -S nginx -t && echo "✓ Nginx config validated"

echo ""
echo "=== Step 7: Start services ==="
docker compose up -d
echo "Sigma1993" | sudo -S systemctl restart nginx
echo "✓ Services started"

echo ""
echo "=== Verification ==="
docker compose ps
echo ""
echo "curl health endpoint:"
curl -sk https://127.0.0.1/health 2>/dev/null | head -c 150
echo ""
echo ""
echo "✅ HARDENING COMPLETE"
echo "🔒 API now behind Nginx HTTPS reverse proxy"
echo "📍 Access: https://audira.local/health (or https://127.0.0.1/health)"
