#!/usr/bin/env bash
# ReboundLab: Apply database schemas in order
set -euo pipefail

DB_URL="${DATABASE_URL:-postgresql://reboundlab:reboundlab@localhost:5432/reboundlab}"
SCHEMAS_DIR="$(dirname "$0")/../../database/schemas"
TIMESCALE_DIR="$(dirname "$0")/../../database/timescale"

echo "Applying schemas to $DB_URL"

for f in "$SCHEMAS_DIR"/01_core.sql "$SCHEMAS_DIR"/02_market.sql; do
  echo "→ $f"
  psql "$DB_URL" -f "$f"
done

echo "→ timescale hypertables"
psql "$DB_URL" -f "$TIMESCALE_DIR/hypertables.sql"

echo "→ backtest schema"
psql "$DB_URL" -f "$SCHEMAS_DIR/03_backtest.sql"

if [ -f "$SCHEMAS_DIR/04_funding_rates.sql" ]; then
  echo "→ funding rates"
  psql "$DB_URL" -f "$SCHEMAS_DIR/04_funding_rates.sql"
fi

echo "Done."
