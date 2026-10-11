#!/usr/bin/env bash
# Run ON Timeweb VPS (Ubuntu) as root after project is in /opt/reboundlab
# Usage: bash scripts/timeweb-server-install.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/reboundlab}"
cd "$APP_DIR"

if [ ! -f "$APP_DIR/.env" ]; then
  echo "Создайте $APP_DIR/.env (скопируйте scripts/production.env.example)"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "→ Installing Docker..."
  curl -fsSL https://get.docker.com | sh
fi

echo "→ Building image (5–15 min)..."
docker build -f deploy/docker/Dockerfile.web -t backtestpro-web .

docker stop backtestpro 2>/dev/null || true
docker rm backtestpro 2>/dev/null || true

echo "→ Starting container..."
docker run -d --name backtestpro --restart unless-stopped \
  --env-file "$APP_DIR/.env" \
  -p 127.0.0.1:8080:8080 \
  backtestpro-web

echo "→ Health check..."
sleep 3
curl -sf "http://127.0.0.1:8080/api/health" && echo ""

if ! command -v caddy >/dev/null 2>&1; then
  echo "→ Installing Caddy (HTTPS)..."
  apt-get update -qq
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq && apt-get install -y caddy
fi

DOMAIN="${NEXT_PUBLIC_APP_URL:-https://backtestpro.ru}"
DOMAIN="${DOMAIN#https://}"
DOMAIN="${DOMAIN#http://}"
DOMAIN="${DOMAIN%%/*}"

cat >/etc/caddy/Caddyfile <<EOF
${DOMAIN}, www.${DOMAIN} {
    reverse_proxy 127.0.0.1:8080
}
EOF

systemctl enable caddy
systemctl reload caddy || systemctl restart caddy

echo ""
echo "Done. Open https://${DOMAIN}/api/health"
echo "REG.RU DNS: A @ and www → $(curl -4 -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
