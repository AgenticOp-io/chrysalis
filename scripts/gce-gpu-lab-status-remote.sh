#!/usr/bin/env bash
# Honest GPU-lab status on chrysalis-test-vm (G9820).
# Avoid progress-bar spam; report OK / running / idle + adapter presence.
set -euo pipefail

LOG="${HOME}/chrysalis-test/reports/ci/gce-gpu-lab.log"
OK="${HOME}/chrysalis-test/reports/ci/gce-gpu-lab.ok"
ADAPTER="${HOME}/chrysalis-test/reports/web-llm/lora/adapter"
SUMMARY="${HOME}/chrysalis-test/reports/web-llm/lora/train-result.v1.json"

RUNNING=0
if pgrep -af "gce-gpu-lab-orchestrate" 2>/dev/null | grep -v pgrep >/dev/null; then
  RUNNING=1
fi

if test -f "$OK"; then
  echo "STATUS_OK"
elif test "$RUNNING" = "1"; then
  echo "STATUS_RUNNING"
else
  echo "STATUS_IDLE_OR_FAILED"
fi

echo "=== Orchestrator ==="
pgrep -af "gce-gpu-lab-orchestrate" 2>/dev/null | head -3 || echo "(not running)"

echo "=== Adapter on CPU VM ==="
if test -d "$ADAPTER" && find "$ADAPTER" -type f \( -name "adapter_config.json" -o -name "*.safetensors" -o -name "*.bin" \) 2>/dev/null | head -1 | grep -q .; then
  echo "ADAPTER_PRESENT=yes"
  find "$ADAPTER" -type f \( -name "adapter_config.json" -o -name "*.safetensors" -o -name "*.bin" \) 2>/dev/null | head -5
else
  echo "ADAPTER_PRESENT=no"
fi

if test -f "$SUMMARY"; then
  echo "=== train-result.v1.json ==="
  cat "$SUMMARY"
fi

echo "=== Milestones ==="
if test -f "$LOG"; then
  grep -E "IS-T2 prep|DRY_RUN=|adapter saved|train_loss|done -- OK|done — OK|ERROR:|stopping chrysalis-gpu-lab|fetching LoRA|adapter fetched|WARN:" "$LOG" 2>/dev/null | tail -n 40 || true
  echo "=== Recent log (no progress bars) ==="
  tr "\r" "\n" <"$LOG" \
    | grep -vE "^[[:space:]]*$" \
    | grep -vE "^[[:space:]]*[0-9]+%\|" \
    | grep -vE "^[[:space:]]+\|" \
    | grep -vE "^Loading weights:" \
    | grep -vE "^Map:" \
    | grep -vE "^Generating train" \
    | grep -vE "it/s\]" \
    | tail -n 25
else
  echo "no_log"
fi
