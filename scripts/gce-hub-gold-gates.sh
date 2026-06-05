#!/usr/bin/env bash
# Structural gold verify + trace replay once on GCE (before hub-completion fast path).
set -euo pipefail

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"
mkdir -p reports/ci

export NODE_OPTIONS="${NODE_OPTIONS:---disable-warning=ExperimentalWarning}"

log() { echo "[gce-gold-gates] $(date -Is) $*"; }

GOLD_OUT="reports/ci/gce-gold-verify.json"
TRACE_OUT="reports/ci/gce-trace-replay.json"
GOLD_ERR="reports/ci/gce-gold-verify.err"
TRACE_ERR="reports/ci/gce-trace-replay.err"

log "hub-gold-verify (structural suites)"
if ! node scripts/hub-ingest/hub-gold-verify.mjs >"${GOLD_OUT}" 2>"${GOLD_ERR}"; then
  log "FAIL hub-gold-verify — stderr:"
  tail -n 40 "${GOLD_ERR}" >&2 || true
  exit 1
fi

log "hub-gold-trace-replay"
if ! node --import tsx scripts/hub-ingest/hub-gold-trace-replay.mjs >"${TRACE_OUT}" 2>"${TRACE_ERR}"; then
  log "FAIL hub-gold-trace-replay — stderr:"
  tail -n 40 "${TRACE_ERR}" >&2 || true
  exit 1
fi

log "OK"
