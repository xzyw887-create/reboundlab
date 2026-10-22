#!/usr/bin/env bash
# Один раз создаёт аккаунт для проверки ЮKassa и показывает в нём карту.
# Карта локальная: в ЮKassa не сохраняется и в списание не попадает.
# Повторный деплой пароль не меняет и карту после отвязки не возвращает.
set -euo pipefail

ROOT="${1:-/opt/reboundlab}"
EMAIL="yookassa-check@backtestpro.ru"
MARKER="/var/lib/reboundlab-email-review-account"
cd "$ROOT"
set -a
# shellcheck disable=SC1091
source .env
set +a

COMPOSE=(docker compose -f deploy/docker/docker-compose.prod.yml)

if [ -f "$MARKER" ]; then
  echo "yookassa review account already prepared"
  exit 0
fi

ready=0
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18; do
  if "${COMPOSE[@]}" exec -T web node -e 'process.exit(0)' >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 5
done
if [ "$ready" != "1" ]; then
  echo "web container is not ready" >&2
  exit 1
fi

echo "EXISTING_EMAIL_LOGINS_BEGIN"
"${COMPOSE[@]}" exec -T postgres \
  psql -U reboundlab -d reboundlab -tA -c \
  "SELECT email FROM core.users WHERE password_hash IS NOT NULL AND email NOT LIKE '%@telegram.local' AND status = 'active' ORDER BY email;"
echo "EXISTING_EMAIL_LOGINS_END"

PASS="$(openssl rand -hex 8)"
HASH="$("${COMPOSE[@]}" exec -T -e REVIEW_PASSWORD="$PASS" web \
  node -e 'const b=require("bcryptjs"); process.stdout.write(b.hashSync(process.env.REVIEW_PASSWORD, 12))')"
case "$HASH" in
  \$2*) ;;
  *)
    echo "password hash was not created" >&2
    exit 1
    ;;
esac

"${COMPOSE[@]}" exec -T postgres \
  psql -U reboundlab -d reboundlab -v ON_ERROR_STOP=1 \
  -v review_email="$EMAIL" \
  -v review_hash="$HASH" << 'SQL'
INSERT INTO core.users (email, password_hash)
VALUES (:'review_email', :'review_hash')
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    status = 'active',
    updated_at = NOW();

INSERT INTO core.subscriptions (user_id, plan_id, status, expires_at, trial_started)
SELECT u.id, p.id, 'trial', NOW() - INTERVAL '1 minute', FALSE
FROM core.users u
JOIN core.plans p ON p.tier = 'trial'
WHERE u.email = :'review_email'
  AND NOT EXISTS (
    SELECT 1 FROM core.subscriptions s WHERE s.user_id = u.id
  );

INSERT INTO core.saved_payment_methods
  (user_id, yookassa_method_id, method_type, title, status, purpose)
SELECT u.id, 'local-screenshot-yookassa-check', 'bank_card', 'Карта •••• 4242', 'active', 'screenshot'
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
  psql -U reboundlab -d reboundlab -tA \
  -c "SELECT COUNT(*) FROM core.saved_payment_methods WHERE yookassa_method_id = 'local-screenshot-yookassa-check' AND status = 'active';" \
  | tr -d '[:space:]')"
if [ "$count" != "1" ]; then
  echo "review account card was not saved" >&2
  exit 1
fi

umask 077
printf '%s\n' "$EMAIL" > "$MARKER"
echo "YOOKASSA_REVIEW_EMAIL=${EMAIL}"
echo "YOOKASSA_REVIEW_PASSWORD=${PASS}"
echo "yookassa review account ready"
