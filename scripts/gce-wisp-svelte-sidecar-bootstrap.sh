#!/usr/bin/env bash
# Start WISP SvelteKit static sidecar (SPA) on port 3000 for chimera fallback.
set -euo pipefail

SIDECAR_DIR="${WISP_SVELTE_SIDECAR_DIR:-${HOME}/wisp-svelte-sidecar}"
PORT="${WISP_SVELTE_SIDECAR_PORT:-3000}"
BIND="${WISP_SVELTE_SIDECAR_BIND:-127.0.0.1}"
PIDFILE="${HOME}/.wisp-svelte-sidecar.pid"
LOG="${HOME}/.wisp-svelte-sidecar.log"
SERVER="${SIDECAR_DIR}/wisp-svelte-static-server.mjs"
CLIENT="${SIDECAR_DIR}/build/client"

log() { echo "[gce-wisp-svelte-sidecar] $*"; }

if [[ ! -f "${SERVER}" ]]; then
  log "ERROR: missing ${SERVER}" >&2
  exit 1
fi
if [[ ! -f "${CLIENT}/index.html" ]]; then
  log "ERROR: missing ${CLIENT}/index.html — deploy sidecar bundle first" >&2
  exit 1
fi

if [[ -f "${PIDFILE}" ]]; then
  old_pid="$(cat "${PIDFILE}")"
  if kill -0 "${old_pid}" 2>/dev/null; then
    log "stopping pid ${old_pid}"
    kill "${old_pid}" || true
    sleep 1
  fi
  rm -f "${PIDFILE}"
fi
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" 2>/dev/null || true
  sleep 1
fi

nohup node "${SERVER}" --root "${CLIENT}" --host "${BIND}" --port "${PORT}" >>"${LOG}" 2>&1 &
echo $! >"${PIDFILE}"
sleep 2

if ! curl -sf "http://${BIND}:${PORT}/" >/dev/null; then
  log "ERROR: sidecar probe failed — tail ${LOG}" >&2
  tail -20 "${LOG}" >&2 || true
  exit 1
fi

log "OK: WISP Svelte sidecar http://${BIND}:${PORT}/ pid $(cat "${PIDFILE}")"
