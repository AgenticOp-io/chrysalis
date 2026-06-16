#!/usr/bin/env bash
# Kill stuck post110 worker and restart only post110-verify-gaps (megas already ok).
set -euo pipefail

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"
mkdir -p reports/ci

echo "=== kill stale workers ==="
pkill -f 'hub-verify-gaps-post110-reinforcement-smoke' 2>/dev/null || true
pkill -f 'gce-run-phase.sh post110-verify-gaps' 2>/dev/null || true
pkill -f 'bash scripts/gce-resume-from-mega-phases.sh|bash scripts/gce-finish-post110-only.sh' 2>/dev/null || true
sleep 2
if pgrep -af 'post110|gce-finish-post110|gce-resume-from-mega' 2>/dev/null; then
  echo "WARN: some workers still alive (see above)"
else
  echo "(no workers)"
fi
rm -f "${HOME}/.chrysalis-gce-test.lock" "${HOME}/.chrysalis-gce-test.pid"
find scripts -name '*.sh' -exec sed -i 's/\r$//' {} +

echo "=== bootstrap progress ==="
GCE_PHASE_LIST="$(node scripts/gce-phase-list.mjs csv)"
node scripts/gce-progress.mjs bootstrap "${GCE_PHASE_LIST}"
CURRENT="$(node -e "const p=require('./reports/ci/gce-progress.json');console.log(p.currentPhase??'')")"
if [[ -n "${CURRENT}" ]] && ! node scripts/gce-progress.mjs is-done "${CURRENT}" 2>/dev/null; then
  node scripts/gce-progress.mjs finish "${CURRENT}" 1 || true
  echo "marked stale phase failed: ${CURRENT}"
fi

echo "=== ensure fixture emits (express + flagships) ==="
bash scripts/gce-ensure-fixture-emits.sh

echo "=== truncate stale post110 phase log ==="
: > reports/ci/gce-phase-post110-verify-gaps.log

echo "=== start post110 only ==="
export CHRYSALIS_HUB_SMOKE_PROGRESS=1
nohup bash scripts/gce-finish-post110-only.sh </dev/null >>reports/ci/gce-all-tests.log 2>&1 &
sleep 2
if [[ -f "${HOME}/.chrysalis-gce-test.pid" ]]; then
  echo "started pid=$(cat "${HOME}/.chrysalis-gce-test.pid")"
else
  echo "WARN: pid file missing (check reports/ci/gce-all-tests.log)"
fi
node scripts/gce-progress.mjs summary
