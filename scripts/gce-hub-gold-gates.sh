#!/usr/bin/env bash
# Structural gold verify + trace replay (calls chunked sub-scripts).
set -euo pipefail

REPO="${CHRYSALIS_STATUS_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${REPO}"

bash "${SCRIPT_DIR}/gce-hub-gold-verify.sh"
bash "${SCRIPT_DIR}/gce-hub-gold-trace-replay.sh"
echo "[gce-gold-gates] $(date -Is) OK"
