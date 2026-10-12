#!/usr/bin/env bash
# Ручные операции с аккаунтами (удаление, подарок тарифа).
# Требует ADMIN_API_SECRET на сервере и APP_URL (например https://backtestpro.ru).
#
# Usage:
#   export APP_URL=https://backtestpro.ru
#   export ADMIN_API_SECRET='your-long-random-secret'
#   ./scripts/admin-user.sh lookup 550e8400-e29b-41d4-a716-446655440000
#   ./scripts/admin-user.sh lookup 123456789
#   ./scripts/admin-user.sh delete 550e8400-e29b-41d4-a716-446655440000
#   ./scripts/admin-user.sh grant 550e8400-e29b-41d4-a716-446655440000 pro 30
#
# Удаление через psql (если удобнее SQL): scripts/admin-delete-user.sql

set -euo pipefail

CMD="${1:-}"
APP_URL="${APP_URL:-http://localhost:3000}"
SECRET="${ADMIN_API_SECRET:-}"

if [[ -z "$SECRET" ]]; then
  echo "Set ADMIN_API_SECRET in env" >&2
  exit 1
fi

auth=(-H "Authorization: Bearer ${SECRET}" -H "Content-Type: application/json")

case "$CMD" in
  lookup)
    Q="${2:-}"
    [[ -n "$Q" ]] || { echo "usage: lookup <uuid|telegram_id>" >&2; exit 1; }
    curl -sS "${auth[@]}" "${APP_URL}/api/admin/user?q=$(printf %s "$Q" | jq -sRr @uri)" | jq .
    ;;
  delete)
    USER_ID="${2:-}"
    [[ -n "$USER_ID" ]] || { echo "usage: delete <user_uuid>" >&2; exit 1; }
    curl -sS -X DELETE "${auth[@]}" -d "$(jq -n --arg id "$USER_ID" '{userId:$id}')" \
      "${APP_URL}/api/admin/user" | jq .
    ;;
  grant)
    USER_ID="${2:-}"
    PLAN="${3:-}"
    DAYS="${4:-30}"
    [[ -n "$USER_ID" && -n "$PLAN" ]] || {
      echo "usage: grant <user_uuid> <trial|basic|pro> [days]" >&2
      exit 1
    }
    curl -sS -X POST "${auth[@]}" \
      -d "$(jq -n --arg id "$USER_ID" --arg plan "$PLAN" --argjson days "$DAYS" '{userId:$id,plan:$plan,days:$days}')" \
      "${APP_URL}/api/admin/user" | jq .
    ;;
  *)
    echo "Commands: lookup | delete | grant" >&2
    exit 1
    ;;
esac
