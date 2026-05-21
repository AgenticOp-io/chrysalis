#!/usr/bin/env bash
# Run on the GCE VM (Debian/Ubuntu) after SSH or via gcloud compute ssh --command.
# Installs Node 20 + pnpm + Python 3, clones or extracts Chrysalis, builds CLI, runs CLI shim smoke (non-strict).
set -euo pipefail

REPO_URL="${CHRYSALIS_TEST_REPO_URL:-https://github.com/theorem6/chrysalis.git}"
BRANCH="${CHRYSALIS_TEST_BRANCH:-main}"
WORKDIR="${HOME}/chrysalis-test"
TARBALL="${HOME}/chrysalis-src.tgz"

export DEBIAN_FRONTEND=noninteractive
export GIT_TERMINAL_PROMPT=0

if [[ "${CHRYSALIS_REFRESH_ONLY:-}" == "1" ]]; then
  echo "[gce-test-vm-bootstrap] CHRYSALIS_REFRESH_ONLY=1 — skip apt/node/swap (shared VM safe)"
else
  sudo apt-get update -y
  sudo apt-get install -y ca-certificates curl git python3 php-cli composer || sudo apt-get install -y ca-certificates curl git python3 php-cli

  if ! command -v node >/dev/null 2>&1 || [[ "$(node -v 2>/dev/null || true)" != v20* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  fi

  sudo corepack enable || true
  corepack prepare pnpm@9.0.0 --activate || npm install -g pnpm@9.0.0

  if [[ ! -f /swapfile ]]; then
  sudo fallocate -l 2G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  fi
fi

rm -rf "${WORKDIR}"
if [[ "${CHRYSALIS_TEST_USE_TARBALL:-}" == "1" ]]; then
  if [[ ! -f "${TARBALL}" ]]; then
    echo "[gce-test-vm-bootstrap] CHRYSALIS_TEST_USE_TARBALL=1 but missing ${TARBALL}" >&2
    exit 1
  fi
  mkdir -p "${WORKDIR}"
  tar -xzf "${TARBALL}" -C "${WORKDIR}"
else
  if git clone --depth 1 --branch "${BRANCH}" "${REPO_URL}" "${WORKDIR}" 2>/dev/null; then
    :
  else
    git clone --depth 1 "${REPO_URL}" "${WORKDIR}"
    git -C "${WORKDIR}" checkout "${BRANCH}"
  fi
fi

cd "${WORKDIR}"
pnpm install

echo "[gce-test-vm-bootstrap] building full workspace (hub translate needs webir, ingest, emit)..."
pnpm -r build

if command -v php >/dev/null 2>&1; then
  export CHRYSALIS_SKIP_PARSER_VENDOR=0
  echo "[gce-test-vm-bootstrap] php on PATH — installing parser-bridge vendor for hub PHP ingest..."
  pnpm run vendor:parser-bridge || echo "[gce-test-vm-bootstrap] WARN: parser-bridge vendor failed (PHP ingest may be limited)"
else
  export CHRYSALIS_SKIP_PARSER_VENDOR="${CHRYSALIS_SKIP_PARSER_VENDOR:-1}"
  echo "[gce-test-vm-bootstrap] no php on PATH — CHRYSALIS_SKIP_PARSER_VENDOR=1 (PHP ingest uses stub parser path only)"
fi

pnpm run test:cli-shims
echo "[gce-test-vm-bootstrap] OK: workspace built and shim smoke passed."
