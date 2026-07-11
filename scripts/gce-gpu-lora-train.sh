#!/usr/bin/env bash
# IS-T2 LoRA train entry on chrysalis-gpu-lab — operator-run, verify-gated corpus only.
set -euo pipefail

LAB_ROOT="${CHRYSALIS_GPU_LAB_ROOT:-$HOME/chrysalis-gpu-lab}"
export CHRYSALIS_GPU_LAB_ROOT="$LAB_ROOT"
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
python3 -c "import json; m=json.load(open('${MANIFEST}')); print(json.dumps({k:m[k] for k in ('tier','baseModel','shardCount','verifyGreenCount')}, indent=2))"

DATASET="${LAB_ROOT}/reports/web-llm/dataset/training-shards.v1.jsonl"
if [[ ! -f "$DATASET" ]]; then
  echo "Missing dataset $DATASET" >&2
  exit 1
fi

OUT="${LAB_ROOT}/reports/web-llm/lora/adapter"
mkdir -p "$OUT"

BASE_MODEL="$(python3 -c "import json; print(json.load(open('${MANIFEST}'))['baseModel'])")"
echo "[gce-gpu-lora-train] IS-T2 prep complete — base=$BASE_MODEL shards=$(wc -l < "$DATASET")"
echo "[gce-gpu-lora-train] session cap: ${MAX_MINUTES} min (CHRYSALIS_GPU_LAB_MAX_MINUTES) deadline_epoch=${DEADLINE_EPOCH}"

if [[ "${CHRYSALIS_GPU_LAB_DRY_RUN:-1}" != "0" ]]; then
  TRAIN_PY="${LAB_ROOT}/scripts/chrysalis-lora-qlora-train.py"
  if [[ -f "$TRAIN_PY" ]]; then
    python3 "$TRAIN_PY" --manifest "$MANIFEST" --output "$OUT" --dry-run
    exit 0
  fi
  cat <<EOF

DRY RUN (CHRYSALIS_GPU_LAB_DRY_RUN=1). To execute a real QLoRA session on this VM:

  python3 ${LAB_ROOT}/scripts/chrysalis-lora-qlora-train.py --manifest ${MANIFEST} --output ${OUT}

  # Requires: pip install torch transformers peft datasets accelerate bitsandbytes

Then evaluate on CPU with WVB + chrysalis verify (see docs/GCE-GPU-LAB.md).

Re-run with: CHRYSALIS_GPU_LAB_DRY_RUN=0 bash ${TRAIN_SH}
Hard cap: ${MAX_MINUTES} min (timeout enforced when DRY_RUN=0).
EOF
  exit 0
fi

TRAIN_PY="${LAB_ROOT}/scripts/chrysalis-lora-qlora-train.py"
if [[ ! -f "$TRAIN_PY" ]]; then
  echo "Missing $TRAIN_PY" >&2
  exit 1
fi

echo "[gce-gpu-lora-train] CHRYSALIS_GPU_LAB_DRY_RUN=0 — QLoRA via chrysalis-lora-qlora-train.py"
echo "[gce-gpu-lora-train] output dir: ${OUT}"

PY=python3
if [[ -x /opt/conda/bin/python ]]; then
  PY=/opt/conda/bin/python
elif command -v conda >/dev/null 2>&1; then
  CONDA_PY="$(conda info --base 2>/dev/null)/bin/python"
  if [[ -x "$CONDA_PY" ]]; then PY="$CONDA_PY"; fi
fi

# Torch/Triton compiles a small CUDA extension; needs Python.h (python3-dev).
if [[ ! -f /usr/include/python3.10/Python.h && ! -f /usr/include/python3.11/Python.h ]]; then
  echo "[gce-gpu-lora-train] installing python3-dev/build-essential for Triton…"
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -qq
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3-dev build-essential
  fi
fi

if ! "$PY" -c "import torch, transformers, peft, datasets, accelerate" 2>/dev/null; then
  echo "[gce-gpu-lora-train] installing GPU train deps via $PY …"
  if ! "$PY" -m pip --version >/dev/null 2>&1; then
    echo "[gce-gpu-lora-train] bootstrapping pip…"
    curl -fsSL https://bootstrap.pypa.io/get-pip.py | "$PY"
  fi
  "$PY" -m pip install -q torch transformers peft datasets accelerate
fi

export PATH="${HOME}/.local/bin:${PATH}"
export TORCHDYNAMO_DISABLE=1
export TORCH_COMPILE_DISABLE=1

if command -v timeout >/dev/null 2>&1; then
  timeout --preserve-status "${MAX_SECONDS}s" "$PY" "$TRAIN_PY" --manifest "$MANIFEST" --output "$OUT"
  exit $?
fi

"$PY" "$TRAIN_PY" --manifest "$MANIFEST" --output "$OUT"
