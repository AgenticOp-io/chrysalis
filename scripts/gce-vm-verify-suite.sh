#!/usr/bin/env bash
# Shared hub/strategic verify suite (Linux GCE or local bash).
set -euo pipefail

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

log() { echo "[gce-vm-verify] $(date -Is) $*"; }

run_phase() {
  bash "${SCRIPT_DIR}/gce-run-phase.sh" "$@"
}

if [[ "${CHRYSALIS_GCE_SKIP_PNPM_INSTALL:-}" != "1" ]]; then
  log "pnpm install"
  pnpm install
fi

if [[ "${CHRYSALIS_GCE_SKIP_BUILD:-}" != "1" ]]; then
  log "pnpm -r build"
  pnpm -r build
fi

if command -v php >/dev/null 2>&1; then
  export CHRYSALIS_SKIP_PARSER_VENDOR=0
  pnpm run vendor:parser-bridge || log "WARN: parser-bridge vendor failed"
else
  export CHRYSALIS_SKIP_PARSER_VENDOR=1
fi

run_phase hub-strategic-vitest bash scripts/gce-hub-strategic-vitest.sh

run_phase hub-express-flagship pnpm run hub:express-flagship

run_phase hub-plain-php-flagship pnpm run hub:plain-php-flagship

run_phase hub-symfony-flagship pnpm run hub:symfony-flagship

run_phase hub-node-express-oracle-verify pnpm run hub:node-express-oracle-verify

run_phase hub-node-oracle-spike pnpm run hub:node-oracle-spike

log "OK (Linux suite)"
