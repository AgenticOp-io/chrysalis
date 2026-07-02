#!/usr/bin/env bash
# Canonical Chrysalis test suite on Linux GCE (detached-safe; laptop can disconnect).
# Each step is a separate gce-run-phase for progress/resume granularity (no monolithic sub-suites).
set -euo pipefail

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"
mkdir -p reports/ci

export NODE_OPTIONS="${NODE_OPTIONS:---disable-warning=ExperimentalWarning}"
export CHRYSALIS_HUB_CWL_BATCH_FAST_CHAIN="${CHRYSALIS_HUB_CWL_BATCH_FAST_CHAIN:-1}"
export CHRYSALIS_GCE_ALL_TESTS=1
export CHRYSALIS_GCE_HUB_COMPLETION_FAST="${CHRYSALIS_GCE_HUB_COMPLETION_FAST:-1}"
export CHRYSALIS_GCE_SLIM_HUB_STRATEGIC="${CHRYSALIS_GCE_SLIM_HUB_STRATEGIC:-1}"
export CHRYSALIS_GCE_V110_SKIP_REPEAT_MEGAS="${CHRYSALIS_GCE_V110_SKIP_REPEAT_MEGAS:-1}"
export CHRYSALIS_GCE_MEGA_DEDUPE="${CHRYSALIS_GCE_MEGA_DEDUPE:-1}"
export CHRYSALIS_HUB_SMOKE_PROGRESS="${CHRYSALIS_HUB_SMOKE_PROGRESS:-1}"
export CHRYSALIS_EXPRESS_SERVER_START_TIMEOUT_MS="${CHRYSALIS_EXPRESS_SERVER_START_TIMEOUT_MS:-60000}"

LOG="${CHRYSALIS_GCE_ALL_TESTS_LOG:-reports/ci/gce-all-tests.log}"
PID_FILE="${HOME}/.chrysalis-gce-test.pid"
OK_FILE="reports/ci/gce-all-tests.ok"
LOCK_FILE="${HOME}/.chrysalis-gce-test.lock"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

run_phase() {
  bash "${SCRIPT_DIR}/gce-run-phase.sh" "$@"
}

GCE_PROGRESS="${SCRIPT_DIR}/gce-progress.mjs"

log() { echo "[gce-all-tests] $(date -Is) $*"; }

init_progress_manifest() {
  local list
  list="$(node "${SCRIPT_DIR}/gce-phase-list.mjs" csv)"
  log "progress manifest: $(node "${SCRIPT_DIR}/gce-phase-list.mjs" count) phases"
  CHRYSALIS_GCE_PHASE_LIST="${list}" node "${GCE_PROGRESS}" init "${list}"
}

skip_phase() {
  node "${GCE_PROGRESS}" skip "$1"
}

if [[ "${CHRYSALIS_GCE_LIST_PHASES:-}" == "1" ]]; then
  cat <<'EOF'
gce-all-tests phases (each writes reports/ci/gce-phase-<name>.log; see reports/ci/gce-progress.json):
  build-install, build-compile, parser-bridge-vendor
  cli-shims
  hub-strategic-vitest, hub-express-flagship, hub-plain-php-flagship, hub-symfony-flagship
  hub-node-express-oracle-verify, hub-node-oracle-spike
  hub-cwl, hub-fixture-emits
  hub-cwl-authoring-v61-v63, hub-cwl-authoring-v64-v70, hub-cwl-authoring-v71-v90, hub-cwl-authoring-v91-v110
  wptp-matrix
  hub-gold-verify, hub-gold-trace-replay
  full-vitest (optional)
  hub-completion-json, hub-completion-gate, hub-knowledge
  cwl-http-verify, cwl-batch-v40, cwl-batch-v60
  cwl-v106-* (7 oracle ultra slices), cwl-v107-* (3 verify mega slices)
  cwl-v110-verify-gaps-parallel, cwl-v110-migration-mega
  post110-verify-gaps (optional)
  Full list: node scripts/gce-phase-list.mjs csv
Progress summary: node scripts/gce-progress.mjs summary
EOF
  exit 0
fi

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

log "repo=${REPO} full_vitest=${CHRYSALIS_GCE_FULL_VITEST:-0}"

bash "${SCRIPT_DIR}/gce-cleanup-vm-temp.sh" || log "WARN: gce-cleanup-vm-temp failed (continuing)"

init_progress_manifest

if [[ "${CHRYSALIS_GCE_SKIP_PNPM_INSTALL:-}" != "1" ]]; then
  log "phase: build-install"
  run_phase build-install pnpm install
else
  skip_phase build-install
fi

if [[ "${CHRYSALIS_GCE_SKIP_BUILD:-}" != "1" ]]; then
  log "phase: build-compile"
  run_phase build-compile pnpm -r build
