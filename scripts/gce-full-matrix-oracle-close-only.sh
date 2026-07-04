#!/usr/bin/env bash
# Full matrix oracle close smoke (G8790) on Linux GCE.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="${CHRYSALIS_STATUS_REPO:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
cd "${REPO}"

export NODE_OPTIONS="${NODE_OPTIONS:---disable-warning=ExperimentalWarning}"
export CHRYSALIS_POC_SKIP_BUILD="${CHRYSALIS_POC_SKIP_BUILD:-1}"
export CHRYSALIS_WEB_LLM_TRAJECTORY="${CHRYSALIS_WEB_LLM_TRAJECTORY:-1}"

if [[ -f "${HOME}/.chrysalis/gce-hub-env.sh" ]]; then
  # shellcheck source=/dev/null
  source "${HOME}/.chrysalis/gce-hub-env.sh"
fi

if [[ "${CHRYSALIS_SKIP_NATIVE_ORACLE_DEPS:-}" != "1" ]]; then
  bash "${REPO}/scripts/gce-install-native-oracle-deps.sh" || true
  # shellcheck source=/dev/null
  [[ -f "${HOME}/.chrysalis/gce-hub-env.sh" ]] && source "${HOME}/.chrysalis/gce-hub-env.sh"
fi

if [[ "${CHRYSALIS_SKIP_INTELLIGENCE_SHORTHAND_PREP:-}" != "1" ]]; then
  bash "${REPO}/scripts/gce-prep-intelligence-shorthand.sh" || true
fi

OK_MARKER="${REPO}/reports/ci/gce-full-matrix-oracle-close.ok"
LOG="${REPO}/reports/ci/gce-full-matrix-oracle-close.log"
PROGRESS="${REPO}/reports/ci/gce-full-matrix-oracle-close.progress"
mkdir -p "${REPO}/reports/ci"
rm -f "${OK_MARKER}" "${PROGRESS}"

(
  while true; do
    MPID=$(pgrep -f 'node scripts/hub-ingest/hub-full-matrix-oracle-close-smoke' | head -1 || true)
    CHILD=$(pgrep -P "${MPID}" 2>/dev/null | head -1 || true)
    if [[ -n "${CHILD}" ]]; then
      ACT=$(ps -p "${CHILD}" -o args= 2>/dev/null | head -c 200 || true)
    else
      ACT="(no child — in-node work)"
    fi
    date -Is >>"${PROGRESS}"
    echo "  ${ACT}" >>"${PROGRESS}"
    sleep 30
  done
) &
HEARTBEAT_PID=$!
trap 'kill "${HEARTBEAT_PID}" 2>/dev/null || true' EXIT

if command -v stdbuf >/dev/null 2>&1; then
  stdbuf -oL -eL pnpm run hub:full-matrix-oracle-close-smoke 2>&1 | tee "${LOG}"
else
  pnpm run hub:full-matrix-oracle-close-smoke 2>&1 | tee "${LOG}"
fi

kill "${HEARTBEAT_PID}" 2>/dev/null || true
date -Is >"${OK_MARKER}"
echo "[gce-full-matrix-oracle-close-only] OK marker ${OK_MARKER}"
