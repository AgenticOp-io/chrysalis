#!/usr/bin/env bash
# nginx + Let's Encrypt (certbot) for hub.agenticop.io on GCE when :80 is already nginx.
# Prerequisite: DNS A record -> VM IP; VM tag https-server (tcp:443 allowed).
set -euo pipefail

HUB_HOST="${CHRYSALIS_HUB_PUBLIC_HOST:-hub.agenticop.io}"
WISP_HOST="${CHRYSALIS_WISP_PUBLIC_HOST:-wisp.agenticop.io}"
HUB_PORT="${CHRYSALIS_STATUS_PORT:-19090}"
WISP_PORT="${CHRYSALIS_WISP_DEMO_PORT:-19100}"
ENABLE_WISP="${CHRYSALIS_HUB_NGINX_WISP:-0}"
EMAIL="${CHRYSALIS_HUB_ACME_EMAIL:-hello@agenticop.io}"

# Caddy cannot bind :80 on this VM; disable if a prior attempt installed it.
if systemctl is-enabled caddy >/dev/null 2>&1; then
  sudo systemctl disable --now caddy 2>/dev/null || true
fi

if ! command -v nginx >/dev/null 2>&1 && [[ ! -x /usr/sbin/nginx ]]; then
  echo "[gce-hub-nginx-tls] nginx required but not installed" >&2
  exit 1
fi
NGINX="${NGINX:-$(command -v nginx || echo /usr/sbin/nginx)}"

if ! command -v certbot >/dev/null 2>&1; then
  echo "[gce-hub-nginx-tls] installing certbot…"
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y certbot python3-certbot-nginx
fi

write_site() {
  local host="$1"
  local port="$2"
  local conf="/etc/nginx/sites-available/${host}"
  sudo tee "${conf}" >/dev/null <<EOF
# AgenticOp demo — managed by scripts/gce-hub-nginx-tls.sh
server {
    listen 80;
    listen [::]:80;
    server_name ${host};

    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
EOF
  sudo ln -sf "${conf}" "/etc/nginx/sites-enabled/${host}"
}

write_site "${HUB_HOST}" "${HUB_PORT}"
if [[ "${ENABLE_WISP}" == "1" ]]; then
  write_site "${WISP_HOST}" "${WISP_PORT}"
fi

sudo "${NGINX}" -t
sudo systemctl reload nginx

cert_domains=(-d "${HUB_HOST}")
if [[ "${ENABLE_WISP}" == "1" ]]; then
  cert_domains+=(-d "${WISP_HOST}")
fi

sudo certbot --nginx "${cert_domains[@]}" --non-interactive --agree-tos -m "${EMAIL}" --redirect

echo "[gce-hub-nginx-tls] OK: https://${HUB_HOST}/"
if [[ "${ENABLE_WISP}" == "1" ]]; then
  echo "[gce-hub-nginx-tls] OK: https://${WISP_HOST}/"
fi
