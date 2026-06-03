#!/usr/bin/env bash
# GCE-safe hub-cwl vitest: RFC/parser smokes; authoring batches run via dedicated batch vitest files.
set -euo pipefail

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"

export CHRYSALIS_GCE_SLIM_HUB_CWL="${CHRYSALIS_GCE_SLIM_HUB_CWL:-1}"
export CHRYSALIS_GCE_ALL_TESTS=1
export NODE_OPTIONS="${NODE_OPTIONS:---disable-warning=ExperimentalWarning}"

VITEST_COMMON=(
  --reporter=verbose
  --pool=forks
  --maxWorkers=1
  --no-file-parallelism
  --testTimeout=900000
)

log() { echo "[gce-hub-cwl] $(date -Is) $*"; }

log "ensure gitignored fixture emits"
bash scripts/gce-ensure-fixture-emits.sh

log "hub-cwl slim (authoring batch smokes skipped; see gce-hub-authoring-batch-vitest.sh)"
pnpm exec vitest run packages/cli/tests/hub-cwl.test.ts "${VITEST_COMMON[@]}"

log "OK"
