#!/usr/bin/env bash
# Canonical Chrysalis test suite on Linux GCE (detached-safe; laptop can disconnect).
set -euo pipefail

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"
mkdir -p reports/ci

export NODE_OPTIONS="${NODE_OPTIONS:---disable-warning=ExperimentalWarning}"
export CHRYSALIS_HUB_CWL_BATCH_FAST_CHAIN="${CHRYSALIS_HUB_CWL_BATCH_FAST_CHAIN:-1}"

LOG="${CHRYSALIS_GCE_ALL_TESTS_LOG:-reports/ci/gce-all-tests.log}"
PID_FILE="${HOME}/.chrysalis-gce-test.pid"
OK_FILE="reports/ci/gce-all-tests.ok"
LOCK_FILE="${HOME}/.chrysalis-gce-test.lock"

log() { echo "[gce-all-tests] $(date -Is) $*"; }

if [[ -f "${LOCK_FILE}" ]]; then
  old_pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
  if [[ -n "${old_pid}" ]] && kill -0 "${old_pid}" 2>/dev/null; then
    log "already running (pid ${old_pid}); tail ${LOG}"
    exit 2
  fi
  rm -f "${LOCK_FILE}" "${PID_FILE}"
fi

echo $$ >"${PID_FILE}"
touch "${LOCK_FILE}"
rm -f "${OK_FILE}"
trap 'rm -f "${LOCK_FILE}"' EXIT

exec > >(tee -a "${LOG}") 2>&1

log "repo=${REPO} full_vitest=${CHRYSALIS_GCE_FULL_VITEST:-0}"

if [[ "${CHRYSALIS_GCE_SKIP_PNPM_INSTALL:-}" != "1" ]]; then
  log "phase: pnpm install"
  pnpm install
fi

if [[ "${CHRYSALIS_GCE_SKIP_BUILD:-}" != "1" ]]; then
  log "phase: pnpm -r build"
  pnpm -r build
fi

if command -v php >/dev/null 2>&1; then
  export CHRYSALIS_SKIP_PARSER_VENDOR=0
  pnpm run vendor:parser-bridge || log "WARN: parser-bridge vendor failed"
else
  export CHRYSALIS_SKIP_PARSER_VENDOR=1
fi

log "phase: cli shims"
pnpm run test:cli-shims

export CHRYSALIS_GCE_SKIP_PNPM_INSTALL=1
export CHRYSALIS_GCE_SKIP_BUILD=1
log "phase: hub vm verify suite"
bash scripts/gce-vm-verify-suite.sh

log "phase: hub-cwl vitest"
pnpm exec vitest run packages/cli/tests/hub-cwl.test.ts

if [[ "${CHRYSALIS_GCE_FULL_VITEST:-}" == "1" ]]; then
  log "phase: full workspace vitest (pnpm test)"
  pnpm test
else
  log "phase: skip full vitest (set CHRYSALIS_GCE_FULL_VITEST=1 to enable)"
fi

log "phase: hub completion ci gate"
pnpm run ci:hub-completion

log "phase: cwl fullstack HTTP verify"
node scripts/hub-ingest/hub-cwl-fullstack-verify-http-smoke.mjs

log "phase: cwl fast batch v40"
bash scripts/gce-cwl-batch-v40-fast.sh

log "phase: cwl batch v60 (post50 composite)"
node --input-type=module -e "
import { runCwlAuthoringBatchV60Smoke } from './scripts/hub-ingest/hub-cwl-authoring-batch-v60-smoke.mjs';
const r = await runCwlAuthoringBatchV60Smoke({ skipPriorChain: true });
if (!r.ok) { console.error(r); process.exit(1); }
console.log('v60 ok', r.gate60Mode);
"

date -Is >"${OK_FILE}"
log "ALL OK — marker ${OK_FILE}"
