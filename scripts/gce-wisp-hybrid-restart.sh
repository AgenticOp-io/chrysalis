#!/usr/bin/env bash
# One-shot hybrid restart on chrysalis-test-vm (Svelte sidecar + CWL /api).
set -euo pipefail

free_port() {
  local p="$1"
  if command -v fuser >/dev/null 2>&1; then
    sudo fuser -k "${p}/tcp" 2>/dev/null || fuser -k "${p}/tcp" 2>/dev/null || true
  fi
  if command -v ss >/dev/null 2>&1; then
    local pids
    pids="$(ss -ltnp "sport = :${p}" 2>/dev/null | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | sort -u || true)"
    for pid in ${pids}; do
      sudo kill -9 "${pid}" 2>/dev/null || kill -9 "${pid}" 2>/dev/null || true
    done
  fi
  sleep 1
}

free_port 3000

PORT=3000
if ss -ltn "sport = :3000" 2>/dev/null | grep -q LISTEN; then
  echo "[hybrid-restart] port 3000 still busy after kill attempts; using 3001"
  PORT=3001
  free_port 3001
fi
export WISP_SVELTE_SIDECAR_PORT="${PORT}"

rm -rf "${HOME}/wisp-svelte-sidecar"
mkdir -p "${HOME}/wisp-svelte-sidecar"
tar -xzf "${HOME}/wisp-svelte-sidecar.tgz" -C "${HOME}/wisp-svelte-sidecar"
chmod +x "${HOME}/gce-wisp-svelte-sidecar-bootstrap.sh"
"${HOME}/gce-wisp-svelte-sidecar-bootstrap.sh"

mkdir -p "${HOME}/wisp-cwl-poc"
tar -xzf "${HOME}/wisp-cwl-poc.tgz" -C "${HOME}/wisp-cwl-poc"
chmod +x "${HOME}/gce-wisp-chimera-bootstrap.sh"
export WISP_BACKEND_URL="${WISP_BACKEND_URL:-https://hss.wisptools.io}"
export WISP_CWL_POC_PORT="${WISP_CWL_POC_PORT:-19100}"
export WISP_SVELTE_FALLBACK="http://127.0.0.1:${PORT}"
export WISP_CWL_NATIVE_PREFIXES="${WISP_CWL_NATIVE_PREFIXES:-/docs,/help,/favicon.ico,/favicon.svg}"
"${HOME}/gce-wisp-chimera-bootstrap.sh"

echo "=== probe sidecar :${PORT} ==="
curl -sI "http://127.0.0.1:${PORT}/" | head -8
echo "=== probe hardware via chimera ==="
curl -sI "http://127.0.0.1:19100/modules/hardware" | head -15
echo "=== pipeline gce flags ==="
grep -E "svelteSidecar|cwlNative|operatorUi" "${HOME}/wisp-cwl-poc/wisp-pipeline.config.json" || true
echo "=== sidecar meta ==="
cat "${HOME}/wisp-svelte-sidecar/sidecar.meta.json"
echo
