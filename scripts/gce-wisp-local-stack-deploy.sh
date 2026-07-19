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
SKIP_SVELTE_SIDECAR=0
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
    --skip-svelte-sidecar) SKIP_SVELTE_SIDECAR=1; shift ;;
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
TAR_FILES=(routes.cwl api-proxy.cwl routes.webir.json api-proxy.webir.json wisp-cwl-chimera-gateway.mjs wisp-cwl-gateway-config.mjs wisp-cwl-post-g7790.mjs wisp-pipeline.config.json wisp-cwl-login.css wisp-cwl-app.css wisp-cwl-client.js wisp-firebase-config.json wisp-cwl-modules.css wisp-cwl-modules.js wisp-cwl-map.js wisp-cwl-map-island.css wisp-cwl-arcgis.bundle.js wisp-cwl-arcgis.bundle.css wisp-arcgis-config.json wisptools-logo.svg wisp-cwl-original-css-map.json)
for f in cwl-preview.json favicon.svg; do
  [[ -f "${BUNDLE_DIR}/${f}" ]] && TAR_FILES+=("${f}")
done
[[ -d "${BUNDLE_DIR}/original-css" ]] && TAR_FILES+=("original-css")
[[ -d "${BUNDLE_DIR}/lib" ]] && TAR_FILES+=("lib")
tar -czf "${TARBALL}" -C "${BUNDLE_DIR}" "${TAR_FILES[@]}"

SSH_EXTRA=()
if [[ "${TUNNEL_IAP}" -eq 1 ]]; then SSH_EXTRA+=(--tunnel-through-iap); fi

gcloud compute scp --zone="${ZONE}" --project="${PROJECT}" "${SSH_EXTRA[@]}" "${TARBALL}" "${NAME}:wisp-cwl-poc.tgz"
gcloud compute scp --zone="${ZONE}" --project="${PROJECT}" "${SSH_EXTRA[@]}" "${SCRIPT_DIR}/gce-wisp-chimera-bootstrap.sh" "${NAME}:gce-wisp-chimera-bootstrap.sh"
rm -f "${TARBALL}"

SIDECAR_SETUP=""
if [[ "${SKIP_SVELTE_SIDECAR}" -eq 0 ]]; then
  if [[ -z "${SVELTE_FALLBACK}" ]]; then SVELTE_FALLBACK="http://127.0.0.1:3000"; fi
  echo "Building WISP Svelte sidecar..."
  node scripts/wisp-cwl-svelte-sidecar-build.mjs ${WISP_ROOT:+--root "${WISP_ROOT}"}
  SIDECAR_BUNDLE="${REPO_ROOT}/generated/wisp-svelte-sidecar/bundle"
  SIDECAR_TAR="$(mktemp /tmp/wisp-svelte-sidecar-XXXXXX.tar.gz)"
  tar -czf "${SIDECAR_TAR}" -C "${SIDECAR_BUNDLE}" .
  gcloud compute scp --zone="${ZONE}" --project="${PROJECT}" "${SSH_EXTRA[@]}" "${SIDECAR_TAR}" "${NAME}:wisp-svelte-sidecar.tgz"
  gcloud compute scp --zone="${ZONE}" --project="${PROJECT}" "${SSH_EXTRA[@]}" "${SCRIPT_DIR}/gce-wisp-svelte-sidecar-bootstrap.sh" "${NAME}:gce-wisp-svelte-sidecar-bootstrap.sh"
  rm -f "${SIDECAR_TAR}"
  SIDECAR_SETUP="mkdir -p ~/wisp-svelte-sidecar; tar -xzf ~/wisp-svelte-sidecar.tgz -C ~/wisp-svelte-sidecar; chmod +x ~/gce-wisp-svelte-sidecar-bootstrap.sh; ~/gce-wisp-svelte-sidecar-bootstrap.sh;"
fi

FW_NAME="chrysalis-wisp-cwl-${PORT}"
if ! gcloud compute firewall-rules describe "${FW_NAME}" --project="${PROJECT}" >/dev/null 2>&1; then
  gcloud compute firewall-rules create "${FW_NAME}" \
    --project="${PROJECT}" --direction=INGRESS --priority=1000 --network=default \
    --action=ALLOW --rules="tcp:${PORT}" --source-ranges="0.0.0.0/0" --target-tags="http-server"
fi

SVELTE_ENV=""
if [[ "${SKIP_SVELTE_SIDECAR}" -eq 1 ]]; then
  SVELTE_ENV="export WISP_CWL_NATIVE_PREFIXES='*';"
else
  SVELTE_ENV="export WISP_SVELTE_FALLBACK='${SVELTE_FALLBACK:-http://127.0.0.1:3000}'; export WISP_CWL_NATIVE_PREFIXES='/docs,/help,/favicon.ico,/favicon.svg';"
fi

REMOTE="set -e; ${SIDECAR_SETUP} mkdir -p ~/wisp-cwl-poc; tar -xzf ~/wisp-cwl-poc.tgz -C ~/wisp-cwl-poc; chmod +x ~/gce-wisp-chimera-bootstrap.sh; export WISP_BACKEND_URL='${BACKEND_URL}'; export WISP_CWL_POC_PORT=${PORT}; ${SVELTE_ENV} ~/gce-wisp-chimera-bootstrap.sh"
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
