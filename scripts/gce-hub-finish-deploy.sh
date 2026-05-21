#!/usr/bin/env bash
# Finish hub deploy on VM: ensure PHP, verify stack, restart operator web.
set -euo pipefail

REPO="${CHRYSALIS_STATUS_REPO:-${HOME}/chrysalis-test}"
cd "${REPO}"

log() { echo "[gce-hub-finish-deploy] $*"; }

ensure_php() {
  if command -v php >/dev/null 2>&1; then
    log "php: $(php -v | head -1)"
    return 0
  fi
  log "installing php-cli (hub PHP ingest)..."
  export DEBIAN_FRONTEND=noninteractive
  sudo apt-get update -qq
  sudo apt-get install -y php-cli php-xml unzip
}

ensure_php
export WPTP_SIBLINGS_ROOT="${WPTP_SIBLINGS_ROOT:-${HOME}}"
export CHRYSALIS_HUB_ROOT="${CHRYSALIS_HUB_ROOT:-${HOME}/.chrysalis-hub}"
mkdir -p "${CHRYSALIS_HUB_ROOT}/workspaces"

if [[ "${CHRYSALIS_SKIP_PARSER_VENDOR:-}" != "1" ]] && command -v php >/dev/null 2>&1; then
  export CHRYSALIS_SKIP_PARSER_VENDOR=0
  pnpm run vendor:parser-bridge
fi

if [[ "${CHRYSALIS_SKIP_WPTP_HUB_DEPS:-}" != "1" ]]; then
  node scripts/install-wptp-hub-deps.mjs
fi

export CHRYSALIS_DEPLOY_STRICT="${CHRYSALIS_DEPLOY_STRICT:-1}"
export CHRYSALIS_SKIP_HUB_HTTP_PROBE=1
node scripts/hub-post-deploy-verify.mjs

if [[ "${CHRYSALIS_AUTO_START_HUB:-1}" != "0" ]]; then
  chmod +x scripts/gce-chrysalis-status.sh
  CHRYSALIS_STATUS_REPO="${REPO}" bash scripts/gce-chrysalis-status.sh
  sleep 2
  port="${CHRYSALIS_STATUS_PORT:-19090}"
  if ! curl -sf "http://127.0.0.1:${port}/api/config" >/dev/null; then
    echo "[gce-hub-finish-deploy] ERROR: hub not responding on :${port}" >&2
    exit 1
  fi
  log "hub HTTP OK on :${port}"
fi

log "OK: hub deploy finish complete"
