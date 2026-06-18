#!/usr/bin/env bash
# Detached-friendly wrapper: Phase 8 strict product proof on Linux GCE only.
set -euo pipefail

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"
mkdir -p reports/ci

OK_MARKER="${REPO}/reports/ci/gce-phase8-strict.ok"
rm -f "${OK_MARKER}"

export CHRYSALIS_STRICT_STRATEGIC_PLAN=1
export CHRYSALIS_STATUS_REPO="${REPO}"

node scripts/gce-progress.mjs init strategic-plan-phase8-strict

bash scripts/gce-run-phase.sh strategic-plan-phase8-strict bash scripts/gce-strategic-plan-phase8-strict.sh

date -Is >"${OK_MARKER}"
echo "[gce-phase8-strict-only] OK marker ${OK_MARKER}"
