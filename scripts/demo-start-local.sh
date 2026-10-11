#!/usr/bin/env bash
# Локальный сайт + Python (для tunnel). Пароль — в scripts/demo.env (редактор, не терминал).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="$ROOT/scripts/demo.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "Создайте файл scripts/demo.env — скопируйте scripts/demo.env.example"
  echo "В Cursor откройте demo.env.example → Cmd+A Cmd+C → новый файл demo.env → Cmd+V"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
export PROJECT_ROOT="${PROJECT_ROOT:-$ROOT}"

echo "→ Postgres (если ещё не запущен)..."
npm run docker:up

echo "→ Сайт (dev): http://localhost:3000/app"
echo "→ Первый запуск списка монет может занять ~1 мин"
npm run dev --workspace=@reboundlab/web
