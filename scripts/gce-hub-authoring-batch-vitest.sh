#!/usr/bin/env bash
# Full CWL authoring batch vitest (v64–v110) on Linux GCE — includes mega gates v106–v110.
set -euo pipefail

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"

export CHRYSALIS_GCE_ALL_TESTS=1
export CHRYSALIS_RUN_HUB_HEAVY_AUTHORING_BATCH=1
export CHRYSALIS_EXPRESS_SERVER_START_TIMEOUT_MS="${CHRYSALIS_EXPRESS_SERVER_START_TIMEOUT_MS:-60000}"
export NODE_OPTIONS="${NODE_OPTIONS:---disable-warning=ExperimentalWarning}"

VITEST_COMMON=(
  --reporter=verbose
  --pool=forks
  --maxWorkers=1
  --no-file-parallelism
  --testTimeout=1200000
)

log() { echo "[gce-authoring-batch] $(date -Is) $*"; }

log "ensure gitignored fixture emits"
bash scripts/gce-ensure-fixture-emits.sh

log "authoring batches v61-v63"
pnpm exec vitest run packages/cli/tests/hub-cwl-authoring-batch-v61-v63.test.ts "${VITEST_COMMON[@]}"

log "authoring batches v64-v70"
pnpm exec vitest run packages/cli/tests/hub-cwl-authoring-batch-v64-v70.test.ts "${VITEST_COMMON[@]}"

log "authoring batches v71-v90"
pnpm exec vitest run packages/cli/tests/hub-cwl-authoring-batch-v71-v90.test.ts "${VITEST_COMMON[@]}"

log "authoring batches v91-v110 (mega gates enabled)"
pnpm exec vitest run packages/cli/tests/hub-cwl-authoring-batch-v91-v110.test.ts "${VITEST_COMMON[@]}"

log "OK"
