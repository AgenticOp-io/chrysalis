#!/usr/bin/env bash
# Canonical Chrysalis test suite on Linux GCE (detached-safe; laptop can disconnect).
set -euo pipefail

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"
mkdir -p reports/ci

export NODE_OPTIONS="${NODE_OPTIONS:---disable-warning=ExperimentalWarning}"
export CHRYSALIS_HUB_CWL_BATCH_FAST_CHAIN="${CHRYSALIS_HUB_CWL_BATCH_FAST_CHAIN:-1}"
export CHRYSALIS_GCE_ALL_TESTS=1
export CHRYSALIS_GCE_SLIM_HUB_STRATEGIC="${CHRYSALIS_GCE_SLIM_HUB_STRATEGIC:-1}"

LOG="${CHRYSALIS_GCE_ALL_TESTS_LOG:-reports/ci/gce-all-tests.log}"
PID_FILE="${HOME}/.chrysalis-gce-test.pid"
OK_FILE="reports/ci/gce-all-tests.ok"
LOCK_FILE="${HOME}/.chrysalis-gce-test.lock"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

run_phase() {
  bash "${SCRIPT_DIR}/gce-run-phase.sh" "$@"
}

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
run_phase cli-shims pnpm run test:cli-shims

export CHRYSALIS_GCE_SKIP_PNPM_INSTALL=1
export CHRYSALIS_GCE_SKIP_BUILD=1
log "phase: hub vm verify suite"
run_phase hub-vm-verify bash scripts/gce-vm-verify-suite.sh

log "phase: hub-cwl vitest"
run_phase hub-cwl bash scripts/gce-hub-cwl-vitest.sh

log "phase: hub CWL authoring batch vitest (v64-v110)"
run_phase hub-cwl-authoring-batches bash scripts/gce-hub-authoring-batch-vitest.sh

if [[ "${CHRYSALIS_GCE_FULL_VITEST:-}" == "1" ]]; then
  log "phase: full workspace vitest (pnpm test)"
  run_phase full-vitest pnpm test
else
  log "phase: skip full vitest (set CHRYSALIS_GCE_FULL_VITEST=1 to enable)"
fi

log "phase: hub completion ci gate"
run_phase hub-completion pnpm run ci:hub-completion

log "phase: cwl fullstack HTTP verify"
run_phase cwl-http-verify node scripts/hub-ingest/hub-cwl-fullstack-verify-http-smoke.mjs

log "phase: cwl fast batch v40"
run_phase cwl-batch-v40 bash scripts/gce-cwl-batch-v40-fast.sh

log "phase: cwl batch v60 (post50 composite)"
run_phase cwl-batch-v60 node --input-type=module -e "
import { runCwlAuthoringBatchV60Smoke } from './scripts/hub-ingest/hub-cwl-authoring-batch-v60-smoke.mjs';
const r = await runCwlAuthoringBatchV60Smoke({ skipPriorChain: true });
if (!r.ok) { console.error(r); process.exit(1); }
console.log('v60 ok', r.gate60Mode);
"

log "phase: cwl batch v110 (hub verify-gaps graduation lock)"
run_phase cwl-batch-v110 node --input-type=module -e "
import { runCwlAuthoringBatchV110Smoke } from './scripts/hub-ingest/hub-cwl-authoring-batch-v110-smoke.mjs';
const r = await runCwlAuthoringBatchV110Smoke({ skipPriorChain: true });
if (!r.ok) { console.error(r); process.exit(1); }
console.log('v110 ok', r.gate110Mode);
"

if [[ "${CHRYSALIS_GCE_POST110_PHASE_B:-1}" == "1" ]]; then
  log "phase: post-110 verify-gaps reinforcement (B1-B5)"
  run_phase post110-verify-gaps pnpm run hub:verify-gaps-post110-reinforcement-smoke
else
  log "phase: skip post-110 Phase B (set CHRYSALIS_GCE_POST110_PHASE_B=1 to enable)"
fi

date -Is >"${OK_FILE}"
log "ALL OK — marker ${OK_FILE}"
