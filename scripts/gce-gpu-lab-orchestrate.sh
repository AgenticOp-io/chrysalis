#!/usr/bin/env bash
# Run ON chrysalis-test-vm — orchestrate chrysalis-gpu-lab via internal GCE SSH (no Windows Plink).
set -euo pipefail

PROJECT="${CHRYSALIS_GCE_PROJECT:-chrysalis-dev-f5x6qv}"
ZONE="${CHRYSALIS_GCE_ZONE:-us-central1-a}"
GPU_NAME="${CHRYSALIS_GPU_LAB_NAME:-chrysalis-gpu-lab}"
REPO="${CHRYSALIS_STATUS_REPO:-$HOME/chrysalis-test}"
if [[ "$REPO" != /* ]]; then
  REPO="$HOME/$REPO"
fi
ART="${REPO}/gpu-lab-artifacts"
LOG="${REPO}/reports/ci/gce-gpu-lab.log"
OK="${REPO}/reports/ci/gce-gpu-lab.ok"
MAX_MIN="${CHRYSALIS_GPU_LAB_MAX_MINUTES:-120}"
DRY_RUN="${CHRYSALIS_GPU_LAB_DRY_RUN:-1}"

mkdir -p "$(dirname "$LOG")" "$ART"

log() { echo "[gce-gpu-lab-orchestrate] $*" | tee -a "$LOG"; }

ensure_gcloud() {
  if command -v gcloud >/dev/null 2>&1; then
    return 0
  fi
  log "installing google-cloud-cli in \$HOME (no sudo)..."
  export CLOUDSDK_CORE_DISABLE_PROMPTS=1
  curl -fsSL https://sdk.cloud.google.com | bash -s -- --disable-prompts --install-dir="${HOME}/google-cloud-sdk" >>"$LOG" 2>&1
  export PATH="${HOME}/google-cloud-sdk/bin:${PATH}"
  if ! command -v gcloud >/dev/null 2>&1; then
    log "ERROR: gcloud install failed" >&2
    exit 1
  fi
}

gpu_ssh() {
  gcloud compute ssh "$GPU_NAME" \
    --zone="$ZONE" --project="$PROJECT" \
    --internal-ip --strict-host-key-checking=no --quiet \
    --command="$1"
}

gpu_scp() {
  gcloud compute scp \
    --zone="$ZONE" --project="$PROJECT" \
    --internal-ip --strict-host-key-checking=no --quiet \
    -- "$1" "$2"
}

wait_gpu_ssh() {
  local i
  for i in $(seq 1 36); do
    if gpu_ssh "echo gpu-lab-ssh-ready" >>"$LOG" 2>&1; then
      log "SSH ready (attempt $i)"
      return 0
    fi
    log "waiting for GPU lab SSH ($i/36)..."
    sleep 10
  done
  return 1
}

ensure_gpu_running() {
  local st
  st="$(gcloud compute instances describe "$GPU_NAME" --zone="$ZONE" --project="$PROJECT" --format="value(status)" 2>/dev/null || echo NOT_FOUND)"
  if [[ "$st" == "NOT_FOUND" ]]; then
    log "ERROR: $GPU_NAME not found — run pnpm run gpu-lab:create once from laptop" >&2
    exit 1
  fi
  if [[ "$st" != "RUNNING" ]]; then
    log "starting $GPU_NAME (was $st)..."
    gcloud compute instances start "$GPU_NAME" --zone="$ZONE" --project="$PROJECT" --quiet
  fi
  wait_gpu_ssh || { log "ERROR: SSH not ready on $GPU_NAME"; exit 1; }
}

bootstrap_gpu() {
  local bootstrap="${ART}/gce-gpu-lab-bootstrap.sh"
  if [[ ! -f "$bootstrap" ]]; then
    bootstrap="${REPO}/scripts/gce-gpu-lab-bootstrap.sh"
  fi
  if [[ ! -f "$bootstrap" ]]; then
    log "ERROR: missing gce-gpu-lab-bootstrap.sh" >&2
    exit 1
  fi
  gpu_scp "$bootstrap" "${GPU_NAME}:gce-gpu-lab-bootstrap.sh"
  gpu_ssh "chmod +x ~/gce-gpu-lab-bootstrap.sh && bash ~/gce-gpu-lab-bootstrap.sh"
}

sync_gpu() {
  local manifest="${ART}/train-manifest.v1.json"
  local shards="${ART}/training-shards.v1.jsonl"
  local train="${ART}/gce-gpu-lora-train.sh"
  local train_py="${REPO}/scripts/chrysalis-lora-qlora-train.py"
  for f in "$manifest" "$shards" "$train"; do
    if [[ ! -f "$f" ]]; then
      log "ERROR: missing $f — run pnpm run gpu-lab:prep and gpu-lab:gce sync" >&2
      exit 1
    fi
  done
  if [[ ! -f "$train_py" ]]; then
    log "ERROR: missing $train_py" >&2
    exit 1
  fi
  gpu_ssh "mkdir -p ~/chrysalis-gpu-lab/reports/web-llm/lora ~/chrysalis-gpu-lab/reports/web-llm/dataset ~/chrysalis-gpu-lab/scripts"
  gpu_scp "$manifest" "${GPU_NAME}:~/chrysalis-gpu-lab/reports/web-llm/lora/train-manifest.v1.json"
  gpu_scp "$shards" "${GPU_NAME}:~/chrysalis-gpu-lab/reports/web-llm/dataset/training-shards.v1.jsonl"
  gpu_scp "$train" "${GPU_NAME}:~/chrysalis-gpu-lab/scripts/gce-gpu-lora-train.sh"
  gpu_scp "$train_py" "${GPU_NAME}:~/chrysalis-gpu-lab/scripts/chrysalis-lora-qlora-train.py"
  gpu_ssh "chmod +x ~/chrysalis-gpu-lab/scripts/gce-gpu-lora-train.sh"
}

train_gpu() {
  gpu_ssh "export CHRYSALIS_GPU_LAB_MAX_MINUTES=${MAX_MIN} CHRYSALIS_GPU_LAB_DRY_RUN=${DRY_RUN}; bash ~/chrysalis-gpu-lab/scripts/gce-gpu-lora-train.sh"
}

stop_gpu() {
  local st
  st="$(gcloud compute instances describe "$GPU_NAME" --zone="$ZONE" --project="$PROJECT" --format="value(status)" 2>/dev/null || echo NOT_FOUND)"
  if [[ "$st" == "RUNNING" ]]; then
    log "stopping $GPU_NAME (billing off, disk kept)..."
    gcloud compute instances stop "$GPU_NAME" --zone="$ZONE" --project="$PROJECT" --quiet
  else
    log "skip stop — status=$st"
  fi
}

schedule_auto_stop() {
  if [[ "${CHRYSALIS_GPU_LAB_AUTO_STOP:-1}" == "0" ]]; then
    return 0
  fi
  (
    sleep $((MAX_MIN * 60))
    st="$(gcloud compute instances describe "$GPU_NAME" --zone="$ZONE" --project="$PROJECT" --format="value(status)" 2>/dev/null || echo NOT_FOUND)"
    if [[ "$st" == "RUNNING" ]]; then
      gcloud compute instances stop "$GPU_NAME" --zone="$ZONE" --project="$PROJECT" --quiet
      echo "[gce-gpu-lab-auto-stop] stopped $GPU_NAME after ${MAX_MIN}m" >>"$LOG"
    fi
  ) &
  log "auto-stop scheduled in ${MAX_MIN} min (CHRYSALIS_GPU_LAB_MAX_MINUTES)"
}

main() {
  rm -f "$OK"
  LOCK="${REPO}/reports/ci/gce-gpu-lab.lock"
  exec 9>"$LOCK"
  if ! flock -n 9; then
    log "another orchestrator already running — exit"
    exit 0
  fi
  : >"$LOG"
  log "start project=$PROJECT gpu=$GPU_NAME max_min=$MAX_MIN dry_run=$DRY_RUN"
  ensure_gcloud
  schedule_auto_stop
  ensure_gpu_running
  bootstrap_gpu
  sync_gpu
  train_gpu
  stop_gpu
  touch "$OK"
  log "done — OK marker at $OK"
}

main "$@"
