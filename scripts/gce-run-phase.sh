#!/usr/bin/env bash
# Run a named GCE test phase with line-buffered logging to reports/ci/gce-phase-*.log
set -euo pipefail

PHASE="${1:?phase name required}"
shift
PHASE_CMD="$*"

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"
mkdir -p reports/ci

PHASE_LOG="reports/ci/gce-phase-${PHASE}.log"
MAIN_LOG="${CHRYSALIS_GCE_ALL_TESTS_LOG:-reports/ci/gce-all-tests.log}"
PROGRESS_FILE="${CHRYSALIS_GCE_PROGRESS_FILE:-reports/ci/gce-progress.json}"

log() { echo "[gce-phase:${PHASE}] $(date -Is) $*"; }

write_progress() {
  local status="$1"
  local exit_code="${2:-}"
  PROGRESS_FILE="${PROGRESS_FILE}" PHASE="${PHASE}" STATUS="${status}" EXIT_CODE="${exit_code}" PHASE_CMD="${PHASE_CMD}" \
    node --input-type=module -e "
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const file = process.env.PROGRESS_FILE;
mkdirSync(dirname(file), { recursive: true });
let prev = {};
try { prev = JSON.parse(readFileSync(file, 'utf8')); } catch { /* fresh */ }
const running = process.env.STATUS === 'running';
writeFileSync(file, JSON.stringify({
  kind: 'chrysalis.gce.progress',
  schemaVersion: 1,
  phase: process.env.PHASE,
  status: process.env.STATUS,
  exitCode: process.env.EXIT_CODE ? Number(process.env.EXIT_CODE) : null,
  cmd: process.env.PHASE_CMD || null,
  phaseLog: 'reports/ci/gce-phase-' + process.env.PHASE + '.log',
  startedAt: running ? new Date().toISOString() : (prev.startedAt ?? null),
  updatedAt: new Date().toISOString(),
}, null, 2) + '\n', 'utf8');
"
}

write_progress running
log "START ${PHASE_CMD}"
{
  echo "=== phase ${PHASE} $(date -Is) ==="
  echo "cmd: ${PHASE_CMD}"
  if command -v stdbuf >/dev/null 2>&1; then
    stdbuf -oL -eL "$@"
  else
    "$@"
  fi
} 2>&1 | tee -a "${PHASE_LOG}" | tee -a "${MAIN_LOG}"

ec="${PIPESTATUS[0]}"
if [[ "${ec}" -eq 0 ]]; then
  write_progress ok "${ec}"
else
  write_progress failed "${ec}"
fi
log "END exit=${ec} log=${PHASE_LOG}"
exit "${ec}"
