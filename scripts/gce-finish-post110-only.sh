#!/usr/bin/env bash
# Run only post110-verify-gaps and write gce-all-tests.ok when the full mega tail is already green.
set -euo pipefail

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"
mkdir -p reports/ci

export NODE_OPTIONS="${NODE_OPTIONS:---disable-warning=ExperimentalWarning}"
export CHRYSALIS_GCE_ALL_TESTS=1
export CHRYSALIS_HUB_SMOKE_PROGRESS="${CHRYSALIS_HUB_SMOKE_PROGRESS:-1}"

LOG="${CHRYSALIS_GCE_ALL_TESTS_LOG:-reports/ci/gce-all-tests.log}"
PID_FILE="${HOME}/.chrysalis-gce-test.pid"
OK_FILE="reports/ci/gce-all-tests.ok"
LOCK_FILE="${HOME}/.chrysalis-gce-test.lock"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

run_phase() {
  bash "${SCRIPT_DIR}/gce-run-phase.sh" "$@"
}

log() { echo "[gce-all-tests] $(date -Is) $*" >>"${LOG}"; echo "[gce-all-tests] $(date -Is) $*"; }

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

log "FINISH post110 only (repo=${REPO})"
GCE_PHASE_LIST="$(node "${SCRIPT_DIR}/gce-phase-list.mjs" csv)"
node "${SCRIPT_DIR}/gce-progress.mjs" bootstrap "${GCE_PHASE_LIST}" || log "WARN: progress bootstrap failed"

log "phase: post-110 verify-gaps reinforcement (B1-B5)"
run_phase post110-verify-gaps env \
  CHRYSALIS_HUB_GAP_REINGEST_STRICT=1 \
  CHRYSALIS_HUB_GAP_REINGEST=1 \
  CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE=1 \
  CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY=1 \
  CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP=1 \
  pnpm run hub:verify-gaps-post110-reinforcement-smoke

date -Is >"${OK_FILE}"
log "ALL OK — marker ${OK_FILE}"
