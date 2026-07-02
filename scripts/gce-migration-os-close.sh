#!/usr/bin/env bash
# Migration OS close slice on Linux GCE: G8560 + G8550 + G8290 + G8310 + G8570.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="${CHRYSALIS_STATUS_REPO:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
cd "${REPO}"

export NODE_OPTIONS="${NODE_OPTIONS:---disable-warning=ExperimentalWarning}"
export CHRYSALIS_POC_SKIP_BUILD="${CHRYSALIS_POC_SKIP_BUILD:-1}"
export CHRYSALIS_WEB_LLM_TRAJECTORY="${CHRYSALIS_WEB_LLM_TRAJECTORY:-1}"

run_phase() {
  bash "${SCRIPT_DIR}/gce-run-phase.sh" "$@"
}

if [[ ! -f packages/web-llm/dist/index.js ]]; then
  pnpm --filter @chrysalis/web-llm build
fi

run_phase intelligence-shorthand-close \
  env CHRYSALIS_POC_SKIP_BUILD=1 CHRYSALIS_WEB_LLM_TRAJECTORY=1 \
  pnpm run hub:intelligence-shorthand-close-smoke

run_phase migration-os-close \
  env CHRYSALIS_POC_SKIP_BUILD=1 CHRYSALIS_WEB_LLM_TRAJECTORY=1 \
  pnpm run hub:migration-os-close-smoke

run_phase open-web-llm-close \
  env CHRYSALIS_POC_SKIP_BUILD=1 CHRYSALIS_WEB_LLM_TRAJECTORY=1 \
  pnpm run hub:open-web-llm-close-smoke

if [[ "${CHRYSALIS_GCE_WISP_LIVE:-}" == "1" ]]; then
  run_phase wisp-web-llm-poc-close \
    env CHRYSALIS_POC_SKIP_BUILD=1 CHRYSALIS_WEB_LLM_TRAJECTORY=1 CHRYSALIS_G8310_LIVE=1 \
    pnpm run hub:wisp-web-llm-poc-close-smoke
else
  run_phase wisp-web-llm-poc-close \
    env CHRYSALIS_POC_SKIP_BUILD=1 CHRYSALIS_WEB_LLM_TRAJECTORY=1 \
    pnpm run hub:wisp-web-llm-poc-close-smoke
fi

run_phase open-legacy-wedge \
  env CHRYSALIS_POC_SKIP_BUILD=1 CHRYSALIS_WEB_LLM_TRAJECTORY=1 \
  pnpm run hub:site-port-open-legacy-wedge-smoke

run_phase migration-evidence-hub-refresh \
  node scripts/migration-evidence-build-hub.mjs
