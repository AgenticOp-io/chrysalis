#!/usr/bin/env bash
# One-shot: kill stale GCE workers, bootstrap progress from phase logs, resume mega sub-phases only.
set -euo pipefail

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"
mkdir -p reports/ci

echo "=== kill stale workers ==="
pkill -f 'node.*hub-completion|node.*cwl-batch-v106|node.*hub-cwl-authoring-batch-v106' 2>/dev/null || true
pkill -f 'bash scripts/gce-run-all-tests.sh|bash scripts/gce-resume-from-' 2>/dev/null || true
sleep 2
if pgrep -af 'gce-run|gce-resume|hub-completion|cwl-batch-v106' 2>/dev/null; then
  echo "WARN: some workers still alive (see above)"
else
  echo "(no workers)"
fi
rm -f "${HOME}/.chrysalis-gce-test.lock" "${HOME}/.chrysalis-gce-test.pid"
find scripts -name '*.sh' -exec sed -i 's/\r$//' {} +

echo "=== bootstrap 38-phase manifest ==="
GCE_PHASE_LIST="$(node scripts/gce-phase-list.mjs csv)"
node scripts/gce-progress.mjs bootstrap "${GCE_PHASE_LIST}"
# Clear stale running marker when worker died mid-phase (not is-done).
CURRENT="$(node -e "const p=require('./reports/ci/gce-progress.json');console.log(p.currentPhase??'')")"
if [[ -n "${CURRENT}" ]] && ! node scripts/gce-progress.mjs is-done "${CURRENT}" 2>/dev/null; then
  node scripts/gce-progress.mjs finish "${CURRENT}" 1 || true
  echo "marked stale phase failed: ${CURRENT}"
fi

echo "=== ensure fullstack cwl emits ==="
bash scripts/gce-ensure-fixture-emits.sh

echo "=== start mega resume (unfinished only) ==="
nohup bash scripts/gce-resume-from-mega-phases.sh </dev/null >>reports/ci/gce-all-tests.log 2>&1 &
sleep 2
if [[ -f "${HOME}/.chrysalis-gce-test.pid" ]]; then
  echo "started pid=$(cat "${HOME}/.chrysalis-gce-test.pid")"
else
  echo "WARN: pid file missing (check reports/ci/gce-all-tests.log)"
fi
node scripts/gce-progress.mjs summary
