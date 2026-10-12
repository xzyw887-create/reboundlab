#!/usr/bin/env bash
# Загрузка 1m свечей в production Postgres (VPS Docker или любой DATABASE_URL).
#
# На VPS после деплоя (из /opt/reboundlab, .env с POSTGRES_PASSWORD):
#   bash scripts/seed-production-market.sh
# или через Docker (сеть compose → postgres):
#   docker compose -f deploy/docker/docker-compose.prod.yml --profile seed run --rm market-seed
#
# Переопределения:
#   PROD_MARKET_DAYS=60 PROD_MARKET_SYMBOLS=BTCUSDT,ETHUSDT,SOLUSDT bash scripts/seed-production-market.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

if [ -z "${DATABASE_URL:-}" ] && [ -n "${POSTGRES_PASSWORD:-}" ]; then
  export DATABASE_URL="postgresql://reboundlab:${POSTGRES_PASSWORD}@postgres:5432/reboundlab"
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Задайте DATABASE_URL или POSTGRES_PASSWORD (и запускайте из сети docker compose, host postgres)."
  exit 1
fi

DAYS="${PROD_MARKET_DAYS:-60}"
SYMS="${PROD_MARKET_SYMBOLS:-BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT}"

echo "=== Market seed: ${SYMS} × ${DAYS} дней ==="

if command -v node >/dev/null 2>&1 && [ -f "$ROOT/scripts/migrate/apply-market-demo.js" ]; then
  echo "→ Схема market.* (идемпотентно)..."
  node scripts/migrate/apply-market-demo.js
else
  echo "→ Схема: пропуск (нет node — предполагаем, что apply-neon уже выполнен)"
fi

export PYTHONPATH="$ROOT/packages/exchange-sdk:$ROOT/services/market-data:${PYTHONPATH:-}"
echo "→ Backfill Binance 1m (может занять 10–40 мин для 5×60d)..."
bash services/market-data/run.sh backfill-symbols "$SYMS" "$DAYS"

python3 - <<'PY'
import os
import psycopg2

url = os.environ["DATABASE_URL"]
no_ssl = any(
    x in url
    for x in ("localhost", "127.0.0.1", "@postgres:", "postgresql://reboundlab:")
)
connect_kw = {} if no_ssl else {"sslmode": "require"}
conn = psycopg2.connect(url, **connect_kw)
cur = conn.cursor()
cur.execute(
    """
  SELECT tp.symbol, COUNT(c.open_time), MIN(c.open_time)::date, MAX(c.open_time)::date
  FROM market.candles c
  JOIN market.trading_pairs tp ON tp.id = c.pair_id
  WHERE c.timeframe = '1m'
  GROUP BY tp.symbol
  ORDER BY tp.symbol
"""
)
rows = cur.fetchall()
print("\nГотово — свечи в БД:")
for sym, cnt, d0, d1 in rows:
    print(f"  {sym}: {cnt:,} ({d0} — {d1})")
if not rows:
    print("  (нет строк — проверьте DATABASE_URL и логи backfill)")
conn.close()
PY
