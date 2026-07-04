#!/usr/bin/env bash
set -euo pipefail
REPO="${CHRYSALIS_STATUS_REPO:-$HOME/chrysalis-test}"
cd "${REPO}"

echo "=== markers ==="
test -f reports/ci/gce-maintenance-program-complete.ok && echo OK || echo NO_OK

echo "=== processes ==="
pgrep -af gce-maintenance-program-complete-only || true
pgrep -af hub-maintenance-program-complete-smoke || true

echo "=== log sizes ==="
ls -la reports/ci/gce-maintenance-program-complete*.log 2>/dev/null || true

echo "=== log tail (main) ==="
tail -n 20 reports/ci/gce-maintenance-program-complete.log 2>/dev/null || true

echo "=== child of maintenance node ==="
MPID=$(pgrep -f 'node scripts/hub-ingest/hub-maintenance-program-complete-smoke' | head -1 || true)
if [[ -n "${MPID}" ]]; then
  ps -p "${MPID}" -o etime,pcpu,pmem,cmd 2>/dev/null || true
  ps --ppid "${MPID}" -o pid,etime,pcpu,cmd 2>/dev/null || true
fi

echo "=== node wait channel ==="
MPID=$(pgrep -f 'node scripts/hub-ingest/hub-maintenance-program-complete-smoke' | head -1 || true)
if [[ -n "${MPID}" ]]; then
  cat "/proc/${MPID}/wchan" 2>/dev/null || true
  echo
  ps --ppid "${MPID}" -o pid,etime,pcpu,cmd 2>/dev/null || echo "(no children)"
fi

echo "=== zombie/defunct processes ==="
ps aux | awk '$8 ~ /Z/ {print}' || echo "(none)"

echo "=== all descendants of maintenance node ==="
MPID=$(pgrep -f 'node scripts/hub-ingest/hub-maintenance-program-complete-smoke' | head -1 || true)
if [[ -n "${MPID}" ]]; then
  pgrep -P "${MPID}" || echo "(no direct children)"
  pstree -p "${MPID}" 2>/dev/null || true
fi
