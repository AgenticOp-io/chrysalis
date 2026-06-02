#!/usr/bin/env bash
# Run a named GCE test phase with line-buffered logging to reports/ci/gce-phase-*.log
set -euo pipefail

PHASE="${1:?phase name required}"
shift

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"
mkdir -p reports/ci

PHASE_LOG="reports/ci/gce-phase-${PHASE}.log"
MAIN_LOG="${CHRYSALIS_GCE_ALL_TESTS_LOG:-reports/ci/gce-all-tests.log}"

log() { echo "[gce-phase:${PHASE}] $(date -Is) $*"; }

log "START $*"
{
  echo "=== phase ${PHASE} $(date -Is) ==="
  echo "cmd: $*"
  if command -v stdbuf >/dev/null 2>&1; then
    stdbuf -oL -eL "$@"
  else
    "$@"
  fi
} 2>&1 | tee -a "${PHASE_LOG}" | tee -a "${MAIN_LOG}"

ec="${PIPESTATUS[0]}"
log "END exit=${ec} log=${PHASE_LOG}"
exit "${ec}"
