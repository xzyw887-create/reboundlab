#!/usr/bin/env bash
# Production deploy helper — Neon DB + Railway (full Next.js + Python backtest).
#
# Prerequisites (you do once):
#   1. Neon project + DATABASE_URL
#   2. npm run db:migrate:neon with that URL
#   3. railway login && railway init
#   4. Domain in Cloudflare (optional until custom domain step)
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== BackTest Pro — production deploy ==="
echo ""

if ! command -v railway >/dev/null 2>&1; then
  echo "Railway CLI not found. Install:"
  echo "  npm install -g @railway/cli"
  echo "  railway login"
  exit 1
fi

if ! railway whoami >/dev/null 2>&1; then
  echo "Not logged in to Railway. Run: railway login"
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Set DATABASE_URL (Neon pooled) for this shell, e.g.:"
  echo "  export DATABASE_URL='postgresql://...pooler.../neondb?sslmode=require'"
  echo ""
  read -r -p "Paste DATABASE_URL now (or Ctrl+C): " DATABASE_URL
  export DATABASE_URL
fi

if [ -z "${JWT_SECRET:-}" ]; then
  if command -v openssl >/dev/null 2>&1; then
    JWT_SECRET="$(openssl rand -hex 32)"
    echo "Generated JWT_SECRET (save it): $JWT_SECRET"
  else
    read -r -p "JWT_SECRET (32+ chars): " JWT_SECRET
  fi
  export JWT_SECRET
fi

APP_URL="${NEXT_PUBLIC_APP_URL:-}"
if [ -z "$APP_URL" ]; then
  read -r -p "Public APP URL (https://your-domain.com): " APP_URL
fi

echo ""
echo "→ Applying DB schema to Neon..."
node scripts/migrate/apply-neon.js

echo ""
echo "→ Setting Railway variables..."
railway variables set \
  "DATABASE_URL=${DATABASE_URL}" \
  "JWT_SECRET=${JWT_SECRET}" \
  "PROJECT_ROOT=/app" \
  "NODE_ENV=production" \
  "NEXT_PUBLIC_APP_URL=${APP_URL}"

echo ""
echo "→ Deploying Docker image (5–15 min)..."
railway up --detach

echo ""
echo "=== Done ==="
echo "  railway open          — temporary *.up.railway.app URL"
echo "  railway domain        — add custom domain"
echo "  Cloudflare CNAME      — point domain to Railway"
echo ""
echo "Verify:"
echo "  curl -sS \$(railway domain 2>/dev/null || echo 'YOUR_URL')/api/health"
echo "  /register  /app  /account"
