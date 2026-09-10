#!/usr/bin/env bash
# Resume GCE suite from hub-express-flagship (phases 1-5 already passed on VM).
set -euo pipefail

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"
mkdir -p reports/ci

export NODE_OPTIONS="${NODE_OPTIONS:---disable-warning=ExperimentalWarning}"
export CHRYSALIS_HUB_CWL_BATCH_FAST_CHAIN="${CHRYSALIS_HUB_CWL_BATCH_FAST_CHAIN:-1}"
export CHRYSALIS_GCE_ALL_TESTS=1
export CHRYSALIS_GCE_HUB_COMPLETION_FAST="${CHRYSALIS_GCE_HUB_COMPLETION_FAST:-1}"
export CHRYSALIS_GCE_SLIM_HUB_STRATEGIC="${CHRYSALIS_GCE_SLIM_HUB_STRATEGIC:-1}"
export CHRYSALIS_GCE_SKIP_PNPM_INSTALL=1
export CHRYSALIS_GCE_SKIP_BUILD=1
export CHRYSALIS_GCE_V110_SKIP_REPEAT_MEGAS="${CHRYSALIS_GCE_V110_SKIP_REPEAT_MEGAS:-1}"
export CHRYSALIS_EXPRESS_SERVER_START_TIMEOUT_MS="${CHRYSALIS_EXPRESS_SERVER_START_TIMEOUT_MS:-60000}"

LOG="${CHRYSALIS_GCE_ALL_TESTS_LOG:-reports/ci/gce-all-tests.log}"
PID_FILE="${HOME}/.chrysalis-gce-test.pid"
OK_FILE="reports/ci/gce-all-tests.ok"
LOCK_FILE="${HOME}/.chrysalis-gce-test.lock"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GCE_PHASE_LIST="$(node "${SCRIPT_DIR}/gce-phase-list.mjs" csv)"

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

log "RESUME from hub-express-flagship (repo=${REPO})"
GCE_PROGRESS="${SCRIPT_DIR}/gce-progress.mjs"
node "${GCE_PROGRESS}" bootstrap "${GCE_PHASE_LIST}" || log "WARN: progress bootstrap failed"

log "phase: hub express flagship"
run_phase hub-express-flagship pnpm run hub:express-flagship

log "phase: hub plain-php flagship"
run_phase hub-plain-php-flagship pnpm run hub:plain-php-flagship

log "phase: hub symfony flagship"
run_phase hub-symfony-flagship pnpm run hub:symfony-flagship

log "phase: hub node express oracle verify"
run_phase hub-node-express-oracle-verify pnpm run hub:node-express-oracle-verify

log "phase: hub node oracle spike"
run_phase hub-node-oracle-spike pnpm run hub:node-oracle-spike

log "phase: hub-cwl vitest"
run_phase hub-cwl bash scripts/gce-hub-cwl-vitest.sh

log "phase: ensure fixture emits (authoring vitest)"
run_phase hub-fixture-emits bash scripts/gce-ensure-fixture-emits.sh

log "phase: hub CWL authoring v61-v63"
run_phase hub-cwl-authoring-v61-v63 bash scripts/gce-hub-authoring-vitest-one.sh packages/cli/tests/hub-cwl-authoring-batch-v61-v63.test.ts hub-cwl-authoring-v61-v63

log "phase: hub CWL authoring v64-v70"
run_phase hub-cwl-authoring-v64-v70 bash scripts/gce-hub-authoring-vitest-one.sh packages/cli/tests/hub-cwl-authoring-batch-v64-v70.test.ts hub-cwl-authoring-v64-v70

log "phase: hub CWL authoring v71-v90"
run_phase hub-cwl-authoring-v71-v90 bash scripts/gce-hub-authoring-vitest-one.sh packages/cli/tests/hub-cwl-authoring-batch-v71-v90.test.ts hub-cwl-authoring-v71-v90

log "phase: hub CWL authoring v91-v110"
run_phase hub-cwl-authoring-v91-v110 bash scripts/gce-hub-authoring-vitest-one.sh packages/cli/tests/hub-cwl-authoring-batch-v91-v110.test.ts hub-cwl-authoring-v91-v110

log "phase: ensure wptp-matrix (contract-first gold)"
run_phase wptp-matrix bash scripts/gce-ensure-wptp-matrix.sh
# shellcheck disable=SC1091
source "${REPO}/scripts/lib/gce-wptp-siblings.sh"
chrysalis_export_wptp_roots "${REPO}"
SIBLINGS_ROOT="${WPTP_SIBLINGS_ROOT}"
export WPTP_MATRIX_ROOT WPTP_EMIT_NEXTJS_ROOT WPTP_IR_ROOT WPTP_SIBLINGS_ROOT

log "phase: hub gold verify (structural)"
run_phase hub-gold-verify bash scripts/gce-hub-gold-verify.sh

log "phase: hub gold trace replay"
run_phase hub-gold-trace-replay bash scripts/gce-hub-gold-trace-replay.sh

if [[ "${CHRYSALIS_GCE_FULL_VITEST:-}" == "1" ]]; then
  log "phase: full workspace vitest (pnpm test)"
  run_phase full-vitest pnpm test
fi

log "phase: hub completion json artifact"
run_phase hub-completion-json node scripts/hub-ingest/hub-completion.mjs --json-out reports/ci/hub-completion.json

log "phase: hub completion ci gate"
run_phase hub-completion-gate node scripts/ci-gates.mjs hub-completion reports/ci/hub-completion.json

log "phase: hub knowledge ci gates"
run_phase hub-knowledge pnpm run ci:hub-knowledge

log "phase: cwl fullstack HTTP verify"
run_phase cwl-http-verify node scripts/hub-ingest/hub-cwl-fullstack-verify-http-smoke.mjs

log "phase: cwl fast batch v40"
run_phase cwl-batch-v40 bash scripts/gce-cwl-batch-v40-fast.sh

log "phase: cwl batch v60 (post50 composite)"
run_phase cwl-batch-v60 bash scripts/gce-cwl-batch-v60.sh

# shellcheck source=gce-run-mega-phases.sh
source "${SCRIPT_DIR}/gce-run-mega-phases.sh"
run_mega_subphases

if [[ "${CHRYSALIS_GCE_POST110_PHASE_B:-1}" == "1" ]]; then
  log "phase: post-110 verify-gaps reinforcement (B1-B5)"
  run_phase post110-verify-gaps env \
    CHRYSALIS_HUB_GAP_REINGEST_STRICT=1 \
    CHRYSALIS_HUB_GAP_REINGEST=1 \
    CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE=1 \
    CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY=1 \
    CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP=1 \
    pnpm run hub:verify-gaps-post110-reinforcement-smoke
fi

date -Is >"${OK_FILE}"
log "ALL OK — marker ${OK_FILE}"
