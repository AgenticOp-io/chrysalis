#!/usr/bin/env bash
# Deploy WISP CWL chimera gateway to chrysalis-test-vm (front VM only). Linux/macOS operator path.
set -euo pipefail

PROJECT=""
ZONE="us-central1-a"
NAME="chrysalis-test-vm"
WISP_ROOT="${CHRYSALIS_WISP_ROOT:-${WISP_MODULE_DIR:-}}"
BACKEND_URL="https://hss.wisptools.io"
SVELTE_FALLBACK=""
PORT=19100
SKIP_LIFT=0
TUNNEL_IAP=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project) PROJECT="$2"; shift 2 ;;
    --zone) ZONE="$2"; shift 2 ;;
    --name) NAME="$2"; shift 2 ;;
    --wisp-root) WISP_ROOT="$2"; shift 2 ;;
    --backend-url) BACKEND_URL="$2"; shift 2 ;;
    --svelte-fallback) SVELTE_FALLBACK="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --skip-lift) SKIP_LIFT=1; shift ;;
    --tunnel-through-iap) TUNNEL_IAP=1; shift ;;
    *) echo "unknown arg: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "${PROJECT}" ]]; then
  echo "usage: $0 --project PROJECT [--zone ZONE] [--name VM] [--wisp-root PATH] [--backend-url URL]" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

if [[ "${SKIP_LIFT}" -eq 0 && -n "${WISP_ROOT}" && -d "${WISP_ROOT}" ]]; then
  echo "Lift + CWL emit..."
  node scripts/hub-ingest/lift-to-webir.mjs "${WISP_ROOT}" --language svelte
  node scripts/hub-ingest/emit-cwl-from-hub.mjs "${WISP_ROOT}" --origin svelte
fi

node scripts/wisp-cwl-pipeline.mjs --bundle-only --skip-lift ${WISP_ROOT:+--root "${WISP_ROOT}"}

BUNDLE_DIR="${REPO_ROOT}/generated/_wisp-cwl-poc-deploy"
TARBALL="$(mktemp /tmp/wisp-cwl-stack-XXXXXX.tar.gz)"
tar -czf "${TARBALL}" -C "${BUNDLE_DIR}" routes.cwl api-proxy.cwl wisp-cwl-chimera-gateway.mjs cwl-preview.json favicon.svg 2>/dev/null \
  || tar -czf "${TARBALL}" -C "${BUNDLE_DIR}" routes.cwl api-proxy.cwl wisp-cwl-chimera-gateway.mjs favicon.svg

SSH_EXTRA=()
if [[ "${TUNNEL_IAP}" -eq 1 ]]; then SSH_EXTRA+=(--tunnel-through-iap); fi

gcloud compute scp --zone="${ZONE}" --project="${PROJECT}" "${SSH_EXTRA[@]}" "${TARBALL}" "${NAME}:wisp-cwl-poc.tgz"
gcloud compute scp --zone="${ZONE}" --project="${PROJECT}" "${SSH_EXTRA[@]}" "${SCRIPT_DIR}/gce-wisp-chimera-bootstrap.sh" "${NAME}:gce-wisp-chimera-bootstrap.sh"
rm -f "${TARBALL}"

FW_NAME="chrysalis-wisp-cwl-${PORT}"
if ! gcloud compute firewall-rules describe "${FW_NAME}" --project="${PROJECT}" >/dev/null 2>&1; then
  gcloud compute firewall-rules create "${FW_NAME}" \
    --project="${PROJECT}" --direction=INGRESS --priority=1000 --network=default \
    --action=ALLOW --rules="tcp:${PORT}" --source-ranges="0.0.0.0/0" --target-tags="http-server"
fi

SVELTE_ENV=""
if [[ -n "${SVELTE_FALLBACK}" ]]; then
  SVELTE_ENV="export WISP_SVELTE_FALLBACK='${SVELTE_FALLBACK}';"
fi

REMOTE="set -e; mkdir -p ~/wisp-cwl-poc; tar -xzf ~/wisp-cwl-poc.tgz -C ~/wisp-cwl-poc; chmod +x ~/gce-wisp-chimera-bootstrap.sh; export WISP_BACKEND_URL='${BACKEND_URL}'; export WISP_CWL_POC_PORT=${PORT}; ${SVELTE_ENV} ~/gce-wisp-chimera-bootstrap.sh"
echo "Starting chimera gateway on ${NAME}..."
gcloud compute ssh "${NAME}" --zone="${ZONE}" --project="${PROJECT}" "${SSH_EXTRA[@]}" --command="${REMOTE}"

IP="$(gcloud compute instances describe "${NAME}" --zone="${ZONE}" --project="${PROJECT}" --format='get(networkInterfaces[0].accessConfigs[0].natIP)')"
BASE_URL="http://${IP}:${PORT}"
echo "Veracity probe ${BASE_URL}"
sleep 2
node scripts/wisp-cwl-poc-verify.mjs --base-url "${BASE_URL}" --chimera --preview "${BUNDLE_DIR}/cwl-preview.json"

echo ""
echo "=== WISP local stack (front VM) deployed ==="
echo "URL:      ${BASE_URL}"
echo "Backend:  ${BACKEND_URL} (existing stack - not deployed by this script)"
