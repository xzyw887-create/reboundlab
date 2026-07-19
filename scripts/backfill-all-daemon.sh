#!/usr/bin/env bash
# Долгий backfill всех пар — лог в logs/backfill-1095-all.log
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p logs

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

export DATABASE_URL="${DATABASE_URL:-postgresql://reboundlab:reboundlab@localhost:5432/reboundlab}"
export PYTHONPATH="$ROOT/packages/exchange-sdk:$ROOT/services/market-data:${PYTHONPATH:-}"

DAYS="${1:-1095}"
LOG="$ROOT/logs/backfill-${DAYS}-all.log"

{
  echo "=== Backfill start $(date -u +%Y-%m-%dT%H:%M:%SZ) days=$DAYS ==="
  python3 -u services/market-data/sync/historical.py 0 "$DAYS"
  echo "=== Live sync $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
  bash services/market-data/run.sh live
  echo "=== Done $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
  python3 - <<'PY'
import os, psycopg2
url = os.environ.get("DATABASE_URL")
conn = psycopg2.connect(url)
cur = conn.cursor()
cur.execute("""
  SELECT
    COUNT(*) FILTER (WHERE cnt >= 1500000),
    COUNT(*) FILTER (WHERE cnt >= 500000 AND cnt < 1500000),
    COUNT(*) FILTER (WHERE cnt < 500000),
    COUNT(*)
  FROM (
    SELECT pair_id, COUNT(*) AS cnt
    FROM market.candles WHERE timeframe = '1m'
    GROUP BY pair_id
  ) s
""")
row = cur.fetchone()
print(f"Full3y: {row[0]} | partial: {row[1]} | shallow: {row[2]} | pairs: {row[3]}")
conn.close()
PY
} >> "$LOG" 2>&1
