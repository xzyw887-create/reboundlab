#!/usr/bin/env bash
# Установить фоновую загрузку через launchd (переживает закрытие Cursor/Terminal)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST_SRC="$ROOT/deploy/launchd/com.reboundlab.backfill.plist.template"
PLIST_DST="$HOME/Library/LaunchAgents/com.reboundlab.backfill.plist"
LABEL="com.reboundlab.backfill"

mkdir -p "$ROOT/logs" "$HOME/Library/LaunchAgents"
sed "s|REBOUNDLAB_ROOT|$ROOT|g" "$PLIST_SRC" > "$PLIST_DST"

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_DST"
launchctl enable "gui/$(id -u)/$LABEL"
launchctl kickstart -k "gui/$(id -u)/$LABEL"

echo "→ Загрузка запущена через launchd ($LABEL)"
echo "→ Лог: $ROOT/logs/backfill-watchdog.log"
echo "→ Статус: bash $ROOT/scripts/backfill-status.sh"
echo ""
echo "Остановить:"
echo "  launchctl bootout gui/$(id -u)/$LABEL"
