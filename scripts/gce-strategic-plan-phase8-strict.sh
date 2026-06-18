#!/usr/bin/env bash
# GCE strict product proof (Phase 8): full oracle/HTTP/CWL roundtrips without SKIP_* envs.
set -euo pipefail

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"

log() { echo "[gce-strategic-plan-phase8-strict] $(date -Is) $*"; }

log "ensure gitignored fixture emits"
bash scripts/gce-ensure-fixture-emits.sh

log "phase8 vitest (skip-fast path)"
pnpm exec vitest run packages/cli/tests/hub-strategic-plan-phase8.test.ts \
  --reporter=verbose \
  --pool=forks \
  --maxWorkers=1 \
  --testTimeout=600000 \
  --no-file-parallelism

export CHRYSALIS_STRICT_STRATEGIC_PLAN=1
log "phase8 strict close smoke (may take hours)"
pnpm run hub:strategic-plan-phase8-product-proof-close-smoke

log "OK"
