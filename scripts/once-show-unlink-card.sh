#!/usr/bin/env bash
# Один раз показывает в кабинете @wasya_8 карту, чтобы снять отвязку.
# В ЮKassa эта карта не сохраняется и в списание не попадает.
set -euo pipefail

MARKER=/var/lib/reboundlab-unlink-screenshot-card
if [ -f "$MARKER" ]; then
  echo "unlink screenshot card already placed"
  exit 0
fi

cid="$(docker ps -qf name=postgres | head -1)"
if [ -z "$cid" ]; then
  echo "postgres container not found"
  exit 1
fi

docker exec -i "$cid" psql -U reboundlab -d reboundlab -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO core.saved_payment_methods
  (user_id, yookassa_method_id, method_type, title, status, purpose)
SELECT u.id, 'local-screenshot-wasya8', 'bank_card', 'Карта •••• 4242', 'active', 'screenshot'
FROM core.users u
WHERE lower(u.telegram_username) = 'wasya_8'
ON CONFLICT (yookassa_method_id) DO UPDATE
SET status = 'active',
    title = EXCLUDED.title,
    method_type = EXCLUDED.method_type,
    purpose = EXCLUDED.purpose,
    user_id = EXCLUDED.user_id;
SQL

count="$(docker exec "$cid" psql -U reboundlab -d reboundlab -tA -c "SELECT COUNT(*) FROM core.saved_payment_methods WHERE yookassa_method_id = 'local-screenshot-wasya8' AND status = 'active';" | tr -d '[:space:]')"
if [ "$count" != "1" ]; then
  echo "wasya_8 account not found, card not shown"
  exit 1
fi

touch "$MARKER"
echo "screenshot card visible for wasya_8"
