#!/usr/bin/env bash
# Start or restart the Chrysalis read-only status server on a dedicated port (default 19090).
# Safe on shared VMs: does not touch nginx :80 or other apps (e.g. fragility :8765).
set -euo pipefail

PORT="${CHRYSALIS_STATUS_PORT:-19090}"
BIND="${CHRYSALIS_STATUS_BIND:-0.0.0.0}"
REPO="${CHRYSALIS_STATUS_REPO:-${HOME}/chrysalis-test}"
SCRIPT="${REPO}/scripts/chrysalis-operator-web.mjs"
if [[ ! -f "${SCRIPT}" ]]; then
  SCRIPT="${REPO}/scripts/gce-chrysalis-status-server.mjs"
fi
PIDFILE="${HOME}/.chrysalis-status-server.pid"
LOG="${HOME}/.chrysalis-status-server.log"

if [[ ! -f "${SCRIPT}" ]]; then
  echo "[gce-chrysalis-status] missing ${SCRIPT} — deploy Chrysalis repo first." >&2
  exit 1
fi

if [[ -f "${PIDFILE}" ]]; then
  old_pid="$(cat "${PIDFILE}")"
  if kill -0 "${old_pid}" 2>/dev/null; then
    echo "[gce-chrysalis-status] stopping pid ${old_pid}"
    kill "${old_pid}" || true
    sleep 1
  fi
  rm -f "${PIDFILE}"
fi

# Shared VM: another user's operator may still hold PORT (stale ~/.chrysalis-status-server.pid).
free_port() {
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${PORT}/tcp" 2>/dev/null || true
  fi
  if command -v ss >/dev/null 2>&1 && ss -tln "sport = :${PORT}" 2>/dev/null | grep -q LISTEN; then
    if command -v fuser >/dev/null 2>&1; then
      sudo fuser -k "${PORT}/tcp" 2>/dev/null || true
    fi
  fi
  sleep 1
}
free_port

export CHRYSALIS_STATUS_PORT="${PORT}"
export CHRYSALIS_STATUS_BIND="${BIND}"
export CHRYSALIS_STATUS_REPO="${REPO}"
export CHRYSALIS_STATUS_PROGRESS_FILE="${CHRYSALIS_STATUS_PROGRESS_FILE:-${REPO}/.chrysalis/ingest.progress}"
export CHRYSALIS_HUB_RELOAD_STATIC="${CHRYSALIS_HUB_RELOAD_STATIC:-1}"

nohup node "${SCRIPT}" >>"${LOG}" 2>&1 &
echo $! >"${PIDFILE}"
echo "[gce-chrysalis-status] started pid $(cat "${PIDFILE}") http://${BIND}:${PORT}/"
echo "[gce-chrysalis-status] log ${LOG}"
