#!/usr/bin/env bash
# Запуск Docker + загрузка цен для варианта A (реальные данные)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export DOCKER_HOST="${DOCKER_HOST:-unix://${HOME}/.colima/default/docker.sock}"

if ! docker info >/dev/null 2>&1; then
  echo "→ Запускаю Colima (Docker)..."
  colima start --cpu 2 --memory 4 --disk 20
fi

echo "→ Запуск PostgreSQL + Redis..."
docker compose -f deploy/docker/docker-compose.dev.yml up -d

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi
export DATABASE_URL="${DATABASE_URL:-postgresql://reboundlab:reboundlab@localhost:5432/reboundlab}"

echo "→ Проверка свечей в базе..."
COUNT=$(docker exec reboundlab-postgres psql -U reboundlab -d reboundlab -tAc \
  "SELECT COUNT(*) FROM market.candles" 2>/dev/null || echo "0")

if [ "${COUNT:-0}" -lt 1000 ]; then
  echo "→ Загружаю BTC, ETH, SOL за 7 дней с Binance..."
  bash services/market-data/run.sh backfill 3 7
else
  echo "→ В базе уже есть свечи ($COUNT шт.)"
fi

echo ""
echo "Готово. Запустите интерфейс:"
echo "  cd $ROOT && npm run web:dev"
echo "  http://localhost:3000"
