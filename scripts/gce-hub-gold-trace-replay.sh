#!/usr/bin/env bash
# Hub gold trace replay only (chunked from gce-hub-gold-gates).
set -euo pipefail

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"
mkdir -p reports/ci

export NODE_OPTIONS="${NODE_OPTIONS:---disable-warning=ExperimentalWarning}"

TRACE_OUT="reports/ci/gce-trace-replay.json"
TRACE_ERR="reports/ci/gce-trace-replay.err"

echo "[gce-gold-trace-replay] $(date -Is) hub-gold-trace-replay"
if ! node --import tsx scripts/hub-ingest/hub-gold-trace-replay.mjs >"${TRACE_OUT}" 2>"${TRACE_ERR}"; then
  echo "[gce-gold-trace-replay] FAIL — stderr:" >&2
  tail -n 40 "${TRACE_ERR}" >&2 || true
  exit 1
fi
echo "[gce-gold-trace-replay] OK"
