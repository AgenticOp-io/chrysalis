#!/usr/bin/env bash
# Locked public hub edge (DESIGN D6396) — nginx vhost + certbot webroot on chrysalis-test-vm.
#
# Hosts: hub.agenticop.io + chrysalis.agenticop.io → 127.0.0.1:19090
# DO NOT modify FDE sites: fragility-default-ip, fragility-public
# DO NOT touch port 8765 or claim default_server on :80
#
# Docs: docs/HUB-DEMO-INSTALL.md · docs/nginx/chrysalis-hub.vhost.example
set -euo pipefail

HUB_HOSTS="${CHRYSALIS_HUB_PUBLIC_HOSTS:-hub.agenticop.io chrysalis.agenticop.io}"
HUB_PORT="${CHRYSALIS_STATUS_PORT:-19090}"
EMAIL="${CHRYSALIS_HUB_ACME_EMAIL:-admin@agenticop.io}"
ACME_ROOT="${CHRYSALIS_HUB_ACME_ROOT:-/var/www/chrysalis/acme}"
SITE_NAME="chrysalis-hub"
CONF_AVAILABLE="/etc/nginx/sites-available/${SITE_NAME}"
CONF_ENABLED="/etc/nginx/sites-enabled/${SITE_NAME}"
PRIMARY_HOST="${CHRYSALIS_HUB_PUBLIC_HOST:-hub.agenticop.io}"

# Prefer in-repo example when present (uploaded beside this script or under repo).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXAMPLE=""
for candidate in \
  "${SCRIPT_DIR}/../docs/nginx/chrysalis-hub.vhost.example" \
  "${HOME}/chrysalis-test/docs/nginx/chrysalis-hub.vhost.example" \
  "${CHRYSALIS_STATUS_REPO:-}/docs/nginx/chrysalis-hub.vhost.example"
do
  if [[ -n "$candidate" && -f "$candidate" ]]; then
    EXAMPLE="$candidate"
    break
  fi
done

log() { echo "[gce-hub-nginx-tls] $*"; }

# Refuse to edit FDE vhosts; disable leftover non-FDE hub.agenticop.io sites
# (e.g. prior certbot --nginx) so chrysalis-hub owns the name.
disable_conflicting_hub_sites() {
  local f base
  for f in /etc/nginx/sites-enabled/*; do
    [[ -e "$f" ]] || continue
    base="$(basename "$f")"
    case "$base" in
      chrysalis-hub|fragility-default-ip|fragility-public) continue ;;
    esac
    if grep -qE 'server_name[[:space:]].*(hub\.agenticop\.io|chrysalis\.agenticop\.io)' "$f" 2>/dev/null; then
      log "disabling conflicting site '${base}' (duplicate hub hostname; not FDE)"
      sudo rm -f "$f"
    fi
  done
}

# Refuse to edit FDE vhosts
for forbidden in fragility-default-ip fragility-public; do
  if [[ -e "/etc/nginx/sites-available/${forbidden}" ]] || [[ -e "/etc/nginx/sites-enabled/${forbidden}" ]]; then
    log "FDE site '${forbidden}' present — will not modify it (D6396)"
  fi
done

disable_conflicting_hub_sites

if systemctl is-enabled caddy >/dev/null 2>&1; then
  log "disabling leftover caddy (port 80 is nginx on this VM)"
  sudo systemctl disable --now caddy 2>/dev/null || true
fi

if ! command -v nginx >/dev/null 2>&1 && [[ ! -x /usr/sbin/nginx ]]; then
  log "ERROR: nginx required" >&2
  exit 1
fi
NGINX="${NGINX:-$(command -v nginx || echo /usr/sbin/nginx)}"

if ! command -v certbot >/dev/null 2>&1; then
  log "installing certbot…"
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y certbot
fi

sudo mkdir -p "${ACME_ROOT}"

write_http_vhost() {
  local hosts="$1"
  sudo tee "${CONF_AVAILABLE}" >/dev/null <<EOF
# Chrysalis Translation Hub — managed by scripts/gce-hub-nginx-tls.sh (D6396)
# Source of truth: docs/nginx/chrysalis-hub.vhost.example
# DO NOT edit fragility-default-ip / fragility-public
server {
    listen 80;
    listen [::]:80;
    server_name ${hosts};

    location ^~ /.well-known/acme-challenge/ {
        root ${ACME_ROOT};
        default_type "text/plain";
    }

    location / {
        proxy_pass http://127.0.0.1:${HUB_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        client_max_body_size 512m;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_connect_timeout 60s;
    }
}
EOF
}

write_tls_vhost() {
  local hosts="$1"
  local cert_dir="/etc/letsencrypt/live/${PRIMARY_HOST}"
  local ssl_opts=""
  if [[ -f /etc/letsencrypt/options-ssl-nginx.conf ]]; then
    ssl_opts="include /etc/letsencrypt/options-ssl-nginx.conf;"
  fi
  local ssl_dh=""
  if [[ -f /etc/letsencrypt/ssl-dhparams.pem ]]; then
    ssl_dh="ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;"
  fi
  sudo tee "${CONF_AVAILABLE}" >/dev/null <<EOF
# Chrysalis Translation Hub — managed by scripts/gce-hub-nginx-tls.sh (D6396)
# Source of truth: docs/nginx/chrysalis-hub.vhost.example
# DO NOT edit fragility-default-ip / fragility-public
server {
    listen 80;
    listen [::]:80;
    server_name ${hosts};

    location ^~ /.well-known/acme-challenge/ {
        root ${ACME_ROOT};
        default_type "text/plain";
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${hosts};

    ssl_certificate     ${cert_dir}/fullchain.pem;
    ssl_certificate_key ${cert_dir}/privkey.pem;
    ${ssl_opts}
    ${ssl_dh}

    location / {
        proxy_pass http://127.0.0.1:${HUB_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        client_max_body_size 512m;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_connect_timeout 60s;
    }
}
EOF
}

log "writing HTTP vhost ${CONF_AVAILABLE} (hosts: ${HUB_HOSTS})"
if [[ -n "$EXAMPLE" ]]; then
  log "reference example present: ${EXAMPLE}"
fi
write_http_vhost "${HUB_HOSTS}"
sudo ln -sf "${CONF_AVAILABLE}" "${CONF_ENABLED}"
sudo "${NGINX}" -t
sudo systemctl reload nginx

cert_args=()
for h in ${HUB_HOSTS}; do
  cert_args+=(-d "$h")
done

log "certbot webroot for: ${HUB_HOSTS}"
sudo certbot certonly --webroot -w "${ACME_ROOT}" \
  "${cert_args[@]}" \
  --non-interactive --agree-tos -m "${EMAIL}" \
  --cert-name "${PRIMARY_HOST}"

log "enabling TLS server block"
write_tls_vhost "${HUB_HOSTS}"
sudo "${NGINX}" -t
sudo systemctl reload nginx

log "OK — verify:"
for h in ${HUB_HOSTS}; do
  echo "  curl -sI https://${h}/ | head"
done
log "After HTTPS works: bind hub to 127.0.0.1 (CHRYSALIS_OPERATOR_BIND=127.0.0.1) and optionally close GCE tcp:19090"
log "Do not touch FDE :8765 or FDE default_server on :80"
