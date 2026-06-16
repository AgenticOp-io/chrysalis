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

cwl_emit_complete() {
  local fixture="$1"
  local target="$2"
  [[ -f "${fixture}/generated/${target}/src/ctx.ts" ]] \
    && [[ -f "${fixture}/generated/${target}/src/server.ts" ]] \
    && [[ -d "${fixture}/generated/${target}/src/handlers" ]] \
    && compgen -G "${fixture}/generated/${target}/src/handlers/*.ts" >/dev/null
}

ensure_cwl_trace_targets() {
  local fixture="$1"
  if cwl_emit_complete "${fixture}" hono && cwl_emit_complete "${fixture}" fastify; then
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
ensure_cwl_trace_targets "fixtures/hub-gold-cwl-request-body"
ensure_cwl_trace_targets "fixtures/hub-gold-cwl-response-status"
ensure_cwl_trace_targets "fixtures/hub-flagship-cwl-fullstack"

ensure_php_verify_targets() {
  local fixture="$1"
  if cwl_emit_complete "${fixture}" hono && cwl_emit_complete "${fixture}" fastify; then
    log "skip ${fixture} php hono/fastify (already emitted)"
    return 0
  fi
  log "prepare php hono+fastify verify emits: ${fixture}"
  node --input-type=module -e "
    import { prepareProjectVerifyEmit, inferHubProjectOrigin } from './scripts/hub-ingest/hub-verify-replay.mjs';
    const root = '${fixture}';
    const origin = inferHubProjectOrigin(root);
    for (const target of ['hono', 'fastify']) {
      const r = await prepareProjectVerifyEmit(root, { origin, target });
      if (!r.ok) { console.error(JSON.stringify(r)); process.exit(1); }
    }
  "
}

ensure_php_verify_targets "fixtures/hub-flagship-plain-php"
ensure_php_verify_targets "fixtures/hub-flagship-symfony"

log "OK"