else
  skip_phase build-compile
fi

log "phase: parser-bridge-vendor"
if command -v php >/dev/null 2>&1; then
  export CHRYSALIS_SKIP_PARSER_VENDOR=0
  if ! run_phase parser-bridge-vendor pnpm run vendor:parser-bridge; then
    log "WARN: parser-bridge vendor failed (continuing)"
  fi
else
  export CHRYSALIS_SKIP_PARSER_VENDOR=1
  skip_phase parser-bridge-vendor
fi

export CHRYSALIS_GCE_SKIP_PNPM_INSTALL=1
export CHRYSALIS_GCE_SKIP_BUILD=1

log "phase: cli shims"
run_phase cli-shims pnpm run test:cli-shims

log "phase: hub strategic vitest"
run_phase hub-strategic-vitest bash scripts/gce-hub-strategic-vitest.sh

if [[ "${CHRYSALIS_GCE_PHASE8_STRICT:-1}" == "1" ]]; then
  log "phase: strategic plan phase8 strict product proof"
  run_phase strategic-plan-phase8-strict bash scripts/gce-strategic-plan-phase8-strict.sh
else
  log "phase: skip phase8 strict (set CHRYSALIS_GCE_PHASE8_STRICT=1 to enable)"
  skip_phase strategic-plan-phase8-strict
fi

log "phase: hub express flagship"
run_phase hub-express-flagship pnpm run hub:express-flagship

log "phase: hub plain-php flagship"
run_phase hub-plain-php-flagship pnpm run hub:plain-php-flagship

log "phase: hub symfony flagship"
run_phase hub-symfony-flagship pnpm run hub:symfony-flagship

log "phase: hub node express oracle verify"
run_phase hub-node-express-oracle-verify pnpm run hub:node-express-oracle-verify

log "phase: hub node oracle spike"
run_phase hub-node-oracle-spike pnpm run hub:node-oracle-spike

log "phase: hub-cwl vitest"
run_phase hub-cwl bash scripts/gce-hub-cwl-vitest.sh

log "phase: ensure fixture emits (authoring vitest)"
run_phase hub-fixture-emits bash scripts/gce-ensure-fixture-emits.sh

log "phase: hub CWL authoring v61-v63"
run_phase hub-cwl-authoring-v61-v63 bash scripts/gce-hub-authoring-vitest-one.sh packages/cli/tests/hub-cwl-authoring-batch-v61-v63.test.ts hub-cwl-authoring-v61-v63

log "phase: hub CWL authoring v64-v70"
run_phase hub-cwl-authoring-v64-v70 bash scripts/gce-hub-authoring-vitest-one.sh packages/cli/tests/hub-cwl-authoring-batch-v64-v70.test.ts hub-cwl-authoring-v64-v70

log "phase: hub CWL authoring v71-v90"
run_phase hub-cwl-authoring-v71-v90 bash scripts/gce-hub-authoring-vitest-one.sh packages/cli/tests/hub-cwl-authoring-batch-v71-v90.test.ts hub-cwl-authoring-v71-v90

log "phase: hub CWL authoring v91-v110"
run_phase hub-cwl-authoring-v91-v110 bash scripts/gce-hub-authoring-vitest-one.sh packages/cli/tests/hub-cwl-authoring-batch-v91-v110.test.ts hub-cwl-authoring-v91-v110

log "phase: ensure wptp-matrix (contract-first gold)"
run_phase wptp-matrix bash scripts/gce-ensure-wptp-matrix.sh
SIBLINGS_ROOT="$(dirname "${REPO}")"
export WPTP_MATRIX_ROOT="${WPTP_MATRIX_ROOT:-${SIBLINGS_ROOT}/wptp-matrix}"
export WPTP_EMIT_NEXTJS_ROOT="${WPTP_EMIT_NEXTJS_ROOT:-${SIBLINGS_ROOT}/wptp-emit-nextjs}"

log "phase: hub gold verify (structural)"
run_phase hub-gold-verify bash scripts/gce-hub-gold-verify.sh

log "phase: hub gold trace replay"
run_phase hub-gold-trace-replay bash scripts/gce-hub-gold-trace-replay.sh

if [[ "${CHRYSALIS_GCE_FULL_VITEST:-}" == "1" ]]; then
  log "phase: full workspace vitest (pnpm test)"
  run_phase full-vitest pnpm test
else
  log "phase: skip full vitest (set CHRYSALIS_GCE_FULL_VITEST=1 to enable)"
  skip_phase full-vitest
fi

log "phase: hub completion json artifact"
run_phase hub-completion-json node scripts/hub-ingest/hub-completion.mjs --json-out reports/ci/hub-completion.json

log "phase: hub completion ci gate"
run_phase hub-completion-gate node scripts/ci-gates.mjs hub-completion reports/ci/hub-completion.json

