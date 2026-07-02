#!/usr/bin/env bash
# IS-T2 LoRA train entry on chrysalis-gpu-lab — operator-run, verify-gated corpus only.
set -euo pipefail

LAB_ROOT="${CHRYSALIS_GPU_LAB_ROOT:-$HOME/chrysalis-gpu-lab}"
MANIFEST="${LAB_ROOT}/reports/web-llm/lora/train-manifest.v1.json"
TRAIN_SH="${LAB_ROOT}/scripts/gce-gpu-lora-train.sh"
MAX_MINUTES="${CHRYSALIS_GPU_LAB_MAX_MINUTES:-120}"
MAX_SECONDS=$((MAX_MINUTES * 60))
DEADLINE_EPOCH=$(( $(date +%s) + MAX_SECONDS ))

if [[ ! -f "$MANIFEST" ]]; then
  echo "Missing $MANIFEST — run on laptop: pnpm run gpu-lab:prep && pnpm run gpu-lab:sync" >&2
  exit 1
fi

if ! command -v nvidia-smi >/dev/null 2>&1; then
  echo "nvidia-smi not found — install NVIDIA driver or use Deep Learning VM image" >&2
  exit 1
fi

echo "=== GPU ==="
nvidia-smi

echo "=== Manifest ==="
node -e "const m=require('${MANIFEST}'); console.log(JSON.stringify({tier:m.tier,baseModel:m.baseModel,shardCount:m.shardCount,verifyGreenCount:m.verifyGreenCount},null,2))"

DATASET="${LAB_ROOT}/reports/web-llm/dataset/training-shards.v1.jsonl"
if [[ ! -f "$DATASET" ]]; then
  echo "Missing dataset $DATASET" >&2
  exit 1
fi

OUT="${LAB_ROOT}/reports/web-llm/lora/adapter"
mkdir -p "$OUT"

BASE_MODEL="$(node -pe "require('${MANIFEST}').baseModel")"
echo "[gce-gpu-lora-train] IS-T2 prep complete — base=$BASE_MODEL shards=$(wc -l < "$DATASET")"
echo "[gce-gpu-lora-train] session cap: ${MAX_MINUTES} min (CHRYSALIS_GPU_LAB_MAX_MINUTES) deadline_epoch=${DEADLINE_EPOCH}"

if [[ "${CHRYSALIS_GPU_LAB_DRY_RUN:-1}" != "0" ]]; then
  cat <<EOF

DRY RUN (CHRYSALIS_GPU_LAB_DRY_RUN=1). To execute a real QLoRA session on this VM:

  python3 -m venv ~/venv-lora && source ~/venv-lora/bin/activate
  pip install torch transformers peft datasets accelerate bitsandbytes
  # Convert shards to HF dataset, train LoRA, write adapter to:
  #   ${OUT}

Then evaluate on CPU with WVB + chrysalis verify (see docs/GCE-GPU-LAB.md).

Re-run with: CHRYSALIS_GPU_LAB_DRY_RUN=0 bash ${TRAIN_SH}
Hard cap: ${MAX_MINUTES} min (timeout enforced when DRY_RUN=0).
EOF
  exit 0
fi

echo "[gce-gpu-lora-train] CHRYSALIS_GPU_LAB_DRY_RUN=0 — operator must wire peft/QLoRA train script here"
echo "[gce-gpu-lora-train] output dir: ${OUT}"
echo "[gce-gpu-lora-train] train would run under: timeout ${MAX_SECONDS}s"

if command -v timeout >/dev/null 2>&1; then
  timeout --preserve-status "${MAX_SECONDS}s" bash -c 'echo "[gce-gpu-lora-train] timeout wrapper ready — plug QLoRA train body here"; exit 2'
  exit $?
fi

echo "[gce-gpu-lora-train] timeout(1) not found — refusing unbounded train" >&2
exit 2
