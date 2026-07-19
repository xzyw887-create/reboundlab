#!/usr/bin/env bash
# Демо-облако: market-схема + 3 монеты × 30 дней в Supabase (малый объём).
#
# Использование — Session pooler (порт 5432, не 6543!):
#   DATABASE_URL='postgresql://postgres.xwclvdckofcvnwkaqemq:...@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' \
#   bash scripts/demo-cloud-setup.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Ошибка: задайте DATABASE_URL (Supabase pooler, порт 6543)"
  exit 1
fi

export PYTHONPATH="$ROOT/packages/exchange-sdk:$ROOT/services/market-data:${PYTHONPATH:-}"
DAYS="${1:-30}"
SYMS="${2:-BTCUSDT,ETHUSDT,SOLUSDT}"

echo "→ 1/2  Таблицы market.* в Supabase..."
node scripts/migrate/apply-market-demo.js

echo "→ 2/2  Загрузка ${SYMS} × ${DAYS} дней (1m свечи)..."
bash services/market-data/run.sh backfill-symbols "$SYMS" "$DAYS"

python3 - <<'PY'
import os, psycopg2
url = os.environ["DATABASE_URL"]
conn = psycopg2.connect(url, sslmode="require")
cur = conn.cursor()
cur.execute("""
  SELECT tp.symbol, COUNT(c.open_time), MIN(c.open_time)::date, MAX(c.open_time)::date
  FROM market.candles c
  JOIN market.trading_pairs tp ON tp.id = c.pair_id
  WHERE c.timeframe = '1m'
  GROUP BY tp.symbol
  ORDER BY tp.symbol
""")
print("\nГотово — свечи в Supabase:")
for sym, cnt, d0, d1 in cur.fetchall():
    print(f"  {sym}: {cnt:,} свечей ({d0} — {d1})")
conn.close()
PY

echo ""
echo "Дальше: деплой на Render (см. docs/DEMO_CLOUD.md) с тем же DATABASE_URL и JWT_SECRET."
