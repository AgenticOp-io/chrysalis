#!/usr/bin/env bash
# Structural hub gold verify only (chunked from gce-hub-gold-gates).
set -euo pipefail

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"
mkdir -p reports/ci

export NODE_OPTIONS="${NODE_OPTIONS:---disable-warning=ExperimentalWarning}"

GOLD_OUT="reports/ci/gce-gold-verify.json"
GOLD_ERR="reports/ci/gce-gold-verify.err"

echo "[gce-gold-verify] $(date -Is) hub-gold-verify (structural suites)"
if ! node scripts/hub-ingest/hub-gold-verify.mjs >"${GOLD_OUT}" 2>"${GOLD_ERR}"; then
  echo "[gce-gold-verify] FAIL — stderr:" >&2
  tail -n 40 "${GOLD_ERR}" >&2 || true
  exit 1
fi
echo "[gce-gold-verify] OK"
