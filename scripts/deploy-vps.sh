#!/usr/bin/env bash
# Sync repo to production VPS and rebuild the web container (Postgres untouched).
#
# Local one-liner (SSH key or agent):
#   ./scripts/deploy-vps.sh
#
# Overrides:
#   DEPLOY_HOST=5.63.152.44 DEPLOY_USER=root DEPLOY_PATH=/opt/reboundlab
#   DEPLOY_SSH_KEY=~/.ssh/id_ed25519
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

HOST="${DEPLOY_HOST:-5.63.152.44}"
USER="${DEPLOY_USER:-root}"
PATH_REMOTE="${DEPLOY_PATH:-/opt/reboundlab}"
COMPOSE_FILE="deploy/docker/docker-compose.prod.yml"

RSYNC_RSH="ssh -o StrictHostKeyChecking=accept-new"
SSH_BASE=(ssh -o StrictHostKeyChecking=accept-new)
if [[ -n "${DEPLOY_SSH_KEY:-}" ]]; then
  RSYNC_RSH="ssh -i ${DEPLOY_SSH_KEY} -o StrictHostKeyChecking=accept-new"
  SSH_BASE=(ssh -i "$DEPLOY_SSH_KEY" -o StrictHostKeyChecking=accept-new)
fi

DEST="${USER}@${HOST}:${PATH_REMOTE}/"

echo "=== Deploy → ${DEST} ==="

rsync -avz \
  -e "$RSYNC_RSH" \
  --exclude node_modules \
  --exclude .git \
  --exclude .data \
  --exclude .env \
  --exclude 'apps/web/.next' \
  --exclude '.cursor' \
  ./ "$DEST"

echo "=== Rebuild web (docker compose) ==="

"${SSH_BASE[@]}" "${USER}@${HOST}" bash -s <<EOF
set -euo pipefail
cd "${PATH_REMOTE}"
set -a && source .env && set +a
docker compose -f ${COMPOSE_FILE} up -d --build web
EOF

echo "=== Done. Check: https://backtestpro.ru/api/health ==="
