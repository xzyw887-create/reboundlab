#!/usr/bin/env bash
# 12+ часов: backfill 1095d с caffeinate и автоперезапуском при падении
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p logs

HOURS="${1:-12}"
DAYS="${2:-1095}"
LOG="$ROOT/logs/backfill-marathon.log"
STATUS="$ROOT/logs/backfill-marathon-status.txt"

echo "Marathon start $(date -u +%Y-%m-%dT%H:%M:%SZ) hours=$HOURS days=$DAYS" | tee -a "$LOG"

end_epoch=$(($(date +%s) + HOURS * 3600))
run=0

while [ "$(date +%s)" -lt "$end_epoch" ]; do
  run=$((run + 1))
  echo "=== Run #$run $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" | tee -a "$LOG"

  if bash "$ROOT/scripts/backfill-all-daemon.sh" "$DAYS" >> "$LOG" 2>&1; then
    echo "=== Backfill finished OK $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" | tee -a "$LOG"
    bash "$ROOT/scripts/backfill-status.sh" >> "$LOG" 2>&1 || true
    echo "COMPLETE $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$STATUS"
    exit 0
  fi

  echo "Run #$run failed, retry in 60s..." | tee -a "$LOG"
  bash "$ROOT/scripts/backfill-status.sh" > "$STATUS" 2>&1 || true
  sleep 60
done

echo "=== Marathon time limit $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" | tee -a "$LOG"
bash "$ROOT/scripts/backfill-status.sh" | tee -a "$LOG"
echo "TIMEOUT $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$STATUS"
