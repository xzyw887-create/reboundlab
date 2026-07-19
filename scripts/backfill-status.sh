#!/usr/bin/env bash
# Быстрая статистика глубины загрузки (лёгкий запрос, не блокирует backfill)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export DATABASE_URL="${DATABASE_URL:-postgresql://reboundlab:reboundlab@localhost:5432/reboundlab}"

docker exec reboundlab-postgres psql -U reboundlab -d reboundlab -c "
SELECT
  COUNT(*) FILTER (WHERE cnt >= 1500000) AS \"~3 года (>=1.5M)\",
  COUNT(*) FILTER (WHERE cnt >= 500000 AND cnt < 1500000) AS \"частично\",
  COUNT(*) FILTER (WHERE cnt < 500000) AS \"мало данных\",
  COUNT(*) AS \"всего пар\"
FROM (
  SELECT pair_id, COUNT(*) AS cnt
  FROM market.candles WHERE timeframe = '1m'
  GROUP BY pair_id
) s;
"

echo ""
if [ -f "$ROOT/logs/backfill-1095-all.log" ]; then
  echo "Последние строки лога:"
  grep -E '^\[[0-9]+/375\]|Backfill (start|complete)|^=== ' "$ROOT/logs/backfill-1095-all.log" | tail -5
fi

ps aux | grep -E "historical.py 0 1095" | grep -v grep && echo "→ backfill работает" || echo "→ backfill не запущен"
