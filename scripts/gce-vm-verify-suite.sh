#!/usr/bin/env bash
# Shared hub/strategic verify suite (Linux GCE or local bash).
set -euo pipefail

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"

log() { echo "[gce-vm-verify] $*"; }

log "pnpm install"
pnpm install

log "pnpm -r build"
pnpm -r build

if command -v php >/dev/null 2>&1; then
  export CHRYSALIS_SKIP_PARSER_VENDOR=0
  pnpm run vendor:parser-bridge || log "WARN: parser-bridge vendor failed"
else
  export CHRYSALIS_SKIP_PARSER_VENDOR=1
fi

log "hub-strategic tests"
pnpm exec vitest run packages/cli/tests/hub-strategic.test.ts packages/cli/tests/hub-gold-manifest.test.ts

log "hub:express-flagship"
pnpm run hub:express-flagship

log "hub:plain-php-flagship"
pnpm run hub:plain-php-flagship
log "hub:symfony-flagship"
pnpm run hub:symfony-flagship

log "hub:node-express-oracle-verify"
pnpm run hub:node-express-oracle-verify

log "hub:node-oracle-spike"
pnpm run hub:node-oracle-spike

log "OK (Linux suite)"