log "phase: hub knowledge ci gates"
run_phase hub-knowledge pnpm run ci:hub-knowledge

if [[ "${CHRYSALIS_GCE_INTELLIGENCE_SHORTHAND:-1}" != "0" ]]; then
  log "phase: intelligence shorthand close (G8560, CPU only)"
  run_phase intelligence-shorthand-close env CHRYSALIS_POC_SKIP_BUILD=1 CHRYSALIS_WEB_LLM_TRAJECTORY=1 pnpm run hub:intelligence-shorthand-close-smoke
  log "phase: IS runtime protocol close (G8600, CPU only)"
  run_phase is-runtime-close env CHRYSALIS_POC_SKIP_BUILD=1 CHRYSALIS_WEB_LLM_TRAJECTORY=1 pnpm run hub:is-runtime-close-smoke
else
  log "phase: skip intelligence shorthand (CHRYSALIS_GCE_INTELLIGENCE_SHORTHAND=0)"
  skip_phase intelligence-shorthand-close
  skip_phase is-runtime-close
fi

if [[ "${CHRYSALIS_GCE_MIGRATION_OS:-1}" != "0" ]]; then
  log "phase: migration os close (G8550)"
  run_phase migration-os-close env CHRYSALIS_POC_SKIP_BUILD=1 CHRYSALIS_WEB_LLM_TRAJECTORY=1 pnpm run hub:migration-os-close-smoke

  log "phase: open web-llm close (G8290)"
  run_phase open-web-llm-close env CHRYSALIS_POC_SKIP_BUILD=1 CHRYSALIS_WEB_LLM_TRAJECTORY=1 pnpm run hub:open-web-llm-close-smoke

  log "phase: wisp web-llm poc close (G8310)"
  if [[ "${CHRYSALIS_GCE_WISP_LIVE:-}" == "1" ]]; then
    run_phase wisp-web-llm-poc-close env CHRYSALIS_POC_SKIP_BUILD=1 CHRYSALIS_WEB_LLM_TRAJECTORY=1 CHRYSALIS_G8310_LIVE=1 pnpm run hub:wisp-web-llm-poc-close-smoke
  else
    run_phase wisp-web-llm-poc-close env CHRYSALIS_POC_SKIP_BUILD=1 CHRYSALIS_WEB_LLM_TRAJECTORY=1 pnpm run hub:wisp-web-llm-poc-close-smoke
  fi

  log "phase: open legacy wedge (G8570)"
  run_phase open-legacy-wedge env CHRYSALIS_POC_SKIP_BUILD=1 CHRYSALIS_WEB_LLM_TRAJECTORY=1 pnpm run hub:site-port-open-legacy-wedge-smoke

  log "phase: migration evidence hub refresh"
  run_phase migration-evidence-hub-refresh node scripts/migration-evidence-build-hub.mjs
else
  log "phase: skip migration os composite (CHRYSALIS_GCE_MIGRATION_OS=0)"
  skip_phase migration-os-close
  skip_phase open-web-llm-close
  skip_phase wisp-web-llm-poc-close
  skip_phase open-legacy-wedge
  skip_phase migration-evidence-hub-refresh
fi

log "phase: cwl fullstack HTTP verify"
run_phase cwl-http-verify node scripts/hub-ingest/hub-cwl-fullstack-verify-http-smoke.mjs

log "phase: cwl fast batch v40"
run_phase cwl-batch-v40 bash scripts/gce-cwl-batch-v40-fast.sh

log "phase: cwl batch v60 (post50 composite)"
run_phase cwl-batch-v60 bash scripts/gce-cwl-batch-v60.sh

# shellcheck source=gce-run-mega-phases.sh
source "${SCRIPT_DIR}/gce-run-mega-phases.sh"
run_mega_subphases

if [[ "${CHRYSALIS_GCE_POST110_PHASE_B:-1}" == "1" ]]; then
  log "phase: post-110 verify-gaps reinforcement (B1-B5)"
  run_phase post110-verify-gaps env \
    CHRYSALIS_HUB_GAP_REINGEST_STRICT=1 \
    CHRYSALIS_HUB_GAP_REINGEST=1 \
    CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE=1 \
    CHRYSALIS_HUB_GAP_REINGEST_VERIFY_REPLAY=1 \
    CHRYSALIS_HUB_GAP_REINGEST_VERIFY_HTTP=1 \
    pnpm run hub:verify-gaps-post110-reinforcement-smoke
else
  log "phase: skip post-110 Phase B (set CHRYSALIS_GCE_POST110_PHASE_B=1 to enable)"
  skip_phase post110-verify-gaps
fi

date -Is >"${OK_FILE}"
log "ALL OK — marker ${OK_FILE}"
