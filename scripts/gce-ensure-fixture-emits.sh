#!/usr/bin/env bash
# Materialize gitignored fixture/generated/* before hub-strategic vitest on GCE.
set -euo pipefail

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "${REPO}"

log() { echo "[gce-ensure-emits] $(date -Is) $*"; }

ensure_js_hono() {
  local fixture="$1"
  local marker="${fixture}/generated/hono/src/handlers/POST__items.ts"
  if [[ -f "${marker}" ]]; then
    log "skip ${fixture} hono (already emitted)"
    return 0
  fi
  log "lift+emit javascript/hono: ${fixture}"
  node scripts/hub-ingest/lift-to-webir.mjs "${fixture}" --language javascript
  node scripts/hub-ingest/emit-from-hub.mjs "${fixture}" --origin javascript --target hono
}

ensure_cwl_trace_targets() {
  local fixture="$1"
  local marker="${fixture}/generated/hono/src/handlers"
  if [[ -d "${marker}" ]] && compgen -G "${marker}/*.ts" >/dev/null; then
    log "skip ${fixture} cwl emits (already emitted)"
    return 0
  fi
  log "lift+emit cwl hono/fastify/nextjs: ${fixture}"
  node scripts/hub-ingest/lift-to-webir.mjs "${fixture}" --language cwl
  node scripts/hub-ingest/emit-from-hub.mjs "${fixture}" --origin cwl --target hono
  node scripts/hub-ingest/emit-from-hub.mjs "${fixture}" --origin cwl --target fastify
  if [[ -f scripts/hub-ingest/emit-nextjs-from-hub.mjs ]]; then
    node scripts/hub-ingest/emit-nextjs-from-hub.mjs "${fixture}" --origin cwl || log "WARN: nextjs emit failed (optional)"
  fi
}

ensure_js_hono "fixtures/hub-flagship-express"
ensure_cwl_trace_targets "fixtures/hub-gold-cwl-request-context"

log "OK"
