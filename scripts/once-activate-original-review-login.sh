#!/usr/bin/env bash
# Старый почтовый аккаунт для ЮKassa: пароль не меняем, вход оставляем рабочим.
# Если подписка уже кончилась, кабинет снова показывает активный тариф и карту.
# Повторный деплой пароль и уже отвязанную карту не трогает.
set -euo pipefail

ROOT="${1:-/opt/reboundlab}"
EMAIL="xzyw@mail.ru"
MARKER="/var/lib/reboundlab-original-review-login"
cd "$ROOT"

if [ -f "$MARKER" ]; then
  echo "original review login already active"
  exit 0
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

COMPOSE=(docker compose -f deploy/docker/docker-compose.prod.yml)

ready=0
for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
  if "${COMPOSE[@]}" exec -T postgres pg_isready -U reboundlab -d reboundlab >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 5
done
if [ "$ready" != "1" ]; then
  echo "postgres is not ready" >&2
  exit 1
fi

"${COMPOSE[@]}" exec -T postgres \
  psql -U reboundlab -d reboundlab -v ON_ERROR_STOP=1 \
  -v review_email="$EMAIL" << 'SQL'
UPDATE core.users
SET status = 'active',
    updated_at = NOW()
WHERE email = :'review_email';

UPDATE core.subscriptions s
SET plan_id = p.id,
    status = 'active',
    expires_at = NOW() + INTERVAL '30 days',
    autopay_enabled = FALSE,
    next_charge_at = NULL
FROM core.plans p
WHERE p.tier = 'pro'
  AND s.id = (
    SELECT s2.id
    FROM core.subscriptions s2
    JOIN core.users u ON u.id = s2.user_id
    WHERE u.email = :'review_email'
    ORDER BY s2.created_at DESC
    LIMIT 1
  )
  AND (s.expires_at IS NULL OR s.expires_at < NOW());

INSERT INTO core.saved_payment_methods
  (user_id, yookassa_method_id, method_type, title, status, purpose)
SELECT u.id, 'local-screenshot-xzyw', 'bank_card', 'Карта •••• 4242', 'active', 'screenshot'
FROM core.users u
WHERE u.email = :'review_email'
ON CONFLICT (yookassa_method_id) DO UPDATE
SET status = 'active',
    title = EXCLUDED.title,
    method_type = EXCLUDED.method_type,
    purpose = EXCLUDED.purpose,
    user_id = EXCLUDED.user_id;
SQL

count="$("${COMPOSE[@]}" exec -T postgres \
  psql -U reboundlab -d reboundlab -tA -v review_email="$EMAIL" << 'SQL'
SELECT COUNT(*)
FROM core.users
WHERE email = :'review_email'
  AND status = 'active'
  AND password_hash IS NOT NULL;
SQL
)"
count="$(printf '%s' "$count" | tr -d '[:space:]')"
if [ "$count" != "1" ]; then
  echo "original review login was not activated" >&2
  exit 1
fi

umask 077
printf '%s\n' "$EMAIL" > "$MARKER"
echo "ORIGINAL_REVIEW_EMAIL=${EMAIL}"
echo "ORIGINAL_REVIEW_PASSWORD=unchanged"
echo "original review login active"
