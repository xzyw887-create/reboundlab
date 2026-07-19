#!/usr/bin/env bash
# Загрузка монет и расширение периода в базе данных
#
# Примеры:
#   bash scripts/load-market-data.sh              # 20 популярных × 30 дней
#   bash scripts/load-market-data.sh 90           # 20 популярных × 90 дней
#   bash scripts/load-market-data.sh 90 all       # ВСЕ монеты из каталога × 90 дней (долго!)
#   bash scripts/load-market-data.sh 365 BTCUSDT  # одна монета × 1 год
#   bash scripts/load-market-data.sh 1095 BTCUSDT,ETHUSDT  # ~3 года
#
# Перед «all» сначала: bash scripts/load-catalog.sh 90
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi
export DATABASE_URL="${DATABASE_URL:-postgresql://reboundlab:reboundlab@localhost:5432/reboundlab}"
export PYTHONPATH="$ROOT/packages/exchange-sdk:$ROOT/services/market-data:${PYTHONPATH:-}"

DAYS="${1:-30}"
TARGET="${2:-}"

echo "→ Загрузка 1m свечей Binance Futures (${DAYS} дней)..."
if [ "$TARGET" = "all" ]; then
  echo "  Режим: все активные пары из каталога (может занять часы)"
  bash services/market-data/run.sh backfill "" "$DAYS"
elif [ -n "$TARGET" ]; then
  bash services/market-data/run.sh backfill-symbols "$TARGET" "$DAYS"
else
  bash services/market-data/run.sh backfill-symbols "" "$DAYS"
fi

echo "→ Обновление до текущего момента..."
bash services/market-data/run.sh live

echo ""
echo "Готово. Проверка:"
python3 - <<'PY'
import os, psycopg2
url = os.environ.get("DATABASE_URL")
conn = psycopg2.connect(url)
cur = conn.cursor()
cur.execute("""
  SELECT COUNT(DISTINCT tp.symbol), MIN(c.open_time)::date, MAX(c.open_time)::date, COUNT(*)
  FROM market.candles c
  JOIN market.trading_pairs tp ON tp.id = c.pair_id
  WHERE c.timeframe = '1m'
""")
row = cur.fetchone()
print(f"  Монет: {row[0]} | Период: {row[1]} — {row[2]} | Свечей: {row[3]:,}")
conn.close()
PY

echo ""
echo "Откройте http://localhost:3000 — монеты появятся в списке."
