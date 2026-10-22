#!/usr/bin/env bash
# Включает вход по email и паролю на проде. Значения не секретные.
# Повторный запуск только подтверждает те же флаги.
set -euo pipefail

ROOT="${1:-/opt/reboundlab}"
cd "$ROOT"

python3 - << 'PY'
from pathlib import Path

path = Path(".env")
if not path.exists():
    raise SystemExit("missing .env")

keys = {
    "EMAIL_PASSWORD_AUTH": "1",
    "NEXT_PUBLIC_EMAIL_PASSWORD_AUTH": "1",
}
lines = path.read_text().splitlines()
found = set()
out = []
for line in lines:
    raw = line.strip()
    if not raw or raw.startswith("#") or "=" not in line:
        out.append(line)
        continue
    name = line.split("=", 1)[0].strip()
    if name.startswith("export "):
        name = name[len("export "):].strip()
    if name in keys:
        out.append(f"{name}={keys[name]}")
        found.add(name)
    else:
        out.append(line)
for name, value in keys.items():
    if name not in found:
        out.append(f"{name}={value}")
path.write_text("\n".join(out) + "\n")
print("email password auth enabled in env")
PY
