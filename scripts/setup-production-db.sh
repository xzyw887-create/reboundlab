#!/usr/bin/env bash
# Apply DB schema to remote Postgres (Timeweb / Supabase / any).
# Usage:
#   DATABASE_URL='postgresql://...' bash scripts/setup-production-db.sh
#   DATABASE_URL='...' bash scripts/setup-production-db.sh --with-demo-candles
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Задайте DATABASE_URL (строка из Timeweb → PostgreSQL → Подключение):"
  echo "  export DATABASE_URL='postgresql://user:pass@host:5432/dbname'"
  exit 1
fi

echo "→ Миграция схем (users, plans, market, history)..."
node scripts/migrate/apply-neon.js

if [ "${1:-}" = "--with-demo-candles" ]; then
  echo "→ Загрузка BTC/ETH/SOL × 30 дней (может занять несколько минут)..."
  bash scripts/demo-cloud-setup.sh 30
fi

echo ""
echo "Готово. DATABASE_URL можно использовать на сервере приложения."
