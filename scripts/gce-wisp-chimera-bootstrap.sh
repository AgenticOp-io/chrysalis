#!/usr/bin/env bash
# Start WISP chimera gateway on GCE (CWL + /api proxy + optional SvelteKit fallback).
set -euo pipefail

POC_DIR="${WISP_CWL_POC_DIR:-${HOME}/wisp-cwl-poc}"
REPO="${CHRYSALIS_REPO:-${HOME}/chrysalis-test}"
PORT="${WISP_CWL_POC_PORT:-19100}"
BIND="${WISP_CWL_POC_BIND:-0.0.0.0}"
CWL="${POC_DIR}/routes.cwl"
BACKEND="${WISP_BACKEND_URL:-http://127.0.0.1:3001}"
SVELTE="${WISP_SVELTE_FALLBACK:-http://127.0.0.1:3000}"
PIDFILE="${HOME}/.wisp-cwl-chimera.pid"
LOG="${HOME}/.wisp-cwl-chimera.log"
GW="${POC_DIR}/wisp-cwl-chimera-serve.mjs"
if [[ ! -f "${GW}" ]]; then
  GW="${POC_DIR}/wisp-cwl-chimera-gateway.mjs"
fi
SIDECAR_BOOT="${HOME}/gce-wisp-svelte-sidecar-bootstrap.sh"

log() { echo "[gce-wisp-chimera] $*"; }

if [[ -x "${SIDECAR_BOOT}" || -f "${SIDECAR_BOOT}" ]]; then
  chmod +x "${SIDECAR_BOOT}" 2>/dev/null || true
  if [[ -f "${HOME}/wisp-svelte-sidecar/build/client/index.html" ]]; then
    log "starting Svelte sidecar..."
    "${SIDECAR_BOOT}" || log "WARN: sidecar bootstrap failed (continuing without UI fallback)"
  fi
fi

if [[ ! -f "${CWL}" ]]; then
  log "ERROR: missing ${CWL}" >&2
  exit 1
fi
if [[ ! -f "${GW}" ]]; then
  log "ERROR: missing ${GW}" >&2
  exit 1
fi
if [[ ! -f "${REPO}/packages/runtime-cwl/dist/index.js" ]]; then
  log "building runtime-cwl in ${REPO}..."
  cd "${REPO}"
  pnpm --filter @chrysalis/runtime-cwl build
fi
if [[ ! -f "${REPO}/packages/runtime-cwl/dist/index.js" ]]; then
  log "ERROR: missing ${REPO}/packages/runtime-cwl/dist/index.js after build" >&2
  exit 1
fi

if [[ -f "${PIDFILE}" ]]; then
  old_pid="$(cat "${PIDFILE}")"
  if kill -0 "${old_pid}" 2>/dev/null; then
    log "stopping pid ${old_pid}"
    kill "${old_pid}" || true
    sleep 1
    kill -9 "${old_pid}" 2>/dev/null || true
  fi
  rm -f "${PIDFILE}"
fi
free_port() {
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${PORT}/tcp" 2>/dev/null || true
    if command -v ss >/dev/null 2>&1 && ss -tln "sport = :${PORT}" 2>/dev/null | grep -q LISTEN; then
      sudo fuser -k "${PORT}/tcp" 2>/dev/null || true
    fi
  fi
  sleep 1
}
free_port
if command -v ss >/dev/null 2>&1 && ss -tln "sport = :${PORT}" 2>/dev/null | grep -q LISTEN; then
  log "ERROR: port ${PORT} still in use after free_port" >&2
  ss -tln "sport = :${PORT}" 2>&1 || true
  exit 1
fi

export CHRYSALIS_REPO="${REPO}"
export WISP_CWL_NATIVE_PREFIXES="${WISP_CWL_NATIVE_PREFIXES:-*}"
nohup node "${GW}" --cwl "${CWL}" --backend "${BACKEND}" --host "${BIND}" --port "${PORT}" >>"${LOG}" 2>&1 &
echo $! >"${PIDFILE}"
sleep 2

if ! curl -sf "http://127.0.0.1:${PORT}/docs" >/dev/null; then
  log "ERROR: /docs probe failed — tail ${LOG}" >&2
  tail -20 "${LOG}" >&2 || true
  exit 1
fi

api_hdr="$(curl -sI "http://127.0.0.1:${PORT}/api/tenants" | tr -d '\r' | awk -F': ' 'tolower($1)=="x-chrysalis-wisp-proxy"{print $2; exit}')"
native_api="${WISP_CWL_NATIVE_API:-}"
if [[ -z "${native_api}" && -f "${POC_DIR}/wisp-pipeline.config.json" ]]; then
  if grep -q '"nativeApi"[[:space:]]*:[[:space:]]*true' "${POC_DIR}/wisp-pipeline.config.json" 2>/dev/null; then
    native_api=1
  fi
fi
if [[ "${native_api}" == "1" || "${WISP_CWL_NATIVE_PREFIXES:-}" == "*" ]]; then
  expected_api_hdr="cwl-native-api"
else
  expected_api_hdr="backend"
fi
if [[ "${api_hdr}" != "${expected_api_hdr}" ]]; then
  log "ERROR: /api/tenants missing x-chrysalis-wisp-proxy: ${expected_api_hdr} (got '${api_hdr}') — tail ${LOG}" >&2
  tail -20 "${LOG}" >&2 || true
  exit 1
fi

log "OK: WISP chimera gateway http://${BIND}:${PORT}/ backend=${BACKEND} pid $(cat "${PIDFILE}")"
log "log ${LOG}"
