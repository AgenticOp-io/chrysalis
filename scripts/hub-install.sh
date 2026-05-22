#!/usr/bin/env bash
# One-shot Translation Hub server install (client/server for professional converters).
# Usage: ./scripts/hub-install.sh [chrysalis-repo-dir]
set -euo pipefail

REPO="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"

export CHRYSALIS_SKIP_PARSER_VENDOR="${CHRYSALIS_SKIP_PARSER_VENDOR:-0}"
export CHRYSALIS_HUB_MAX_PARALLEL="${CHRYSALIS_HUB_MAX_PARALLEL:-3}"

echo "[hub-install] repo=${REPO}"
if ! command -v node >/dev/null 2>&1; then
  echo "[hub-install] Node 20+ required on PATH" >&2
  exit 1
fi

if command -v corepack >/dev/null 2>&1; then
  corepack enable 2>/dev/null || true
  corepack prepare pnpm@9.0.0 --activate 2>/dev/null || true
fi

pnpm install
pnpm run build:hub-all

PORT="${CHRYSALIS_STATUS_PORT:-19090}"
BIND="${CHRYSALIS_STATUS_BIND:-0.0.0.0}"
export CHRYSALIS_STATUS_REPO="${REPO}"
export CHRYSALIS_STATUS_PORT="${PORT}"
export CHRYSALIS_STATUS_BIND="${BIND}"

UNIT_PATH="${CHRYSALIS_HUB_SYSTEMD_UNIT:-}"
if [[ -n "${UNIT_PATH}" ]] && [[ -w "$(dirname "${UNIT_PATH}")" || -w /etc/systemd/system ]]; then
  cat >"${UNIT_PATH}" <<EOF
[Unit]
Description=Chrysalis Translation Hub
After=network.target

[Service]
Type=simple
User=${USER}
WorkingDirectory=${REPO}
Environment=CHRYSALIS_STATUS_REPO=${REPO}
Environment=CHRYSALIS_STATUS_PORT=${PORT}
Environment=CHRYSALIS_STATUS_BIND=${BIND}
Environment=CHRYSALIS_HUB_MAX_PARALLEL=${CHRYSALIS_HUB_MAX_PARALLEL}
ExecStart=$(command -v node) ${REPO}/scripts/chrysalis-operator-web.mjs
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
  echo "[hub-install] wrote systemd unit ${UNIT_PATH}"
fi

echo "[hub-install] OK — start hub:"
echo "  CHRYSALIS_STATUS_REPO=${REPO} node scripts/chrysalis-operator-web.mjs"
echo "  or: bash scripts/gce-chrysalis-status.sh"
echo "[hub-install] listen http://${BIND}:${PORT}/"
