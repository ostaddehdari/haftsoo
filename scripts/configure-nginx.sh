#!/usr/bin/env bash
set -Eeuo pipefail

DOMAIN="${HAFTSOO_DOMAIN:-srun.ir}"
BASE_PATH="${HAFTSOO_BASE_PATH:-/haftsoo}"
WEB_PORT="${HAFTSOO_WEB_PORT:-3100}"
VHOST="${HAFTSOO_NGINX_VHOST:-}"
SNIPPET="/etc/nginx/snippets/haftsoo-location.conf"

[[ "${EUID}" -eq 0 ]] || { echo "Run as root." >&2; exit 1; }
command -v nginx >/dev/null 2>&1 || { echo "Nginx is not installed." >&2; exit 1; }
BASE_PATH="${BASE_PATH%/}"

if [[ -z "${VHOST}" ]]; then
  mapfile -t candidates < <(
    grep -RslE "server_name[[:space:]][^;]*[[:space:]]${DOMAIN//./\\.}([[:space:];]|$)" \
      /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null || true
  )
  [[ "${#candidates[@]}" -gt 0 ]] || {
    echo "Could not detect the Nginx vhost for ${DOMAIN}. Set HAFTSOO_NGINX_VHOST=/path/to/vhost." >&2
    exit 1
  }
  VHOST="${candidates[0]}"
fi

[[ -f "${VHOST}" ]] || { echo "Nginx vhost not found: ${VHOST}" >&2; exit 1; }
install -d -m 0755 /etc/nginx/snippets /var/backups/haftsoo

cat > "${SNIPPET}" <<EOF
# Managed by Haftsoo installer.
location = ${BASE_PATH} {
    return 308 ${BASE_PATH}/;
}

location ^~ ${BASE_PATH}/ {
    proxy_pass http://127.0.0.1:${WEB_PORT};
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header X-Forwarded-Prefix ${BASE_PATH};
    proxy_read_timeout 60s;
}
EOF

if grep -Fq "include ${SNIPPET};" "${VHOST}"; then
  nginx -t
  nginx -s reload
  echo "Nginx already includes the Haftsoo route."
  exit 0
fi

backup="/var/backups/haftsoo/$(basename "${VHOST}").$(date +%Y%m%d%H%M%S).bak"
cp -L --preserve=mode,ownership,timestamps "${VHOST}" "${backup}"

python3 - "${VHOST}" "${DOMAIN}" "${SNIPPET}" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
domain = sys.argv[2]
snippet = sys.argv[3]
text = path.read_text(encoding="utf-8")
starts = [m.start() for m in re.finditer(r"\bserver\s*\{", text)]
blocks = []

for start in starts:
    opening = text.find("{", start)
    depth = 0
    for pos in range(opening, len(text)):
        if text[pos] == "{":
            depth += 1
        elif text[pos] == "}":
            depth -= 1
            if depth == 0:
                block = text[start : pos + 1]
                directive = re.search(r"\bserver_name\s+([^;]+);", block)
                names = directive.group(1).split() if directive else []
                if domain in names:
                    blocks.append((start, pos))
                break

if not blocks:
    raise SystemExit(f"No server block found for {domain} in {path}")

# Prefer the TLS block; otherwise use the first matching server block.
selected = next((item for item in blocks if re.search(r"listen\s+[^;]*443", text[item[0]:item[1]])), blocks[0])
insert_at = selected[1]
line = f"    include {snippet};\n"
text = text[:insert_at] + line + text[insert_at:]
path.write_text(text, encoding="utf-8")
PY

if ! nginx -t; then
  cp --preserve=mode,ownership,timestamps "${backup}" "${VHOST}"
  nginx -t || true
  echo "Nginx validation failed; vhost restored from ${backup}." >&2
  exit 1
fi

nginx -s reload
echo "Nginx route enabled for https://${DOMAIN}${BASE_PATH}/"

