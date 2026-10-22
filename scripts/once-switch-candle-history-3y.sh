#!/usr/bin/env bash
# Один раз пересобирает загрузчик свечей на окно 3 года (1095 дней).
# Postgres и уже скачанные минуты не трогает. Повторный деплой загрузчик не перезапускает.
set -euo pipefail

ROOT="${1:-/opt/reboundlab}"
MARKER=/var/lib/reboundlab-candle-history-1095
cd "$ROOT"

if [ -f "$MARKER" ]; then
  echo "candle history already set to 3 years"
  exit 0
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

docker compose -f deploy/docker/docker-compose.prod.yml up -d --build market-sync
touch "$MARKER"
echo "candle loader restarted for 1095 days"
