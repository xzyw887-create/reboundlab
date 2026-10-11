#!/usr/bin/env bash
# Фоновая загрузка 375 монет: watchdog + не даём Mac уснуть
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENTS="$HOME/Library/LaunchAgents"

install_plist() {
  local label="$1"
  local template="$2"
  local dst="$AGENTS/$label.plist"
  sed "s|REBOUNDLAB_ROOT|$ROOT|g" "$template" > "$dst"
  launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
  launchctl bootstrap "gui/$(id -u)" "$dst"
  launchctl enable "gui/$(id -u)/$label"
  launchctl kickstart -k "gui/$(id -u)/$label"
  echo "→ $label"
}

mkdir -p "$ROOT/logs" "$AGENTS"

install_plist "com.reboundlab.caffeinate" \
  "$ROOT/deploy/launchd/com.reboundlab.caffeinate.plist.template"

install_plist "com.reboundlab.backfill" \
  "$ROOT/deploy/launchd/com.reboundlab.backfill.plist.template"

echo ""
echo "Mac не уснёт (caffeinate), backfill перезапускается сам."
echo "Статус: bash $ROOT/scripts/backfill-status.sh"
echo "Лог:    tail -f $ROOT/logs/backfill-1095-all.log"
