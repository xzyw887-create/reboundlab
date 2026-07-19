#!/usr/bin/env bash
# ReboundLab Market Data CLI
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$DIR/../.." && pwd)"
cd "$DIR"

if [ -f "$ROOT/.env" ]; then
  set -a
  source "$ROOT/.env"
  set +a
fi

export PYTHONPATH="$ROOT/packages/exchange-sdk:$DIR:${PYTHONPATH:-}"

CMD="${1:-}"

case "$CMD" in
  catalog)
    python3 sync/catalog.py
    ;;
  backfill)
    LIMIT="${2:-}"
    DAYS="${3:-7}"
    if [ -n "$LIMIT" ]; then
      python3 sync/historical.py "$LIMIT" "$DAYS"
    else
      python3 sync/historical.py "" "$DAYS"
    fi
    ;;
  live)
    python3 sync/live_sync.py --once
    ;;
  live-loop)
    python3 sync/live_sync.py
    ;;
  backfill-symbols)
    DAYS="${3:-30}"
    SYMBOLS="${2:-}"
    if [ -n "$SYMBOLS" ]; then
      python3 sync/backfill_symbols.py "$SYMBOLS" "$DAYS"
    else
      python3 sync/backfill_symbols.py "" "$DAYS"
    fi
    ;;
  *)
    echo "Usage: $0 {catalog|backfill [limit] [days]|backfill-symbols [SYMS] [days]|live|live-loop}"
    exit 1
    ;;
esac
