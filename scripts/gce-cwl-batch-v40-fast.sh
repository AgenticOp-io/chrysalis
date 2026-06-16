#!/usr/bin/env bash
# Fast-chain full-stack authoring batch v40 on Linux (GCE or local bash).
# Prereq: pnpm -r build (or run from gce-vm-verify-suite after build).
set -euo pipefail

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"
LOG="${CHRYSALIS_CWL_BATCH_V40_LOG:-reports/ci/hub-cwl-batch-v40-fast-gce.log}"
mkdir -p "$(dirname "${LOG}")"

export NODE_OPTIONS="${NODE_OPTIONS:---disable-warning=ExperimentalWarning}"
export CHRYSALIS_HUB_CWL_BATCH_FAST_CHAIN=1

echo "[gce-cwl-batch-v40] repo=${REPO} log=${LOG}"
# GCE: skip v2–v39 re-chain (authoring vitest already ran v61–v110); gate-only like v60+.
node --input-type=module -e "
import { runCwlAuthoringBatchV40Smoke } from './scripts/hub-ingest/hub-cwl-authoring-batch-v40-smoke.mjs';
const r = await runCwlAuthoringBatchV40Smoke({ skipPriorChain: true });
console.log(JSON.stringify(r, null, 2));
if (!r.ok) process.exit(1);
" | tee "${LOG}"
grep -q '"ok": true' "${LOG}" || grep -q '"ok":true' "${LOG}" || {
  echo "[gce-cwl-batch-v40] FAILED: no ok:true in ${LOG}" >&2
  tail -n 40 "${LOG}" >&2
  exit 1
}
echo "[gce-cwl-batch-v40] OK"
