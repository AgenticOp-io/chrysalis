#!/usr/bin/env bash
set -euo pipefail
REPO="${CHRYSALIS_STATUS_REPO:-$HOME/chrysalis-test}"
cd "${REPO}"
echo "=== $(date -Is) post110 progress probe ==="
PID=$(pgrep -f 'hub-verify-gaps-post110-reinforcement-smoke.mjs' | head -1 || true)
if [[ -n "${PID}" ]]; then
  ps -p "${PID}" -o etime,pcpu,pmem,cmd
  echo "wchan: $(cat /proc/${PID}/wchan 2>/dev/null || echo '?')"
else
  echo "post110 smoke process: not running"
fi
echo "--- verify summary mtimes (flagships) ---"
for f in hub-flagship-plain-php hub-flagship-symfony hub-flagship-express hub-flagship-cwl-fullstack; do
  p="fixtures/${f}/reports/verify/summary.json"
  if [[ -f "${p}" ]]; then
    echo "$(stat -c '%y' "${p}")  ${f}"
  else
    echo "missing  ${f}"
  fi
done
echo "--- latest emit mtimes ---"
find fixtures/hub-flagship-plain-php fixtures/hub-flagship-symfony fixtures/hub-flagship-express \
  -path '*/.chrysalis/*.emit.json' -o -path '*/generated/*/package.json' 2>/dev/null \
  | while read -r p; do stat -c '%y %n' "${p}"; done | sort -r | head -12
echo "--- post110 started ---"
grep -m1 'phase post110' reports/ci/gce-phase-post110-verify-gaps.log 2>/dev/null || true
echo "--- OK marker ---"
test -f reports/ci/gce-all-tests.ok && echo yes || echo no
