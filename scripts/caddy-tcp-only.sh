#!/usr/bin/env bash
# Caddy offers HTTP/3 by default. Browsers then try UDP/443, which VPNs and
# many foreign networks drop, so the site hangs while plain HTTPS still works.
set -euo pipefail

CF=/etc/caddy/Caddyfile
BAK="${CF}.bak-tcp"

if [ ! -f "$CF" ]; then
  echo "No $CF, skip"
  exit 0
fi

publish() {
  chmod 644 "$CF"
  chown root:root "$CF" 2>/dev/null || true
}

restore() {
  if [ ! -f "$BAK" ]; then
    echo "No backup to restore"
    return 1
  fi
  cp "$BAK" "$CF"
  publish
  systemctl restart caddy
  echo "Restored the previous HTTPS config"
}

show_failure() {
  systemctl status caddy --no-pager -l || true
  journalctl -u caddy -n 40 --no-pager || true
}

apply_reload() {
  publish
  if systemctl reload caddy; then
    return 0
  fi
  echo "reload failed, trying restart"
  if systemctl restart caddy; then
    return 0
  fi
  show_failure
  return 1
}

if grep -q 'protocols h1 h2' "$CF"; then
  if apply_reload; then
    echo "HTTPS is TCP only"
    exit 0
  fi
  restore
  exit 1
fi

if grep -q '^{' "$CF"; then
  echo "Caddyfile already has a global block; leave it unchanged"
  apply_reload
  exit 0
fi

tmp="$(mktemp)"
cat >"$tmp" <<'EOF'
{
	servers {
		protocols h1 h2
	}
}
EOF
cat "$CF" >>"$tmp"
caddy validate --config "$tmp" --adapter caddyfile
cp "$CF" "$BAK"
chmod 644 "$tmp"
mv "$tmp" "$CF"
if apply_reload; then
  echo "HTTPS is TCP only"
  exit 0
fi
restore
exit 1
