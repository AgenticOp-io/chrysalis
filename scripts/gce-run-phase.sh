#!/usr/bin/env bash
# Run a named GCE test phase with line-buffered logging to reports/ci/gce-phase-*.log
set -euo pipefail

PHASE="${1:?phase name required}"
shift
PHASE_CMD="$*"

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${REPO}"
mkdir -p reports/ci

PHASE_LOG="reports/ci/gce-phase-${PHASE}.log"
MAIN_LOG="${CHRYSALIS_GCE_ALL_TESTS_LOG:-reports/ci/gce-all-tests.log}"
PROGRESS_FILE="${CHRYSALIS_GCE_PROGRESS_FILE:-reports/ci/gce-progress.json}"
export CHRYSALIS_GCE_PROGRESS_FILE="${PROGRESS_FILE}"
GCE_PROGRESS="${SCRIPT_DIR}/gce-progress.mjs"

log() { echo "[gce-phase:${PHASE}] $(date -Is) $*"; }

if node "${GCE_PROGRESS}" is-done "${PHASE}" 2>/dev/null; then
  log "SKIP already complete"
  echo "[gce-phase:${PHASE}] $(date -Is) SKIP already complete" >> "${PHASE_LOG}"
  echo "[gce-phase:${PHASE}] $(date -Is) SKIP already complete" >> "${MAIN_LOG}"
  exit 0
fi

node "${GCE_PROGRESS}" start "${PHASE}"
log "START ${PHASE_CMD}"
{
  echo "=== phase ${PHASE} $(date -Is) ==="
  echo "cmd: ${PHASE_CMD}"
  if command -v stdbuf >/dev/null 2>&1; then
    stdbuf -oL "$@"
  else
    "$@"
  fi
} 2>&1 | tee -a "${PHASE_LOG}" | tee -a "${MAIN_LOG}"

ec="${PIPESTATUS[0]}"
node "${GCE_PROGRESS}" finish "${PHASE}" "${ec}"
log "END exit=${ec} log=${PHASE_LOG}"
echo "[gce-phase:${PHASE}] $(date -Is) END exit=${ec} log=${PHASE_LOG}" >> "${PHASE_LOG}"
exit "${ec}"
