#!/usr/bin/env bash
# Caddy offers HTTP/3 by default. Browsers then try UDP/443, which VPNs and
# many foreign networks drop, so the site hangs while plain HTTPS still works.
set -euo pipefail

CF=/etc/caddy/Caddyfile
if [ ! -f "$CF" ]; then
  echo "No $CF, skip"
  exit 0
fi

if grep -q 'protocols h1 h2' "$CF"; then
  echo "HTTPS already limited to TCP"
  exit 0
fi

if grep -q '^{' "$CF"; then
  echo "Caddyfile already has a global block; leave it unchanged"
  exit 1
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
cp "$CF" "${CF}.bak-tcp"
mv "$tmp" "$CF"
systemctl reload caddy || systemctl restart caddy
echo "HTTPS is TCP only"
