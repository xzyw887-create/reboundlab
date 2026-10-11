#!/usr/bin/env bash
# Публичный сайт на Fly.io (не нужен Mac включённым).
# Один раз: https://fly.io/app/sign-up → fly auth login
#
# Секреты (пароль из scripts/demo.env):
#   fly secrets set DATABASE_URL='postgresql://...@5432/postgres' \
#     JWT_SECRET='...' PROJECT_ROOT='/app' NODE_ENV='production'
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v fly >/dev/null 2>&1; then
  echo "→ Установка flyctl..."
  curl -L https://fly.io/install.sh | sh
  echo "→ Добавьте в PATH: export PATH=\"\$HOME/.fly/bin:\$PATH\""
  exit 1
fi

echo "→ Деплой на Fly.io (регион Singapore, ~5–10 мин)..."
fly launch --no-deploy --copy-config --name reboundlab-demo 2>/dev/null || true
fly deploy

echo ""
echo "→ URL: fly open"
echo "→ Проверка: /app  /register"
