#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/web"
echo "→ Vercel deploy (нужен login: npx vercel login)"
echo "→ Root: apps/web, monorepo build from repo root"
npx vercel@latest deploy --prod "$@"
