#!/usr/bin/env bash
# One-shot: pull LoRA adapter from chrysalis-gpu-lab onto chrysalis-test-vm, then stop GPU.
set -euo pipefail
PROJECT="${CHRYSALIS_GCE_PROJECT:-chrysalis-dev-f5x6qv}"
ZONE="${CHRYSALIS_GPU_LAB_ZONE:-us-central1-b}"
GPU="${CHRYSALIS_GPU_LAB_NAME:-chrysalis-gpu-lab}"
DEST_ROOT="${HOME}/chrysalis-test/reports/web-llm/lora"
LOG="${HOME}/chrysalis-test/reports/ci/gce-gpu-lab.log"

for i in $(seq 1 24); do
  if gcloud compute ssh "$GPU" \
    --zone="$ZONE" --project="$PROJECT" \
    --internal-ip --strict-host-key-checking=no --quiet \
    --command="echo ready" >/dev/null 2>&1; then
    echo "ssh-ready attempt=$i"
    break
  fi
  echo "wait-ssh $i/24"
  sleep 10
done

mkdir -p "$DEST_ROOT"
rm -rf "${DEST_ROOT}/adapter"
gcloud compute scp --recurse \
  --zone="$ZONE" --project="$PROJECT" \
  --internal-ip --strict-host-key-checking=no --quiet \
  -- "${GPU}:~/chrysalis-gpu-lab/reports/web-llm/lora/adapter" \
  "${DEST_ROOT}/"
echo "adapter-files:"
find "${DEST_ROOT}/adapter" -type f | head -20

LOSS="$(grep -oE "train_loss': '[0-9.]+" "$LOG" 2>/dev/null | tail -1 | sed "s/train_loss': '//" || true)"
ADAPTER_OK=0
if find "${DEST_ROOT}/adapter" -type f \( -name 'adapter_config.json' -o -name '*.safetensors' -o -name '*.bin' \) 2>/dev/null | head -1 | grep -q .; then
  ADAPTER_OK=1
fi
cat >"${DEST_ROOT}/train-result.v1.json" <<EOF
{
  "kind": "chrysalis.web-llm.lora-train-result",
  "schemaVersion": 1,
  "ok": $([[ "$ADAPTER_OK" == "1" ]] && echo true || echo false),
  "dryRun": false,
  "gpuName": "${GPU}",
  "gpuZone": "${ZONE}",
  "adapterDir": "reports/web-llm/lora/adapter",
  "adapterPresent": $([[ "$ADAPTER_OK" == "1" ]] && echo true || echo false),
  "trainLoss": $([[ -n "$LOSS" ]] && echo "$LOSS" || echo null),
  "recovered": true,
  "generatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
echo "summary-written adapter_ok=${ADAPTER_OK} loss=${LOSS:-unknown}"
gcloud compute instances stop "$GPU" --zone="$ZONE" --project="$PROJECT" --quiet
echo "gpu-stopped"
