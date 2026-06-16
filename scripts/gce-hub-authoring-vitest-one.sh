#!/usr/bin/env bash
# Run one hub-cwl authoring batch vitest file (GCE chunk).
set -euo pipefail

VITEST_FILE="${1:?vitest file path required}"
PHASE_LABEL="${2:-authoring-vitest}"

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"

export CHRYSALIS_GCE_ALL_TESTS=1
export CHRYSALIS_RUN_HUB_HEAVY_AUTHORING_BATCH=1
export CHRYSALIS_EXPRESS_SERVER_START_TIMEOUT_MS="${CHRYSALIS_EXPRESS_SERVER_START_TIMEOUT_MS:-60000}"
export NODE_OPTIONS="${NODE_OPTIONS:---disable-warning=ExperimentalWarning}"

echo "[${PHASE_LABEL}] $(date -Is) vitest ${VITEST_FILE}"
pnpm exec vitest run "${VITEST_FILE}" \
  --reporter=verbose \
  --pool=forks \
  --maxWorkers=1 \
  --no-file-parallelism \
  --testTimeout=1200000
echo "[${PHASE_LABEL}] OK"
