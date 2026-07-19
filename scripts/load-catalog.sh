#!/usr/bin/env bash
# Каталог всех USDT perpetual пар Binance с историей >= N дней (по умолчанию 90 = 3 мес.)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

DAYS="${1:-90}"
export MARKET_DATA_MIN_HISTORY_DAYS="$DAYS"
export DATABASE_URL="${DATABASE_URL:-postgresql://reboundlab:reboundlab@localhost:5432/reboundlab}"

echo "→ Синхронизация каталога Binance (история >= ${DAYS} дней)..."
echo "  Это может занять 5–15 минут (проверка каждой пары на бирже)."
bash services/market-data/run.sh catalog

python3 - <<'PY'
import os, psycopg2
url = os.environ.get("DATABASE_URL")
conn = psycopg2.connect(url)
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM market.trading_pairs WHERE is_active")
total = cur.fetchone()[0]
cur.execute("""
  SELECT COUNT(DISTINCT tp.symbol)
  FROM market.candles c
  JOIN market.trading_pairs tp ON tp.id = c.pair_id
  WHERE c.timeframe = '1m'
""")
loaded = cur.fetchone()[0]
conn.close()
print(f"→ В каталоге: {total} пар | Свечи уже загружены: {loaded}")
print("→ Для загрузки свечей: bash scripts/load-market-data.sh 90 all")
PY
