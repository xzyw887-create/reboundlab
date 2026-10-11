#!/usr/bin/env bash
# Публичная ссылка на localhost:3000 (пока терминал открыт).
set -euo pipefail

if ! curl -sf --max-time 3 http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
  echo "⚠️  Сначала в другом терминале: bash scripts/demo-start-local.sh"
  echo "    Потом снова запустите этот скрипт."
  exit 1
fi

echo "→ Способ 1: Cloudflare (ждите строку trycloudflare.com 30–60 сек)..."
echo ""

if command -v cloudflared >/dev/null 2>&1; then
  cloudflared tunnel --url http://127.0.0.1:3000 || true
fi

echo ""
echo "→ Если ссылки не было — способ 2: localtunnel..."
if command -v npx >/dev/null 2>&1; then
  npx --yes localtunnel --port 3000
else
  echo "Установите Node.js или: brew install cloudflared"
fi
