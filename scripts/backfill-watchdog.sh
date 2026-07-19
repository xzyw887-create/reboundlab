#!/usr/bin/env bash
# Без лимита времени: backfill до полной загрузки, автоперезапуск при падении
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p logs

# HOURS=0 или unset → без ограничения по времени (до полной загрузки)
HOURS="${1:-0}"
DAYS="${2:-1095}"
LOG="$ROOT/logs/backfill-watchdog.log"
DATA_LOG="$ROOT/logs/backfill-1095-all.log"

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi
export DATABASE_URL="${DATABASE_URL:-postgresql://reboundlab:reboundlab@localhost:5432/reboundlab}"
export PYTHONPATH="$ROOT/packages/exchange-sdk:$ROOT/services/market-data:${PYTHONPATH:-}"

if [ "$HOURS" = "0" ] || [ -z "$HOURS" ]; then
  end_epoch=0
  echo "Watchdog start $(date -u +%Y-%m-%dT%H:%M:%SZ) mode=until_complete days=$DAYS" | tee -a "$LOG"
else
  end_epoch=$(($(date +%s) + HOURS * 3600))
  echo "Watchdog start $(date -u +%Y-%m-%dT%H:%M:%SZ) hours=$HOURS days=$DAYS" | tee -a "$LOG"
fi

shallow_pairs() {
  docker exec reboundlab-postgres psql -U reboundlab -d reboundlab -t -A -c "
    SELECT COUNT(*) FROM (
      SELECT pair_id FROM market.candles WHERE timeframe='1m'
      GROUP BY pair_id HAVING COUNT(*) < 500000
    ) s;" 2>/dev/null | tr -d '[:space:]' || echo "999"
}

start_backfill() {
  echo "Launch historical.py $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$LOG"
  echo "=== Backfill start $(date -u +%Y-%m-%dT%H:%M:%SZ) days=$DAYS ===" >> "$DATA_LOG"
  python3 -u services/market-data/sync/historical.py 0 "$DAYS" >> "$DATA_LOG" 2>&1
  local code=$?
  echo "historical.py exit=$code $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$LOG"
  return "$code"
}

timed_out() {
  [ "$end_epoch" -gt 0 ] && [ "$(date +%s)" -ge "$end_epoch" ]
}

while ! timed_out; do
  if pgrep -f "historical.py 0 $DAYS" >/dev/null 2>&1; then
    sleep 120
    continue
  fi

  if start_backfill; then
    shallow="$(shallow_pairs)"
    bash "$ROOT/scripts/backfill-status.sh" >> "$LOG" 2>&1 || true
    echo "Pass done, shallow_pairs=$shallow $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$LOG"

    if [ "$shallow" = "0" ] || [ "$shallow" -lt 5 ]; then
      echo "Backfill complete, live sync..." >> "$LOG"
      bash services/market-data/run.sh live >> "$DATA_LOG" 2>&1 || true
      bash "$ROOT/scripts/backfill-status.sh" >> "$LOG" 2>&1 || true
      echo "All done $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$LOG"
      exit 0
    fi

    echo "Next pass in 30s ($shallow pairs still shallow)..." >> "$LOG"
    sleep 30
  else
    echo "Retry in 90s..." >> "$LOG"
    sleep 90
  fi
done

bash "$ROOT/scripts/backfill-status.sh" >> "$LOG" 2>&1 || true
echo "Watchdog hours limit reached, restarting unlimited... $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$LOG"
exec bash "$0" 0 "$DAYS"
