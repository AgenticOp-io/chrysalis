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
node scripts/hub-ingest/hub-cwl-authoring-batch-v40-smoke.mjs | tee "${LOG}"
grep -q '"ok": true' "${LOG}" || grep -q '"ok":true' "${LOG}" || {
  echo "[gce-cwl-batch-v40] FAILED: no ok:true in ${LOG}" >&2
  tail -n 40 "${LOG}" >&2
  exit 1
}
echo "[gce-cwl-batch-v40] OK"
