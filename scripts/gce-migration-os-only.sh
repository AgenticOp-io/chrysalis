#!/usr/bin/env bash
# Detached-friendly wrapper: Migration OS close on Linux GCE only.
set -euo pipefail

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"
mkdir -p reports/ci

OK_MARKER="${REPO}/reports/ci/gce-migration-os.ok"
rm -f "${OK_MARKER}"

export CHRYSALIS_STATUS_REPO="${REPO}"

node scripts/gce-progress.mjs init \
  intelligence-shorthand-close,is-runtime-close,migration-os-close,open-web-llm-close,wisp-web-llm-poc-close,open-legacy-wedge,migration-evidence-hub-refresh

bash scripts/gce-migration-os-close.sh

date -Is >"${OK_MARKER}"
echo "[gce-migration-os-only] OK marker ${OK_MARKER}"
