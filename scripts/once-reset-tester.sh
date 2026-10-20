#!/bin/bash
# Один раз на сервере: убрать тестовые override цен и удалить аккаунт wasya_8,
# чтобы следующий вход через Telegram создал обычного пользователя.
# Повторные деплои не трогают уже созданный аккаунт.
set -euo pipefail

ROOT="${1:-/opt/reboundlab}"
PHASE="${2:-all}"
MARKER="/var/lib/reboundlab-tester-reset-done"

if [ -f "$MARKER" ]; then
  echo "tester reset already done"
  exit 0
fi

cd "$ROOT"

if [ "$PHASE" = "env" ] || [ "$PHASE" = "all" ]; then
  python3 - << 'PY'
from pathlib import Path
path = Path(".env")
if not path.exists():
    raise SystemExit("missing .env")
drop = {
    "BILLING_CHARGE_BASIC_RUB",
    "BILLING_CHARGE_PRO_RUB",
    "NEXT_PUBLIC_BILLING_CHARGE_BASIC_RUB",
    "NEXT_PUBLIC_BILLING_CHARGE_PRO_RUB",
    "BILLING_FLOW_PREVIEW_TELEGRAM",
}
kept = []
removed = 0
for line in path.read_text().splitlines(True):
    name = line.split("=", 1)[0].strip()
    if name.startswith("export "):
        name = name[len("export "):].strip()
    if name in drop:
        removed += 1
        continue
    kept.append(line)
path.write_text("".join(kept))
print(f"cleared {removed} billing override lines")
PY
fi

if [ "$PHASE" = "user" ] || [ "$PHASE" = "all" ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  ready=0
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
    if docker compose -f deploy/docker/docker-compose.prod.yml exec -T postgres \
      pg_isready -U reboundlab -d reboundlab >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 5
  done
  if [ "$ready" != "1" ]; then
    echo "postgres is not ready" >&2
    exit 1
  fi
  docker compose -f deploy/docker/docker-compose.prod.yml exec -T postgres \
    psql -U reboundlab -d reboundlab -v ON_ERROR_STOP=1 << 'SQL'
DO $$
DECLARE
  uid uuid;
  rec record;
BEGIN
  SELECT id INTO uid
  FROM core.users
  WHERE lower(regexp_replace(coalesce(telegram_username, ''), '^@', '')) = 'wasya_8'
  LIMIT 1;

  IF uid IS NULL THEN
    RAISE NOTICE 'tester account absent';
    RETURN;
  END IF;

  FOR rec IN
    SELECT n.nspname AS schema_name, c.relname AS table_name, a.attname AS column_name
    FROM pg_constraint co
    JOIN pg_class c ON c.oid = co.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY (co.conkey)
    JOIN pg_class rc ON rc.oid = co.confrelid
    JOIN pg_namespace rn ON rn.oid = rc.relnamespace
    WHERE co.contype = 'f'
      AND rn.nspname = 'core'
      AND rc.relname = 'users'
  LOOP
    EXECUTE format(
      'DELETE FROM %I.%I WHERE %I = $1',
      rec.schema_name,
      rec.table_name,
      rec.column_name
    ) USING uid;
  END LOOP;

  DELETE FROM core.users WHERE id = uid;
  RAISE NOTICE 'tester account removed';
END $$;
SQL
  touch "$MARKER"
  echo "tester account reset marked done"
fi
