#!/usr/bin/env bash
# First boot on Sprinthost VPS (Ubuntu). Run as root in /opt/reboundlab
set -euo pipefail

cd /opt/reboundlab

if [ ! -f .env ]; then
  echo "Create .env with POSTGRES_PASSWORD, JWT_SECRET, NEXT_PUBLIC_APP_URL"
  exit 1
fi

set -a
# shellcheck source=/dev/null
source .env
set +a

if [ -z "${POSTGRES_PASSWORD:-}" ] || [ -z "${JWT_SECRET:-}" ]; then
  echo "POSTGRES_PASSWORD and JWT_SECRET required in .env"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y docker.io docker-compose-v2
fi

echo "→ Starting Postgres + web..."
docker compose -f deploy/docker/docker-compose.prod.yml up -d --build

echo "→ Waiting for Postgres..."
sleep 8

NET=$(docker compose -f deploy/docker/docker-compose.prod.yml ps -q postgres | xargs docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}')

echo "→ DB migrate..."
docker run --rm --network "$NET" \
  -v "$PWD:/app" -w /app \
  -e DATABASE_URL="postgresql://reboundlab:${POSTGRES_PASSWORD}@postgres:5432/reboundlab" \
  node:20-bookworm-slim \
  bash -c "npm ci --include-workspace-root --omit=dev 2>/dev/null || npm ci --include-workspace-root; node scripts/migrate/apply-neon.js"

echo "→ HTTPS (Caddy)..."
DOMAIN="${NEXT_PUBLIC_APP_URL:-https://backtestpro.ru}"
DOMAIN="${DOMAIN#https://}"
DOMAIN="${DOMAIN#http://}"
DOMAIN="${DOMAIN%%/*}"
if ! command -v caddy >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq && apt-get install -y caddy
fi
cat >/etc/caddy/Caddyfile <<EOF
${DOMAIN}, www.${DOMAIN} {
    reverse_proxy 127.0.0.1:8080
}
EOF
systemctl enable caddy
systemctl reload caddy || systemctl restart caddy

echo "Done. Open https://${DOMAIN}/api/health"
echo "REG.RU: A @ and www → $(curl -4 -s ifconfig.me 2>/dev/null || true)"
