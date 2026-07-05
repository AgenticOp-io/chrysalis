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

install_native_oracle_deps() {
  if [[ ! -f scripts/gce-install-native-oracle-deps.sh ]]; then
    echo "[gce-test-vm-bootstrap] WARN: missing scripts/gce-install-native-oracle-deps.sh — skip native oracle deps" >&2
    return 0
  fi
  chmod +x scripts/gce-install-native-oracle-deps.sh
  sed -i 's/\r$//' scripts/gce-install-native-oracle-deps.sh 2>/dev/null || true
  bash scripts/gce-install-native-oracle-deps.sh
}

source_gce_hub_env() {
  if [[ -f "${HOME}/.chrysalis/gce-hub-env.sh" ]]; then
    # shellcheck source=/dev/null
    source "${HOME}/.chrysalis/gce-hub-env.sh"
  fi
}

prep_intelligence_shorthand() {
  if [[ "${CHRYSALIS_SKIP_INTELLIGENCE_SHORTHAND_PREP:-}" == "1" ]]; then
    return 0
  fi
  if [[ ! -f scripts/gce-prep-intelligence-shorthand.sh ]]; then
    echo "[gce-test-vm-bootstrap] WARN: missing scripts/gce-prep-intelligence-shorthand.sh — skip shorthand prep" >&2
    return 0
  fi
  chmod +x scripts/gce-prep-intelligence-shorthand.sh
  sed -i 's/\r$//' scripts/gce-prep-intelligence-shorthand.sh 2>/dev/null || true
  bash scripts/gce-prep-intelligence-shorthand.sh
}

if [[ "${CHRYSALIS_REFRESH_ONLY:-}" == "1" ]]; then
  echo "[gce-test-vm-bootstrap] CHRYSALIS_REFRESH_ONLY=1 — skip apt/node/swap (shared VM safe)"
  if ! command -v php >/dev/null 2>&1; then
    echo "[gce-test-vm-bootstrap] refresh: installing php-cli for hub PHP ingest..."
    export DEBIAN_FRONTEND=noninteractive
    sudo apt-get update -qq
    sudo apt-get install -y php-cli php-xml unzip || true
  fi
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

# Shared VMs may leave root-owned or busy paths under packages/; force-clear before extract.
if [[ -d "${WORKDIR}" ]]; then
  chmod -R u+w "${WORKDIR}" 2>/dev/null || true
  rm -rf "${WORKDIR}" 2>/dev/null || sudo rm -rf "${WORKDIR}" || {
    echo "[gce-test-vm-bootstrap] WARN: rm -rf ${WORKDIR} failed; retrying find+rm" >&2
    find "${WORKDIR}" -mindepth 1 -delete 2>/dev/null || sudo find "${WORKDIR}" -mindepth 1 -delete
    rmdir "${WORKDIR}" 2>/dev/null || sudo rmdir "${WORKDIR}" 2>/dev/null || true
  }
fi
if [[ "${CHRYSALIS_TEST_USE_TARBALL:-}" == "1" ]]; then
  if [[ ! -f "${TARBALL}" ]]; then
    echo "[gce-test-vm-bootstrap] CHRYSALIS_TEST_USE_TARBALL=1 but missing ${TARBALL}" >&2
    exit 1
  fi
  mkdir -p "${WORKDIR}"
  tar -xzf "${TARBALL}" -C "${WORKDIR}"
  rm -f "${TARBALL}"
  if [[ -f "${HOME}/chrysalis-deployed-head" ]]; then
    mkdir -p "${WORKDIR}/.chrysalis"
    tr -d '\n\r' <"${HOME}/chrysalis-deployed-head" >"${WORKDIR}/.chrysalis/deployed-head"
    rm -f "${HOME}/chrysalis-deployed-head"
  fi
else
  if git clone --depth 1 --branch "${BRANCH}" "${REPO_URL}" "${WORKDIR}" 2>/dev/null; then
    :
  else
    git clone --depth 1 "${REPO_URL}" "${WORKDIR}"
    git -C "${WORKDIR}" checkout "${BRANCH}"
  fi
fi

cd "${WORKDIR}"
if [[ -d "${HOME}/chrysalis-gce-helpers" ]]; then
  echo "[gce-test-vm-bootstrap] merging local gce helper scripts from ~/chrysalis-gce-helpers"
  cp "${HOME}/chrysalis-gce-helpers/"*.sh scripts/ 2>/dev/null || true
fi
install_native_oracle_deps
source_gce_hub_env

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

if [[ "${CHRYSALIS_SKIP_WPTP_HUB_DEPS:-}" != "1" ]]; then
  echo "[gce-test-vm-bootstrap] installing WPTP hub deps (wptp-emit-nextjs for Next.js output)..."
  export WPTP_SIBLINGS_ROOT="${WPTP_SIBLINGS_ROOT:-${HOME}}"
  node scripts/install-wptp-hub-deps.mjs || echo "[gce-test-vm-bootstrap] WARN: WPTP hub deps failed (Next.js hub routes need sibling)"
fi

pnpm run test:cli-shims

prep_intelligence_shorthand

if [[ "${CHRYSALIS_SKIP_HUB_FINISH:-}" != "1" ]]; then
  chmod +x scripts/gce-hub-finish-deploy.sh
  export CHRYSALIS_AUTO_START_HUB="${CHRYSALIS_AUTO_START_HUB:-1}"
  export CHRYSALIS_DEPLOY_STRICT="${CHRYSALIS_DEPLOY_STRICT:-1}"
  bash scripts/gce-hub-finish-deploy.sh
fi

echo "[gce-test-vm-bootstrap] OK: workspace built, hub finish deploy complete."
