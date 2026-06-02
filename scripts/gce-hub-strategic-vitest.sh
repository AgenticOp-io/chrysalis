#!/usr/bin/env bash
# GCE-safe hub-strategic vitest: unit tests only; batch smokes run via ci:hub-completion.
set -euo pipefail

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"

export CHRYSALIS_GCE_SLIM_HUB_STRATEGIC="${CHRYSALIS_GCE_SLIM_HUB_STRATEGIC:-1}"

VITEST_COMMON=(
  --reporter=verbose
  --pool=forks
  --maxWorkers=1
  --testTimeout=120000
  --no-file-parallelism
)

log() { echo "[gce-hub-strategic] $(date -Is) $*"; }

log "ensure gitignored fixture emits"
bash scripts/gce-ensure-fixture-emits.sh

log "hub-gold-manifest"
pnpm exec vitest run packages/cli/tests/hub-gold-manifest.test.ts "${VITEST_COMMON[@]}"

if [[ "${CHRYSALIS_GCE_RUN_HUB_STRATEGIC:-}" == "1" ]]; then
  log "hub-strategic FULL (CHRYSALIS_GCE_RUN_HUB_STRATEGIC=1 — may take hours)"
  pnpm exec vitest run packages/cli/tests/hub-strategic.test.ts "${VITEST_COMMON[@]}"
else
  log "hub-strategic slim (CHRYSALIS_GCE_SLIM_HUB_STRATEGIC=1; batch smokes skipped)"
  pnpm exec vitest run packages/cli/tests/hub-strategic.test.ts "${VITEST_COMMON[@]}"
fi

log "OK"
