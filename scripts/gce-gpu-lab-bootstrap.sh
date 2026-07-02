#!/usr/bin/env bash
# First-boot checks for chrysalis-gpu-lab (NVIDIA T4/L4 spot). No in-repo GPU train deps.
set -euo pipefail

echo "[gce-gpu-lab-bootstrap] GPU lab bootstrap"

if command -v nvidia-smi >/dev/null 2>&1; then
  nvidia-smi || true
else
  echo "[gce-gpu-lab-bootstrap] WARN: nvidia-smi not found — Deep Learning VM may still be installing drivers (wait ~5 min, reboot if needed)"
fi

mkdir -p ~/chrysalis-gpu-lab/reports/web-llm/lora
mkdir -p ~/chrysalis-gpu-lab/scripts

echo "[gce-gpu-lab-bootstrap] OK"
echo "Next (from laptop after pnpm run gpu-lab:prep && pnpm run gpu-lab:sync):"
echo "  bash ~/chrysalis-gpu-lab/scripts/gce-gpu-lora-train.sh"
