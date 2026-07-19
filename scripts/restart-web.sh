#!/usr/bin/env bash
# Перезапуск веба при «слетевшем» оформлении (битый кэш Next.js)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ Останавливаем порт 3000…"
lsof -ti :3000 | xargs kill -9 2>/dev/null || true
sleep 1

echo "→ Очищаем кэш .next…"
rm -rf apps/web/.next

echo "→ Запуск npm run web:dev…"
npm run web:dev
