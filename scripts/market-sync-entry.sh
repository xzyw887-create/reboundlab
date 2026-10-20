#!/usr/bin/env bash
# Каталог всех USDT-M пар, история 1m (5 лет или с листинга), затем дописывание новых минут.
set -uo pipefail

cd /app
export PYTHONPATH="/app/packages/exchange-sdk:/app/services/market-data${PYTHONPATH:+:$PYTHONPATH}"
export MARKET_DATA_MIN_HISTORY_DAYS="${MARKET_DATA_MIN_HISTORY_DAYS:-0}"
DAYS="${MARKET_HISTORY_DAYS:-1825}"

echo "market-sync start days=$DAYS min_history=$MARKET_DATA_MIN_HISTORY_DAYS $(date -u +%Y-%m-%dT%H:%M:%SZ)"

while true; do
  python3 -u services/market-data/sync/catalog.py || echo "catalog failed, retry after backfill attempt"
  python3 -u services/market-data/sync/historical.py 0 "$DAYS"
  code=$?
  if [ "$code" -eq 2 ]; then
    echo "disk low, retry backfill in 1h $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    sleep 3600
    continue
  fi
  if [ "$code" -ne 0 ]; then
    echo "backfill exit=$code, retry in 120s"
    sleep 120
    continue
  fi
  break
done

echo "history loaded, live tail $(date -u +%Y-%m-%dT%H:%M:%SZ)"
exec python3 -u services/market-data/sync/live_sync.py
