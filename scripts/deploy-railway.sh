#!/usr/bin/env bash
# Деплой полного сайта (Next.js + Python-бэктест) на Railway — без GitHub.
#
# Один раз:
#   1. brew install railway   ИЛИ   npm i -g @railway/cli
#   2. railway login          (откроется браузер)
#   3. railway init           (New project → имя reboundlab)
#
# Переменные (порт 5432 для Supabase):
#   railway variables --set "DATABASE_URL=postgresql://postgres.xwclvdckofcvnwkaqemq:ПАРОЛЬ@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
#   railway variables --set "JWT_SECRET=ваш-jwt-секрет-как-на-vercel"
#   railway variables --set "PROJECT_ROOT=/app"
#   railway variables --set "NODE_ENV=production"
#
# Деплой:
#   bash scripts/deploy-railway.sh
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v railway >/dev/null 2>&1; then
  echo "→ Устанавливаю Railway CLI..."
  npm install -g @railway/cli
fi

echo "→ Деплой Docker (Node + Python) на Railway..."
railway up --detach

echo ""
echo "→ URL: railway open   (или Dashboard → Settings → Domains)"
echo "→ Проверка: /register  /app  (BTC ETH SOL + бэктест)"
