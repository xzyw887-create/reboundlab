#!/usr/bin/env bash
# Публичный демо-URL через Cloudflare Tunnel (без Koyeb/Render/Railway).
# На Mac: сайт + Python + Supabase. Работает пока терминал открыт.
#
# Терминал 1:
#   cd ~/Projects/reboundlab
#   export DATABASE_URL='postgresql://...@pooler.supabase.com:5432/postgres'
#   export JWT_SECRET='...'
#   export PROJECT_ROOT="$PWD"
#   npm run web:build && npm run start --workspace=@reboundlab/web
#
# Терминал 2:
#   bash scripts/demo-public-tunnel.sh
#
set -euo pipefail
if ! command -v cloudflared >/dev/null 2>&1; then
  echo "→ Установка cloudflared..."
  brew install cloudflared
fi
echo "→ Публичная ссылка появится ниже (trycloudflare.com):"
echo "→ Откройте её/app — калькулятор с Python"
cloudflared tunnel --url http://localhost:3000
