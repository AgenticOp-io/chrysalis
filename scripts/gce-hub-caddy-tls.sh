#!/usr/bin/env bash
# Caddy + Let's Encrypt for AgenticOp demo hosts on GCE (hub + optional WISP).
# Prerequisite: DNS A records -> this VM's external IP before running.
#
#   hub.agenticop.io  -> VM IP  (Translation Hub :19090)
#   wisp.agenticop.io -> VM IP  (WISP demo :19100, optional)
#
# Opens HTTPS on :443; does not bind :80 for other apps if Caddy owns it.
set -euo pipefail

HUB_HOST="${CHRYSALIS_HUB_PUBLIC_HOST:-hub.agenticop.io}"
WISP_HOST="${CHRYSALIS_WISP_PUBLIC_HOST:-wisp.agenticop.io}"
HUB_PORT="${CHRYSALIS_STATUS_PORT:-19090}"
WISP_PORT="${CHRYSALIS_WISP_DEMO_PORT:-19100}"
ENABLE_WISP="${CHRYSALIS_CADDY_WISP:-1}"
EMAIL="${CHRYSALIS_CADDY_ACME_EMAIL:-hello@agenticop.io}"

if ! command -v caddy >/dev/null 2>&1; then
  echo "[gce-hub-caddy-tls] installing Caddy…"
  sudo apt-get update -qq
  sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo apt-get update -qq
  sudo apt-get install -y caddy
fi

CADDYFILE="/etc/caddy/Caddyfile"
sudo mkdir -p /etc/caddy

WISP_BLOCK=""
if [[ "${ENABLE_WISP}" == "1" ]]; then
  WISP_BLOCK="
${WISP_HOST} {
	email ${EMAIL}
	reverse_proxy 127.0.0.1:${WISP_PORT}
}
"
fi

sudo tee "${CADDYFILE}" >/dev/null <<EOF
# AgenticOp demo — managed by scripts/gce-hub-caddy-tls.sh
{
	email ${EMAIL}
}

${HUB_HOST} {
	email ${EMAIL}
	reverse_proxy 127.0.0.1:${HUB_PORT}
}
${WISP_BLOCK}
EOF

sudo systemctl enable caddy
sudo systemctl reload caddy || sudo systemctl restart caddy
sleep 2
if sudo systemctl is-active --quiet caddy; then
  echo "[gce-hub-caddy-tls] OK: https://${HUB_HOST}/"
  if [[ "${ENABLE_WISP}" == "1" ]]; then
    echo "[gce-hub-caddy-tls] OK: https://${WISP_HOST}/"
  fi
else
  echo "[gce-hub-caddy-tls] caddy failed — check: sudo journalctl -u caddy -n 50" >&2
  exit 1
fi
